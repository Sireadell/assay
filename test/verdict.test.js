import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { decide, formatUsdc, parseUsdc, realUsdcReceived } from '../src/verdict.js';

const load = (n) => JSON.parse(readFileSync(new URL(`./fixtures/${n}.json`, import.meta.url)));
const realReceipt = load('real.receipt');
const realTx = load('real.tx');
const fakeReceipt = load('fake.receipt');
const fakeTx = load('fake.tx');

// Both are real mainnet transactions captured on 2026-10-03.
const REAL_SELLER = '0x8366a39cc670b4001a1121b8f6a443a643e40951'; // got 0.5 real USDC
const FAKE_SELLER = '0xad3cd9a7995c2895ce41f9c0220deb344173ba4b'; // got 20 of a lookalike

test('real USDC transfer is PAID and counted once, not twice', () => {
  const r = decide({ receipt: realReceipt, tx: realTx, seller: REAL_SELLER, expected: '0.5' });
  assert.equal(r.verdict, 'PAID');
  assert.equal(r.received, '0.5');
});

test('the two log streams are not double counted', () => {
  const { micro } = realUsdcReceived(realReceipt, REAL_SELLER);
  assert.equal(micro, 500000n);
});

test('lookalike token that pays the seller is FAKE_TOKEN', () => {
  const r = decide({ receipt: fakeReceipt, tx: fakeTx, seller: FAKE_SELLER, expected: '20' });
  assert.equal(r.verdict, 'FAKE_TOKEN');
  assert.equal(r.fakeToken, '0x038442aadddaac9ac7ab8e18ac9a031641c5d398');
});

test('fake token transfer is not counted as real USDC', () => {
  assert.equal(realUsdcReceived(fakeReceipt, FAKE_SELLER).micro, 0n);
});

test('PARTIAL and OVERPAID against the expected amount', () => {
  assert.equal(decide({ receipt: realReceipt, tx: realTx, seller: REAL_SELLER, expected: '1' }).verdict, 'PARTIAL');
  assert.equal(decide({ receipt: realReceipt, tx: realTx, seller: REAL_SELLER, expected: '0.25' }).verdict, 'OVERPAID');
});

test('wrong seller address gets NOT_PAID, not PAID', () => {
  const r = decide({ receipt: realReceipt, tx: realTx, seller: '0x000000000000000000000000000000000000dead' });
  assert.equal(r.verdict, 'NOT_PAID');
});

test('missing receipt: pending, unknown, and wrong chain', () => {
  assert.equal(decide({ receipt: null, tx: { blockNumber: null }, seller: REAL_SELLER }).verdict, 'PENDING');
  assert.equal(decide({ receipt: null, tx: null, seller: REAL_SELLER }).verdict, 'UNVERIFIED');
  assert.equal(decide({ receipt: realReceipt, tx: realTx, seller: REAL_SELLER, chainId: 1 }).verdict, 'WRONG_CHAIN');
});

test('failed transaction is NOT_PAID', () => {
  const failed = { ...realReceipt, status: '0x0' };
  assert.equal(decide({ receipt: failed, tx: realTx, seller: REAL_SELLER }).verdict, 'NOT_PAID');
});

test('native send (system log only) is counted once as real USDC', () => {
  const sys = '0xfffffffffffffffffffffffffffffffffffffffe';
  const t = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
  const pad = (a) => '0x' + a.slice(2).padStart(64, '0');
  const receipt = {
    status: '0x1',
    logs: [{ address: sys, topics: [t, pad('0x' + '11'.repeat(20)), pad(REAL_SELLER)], data: '0x' + (3n * 10n ** 18n).toString(16) }],
  };
  const r = decide({ receipt, tx: {}, seller: REAL_SELLER, expected: '3' });
  assert.equal(r.verdict, 'PAID');
  assert.equal(r.received, '3');
});

test('amount helpers', () => {
  assert.equal(formatUsdc(12500000n), '12.5');
  assert.equal(parseUsdc('12.5'), 12500000n);
  assert.equal(parseUsdc('abc'), null);
});
