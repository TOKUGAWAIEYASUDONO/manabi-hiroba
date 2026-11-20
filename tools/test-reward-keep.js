#!/usr/bin/env node
// ごほうびの 基準を かえても、子どもが もう もらった物が へらないことを 調べる（2026-11-19）。
//  前の版の 記録（kp の ない mh_col・mh_best・mh_meter）を いまの 版で ひらいて 保存 →
//  基準を わざと きびしくした 版で ひらく。メダル・★・シールの ランク・じっせき・学びで もらう きせかえ（しょうごう）・
//  ひろばの 遊具・まなびっこの きらきら・どんぐり・買った物の 数が へらないこと。
//  ゆるくした 版では、その分が 新しく もらえること。
// 基準の 数字（data/collection.js・index.html）を かえたら、下の きびしくする 置きかえが まだ 当たっているかも ここで 調べる。
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const root = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const errors = [];
const check = (ok, msg) => { if (!ok) errors.push(msg); };

/* ---------- 1. ひろば（data/collection.js） ---------- */
const colSrc = read('data/collection.js');
function load(src, name) {
  const ctx = { module: { exports: {} }, Math, Date, JSON, Number, Object, Array, Set, Map, String, Error, parseInt };
  ctx.module.exports = {}; vm.createContext(ctx);
  vm.runInContext(src, ctx, { filename: name });
  return ctx.module.exports;
}
// 置きかえ：[説明, 正規表現, 置きかえ]。どれかが 当たらないと 検査が きかないので、当たった数も 調べる
function variant(rules, name) {
  let s = colSrc;
  for (const [what, re, to] of rules) {
    const n = (s.match(re) || []).length;
    if (!n) errors.push(`${name}: 置きかえが 当たらない（${what}）。基準の 書きかたが かわったら この検査も 直すこと`);
    s = s.replace(re, to);
  }
  return load(s, `collection-${name}.js`);
}
const STRICT = [
  ['シール ぎん', /u\[0\] >= 30 && u\[3\]/g, 'u[0] >= 300 && u[3]'],
  ['シール きん', /if \(!\(u\[1\] >= 1\)\) return 2;/g, 'if (!(u[1] >= 9)) return 2;'],
  ['シール にじ', /u\[0\] >= 100 && u\[1\] >= 3/g, 'u[0] >= 1000 && u[1] >= 30'],
  ['遊具の need', /need: (\d+) \}/g, (m, n) => `need: ${n * 10 + 5} }`],
  ['きせかえ can/mst', /un: \["(can|mst)", (\d+)\]/g, (m, c, n) => `un: ["${c}", ${n * 10 + 5}]`],
  ['きせかえ nk', /un: \["nk", \d+\]/g, 'un: ["nk", 9]'],
  ['じっせきの 数', /\["(\w+)", (\d+)\]/g, (m, id, n) => `["${id}", ${n * 10}]`],
  ['きらきら', /YA_KIRA_C = 500, YA_KIRA_K = 5/g, 'YA_KIRA_C = 5000, YA_KIRA_K = 50'],
  ['1日の どんぐり', /const CAP = 20,/g, 'const CAP = 3,'],
  ['買った きせかえを 学びで もらう物に', /\{ id: "h-ribbon", s: "h", ch: "🎀", price: 3 \}/g, '{ id: "h-ribbon", s: "h", ch: "🎀", un: ["can", 999] }'],
  ['かざりの 値段', /price: (\d+) \}/g, (m, n) => `price: ${n * 10} }`],
];
const LOOSE = [
  ['シール ぎん', /u\[0\] >= 30 && u\[3\]/g, 'u[0] >= 1'],
  ['遊具の need', /need: (\d+) \}/g, 'need: 1 }'],
  ['きせかえ can/mst', /un: \["(can|mst)", (\d+)\]/g, (m, c) => `un: ["${c}", 1]`],
];
const cur = load(colSrc, 'data/collection.js'), strict = variant(STRICT, 'strict'), loose = variant(LOOSE, 'loose');
const D = cur.dayNum(new Date(2026, 10, 19));

