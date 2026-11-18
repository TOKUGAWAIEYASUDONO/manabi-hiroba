// 100マス計算の記録（data/masu100.js：数える回・まとめ・送る形・ランキング・どんぐり）の単体テスト。 node tools/test-masu100.js
const assert = require("assert"), fs = require("fs"), path = require("path");
const M = require("../data/masu100.js");
let n = 0;
const t = (name, fn) => { try { fn(); n++; console.log("ok  " + name); } catch (e) { console.log("NG  " + name + "\n    " + e.message); process.exitCode = 1; } };

/* 100マス計算（src/studySession.js の finalizeStudySession）と同じ形の記録を作る */
const NOW = new Date(2026, 10, 18, 15, 0, 0).getTime();          // 2026-11-18（水）15:00（端末の地域の時刻）
const H = 3600e3, DAY = 24 * H;
const rec = (o = {}) => {
  const at = NOW - (o.ago == null ? H : o.ago), ms = o.ms == null ? 90000 : o.ms, count = o.count == null ? 100 : o.count;
  return { schema: "study.v1", id: "x" + Math.random(), appId: o.appId || "square100", appVersion: "1.8.1", kind: "session", mode: o.mode || "add",
    unit: { id: (o.mode || "add") + "-" + (o.cells || count), title: "たし算 100マス", preset: true }, source: "course", multiplayer: false, grading: "objective",
    startedAt: new Date(at).toISOString(), endedAt: new Date(at + ms).toISOString(), elapsedMs: ms, activeMs: ms, timeBasis: "app", status: o.status || "completed",
    summary: { count, attempted: count, firstTryCorrect: o.correct == null ? count : o.correct, correct: o.correct == null ? count : o.correct }, items: [],
    ext: { autoScore: true, input: "keyboard", cells: o.cells || count, bestMs: null, ...(o.dan ? { dan: o.dan } : {}), ...(o.timeUp ? { timeUp: true, timeLimitMs: 60000 } : {}), wrongItems: [] } };
};
const runs = list => M.readRuns(JSON.stringify(list), NOW);

