// コレクション v1〜v3.3（data/collection.js：どんぐり・ずかん・ひろば・バックアップ・たんけん・まなびっこ）の単体テスト。 node tools/test-collection.js
const assert = require("assert"), fs = require("fs"), path = require("path"), vm = require("vm");
const C = require("../data/collection.js");
let n = 0;
const t = (name, fn) => { try { fn(); n++; console.log("ok  " + name); } catch (e) { console.log("NG  " + name + "\n    " + e.message); process.exitCode = 1; } };

const D = 20000;                                         // ある日（日数）
const U = id => ({ id, n: 10, o: 9 });                    // 10問中9問○（7割以上・9割以上）
const run = (S, day, units, o = {}) => C.recordRun(S, { today: day, grade: o.grade === undefined ? 3 : o.grade, units, answered: o.answered === undefined ? units.reduce((a, u) => a + u.n, 0) : o.answered, correct: o.correct === undefined ? units.reduce((a, u) => a + u.o, 0) : o.correct, quiz: !!o.quiz });
const gain = r => r.paid + r.deferred;

t("単元の ID 表：units.js の ready な単元と同じ（新しい単元が増えたら表に足すこと）", () => {
  const root = path.join(__dirname, "..");
  const ctx = { console }; ctx.window = ctx; vm.createContext(ctx);
  for (const f of ["data/questions.js", "data/calc.js", "data/choices.js", "data/quizlib.js", "data/gen/core.js", "data/gen/other.js", "data/gen/sansu-12.js", "data/gen/sansu-34.js", "data/gen/sansu-56.js", "data/gen/rika.js", "data/units.js"]) vm.runInContext(fs.readFileSync(path.join(root, f), "utf8"), ctx, { filename: f });
  const ready = ctx.MH_UNITS.UNITS.filter(u => u.status === "ready" && u.gen), SJ = { sansu: "m", kokugo: "j", shakai: "s", eigo: "e", rika: "r" };
  assert.strictEqual(new Set(C.UNIT_IDS).size, C.UNIT_IDS.length);
  assert.deepStrictEqual([...ready.map(u => u.id)].sort(), [...C.UNIT_IDS].sort());
  const GFIX = { "m6-hayasa": 5, "m5-bunsu-int": 6, "m5-frac-mul-int": 6, "m5-frac-div-int": 6, "m6-speed-distance": 5, "m6-speed-time": 5 };
  for (const u of ready) { assert.strictEqual(u.id[0], SJ[u.subj]); assert.strictEqual(GFIX[u.id] || +u.id[1], u.g); }
  assert(C.UNIT_IDS.length * 4 + 3 < 46656);
});
t("かざりの値段の合計は 734（はじめの 7こ 380 ＋ 島の かざり 26こ 354）", () => { assert.strictEqual(C.PRICE_TOTAL, 734); assert.strictEqual(C.DECOR.length, 33); assert.strictEqual(C.DECOR0.reduce((n, d) => n + d.price, 0), 380); });
t("バックアップ HR5：島の かざり（追加の 26こ）を もっていると HR5。買った物・おいた ばしょが もどる。もっていなければ 今まで通り", () => {
  const S = C.fresh(D); S.ac.e = 900; ["tree", "castle", "duck", "mushroom"].forEach(id => assert(C.buy(S, id)));
  assert(C.place(S, "tree", 2)); assert(C.place(S, "castle", 35)); assert(C.place(S, "duck", 7));
  const code = C.hrMake(S); assert(/^HR5/.test(code));
  const r = C.hrParse(code); assert(r); assert.deepStrictEqual(r.own.slice().sort(), ["castle", "duck", "mushroom", "tree"]); assert.deepStrictEqual(r.pl, { tree: 2, castle: 35, duck: 7 });
  const T2 = C.fresh(D); C.hrMerge(T2, r, D); assert.deepStrictEqual(T2.pl, { tree: 2, castle: 35, duck: 7 }); assert(T2.own.includes("mushroom"));
  const flat = code.replace(/-/g, ""); let bad = 0;
  for (let i = 3; i < 3 + 32; i++) { const c = flat[i] === "0" ? "1" : "0"; if (!C.hrParse(flat.slice(0, i) + c + flat.slice(i + 1))) bad++; }
  assert.strictEqual(bad, 32, "1字 かえると 断る");
  const S0 = C.fresh(D); S0.ac.e = 900; C.buy(S0, "tree"); assert(!/^HR5/.test(C.hrMake(S0)));
});
t("バックアップ HR6 の 中に HR5：素体が いて 追加の かざりも もっていると、包んだ 中が HR5。両方 もどる", () => {
  const S = C.fresh(D); S.ac.e = 900; ["tree", "castle"].forEach(id => assert(C.buy(S, id))); assert(C.place(S, "castle", 35));
  const id = C.SB_IDS[0]; S.sb.o.push(id); S.sb.c = id;
  const code = C.hrMake(S); assert(/^HR6/.test(code)); assert(code.replace(/-/g, "").slice(16, 19) === "HR5");
  const r = C.hrParse(code); assert(r); assert.deepStrictEqual(r.pl, { castle: 35 }); assert(r.own.includes("castle")); assert.strictEqual(r.sb.c, id);
});
t("はじめの どんぐり5こ：1回だけ。1日の上限には入らない", () => {
  const S = C.fresh(D);
  assert.strictEqual(C.claimGift(S, D), 5); assert.strictEqual(C.balance(S), 5); assert.strictEqual(S.day.got, 0);
  assert.strictEqual(C.claimGift(S, D), 0); assert.strictEqual(C.claimGift(S, D + 3), 0); assert.strictEqual(C.balance(S), 5);
  assert(C.buy(S, "tree")); assert.strictEqual(C.balance(S), 0);          // 初日に いちばん安いかざり（5こ）が買える
});
t("5問以上・○7割：4問では「できた」の条件にならない（みつけた にはなる）", () => {
  const S = C.fresh(D); const r = run(S, D, [{ id: "m3-amari", n: 4, o: 4 }]);
  assert.strictEqual(C.stage(S, "m3-amari"), 1); assert(!C.pending(S, "m3-amari")); assert.deepStrictEqual(r.events.map(e => e.t), ["found"]);
  const r2 = run(S, D + 1, [{ id: "m3-amari", n: 4, o: 4 }]); assert.strictEqual(C.stage(S, "m3-amari"), 1); assert.strictEqual(gain(r2), 0);
});
t("5問で○3つ（6割）は条件を満たさない。○7割ちょうどは満たす", () => {
  const S = C.fresh(D); run(S, D, [{ id: "m3-amari", n: 5, o: 3 }]);
  assert(!C.pending(S, "m3-amari"));
  run(S, D, [{ id: "m3-amari", n: 10, o: 7 }]); assert(C.pending(S, "m3-amari"));
});
t("混ぜた回：2問しか答えていない単元は「できた」にならない", () => {
  const m3 = C.UNIT_IDS.filter(i => i[0] === "m" && i[1] === "3"), A = m3[0], B = m3[1], S = C.fresh(D);
  run(S, D, [U(A), { id: B, n: 2, o: 2 }]);
  const r = run(S, D + 1, [U(A), { id: B, n: 2, o: 2 }]);
  assert.strictEqual(C.stage(S, A), 2); assert.strictEqual(C.stage(S, B), 1); assert.strictEqual(r.events.filter(e => e.t === "can").length, 1);
});
t("別の日にもう一度：同じ日は「できた」にならない／次の日は +2", () => {
  const S = C.fresh(D); const a = run(S, D, [U("m3-amari")]);
  assert(a.events.some(e => e.t === "pend")); assert.strictEqual(C.stage(S, "m3-amari"), 1);
  const b = run(S, D, [U("m3-amari")]); assert.strictEqual(C.stage(S, "m3-amari"), 1); assert(!b.events.some(e => e.t === "can"));
  const c = run(S, D + 1, [U("m3-amari")]); assert.strictEqual(C.stage(S, "m3-amari"), 2); assert(c.events.some(e => e.t === "can" && e.gain === 2));
});
t("2日目の最初の「できた」で すべりだい（算数1単元）が来る", () => {
  const S = C.fresh(D); run(S, D, [U("m3-amari")]);
  assert(!C.parts(S).find(p => p.id === "slide").have);
  const r = run(S, D + 1, [U("m3-amari")]); assert.deepStrictEqual(r.newParts, ["slide"]);
  assert(C.parts(S).find(p => p.id === "swing").next);
});
t("できた・マスターは一生に1回：くり返しても増えない（あとは ふくしゅう +1 と あそんだ日の +3 だけ）", () => {
  const S = C.fresh(D); run(S, D, [U("m3-amari")]); run(S, D + 1, [U("m3-amari")]); const e0 = S.ac.e;
  const m = run(S, D + 2, [U("m3-amari")]); assert.strictEqual(C.stage(S, "m3-amari"), 3); assert(m.events.some(e => e.t === "master" && e.gain === 3));
  assert.strictEqual(S.ac.e, e0 + 3 + 1);       // マスター +3 と、その日の1回め +1
  const again = []; for (let d = 3; d < 10; d++) again.push(gain(run(S, D + d, [U("m3-amari")])));
  assert.deepStrictEqual(again, [2, 5, 2, 2, 2, 2, 5]);      // 「きょうの1回め」+1 と ふくしゅう +1。あそんだ日 5日め・10日めに +3
  assert.strictEqual(C.stage(S, "m3-amari"), 3);
});
t("マスターは「できた」の日より あとの日に ○9割以上（8割ではならない）", () => {
  const S = C.fresh(D); run(S, D, [U("m3-amari")]); run(S, D + 1, [U("m3-amari")]);
  run(S, D + 1, [U("m3-amari")]); assert.strictEqual(C.stage(S, "m3-amari"), 2);        // 同じ日はならない
  run(S, D + 2, [{ id: "m3-amari", n: 10, o: 8 }]); assert.strictEqual(C.stage(S, "m3-amari"), 2);
  run(S, D + 3, [U("m3-amari")]); assert.strictEqual(C.stage(S, "m3-amari"), 3);
});
t("学年差：1つ下まで満額、2つ以上下は +1（できた・マスター とも）", () => {
  const S = C.fresh(D);
  run(S, D, [U("m5-a"), U("m4-a"), U("m3-a"), U("m1-kazoeru"), U("m6-a")].filter(u => C.IDX[u.id] !== undefined).map(u => u));
  const ids = C.UNIT_IDS, pick = g => ids.find(i => i[0] === "m" && +i[1] === g);
  const S2 = C.fresh(D), us = [5, 4, 3, 1].map(g => U(pick(g)));
  run(S2, D, us, { grade: 5 });
  const r = run(S2, D + 1, us, { grade: 5 });
  const g = id => r.events.find(e => e.id === id).gain;
  assert.strictEqual(g(pick(5)), 2); assert.strictEqual(g(pick(4)), 2); assert.strictEqual(g(pick(3)), 1); assert.strictEqual(g(pick(1)), 1);
  const r3 = run(S2, D + 2, us, { grade: 5 }), g3 = id => r3.events.find(e => e.id === id).gain;
  assert.strictEqual(g3(pick(5)), 3); assert.strictEqual(g3(pick(4)), 3); assert.strictEqual(g3(pick(3)), 1);
  const S3 = C.fresh(D), up = U(pick(6)); run(S3, D, [up], { grade: 3 }); assert.strictEqual(run(S3, D + 1, [up], { grade: 3 }).events.find(e => e.t === "can").gain, 2);   // 上の学年は満額
  const S4 = C.fresh(D); run(S4, D, [U(pick(1))], { grade: 0 }); assert.strictEqual(run(S4, D + 1, [U(pick(1))], { grade: 0 }).events.find(e => e.t === "can").gain, 2);   // 学年が決まっていないときは満額
});
t("6年生が1年の単元を全部回しても 1日 13こ（満額なら 25こ）。ふつうの子の学年なら満額", () => {
  const g1 = C.UNIT_IDS.filter(i => i[0] === "m" && i[1] === "1"), S = C.fresh(D);
  run(S, D, g1.map(U), { grade: 6 });
  const r = run(S, D + 1, g1.map(U), { grade: 6 });
  assert.strictEqual(r.paid, Math.min(C.CAP, g1.length + 1)); assert.strictEqual(r.deferred, Math.max(0, g1.length + 1 - C.CAP));
  const S2 = C.fresh(D); run(S2, D, g1.map(U), { grade: 1 }); const r2 = run(S2, D + 1, g1.map(U), { grade: 1 });
  assert.strictEqual(r2.paid + r2.deferred, g1.length * 2 + 1);
});
/* ---------- 2026-11-25：案B（ふくしゅう）＋案C（上限10・あそんだ日）・100マス（m100Run）。docs/rewards-study.md ---------- */
const mastered = (S, ids, d0, grade) => { const g = grade || 3; run(S, d0, ids.map(U), { grade: g }); run(S, d0 + 1, ids.map(U), { grade: g }); run(S, d0 + 2, ids.map(U), { grade: g }); };
const evs = (r, t) => r.events.filter(e => e.t === t);
t("ふくしゅう：マスターした 単元を あとの日に 9割で +1。マスターの 日・8割・4問では ならない", () => {
  const S = C.fresh(D); mastered(S, ["m3-amari"], D);
  assert.strictEqual(C.stage(S, "m3-amari"), 3);
  assert.strictEqual(evs(run(S, D + 2, [U("m3-amari")]), "review").length, 0);                   // マスターした 日は まだ
  assert.strictEqual(evs(run(S, D + 3, [{ id: "m3-amari", n: 10, o: 8 }]), "review").length, 0);  // 8割
  assert.strictEqual(evs(run(S, D + 3, [{ id: "m3-amari", n: 4, o: 4 }]), "review").length, 0);   // 4問
  const r = run(S, D + 3, [U("m3-amari")]); assert.deepStrictEqual(evs(r, "review").map(e => [e.id, e.gain]), [["m3-amari", 1]]);
  assert.strictEqual(evs(run(S, D + 3, [U("m3-amari")]), "review").length, 0);                   // 同じ日の 2回めは ない
  assert.strictEqual(evs(run(S, D + 4, [U("m3-amari")]), "review").length, 1);                   // つぎの日は また
});
t("ふくしゅう：「できた」だけの 単元は ふくしゅうに ならない（9割なら マスターに なる）", () => {
  const S = C.fresh(D); run(S, D, [U("m3-amari")]); const r = run(S, D + 1, [U("m3-amari")]);
  assert.strictEqual(C.stage(S, "m3-amari"), 2); assert.strictEqual(evs(r, "review").length, 0);
  const r2 = run(S, D + 1, [U("m3-amari")]); assert.strictEqual(evs(r2, "review").length, 0);
  const r3 = run(S, D + 2, [U("m3-amari")]); assert.strictEqual(evs(r3, "master").length, 1); assert.strictEqual(evs(r3, "review").length, 0);
});
t("ふくしゅう：1日 2こまで（1回で 3単元 やっても・回を わけても）。2学年 下の 単元も +1", () => {
  const ids = ["m3-amari", "m3-man", "m3-en"], S = C.fresh(D); mastered(S, ids, D);
  const r = run(S, D + 3, ids.map(U)); assert.strictEqual(evs(r, "review").length, 2);
  assert.strictEqual(evs(run(S, D + 3, [U("m3-en")]), "review").length, 0);
  assert.deepStrictEqual(S.day.rv, ["m3-amari", "m3-man"]);
  const S2 = C.fresh(D); mastered(S2, ["m1-add10"], D, 3);
  assert.strictEqual(evs(run(S2, D + 3, [U("m1-add10")], { grade: 3 }), "review").map(e => e.gain).join(), "1");
});
t("ふくしゅう：時計を もどすと ふえない・あたらしい日に rv は もどる・clean で 形を たしかめる", () => {
  const S = C.fresh(D); mastered(S, ["m3-amari"], D); run(S, D + 5, [U("m3-amari")]);
  const r = run(S, D + 4, [U("m3-amari")]); assert(r.blocked); assert.strictEqual(r.events.length, 0);
  C.sync(S, D + 6); assert.deepStrictEqual(S.day.rv, []);
  S.day.rv = ["m3-amari"]; const raw = JSON.parse(JSON.stringify(S)); raw.day.rv = ["m3-amari", "nai", 3, "m3-amari", "m3-man", "m3-en"];
  assert.deepStrictEqual(C.clean(raw, D + 6).day.rv, ["m3-amari", "m3-man"]);
  delete raw.day.rv; delete raw.pd; delete raw.day.pd; const c = C.clean(raw, D + 6);
  assert.deepStrictEqual(c.day.rv, []); assert.strictEqual(c.pd, 0); assert.strictEqual(c.day.pd, 0);      // 古い 記録
});
t("あそんだ日：5問以上・6割の 日を 数え、5日に なるたび +3（れんぞくで なくて よい・1日1回）", () => {
  const S = C.fresh(D), q = { answered: 10, correct: 6 }, got = [];
  for (const d of [0, 2, 3, 7, 30]) got.push(evs(run(S, D + d, [], q), "days").length);
  assert.deepStrictEqual(got, [0, 0, 0, 0, 1]); assert.strictEqual(S.pd, 5);
  assert.strictEqual(evs(run(S, D + 30, [], q), "days").length, 0); assert.strictEqual(S.pd, 5);          // 同じ日は 1回
  assert.strictEqual(evs(run(S, D + 31, [], { answered: 4, correct: 4 }), "days").length, 0);              // 4問は 数えない
  assert.strictEqual(evs(run(S, D + 31, [], { answered: 10, correct: 5 }), "days").length, 0);             // 5割も
  assert.strictEqual(S.pd, 5);
  const T = C.fresh(D); for (let d = 0; d < 4; d++) run(T, D + d, [], q);
  const r = run(T, D + 4, [], q); assert.deepStrictEqual(evs(r, "days").map(e => [e.n, e.gain]), [[5, 3]]); assert.strictEqual(gain(r), 1 + 3);
});
t("あそんだ日の +3 も 上限 10 の 中（あふれた分は 持ちこし）。バックアップの 文字には 入らない", () => {
  const S = C.fresh(D), q = { answered: 10, correct: 6 }; for (let d = 0; d < 4; d++) run(S, D + d, [], q);
  C.sync(S, D + 4); S.day.got = 9;
  const r = run(S, D + 4, [], q); assert.strictEqual(r.paid, 1); assert.strictEqual(r.deferred, 3); assert.strictEqual(S.day.got, 10);
  const L = C.fresh(D); C.hrMerge(L, C.hrParse(C.hrMake(S)), D + 4); assert.strictEqual(L.pd, 0);
});
t("100マス（m100Run）：どんぐりは 上限の 中・数える回で まなびっこの はじめの1たいと あそんだ日。0回なら なにも しない", () => {
  const S = C.fresh(D);
  let r = C.m100Run(S, D, 0, 0); assert.strictEqual(S.mk.w, 0); assert.strictEqual(S.pd, 0); assert.strictEqual(r.paid, 0);
  r = C.m100Run(S, D, 2, 2); assert.strictEqual(r.paid, 2); assert.strictEqual(S.mk.w, 1); assert.deepStrictEqual(S.mk.q, ["*"]); assert.strictEqual(r.mk.add, 1); assert.strictEqual(S.pd, 1);
  r = C.m100Run(S, D, 1, 1); assert.strictEqual(S.mk.q.length, 1); assert.strictEqual(S.pd, 1);             // 同じ日・2たいめは ない
  assert(C.mkPick(S, C.mkCands(S)[0].id, D)); S.ac.e += 3; assert(C.kzBuy(S, "h-ribbon"));                   // 100マスだけでも きせかえが 買える
  run(S, D, [], { answered: 10, correct: 10 }); assert.strictEqual(S.pd, 1);                                  // 単元と 100マスの 同じ日は 1日
  for (let d = 1; d <= 4; d++) r = C.m100Run(S, D + d, 1, 1);
  assert.strictEqual(S.pd, 5); assert.deepStrictEqual(evs(r, "days").map(e => e.gain), [3]); assert.strictEqual(r.paid, 4);
  S.day.got = 9; r = C.m100Run(S, D + 4, 3, 1); assert.strictEqual(r.paid, 1); assert.strictEqual(r.deferred, 2);
  r = C.m100Run(S, D + 2, 3, 3); assert(r.blocked); assert.strictEqual(r.paid, 0);                            // 時計もどし
});
t("きょうの1回め：1日1回・5問以上・6割以上で +1", () => {
  const S = C.fresh(D);
  assert.strictEqual(gain(run(S, D, [], { answered: 4, correct: 4 })), 0);
  assert.strictEqual(gain(run(S, D, [], { answered: 10, correct: 5 })), 0);
  assert.strictEqual(gain(run(S, D, [], { answered: 10, correct: 6 })), 1);
  assert.strictEqual(gain(run(S, D, [], { answered: 10, correct: 10 })), 0);
  assert.strictEqual(gain(run(S, D + 1, [], { answered: 10, correct: 10 })), 1);
});
t("先生のクイズ：3問以上で +2、1日1回", () => {
  const S = C.fresh(D);
  assert.strictEqual(gain(run(S, D, [], { quiz: true, answered: 2, correct: 2 })), 0);
  assert.strictEqual(gain(run(S, D, [], { quiz: true, answered: 3, correct: 0 })), 2);
  assert.strictEqual(gain(run(S, D, [], { quiz: true, answered: 4, correct: 0 })), 0);
  assert.strictEqual(gain(run(S, D + 1, [], { quiz: true, answered: 5, correct: 0 })), 2);
});
t("1日の上限 10：あふれた分は あしたに持ちこす。「また あした」は1日1回だけ", () => {
  const S = C.fresh(D), ids = C.UNIT_IDS.filter(i => i[0] === "m" && (i[1] === "3" || i[1] === "4")).slice(0, 14);
  run(S, D, ids.map(U), { grade: 4 });
  const r = run(S, D + 1, ids.map(U), { grade: 4 });       // できた 14こ×2＝28 ＋ 1回め 1 ＝ 29
  assert.strictEqual(C.CAP, 10);
  assert.strictEqual(r.paid, 10); assert.strictEqual(r.deferred, 19); assert.strictEqual(S.day.carry, 19); assert(r.capFirst);
  const r2 = run(S, D + 1, ids.map(U), { grade: 4 }); assert(!r2.capFirst); assert.strictEqual(r2.paid, 0);
  const before = S.ac.e; assert.strictEqual(before, 1 + 10);       // 1日目の「1回め」1こ＋2日目の上限 10
  C.sync(S, D + 2); assert.strictEqual(S.day.got, 10); assert.strictEqual(S.day.carry, 9); assert.strictEqual(S.ac.e, before + 10);
  C.sync(S, D + 3); assert.strictEqual(S.day.got, 9); assert.strictEqual(S.day.carry, 0); assert.strictEqual(S.ac.e, before + 19);
});
t("持ち越しが 10 を超えるときは、翌日 10 まで・のこりはさらに翌日", () => {
  const S = C.fresh(D); S.day.carry = 28;
  C.sync(S, D + 1); assert.strictEqual(S.day.got, 10); assert.strictEqual(S.day.carry, 18);
  const ctx = { paid: 0, deferred: 0 }; C.give(S, 3, ctx); assert.strictEqual(ctx.paid, 0);      // 今日はもう上限
  C.sync(S, D + 2); assert.strictEqual(S.day.got, 10); assert.strictEqual(S.day.carry, 11);      // 18 ＋ 上限で 持ちこした 3 − 10
});
t("同じ日に何度 sync しても持ちこしを二重に払わない", () => {
  const S = C.fresh(D); S.day.carry = 5; C.sync(S, D + 1); C.sync(S, D + 1); C.sync(S, D + 1);
  assert.strictEqual(S.ac.e, 5); assert.strictEqual(S.day.carry, 0);
});
t("日付の巻き戻し：最後に記録した日より前なら、どんぐりも段階も動かさない", () => {
  const S = C.fresh(D); run(S, D + 5, [U("m3-amari")]);
  const snap = JSON.stringify(S);
  const r = run(S, D + 1, [U("m3-amari")], { answered: 10, correct: 10, quiz: true }); assert(r.blocked);
  assert.strictEqual(JSON.stringify(S), snap);
  const r2 = run(S, D + 6, [U("m3-amari")]); assert(!r2.blocked); assert.strictEqual(C.stage(S, "m3-amari"), 2);
});
t("買う・置く・しまう：足りないと買えない／重ねて置けない", () => {
  const S = C.fresh(D); S.ac.e = 40;
  assert(C.buy(S, "tree")); assert(!C.buy(S, "tree")); assert(C.buy(S, "flower")); assert(!C.buy(S, "pond")); assert.strictEqual(C.balance(S), 25);
  assert(C.place(S, "tree", 3)); assert(!C.place(S, "flower", 3)); assert(C.place(S, "flower", 4)); assert(C.place(S, "tree", 5));
  assert(!C.place(S, "bench", 1)); assert(!C.place(S, "tree", 36)); assert(C.unplace(S, "tree")); assert(!C.unplace(S, "tree"));
  assert(C.place(S, "flower", 3));
});
t("完成：かざり7つそろえて全部置く。完成日を1回だけ記録。そのあと どんぐりは まだ買っていない きせかえが あるあいだだけ出る（v3.3）", () => {
  const S = C.fresh(D); S.ac.e = C.PRICE_TOTAL;
  C.DECOR.forEach((d, i) => { assert(C.buy(S, d.id)); assert(!C.checkDone(S, D + 9)); });
  C.DECOR.forEach((d, i) => C.place(S, d.id, i + 1));
  assert(C.checkDone(S, D + 9)); assert.strictEqual(S.done, D + 9); assert(!C.checkDone(S, D + 20)); assert.strictEqual(S.done, D + 9);
  assert.strictEqual(gain(run(S, D + 30, [], { answered: 10, correct: 10 })), 1);           // きせかえが のこっている
  S.kz.o = C.KZ.filter(k => k.price).map(k => k.id);
  assert.strictEqual(gain(run(S, D + 31, [], { answered: 10, correct: 10 })), 0);           // ぜんぶ 買ったら 出ない
});
t("clean：壊れた保存を直す", () => {
  const S = C.clean({ v: 1, d0: D, last: D, u: { "m3-amari": [9, 5, 5], "zzz": [3, 0, 0], "m3-div1": "x" }, ac: { e: 10, s: 99 }, own: ["tree", "tree", "ghost"], pl: { tree: 5, ghost: 2, flower: 5 } }, D);
  assert.strictEqual(C.stage(S, "m3-amari"), 3); assert.strictEqual(Object.keys(S.u).length, 1); assert.strictEqual(S.ac.s, 10);
  assert.deepStrictEqual(S.own, ["tree"]); assert.deepStrictEqual(S.pl, { tree: 5 });
  assert.strictEqual(C.clean(null, D).d0, D); assert.strictEqual(C.clean({ v: 2 }, D).d0, D);
});

