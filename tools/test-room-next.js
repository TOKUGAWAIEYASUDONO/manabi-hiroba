// 「つぎの あそびを えらぶ」の検査（同じ部屋・同じコードのまま、つぎの あそびへ）。 node tools/test-room-next.js
// 先生1人と児童3人を Playwright で開き、たからばこ → ロケット → クイズ と続ける。
// 1) 標準（先生の端末がサーバー役・P2P）：仲介サーバーのかわりに、同じブラウザの中だけで動く「にせの Peer」を使う（外へは つながない）。
//    Peer が作り直されない・コードが変わらない・児童は入りなおさない（pid が同じ）・児童が読みこみ直しても同じ部屋にもどる
// 2) 予備（server.js）：同じ流れで、コードが変わらない・児童は入りなおさない・先生以外は「つぎへ」を使えない
const { spawn } = require("child_process");
const path = require("path");
const assert = require("assert");
let chromium;
try { ({ chromium } = require("playwright")); } catch (e) { console.log("skip（playwright がありません）"); process.exit(0); }
let n = 0;
const t = async (name, fn) => { try { await fn(); n++; console.log("ok  " + name); } catch (e) { console.log("NG  " + name + "\n    " + (e && e.stack || e).split("\n").slice(0, 6).join("\n    ")); process.exitCode = 1; } };
const sleep = ms => new Promise(ok => setTimeout(ok, ms));

/* 同じブラウザの中（BroadcastChannel）だけで動く、PeerJS のにせもの。new Peer の回数を数える */
const FAKE_PEER = `(()=>{
  window.__peerN=0;
  class Em{constructor(){this._h={}} on(e,f){(this._h[e]=this._h[e]||[]).push(f);return this} off(e,f){this._h[e]=(this._h[e]||[]).filter(x=>x!==f);return this} emit(e,...a){for(const f of [...(this._h[e]||[])]){try{f(...a)}catch(x){console.error(x)}}}}
  class Conn extends Em{constructor(p,r,c){super();this.peer=p;this.remote=r;this.cid=c;this.open=false;this.dataChannel={bufferedAmount:0}}
    send(d){ if(!this.open) throw new Error("closed"); this.peer._ch.postMessage({k:"data",to:this.remote,cid:this.cid,d:JSON.parse(JSON.stringify(d))}); }
    close(){ if(!this.open) return; this.open=false; try{this.peer._ch.postMessage({k:"close",to:this.remote,cid:this.cid})}catch(e){} delete this.peer._c[this.cid]; this.emit("close"); } }
  class Peer extends Em{constructor(id){super(); window.__peerN++; this.id=id||("anon-"+Math.random().toString(36).slice(2)); this.open=false; this.destroyed=false; this.disconnected=false; this._c={}; this._ch=new BroadcastChannel("fakepeer");
      this._ch.onmessage=ev=>{ const m=ev.data; if(m.to!==this.id||this.destroyed) return;
        if(m.k==="conn"){ const c=new Conn(this,m.from,m.cid); c.open=true; this._c[m.cid]=c; this.emit("connection",c); this._ch.postMessage({k:"ack",to:m.from,cid:m.cid}); }
        else if(m.k==="ack"){ const c=this._c[m.cid]; if(c){ c.open=true; c.emit("open"); } }
        else if(m.k==="data"){ const c=this._c[m.cid]; if(c) c.emit("data",m.d); }
        else if(m.k==="close"){ const c=this._c[m.cid]; if(c){ c.open=false; delete this._c[m.cid]; c.emit("close"); } } };
      setTimeout(()=>{ this.open=true; this.emit("open",this.id); },20); }
    connect(id){ const cid=Math.random().toString(36).slice(2), c=new Conn(this,id,cid); this._c[cid]=c; this._ch.postMessage({k:"conn",to:id,from:this.id,cid});
      setTimeout(()=>{ if(!c.open) this.emit("error",{type:"peer-unavailable"}); },3000); return c; }
    reconnect(){} destroy(){ if(this.destroyed) return; for(const c of Object.values(this._c)) c.close(); this.destroyed=true; this.open=false; this._ch.close(); } }
  window.Peer=Peer; })();`;

