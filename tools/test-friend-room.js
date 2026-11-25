// 「ともだちと たいせん」（子どもの 端末が 部屋を つくる・2〜4人）の検査。 node tools/test-friend-room.js
// 手もと（127.0.0.1）で開くと出る（公開ページでは FRIEND_PUBLIC が true になるまで出ない）。
// 仲介サーバーのかわりに、同じブラウザの中だけで動く「にせの Peer」を使う（外へは つながない。test-room-next.js と同じ）。
// 1) ホームに入口・部屋を つくった 子も 自分の 部屋に 入る（名前は 自動の ニックネーム）
// 2) 友だちは 番号で 入る・4人まで・2人から はじめられる・つくった 子だけが はじめる
// 3) つくった 子が はなれると 部屋が なくなる
// 4) 授業モード・先生の「この端末の設定」の オフ・公開の 合図が false の ときは 出ない
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const assert = require("assert");
let chromium;
try { ({ chromium } = require("playwright")); } catch (e) { console.log("skip（playwright がありません）"); process.exit(0); }
let n = 0;
const t = async (name, fn) => { try { await fn(); n++; console.log("ok  " + name); } catch (e) { console.log("NG  " + name + "\n    " + (e && e.stack || e).split("\n").slice(0, 6).join("\n    ")); process.exitCode = 1; } };
const sleep = ms => new Promise(ok => setTimeout(ok, ms));
const src = fs.readFileSync(path.join(__dirname, "test-room-next.js"), "utf8");
const FAKE_PEER = eval(src.slice(src.indexOf("const FAKE_PEER = ") + 18, src.indexOf("async function flow")).trim().replace(/;$/, ""));