t("数える回：100問・だんなし・完走・9割以上・40秒以上", () => {
  const r = runs([rec()]); assert.strictEqual(r.length, 1); assert.strictEqual(r[0].valid, true);
  const why = o => runs([rec(o)])[0].why;
  assert.strictEqual(why({ count: 50 }), "count");                       // 問題数を へらした
  assert.strictEqual(why({ count: 64, cells: 100 }), "count");           // とちゅうから はじめた（盤面は100マス）
  assert.strictEqual(why({ mode: "mul", dan: [1] }), "dan");             // 1のだんだけ
  assert.strictEqual(why({ mode: "mul", dan: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] }), "dan");   // だんを えらんだ回は ぜんぶでも 数えない（アプリの ベストと同じ）
  assert.strictEqual(why({ status: "aborted" }), "abort");
  assert.strictEqual(why({ timeUp: true }), "abort");
  assert.strictEqual(why({ correct: 89 }), "acc");
  assert.strictEqual(why({ correct: 90 }), "");
  assert.strictEqual(why({ ms: 39999 }), "speed");                       // 1マス 0.4秒より はやい
  assert.strictEqual(why({ ms: 40000 }), "");
  assert.strictEqual(why({ ms: M.MAX_MS + 1 }), "speed");
  assert.strictEqual(why({ ago: -H }), "future");                        // 1時間 先の日時
});
t("こわれた・ほかのアプリの記録は 読まない（落ちない）", () => {
  assert.deepStrictEqual(M.readRuns("{x", NOW), []);
  assert.deepStrictEqual(M.readRuns(null, NOW), []);
  assert.deepStrictEqual(M.readRuns('{"a":1}', NOW), []);
  const bad = [null, 1, "s", [], { appId: "square100" }, rec({ appId: "kanji" }), { ...rec(), mode: "div" }, { ...rec(), mode: "__proto__" },
    { ...rec(), elapsedMs: "90000" }, { ...rec(), elapsedMs: -1 }, { ...rec(), startedAt: "きのう" }, { ...rec(), summary: null }, { ...rec(), elapsedMs: NaN }];
  assert.deepStrictEqual(M.readRuns(JSON.stringify(bad), NOW).length, 0);
  const odd = runs([{ ...rec(), summary: { count: 100, correct: 1e9 } }]); assert.strictEqual(odd[0].correct, 100);    // 正解数は 問題数まで
  const ls = { getItem: k => { if (k === M.LOG_KEY) throw new Error("blocked"); return null; } };
  assert.deepStrictEqual(M.readStore(ls, NOW).runs, []);
});
t("まとめ：この じかん（入ってから）と これまで（入る前の自己ベスト・いままでの いちばん・合計・今週の日数）", () => {
  const list = [rec({ ms: 120000, ago: 2 * DAY }), rec({ ms: 100000, ago: DAY }), rec({ ms: 95000, ago: 3 * H }), rec({ ms: 99000, ago: 2 * H, correct: 95 }),
    rec({ ms: 50000, ago: H, count: 50 }), rec({ ms: 60000, ago: H, mode: "mul", dan: [2] }), rec({ ms: 80000, ago: 9 * DAY })];
  const s = M.summarize(runs(list), NOW).add;                              // 入った時刻が ない → きょうの まとめ
  assert.strictEqual(s.tb, 95000); assert.strictEqual(s.pb, 80000);       // 9日前の 80秒が 前の自己ベスト
  assert.strictEqual(s.best, 80000); assert.strictEqual(s.total, 5);      // いままでの 数える回（50問の回は 入らない）
  assert.strictEqual(s.sets, 2); assert.strictEqual(s.perfect, 1); assert.strictEqual(s.acc, 97);
  assert.strictEqual(s.days, 3);                                           // 月・火・水（9日前は 先週）
  assert.strictEqual(s.pbNew, false); assert.strictEqual(s.other, 1);
  const j = M.summarize(runs(list), NOW, null, NOW - 2.5 * H).add;         // 2時間半 前に 入った：3時間前の回は「入る前」
  assert.strictEqual(j.sets, 1); assert.strictEqual(j.tb, 99000); assert.strictEqual(j.pb, 80000); assert.strictEqual(j.total, 5);
  const j2 = M.summarize(runs([rec({ ms: 100000, ago: 3 * H }), rec({ ms: 90000, ago: H })]), NOW, null, NOW - 2 * H).add;
  assert.strictEqual(j2.pb, 100000); assert.strictEqual(j2.tb, 90000); assert.strictEqual(j2.pbNew, true); assert.strictEqual(j2.best, 90000);
  const none = M.summarize(runs([rec({ ms: 100000, ago: 3 * H })]), NOW, null, NOW - H).add;   // 入ってから まだ していない
  assert.strictEqual(none.sets, 0); assert.strictEqual(none.tb, 0); assert.strictEqual(none.best, 100000); assert.strictEqual(none.total, 1);
  const lots = []; for (let i = 0; i < 12; i++) lots.push(rec({ ms: 90000 + i * 1000, ago: (20 - i) * 600e3 }));
  assert.strictEqual(M.summarize(runs(lots), NOW, null, NOW - 4 * H).add.sets, 12, "がんばりは 頭打ちしない");
  const s2 = M.summarize(runs([rec({ ms: 100000, ago: DAY }), rec({ ms: 90000 })]), NOW).add;
  assert.strictEqual(s2.pbNew, true);
  const s3 = M.summarize(runs([rec({ ms: 90000 })]), NOW).add;           // はじめての記録も 「こうしん」
  assert.strictEqual(s3.pbNew, true); assert.strictEqual(s3.pb, 0);
  const mul = M.summarize(runs(list), NOW).mul; assert.strictEqual(mul.sets, 0); assert.strictEqual(mul.other, 1); assert.strictEqual(mul.total, 0);
  assert.strictEqual(M.hasAny(M.summarize([], NOW)), false); assert.strictEqual(M.hasAny(none ? { add: none } : {}), true);
  assert.strictEqual(M.weekStart(M.dayNum(new Date(NOW))), M.dayNum(new Date(2026, 10, 16)));
  assert.strictEqual(M.weekStart(M.dayNum(new Date(2026, 10, 16))), M.dayNum(new Date(2026, 10, 16)));   // 月曜は その日から
  assert.strictEqual(M.weekStart(M.dayNum(new Date(2026, 10, 22))), M.dayNum(new Date(2026, 10, 16)));   // 日曜は 前の月曜から
});
t("前の自己ベストは giga_calc_records_v4 の 最近の記録でも おぎなう（だん・制限時間・入ってからの回は 使わない）", () => {
  const g = { "たし算": { best: { 100: 70 }, history: [{ at: new Date(NOW - 3 * DAY).toISOString(), time: 85.2, count: 100 }, { at: new Date(NOW - 3 * DAY).toISOString(), time: 60, count: 100, dan: [1] },
    { at: new Date(NOW - 3 * DAY).toISOString(), time: 61, count: 100, limit: 60, solved: 100 }, { at: new Date(NOW - H).toISOString(), time: 62, count: 100 }, { at: "x", time: 50, count: 100 }, { at: new Date(NOW - DAY).toISOString(), time: 30, count: 100 }] } };
  const s = M.summarize(runs([rec({ ms: 90000, ago: DAY }), rec({ ms: 80000 })]), NOW, JSON.stringify(g)).add;
  assert.strictEqual(s.pb, 85200); assert.strictEqual(s.pbNew, true);
  assert.deepStrictEqual(M.gigaPrev("こわれた", 1), {});
});
t("送る形：数字だけ（生の記録・日時・式は入らない）→ 受けとる側で もどせる", () => {
  const sum = M.summarize(runs([rec({ ms: 100000, ago: DAY }), rec({ ms: 91234 }), rec({ ms: 95000, correct: 92 })]), NOW);
  const w = M.wire(sum), js = JSON.stringify(w);
  assert(js.length < 100, js); assert.deepStrictEqual(Object.keys(w), ["v", "o"]); assert.strictEqual(w.v, 2); assert(Object.values(w.o).every(a => a.length === 5 && a.every(Number.isInteger)), js);
  assert.deepStrictEqual(Object.keys(w.o), ["add"]);
  const c = M.clampWire(JSON.parse(js)).add;
  assert.strictEqual(c.tb, 91200); assert.strictEqual(c.pb, 100000); assert.strictEqual(c.sets, 2); assert.strictEqual(c.total, 3); assert.strictEqual(c.best, 91200); assert.strictEqual(c.pbNew, true);
  const old = M.summarize(runs([rec({ ms: 100000, ago: DAY })]), NOW, null, NOW - H), w2 = M.wire(old);   // 入ってから まだ：これまで だけ とどく
  assert.deepStrictEqual(w2.o.add, [0, 1000, 0, 1, 1]);
  const c2 = M.clampWire(w2).add; assert.strictEqual(c2.tb, 0); assert.strictEqual(c2.best, 100000); assert.strictEqual(c2.total, 1);
  assert.deepStrictEqual(M.wire(M.summarize([], NOW)), { v: 2, o: {} }); assert.deepStrictEqual(M.clampWire({ v: 2, o: {} }), {});   // 記録が なくても 入ったことは とどく
});
t("受けとる側：形の ちがう物は null・ありえない数字は おさめる（まえの形 v1 も 受けとる）", () => {
  for (const b of [null, 1, "x", [], {}, { v: 3, o: {} }, { v: 2, o: [] }, { v: 2, o: { div: [1, 1, 1, 1, 1] } }, { v: 2, o: { add: [1, 2, 3] } }, { v: 2, o: { add: [900, 0, 1, 1, 100, 1] } },
    { v: 1, o: { add: [900, 0, 1, 1, 1] } }, { v: 2, o: { add: ["900", 0, 1, 1, 1] } }, { v: 2, o: { add: [900, 0, 1, 1, Infinity] } }, JSON.parse('{"v":2,"o":{"__proto__":[900,0,1,1,1]}}'),
    { v: 2, o: { add: [900, 0, 1, 1, 1], sub: [900, 0, 1, 1, 1], mul: [900, 0, 1, 1, 1], x: 1 } }]) assert.strictEqual(M.clampWire(b), null, JSON.stringify(b));
  const c = M.clampWire({ v: 2, o: { add: [10, 0, 999, 5, 99], sub: [900, 99999999, -5, 0, -1], mul: [900, 800, 3000, 1e9, 3] } });
  assert.strictEqual(c.add.tb, 0); assert.strictEqual(c.add.sets, 0); assert.strictEqual(c.add.total, 5); assert.strictEqual(c.add.days, 7);   // 1秒は ありえない → この じかんは なし
  assert.strictEqual(c.sub.tb, 90000); assert.strictEqual(c.sub.pb, 0); assert.strictEqual(c.sub.sets, 1); assert.strictEqual(c.sub.total, 1); assert.strictEqual(c.sub.days, 1);
  assert.strictEqual(c.mul.sets, M.MAX_SETS); assert.strictEqual(c.mul.total, M.MAX_TOTAL); assert.strictEqual(c.mul.pbNew, false); assert.strictEqual(c.mul.best, 80000);
  const d = M.clampWire({ v: 2, o: { add: [0, 900, 0, 0, 0] } }).add; assert.strictEqual(d.total, 1);   // 自己ベストが あるなら 1回は した
  const v1 = M.clampWire({ v: 1, o: { add: [900, 1000, 4, 1, 100, 2] } }).add;
  assert.strictEqual(v1.tb, 90000); assert.strictEqual(v1.sets, 4); assert.strictEqual(v1.total, 4); assert.strictEqual(v1.days, 2); assert.strictEqual(v1.pbNew, true);
});

