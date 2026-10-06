// Server-rendered proof page for /p/<hash>?seller=<addr>. Anyone can open the
// link and see the verdict, read fresh from the chain. Nothing is stored.
import { LABEL, FAKE_EXPLAINER } from './labels.js';
import { proofUrl, whatsappUrl } from './share.js';

const EXPLORER = 'https://explorer.arc.io';

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export function proofPage({ hash, seller, expected, result, origin = '' }) {
  const label = LABEL[result.verdict] || result.verdict;
  const short = hash.slice(0, 10) + '...' + hash.slice(-6);
  const isFake = result.verdict === 'FAKE_TOKEN';
  const fake = result.fakeToken
    ? `<p class="meta">${isFake ? esc(FAKE_EXPLAINER) + ' ' : ''}<a href="${EXPLORER}/token/${esc(result.fakeToken)}" target="_blank" rel="noopener">${isFake ? 'See the fake token on the explorer' : 'See this token on the explorer'}</a>.</p>`
    : '';
  const link = proofUrl(origin, hash, seller, expected);
  const wa = whatsappUrl(`TruePaid check: ${label}. ${result.reason} ${link}`);
  const want = expected ? `<tr><td>Amount expected</td><td>${esc(expected)} USDC</td></tr>` : '';
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(label)} - TruePaid</title>
<meta name="description" content="${esc(label)}: ${esc(result.reason)}">
<link rel="stylesheet" href="/style.css">
</head>
<body>
<main>
  <p class="brand"><a href="/">TruePaid</a></p>
  <section class="card" role="status">
    <p class="verdict ${esc(result.verdict)}">${esc(label)}</p>
    <p class="why">${esc(result.reason)}</p>
    ${fake}
  </section>
  <table class="facts">
    <tr><td>Transaction</td><td><code>${esc(hash)}</code></td></tr>
    <tr><td>Seller address</td><td><code>${esc(seller)}</code></td></tr>
    ${want}
  </table>
  <p class="meta">This page was read from Arc mainnet when you opened it. Nothing is saved. Open it again any time and it checks again.</p>
  <p><a class="btn wa" href="${esc(wa)}" target="_blank" rel="noopener">Share on WhatsApp</a></p>
  <p class="meta"><a href="${EXPLORER}/tx/${esc(hash)}" target="_blank" rel="noopener">Open this transaction on the Arc explorer</a></p>
  <p><a class="btn ghost" href="/?hash=${encodeURIComponent(hash)}&seller=${encodeURIComponent(seller)}">Check another payment</a></p>
  <small>Short form: <code>${esc(short)}</code></small>
</main>
</body>
</html>`;
}

export function proofError(message) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>TruePaid</title><link rel="stylesheet" href="/style.css"></head>
<body><main><p class="brand"><a href="/">TruePaid</a></p>
<section class="card"><p class="verdict UNVERIFIED">CANNOT VERIFY</p><p class="why">${esc(message)}</p></section>
<p><a class="btn" href="/">Check a payment</a></p></main></body></html>`;
}
