#!/usr/bin/env node
// おひっこし（data/move.js・move.html）の 検査。node tools/test-move.js
//  1. 住所の 設定は data/move.js の SITE だけ（ほかの ファイルに 新しい住所を 書かない）・各ページが 今の 版の move.js を 読む・index.html の 住所が 設定と そろう
//  2. 合わせ方：両方の 住所に 別々の 記録が あっても、合わせて 減らない（記録ごと）。設定は 新しい住所の ほうを のこす
//  3. まとめる・ほどく（圧縮あり／なし）・もどり先は 同じ サイトの 中だけ・大きすぎると 移らずに 案内を 出す
//  4. Playwright（あれば）：2つの 住所の ふりを して、古い住所の 記録が 新しい住所へ ぜんぶ 同じに うつる／両方に あっても 減らない／
//     #u= などの つづきと パス（guide・100マス）が 引きつがれる／2回目は すぐ 移るだけ／「もってくる」入口／オフの ときは 何もしない
const fs = require('fs'), path = require('path'), crypto = require('crypto'), cp = require('child_process');
const assert = require('assert');
const root = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const MOVE = require('../data/move.js'), COL = require('../data/collection.js');
let n = 0, bad = 0;
const t = async (name, fn) => { n++; try { await fn(); console.log('ok  ' + name); } catch (e) { bad++; console.log('NG  ' + name + '\n    ' + String(e && e.stack || e).split('\n').slice(0, 4).join('\n    ')); } };
const memLS = init => { const m = new Map(Object.entries(init || {})); return { m, getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), key: i => [...m.keys()][i] ?? null, get length() { return m.size; } }; };
const today = COL.dayNum(new Date());

