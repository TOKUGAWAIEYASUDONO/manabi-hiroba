// まなびひろば 友だち対戦サーバー（Node.js 標準機能のみ・追加インストール不要）
// 起動: node server.js   → http://localhost:8787 を開く
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const NM = require("./data/ngwords.js");   // 児童が入力する名前の検査（ブラウザ・先生の端末と同じ部品）
const QZ = require("./data/quizlib.js");   // 先生のもんだい：形式チェックとクイズの進行（ブラウザと同じ部品）

const PORT = +process.env.PORT || 8787;
const PAGE = ["manabi-hiroba.html", "index.html"].map(f => path.join(__dirname, f)).find(f => fs.existsSync(f));
const MODES = ["chest", "race", "quiz"];
const GAMES = ["calc", "kuku", "kanji", "kencho", "eigo"];
const GOAL = 40;
const EV = { 4: "⭐", 9: "🌀", 13: "⭐", 17: "🌀", 21: "⭐", 25: "🌀", 27: "⭐", 31: "🌀", 35: "⭐", 38: "🌀" };
const MAX_PLAYERS = 60;
// やさしいルール：たからばこの「うばう・入れかえ・落とす」と、すごろくの🌀（もどる）をなくす
const RULES = ["normal", "easy"];
const EASY_NG = ["steal", "swap", "lose"];
// 遊び方ごとに受け付ける操作（answer はどちらでも可）
const MODE_OPS = { chest: ["add", "x2", "lose", "steal", "swap"], race: ["move"], quiz: ["qans"] };
const evOf = rule => rule === "easy" ? Object.fromEntries(Object.entries(EV).filter(([, e]) => e !== "🌀")) : EV;
// ページが読み込む問題データ（data フォルダの .js だけを返す）
const DATA_DIR = path.join(__dirname, "data");

const ADJ = ["はやい", "かしこい", "げんきな", "つよい", "やさしい", "ひかる", "ふしぎな", "まじめな", "すごい", "のんびり"];
const ANI = [["パンダ", "🐼"], ["ウサギ", "🐰"], ["カエル", "🐸"], ["ネコ", "🐱"], ["イヌ", "🐶"], ["キツネ", "🦊"],
  ["コアラ", "🐨"], ["ペンギン", "🐧"], ["トラ", "🐯"], ["ライオン", "🦁"], ["タコ", "🐙"], ["ヒヨコ", "🐤"]];

const rooms = new Map();
const rnd = n => crypto.randomInt(n);
const id = () => crypto.randomBytes(9).toString("base64url");

