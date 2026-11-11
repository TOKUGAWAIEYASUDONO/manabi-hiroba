// server.js（予備の対戦サーバー）のクイズまわりの検査。 node tools/test-server-quiz.js
// 自分でサーバーを起動して（空いているポート）、入力検証・権限・進行を確かめて、止める。
const { spawn } = require("child_process");
const path = require("path");
const assert = require("assert");
const PORT = 20000 + Math.floor(Math.random() * 20000);
const srv = spawn(process.execPath, [path.join(__dirname, "..", "server.js")], { env: { ...process.env, PORT: String(PORT) }, stdio: "ignore" });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const post = async (name, body) => { const r = await fetch(`http://127.0.0.1:${PORT}/api/${name}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); return { s: r.status, j: await r.json().catch(() => ({})) }; };
const qs = [
  { t: "mc", q: "1+1は？", ch: ["1", "2", "3", "4"], ok: [1], sec: 10, pt: "normal" },
  { t: "tf", q: "ほんと？", ch: ["○", "×"], ok: [0], sec: 10, pt: "double" },
  { t: "mc", q: "どれでも", ch: ["a", "b"], ok: [0, 1], sec: 20, pt: "none" }];
let n = 0; const t = async (name, fn) => { try { await fn(); n++; console.log("ok  " + name); } catch (e) { console.log("NG  " + name + "\n    " + e.message); process.exitCode = 1; } };
(async () => {
  for (let i = 0; i < 30; i++) { try { await fetch(`http://127.0.0.1:${PORT}/`); break; } catch (e) { await sleep(100); } }
  await t("部屋を作るときの入力検証", async () => {
    assert.strictEqual((await post("create", { mode: "quiz", game: "quiz", g: 3, t: 120, qs: [] })).s, 400);
    assert.strictEqual((await post("create", { mode: "quiz", game: "quiz", g: 3, qs: Array(201).fill(qs[0]) })).s, 400);
    assert.strictEqual((await post("create", { mode: "quiz", game: "quiz", g: 3, qs: "x" })).s, 400);
    assert.strictEqual((await post("create", { mode: "quiz", game: "quiz", g: 3, qs: [{ t: "mc", q: "a", ch: ["b", "c"], ok: [5], sec: 10, pt: "normal" }] })).s, 400);
    assert.strictEqual((await post("create", { mode: "race", game: "mine", g: 3, qs: [qs[1]] })).s, 400, "○×だけのセットは たからばこ・すごろくに使えない");
    assert.strictEqual((await post("create", { mode: "bad", game: "quiz", qs })).s, 400);
    const r = await post("create", { mode: "quiz", game: "quiz", g: 3, gt: "T", qs: [{ ...qs[0], sec: 999, pt: "zzz" }, { t: "mc", q: "x", ch: ["a", "b"], ok: [9] }] });
    assert.strictEqual(r.s, 200);        // 使えない問題は飛ばし、時間・得点の値は直して使う
  });
  const mk = async () => { const r = (await post("create", { mode: "quiz", game: "quiz", g: 3, t: 120, gt: "セット", qs })).j; const a = (await post("join", { code: r.code })).j, b = (await post("join", { code: r.code })).j; return { r, a, b }; };
  await t("クイズの進行・採点・権限", async () => {
    const { r, a, b } = await mk();
    assert.strictEqual((await post("start", { code: r.code, hostKey: "x" })).s, 403);
    assert.strictEqual((await post("start", { code: r.code, hostKey: r.hostKey })).s, 200);
    const sse = await fetch(`http://127.0.0.1:${PORT}/api/events?code=${r.code}`); const rd = sse.body.getReader(); const first = new TextDecoder().decode((await rd.read()).value);
    const st = JSON.parse(first.split("data: ")[1].split("\n")[0]);
    assert.strictEqual(st.quiz.phase, "q"); assert.ok(!("ok" in st.quiz.q), "出題中は正解を送らない"); assert.strictEqual(st.gt, "セット");
    await rd.cancel();
    assert.strictEqual((await post("act", { code: r.code, pid: a.pid, token: "bad", op: "qans", i: 0, c: 1 })).s, 403);
    assert.strictEqual((await post("act", { code: r.code, pid: a.pid, token: a.token, op: "answer", right: true })).s, 403, "クイズでは自己申告の正誤を受け付けない");
    assert.strictEqual((await post("act", { code: r.code, pid: a.pid, token: a.token, op: "qans", i: 0, c: 9 })).s, 409);
    assert.strictEqual((await post("act", { code: r.code, pid: a.pid, token: a.token, op: "qans", i: 0, c: "1" })).s, 409);
    assert.strictEqual((await post("act", { code: r.code, pid: a.pid, token: a.token, op: "qans", i: 5, c: 1 })).s, 409);
    assert.strictEqual((await post("act", { code: r.code, pid: a.pid, token: a.token, op: "qans", i: 0, c: 1 })).s, 200);
    assert.strictEqual((await post("act", { code: r.code, pid: a.pid, token: a.token, op: "qans", i: 0, c: 1 })).s, 409, "2回目は不可");
    assert.strictEqual((await post("act", { code: r.code, pid: b.pid, token: b.token, op: "qans", i: 0, c: 0 })).s, 200);      // 全員が答えたので正解を見せる
    assert.strictEqual((await post("qnext", { code: r.code, hostKey: "bad" })).s, 403);
    assert.strictEqual((await post("qnext", { code: r.code, hostKey: r.hostKey })).s, 200);     // 次の問題
    assert.strictEqual((await post("qnext", { code: r.code, hostKey: r.hostKey })).s, 200);     // しめきって見せる
    assert.strictEqual((await post("qnext", { code: r.code, hostKey: r.hostKey })).s, 200); assert.strictEqual((await post("qnext", { code: r.code, hostKey: r.hostKey })).s, 200); assert.strictEqual((await post("qnext", { code: r.code, hostKey: r.hostKey })).s, 200);
    const es = await fetch(`http://127.0.0.1:${PORT}/api/events?code=${r.code}`); const d = JSON.parse(new TextDecoder().decode((await es.body.getReader().read()).value).split("data: ")[1].split("\n")[0]);
    assert.strictEqual(d.status, "ended"); assert.strictEqual(d.quiz.phase, "end"); assert.strictEqual(d.quiz.stat.length, 3);
    const pa = d.players.find(p => p.pid === a.pid), pb = d.players.find(p => p.pid === b.pid);
    assert.ok(pa.v > 900 && pa.v <= 1000, "1問目の正解は500〜1000点 " + pa.v); assert.strictEqual(pb.v, 0); assert.strictEqual(pa.rec, "1--"); assert.ok(!("token" in pa));
    assert.strictEqual((await post("qreplay", { code: r.code, hostKey: "bad" })).s, 403);
    assert.strictEqual((await post("qreplay", { code: r.code, hostKey: r.hostKey })).s, 200, "正答率の低い問題だけ、もう一度");
    es.body.cancel().catch(() => {});
  });
  await t("児童は進行できない・読めるのは自分の部屋のセットだけ", async () => {
    const { r, a } = await mk();
    assert.strictEqual((await post("qnext", { code: r.code, hostKey: a.token })).s, 403);
    assert.strictEqual((await post("set", { code: r.code, pid: a.pid, token: a.token })).s, 403, "クイズの部屋は set を返さない");
    const m = (await post("create", { mode: "chest", game: "mine", g: 3, t: 120, gt: "ちゃんと", qs })).j, p = (await post("join", { code: m.code })).j;
    assert.strictEqual((await post("set", { code: m.code, pid: p.pid, token: "no" })).s, 403);
    const s = await post("set", { code: m.code, pid: p.pid, token: p.token }); assert.strictEqual(s.s, 200); assert.strictEqual(s.j.qs.length, 2, "たからばこ・すごろくには4択だけ"); assert.ok(s.j.qs.every(q => q.t === "mc"));
  });
  console.log(`\n${n} 件のテストを実行${process.exitCode ? "（失敗あり）" : "：すべて成功"}`);
  srv.kill(); process.exit(process.exitCode || 0);
})();
