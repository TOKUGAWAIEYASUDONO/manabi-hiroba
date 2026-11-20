/* ひらめっと：100マス計算の記録を読む部品（画面は持たない。plan/100masu-class-plan.md）
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

   ランキング（rank）：計算ごとに「この じかん」（はやさ／のびりつ／がんばり／じこベスト こうしん）と「これまで」（じこベスト／るいけい／コツコツ）。
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
  const DAY_GIVE = 3, MAX_SETS = 999, MAX_TOTAL = 99999, SPREAD_N = 10, LIST_MAX = 5, PB_MAX = 40, FUTURE_MS = 5 * 60e3;

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
  /* giga_calc_records_v4 の 最近の記録から、beforeMs（部屋に 入った時刻）より前の「数える回」に なりそうな タイム（ミリ秒）。計算ごと */
  function gigaPrev(recRaw, beforeMs) {
    const R = isObj(recRaw) ? recRaw : parse(recRaw), out = {};
    if (!isObj(R)) return out;
    for (const op of OPS) {
      const m = R[GIGA_MODE[op]]; if (!isObj(m) || !Array.isArray(m.history)) continue;
      for (const h of m.history.slice(0, 50)) {
        if (!isObj(h) || h.count !== CELLS || h.limit || (Array.isArray(h.dan) && h.dan.length)) continue;     // 100問・だん なし・制限時間なし（全問正解の回だけが のこる）
        const at = Date.parse(h.at), ms = Math.round(+h.time * 1000);
        if (!Number.isFinite(at) || at >= beforeMs || !(ms >= FLOOR_MS && ms <= MAX_MS)) continue;
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

  /* ---------- 自分の まとめ（計算ごと） ----------
   joinMs：その部屋に はじめて 入った時刻（なければ きょうの 0時＝「きょう」の まとめ）。
   この じかん（入ってから おわった回）：tb ベスト（ミリ秒、0＝なし）／sets 数える回／perfect そのうち全問正解／acc 正答率（%）／other 数えない回
   これまで：pb 入る前の自己ベスト／best いままでの いちばん（この じかんも 入れる）／total いままでの 数える回の 合計／days 今週（月曜から）れんしゅうした日
   pbNew：この じかんに 入る前の自己ベストを こえた（はじめての記録も 入れる） */
  function summarize(runs, nowMs, giga, joinMs) {
    const today = dayOfMs(nowMs), ws = weekStart(today), out = {};
    const t0 = new Date(nowMs); t0.setHours(0, 0, 0, 0);
    const J = Number.isFinite(joinMs) && joinMs > 0 && joinMs <= nowMs + FUTURE_MS ? joinMs : t0.getTime();
    const gp = gigaPrev(giga, J);
    for (const op of OPS) {
      const mine = runs.filter(r => r.op === op && r.at <= nowMs + FUTURE_MS);
      const ok = mine.filter(r => r.valid), td = ok.filter(r => r.end >= J), before = ok.filter(r => r.end < J);
      const tb = td.length ? Math.min(...td.map(r => r.ms)) : 0;
      let pb = before.length ? Math.min(...before.map(r => r.ms)) : 0;
      if (gp[op] && (!pb || gp[op] < pb)) pb = gp[op];
      const n = td.reduce((s, r) => s + r.count, 0), c = td.reduce((s, r) => s + r.correct, 0);
      const days = new Set(ok.filter(r => r.day >= ws && r.day <= today).map(r => r.day)).size;
      out[op] = { tb, pb, best: tb && (!pb || tb < pb) ? tb : pb, sets: td.length, total: ok.length, perfect: td.filter(r => r.correct === r.count).length,
        acc: n ? Math.floor(c / n * 100) : 0, days, pbNew: !!tb && (!pb || tb < pb), other: mine.filter(r => !r.valid && r.end >= J).length };
    }
    return out;
  }
  const hasAny = sum => OPS.some(op => sum[op] && (sum[op].sets > 0 || sum[op].pb > 0 || sum[op].total > 0 || sum[op].days > 0));

  /* ---------- 先生へ送る形（数字だけ。生の記録・日時は 送らない） ----------
     { v:2, o:{ add:[tb, pb, sets, total, days], … } }  tb・pb は 0.1秒きざみ（0＝なし）。best・pbNew は 受けとる側で 計算しなおす。
     まえの形 { v:1, o:{ add:[tb, pb, sets, perfect, acc, days] } } も 受けとる（古い画面の子から 来たとき） */
  function wire(sum) {
    const o = {};
    for (const op of OPS) {
      const s = sum && sum[op]; if (!s) continue;
      if (!s.sets && !s.pb && !s.total && !s.days) continue;
      o[op] = [Math.round(s.tb / 100), Math.round(s.pb / 100), s.sets, s.total || s.sets, s.days];
    }
    return { v: 2, o };
  }
  /* 受けとった物を しらべる（先生の端末・server.js）。形が ちがえば null。数字は ありえる はんいに おさめ、つじつまを あわせる */
  function clampWire(w) {
    if (!isObj(w) || (w.v !== 1 && w.v !== 2) || !isObj(w.o)) return null;
    const L = w.v === 1 ? 6 : 5, keys = Object.keys(w.o); if (keys.length > OPS.length) return null;
    const out = {};
    for (const op of keys) {
      if (!OPS.includes(op)) return null;
      const a = w.o[op]; if (!Array.isArray(a) || a.length !== L) return null;
      if (!a.every(v => typeof v === "number" && Number.isFinite(v))) return null;
      const tm = v => { v = Math.round(v); return v >= DS_MIN && v <= DS_MAX ? v * 100 : 0; };
      const tb = tm(a[0]), pb = tm(a[1]);
      const sets = tb ? int(a[2], 1, MAX_SETS, 1) : 0;
      const total = int(w.v === 1 ? a[2] : a[3], sets || (pb ? 1 : 0), MAX_TOTAL, sets);
      const days = int(w.v === 1 ? a[5] : a[4], tb ? 1 : 0, 7, 0);
      out[op] = { tb, pb, best: tb && (!pb || tb < pb) ? tb : pb, sets, total: Math.max(total, sets), days, pbNew: !!tb && (!pb || tb < pb) };
    }
    return out;
  }

  /* ---------- ランキング（先生の大画面） ----------
   2つの 表を べつべつに 作る（先生が 画面で きりかえる）
   ・この じかん（部屋に 入ってから）：はやさ（ベストが はやい順・本当の上位）／のびりつ（入る前の ベストより はやくなった わりあい）／
     がんばり（数える回の数。頭打ちなし）／じこベスト こうしん（こえた子を ぜんぶ・順位なし・送った順。PB_MAX 人まで）
   ・これまで（入ったときに とどく）：じこベスト（いままでの いちばん・本当の上位）／るいけい（数える回の 合計。頭打ちなし）／コツコツ（今週 れんしゅうした日）
   出し方（どちらの表も 同じ。できるだけ多くの子が どこかに出る）：
   1. どの種類も 5人まで。対象が2人以上なら、いちばん下の1人は出さない（最下位を出さない。部屋の決まり pxVis と同じ）
   2. 1つめ（はやさ・じこベスト）は そのまま上から。のこりは、対象の少ない種類から順に えらぶ
   3. えらぶとき、同じ表の ほかの種類に もう出た子は あとまわし。まだ出ていない子で 5人に足りなければ、出た子で うめる
      （出た子は 出た回数の少ない子から。10人以上の部屋では 1人が出るのは 1つの表で 2つまで。えらんだ後は 値の順に ならべる）
   1つめ以外は「えらばれた子」の表なので、順位の数字は つけない（画面は ★ だけ） */
  const GROUPS = { now: ["hayasa", "nobi", "ganbari"], all: ["best", "total", "kotsu"] };
  const CATS = GROUPS.now.concat(GROUPS.all);
  const metric = {
    hayasa: s => s.tb ? -s.tb : null,
    nobi: s => s.tb && s.pb && s.tb < s.pb ? (s.pb - s.tb) / s.pb : null,
    ganbari: s => s.sets > 0 ? s.sets : null,
    best: s => s.best ? -s.best : null,
    total: s => s.total > 0 ? s.total : null,
    kotsu: s => s.days > 0 ? s.days : null
  };
  const val = (c, s) => c === "hayasa" ? s.tb : c === "best" ? s.best : c === "nobi" ? Math.round((s.pb - s.tb) / s.pb * 100) : c === "ganbari" ? s.sets : c === "total" ? s.total : s.days;
  function pickGroup(E, cats) {
    const cand = {};
    for (const c of cats) {
      cand[c] = E.map(e => ({ pid: e.pid, t: e.t || 0, m: metric[c](e.s), s: e.s })).filter(x => x.m !== null)
        .sort((a, b) => b.m - a.m || a.t - b.t || (a.pid < b.pid ? -1 : 1));
      if (cand[c].length >= 2) cand[c] = cand[c].slice(0, -1);   // いちばん下の1人を のぞく（5人を えらぶのは このあと）
    }
    const shown = new Map(), pick = {}, put = x => shown.set(x.pid, (shown.get(x.pid) || 0) + 1);
    const capK = E.length >= SPREAD_N ? 2 : cats.length;          // 10人以上なら、1人が出るのは 1つの表で 2つまで
    pick[cats[0]] = cand[cats[0]].slice(0, LIST_MAX); pick[cats[0]].forEach(put);
    const rest = cats.slice(1).map((c, i) => [c, i]).sort((a, b) => cand[a[0]].length - cand[b[0]].length || a[1] - b[1]).map(a => a[0]);
    for (const c of rest) {
      const ord = new Map(cand[c].map((x, i) => [x.pid, i])), cnt = x => shown.get(x.pid) || 0;
      const fresh = cand[c].filter(x => !cnt(x));
      const seen = cand[c].filter(x => cnt(x) && cnt(x) < capK).sort((a, b) => cnt(a) - cnt(b) || ord.get(a.pid) - ord.get(b.pid));   // 出た回数の 少ない子から
      const got = fresh.slice(0, LIST_MAX).concat(seen.slice(0, Math.max(0, LIST_MAX - fresh.length)));
      got.sort((a, b) => b.m - a.m || (cnt(a) ? 1 : 0) - (cnt(b) ? 1 : 0) || ord.get(a.pid) - ord.get(b.pid));
      got.forEach(put); pick[c] = got;
    }
    return cats.map(c => {
      let rk = 0, prev = null;
      const l = pick[c].map((x, i) => { const v = val(c, x.s); if (v !== prev) { rk = i + 1; prev = v; } return [x.pid, v, rk]; });   // 同じ値は 同じ順位
      return { k: c, l: c === cats[0] ? l : l.map(x => [x[0], x[1]]) };
    });
  }
  /* entries：[{ pid, s:clampWire の結果, t:はじめて とどいた時刻 }] */
  function rankOp(entries, op) {
    const E = entries.filter(e => e && e.s && e.s[op]).map(e => ({ pid: e.pid, t: e.t, s: e.s[op] }));
    const N = E.filter(e => e.s.tb > 0);
    const out = { op, n: E.length, nn: N.length, cats: pickGroup(N, GROUPS.now).concat(pickGroup(E, GROUPS.all)) };
    out.pb = N.filter(e => e.s.pbNew).sort((a, b) => (a.t || 0) - (b.t || 0)).map(e => e.pid);
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

  return { OPS, OP_T, LOG_KEY, REC_KEY, CELLS, FLOOR_MS, MAX_MS, ACC_MIN, MS_CELL_MIN, DAY_GIVE, MAX_SETS, MAX_TOTAL, LIST_MAX, PB_MAX, SPREAD_N, CATS, GROUPS,
    dayNum, weekStart, normRun, whyInvalid, readRuns, readStore, gigaPrev, summarize, hasAny, wire, clampWire, rankOp, rank, cleanReward, reward, fmtTime };
});
