import { handleProof } from '../src/handlers.js';

// /p/<hash> is rewritten here by vercel.json, with the hash as ?hash=.
export default async function handler(req, res) {
  const url = new URL(req.url, 'http://x');
  const origin = `https://${req.headers['x-forwarded-host'] || req.headers.host}`;
  const r = await handleProof(url.searchParams.get('hash') || '', url.searchParams, origin);
  res.setHeader('content-type', 'text/html; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.statusCode = r.code;
  res.end(r.body);
}
