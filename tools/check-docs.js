#!/usr/bin/env node
// 保存キーと画像の記載漏れを公開前に検出する。
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const html = read('index.html'), about = read('guide/about.html'), readme = read('README.md');
const keys = new Set();
const aliases = new Map([...html.matchAll(/\b([A-Z][A-Z0-9_]*)\s*=\s*["'](mh_[\w]+)["']/g)].map(m => [m[1], m[2]]));
for (const m of html.matchAll(/(?:localStorage|sessionStorage)\.(?:getItem|setItem|removeItem)\(\s*(["']mh_[\w]+["']|[A-Z][A-Z0-9_]*)/g)) {
  const key = m[1].replace(/["']/g, ''); keys.add(aliases.get(key) || key);
}
for (const m of html.matchAll(/\b(?:store\.(?:get|set)|sget|sset)\(\s*(["']mh_[\w]+["']|[A-Z][A-Z0-9_]*)/g)) {
  const key = m[1].replace(/["']/g, ''); keys.add(aliases.get(key) || key);
}
const documented = new Set([...about.matchAll(/<code>(mh_[\w]+)<\/code>/g)].map(m => m[1]));
let errors = 0;
for (const key of keys) if (key.startsWith('mh_') && !documented.has(key)) { console.error(`保存キーの記載なし: ${key}`); errors++; }
for (const key of documented) if (!keys.has(key)) { console.error(`未使用の保存キー記載: ${key}`); errors++; }
const images = fs.readdirSync(path.join(root, 'vendor/img')).filter(f => fs.statSync(path.join(root, 'vendor/img', f)).isFile()).sort();
for (const file of images) if (!readme.includes(`vendor/img/${file}`)) { console.error(`画像の説明なし: vendor/img/${file}`); errors++; }
for (const m of readme.matchAll(/vendor\/img\/([\w.-]+\.png)/g)) if (!images.includes(m[1])) { console.error(`存在しない画像の説明: ${m[1]}`); errors++; }
if (errors) process.exit(1);
console.log(`文書照合: 保存キー ${keys.size} 件、画像 ${images.length} 件が一致`);
