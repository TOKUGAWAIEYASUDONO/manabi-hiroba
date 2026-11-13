#!/usr/bin/env node
// 保存キーと画像の記載漏れを公開前に検出する。
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const html = read('index.html'), about = read('guide/about.html'), readme = read('README.md');
const sources = ['index.html', ...fs.readdirSync(path.join(root, 'data')).filter(f => f.endsWith('.js')).map(f => `data/${f}`), ...fs.readdirSync(path.join(root, 'guide')).filter(f => f.endsWith('.html')).map(f => `guide/${f}`)];
const keys = new Set();
for (const file of sources) {
  const src = read(file);
  const aliases = new Map([...src.matchAll(/\b([A-Z][A-Z0-9_]*)\s*=\s*["'](mh_[\w]+)["']/g)].map(m => [m[1], m[2]]));
  for (const re of [/(?:localStorage|sessionStorage)\.(?:getItem|setItem|removeItem)\(\s*(["']mh_[\w]+["']|[A-Z][A-Z0-9_]*)/g, /\b(?:store\.(?:get|set)|sget|sset)\(\s*(["']mh_[\w]+["']|[A-Z][A-Z0-9_]*)/g]) {
    for (const m of src.matchAll(re)) { const key = m[1].replace(/["']/g, ''); keys.add(aliases.get(key) || key); }
  }
}
const documented = new Set([...about.matchAll(/<code>(mh_[\w]+)<\/code>/g)].map(m => m[1]));
let errors = 0;
for (const key of keys) if (key.startsWith('mh_') && !documented.has(key)) { console.error(`保存キーの記載なし: ${key}`); errors++; }
for (const key of documented) if (!keys.has(key)) { console.error(`未使用の保存キー記載: ${key}`); errors++; }
const images = fs.readdirSync(path.join(root, 'vendor/img')).filter(f => fs.statSync(path.join(root, 'vendor/img', f)).isFile()).sort();
for (const file of images) {
  const name = `vendor/img/${file}`;
  const cc0 = /coin\.png|planet\.png/.test(file) && readme.split('\n').find(line => line.includes('絵（CC0）'))?.includes(name);
  const own = readme.split('\n').find(line => line.includes('共有画像'))?.includes(name);
  if (Number(!!cc0) + Number(!!own) !== 1) { console.error(`画像の分類が不正: ${name}`); errors++; }
}
for (const m of readme.matchAll(/vendor\/img\/([\w.-]+\.png)/g)) if (!images.includes(m[1])) { console.error(`存在しない画像の説明: ${m[1]}`); errors++; }
for (const [label, re] of [['90分', /90分/], ['2秒', /2秒/]]) for (const [file, src] of [['README.md', readme], ['guide/about.html', about], ['index.html', html]]) if (!re.test(src)) { console.error(`${file}: ${label} の記載なし`); errors++; }
if (!/90\s*\*\s*60\s*\*\s*1000|90\s*\*\s*60000|5400000/.test(html)) { console.error('コードの90分設定が見つかりません'); errors++; }
if (errors) process.exit(1);
console.log(`文書照合: 保存キー ${keys.size} 件、画像 ${images.length} 件が一致`);
