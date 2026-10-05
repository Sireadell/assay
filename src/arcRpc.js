// Minimal Arc mainnet JSON-RPC client. Arc's public endpoint is load balanced,
// so one server can be a block behind another and return -32014 on a hash it
// has just seen. Retry a few times before giving up.
export const ARC_RPC = process.env.ARC_RPC_URL || 'https://rpc.mainnet.arc.io';

async function call(method, params, attempt = 0) {
  let res;
  try {
    res = await fetch(ARC_RPC, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
      signal: AbortSignal.timeout(15000),
    });
  } catch (e) {
    // Network blip or timeout: retry a few times before giving up.
    if (attempt < 3) {
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
      return call(method, params, attempt + 1);
    }
    throw e;
  }
  if (!res.ok) throw new Error(`Arc RPC returned HTTP ${res.status}`);
  const body = await res.json();
  if (body.error) {
    if (body.error.code === -32014 && attempt < 3) {
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
      return call(method, params, attempt + 1);
    }
    throw new Error(`Arc RPC error ${body.error.code}: ${body.error.message}`);
  }
  return body.result;
}

export async function fetchPayment(hash) {
  const [chainHex, receipt, tx] = await Promise.all([
    call('eth_chainId', []),
    call('eth_getTransactionReceipt', [hash]),
    call('eth_getTransactionByHash', [hash]),
  ]);
  return { chainId: Number(BigInt(chainHex)), receipt, tx };
}
