// Assay verdict engine. Pure functions, no network. Decides from a
// transaction receipt whether a seller was paid in REAL USDC on Arc.
//
// Facts this relies on (read from docs.arc.io and confirmed on live
// receipts 2026-10-03):
//  - Real USDC is the contract 0x3600...0000, 6 decimals.
//  - Every real USDC move also writes a log from the system address
//    0xffff...fffe with 18 decimals. A plain native send writes only that one.
//  - Real EURC (euro coin) is 0xbEf5...21c1, 6 decimals (docs.arc.io contract
//    addresses, confirmed on chain 2026-10-05). It is real money but not USDC.
//  - A lookalike token is any other contract whose Transfer log pays the seller.

export const ARC_CHAIN_ID = 5042;
export const REAL_USDC = '0x3600000000000000000000000000000000000000';
export const REAL_EURC = '0xbef5f6d51cb62b58e6a8f77868681825c6fe21c1';
export const SYSTEM_EMITTER = '0xfffffffffffffffffffffffffffffffffffffffe';
const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

const lower = (s) => String(s || '').toLowerCase();
const topicToAddress = (t) => '0x' + lower(t).slice(-40);

function transfersTo(logs, seller) {
  const out = [];
  for (const l of logs || []) {
    if (!l.topics || l.topics[0] !== TRANSFER_TOPIC || l.topics.length < 3) continue;
    if (topicToAddress(l.topics[2]) !== seller) continue;
    out.push({
      emitter: lower(l.address),
      from: topicToAddress(l.topics[1]),
      value: BigInt(l.data && l.data !== '0x' ? l.data : '0x0'),
    });
  }
  return out;
}

// Amount of real USDC the seller received, in 6-decimal units, plus the
// lookalike transfers that named the seller.
export function realUsdcReceived(receipt, seller) {
  seller = lower(seller);
  const hits = transfersTo(receipt.logs, seller);
  const token = hits.filter((h) => h.emitter === REAL_USDC);
  const system = hits.filter((h) => h.emitter === SYSTEM_EMITTER);
  let micro = token.reduce((a, h) => a + h.value, 0n);
  // Native sends write only the system log. Count system logs that no 6-decimal
  // log accounts for, so a token transfer is never counted twice.
  const unmatched = system.filter(
    (s) => !token.some((t) => t.from === s.from && t.value * 10n ** 12n === s.value),
  );
  micro += unmatched.reduce((a, h) => a + h.value / 10n ** 12n, 0n);
  const eurc = hits.filter((h) => h.emitter === REAL_EURC).reduce((a, h) => a + h.value, 0n);
  const fakes = hits.filter((h) => h.emitter !== REAL_USDC && h.emitter !== SYSTEM_EMITTER && h.emitter !== REAL_EURC);
  return { micro, fakes, token, eurc };
}

export function formatUsdc(micro) {
  const whole = micro / 1_000_000n;
  const frac = (micro % 1_000_000n).toString().padStart(6, '0').replace(/0+$/, '');
  return frac ? `${whole}.${frac}` : `${whole}`;
}

export function parseUsdc(text) {
  const m = /^(\d+)(?:\.(\d{1,6}))?$/.exec(String(text).trim());
  if (!m) return null;
  return BigInt(m[1]) * 1_000_000n + BigInt((m[2] || '').padEnd(6, '0') || '0');
}

/**
 * @param {object} p
 * @param {object|null} p.receipt  eth_getTransactionReceipt result, or null
 * @param {object|null} p.tx       eth_getTransactionByHash result, or null
 * @param {string} p.seller        the address that should have been paid
 * @param {string} [p.expected]    expected amount in USDC, e.g. "20" or "12.5"
 * @param {number|null} [p.chainId] chain id the RPC reported
 * @param {Object<string,{symbol?:string,name?:string}>} [p.tokenNames]
 *        names the other tokens give themselves, keyed by lowercase contract
 */
