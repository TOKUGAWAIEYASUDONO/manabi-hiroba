// まなびひろば 友だち対戦サーバー（Node.js 標準機能のみ・追加インストール不要）
// 起動: node server.js   → http://localhost:8787 を開く
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = +process.env.PORT || 8787;
const PAGE = ["manabi-hiroba.html", "index.html"].map(f => path.join(__dirname, f)).find(f => fs.existsSync(f));
const MODES = ["chest", "race"];
const GAMES = ["calc", "kuku", "kanji", "kencho", "eigo"];
const GOAL = 40;
const EV = { 4: "⭐", 9: "🌀", 13: "⭐", 17: "🌀", 21: "⭐", 25: "🌀", 27: "⭐", 31: "🌀", 35: "⭐", 38: "🌀" };
const MAX_PLAYERS = 60;
// やさしいルール：たからばこの「うばう・入れかえ・落とす」と、すごろくの🌀（もどる）をなくす
const RULES = ["normal", "easy"];
const EASY_NG = ["steal", "swap", "lose"];
// 遊び方ごとに受け付ける操作（answer はどちらでも可）
const MODE_OPS = { chest: ["add", "x2", "lose", "steal", "swap"], race: ["move"] };
const evOf = rule => rule === "easy" ? Object.fromEntries(Object.entries(EV).filter(([, e]) => e !== "🌀")) : EV;
// ページが読み込む問題データ（data フォルダの .js だけを返す）
const DATA_DIR = path.join(__dirname, "data");

const ADJ = ["はやい", "かしこい", "げんきな", "つよい", "やさしい", "ひかる", "ふしぎな", "まじめな", "すごい", "のんびり"];
const ANI = [["パンダ", "🐼"], ["ウサギ", "🐰"], ["カエル", "🐸"], ["ネコ", "🐱"], ["イヌ", "🐶"], ["キツネ", "🦊"],
  ["コアラ", "🐨"], ["ペンギン", "🐧"], ["トラ", "🐯"], ["ライオン", "🦁"], ["タコ", "🐙"], ["ヒヨコ", "🐤"]];

const rooms = new Map();
const rnd = n => crypto.randomInt(n);
const id = () => crypto.randomBytes(9).toString("base64url");

function nick(room) {
  const used = new Set([...room.players.values()].map(p => p.name));
  for (let i = 0; i < 80; i++) {
    const [n, e] = ANI[rnd(ANI.length)], name = ADJ[rnd(ADJ.length)] + n;
    if (!used.has(name)) return { name, emoji: e };
  }
  return { name: "なかま" + (100 + rnd(900)), emoji: "🙂" };
}
function newCode() {
  for (;;) { const c = String(1000 + rnd(9000)); if (!rooms.has(c)) return c; }
}
function pub(room) {
  return {
    code: room.code, mode: room.mode, game: room.game, g: room.g, t: room.t, rule: room.rule,
    status: room.status, endAt: room.endAt, now: Date.now(),
    players: [...room.players.values()].map(p => ({ pid: p.pid, name: p.name, emoji: p.emoji, v: p.v, ok: p.ok, ng: p.ng }))
  };
}
function broadcast(room, now = false) {
  const send = () => {
    room.timer = null;
    const msg = "data: " + JSON.stringify(pub(room)) + "\n\n";
    for (const res of room.clients) res.write(msg);
  };
  if (now) { clearTimeout(room.timer); return send(); }
  if (!room.timer) room.timer = setTimeout(send, 150);
}
function endRoom(room) {
  if (room.status === "ended") return;
  room.status = "ended"; broadcast(room, true);
}
setInterval(() => {
  const now = Date.now();
  for (const room of rooms.values()) {
    if (room.status === "playing" && now >= room.endAt) endRoom(room);
    if (now - room.created > 3 * 3600e3) { for (const r of room.clients) r.end(); rooms.delete(room.code); }
  }
}, 1000);

function body(req) {
  return new Promise((ok, ng) => {
    let s = "";
    req.on("data", c => { s += c; if (s.length > 10000) { ng(new Error("too large")); req.destroy(); } });
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
    if (!MODES.includes(b.mode) || !GAMES.includes(b.game)) return [400, { error: "設定が正しくありません" }];
    const g = Math.min(6, Math.max(1, b.g | 0)), t = Math.min(300, Math.max(60, b.t | 0));
    const rule = RULES.includes(b.rule) ? b.rule : "normal";
    const room = { code: newCode(), hostKey: id(), mode: b.mode, game: b.game, g, t, rule, status: "lobby", endAt: 0,
      players: new Map(), clients: new Set(), created: Date.now(), timer: null };
    rooms.set(room.code, room);
    return [200, { code: room.code, hostKey: room.hostKey }];
  },
  join(b) {
    const room = rooms.get(String(b.code));
    if (!room) return [404, { error: "その部屋コードは見つかりません" }];
    if (room.status === "ended") return [409, { error: "この対戦はもう終わっています" }];
    if (room.players.size >= MAX_PLAYERS) return [409, { error: "部屋がいっぱいです" }];
    const p = { pid: id(), token: id(), ...nick(room), v: 0, ok: 0, ng: 0 };
    room.players.set(p.pid, p); broadcast(room);
    return [200, { code: room.code, pid: p.pid, token: p.token, name: p.name, emoji: p.emoji }];
  },
  reroll(b) {
    const room = rooms.get(String(b.code)), p = player(room, b);
    if (!p || room.status !== "lobby") return [409, { error: "今は変えられません" }];
    Object.assign(p, nick(room)); broadcast(room);
    return [200, { name: p.name, emoji: p.emoji }];
  },
  start(b) {
    const room = rooms.get(String(b.code));
    if (!room || room.hostKey !== b.hostKey) return [403, { error: "先生の画面からのみ操作できます" }];
    if (!room.players.size) return [409, { error: "まだ誰も参加していません" }];
    for (const p of room.players.values()) Object.assign(p, { v: 0, ok: 0, ng: 0 });
    room.status = "playing"; room.endAt = Date.now() + room.t * 1000 + 3000; // 3秒のカウントダウン
    broadcast(room, true);
    return [200, { ok: true }];
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
    if (room.rule === "easy" && EASY_NG.includes(b.op)) return [403, { error: "やさしいルールの部屋では使えません" }];
    const out = { ok: true };
    switch (b.op) {
      case "answer": b.right ? p.ok++ : p.ng++; break;
      case "add": p.v += Math.min(50, Math.max(0, b.n | 0)); break;
      case "x2": if (room.mode === "chest") p.v = Math.min(p.v * 2, 100000); break;
      case "lose": out.n = Math.round(p.v * 0.25); p.v -= out.n; break;
      case "steal": {
        const t = leader(room, p);
        if (t && t.v > 0) { out.n = Math.round(t.v * 0.2); t.v -= out.n; p.v += out.n; out.target = t.emoji + t.name; }
        else { out.n = 20; p.v += 20; }
        break;
      }
      case "swap": {
        const t = leader(room, p);
        if (t && t.v > p.v) { [t.v, p.v] = [p.v, t.v]; out.target = t.emoji + t.name; } else { p.v += 20; out.n = 20; }
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
    const dm = url.pathname.match(/^\/data\/([\w-]+\.js)$/);
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
      res.write("data: " + JSON.stringify(pub(room)) + "\n\n");
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
