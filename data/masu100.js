/* まなびひろば：100マス計算の記録を読む部品（画面は持たない。plan/100masu-class-plan.md）
   ブラウザでは window.MH_M100、Node では require("./masu100.js")。tools/test-masu100.js が単体テストする。

   読むだけ：100マス計算（apps/100masu、同じオリジン）が端末の localStorage に書く記録を読む。書きかえない。
   ・study.records.v1（学習ログ。appId "square100" の物だけ）… 1回ごとの記録（計算の種類・問題数・だん・時間・正解数・とちゅうでやめたか）
   ・giga_calc_records_v4（アプリの自己ベスト表）… 「きょうより前の自己ベスト」を さがすときの おぎないだけに使う
   わり算は 100マス計算に無いので あつかわない（たし算・ひき算・かけ算）。

   数える回（valid）：ランキングと どんぐりに 数えるのは、次を ぜんぶ みたす回だけ
   ・100問（盤面の とちゅうから はじめた回・問題数を へらした回は だめ）
   ・だんを しぼっていない（かけ算は ぜんぶの だん）
   ・とちゅうで やめていない・時間切れで おわっていない
   ・正答率 9割以上
   ・ありえない速さでない：1マス 0.4秒より はやい（100マスで 40秒未満）回は 数えない。60分を こえる回も 数えない
   ・未来の日時でない（端末の時計を すすめた記録）

   ランキング（rank）：計算ごとに はやさ／のびりつ／じこベスト こうしん（順位なし）／ていねい／コツコツ／がんばり。
   上位5まで・最下位は出さない・できるだけ多くの子が どこかに出る（くわしくは rankOp の上）。
   どんぐり（reward）：数える回 1回で 1こ、同じ日の 同じ計算の 2回めからは 半分（2回で 1こ）、100マスからは 1日 3こまで。 */
