#!/usr/bin/env node
// index.html の <head> の 住所（canonical・og:url・og:image・twitter:image）を data/move.js の SITE に そろえる。
// ON（公開の日）で 新しい住所、それまでは 今の 住所。guide/・sitemap.xml・robots.txt は build-guide.js が 同じ 設定から 書く。
// --check：書きかえずに、そろっていなければ 失敗する。
const fs = require('fs'), path = require('path');
const MOVE = require('../data/move.js');
const root = path.resolve(__dirname, '..');
const file = path.join(root, 'index.html');
const src = fs.readFileSync(file, 'utf8');
const end = src.indexOf('</head>');
const esc = s => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
const any = new RegExp(`((?:href|content)=")(?:${esc(MOVE.OLD_BASE)}|${esc(MOVE.NEW_BASE)})`, 'g');
const head = src.slice(0, end).replace(any, `$1${MOVE.BASE}`);
const out = head + src.slice(end);
const n = (head.match(new RegExp(esc(MOVE.BASE), 'g')) || []).length;
if (n < 4) { console.error(`index.html の <head> に 住所が ${n}つ しか ない（canonical・og:url・og:image・twitter:image の 4つ）`); process.exit(1); }
if (process.argv.includes('--check')) {
  if (out !== src) { console.error(`index.html の 住所が data/move.js の 設定（${MOVE.BASE}）と ちがう（node tools/site-url.js）`); process.exit(1); }
} else if (out !== src) fs.writeFileSync(file, out, 'utf8');
console.log(`site url: ${MOVE.BASE}（おひっこし ${MOVE.SITE.ON ? 'オン' : 'オフ'}）`);