/* ランキング */
const kid = (pid, a, t) => ({ pid, t: t || 0, s: M.clampWire({ v: 2, o: { add: a } }) });     // a = [tb, pb, sets, total, days]
const cat = (r, k) => r.cats.find(c => c.k === k).l;
t("この じかん：はやさは 本当の上位5人・同じタイムは同じ順位・最下位は出さない・入ってから していない子は 出ない", () => {
  const E = [kid("a", [700, 0, 1, 1, 1]), kid("b", [650, 0, 1, 1, 1]), kid("c", [800, 0, 1, 1, 1]), kid("d", [650, 0, 1, 1, 1], 5), kid("e", [900, 0, 1, 1, 1]),
    kid("f", [1000, 0, 1, 1, 1]), kid("g", [1200, 0, 1, 1, 1]), kid("z", [0, 500, 0, 40, 5])];
  const r = M.rankOp(E, "add"), h = cat(r, "hayasa");
  assert.deepStrictEqual(r.cats.map(c => c.k), M.CATS); assert.strictEqual(r.n, 8); assert.strictEqual(r.nn, 7);
  assert.deepStrictEqual(h.map(x => x[0]), ["b", "d", "a", "c", "e"]);
  assert.deepStrictEqual(h.map(x => x[2]), [1, 1, 3, 4, 5]);
  assert.strictEqual(h[0][1], 65000);
  assert(!r.cats.slice(0, 3).some(c => c.l.some(x => x[0] === "z")), "入ってから していない子は この じかんに 出ない");
  const two = cat(M.rankOp([kid("a", [700, 0, 1, 1, 1]), kid("b", [800, 0, 1, 1, 1])], "add"), "hayasa");
  assert.deepStrictEqual(two.map(x => x[0]), ["a"]);                      // 2人なら 1人だけ（おそいほうは出さない）
  const one = cat(M.rankOp([kid("a", [700, 0, 1, 1, 1])], "add"), "hayasa"); assert.strictEqual(one.length, 1);
});
t("のびりつ：入る前より はやくなった子だけ・% で 大きい順", () => {
  const E = [kid("a", [900, 1000, 1, 2, 1]), kid("b", [800, 1000, 1, 2, 1]), kid("c", [1100, 1000, 1, 2, 1]), kid("d", [500, 0, 1, 1, 1]), kid("e", [950, 1000, 1, 2, 1])];
  const nb = cat(M.rankOp(E, "add"), "nobi");
  assert.deepStrictEqual(nb.map(x => x[0]), ["b", "a"]);                  // c（おそくなった）・d（前が ない）は 対象外、e（いちばん下）は出さない
  assert.deepStrictEqual(nb.map(x => x[1]), [20, 10]);
});
t("がんばり・るいけいは 頭打ちしない（やった数を そのまま 出す）", () => {
  const E = [kid("a", [900, 0, 30, 300, 7]), kid("b", [900, 0, 12, 50, 3], 1), kid("c", [900, 0, 2, 9, 2]), kid("d", [900, 0, 1, 1, 1])];
  const r = M.rankOp(E, "add"), g = cat(r, "ganbari"), tt = cat(r, "total");
  assert.deepStrictEqual(g.map(x => x[1]).slice(0, 2).sort((p, q) => q - p)[0] >= 12, true);
  assert(g.some(x => x[1] === 30) || tt.some(x => x[1] === 300), "30セット・300回が そのまま出る");
  assert(tt.every(x => x[1] > 5 || x[0] === "c" || x[0] === "d"));
});
t("これまで：じこベストは 本当の上位・入ったときに とどいた子（この じかん なし）も 出る", () => {
  const E = [kid("a", [0, 700, 0, 20, 3]), kid("b", [650, 900, 1, 9, 2]), kid("c", [0, 800, 0, 50, 5]), kid("d", [0, 1200, 0, 2, 1])];
  const r = M.rankOp(E, "add"), b = cat(r, "best");
  assert.deepStrictEqual(b.map(x => x[0]), ["b", "a", "c"]); assert.deepStrictEqual(b.map(x => x[2]), [1, 2, 3]); assert.strictEqual(b[0][1], 65000);
  assert.strictEqual(cat(r, "hayasa").length, 1);
});
t("ちらばり：同じ表で 1人が いくつもの上位を とらないよう、まだ出ていない子を先に えらぶ", () => {
  const E = [kid("a", [600, 700, 5, 90, 7])];
  "bcdefghijk".split("").forEach((p, i) => E.push(kid(p, [700 + i * 30, 760 + i * 25, 1 + (i % 4), 5 + (i % 6) * 3, 1 + (i % 5)], i + 1)));
  const r = M.rankOp(E, "add");
  for (const grp of [M.GROUPS.now, M.GROUPS.all]) {
    const counts = {};
    for (const c of r.cats.filter(c => grp.includes(c.k))) { assert(c.l.length <= 5); for (const x of c.l) counts[x[0]] = (counts[x[0]] || 0) + 1; }
    assert(Object.keys(counts).length >= 9, "多くの子が出る：" + JSON.stringify(counts));
    assert(Object.values(counts).every(v => v <= 2), "10人以上なら 1人 2つまで：" + JSON.stringify(counts));
  }
  assert.strictEqual(cat(r, "hayasa")[0][0], "a"); assert.strictEqual(cat(r, "best")[0][0], "a");   // 1つめは そのまま上位
});
t("ちらばり：人が少ないときは 同じ子が いくつかに出てもよい（表を空にしない）", () => {
  const E = [kid("a", [600, 700, 5, 30, 7]), kid("b", [700, 720, 2, 10, 2]), kid("c", [800, 0, 1, 1, 1])];
  const r = M.rankOp(E, "add");
  for (const c of r.cats) assert(c.l.length >= 1, c.k);
  assert.deepStrictEqual(cat(r, "ganbari").map(x => x[0]), ["a", "b"]);   // 値の順に ならぶ
});
t("じこベスト こうしん：順位なし・送った順・上限あり", () => {
  const E = [kid("a", [900, 1000, 1, 2, 1], 3), kid("b", [900, 0, 1, 1, 1], 1), kid("c", [1100, 1000, 1, 2, 1], 2), kid("d", [0, 800, 0, 3, 1], 0)];
  const r = M.rankOp(E, "add"); assert.deepStrictEqual(r.pb, ["b", "a"]); assert.strictEqual(r.pbN, 2);
  const many = []; for (let i = 0; i < 60; i++) many.push(kid("k" + i, [900, 0, 1, 1, 1], i));
  const r2 = M.rankOp(many, "add"); assert.strictEqual(r2.pb.length, M.PB_MAX); assert.strictEqual(r2.pbN, 60);
  const all = M.rank(many); assert.deepStrictEqual(Object.keys(all), ["add", "sub", "mul"]); assert.strictEqual(all.sub.n, 0);
  assert(JSON.stringify(all).length < 8000, "60人でも 小さく " + JSON.stringify(all).length);
});

