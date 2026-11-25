// 「たくさんの子が ほぼ同時に入る」検査。 node tools/test-room-crowd.js
// 先生が「みんな入って」と言うと、30人ほどが同じ1秒に入ろうとする。総当たり対策（部屋全体で1秒に10回まで）で
// 断らずに、少し待たせて順番に通すこと。まちがったコード・同じ接続からのくり返しは、今までどおり止めること。
// 1) 標準（P2P）：仲介サーバーのかわりに、同じブラウザの中だけで動く「にせの Peer」を使う（外へは つながない）
// 2) 予備（server.js）：同じ接続元（IP）から30人が入る（教室の端末は外から見ると同じ住所）
const { spawn } = require("child_process");
const path = require("path");
const assert = require("assert");
let chromium;
try { ({ chromium } = require("playwright")); } catch (e) { console.log("skip（playwright がありません）"); process.exit(0); }
const KIDS0 = +process.env.KIDS || 30;
let n = 0;
const t = async (name, fn) => { try { await fn(); n++; console.log("ok  " + name); } catch (e) { console.log("NG  " + name + "\n    " + (e && e.stack || e).split("\n").slice(0, 6).join("\n    ")); process.exitCode = 1; } };
const kids0 = {};
const sleep = ms => new Promise(ok => setTimeout(ok, ms));
// 仲介サーバーが 混んでいる ふり：window.__failOpen 回だけ、つながらない（奇数回めは server-error、偶数回めは 返事なし＝時間切れ）
const FLAKY = `(()=>{ const P=window.Peer; let n=0; window.Peer=class extends P{ constructor(...a){ super(...a); if(window.__failOpen>0){ window.__failOpen--; this._fail=++n; } }
  emit(e,...a){ if(this._fail&&e==="open"){ if(this._fail%2) super.emit("error",{type:"server-error"}); return; } return super.emit(e,...a); } }; })();`;
const FAKE_PEER = require("fs").readFileSync(path.join(__dirname, "test-room-next.js"), "utf8").match(/const FAKE_PEER = `([\s\S]*?)`;/)[1];

async function crowd(label, base, opt) {
  const KIDS = opt.kids || KIDS0;
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext();
    if (opt.fake) await ctx.addInitScript(FAKE_PEER);
    if (opt.flaky) await ctx.addInitScript(FLAKY);
    const errs = [];
    // P2P のにせの Peer は 同じブラウザ枠の中だけで動くので、1つの枠に まとめる。server.js は 本物と同じく1人1台（ブラウザの「同じ相手への接続は6本まで」に当たらないよう、枠を分ける）
    const page = async kid => { const p = await (kid && !opt.fake ? await browser.newContext() : ctx).newPage(); p.on("pageerror", e => errs.push(e.message)); p.on("dialog", d => d.accept()); return p; };
    const T = await page();
    await T.goto(base + "#teacher?tab=room");
    await T.click('.tc-mode[data-m="chest"]');
    await T.click("#mkroom");
    await T.waitForSelector(".bigcode");
    const code = (await T.textContent(".bigcode")).trim();
    const kids = [];
    for (let i = 0; i < KIDS; i++) { const k = await page(true); await k.goto(base + "#home"); kids.push(k); }
    if (opt.flaky) await Promise.all(kids.map((k, i) => k.evaluate(f => { KC_OPEN_MS = 1500; KC_WAIT_X = 0.1; window.__failOpen = f; }, i % 3)));      // 子どもによって 0〜2回 しっぱい
    const t0 = Date.now();
    await Promise.all(kids.map(k => k.evaluate(c => { location.hash = "#join?code=" + c; }, code)));      // 「みんな入って」：全員 ほぼ同時に
    await t(label + `：先生1＋子ども${KIDS}人が ほぼ同時に入っても、全員 入れる`, async () => {
      const bad = [];
      await Promise.all(kids.map((k, i) => k.waitForFunction(() => location.hash.startsWith("#lobby") && typeof NET === "object" && NET && NET.pid, null, { timeout: 30000 })
        .catch(async () => bad.push(i + "：" + await k.evaluate(() => location.hash + " " + ((document.getElementById("jerr") || {}).textContent || ""))))));
      assert.deepStrictEqual(bad, [], "入れなかった子");
      await T.waitForFunction(k => document.getElementById("pxn") && document.getElementById("pxn").textContent === String(k), KIDS, { timeout: 10000 });
      const pids = await Promise.all(kids.map(k => k.evaluate(() => NET.pid)));
      assert.strictEqual(new Set(pids).size, KIDS, "pid が重ならない");
      console.log(`    （全員そろうまで ${((Date.now() - t0) / 1000).toFixed(1)} 秒）`);
    });
    kids0.ctx = ctx;
    if (opt.more) await opt.more({ T, kids, code });
    await t(label + "：ページのエラーがない", () => assert.deepStrictEqual(errs, []));
  } finally { await browser.close(); }
}

