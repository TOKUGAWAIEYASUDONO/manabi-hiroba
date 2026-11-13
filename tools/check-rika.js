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
  const minimum = 8;
  if (!rows || rows.length < minimum) { errors.push(`${u.id}: 知識行が${minimum}件未満`); continue; }
  for (const row of rows) if (row.length !== 5 || new Set(row.slice(1)).size !== 4) errors.push(`${u.id}: 4択の重複または不足`);
  for (const row of rows) {
    const plain = s => String(s).replace(/《[^》]*》/g, '').replace(/[｜|]/g, '');
    const [stem, answer, ...wrong] = row.map(plain);
    if (/すこなくなる|とむ関係|子魚|水溶液|しんしょく/.test(row.join('')) && (u.id === 'r5-solubility' || u.id === 'r5-animal' || u.id === 'r6-water' || u.id === 'r4-land')) errors.push(`${u.id}: 壊れた語・学年外の語`);
    if (/氷がとけ/.test(stem) && wrong.includes('水てき')) errors.push(`${u.id}: 水と水てきがともに正答に見える`);
    if (/はたらきは$/.test(stem) && /どう なる？$/.test(stem)) errors.push(`${u.id}: はたらきの問いが崩れている`);
    if (/理由$/.test(stem) && /なぜ/.test(stem)) errors.push(`${u.id}: 理由となぜの重複`);
  }
  const answerCounts = new Map();
  for (const row of rows) answerCounts.set(row[1], (answerCounts.get(row[1]) || 0) + 1);
  for (const [answer, n] of answerCounts) if (n > 2) errors.push(`${u.id}: 同じ答え「${answer}」が${n}件`);
  for (let i = 0; i < rows.length * 2; i++) {
    const q = ctx.window.MH_UNITS.make(u, `rika-check-${i}`);
    if (q.reviewed !== false || q.ans !== 'choice4' || q.choices.length !== 4 || !q.choices.includes(q.a)) errors.push(`${u.id}: 生成結果が不正`);
    if (/はは？|がが|をを|では？$|何というかは？|[はをでにと]は？$/.test(q.q)) errors.push(`${u.id}: 不自然な問題文「${q.q}」`);
    const answer = q.a.replace(/《[^》]*》/g, '');
    if (/こと\s*どう\s*なる？$|することは\s*どう\s*なる？$/.test(q.q)) errors.push(`${u.id}: 崩れた問い「${q.q}」`);
    if (/どれ？$|どちら？$/.test(q.q) && /(?:なる|する|れる|られる|できる|動く|進む|流れる|変わる|通す|通さない|つく|つかない|ふえる|へる|止まる|育つ|にごる|近づく|出る|行く|同じ)$/.test(answer)) errors.push(`${u.id}: 選ぶ問いに変化・動作の答え「${q.q} → ${q.a}」`);
    if (/どう\s*なる？$|どう\s*動く？$/.test(q.q) && /^(?:根|葉|花|実|水|氷|鉄|銅|東|西|南|北|温度計|石灰水|ヨウそ液)$/.test(answer)) errors.push(`${u.id}: 変化の問いに名詞の答え「${q.q} → ${q.a}」`);
  }
}
console.log(`理科 ${units.length}単元・全学年各8知識以上／エラー ${errors.length}件`);
for (const e of errors) console.error(e);
if (errors.length) process.exit(1);