/* どんぐり */
const rw = (st, list, now) => M.reward(st, M.readRuns(JSON.stringify(list), now || NOW), now || NOW);
t("どんぐり：数える回 1こ・同じ日の同じ計算の2回めからは半分・1日3こまで", () => {
  let r = rw(null, [rec({ ago: 3 * H })]); assert.strictEqual(r.give, 1); assert.strictEqual(r.n, 1);
  r = rw(r.st, [rec({ ago: 3 * H })]); assert.strictEqual(r.give, 0);         // 同じ回は もう数えない
  r = rw(null, [rec({ ago: 5 * H }), rec({ ago: 4 * H })]); assert.strictEqual(r.give, 1);   // たし算 2回 = 1 + 0.5 → 1こ
  r = rw(null, [rec({ ago: 5 * H }), rec({ ago: 4 * H }), rec({ ago: 3 * H })]); assert.strictEqual(r.give, 2);   // 3回 = 2こ
  r = rw(null, [rec({ ago: 5 * H }), rec({ ago: 4 * H, mode: "sub" }), rec({ ago: 3 * H, mode: "mul" }), rec({ ago: 2 * H, mode: "sub" })]); assert.strictEqual(r.give, 3);
  const ten = []; for (let i = 0; i < 10; i++) ten.push(rec({ ago: (12 - i) * 600e3, mode: M.OPS[i % 3] }));
  r = rw(null, ten); assert.strictEqual(r.give, 3); r = rw(r.st, [...ten, rec({ ago: 60e3 })], NOW + 120e3); assert.strictEqual(r.give, 0);   // その日は もう3こ
});
t("どんぐり：だん・問題数・とちゅう・正答率・速さの回は 0", () => {
  const r = rw(null, [rec({ mode: "mul", dan: [0] }), rec({ count: 10 }), rec({ status: "aborted" }), rec({ correct: 50 }), rec({ ms: 20000 }), rec({ count: 100, cells: 100, timeUp: true })]);
  assert.strictEqual(r.give, 0); assert.strictEqual(r.n, 0);
  assert(r.st.c > 0, "数えない回も すすめる（あとで 数えなおさない）");
});
t("どんぐり：きのうの回は きのうの3こまで・それより前は数えない・未来の回は まだ数えない", () => {
  let r = rw(null, [rec({ ago: DAY }), rec({ ago: DAY + H, mode: "sub" }), rec({ ago: DAY + 2 * H, mode: "mul" }), rec({ ago: DAY + 3 * H, mode: "add" }), rec({ ago: 3 * DAY })]);
  assert.strictEqual(r.give, 3);
  r = rw(r.st, [rec({ ago: H })]); assert.strictEqual(r.give, 0);           // わたす日（きょう）も 3こまで（きのうの回と あわせて）
  r = rw(r.st, [], NOW + DAY); assert.strictEqual(r.give, 1);               // つぎの日に のこりの 1こ
  r = rw(null, [rec({ ago: DAY }), rec({ ago: H }), rec({ ago: 2 * H, mode: "sub" }), rec({ ago: 3 * H, mode: "mul" })]); assert.strictEqual(r.give, 3, "きのう1＋きょう3 でも 1日3こ");
  r = rw(null, [rec({ ago: -10 * 60e3 })]); assert.strictEqual(r.give, 0); assert.strictEqual(r.st.c, 0);
});
t("どんぐり：時計が もどったら 何もしない・こわれた状態は 作りなおす", () => {
  let r = rw(null, [rec({ ago: H })]); assert.strictEqual(r.give, 1);
  const back = M.reward(r.st, M.readRuns(JSON.stringify([rec({ ago: 0.5 * H })]), NOW - DAY), NOW - DAY); assert.strictEqual(back.blocked, true); assert.strictEqual(back.give, 0);
  for (const b of [null, 1, "x", { v: 2 }, { v: 1, c: "z", d: { abc: 1, 5: { h: -5, g: 99, o: { add: "x", zz: 4 } } } }]) {
    const s = M.cleanReward(b, NOW); assert.strictEqual(s.v, 1); for (const k in s.d) assert(s.d[k].g <= M.DAY_GIVE);
  }
  const forged = { v: 1, c: 0, last: 0, d: { [M.dayNum(new Date(NOW))]: { h: 9999, g: -3, o: {} } } };     // 書きかえても 1日3こより 多くは出ない
  r = rw(forged, [rec({ ago: H })]); assert(r.give <= M.DAY_GIVE, "" + r.give);
});
t("時間の 見せ方", () => {
  assert.strictEqual(M.fmtTime(65300), "1:05.3"); assert.strictEqual(M.fmtTime(59960), "1:00.0"); assert.strictEqual(M.fmtTime(45000), "45.0"); assert.strictEqual(M.fmtTime(0), "");
});
t("server.js・index.html が この部品を読む（同じ決まり）", () => {
  const root = path.join(__dirname, "..");
  assert(/require\("\.\/data\/masu100\.js"\)/.test(fs.readFileSync(path.join(root, "server.js"), "utf8")));
  assert(/<script src="data\/masu100\.js\?v=/.test(fs.readFileSync(path.join(root, "index.html"), "utf8")));
});

/* server.js（予備の方式）：部屋の側で しらべる・ランキングは 先生だけ */
(async () => {
  const { spawn } = require("child_process");
  const PORT = 20000 + Math.floor(Math.random() * 20000);
  const srv = spawn(process.execPath, [path.join(__dirname, "..", "server.js")], { env: { ...process.env, PORT: String(PORT), JOIN_RATE_SCALE: "1000" }, stdio: "ignore" });
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const post = async (name, body) => { const r = await fetch(`http://127.0.0.1:${PORT}/api/${name}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); return { s: r.status, j: await r.json().catch(() => ({})) }; };
  const events = async (code, who) => { const ac = new AbortController(), r = await fetch(`http://127.0.0.1:${PORT}/api/events`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, ...who }), signal: ac.signal });
    const o = { msgs: [], stop() { ac.abort(); } }; (async () => { const rd = r.body.getReader(), dec = new TextDecoder(); let buf = ""; try { for (;;) { const { value, done } = await rd.read(); if (done) break; buf += dec.decode(value, { stream: true }); let i; while ((i = buf.indexOf("\n\n")) >= 0) { const ev = buf.slice(0, i); buf = buf.slice(i + 2); const d = ev.split("\n").find(l => l.startsWith("data: ")); if (d) o.msgs.push(JSON.parse(d.slice(6))); } } } catch (e) {} })(); return o; };
  const last = ev => ev.msgs[ev.msgs.length - 1];
  try {
    for (let i = 0; i < 40; i++) { try { await fetch(`http://127.0.0.1:${PORT}/`); break; } catch (e) { await sleep(100); } }
    const r = (await post("create", { mode: "m100", g: 3, t: 60, rule: "normal", nm: "input" })).j;
    assert(r.code, "100マス はっぴょうの 部屋が つくれる（問題は いらない）");
    const a = (await post("join", { code: r.code, name: "あおい" })).j, b = (await post("join", { code: r.code, name: "そら" })).j;
    const host = await events(r.code, { hostKey: r.hostKey }), kid = await events(r.code, { pid: a.pid, token: a.token }); await sleep(250);
    const act = (p, body) => post("act", { code: r.code, pid: p.pid, token: p.token, op: "m100", ...body });
    assert.strictEqual((await post("start", { code: r.code, hostKey: r.hostKey })).s, 409, "スタートは ない");
    assert.strictEqual((await post("act", { code: r.code, pid: a.pid, token: a.token, op: "answer", right: true })).s, 403, "ほかの操作は できない");
    assert.strictEqual((await act(a, { s: { v: 1, o: { add: ["x"] } } })).s, 400, "形の ちがう物は 400");
    assert.strictEqual((await act({ pid: a.pid, token: "nise" }, { s: { v: 1, o: {} } })).s, 403, "ほかの子の ふりは できない");
    assert.strictEqual((await act(a, { s: { v: 1, o: { add: [700, 800, 3, 2, 99, 2] } } })).s, 200);
    assert.strictEqual((await act(a, { s: { v: 1, o: { add: [700, 800, 3, 2, 99, 2] } } })).s, 429, "つづけて 押しても 2秒は まつ");
    assert.strictEqual((await act(b, { s: { v: 1, o: { add: [1, 0, 999, 999, 5, 9], mul: [900, 0, 1, 1, 100, 1] } } })).s, 200);
    await sleep(300);
    const h = last(host), k = last(kid);
    assert(h.m1 && h.m1.add.n === 2 && h.m1.mul.n === 1, "先生には ランキング");
    assert.deepStrictEqual(h.m1.add.cats[0].l.map(x => x[0]), [a.pid], "ありえない 1秒は はやさに 出ない");
    assert(h.players.find(p => p.pid === a.pid).m1 > 1, "先生には 送った時刻（さいきん みせた子の 表示）");
    assert(!("m1" in k) && k.m1me === 1 && k.players.every(p => p.name === "" && !("m1" in p)), "児童には ランキング・ほかの子の 名前を 送らない（自分が みせたか だけ）");
    assert(!JSON.stringify(kid.msgs).includes("そら"));
    assert.strictEqual((await post("end", { code: r.code, hostKey: r.hostKey })).s, 200);
    assert.strictEqual((await act(b, { s: { v: 1, o: {} } })).s, 409, "おわったら 受けとらない");
    await sleep(200); assert(!last(host).awards, "しょうは 出さない");
    host.stop(); kid.stop(); n++; console.log("ok  server.js：100マス はっぴょう（しらべる・2秒・先生だけ・おわり）");
  } catch (e) { console.log("NG  server.js：100マス はっぴょう\n    " + (e && e.stack || e).split("\n").slice(0, 3).join("\n    ")); process.exitCode = 1; }
  finally { try { srv.kill(); } catch (e) {} }
  console.log(`\n${n} 件のテストを実行${process.exitCode ? "（失敗あり）" : "：すべて成功"}`);
  process.exit(process.exitCode || 0);
})();
