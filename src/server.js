import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fetchPayment } from './arcRpc.js';
import { decide } from './verdict.js';
import { proofPage, proofError } from './proofPage.js';
import { extractHash } from './share.js';

const PORT = process.env.PORT || 8787;
const HASH = /^0x[0-9a-fA-F]{64}$/;

const send = (res, code, body, type = 'application/json') => {
  res.writeHead(code, { 'content-type': type, 'cache-control': 'no-store' });
  res.end(typeof body === 'string' ? body : JSON.stringify(body));
};

// Files the browser page is allowed to load. Nothing else is served from disk.
const STATIC = {
  '/': ['../public/index.html', 'text/html; charset=utf-8'],
  '/index.html': ['../public/index.html', 'text/html; charset=utf-8'],
  '/style.css': ['../public/style.css', 'text/css; charset=utf-8'],
  '/verdict.js': ['./verdict.js', 'text/javascript; charset=utf-8'],
  '/naira.js': ['./naira.js', 'text/javascript; charset=utf-8'],
  '/share.js': ['./share.js', 'text/javascript; charset=utf-8'],
  '/stamp.js': ['./stamp.js', 'text/javascript; charset=utf-8'],
  '/labels.js': ['./labels.js', 'text/javascript; charset=utf-8'],
};

async function check(hash, seller, expected) {
  const p = await fetchPayment(hash);
  return { hash, ...decide({ ...p, seller, expected }) };
}

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/api/check') {
    const hash = extractHash(url.searchParams.get('hash')) || url.searchParams.get('hash') || '';
    const seller = url.searchParams.get('seller') || '';
    const expected = url.searchParams.get('expected') || undefined;
    if (!HASH.test(hash)) return send(res, 400, { verdict: 'UNVERIFIED', reason: 'That is not a transaction hash. It should start with 0x and be 66 characters long.' });
    try {
      return send(res, 200, await check(hash, seller, expected));
    } catch (e) {
      return send(res, 502, { verdict: 'UNVERIFIED', reason: `Could not reach Arc right now (${e.message}). Try again.` });
    }
  }
  const proof = /^\/p\/([^/]+)$/.exec(url.pathname);
  if (proof) {
    const hash = extractHash(decodeURIComponent(proof[1])) || decodeURIComponent(proof[1]);
    const seller = url.searchParams.get('seller') || '';
    const expected = url.searchParams.get('expected') || undefined;
    const html = 'text/html; charset=utf-8';
    if (!HASH.test(hash)) return send(res, 400, proofError('That is not a transaction hash. It should start with 0x and be 66 characters long.'), html);
    try {
      const result = await check(hash, seller, expected);
      return send(res, 200, proofPage({ hash, seller, expected, result, origin: `${req.headers['x-forwarded-proto'] || 'http'}://${req.headers.host}` }), html);
    } catch (e) {
      return send(res, 502, proofError(`Could not reach Arc right now (${e.message}). Try again.`), html);
    }
  }
  const file = STATIC[url.pathname];
  if (file) return send(res, 200, await readFile(new URL(file[0], import.meta.url), 'utf8'), file[1]);
  send(res, 404, { error: 'not found' });
}).listen(PORT, () => console.log(`TruePaid listening on :${PORT}`));
