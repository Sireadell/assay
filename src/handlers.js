// Request logic shared by the local server (src/server.js) and the Vercel
// functions (api/). Returns plain {code, body} so each host can send it.
import { checkPayment as check } from './check.js';
import { proofPage, proofError } from './proofPage.js';
import { extractHash } from './share.js';
import { scanInbox } from './inbox.js';

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

// One page of the inbox scan: about 8 hours of payments to one address.
// ?before=<block> asks for the page that ends at that block (older payments).
export async function handleInbox(params) {
  const seller = params.get('seller') || '';
  if (!/^0x[0-9a-fA-F]{40}$/.test(seller)) {
    return { code: 400, body: { error: 'That is not an Arc address. It starts with 0x and is 42 characters long.' } };
  }
  const raw = params.get('before');
  const before = raw === null || raw === '' ? undefined : Number(raw);
  if (before !== undefined && !(Number.isInteger(before) && before >= 0)) {
    return { code: 400, body: { error: 'Bad block number.' } };
  }
  try {
    return { code: 200, body: await scanInbox(seller, { before }) };
  } catch (e) {
    return { code: 502, body: { error: `Could not read Arc right now (${e.message}). Try again.` } };
  }
}
