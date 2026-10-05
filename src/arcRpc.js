// Arc mainnet JSON-RPC client.
//
// Arc's public endpoint is load balanced, so one server can be a block behind
// another and return -32014 on a hash it has just seen. It can also be slow:
// on 2026-10-05 it took 8 to 29 seconds per call. So every call goes to several
// Arc mainnet endpoints at once and the first real answer wins.
//
// A null answer ("no such transaction") never wins the race on its own. On
// 2026-10-05 Blockdaemon returned null for a real, confirmed payment that the
// other three endpoints returned. Null only counts when every endpoint agrees.
export const ARC_RPCS = process.env.ARC_RPC_URL
  ? [process.env.ARC_RPC_URL]
  : [
      'https://rpc.mainnet.arc.io',
      'https://rpc.quicknode.mainnet.arc.io',
      'https://rpc.drpc.mainnet.arc.io',
      'https://rpc.blockdaemon.mainnet.arc.io',
    ];

const TIMEOUT_MS = 10000;

async function callOne(url, method, params, attempt = 0) {
  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (e) {
    // Network blip: one quick retry. Slowness is handled by the other endpoints.
    if (attempt < 1) return callOne(url, method, params, attempt + 1);
    throw e;
  }
  if (!res.ok) throw new Error(`Arc RPC returned HTTP ${res.status}`);
  const body = await res.json();
  if (body.error) {
    if (body.error.code === -32014 && attempt < 2) {
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
      return callOne(url, method, params, attempt + 1);
    }
    throw new Error(`Arc RPC error ${body.error.code}: ${body.error.message}`);
  }
  return body.result;
}

// First non-null result from any endpoint. Null if every endpoint that answered
// said null. Throws only if no endpoint answered at all.
export function call(method, params, urls = ARC_RPCS, one = callOne) {
  return new Promise((resolve, reject) => {
    let pending = urls.length;
    let sawNull = false;
    const errors = [];
    const settle = () => {
      if (--pending > 0) return;
      if (sawNull) resolve(null);
      else reject(new Error(errors[0]?.message || 'no Arc endpoint answered'));
    };
    for (const url of urls) {
      one(url, method, params).then(
        (result) => {
          if (result !== null && result !== undefined) resolve(result);
          else sawNull = true;
          settle();
        },
        (e) => {
          errors.push(e);
          settle();
        },
      );
    }
  });
}

export async function fetchPayment(hash) {
  const [chainHex, receipt, tx] = await Promise.all([
    call('eth_chainId', []),
    call('eth_getTransactionReceipt', [hash]),
    call('eth_getTransactionByHash', [hash]),
  ]);
  return { chainId: Number(BigInt(chainHex)), receipt, tx };
}
