import { handleCheck } from '../src/handlers.js';

export default async function handler(req, res) {
  const url = new URL(req.url, 'http://x');
  const r = await handleCheck(url.searchParams);
  res.setHeader('content-type', 'application/json');
  res.setHeader('cache-control', 'no-store');
  res.statusCode = r.code;
  res.end(JSON.stringify(r.body));
}
