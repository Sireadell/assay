// Asks the TruePaid checker for a verdict. Runs here, not in the page, so the
// explorer page's own rules cannot block the request.
const API = 'https://truepaid.vercel.app/api/check';

chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
  if (msg?.type !== 'check') return;
  const q = new URLSearchParams({ hash: msg.hash, seller: msg.seller });
  fetch(`${API}?${q}`)
    .then((r) => r.json())
    .then((d) => reply({ ok: true, d }))
    .catch((e) => reply({ ok: false, error: String(e && e.message) }));
  return true; // reply comes later
});
