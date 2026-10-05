import { test } from 'node:test';
import assert from 'node:assert/strict';
import { call } from '../src/arcRpc.js';

const later = (ms, v, fail) => () => new Promise((res, rej) => setTimeout(() => (fail ? rej(new Error(v)) : res(v)), ms));
const fake = (map) => (url) => map[url]();

test('the fastest real answer wins', async () => {
  const one = fake({ a: later(50, 'slow'), b: later(5, 'fast') });
  assert.equal(await call('m', [], ['a', 'b'], one), 'fast');
});

test('a quick null does not beat a slower real answer', async () => {
  const one = fake({ a: later(1, null), b: later(20, { status: '0x1' }) });
  assert.deepEqual(await call('m', [], ['a', 'b'], one), { status: '0x1' });
});

test('null only when every endpoint that answered says null', async () => {
  const one = fake({ a: later(1, null), b: later(5, 'down', true) });
  assert.equal(await call('m', [], ['a', 'b'], one), null);
});

test('an error on one endpoint is ignored when another answers', async () => {
  const one = fake({ a: later(1, 'down', true), b: later(5, 'ok') });
  assert.equal(await call('m', [], ['a', 'b'], one), 'ok');
});

test('throws when no endpoint answers', async () => {
  const one = fake({ a: later(1, 'down a', true), b: later(2, 'down b', true) });
  await assert.rejects(call('m', [], ['a', 'b'], one), /down a/);
});
