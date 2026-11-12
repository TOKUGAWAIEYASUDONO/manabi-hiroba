// 協力モード「ロケット はっしゃ」の検査。 node tools/test-coop.js
// 1) data/cooplib.js（ブラウザ・先生の端末・server.js で共通）：燃料・目標の自動調整・1人の上限・ミニゲームの判定・2回目の救済・状態の大きさ
// 2) 60人の送受信シミュレーション（時計を進めながら、全員が答える）
// 3) server.js（予備方式）：入力の検証・権限・名前を児童に送らないこと・最後まで通ること
const { spawn } = require("child_process");
const path = require("path");
const assert = require("assert");
const CO = require(path.join(__dirname, "..", "data", "cooplib.js"));
let n = 0;
const t = async (name, fn) => { try { await fn(); n++; console.log("ok  " + name); } catch (e) { console.log("NG  " + name + "\n    " + (e && e.stack || e).split("\n").slice(0, 4).join("\n    ")); process.exitCode = 1; } };
const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let x = Math.imul(seed ^ seed >>> 15, 1 | seed); x = x + Math.imul(x ^ x >>> 7, 61 | x) ^ x; return ((x ^ x >>> 14) >>> 0) / 4294967296; };
const size = o => Buffer.byteLength(JSON.stringify(o));
/* n人が入った部屋（時刻 0 から） */
function room(N, o) { const E = CO.engine({ rand: rng(7), ...o }); for (let i = 0; i < N; i++) E.add("p" + i); E.begin(0); E.tick(3000); return E; }
const kseq = {}; const K = pid => (kseq[pid] = (kseq[pid] || 0) + 1);
const ans = (E, pid, ok, now) => E.act(pid, "cans", { ok, k: K(pid + E.t0) }, now);
/* 先生の端末の 250ms ごとの時計で now を進める */
function run(E, from, to, step, f) { let now = from; for (; now <= to; now += step) { E.tick(now); if (f) f(now); } return now; }

