// 「先生がつくる もんだい」の部品（data/quizlib.js）の単体テスト。 node tools/test-quiz.js
const assert = require("assert");
const Q = require("../data/quizlib.js");
let n = 0;
const t = (name, fn) => { try { const r = fn(); if (r && r.then) return r.then(() => { n++; console.log("ok  " + name); }, e => { console.log("NG  " + name + "\n    " + e.message); process.exitCode = 1; }); n++; console.log("ok  " + name); } catch (e) { console.log("NG  " + name + "\n    " + e.message); process.exitCode = 1; } };

/* ---- ルビ ---- */
t("ルビ：漢字《かんじ》", () => assert.deepStrictEqual(Q.rubyParts("この漢字《かんじ》は？"), [{ t: "この" }, { b: "漢字", r: "かんじ" }, { t: "は？" }]));
t("ルビ：｜で始まりを指定", () => assert.deepStrictEqual(Q.rubyParts("今日は｜お天気《てんき》だ"), [{ t: "今日は" }, { b: "お天気", r: "てんき" }, { t: "だ" }]));
t("ルビ：複数・文字だけ", () => { assert.strictEqual(Q.plain("今日《きょう》は晴《は》れ"), "今日は晴れ"); assert.strictEqual(Q.plain("ふつうの文"), "ふつうの文"); });
t("ルビ：対応しない《は文字のまま", () => assert.strictEqual(Q.plain("かっこ《だけ"), "かっこ《だけ"));
t("ルビ：HTMLは文字のまま（タグにならない）", () => assert.strictEqual(Q.rubyParts("<b>漢字《かんじ》</b>").map(p => p.t || p.b).join(""), "<b>漢字</b>"));

/* ---- 形式チェック ---- */
const okq = { t: "mc", q: "1+1は？", ch: ["1", "2", "3", "4"], ok: [1], sec: 20, pt: "normal" };
t("cleanQ：ふつうの4択", () => { const r = Q.cleanQ(okq); assert(r.ok); assert.deepStrictEqual(r.q, okq); });
t("cleanQ：空の選択肢をつめて正解の番号を直す", () => { const r = Q.cleanQ({ ...okq, ch: ["a", "", "c", "d"], ok: [2] }); assert(r.ok); assert.deepStrictEqual(r.q.ch, ["a", "c", "d"]); assert.deepStrictEqual(r.q.ok, [1]); });
t("cleanQ：複数正解", () => { const r = Q.cleanQ({ ...okq, ok: [3, 1, 1] }); assert.deepStrictEqual(r.q.ok, [1, 3]); });
t("cleanQ：正解なし・範囲外・空の選択肢を指す", () => {
  assert(!Q.cleanQ({ ...okq, ok: [] }).ok); assert(!Q.cleanQ({ ...okq, ok: [4] }).ok); assert(!Q.cleanQ({ ...okq, ch: ["a", "", "c", "d"], ok: [1] }).ok); assert(!Q.cleanQ({ ...okq, ok: ["1"] }).ok);
});
t("cleanQ：文字数の上限", () => { assert(!Q.cleanQ({ ...okq, q: "あ".repeat(121) }).ok); assert(Q.cleanQ({ ...okq, q: "あ".repeat(120) }).ok); assert(!Q.cleanQ({ ...okq, ch: ["あ".repeat(61), "b"] }).ok); });
t("cleanQ：選択肢は2〜4", () => { assert(!Q.cleanQ({ ...okq, ch: ["a"], ok: [0] }).ok); assert(!Q.cleanQ({ ...okq, ch: ["a", "b", "c", "d", "e"], ok: [0] }).ok); });
t("cleanQ：制限時間は7段階。それ以外は20秒（strictでは拒否）", () => {
  for (const s of [5, 10, 20, 30, 60, 90, 120]) assert.strictEqual(Q.cleanQ({ ...okq, sec: s }).q.sec, s);
  const r = Q.cleanQ({ ...okq, sec: 45 }); assert.strictEqual(r.q.sec, 20); assert(r.warn.length);
  assert(!Q.cleanQ({ ...okq, sec: 45 }, { strict: true }).ok); assert(!Q.cleanQ({ ...okq, sec: "x" }, { strict: true }).ok);
});
t("cleanQ：○×は選択肢が固定", () => { const r = Q.cleanQ({ t: "tf", q: "ほんと？", ch: ["x", "y"], ok: [1] }); assert.deepStrictEqual(r.q.ch, ["○", "×"]); assert(!Q.cleanQ({ t: "tf", q: "a", ch: [], ok: [0, 1] }).ok); });
t("cleanQ：型がちがうもの・制御文字", () => {
  assert(!Q.cleanQ(null).ok); assert(!Q.cleanQ([]).ok); assert(!Q.cleanQ({ ...okq, t: "zz" }).ok); assert(!Q.cleanQ({ ...okq, q: 5 }).ok); assert(!Q.cleanQ({ ...okq, ch: "abcd" }).ok);
  assert.strictEqual(Q.cleanQ({ ...okq, q: "a\u0000b\nc" }).q.q, "a b c");
});
t("cleanSet：200問まで・不正な問題は飛ばす", () => {
  assert(!Q.cleanSet({ qs: Array(201).fill(okq) }).ok);
  const r = Q.cleanSet({ title: "T", qs: [okq, { ...okq, ok: [] }, okq] }); assert(r.ok); assert.strictEqual(r.set.qs.length, 2); assert.strictEqual(r.bad.length, 1);
  assert(!Q.cleanSet({ format: "other", qs: [okq] }).ok); assert(!Q.cleanSet({ v: 2, qs: [okq] }).ok); assert(!Q.cleanSet({ qs: [] }).ok);
});
t("draftSet：こわれた保存データでも形がそろう", () => { const d = Q.draftSet({ title: 5, qs: [null, { t: "tf", q: "a", ok: [0] }, { q: "b", ch: [1, "x"], ok: ["a", 2, 9] }] }); assert.strictEqual(d.qs.length, 3); assert.strictEqual(d.qs[2].ch.length, 4); assert.deepStrictEqual(d.qs[2].ok, [2]); assert(typeof d.id === "string"); });

