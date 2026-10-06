import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scanInbox, WINDOW } from '../src/inbox.js';
import { handleInbox } from '../src/handlers.js';
import { REAL_EURC, SYSTEM_EMITTER } from '../src/verdict.js';

const seller = '0xad3cd9a7995c2895ce41f9c0220deb344173ba4b';
const TRANSFER = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
const pad = (a) => '0x' + '0'.repeat(24) + a.slice(2);
const word = (n) => '0x' + BigInt(n).toString(16).padStart(64, '0');
const hash = (n) => '0x' + String(n).padStart(64, '0');
const FAKE = '0x038442aadddaac9ac7ab8e18ac9a031641c5d398';
const RICE = '0x1111111111111111111111111111111111111111';

const log = (emitter, value, block, tx) => ({
  address: emitter,
  topics: [TRANSFER, pad('0x00000000000000000000000000000000000000aa'), pad(seller)],
  data: word(value),
  blockNumber: '0x' + block.toString(16),
  transactionHash: hash(tx),
});

const LATEST = 100000;
const logs = [
  log(SYSTEM_EMITTER, 500000000000000000n, LATEST - 50, 1), // 0.5 real USDC, native send
  log(FAKE, 20n * 10n ** 18n, LATEST - 20000, 2), // lookalike
  log(RICE, 5, LATEST - 25000, 3), // unrelated token
  log(REAL_EURC, 3000000n, LATEST - 30000, 4), // euro coin
];

function fakeRpc({ failBelow = -1 } = {}) {
  const searches = [];
  return {
    searches,
    async call(method, params) {
      if (method === 'eth_blockNumber') return '0x' + LATEST.toString(16);
      if (method !== 'eth_getLogs') throw new Error('unexpected ' + method);
      const [{ fromBlock, toBlock, topics }] = params;
      const from = Number(BigInt(fromBlock)), to = Number(BigInt(toBlock));
      searches.push([from, to]);
      assert.equal(topics[0], TRANSFER);
      assert.equal(topics[2], pad(seller));
      if (to < failBelow) throw new Error('no answer');
      return logs.filter((l) => {
        const b = Number(BigInt(l.blockNumber));
        return b >= from && b <= to;
      });
    },
    async fetchTokenName(a) {
      return a === FAKE ? { symbol: 'USDC', name: 'USDigitalCoin' } : { symbol: 'RICE', name: 'Rice Points' };
    },
  };
}

test('sorts each payment into real, fake, other or euro, newest first', async () => {
  const r = await scanInbox(seller, { rpc: fakeRpc() });
  assert.deepEqual(r.items.map((i) => i.kind), ['REAL', 'FAKE', 'OTHER', 'EURC']);
  assert.equal(r.items[0].amount, '0.5');
  assert.equal(r.items[1].token, FAKE);
  assert.equal(r.items[1].tokenName, 'USDC');
  assert.equal(r.items[2].tokenName, 'RICE');
  assert.equal(r.items[3].amount, '3');
  assert.equal(r.failedWindows, 0);
});

test('never asks Arc for more than 10,000 blocks at once and walks backwards', async () => {
  const rpc = fakeRpc();
  const r = await scanInbox(seller, { rpc, windows: 4 });
  for (const [from, to] of rpc.searches) assert.ok(to - from + 1 <= WINDOW);
  assert.equal(r.toBlock, LATEST);
  assert.equal(r.fromBlock, LATEST - 4 * WINDOW + 1);
  assert.equal(r.next, r.fromBlock - 1);
  assert.equal(r.hoursScanned, 5.6);
});

test('an older page starts where the last one stopped', async () => {
  const rpc = fakeRpc();
  const r = await scanInbox(seller, { rpc, windows: 2, before: 40000 });
  assert.equal(r.toBlock, 40000);
  assert.equal(r.fromBlock, 40000 - 2 * WINDOW + 1);
  assert.equal(r.items.length, 0);
});

test('a stretch Arc could not answer is reported, not hidden', async () => {
  const r = await scanInbox(seller, { rpc: fakeRpc({ failBelow: LATEST - 15000 }), windows: 4 });
  assert.equal(r.failedWindows, 2);
  assert.deepEqual(r.items.map((i) => i.kind), ['REAL']);
});

test('if Arc answers nothing at all the scan fails instead of saying "no payments"', async () => {
  await assert.rejects(scanInbox(seller, { rpc: fakeRpc({ failBelow: Infinity }) }), /did not answer/);
});

test('the scan stops at block 0', async () => {
  const r = await scanInbox(seller, { rpc: fakeRpc(), before: 5000, windows: 3 });
  assert.equal(r.fromBlock, 0);
  assert.equal(r.next, null);
});

test('rejects a bad address and a bad block number', async () => {
  await assert.rejects(scanInbox('0x123', { rpc: fakeRpc() }), /not a valid address/);
  assert.equal((await handleInbox(new URLSearchParams({ seller: 'nope' }))).code, 400);
  assert.equal((await handleInbox(new URLSearchParams({ seller, before: '-4' }))).code, 400);
  assert.equal((await handleInbox(new URLSearchParams({ seller, before: 'abc' }))).code, 400);
});

test('a stretch with too many results is split and searched again', async () => {
  const base = fakeRpc();
  const rpc = {
    ...base,
    async call(method, params) {
      if (method === 'eth_getLogs') {
        const [{ fromBlock, toBlock }] = params;
        if (Number(BigInt(toBlock)) - Number(BigInt(fromBlock)) > 3000) {
          throw new Error('Arc RPC error -32602: query exceeds max results 2000');
        }
      }
      return base.call(method, params);
    },
  };
  const r = await scanInbox(seller, { rpc, windows: 4 });
  assert.equal(r.failedWindows, 0);
  assert.deepEqual(r.items.map((i) => i.kind), ['REAL', 'FAKE', 'OTHER', 'EURC']);
  assert.ok(base.searches.every(([f, t]) => t - f <= 3000));
});

test('an error that is not about size is not split forever', async () => {
  const rpc = { ...fakeRpc(), async call(m) { if (m === 'eth_blockNumber') return '0x186a0'; throw new Error('down'); } };
  await assert.rejects(scanInbox(seller, { rpc, windows: 2 }), /did not answer/);
});