(async () => {
  /* ---------- 1) 目標 ---------- */
  await t("目標の式：人数・学年・むずかしさで自動調整（最小 10・やさしいは低い）", () => {
    const tb = [[1, 3], [5, 3], [20, 3], [30, 3], [28, 1], [60, 5]].map(([N, g]) => [N, g, CO.stageTarget(N, g, false), CO.stageTarget(N, g, true)]);
    console.log("    人数・学年・ふつう・やさしい（1ステージの目標）:", tb.map(r => r.join("/")).join("  "));
    assert.strictEqual(CO.stageTarget(30, 3, false), 310, "ふつうの学級（3〜4年・30人）");
    assert.strictEqual(CO.stageTarget(1, 3, false), 10); assert.strictEqual(CO.stageTarget(1, 1, true), 10, "1人でも終わる（最小 10）");
    for (const [N, g, a, b] of tb) assert.ok(b <= a && a >= 10, "やさしい版は低い " + N);
    assert.ok(CO.stageTarget(60, 5, false) > CO.stageTarget(30, 5, false) * 1.9, "人数に比例");
    assert.ok(CO.stageTarget(30, 5, false) > CO.stageTarget(30, 1, false), "学年が上がるほど速く答える前提");
    assert.strictEqual(CO.capOf(310, 30), 23); assert.strictEqual(CO.capOf(10, 1), 22); assert.ok(CO.capOf(10, 60) >= 8);
  });
  await t("目標に届く見込み：模擬の児童（正答率 0.5／0.7／0.9）でふつうは約8割・やさしいは高い・どの人数でも終わる", () => {
    const rate = (N, g, easy, acc, seed) => {      // 1ステージの問題タイムに、目標に届くまでの時間。cap（60秒）を超えたら「届かなかった」
      const r = rng(seed), E = room(N, { easy, g }), p = g <= 2 ? 4 : g <= 4 ? 5.5 : 6.5; let reached = false;
      const next = Array.from({ length: N }, () => 3000 + r() * 60000 / p);
      const t0 = 3000; let now = t0, to = 3000 + (easy ? 55000 : 50000);
      for (; now <= to; now += 250) {
        E.tick(now);
        if (E.ph !== "play") { reached = now - t0 <= to - t0; break; }
        for (let i = 0; i < N; i++) if (now >= next[i]) { const ok = r() < acc; ans(E, "p" + i, ok, now); next[i] = now + 60000 / p * (.7 + .6 * r()) + (ok ? 1200 : 2500); }
      }
      return E.ph !== "play" && now <= to;
    };
    const table = {};
    for (const [N, g] of [[1, 3], [5, 3], [30, 3], [60, 5], [28, 1]]) for (const easy of [false, true]) for (const acc of [.5, .7, .9]) {
      let ok = 0; const R = 30; for (let s = 0; s < R; s++) if (rate(N, g, easy, acc, 100 + s)) ok++;
      table[`${N}人/${g}年/${easy ? "やさしい" : "ふつう"}/正答率${acc}`] = Math.round(ok / R * 100);
    }
    console.log("    基本時間内に届いた割合(%):", JSON.stringify(table));
    // 大きな人数では 正答率0.7で約8割以上（ふつう）。やさしいは さらに高い。小さな人数は時間切れでも次へ進む（止まらない）
    for (const [N, g] of [[30, 3], [60, 5]]) { assert.ok(table[`${N}人/${g}年/ふつう/正答率0.7`] >= 60, `${N}人 ふつう0.7: ${table[`${N}人/${g}年/ふつう/正答率0.7`]}`); assert.ok(table[`${N}人/${g}年/やさしい/正答率0.7`] >= table[`${N}人/${g}年/ふつう/正答率0.7`]); }
    assert.ok(table["30人/3年/ふつう/正答率0.9"] >= table["30人/3年/ふつう/正答率0.5"], "正答率が高いほど届く");
    assert.ok(table["28人/1年/やさしい/正答率0.7"] >= 60, "1年のやさしい");
  });

  /* ---------- 燃料 ---------- */
  await t("燃料：正解 +5・答えたら +1（まちがいも）・時間の外は数えない", () => {
    const E = room(10, {}); const G = E.G;
    let r = ans(E, "p0", true, 4000); assert.deepStrictEqual(r.slice(0, 2), [200, { ok: true, fp: 5, cap: false }]);
    r = ans(E, "p1", false, 4000); assert.strictEqual(r[1].fp, 1);
    assert.strictEqual(E.fp, 6);
    const E2 = CO.engine({}); E2.add("a"); E2.begin(0);
    r = ans(E2, "a", true, 1000); assert.strictEqual(r[1].late, true, "カウントダウン中は数えない"); assert.strictEqual(E2.fp, 0);
    assert.ok(G > 0);
  });
  await t("ブースト：1人1回・+2・6割で「そろった！」+10%", () => {
    const E = room(10, {}), G = E.G;
    assert.strictEqual(E.act("p0", "boost", {}, 4000)[1].fp, 2);
    assert.strictEqual(E.act("p0", "boost", {}, 4100)[0], 409, "2回目は不可");
    for (let i = 1; i < 6; i++) E.act("p" + i, "boost", {}, 4200);
    assert.strictEqual(E.pub(4300).ev.t, "bo", "6人（6割）でそろった");
    assert.ok(Math.abs(E.fp - (12 + G * .1)) < 1e-6, "2×6＋目標の10%: " + E.fp);
    const E1 = room(1, {}); E1.act("p0", "boost", {}, 4000); assert.strictEqual(E1.bonus, 1, "1人でもそろう");
  });
  await t("1人の上限：強い子ひとりで背負わない（全体の ~2.2/人数）。上限を超えた分は数えず cap:true", () => {
    const E = room(30, {}), cap = E.capF; let t = 4000, capped = 0;
    for (let i = 0; i < 12; i++, t += 1300) { const r = ans(E, "p0", true, t); if (r[1].cap) capped++; if (E.ph !== "play") break; }
    const p0 = E.P.get("p0");
    assert.ok(p0.f <= cap, `上限 ${cap} を超えない: ${p0.f}`);
    assert.ok(capped >= 1, "上限に達したら cap:true");
    assert.ok(cap / E.G <= 2.4 / 30 + 0.01, `全体の ${(cap / E.G * 100).toFixed(1)}% まで`);
    // 次のステージではまた貢献できる
    const E5 = room(2, {}); for (let i = 0; i < 40 && E5.ph === "play"; i++) ans(E5, "p0", true, 4000 + i * 1300);
    assert.strictEqual(E5.ph, "mini", "ひとりでも2人目の分を足さず、もう一人が足りないうちは…しかし時間切れで次へ");
  });
  await t("連打・不正：連番の巻きもどし・速すぎ・1分12回・型・存在しない子・使えない操作", () => {
    const E = room(5, {});
    assert.strictEqual(E.act("zzz", "cans", { ok: true, k: 1 }, 4000)[0], 403);
    assert.strictEqual(E.act("p0", "add", { n: 50 }, 4000)[0], 403, "chest の操作は使えない");
    assert.strictEqual(E.act("p0", "cans", { ok: "true", k: 1 }, 4000)[0], 400, "ok は真偽値だけ");
    assert.strictEqual(E.act("p0", "cans", { ok: true, k: 0 }, 4000)[0], 409); assert.strictEqual(E.act("p0", "cans", { ok: true, k: 1.5 }, 4000)[0], 409);
    assert.strictEqual(E.act("p0", "cans", { ok: true, k: "1" }, 4000)[0], 409); assert.strictEqual(E.act("p0", "cans", null, 4000)[0], 400);
    assert.strictEqual(E.act("p0", "cans", { ok: true, k: 1 }, 4000)[0], 200);
    assert.strictEqual(E.act("p0", "cans", { ok: true, k: 1 }, 6000)[0], 409, "同じ連番のくり返しは受けない");
    assert.strictEqual(E.act("p0", "cans", { ok: true, k: 2 }, 4300)[0], 429, "正解のあと1.1秒はあける");
    assert.strictEqual(E.act("p0", "cans", { ok: false, k: 3 }, 5200)[0], 200);
    assert.strictEqual(E.act("p0", "cans", { ok: true, k: 4 }, 6500)[0], 429, "まちがいのあと2.4秒はあける");
    // 1分に12回
    const F = room(30, {}); let c200 = 0, c429 = 0;
    for (let i = 0; i < 20; i++) { const r = F.act("p0", "cans", { ok: true, k: i + 1 }, 4000 + i * 1200); if (r[0] === 200) c200++; else if (r[0] === 429) c429++; if (F.ph !== "play") break; }
    assert.ok(c200 <= 12 && (c429 >= 1 || F.ph !== "play"), `${c200}/${c429}`);
  });

  /* ---------- 段階 ---------- */
  function toMini(E, start) { let t = start; for (let i = 0; i < 400 && E.ph === "play"; i++) { for (const [pid] of E.P) ans(E, pid, true, t); t += 1300; E.tick(t); } return t; }
  await t("目標に届くとミニゲーム（全員同時）。時間切れでも ミニゲームへ進む（止まらない）", () => {
    const E = room(4, {}); const t1 = toMini(E, 4000);
    assert.strictEqual(E.ph, "mini"); assert.strictEqual(E.m.k, "sy"); assert.strictEqual(E.pub(t1).mg.a, 1);
    const F = room(30, {}); const tt = run(F, 3000, 3000 + 61000, 250);
    assert.strictEqual(F.ph, "mini", "誰も答えなくても 時間切れで次へ（cap 60秒）");
    const W = room(30, { easy: true }); run(W, 3000, 3000 + 33000 + 100, 250); assert.strictEqual(W.wind, 1, "おいかぜ：時間の6割で45%未満"); assert.strictEqual(W.pub(30200).wd, 1);
  });
  await t("せーので はっしゃ：1の前後0.6秒に押した子の割合で判定・1ラウンド1回・2回目の救済", () => {
    const E = room(10, {}); toMini(E, 4000); const m = E.m, S = m.s;
    assert.strictEqual(m.t0.length, 3); assert.strictEqual(m.t0[0], S + CO.SY.LEAD); assert.strictEqual(m.need, 6, "10人の6割");
    const hit = (pid, r, d, now) => E.act(pid, "mini", { at: m.t0[r] + d }, now);
    assert.strictEqual(hit("p0", 0, 500, S + 4500)[1].hit, true); assert.strictEqual(hit("p1", 0, -590, S + 4400)[1].hit, true);
    assert.strictEqual(hit("p2", 0, 700, S + 4700)[1].hit, false, "0.7秒ずれは外れ（本人にも失敗とは出さない）");
    assert.strictEqual(hit("p2", 0, 0, S + 4000)[1].dup, true, "同じラウンドの2回目は無効");
    assert.strictEqual(hit("p2", 1, 100, S + 9100)[1].hit, true, "次のラウンドで取りもどせる");
    assert.strictEqual(hit("p0", 1, 0, S + 9000)[1].hit, true); assert.strictEqual(E.m.hits, 3, "同じ子は1人と数える");
    assert.strictEqual(E.act("p5", "mini", { at: S + 99999 }, S + 4000)[0], 400, "遠い時刻は受けない");
    assert.strictEqual(E.act("p5", "mini", { at: "x" }, S + 4000)[0], 400); assert.strictEqual(E.act("p5", "mini", { at: NaN }, S + 4000)[0], 400);
    assert.strictEqual(E.act("p5", "mini", { at: S + 100 }, S + 100)[1].hit, false, "ラウンドから遠い押しは数えない");
    // 失敗 → もういちど → 2回目は ゆるめて必ず進む
    run(E, S + 4000, S + 10500, 250);
    assert.strictEqual(E.ph, "again", "3人（6人に足りない）→ もういちど"); assert.strictEqual(E.st, 0); assert.strictEqual(E.pub(0).ev.t, "again");
    run(E, E.pe, E.pe + 100, 250); assert.strictEqual(E.ph, "mini"); assert.strictEqual(E.m.a, 2); assert.strictEqual(E.m.win, 1200); assert.strictEqual(E.m.need, 3, "10人の25%（ゆるめ）");
    const end2 = run(E, E.m.s, E.m.e + 100, 250); assert.strictEqual(E.ph, "clear", "2回目は、だれも押さなくても進む"); assert.strictEqual(E.st, 1);
  });
  await t("せーので：クラスの割合に届くと早く終わる／1人でもできる", () => {
    const E = room(1, {}); toMini(E, 4000); const m = E.m;
    assert.strictEqual(m.need, 1); E.act("p0", "mini", { at: m.t0[0] + 100 }, m.t0[0] + 100); run(E, m.t0[0] + 100, m.t0[0] + 2000, 250);
    assert.strictEqual(E.ph, "clear", "届いたら次のステージへ（最後のラウンドを待たない）");
  });
  await t("ほしを あつめよう：全員の合計・1人の上限・早く終われる・2回目は半分でも進む", () => {
    const E = room(10, {}); E.sg = 1; toMini(E, 4000); const m = E.m;
    assert.strictEqual(m.k, "st"); assert.strictEqual(m.target, 40); assert.strictEqual(m.cap, 10, "平均の2.5倍");
    let now = m.s + 3500, got = 0;
    for (let i = 0; i < 30; i++, now += 200) { const r = E.act("p0", "mini", { n: 5 }, now); got += r[1].n; }
    assert.strictEqual(got, 10, "連打しても1人10こまで"); assert.ok(E.m.total === 10);
    assert.strictEqual(E.act("p1", "mini", { n: 9 }, now)[0], 400); assert.strictEqual(E.act("p1", "mini", { n: 0 }, now)[0], 400); assert.strictEqual(E.act("p1", "mini", { n: 1.5 }, now)[0], 400);
    assert.strictEqual(E.act("p1", "mini", { n: 1 }, now + 5)[0], 200); assert.strictEqual(E.act("p1", "mini", { n: 1 }, now + 6)[0], 429, "150ms以内は受けない");
    for (let i = 1; i < 10; i++) { for (let k = 0; k < 5; k++) E.act("p" + i, "mini", { n: 3 }, now + 200 * (k + 1)); }
    now += 1500; run(E, now, now + 2000, 250);
    assert.strictEqual(E.ph, "clear", "合計が届いたら早く終わる（最短5秒のあと）");
    // 失敗 → 2回目は半分
    const F = room(10, {}); F.sg = 1; toMini(F, 4000); run(F, F.m.s, F.m.e + 100, 250); assert.strictEqual(F.ph, "again");
    run(F, F.pe, F.pe + 100, 250); assert.strictEqual(F.m.target, 20, "2回目は半分");
    run(F, F.m.s, F.m.e + 100, 250); assert.strictEqual(F.ph, "clear", "足りなくても進む");
  });
  await t("5ステージを最後まで：クリア → 次のステージ → 5つで終了。止まらない（全員が何もしなくても終わる）", () => {
    const E = room(6, {}); let now = 3000, stages = [];
    for (let guard = 0; guard < 4000 && E.ph !== "end"; guard++) {
      now += 250; const before = E.ph + E.sg;
      if (E.ph === "play") for (const [pid] of E.P) if (E.P.get(pid).lastAt + 1500 < now) ans(E, pid, true, now);
      if (E.ph === "mini" && E.m.k === "sy") for (const [pid] of E.P) E.act(pid, "mini", { at: E.m.t0[0] }, E.m.t0[0] > now ? now : now);
      if (E.ph === "mini" && E.m.k === "st") for (const [pid] of E.P) E.act(pid, "mini", { n: 5 }, now);
      E.tick(now); if (E.ph + E.sg !== before) stages.push(E.ph + E.sg);
    }
    assert.strictEqual(E.ph, "end"); assert.strictEqual(E.pub(now).res.st, 5); assert.strictEqual(E.st, 5);
    assert.deepStrictEqual(CO.KINDS, ["sy", "st", "sy", "st", "sy"]);
    assert.ok(now < 3000 + 5 * (65000 + 30000), "5分前後で終わる " + now);
    // だれも何もしない部屋
    const Z = room(5, {}); const tEnd = run(Z, 3000, 20 * 60000, 250); assert.strictEqual(Z.ph, "end"); assert.ok(Z.st >= 1);
    const Z2 = room(5, {}); run(Z2, 3000, 3000 + 5 * 60000, 250); console.log(`    だれも答えない部屋：${Math.round((Z2.ph === "end" ? Z2.pe : 5 * 60000) / 1000)}秒で ${Z2.st}ステージ`);
    // 先生が「ここで おわる」
    const Y = room(3, {}); Y.finish(9000); assert.strictEqual(Y.ph, "end"); assert.strictEqual(Y.pub(9000).res.st, 0);
  });
  await t("co 状態の大きさ：すべての段階で 700バイト以下（先生用の吹き出し bb を入れても）", () => {
    const E = room(60, { g: 4 }); let mx = 0, where = "";
    const chk = (now, host) => { const s = size(E.pub(now, host)); if (s > mx) { mx = s; where = E.ph + ":" + JSON.stringify(E.pub(now, host)); } assert.ok(s <= 700, s + " " + where); };
    chk(0, true); let now = 3000;
    for (let guard = 0; guard < 6000 && E.ph !== "end"; guard++) {
      now += 250;
      if (E.ph === "play") for (let i = 0; i < 60; i += 7) ans(E, "p" + (i + guard) % 60, true, now);
      if (E.ph === "mini" && E.m.k === "sy") for (let i = 0; i < 60; i++) E.act("p" + i, "mini", { at: E.m.t0[0] }, now);
      if (E.ph === "mini" && E.m.k === "st") for (let i = 0; i < 60; i++) E.act("p" + i, "mini", { n: 5 }, now);
      E.tick(now); chk(now, true); chk(now, false);
    }
    assert.strictEqual(E.ph, "end"); console.log("    いちばん大きい co: " + mx + " バイト");
    assert.ok(!("bb" in E.pub(now + 100000, true)), "古い吹き出しは送らない");
  });
  await t("クリーン関数：通信で来た co は型と範囲を調べる", () => {
    const E = room(3, {}); const co = E.pub(4000, true);
    assert.strictEqual(CO.clean(co).ph, "play"); assert.strictEqual(CO.clean(null), null); assert.strictEqual(CO.clean({ k: "x" }), null);
    assert.strictEqual(CO.clean({ ...co, sg: 9 }), null); assert.strictEqual(CO.clean({ ...co, ph: "zzz" }), null); assert.strictEqual(CO.clean({ ...co, ph: "mini" }), null);
    assert.strictEqual(CO.clean({ ...co, p: 999 }).p, 0); assert.strictEqual(CO.clean({ ...co, n: "3" }).n, 0);
    assert.deepStrictEqual(CO.clean({ ...co, bb: { i: 1, l: [[1, 1], [2, 9], "x", [3, 2]] } }).bb.l, [[1, 1], [3, 2]]);
  });

  /* ---------- 吹き出し ---------- */
  await t("名前の吹き出し：良いことだけ・1秒に最大2・同じ子は20秒に1回・まだ出ていない子を優先・全員に回る", () => {
    const E = room(60, { g: 4 }); const r = rng(11); let now = 3000; const shown = new Map(), times = []; let wrongBubble = 0, lastId = 0;
    const next = Array.from({ length: 60 }, (_, i) => 3000 + r() * 8000), speed = Array.from({ length: 60 }, (_, i) => i < 6 ? 0.4 : 1);   // 6人はとても速い子
    for (let guard = 0; guard < 8000 && E.ph !== "end"; guard++) {
      now += 250;
      if (E.ph === "play") for (let i = 0; i < 60; i++) if (now >= next[i]) { const ok = r() < .7; ans(E, "p" + i, ok, now); next[i] = now + 11000 * speed[i] * (.7 + .6 * r()); }
      if (E.ph === "mini" && E.m.k === "sy") for (let i = 0; i < 60; i++) if (r() < .2) E.act("p" + i, "mini", { at: E.m.t0[0] + (r() - .5) * 800 }, now);
      if (E.ph === "mini" && E.m.k === "st") for (let i = 0; i < 60; i++) if (r() < .3) E.act("p" + i, "mini", { n: 1 + (r() * 3 | 0) }, now);
      E.tick(now);
      const pb = E.pub(now, true); if (pb.bb && pb.bb.i !== lastId) { lastId = pb.bb.i; assert.ok(pb.bb.l.length <= 2); times.push(now); for (const [ix, kind] of pb.bb.l) { assert.ok(kind >= 1 && kind <= 3, "良いこと（正解・ブースト・ミニゲーム）だけ"); shown.set(ix, (shown.get(ix) || 0) + 1); } }
    }
    for (let i = 1; i < times.length; i++) assert.ok(times[i] - times[i - 1] >= 1000, "1秒に1回まで（1回に最大2つ）");
    assert.ok(shown.size >= 54, `全員の9割以上に回った: ${shown.size}/60`);
    const fast = [...shown].filter(([ix]) => ix < 6).reduce((a, [, c]) => a + c, 0), all = [...shown.values()].reduce((a, c) => a + c, 0);
    assert.ok(fast / all < 0.2, `速い6人（10%）に偏らない: ${(fast / all * 100).toFixed(0)}%`);
    console.log(`    60人：吹き出しが出た人 ${shown.size}/60・合計 ${all} 回`);
  });

  /* ---------- 2) 60人の送受信シミュレーション ---------- */
  await t("60人×5分のシミュレーション：1秒あたりの通信量・act の数・先生の端末の処理時間", () => {
    const E = room(60, { g: 4 }); const r = rng(5); let now = 3000, acts = 0, maxPlay = 0, maxMini = 0, secPlay = 0, secMini = 0, sec = 0, bytes = 0, bcast = 0, maxSize = 0;
    const next = Array.from({ length: 60 }, () => 3000 + r() * 9000); const t0 = process.hrtime.bigint();
    let lastB = 0;
    for (let guard = 0; guard < 8000 && E.ph !== "end"; guard++) {
      now += 50;      // 50ms ごとに処理
      if (E.ph === "play") { for (let i = 0; i < 60; i++) if (now >= next[i]) { ans(E, "p" + i, r() < .7, now); acts++; secPlay++; next[i] = now + 9000 + r() * 4000; } }
      else for (let i = 0; i < 60; i++) if (now >= next[i]) next[i] = now + r() * 9000;      // 問題タイムでないあいだに 次の問題へ向かう（ステージの頭に全員が同時に答えない）
      if (E.ph === "mini" && E.m.k === "sy") for (let i = 0; i < 60; i++) if (r() < .01) { E.act("p" + i, "mini", { at: E.m.t0[0] + (r() - .5) * 600 }, now); acts++; secMini++; }
      if (E.ph === "mini" && E.m.k === "st") for (let i = 0; i < 60; i++) if (r() < .125) { E.act("p" + i, "mini", { n: 1 }, now); acts++; secMini++; }   // 児童の端末は 約400ms ごとにまとめて送る
      if (now % 250 === 0 || now % 250 === 200) E.tick(now - now % 50);
      if (now - lastB >= 250) { lastB = now; const kid = { code: "1234", mode: "rocket", game: "calc", g: 4, t: 300, rule: "normal", nm: "input", status: "playing", closed: false, endAt: 0, now, gt: "", co: E.pub(now, false), players: [], me: "ゆうとゆうと" };
        const s = size(kid); bytes += s * 60; bcast++; if (s > maxSize) maxSize = s; }
      if (Math.floor(now / 1000) !== sec) { sec = Math.floor(now / 1000); maxPlay = Math.max(maxPlay, secPlay); maxMini = Math.max(maxMini, secMini); secPlay = secMini = 0; }
    }
    const cpu = Number(process.hrtime.bigint() - t0) / 1e6, dur = (now - 3000) / 1000;
    assert.strictEqual(E.ph, "end", "60人でも最後まで通る");
    const kbs = bytes / 1024 / dur;
    console.log(`    ゲーム ${dur.toFixed(0)}秒・5ステージ→${E.st}・児童への1回の状態 最大 ${maxSize}B・全員への送信 平均 ${kbs.toFixed(0)} KB/秒（約${(kbs * 8 / 1024).toFixed(1)} Mbps）・act 最大 問題タイム ${maxPlay}回/秒・ミニゲーム ${maxMini}回/秒・処理 ${cpu.toFixed(0)}ms`);
    assert.ok(maxSize <= 900 && kbs < 250, "通信量"); assert.ok(maxPlay <= 40 && maxMini <= 200, "actは問題タイム1秒に40回以下・ミニゲーム200回以下"); assert.ok(cpu < 3000, "先生の端末の処理は軽い");
    assert.ok(Math.abs(bcast / dur - 4) < .3, "1秒に4回: " + bcast / dur);
  });

  /* ---------- 学習の密度（4周目）：ミニゲームは1回12秒以内・みじかい3ステージ・クラスの解答数 ---------- */
  await t("ミニゲームは1回12秒以内（せーので・ほし、2回目も）", () => {
    assert.ok(CO.SY.LEAD + (CO.SY.ROUNDS - 1) * CO.SY.GAP + CO.SY.TAIL <= 12000, "せーので");
    assert.ok(CO.ST.LEAD + CO.ST.DUR <= 12000, "ほし");
    for (const [sg, att] of [[0, 1], [1, 1], [0, 2], [1, 2]]) for (const N of [1, 10, 30]) {
      const E = room(N, { g: 3 }); E.sg = sg; toMini(E, 4000); if (att === 2) { run(E, E.m.s, E.m.e + 100, 250); run(E, E.pe, E.pe + 100, 250); }
      assert.strictEqual(E.m.a, att); const len = E.m.e - E.m.s; assert.ok(len <= 12000, `ステージ${sg + 1} ${att}回目 ${N}人: ${len}ms`);
    }
  });
  await t("みじかい（3ステージ）：3つで終わる・状態に ns・ミニゲームは せーの→ほし→せーの・終了画面用に クラスの解答数 an", () => {
    const E = room(6, { stages: 3 }); assert.strictEqual(E.pub(3000).ns, 3); assert.strictEqual(CO.clean(E.pub(3000)).ns, 3);
    assert.strictEqual(room(6, {}).pub(3000).ns, 5, "ふつうは5"); assert.strictEqual(room(6, { stages: 4 }).pub(3000).ns, 5, "3以外は5"); assert.strictEqual(CO.clean({ ...E.pub(3000), ns: 9 }).ns, 5);
    let now = 3000, kinds = [], acc = 0;
    for (let guard = 0; guard < 4000 && E.ph !== "end"; guard++) {
      now += 250;
      if (E.ph === "play") for (const [pid] of E.P) if (E.P.get(pid).lastAt + 1500 < now) { const r = ans(E, pid, true, now); if (r[0] === 200 && !r[1].late) acc++; }
      if (E.ph === "mini" && (!kinds.length || kinds[kinds.length - 1] !== E.m.k + E.sg)) kinds.push(E.m.k + E.sg);
      if (E.ph === "mini" && E.m.k === "sy") for (const [pid] of E.P) E.act(pid, "mini", { at: E.m.t0[0] }, now);
      if (E.ph === "mini" && E.m.k === "st") for (const [pid] of E.P) E.act(pid, "mini", { n: 5 }, now);
      E.tick(now);
    }
    assert.strictEqual(E.ph, "end"); assert.strictEqual(E.st, 3); assert.strictEqual(E.pub(now).res.st, 3); assert.deepStrictEqual(kinds, ["sy0", "st1", "sy2"]);
    assert.ok(now < 3000 + 3 * 80000, "3ステージは約3分 " + now);
    const res = E.pub(now).res; assert.strictEqual(res.an, acc, "クラスの解答数"); assert.ok(res.an > 0); assert.strictEqual(CO.clean(E.pub(now)).res.an, acc);
    const Z = room(4, { stages: 3 }); run(Z, 3000, 20 * 60000, 250); assert.strictEqual(Z.ph, "end", "だれも答えなくても終わる"); assert.strictEqual(Z.pub(1).res.an, 0);
  });
  await t("クラスの解答数：30人のシミュレーションで、1人あたりの解答数が同じ時間のたからばこの7割以上（ふつう・みじかい／2・4・6年）", () => {
    const rows = [];
    for (const stages of [5, 3]) for (const g of [2, 4, 6]) {
      let rk = 0, ch = 0; const R = 4, N = 30;
      for (let seed = 0; seed < R; seed++) {
        const r = rng(900 + seed * 7 + g), E = room(N, { g, stages }), p = g <= 2 ? 4 : g <= 4 ? 5.5 : 6.5, acc = .7;
        const think = () => 60000 / p * (.7 + .6 * r());                         // 1問を考える時間（たからばこの1分あたり p 問と同じ速さ）
        const next = Array.from({ length: N }, () => 3000 + think()); let now = 3000, was = "count";
        for (let guard = 0; guard < 8000 && E.ph !== "end"; guard++) {
          now += 250; E.tick(now);
          if (E.ph === "mini") {      // ミニゲームにも ふつうに参加する（せーのは 1の前後0.3秒、ほしは 1秒に約5こ）
            if (E.m.k === "sy") for (let i = 0; i < N; i++) for (let k = 0; k < 3; k++) { const at = E.m.t0[k] + (r() - .5) * 600; if (now >= at && now < at + 250) E.act("p" + i, "mini", { at }, now); }
            else if (now >= E.m.s + CO.ST.LEAD) for (let i = 0; i < N; i++) if (r() < .2) E.act("p" + i, "mini", { n: 1 }, now);
          }
          if (E.ph !== "play") { was = E.ph; continue; }
          if (was !== "play") { was = "play"; for (let i = 0; i < N; i++) next[i] = now + think(); }      // 新しいステージの問題が出た
          for (let i = 0; i < N; i++) if (now >= next[i]) { const ok = r() < acc; ans(E, "p" + i, ok, now); next[i] = now + think() + (ok ? 1200 : 2500); }
        }
        assert.strictEqual(E.ph, "end"); const D = now - 3000;
        rk += E.pub(now).res.an / N;
        const r2 = rng(900 + seed * 7 + g); let c = 0; for (let i = 0; i < N; i++) { let tt = 0; for (;;) { const ok = r2() < acc; tt += 60000 / p * (.7 + .6 * r2()) + (ok ? 1200 : 2500); if (tt > D) break; c++; } } ch += c / N;      // たからばこ：同じ時間 D、同じ速さ
      }
      rk /= R; ch /= R; rows.push(`${stages}ステージ/${g}年 ${rk.toFixed(1)}/${ch.toFixed(1)}=${Math.round(rk / ch * 100)}%`);
      assert.ok(rk / ch >= .7, `${stages}ステージ ${g}年: ロケット ${rk.toFixed(1)}問／たからばこ ${ch.toFixed(1)}問 = ${(rk / ch * 100).toFixed(0)}%`);
    }
    console.log("    1人あたりの解答数 ロケット／たからばこ（同じ時間）:", rows.join("  "));
  });

  /* ---------- 3) server.js ---------- */
  const PORT = 20000 + Math.floor(Math.random() * 20000), SC = 0.05;
  const srv = spawn(process.execPath, [path.join(__dirname, "..", "server.js")], { env: { ...process.env, PORT: String(PORT), JOIN_RATE_SCALE: "1000", COOP_TIME_SCALE: String(SC) }, stdio: "ignore" });
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const post = async (name, body) => { const r = await fetch(`http://127.0.0.1:${PORT}/api/${name}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); return { s: r.status, j: await r.json().catch(() => ({})) }; };
  const events = async (code, who) => { const ac = new AbortController(), r = await fetch(`http://127.0.0.1:${PORT}/api/events`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, ...who }), signal: ac.signal });
    const o = { msgs: [], bytes: 0, stop() { ac.abort(); } }; (async () => { const rd = r.body.getReader(), dec = new TextDecoder(); let buf = ""; try { for (;;) { const { value, done } = await rd.read(); if (done) break; buf += dec.decode(value, { stream: true }); let i; while ((i = buf.indexOf("\n\n")) >= 0) { const ev = buf.slice(0, i); buf = buf.slice(i + 2); const d = ev.split("\n").find(l => l.startsWith("data: ")); if (d) { o.bytes += d.length; o.msgs.push(JSON.parse(d.slice(6))); } } } } catch (e) {} })(); return o; };
  for (let i = 0; i < 30; i++) { try { await fetch(`http://127.0.0.1:${PORT}/`); break; } catch (e) { await sleep(100); } }
  const mk = async (N, extra) => { const r = (await post("create", { mode: "rocket", game: "calc", g: 3, t: 120, rule: "normal", nm: "input", ...extra })).j; const ps = []; for (let i = 0; i < N; i++) ps.push((await post("join", { code: r.code, name: "こ" + String.fromCharCode(0x3042 + i % 40) + (i >= 40 ? "x" : "") })).j); return { r, ps }; };
  const act = (code, p, op, body) => post("act", { code, pid: p.pid, token: p.token, op, ...body });
  await t("server.js：ロケットの部屋の作成と入力の検証", async () => {
    assert.strictEqual((await post("create", { mode: "rocket", game: "zzz", g: 3 })).s, 400);
    assert.strictEqual((await post("create", { mode: "rocket", game: "mine", g: 3, qs: [{ t: "tf", q: "a", ch: ["○", "×"], ok: [0] }] })).s, 400, "○×だけの先生セットは使えない");
    const { r, ps } = await mk(3, {}); assert.strictEqual(r.nm, "input"); assert.strictEqual(ps.length, 3);
    const m = await post("create", { mode: "rocket", game: "mine", g: 3, gt: "せっと", qs: [{ t: "mc", q: "1+1は？", ch: ["1", "2", "3"], ok: [1], sec: 10, pt: "normal" }] }); assert.strictEqual(m.s, 200, "先生のもんだい（4択）でも作れる");
    const p = (await post("join", { code: m.j.code, name: "あ" })).j; assert.strictEqual((await post("set", { code: m.j.code, pid: p.pid, token: p.token })).s, 200, "児童は先生のもんだいを受け取れる");
  });
  await t("server.js：権限・名前を送らない・開始後は入れない・操作の検証", async () => {
    const { r, ps } = await mk(3, {}); const [a, b, c] = ps;
    assert.strictEqual((await act(r.code, a, "cans", { ok: true, k: 1 })).s, 409, "始まる前は使えない");
    assert.strictEqual((await post("start", { code: r.code, hostKey: "bad" })).s, 403); assert.strictEqual((await post("start", { code: r.code, hostKey: a.token })).s, 403);
    const hostEv = await events(r.code, { hostKey: r.hostKey }), kidEv = await events(r.code, { pid: a.pid, token: a.token });
    assert.strictEqual((await post("start", { code: r.code, hostKey: r.hostKey })).s, 200);
    assert.strictEqual((await post("join", { code: r.code, name: "おそい" })).s, 409, "始まってからは入れない");
    await sleep(SC * 3000 + 400);
    for (const [pid, tk] of [[a.pid, "bad"]]) assert.strictEqual((await post("act", { code: r.code, pid, token: tk, op: "cans", ok: true, k: 1 })).s, 403);
    for (const op of ["add", "move", "qans", "answer", "x2", "steal", "zzz", ""]) assert.strictEqual((await act(r.code, a, op, { ok: true, k: 1, right: true, n: 5 })).s, 403, op);
    assert.strictEqual((await act(r.code, a, "cans", { ok: "yes", k: 1 })).s, 400);
    assert.strictEqual((await act(r.code, a, "cans", { ok: true, k: -4 })).s, 409);
    const first = await act(r.code, a, "cans", { ok: true, k: 1 }); assert.strictEqual(first.s, 200); assert.strictEqual(first.j.fp, 5);
    assert.strictEqual((await act(r.code, a, "cans", { ok: true, k: 1 })).s, 409, "同じ連番は受けない");
    assert.strictEqual((await post("end", { code: r.code, hostKey: a.token })).s, 403, "児童は終われない");
    await sleep(500);
    const kid = kidEv.msgs[kidEv.msgs.length - 1], host = hostEv.msgs[hostEv.msgs.length - 1];
    assert.strictEqual(kid.mode, "rocket"); assert.ok(kid.co && kid.co.k === "rk"); assert.deepStrictEqual(kid.players, [], "対戦中は人の一覧を送らない"); assert.strictEqual(typeof kid.me, "string");
    const txt = JSON.stringify(kidEv.msgs); for (const q of ps) assert.ok(!txt.includes(q.token), "token を送らない"); assert.ok(!("bb" in kid.co), "吹き出しは児童に送らない");
    assert.ok(host.players.length === 3 && host.players.every(p => p.name && "ix" in p), "先生には名前つきの一覧（吹き出し用）");
    assert.ok(!kidEv.msgs.some(m => (m.players || []).some(p => p.name)), "児童には他の子の名前を送らない");
    assert.ok(hostEv.msgs.some(m => m.co && m.co.bb), "先生には吹き出しが届く");
    assert.strictEqual((await post("kick", { code: r.code, hostKey: r.hostKey, pid: c.pid })).s, 200);
    assert.strictEqual((await act(r.code, c, "cans", { ok: true, k: 2 })).s, 403, "へやから出された子は操作できない");
    hostEv.stop(); kidEv.stop();
  });
  await t("server.js：最後まで通る（せーのの時刻は先生の時計、ほしは合計、1人の上限）", async () => {
    const { r, ps } = await mk(3, {}); const host = await events(r.code, { hostKey: r.hostKey });
    await post("start", { code: r.code, hostKey: r.hostKey });
    const last = () => host.msgs[host.msgs.length - 1].co; let k = 0; const stagesSeen = new Set(); const t0 = Date.now(); let sentSy = new Set(), starSent = 0, capSeen = false;
    while (Date.now() - t0 < 60000) {
      const co = last(); if (!co) { await sleep(50); continue; } stagesSeen.add(co.st);
      if (co.ph === "end") break;
      if (co.ph === "play") { k++; for (const p of ps) { const rr = await act(r.code, p, "cans", { ok: true, k }); if (rr.j.cap) capSeen = true; } await sleep(SC * 1200 + 30); }
      else if (co.ph === "mini" && co.mg.k === "sy") { const t1 = co.mg.s + CO.SY.LEAD * SC; for (let i = 0; i < 3; i++) { const tt = t1 + i * CO.SY.GAP * SC; if (!sentSy.has(co.mg.s + ":" + i)) { sentSy.add(co.mg.s + ":" + i); while (Date.now() < tt) await sleep(5); for (const p of ps) await act(r.code, p, "mini", { at: Date.now() }); } } await sleep(100); }
      else if (co.ph === "mini") { for (const p of ps) { const rr = await act(r.code, p, "mini", { n: 5 }); starSent++; } await sleep(SC * 200 + 20); }
      else await sleep(60);
    }
    assert.strictEqual(last().ph, "end", "最後まで"); assert.strictEqual(last().res.st, 5);
    const fin = host.msgs[host.msgs.length - 1]; assert.strictEqual(fin.status, "ended");
    assert.ok([...stagesSeen].every(s => s >= 0 && s <= 5));
    host.stop();
  });
  await t("server.js：60人が入って全員が答える（状態の大きさ・1秒に約4回・名前を送らない）", async () => {
    const { r, ps } = await mk(60, {}); assert.strictEqual(ps.length, 60);
    assert.strictEqual((await post("join", { code: r.code, name: "61" })).s, 409, "61人目は入れない");
    const kidEv = await events(r.code, { pid: ps[7].pid, token: ps[7].token }); await sleep(100);
    const lob = kidEv.msgs[0]; assert.ok(lob.players.length === 60 && lob.players.every(p => p.name === ""), "待合室でも 他の子の名前は送らない");
    await post("start", { code: r.code, hostKey: r.hostKey }); await sleep(SC * 3000 + 100);
    const m0 = kidEv.msgs.length, b0 = kidEv.bytes, t0 = Date.now(); let k = 0, acts = 0;
    while (Date.now() - t0 < 4000) { k++; await Promise.all(ps.map(p => act(r.code, p, "cans", { ok: true, k }).then(() => acts++))); await sleep(40); }
    const dt = (Date.now() - t0) / 1000, msgs = kidEv.msgs.slice(m0), perSec = msgs.length / dt, max = Math.max(...msgs.map(m => JSON.stringify(m).length)), maxCo = Math.max(...msgs.map(m => JSON.stringify(m.co).length));
    console.log(`    60人・時間を ${1 / SC}倍速：児童1人あたり ${perSec.toFixed(1)} 回/秒・1回 最大 ${max}B（co ${maxCo}B）・act ${(acts / dt).toFixed(0)} 回/秒`);
    assert.ok(maxCo <= 700, "co は700バイト以下 " + maxCo); assert.ok(max <= 1000, "1回の状態 " + max);
    assert.ok(perSec <= 8, "混んでいても 1秒に4回前後（フェーズ変化の即時送信をふくめて） " + perSec);
    assert.ok(msgs.every(m => m.players.length === 0 && !m.co.bb), "対戦中は一覧なし・吹き出しなし");
    kidEv.stop(); await post("end", { code: r.code, hostKey: r.hostKey });
  });
  try { srv.kill(); } catch (e) {}
  console.log(`\n${n} 件 ok` + (process.exitCode ? "（NG あり）" : ""));
  process.exit(process.exitCode || 0);
})();
