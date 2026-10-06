import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TONE, verdictHead, verdictFacts } from '../src/labels.js';

test('every verdict has a colour family', () => {
  for (const v of ['PAID', 'NOT_PAID', 'FAKE_TOKEN', 'PARTIAL', 'OVERPAID', 'WRONG_COIN', 'PENDING', 'WRONG_CHAIN', 'UNVERIFIED']) {
    assert.ok(['ok', 'bad', 'warn'].includes(TONE[v]), v);
  }
  assert.equal(TONE.PAID, 'ok');
  assert.equal(TONE.FAKE_TOKEN, 'bad');
});

test('a fake token reads NOT PAID with a short line under it', () => {
  assert.deepEqual(verdictHead('FAKE_TOKEN'), ['NOT PAID', 'Fake token']);
  assert.deepEqual(verdictHead('PAID'), ['PAID', '']);
});

test('facts say what was sent and what was needed', () => {
  assert.deepEqual(verdictFacts({ verdict: 'PAID', received: '0.5' }, '0.5'), [
    ['You were sent', '0.5 real USDC'],
    ['You expected', '0.5 USDC'],
  ]);
  const fake = verdictFacts({ verdict: 'FAKE_TOKEN', fakeSymbol: 'USDC' }, '20');
  assert.equal(fake[0][1], 'A token that calls itself "USDC" (not real)');
  assert.deepEqual(fake[1], ['You needed', '20 real USDC']);
  assert.deepEqual(verdictFacts({ verdict: 'PENDING' }), []);
});