(function (root, factory) {
  const M = factory();
  if (typeof module === "object" && module.exports) module.exports = M; else root.MH_M100 = M;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const OPS = ["add", "sub", "mul"];
  const OP_T = { add: "たし算《ざん》", sub: "ひき算《ざん》", mul: "かけ算《ざん》" };
  const GIGA_MODE = { add: "たし算", sub: "引き算", mul: "かけ算" };
  const LOG_KEY = "study.records.v1", REC_KEY = "giga_calc_records_v4";
  const CELLS = 100, MS_CELL_MIN = 400, FLOOR_MS = CELLS * MS_CELL_MIN, MAX_MS = 3600e3, ACC_MIN = 0.9;
  const DS_MIN = FLOOR_MS / 100, DS_MAX = MAX_MS / 100;        // 送るときの時間は 0.1秒きざみ
  const DAY_GIVE = 3, CAP_SETS = 5, SPREAD_N = 10, LIST_MAX = 5, PB_MAX = 40, FUTURE_MS = 5 * 60e3;

  const dayNum = d => Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5);   // 端末の地域の日付（collection.js と同じ）
  const dayOfMs = ms => dayNum(new Date(ms));
  const weekStart = today => today - ((new Date(today * 864e5 + 12 * 36e5).getUTCDay() + 6) % 7);    // その週の月曜
  const int = (v, lo, hi, d) => { v = Math.floor(+v); return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d; };
  const isObj = v => !!v && typeof v === "object" && !Array.isArray(v);

  /* ---------- 記録を読む ---------- */
  /* 学習ログの1件を、決まった形に作りなおす。形が ちがう物は null（数えない） */
  function normRun(x, nowMs) {
    if (!isObj(x) || x.appId !== "square100") return null;
    const op = x.mode;
    if (!OPS.includes(op)) return null;
    const at = Date.parse(x.startedAt);
    const ms = typeof x.elapsedMs === "number" && Number.isFinite(x.elapsedMs) ? Math.round(x.elapsedMs) : NaN;
    const sm = isObj(x.summary) ? x.summary : null, ext = isObj(x.ext) ? x.ext : {};
    if (!Number.isFinite(at) || !(ms >= 0) || !sm) return null;
    const count = int(sm.count, 0, 1000, 0), correct = int(sm.correct, 0, count, 0);
    const cells = int(ext.cells, 0, 1000, 0);
    const dan = Array.isArray(ext.dan) && ext.dan.length > 0;
    const r = { op, at, end: at + ms, ms, count, correct, cells, dan, status: x.status === "completed" ? "completed" : "aborted", timeUp: !!ext.timeUp, day: dayOfMs(at) };
    r.why = whyInvalid(r, nowMs);
    r.valid = !r.why;
    return r;
  }
  /* 数えない理由（数える回なら ""） */
  function whyInvalid(r, nowMs) {
    if (r.count !== CELLS || r.cells !== CELLS) return "count";          // 100問でない（へらした・とちゅうから）
    if (r.dan) return "dan";                                               // だんを しぼった
    if (r.status !== "completed" || r.timeUp) return "abort";              // とちゅうで やめた・時間切れ
    if (r.correct < CELLS * ACC_MIN) return "acc";                         // 正答率 9割未満
    if (r.ms < FLOOR_MS || r.ms > MAX_MS) return "speed";                  // ありえない速さ（または 長すぎ）
    if (nowMs != null && r.at > nowMs + FUTURE_MS) return "future";        // 時計を すすめた
    return "";
  }
  const parse = s => { if (typeof s !== "string" || s.length > 4e6) return null; try { return JSON.parse(s); } catch (e) { return null; } };
  /* 学習ログ（文字列 または 配列）から 100マスの回を ぜんぶ読む。古い順 */
  function readRuns(logRaw, nowMs) {
    const a = Array.isArray(logRaw) ? logRaw : parse(logRaw);
    if (!Array.isArray(a)) return [];
    const out = [];
    for (const x of a.slice(-1000)) { const r = normRun(x, nowMs); if (r) out.push(r); }
    return out.sort((p, q) => p.at - q.at);
  }
  /* giga_calc_records_v4 の 最近の記録から、きょうより前の「数える回」に なりそうな タイム（ミリ秒）。計算ごと */
  function gigaPrev(recRaw, today) {
    const R = isObj(recRaw) ? recRaw : parse(recRaw), out = {};
    if (!isObj(R)) return out;
    for (const op of OPS) {
      const m = R[GIGA_MODE[op]]; if (!isObj(m) || !Array.isArray(m.history)) continue;
      for (const h of m.history.slice(0, 50)) {
        if (!isObj(h) || h.count !== CELLS || h.limit || (Array.isArray(h.dan) && h.dan.length)) continue;     // 100問・だん なし・制限時間なし（全問正解の回だけが のこる）
        const at = Date.parse(h.at), ms = Math.round(+h.time * 1000);
        if (!Number.isFinite(at) || dayOfMs(at) >= today || !(ms >= FLOOR_MS && ms <= MAX_MS)) continue;
        if (!(out[op] <= ms)) out[op] = ms;
      }
    }
    return out;
  }
  /* 端末の localStorage（または そのかわりの物）から まとめて読む */
  function readStore(ls, nowMs) {
    let a = null, b = null;
    try { a = ls.getItem(LOG_KEY); } catch (e) {}
    try { b = ls.getItem(REC_KEY); } catch (e) {}
    return { runs: readRuns(a, nowMs), giga: parse(b) };
  }

  /* ---------- 自分の まとめ（計算ごと） ---------- */
  /* tb きょうのベスト（ミリ秒、0＝なし）／pb きょうより前の自己ベスト／sets きょうの数える回／perfect そのうち全問正解／acc 正答率（%）
     days 今週（月曜から）数える回をした日の数／pbNew 自己ベストを こえた（はじめての記録も 入れる）／other きょう やったが 数えない回 */
  function summarize(runs, nowMs, giga) {
    const today = dayOfMs(nowMs), ws = weekStart(today), gp = gigaPrev(giga, today), out = {};
    for (const op of OPS) {
      const mine = runs.filter(r => r.op === op && r.at <= nowMs + FUTURE_MS);
      const ok = mine.filter(r => r.valid), td = ok.filter(r => r.day === today), before = ok.filter(r => r.day < today);
      const tb = td.length ? Math.min(...td.map(r => r.ms)) : 0;
      let pb = before.length ? Math.min(...before.map(r => r.ms)) : 0;
      if (gp[op] && (!pb || gp[op] < pb)) pb = gp[op];
      const n = td.reduce((s, r) => s + r.count, 0), c = td.reduce((s, r) => s + r.correct, 0);
      const days = new Set(ok.filter(r => r.day >= ws && r.day <= today).map(r => r.day)).size;
      out[op] = { tb, pb, sets: td.length, perfect: td.filter(r => r.correct === r.count).length, acc: n ? Math.floor(c / n * 100) : 0, days,
        pbNew: !!tb && (!pb || tb < pb), other: mine.filter(r => !r.valid && r.day === today).length };
    }
    return out;
  }
  const hasAny = sum => OPS.some(op => sum[op] && (sum[op].sets > 0 || sum[op].pb > 0 || sum[op].days > 0));

  /* ---------- 先生へ送る形（数字だけ。生の記録は送らない） ----------
     { v:1, o:{ add:[tb, pb, sets, perfect, acc, days], … } }  tb・pb は 0.1秒きざみ（0＝なし）。pbNew は 受けとる側で 計算しなおす */
  function wire(sum) {
    const o = {};
    for (const op of OPS) {
      const s = sum && sum[op]; if (!s) continue;
      if (!s.sets && !s.pb && !s.days) continue;
      o[op] = [Math.round(s.tb / 100), Math.round(s.pb / 100), s.sets, s.perfect, s.acc, s.days];
    }
    return { v: 1, o };
  }
  /* 受けとった物を しらべる（先生の端末・server.js）。形が ちがえば null。数字は ありえる はんいに おさめ、つじつまを あわせる */
  function clampWire(w) {
    if (!isObj(w) || w.v !== 1 || !isObj(w.o)) return null;
    const keys = Object.keys(w.o); if (keys.length > OPS.length) return null;
    const out = {};
    for (const op of keys) {
      if (!OPS.includes(op)) return null;
      const a = w.o[op]; if (!Array.isArray(a) || a.length !== 6) return null;
      if (!a.every(v => typeof v === "number" && Number.isFinite(v))) return null;
      const tm = v => { v = Math.round(v); return v >= DS_MIN && v <= DS_MAX ? v * 100 : 0; };
      const tb = tm(a[0]), pb = tm(a[1]);
      const sets = tb ? int(a[2], 1, 99, 1) : 0, perfect = tb ? int(a[3], 0, sets, 0) : 0;
      const acc = tb ? int(a[4], ACC_MIN * 100, 100, ACC_MIN * 100) : 0, days = int(a[5], tb ? 1 : 0, 7, 0);
      // ぜんぶ全問正解なら 正答率は 100%、そうでなければ 99% まで（つじつまを あわせる）
      out[op] = { tb, pb, sets, perfect, acc: !tb ? 0 : perfect === sets ? 100 : Math.min(99, acc), days, pbNew: !!tb && (!pb || tb < pb) };
    }
    return out;
  }

  /* ---------- ランキング（先生の大画面） ----------
   はやさ：きょうのベストが はやい順（本当の上位）。
   のびりつ：きょうのベスト÷前のベスト が小さい順（前より はやくなった子だけ）。
   ていねい：きょうの 全問正解の回数（5回で頭打ち。同じなら 正答率）。コツコツ：今週 れんしゅうした日の数。
   がんばり：きょうの セット数（5セットで頭打ち＝それより多くても 同じ あつかい）。
   じこベスト こうしん：こえた子を ぜんぶ（順位なし・送った順。PB_MAX 人まで）。
   出し方（できるだけ多くの子が どこかに出る）：
   1. どの種類も 5人まで。対象が2人以上なら、いちばん下の1人は出さない（最下位を出さない。部屋の決まり pxVis と同じ）
   2. はやさは そのまま上から。のこりの4つは、対象の少ない種類から順に えらぶ（のびりつ など少ない種類が 先に その子を とれる）
   3. えらぶとき、同じ計算の ほかの種類に もう出た子は あとまわし。まだ出ていない子で 5人に足りなければ、出た子で うめる
      （出た子は 出た回数の少ない子から。10人以上の部屋では 1人が出るのは 1つの計算で 2つまで。
      同じ値なら まだ出ていない子が先。えらんだ後は 値の順に ならべる）
   はやさ以外は「えらばれた子」の表なので、順位の数字は つけない（画面は ★ だけ） */
  const CATS = ["hayasa", "nobi", "teinei", "kotsu", "ganbari"];
  const metric = {
    hayasa: s => s.tb ? -s.tb : null,
    nobi: s => s.tb && s.pb && s.tb < s.pb ? (s.pb - s.tb) / s.pb : null,
    teinei: s => s.perfect > 0 ? Math.min(CAP_SETS, s.perfect) * 1000 + s.acc : null,
    kotsu: s => s.days > 0 ? s.days : null,
    ganbari: s => s.sets > 0 ? Math.min(CAP_SETS, s.sets) : null
  };
  /* entries：[{ pid, s:clampWire の結果, t:送った時刻 }] */
  function rankOp(entries, op) {
    const E = entries.filter(e => e && e.s && e.s[op]);
    const cand = {};
    for (const c of CATS) {
      cand[c] = E.map(e => ({ pid: e.pid, t: e.t || 0, m: metric[c](e.s[op]), s: e.s[op] })).filter(x => x.m !== null)
        .sort((a, b) => b.m - a.m || a.t - b.t || (a.pid < b.pid ? -1 : 1));
      if (cand[c].length >= 2) cand[c] = cand[c].slice(0, -1);   // いちばん下の1人を のぞく（5人を えらぶのは このあと）
    }
    const shown = new Map(), pick = {}, put = x => shown.set(x.pid, (shown.get(x.pid) || 0) + 1);
    const capK = E.length >= SPREAD_N ? 2 : CATS.length;          // 10人以上なら、1人が出るのは 1つの計算で 2つまで
    pick.hayasa = cand.hayasa.slice(0, LIST_MAX); pick.hayasa.forEach(put);
    const rest = CATS.slice(1).map((c, i) => [c, i]).sort((a, b) => cand[a[0]].length - cand[b[0]].length || a[1] - b[1]).map(a => a[0]);
    for (const c of rest) {
      const ord = new Map(cand[c].map((x, i) => [x.pid, i])), cnt = x => shown.get(x.pid) || 0;
      const fresh = cand[c].filter(x => !cnt(x));
      const seen = cand[c].filter(x => cnt(x) && cnt(x) < capK).sort((a, b) => cnt(a) - cnt(b) || ord.get(a.pid) - ord.get(b.pid));   // 出た回数の 少ない子から
      const got = fresh.slice(0, LIST_MAX).concat(seen.slice(0, Math.max(0, LIST_MAX - fresh.length)));
      got.sort((a, b) => b.m - a.m || (cnt(a) ? 1 : 0) - (cnt(b) ? 1 : 0) || ord.get(a.pid) - ord.get(b.pid));
      got.forEach(put); pick[c] = got;
    }
    const val = (c, s) => c === "hayasa" ? s.tb : c === "nobi" ? Math.round((s.pb - s.tb) / s.pb * 100) : c === "teinei" ? Math.min(CAP_SETS, s.perfect) : c === "kotsu" ? s.days : Math.min(CAP_SETS, s.sets);
    const out = { op, n: E.length, cats: CATS.map(c => ({ k: c, l: pick[c].map(x => [x.pid, val(c, x.s)]) })) };
    let rk = 0, prev = null;                                       // はやさの順位（同じタイムは 同じ順位）
    out.cats[0].l = out.cats[0].l.map((x, i) => { if (x[1] !== prev) { rk = i + 1; prev = x[1]; } return [x[0], x[1], rk]; });
    out.pb = E.filter(e => e.s[op].pbNew).sort((a, b) => (a.t || 0) - (b.t || 0)).map(e => e.pid);
    out.pbN = out.pb.length; out.pb = out.pb.slice(0, PB_MAX);
    out.kids = new Set([...out.cats.flatMap(c => c.l.map(x => x[0])), ...out.pb]).size;
    return out;
  }
  function rank(entries) { const o = {}; for (const op of OPS) o[op] = rankOp(entries, op); return o; }

  /* ---------- どんぐり（ホームに もどったとき） ----------
   st：{ v:1, c:数えおわった回の おわりの時刻(ms), last:前に しらべた時刻, d:{ 日: { h:半こ単位の点, g:わたした数, o:{op:回数} } }, t:{ d:わたした日, g:その日に わたした数 } }
   ・前に しらべたあとに おわった回のうち、きょうと きのうの「数える回」だけ（それより前の回は 数えずに すすめる）
   ・1回め（その日・その計算）は 2点、2回めからは 1点（2点で どんぐり1こ）。1日 DAY_GIVE こまで
     （回をした日ごとに 3こまで、さらに わたす日ごとにも 3こまで。のこりは つぎの日に もらえることがある）
   ・数えない回（だん・問題数・とちゅう・正答率・速さ）は 0
   ・時計が もどっていたら 何もしない（collection.js の sync と同じ考え）
   返り値：{ st:新しい状態, give:わたす数, n:新しく 数えた回 } */
  function cleanReward(st, nowMs) {
    const S = { v: 1, c: 0, last: 0, d: {}, t: { d: 0, g: 0 } };
    if (!isObj(st) || st.v !== 1) return S;
    S.c = int(st.c, 0, 9e15, 0); S.last = int(st.last, 0, 9e15, 0);
    if (isObj(st.t)) S.t = { d: int(st.t.d, 0, 9e6, 0), g: int(st.t.g, 0, DAY_GIVE, DAY_GIVE) };
    if (isObj(st.d)) for (const k of Object.keys(st.d).slice(0, 10)) {
      const b = st.d[k], day = int(k, 0, 9e6, -1); if (day < 0 || !isObj(b)) continue;
      const o = {}; if (isObj(b.o)) for (const op of OPS) if (b.o[op] != null) o[op] = int(b.o[op], 0, 999, 0);
      S.d[day] = { h: int(b.h, 0, 9999, 0), g: int(b.g, 0, DAY_GIVE, 0), o };
    }
    return S;
  }
  function reward(st0, runs, nowMs) {
    const S = cleanReward(st0, nowMs), today = dayOfMs(nowMs);
    if (S.last && nowMs < S.last) return { st: S, give: 0, n: 0, blocked: true };
    S.last = nowMs;
    let give = 0, n = 0, c = S.c;
    for (const r of runs) {
      if (r.end <= S.c || r.end > nowMs) continue;                  // もう数えた回・これから（未来）の回
      c = Math.max(c, r.end);
      if (!r.valid || r.day < today - 1 || r.day > today) continue;
      const b = S.d[r.day] || (S.d[r.day] = { h: 0, g: 0, o: {} });
      b.h += b.o[r.op] ? 1 : 2; b.o[r.op] = (b.o[r.op] || 0) + 1; n++;
    }
    if (S.t.d !== today) S.t = { d: today, g: 0 };
    let room = Math.max(0, DAY_GIVE - S.t.g);                           // わたす日（きょう）にも 3こまで（きのうの回と あわせて）
    for (const k of Object.keys(S.d).map(Number).sort((a, b) => a - b)) {
      const b = S.d[k];
      if (k < today - 2) { delete S.d[k]; continue; }
      const can = Math.min(room, Math.min(DAY_GIVE, Math.floor(b.h / 2)) - b.g);
      if (can > 0) { b.g += can; give += can; room -= can; }
    }
    S.t.g += give; S.c = c;
    return { st: S, give, n, blocked: false };
  }

  /* ---------- 表示の手つだい ---------- */
  const fmtTime = ms => { if (!ms) return ""; const ds = Math.round(ms / 100), m = Math.floor(ds / 600), s = (ds % 600) / 10; return m ? `${m}:${s.toFixed(1).padStart(4, "0")}` : s.toFixed(1); };

  return { OPS, OP_T, LOG_KEY, REC_KEY, CELLS, FLOOR_MS, MAX_MS, ACC_MIN, MS_CELL_MIN, DAY_GIVE, CAP_SETS, LIST_MAX, PB_MAX, SPREAD_N, CATS,
    dayNum, weekStart, normRun, whyInvalid, readRuns, readStore, gigaPrev, summarize, hasAny, wire, clampWire, rankOp, rank, cleanReward, reward, fmtTime };
});
