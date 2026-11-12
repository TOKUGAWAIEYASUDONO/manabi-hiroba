#!/usr/bin/env node
/* index.html の静的初回読み込み量。転送時間・圧縮量・動的通信は含めない。 */
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'vendor/fonts/biz-udpgothic.css'), 'utf8');
const files = new Set(['index.html']);
for (const m of html.matchAll(/<(?:script|link)\b[^>]*?(?:src|href)="([^"]+)"/g)) if (!/^(?:https?:|\/\/|data:)/.test(m[1])) files.add(m[1].split(/[?#]/)[0]);
// ホームの静的表示テキストに必要な文字。動的な画面・出題後の追加文字は含めない。
const home = html.slice(html.indexOf('<body'), html.indexOf('<script src='));
const chars = new Set(home.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, '').split(''));
const fontFiles = new Set();
for (const face of css.matchAll(/@font-face\s*\{([^}]+)\}/g)) {
  const src = face[1].match(/url\(([^)]+)\)/), range = face[1].match(/unicode-range:\s*([^;]+);/);
  if (!src || !range) continue;
  const intervals = [...range[1].matchAll(/U\+([0-9a-f]+)(?:-([0-9a-f]+))?/gi)].map(m => [parseInt(m[1], 16), parseInt(m[2] || m[1], 16)]);
  if ([...chars].some(c => intervals.some(([a,b]) => c.codePointAt(0) >= a && c.codePointAt(0) <= b))) fontFiles.add('vendor/fonts/' + src[1]);
}
for (const f of fontFiles) files.add(f);
const bytes = f => fs.statSync(path.join(root, f)).size;
console.log(`静的初回読み込み（未圧縮・キャッシュなし）: ${files.size}ファイル、${[...files].reduce((n,f)=>n+bytes(f),0)}バイト`);
console.log(`静的初回読み込み（gzip 個別圧縮の概算）: ${[...files].reduce((n,f)=>n+zlib.gzipSync(fs.readFileSync(path.join(root,f))).length,0)}バイト`);
console.log(`ホーム静的表示のフォント: ${fontFiles.size}ファイル、${[...fontFiles].reduce((n,f)=>n+bytes(f),0)}バイト`);
console.log([...files].sort().map(f=>`${f}\t${bytes(f)}`).join('\n'));
