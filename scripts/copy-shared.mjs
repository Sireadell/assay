// Vercel build step: the page imports these browser-safe modules from the site
// root, so copy them next to index.html. The local server serves them from src/.
import { copyFileSync } from 'node:fs';
for (const f of ['verdict.js', 'naira.js', 'share.js', 'stamp.js', 'labels.js']) {
  copyFileSync(new URL(`../src/${f}`, import.meta.url), new URL(`../public/${f}`, import.meta.url));
}
console.log('copied shared modules into public/');
