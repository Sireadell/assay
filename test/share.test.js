import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractHash, proofUrl, whatsappUrl, requestUrl } from '../src/share.js';

const hash = '0x4a36399e8e34ebdcba92cee84ff0a1dc574ee03086d99ca14197ba2adcbfab85';
const seller = '0xad3cd9a7995c2895ce41f9c0220deb344173ba4b';

test('a pasted explorer link gives back just the hash', () => {
  assert.equal(extractHash(`https://explorer.arc.io/tx/${hash}`), hash);
  assert.equal(extractHash(`  ${hash}  `), hash);
  assert.equal(extractHash(`https://explorer.arc.io/tx/${hash}?tab=logs`), hash);
  assert.equal(extractHash('hello'), '');
});

test('proof link carries seller and amount', () => {
  const u = new URL(proofUrl('https://x.test', hash, seller, '20'));
  assert.equal(u.pathname, `/p/${hash}`);
  assert.equal(u.searchParams.get('seller'), seller);
  assert.equal(u.searchParams.get('expected'), '20');
});

test('WhatsApp link encodes the message', () => {
  const u = whatsappUrl('PAID & done https://x.test/p/1?a=b');
  assert.ok(u.startsWith('https://wa.me/?text='));
  assert.equal(decodeURIComponent(u.split('text=')[1]), 'PAID & done https://x.test/p/1?a=b');
});

test('payment request link needs a real address and keeps the note short', () => {
  assert.equal(requestUrl('https://x.test', { seller: 'nope', amount: '5' }), '');
  const u = new URL(requestUrl('https://x.test', { seller, amount: '20', note: 'r'.repeat(200) }));
  assert.equal(u.searchParams.get('request'), '1');
  assert.equal(u.searchParams.get('seller'), seller);
  assert.equal(u.searchParams.get('expected'), '20');
  assert.equal(u.searchParams.get('note').length, 80);
});
