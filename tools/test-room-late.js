// 「とちゅうから 入る」の検査。 node tools/test-room-late.js
// 先生1人・児童2人を Playwright で開く。1人めが入って スタート → 2人めが あとから 番号で入る。
// あそびかた（たからばこ・すごろく・ボスバトル・じんとり・ロケット・クイズ）ごとに：
//   あとから来た子も あそべる／先生の大画面に ばんごうが出る／しめきると 3人めは入れない・ばんごうが かくれる
// 標準（先生の端末がサーバー役・P2P）は test-room-next.js と同じ「にせの Peer」で、外へは つながない。予備（server.js）も同じ流れ。
// SHOT=フォルダ を つけると、先生の大画面の 写真を とる。
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const assert = require("assert");
let chromium;
try { ({ chromium } = require("playwright")); } catch (e) { console.log("skip（playwright がありません）"); process.exit(0); }
let n = 0;
const t = async (name, fn) => { try { await fn(); n++; console.log("ok  " + name); } catch (e) { console.log("NG  " + name + "\n    " + (e && e.stack || e).split("\n").slice(0, 6).join("\n    ")); process.exitCode = 1; } };
const sleep = ms => new Promise(ok => setTimeout(ok, ms));
const FAKE_PEER = fs.readFileSync(path.join(__dirname, "test-room-next.js"), "utf8").match(/const FAKE_PEER = `([\s\S]*?)`;/)[1];
const SHOT = process.env.SHOT || "";

const MODES0 = [
  ["chest", "たからばこ", () => M && M.net && !document.body.textContent.includes("NaN")],
  ["race", "すごろく", () => M && M.net && !document.body.textContent.includes("NaN")],
  ["boss", "ボスバトル", () => typeof CB !== "undefined" && CB !== null],
  ["jin", "じんとり", () => typeof CB !== "undefined" && CB !== null],
  ["rocket", "ロケット", () => RK !== null && RK.code],
  ["quiz", "クイズ", () => QK !== null],
];

const MODES = process.env.ONLY ? MODES0.filter(m => m[0] === process.env.ONLY) : MODES0;
async function flow(label, base, opt) {
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    if (opt.fake) await ctx.addInitScript(FAKE_PEER);
    const errs = [];
    // 児童は べつの コンテキスト（server.js の つなぎっぱなしの 通信が 1つの ブラウザの 上限に ならないよう）。にせの Peer は 同じ コンテキストの 中だけで つながるので P2P は 同じ
    const page = async (own) => { const p = own ? await (await browser.newContext({ viewport: { width: 390, height: 800 } })).newPage() : await ctx.newPage(); p.on("pageerror", e => errs.push(e.message)); p.on("dialog", d => d.accept()); return p; };
    const T = await page();
    await T.goto(base + "#teacher?tab=room");
    await T.evaluate(() => { qsNew([{ t: "mc", q: "1+1は？", ch: ["1", "2", "3", "4"], ok: [1], sec: 20, pt: "normal" }, { t: "mc", q: "2+2は？", ch: ["1", "2", "3", "4"], ok: [3], sec: 20, pt: "normal" }], "けんさ", 2); });
    for (const [mode, name, ready] of MODES) {
      await t(`${label}：${name}：とちゅうから入って あそべる・ばんごうが出る・しめきり`, async () => {
        await T.goto(base + "#home"); await T.goto(base + "#teacher?tab=room");
        await T.click(`.tc-mode[data-m="${mode}"]`);
        await T.click("#mkroom");
        await T.waitForSelector(".bigcode");
        const code = (await T.textContent(".bigcode")).trim();
        const url = base + "#join?code=" + code;
        const a = await page(!opt.fake); await a.goto(url);
        await a.waitForFunction(() => location.hash.startsWith("#lobby"), null, { timeout: 15000 });
        await T.waitForSelector("#hs:not([disabled])"); await T.click("#hs");
        await a.waitForFunction(ready, null, { timeout: 15000 });
        await T.waitForSelector("#pxcode b", { timeout: 5000 });
        assert.strictEqual((await T.textContent("#pxcode b")).trim(), code, "大画面に ばんごう");
        await sleep(mode === "race" || mode === "chest" ? 300 : 3500);      // 協力モードの カウントダウンの あと
        const b = await page(!opt.fake); await b.goto(url);      // あとから来た子
        await b.waitForFunction(ready, null, { timeout: 15000 });
        { const bt = await b.innerText("body"), i = bt.indexOf("始まっているので"); assert.ok(i < 0, "「もう始まっているので入れません」が出ない：" + bt.slice(Math.max(0, i - 80), i + 40)); }
        if (opt.fake) assert.strictEqual(await T.evaluate(() => HR.players.size), 2, "2人");
        if (mode === "jin" && opt.fake) assert.deepStrictEqual(await T.evaluate(() => HR.co.teams()), [1, 1], "あとから来た子は 人数の すくない チームへ");
        if (mode === "chest" || mode === "race") assert.strictEqual(await b.evaluate(() => M.state.players.find(p => p.pid === NET.pid).v), 0, "0 から");
        if (SHOT) { await sleep(800); await T.screenshot({ path: path.join(SHOT, `${label}-${mode}.png`) }); }
        await T.click("#pxcl");      // 大画面の「入室をしめきる」
        await T.waitForSelector("#pxcode.closed", { timeout: 5000 });
        assert.ok(!(await T.$("#pxcode b")), "しめきったら ばんごうを かくす");
        const c = await page(!opt.fake); await c.goto(url);
        await c.waitForFunction(() => /しめきられ/.test(document.body.textContent), null, { timeout: 15000 });
        if (SHOT && mode === "chest") await T.screenshot({ path: path.join(SHOT, `${label}-${mode}-shimekiri.png`) });
        await T.click("#pxcl");      // しめきりを やめる
        await T.waitForSelector("#pxcode b", { timeout: 5000 });
        await T.evaluate(() => api("end", HOST));
        await T.waitForFunction(() => !document.getElementById("pxcode"), null, { timeout: 15000 });
        for (const p of [a, b, c]) (opt.fake ? await p.close() : await p.context().close());
      });
    }
    await t(label + "：ページのエラーがない", () => assert.deepStrictEqual(errs, []));
  } finally { await browser.close(); }
}

(async () => {
  const PORT = 20000 + Math.floor(Math.random() * 20000);
  const srv = spawn(process.execPath, [path.join(__dirname, "..", "server.js")], { env: { ...process.env, PORT: String(PORT), JOIN_RATE_SCALE: "1000" }, stdio: "ignore" });
  try {
    for (let i = 0; i < 50; i++) { try { await fetch(`http://127.0.0.1:${PORT}/`); break; } catch (e) { await sleep(100); } }
    await flow("P2P", `http://127.0.0.1:${PORT}/`, { fake: true });
    await flow("server", `http://127.0.0.1:${PORT}/?net=server`, {});
  } finally { srv.kill(); }
  console.log(`\n${n} 件 合格` + (process.exitCode ? "（NG あり）" : ""));
})();
