#!/usr/bin/env node
/* 理科の語単位の読みを検査する。例: node tools/check-rika-reading.js 3 */
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..'), ctx = { window: {} };
vm.createContext(ctx);
for (const f of ['data/gen/core.js','data/gen/rika.js','data/units.js'])
  vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
const grades = process.argv.slice(2).length ? process.argv.slice(2).map(Number) : [3, 4, 5];
if (grades.some(g => !Number.isInteger(g) || g < 3 || g > 6)) throw new Error('学年は3〜6を指定');
const G = ctx.window.MH_GEN, units = ctx.window.MH_UNITS;
const errors = [], seen = new Set(), han = /[㐀-䶿一-鿿々〆〇ヶ]/u;
function check(where, value) {
  if (value == null) return;
  const s = String(value), id = where + '\0' + s;
  if (seen.has(id)) return;
  seen.add(id);
  // 読み付きの語を除いた後に漢字が残れば失敗。
  const bare = s.replace(/(?:[｜|]?[㐀-䶿一-鿿々〆〇ヶぁ-ゖァ-ヶー]+《[ぁ-ゖァ-ヶー]+》)/gu, '');
  if (han.test(bare) || /[《》]/.test(bare)) errors.push(`${where}: ${s}（未読: ${bare}）`);
}
for (const u of units.UNITS.filter(u => u.subj === 'rika' && grades.includes(u.g))) {
  for (const field of ['title','note','ex','stepLabel']) check(`${u.id}.${field}`, u[field]);
  const bank = G.rikaBank[u.id];
  for (let i = 0; i < bank.length * 2; i++) {
    const q = units.make(u, `rika-reading-${i}`);
    for (const field of ['q','a','stem']) check(`${u.id}.${field}`, q[field]);
    q.choices.forEach((s,j) => check(`${u.id}.choice${j+1}`, s));
  }
}
console.log(`理科 ${grades.join(',')}年: ${seen.size}文字列、エラー ${errors.length}件`);
for (const e of errors) console.error(e);
if (errors.length) process.exitCode = 1;
