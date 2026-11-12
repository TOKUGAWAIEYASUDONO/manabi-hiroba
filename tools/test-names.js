// 児童が入力する名前の検査。 node tools/test-names.js
// 1) data/ngwords.js（ブラウザ・先生の端末・server.js で共通）の単体テスト：長さ・文字種・NG語のゆれ・同じ名前の番号
// 2) server.js：参加・名前の入れなおし・先生の操作の権限・他の子の名前を児童に送らないこと
const { spawn } = require("child_process");
const path = require("path");
const assert = require("assert");
const NM = require(path.join(__dirname, "..", "data", "ngwords.js"));
const QZ = require(path.join(__dirname, "..", "data", "quizlib.js"));
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

  await t("NG語：漢字の悪口と、くり返し（しねしね）も断る", () => {
    for (const w of ["馬鹿", "阿呆", "死ね", "氏ね", "殺す", "消えろ", "黙れ", "変態", "気持ち悪い", "糞", "不細工", "たろう馬鹿", "しねしね", "シネシネ", "死ねしね", "しねしねしね", "くずくず", "ばかばか"])
      assert.strictEqual(why(w), "ng", w);
  });
  await t("電話番号・メール・URL らしい名前は断る（pii）。短い数字つきの名前は通す", () => {
    for (const w of ["09012345", "12345", "ゆうと12345", "０９０１２３４５", "123a4567", "http", "www1", "gmail", "Yahoo", "docomo"]) assert.strictEqual(why(w), "pii", w);
    for (const w of ["a@b.jp", "090-1234", "http://x", "lin@gmail.com"]) assert.ok(!NM.check(w).ok, w);   // 記号は文字の種類で先に断る
    for (const w of ["ゆうと2", "ゆうと2024", "Ren8", "3ばん", "ゆうと1234", "a12b34", "ＡＢＣ１２"]) assert.ok(NM.check(w).ok, w + " " + JSON.stringify(NM.check(w)));
  });
  await t("NG語：ふつうの漢字の名前は通す（誤検出の例外）", () => {
    for (const w of ["外山", "池田", "死神", "便利", "精一", "首藤", "大阪", "花子", "糸井", "たけし", "しんたろう", "しのぶ", "ねしね"])
      assert.ok(NM.check(w).ok, w + " " + JSON.stringify(NM.check(w)));
    assert.strictEqual(why("しね"), "ng");
  });
  await t("結果のCSV：= + - @ タブ で始まる文字には ' をつける（数式注入対策）。数字はそのまま", () => {
    const tab = String.fromCharCode(9);
    const csv = QZ.resultsCsv({ qs: [{ q: "=1+1" }, { q: "-3+5は？" }, { q: "+cmd" }, { q: "@SUM(1)" }, { q: tab + "x" }, { q: "ふつう" }], nameHead: "名前",
      players: [{ name: "=HYPERLINK(1)", v: -5, ok: 3, rec: "1" }, { name: "ゆうと", v: 100, ok: 1, rec: "0" }], stat: [] });
    for (const bad of ["=1+1", "-3+5は？", "+cmd", "@SUM(1)", "=HYPERLINK(1)"]) assert.ok(csv.includes("'" + bad), bad + " の前に ' がある");
    assert.ok(csv.includes("'" + tab + "x"), "タブで始まる");
    assert.ok(csv.includes(",-5,"), "ただの負の数はそのまま"); assert.ok(csv.includes(",ふつう"), "ふつうの文字は変えない");
    const tc = QZ.toCsv({ qs: [{ t: "mc", q: "=2+3", ch: ["-1", "+2", "@a", "b"], ok: [0], sec: 20, pt: "normal" }] });
    assert.ok(tc.includes("'=2+3") && tc.includes("'@a"), "toCsv も同じ");
    assert.ok(tc.includes(",-1,") && tc.includes(",+2,"), "数字の選択肢はそのまま");
  });
  /* ---------- 2) server.js ---------- */
  const PORT = 20000 + Math.floor(Math.random() * 20000);
  const srv = spawn(process.execPath, [path.join(__dirname, "..", "server.js")], { env: { ...process.env, PORT: String(PORT), JOIN_RATE_SCALE: "1000" }, stdio: ["ignore", "pipe", "pipe"] });
  let out = ""; srv.stdout.on("data", d => out += d); srv.stderr.on("data", d => out += d);
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const base = `http://127.0.0.1:${PORT}`;
  const post = async (name, body) => { const r = await fetch(`${base}/api/${name}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); return { s: r.status, j: await r.json().catch(() => ({})) }; };
  const state = async q => { const r = await fetch(`${base}/api/events`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(new URLSearchParams(q))) }); const rd = r.body.getReader(); const v = new TextDecoder().decode((await rd.read()).value); await rd.cancel(); return { raw: v, j: JSON.parse(v.split("data: ")[1].split("\n")[0]) }; };
  for (let i = 0; i < 30; i++) { try { await fetch(base + "/"); break; } catch (e) { await sleep(100); } }
  const mkRoom = async (o = {}) => (await post("create", { mode: "chest", game: "calc", g: 3, t: 120, ...o })).j;
  try {
    await t("部屋の「なまえの きめかた」：先生の画面の初期値は自動ニックネーム（index.html）。サーバーに何も送らないときは入力、auto で自動ニックネーム。info で参加画面が知る", async () => {
      const html = require("fs").readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
      assert.ok(/<select id="nmm"><option value="auto" selected>/.test(html), "先生の画面の「なまえの きめかた」は、はじめから自動ニックネーム");
      assert.ok(/nm:\$\("#nmm"\)\.value==="input"\?"input":"auto"/.test(html), "部屋づくりは、入力を選んだときだけ input");
      const a = await mkRoom(), b = await mkRoom({ nm: "auto" }), c = await mkRoom({ nm: "zzz" });
      assert.strictEqual(a.nm, "input"); assert.strictEqual(b.nm, "auto"); assert.strictEqual(c.nm, "input");
      assert.strictEqual((await post("info", { code: a.code })).j.nm, "input"); assert.strictEqual((await post("info", { code: b.code })).j.nm, "auto");
      assert.strictEqual((await post("info", { code: "0000" })).s, 404);
      const j = (await post("join", { code: b.code, name: "ゆうと" })).j;
      assert.notStrictEqual(j.name, "ゆうと", "自動ニックネームの部屋では、送られた名前を使わない"); assert.ok(j.name.length >= 3);
    });
    await t("参加時の名前の検査（長さ・文字種・NG語）をサーバーでも行う", async () => {
      const r = await mkRoom();
      for (const [name, w] of [["", "empty"], ["あいうえおかきくけ", "long"], ["ゆう と", "chars"], ["😀", "chars"], ["ばか", "ng"], ["BAKA", "ng"], ["ＵＮＫＯ", "ng"], ["09012345", "pii"], ["gmail", "pii"], [null, "empty"], [123, "empty"], [{ a: 1 }, "empty"]]) {
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
    await t("ゲームが始まったあとの参加は断る（待合室だけ参加できる）", async () => {
      const r = await mkRoom(), a = (await post("join", { code: r.code, name: "さき" })).j;
      assert.strictEqual((await post("info", { code: r.code })).s, 200);
      assert.strictEqual((await post("start", { code: r.code, hostKey: r.hostKey })).s, 200);
      const j = await post("join", { code: r.code, name: "おくれ" });
      assert.strictEqual(j.s, 409); assert.ok(/始まっている/.test(j.j.error), j.j.error);
      assert.strictEqual((await post("info", { code: r.code })).s, 409, "info でも先に断る");
      const h = (await state(`code=${r.code}&hostKey=${r.hostKey}`)).j; assert.strictEqual(h.players.length, 1);
      assert.strictEqual((await post("act", { code: r.code, pid: a.pid, token: a.token, op: "add", n: 5 })).s, 200, "はじめから入っていた子は遊べる");
      const q = (await post("create", { mode: "quiz", game: "quiz", g: 3, t: 120, gt: "T", qs: [{ t: "mc", q: "1+1は？", ch: ["1", "2"], ok: [1], sec: 20, pt: "normal" }] })).j;
      await post("join", { code: q.code, name: "ひとり" }); await post("start", { code: q.code, hostKey: q.hostKey });
      assert.strictEqual((await post("join", { code: q.code, name: "とちゅう" })).s, 409, "クイズも途中参加はできない");
      const e = await mkRoom(); await post("join", { code: e.code, name: "ひと" }); await post("end", { code: e.code, hostKey: e.hostKey });
      assert.strictEqual((await post("join", { code: e.code, name: "あと" })).s, 409, "終わったあとも不可");
    });
    await t("先生の「しめきり」：待合室でも参加を止める。あけなおせる。先生だけが操作できる", async () => {
      const r = await mkRoom(), a = (await post("join", { code: r.code, name: "いち" })).j;
      assert.strictEqual((await post("close", { code: r.code, hostKey: "bad", on: true })).s, 403);
      assert.strictEqual((await post("close", { code: r.code, hostKey: a.token, on: true })).s, 403, "児童のトークンでは不可");
      assert.strictEqual((await post("close", { code: r.code, hostKey: r.hostKey, on: true })).s, 200);
      const j = await post("join", { code: r.code, name: "に" }); assert.strictEqual(j.s, 409); assert.ok(/しめきられ/.test(j.j.error));
      assert.strictEqual((await post("info", { code: r.code })).s, 409);
      assert.strictEqual((await state(`code=${r.code}&hostKey=${r.hostKey}`)).j.closed, true, "先生の画面に しめきり中と出る");
      assert.strictEqual((await post("close", { code: r.code, hostKey: r.hostKey, on: false })).s, 200);
      assert.strictEqual((await post("join", { code: r.code, name: "さん" })).s, 200, "あけなおすと入れる");
    });
    await t("鍵（hostKey・token）は URL に載せない：GET の ?hostKey= では名前は見えない（POST の本文だけ）", async () => {
      const r = await mkRoom(), a = (await post("join", { code: r.code, name: "ないしょ" })).j;
      const g = await fetch(`${base}/api/events?code=${r.code}&hostKey=${r.hostKey}`); const rd = g.body.getReader(); const raw = new TextDecoder().decode((await rd.read()).value); await rd.cancel();
      assert.ok(!raw.includes("ないしょ"), "GET では先生にならない");
      const gk = await fetch(`${base}/api/events?code=${r.code}&pid=${a.pid}&token=${a.token}`); const rk = gk.body.getReader(); const rawk = new TextDecoder().decode((await rk.read()).value); await rk.cancel();
      assert.ok(!("me" in JSON.parse(rawk.split("data: ")[1].split("\n")[0])), "GET では参加者にならない");
      assert.strictEqual((await state(`code=${r.code}&hostKey=${r.hostKey}`)).j.players[0].name, "ないしょ");
      assert.strictEqual((await state(`code=${r.code}&pid=${a.pid}&token=${a.token}`)).j.me, "ないしょ");
      assert.strictEqual((await fetch(`${base}/api/events`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: "0000" }) })).status, 404);
    });
    await t("クイズ終了時：他の子の○×の記録（rec）は児童に送らない。自分の分（myrec）だけ。先生には全員ぶん", async () => {
      const qs = [{ t: "mc", q: "1+1は？", ch: ["1", "2", "3", "4"], ok: [1], sec: 20, pt: "normal" }, { t: "mc", q: "2+2は？", ch: ["1", "2", "3", "4"], ok: [3], sec: 20, pt: "normal" }];
      const r = (await post("create", { mode: "quiz", game: "quiz", g: 3, t: 120, gt: "T", qs })).j;
      const a = (await post("join", { code: r.code, name: "アリス" })).j, b = (await post("join", { code: r.code, name: "ボブ" })).j;
      await post("start", { code: r.code, hostKey: r.hostKey });
      await post("act", { code: r.code, pid: a.pid, token: a.token, op: "qans", i: 0, c: 1 });      // a：正解
      await post("act", { code: r.code, pid: b.pid, token: b.token, op: "qans", i: 0, c: 0 });      // b：まちがい
      await post("end", { code: r.code, hostKey: r.hostKey });
      const ka = (await state(`code=${r.code}&pid=${a.pid}&token=${a.token}`)).j, kb = (await state(`code=${r.code}&pid=${b.pid}&token=${b.token}`)).j, h = (await state(`code=${r.code}&hostKey=${r.hostKey}`)).j;
      assert.strictEqual(ka.quiz.phase, "end");
      assert.ok(ka.players.every(p => !("rec" in p)) && kb.players.every(p => !("rec" in p)), "児童には rec を送らない");
      assert.strictEqual(ka.myrec, "1-"); assert.strictEqual(kb.myrec, "0-", "自分の記録だけ");
      assert.strictEqual(h.players.find(p => p.pid === a.pid).rec, "1-"); assert.strictEqual(h.players.find(p => p.pid === b.pid).rec, "0-");
      const anon = (await state(`code=${r.code}`)).j; assert.ok(anon.players.every(p => !("rec" in p)) && !("myrec" in anon));
    });
    await t("join のくり返し制限（接続元ごと・部屋ごと）。コードの総当たりを止める", async () => {
      const startSrv = async env => {
        const port = 20000 + Math.floor(Math.random() * 20000);
        const p = spawn(process.execPath, [path.join(__dirname, "..", "server.js")], { env: { ...process.env, PORT: String(port), ...env }, stdio: "ignore" });
        const b = `http://127.0.0.1:${port}`; for (let i = 0; i < 30; i++) { try { await fetch(b + "/"); break; } catch (e) { await sleep(100); } }
        const po = async (name, body) => { const r = await fetch(`${b}/api/${name}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); return { s: r.status, j: await r.json().catch(() => ({})) }; };
        return { p, po };
      };
      let S = await startSrv({});       // 1) 存在しないコードを試し続ける → 5回めまでは「見つかりません」、そのあとは待たされる
      try {
        const codes = []; for (let i = 0; i < 8; i++) codes.push((await S.po("info", { code: String(1000 + i) })).s);
        assert.deepStrictEqual(codes, [404, 404, 404, 404, 404, 429, 429, 429], "総当たりは5回で止まる");
        const mine = (await S.po("create", { mode: "chest", game: "calc", g: 3, t: 120 })).j;
        assert.strictEqual((await S.po("join", { code: mine.code, name: "ゆうと" })).s, 429, "止められている間は本物のコードでも入れない（待つ）");
      } finally { S.p.kill(); }
      S = await startSrv({});           // 2) 名前の不備をくり返す → 5回で止まる
      try {
        const r = (await S.po("create", { mode: "chest", game: "calc", g: 3, t: 120 })).j;
        const rs = []; for (let i = 0; i < 7; i++) rs.push((await S.po("join", { code: r.code, name: "ばか" })).s);
        assert.deepStrictEqual(rs, [400, 400, 400, 400, 400, 429, 429]);
      } finally { S.p.kill(); }
      S = await startSrv({});           // 3) 部屋全体で1秒に10回まで（ふつうの名前でも）
      try {
        const r = (await S.po("create", { mode: "chest", game: "calc", g: 3, t: 120 })).j;
        const rs = []; for (let i = 0; i < 14; i++) rs.push((await S.po("join", { code: r.code, name: "こ" + "あいうえおかきくけこ"[i % 10] })).s);
        assert.strictEqual(rs.filter(s => s === 200).length, 10, JSON.stringify(rs)); assert.ok(rs.slice(10).every(s => s === 429), JSON.stringify(rs));
        await sleep(1100);
        assert.strictEqual((await S.po("join", { code: r.code, name: "あとから" })).s, 200, "1秒たてば また入れる");
      } finally { S.p.kill(); }
    });
    await t("サーバーの出力（ログ）に名前が残らない", async () => {
      assert.ok(!/ゆうと|ひみつの|とるA|アンサ|そら|うみ/.test(out), "出力: " + out.slice(0, 300));
    });
  } finally { srv.kill(); }
  console.log(`\n${n} 件のテストを実行：${process.exitCode ? "失敗あり" : "すべて成功"}`);
})();
