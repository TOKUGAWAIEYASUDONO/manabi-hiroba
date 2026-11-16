#!/usr/bin/env node
// 新しい1〜3年単元の境界条件を各1000問、独立に検査する。
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..'), ctx = { window: {} }; vm.createContext(ctx);
for (const f of ['data/kanji-grade.js','data/questions.js','data/choices.js','data/gen/core.js', ...fs.readdirSync(path.join(root,'data/gen')).filter(x => x !== 'core.js' && x.endsWith('.js')).sort().map(x => 'data/gen/' + x), 'data/units.js']) vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx,{filename:f});
const U = ctx.window.MH_UNITS, ids = U.UNITS.filter(u => u.subj === 'sansu' && u.g <= 3 && u.step >= 100 && u.step < 200);
const assert = (ok, id, q) => { if (!ok) throw Error(`${id}: ${q}`); };
for (const u of ids) for (let i = 0; i < 1000; i++) {
  let it; try { it = U.make(u, `detail|${i}`); } catch (e) { throw Error(`${u.id}: ${e.message}`); }
  const p = u.params, m = U.plain(it.q).match(/^(\d+(?:\.\d+)?)\s*([+−×÷])\s*(\d+(?:\.\d+)?)(?:\s*\+\s*(\d+))?$/);
  assert(!!m || u.id === 'm1-make10', u.id, it.q);
  if (!m) continue;
  const a = +m[1], b = +m[3], c = m[4] ? +m[4] : 0, v = +it.a;
  if (m[2] === '+') assert(Math.abs(v-a-b-c) < 1e-8, u.id, it.q);
  if (m[2] === '−') assert(Math.abs(v-a+b) < 1e-8, u.id, it.q);
  if (m[2] === '×') assert(v === a*b, u.id, it.q);
  if (p.min != null) assert(v >= p.min, u.id, it.q);
  if (p.max != null) assert(v <= p.max, u.id, it.q);
  if (p.range) assert(a >= p.range[0] && a <= p.range[1] && b >= p.range[2] && b <= p.range[3], u.id, it.q);
  if (p.a) assert(a >= p.a[0] && a <= p.a[1] && b >= p.b[0] && b <= p.b[1], u.id, it.q);
  if (p.carry === 'none') assert(a%10+b%10 < 10, u.id, it.q);
  if (p.carry === 'ones') assert(a%10+b%10 >= 10 && v < 100, u.id, it.q);
  if (p.borrow === 'none') assert(a%10 >= b%10, u.id, it.q);
  if (p.borrow === 'ones') assert(a%10 < b%10, u.id, it.q);
  if (p.pattern) { let x=a,y=b,borrow=0,carry=0,got=''; for(let k=0;k<3;k++){ const d=x%10,e=y%10; if(m[2]==='−'){borrow=+(d-borrow<e);got+=borrow;}else{carry=+(d+e+carry>=10);got+=carry;}x=Math.floor(x/10);y=Math.floor(y/10);} assert(got===p.pattern,u.id,it.q); }
  if (p.hissan || p.a) assert(!!it.hissan, u.id, it.q);
}
console.log(`細分単元 ${ids.length} 件・各1000問: 合格`);
