import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { decide, copiesUsdc } from '../src/verdict.js';
import { decodeName } from '../src/arcRpc.js';

const load = (n) => JSON.parse(readFileSync(new URL(`./fixtures/${n}.json`, import.meta.url)));
const receipt = load('fake.receipt');
const tx = load('fake.tx');
const seller = '0xad3cd9a7995c2895ce41f9c0220deb344173ba4b';
const token = '0x038442aadddaac9ac7ab8e18ac9a031641c5d398';

test('a token that does not copy the USDC name is NOT PAID, not called a fake USDC', () => {
  const r = decide({ receipt, tx, seller, tokenNames: { [token]: { symbol: 'RICE', name: 'Rice Points' } } });
  assert.equal(r.verdict, 'NOT_PAID');
  assert.match(r.reason, /a different token \(RICE\)/);
  assert.doesNotMatch(r.reason, /USDC name|calls itself/);
});

test('a token whose name cannot be read is NOT PAID with careful wording', () => {
  const r = decide({ receipt, tx, seller, tokenNames: { [token]: { symbol: '', name: '' } } });
  assert.equal(r.verdict, 'NOT_PAID');
  assert.match(r.reason, /a token that is not real USDC/);
  const r2 = decide({ receipt, tx, seller });
  assert.equal(r2.verdict, 'NOT_PAID');
});

test('lookalike names are caught', () => {
  for (const t of [{ symbol: 'USDC' }, { symbol: 'USDC.e' }, { name: 'USD Coin' }, { symbol: 'usdc' }, { name: 'USDC Token' }]) {
    assert.ok(copiesUsdc(t), JSON.stringify(t));
  }
  for (const t of [{ symbol: 'EURC' }, { symbol: 'RICE' }, { name: 'USDigitalCoin' }, {}]) {
    assert.ok(!copiesUsdc(t), JSON.stringify(t));
  }
});

test('token names decode from both string and bytes32 answers', () => {
  const str = '0x' + '20'.padStart(64, '0') + '4'.padStart(64, '0') + Buffer.from('USDC').toString('hex').padEnd(64, '0');
  assert.equal(decodeName(str), 'USDC');
  const b32 = '0x' + Buffer.from('MKR').toString('hex').padEnd(64, '0');
  assert.equal(decodeName(b32), 'MKR');
  assert.equal(decodeName('0x'), '');
});
