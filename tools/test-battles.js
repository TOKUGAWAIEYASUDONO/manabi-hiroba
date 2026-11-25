// ボスバトル（協力）と じんとりバトル（2チーム）の検査。 node tools/test-battles.js
// 1) data/cooplib.js：ボスの げんき・ダメージ・1人の上限・にげる→つぎのボス・いたずら（見た目だけ）・時間で おわる
// 2) じんとり：本陣・ぬりの数・うばう+1・はなれたマス+1・インクがはねる・15秒の保護・やさしいルール・人数の補正・ラストスパート・あか／あおの公平・チーム分け
// 1b) ひとりで ボスバトル（1人用・soloBoss）：げんき・まちがいで とりもどす・にげる→つぎのボス・時間で おわる・「あと いくつ」
// 3) server.js（予備方式）：作成・チームの移動（先生だけ・待合室だけ）・自分のチームだけ届く・名前を送らない・最後まで通る
const { spawn } = require("child_process");
const path = require("path");
const assert = require("assert");
const CO = require(path.join(__dirname, "..", "data", "cooplib.js"));
let n = 0;
const t = async (name, fn) => { try { await fn(); n++; console.log("ok  " + name); } catch (e) { console.log("NG  " + name + "\n    " + (e && e.stack || e).split("\n").slice(0, 4).join("\n    ")); process.exitCode = 1; } };
const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let x = Math.imul(seed ^ seed >>> 15, 1 | seed); x = x + Math.imul(x ^ x >>> 7, 61 | x) ^ x; return ((x ^ x >>> 14) >>> 0) / 4294967296; };
const size = o => Buffer.byteLength(JSON.stringify(o));
const kseq = {}; const K = pid => (kseq[pid] = (kseq[pid] || 0) + 1);
const ans = (E, pid, ok, now) => E.act(pid, "cans", { ok, k: K(pid + ":" + E.t0 + ":" + (E.ix = E.ix || Math.random())) }, now);
function boss(N, o) { const E = CO.bossEngine({ rand: rng(3), t: 180, ...o }); for (let i = 0; i < N; i++) E.add("p" + i); E.begin(0); E.tick(3000); return E; }
function jin(N, o) { const E = CO.jinEngine({ rand: rng(5), t: 180, ...o }); for (let i = 0; i < N; i++) E.add("p" + i); E.begin(0); E.tick(3000); return E; }
/* 現実に近い答え方：1人 1分に 約5.5問 */
function play(E, N, acc, sec, seed, f) {
  const r = rng(seed), nx = Array.from({ length: N }, () => 3000 + r() * 11000);
  for (let now = 3000; now <= 3000 + sec * 1000 + 500; now += 250) {
    E.tick(now); if (E.ph === "end") break;
    for (let i = 0; i < N; i++) if (now >= nx[i]) { const ok = r() < (typeof acc === "function" ? acc(i) : acc); const a = ans(E, "p" + i, ok, now); if (f) f(a, i, now); nx[i] = now + (60000 / 5.5) * (.7 + .6 * r()) + (ok ? 1200 : 2500); }
  }
  E.tick(3000 + sec * 1000 + 1000); return E;
}

