#!/usr/bin/env node
/* 理科バンクの構造検査。ふりがな・内容の人手確認は別途必要。 */
const fs = require('fs'), vm = require('vm'), path = require('path');
const root = path.join(__dirname, '..');
const ctx = { window: {} }; vm.createContext(ctx);
for (const f of ['data/gen/core.js', 'data/gen/rika.js', 'data/units.js']) {
  // units.js には他教科の型があるが、この検査は理科だけを生成する。
  vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
}
const bank = ctx.window.MH_GEN.rikaBank;
const units = ctx.window.MH_UNITS.UNITS.filter(u => u.subj === 'rika');
let errors = [];
if (units.length !== 40) errors.push(`理科単元 ${units.length} 件（40件の予定）`);
for (const u of units) {
  const rows = bank[u.id];
  const minimum = u.g <= 4 ? 8 : 4;
  if (!rows || rows.length < minimum) { errors.push(`${u.id}: 知識行が${minimum}件未満`); continue; }
  for (const row of rows) if (row.length !== 5 || new Set(row.slice(1)).size !== 4) errors.push(`${u.id}: 4択の重複または不足`);
  for (let i = 0; i < rows.length * 2; i++) {
    const q = ctx.window.MH_UNITS.make(u, `rika-check-${i}`);
    if (q.reviewed !== false || q.ans !== 'choice4' || q.choices.length !== 4 || !q.choices.includes(q.a)) errors.push(`${u.id}: 生成結果が不正`);
  }
}
console.log(`理科 ${units.length}単元・3・4年は各8知識以上／エラー ${errors.length}件`);
for (const e of errors) console.error(e);
if (errors.length) process.exit(1);

