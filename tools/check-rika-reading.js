#!/usr/bin/env node
/* 理科の表示文字列を、ふりがな検査と同じシード・回数で検査する。 */
const fs = require('fs'), path = require('path'), vm = require('vm');
const QZ = require('../data/quizlib.js');
const root = path.join(__dirname, '..'), ctx = { window: {} };
vm.createContext(ctx);
const files = ['data/kanji-grade.js','data/questions.js','data/calc.js','data/choices.js','data/gen/core.js'];
for (const f of fs.readdirSync(path.join(root, 'data/gen')).sort())
  if (f !== 'core.js' && f.endsWith('.js')) files.push('data/gen/' + f);
files.push('data/units.js');
for (const f of files) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
const args = process.argv.slice(2);
const grades = args.filter(x => /^[3-6]$/.test(x)).map(Number);
const selected = grades.length ? grades : [3, 4, 5, 6];
const N = Number(args.find(x => /^\d+$/.test(x) && Number(x) > 6)) || 1000;
const G = ctx.window.MH_GEN, units = ctx.window.MH_UNITS;
const errors = new Set(), seen = new Set();
const HAN = /[㐀-䶿一-鿿々〆〇ヶ]/u;
function check(where, value) {
  if (value == null) return;
  const s = String(value), id = where + '\0' + s;
  if (seen.has(id)) return;
  seen.add(id);
  const parts = QZ.rubyParts(s);
  let bare = '';
  for (const p of parts) {
    if (p.b == null) bare += p.t;
    else {
      if (!HAN.test(p.b)) errors.add(`${where}: ${s}（ひらがなだけに読み: ${p.b}）`);
      if (!/^[ぁ-ゖァ-ヶー]+$/u.test(p.r)) errors.add(`${where}: ${s}（読みが不正: ${p.r}）`);
    }
  }
  if (HAN.test(bare) || /[《》]/u.test(bare)) errors.add(`${where}: ${s}（未読: ${bare}）`);
  const expected = G.rikaRuby(QZ.plain(s));
  if (expected !== s) errors.add(`${where}: ${s}（正: ${expected}）`);
}
for (const u of units.UNITS.filter(u => u.subj === 'rika' && selected.includes(u.g))) {
  for (const field of ['title','note','ex','stepLabel']) check(`${u.id}.${field}`, u[field]);
  if (u.status !== 'ready') continue;
  for (let i = 0; i < N; i++) {
    let q;
    try { q = units.make(u, `fg|${u.id}|${i}`); }
    catch (e) { errors.add(`${u.id}: 作成失敗 ${e.message}`); break; }
    for (const field of ['q','a','stem']) check(`${u.id}.${field}`, q[field]);
    for (const s of q.choices || []) check(`${u.id}.choices`, s);
  }
}
for (const s of units.UNIT_SETS || []) if (selected.includes(s.g) && s.subj === 'rika') check(`${s.id}.title`, s.title);
for (const e of errors) console.error(e);
console.log(`理科 ${selected.join(',')}年: ${seen.size}文字列、エラー ${errors.size}件`);
if (errors.size) process.exitCode = 1;