async function flow(label, base, opt) {
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext();
    if (opt.fake) await ctx.addInitScript(FAKE_PEER);
    const errs = [];
    const page = async () => { const p = await ctx.newPage(); p.on("pageerror", e => errs.push(e.message)); p.on("dialog", d => d.accept()); return p; };
    const T = await page();
    await T.goto(base + "#teacher?tab=room");
    await T.evaluate(() => { qsNew([{ t: "mc", q: "1+1は？", ch: ["1", "2", "3", "4"], ok: [1], sec: 20, pt: "normal" }], "けんさ", 2); });      // クイズ用の先生のもんだい
    await T.goto(base + "#home"); await T.goto(base + "#teacher?tab=room");
    await T.click('.tc-mode[data-m="chest"]');
    await T.click("#mkroom");
    await T.waitForSelector(".bigcode");
    const code = (await T.textContent(".bigcode")).trim();
    assert.ok(/^\d{4}$/.test(code), "コード " + code);
    const kidUrl = base + "#join?code=" + code;
    const kids = [];
    for (let i = 0; i < 3; i++) { const k = await page(); await k.goto(kidUrl); kids.push(k); }
    const net = k => k.evaluate(() => NET && { code: NET.code, pid: NET.pid });
    await T.waitForFunction(() => document.getElementById("pxn") && document.getElementById("pxn").textContent === "3", null, { timeout: 15000 });
    const pids = []; for (const k of kids) { await k.waitForFunction(() => location.hash.startsWith("#lobby") && typeof NET === "object" && NET); pids.push((await net(k)).pid); }
    assert.strictEqual(new Set(pids).size, 3);

    const play = async (mode, kidReady) => {
      await T.waitForSelector("#hs:not([disabled])");
      await T.click("#hs");
      for (const k of kids) await k.waitForFunction(kidReady, null, { timeout: 15000 });
      await T.evaluate(() => api("end", HOST));
      await T.waitForSelector(".px-next #hnx, .qzh button", { timeout: 15000 });
    };
    const next = async mode => {
      const b = await T.$(".px-next #hnx"); if (b) await b.click(); else await T.click(".qzh button:has-text('つぎの あそびを えらぶ')");      // 結果画面の ボタン
      await T.waitForSelector("#nxban");
      assert.ok((await T.textContent("#nxban")).includes(code), "バナーに 同じコード");
      await T.click(`.tc-mode[data-m="${mode}"]`);
      assert.strictEqual((await T.textContent("#mkroom")).trim(), "この部屋で つぎへ");
      await T.click("#mkroom");
      await T.waitForSelector(".bigcode");
      assert.strictEqual((await T.textContent(".bigcode")).trim(), code, "コードが変わらない");
      for (const k of kids) {
        await k.waitForFunction(() => document.body.textContent.includes("つぎの あそびを まってね"), null, { timeout: 15000 });
        assert.ok((await k.evaluate(() => location.hash)).startsWith("#lobby"), "児童は 待合室のまま");
      }
    };
    await t(label + "：たからばこ（1つめ）", () => play("chest", () => M && M.net));
    await t(label + "：「つぎの あそびを えらぶ」→ ロケット（同じコード・児童は待合室へ）", () => next("rocket"));
    if (opt.reload) await t(label + "：児童が読みこみ直しても、同じ部屋・同じ pid にもどる", async () => {
      await kids[0].reload();
      await kids[0].waitForFunction(() => document.body.textContent.includes("つぎの あそびを まってね"), null, { timeout: 15000 });
      assert.strictEqual((await net(kids[0])).pid, pids[0]);
      assert.strictEqual(await T.evaluate(() => HR.players.size), 3, "人数はふえない");
      for (let i = 0; i < 20 && await kids[0].evaluate(() => !(KC && KC.conn && KC.conn.open)); i++) await sleep(100);
    });
    await t(label + "：ロケット（2つめ）", () => play("rocket", () => RK !== null && RK.code));
    await t(label + "：「つぎの あそびを えらぶ」→ クイズ", () => next("quiz"));
    await t(label + "：クイズ（3つめ）", () => play("quiz", () => QK !== null));
    await t(label + "：「もういちど おなじ あそび」も 同じコード", async () => {
      await T.click(".qzh button:has-text('もういちど おなじ あそび')");
      await T.waitForSelector(".bigcode", { timeout: 8000 }).catch(async e => { throw new Error("表示されない：" + (await T.evaluate(() => (document.getElementById("herr") || {}).textContent + " / " + location.hash + " / " + document.body.innerText.slice(0, 200)))); });
      assert.strictEqual((await T.textContent(".bigcode")).trim(), code);
    });
    await t(label + "：児童は入りなおしていない（pid が同じ・人数は3人のまま）", async () => {
      for (let i = 0; i < 3; i++) { const x = await net(kids[i]); assert.strictEqual(x.code, code); assert.strictEqual(x.pid, pids[i]); }
      assert.strictEqual((await T.textContent("#pxn")).trim(), "3");
    });
    if (opt.fake) await t(label + "：Peer は作り直されない（先生 1回・児童 1人1回）", async () => {
      assert.strictEqual(await T.evaluate(() => window.__peerN), 1, "先生の Peer");
      assert.strictEqual(await T.evaluate(() => HR.peer.destroyed), false);
      for (let i = 1; i < 3; i++) assert.strictEqual(await kids[i].evaluate(() => window.__peerN), 1, "児童の Peer " + i);
    });
    await t(label + "：ページのエラーがない", () => assert.deepStrictEqual(errs, []));
  } finally { await browser.close(); }
}

