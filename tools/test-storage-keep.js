#!/usr/bin/env node
// 新しい版を出しても、児童の端末に のこっている 記録（localStorage）が 消えないことを 調べる。
//  1. 保存名（キー）が かわっていない（かえると、前の版の 記録が 読めなくなる）
//  2. 記録を まとめて 消す 処理（localStorage.clear など）が 入っていない。removeItem は きまった キーだけ
//  3. 前の版の 記録が 入った 端末で 新しい版を ひらき、ホーム・めもり名人などを 動かしても、記録が のこっている
// 保存名を どうしても かえるときは、前の名前から 新しい名前へ 引っ越す 処理を 先に 入れてから、下の KEEP を 直すこと。
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const errors = [];

/* ---- 1. 保存名 ---- */
const KEEP = ['mh_best', 'mh_col', 'mh_colcfg', 'mh_fg', 'mh_hsc', 'mh_m100', 'mh_m1j', 'mh_meter', 'mh_mkav', 'mh_name', 'mh_nigate',
  'mh_quiz_sets', 'mh_setup', 'mh_sound', 'mh_spbest', 'mh_toolcfg', 'mh_troom', 'mh_ui', 'mh_upick'];
const KEEP_100 = ['giga_calc_records_v4', 'giga_calc_settings_v4', 'study.records.v1'];    // 100マス計算（apps/100masu）。名前の v4 は もとの アプリの 名前の 一部
const html = read('index.html');
const dataSrc = fs.readdirSync(path.join(root, 'data')).filter(f => f.endsWith('.js')).map(f => read(`data/${f}`)).join('\n');
const assets = fs.readdirSync(path.join(root, 'apps/100masu/assets'));
const bundle = assets.filter(f => /^index-.*\.js$/.test(f)).map(f => read(`apps/100masu/assets/${f}`)).join('\n');
for (const k of KEEP) if (!(html + dataSrc).includes(`"${k}"`)) errors.push(`保存名が なくなった／かわった: ${k}（前の版の 記録が 読めなくなる）`);
for (const k of KEEP_100) if (!bundle.includes(`"${k}"`)) errors.push(`100マス計算の 保存名が なくなった／かわった: ${k}`);
if (!dataSrc.includes('"giga_calc_records_v4"') || !dataSrc.includes('"study.records.v1"')) errors.push('data/masu100.js が 100マス計算の 保存名を 読んでいない');

/* ---- 2. まとめて 消す 処理 ---- */
const mine = [['index.html', html], ...fs.readdirSync(path.join(root, 'data')).filter(f => f.endsWith('.js')).map(f => [`data/${f}`, read(`data/${f}`)]),
  ...assets.filter(f => /^index-.*\.js$/.test(f)).map(f => [`apps/100masu/assets/${f}`, read(`apps/100masu/assets/${f}`)]),
  ...['apps/100masu/sw.js', 'apps/100masu/records-export.js', 'apps/100masu/giga-app-links.js', 'apps/100masu/install-hook.js', 'apps/qalc/index.html', 'apps/qalc/sw.js']
    .filter(f => fs.existsSync(path.join(root, f))).map(f => [f, read(f)])];
for (const [file, src] of mine) {
  if (/(localStorage|sessionStorage)\s*\.\s*clear\s*\(/.test(src)) errors.push(`${file}: 記録を まとめて 消す clear() がある`);
  for (const m of src.matchAll(/localStorage\s*\.\s*removeItem\(\s*([^)]*)\)/g)) {
    if (!(file === 'index.html' && m[1] === '"mh_name"')) errors.push(`${file}: localStorage.removeItem(${m[1]}) は きめた キー（index.html の mh_name だけ）では ない`);
  }
  if (/indexedDB\s*\.\s*deleteDatabase/.test(src)) errors.push(`${file}: indexedDB を 消している`);
}

