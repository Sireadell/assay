// Request logic shared by the local server (src/server.js) and the Vercel
// functions (api/). Returns plain {code, body} so each host can send it.
import { checkPayment as check } from './check.js';
import { proofPage, proofError } from './proofPage.js';
import { extractHash } from './share.js';

const HASH = /^0x[0-9a-fA-F]{64}$/;
const BAD_HASH = 'That is not a transaction hash. It should start with 0x and be 66 characters long.';

export async function handleCheck(params) {
  const raw = params.get('hash') || '';
  const hash = extractHash(raw) || raw;
  const seller = params.get('seller') || '';
  const expected = params.get('expected') || undefined;
  if (!HASH.test(hash)) return { code: 400, body: { verdict: 'UNVERIFIED', reason: BAD_HASH } };
  try {
    return { code: 200, body: await check(hash, seller, expected) };
  } catch (e) {
    return { code: 502, body: { verdict: 'UNVERIFIED', reason: `Could not reach Arc right now (${e.message}). Try again.` } };
  }
}

export async function handleProof(rawHash, params, origin) {
  const hash = extractHash(rawHash) || rawHash;
  const seller = params.get('seller') || '';
  const expected = params.get('expected') || undefined;
  if (!HASH.test(hash)) return { code: 400, body: proofError(BAD_HASH) };
  try {
    const result = await check(hash, seller, expected);
    return { code: 200, body: proofPage({ hash, seller, expected, result, origin }) };
  } catch (e) {
    return { code: 502, body: proofError(`Could not reach Arc right now (${e.message}). Try again.`) };
  }
}