function nick(room, except) {
  const used = new Set([...room.players.values()].filter(p => p !== except).map(p => p.name));
  for (let i = 0; i < 80; i++) {
    const [n, e] = ANI[rnd(ANI.length)], name = ADJ[rnd(ADJ.length)] + n;
    if (!used.has(name)) return { name, emoji: e };
  }
  return { name: "なかま" + (100 + rnd(900)), emoji: "🙂" };
}
// 名前を入力で決める部屋のアイコン：まだ使われていない動物をえらぶ
function pickEmoji(room) {
  const used = new Set([...room.players.values()].map(p => p.emoji));
  const free = ANI.filter(a => !used.has(a[1])), from = free.length ? free : ANI;
  return from[rnd(from.length)][1];
}
const NAME_ERR = { empty: "名前を入れてね", long: "名前は8文字までです", chars: "使えない文字が入っています", ng: "その名前は使えません" };
const allNames = (room, except) => [...room.players.values()].filter(q => q !== except).map(q => q.name);
function newCode() {
  for (;;) { const c = String(1000 + rnd(9000)); if (!rooms.has(c)) return c; }
}
// host=true（先生の画面）だけ、全員の名前と「いま答えたか」を送る。児童の画面には、ほかの子の名前を送らない（name は空）
function pub(room, host) {
  const nm = p => host ? p.name : "";
  return {
    code: room.code, mode: room.mode, game: room.game, g: room.g, t: room.t, rule: room.rule, nm: room.nm,
    status: room.status, endAt: room.endAt, now: Date.now(),
    gt: room.gt || "",
    players: [...room.players.values()].map(p => room.qz
      ? { pid: p.pid, name: nm(p), emoji: p.emoji, v: p.v, ok: p.ok, ng: p.ng, st: p.st | 0, lp: p.lp | 0, lc: p.lc | 0, ...(room.qz.phase === "end" ? { rec: p.rec || "" } : {}), ...(host && room.qz.phase === "q" && room.qz.answeredBy(p.pid) ? { a: 1 } : {}) }
      : { pid: p.pid, name: nm(p), emoji: p.emoji, v: p.v, ok: p.ok, ng: p.ng }),
    ...(room.qz ? { quiz: room.qz.pub() } : {})
  };
}
// 児童の画面：全員ぶんは名前なし。自分の名前だけを me に添える（他の子の名前は入らない）
function kidMsg(room, res, base) {
  const p = res.pid && room.players.get(res.pid);
  return "data: " + base + (p ? ',"me":' + JSON.stringify(p.name) : "") + "}\n\n";
}
// クイズの得点などを、部屋の参加者の表に写す
function qzSync(room) {
  const E = room.qz;
  for (const [pid, p] of room.players) { const s = E.P.get(pid); if (s) Object.assign(p, { v: s.v, ok: s.ok, ng: s.ng, st: s.st, lp: s.lp, lc: s.lc }); if (E.phase === "end") p.rec = E.recStr(pid); }
}
function broadcast(room, now = false) {
  const send = () => {
    room.timer = null;
    const hostMsg = "data: " + JSON.stringify(pub(room, true)) + "\n\n", kidBase = JSON.stringify(pub(room, false)).slice(0, -1);
    for (const res of room.clients) res.write(res.host ? hostMsg : kidMsg(room, res, kidBase));
  };
  if (now) { clearTimeout(room.timer); return send(); }
  if (!room.timer) room.timer = setTimeout(send, 150);
}
function endRoom(room) {
  if (room.status === "ended") return;
  if (room.qz) { room.qz.finish(); qzSync(room); }
  room.status = "ended"; broadcast(room, true);
}
setInterval(() => {
  const now = Date.now();
  for (const room of rooms.values()) {
    if (room.qz) { if (room.status === "playing" && room.qz.tick(now)) { qzSync(room); if (room.qz.phase === "end") endRoom(room); else broadcast(room, true); } }
    else if (room.status === "playing" && now >= room.endAt) endRoom(room);
    if (now - room.created > 3 * 3600e3) { for (const r of room.clients) r.end(); rooms.delete(room.code); }
  }
}, 250);

function body(req) {
  return new Promise((ok, ng) => {
    let s = "";
    req.on("data", c => { s += c; if (s.length > 400000) { ng(new Error("too large")); req.destroy(); } });
    req.on("end", () => { try { ok(s ? JSON.parse(s) : {}); } catch (e) { ng(e); } });
  });
}
function json(res, code, obj) {
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify(obj));
}
function player(room, b) {
  const p = room && room.players.get(b.pid);
  return p && p.token === b.token ? p : null;
}
function leader(room, me) {
  return [...room.players.values()].filter(p => p !== me).sort((a, b) => b.v - a.v)[0];
}

