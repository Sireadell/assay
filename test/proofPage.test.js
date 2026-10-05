import { test } from 'node:test';
import assert from 'node:assert/strict';
import { proofPage, proofError } from '../src/proofPage.js';

const hash = '0x' + 'ab'.repeat(32);

test('proof page shows the verdict, reason, hash and seller', () => {
  const html = proofPage({
    hash,
    seller: '0x8366a39cc670b4001a1121b8f6a443a643e40951',
    expected: '20',
    result: { verdict: 'PAID', reason: 'The seller received exactly 20 real USDC.' },
  });
  assert.match(html, />PAID</);
  assert.match(html, /exactly 20 real USDC/);
  assert.ok(html.includes(hash));
  assert.match(html, /Amount expected/);
});

test('fake token verdict names the fake contract', () => {
  const html = proofPage({
    hash,
    seller: '0xad3cd9a7995c2895ce41f9c0220deb344173ba4b',
    result: { verdict: 'FAKE_TOKEN', reason: 'x', fakeToken: '0xdead' },
  });
  assert.match(html, /NOT PAID: FAKE TOKEN/);
  assert.match(html, /0xdead/);
});

test('anything typed into the link is escaped, so a link cannot inject a script', () => {
  const html = proofPage({
    hash,
    seller: '"><script>alert(1)</script>',
    expected: '<img src=x onerror=alert(1)>',
    result: { verdict: 'UNVERIFIED', reason: '<b>hi</b>' },
  });
  assert.ok(!html.includes('<script>alert'));
  assert.ok(!html.includes('<img src=x'));
  assert.ok(!html.includes('<b>hi'));
});

test('error page renders', () => {
  assert.match(proofError('nope'), /nope/);
});
