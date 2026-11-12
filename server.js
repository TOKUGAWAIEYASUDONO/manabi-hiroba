// まなびひろば 友だち対戦サーバー（Node.js 標準機能のみ・追加インストール不要）
// 起動: node server.js   → http://localhost:8787 を開く
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const NM = require("./data/ngwords.js");   // 児童が入力する名前の検査（ブラウザ・先生の端末と同じ部品）
const QZ = require("./data/quizlib.js");   // 先生のもんだい：形式チェックとクイズの進行（ブラウザと同じ部品）
const COOP = require("./data/cooplib.js"); // 協力モード「ロケット はっしゃ」の進行（ブラウザ・先生の端末と同じ部品）

const PORT = +process.env.PORT || 8787;
const PAGE = ["manabi-hiroba.html", "index.html"].map(f => path.join(__dirname, f)).find(f => fs.existsSync(f));
const MODES = ["chest", "race", "quiz", "rocket"];
const GAMES = ["calc", "kuku", "kanji", "kencho", "eigo"];
const GOAL = 40;
const EV = { 4: "⭐", 9: "🌀", 13: "⭐", 17: "🌀", 21: "⭐", 25: "🌀", 27: "⭐", 31: "🌀", 35: "⭐", 38: "🌀" };
const MAX_PLAYERS = 60;
// やさしいルール：たからばこの「うばう・入れかえ・落とす」と、すごろくの🌀（もどる）をなくす
const RULES = ["normal", "easy"];
const EASY_NG = ["steal", "swap", "lose"];
// 遊び方ごとに受け付ける操作（answer はどちらでも可）
const MODE_OPS = { chest: ["add", "x2", "lose", "steal", "swap"], race: ["move"], quiz: ["qans"], rocket: COOP.OPS };
const COOP_SCALE = +process.env.COOP_TIME_SCALE > 0 && +process.env.COOP_TIME_SCALE <= 1 ? +process.env.COOP_TIME_SCALE : 1;   // 検査用：協力モードの時間をちぢめる倍率（ふつうは 1）
const evOf = rule => rule === "easy" ? Object.fromEntries(Object.entries(EV).filter(([, e]) => e !== "🌀")) : EV;
// ページが読み込む問題データ（data フォルダの .js だけを返す）
const DATA_DIR = path.join(__dirname, "data");

const ADJ = ["はやい", "かしこい", "げんきな", "つよい", "やさしい", "ひかる", "ふしぎな", "まじめな", "すごい", "のんびり"];
const ANI = [["パンダ", "🐼"], ["ウサギ", "🐰"], ["カエル", "🐸"], ["ネコ", "🐱"], ["イヌ", "🐶"], ["キツネ", "🦊"],
  ["コアラ", "🐨"], ["ペンギン", "🐧"], ["トラ", "🐯"], ["ライオン", "🦁"], ["タコ", "🐙"], ["ヒヨコ", "🐤"]];