export function decide({ receipt, tx, seller, expected, chainId = ARC_CHAIN_ID, tokenNames }) {
  if (chainId !== null && chainId !== ARC_CHAIN_ID) {
    return v('WRONG_CHAIN', `This node is chain ${chainId}, not Arc mainnet (${ARC_CHAIN_ID}).`);
  }
  const s = lower(seller);
  if (!/^0x[0-9a-f]{40}$/.test(s)) return v('UNVERIFIED', 'The seller address is not a valid address.');

  if (!receipt) {
    if (tx && tx.blockNumber === null) {
      return v('PENDING', 'The payment was sent but is not in a block yet. Wait a moment and check again.');
    }
    if (tx) return v('UNVERIFIED', 'The transaction exists but has no receipt yet. Check again shortly.');
    return v(
      'UNVERIFIED',
      'No transaction with this hash was found on Arc mainnet. It may be on another chain, mistyped, or dropped (Arc silently drops payments with a fee cap under 20 gwei).',
    );
  }
  if (receipt.status !== '0x1') {
    return v('NOT_PAID', 'The transaction failed on-chain, so no money moved to the seller.');
  }

  const { micro, fakes, eurc } = realUsdcReceived(receipt, s);
  const want = expected ? parseUsdc(expected) : null;
  if (expected && want === null) return v('UNVERIFIED', 'The expected amount is not a valid number.');

  if (micro === 0n) {
    if (eurc > 0n) {
      return v(
        'WRONG_COIN',
        `The seller received ${formatUsdc(eurc)} EURC (the euro coin), not USDC. It is real money, but not the coin that was asked for.`,
        { receivedEurc: formatUsdc(eurc) },
      );
    }
    if (fakes.length) {
      const f = fakes[0];
      const info = (tokenNames || {})[f.emitter];
      const extra = { fakeToken: f.emitter, fakeRawAmount: f.value.toString() };
      if (info && copiesUsdc(info)) {
        return v(
          'FAKE_TOKEN',
          `The seller received a token that calls itself ${quote(info.symbol || info.name)} but is not real USDC (contract ${f.emitter}). No real USDC reached the seller.`,
          { ...extra, fakeSymbol: info.symbol || '' },
        );
      }
      // A token that does not copy the USDC name is not a fake USDC, just not
      // USDC. Say what it is, or that we could not read its name.
      const what = info && (info.symbol || info.name) ? `a different token (${info.symbol || info.name})` : 'a token that is not real USDC';
      return v('NOT_PAID', `The seller received ${what}, contract ${f.emitter}. No real USDC reached the seller.`, {
        ...extra,
        otherToken: true,
      });
    }
    return v('NOT_PAID', 'No real USDC in this transaction reached the seller address.');
  }

  const got = formatUsdc(micro);
  if (want === null) return v('PAID', `The seller received ${got} real USDC.`, { received: got });
  if (micro === want) return v('PAID', `The seller received exactly ${got} real USDC.`, { received: got });
  if (micro < want) {
    return v('PARTIAL', `The seller received ${got} real USDC, which is less than the ${formatUsdc(want)} expected.`, { received: got });
  }
  return v('OVERPAID', `The seller received ${got} real USDC, which is more than the ${formatUsdc(want)} expected.`, { received: got });
}

// A lookalike copies the USDC name: "USDC", "USDC.e", "USD Coin", "USDC Token".
export function copiesUsdc({ symbol = '', name = '' }) {
  const t = `${symbol} ${name}`.toLowerCase().replace(/[^a-z]/g, '');
  return t.includes('usdc') || t.includes('usdcoin');
}

const quote = (s) => `"${String(s).slice(0, 30)}"`;

// Contracts of the other tokens the seller received, so the caller can look
// up their names before deciding.
export function otherTokens(receipt, seller) {
  return [...new Set(realUsdcReceived(receipt, seller).fakes.map((f) => f.emitter))];
}

function v(verdict, reason, extra = {}) {
  return { verdict, reason, ...extra };
}
