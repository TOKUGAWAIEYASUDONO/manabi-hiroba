// コレクション v1（data/collection.js：どんぐり・ずかん・ひろば・バックアップ）の単体テスト。 node tools/test-collection.js
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
  for (const f of ["data/questions.js", "data/calc.js", "data/choices.js", "data/quizlib.js", "data/gen/core.js", "data/gen/other.js", "data/gen/sansu-12.js", "data/gen/sansu-34.js", "data/gen/sansu-56.js", "data/units.js"]) vm.runInContext(fs.readFileSync(path.join(root, f), "utf8"), ctx, { filename: f });
  const ready = ctx.MH_UNITS.UNITS.filter(u => u.status === "ready" && u.gen), SJ = { sansu: "m", kokugo: "j", shakai: "s", eigo: "e" };
  assert.strictEqual(new Set(C.UNIT_IDS).size, C.UNIT_IDS.length);
  assert.deepStrictEqual([...ready.map(u => u.id)].sort(), [...C.UNIT_IDS].sort());
  const GFIX = { "m6-hayasa": 5, "m5-bunsu-int": 6 };
  for (const u of ready) { assert.strictEqual(u.id[0], SJ[u.subj]); assert.strictEqual(GFIX[u.id] || +u.id[1], u.g); }
  assert(C.UNIT_IDS.length * 4 + 3 < 46656);
});
t("かざりの値段の合計は 380", () => assert.strictEqual(C.PRICE_TOTAL, 380));
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
t("できた・マスターは一生に1回：くり返しても増えない", () => {
  const S = C.fresh(D); run(S, D, [U("m3-amari")]); run(S, D + 1, [U("m3-amari")]); const e0 = S.ac.e;
  const m = run(S, D + 2, [U("m3-amari")]); assert.strictEqual(C.stage(S, "m3-amari"), 3); assert(m.events.some(e => e.t === "master" && e.gain === 3));
  assert.strictEqual(S.ac.e, e0 + 3 + 1);       // マスター +3 と、その日の1回め +1
  const again = []; for (let d = 3; d < 10; d++) again.push(gain(run(S, D + d, [U("m3-amari")])));
  assert.deepStrictEqual(again, [1, 1, 1, 1, 1, 1, 1]);      // 増えるのは「きょうの1回め」の +1 だけ
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
  assert.strictEqual(r.paid, g1.length + 1); assert.strictEqual(r.deferred, 0);
  const S2 = C.fresh(D); run(S2, D, g1.map(U), { grade: 1 }); const r2 = run(S2, D + 1, g1.map(U), { grade: 1 });
  assert.strictEqual(r2.paid + r2.deferred, g1.length * 2 + 1);
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
t("1日の上限 20：あふれた分は あしたに持ちこす。「また あした」は1日1回だけ", () => {
  const S = C.fresh(D), ids = C.UNIT_IDS.filter(i => i[0] === "m" && (i[1] === "3" || i[1] === "4")).slice(0, 14);
  run(S, D, ids.map(U), { grade: 4 });
  const r = run(S, D + 1, ids.map(U), { grade: 4 });       // できた 14こ×2＝28 ＋ 1回め 1 ＝ 29
  assert.strictEqual(r.paid, 20); assert.strictEqual(r.deferred, 9); assert.strictEqual(S.day.carry, 9); assert(r.capFirst);
  const r2 = run(S, D + 1, ids.map(U), { grade: 4 }); assert(!r2.capFirst); assert.strictEqual(r2.paid, 0);
  const before = S.ac.e; assert.strictEqual(before, 1 + 20);       // 1日目の「1回め」1こ＋2日目の上限 20
  C.sync(S, D + 2); assert.strictEqual(S.day.got, 9); assert.strictEqual(S.day.carry, 0); assert.strictEqual(S.ac.e, before + 9);
});
t("持ち越しが 20 を超えるときは、翌日 20 まで・のこりはさらに翌日", () => {
  const S = C.fresh(D); S.day.carry = 45;
  C.sync(S, D + 1); assert.strictEqual(S.day.got, 20); assert.strictEqual(S.day.carry, 25);
  const ctx = { paid: 0, deferred: 0 }; C.give(S, 3, ctx); assert.strictEqual(ctx.paid, 0);      // 今日はもう上限
  C.sync(S, D + 2); assert.strictEqual(S.day.got, 20); assert.strictEqual(S.day.carry, 8 );
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
  assert(!C.place(S, "bench", 1)); assert(!C.place(S, "tree", 13)); assert(C.unplace(S, "tree")); assert(!C.unplace(S, "tree"));
  assert(C.place(S, "flower", 3));
});
t("完成：かざり7つそろえて全部置く。完成日を1回だけ記録し、その後どんぐりは出ない", () => {
  const S = C.fresh(D); S.ac.e = C.PRICE_TOTAL;
  C.DECOR.forEach((d, i) => { assert(C.buy(S, d.id)); assert(!C.checkDone(S, D + 9)); });
  C.DECOR.forEach((d, i) => C.place(S, d.id, i + 1));
  assert(C.checkDone(S, D + 9)); assert.strictEqual(S.done, D + 9); assert(!C.checkDone(S, D + 20)); assert.strictEqual(S.done, D + 9);
  assert.strictEqual(gain(run(S, D + 30, [], { answered: 10, correct: 10 })), 0);
});
t("clean：壊れた保存を直す", () => {
  const S = C.clean({ v: 1, d0: D, last: D, u: { "m3-amari": [9, 5, 5], "zzz": [3, 0, 0], "m3-div1": "x" }, ac: { e: 10, s: 99 }, own: ["tree", "tree", "ghost"], pl: { tree: 5, ghost: 2, flower: 5 } }, D);
  assert.strictEqual(C.stage(S, "m3-amari"), 3); assert.strictEqual(Object.keys(S.u).length, 1); assert.strictEqual(S.ac.s, 10);
  assert.deepStrictEqual(S.own, ["tree"]); assert.deepStrictEqual(S.pl, { tree: 5 });
  assert.strictEqual(C.clean(null, D).d0, D); assert.strictEqual(C.clean({ v: 2 }, D).d0, D);
});

/* ---- バックアップ ---- */
const sem3 = () => {       // 3年 1学期ぶん：3年の算数17単元＋ほかの学年 15単元
  const S = C.fresh(D), m3 = C.UNIT_IDS.filter(i => i[0] === "m" && i[1] === "3"), others = C.UNIT_IDS.filter(i => i[0] === "m" && i[1] === "2").concat(C.UNIT_IDS.filter(i => i[0] === "m" && i[1] === "1")).slice(0, 15);
  run(S, D, [...m3, ...others].map(U)); run(S, D + 1, m3.map(U)); run(S, D + 2, m3.slice(0, 5).map(U));
  S.ac.e = 120; S.ac.s = 35; S.own = ["tree", "flower", "bench"]; S.pl = { tree: 2, flower: 7 };
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
  assert.strictEqual(C.hrMake(T2), C.hrMake(S));
});
t("バックアップ：3年1学期ぶんで 150字以下（区切りの - をふくむ）", () => { const s = C.hrMake(sem3()); assert(s.length <= 150, "長さ " + s.length); });
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
  assert.strictEqual(C.hrParse(mk(hdr("5", "3", "01", "D000000", "00"))), null);    // 場所の番号が 12 より大きい
  assert.strictEqual(C.hrParse(mk(hdr("5", "3", "00", "0000000", "01") + "00")), null);      // 番号0・段階0
  assert.strictEqual(C.hrParse(mk(hdr("5", "3", "00", "0000000", "02") + "0504")), null);    // 同じ単元が2回
  assert.strictEqual(C.hrParse(mk(hdr("5", "3", "00", "0000000", "01") + "ZZ")), null);      // 単元の番号が表の外
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
  assert.strictEqual(withMemo.replace(/-/g, "").length - plain.replace(/-/g, "").length, 32);
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
console.log(`\n${n} 件のテストを実行${process.exitCode ? "（失敗あり）" : "：すべて成功"}`);