/* ---- 記録の 見本（前の版の 形） ---- */
function colState(units, ach, opt) {
  opt = opt || {};
  const S = COL.fresh(today - 30), run = (d, us) => COL.recordRun(S, { today: d, grade: 3, units: us, answered: us.reduce((a, u) => a + u.n, 0), correct: us.reduce((a, u) => a + u.o, 0) });
  run(today - 20, units.map(id => ({ id, n: 10, o: 9 }))); run(today - 18, units.map(id => ({ id, n: 10, o: 10 }))); run(today - 15, units.slice(0, 3).map(id => ({ id, n: 10, o: 10 })));
  S.y.a.push(...ach); if (opt.kpr) Object.assign(S.kp.r, opt.kpr);
  S.mk.w = 1; S.mk.own[opt.mk || 'sankakuru'] = { d: today - 20, p: 5, ld: today - 15, k: 0, v: 1 };
  COL.keepUp(S); return S;
}
const m3 = COL.UNIT_IDS.filter(i => i.startsWith('m3')), j3 = COL.UNIT_IDS.filter(i => i.startsWith('j3'));
function oldRecords() {
  return {
    mh_col: JSON.stringify(colState(m3.slice(0, 12), ['mt10'], { kpr: { [m3[0]]: 4 } })),
    mh_best: JSON.stringify({ calc: { score: 18, medal: 2 }, kanji: { score: 9, medal: 1 }, 'u:m3-amari': { score: 12, medal: 3 } }),
    mh_meter: JSON.stringify({ s: { 1: 3, 2: 2, 3: 1, 6: 3 }, guide: 0, ch: 1 }),
    mh_ui: JSON.stringify({ grade: 3, subj: 'sansu' }),
    mh_sound: 'true',
    mh_spbest: JSON.stringify({ 'c:3': { ta: 41.2, sd: 12, at: 100 } }),
    mh_nigate: JSON.stringify([{ unit: '', subj: 'sansu', g: 3, q: '7×8', a: '56', choices: [], ans: 'num', val: '56' }]),
    mh_quiz_sets: JSON.stringify({ v: 1, sets: [{ id: 'a1', title: 'かけ算', upd: 10, qs: [] }] }),
    mh_m100: JSON.stringify({ c: 5000, last: 6000, d: {}, t: { d: 1, g: 0 } }),
    'study.records.v1': JSON.stringify([{ id: 'r1', appId: 'square100', mode: 'add', startedAt: '2026-11-01T01:00:00Z' }]),
    giga_calc_records_v4: JSON.stringify({ たし算: { best: { 100: 95000 }, history: [{ t: 1, ms: 95000 }], bestSolved: { 60: 70 } } }),
    giga_calc_settings_v4: JSON.stringify({ sound: false, numpad: true }),
    qalc_best: JSON.stringify({ x: 1 })
  };
}
function newRecords() {      // 新しい住所で もう 少し あそんでいた（別の 記録）
  return {
    mh_col: JSON.stringify(colState([...m3.slice(8, 16), ...j3.slice(0, 4)], ['kuku'], { mk: 'kotohane' })),
    mh_best: JSON.stringify({ calc: { score: 20, medal: 1 }, eng: { score: 5, medal: 1 } }),
    mh_meter: JSON.stringify({ s: { 1: 1, 2: 3, 4: 2 }, guide: 1, ch: 0 }),
    mh_ui: JSON.stringify({ grade: 4, subj: 'kokugo' }),
    mh_spbest: JSON.stringify({ 'c:3': { ta: 50, sd: 15, at: 200 }, 'c:4': { sd: 3, at: 1 } }),
    mh_nigate: JSON.stringify([{ unit: '', subj: 'sansu', g: 3, q: '6×7', a: '42', choices: [], ans: 'num', val: '42' }]),
    mh_quiz_sets: JSON.stringify({ v: 1, sets: [{ id: 'a1', title: 'かけ算（なおした）', upd: 20, qs: [] }, { id: 'b2', title: 'わり算', upd: 5, qs: [] }] }),
    mh_m100: JSON.stringify({ c: 3000, last: 9000, d: {}, t: { d: 1, g: 0 } }),
    'study.records.v1': JSON.stringify([{ id: 'r2', appId: 'square100', mode: 'sub', startedAt: '2026-11-10T01:00:00Z' }]),
    giga_calc_records_v4: JSON.stringify({ たし算: { best: { 100: 99000, 50: 40000 }, history: [{ t: 2, ms: 99000 }], bestSolved: { 60: 60 } } })
  };
}
/* 合わせた 結果が どちらの 記録よりも 減っていないか（記録ごと） */
function checkNotLess(out, A, B) {
  const J = k => (out[k] == null ? null : JSON.parse(out[k])), a = k => (A[k] == null ? null : JSON.parse(A[k])), b = k => (B[k] == null ? null : JSON.parse(B[k]));
  const S = COL.clean(J('mh_col'), today), SA = COL.clean(a('mh_col'), today), SB = B.mh_col ? COL.clean(b('mh_col'), today) : COL.fresh(today);
  for (const id of COL.UNIT_IDS) assert(COL.stage(S, id) >= Math.max(COL.stage(SA, id), COL.stage(SB, id)), 'ひろばの 段階 ' + id);
  assert(S.ac.e >= Math.max(SA.ac.e, SB.ac.e), 'どんぐり');
  assert(COL.balance(S) >= 0);
  assert(S.y.c >= Math.max(SA.y.c, SB.y.c), 'やりこみの 正解');
  for (const id of [...SA.y.a, ...SB.y.a]) assert(S.y.a.includes(id), 'じっせき ' + id);
  for (const X of [SA, SB]) {
    for (const id in X.y.u) for (let i = 0; i < 4; i++) assert(S.y.u[id] && S.y.u[id][i] >= X.y.u[id][i], 'やりこみ ' + id);
    for (const id in X.kp.r) assert((S.kp.r[id] || 0) >= X.kp.r[id], 'シールの ランク ' + id);
    for (const id of X.kp.z) assert(S.kp.z.includes(id), 'もらった きせかえ ' + id);
    for (const id of X.kp.p) assert(S.kp.p.includes(id), '遊具 ' + id);
    for (const id in X.mk.own) assert(S.mk.own[id] && S.mk.own[id].p >= X.mk.own[id].p, 'まなびっこ ' + id);
  }
  for (const [x, y] of [[a('mh_best'), b('mh_best')]]) for (const o of [x, y]) if (o) for (const k in o) { const r = J('mh_best')[k]; assert(r && r.score >= o[k].score && r.medal >= o[k].medal, 'ベスト ' + k); }
  for (const o of [a('mh_meter'), b('mh_meter')]) if (o) for (const k in o.s) assert(J('mh_meter').s[k] >= o.s[k], 'めもり名人の ★ ' + k);
  for (const o of [a('mh_spbest'), b('mh_spbest')]) if (o) for (const k in o) { const r = J('mh_spbest')[k]; if (o[k].ta) assert(r.ta <= o[k].ta, 'タイム ' + k); if (o[k].sd) assert(r.sd >= o[k].sd, 'れんぞく ' + k); }
  for (const o of [a('mh_nigate'), b('mh_nigate')]) if (o) for (const it of o) assert(J('mh_nigate').some(x => x.q === it.q), 'にがて ' + it.q);
  for (const o of [a('mh_quiz_sets'), b('mh_quiz_sets')]) if (o) for (const s of o.sets) assert(J('mh_quiz_sets').sets.some(x => x.id === s.id && x.upd >= s.upd), 'もんだいの セット ' + s.id);
  for (const o of [a('study.records.v1'), b('study.records.v1')]) if (o) for (const r of o) assert(J('study.records.v1').some(x => x.id === r.id), '100マスの 回 ' + r.id);
  for (const o of [a('giga_calc_records_v4'), b('giga_calc_records_v4')]) if (o) for (const m in o) { const r = J('giga_calc_records_v4')[m];
    for (const k in o[m].best) assert(r.best[k] <= o[m].best[k], '100マスの ベスト ' + k); for (const k in o[m].bestSolved) assert(r.bestSolved[k] >= o[m].bestSolved[k], '100マスの 数 ' + k);
    for (const h of o[m].history) assert(r.history.some(x => JSON.stringify(x) === JSON.stringify(h)), '100マスの りれき'); }
  for (const k in A) if (MOVE.isOurs(k)) assert(out[k] != null, 'キーが ない: ' + k);
  for (const k in B) if (MOVE.isOurs(k)) assert(out[k] != null, 'キーが ない: ' + k);
}