const API = {
  create(b) {
    const own = b.mode === "quiz" || b.game === "mine";       // 先生のもんだいを使う部屋
    if (!MODES.includes(b.mode) || !(own || GAMES.includes(b.game))) return [400, { error: "設定が正しくありません" }];
    const g = Math.min(6, Math.max(1, b.g | 0)), t = Math.min(300, Math.max(60, b.t | 0));
    const rule = RULES.includes(b.rule) ? b.rule : "normal";
    const room = { code: newCode(), hostKey: id(), mode: b.mode, game: b.mode === "quiz" ? "quiz" : b.game, g, t, rule, status: "lobby", endAt: 0,
      players: new Map(), clients: new Set(), created: Date.now(), timer: null, gt: "", nm: b.nm === "auto" ? "auto" : "input" };
    if (own) {
      const r = QZ.cleanSet({ title: b.gt, qs: b.qs });         // 型・文字数・個数・時間の値を調べてから使う
      if (!r.ok) return [400, { error: "もんだいが正しくありません：" + r.why }];
      const qs = b.mode === "quiz" ? r.set.qs : r.set.qs.filter(q => q.t === "mc");   // たからばこ・すごろくは4択だけ
      if (!qs.length) return [400, { error: "4択の問題がありません" }];
      room.gt = r.set.title; if (b.mode !== "quiz") room.set = { title: r.set.title, qs };   // クイズでは、答えつきの問題を児童に渡さない
      if (b.mode === "quiz") room.qz = QZ.engine(qs, { easy: rule === "easy" });
    }
    rooms.set(room.code, room);
    return [200, { code: room.code, hostKey: room.hostKey, nm: room.nm }];
  },
  // 参加画面が、名前を入力させる部屋かどうかを知るための問い合わせ（部屋の中身は返さない）
  info(b) {
    const room = rooms.get(String(b.code));
    if (!room) return [404, { error: "その部屋コードは見つかりません" }];
    return [200, { nm: room.nm }];
  },
  join(b) {
    const room = rooms.get(String(b.code));
    if (!room) return [404, { error: "その部屋コードは見つかりません" }];
    if (room.status === "ended") return [409, { error: "この対戦はもう終わっています" }];
    if (room.players.size >= MAX_PLAYERS) return [409, { error: "部屋がいっぱいです" }];
    let who;
    if (room.nm === "input") {       // 児童が入力した名前：長さ・文字・NG語を調べ、同じ名前には番号をつける
      const c = NM.check(b.name);
      if (!c.ok) return [400, { error: NAME_ERR[c.why], why: c.why }];
      who = { name: NM.dedupe(c.name, allNames(room)), emoji: pickEmoji(room) };
    } else who = nick(room);
    const p = { pid: id(), token: id(), ...who, v: 0, ok: 0, ng: 0 };
    room.players.set(p.pid, p); if (room.qz) room.qz.add(p.pid); broadcast(room);
    return [200, { code: room.code, pid: p.pid, token: p.token, name: p.name, emoji: p.emoji, nm: room.nm }];
  },
  reroll(b) {
    const room = rooms.get(String(b.code)), p = player(room, b);
    if (!p || room.status !== "lobby") return [409, { error: "今は変えられません" }];
    if (room.nm === "input") p.emoji = pickEmoji(room); else Object.assign(p, nick(room));      // 入力の部屋は、アイコンだけ変える
    broadcast(room);
    return [200, { name: p.name, emoji: p.emoji }];
  },
  // 児童が待合室で名前を入れなおす
  rename(b) {
    const room = rooms.get(String(b.code)), p = player(room, b);
    if (!p || room.status !== "lobby" || room.nm !== "input") return [409, { error: "今は変えられません" }];
    const c = NM.check(b.name);
    if (!c.ok) return [400, { error: NAME_ERR[c.why], why: c.why }];
    p.name = NM.dedupe(c.name, allNames(room, p)); broadcast(room, true);
    return [200, { name: p.name, emoji: p.emoji }];
  },
  // 先生：名前をかえる／ニックネームにする／へやから出す
  hrename(b) {
    const room = rooms.get(String(b.code)), p = room && room.hostKey === b.hostKey && room.players.get(b.pid);
    if (!p) return [403, { error: "先生の画面からのみ操作できます" }];
    const c = NM.check(b.name);
    if (!c.ok) return [400, { error: NAME_ERR[c.why], why: c.why }];
    p.name = NM.dedupe(c.name, allNames(room, p)); broadcast(room, true);
    return [200, { ok: true }];
  },
  hnick(b) {
    const room = rooms.get(String(b.code)), p = room && room.hostKey === b.hostKey && room.players.get(b.pid);
    if (!p) return [403, { error: "先生の画面からのみ操作できます" }];
    Object.assign(p, nick(room, p)); broadcast(room, true);
    return [200, { ok: true }];
  },
  kick(b) {
    const room = rooms.get(String(b.code));
    if (!room || room.hostKey !== b.hostKey || !room.players.has(b.pid)) return [403, { error: "先生の画面からのみ操作できます" }];
    room.players.delete(b.pid);
    if (room.qz) { room.qz.remove(b.pid); if (room.status === "playing" && room.qz.tick(Date.now())) qzSync(room); }
    broadcast(room, true);
    return [200, { ok: true }];
  },
  start(b) {
    const room = rooms.get(String(b.code));
    if (!room || room.hostKey !== b.hostKey) return [403, { error: "先生の画面からのみ操作できます" }];
    if (!room.players.size) return [409, { error: "まだ誰も参加していません" }];
    for (const p of room.players.values()) Object.assign(p, { v: 0, ok: 0, ng: 0 });
    if (room.qz) { room.status = "playing"; room.endAt = 0; room.qz.begin(Date.now()); qzSync(room); broadcast(room, true); return [200, { ok: true }]; }
    room.status = "playing"; room.endAt = Date.now() + room.t * 1000 + 3000; // 3秒のカウントダウン
    broadcast(room, true);
    return [200, { ok: true }];
  },
  // クイズ：先生が「つぎへ」を押す（出題中なら しめきって正解を見せる）
  qnext(b) {
    const room = rooms.get(String(b.code));
    if (!room || !room.qz || room.hostKey !== b.hostKey) return [403, { error: "先生の画面からのみ操作できます" }];
    if (room.status !== "playing") return [409, { error: "今は進められません" }];
    if (room.qz.next(Date.now())) { qzSync(room); if (room.qz.phase === "end") endRoom(room); else broadcast(room, true); }
    return [200, { ok: true }];
  },
  // クイズ：正答率の低い問題だけ、同じ部屋でもう一度
  qreplay(b) {
    const room = rooms.get(String(b.code));
    if (!room || !room.qz || room.hostKey !== b.hostKey) return [403, { error: "先生の画面からのみ操作できます" }];
    if (room.status !== "ended") return [409, { error: "今は始められません" }];
    const low = room.qz.low(0.6).map(i => room.qz.qs[i]);
    if (!low.length) return [409, { error: "正答率の低い問題はありません" }];
    room.status = "playing"; room.endAt = 0; room.qz.begin(Date.now(), low); qzSync(room); broadcast(room, true);
    return [200, { ok: true }];
  },
  // たからばこ・すごろくで使う、先生のもんだい（参加している児童だけが読める）
  set(b) {
    const room = rooms.get(String(b.code)), p = player(room, b);
    if (!p || !room.set) return [403, { error: "参加情報が正しくありません" }];
    return [200, room.set];
  },
  end(b) {
    const room = rooms.get(String(b.code));
    if (!room || room.hostKey !== b.hostKey) return [403, { error: "先生の画面からのみ操作できます" }];
    endRoom(room); return [200, { ok: true }];
  },
  act(b) {
    const room = rooms.get(String(b.code)), p = player(room, b);
    if (!p) return [403, { error: "参加情報が正しくありません" }];
    if (room.status !== "playing") return [409, { error: "対戦中ではありません" }];
    if (b.op !== "answer" && !(MODE_OPS[room.mode] || []).includes(b.op)) return [403, { error: "この遊び方では使えない操作です" }];
    if (room.qz) {      // クイズ：答えの番号だけ受け取り、点数は部屋の側で決める
      if (b.op !== "qans") return [403, { error: "この遊び方では使えない操作です" }];
      const r = room.qz.answer(p.pid, b.i, b.c, Date.now());
      if (!r.ok) return [409, { error: r.why === "late" ? "もう時間がおわりました" : "この答えは使えません" }];
      if (room.qz.tick(Date.now())) { qzSync(room); broadcast(room, true); } else broadcast(room);
      return [200, { ok: true }];
    }
    if (room.rule === "easy" && EASY_NG.includes(b.op)) return [403, { error: "やさしいルールの部屋では使えません" }];
    const out = { ok: true };
    switch (b.op) {
      case "answer": b.right ? p.ok++ : p.ng++; break;
      case "add": p.v += Math.min(50, Math.max(0, b.n | 0)); break;
      case "x2": if (room.mode === "chest") p.v = Math.min(p.v * 2, 100000); break;
      case "lose": out.n = Math.round(p.v * 0.25); p.v -= out.n; break;
      case "steal": {
        const t = leader(room, p);
        if (t && t.v > 0) { out.n = Math.round(t.v * 0.2); t.v -= out.n; p.v += out.n; out.target = t.emoji; }       // 児童には動物の絵だけ返す（名前は返さない）
        else { out.n = 20; p.v += 20; }
        break;
      }
      case "swap": {
        const t = leader(room, p);
        if (t && t.v > p.v) { [t.v, p.v] = [p.v, t.v]; out.target = t.emoji; } else { p.v += 20; out.n = 20; }
        break;
      }
      case "move": {
        if (room.mode !== "race") break;
        const n = Math.min(6, Math.max(1, b.n | 0));
        p.v = Math.min(GOAL, p.v + n);
        out.ev = evOf(room.rule)[p.v] || "";
        if (out.ev === "⭐") p.v = Math.min(GOAL, p.v + 3);
        if (out.ev === "🌀") p.v = Math.max(0, p.v - 2);
        break;
      }
      default: return [400, { error: "不明な操作です" }];
    }
    out.v = p.v;
    if (room.mode === "race" && p.v >= GOAL) endRoom(room); else broadcast(room);
    return [200, out];
  }
};

