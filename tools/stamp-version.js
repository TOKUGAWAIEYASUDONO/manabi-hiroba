#!/usr/bin/env node
// index.html の JS/CSS に内容ベースの決定的な版を付ける。
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const root = path.resolve(__dirname, '..');
const file = path.join(root, 'index.html');
const source = fs.readFileSync(file, 'utf8');
const target = /(["'])(data\/(?:gen\/)?[\w.-]+\.js|vendor\/[\w./-]+\.(?:js|css))(?:\?v=[0-9a-f]{8})?\1/g;
const stamped = source.replace(target, (match, quote, name) => {
  const full = path.join(root, ...name.split('/'));
  if (!fs.existsSync(full)) throw new Error(`Missing asset: ${name}`);
  const version = crypto.createHash('sha256').update(fs.readFileSync(full)).digest('hex').slice(0, 8);
  return `${quote}${name}?v=${version}${quote}`;
});
if (process.argv.includes('--check')) {
  if (stamped !== source) { console.error('index.html の版が古い（他担当の編集対象なので書き換えていません）'); process.exit(1); }
} else if (stamped !== source) fs.writeFileSync(file, stamped, 'utf8');
console.log('index.html asset versions stamped');
