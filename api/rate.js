import { handleRate } from '../src/handlers.js';

export default async function handler(req, res) {
  const r = await handleRate();
  res.setHeader('content-type', 'application/json');
  // A price a few minutes old is fine, and it keeps the page fast.
  res.setHeader('cache-control', r.code === 200 ? 'public, s-maxage=300, stale-while-revalidate=600' : 'no-store');
  res.statusCode = r.code;
  res.end(JSON.stringify(r.body));
}
