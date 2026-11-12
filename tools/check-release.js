#!/usr/bin/env node
// 配信ファイルの版と、生成ガイドが現在の単元データに一致するか確認する。
const fs = require('fs'), path = require('path'), crypto = require('crypto'), os = require('os');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const errors = [];
const re = /(?:src|href)=["'](data\/(?:gen\/)?[\w.-]+\.js|vendor\/[\w./-]+\.(?:js|css))(?:\?v=([0-9a-f]{8}))?["']/g;
for (const m of html.matchAll(re)) {
  const file = path.join(root, ...m[1].split('/'));
  if (!fs.existsSync(file)) { errors.push(`ファイルがない: ${m[1]}`); continue; }
  const hash = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').slice(0, 8);
  if (m[2] !== hash) errors.push(`版が違う: ${m[1]} (?v=${m[2] || 'なし'}、実際=${hash})`);
}
const {load, pageName} = require('./guide-lib');
const units = load().MH_UNITS.UNITS;
for (const u of units) {
  const file = path.join(root, 'guide', pageName(u.g, u.subj));
  if (!fs.existsSync(file) || !fs.readFileSync(file, 'utf8').includes(`id="${u.id}"`)) errors.push(`ガイドが古い: ${u.id}`);
}
const guideIndex = path.join(root, 'guide/index.html');
if (!fs.existsSync(guideIndex) || !fs.readFileSync(guideIndex, 'utf8').includes(`${units.length}単元`)) errors.push(`ガイドの単元数が古い: 現在 ${units.length}`);
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log(`OK: 配信ファイルの版とガイド ${units.length}単元`);