/* ---- 得点 ---- */
t("得点：500+500×のこり/制限（四捨五入）・2ばい・なし・不正解", () => {
  assert.strictEqual(Q.points(true, 20, 20, "normal"), 1000); assert.strictEqual(Q.points(true, 0, 20, "normal"), 500);
  assert.strictEqual(Q.points(true, 10, 20, "normal"), 750); assert.strictEqual(Q.points(true, 5, 30, "normal"), 583);
  assert.strictEqual(Q.points(true, 10, 20, "double"), 1500); assert.strictEqual(Q.points(true, 10, 20, "none"), 0); assert.strictEqual(Q.points(false, 10, 20, "normal"), 0);
  assert.strictEqual(Q.points(true, 99, 20, "normal"), 1000); assert.strictEqual(Q.points(true, -3, 20, "normal"), 500);
});

/* ---- 取り込み ---- */
const stat = (txt, o) => { const r = Q.analyzeText(txt, o); return { r, s: r.rows.map(x => x.status).join(",") }; };
t("TSV：見出しあり（日本語）", () => {
  const { r, s } = stat("問題文\t選択肢1\t選択肢2\t選択肢3\t選択肢4\t制限時間(秒)\t正解の番号\nA?\t1\t2\t3\t4\t20\t2\nB?\t1\t2\t\t\t10\t1,2");
  assert.strictEqual(s, "ok,ok"); assert.deepStrictEqual(r.rows[1].q.ok, [0, 1]); assert.strictEqual(r.rows[0].line, 2);
});
t("TSV：見出しなし（Kahoot の列順）", () => { const { r, s } = stat("A?\t1\t2\t3\t4\t20\t2\nB?\ta\tb\t\t\t5\t1"); assert.strictEqual(s, "ok,ok"); assert.strictEqual(r.rows[0].line, 1); assert.strictEqual(r.rows[1].q.sec, 5); });
t("TSV：Kahoot の英語見出し（上に説明の行・番号の列つき）", () => {
  const txt = ["Kahoot template\t\t\t\t\t\t\t", "\t\t\t\t\t\t\t", "Question number\tQuestion - max 120 characters\tAnswer 1 - max 75 characters\tAnswer 2 - max 75 characters\tAnswer 3 - max 75 characters\tAnswer 4 - max 75 characters\tTime limit (sec) – 5, 10, 20, 30, 60, 90, 120, or 240 secs\tCorrect answer(s) - choose at least one",
    "1\tWho?\tA\tB\tC\tD\t30\t3"].join("\n");
  const { r, s } = stat(txt); assert.strictEqual(s, "ok"); assert.strictEqual(r.rows[0].q.q, "Who?"); assert.deepStrictEqual(r.rows[0].q.ok, [2]); assert.strictEqual(r.rows[0].q.sec, 30);
});
t("取り込み：時間が空欄なら20秒＋⚠", () => { const { r, s } = stat("A?\t1\t2\t3\t4\t\t2"); assert.strictEqual(s, "warn"); assert.strictEqual(r.rows[0].q.sec, 20); assert(/空欄/.test(r.rows[0].reasons[0])); });
t("取り込み：範囲外・文字の時間は20秒＋⚠（取り込みは止めない）", () => {
  const { r, s } = stat("A?\t1\t2\t3\t4\t240\t2\nB?\t1\t2\t3\t4\t7\t2\nC?\t1\t2\t3\t4\tabc\t2\nD?\t1\t2\t3\t4\t60秒\t2");
  assert.strictEqual(s, "warn,warn,warn,ok"); assert.deepStrictEqual(r.rows.map(x => x.q.sec), [20, 20, 20, 60]);
});
t("取り込み：正解の番号のまちがいは❌（理由つき）", () => {
  const { r, s } = stat("A?\t1\t2\t3\t4\t20\t5\nB?\t1\t2\t\t\t20\t3\nC?\t1\t2\t3\t4\t20\t\nD?\t1\t2\t3\t4\t20\tあ\nE?\t1\t2\t3\t4\t20\t0\nF?\t1\t2\t3\t4\t20\t1,9");
  assert.strictEqual(s, "ng,ng,ng,ng,ng,ng"); for (const x of r.rows) assert(x.reasons[0].length > 4 && !x.q);
});
t("取り込み：列が足りない行は❌", () => { const { r, s } = stat("A?\t1\t2\nB?\t1\t2\t3\t4\t20\t2"); assert.strictEqual(s, "ng,ok"); assert(/列が足りません/.test(r.rows[0].reasons[0])); });
t("取り込み：問題文が空・長い・選択肢が1つ・長い", () => {
  const { s } = stat(`\t1\t2\t3\t4\t20\t1\n${"あ".repeat(121)}\t1\t2\t3\t4\t20\t1\nA?\t1\t\t\t\t20\t1\nB?\t${"い".repeat(61)}\t2\t\t\t20\t1`); assert.strictEqual(s, "ng,ng,ng,ng");
});
t("取り込み：○×問題になる（順番がちがっても）", () => {
  const { r, s } = stat("A?\t○\t×\t\t\t10\t1\nB?\t×\t○\t\t\t10\t1\nC?\t正\t誤\t\t\t10\t2"); assert.strictEqual(s, "ok,ok,ok");
  assert.deepStrictEqual(r.rows.map(x => [x.q.t, x.q.ok[0]]), [["tf", 0], ["tf", 1], ["tf", 1]]);
});
t("取り込み：空の選択肢をつめる（⚠）", () => { const { r, s } = stat("A?\ta\t\tc\t\t20\t3"); assert.strictEqual(s, "warn"); assert.deepStrictEqual(r.rows[0].q.ch, ["a", "c"]); assert.deepStrictEqual(r.rows[0].q.ok, [1]); });
t("取り込み：得点の列", () => { const { r, s } = stat("A?\t1\t2\t\t\t20\t1\t2ばい\nB?\t1\t2\t\t\t20\t1\tなし\nC?\t1\t2\t\t\t20\t1\tへん"); assert.strictEqual(s, "ok,ok,warn"); assert.deepStrictEqual(r.rows.map(x => x.q.pt), ["double", "none", "normal"]); });
t("取り込み：CSV（引用符・改行・カンマ入りの正解）", () => {
  const { r, s } = stat('問題文,選択肢1,選択肢2,選択肢3,選択肢4,制限時間(秒),正解の番号\r\n"a, ""b""\nc",x,y,,,20,"1,2"\r\n'); assert.strictEqual(s, "ok"); assert.strictEqual(r.rows[0].q.q, 'a, "b" c'); assert.deepStrictEqual(r.rows[0].q.ok, [0, 1]);
});
t("取り込み：空行は飛ばす・全角数字", () => { const { s } = stat("\n\nA?\t1\t2\t3\t4\t２０\t２\n\n"); assert.strictEqual(s, "ok"); });
t("取り込み：200問の上限（いまの問題数ぶんを引く）", () => {
  const rows = Array.from({ length: 5 }, (_, i) => `Q${i}\ta\tb\t\t\t20\t1`).join("\n"); const { s } = stat(rows, { existing: 198 }); assert.strictEqual(s, "ok,ok,ng,ng,ng");
});
t("取り込み：JSON も同じ形で分析できる", () => { const j = Q.toJson({ title: "T", g: 3, qs: [okq] }); const r = Q.analyzeText(j); assert.strictEqual(r.kind, "json"); assert.strictEqual(r.rows[0].status, "ok"); assert.strictEqual(r.title, "T"); assert(Q.analyzeText("{bad").error); assert(Q.analyzeText('{"format":"x"}').error); });
t("取り込み：空の入力", () => assert.strictEqual(Q.analyzeText("  \n ").kind, "empty"));

