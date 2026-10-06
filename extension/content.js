// On an Arc explorer transaction page, shows an Assay badge: did the saved
// address really receive real USDC in this transaction?
// The explorer is a single-page app, so the address bar changes without a page
// load. Watch it and re-check when the transaction changes.
(() => {
  const LABEL = {
    PAID: 'PAID', NOT_PAID: 'NOT PAID', FAKE_TOKEN: 'NOT PAID: FAKE TOKEN', PARTIAL: 'PARTLY PAID',
    OVERPAID: 'OVERPAID', WRONG_COIN: 'PAID IN EURC, NOT USDC', PENDING: 'PENDING',
    WRONG_CHAIN: 'WRONG CHAIN', UNVERIFIED: 'CANNOT VERIFY',
  };
  const COLOR = { PAID: '#0a7d3c', NOT_PAID: '#b3261e', FAKE_TOKEN: '#b3261e', WRONG_CHAIN: '#b3261e' };
  const SITE = 'https://assay-arc.vercel.app';
  const TX = /\/tx\/(0x[0-9a-fA-F]{64})/;
  let shown = '';
  let host = null;

  function box() {
    if (host && document.body.contains(host)) return host.shadowRoot;
    host = document.createElement('div');
    host.id = 'assay-badge';
    host.style.cssText = 'position:fixed;top:12px;right:12px;z-index:2147483647;max-width:360px';
    const root = host.attachShadow({ mode: 'open' });
    document.body.appendChild(host);
    return root;
  }

  function render({ title, color, body, links = [] }) {
    const root = box();
    root.innerHTML = `
      <style>
        .c{font:14px/1.45 system-ui,-apple-system,Segoe UI,sans-serif;background:#fff;color:#1a1a17;border:2px solid ${color};border-radius:12px;padding:14px 16px;box-shadow:0 6px 24px rgba(0,0,0,.18)}
        .k{font-size:12px;color:#6b6b64;margin:0 0 4px;display:flex;justify-content:space-between}
        .t{font-size:20px;font-weight:800;color:${color};margin:0 0 6px}
        p{margin:0 0 6px;overflow-wrap:anywhere}
        a{color:#1a1a17}
        button{all:unset;cursor:pointer;color:#6b6b64;padding:0 4px}
      </style>
      <div class="c" role="status">
        <p class="k"><span>Assay</span><button aria-label="Close">x</button></p>
        <p class="t"></p><p class="b"></p><p class="l"></p>
      </div>`;
    root.querySelector('.t').textContent = title;
    root.querySelector('.b').textContent = body;
    const l = root.querySelector('.l');
    links.forEach(([text, href], i) => {
      if (i) l.append(' · ');
      const a = document.createElement('a');
      a.href = href; a.target = '_blank'; a.rel = 'noopener'; a.textContent = text;
      l.append(a);
    });
    root.querySelector('button').onclick = () => { host.remove(); host = null; };
  }

  async function run() {
    const m = TX.exec(location.pathname);
    if (!m) { if (host) { host.remove(); host = null; } shown = ''; return; }
    const hash = m[1];
    if (hash === shown) return;
    shown = hash;
    const { seller } = await chrome.storage.sync.get('seller');
    if (!seller) {
      render({ title: 'Set your address', color: '#9a6700', body: 'Click the Assay button in your browser toolbar and save your Arc address. Then Assay can tell you if this payment really reached you.' });
      return;
    }
    render({ title: 'Checking...', color: '#6b6b64', body: 'Reading this payment from Arc mainnet.' });
    const r = await chrome.runtime.sendMessage({ type: 'check', hash, seller });
    if (hash !== shown) return; // the page moved on while we waited
    if (!r || !r.ok) {
      render({ title: 'CANNOT VERIFY', color: '#9a6700', body: 'Could not reach the Assay checker. Try again in a moment.' });
      return;
    }
    const d = r.d;
    const proof = `${SITE}/p/${hash}?seller=${encodeURIComponent(seller)}`;
    const short = seller.slice(0, 6) + '...' + seller.slice(-4);
    const links = [['Open proof page', proof]];
    if (d.fakeToken) links.push([d.verdict === 'FAKE_TOKEN' ? 'See the fake token' : 'See this token', `https://explorer.arc.io/token/${d.fakeToken}`]);
    render({
      title: LABEL[d.verdict] || d.verdict,
      color: COLOR[d.verdict] || '#9a6700',
      body: `For your address ${short}: ${d.reason}`,
      links,
    });
  }

  run();
  setInterval(run, 1000);
  chrome.storage.onChanged.addListener((c) => { if (c.seller) { shown = ''; run(); } });
})();