const rooms = new Map();
// join のくり返し制限（コードを当てる総当たり・部屋を埋めるいたずら対策）
// 部屋全体で1秒に10回まで。同じ接続元（IPアドレス）からは、失敗した試し（コード違い・名前の不備）が10秒に5回まで、成功も10秒に30回まで
// （教室の端末は同じ接続元に見えることがあるので、成功のほうはゆるくしている）
const RATE_SCALE = Math.max(1, +process.env.JOIN_RATE_SCALE || 1);      // 回数の上限を何倍にするか（検査用。ふつうは 1 のまま）
const hits = new Map();
function hitOk(key, limit, ms, now) {
  limit *= RATE_SCALE;
  const a = (hits.get(key) || []).filter(t => now - t < ms);
  if (a.length >= limit) { hits.set(key, a); return false; }
  a.push(now); hits.set(key, a); return true;
}
function hitPeek(key, limit, ms, now) { return (hits.get(key) || []).filter(t => now - t < ms).length < limit * RATE_SCALE; }
const TOO_MANY = [429, { error: "しばらくしてから、もう一度ためしてね" }];
// 部屋づくり・つなぎっぱなしの接続の上限（メモリを使い切られないため）。環境変数は検査用で、ふつうは変えない
const envN = (k, d) => { const v = +process.env[k]; return v > 0 ? v : d; };
const LIM = {
  createPerMin: envN("LIMIT_CREATE_PER_MIN", 6),          // 同じ接続元（IP）が1分につくれる部屋
  createPerHour: envN("LIMIT_CREATE_PER_HOUR", 40),       // 同じ接続元が1時間につくれる部屋
  roomsPerIp: envN("LIMIT_ROOMS_PER_IP", 15),             // 同じ接続元が同時に持てる部屋
  roomsTotal: envN("LIMIT_ROOMS_TOTAL", 400),             // サーバー全体の同時の部屋数
  unusedMs: envN("LIMIT_UNUSED_MS", 15 * 60e3),           // 誰も入らず・誰も見ていない部屋は、この時間で消す
  idleMs: envN("LIMIT_IDLE_MS", 45 * 60e3),               // 何の操作もない部屋は、この時間で消す
  endedMs: envN("LIMIT_ENDED_MS", 30 * 60e3),             // 終わった部屋は、この時間で消す
  sseRoom: envN("LIMIT_SSE_ROOM", 150),                   // 1つの部屋の接続（児童60人＋先生＋つなぎなおし）
  sseCred: envN("LIMIT_SSE_CRED", 3),                     // 同じ児童／先生の資格情報での接続（タブ・つなぎなおし）
  sseIp: envN("LIMIT_SSE_IP", 200),                       // 同じ接続元の接続（教室の端末は同じ接続元に見える）
  sseTotal: envN("LIMIT_SSE_TOTAL", 4000),
  sseAnon: envN("LIMIT_SSE_ANON", 10),                     // 鍵なし（部屋コードだけ）の接続は、接続元ごとに少なく
  sseIdleMs: envN("LIMIT_SSE_IDLE_MS", 20 * 60e3),        // 部屋の操作が何もない時間がこれを超えたら、つなぎっぱなしの接続を切る
  sseBuf: envN("LIMIT_SSE_BUF", 1 << 20)                  // 送り切れずにたまった量（低速な接続を切る）
};
const sseIpCount = new Map();
let sseTotal = 0;
const createLog = new Map();       // ip -> 部屋をつくった時刻の一覧
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
// 部屋に入れない状態：終わった／もう始まった（途中参加はできない）／先生が しめきった
const joinBlock = room => room.status === "ended" ? [409, { error: "この対戦はもう終わっています" }]
  : room.status !== "lobby" ? [409, { error: "もう始まっているので入れません" }]
  : room.closed ? [409, { error: "入室はしめきられました" }] : null;
