// Local server. The live site runs the same logic as Vercel functions in api/.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { handleCheck, handleProof } from './handlers.js';

const PORT = process.env.PORT || 8787;
const JSON_TYPE = 'application/json';
const HTML = 'text/html; charset=utf-8';
const JS = 'text/javascript; charset=utf-8';

const send = (res, code, body, type = JSON_TYPE) => {
  res.writeHead(code, { 'content-type': type, 'cache-control': 'no-store' });
  res.end(typeof body === 'string' ? body : JSON.stringify(body));
};

// Files the browser page is allowed to load. Nothing else is served from disk.
const STATIC = {
  '/': ['../public/index.html', HTML],
  '/index.html': ['../public/index.html', HTML],
  '/style.css': ['../public/style.css', 'text/css; charset=utf-8'],
  '/verdict.js': ['./verdict.js', JS],
  '/naira.js': ['./naira.js', JS],
  '/share.js': ['./share.js', JS],
  '/stamp.js': ['./stamp.js', JS],
  '/labels.js': ['./labels.js', JS],
};

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/api/check') {
    const r = await handleCheck(url.searchParams);
    return send(res, r.code, r.body);
  }
  const proof = /^\/p\/([^/]+)$/.exec(url.pathname);
  if (proof) {
    const origin = `${req.headers['x-forwarded-proto'] || 'http'}://${req.headers.host}`;
    const r = await handleProof(decodeURIComponent(proof[1]), url.searchParams, origin);
    return send(res, r.code, r.body, HTML);
  }
  const file = STATIC[url.pathname];
  if (file) return send(res, 200, await readFile(new URL(file[0], import.meta.url), 'utf8'), file[1]);
  send(res, 404, { error: 'not found' });
}).listen(PORT, () => console.log(`TruePaid listening on :${PORT}`));
