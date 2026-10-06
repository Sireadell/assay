// Reads a payment from Arc and decides the verdict. Looks up the names of any
// other tokens the seller received, so a fake USDC is told apart from an
// unrelated token.
import { fetchPayment, fetchTokenName } from './arcRpc.js';
import { decide, otherTokens } from './verdict.js';

export async function checkPayment(hash, seller, expected) {
  const p = await fetchPayment(hash);
  let tokenNames;
  if (p.receipt && /^0x[0-9a-fA-F]{40}$/.test(seller || '')) {
    const others = otherTokens(p.receipt, seller).slice(0, 3);
    if (others.length) {
      tokenNames = Object.fromEntries(await Promise.all(others.map(async (a) => [a, await fetchTokenName(a)])));
    }
  }
  return { hash, ...decide({ ...p, seller, expected, tokenNames }) };
}