// 前の版の 記録：算数の 単元 6こが「できた」・2こが「マスター」、シールは どう〜にじ、まなびっこ 2たい（1たいは きらきら）
function oldRaw() {
  const S = cur.clean(null, D - 30), m = cur.UNIT_IDS.filter(id => id[0] === 'm' && cur.uGrade(id) === 3);
  m.slice(0, 6).forEach((id, i) => { S.u[id] = [i < 2 ? 3 : 2, D - 20, D - 10]; });
  S.u['m2-kuku-low'] = [2, D - 20, D - 10];
  const Y = S.y;
  Y.u[m[0]] = [120, 4, 1, 1];      // にじ
  Y.u[m[1]] = [40, 1, 1, 1];       // きん
  Y.u[m[2]] = [35, 0, 1, 1];       // ぎん
  Y.u[m[3]] = [5, 0, 1, 0];        // どう
  for (let i = 4; i < 9; i++) Y.u[m[i] || m[4]] = [50, 2, 1, 1];      // きん
  Y.c = 1200; Y.s.m = 1200; Y.nm = 12; Y.mx = 1;
  S.mk.w = 1; S.mk.own.sankakuru = { d: D - 20, p: 9, ld: D - 1, k: 1, v: 2 }; S.mk.own.kotohane = { d: D - 20, p: 3, ld: D - 1, k: 0, v: 1 };
  S.mk.sh = ['sankakuru'];
  S.ac.e = 120; S.ac.s = 35; S.gift = 1;
  S.own = ['tree', 'flower']; S.pl = { tree: 1 };
  S.kz.o = ['h-ribbon', 'p-book'];
  const ext = { m100n: 12, m100best: 90000, mtStars: 10, mtMax: 33 };
  cur.yaCheck(S, ext);
  S.kz.e.sankakuru = { h: 'h-ribbon', t: 't-ippo', p: 'p-bag' };
  S.kz.e.kotohane = { h: 'h-sprout', t: 't-yac1000' };
  const raw = JSON.parse(JSON.stringify(S));
  delete raw.kp;                    // 前の版には kp が ない
  return { raw, ext };
}
function measure(C, S, ext) {
  const ids = Object.keys(S.y.u), r = id => C.yaRank(S, id);
  const learned = C.KZ.filter(k => k.un && C.kzHas(S, k.id)).map(k => k.id);
  const bought = C.KZ.filter(k => C.kzHas(S, k.id)).map(k => k.id);
  return {
    'シールの ランクの 合計': ids.reduce((n, id) => n + r(id), 0),
    'きん いじょうの シール': ids.filter(id => r(id) >= 3).length,
    'にじの シール': ids.filter(id => r(id) >= 4).length,
    'じっせき': C.yaList(S, ext).filter(a => a.done).length,
    '学びで もらった きせかえ・しょうごう': learned.length,
    'もっている きせかえ（ぜんぶ）': bought.length,
    'つけている物': Object.keys(S.kz.e).reduce((n, mk) => n + Object.keys(C.kzOf(S, mk)).length, 0),
    'ひろばの 遊具': C.parts(S).filter(p => p.have).length,
    'きらきら': Object.values(S.mk.own).filter(o => o.k).length,
    'どんぐり（のこり）': C.balance(S),
    'かざり': S.own.length,
  };
}
const cmp = (name, before, after, more) => {
  for (const k of Object.keys(before)) check(after[k] >= before[k], `${name}: ${k} が へった（${before[k]} → ${after[k]}）`);
  if (more) for (const k of more) check(after[k] > before[k], `${name}: ${k} が ふえない（ゆるくしたのに ${before[k]} → ${after[k]}）`);
};

