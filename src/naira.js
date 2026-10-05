// Naira to USDC conversion. Pure functions, no network, no price feed.
// The user types the rate, so TruePaid never guesses a price for them.
import { formatUsdc } from './verdict.js';

// "12,500.50" -> 1250050n (hundredths). Null if not a plain positive number.
function toHundredths(text) {
  const m = /^(\d+)(?:\.(\d{1,2}))?$/.exec(String(text || '').replace(/[,\s]/g, ''));
  if (!m) return null;
  return BigInt(m[1]) * 100n + BigInt((m[2] || '').padEnd(2, '0') || '0');
}

// Returns the USDC amount as a string rounded to cents, or null.
export function nairaToUsdc(nairaText, rateText) {
  const naira = toHundredths(nairaText);
  const rate = toHundredths(rateText);
  if (naira === null || rate === null || rate === 0n || naira === 0n) return null;
  // cents of USDC = naira / rate * 100, rounded half up
  const cents = (naira * 100n * 2n + rate) / (rate * 2n);
  const micro = cents * 10_000n;
  const out = formatUsdc(micro);
  return out === '0' ? null : out;
}
