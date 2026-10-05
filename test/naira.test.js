import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nairaToUsdc } from '../src/naira.js';

test('30000 naira at 1500 per USDC is 20 USDC', () => {
  assert.equal(nairaToUsdc('30000', '1500'), '20');
});

test('commas and decimals are accepted, result rounds to cents', () => {
  assert.equal(nairaToUsdc('30,000', '1,500'), '20');
  assert.equal(nairaToUsdc('10000', '1500'), '6.67');
  assert.equal(nairaToUsdc('750', '1500'), '0.5');
});

test('bad or empty input gives null, never a wrong number', () => {
  assert.equal(nairaToUsdc('', '1500'), null);
  assert.equal(nairaToUsdc('30000', ''), null);
  assert.equal(nairaToUsdc('30000', '0'), null);
  assert.equal(nairaToUsdc('abc', '1500'), null);
  assert.equal(nairaToUsdc('-5', '1500'), null);
});
