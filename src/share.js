// Helpers for links people paste and links people send. Pure, shared by the
// page, the proof page and the tests.

const HASH_IN_TEXT = /0x[0-9a-fA-F]{64}/;
const ADDR = /^0x[0-9a-fA-F]{40}$/;

// People paste a whole explorer address (https://explorer.arc.io/tx/0x...),
// not just the hash. Pull the hash out of whatever they pasted.
export function extractHash(text) {
  const m = HASH_IN_TEXT.exec(String(text || ''));
  return m ? m[0] : '';
}

export function proofUrl(origin, hash, seller, expected) {
  const q = new URLSearchParams({ seller });
  if (expected) q.set('expected', expected);
  return `${origin}/p/${hash}?${q}`;
}

export function whatsappUrl(text) {
  return 'https://wa.me/?text=' + encodeURIComponent(text);
}

// A payment request a seller sends to a buyer. Everything lives in the link,
// nothing is stored.
export function requestUrl(origin, { seller, amount, naira, note }) {
  if (!ADDR.test(String(seller || ''))) return '';
  const q = new URLSearchParams({ seller, request: '1' });
  if (amount) q.set('expected', amount);
  if (naira) q.set('naira', naira);
  if (note) q.set('note', String(note).slice(0, 80));
  return `${origin}/?${q}`;
}