const { raw, ext } = oldRaw();
const extStrict = { m100n: 0, m100best: 0, mtStars: 0, mtMax: 99 };     // 100マス・めもり名人の 基準も きびしくなって 0 に なった とき
// いまの 版で ひらく（前の版の 記録 → いまの 版。ここで もらえている物を のこす）
const S1 = cur.clean(JSON.parse(JSON.stringify(raw)), D);
const M1 = measure(cur, S1, ext);
const M0raw = measure(cur, cur.clean(JSON.parse(JSON.stringify(raw)), D), ext);
cmp('前の版 → いまの 版', M0raw, M1);
check(M1['にじの シール'] === 1 && M1['ひろばの 遊具'] >= 3 && M1['学びで もらった きせかえ・しょうごう'] >= 4 && M1['じっせき'] >= 5, `前の版の 記録が 思った 形に なっていない: ${JSON.stringify(M1)}`);
// きびしい 版で kp の ない 記録を 直接 ひらくと へる（＝置きかえが きいている）。この版を 通さずに とびこえた ときは へるので、ここで 確かめておく
const Mbite = measure(strict, strict.clean(JSON.parse(JSON.stringify(raw)), D), extStrict);
for (const k of ['シールの ランクの 合計', '学びで もらった きせかえ・しょうごう', 'ひろばの 遊具'])
  check(Mbite[k] < M1[k], `きびしい 版の 置きかえが きいていない（${k} が へらない）。検査の 置きかえを 直すこと`);
// 保存 → きびしい 版で ひらく
const saved = JSON.stringify(S1);
const S2 = strict.clean(JSON.parse(saved), D + 1);
const M2 = measure(strict, S2, extStrict);
cmp('いまの 版 → きびしい 版', M1, M2);
// きびしい 版で 練習を しても（よくない 回）、へらない。保存して もう一度 ひらいても へらない
strict.recordRun(S2, { today: D + 1, grade: 3, units: Object.keys(S2.y.u).slice(0, 3).map(id => ({ id, n: 10, o: 2 })), answered: 30, correct: 6 });
strict.yaCheck(S2, extStrict);
const S3 = strict.clean(JSON.parse(JSON.stringify(S2)), D + 2);
cmp('きびしい 版で 練習・保存・ひらく', M1, measure(strict, S3, extStrict));
// 買った きせかえが 学びで もらう物に かわっても のこる。バックアップ（HR3）も 作れて 読める
check(strict.kzHas(S3, 'h-ribbon'), 'きびしい 版: 買った h-ribbon（学びで もらう物に かわった）が なくなった');
const hr = strict.hrMake(S3), back = strict.hrParse(hr);
check(!!back, `きびしい 版: バックアップの 文字が 読めない（${hr}）`);
// ゆるい 版で ひらくと、その分が 新しく もらえる（へらない）
const S4 = loose.clean(JSON.parse(saved), D + 1);
cmp('いまの 版 → ゆるい 版', M1, measure(loose, S4, ext), ['シールの ランクの 合計', 'ひろばの 遊具', '学びで もらった きせかえ・しょうごう']);
// もう一度 いまの 版に もどしても へらない（ゆるい 版で もらった 分も のこる）
cmp('ゆるい 版 → いまの 版', M1, measure(cur, cur.clean(JSON.parse(JSON.stringify(S4)), D + 2), ext));