http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  try {
    if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/manabi-hiroba.html" || url.pathname === "/index.html")) {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
      return fs.createReadStream(PAGE).pipe(res);
    }
    const dm = url.pathname.match(/^\/data\/((?:gen\/)?[\w-]+\.js)$/);   // data/gen/*.js は単元ごとの問題の型
    if (req.method === "GET" && dm) {
      const f = path.join(DATA_DIR, dm[1]);
      if (!fs.existsSync(f)) return json(res, 404, { error: "not found" });
      res.writeHead(200, { "Content-Type": "text/javascript; charset=utf-8", "Cache-Control": "no-store" });
      return fs.createReadStream(f).pipe(res);
    }
    const vm = url.pathname.match(/^\/vendor\/([\w.-]+\.(js|txt))$/);   // 同梱の部品とライセンス表示
    if (req.method === "GET" && vm) {
      const f = path.join(__dirname, "vendor", vm[1]);
      if (!fs.existsSync(f)) return json(res, 404, { error: "not found" });
      res.writeHead(200, { "Content-Type": vm[2] === "js" ? "text/javascript; charset=utf-8" : "text/plain; charset=utf-8" });
      return fs.createReadStream(f).pipe(res);
    }
    if (req.method === "GET" && url.pathname === "/api/events") {
      const room = rooms.get(url.searchParams.get("code") || "");
      if (!room) return json(res, 404, { error: "部屋が見つかりません" });
      res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-store", Connection: "keep-alive" });
      res.write("retry: 2000\n\n");
      const hk = url.searchParams.get("hostKey"), pl = room.players.get(url.searchParams.get("pid") || "");
      res.host = !!hk && hk === room.hostKey;                                   // 先生の画面だけが全員の名前を受け取る
      res.pid = !res.host && pl && pl.token === url.searchParams.get("token") ? pl.pid : "";
      res.write(res.host ? "data: " + JSON.stringify(pub(room, true)) + "\n\n" : kidMsg(room, res, JSON.stringify(pub(room, false)).slice(0, -1)));
      room.clients.add(res);
      const hb = setInterval(() => res.write(": ping\n\n"), 15000);
      req.on("close", () => { clearInterval(hb); room.clients.delete(res); });
      return;
    }
    const m = url.pathname.match(/^\/api\/(\w+)$/);
    if (req.method === "POST" && m && API[m[1]]) {
      const [code, obj] = API[m[1]](await body(req));
      return json(res, code, obj);
    }
    json(res, 404, { error: "not found" });
  } catch (e) {
    json(res, 400, { error: "リクエストが正しくありません" });
  }
}).listen(PORT, () => console.log(`まなびひろば サーバー起動: http://localhost:${PORT}`));