/* ---- 往復 ---- */
const sample = { title: "往復テスト", g: 3, memo: "メモ", qs: [
  { t: "mc", q: "日本の首都は？", ch: ["大阪", "東京", "京都", "名古屋"], ok: [1], sec: 20, pt: "normal" },
  { t: "mc", q: "「,」や\"引用符\"や\n改行を含む,問題", ch: ["a,b", "c\"d", "e", ""], ok: [0, 2], sec: 120, pt: "double" },
  { t: "tf", q: "漢字《かんじ》は 難《むずか》しい", ch: ["○", "×"], ok: [1], sec: 5, pt: "none" },
  { t: "mc", q: "二択", ch: ["はい", "いいえ"], ok: [0], sec: 90, pt: "normal" }] };
const fin = Q.cleanSet(sample).set;
t("往復：JSON を書き出して読み込むと同じ", () => { const r = Q.cleanSet(JSON.parse(Q.toJson(fin))); assert(r.ok); assert.deepStrictEqual(r.set, fin); });
t("往復：CSV（BOMつき）を書き出して読み込むと同じ", () => {
  const csv = Q.toCsv(fin); assert.strictEqual(csv.charCodeAt(0), 0xfeff);
  const r = Q.analyzeText(csv); assert(r.rows.every(x => x.status === "ok"), JSON.stringify(r.rows.map(x => x.reasons)));
  assert.deepStrictEqual(r.rows.map(x => x.q), fin.qs);
});
t("往復：テンプレートCSVはそのまま取り込める", () => { const r = Q.analyzeText(Q.templateCsv()); assert.deepStrictEqual(r.rows.map(x => x.status), ["ok", "ok"]); assert.strictEqual(r.rows[1].q.t, "tf"); });
t("往復：CSVを Excel 風にTSVにして貼っても同じ", () => {
  const rows = Q.parseDelim(Q.toCsv(fin), ","), tsv = rows.map(r => r.map(c => /[\t\n"]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c).join("\t")).join("\n");
  const r = Q.analyzeText(tsv); assert.deepStrictEqual(r.rows.map(x => x.q), fin.qs);
});
t("結果のCSV", () => {
  const c = Q.resultsCsv({ qs: fin.qs.slice(0, 2), players: [{ name: "はやいパンダ", v: 1500, ok: 1, rec: "1-" }], stat: [{ ok: 1, tot: 2 }, { ok: 0, tot: 2 }] });
  assert(c.includes("はやいパンダ,1500,1,○,−")); assert(c.includes("正答率,,,50%,0%"));
});

/* ---- リンク ---- */
(async () => {
  await t("リンク：圧縮して戻すと同じ", async () => { const c = await Q.encodeLink(fin); assert.strictEqual(c[0], "z"); assert(/^[A-Za-z0-9_-]+$/.test(c)); const r = await Q.decodeLink(c); assert(r.ok, r.why); assert.deepStrictEqual(r.set.qs, fin.qs); assert.strictEqual(r.set.title, fin.title); });
  await t("リンク：無圧縮（非対応ブラウザ用）も戻せる", async () => { const c = await Q.encodeLink(fin, { plain: true }); assert.strictEqual(c[0], "r"); const r = await Q.decodeLink(c); assert(r.ok); assert.deepStrictEqual(r.set.qs, fin.qs); });
  await t("リンク：30問ほどで長さの目安", async () => {
    const big = { title: "t", g: 0, qs: Array.from({ length: 30 }, (_, i) => ({ t: "mc", q: `第${i + 1}問 次の漢字の読みとして正しいものはどれでしょう？ 学校《がっこう》`, ch: [`こたえ${i}あ`, `こたえ${i}い`, `こたえ${i}う`, `こたえ${i}え`], ok: [i % 4], sec: 20, pt: "normal" })) };
    const z = await Q.encodeLink(big), p = await Q.encodeLink(big, { plain: true }); console.log(`    30問：圧縮 ${z.length}文字／無圧縮 ${p.length}文字`); assert(z.length < p.length);
  });
  await t("リンク：こわれた・大きすぎる・形式ちがいは拒否", async () => {
    for (const c of ["", "z", "x1234", "zAAAA", "r!!!!", "rAAAA", "z" + "A".repeat(300000)]) assert(!(await Q.decodeLink(c)).ok, c.slice(0, 10));
    const bomb = await Q.encodeLink({ title: "", g: 0, qs: [{ t: "mc", q: "a", ch: ["b", "c"], ok: [0], sec: 20, pt: "normal" }] }); assert((await Q.decodeLink(bomb)).ok);
    const evil = "r" + Q.b64u(new TextEncoder().encode(JSON.stringify({ v: 1, qs: [{ t: "mc", q: "<img src=x onerror=alert(1)>", ch: ["a", "b"], ok: [0], sec: 999, pt: "x" }] })));
    const r = await Q.decodeLink(evil); assert(r.ok); assert.strictEqual(r.set.qs[0].sec, 20); assert.strictEqual(r.set.qs[0].pt, "normal");   // 時間・得点は検査して直す（文字は表示側で textContent）
  });

  /* ---- 進行（engine） ---- */
  const qs = [
    { t: "mc", q: "1", ch: ["a", "b", "c", "d"], ok: [1], sec: 20, pt: "normal" },
    { t: "tf", q: "2", ch: ["○", "×"], ok: [0], sec: 10, pt: "double" },
    { t: "mc", q: "3", ch: ["a", "b"], ok: [0, 1], sec: 20, pt: "none" },
    { t: "mc", q: "4", ch: ["a", "b"], ok: [1], sec: 20, pt: "normal" }];
  await t("engine：最後まで通る（得点・連続正解・数問ごとの上位・終わり）", () => {
    const E = Q.engine(qs); ["p1", "p2", "p3"].forEach(p => E.add(p));
    assert(E.begin(1000)); assert.strictEqual(E.phase, "q"); assert.strictEqual(E.qEnd, 21000);
    assert(!("ok" in E.pub().q), "出題中は正解を送らない");
    assert(E.answer("p1", 0, 1, 1000).ok); assert(!E.answer("p1", 0, 2, 1100).ok, "2回目は不可"); assert(!E.answer("p2", 5, 0, 1000).ok, "範囲外不可"); assert(!E.answer("p2", 1, 0, 1000).ok, "古い問題番号");
    assert(E.answer("p2", 0, 0, 11000).ok);                                     // 不正解
    assert(!E.tick(2000)); assert(E.tick(21000));                                // p3 が答えないまま時間切れ → 正解を見せる
    assert.strictEqual(E.phase, "reveal"); assert.strictEqual(E.P.get("p1").v, 1000); assert.strictEqual(E.P.get("p1").st, 1); assert.strictEqual(E.P.get("p2").v, 0); assert.strictEqual(E.P.get("p3").lc, -1);
    assert.deepStrictEqual(E.pub().dist, [1, 1, 0, 0]); assert.deepStrictEqual(E.pub().q.ok, [1]);
    assert(E.next(30000)); assert.strictEqual(E.idx, 1);
    assert(E.answer("p1", 1, 0, 35000).ok); assert(E.answer("p2", 1, 0, 36000).ok); assert(E.answer("p3", 1, 1, 37000).ok);
    assert(E.tick(37001), "全員が答えたらすぐ見せる"); assert.strictEqual(E.P.get("p1").v, 1000 + Math.round((500 + 500 * 5 / 10) * 2)); assert.strictEqual(E.P.get("p1").st, 2); assert.strictEqual(E.P.get("p3").st, 0);
    assert(E.next(40000)); assert.strictEqual(E.phase, "q"); assert.strictEqual(E.idx, 2);
    assert(E.answer("p1", 2, 1, 40001).ok); E.next(41000);                         // 先生が「いま しめきる」
    assert.strictEqual(E.phase, "reveal"); assert.strictEqual(E.P.get("p1").v, 1000 + 1500 + 0); assert.strictEqual(E.P.get("p1").ok, 3);
    E.next(42000); assert.strictEqual(E.phase, "board", "3問ごとに上位5人");
    E.next(43000); assert.strictEqual(E.idx, 3); E.next(63000); assert.strictEqual(E.phase, "reveal"); E.next(64000); assert.strictEqual(E.phase, "end");
    const p = E.pub(); assert.strictEqual(p.stat.length, 4); assert.strictEqual(p.all, E.P.get("p1").ok + E.P.get("p2").ok + E.P.get("p3").ok); assert.strictEqual(E.recStr("p1"), "111-");
    assert.deepStrictEqual(E.low(0.6), [0, 2, 3]);   // 正解 1/3・1/3・1/3・0/3 のうち、問2だけ 2/3
  });
  await t("engine：やさしいルールは上位の表を出さない／もう一度（正答率の低い問題だけ）", () => {
    const E = Q.engine(qs, { easy: true }); E.add("a"); E.begin(0); const seen = new Set(); for (let i = 1; i < 12; i++) { E.next(i); seen.add(E.phase); } assert(!seen.has("board")); assert.strictEqual(E.phase, "end");
    const F = Q.engine(qs); F.add("a"); F.add("b"); F.begin(0); F.answer("a", 0, 1, 0); F.answer("b", 0, 1, 0); F.tick(0); F.next(1); F.answer("a", 1, 1, 1); F.answer("b", 1, 1, 1); F.tick(1);
    assert.deepStrictEqual(F.low(0.6), [1]); F.begin(5, [F.qs[1]]); assert.strictEqual(F.qs.length, 1); assert.strictEqual(F.P.get("a").v, 0); assert.strictEqual(F.phase, "q");
  });
  await t("engine：時間切れの少し後の回答は受けない／1人だけでも進む", () => {
    const E = Q.engine(qs); E.add("a"); E.begin(0); assert(!E.answer("a", 0, 1, 20600).ok); assert(E.answer("a", 0, 1, 20400).ok); assert(E.tick(20401));
  });
  await t("児童の端末で受ける状態の検査", () => {
    const E = Q.engine(qs); E.add("a"); E.begin(0); const c = Q.cleanQuizPub(JSON.parse(JSON.stringify(E.pub()))); assert(c && c.q.ch.length === 4 && !c.hasOk);
    const bad1 = JSON.parse(JSON.stringify(E.pub())); bad1.q.ch = ["<x>", ""]; assert.strictEqual(Q.cleanQuizPub(bad1), null);
    assert.strictEqual(Q.cleanQuizPub({ phase: "zzz", idx: 0, n: 1 }), null); assert.strictEqual(Q.cleanQuizPub(null), null); assert.strictEqual(Q.cleanQuizPub({ phase: "q", idx: 1e9, n: 1 }), null);
    E.next(1); const r = Q.cleanQuizPub(JSON.parse(JSON.stringify(E.pub()))); assert(r.hasOk && r.dist.length === 4);
  });
  console.log(`\n${n} 件のテストを実行${process.exitCode ? "（失敗あり）" : "：すべて成功"}`);
})();