(async () => {
  /* ---------- 1. 住所の 設定 ---------- */
  await t('住所の 設定は data/move.js の SITE だけ（新しい住所を ほかの 配信ファイルに 書かない）', () => {
    assert.strictEqual(MOVE.SITE.NEW_HOST, 'hirametto.com');
    const files = cp.execFileSync('git', ['ls-files', '-co', '--exclude-standard'], { cwd: root, encoding: 'utf8' }).split('\n')
      .filter(f => f && /\.(html|js|xml|txt|json|css)$/.test(f) && !/^(tools|docs|vendor)\//.test(f) && f !== 'data/move.js' && fs.existsSync(path.join(root, f)));
    const hits = files.filter(f => read(f).includes(MOVE.SITE.NEW_HOST) && !(MOVE.SITE.ON && /\.(html|xml|txt)$/.test(f)));
    assert.deepStrictEqual(hits, [], '新しい住所が 書いてある（data/move.js の SITE を 使う）');
  });
  await t('index.html・move.html・100マス・ガイドが 今の 版の data/move.js を 読む／index.html の 住所が 設定と そろう', () => {
    const v = crypto.createHash('sha256').update(fs.readFileSync(path.join(root, 'data/move.js'))).digest('hex').slice(0, 8);
    assert(read('index.html').includes(`<script src="data/move.js?v=${v}"></script>`), 'index.html');
    assert(read('move.html').includes(`<script src="data/move.js?v=${v}"></script>`), 'move.html');
    assert(read('apps/100masu/index.html').includes(`<script src="../../data/move.js?v=${v}"></script>`), 'apps/100masu/index.html');
    for (const f of fs.readdirSync(path.join(root, 'guide')).filter(f => f.endsWith('.html'))) assert(read('guide/' + f).includes(`<script src="../data/move.js?v=${v}"></script>`), 'guide/' + f);
    const h = read('index.html'), head = h.slice(0, h.indexOf('</head>'));
    assert(head.indexOf('data/move.js') < head.indexOf('<style>'), 'index.html：move.js は 画面より 先に 読む');
    const r = cp.spawnSync(process.execPath, [path.join(__dirname, 'site-url.js'), '--check'], { encoding: 'utf8' });
    assert.strictEqual(r.status, 0, r.stderr);
    for (const u of [...head.matchAll(/(?:href|content)="(https:[^"]+)"/g)].map(m => m[1])) assert(u.startsWith(MOVE.BASE), u);
    assert(read('sitemap.xml').includes(`<loc>${MOVE.BASE}</loc>`) && read('robots.txt').includes(`Sitemap: ${MOVE.BASE}sitemap.xml`), 'sitemap・robots');
    assert(!read('sitemap.xml').includes('move.html'), 'move.html は sitemap に 入れない');
    assert(/<meta name="robots" content="noindex">/.test(read('move.html')), 'move.html は noindex');
  });
  await t('ON に すると 住所が 新しい住所に かわる（設定 1つで）', () => {
    const src = read('data/move.js').replace(/ON: (true|false)/, 'ON: true'), m = { exports: {} };
    new Function('module', 'exports', src)(m, m.exports);
    assert.strictEqual(m.exports.BASE, 'https://hirametto.com/'); assert.strictEqual(m.exports.SITE.ON, true);
    assert.strictEqual(m.exports.OLD_BASE, 'https://tokugawaieyasudono.github.io/manabi-hiroba/');
  });

  /* ---------- 2. 合わせ方 ---------- */
  await t('新しい住所に 何も ないとき：とどいた 記録を そのまま 書く（ぜんぶ 同じ）', () => {
    const A = oldRecords(), ls = memLS(), r = MOVE.mergeInto(ls, A, COL, today);
    assert.strictEqual(r.bad.length, 0); assert.strictEqual(r.n, Object.keys(A).length);
    for (const k in A) assert.strictEqual(ls.getItem(k), A[k], k);
  });
  await t('両方の 住所に 別々の 記録が あるとき：合わせて 減らない（ひろば・やりこみ・もらった物・ベスト・★・タイム・にがて・セット・100マス）', () => {
    const A = oldRecords(), B = newRecords(), ls = memLS(B);
    MOVE.mergeInto(ls, A, COL, today);
    const out = Object.fromEntries(ls.m); checkNotLess(out, A, B);
    assert.strictEqual(out.mh_ui, B.mh_ui, '設定は 新しい住所の ほう');
    assert.strictEqual(JSON.parse(out.mh_meter).guide, 1, 'めもり名人の 設定は 新しい住所の ほう');
    assert.strictEqual(JSON.parse(out.mh_m100).c, 5000, '100マスの どんぐりは 先へ すすんだ ほう（二重に もらわない）');
    assert.strictEqual(out.mh_sound, 'true', '新しい住所に ない 設定は とどいた ほう');
    const once = JSON.stringify([...ls.m]); MOVE.mergeInto(ls, A, COL, today);
    const S1 = COL.clean(JSON.parse(JSON.parse(once).find(e => e[0] === 'mh_col')[1]), today), S2 = COL.clean(JSON.parse(ls.getItem('mh_col')), today);
    assert.deepStrictEqual([S2.ac.e, S2.y.c, Object.keys(S2.u).length], [S1.ac.e, S1.y.c, Object.keys(S1.u).length], 'くり返し 受けとっても ふえない');
  });
  await t('逆向き（新しい住所の ほうが 多い）でも 減らない・こわれた 記録は 使える ほうを のこす', () => {
    const A = newRecords(), B = oldRecords(), ls = memLS(B); MOVE.mergeInto(ls, A, COL, today); checkNotLess(Object.fromEntries(ls.m), A, B);
    const ls2 = memLS({ mh_best: '{こわれ' }); MOVE.mergeInto(ls2, { mh_best: B.mh_best }, COL, today); assert.strictEqual(ls2.getItem('mh_best'), B.mh_best);
    const ls3 = memLS({ mh_best: B.mh_best }); MOVE.mergeInto(ls3, { mh_best: '{こわれ' }, COL, today); assert.strictEqual(ls3.getItem('mh_best'), B.mh_best);
  });
  await t('はこぶのは この サイトの 記録だけ（同じ オリジンの ほかの ページの 記録・しるしは はこばない）', () => {
    const ls = memLS({ ...oldRecords(), other_app: 'x', 'mh_moved': '{"t":1}', 'study.hub.mirrored.v1': '{}' });
    const k = MOVE.collect(ls);
    assert(!('other_app' in k) && !('mh_moved' in k)); assert('study.hub.mirrored.v1' in k && 'qalc_best' in k && 'giga_calc_settings_v4' in k && 'study.records.v1' in k);
    const got = memLS(); MOVE.mergeInto(got, { evil: '1', mh_ok: '1' }, COL, today); assert.deepStrictEqual([...got.m.keys()], ['mh_ok']);
  });

  /* ---------- 3. まとめる・ほどく・もどり先・大きさ ---------- */
  await t('まとめる・ほどく：圧縮あり／なし で 同じに もどる・こわれた 文字は 断る', async () => {
    const p = { v: 1, k: oldRecords(), to: '/#u=m3-amari&n=10', m: 0 };
    for (const noZip of [false, true]) { const s = await MOVE.pack(p, noZip); assert.strictEqual(s[0], noZip ? 'j' : 'z'); assert.deepStrictEqual(await MOVE.unpack(s), p); }
    for (const s of ['', 'x', 'zAAAA', 'j!!', 'j' + Buffer.from('{"v":2,"k":{}}').toString('base64url')]) await assert.rejects(MOVE.unpack(s));
  });
  await t('もどり先は 同じ サイトの 中の パスだけ（ほかの サイトへ とばさない）・パスの 引きつぎ', () => {
    for (const x of ['https://evil.example/', '//evil.example/', '/\\evil', 'javascript:alert(1)', '', null, '/a\nb']) assert.strictEqual(MOVE.safeTo(x), '/', String(x));
    assert.strictEqual(MOVE.safeTo('/guide/g3-sansu.html#m3-amari'), '/guide/g3-sansu.html#m3-amari');
    assert.strictEqual(MOVE.newPath('/manabi-hiroba/'), '/'); assert.strictEqual(MOVE.newPath('/manabi-hiroba'), '/');
    assert.strictEqual(MOVE.newPath('/manabi-hiroba/apps/100masu/'), '/apps/100masu/'); assert.strictEqual(MOVE.newPath('/other/'), '/');
  });
  const fakeLoc = (url, replaced) => { const u = new URL(url); return { hostname: u.hostname, pathname: u.pathname, search: u.search, hash: u.hash, replace: x => replaced.push(x) }; };
  await t('引っ越し係：記録を まとめて move.html へ・しるしを のこす・古い 記録は 消さない・2回目は すぐ 移る・#mhmove で もう一度', async () => {
    const A = oldRecords(), ls = memLS(A), go = [];
    assert.strictEqual(await MOVE.leave(fakeLoc('https://tokugawaieyasudono.github.io/manabi-hiroba/?net=server#u=m3-amari&n=10', go), ls, null), 'send');
    assert(go[0].startsWith('https://hirametto.com/move.html#mhmv=z'), go[0].slice(0, 60));
    const p = await MOVE.unpack(go[0].split('#mhmv=')[1]);
    assert.strictEqual(p.to, '/?net=server#u=m3-amari&n=10'); assert.deepStrictEqual(p.k, A); assert(ls.getItem('mh_moved'));
    for (const k in A) assert.strictEqual(ls.getItem(k), A[k], '古い 記録は そのまま ' + k);
    assert.strictEqual(await MOVE.leave(fakeLoc('https://tokugawaieyasudono.github.io/manabi-hiroba/guide/g3-sansu.html#m3-amari', go), ls, null), 'go');
    assert.strictEqual(go[1], 'https://hirametto.com/guide/g3-sansu.html#m3-amari');
    assert.strictEqual(await MOVE.leave(fakeLoc('https://tokugawaieyasudono.github.io/manabi-hiroba/#mhmove', go), ls, null), 'send');
    const q = await MOVE.unpack(go[2].split('#mhmv=')[1]); assert.strictEqual(q.m, 1); assert.strictEqual(q.to, '/index.html#record');
    const empty = memLS(), g2 = []; assert.strictEqual(await MOVE.leave(fakeLoc('https://tokugawaieyasudono.github.io/manabi-hiroba/#play', g2), empty, null), 'go');
    assert.deepStrictEqual(g2, ['https://hirametto.com/#play']); assert(empty.getItem('mh_moved'), '記録が ない 端末にも しるし');
    const g3 = []; assert.strictEqual(await MOVE.leave(fakeLoc('https://tokugawaieyasudono.github.io/manabi-hiroba/#meter', g3), null, null), 'go', '記録が 読めない ときも 移る');
  });
  await t('大きさ：ふつうの 記録（100マス 1000回・ひろば 全部）は URL に 入る／入らない ときは 移らずに 案内（しるしも のこさない）', async () => {
    const A = oldRecords();
    A['study.records.v1'] = JSON.stringify(Array.from({ length: 1000 }, (_, i) => ({ id: 'r' + i, appId: 'square100', mode: ['add', 'sub', 'mul'][i % 3], startedAt: new Date(Date.UTC(2026, 0, 1) + i * 36e5).toISOString(), elapsedMs: 60000 + i * 37, status: 'completed', summary: { count: 100, correct: 98 + (i % 3) }, ext: { cells: 100, dan: [], timeUp: false } })));
    A.mh_col = JSON.stringify(colState(COL.UNIT_IDS.slice(0, 200), ['c100', 'mt10']));
    const go = [], ls = memLS(A);
    assert.strictEqual(await MOVE.leave(fakeLoc('https://tokugawaieyasudono.github.io/manabi-hiroba/', go), ls, null), 'send');
    console.log(`    （ふつうの 記録 ${Object.values(A).reduce((s, v) => s + v.length, 0)} 字 → URL ${go[0].length} 字。上限 ${MOVE.MAX_URL}）`);
    assert(go[0].length < MOVE.MAX_URL / 4);
    const big = memLS({ mh_quiz_sets: crypto.randomBytes(800000).toString('base64') }), g2 = [];
    assert.strictEqual(await MOVE.leave(fakeLoc('https://tokugawaieyasudono.github.io/manabi-hiroba/', g2), big, null), 'stuck');
    assert.deepStrictEqual(g2, []); assert.strictEqual(big.getItem('mh_moved'), null);
  });
  await t('受けとり：「#」の 後ろを 消す・合わせて 書く・こわれた 文字・書けない 端末', async () => {
    const A = oldRecords(), s = await MOVE.pack({ v: 1, k: A, to: '/#u=m3-amari', m: 0 }), H = { calls: [], replaceState(a, b, u) { this.calls.push(u); } };
    const ls = memLS(newRecords());
    const r = await MOVE.receive({ hash: '#mhmv=' + s, pathname: '/move.html' }, ls, COL, today, H);
    assert.strictEqual(r.state, 'ok'); assert.strictEqual(r.to, '/#u=m3-amari'); assert.deepStrictEqual(H.calls, ['/move.html']);
    checkNotLess(Object.fromEntries(ls.m), A, newRecords());
    assert.strictEqual((await MOVE.receive({ hash: '#mhmv=zzz!', pathname: '/move.html' }, memLS(), COL, today, H)).state, 'bad');
    assert.strictEqual((await MOVE.receive({ hash: '', pathname: '/move.html' }, memLS(), COL, today, H)).state, 'none');
    const full = memLS(); full.setItem = () => { throw new Error('QuotaExceeded'); };
    assert.strictEqual((await MOVE.receive({ hash: '#mhmv=' + s, pathname: '/move.html' }, full, COL, today, H)).state, 'full');
    const evil = await MOVE.pack({ v: 1, k: {}, to: 'https://evil.example/', m: 0 });
    assert.strictEqual((await MOVE.receive({ hash: '#mhmv=' + evil, pathname: '/move.html' }, memLS(), COL, today, H)).to, '/');
  });
  await t('記録を 消さない（removeItem・clear を 使わない）', () => {
    for (const f of ['data/move.js', 'move.html']) assert(!/\.(removeItem|clear)\s*\(/.test(read(f)), f);
  });

  /* ---------- 4. Playwright：2つの 住所の ふり ---------- */
  let chromium = null; try { ({ chromium } = require('playwright')); } catch (e) {}
  if (!chromium) console.log('--  Playwright が ないので ブラウザの 検査は とばした（npm i -D playwright）');
  else await browserTests(chromium);
  console.log(`\n${n} 件のテストを実行${bad ? '（失敗あり）' : '：すべて成功'}`);
  if (bad) process.exitCode = 1;
})();

async function browserTests(chromium) {
  const OLD = MOVE.OLD_BASE, NEW = MOVE.NEW_BASE;
  const type = f => ({ '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json', '.bin': 'application/octet-stream' })[path.extname(f)] || 'application/octet-stream';
  let browser; try { browser = await chromium.launch(); } catch (e) { console.log('--  ブラウザを 起動できないので とばした: ' + e.message.split('\n')[0]); return; }
  /* on：data/move.js の ON を かえて 出す。stub：新しい住所の ホームを 小さな ページに する（アプリが 記録を 書きなおす 前に くらべる） */
  async function ctxFor(o) {
    const ctx = await browser.newContext({ serviceWorkers: 'block' }), log = [];
    const serve = async (route, rel, host) => {
      const u = new URL(route.request().url()); log.push(host + u.pathname + u.hash);
      if (rel === '__seed') return route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>seed</title>' });
      if (host === 'new' && o.stub && (rel === '' || rel === 'index.html')) return route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>STUB</title><p id="here">ok</p>' });
      let f = path.join(root, ...decodeURIComponent(rel).split('/'));
      if (!f.startsWith(root)) return route.fulfill({ status: 403, body: '' });
      if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
      if (!fs.existsSync(f)) return route.fulfill({ status: 404, body: 'not found' });
      let body = fs.readFileSync(f);
      if (rel === 'data/move.js') body = Buffer.from(body.toString('utf8').replace(/ON: (true|false)/, 'ON: ' + (o.on ? 'true' : 'false')));
      return route.fulfill({ status: 200, contentType: type(f), body });
    };
    await ctx.route(u => u.href.startsWith(OLD) || u.href === OLD.slice(0, -1), r => serve(r, new URL(r.request().url()).pathname.slice(MOVE.SITE.OLD_PATH.length + 1), 'old'));
    await ctx.route(u => u.origin === MOVE.NEW_ORIGIN, r => serve(r, new URL(r.request().url()).pathname.slice(1), 'new'));
    await ctx.route(u => !u.href.startsWith(OLD) && u.origin !== MOVE.NEW_ORIGIN && /^https?:/.test(u.protocol), r => r.abort());
    return { ctx, log };
  }
  const seed = async (page, base, rec) => { await page.goto(base + '__seed'); await page.evaluate(r => { localStorage.clear(); for (const k in r) localStorage.setItem(k, r[k]); }, rec); };
  const dump = page => page.evaluate(() => Object.fromEntries(Object.keys(localStorage).map(k => [k, localStorage.getItem(k)])));
  const waitHost = (page, host) => page.waitForURL(u => new URL(u).hostname === host, { timeout: 15000 });

  await t('ブラウザ：古い住所の 記録が 新しい住所へ ぜんぶ 同じに うつる・#u= の つづき・しるし・2回目は すぐ 移る', async () => {
    const { ctx, log } = await ctxFor({ on: true, stub: true }), page = await ctx.newPage(), A = oldRecords();
    await seed(page, OLD, A);
    await page.goto(OLD + '#u=m3-amari&n=10&task=1');
    await page.waitForSelector('#here', { timeout: 15000 });
    assert.strictEqual(page.url(), NEW + '#u=m3-amari&n=10&task=1');
    assert(log.some(x => x.startsWith('new/move.html')), 'move.html を 通った');
    const got = await dump(page);
    for (const k in A) assert.strictEqual(got[k], A[k], '同じ ' + k);
    const old = await (async () => { await page.goto(OLD + '__seed'); return dump(page); })();
    for (const k in A) assert.strictEqual(old[k], A[k], '古い 記録は 消さない ' + k);
    assert(old.mh_moved, 'ひっこしずみの しるし');
    log.length = 0;
    await page.goto(OLD + 'guide/g3-sansu.html#m3-amari'); await waitHost(page, MOVE.SITE.NEW_HOST);
    assert.strictEqual(page.url(), NEW + 'guide/g3-sansu.html#m3-amari');
    assert(!log.some(x => x.startsWith('new/move.html')), '2回目は move.html を 通らない');
    await page.goto(OLD + 'apps/100masu/?x=1'); await waitHost(page, MOVE.SITE.NEW_HOST);
    assert.strictEqual(page.url(), NEW + 'apps/100masu/?x=1');
    await ctx.close();
  });
  await t('ブラウザ：両方の 住所に 別々の 記録が あるとき 合わせて 減らない・本物の アプリで きろくが 見える', async () => {
    const { ctx } = await ctxFor({ on: true, stub: false }), page = await ctx.newPage(), A = oldRecords(), B = newRecords();
    await seed(page, NEW, B); await seed(page, OLD, A);
    await page.goto(OLD + '#record');
    await waitHost(page, MOVE.SITE.NEW_HOST); await page.waitForSelector('.rec', { timeout: 20000 });
    assert.strictEqual(page.url(), NEW + '#record');
    const got = await dump(page); checkNotLess(got, A, B);
    assert(await page.$('#mvAgain'), '新しい住所の「きろく」に「もってくる」入口');
    assert.strictEqual(await page.getAttribute('#mvAgain a', 'href'), OLD + '#mhmove');
    await ctx.close();
  });
  await t('ブラウザ：「まえの ばしょから もってくる」で もう一度 はこべる（いまの 記録は 減らない・#の 後ろは 消える）', async () => {
    const { ctx } = await ctxFor({ on: true, stub: false }), page = await ctx.newPage(), A = oldRecords(), B = newRecords();
    await seed(page, OLD, { ...A, mh_moved: '{"t":1}' }); await seed(page, NEW, B);
    await page.goto(NEW + '#record'); await page.waitForSelector('#mvAgain a');
    await page.click('#mvAgain a');
    await page.waitForFunction(() => /はこんだよ/.test(document.body.innerText), null, { timeout: 15000 });
    assert.strictEqual(page.url(), NEW + 'move.html', '「#」の 後ろの 記録は URL から 消える');
    checkNotLess(await dump(page), A, B);
    assert.strictEqual(await page.getAttribute('#mvB a', 'href'), '/index.html#record');
    await ctx.close();
  });
  await t('ブラウザ：大きすぎて はこべないときは 古い住所の まま 案内を 出す（バックアップの もじ・あたらしい ばしょ）', async () => {
    const { ctx } = await ctxFor({ on: true, stub: true }), page = await ctx.newPage();
    await seed(page, OLD, { ...oldRecords(), mh_quiz_sets: crypto.randomBytes(900000).toString('base64') });
    await page.goto(OLD + '#home'); await page.waitForSelector('#mhmvStuck', { timeout: 15000 });
    assert(page.url().startsWith(OLD)); assert(await page.isVisible('#mhmvStuck'));
    assert.strictEqual(await page.evaluate(() => getComputedStyle(document.documentElement).visibility), 'visible');
    assert.strictEqual(await page.getAttribute('#mhmvStuck a', 'href'), OLD + 'index.html#record');
    assert.strictEqual(await page.evaluate(() => localStorage.getItem('mh_moved')), null);
    await ctx.close();
  });
  await t('ブラウザ：オフの ときは 何もしない（古い住所の まま・しるしなし・入口なし）', async () => {
    const { ctx, log } = await ctxFor({ on: false, stub: false }), page = await ctx.newPage(), A = oldRecords();
    await seed(page, OLD, A);
    await page.goto(OLD + '#record'); await page.waitForSelector('.rec', { timeout: 20000 });
    assert.strictEqual(page.url(), OLD + '#record'); assert(!log.some(x => x.startsWith('new/')), '新しい住所へ 行かない');
    assert.strictEqual(await page.evaluate(() => localStorage.getItem('mh_moved')), null);
    await page.goto(NEW + '#record'); await page.waitForSelector('.rec', { timeout: 20000 });
    assert.strictEqual(await page.$('#mvAgain'), null, 'オフの あいだは 入口を 出さない');
    await ctx.close();
  });
  await t('ブラウザ：バックアップの 文字 MH3 に めもり名人の ★ が 入る（★が なければ MH2）（ひろばの 文字 HR4 は 上の Node の 検査・test-collection.js）', async () => {
    const { ctx } = await ctxFor({ on: false, stub: false }), page = await ctx.newPage(), A = oldRecords();
    await seed(page, NEW, A);
    await page.goto(NEW + '#record'); await page.waitForSelector('#bkMake'); await page.click('#bkMake');
    const code = await page.textContent('#bkCode'); assert(/^MH3/.test(code), code.slice(0, 4));
    const hr = COL.hrMake(COL.clean(JSON.parse(A.mh_col), today)); assert(/^HR4/.test(hr));
    await seed(page, NEW, { mh_meter: JSON.stringify({ s: { 1: 1 }, guide: 1, ch: 0 }) });
    await page.goto(NEW + '#record'); await page.waitForSelector('#bkIn');
    await page.fill('#bkIn', code); await page.click('#bkGo'); await page.waitForFunction(() => /よみこ|読《?よ/.test(document.body.innerText));
    const m = JSON.parse(await page.evaluate(() => localStorage.getItem('mh_meter')));
    assert.deepStrictEqual(m.s, { 1: 3, 2: 2, 3: 1, 6: 3 }); assert.strictEqual(m.guide, 1, '設定は そのまま');
    const best = JSON.parse(await page.evaluate(() => localStorage.getItem('mh_best'))); assert.strictEqual(best.calc.score, 18);
    await seed(page, NEW, {}); await page.goto(NEW + '#record'); await page.waitForSelector('#bkMake'); await page.click('#bkMake');
    assert(/^MH2/.test(await page.textContent('#bkCode')), '★が なければ 今まで通り MH2');
    await ctx.close();
  });
  await browser.close();
}