(async () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  await t("公開の 合図は まだ false（じゅんびちゅう）", () => assert.ok(/window\.FRIEND_PUBLIC=false;/.test(html)));
  const PORT = 20000 + Math.floor(Math.random() * 20000);
  const srv = spawn(process.execPath, [path.join(__dirname, "..", "server.js")], { env: { ...process.env, PORT: String(PORT) }, stdio: "ignore" });
  const base = `http://127.0.0.1:${PORT}/`;
  const browser = await chromium.launch();
  try {
    for (let i = 0; i < 50; i++) { try { await fetch(base); break; } catch (e) { await sleep(100); } }
    const ctx = await browser.newContext();
    await ctx.addInitScript(FAKE_PEER);
    await ctx.addInitScript(() => { try { if (!localStorage.getItem("mh_ui")) localStorage.setItem("mh_ui", JSON.stringify({ grade: 3, subj: "all" })); } catch (e) {} });
    const errs = [];
    const page = async () => { const p = await ctx.newPage(); p.on("pageerror", e => errs.push(e.message)); p.on("dialog", d => d.accept()); return p; };
    const H = await page();
    let code = "";
    await t("ホームに「ともだちと たいせん」の入口がある", async () => {
      await H.goto(base + "#home");
      await H.waitForSelector("#frTile");
      await H.click("#frTile");
      await H.waitForSelector("[data-frm=chest]");
      assert.ok((await H.evaluate(() => location.hash)) === "#friend");
    });
    await t("部屋を つくると、つくった 子も 入って 番号が 出る", async () => {
      await H.click("[data-frm=chest]");
      await H.waitForSelector('[data-sj="math"]');
      await H.click('[data-sj="math"]');
      await H.click('#modePick [data-id="calc"]');
      await H.waitForSelector("#frcode", { timeout: 15000 });
      code = (await H.textContent("#frcode")).trim();
      assert.ok(/^\d{4}$/.test(code), "番号 " + code);
      assert.strictEqual(await H.evaluate(() => HR.fr), 1);
      assert.strictEqual(await H.evaluate(() => HR.nm), "auto", "名前は 自動の ニックネーム");
      assert.strictEqual(await H.evaluate(() => HR.players.size), 1);
      assert.ok(await H.evaluate(() => KC && KC.local), "自分の 部屋へは 同じ ページの 中で つなぐ");
      assert.ok(await H.$eval("#frgo", b => b.disabled), "1人では はじめられない");
    });
    const kids = [];
    await t("友だちは 番号で 入れる（4人まで）", async () => {
      for (let i = 0; i < 3; i++) { const k = await page(); await k.goto(base + "#join?code=" + code); await k.waitForSelector("#frcode", { timeout: 15000 }); kids.push(k); }
      await H.waitForFunction(() => /4/.test((document.getElementById("frn") || {}).textContent || ""), null, { timeout: 8000 });
      assert.strictEqual(await kids[0].$("#frgo"), null, "入った 子には「はじめる」が ない");
      const x = await page(); await x.goto(base + "#join?code=" + code);
      await x.waitForFunction(() => /いっぱい/.test((document.getElementById("jerr") || {}).textContent || ""), null, { timeout: 15000 });
      await x.close();
      assert.strictEqual(await H.evaluate(() => HR.players.size), 4);
    });
    await t("入った 子からは はじめられない", async () => {
      const r = await kids[0].evaluate(() => kcReq("start", {}).then(() => "ok", e => e.message));
      assert.notStrictEqual(r, "ok");
      assert.strictEqual(await H.evaluate(() => HR.status), "lobby");
    });
    await t("つくった 子が「はじめる」→ みんな あそべる", async () => {
      await H.click("#frgo");
      for (const p of [H, ...kids]) await p.waitForFunction(() => M && M.net, null, { timeout: 15000 });
      await H.evaluate(() => api("end", { code: HR.code }));
      for (const p of [H, ...kids]) await p.waitForFunction(() => M && M.over, null, { timeout: 15000 });
    });
    await t("つくった 子が はなれると 部屋が なくなる", async () => {
      await H.evaluate(() => go("#home"));
      assert.strictEqual(await H.evaluate(() => HR), null);
      const k = await page(); await k.goto(base + "#join?code=" + code);
      await k.waitForFunction(() => ((document.getElementById("jerr") || {}).textContent || "").length > 0, null, { timeout: 15000 });
      await k.close();
    });
    await t("授業モード・先生の オフでは 出ない", async () => {
      assert.strictEqual(await H.evaluate(() => { LESSON = true; const v = frOn(); LESSON = false; return v; }), false, "授業モード");
      await H.evaluate(() => store.set(FRCFG, { on: 0 }));
      await H.goto(base + "#home"); await H.reload(); await H.waitForSelector(".zone.s-btl");
      assert.strictEqual(await H.$("#frTile"), null, "オフなら 入口なし");
      await H.goto(base + "#modesetup?m=chest&fr=1"); await H.waitForFunction(() => location.hash === "#home");
      await H.goto(base + "#teacher?tab=set"); await H.waitForSelector("#frOn");
      assert.strictEqual(await H.$eval("#frOn", e => e.checked), false);
      await H.click("#frOn");
      assert.strictEqual(await H.evaluate(() => frCfgOn()), true, "先生の 画面で オンに もどせる");
    });
    await t("授業モード（課題リンク）から #friend へは 行けない", async () => {
      const k = await page();
      await k.goto(base + "#play?game=calc&g=3&t=60&task=1");
      await k.evaluate(() => { location.hash = "#friend"; });
      await sleep(300);
      assert.ok(!(await k.$("[data-frm]")), "入口の 画面が 出ない");
      await k.close();
    });
    await t("公開ページ（localhost でない）では 出ない", async () => {
      const k = await page();
      await k.route("http://hirametto.test/**", r => { const u = new URL(r.request().url()); return r.continue({ url: base + u.pathname.slice(1) + u.search }); });
      await k.goto("http://hirametto.test/#home");
      await k.waitForSelector(".zone.s-btl");
      assert.strictEqual(await k.evaluate(() => FROPEN), false);
      assert.strictEqual(await k.$("#frTile"), null);
      await k.close();
    });
    await t("ページのエラーがない", () => assert.deepStrictEqual(errs, []));
  } finally { await browser.close(); srv.kill(); }
  console.log(`\n${n} 件 合格` + (process.exitCode ? "（NG あり）" : ""));
})();
