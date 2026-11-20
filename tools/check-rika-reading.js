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
/* かなと漢字のまざった語・漢字の熟語は、語全体の読みになっているかを調べる。
   一字ずつの読み（虫《むし》など）に落ちたり、表にない漢字が となりの読みに まきこまれたり（成虫《むし》）しないように。 */
const W = G.rikaWords;
const MIX = /[ぁ-ゖァ-ヶー]/u;
const bases = new Set();
for (const w of Object.keys(W)) {
  bases.add(w);
  const m = w.match(/^([㐀-䶿一-鿿々〆〇ヶ]+)(.*)$/u);
  if (m && MIX.test(w) && W[w].endsWith(m[2])) bases.add(m[1]);
}
for (const id of seen) {
  const [where, s] = id.split('\0');
  for (const p of QZ.rubyParts(s)) if (p.b != null && !bases.has(p.b)) errors.add(`${where}: ${s}（読みの表にない まとまり: ${p.b}《${p.r}》）`);
}
const mustRead = {
  'こん虫':'こんちゅう','よう虫':'ようちゅう','成虫':'せいちゅう','幼虫':'ようちゅう','昆虫':'こんちゅう',
  '日なた':'ひなた','日かげ':'ひかげ','一しゅうかん':'いっしゅうかん','1週間':'いっしゅうかん',
  '液体':'えきたい','動物':'どうぶつ','風車':'かざぐるま','石けん水':'せっけんすい','回す':'まわす','手回し':'てまわし',
  '落葉':'らくよう','紅葉':'こうよう','赤色':'あかいろ','青色':'あおいろ','黄色':'きいろ','内側':'うちがわ','片側':'かたがわ',
  '一度':'いちど','小石':'こいし','大石':'おおいし','砂糖水':'さとうすい','炭酸水':'たんさんすい','草食動物':'そうしょくどうぶつ',
  '肉食動物':'にくしょくどうぶつ','水道水':'すいどうすい','左右':'さゆう','つなぎ方':'つなぎかた','伝わり方':'つたわりかた',
  '回らない':'まわらない','上がる':'あがる','上げた':'あげた','光る':'ひかる','熱する':'ねっする','皮ふ':'ひふ',
  '水よう液':'すいようえき','何と':'なんと','何目もり':'なんめもり','38週間':'さんじゅうはっしゅうかん'
};
for (const w of Object.keys(W)) if (MIX.test(w) && HAN.test(w) && !(w in mustRead)) mustRead[w] = W[w];
// 本文の中の w の場所に重なる読みをつなげ、w の読みがふくまれるかを見る（取り出す《とりだす》の中の 出す は OK）
function readAt(parts, from, to) {
  let pos = 0, base = '', read = '';
  for (const p of parts) {
    const b = p.b != null ? p.b : p.t, end = pos + b.length;
    if (end > from && pos < to) {
      if (p.b != null) { base += p.b; read += p.r; }
      else { const t = p.t.slice(Math.max(0, from - pos), to - pos); base += t; read += t; }
    }
    pos = end;
  }
  return { base, read };
}
const strs = [...seen].map(id => id.split('\0')[1]);
for (const [w, r] of Object.entries(mustRead)) {
  if (W[w] !== r) { errors.add(`語の読み ${w}: 表は ${W[w] || 'なし'}（正: ${r}）`); continue; }
  const got = readAt(QZ.rubyParts(G.rikaRuby(w)), 0, w.length).read;
  if (got !== r) errors.add(`語の読み ${w}: ${G.rikaRuby(w)}（正: ${r}）`);
  for (const s of strs) {
    const t = QZ.plain(s), parts = QZ.rubyParts(s);
    for (let i = t.indexOf(w); i >= 0; i = t.indexOf(w, i + 1)) {
      const x = readAt(parts, i, i + w.length);
      if (!x.read.includes(r)) errors.add(`語の読み ${w}: ${s}（${x.base} が ${x.read} になっている。正: ${r}）`);
    }
  }
}
for (const e of errors) console.error(e);
console.log(`理科 ${selected.join(',')}年: ${seen.size}文字列、エラー ${errors.size}件`);
if (errors.size) process.exitCode = 1;

