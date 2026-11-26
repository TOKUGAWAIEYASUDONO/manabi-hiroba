#!/usr/bin/env node
// index.html の JS/CSS に内容ベースの決定的な版を付ける。
// move.html（新しい住所の 受けとり）・404.html（ないページ）と apps/100masu/index.html の data/move.js（おひっこし）にも 同じ 版を 付ける
// （100マスの サービスワーカーは 同じ URL の 物を キャッシュから 出すので、版が かわらないと 古い 設定の まま 動く）。
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const root = path.resolve(__dirname, '..');
const target = /(["'])((?:\.\.\/)*)(data\/(?:gen\/)?[\w.-]+\.js|vendor\/[\w./-]+\.(?:js|css))(?:\?v=[0-9a-f]{8})?\1/g;
let bad = false;
for (const rel of ['index.html', 'move.html', '404.html', 'stats.html', 'apps/100masu/index.html']) {
  const file = path.join(root, ...rel.split('/'));
  if (!fs.existsSync(file)) continue;
  const source = fs.readFileSync(file, 'utf8');
  const stamped = source.replace(target, (match, quote, up, name) => {
    const full = path.join(path.dirname(file), up, ...name.split('/'));
    if (!fs.existsSync(full)) throw new Error(`Missing asset: ${up}${name} (${rel})`);
    const version = crypto.createHash('sha256').update(fs.readFileSync(full)).digest('hex').slice(0, 8);
    return `${quote}${up}${name}?v=${version}${quote}`;
  });
  if (process.argv.includes('--check')) {
    if (stamped !== source) { console.error(`${rel} の版が古い（他担当の編集対象なので書き換えていません）`); bad = true; }
  } else if (stamped !== source) fs.writeFileSync(file, stamped, 'utf8');
}
if (bad) process.exit(1);
console.log('index.html asset versions stamped');