/* ---- 3. 前の版の 記録が 入った 端末で ひらく ---- */
const OLD = {           // 前の版で 書いた 形（11/17〜11/19 の 版と おなじ 形）
  mh_meter: { s: { 1: 3, 2: 2, 3: 1, 6: 3 }, guide: 0, ch: 1 },
  mh_best: { 'calc:2': { score: 18, medal: 2 }, 'kanji:3': { score: 9, medal: 1 } },
  mh_ui: { grade: 3, subj: 'sansu' },
  mh_sound: true,
  mh_spbest: { ta: { 'm3-amari': 41000 } },
  mh_nigate: [{ q: '7×8', a: '56' }],
  mh_toolcfg: { on: 1 },
  mh_hsc: 1,
  mh_upick: { m3: ['m3-amari'] },
  'giga_calc_records_v4': { たし算: { best: { 100: 95000 }, history: [], bestSolved: {} } },
  'giga_calc_settings_v4': { sound: false, numpad: true },
};
function runPage(hostname) {
  const mem = new Map(Object.entries(OLD).map(([k, v]) => [k, JSON.stringify(v)]));
  let colSeed = null;
  const storage = { getItem: k => mem.has(k) ? mem.get(k) : null, setItem: (k, v) => mem.set(k, String(v)), removeItem: k => mem.delete(k), clear: () => mem.clear(), key: i => [...mem.keys()][i] ?? null, get length() { return mem.size; } };
  const session = { getItem() { return null; }, setItem() {}, removeItem() {} };
  const src = html.slice(html.lastIndexOf('<script>') + 8, html.lastIndexOf('</script>')).replace(/fgFromHash\(\); fgWalk\(document\.body\); refreshMedals\(\); route\(\);\s*$/, '');
  function element() { return {
    style: { getPropertyValue() { return ''; }, setProperty() {} }, dataset: {}, replaceWith() {}, classList: { add() {}, remove() {}, toggle() {} }, children: [],
    appendChild(x) { this.children.push(x); return x; }, append(...xs) { this.children.push(...xs); }, insertAdjacentHTML() {}, replaceChildren(...xs) { this.children = xs; },
    setAttribute() {}, removeAttribute() {}, closest() { return null; }, addEventListener() {}, removeEventListener() {},
    querySelector() { return element(); }, querySelectorAll() { return []; }, getAttribute() { return null; },
    focus() {}, remove() {}, scrollIntoView() {}, getBoundingClientRect() { return { width: 375, height: 667 }; },
    innerHTML: '', get textContent() { return this._t || ''; }, set textContent(v) { this._t = v; this.children = []; }, value: 'calc', options: [], firstChild: { textContent: '' } }; }
  const byId = new Map();
  const document = { body: element(), documentElement: element(), head: element(), createElement: element, createElementNS: element, createTextNode: t => ({ textContent: t }),
    getElementById: id => { if (!byId.has(id)) byId.set(id, element()); return byId.get(id); },
    querySelector: s => s.startsWith('#') ? document.getElementById(s.slice(1)) : element(), querySelectorAll: () => [], addEventListener() {}, removeEventListener() {} };
  const location = { hash: '#home', href: `https://${hostname}/manabi-hiroba/`, protocol: 'https:', hostname, origin: `https://${hostname}`, pathname: '/manabi-hiroba/' };
  const window = { document, location, addEventListener() {}, removeEventListener() {}, scrollTo() {}, innerWidth: 375, innerHeight: 667 };
  const ctx = { window, document, location, localStorage: storage, sessionStorage: session, history: { replaceState() {} }, navigator: { language: 'ja' }, console,
    setInterval() { return 1; }, clearInterval() {}, setTimeout() { return 1; }, clearTimeout() {}, URL, URLSearchParams, TextEncoder, Date, Math, Promise,
    fetch() { return Promise.resolve({ ok: false }); }, MutationObserver: class { observe() {} disconnect() {} } };
  vm.createContext(ctx);
  window.RIKA_PUBLIC = /window\.RIKA_PUBLIC\s*=\s*true\s*;/.test(html);
  window.HIROBA_PUBLIC = /window\.HIROBA_PUBLIC\s*=\s*true\s*;/.test(html);
  for (const file of ['data/kanji-grade.js', 'data/questions.js', 'data/calc.js', 'data/choices.js', 'data/quizlib.js', 'data/mathview.js', 'data/ngwords.js', 'data/cooplib.js', 'data/gen/core.js',
    ...(window.RIKA_PUBLIC ? ['data/gen/rika.js'] : []), 'data/gen/other.js', 'data/gen/sansu-12.js', 'data/gen/sansu-34.js', 'data/gen/sansu-56.js', 'data/gen/textbook-extra.js', 'data/gen/bunsho.js',
    'data/units.js', 'data/tools-viz.js', 'data/collection.js', 'data/masu100.js', 'data/meter.js']) vm.runInContext(read(file), ctx, { filename: file });
  // ひろばの 記録（mh_col）は 前の版と おなじ 部品で 作る：単元1つ「できた」・どんぐり 7こ
  const COL = window.MH_COL || ctx.MH_COL, today = COL.dayNum(new Date()), uid = COL.UNIT_IDS[0];
  colSeed = COL.clean(null, today - 3); colSeed.u[uid] = [2, 8, today - 3]; colSeed.ac.e = 7;
  mem.set('mh_col', JSON.stringify(colSeed));
  Object.assign(ctx, window);
  vm.runInContext(src, ctx, { filename: 'index.html' });
  // 新しい版で いろいろ ひらく
  for (let g = 0; g <= 6; g++) vm.runInContext(`ui.grade=${g}; renderHome()`, ctx, { filename: `home-${g}` });
  vm.runInContext('ui.grade=3; renderHome(); mtMenu(); renderRecord()', ctx, { filename: 'meter-menu' });
  const tile = vm.runInContext('meterTile()', ctx);
  if (!tile.includes('9 / 33')) errors.push(`[${hostname}] めもり名人の タイルの ★が 前の 記録と ちがう（9 / 33 のはず）`);
  vm.runInContext('mtSet(c=>{ c.s[4]=2; })', ctx, { filename: 'meter-new-star' });     // 新しい版で ★を とっても、前の ★は のこる
  const mt = JSON.parse(mem.get('mh_meter') || 'null');
  if (!mt || mt.s[1] !== 3 || mt.s[2] !== 2 || mt.s[3] !== 1 || mt.s[6] !== 3 || mt.s[4] !== 2 || mt.guide !== 0 || mt.ch !== 1) errors.push(`[${hostname}] めもり名人の 記録が かわった: ${mem.get('mh_meter')}`);
  if (vm.runInContext('typeof colMode==="function"&&colMode()==="on"', ctx)) vm.runInContext('colDoor()', ctx, { filename: 'col-door' });
  // のこっているか
  const has = (a, b) => b === a || (a && typeof a === 'object' && b && typeof b === 'object' && Object.keys(a).every(k => has(a[k], b[k])));
  for (const k of Object.keys(OLD)) {
    if (k === 'mh_meter') continue;
    const now = mem.has(k) ? JSON.parse(mem.get(k)) : undefined;
    if (!has(OLD[k], now)) errors.push(`[${hostname}] 前の版の 記録が 消えた／かわった: ${k}（前 ${JSON.stringify(OLD[k])} → 今 ${mem.has(k) ? mem.get(k) : 'なし'}）`);
  }
  const col = JSON.parse(mem.get('mh_col') || 'null');
  if (!col || !col.u || !col.u[uid] || col.u[uid][0] !== 2 || COL.balance(COL.clean(col, today)) < 7) errors.push(`[${hostname}] ひろばの 記録（mh_col）が 消えた／へった: ${mem.get('mh_col')}`);
}
runPage('tokugawaieyasudono.github.io');      // 公開ページ（ひろばは まだ じゅんびちゅう）
runPage('localhost');                          // 手もと（ひろばも ひらく）

if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log(`記録の のこりかた: 保存名 ${KEEP.length + KEEP_100.length} 件・消す処理なし・前の版の 記録が 新しい版で のこる（公開ページ／手もと）OK`);
