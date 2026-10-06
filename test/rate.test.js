import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fetchRate } from '../src/rate.js';

const ok = (body) => ({ ok: true, status: 200, json: async () => body });
const down = { ok: false, status: 503, json: async () => ({}) };

test('uses CoinGecko for the dollar and naira price of USDC', async () => {
  const f = async () => ok({ 'usd-coin': { usd: 0.999953, ngn: 1324.54, last_updated_at: 1791304210 } });
  const r = await fetchRate(f);
  assert.equal(r.usd, 0.999953);
  assert.equal(r.ngn, 1324.54);
  assert.equal(r.source, 'CoinGecko');
  assert.equal(r.updated, 1791304210000);
});

test('falls back to the official dollar rate and leaves the dollar price out', async () => {
  const f = async (url) => (url.includes('coingecko') ? down : ok({ rates: { NGN: 1330.99 }, time_last_update_unix: 1791300000 }));
  const r = await fetchRate(f);
  assert.equal(r.usd, null);
  assert.equal(r.ngn, 1330.99);
  assert.match(r.source, /official/);
});

test('a nonsense answer is not shown as a price', async () => {
  const f = async (url) => (url.includes('coingecko') ? ok({ 'usd-coin': { usd: 0, ngn: -3 } }) : ok({ rates: {} }));
  await assert.rejects(fetchRate(f), /no price source/);
});

test('fails when both sources are down', async () => {
  await assert.rejects(fetchRate(async () => down), /HTTP 503/);
});