const NAME_ERR = { empty: "名前を入れてね", long: "名前は8文字までです", chars: "使えない文字が入っています", ng: "その名前は使えません", pii: "数字が長くならぶ名前や、メール・URLの名前は使えません" };
const allNames = (room, except) => [...room.players.values()].filter(q => q !== except).map(q => q.name);
function newCode() {
  for (;;) { const c = String(1000 + rnd(9000)); if (!rooms.has(c)) return c; }
}
// host=true（先生の画面）だけ、全員の名前と「いま答えたか」を送る。児童の画面には、ほかの子の名前を送らない（name は空）
function pub(room, host) {
  const nm = p => host ? p.name : "";
  return {
    code: room.code, mode: room.mode, game: room.game, g: room.g, t: room.t, rule: room.rule, nm: room.nm, nh: room.nh,
    status: room.status, closed: !!room.closed, endAt: room.endAt, now: Date.now(),
    gt: room.gt || "",
    ...(room.co ? { co: room.co.pub(Date.now(), host) } : {}),
    players: room.co ? coPlayers(room, host) : [...room.players.values()].map(p => room.qz
      ? { pid: p.pid, name: nm(p), emoji: p.emoji, v: p.v, ok: p.ok, ng: p.ng, st: p.st | 0, lp: p.lp | 0, lc: p.lc | 0, ...(host && room.qz.phase === "end" ? { rec: p.rec || "" } : {}), ...(host && room.qz.phase === "q" && room.qz.answeredBy(p.pid) ? { a: 1 } : {}) }
      : { pid: p.pid, name: nm(p), emoji: p.emoji, v: p.v, ok: p.ok, ng: p.ng }),
    ...(room.qz ? { quiz: room.qz.pub() } : {})
  };
}
// 協力モード：対戦中は人の一覧を送らない（小さく保つ）。先生の画面だけは、名前の吹き出しのために一覧を受け取る
function coPlayers(room, host) {
  if (host) return [...room.players.values()].map(p => ({ pid: p.pid, name: p.name, emoji: p.emoji, ix: room.co.P.get(p.pid) ? room.co.P.get(p.pid).ix : 0 }));
  if (room.status === "playing") return [];
  return [...room.players.values()].map(p => ({ pid: p.pid, name: "", emoji: p.emoji }));
}
// 児童の画面：全員ぶんは名前なし。自分の名前だけを me に添える（他の子の名前は入らない）
function kidMsg(room, res, base) {
  const p = res.pid && room.players.get(res.pid);
  // クイズの終了後は、その子自身の○×の記録（myrec）だけを添える（ほかの子の記録は送らない）
  return "data: " + base + (p ? ',"me":' + JSON.stringify(p.name) + (room.qz && room.qz.phase === "end" ? ',"myrec":' + JSON.stringify(p.rec || "") : "") : "") + "}\n\n";
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
    for (const res of room.clients) { if (res.writableNeedDrain && !now) continue; res.write(res.host ? hostMsg : kidMsg(room, res, kidBase)); }   // 詰まっている接続には、その回だけ送らない（次に追いつく）
  };
  if (now) { clearTimeout(room.timer); return send(); }
  if (!room.timer) room.timer = setTimeout(send, room.co ? 250 : 150);      // 協力モードは250msにまとめる
}
function endRoom(room) {
  if (room.status === "ended") return;
  if (room.qz) { room.qz.finish(); qzSync(room); }
  if (room.co) room.co.finish(Date.now());
  room.status = "ended"; broadcast(room, true);
}
setInterval(() => {
  const now = Date.now();
  for (const room of rooms.values()) {
    if (room.co) { if (room.status === "playing" && room.co.tick(now)) { if (room.co.ph === "end") endRoom(room); else broadcast(room, true); } }
    else if (room.qz) { if (room.status === "playing" && room.qz.tick(now)) { qzSync(room); if (room.qz.phase === "end") endRoom(room); else broadcast(room, true); } }
    else if (room.status === "playing" && now >= room.endAt) endRoom(room);
    const dead = now - room.created > 3 * 3600e3                                              // 3時間でかならず消す
      || (room.status === "lobby" && !room.players.size && !room.clients.size && now - room.last > LIM.unusedMs)   // 使われていない部屋
      || (room.status === "ended" && now - room.last > LIM.endedMs)                         // 終わってしばらくたった部屋
      || now - room.last > LIM.idleMs;                                                      // 長いあいだ何も操作がない部屋
    if (dead) { for (const r of room.clients) r.end(); rooms.delete(room.code); continue; }
    for (const r of room.clients) {                                                         // 部屋が静かなまま長いときと、送り切れない低速な接続は切る
      if (r.writableLength > LIM.sseBuf || now - room.last > LIM.sseIdleMs) r.end();
    }
  }
  for (const [k, a] of createLog) { const f = a.filter(t => now - t < 3600e3); if (f.length) createLog.set(k, f); else createLog.delete(k); }
  for (const [k, a] of hits) { const f = a.filter(t => now - t < 10000); if (f.length) hits.set(k, f); else hits.delete(k); }
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
  create(b, ip) {
    const nowC = Date.now(), tlist = (createLog.get(ip) || []).filter(t => nowC - t < 3600e3);
    createLog.set(ip, tlist);
    if (tlist.filter(t => nowC - t < 60e3).length >= LIM.createPerMin * RATE_SCALE || tlist.length >= LIM.createPerHour * RATE_SCALE)
      return [429, { error: "部屋をつくりすぎです。しばらくしてから、もう一度ためしてね" }];
    if (rooms.size >= LIM.roomsTotal) return [503, { error: "いま部屋がいっぱいです。しばらくしてから、もう一度ためしてね" }];
    if ([...rooms.values()].filter(r => r.ip === ip).length >= LIM.roomsPerIp * RATE_SCALE) return [429, { error: "同時につくれる部屋の数をこえました。使い終わった部屋を「ここで終わる」で閉じてね" }];
    const own = b.mode === "quiz" || b.game === "mine";       // 先生のもんだいを使う部屋
    if (!MODES.includes(b.mode) || !(own || GAMES.includes(b.game))) return [400, { error: "設定が正しくありません" }];
    const g = Math.min(6, Math.max(1, b.g | 0)), t = b.mode === "rocket" ? 300 : Math.min(300, Math.max(60, b.t | 0));
    const rule = RULES.includes(b.rule) ? b.rule : "normal";
    const room = { code: newCode(), hostKey: id(), mode: b.mode, game: b.mode === "quiz" ? "quiz" : b.game, g, t, rule, status: "lobby", endAt: 0,
      players: new Map(), clients: new Set(), created: Date.now(), last: Date.now(), ip, timer: null, gt: "", nm: b.nm === "auto" ? "auto" : "input", nh: b.nh === 0 ? 0 : 1 };      // nh：1＝児童の結果画面にひろば（どんぐり）を出さない（初期値）／0＝出す
    if (own) {
      const r = QZ.cleanSet({ title: b.gt, qs: b.qs });         // 型・文字数・個数・時間の値を調べてから使う
      if (!r.ok) return [400, { error: "もんだいが正しくありません：" + r.why }];
      const qs = b.mode === "quiz" ? r.set.qs : r.set.qs.filter(q => q.t === "mc");   // たからばこ・すごろくは4択だけ
      if (!qs.length) return [400, { error: "4択の問題がありません" }];
      room.gt = r.set.title; if (b.mode !== "quiz") room.set = { title: r.set.title, qs };   // クイズでは、答えつきの問題を児童に渡さない
      if (b.mode === "quiz") room.qz = QZ.engine(qs, { easy: rule === "easy" });
    }
    if (b.mode === "rocket") room.co = COOP.engine({ easy: rule === "easy", g, scale: COOP_SCALE, stages: b.ns === 3 ? 3 : 5 });
    tlist.push(nowC); rooms.set(room.code, room);
    return [200, { code: room.code, hostKey: room.hostKey, nm: room.nm }];
  },
  // 参加画面が、名前を入力させる部屋かどうかを知るための問い合わせ（部屋の中身は返さない）
  info(b, ip) {
    const now = Date.now();
    if (!hitPeek("bad:" + ip, 5, 10000, now)) return TOO_MANY;
    const room = rooms.get(String(b.code));
    if (!room) { hitOk("bad:" + ip, 5, 10000, now); return [404, { error: "その部屋コードは見つかりません" }]; }
    return joinBlock(room) || [200, { nm: room.nm }];
  },
  join(b, ip) {
    const now = Date.now();
    if (!hitPeek("bad:" + ip, 5, 10000, now) || !hitOk("ok:" + ip, 30, 10000, now)) return TOO_MANY;
    const room = rooms.get(String(b.code));
    if (!room) { hitOk("bad:" + ip, 5, 10000, now); return [404, { error: "その部屋コードは見つかりません" }]; }
    if (!hitOk("room:" + room.code, 10, 1000, now)) return TOO_MANY;
    const blk = joinBlock(room); if (blk) return blk;
    if (room.players.size >= MAX_PLAYERS) return [409, { error: "部屋がいっぱいです" }];
    let who;
    if (room.nm === "input") {       // 児童が入力した名前：長さ・文字・NG語を調べ、同じ名前には番号をつける
      const c = NM.check(b.name);
      if (!c.ok) { hitOk("bad:" + ip, 5, 10000, now); return [400, { error: NAME_ERR[c.why], why: c.why }]; }
      who = { name: NM.dedupe(c.name, allNames(room)), emoji: pickEmoji(room) };
    } else who = nick(room);
    const p = { pid: id(), token: id(), ...who, v: 0, ok: 0, ng: 0 };
    room.players.set(p.pid, p); if (room.qz) room.qz.add(p.pid); if (room.co) room.co.add(p.pid); broadcast(room);
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
  // 先生：入室をしめきる／あける（待合室でも参加を止める）
  close(b) {
    const room = rooms.get(String(b.code));
    if (!room || room.hostKey !== b.hostKey) return [403, { error: "先生の画面からのみ操作できます" }];
    room.closed = !!b.on; broadcast(room, true);
    return [200, { ok: true, closed: room.closed }];
  },
  kick(b) {
    const room = rooms.get(String(b.code));
    if (!room || room.hostKey !== b.hostKey || !room.players.has(b.pid)) return [403, { error: "先生の画面からのみ操作できます" }];
    room.players.delete(b.pid);
    if (room.qz) { room.qz.remove(b.pid); if (room.status === "playing" && room.qz.tick(Date.now())) qzSync(room); }
    if (room.co) room.co.remove(b.pid);
    broadcast(room, true);
    return [200, { ok: true }];
  },
  start(b) {
    const room = rooms.get(String(b.code));
    if (!room || room.hostKey !== b.hostKey) return [403, { error: "先生の画面からのみ操作できます" }];
    if (!room.players.size) return [409, { error: "まだ誰も参加していません" }];
    for (const p of room.players.values()) Object.assign(p, { v: 0, ok: 0, ng: 0 });
    if (room.qz) { room.status = "playing"; room.endAt = 0; room.qz.begin(Date.now()); qzSync(room); broadcast(room, true); return [200, { ok: true }]; }
    if (room.co) { room.status = "playing"; room.endAt = 0; room.co.begin(Date.now()); broadcast(room, true); return [200, { ok: true }]; }
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
    if (room.co) {      // 協力モード：判定は共有部品（cooplib）。児童の値は型・範囲を調べてから使う
      if (!COOP.OPS.includes(b.op)) return [403, { error: "この遊び方では使えない操作です" }];
      const r = room.co.act(p.pid, b.op, b, Date.now());
      if (r[0] === 200) { if (r[2]) broadcast(room, true); else broadcast(room); }
      return [r[0], r[1]];
    }
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
    const am = url.pathname.match(/^\/vendor\/(audio\/[\w-]+\.mp3|img\/[\w-]+\.png)$/);   // 効果音・BGM・絵（CC0 の素材。vendor/THIRD-PARTY-LICENSES.txt）
    if (req.method === "GET" && am) {
      const f = path.join(__dirname, "vendor", am[1]);
      if (!fs.existsSync(f)) return json(res, 404, { error: "not found" });
      res.writeHead(200, { "Content-Type": am[1].endsWith(".mp3") ? "audio/mpeg" : "image/png", "Cache-Control": "public, max-age=86400" });
      return fs.createReadStream(f).pipe(res);
    }
    // 状態の配信（SSE 形式）。鍵（hostKey）や参加の token は URL に載せず、POST の本文で受け取る。GET は鍵なし（名前が見えない）の接続だけ
    if (url.pathname === "/api/events" && (req.method === "GET" || req.method === "POST")) {
      const q = req.method === "POST" ? await body(req) : {};
      const room = rooms.get(String(req.method === "POST" ? q.code : url.searchParams.get("code") || ""));
      if (!room) return json(res, 404, { error: "部屋が見つかりません" });
      const ip = req.socket.remoteAddress || "";
      const hk = typeof q.hostKey === "string" ? q.hostKey : "", pl = room.players.get(typeof q.pid === "string" ? q.pid : "");
      const isHost = !!hk && hk === room.hostKey;                                // 先生の画面だけが全員の名前を受け取る
      const pid = !isHost && pl && pl.token === q.token ? pl.pid : "";
      const cred = isHost ? "H" : pid;                                           // 資格情報ごとの接続数（鍵なしは接続元ごとに数える）
      const rcl = [...room.clients];
      if (room.clients.size >= LIM.sseRoom || sseTotal >= LIM.sseTotal || (sseIpCount.get(ip) || 0) >= LIM.sseIp
        || (cred ? rcl.filter(r => r.cred === cred).length >= LIM.sseCred : rcl.filter(r => !r.cred && r.ip === ip).length >= LIM.sseAnon))
        return json(res, 429, { error: "つなぎすぎです。しばらくしてから、もう一度ためしてね" });
      res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-store", Connection: "keep-alive" });
      res.write("retry: 2000\n\n");
      res.host = isHost; res.pid = pid; res.cred = cred; res.ip = ip;
      sseTotal++; sseIpCount.set(ip, (sseIpCount.get(ip) || 0) + 1);
      res.write(res.host ? "data: " + JSON.stringify(pub(room, true)) + "\n\n" : kidMsg(room, res, JSON.stringify(pub(room, false)).slice(0, -1)));
      room.clients.add(res);
      const hb = setInterval(() => res.write(": ping\n\n"), 15000);
      let closed = false;
      const gone = () => { if (closed) return; closed = true; clearInterval(hb); room.clients.delete(res); sseTotal--; const c = (sseIpCount.get(ip) || 1) - 1; if (c > 0) sseIpCount.set(ip, c); else sseIpCount.delete(ip); };
      req.on("close", gone); res.on("close", gone);
      return;
    }
    const m = url.pathname.match(/^\/api\/(\w+)$/);
    if (req.method === "POST" && m && API[m[1]]) {
      const bd = await body(req), rm = bd && typeof bd === "object" && rooms.get(String(bd.code));
      if (rm && m[1] !== "info") rm.last = Date.now();         // 部屋の操作があった時刻（使われていない部屋を消す目安）
      const [code, obj] = API[m[1]](bd, req.socket.remoteAddress || "");
      return json(res, code, obj);
    }
    json(res, 404, { error: "not found" });
  } catch (e) {
    json(res, 400, { error: "リクエストが正しくありません" });
  }
}).listen(PORT, () => console.log(`まなびひろば サーバー起動: http://localhost:${PORT}`));