(async () => {
  /* ---------- 1) ボスバトル ---------- */
  await t("ボスの げんき：人数・学年・やさしいで自動調整、つぎのボスほど少し多い（最小 40）", () => {
    assert.strictEqual(CO.bossHp(1, 3, false, 0), 40, "1人でも おいはらえる");
    assert.ok(CO.bossHp(30, 3, false, 0) > CO.bossHp(5, 3, false, 0) * 4, "人数に比例");
    assert.ok(CO.bossHp(30, 3, true, 0) < CO.bossHp(30, 3, false, 0), "やさしいは少ない");
    assert.ok(CO.bossHp(30, 3, false, 1) > CO.bossHp(30, 3, false, 0), "つぎのボスは多い");
    assert.strictEqual(CO.bossHp(30, 3, false, 50), CO.bossHp(30, 3, false, 10), "ふえ方には上限");
    for (const N of [1, 2, 7, 30, 60]) assert.strictEqual(CO.bossHp(N, 4, false, 2) % 10, 0);
  });
  await t("ダメージ：正解 10・れんぞく正解で +2 ずつ（最大 20）・まちがいは 1 で れんぞくが きれる", () => {
    assert.deepStrictEqual([1, 2, 3, 6, 7, 30].map(CO.bossDmg), [10, 12, 14, 20, 20, 20]);
    const E = boss(30, {}); let now = 4000; const d = [];
    for (const ok of [true, true, true, false, true]) { d.push(ans(E, "p0", ok, now)[1].dm); now += 2600; }
    assert.deepStrictEqual(d, [10, 12, 14, 1, 10]);
    assert.strictEqual(E.td, 47); assert.strictEqual(E.H - E.hp, 47);
  });
  await t("1人の上限：そのボスの（げんき÷人数）×2.2 まで。超えた分は数えず cap:true。つぎのボスでは また出せる", () => {
    const E = boss(20, {}); let now = 4000, cap = 0;
    for (let i = 0; i < 12; i++, now += 5200) { const r = ans(E, "p0", true, now); if (r[1].cap) cap++; }
    assert.ok(E.P.get("p0").d <= E.cap && E.cap === CO.bossCap(E.H, 20), "上限を超えない");
    assert.ok(cap >= 1, "cap:true が返る");
    assert.ok(E.hp > 0, "1人では おいはらえない（みんなで）");
  });
  await t("げんき 0 → にげる（2.6秒）→ つぎのボス。とどめの子には ko、吹き出しは先生の画面だけ", () => {
    const E = boss(2, {}); let now = 4000, ko = null, i = 0;
    while (E.ph === "play" && i < 40) { const r = ans(E, "p" + (i % 2), true, now); if (r[1].ko) ko = r; i++; now += 700; }
    assert.ok(ko && ko[2] === true, "とどめで すぐ知らせる"); assert.strictEqual(E.ph, "run"); assert.strictEqual(E.dn, 1); assert.strictEqual(E.hp, 0);
    assert.strictEqual(E.act("p0", "cans", { ok: true, k: 999 }, now)[1].late, true, "にげている間の答えは数えない");
    const H0 = E.H; E.tick(now + 2700); assert.strictEqual(E.ph, "play"); assert.strictEqual(E.lv, 1); assert.ok(E.H > H0 && E.hp === E.H, "つぎのボスは げんきが多い");
    const pk = E.pub(now + 2700, false); assert.ok(!("bb" in pk), "児童には吹き出しを送らない");
  });
  await t("いたずら：20〜30秒おきに3秒。点数・ダメージには何も起きない（見た目だけ）", () => {
    const E = boss(5, {}); let seen = 0, now = 3000; const dm = [];
    for (; now < 80000; now += 250) { E.tick(now); const p = E.pub(now, false); if (p.tr) { seen++; if (now % 5000 === 0) dm.push(ans(E, "p1", true, now)[1].dm); } }
    assert.ok(seen >= 2 * 12 && seen <= 4 * 12, "いたずらの回数 " + seen / 12);
    assert.ok(dm.every(x => x === 10 || x === 12 || x === 14), "いたずら中も ダメージは同じ " + dm);
  });
  await t("時間で おわる・結果は クラスの合計だけ（人ごとの数字は状態に入れない）・状態は小さい", () => {
    const E = play(boss(30, { g: 3 }), 30, .7, 180, 11);
    assert.strictEqual(E.ph, "end"); const p = E.pub(999999, true);
    assert.ok(p.res.dn >= 1 && p.res.td > 0 && p.res.an > 100, JSON.stringify(p.res));
    assert.ok(size(p) < 300, "状態 " + size(p));
    assert.ok(!JSON.stringify(p).includes("p0"), "参加者の ID を入れない");
  });
  await t("見込み：3分で ふつう 2〜5ひき（1人・30人・60人、正答率 0.7）、正答率が高いほど多い", () => {
    const avg = (N, acc) => { let s = 0; for (let i = 0; i < 12; i++) s += play(boss(N, { rand: rng(i + 1), g: 3 }), N, acc, 180, i + 1).dn; return s / 12; };
    const tb = { "1人": avg(1, .7), "30人": avg(30, .7), "60人": avg(60, .7), "30人/0.5": avg(30, .5), "30人/0.9": avg(30, .9) };
    console.log("    3分で おいはらった数（平均）:", JSON.stringify(tb));
    for (const k of ["1人", "30人", "60人"]) assert.ok(tb[k] >= 2 && tb[k] <= 5, k);
    assert.ok(tb["30人/0.9"] > tb["30人/0.5"]);
  });
  await t("ボス：入力の検査（連番・型・速すぎ・存在しない子・使えない操作）", () => {
    const E = boss(3, {});
    assert.strictEqual(E.act("zz", "cans", { ok: true, k: 1 }, 4000)[0], 403);
    assert.strictEqual(E.act("p0", "boost", {}, 4000)[0], 403); assert.strictEqual(E.act("p0", "mini", { n: 5 }, 4000)[0], 403);
    assert.strictEqual(E.act("p0", "cans", { ok: 1, k: 1 }, 4000)[0], 400);
    assert.strictEqual(E.act("p0", "cans", { ok: true, k: 1 }, 4000)[0], 200);
    assert.strictEqual(E.act("p0", "cans", { ok: true, k: 1 }, 9000)[0], 409, "同じ連番");
    assert.strictEqual(E.act("p0", "cans", { ok: true, k: 2 }, 4500)[0], 429, "速すぎ");
    assert.strictEqual(E.act("p0", "cans", { ok: true, k: 3, dm: 9999 }, 9000)[1].dm, 12, "ダメージは部屋の側で決める");
  });
  await t("clean：ボスの状態の形を調べる", () => {
    assert.strictEqual(CO.clean({ k: "bs", ph: "zzz" }), null);
    const c = CO.clean({ k: "bs", ph: "play", lv: 2, hp: 250, tr: { i: 1, k: 9 }, bb: { i: 1, l: [[0, 1], ["x", 2]] } });
    assert.strictEqual(c.hp, 100); assert.strictEqual(c.tr, null); assert.deepStrictEqual(c.bb.l, [[0, 1]]);
  });

  /* ---------- 1c) ひとりで ボスバトル：ステージ（soloStage。2026-11-25） ---------- */
  await t("ステージ：ざこ 2ひき → ボス → つぎの ステージ。えらんだ ステージから はじまる", () => {
    const E = CO.soloStage({ g: 3, t: 300, stage: 2, rand: rng(1) }); E.begin(0); let now = 0; const seq = [];
    for (let k = 0; k < 40 && seq.length < 4; k++) { now += 3000; E.tick(now); if (E.ph !== "play") continue; const r = E.ans(true, now); if (r.ko) { seq.push(r.kind + E.st); now += 3000; E.tick(now); } }
    assert.deepStrictEqual(seq, ["z2", "z2", "b2", "z3"]);
    assert.strictEqual(E.dn, 1); assert.deepStrictEqual(E.cl, [2]);
    assert.strictEqual(CO.soloStage({ g: 3, stage: 9 }).st, 0, "へんな 番号は ステージ1");
  });
  await t("ステージ：ひっさつわざは 正解 3回めごと（SPD）。まちがえると ゲージが 0", () => {
    const E = CO.soloStage({ g: 6, t: 300, rand: rng(2) }); E.begin(0); let now = 0; const A = ok => { now += 3000; E.tick(now); if (E.ph === "run") { now += 3000; E.tick(now); } return E.ans(ok, now); };
    while (E.kind !== "b") A(true);                       // ざこを おいはらう
    E.sp = 0; E.cb = 0; const h0 = E.hp;
    assert.ok(!A(true).sp); assert.strictEqual(E.sp, 1); A(false); assert.strictEqual(E.sp, 0, "まちがいで 0");
    E.hp = E.H; A(true); A(true); const r = A(true); assert.ok(r.sp, "3回めで ひっさつ"); assert.strictEqual(r.dm, CO.SG.SPD); assert.strictEqual(E.sp, 0); assert.strictEqual(E.sps >= 1, true);
    assert.ok(E.hp < h0);
  });
  await t("ステージ：ざこは まちがえても とりもどさない・ボスは 8% とりもどす・レアボスは げんきが 多い（はじめの ステージだけ）", () => {
    const E = CO.soloStage({ g: 3, t: 300, stage: 1, rare: true, rand: rng(3) }); E.begin(0);
    E.ans(true, 1000); const z = E.hp; assert.strictEqual(E.ans(false, 4000).heal, 0); assert.strictEqual(E.hp, z);
    let now = 4000; while (E.kind !== "b") { now += 3000; E.tick(now); if (E.ph === "play") E.ans(true, now); }
    assert.ok(E.rare); const N = CO.soloStage({ g: 3, t: 300, stage: 1, rand: rng(3) }); N.begin(0); N.zi = 2; 
    assert.ok(E.H > CO.soloHp(3, false, 1), "レアは 多い");
    E.ans(true, now + 3000); const r = E.ans(false, now + 6000); assert.ok(r.heal > 0);
    while (E.dn < 1) { now += 3000; E.tick(now); if (E.ph === "play") E.ans(true, now); }
    assert.ok(E.rareKo); now += 3000; E.tick(now); while (E.kind !== "b") { now += 3000; E.tick(now); if (E.ph === "play") E.ans(true, now); }
    assert.ok(!E.rare, "つぎの ステージは ふつうの ボス");
  });
  await t("ステージ：6の つぎは 1に もどる（loop）・時間で おわる・res に cl と zk", () => {
    const E = CO.soloStage({ g: 1, easy: true, t: 600, stage: 5, rand: rng(4) }); E.begin(0); let now = 0;
    while (E.dn < 1) { now += 3000; E.tick(now); if (E.ph === "play") E.ans(true, now); }
    now += 3000; E.tick(now); assert.strictEqual(E.st, 0); assert.strictEqual(E.loop, 1);
    E.tick(600001); assert.strictEqual(E.ph, "end"); assert.deepStrictEqual(E.res.cl, [5]); assert.strictEqual(E.res.zk, 2);
    assert.ok(E.ans(true, 600002).late);
  });
  /* ---------- 1b) ひとりで ボスバトル（1人用・soloBoss） ---------- */
  await t("ひとりで ボス：げんきは 学年・やさしいで きまり、つぎのボスほど 1.15ばい（10ぴきめまで）", () => {
    assert.strictEqual(CO.soloHp(1, false, 0), 40); assert.strictEqual(CO.soloHp(3, false, 0), 50); assert.strictEqual(CO.soloHp(5, false, 0), 60);
    assert.ok(CO.soloHp(3, true, 0) < CO.soloHp(3, false, 0), "やさしいは 少ない");
    for (const g of [1, 2, 3, 4, 5, 6]) for (const e of [false, true]) { let pv = 0; for (let lv = 0; lv <= 12; lv++) { const h = CO.soloHp(g, e, lv); assert.ok(h >= 30 && h % 10 === 0 && h >= pv, `g${g} lv${lv} ${h}`); pv = h; } assert.strictEqual(CO.soloHp(g, e, 10), CO.soloHp(g, e, 30), "10ぴきめで とまる"); }
    assert.strictEqual(CO.soloHp(9, false, 0), CO.soloHp(3, false, 0), "学年が へんなら 3年");
  });
  await t("ひとりで ボス：正解は 協力と同じ ダメージ・まちがうと げんきを 8% とりもどす（満タンより ふえない）・れんぞくが きれる", () => {
    const E = CO.soloBoss({ g: 3, t: 120, rand: rng(1) }); E.begin(0);
    assert.strictEqual(E.ph, "play"); assert.strictEqual(E.ae, 120000); assert.strictEqual(E.H, 50);
    assert.deepStrictEqual(E.ans(false, 100), { dm: 0, heal: 0 }, "満タンなら とりもどさない");
    assert.deepStrictEqual(E.ans(true, 200), { dm: 10 }); assert.deepStrictEqual(E.ans(true, 300), { dm: 12 });
    assert.strictEqual(E.hp, 28);
    assert.deepStrictEqual(E.ans(false, 400), { dm: 0, heal: 4 }); assert.strictEqual(E.hp, 32);
    assert.deepStrictEqual(E.ans(true, 500), { dm: 10 }, "まちがいで れんぞくが きれる");
    assert.strictEqual(E.cb, 1); assert.strictEqual(E.an, 5); assert.strictEqual(E.ok, 3); assert.strictEqual(E.td, 32);
  });
  await t("ひとりで ボス：げんき 0 → にげる（2.4秒・答えは 数えない）→ つぎのボス。時間で おわり、res に「あと いくつ」", () => {
    const E = CO.soloBoss({ g: 1, t: 60, rand: rng(2) }); E.begin(0);
    let r; for (let k = 0; k < 10 && !(r && r.ko); k++) r = E.ans(true, 1000 + k);
    assert.ok(r.ko && E.ph === "run" && E.dn === 1 && E.hp === 0 && E.pct() === 0, "おいはらった");
    assert.ok(E.ans(true, 2000).late, "にげている あいだは 数えない");
    assert.strictEqual(E.tick(3000), false); assert.strictEqual(E.tick(1000 + 4 + 2400), true);
    assert.strictEqual(E.ph, "play"); assert.strictEqual(E.lv, 1); assert.strictEqual(E.H, CO.soloHp(1, false, 1)); assert.strictEqual(E.hp, E.H);
    E.ans(true, 5000);
    assert.strictEqual(E.tick(60000), true); assert.strictEqual(E.ph, "end");
    assert.deepStrictEqual(E.res, { dn: 1, td: E.td, an: E.an, ok: E.ok, lv: 1, left: E.hp, H: E.H }); assert.ok(E.hp > 0 && E.hp < E.H);
    assert.ok(E.ans(true, 60001).late, "おわったら 数えない");
    const F = CO.soloBoss({ g: 1, t: 60 }); F.begin(0); for (let k = 0; k < 10 && F.ph === "play"; k++) F.ans(true, 59000 + k); F.tick(60000);
    assert.strictEqual(F.res.left, 0, "にげている とちゅうで おわったら「あと」は 0");
  });
  await t("ひとりで ボス：いたずらは 見た目だけ（20〜30秒おき・3秒）。協力の bossEngine は かわらない", () => {
    const E = CO.soloBoss({ g: 5, t: 180, rand: rng(4) }); E.begin(0); let seen = 0, hp0 = E.hp;
    for (let now = 0; now < 90000; now += 250) { E.tick(now); if (E.tr) seen++; }
    assert.ok(seen >= 2 * 12 && E.hp === hp0 && E.dn === 0, "いたずらで げんきは かわらない " + seen);
    const B = boss(1, {}); assert.strictEqual(B.H, CO.bossHp(1, 3, false, 0), "協力の げんきは もとの式");
    assert.deepStrictEqual(B.OPS, ["cans"]);
  });

  /* ---------- 2) じんとり ---------- */
  await t("盤：7×7・本陣（左上＝あか／右下＝あお）・★4つと まんなか・180度まわして同じ", () => {
    const D = CO.JN_DEF; assert.strictEqual(D.length, 49);
    assert.strictEqual(D[0].home, 0); assert.strictEqual(D[48].home, 1); assert.strictEqual(D[24].cost, 6); assert.strictEqual(D[24].v, 5);
    for (let i = 0; i < 49; i++) { assert.strictEqual(D[i].cost, D[48 - i].cost, "cost " + i); assert.strictEqual(D[i].v, D[48 - i].v); }
    assert.deepStrictEqual(D.map((d, i) => d.star === 1 ? i : -1).filter(i => i >= 0), [6, 16, 32, 42]);
  });
  await t("ぬりの数：ふつう 2・★ 4・あいてのマスは +1・自分の陣地から はなれたマスは +1", () => {
    const B = CO.jnBoard();
    assert.strictEqual(CO.jnCost(B, 1, 0), 2, "本陣のとなり");
    assert.strictEqual(CO.jnCost(B, 2, 0), 3, "はなれたマス");
    assert.strictEqual(CO.jnCost(B, 16, 0), 5, "★（はなれている）");
    B[2].o = 1; assert.strictEqual(CO.jnCost(B, 2, 0), 4, "あいてのマス・はなれている");
    B[1].o = 0; assert.strictEqual(CO.jnCost(B, 2, 0), 3, "あいてのマス・となり");
    assert.ok(!CO.jnOk(B, 0, 1, 0, false) && !CO.jnOk(B, 48, 0, 0, false), "本陣は うばえない");
    assert.ok(!CO.jnOk(B, 1, 0, 0, false), "自分のマスは ぬらない");
    assert.ok(CO.jnOk(B, 2, 0, 0, false) && !CO.jnOk(B, 2, 0, 0, true), "やさしいルールは あいてのマスを うばえない");
  });
  await t("インクが はねる（となりに +1・れんさは1回だけ）・ぬれたマスは15秒 あいてから ぬれない", () => {
    const B = CO.jnBoard(); B[1].c[0] = 2;
    const g = CO.jnResolve(B, 1000, false, 15000, 0);
    assert.deepStrictEqual(g.map(x => x.i), [1]); assert.strictEqual(B[1].o, 0);
    assert.strictEqual(B[2].c[0], 1, "となりへ はねる"); assert.strictEqual(B[8].c[0], 1);
    assert.ok(!CO.jnOk(B, 1, 1, 1000 + 14999, false) && CO.jnOk(B, 1, 1, 1000 + 15000, false), "15秒の保護");
    const C = CO.jnBoard(); C[1].c[0] = 2; C[2].c[0] = 1; C[3].c[0] = 2;      // 2 が はねで ぬれても、そこから さらには はねない
    CO.jnResolve(C, 0, false, 15000, 0); assert.strictEqual(C[2].o, 0); assert.strictEqual(C[3].o, 0, "となりになって 安くなった 3 も れんさで ぬれる");
    assert.strictEqual(C[4].c[0], 0, "れんさで ぬれたマスからは はねない"); assert.strictEqual(C[9].c[0], 0);
  });
  await t("ねらいマスは自動：となりで のこりが少なく、点の大きいマス。あか と あお で同じ決まり（180度）", () => {
    const B = CO.jnBoard();
    const a = CO.jnPick(B, 0, -1, 0, false), b = CO.jnPick(B, 1, -1, 0, false);
    assert.strictEqual(a, 1); assert.strictEqual(b, 47); assert.strictEqual(a, 48 - b);
    B[1].o = 0; B[2].c[0] = 1; assert.strictEqual(CO.jnPick(B, 0, 1, 0, false), 2, "前に ぬったマスの となり・のこりが少ない");
  });
  await t("チーム分け：参加順に交互・自動で分けなおしても人数の差は最大1人・先生が1人ずつ動かせる（待合室だけ）", () => {
    for (const N of [1, 2, 3, 7, 30, 31, 60]) { const m = CO.splitTeams(Array.from({ length: N }, (_, i) => "p" + i), rng(N)); const c = [0, 0]; for (const v of m.values()) c[v]++; assert.ok(Math.abs(c[0] - c[1]) <= 1, N + " " + c); }
    const E = CO.jinEngine({ rand: rng(1) }); for (let i = 0; i < 5; i++) E.add("p" + i);
    assert.deepStrictEqual(E.teams(), [3, 2]); assert.deepStrictEqual([0, 1, 2, 3, 4].map(i => E.teamOf("p" + i)), [0, 1, 0, 1, 0]);
    assert.ok(E.setTeam("p0", 1)); assert.deepStrictEqual(E.teams(), [2, 3]); assert.ok(!E.setTeam("p0", 2), "チームは 0 か 1");
    for (let i = 0; i < 4; i++) E.setTeam("p" + i, 1); assert.deepStrictEqual(E.teams(), [1, 4]);
    assert.ok(E.split()); const c = E.teams(); assert.ok(Math.abs(c[0] - c[1]) <= 1);
    assert.deepStrictEqual(E.mine("p3"), { mt: E.teamOf("p3") }, "児童に届くのは 自分のチームだけ");
    E.begin(0); assert.ok(!E.setTeam("p0", 0) && !E.split(), "始まったら変えられない");
    const F = CO.jinEngine({ rand: rng(2) }); for (let i = 0; i < 4; i++) { F.add("p" + i); F.setTeam("p" + i, 0); } F.begin(0); assert.deepStrictEqual(F.teams(), [2, 2], "かたほうが 0人なら 始めるときに自動で分ける");
  });
  await t("人数の補正：人数が ちがっても チームの力は同じ（大きいクラスは 1チーム 4人ぶん）", () => {
    const E = CO.jinEngine({}); for (let i = 0; i < 5; i++) E.add("p" + i);
    assert.ok(Math.abs(E.power(0) * 3 - E.power(1) * 2) < 1e-9, "3人と2人");
    const F = CO.jinEngine({}); for (let i = 0; i < 31; i++) F.add("p" + i);
    assert.ok(Math.abs(F.power(0) * 16 - 4) < 1e-9 && Math.abs(F.power(1) * 15 - 4) < 1e-9, "31人");
    const G = CO.jinEngine({}); G.add("a"); assert.strictEqual(G.power(0), 1); assert.strictEqual(G.power(1), 0);
  });
  await t("ラストスパート（のこり30秒は 2ばい）・時間で おわる・同点は ひきわけ", () => {
    const E = jin(2, { t: 60 }); E.tick(32900); assert.ok(!E.ls, "のこり30秒より前"); E.tick(33000);
    assert.strictEqual(E.pub(33000).ls, 1); assert.strictEqual(E.ev.t, "ls");
    E.tick(63000); assert.strictEqual(E.ph, "end"); assert.strictEqual(E.res.w, -1, "どちらも 0点は ひきわけ");
    const F = jin(2, { t: 60 }); F.act("p0", "cans", { ok: true, k: 1 }, 4000);
    assert.strictEqual(F.B[1].c[0], 1, "ふつうは 1正解で 1 ぬり");
    const G = jin(2, { t: 60 }); G.act("p0", "cans", { ok: true, k: 1 }, 40000);
    assert.strictEqual(G.B[1].o, 0, "ラストスパート中は 1正解で 2 ぬり（となりのマスが すぐ ぬれる）");
  });
  await t("まちがいでは ぬらない・ぬれたら pt（その子の チームの マス数）を返す・入力の検査", () => {
    const E = jin(2, {});
    assert.strictEqual(E.act("p0", "cans", { ok: false, k: 1 }, 4000)[1].pt, 0);
    assert.strictEqual(E.B.reduce((s, x) => s + x.c[0] + x.c[1], 0), 0);
    const r1 = E.act("p0", "cans", { ok: true, k: 2 }, 7000), r2 = E.act("p0", "cans", { ok: true, k: 3 }, 9000);
    assert.strictEqual(r1[1].pt, 0); assert.ok(r2[1].pt >= 1 && r2[2] === true, "2回目で 1マス（すぐ知らせる）");
    assert.strictEqual(E.act("p1", "boost", {}, 9000)[0], 403); assert.strictEqual(E.act("p1", "cans", { ok: "y", k: 1 }, 9000)[0], 400);
    assert.strictEqual(E.act("p1", "cans", { ok: true, k: 1, i: 30, tm: 0 }, 9000)[0], 200, "ぬる場所・チームは 送っても使わない");
    assert.strictEqual(E.teamOf("p1"), 1);
  });
  await t("公平：同じ力の2チームは どちらも だいたい同じだけ勝つ・強いチームが勝つ・盤が うまる", () => {
    for (const N of [4, 10, 30]) {
      const w = [0, 0, 0]; let cells = 0;
      for (let s = 0; s < 30; s++) { const E = play(jin(N, { rand: rng(100 + s) }), N, .7, 180, 200 + s); w[E.res.w + 1]++; cells += E.res.cn[0] + E.res.cn[1]; }
      console.log(`    ${N}人・3分：ひきわけ/あか/あお ${w.join("/")}・平均 ${(cells / 30).toFixed(1)}マス`);
      assert.ok(w[1] >= 7 && w[2] >= 7, "かたよらない " + w); assert.ok(cells / 30 >= 30, "盤が うまっていく");
    }
    let red = 0; for (let s = 0; s < 20; s++) { const E = play(jin(10, { rand: rng(300 + s) }), 10, i => i % 2 ? .45 : .9, 180, 400 + s); if (E.res.w === 0) red++; }
    assert.ok(red >= 16, "正答率の高いチーム（あか）が勝つ " + red);
  });
  await t("やさしいルール：うばいあいなし・全部ぬれたら おわる", () => {
    let endAt = 0; const E = jin(20, { easy: true, rand: rng(9), t: 300 }), owner = new Map(); let changed = 0;
    play(E, 20, .8, 300, 9, (a, i, now) => { E.B.forEach((x, j) => { if (owner.has(j) && owner.get(j) !== x.o) changed++; if (x.o >= 0) owner.set(j, x.o); }); if (E.ph === "end" && !endAt) endAt = now; });
    assert.strictEqual(E.ph, "end"); assert.strictEqual(E.res.cn[0] + E.res.cn[1], 49, "全部ぬれた");
    assert.strictEqual(changed, 0, "一度ぬれたマスの色は かわらない");
    assert.ok(endAt > 0 && endAt < 3000 + 300000, "時間より前に おわる");
  });
  await t("状態の大きさ・児童には吹き出しを送らない・clean で形を調べる", () => {
    const E = play(jin(30, {}), 30, .7, 120, 3), p = E.pub(0, false);
    assert.ok(size(E.pub(0, true)) < 450, "状態 " + size(E.pub(0, true))); assert.ok(!("bb" in p));
    const E2 = jin(4, {}); for (let i = 0; i < 4; i++) E2.act("p" + i, "cans", { ok: true, k: 1 }, 4000); const pp = E2.pub(4100, false);
    assert.ok(pp.cl.length === 49 && Array.isArray(pp.tg) && Array.isArray(pp.tp));
    const c = CO.clean(pp); assert.strictEqual(c.k, "jn"); assert.strictEqual(c.cl, pp.cl);
    assert.strictEqual(CO.clean({ ...pp, cl: "x".repeat(49) }), null); assert.strictEqual(CO.clean({ ...pp, cl: "a" }), null);
    assert.deepStrictEqual(CO.clean({ ...pp, tg: [99, -5] }).tg, [-1, -1]);
  });

  /* ---------- 3) server.js ---------- */
  const PORT = 20000 + Math.floor(Math.random() * 20000), SC = 0.05;
  const srv = spawn(process.execPath, [path.join(__dirname, "..", "server.js")], { env: { ...process.env, PORT: String(PORT), JOIN_RATE_SCALE: "1000", COOP_TIME_SCALE: String(SC) }, stdio: "ignore" });
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const post = async (name, body) => { const r = await fetch(`http://127.0.0.1:${PORT}/api/${name}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); return { s: r.status, j: await r.json().catch(() => ({})) }; };
  const events = async (code, who) => { const ac = new AbortController(), r = await fetch(`http://127.0.0.1:${PORT}/api/events`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, ...who }), signal: ac.signal });
    const o = { msgs: [], stop() { ac.abort(); } }; (async () => { const rd = r.body.getReader(), dec = new TextDecoder(); let buf = ""; try { for (;;) { const { value, done } = await rd.read(); if (done) break; buf += dec.decode(value, { stream: true }); let i; while ((i = buf.indexOf("\n\n")) >= 0) { const ev = buf.slice(0, i); buf = buf.slice(i + 2); const d = ev.split("\n").find(l => l.startsWith("data: ")); if (d) o.msgs.push(JSON.parse(d.slice(6))); } } } catch (e) {} })(); return o; };
  for (let i = 0; i < 30; i++) { try { await fetch(`http://127.0.0.1:${PORT}/`); break; } catch (e) { await sleep(100); } }
  const mk = async (mode, N, extra) => { const r = (await post("create", { mode, game: "calc", g: 3, t: 60, rule: "normal", nm: "input", ...extra })).j; const ps = []; for (let i = 0; i < N; i++) ps.push((await post("join", { code: r.code, name: "こ" + String.fromCharCode(0x3042 + i) })).j); return { r, ps }; };
  const act = (code, p, op, body) => post("act", { code, pid: p.pid, token: p.token, op, ...body });
  const last = ev => ev.msgs[ev.msgs.length - 1];
  try {
    await t("server.js：じんとり チームの移動は 先生だけ・待合室だけ／児童には自分のチーム（mt）だけ・名前は送らない", async () => {
      const { r, ps } = await mk("jin", 4); const [a, b] = ps;
      const hostEv = await events(r.code, { hostKey: r.hostKey }), kidEv = await events(r.code, { pid: a.pid, token: a.token }); await sleep(200);
      assert.deepStrictEqual(last(hostEv).players.map(p => p.tm), [0, 1, 0, 1], "参加順に交互");
      assert.strictEqual(last(kidEv).mt, 0); assert.ok(last(kidEv).players.every(p => p.name === "" && !("tm" in p)), "児童には ほかの子の名前・チームを送らない");
      assert.strictEqual((await post("team", { code: r.code, hostKey: a.token, pid: a.pid, tm: 1 })).s, 403, "児童は動かせない");
      assert.strictEqual((await post("team", { code: r.code, hostKey: r.hostKey, pid: a.pid, tm: 1 })).s, 200); await sleep(150);
      assert.strictEqual(last(kidEv).mt, 1, "動いたら その子に届く");
      assert.strictEqual((await post("team", { code: r.code, hostKey: r.hostKey, pid: a.pid, tm: 7 })).s, 409);
      assert.strictEqual((await post("tsplit", { code: r.code, hostKey: r.hostKey })).s, 200); await sleep(150);
      const tm = last(hostEv).players.map(p => p.tm); assert.strictEqual(tm.filter(x => x === 0).length, 2);
      assert.strictEqual((await post("start", { code: r.code, hostKey: r.hostKey })).s, 200);
      assert.strictEqual((await post("tsplit", { code: r.code, hostKey: r.hostKey })).s, 409, "始まったら変えられない");
      const rk = await mk("rocket", 1); assert.strictEqual((await post("tsplit", { code: rk.r.code, hostKey: rk.r.hostKey })).s, 403, "じんとり以外では使えない");
      await sleep(SC * 3000 + 300);
      for (const op of ["boost", "mini", "add", "answer", "zzz"]) assert.strictEqual((await act(r.code, a, op, { ok: true, k: 1 })).s, 403, op);
      const r1 = await act(r.code, a, "cans", { ok: true, k: 1 }); assert.strictEqual(r1.s, 200);
      await sleep(400); const kid = last(kidEv);
      assert.strictEqual(kid.co.k, "jn"); assert.deepStrictEqual(kid.players, []); assert.ok(!kid.co.bb && typeof kid.me === "string" && (kid.mt === 0 || kid.mt === 1));
      const txt = JSON.stringify(kidEv.msgs); for (const q of ps) assert.ok(!txt.includes(q.token) && (q === a || !txt.includes(q.name)), "token・ほかの子の名前を送らない");
      hostEv.stop(); kidEv.stop();
    });
    await t("server.js：ボスバトルが 最後まで通る（ダメージは部屋の側・時間で終わる・しょう）", async () => {
      const { r, ps } = await mk("boss", 3, { t: 60 }); const host = await events(r.code, { hostKey: r.hostKey });
      await post("start", { code: r.code, hostKey: r.hostKey }); await sleep(SC * 3000 + 200);
      let k = 0, dm = 0, ko = 0; const t0 = Date.now();
      while (Date.now() - t0 < 8000) { const co = last(host).co; if (co.ph === "end" || last(host).status === "ended") break; k++;
        for (const p of ps) { const x = await act(r.code, p, "cans", { ok: true, k, dm: 1e6 }); if (x.s === 200) { dm += x.j.dm | 0; if (x.j.ko) ko++; } } await sleep(SC * 1200 + 20); }
      await sleep(300); const fin = last(host);
      assert.strictEqual(fin.status, "ended"); assert.strictEqual(fin.co.ph, "end"); assert.ok(fin.co.res.dn >= 1 && fin.co.res.dn === ko, "おいはらった数 " + fin.co.res.dn);
      assert.strictEqual(fin.co.res.td, dm, "ダメージの合計は 部屋の側の数字");
      assert.ok(Array.isArray(fin.awards) && fin.awards.some(a => a.key === "correct"), "しょう（正解の数）");
      host.stop();
    });
    await t("server.js：じんとりが 最後まで通る（勝ち負け or ひきわけ・盤は 49マス）", async () => {
      const { r, ps } = await mk("jin", 4, { t: 60 }); const host = await events(r.code, { hostKey: r.hostKey });
      await post("start", { code: r.code, hostKey: r.hostKey }); await sleep(SC * 3000 + 200);
      let k = 0; const t0 = Date.now();
      while (Date.now() - t0 < 8000) { if (last(host).status === "ended") break; k++; for (const p of ps.slice(0, 3)) await act(r.code, p, "cans", { ok: true, k }); await sleep(SC * 1200 + 20); }
      await sleep(300); const fin = last(host);
      assert.strictEqual(fin.status, "ended"); assert.ok([-1, 0, 1].includes(fin.co.res.w)); assert.strictEqual(fin.co.cl.length, 49);
      assert.ok(fin.co.res.cn[0] + fin.co.res.cn[1] > 2, "ぬれた");
      host.stop();
    });
  } finally { try { srv.kill(); } catch (e) {} }
  console.log(`\n${n} 件 ok` + (process.exitCode ? "（NG あり）" : ""));
  process.exit(process.exitCode || 0);
})();