(async () => {
  const PORT = 20000 + Math.floor(Math.random() * 20000);
  const srv = spawn(process.execPath, [path.join(__dirname, "..", "server.js")], { env: { ...process.env, PORT: String(PORT), JOIN_RATE_SCALE: "1000" }, stdio: "ignore" });
  try {
    for (let i = 0; i < 50; i++) { try { await fetch(`http://127.0.0.1:${PORT}/`); break; } catch (e) { await sleep(100); } }
    await flow("P2P", `http://127.0.0.1:${PORT}/`, { fake: true, reload: true });
    await flow("server.js", `http://127.0.0.1:${PORT}/?net=server`, {});
    await t("server.js：「つぎへ」は先生の鍵がないと使えない・あそんでいる とちゅうは使えない", async () => {
      const post = async (name, body) => { const r = await fetch(`http://127.0.0.1:${PORT}/api/${name}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); return { s: r.status, j: await r.json() }; };
      const c = await post("create", { mode: "chest", game: "calc", g: 3, t: 60, rule: "normal", nm: "auto" }); assert.strictEqual(c.s, 200);
      const j = await post("join", { code: c.j.code }); assert.strictEqual(j.s, 200);
      assert.strictEqual((await post("next", { code: c.j.code, hostKey: "x", mode: "race", game: "calc", g: 3, t: 60 })).s, 403);
      assert.strictEqual((await post("next", { code: c.j.code, hostKey: c.j.hostKey, mode: "nope", game: "calc", g: 3 })).s, 400);
      assert.strictEqual((await post("start", { code: c.j.code, hostKey: c.j.hostKey })).s, 200);
      assert.strictEqual((await post("next", { code: c.j.code, hostKey: c.j.hostKey, mode: "race", game: "calc", g: 3, t: 60 })).s, 409);
      assert.strictEqual((await post("end", { code: c.j.code, hostKey: c.j.hostKey })).s, 200);
      const nx = await post("next", { code: c.j.code, hostKey: c.j.hostKey, mode: "boss", game: "calc", g: 3, t: 60 }); assert.strictEqual(nx.s, 200); assert.strictEqual(nx.j.rd, 1);
      assert.strictEqual((await post("act", { code: c.j.code, pid: j.j.pid, token: j.j.token, op: "set" })).s, 409, "待合室では あそべない");
      assert.strictEqual((await post("start", { code: c.j.code, hostKey: c.j.hostKey })).s, 200, "同じ児童のまま 始められる");
    });
  } finally { srv.kill(); }
  console.log(`\n${n} 件 合格` + (process.exitCode ? "（NG あり）" : ""));
})();