/* ---------- 2. メダル・めもり名人の ★（index.html） ---------- */
const html = read('index.html');
const grab = (re, what) => { const m = html.match(re); if (!m) { errors.push(`index.html: ${what} が 見つからない（この検査も 直すこと）`); return ''; } return m[0]; };
const parts = [
  grab(/const MEDAL_IN=\[[^\n]*/, 'MEDAL_IN'),
  grab(/const U_ACC=\[[^\n]*/, 'U_ACC・uNeed'),
  grab(/function bests\(\)\{[^\n]*/, 'bests'),
  grab(/function medalTotal\(\)\{[^\n]*/, 'medalTotal'),
  grab(/function uRecord\(p\)\{[\s\S]*?\n\}\n/, 'uRecord'),
  grab(/const MTKEY=[^\n]*/, 'MTKEY'),
  grab(/function mtCfg\(\)\{[^\n]*/, 'mtCfg'),
  grab(/const mtStars=[^\n]*/, 'mtStars'),
];
let mSrc = parts.join('\n');
const before = mSrc;
mSrc = mSrc.replace(/const U_ACC=\[60,75,90\], uNeed=k=>\[3,5,8\]/, 'const U_ACC=[99,99,100], uNeed=k=>[30,50,80]');      // 単元の メダルを きびしく
check(mSrc !== before, 'index.html: 単元の メダルの 基準（U_ACC・uNeed）の 書きかたが かわった。この検査を 直すこと');
const OLD_BEST = { 'calc:2': { score: 18, medal: 2 }, 'u:m3-amari': { score: 9, medal: 3 }, 'u:m3-man': { score: 4, medal: 1 }, 'add_tashi': { score: 12, medal: 3 } };
const OLD_METER = { s: { 1: 3, 2: 2, 3: 1, 6: 3 }, guide: 0, ch: 1 };
const mem = new Map([['mh_best', JSON.stringify(OLD_BEST)], ['mh_meter', JSON.stringify(OLD_METER)]]);
const mctx = { store: { get: (k, d) => (mem.has(k) ? JSON.parse(mem.get(k)) : d), set: (k, v) => mem.set(k, JSON.stringify(v)) },
  UBY: { 'm3-amari': {}, 'm3-man': {} }, refreshMedals() {}, Math, Object, JSON };
vm.createContext(mctx);
try {
  vm.runInContext(mSrc + '\n;this.medalTotal=medalTotal;this.uRecord=uRecord;this.mtCfg=mtCfg;this.mtStars=mtStars;', mctx, { filename: 'index-medal.js' });
  const t0 = mctx.medalTotal();
  check(t0 === 9, `メダルの 合計が 前の 記録と ちがう（9 の はず → ${t0}）`);
  mctx.uRecord({ uSt: { 'm3-amari': { n: 10, o: 3 }, 'm3-man': { n: 10, o: 1 } } });     // きびしい 基準で よくない 回
  const b = JSON.parse(mem.get('mh_best'));
  check(mctx.medalTotal() >= t0 && b['u:m3-amari'].medal === 3 && b['u:m3-man'].medal === 1 && b['u:m3-amari'].score === 9, `単元の メダルが へった: ${mem.get('mh_best')}`);
  const c = mctx.mtCfg(); let st = 0; for (let i = 1; i <= 11; i++) st += mctx.mtStars(c, i);
  check(st === 9, `めもり名人の ★が 前の 記録と ちがう（9 の はず → ${st}）`);
} catch (e) { errors.push(`index.html の メダル・★の 部品が 動かない: ${e.message}`); }
// メダル・★を 書く ところは「前より よいときだけ」：かならず Math.max（前の メダル）／★は ふえたときだけ
const medalWrites = html.match(/medal:Math\.max\(prev\.medal,medal\)/g) || [];
check(medalWrites.length >= 3, `index.html: メダルを 書く ところ（計算スプリント・単元練習・友だち対戦）が 前の メダルと くらべていない（${medalWrites.length} こ）`);
check((html.match(/\{score:[^}]*,medal:\+?m\}|medal:Math\.max\(c\.medal\|\|0,n\.medal\)/g) || []).length >= 2, 'index.html: バックアップの 読みこみで メダルを 大きいほうに していない');
check(/isNew=stars>mtStars\(c0,m\.st\);\s*if\(isNew\) mtSet\(/.test(html), 'index.html: めもり名人の ★を ふえたとき だけ 書く 形で なくなった');

if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log(`ごほうびの のこりかた: 基準を きびしくしても へらない（ひろば ${Object.keys(M1).length} しゅるい・メダル・めもり名人の ★）・ゆるくすると ふえる OK`);