(async () => {
  const PORT = 20000 + Math.floor(Math.random() * 20000);
  const srv = spawn(process.execPath, [path.join(__dirname, "..", "server.js")], { env: { ...process.env, PORT: String(PORT) }, stdio: "ignore" });
  try {
    for (let i = 0; i < 50; i++) { try { await fetch(`http://127.0.0.1:${PORT}/`); break; } catch (e) { await sleep(100); } }
    await crowd("P2P", `http://127.0.0.1:${PORT}/`, { fake: true, more: async ({ T, kids }) => {
      await t("P2P：同じ接続から join を何度もくり返すと、今までどおり止められる（人数もふえない）", async () => {
        const r = await kids[0].evaluate(async () => (await Promise.allSettled([1, 2, 3, 4, 5, 6, 7].map(() => kcReq("join", {})))).map(x => x.status === "fulfilled" ? "ok" : x.reason.message));
        assert.ok(r.filter(x => x === "しばらくしてから、もう一度ためしてね").length >= 2, JSON.stringify(r));
        await sleep(500);
        assert.strictEqual(await T.evaluate(() => HR.players.size), KIDS0, "人数はふえない");
      });
      await t("P2P：部屋全体の順番待ちは長くなりすぎない（6秒より先は断る）", async () => {
        const w = await T.evaluate(() => { const r = {}; return Array.from({ length: 80 }, () => hrRate(r, {})); });
        assert.deepStrictEqual(w.slice(0, 10), Array(10).fill(0), "はじめの10人は すぐ");
        assert.ok(w.slice(10, 60).every((x, i) => x > 0 && x <= 6000), "そのあとは 順番に まつ：" + w.slice(10, 60));
        assert.ok(w.slice(70).every(x => x === -1), "まちが 長すぎる分は 断る：" + w.slice(60));
      });
    } });
    await crowd("P2P（仲介サーバーが混んでいる）", `http://127.0.0.1:${PORT}/`, { fake: true, flaky: true, kids: 12, more: async ({ code }) => {
      await t("P2P：仲介サーバーに何度もつながらないときは、やり直しは3回まで。エラーの種類（server-error など）を画面に出す", async () => {
        const k = kids0.k = await kids0.ctx.newPage();
        await k.goto(`http://127.0.0.1:${PORT}/#home`);
        await k.evaluate(c => { KC_OPEN_MS = 1500; KC_WAIT_X = 0.1; window.__failOpen = 9; location.hash = "#join?code=" + c; }, code);
        await k.waitForFunction(() => /つな.*（(server-error|timeout)）/.test(document.getElementById("jerr").textContent), null, { timeout: 20000 });
        assert.strictEqual(await k.evaluate(() => window.__failOpen), 6, "3回だけ ためす");
        assert.ok((await k.evaluate(() => location.hash)).startsWith("#join"));
      });
    } });
    await crowd("server.js", `http://127.0.0.1:${PORT}/?net=server`, {});
    await t("server.js：まちがったコードを何度もためす接続元は、今までどおり止められる（正しいコードも しばらく入れない）", async () => {
      const post = async (name, body) => { const r = await fetch(`http://127.0.0.1:${PORT}/api/${name}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); return { s: r.status, j: await r.json() }; };
      const c = await post("create", { mode: "chest", game: "calc", g: 3, t: 60, rule: "normal", nm: "auto" }); assert.strictEqual(c.s, 200);
      const wrong = String((+c.j.code + 1) % 10000).padStart(4, "0");
      const st = []; for (let i = 0; i < 7; i++) st.push((await post("join", { code: wrong })).s);
      assert.deepStrictEqual(st, [404, 404, 404, 404, 404, 429, 429]);
      assert.strictEqual((await post("join", { code: c.j.code })).s, 429, "正しいコードでも しばらく入れない");
      assert.strictEqual((await post("joinRoom", { code: c.j.code })).s, 404, "順番待ちの中の部品は、外から呼べない");
    });
  } finally { srv.kill(); }
  console.log(`\n${n} 件 合格` + (process.exitCode ? "（NG あり）" : ""));
})();
