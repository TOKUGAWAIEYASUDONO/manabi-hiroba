// server.js の上限の検査： node tools/test-server-limits.js
// 部屋づくりの回数（接続元ごと）・同時の部屋数・使われていない部屋の失効・つなぎっぱなしの接続数（部屋・資格情報・接続元ごと）とアイドル切断
const { spawn } = require("child_process");
const path = require("path");
const assert = require("assert");
let n = 0, nextPort = 20000 + Math.floor(Math.random() * 15000);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const t = async (name, fn) => { try { await fn(); n++; console.log("ok  " + name); } catch (e) { console.log("NG  " + name + "\n    " + e.message); process.exitCode = 1; } };

async function withServer(env, fn) {
  const PORT = nextPort++;
  const srv = spawn(process.execPath, [path.join(__dirname, "..", "server.js")], { env: { ...process.env, PORT: String(PORT), JOIN_RATE_SCALE: "1", ...env }, stdio: "ignore" });
  const base = `http://127.0.0.1:${PORT}`;
  const post = async (name, body) => { const r = await fetch(`${base}/api/${name}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); return { s: r.status, j: await r.json().catch(() => ({})) }; };
  // つなぎっぱなしの接続を開く（状態コードと、あとで閉じる関数を返す）
  const open = async (body) => { const ac = new AbortController(); const r = await fetch(`${base}/api/events`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: ac.signal });
    const rd = r.status === 200 ? r.body.getReader() : null; if (rd) await rd.read();
    return { s: r.status, ac, rd, close: () => { try { ac.abort(); } catch (e) {} }, ended: async () => { try { for (;;) { const x = await rd.read(); if (x.done) return true; } } catch (e) { return true; } } }; };
  for (let i = 0; i < 40; i++) { try { await fetch(base + "/"); break; } catch (e) { await sleep(100); } }
  try { await fn({ post, open, base }); } finally { srv.kill(); await sleep(100); }
}
const mk = (post, extra = {}) => post("create", { mode: "chest", game: "calc", g: 3, t: 60, ...extra });

(async () => {
  await t("部屋づくり：同じ接続元は1分に決まった回数まで（429）", () => withServer({ LIMIT_CREATE_PER_MIN: "3" }, async ({ post }) => {
    for (let i = 0; i < 3; i++) assert.strictEqual((await mk(post)).s, 200);
    const x = await mk(post); assert.strictEqual(x.s, 429); assert.ok(x.j.error);
  }));
  await t("部屋づくり：1時間あたりの上限（429）", () => withServer({ LIMIT_CREATE_PER_MIN: "100", LIMIT_CREATE_PER_HOUR: "4" }, async ({ post }) => {
    for (let i = 0; i < 4; i++) assert.strictEqual((await mk(post)).s, 200);
    assert.strictEqual((await mk(post)).s, 429);
  }));
  await t("部屋づくり：同じ接続元が同時に持てる部屋の数（429）。終わらせるだけでは減らず、消えると減る", () => withServer({ LIMIT_ROOMS_PER_IP: "3", LIMIT_CREATE_PER_MIN: "100", LIMIT_UNUSED_MS: "700" }, async ({ post }) => {
    for (let i = 0; i < 3; i++) assert.strictEqual((await mk(post)).s, 200);
    assert.strictEqual((await mk(post)).s, 429);
    await sleep(1500);      // 誰も入らない部屋は消える
    assert.strictEqual((await mk(post)).s, 200, "失効したあとは、またつくれる");
  }));
  await t("部屋づくり：サーバー全体の同時の部屋数（503）", () => withServer({ LIMIT_ROOMS_TOTAL: "2", LIMIT_CREATE_PER_MIN: "100" }, async ({ post }) => {
    assert.strictEqual((await mk(post)).s, 200); assert.strictEqual((await mk(post)).s, 200);
    assert.strictEqual((await mk(post)).s, 503);
  }));
  await t("使われていない部屋は短時間で失効する。児童が入った部屋・先生がつないでいる部屋は残る", () => withServer({ LIMIT_UNUSED_MS: "700", LIMIT_IDLE_MS: "600000" }, async ({ post, open }) => {
    const a = (await mk(post)).j, b = (await mk(post)).j, c = (await mk(post)).j;
    await post("join", { code: b.code, name: "ゆうと" });
    const host = await open({ code: c.code, hostKey: c.hostKey });
    await sleep(1500);
    assert.strictEqual((await post("info", { code: a.code })).s, 404, "未使用の部屋は消える");
    assert.strictEqual((await post("info", { code: b.code })).s, 200, "児童がいる部屋は残る");
    assert.strictEqual((await post("info", { code: c.code })).s, 200, "先生がつないでいる部屋は残る");
    host.close();
  }));
  await t("何も操作がない部屋は、アイドル時間で失効し、接続も切れる", () => withServer({ LIMIT_IDLE_MS: "800", LIMIT_UNUSED_MS: "800" }, async ({ post, open }) => {
    const c = (await mk(post)).j; await post("join", { code: c.code, name: "ゆうと" });
    const host = await open({ code: c.code, hostKey: c.hostKey });
    await sleep(1500);
    assert.strictEqual((await post("info", { code: c.code })).s, 404);
    assert.ok(await host.ended(), "接続が閉じられる");
  }));
  await t("つなぎっぱなしの接続：同じ資格情報は決まった数まで（先生・児童）。閉じれば、またつなげる", () => withServer({ LIMIT_SSE_CRED: "2" }, async ({ post, open }) => {
    const c = (await mk(post)).j, p = (await post("join", { code: c.code, name: "ゆうと" })).j;
    const h = [await open({ code: c.code, hostKey: c.hostKey }), await open({ code: c.code, hostKey: c.hostKey })];
    assert.deepStrictEqual(h.map(x => x.s), [200, 200]);
    assert.strictEqual((await open({ code: c.code, hostKey: c.hostKey })).s, 429, "先生の3本目は断る");
    const k = [await open({ code: c.code, pid: p.pid, token: p.token }), await open({ code: c.code, pid: p.pid, token: p.token })];
    assert.strictEqual((await open({ code: c.code, pid: p.pid, token: p.token })).s, 429, "児童の3本目は断る");
    h[0].close(); await sleep(300);
    const again = await open({ code: c.code, hostKey: c.hostKey }); assert.strictEqual(again.s, 200, "閉じたあとはつなげる");
    [...h, ...k, again].forEach(x => x.close());
  }));
  await t("つなぎっぱなしの接続：部屋ごと・接続元ごと・鍵なしの接続の上限", () => withServer({ LIMIT_SSE_ROOM: "4", LIMIT_SSE_ANON: "2", LIMIT_SSE_CRED: "10" }, async ({ post, open }) => {
    const c = (await mk(post)).j, all = [];
    all.push(await open({ code: c.code })); all.push(await open({ code: c.code }));
    assert.strictEqual((await open({ code: c.code })).s, 429, "鍵なしは接続元ごとに2本まで");
    all.push(await open({ code: c.code, hostKey: c.hostKey })); all.push(await open({ code: c.code, hostKey: c.hostKey }));
    assert.strictEqual((await open({ code: c.code, hostKey: c.hostKey })).s, 429, "部屋の上限（4本）");
    all.forEach(x => x.close());
  }));
  await t("つなぎっぱなしの接続：接続元ごとの上限と、全体の上限", async () => {
    await withServer({ LIMIT_SSE_IP: "3", LIMIT_SSE_CRED: "10", LIMIT_SSE_ANON: "10" }, async ({ post, open }) => {
      const c = (await mk(post)).j, all = [];
      for (let i = 0; i < 3; i++) all.push(await open({ code: c.code, hostKey: c.hostKey }));
      assert.strictEqual((await open({ code: c.code, hostKey: c.hostKey })).s, 429); all.forEach(x => x.close());
    });
    await withServer({ LIMIT_SSE_TOTAL: "2", LIMIT_SSE_CRED: "10" }, async ({ post, open }) => {
      const c = (await mk(post)).j, all = [await open({ code: c.code, hostKey: c.hostKey }), await open({ code: c.code, hostKey: c.hostKey })];
      assert.strictEqual((await open({ code: c.code, hostKey: c.hostKey })).s, 429); all.forEach(x => x.close());
    });
  });
  await t("つなぎっぱなしの接続：部屋の操作が何もない時間が続くと切る（部屋が残っていても）", () => withServer({ LIMIT_SSE_IDLE_MS: "800", LIMIT_IDLE_MS: "600000" }, async ({ post, open }) => {
    const c = (await mk(post)).j; const h = await open({ code: c.code, hostKey: c.hostKey });
    await sleep(1500);
    assert.ok(await h.ended(), "静かな部屋の接続は閉じられる");
    assert.strictEqual((await post("info", { code: c.code })).s, 200, "部屋そのものは残る");
  }));
  console.log(`\n${n} 件のテストを実行：${process.exitCode ? "失敗あり" : "すべて成功"}`);
})();
