// Today's USDC price, for reference only. Assay never uses it to decide a
// verdict. It is shown at the top of the page and can fill the naira rate field.
//
// CoinGecko gives the USDC price in dollars and naira. If it is down, the
// official dollar to naira rate is the fallback (then the dollar price of USDC
// is unknown, so it is left out rather than guessed).
const COINGECKO = 'https://api.coingecko.com/api/v3/simple/price?ids=usd-coin&vs_currencies=usd,ngn&include_last_updated_at=true';
const ER_API = 'https://open.er-api.com/v6/latest/USD';
const TIMEOUT_MS = 8000;

const get = async (url, f) => {
  const res = await f(url, { signal: AbortSignal.timeout(TIMEOUT_MS), headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};
const sane = (n) => typeof n === 'number' && Number.isFinite(n) && n > 0;

export async function fetchRate(f = fetch) {
  try {
    const d = (await get(COINGECKO, f))['usd-coin'];
    if (sane(d?.ngn) && sane(d?.usd)) {
      return { usd: d.usd, ngn: d.ngn, source: 'CoinGecko', updated: d.last_updated_at ? d.last_updated_at * 1000 : Date.now() };
    }
  } catch { /* fall through to the second source */ }
  const d = await get(ER_API, f);
  const ngn = d?.rates?.NGN;
  if (!sane(ngn)) throw new Error('no price source answered');
  return {
    usd: null,
    ngn,
    source: 'official dollar rate (exchangerate-api.com)',
    updated: d.time_last_update_unix ? d.time_last_update_unix * 1000 : Date.now(),
  };
}