/* ---- バックアップ ---- */
const sem3 = () => {       // 3年 1学期ぶん：3年の算数（数を 39単元に 固定。単元が ふえても 1学期に やる数は ふえない）＋ほかの学年 15単元
  const S = C.fresh(D), m3 = C.UNIT_IDS.filter(i => i[0] === "m" && i[1] === "3").slice(0, 39), others = C.UNIT_IDS.filter(i => i[0] === "m" && i[1] === "2").concat(C.UNIT_IDS.filter(i => i[0] === "m" && i[1] === "1")).slice(0, 15);
  run(S, D, [...m3, ...others].map(U)); run(S, D + 1, m3.map(U)); run(S, D + 2, m3.slice(0, 5).map(U));
  S.ac.e = 120; S.ac.s = 35; S.own = ["tree", "flower", "bench"]; S.pl = { tree: 2, flower: 7 };
  S.mk = C.mkFresh();      // まなびっこ（v3.0）の前の記録として HR1 を くらべる（まなびっこは 下の v3.0 の テスト）
  S.y = C.yaFresh(); S.kp = C.kpFresh();      // やりこみ（v3.4）・もらった物 の 前の記録（やりこみが あると HR4。下の HR4 の テスト）
  return S;
};
t("バックアップ：往復で同じ（変わった分だけ）", () => {
  const S = sem3(), str = C.hrMake(S), r = C.hrParse(str);
  assert(/^HR1/.test(str)); assert(r);
  assert.strictEqual(r.e, 120); assert.strictEqual(r.s, 35); assert.deepStrictEqual(r.own, ["tree", "flower", "bench"]); assert.deepStrictEqual(r.pl, { tree: 2, flower: 7 }); assert.strictEqual(r.d0, D);
  for (const id of C.UNIT_IDS) assert.strictEqual(r.u[id] || 0, C.stage(S, id));
  const T2 = C.hrMerge(C.fresh(D + 50), r, D + 50);
  for (const id of C.UNIT_IDS) assert.strictEqual(C.stage(T2, id), C.stage(S, id));
  assert.strictEqual(C.balance(T2), 85); assert.deepStrictEqual(T2.pl, S.pl); assert.strictEqual(T2.d0, D);
  assert(/^HR2/.test(C.hrMake(T2))); T2.mk = C.mkFresh();          // HR1 を読むと まなびっこの えらべる分が 計算されて HR2 になる（それを のぞけば 同じ）
  assert.strictEqual(C.hrMake(T2), C.hrMake(S));
});
t("バックアップ：3年1学期ぶんで 160字以下（区切りの - をふくむ）", () => { const s = C.hrMake(sem3()); assert(s.length <= 160, "長さ " + s.length); });
t("バックアップ：区切り・小文字・空白があっても読める", () => {
  const s = C.hrMake(sem3()); assert(C.hrParse(s.toLowerCase().replace(/-/g, " ")));
});
t("バックアップ：1文字でも変える・足りない・多いと拒否（改ざん拒否）", () => {
  const s = C.hrMake(sem3()).replace(/-/g, ""); let bad = 0;
  for (let i = 3; i < s.length - 3; i += 7) { const c = s[i] === "A" ? "B" : "A"; if (C.hrParse(s.slice(0, i) + c + s.slice(i + 1)) === null) bad++; else throw new Error("改ざんが通った " + i); }
  assert(bad > 5);
  assert.strictEqual(C.hrParse(s.slice(0, -1)), null); assert.strictEqual(C.hrParse(s + "0"), null); assert.strictEqual(C.hrParse(""), null); assert.strictEqual(C.hrParse(null), null);
  assert.strictEqual(C.hrParse("MH2" + s.slice(3)), null);
});
t("バックアップ：確認の数字が合っても、範囲がおかしい（持ち物より使った多い・段階0・重なった場所）物は拒否", () => {
  // 確認の数字を付け直して作った不正な文字（sum は collection.js と同じ式）
  const sum3 = tx => { let h = 7; for (const c of tx) h = (h * 31 + c.charCodeAt(0)) % 46656; return h.toString(36).toUpperCase().padStart(3, "0"); };
  const mk = body => "HR1" + body + sum3("HR1" + body);
  const hdr = (e, s, own, pl, n) => "000" + e.padStart(3, "0") + s.padStart(3, "0") + "000" + own + pl + n;
  assert(C.hrParse(mk(hdr("5", "3", "00", "0000000", "00"))));                      // 正しい形
  assert.strictEqual(C.hrParse(mk(hdr("3", "5", "00", "0000000", "00"))), null);    // 使った＞もらった
  assert.strictEqual(C.hrParse(mk(hdr("5", "3", "01", "1100000", "00"))), null);    // 持っていない物を置いた
  assert.strictEqual(C.hrParse(mk(hdr("5", "3", "03", "1100000", "00"))), null);    // 同じ場所
  assert(C.hrParse(mk(hdr("5", "3", "01", "Z000000", "00"))));                      // 場所の番号は 35（島の おける ばしょ）まで 読める
  assert.strictEqual(C.hrParse(mk(hdr("5", "3", "00", "0000000", "01") + "00")), null);      // 番号0・段階0
  assert.strictEqual(C.hrParse(mk(hdr("5", "3", "00", "0000000", "02") + "0504")), null);    // 同じ単元が2回
  if (C.UNIT_IDS.length <= 323) assert.strictEqual(C.hrParse(mk(hdr("5", "3", "00", "0000000", "01") + "ZZ")), null);      // 単元の番号が表の外（324こを こえたら ZZ＝323番は 表の中。3字は HR7 で 検査）
  assert.strictEqual(C.hrParse(mk(hdr("5", "3", "00", "0000000", "02") + "05")), null);      // 個数と合わない
});
t("バックアップ：読みこんでも記録は減らない（段階は大きいほう）／今日の上限は戻らない", () => {
  const S = sem3(); S.day.got = 20; S.day.carry = 7; S.day.n = D + 2;
  const mine = C.hrMake(S);
  const L = C.fresh(D + 2); run(L, D + 2, [U("m1-kazoeru")]); L.u["m3-amari"] = [3, 0, D]; L.ac.e = 200; L.ac.s = 190; L.own = ["pond"]; L.pl = { pond: 2 };
  L.day.got = 20; L.day.carry = 7;
  C.hrMerge(L, C.hrParse(mine), D + 2);
  assert.strictEqual(C.stage(L, "m3-amari"), 3);                                   // 大きいほうを残す
  for (const id of C.UNIT_IDS) assert(C.stage(L, id) >= C.stage(S, id));
  assert.strictEqual(L.ac.e, 200); assert.strictEqual(L.ac.s, 190);
  assert.deepStrictEqual([...L.own].sort(), ["bench", "flower", "pond", "tree"]);
  assert.strictEqual(L.pl.pond, 2); assert(L.pl.tree !== 2 || !L.pl.tree);         // 場所がぶつかるものは動かさない（pond を残す）
  assert.strictEqual(L.day.got, 20); assert.strictEqual(L.day.carry, 7);           // 今日の分は変わらない
  assert(C.balance(L) >= 0);
});
t("バックアップ：読みこみで「使った」が「もらった」を超えない（残りがマイナスにならない）", () => {
  const S = C.fresh(D); S.ac.e = 10; S.ac.s = 0;
  const r = { d0: D, e: 50, s: 50, done: 0, own: [], pl: {}, u: {} }, A = C.hrMerge(S, r, D); assert.strictEqual(C.balance(A), 0);
  const S2 = C.fresh(D); S2.ac.e = 100; S2.ac.s = 20;
  C.hrMerge(S2, { d0: D, e: 30, s: 30, done: 0, own: [], pl: {}, u: {} }, D); assert.strictEqual(S2.ac.e, 100); assert.strictEqual(S2.ac.s, 30);
});
t("バックアップ：読みこんだ端末で、はじめの5こをもう一度もらえない", () => {
  const A = sem3(), B = C.fresh(D + 9); C.hrMerge(B, C.hrParse(C.hrMake(A)), D + 9);
  assert.strictEqual(C.claimGift(B, D + 9), 0);
});
t("ひろばの完成日は 完成した端末の日を引きつぐ", () => {
  const S = C.fresh(D); S.ac.e = C.PRICE_TOTAL; C.DECOR.forEach((d, i) => { C.buy(S, d.id); C.place(S, d.id, i + 1); }); C.checkDone(S, D + 40);
  const B = C.hrMerge(C.fresh(D + 41), C.hrParse(C.hrMake(S)), D + 41); assert.strictEqual(B.done, D + 40);
});
t("dayNum：日付を日数に直す（同じ日は同じ値、翌日は +1）", () => {
  assert.strictEqual(C.dayNum(new Date(2026, 10, 12, 0, 1)), C.dayNum(new Date(2026, 10, 12, 23, 59)));
  assert.strictEqual(C.dayNum(new Date(2026, 10, 13, 0, 1)), C.dayNum(new Date(2026, 10, 12, 23, 59)) + 1);
});
/* ---------- v2：たんけんチケット・たんけんメモ・ひろばたんけんの地図 ---------- */
const m3 = C.UNIT_IDS.filter(i => i[0] === "m" && i[1] === "3");
const canN = (S, day, k, from = 0) => { const ids = m3.slice(from, from + k); run(S, day, ids.map(U)); return run(S, day + 1, ids.map(U)); };   // k この単元を「できた」に（2日つかう）
t("チケット：「できた」5つで1まい。4つではもらえない", () => {
  const S = C.fresh(D); const r = canN(S, D, 4); assert.strictEqual(S.tk.n, 0); assert.strictEqual(r.tickets, 0);
  const r2 = canN(S, D + 2, 1, 4); assert.strictEqual(S.tk.n, 1); assert.strictEqual(r2.tickets, 1); assert.strictEqual(S.tk.star, 0);
});
t("チケット：マスターも ★ になる。「みつけた」だけでは ★ にならない", () => {
  const S = C.fresh(D); run(S, D, [U(m3[0])]); assert.strictEqual(S.tk.star, 0);
  run(S, D + 1, [U(m3[0])]); assert.strictEqual(S.tk.star, 1);
  run(S, D + 2, [U(m3[0])]); assert.strictEqual(S.tk.star, 2);
});
t("チケット：持てるのは3まい。あふれた ★ は 5つで止めて、なくさない", () => {
  const S = C.fresh(D); S.tk.n = 3; S.tk.star = 4; S.tk.d = D; S.tk.got = 0;
  canN(S, D, 3);                                         // ★ が 4+3 → 5 で止まる（3まいなので まい数は増えない）
  assert.strictEqual(S.tk.n, 3); assert.strictEqual(S.tk.star, 5);
  C.tkRoll(S, D + 1); S.tk.got = 0; assert(C.tkUse(S, D + 1, 5));          // 1まい つかうと、とっておいた ★ が まいになる
  assert.strictEqual(S.tk.n, 3); assert.strictEqual(S.tk.star, 0);
});
t("チケット：1日に増えるのは2まいまで（のこりは ★ のまま あしたに）", () => {
  const S = C.fresh(D + 5); S.tk.star = 0; S.tk.n = 0; S.tk.got = 0; S.tk.d = D + 5; S.last = D + 5;
  S.tk.star = 5; C.tkRoll(S, D + 5); assert.strictEqual(S.tk.got, 1); assert.strictEqual(S.tk.n, 1);
  S.tk.star = 5; C.tkRoll(S, D + 5); assert.strictEqual(S.tk.got, 2); assert.strictEqual(S.tk.n, 2);
  S.tk.star = 5; C.tkRoll(S, D + 5); assert.strictEqual(S.tk.got, 2); assert.strictEqual(S.tk.n, 2); assert.strictEqual(S.tk.star, 5);   // 今日はここまで
  C.tkRoll(S, D + 6); assert.strictEqual(S.tk.got, 1); assert.strictEqual(S.tk.n, 3);                                                      // あした 1まい（3まいで止まる）
});
t("チケット：1日に つかえるのは 2回（先生が 0〜5）", () => {
  const S = C.fresh(D); S.tk.n = 3; S.tk.d = D;
  assert(C.tkUse(S, D, 2)); assert(C.tkUse(S, D, 2)); assert(!C.tkUse(S, D, 2)); assert.strictEqual(C.tkState(S, D, 2).why, "day");
  assert(C.tkUse(S, D + 1, 2)); assert.strictEqual(S.tk.n, 0); assert.strictEqual(C.tkState(S, D + 1, 2).why, "none");
  const T5 = C.fresh(D); T5.tk.n = 3; T5.tk.d = D; assert(C.tkUse(T5, D, 5)); assert(C.tkUse(T5, D, 5)); assert(C.tkUse(T5, D, 5));
  const T0 = C.fresh(D); T0.tk.n = 3; assert(!C.tkUse(T0, D, 0)); assert.strictEqual(T0.tk.n, 3); assert.strictEqual(C.tkState(T0, D, 0).why, "off");
});
t("チケット：端末のオフが勝つ・リンクと端末は小さいほう", () => {
  assert.strictEqual(C.tkLimit(undefined, undefined), 2); assert.strictEqual(C.tkLimit(3, undefined), 3); assert.strictEqual(C.tkLimit(undefined, 4), 2);
  assert.strictEqual(C.tkLimit(5, 1), 1); assert.strictEqual(C.tkLimit(0, 5), 0); assert.strictEqual(C.tkLimit(5, 0), 0); assert.strictEqual(C.tkLimit(99, 99), 5);
});
t("チケット：時計をもどしても つかえない／もどしても 1日の回数は戻らない", () => {
  const S = C.fresh(D + 3); S.last = D + 3; S.tk.n = 3; S.tk.d = D + 3;
  assert(C.tkUse(S, D + 3, 2)); assert(C.tkUse(S, D + 3, 2));
  assert(!C.tkUse(S, D + 1, 5)); assert.strictEqual(C.tkState(S, D + 1, 5).why, "back");
  assert.strictEqual(S.tk.used, 2);
});
t("チケット：たんけんの中（recordRun を通らない）では ★ は増えない／どんぐりも出ない", () => {
  const S = C.fresh(D); S.tk.n = 1; const e0 = S.ac.e, st = S.tk.star;
  assert(C.tkUse(S, D, 2)); const r = C.memoPick(S, { grade: 3, seed: 5 }); C.memoAdd(S, r.k, r.id);
  assert.strictEqual(S.tk.star, st); assert.strictEqual(S.ac.e, e0); assert.strictEqual(S.day.got, 0);
});
t("チケット：日付がもどっている recordRun では ★ を足さない", () => {
  const S = C.fresh(D + 9); S.last = D + 9; const r = run(S, D + 2, [U("m3-amari")]); assert(r.blocked); assert.strictEqual(S.tk.star, 0);
});
t("記録：古い mh_col（tk・mo・mu なし）も読める。こわれた値は捨てる", () => {
  const old = C.fresh(D); delete old.tk; delete old.mo; delete old.mu; old.u["m3-amari"] = [2, 0, D];
  const S = C.clean(JSON.parse(JSON.stringify(old)), D + 1); assert.strictEqual(S.tk.n, 0); assert.deepStrictEqual(S.mo, []); assert.strictEqual(C.stage(S, "m3-amari"), 2);
  const bad = C.clean({ ...old, tk: { n: 99, star: -3, d: "x", got: 9, used: 77 }, mo: ["tree", "zzz", "tree", 5], mu: ["m3-amari", "nope"] }, D);
  assert.strictEqual(bad.tk.n, 3); assert.strictEqual(bad.tk.star, 0); assert.strictEqual(bad.tk.got, 2); assert.strictEqual(bad.tk.used, 5);
  assert.deepStrictEqual(bad.mo, ["tree"]); assert.deepStrictEqual(bad.mu, ["m3-amari"]);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(C.clean(JSON.parse(JSON.stringify(bad)), D))), JSON.parse(JSON.stringify(bad)));      // 保存→読みこみで同じ
});
t("たんけんメモ：ひろばの物と単元をかわりばんこ／持っていない物から／ぜんぶ持てばくり返し", () => {
  const S = C.fresh(D); const got = [];
  for (let i = 0; i < 6; i++) { const r = C.memoPick(S, { grade: 3, seed: 100 + i }); assert(r.isNew); got.push(r.k); assert(C.memoAdd(S, r.k, r.id)); assert(!C.memoAdd(S, r.k, r.id)); }
  assert.deepStrictEqual(got, ["o", "u", "u", "u", "u", "u"]);            // 物は「がっこう」だけなので、2つ目からは 単元
  assert.strictEqual(C.memoCount(S), 6); assert(S.mu.every(id => C.uGrade(id) === 3));
  const A = C.fresh(D); A.mo = C.MEMO_O.slice(); A.mu = C.UNIT_IDS.slice();
  const r = C.memoPick(A, { grade: 3, seed: 9 }); assert(!r.isNew); assert.strictEqual(C.memoCount(A), C.memoTotal());
});
t("バックアップ：たんけんメモも往復する。メモが無ければ 古い形と同じ長さ。チケットは入らない", () => {
  const S = C.fresh(D); S.u["m3-amari"] = [2, 0, D]; S.tk.n = 3;
  const plain = C.hrMake(S); S.mo = ["school", "clock"]; S.mu = ["m3-amari", C.UNIT_IDS[115]];
  const withMemo = C.hrMake(S), r = C.hrParse(withMemo);
  assert.strictEqual(withMemo.replace(/-/g, "").length - plain.replace(/-/g, "").length, 4 + 4 * Math.ceil(C.UNIT_IDS.length / 20));
  assert.deepStrictEqual(r.mo.slice().sort(), ["clock", "school"]); assert.deepStrictEqual(r.mu.slice().sort(), ["m3-amari", C.UNIT_IDS[115]].sort());
  const L = C.fresh(D + 3); C.hrMerge(L, r, D + 3); assert.strictEqual(L.mo.length, 2); assert.strictEqual(L.mu.length, 2); assert.strictEqual(L.tk.n, 0);
  C.hrMerge(L, r, D + 3); assert.strictEqual(L.mo.length, 2);                                // くり返しても増えない
  assert.deepStrictEqual(C.hrParse(plain).mo, []);                                           // メモなし（古い形）も読める
  assert.strictEqual(C.hrParse(withMemo.slice(0, -4) + "ZZZZ"), null);                       // こわれた文字は弾く
});
t("バックアップ：メモの部分が中途半端な長さなら弾く", () => {
  const S = C.fresh(D); S.mo = ["tree"]; const s = C.hrMake(S).replace(/-/g, "");
  assert(C.hrParse(s)); assert.strictEqual(C.hrParse(s.slice(0, -4) + s.slice(-3)), null);
});
t("ひろばたんけんの地図：近道をぜんぶ閉じても遠まわりでゴールできる／ゴールの手前のとびらは かならず通る", () => {
  let loops = 0, maxD = 0;
  for (const n of [0, 4, 8, 16]) for (let seed = 1; seed <= 300; seed++) {
    const m = C.explorerMap(seed, n); assert(m, "seed " + seed); const g = m.grid;
    assert.strictEqual(g.length, 5); assert(g.every(r => r.length === 7));
    assert(m.long >= m.short + 2, `遠まわりが近道より長い seed ${seed}/${n}: ${m.short} ${m.long}`); assert(m.short >= 6 && m.long <= 30, `${m.short} ${m.long}`);
    assert.strictEqual(m.doors.filter(d => d.final).length, 1); assert(m.doors.length >= 4 && m.doors.length <= 6, "近道は最大5つ＋ゴール手前1つ"); assert.strictEqual(m.doors.filter(d => !d.final).length <= 5, true); assert.strictEqual(m.doors.find(d => d.final).q, 2, "ゴール手前のとびらは2問"); assert(m.doors.filter(d => !d.final).every(d => d.q === 1)); maxD = Math.max(maxD, m.doors.length - 1);
    const gx = m.goal[0], gy = m.goal[1], open = [[gx - 1, gy], [gx, gy + 1]].filter(([x, y]) => g[y] && g[y][x] !== undefined && g[y][x] !== 1);
    assert.strictEqual(open.length, 1); const F = m.doors.find(d => d.final); assert.deepStrictEqual(open[0], [F.x, F.y]); assert.strictEqual(g[F.y][F.x], 3);
    loops += m.loops;
  }
  assert(loops > 0); assert.strictEqual(maxD, 5, "近道が5つの地図もある");
});
t("ひろばたんけんの地図：ひろばの物が多いほど、かべがぬける（最大3）／同じ入力なら同じ地図", () => {
  const a = C.explorerMap(77, 0), b = C.explorerMap(77, 16);
  assert.deepStrictEqual(C.explorerMap(77, 5), C.explorerMap(77, 5));
  assert(b.loops - a.loops <= 3);
  let more = 0; for (let s = 1; s <= 100; s++) if (C.explorerMap(s, 16).loops > C.explorerMap(s, 0).loops) more++;
  assert(more > 30, "道が変わる：" + more);
});
/* ---------- v3.0：まなびっこ ---------- */
const OLD_HR1 = "HR11CA00-U00F0000-33000000-05023IAP-B7C20001-000001KW-00000000-00000000-00000000-00000000-00000000-000017I";   // v3.0 の前の版で作った文字
t("まなびっこ：表は4たい・番号は重ならない・絵がそろっている", () => {
  assert.deepStrictEqual(C.MK.map(c => c.id), C.MK_IDS); assert.strictEqual(new Set(C.MK_IDS).size, C.MK_IDS.length);
  assert.deepStrictEqual(C.MK.map(c => c.subj).sort(), ["e", "j", "m", "s"]); assert(C.MK.every(c => /^[a-z]+$/.test(c.art)));
  for (const c of C.MK) for (const st of C.MK_ART) for (const px of [128, 256]) assert(fs.existsSync(path.join(__dirname, "..", "vendor/img/manabikko", `${c.art}-${st}-v3-${px}.webp`)), c.art + st + px);
  assert.deepStrictEqual(C.MK_SOON, ["r"]);
});
t("まなびっこ：はじめの日、1回 れんしゅうすると かならず 1たい えらべる（候補は3つ）", () => {
  const S = C.fresh(D); assert.strictEqual(C.mkAvail(S), 0);
  const r0 = run(S, D, [], { answered: 4, correct: 4 }); assert.strictEqual(r0.mk.add, 0);          // 4問では まだ
  const r = run(S, D, [{ id: "m3-amari", n: 5, o: 1 }]); assert.strictEqual(r.mk.add, 1); assert.strictEqual(C.mkAvail(S), 1);   // 正解が少なくても もらえる
  const cs = C.mkCands(S); assert.strictEqual(cs.length, 3); assert.strictEqual(cs[0].id, "sankakuru");          // れんしゅうした教科の子が先
  assert(!C.mkPick(S, "nope", D)); const other = C.MK.find(c => !cs.includes(c)); assert(!C.mkPick(S, other.id, D));   // 候補の外は えらべない
  assert(C.mkPick(S, cs[1].id, D)); assert.strictEqual(C.mkAvail(S), 0); assert.strictEqual(C.mkStage(S, cs[1].id), 0); assert.deepStrictEqual(S.mk.sh, [cs[1].id]);
  assert.strictEqual(run(S, D + 1, [], { answered: 10, correct: 10 }).mk.add, 0);                     // はじめの1たいは 1回だけ
  const Q = C.fresh(D); assert.strictEqual(run(Q, D, [], { quiz: true, answered: 3, correct: 0 }).mk.add, 1);   // 先生の クイズは 3問
});
t("まなびっこ：単元が「できた」に なると 1たい えらべる。その教科の子が 先頭", () => {
  const S = C.fresh(D); const s4 = C.UNIT_IDS.find(i => i[0] === "s" && i[1] === "4"), m4 = C.UNIT_IDS.find(i => i[0] === "m" && i[1] === "4");
  run(S, D, [U(s4)], { grade: 4 }); assert.strictEqual(C.mkCands(S)[0].id, "chizupon"); C.mkPick(S, "chizupon", D);    // はじめの1たい（社会の子）
  assert.strictEqual(C.mkAvail(S), 0);
  const r1 = run(S, D + 1, [U(m4), U(s4)], { grade: 4 }); assert.strictEqual(r1.mk.add, 1);          // s4 が できた
  const r2 = run(S, D + 2, [U(m4)], { grade: 4 }); assert.strictEqual(r2.mk.add, 1);                 // m4 が できた
  assert.strictEqual(C.mkAvail(S), 2); assert.deepStrictEqual(S.mk.q, ["s", "m"]);
  const cs = C.mkCands(S); assert.strictEqual(cs.length, 3); assert(!cs.some(c => c.id === "chizupon"));   // 社会の子は もう なかま → ほかの教科で うめる
  assert(C.mkPick(S, "eimaru", D + 2)); assert.strictEqual(C.mkCands(S)[0].id, "sankakuru");                // つぎは 算数の「できた」の分
});
t("まなびっこ：2学年以上 下の単元の「できた」では ふえない／全員 なかまでも なくならず たまる", () => {
  const S = C.fresh(D); const m1 = C.UNIT_IDS.find(i => i[0] === "m" && i[1] === "1");
  run(S, D, [U(m1)], { grade: 5 }); assert.deepStrictEqual(S.mk.q, ["*"]);
  run(S, D + 1, [U(m1)], { grade: 5 }); assert.deepStrictEqual(S.mk.q, ["*"]);
  const A = C.fresh(D); C.MK.forEach(c => { A.mk.own[c.id] = { d: D, p: 0, ld: D, k: 0, v: 0 }; }); A.mk.w = 1;
  const m3a = m3.slice(0, 2); run(A, D, m3a.map(U)); run(A, D + 1, m3a.map(U));
  assert.strictEqual(C.mkAvail(A), 0); assert.deepStrictEqual(A.mk.q, ["m", "m"]); assert.deepStrictEqual(C.mkCands(A), []);
});
t("なかよし：べつの日の れんしゅうで 3段階。同じ日は 1回・ほかの教科・下の学年では ふえない・下がらない", () => {
  const S = C.fresh(D); run(S, D, [U(m3[0])]); assert(C.mkPick(S, "sankakuru", D));
  run(S, D, [U(m3[5])]); assert.strictEqual(S.mk.own.sankakuru.p, 0);                     // もらった日は ふえない
  run(S, D + 1, [{ id: "j3-kanji-yomi", n: 10, o: 10 }]); assert.strictEqual(S.mk.own.sankakuru.p, 0);   // 国語では ふえない
  const r1 = run(S, D + 1, [U(m3[5])]); assert.strictEqual(S.mk.own.sankakuru.p, 2);      // べつの日 +1、m3[5] が できた +1
  assert.deepStrictEqual(r1.mk.grow, []);
  run(S, D + 1, [U(m3[6])]); assert.strictEqual(S.mk.own.sankakuru.p, 2);                // 同じ日は もう ふえない
  run(S, D + 2, [{ id: m3[7], n: 4, o: 4 }]); assert.strictEqual(S.mk.own.sankakuru.p, 2);  // 5問 ないと ふえない
  const g = run(S, D + 3, [{ id: m3[8], n: 6, o: 2 }]); assert.strictEqual(S.mk.own.sankakuru.p, 3);   // 正解が少なくても れんしゅうした日は ふえる
  assert.deepStrictEqual(g.mk.grow, ["sankakuru"]); assert.strictEqual(C.mkStage(S, "sankakuru"), 1); assert.strictEqual(C.mkNext(S, "sankakuru").left, 5);
  const lowS = C.fresh(D); run(lowS, D, [U(m3[0])], { grade: 6 }); C.mkPick(lowS, "sankakuru", D); run(lowS, D + 1, [U(C.UNIT_IDS[0])], { grade: 6 }); assert.strictEqual(lowS.mk.own.sankakuru.p, 0);
  for (let d = 4; d < 12; d++) run(S, D + d, [{ id: m3[9], n: 5, o: 0 }]);
  assert.strictEqual(C.mkStage(S, "sankakuru"), 2); assert.deepStrictEqual(C.mkNext(S, "sankakuru"), { st: 2, p: S.mk.own.sankakuru.p, left: 0 });
  const p = S.mk.own.sankakuru.p; for (let d = 12; d < 40; d += 9) run(S, D + d, []); assert.strictEqual(S.mk.own.sankakuru.p, p);      // 休んでも 下がらない
  const snap = JSON.stringify(S.mk); run(S, D + 3, [U(m3[9])]); assert.strictEqual(JSON.stringify(S.mk), snap);   // 時計を もどしても ふえない
});
t("まなびっこ：ひろばに だすのは 3たいまで", () => {
  const S = C.fresh(D); C.MK.forEach(c => { S.mk.own[c.id] = { d: D, p: 0, ld: D, k: 0, v: 0 }; });
  assert(C.mkShow(S, "sankakuru")); assert(C.mkShow(S, "kotohane")); assert(C.mkShow(S, "chizupon")); assert(!C.mkShow(S, "eimaru"));
  assert(C.mkShow(S, "kotohane")); assert.deepStrictEqual(S.mk.sh, ["sankakuru", "chizupon"]); assert(C.mkShow(S, "eimaru"));
  const T0 = C.fresh(D); assert(!C.mkShow(T0, "eimaru"));
});
t("まなびっこ：古い mh_col（mk なし）は これまでの学びから えらべる分を 計算。保存し直しても ふえない", () => {
  const old = C.fresh(D); delete old.mk; old.u["m3-amari"] = [2, 0, D]; old.u["s4-kencho-th"] = [3, 0, D]; old.u["j3-kanji-yomi"] = [1, 0, D];
  const S = C.clean(JSON.parse(JSON.stringify(old)), D + 1);
  assert.deepStrictEqual(S.mk.q, ["*", "m", "s"]); assert.strictEqual(S.mk.w, 1); assert.strictEqual(S.mk.mg, 1); assert.strictEqual(C.mkAvail(S), 3);
  const again = C.clean(JSON.parse(JSON.stringify(S)), D + 2); assert.deepStrictEqual(again.mk, S.mk);
  const none = C.fresh(D); delete none.mk; const N = C.clean(JSON.parse(JSON.stringify(none)), D); assert.deepStrictEqual(N.mk.q, []); assert.strictEqual(N.mk.w, 0);
  const bad = C.clean({ ...C.fresh(D), mk: { w: 1, q: ["*", "x", 5, "m"], own: { sankakuru: { p: 99999, d: "x" }, ghost: { p: 1 } }, sh: ["ghost", "sankakuru", "sankakuru"] } }, D);
  assert.deepStrictEqual(bad.mk.q, ["*", "m"]); assert.deepStrictEqual(Object.keys(bad.mk.own), ["sankakuru"]); assert.strictEqual(bad.mk.own.sankakuru.p, 1295); assert.deepStrictEqual(bad.mk.sh, ["sankakuru"]);
});
const mkState = () => {
  const S = sem3(); S.mk.w = 1; S.mk.own.sankakuru = { d: D, p: 9, ld: D + 2, k: 0, v: 2 }; S.mk.own.kotohane = { d: D, p: 3, ld: D + 1, k: 0, v: 1 };
  S.mk.q = ["m", "m", "s"]; S.mk.sh = ["kotohane", "sankakuru"]; return S;
};
t("バックアップ HR2：まなびっこも 往復する（なかよし・えらべる分・ひろば）。のこりは HR1 と 同じ", () => {
  const S = mkState(), s = C.hrMake(S), r = C.hrParse(s);
  assert(/^HR2/.test(s)); assert(r && r.mk); assert.strictEqual(r.mk.w, 1);
  assert.deepStrictEqual(r.mk.own, { sankakuru: { p: 9, k: 0 }, kotohane: { p: 3, k: 0 } }); assert.deepStrictEqual(r.mk.q, ["m", "m", "s"]); assert.deepStrictEqual(r.mk.sh, ["kotohane", "sankakuru"]);
  const plain = sem3(); assert.deepStrictEqual({ ...C.hrParse(C.hrMake(plain)), mk: null }, { ...r, mk: null });
  assert(s.length <= C.hrMake(plain).length + 30, "長さ " + s.length);
  const T2 = C.hrMerge(C.fresh(D + 50), r, D + 50);
  assert.strictEqual(C.mkStage(T2, "sankakuru"), 2); assert.strictEqual(C.mkStage(T2, "kotohane"), 1); assert.deepStrictEqual(T2.mk.q, ["m", "m", "s"]); assert.deepStrictEqual(T2.mk.sh, ["kotohane", "sankakuru"]);
  assert.strictEqual(C.hrMake(T2), s);
  C.hrMerge(T2, r, D + 51); C.hrMerge(T2, C.hrParse(C.hrMake(T2)), D + 51);                // くり返し読みこんでも ふえない
  assert.deepStrictEqual(T2.mk.q, ["m", "m", "s"]); assert.strictEqual(Object.keys(T2.mk.own).length, 2); assert.strictEqual(C.hrMake(T2), s);
});
t("バックアップ HR2：1文字でも変えると拒否／こわれた まなびっこの部分も拒否", () => {
  const s = C.hrMake(mkState()).replace(/-/g, "");
  for (let i = 3; i < 30; i++) { const c = s[i] === "A" ? "B" : "A"; assert.strictEqual(C.hrParse(s.slice(0, i) + c + s.slice(i + 1)), null, "位置 " + i); }
  const sum3 = tx => { let h = 7; for (const c of tx) h = (h * 31 + c.charCodeAt(0)) % 46656; return h.toString(36).toUpperCase().padStart(3, "0"); };
  const core = C.hrMake(sem3()).replace(/-/g, "").slice(3, -3), mk = body => "HR2" + body + sum3("HR2" + body);
  assert(C.hrParse(mk("01" + "00" + "03" + "0" + "000000" + "0" + core)));                 // 正しい形（さんかくる なかよし3）
  assert.strictEqual(C.hrParse(mk("01" + "Z9" + "03" + "0" + "000000" + "0" + core)), null);  // 表に ない 番号
  assert.strictEqual(C.hrParse(mk("02" + "00030" + "00030" + "000000" + "0" + core)), null);   // 同じ子が 2回
  assert.strictEqual(C.hrParse(mk("01" + "00" + "03" + "2" + "000000" + "0" + core)), null);  // きらきらの しるしが おかしい
  assert.strictEqual(C.hrParse(mk("01" + "00" + "03" + "0" + "000000" + "1" + "01" + core)), null);   // もっていない子を ひろばに
  assert.strictEqual(C.hrParse(mk("21" + "00" + "03" + "0" + "000000" + "0" + core)), null);  // はじめの しるしが おかしい
  assert.strictEqual(C.hrParse(mk("00" + "Z00000" + "0" + core)), null);                      // えらべる分が 多すぎる
  assert.strictEqual(C.hrParse(mk("01")), null);                                               // 短すぎる
});
t("バックアップ：v3.0 の前の HR1 も 読める。合成した あとの 学びから えらべる分を 計算し、くり返しても ふえない", () => {
  const r = C.hrParse(OLD_HR1); assert(r); assert.strictEqual(r.mk, null);
  assert.strictEqual(r.e, 30); assert.deepStrictEqual(r.own, ["tree", "flower"]); assert.deepStrictEqual(r.mo, ["school"]); assert.strictEqual(r.u["s4-kencho-th"], 3);
  const L = C.fresh(D + 9); C.hrMerge(L, r, D + 9);
  assert.deepStrictEqual(L.mk.q.slice().sort(), ["*", "e", "m", "m", "s"]); assert.strictEqual(L.mk.w, 1); assert.strictEqual(C.mkAvail(L), 4);
  C.hrMerge(L, C.hrParse(OLD_HR1), D + 9); assert.strictEqual(L.mk.q.length, 5);
  const P = C.fresh(D + 9); run(P, D + 9, [U("m3-amari")]); C.mkPick(P, "sankakuru", D + 9);            // この端末で はじめの1たいを もう もらった
  C.hrMerge(P, C.hrParse(OLD_HR1), D + 9); assert(!P.mk.q.includes("*")); assert.deepStrictEqual(P.mk.q.slice().sort(), ["e", "m", "m", "s"]);
  assert.strictEqual(C.hrMake(C.fresh(D)).slice(0, 3), "HR1");                                           // まなびっこが 何もない記録は 今まで通り HR1
});
t("バックアップ：HR2 を 読むと、この端末の まだ えらんでいない はじめの1たいは 二重に ならない", () => {
  const A = mkState(); A.mk.q = []; const s = C.hrMake(A);
  const B = C.fresh(D + 9); run(B, D + 9, [U("m3-amari")]); assert.deepStrictEqual(B.mk.q, ["*"]);
  C.hrMerge(B, C.hrParse(s), D + 9); assert.deepStrictEqual(B.mk.q, []); assert.strictEqual(Object.keys(B.mk.own).length, 2);
  const B2 = C.fresh(D + 9); B2.mk.q = ["*"]; B2.mk.w = 1; const A2 = mkState(); A2.mk.q = ["*"]; A2.mk.own = {}; A2.mk.sh = [];
  C.hrMerge(B2, C.hrParse(C.hrMake(A2)), D + 9); assert.deepStrictEqual(B2.mk.q, ["*"]);      // 両方 まだ えらんでいない → 1つだけ
});
t("アバター（v3.1-a）：受けとる 値は ID の表と 段階 0〜2 だけ。ほかは 出さない", () => {
  assert.deepStrictEqual(C.mkWire("sankakuru", 2), { mk: "sankakuru", ms: 2 });
  assert.deepStrictEqual(C.mkWire("eimaru"), { mk: "eimaru", ms: 0 });
  for (const ms of [3, -1, 1.5, "2", null, NaN, Infinity]) assert.strictEqual(C.mkWire("kotohane", ms).ms, 0);    // 段階が おかしい → 0
  for (const id of ["", "nope", "__proto__", "constructor", "toString", 1, null, undefined, {}, ["sankakuru"], "sankakuru ", "<img src=x>", "x".repeat(99)]) assert.strictEqual(C.mkWire(id, 1), null);
});
t("アバター：自分の 子は もっている子だけ。きめていなければ ひろばの 1ばんめ。空の文字は なし。もっていなければ なし", () => {
  const S = mkState();
  assert.deepStrictEqual(C.mkAvatar(S), { mk: "kotohane", ms: 1 });             // ひろばの 1ばんめ
  assert.deepStrictEqual(C.mkAvatar(S, "sankakuru"), { mk: "sankakuru", ms: 2 });
  assert.deepStrictEqual(C.mkAvatar(S, "eimaru"), { mk: "kotohane", ms: 1 });   // もっていない子は えらべない
  assert.strictEqual(C.mkAvatar(S, ""), null);
  S.mk.sh = []; assert.strictEqual(C.mkAvatar(S).mk, "sankakuru");               // ひろばに いなければ 表の じゅん
  assert.strictEqual(C.mkAvatar(C.fresh(D)), null); assert.strictEqual(C.mkAvatar(null), null);
});
/* ---------- v3.3：きせかえ（Qalc 合体 段階4。どんぐりで 買う・学びで もらう） ---------- */
const kzState = () => { const S = mkState(); S.ac.e = 200; S.ac.s = 0; return S; };
t("きせかえ：品の表（ぼうし12・もちもの8・はいけい8・しょうごう18：うち6つは やりこみの じっせきで もらう）。ID は ちがう・値段は 1〜20（上限 10 の 2日ぶんまで）・絵文字は Unicode 12 まで", () => {
  const by = sl => C.KZ.filter(k => k.s === sl).length;
  assert.deepStrictEqual([by("h"), by("p"), by("b"), by("t")], [12, 8, 8, 18]);
  assert.strictEqual(new Set(C.KZ_IDS).size, C.KZ_IDS.length);
  assert(C.KZ_IDS.length <= 1294, "番号＋1 が 2字に 入る");
  for (const k of C.KZ) {
    assert(/^[hpbt]-[a-z0-9]+$/.test(k.id) && k.id.length <= 16 && k.id[0] === k.s, k.id);
    assert(!!k.price !== !!k.un, k.id + "：買う物か もらう物の どちらか");
    if (k.price) assert(Number.isInteger(k.price) && k.price >= 1 && k.price <= C.CAP * 2, k.id);
    if (k.un) assert((["can", "mst", "nk"].includes(k.un[0]) && Number.isInteger(k.un[1])) || (k.un[0] === "ach" && C.YA_ACH.some(a => a.id === k.un[1])), k.id);
    if (k.s === "b") assert(Array.isArray(k.bg) && k.bg.length >= 2 && k.bg.every(c => /^#[0-9a-f]{6}$/.test(c)), k.id);
    for (const ch of k.ch) { const cp = ch.codePointAt(0); assert(cp < 0x1FA70 || cp === 0xFE0F, k.id + " " + cp.toString(16)); }   // 1FA70〜（Unicode 12 の後半〜）は つかわない
  }
  const cheap = C.KZ.filter(k => k.price && k.price <= 5).length, mid = C.KZ.filter(k => k.price > 5 && k.price <= 8).length;
  assert(cheap >= 8 && mid >= 8, "はじめの 1つが 1〜2日で 買える 値段が 多い");
  assert(C.KZ.filter(k => k.un).length >= 8, "買わなくても もらえる物が ある");
  assert(Math.min(...C.KZ.filter(k => k.price).map(k => k.price)) <= C.GIFT, "はじめの 5こで 1つ 買える");
});
t("きせかえ：買う（どんぐりが へる・二重に 買えない・足りないと 買えない・もらう物は 買えない・まなびっこが いないと 買えない）", () => {
  const S = kzState();
  assert(C.kzBuy(S, "h-ribbon")); assert.strictEqual(C.balance(S), 197); assert(!C.kzBuy(S, "h-ribbon")); assert.strictEqual(C.balance(S), 197);
  assert(!C.kzBuy(S, "h-sprout")); assert(!C.kzBuy(S, "nope")); assert(!C.kzBuy(S, "__proto__"));
  S.ac.s = S.ac.e - 14; assert(!C.kzBuy(S, "h-crown")); S.ac.s--; assert(C.kzBuy(S, "h-crown")); assert.strictEqual(C.balance(S), 0);
  const F = C.fresh(D); F.ac.e = 50; assert(!C.kzBuy(F, "h-ribbon"));
  assert(C.kzHas(S, "h-crown")); assert(!C.kzHas(S, "h-cap"));
});
t("きせかえ：学びで もらう物（できた・マスター・なかよし）。条件を こえると もっている。下がらない", () => {
  const S = kzState(), sm = C.summary(S);
  assert(C.kzHas(S, "t-ippo"));                                                   // まなびっこが いれば はじめから
  assert.strictEqual(C.kzHas(S, "h-sprout"), sm.can >= 1);
  assert.strictEqual(C.kzHas(S, "t-owl"), sm.master >= 1);
  assert(C.kzHas(S, "p-bag") && C.kzHas(S, "t-friend") && C.kzHas(S, "b-stars"));  // さんかくるが いっしょに まなぶ（p=9）
  const F = C.fresh(D); assert(!C.kzHas(F, "t-ippo"));                            // まなびっこが いなければ まだ
  F.mk.own.eimaru = { d: D, p: 0, ld: D, k: 0, v: 0 }; assert(C.kzHas(F, "t-ippo")); assert(!C.kzHas(F, "h-sprout")); assert(!C.kzHas(F, "p-bag"));
  F.u["m3-amari"] = [2, D, D]; assert(C.kzHas(F, "h-sprout")); assert(!C.kzHas(F, "t-owl"));
  F.mk.own.eimaru.p = 3; assert(C.kzHas(F, "p-bag")); assert(!C.kzHas(F, "b-stars"));
});
t("きせかえ：つける・はずす・つけかえる（その場所の物で、もっている物だけ。もっていない子には つけない）", () => {
  const S = kzState(); C.kzBuy(S, "h-ribbon"); C.kzBuy(S, "h-cap"); C.kzBuy(S, "b-sea");
  assert(C.kzWear(S, "sankakuru", "h", "h-ribbon")); assert.deepStrictEqual(C.kzOf(S, "sankakuru"), { h: "h-ribbon" });
  assert(C.kzWear(S, "sankakuru", "h", "h-cap")); assert.deepStrictEqual(C.kzOf(S, "sankakuru"), { h: "h-cap" });
  assert(C.kzWear(S, "kotohane", "h", "h-cap")); assert.strictEqual(C.kzOf(S, "kotohane").h, "h-cap");   // 同じ物を べつの子にも
  assert(!C.kzWear(S, "sankakuru", "h", "h-crown"), "もっていない"); assert(!C.kzWear(S, "sankakuru", "p", "h-ribbon"), "場所が ちがう");
  assert(!C.kzWear(S, "eimaru", "h", "h-cap"), "まだ なかまでない子"); assert(!C.kzWear(S, "__proto__", "h", "h-cap")); assert(!C.kzWear(S, "sankakuru", "x", "h-cap"));
  assert(C.kzWear(S, "sankakuru", "b", "b-sea")); assert(C.kzWear(S, "sankakuru", "t", "t-ippo"));
  assert.deepStrictEqual(C.kzOf(S, "sankakuru"), { h: "h-cap", b: "b-sea", t: "t-ippo" });
  assert(C.kzWear(S, "sankakuru", "h", "h-cap")); assert(!("h" in C.kzOf(S, "sankakuru")), "同じ物で はずす");
  assert(C.kzWear(S, "sankakuru", "b", "")); assert(C.kzWear(S, "sankakuru", "t", "")); assert(!S.kz.e.sankakuru);
  S.kz.e.kotohane.h = "h-crown"; assert.deepStrictEqual(C.kzOf(S, "kotohane"), {}, "もっていない物は 出さない");
});
t("きせかえ：clean（古い記録は 空・こわれた値は すてる・もっていない子や 場所ちがいは すてる）。買った物は 消えない", () => {
  const S = kzState(); C.kzBuy(S, "h-ribbon"); C.kzWear(S, "sankakuru", "h", "h-ribbon");
  const R = C.clean(JSON.parse(JSON.stringify(S)), D + 3);
  assert.deepStrictEqual(R.kz.o, ["h-ribbon"]); assert.deepStrictEqual(R.kz.e, { sankakuru: { h: "h-ribbon" } }); assert.strictEqual(C.balance(R), C.balance(S));
  const old = JSON.parse(JSON.stringify(S)); delete old.kz; assert.deepStrictEqual(C.clean(old, D + 3).kz, { o: [], e: {} });
  const bad = JSON.parse(JSON.stringify(S)); bad.kz = { o: ["h-ribbon", "h-ribbon", "t-ippo", "zz", 5, "__proto__"], e: { sankakuru: { h: "p-book", p: "p-book", b: 3 }, eimaru: { h: "h-cap" }, constructor: { h: "h-cap" }, kotohane: "x" } };
  const B = C.clean(bad, D + 3); assert.deepStrictEqual(B.kz.o, ["h-ribbon"]); assert.deepStrictEqual(B.kz.e, { sankakuru: { p: "p-book" } });
  assert.deepStrictEqual(C.clean(Object.assign(JSON.parse(JSON.stringify(S)), { kz: "x" }), D).kz, { o: [], e: {} });
});
t("きせかえ：友だち対戦で 送る ぼうしは 表の ぼうしだけ（ほかの場所の物・文字は 付けない）。アバターに つけている ぼうし", () => {
  assert.deepStrictEqual(C.mkWire("sankakuru", 1, "h-crown"), { mk: "sankakuru", ms: 1, mh: "h-crown" });
  for (const mh of ["p-book", "t-ippo", "b-sea", "nope", "__proto__", "<b>", 1, null, {}, ["h-cap"], "h-cap ", "h".repeat(40)]) assert.deepStrictEqual(C.mkWire("sankakuru", 1, mh), { mk: "sankakuru", ms: 1 });
  assert.strictEqual(C.mkWire("nope", 1, "h-cap"), null);
  const S = kzState(); C.kzBuy(S, "h-cap"); C.kzWear(S, "kotohane", "h", "h-cap"); C.kzBuy(S, "p-book"); C.kzWear(S, "kotohane", "p", "p-book");
  assert.deepStrictEqual(C.mkAvatar(S), { mk: "kotohane", ms: 1, mh: "h-cap" });   // もちもの・はいけい・しょうごうは 送らない
  assert.deepStrictEqual(C.mkAvatar(S, "sankakuru"), { mk: "sankakuru", ms: 2 });
});
t("きせかえ：バックアップ HR3 で 往復（買った物・つけている物）。きせかえが なければ 今まで通り HR2／HR1", () => {
  const S = kzState(); assert(/^HR2/.test(C.hrMake(S)));
  C.kzBuy(S, "h-ribbon"); C.kzBuy(S, "b-rainbow"); C.kzBuy(S, "t-star"); C.kzWear(S, "sankakuru", "h", "h-ribbon"); C.kzWear(S, "kotohane", "b", "b-rainbow"); C.kzWear(S, "kotohane", "t", "t-ippo");
  const s = C.hrMake(S), r = C.hrParse(s);
  assert(/^HR3/.test(s)); assert(r && r.kz && r.mk);
  assert.deepStrictEqual(r.kz.o.slice().sort(), ["b-rainbow", "h-ribbon", "t-star"]); assert.deepStrictEqual(r.kz.e, { sankakuru: { h: "h-ribbon" }, kotohane: { b: "b-rainbow", t: "t-ippo" } });
  const B = C.hrMerge(C.fresh(D + 9), r, D + 9);
  assert.deepStrictEqual(B.kz.o.slice().sort(), ["b-rainbow", "h-ribbon", "t-star"]); assert.deepStrictEqual(C.kzOf(B, "sankakuru"), { h: "h-ribbon" }); assert.strictEqual(C.balance(B), C.balance(S));
  C.hrMerge(B, C.hrParse(s), D + 9); assert.strictEqual(B.kz.o.length, 3); assert.strictEqual(C.balance(B), C.balance(S));        // くり返しても ふえない・へらない
  const L = kzState(); C.kzBuy(L, "h-cap"); C.kzWear(L, "sankakuru", "h", "h-cap"); C.hrMerge(L, r, D + 9);
  assert.strictEqual(C.kzOf(L, "sankakuru").h, "h-cap", "この端末で つけている物は そのまま"); assert(L.kz.o.includes("h-ribbon") && L.kz.o.includes("h-cap"));
  const W = C.fresh(D); W.ac.e = 9; W.kz.o = ["h-leaf"]; const rw = C.hrParse(C.hrMake(W)); assert(rw && rw.mk && !Object.keys(rw.mk.own).length && rw.kz.o[0] === "h-leaf");   // まなびっこが いなくても 読める
});
t("きせかえ：HR3 の こわれた文字は 断る（1字かえる・表に ない番号・場所ちがい・もっていない子）。HR1／HR2 は これからも 読める", () => {
  const S = kzState(); C.kzBuy(S, "h-ribbon"); C.kzWear(S, "sankakuru", "h", "h-ribbon");
  const s = C.hrMake(S).replace(/-/g, ""), body = s.slice(3, -3);
  const sum3 = tx => { let h = 7; for (const c of tx) h = (h * 31 + c.charCodeAt(0)) % 46656; return h.toString(36).toUpperCase().padStart(3, "0"); };
  const mk = b => "HR3" + b + sum3("HR3" + b);
  assert(C.hrParse(mk(body)));
  assert.strictEqual(C.hrParse(s.slice(0, 10) + (s[10] === "A" ? "B" : "A") + s.slice(11)), null);
  const kzLen = 1 + 4 * 2 + 1 + 10, rest = body.slice(kzLen);
  assert.strictEqual(body.slice(0, kzLen), "2" + "0001" + "0000" + "1" + "00" + "01" + "00" + "00" + "00");
  assert.strictEqual(C.hrParse(mk("2" + "0001" + "0000" + "1" + "00" + "0D" + "00" + "00" + "00" + rest)), null);   // ぼうしの場所に もちもの（p-pencil＝13番）
  assert.strictEqual(C.hrParse(mk("2" + "0001" + "0000" + "1" + "00" + "ZZ" + "00" + "00" + "00" + rest)), null);   // 表に ない番号
  assert.strictEqual(C.hrParse(mk("2" + "0001" + "0000" + "1" + "03" + "01" + "00" + "00" + "00" + rest)), null);   // もっていない子（えいまる）
  assert.strictEqual(C.hrParse(mk("2" + "00SG" + "0000" + "0" + rest)), null);                                       // もらう物（h-sprout）は 買った物に 入らない
  assert.strictEqual(C.hrParse(mk("9" + "0001" + rest)), null);                                                      // かたまりの数が おかしい
  assert.strictEqual(C.hrParse(mk("2" + "0001")), null);                                                             // 短すぎる
  assert(C.hrParse(OLD_HR1)); assert(/^HR2/.test(C.hrMake(mkState())) && C.hrParse(C.hrMake(mkState())).kz === null);
});
t("きせかえ：値段の すじみち（はじめの 5こ＋1日1〜3こで、1〜2日めに 1つ・1週間で 数こ）", () => {
  const prices = C.KZ.filter(k => k.price).map(k => k.price).sort((a, b) => a - b);
  assert(prices[0] <= C.GIFT);                                           // 1日め：はじめの 5こで 1つ
  const week = C.GIFT + 7 * 2; let n = 0, m = week; for (const p of prices) if (p <= m) { m -= p; n++; }
  assert(n >= 3 && n <= 7, "1日 2こなら 1週間で 3〜7こ（" + n + "）");
  assert(C.KZ_PRICE_TOTAL >= 150 && C.KZ_PRICE_TOTAL <= 300, "ぜんぶで " + C.KZ_PRICE_TOTAL);
});
/* やりこみ（v3.4）：日を またがない。やれば やるほど その日の うちに 進む */
t("やりこみ：単元の ランクは ★から きまる（★1つ→1・いつもの★2→2・いつもの★3→3・★9こ→4）。シールの きまりは もう 使わない", () => {
  const S = C.fresh(D), id = "m3-amari";
  assert.strictEqual(C.yaRank(S, id), 0);
  for (let i = 0; i < 12; i++) run(S, D, [{ id, n: 10, o: 10 }]);
  assert.strictEqual(C.yaRank(S, id), 0, "正解・ノーミスを かさねても ★が なければ 0（前の シールの きまりでは にじ）");
  assert.strictEqual(C.stSync(S, { [id]: [0, 1, 0] }), true); assert.strictEqual(C.yaRank(S, id), 1, "タイムアタックの ★だけでも 1");
  C.stSync(S, { [id]: [2, 0, 0] }); assert.strictEqual(C.yaRank(S, id), 2); assert.deepStrictEqual(C.stOf(S, id), [2, 1, 0], "大きいほうを のこす");
  C.stSync(S, { [id]: [3, 3, 2] }); assert.strictEqual(C.yaRank(S, id), 3, "いつものの ★3で 3");
  assert.strictEqual(C.stSync(S, { [id]: [1, 1, 3] }), true); assert.strictEqual(C.yaRank(S, id), 4, "★9こで 4"); assert.deepStrictEqual(C.yaNeed(S, id), { r: 4 });
  assert.strictEqual(C.stSync(S, { [id]: [1, 0, 0] }), false, "へらない・ふえなければ false"); assert.strictEqual(C.stSum(S), 9); assert.strictEqual(C.stSum(S, "j"), 0);
});
t("やりこみ：★の きろくは 保存して 読める・こわれた ★は すてる・★に まとめる 前の 記録の シールの ランクは のこる（1回だけ）", () => {
  const S = C.fresh(D), id = "m3-amari";
  C.stSync(S, { [id]: [9, -1, "x"], nope: [3, 3, 3], "j3-kanji-yomi": "bad" }); assert.deepStrictEqual(S.st, { [id]: [3, 0, 0] });
  const S2 = C.clean(JSON.parse(JSON.stringify(S)), D); assert.deepStrictEqual(S2.st, { [id]: [3, 0, 0] }); assert.strictEqual(C.yaRank(S2, id), 3);
  const old = JSON.parse(JSON.stringify(C.fresh(D))); delete old.st; delete old.kp; old.y.u["m3-wari99"] = [120, 3, 1, 1]; old.y.u[id] = [35, 0, 1, 1];
  const O = C.clean(old, D); assert.strictEqual(C.yaRank(O, "m3-wari99"), 4, "前に にじだった 単元は 4の まま"); assert.strictEqual(C.yaRank(O, id), 2);
  const O2 = C.clean(JSON.parse(JSON.stringify(O)), D); run(O2, D, [{ id: "m3-man", n: 10, o: 10 }]);
  assert.strictEqual(C.yaRank(C.clean(JSON.parse(JSON.stringify(O2)), D), "m3-man"), 0, "新しい 記録では シールの きまりで ランクは 上がらない");
});
t("やりこみ：2学年いじょう 下の 単元は 合計に 数えない・単元の ない ゲームは 正解の 合計だけ", () => {
  const S = C.fresh(D);
  run(S, D, [{ id: "m1-add10", n: 10, o: 10 }], { grade: 3 });
  assert.strictEqual(S.y.c, 0); assert.strictEqual(S.y.nm, 0);
  run(S, D, [{ id: "m2-kuku-low", n: 10, o: 10 }], { grade: 3 });
  assert.strictEqual(S.y.c, 10); assert.strictEqual(S.y.s.m, 10); assert.strictEqual(S.y.nm, 1);
  C.recordRun(S, { today: D, grade: 3, units: [], answered: 20, correct: 18 }); assert.strictEqual(S.y.c, 28);
  C.recordRun(S, { today: D, grade: 3, units: [], answered: 5, correct: 99 }); assert.strictEqual(S.y.c, 33, "正解は 答えた数まで");
  run(S, D, [{ id: "m3-amari", n: 5, o: 5 }, { id: "j3-kanji-yomi", n: 5, o: 4 }, { id: "s4-kencho-th", n: 5, o: 3 }], { grade: 3 });
  assert.strictEqual(S.y.mx, 1, "1回で 3教科");
});
t("やりこみ：じっせきは 数が たまると その場で たっせい（下がらない）・かくしは たっせいまで 名前を 出さない", () => {
  const S = C.fresh(D);
  assert.deepStrictEqual(C.yaCheck(S, {}), []);
  for (let i = 0; i < 10; i++) run(S, D, [{ id: "m3-amari", n: 10, o: 10 }]);
  const got = C.yaCheck(S, {});
  assert(got.includes("c100") && got.includes("nm1") && got.includes("nm10"), JSON.stringify(got));
  assert.deepStrictEqual(C.yaCheck(S, {}), [], "二度は 出ない");
  const L = C.yaList(S, {}), c3 = L.find(a => a.id === "c300"), cx = L.find(a => a.id === "c10000");
  assert.strictEqual(c3.v, 100); assert.strictEqual(c3.done, false); assert.strictEqual(cx.hide, true);
  const x = { m100n: 12, m100best: 58000, mtStars: 33, mtMax: 33 };
  const g2 = C.yaCheck(S, x); for (const id of ["m100n1", "m100n10", "m100t120", "m100t60", "mt10", "mtall"]) assert(g2.includes(id), id);
  assert.strictEqual(new Set(C.YA_ACH.map(a => a.id)).size, C.YA_ACH.length); assert(C.YA_ACH.length >= 30);
});
t("やりこみ：じっせきで もらう しょうごうは たっせいしたら つけられる・こわれた 記録は 作りなおす・古い 記録には y が なくても 読める", () => {
  const S = C.fresh(D); S.mk.own.sankakuru = { d: D, p: 0, ld: D, k: 0, v: 0 };
  assert.strictEqual(C.kzHas(S, "t-yac1000"), false);
  S.y.c = 1000; C.yaCheck(S, {}); assert.strictEqual(C.kzHas(S, "t-yac1000"), true);
  assert(C.kzWear(S, "sankakuru", "t", "t-yac1000"));
  const S2 = C.clean(JSON.parse(JSON.stringify(S)), D); assert.strictEqual(S2.y.c, 1000); assert(S2.y.a.includes("c1000"));
  const bad = C.clean({ ...JSON.parse(JSON.stringify(S)), y: { c: -5, s: { m: "x", zz: 4 }, u: { nope: [1], "m3-amari": [1e12, "a", 1, 0] }, a: ["c1000", "nope", "c1000"] } }, D);
  assert.strictEqual(bad.y.c, 0); assert.deepStrictEqual(bad.y.s, { m: 0 }); assert.deepStrictEqual(Object.keys(bad.y.u), ["m3-amari"]); assert.deepStrictEqual(bad.y.a, ["c1000"]);
  const old = JSON.parse(JSON.stringify(S)); delete old.y; assert.deepStrictEqual(C.clean(old, D).y, C.yaFresh());
});
t("やりこみ：まなびっこの きらきらは その教科の 正解 500・いつものの ★3の 単元 5つで（同じ日でも）", () => {
  const S = C.fresh(D); S.mk.own.sankakuru = { d: D, p: 0, ld: D, k: 0, v: 0 };
  const ids = ["m3-amari", "m3-wari99", "m3-add-hissan", "m3-sub-hissan", "m3-man"];
  for (const id of ids) { run(S, D, [{ id, n: 10, o: 7 }]); run(S, D, [{ id, n: 30, o: 28 }]); run(S, D, [{ id, n: 10, o: 10 }]); }
  assert.strictEqual(C.yaRankCount(S, 3, "m"), 0, "★が なければ 数えない");
  C.stSync(S, Object.fromEntries(ids.map(id => [id, [3, 0, 0]])));
  assert.strictEqual(C.yaRankCount(S, 3, "m"), 5);
  assert(!S.mk.own.sankakuru.k, "正解が まだ 500 に たりない");
  let r = null; for (let i = 0; i < 40 && !S.mk.own.sankakuru.k; i++) r = run(S, D, [{ id: "m3-amari", n: 10, o: 10 }]);
  assert.strictEqual(S.mk.own.sankakuru.k, 1); assert.deepStrictEqual(r.ya.kira, ["sankakuru"]); assert(S.y.s.m >= 500);
  assert(C.yaCheck(S, {}).includes("kira1"));
});
/* ---- HR4（やりこみ・もらった物も 入る。新しい住所への おひっこしの 予備） ---- */
const yaState = () => {      // 3年 1学期ぶん ＋ やりこみ（シール・じっせき）＋ 前の 基準で もらった物
  const S = C.fresh(D), m3 = C.UNIT_IDS.filter(i => i[0] === "m" && i[1] === "3").slice(0, 39);
  run(S, D, m3.map(U)); run(S, D + 1, m3.map(U)); run(S, D + 2, m3.slice(0, 5).map(id => ({ id, n: 10, o: 10 })));
  S.ac.e = 90; S.ac.s = 10; S.y.a.push("mt10", "m100n1");
  S.kp.r["m3-amari"] = 4; S.kp.z.push("t-yam100"); S.kp.p.push(C.PARTS[C.PARTS.length - 1].id);      // いまの 記録からは 計算できない（前の 基準で もらった）物
  C.keepUp(S); return S;
};
t("バックアップ HR7：324番め より 後ろの 単元を 持つと 1つ 3字で 書き、往復する（それ以外は 今まで通り）", () => {
  const S = C.fresh(D); run(S, D, [U("m1-kazoeru")]);
  assert(!/^HR7/.test(C.hrMake(S)), "後ろの 単元が なければ HR7 に しない");
  const big = C.UNIT_IDS.slice(324);
  if (!big.length) return;
  big.forEach(id => { S.u[id] = [2, 0, D]; });
  const s = C.hrMake(S), r = C.hrParse(s);
  assert(/^HR7/.test(s), s.slice(0, 4)); assert(r, "読めない");
  const B = C.hrMerge(C.fresh(D + 1), r, D + 1);
  for (const id of C.UNIT_IDS) assert.strictEqual(C.stage(B, id), C.stage(S, id), id);
  assert.strictEqual(C.hrParse(s.replace(/^HR7/, "HR5")), null, "HR5 として 読ませると 断る");
});
t("バックアップ HR6 の 中に HR7：素体・追加の かざり・324番め より 後ろの 単元が そろっても 全部 もどる", () => {
  const big = C.UNIT_IDS.slice(324); if (!big.length) return;
  const S = C.fresh(D); S.ac.e = 900; ["tree", "castle"].forEach(id => assert(C.buy(S, id))); assert(C.place(S, "castle", 35));
  const id = C.SB_IDS[0]; S.sb.o.push(id); S.sb.c = id;
  big.forEach(u => { S.u[u] = [3, 0, D]; });
  const code = C.hrMake(S); assert(/^HR6/.test(code)); assert.strictEqual(code.replace(/-/g, "").slice(16, 19), "HR7");
  const r = C.hrParse(code); assert(r); assert.deepStrictEqual(r.pl, { castle: 35 }); assert.strictEqual(r.sb.c, id);
  const B = C.hrMerge(C.fresh(D + 1), r, D + 1); big.forEach(u => assert.strictEqual(C.stage(B, u), 3, u));
});
t("バックアップ HR4：やりこみ（正解・ノーミス・シールの しるし・じっせき）と もらった物（ランク・きせかえ・遊具）が 往復する", () => {
  const S = yaState(), s = C.hrMake(S), r = C.hrParse(s);
  assert(/^HR4/.test(s), s.slice(0, 4)); assert(r && r.y && r.kp && r.mk && r.kz);
  assert.deepStrictEqual(r.y, { ...S.y, a: C.YA_BK.filter(id => S.y.a.includes(id)) });
  const B = C.hrMerge(C.fresh(D + 9), r, D + 9);
  assert.deepStrictEqual(B.y.u, S.y.u); assert.strictEqual(B.y.c, S.y.c); assert.strictEqual(B.y.nm, S.y.nm);
  for (const id of S.y.a) assert(B.y.a.includes(id), id);
  for (const id in S.kp.r) assert(B.kp.r[id] >= S.kp.r[id], id);
  for (const id of S.kp.z) assert(B.kp.z.includes(id), id);
  for (const id of S.kp.p) assert(B.kp.p.includes(id), id);
  for (const id of C.UNIT_IDS) assert.strictEqual(C.stage(B, id), C.stage(S, id), id);
  assert.strictEqual(C.hrMake(C.hrMerge(B, C.hrParse(s), D + 9)), C.hrMake(B), "くり返し 読んでも ふえない");
  assert(s.length <= 700, "長さ " + s.length);
});
t("バックアップ HR4：合わせても 減らない（両方の 大きいほう）・やりこみが なければ 今まで通り HR1〜3", () => {
  const A = yaState(), B = C.fresh(D); run(B, D, [{ id: "m3-amari", n: 30, o: 30 }, { id: "j3-kanji", n: 10, o: 10 }].filter(x => x.id in C.IDX));
  B.y.a.push("kuku"); B.y.c = Math.max(B.y.c, 5000);
  const M = C.hrMerge(C.clean(JSON.parse(JSON.stringify(A)), D + 3), C.hrParse(C.hrMake(B)), D + 3);
  assert(M.y.c >= A.y.c && M.y.c >= B.y.c);
  for (const id of new Set([...Object.keys(A.y.u), ...Object.keys(B.y.u)])) for (let i = 0; i < 4; i++) assert(M.y.u[id][i] >= Math.max((A.y.u[id] || [0, 0, 0, 0])[i], (B.y.u[id] || [0, 0, 0, 0])[i]), id + i);
  for (const id of [...A.y.a, ...B.y.a]) assert(M.y.a.includes(id), id);
  for (const id in A.kp.r) assert(M.kp.r[id] >= A.kp.r[id], id);
  assert(/^HR1/.test(C.hrMake(C.fresh(D))));
});
t("バックアップ HR4：1字 かえると 断る・表に ない じっせき／単元の 番号は 断る。古い HR1〜3 も 読める。YA_BK は YA_ACH を ぜんぶ ふくむ", () => {
  const s = C.hrMake(yaState()).replace(/-/g, "");
  for (let i = 3; i < 40; i++) { const c = s[i] === "A" ? "B" : "A"; assert.strictEqual(C.hrParse(s.slice(0, i) + c + s.slice(i + 1)), null, "位置 " + i); }
  for (const a of C.YA_ACH) assert(C.YA_BK.includes(a.id), "YA_BK に ない じっせき（末尾に 足す）: " + a.id);
  assert.strictEqual(new Set(C.YA_BK).size, C.YA_BK.length);
  const sum3 = tx => { let h = 7; for (const c of tx) h = (h * 31 + c.charCodeAt(0)) % 46656; return h.toString(36).toUpperCase().padStart(3, "0"); };
  const hr3 = C.hrMake(kzState()).replace(/-/g, ""); assert(C.hrParse(hr3), "HR2/HR3 も 読める");
  const rest = hr3.slice(3, -3), z = "0".repeat(9) + "1" + "0000", mk4 = b => "HR4" + b + sum3("HR4" + b);
  const kp0 = "00" + "1" + "0000" + "0", kzf = "1" + "0000" + "0";
  const core = /^HR2/.test(hr3) ? kzf + rest : rest.slice(0);
  assert(C.hrParse(mk4(z + kp0 + core)), "正しい 形");
  assert.strictEqual(C.hrParse(mk4("0".repeat(9) + "1" + "ZZZZ" + kp0 + core)), null, "20ビットを こえる");
  assert.strictEqual(C.hrParse(mk4("0".repeat(8) + "11" + "ZZ" + "000" + "1" + "0000" + kp0 + core)), null, "表に ない 単元");
});
t("ボスバトルの ステージ（bz）：ずかん・ステージが ひらく・レアボスは どんぐり 3こで 1日 1回・こわれた 記録は 0 から", () => {
  const S = C.clean(null, 100); assert.deepStrictEqual(S.bz, { o: 0, s: [], rd: 0, rp: 0 });
  let r = C.bzKo(S, ["z", "b1", "xx"], [0]); assert.deepStrictEqual(r, { fresh: ["z", "b1"], opened: 1 }); assert.strictEqual(S.bz.o, 1);
  r = C.bzKo(S, ["b1"], [0]); assert.deepStrictEqual(r, { fresh: [], opened: -1 });
  r = C.bzKo(S, ["b6"], [5]); assert.strictEqual(S.bz.o, 1, "6を おいはらっても 先は ない・とびこえない");
  assert.strictEqual(C.bzRarePay(S, 100, 0), false, "どんぐりが たりない");
  S.ac.e = 5; assert.strictEqual(C.bzRarePay(S, 100, 3), false, "ひらいていない ステージ");
  assert.strictEqual(C.bzRarePay(S, 100, 1), true); assert.strictEqual(C.balance(S), 2); assert.strictEqual(S.bz.rp, 2);
  S.ac.e = 20; assert.strictEqual(C.bzRarePay(S, 100, 1), false, "1日 1回"); assert.strictEqual(C.bzRareOk(S, 101), true);
  C.bzRareDone(S); assert.strictEqual(S.bz.rp, 0);
  const T2 = C.clean(JSON.parse(JSON.stringify(S)), 101); assert.deepStrictEqual(T2.bz.s, ["z", "b1", "b6"]); assert.strictEqual(T2.bz.o, 1);
  const bad = JSON.parse(JSON.stringify(S)); bad.bz = { o: "x", s: ["b1", "b1", "q", 3], rd: -1, rp: 4 };
  assert.deepStrictEqual(C.clean(bad, 101).bz, { o: 0, s: ["b1"], rd: 0, rp: 0 });
  assert.strictEqual(C.BZ_IDS.length, 13);
});
t("じぶんの まなびっこ（素体）：はじめは ランダムで 1たい・どんぐり 10こで えらんで 買う・きせかえを つける・こわれた 記録は 空", () => {
  assert.strictEqual(C.SB_IDS.length, 16); assert.strictEqual(new Set(C.SB_IDS).size, 16);
  const S = C.clean(null, 100); assert.deepStrictEqual(S.sb, { c: "", o: [] });
  assert.strictEqual(C.sbBuy(S, "kuma"), false, "はじめの 1たいの 前は 買えない");
  assert.strictEqual(C.sbStart(S, () => 0.99), "slime"); assert.deepStrictEqual(S.sb, { c: "slime", o: ["slime"] });
  assert.strictEqual(C.sbStart(S, () => 0), null, "2回めは ない"); assert.strictEqual(C.balance(S), 0, "はじめの 1たいは 無料");
  assert.strictEqual(C.sbBuy(S, "kuma"), false, "どんぐりが たりない");
  S.ac.e = 25; assert(C.sbBuy(S, "kuma")); assert.strictEqual(C.balance(S), 15); assert.strictEqual(S.sb.c, "kuma");
  assert.strictEqual(C.sbBuy(S, "kuma"), false, "もっている 子は 買えない"); assert.strictEqual(C.sbBuy(S, "xx"), false);
  assert(C.sbSet(S, "slime")); assert.strictEqual(C.sbSet(S, "neko"), false);
  assert(C.kzBuy(S, "h-cap"), "まなびっこ（4たい）が いなくても 素体が いれば きせかえを 買える"); assert(C.kzWear(S, "sb", "h", "h-cap"));
  assert.deepStrictEqual(C.kzOf(S, "sb"), { h: "h-cap" });
  const T2 = C.clean(JSON.parse(JSON.stringify(S)), 101); assert.deepStrictEqual(T2.sb, { c: "slime", o: ["slime", "kuma"] }); assert.deepStrictEqual(C.kzOf(T2, "sb"), { h: "h-cap" });
  const bad = JSON.parse(JSON.stringify(S)); bad.sb = { c: "neko", o: ["kuma", "kuma", "q", 3] };
  assert.deepStrictEqual(C.clean(bad, 101).sb, { c: "kuma", o: ["kuma"] });
  bad.sb = 5; const B = C.clean(bad, 101); assert.deepStrictEqual(B.sb, { c: "", o: [] }); assert.deepStrictEqual(C.kzOf(B, "sb"), {}, "子が いなければ きせかえも ない");
});
t("バックアップ HR6：素体が いれば 包む・読みこむと 合わさる（いまの 子は この端末を 大事に）・1字 かえると 断る・素体が いなければ 今まで通り", () => {
  const S = C.clean(null, 20000); assert(/^HR1/.test(C.hrMake(S)));
  C.sbStart(S, () => 0.1); S.ac.e = 30; C.sbBuy(S, "tako"); C.kzBuy(S, "h-crown"); C.kzWear(S, "sb", "h", "h-crown");
  const str = C.hrMake(S); assert(/^HR6/.test(str)); const r = C.hrParse(str);
  assert(r && r.sb); assert.deepStrictEqual(r.sb, { c: "tako", o: ["kuma", "tako"], e: { h: "h-crown" } });
  const T2 = C.clean(null, 20000); C.sbStart(T2, () => 0.0); C.hrMerge(T2, r, 20001);
  assert.deepStrictEqual(T2.sb, { c: "neko", o: ["neko", "kuma", "tako"] }); assert(T2.kz.o.includes("h-crown"));
  const T3 = C.clean(null, 20000); C.hrMerge(T3, C.hrParse(str), 20001); assert.strictEqual(T3.sb.c, "tako"); assert.deepStrictEqual(C.kzOf(T3, "sb"), { h: "h-crown" });
  const raw = str.replace(/-/g, ""), i = 4, bad = raw.slice(0, i) + (raw[i] === "0" ? "1" : "0") + raw.slice(i + 1);
  assert.strictEqual(C.hrParse(bad), null);
  assert.strictEqual(C.hrParse("HR6" + raw.slice(3, -3).slice(0, 13) + raw + "000"), null, "中に HR6 は 入れない");
});
console.log(`\n${n} 件のテストを実行${process.exitCode ? "（失敗あり）" : "：すべて成功"}`);
