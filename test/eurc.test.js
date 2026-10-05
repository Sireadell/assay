import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decide, REAL_EURC, REAL_USDC } from '../src/verdict.js';
import { STAMP_CODE } from '../src/stamp.js';

const T = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
const pad = (a) => '0x' + a.slice(2).padStart(64, '0');
const seller = '0x8366a39cc670b4001a1121b8f6a443a643e40951';
const buyer = '0x1111111111111111111111111111111111111111';
const log = (address, micro) => ({ address, topics: [T, pad(buyer), pad(seller)], data: '0x' + micro.toString(16) });

test('real EURC sent instead of USDC is called out, not called a fake', () => {
  const r = decide({ receipt: { status: '0x1', logs: [log(REAL_EURC, 20_000_000n)] }, tx: {}, seller, expected: '20' });
  assert.equal(r.verdict, 'WRONG_COIN');
  assert.equal(r.receivedEurc, '20');
  assert.match(r.reason, /EURC/);
});

test('a wrong-coin verdict cannot be stamped', () => {
  assert.equal(STAMP_CODE.WRONG_COIN, undefined);
});

test('real USDC still wins when both coins arrive', () => {
  const r = decide({ receipt: { status: '0x1', logs: [log(REAL_EURC, 5_000_000n), log(REAL_USDC, 20_000_000n)] }, tx: {}, seller, expected: '20' });
  assert.equal(r.verdict, 'PAID');
});
