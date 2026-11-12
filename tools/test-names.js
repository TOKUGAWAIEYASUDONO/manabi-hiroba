// 児童が入力する名前の検査。 node tools/test-names.js
// 1) data/ngwords.js（ブラウザ・先生の端末・server.js で共通）の単体テスト：長さ・文字種・NG語のゆれ・同じ名前の番号
// 2) server.js：参加・名前の入れなおし・先生の操作の権限・他の子の名前を児童に送らないこと
const { spawn } = require("child_process");
const path = require("path");
const assert = require("assert");
const NM = require(path.join(__dirname, "..", "data", "ngwords.js"));
let n = 0;
const t = async (name, fn) => { try { await fn(); n++; console.log("ok  " + name); } catch (e) { console.log("NG  " + name + "\n    " + e.message); process.exitCode = 1; } };
const why = s => NM.check(s).why;

(async () => {
  /* ---------- 1) 単体 ---------- */
  await t("長さ：1〜8文字（全角半角をそろえて数える）", () => {
    assert.strictEqual(why(""), "empty"); assert.strictEqual(why("   "), "empty"); assert.strictEqual(why(undefined), "empty"); assert.strictEqual(why(123), "empty");
    assert.ok(NM.check("あ").ok); assert.ok(NM.check("あいうえおかきく").ok);
    assert.strictEqual(why("あいうえおかきくけ"), "long");
    assert.ok(NM.check("ＡＢＣＤＥＦＧＨ").ok, "全角英字は半角にそろえて8文字");
    assert.strictEqual(NM.check("ＡＢＣ").name, "ABC"); assert.strictEqual(NM.check("ﾕｳﾄ").name, "ユウト", "半角カナは全角に");
    assert.strictEqual(NM.check("  ゆうと ").name, "ゆうと", "前後の空白は取る");
  });
  await t("文字種：ひらがな・カタカナ・漢字・英数字だけ（空白・記号・絵文字は不可）", () => {
    for (const ok of ["ゆうと", "ユウト", "ゆうと2", "ゆうと", "花子", "Ren", "ren8", "ソラ", "ひなた", "ミッキー", "々"]) assert.ok(NM.check(ok).ok, ok);
    for (const ng of ["ゆう と", "ゆう　と", "ゆうと!", "ゆうと。", "😀", "ゆうと😀", "a_b", "a-b", "<b>", "ゆう\nと", "a.b", "ゆうと@"]) assert.strictEqual(why(ng), "chars", JSON.stringify(ng));
  });
  await t("NG語：ひらがな・カタカナ・ローマ字・全角半角・大文字小文字のゆれ", () => {
    for (const w of ["ばか", "バカ", "ﾊﾞｶ", "baka", "BAKA", "Ｂａｋａ", "うんこ", "ウンコ", "unko", "UNKO", "ばかやろう", "くそがき", "kusogaki", "ころす", "korosu", "fuck", "FUCK", "Shit", "しね", "シネ", "ちんちん", "きもい", "kimoi"])
      assert.strictEqual(why(w), "ng", w);
    assert.strictEqual(why("ばーか"), "ng", "長音で間をあけても");
    assert.strictEqual(why("ば2か"), "ng", "数字をはさんでも");
    assert.strictEqual(why("たろうばか"), "ng", "部分一致");
  });
  await t("NG語：ふつうの名前は通す（誤検出が少ない）", () => {
    for (const w of ["ゆうと", "さくら", "ひなた", "はると", "あおい", "Ren", "Shine", "Sun", "しばかわ", "しばた", "ことり", "アオイ", "たいよう", "みらい", "kenta", "haruka", "shinji", "Ichika", "ちね", "いけだ", "ひろし", "ゆきな", "けいた"])
      assert.ok(NM.check(w).ok, w + " " + JSON.stringify(NM.check(w)));
    assert.strictEqual(why("しね2"), "ng", "短い語は、その名前だけのときに断る");
  });
  await t("同じ名前には番号（ゆうと2、ゆうと3…）。比べるときは大文字小文字・かな種をそろえる", () => {
    assert.strictEqual(NM.dedupe("ゆうと", []), "ゆうと");
    assert.strictEqual(NM.dedupe("ゆうと", ["そら"]), "ゆうと");
    assert.strictEqual(NM.dedupe("ゆうと", ["ゆうと"]), "ゆうと2");
    assert.strictEqual(NM.dedupe("ゆうと", ["ゆうと", "ゆうと2"]), "ゆうと3");
    assert.strictEqual(NM.dedupe("ゆうと", ["ユウト"]), "ゆうと2", "かなの種類がちがっても同じ名前");
    assert.strictEqual(NM.dedupe("Ren", ["REN"]), "Ren2");
    assert.ok(NM.check(NM.dedupe("あいうえおかきく", ["あいうえおかきく"])).why !== "ng");
  });

  /* ---------- 2) server.js ---------- */
  const PORT = 20000 + Math.floor(Math.random() * 20000);
  const srv = spawn(process.execPath, [path.join(__dirname, "..", "server.js")], { env: { ...process.env, PORT: String(PORT) }, stdio: ["ignore", "pipe", "pipe"] });
  let out = ""; srv.stdout.on("data", d => out += d); srv.stderr.on("data", d => out += d);
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const base = `http://127.0.0.1:${PORT}`;
  const post = async (name, body) => { const r = await fetch(`${base}/api/${name}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); return { s: r.status, j: await r.json().catch(() => ({})) }; };
  const state = async q => { const r = await fetch(`${base}/api/events?${q}`); const rd = r.body.getReader(); const v = new TextDecoder().decode((await rd.read()).value); await rd.cancel(); return { raw: v, j: JSON.parse(v.split("data: ")[1].split("\n")[0]) }; };
  for (let i = 0; i < 30; i++) { try { await fetch(base + "/"); break; } catch (e) { await sleep(100); } }
  const mkRoom = async (o = {}) => (await post("create", { mode: "chest", game: "calc", g: 3, t: 120, ...o })).j;
  try {
    await t("部屋の「なまえの きめかた」：既定は入力、auto で自動ニックネーム。info で参加画面が知る", async () => {
      const a = await mkRoom(), b = await mkRoom({ nm: "auto" }), c = await mkRoom({ nm: "zzz" });
      assert.strictEqual(a.nm, "input"); assert.strictEqual(b.nm, "auto"); assert.strictEqual(c.nm, "input");
      assert.strictEqual((await post("info", { code: a.code })).j.nm, "input"); assert.strictEqual((await post("info", { code: b.code })).j.nm, "auto");
      assert.strictEqual((await post("info", { code: "0000" })).s, 404);
      const j = (await post("join", { code: b.code, name: "ゆうと" })).j;
      assert.notStrictEqual(j.name, "ゆうと", "自動ニックネームの部屋では、送られた名前を使わない"); assert.ok(j.name.length >= 3);
    });
    await t("参加時の名前の検査（長さ・文字種・NG語）をサーバーでも行う", async () => {
      const r = await mkRoom();
      for (const [name, w] of [["", "empty"], ["あいうえおかきくけ", "long"], ["ゆう と", "chars"], ["😀", "chars"], ["ばか", "ng"], ["BAKA", "ng"], ["ＵＮＫＯ", "ng"], [null, "empty"], [123, "empty"], [{ a: 1 }, "empty"]]) {
        const x = await post("join", { code: r.code, name });
        assert.strictEqual(x.s, 400, JSON.stringify(name)); assert.strictEqual(x.j.why, w, JSON.stringify(name)); assert.ok(x.j.error);
      }
      assert.strictEqual((await post("join", { code: r.code })).s, 400, "名前なしでは入れない");
      const ok = await post("join", { code: r.code, name: " ゆうと " });
      assert.strictEqual(ok.s, 200); assert.strictEqual(ok.j.name, "ゆうと"); assert.ok(ok.j.pid && ok.j.token && ok.j.emoji);
    });
    await t("同じ名前には番号（ゆうと2、ゆうと3）", async () => {
      const r = await mkRoom();
      const names = [];
      for (let i = 0; i < 3; i++) names.push((await post("join", { code: r.code, name: "ゆうと" })).j.name);
      assert.deepStrictEqual(names, ["ゆうと", "ゆうと2", "ゆうと3"]);
      assert.strictEqual((await post("join", { code: r.code, name: "ユウト" })).j.name, "ユウト4", "かながちがっても同じ名前として数える");
    });
    await t("待合室で名前を入れなおす／アイコンだけ変える（入力の部屋）", async () => {
      const r = await mkRoom(), a = (await post("join", { code: r.code, name: "そら" })).j, b = (await post("join", { code: r.code, name: "うみ" })).j;
      const rr = await post("reroll", { code: r.code, pid: a.pid, token: a.token });
      assert.strictEqual(rr.s, 200); assert.strictEqual(rr.j.name, "そら", "入力の部屋の reroll は名前を変えない");
      assert.strictEqual((await post("rename", { code: r.code, pid: a.pid, token: "bad", name: "あ" })).s, 409);
      assert.strictEqual((await post("rename", { code: r.code, pid: a.pid, token: a.token, name: "ばか" })).s, 400);
      assert.strictEqual((await post("rename", { code: r.code, pid: a.pid, token: a.token, name: "うみ" })).j.name, "うみ2", "ほかの子と同じなら番号");
      assert.strictEqual((await post("rename", { code: r.code, pid: a.pid, token: a.token, name: "そら" })).j.name, "そら");
      assert.strictEqual((await post("start", { code: r.code, hostKey: r.hostKey })).s, 200);
      assert.strictEqual((await post("rename", { code: r.code, pid: b.pid, token: b.token, name: "あお" })).s, 409, "ゲーム中は変えられない");
    });
    await t("先生の操作（名前変更・ニックネーム化・退出）は先生だけ。名前もサーバーで検査", async () => {
      const r = await mkRoom(), a = (await post("join", { code: r.code, name: "そら" })).j, b = (await post("join", { code: r.code, name: "うみ" })).j;
      for (const op of ["hrename", "hnick", "kick"]) {
        assert.strictEqual((await post(op, { code: r.code, hostKey: "bad", pid: a.pid, name: "あお" })).s, 403, op + " 先生の鍵なし");
        assert.strictEqual((await post(op, { code: r.code, hostKey: a.token, pid: a.pid, name: "あお" })).s, 403, op + " 児童のトークンでは不可");
      }
      assert.strictEqual((await post("hrename", { code: r.code, hostKey: r.hostKey, pid: a.pid, name: "ばか" })).s, 400);
      assert.strictEqual((await post("hrename", { code: r.code, hostKey: r.hostKey, pid: a.pid, name: "うみ" })).s, 200);
      let h = (await state(`code=${r.code}&hostKey=${r.hostKey}`)).j;
      assert.deepStrictEqual(h.players.map(p => p.name).sort(), ["うみ", "うみ2"], "先生の変更でも同じ名前は番号");
      assert.strictEqual((await post("hnick", { code: r.code, hostKey: r.hostKey, pid: a.pid })).s, 200);
      h = (await state(`code=${r.code}&hostKey=${r.hostKey}`)).j;
      assert.ok(/^[^\d]{3,}$/.test(h.players.find(p => p.pid === a.pid).name) && h.players.find(p => p.pid === a.pid).name !== "うみ2", "動物のニックネームになる");
      assert.strictEqual((await post("kick", { code: r.code, hostKey: r.hostKey, pid: "nobody" })).s, 403);
      assert.strictEqual((await post("kick", { code: r.code, hostKey: r.hostKey, pid: b.pid })).s, 200);
      h = (await state(`code=${r.code}&hostKey=${r.hostKey}`)).j;
      assert.strictEqual(h.players.length, 1); assert.ok(!h.players.some(p => p.pid === b.pid));
      assert.strictEqual((await post("act", { code: r.code, pid: b.pid, token: b.token, op: "answer", right: true })).s, 403, "出された子は操作できない");
    });
    await t("児童の画面には、ほかの子の名前を送らない（自分の名前だけ me）。先生には全員の名前", async () => {
      const r = await mkRoom(), a = (await post("join", { code: r.code, name: "ひみつのA" })).j, b = (await post("join", { code: r.code, name: "ひみつのB" })).j;
      const ka = await state(`code=${r.code}&pid=${a.pid}&token=${a.token}`);
      assert.ok(!ka.raw.includes("ひみつのB"), "Aの画面にBの名前が入っていない"); assert.strictEqual(ka.j.me, "ひみつのA"); assert.ok(ka.j.players.every(p => p.name === ""));
      const anon = await state(`code=${r.code}`); assert.ok(!anon.raw.includes("ひみつの"), "資格なしの接続には名前を送らない"); assert.ok(!("me" in anon.j));
      const bad = await state(`code=${r.code}&pid=${a.pid}&token=wrong`); assert.ok(!bad.raw.includes("ひみつの"));
      const wrongHost = await state(`code=${r.code}&hostKey=nope`); assert.ok(!wrongHost.raw.includes("ひみつの"), "まちがった鍵では全員の名前は受け取れない");
      const h = await state(`code=${r.code}&hostKey=${r.hostKey}`); assert.deepStrictEqual(h.j.players.map(p => p.name).sort(), ["ひみつのA", "ひみつのB"]);
      assert.ok(!h.raw.includes(a.token) && !h.raw.includes(r.hostKey), "トークンは状態に入らない");
    });
    await t("うばう・入れかえの結果に、相手の名前を入れない（絵だけ）", async () => {
      const r = await mkRoom(), a = (await post("join", { code: r.code, name: "とるA" })).j, b = (await post("join", { code: r.code, name: "とられB" })).j;
      await post("start", { code: r.code, hostKey: r.hostKey });
      await post("act", { code: r.code, pid: b.pid, token: b.token, op: "add", n: 50 });
      const s = await post("act", { code: r.code, pid: a.pid, token: a.token, op: "steal" });
      assert.strictEqual(s.s, 200); assert.ok(!JSON.stringify(s.j).includes("とられB"), JSON.stringify(s.j));
      const w = await post("act", { code: r.code, pid: a.pid, token: a.token, op: "swap" });
      assert.ok(!JSON.stringify(w.j).includes("とられB"));
    });
    await t("クイズ：先生の画面だけが「答えた」を受け取る。出された子は集計から外れる", async () => {
      const qs = [{ t: "mc", q: "1+1は？", ch: ["1", "2", "3", "4"], ok: [1], sec: 20, pt: "normal" }, { t: "mc", q: "2+2は？", ch: ["1", "2", "3", "4"], ok: [3], sec: 20, pt: "normal" }];
      const r = (await post("create", { mode: "quiz", game: "quiz", g: 3, t: 120, gt: "T", qs })).j;
      const a = (await post("join", { code: r.code, name: "アンサA" })).j, b = (await post("join", { code: r.code, name: "アンサB" })).j, c = (await post("join", { code: r.code, name: "アンサC" })).j;
      await post("start", { code: r.code, hostKey: r.hostKey });
      await post("act", { code: r.code, pid: a.pid, token: a.token, op: "qans", i: 0, c: 1 });
      const h = (await state(`code=${r.code}&hostKey=${r.hostKey}`)).j, k = await state(`code=${r.code}&pid=${b.pid}&token=${b.token}`);
      assert.strictEqual(h.players.filter(p => p.a).length, 1); assert.strictEqual(h.players.find(p => p.a).pid, a.pid);
      assert.ok(k.j.players.every(p => !("a" in p)), "児童には『だれが答えたか』を送らない");
      assert.strictEqual((await post("kick", { code: r.code, hostKey: r.hostKey, pid: c.pid })).s, 200);
      assert.strictEqual((await state(`code=${r.code}&hostKey=${r.hostKey}`)).j.quiz.total, 2, "出された子は人数から外れる");
      await post("act", { code: r.code, pid: b.pid, token: b.token, op: "qans", i: 0, c: 0 });       // 残り全員が答えた → 正解を見せる
      assert.strictEqual((await state(`code=${r.code}&hostKey=${r.hostKey}`)).j.quiz.phase, "reveal");
    });
    await t("サーバーの出力（ログ）に名前が残らない", async () => {
      assert.ok(!/ゆうと|ひみつの|とるA|アンサ|そら|うみ/.test(out), "出力: " + out.slice(0, 300));
    });
  } finally { srv.kill(); }
  console.log(`\n${n} 件のテストを実行：${process.exitCode ? "失敗あり" : "すべて成功"}`);
})();
