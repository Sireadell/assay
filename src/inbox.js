// Inbox scan: paste only your address and see the recent payments that reached
// it, each marked as real USDC, a fake lookalike, EURC, or some other token.
//
// Arc's public servers refuse a log search wider than 10,000 blocks (about 80
// minutes, blocks come every half second), but each search answers in about a
// second. So one "page" searches several 10,000-block windows side by side and
// the caller asks for older pages as it likes.
import { call, fetchTokenName } from './arcRpc.js';
import { realUsdcReceived, formatUsdc, copiesUsdc } from './verdict.js';

const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
export const WINDOW = 10000; // blocks per search, the most Arc's servers allow
export const PAGE_WINDOWS = 6; // searches per page: 60,000 blocks, about 8 hours
const SECONDS_PER_BLOCK = 0.5;
const MAX_ITEMS = 300;
const MAX_TOKEN_LOOKUPS = 40;
const SEARCH_BUDGET = 80; // most log searches one page may make

export const KIND_LABEL = {
  REAL: 'Real USDC',
  EURC: 'EURC (the euro coin)',
  FAKE: 'LOOKALIKE: name has USDC in it, not the real coin',
  OTHER: 'Other token, not USDC',
};

const hex = (n) => '0x' + n.toString(16);
const padAddress = (a) => '0x' + '0'.repeat(24) + a.toLowerCase().slice(2);

// One log search over [from, to]. Arc's servers also cap how many results one
// search may return, so a busy stretch is split in half and searched again.
// Returns the logs, or null if a part of the stretch could not be read.
const TOO_MANY = /max results|exceeds max|too many|limit exceeded/i;
const MIN_SPLIT = 250; // blocks; a stretch this small is not split further

async function searchWindow(rpc, seller, from, to, budget) {
  if (budget.left-- <= 0) return null;
  try {
    const logs = await rpc.call('eth_getLogs', [
      { fromBlock: hex(from), toBlock: hex(to), topics: [TRANSFER_TOPIC, null, padAddress(seller)] },
    ]);
    return Array.isArray(logs) ? logs : null;
  } catch (e) {
    if (!TOO_MANY.test(e.message) || to - from < MIN_SPLIT) return null;
    const mid = from + Math.floor((to - from) / 2);
    const parts = await Promise.all([
      searchWindow(rpc, seller, from, mid, budget),
      searchWindow(rpc, seller, mid + 1, to, budget),
    ]);
    if (parts.some((p) => p === null)) return null;
    return parts.flat();
  }
}

// Turn the logs that paid the seller in one transaction into a single line.
function classify(logs, seller, names) {
  const { micro, eurc, fakes } = realUsdcReceived({ logs }, seller);
  if (micro > 0n) return { kind: 'REAL', amount: formatUsdc(micro) };
  if (eurc > 0n) return { kind: 'EURC', amount: formatUsdc(eurc) };
  if (!fakes.length) return null;
  const token = fakes[0].emitter;
  const info = names[token];
  const name = info ? info.symbol || info.name || '' : '';
  const kind = info && copiesUsdc(info) ? 'FAKE' : 'OTHER';
  return { kind, token, tokenName: name };
}

/**
 * @param {string} seller  address to scan
 * @param {object} [o]
 * @param {number} [o.before]  scan blocks up to and including this one (omit for the newest)
 * @param {number} [o.windows] how many 10,000-block searches in this page
 * @param {object} [o.rpc]     { call, fetchTokenName } (swapped out in tests)
 */
export async function scanInbox(seller, { before, windows = PAGE_WINDOWS, rpc = { call, fetchTokenName } } = {}) {
  const s = String(seller || '').toLowerCase();
  if (!/^0x[0-9a-f]{40}$/.test(s)) throw new Error('That is not a valid address.');

  const latest = before ?? Number(BigInt(await rpc.call('eth_blockNumber', [])));
  const ranges = [];
  for (let i = 0; i < windows; i++) {
    const to = latest - i * WINDOW;
    const from = Math.max(0, to - WINDOW + 1);
    if (to < 0) break;
    ranges.push([from, to]);
  }
  const budget = { left: SEARCH_BUDGET };
  const answers = await Promise.all(ranges.map(([from, to]) => searchWindow(rpc, s, from, to, budget)));
  const failed = answers.filter((a) => a === null).length;
  if (failed === ranges.length) throw new Error('Arc did not answer the search (the address may get too many payments to scan, or Arc is busy)');

  // Group the logs by transaction.
  const byTx = new Map();
  for (const logs of answers) {
    for (const l of logs || []) {
      const g = byTx.get(l.transactionHash) || { hash: l.transactionHash, block: Number(BigInt(l.blockNumber)), logs: [] };
      g.logs.push(l);
      byTx.set(l.transactionHash, g);
    }
  }
  const all = [...byTx.values()].sort((a, b) => b.block - a.block);
  const groups = all.slice(0, MAX_ITEMS);

  // Names of the unfamiliar tokens, so a lookalike is told apart from a stranger.
  const tokens = new Set();
  for (const g of groups) for (const f of realUsdcReceived({ logs: g.logs }, s).fakes) tokens.add(f.emitter);
  const names = {};
  await Promise.all(
    [...tokens].slice(0, MAX_TOKEN_LOOKUPS).map(async (t) => {
      names[t] = await rpc.fetchTokenName(t).catch(() => ({ symbol: '', name: '' }));
    }),
  );

  const items = [];
  for (const g of groups) {
    const c = classify(g.logs, s, names);
    if (c) items.push({ hash: g.hash, block: g.block, label: KIND_LABEL[c.kind], ...c });
  }

  const fromBlock = ranges[ranges.length - 1][0];
  return {
    seller: s,
    fromBlock,
    toBlock: latest,
    hoursScanned: Math.round(((latest - fromBlock + 1) * SECONDS_PER_BLOCK) / 360) / 10,
    failedWindows: failed,
    truncated: all.length > MAX_ITEMS,
    next: fromBlock > 0 ? fromBlock - 1 : null,
    items,
  };
}
