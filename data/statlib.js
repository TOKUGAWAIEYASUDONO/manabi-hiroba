/* ひらめっと 回答スピードの あつまり（名前なしの 数字だけ）
   - ブラウザ：1回の 練習が おわったら、遊びの種類・学年・単元・あそびかた・問題数・正解数・答えるのに かかった 時間（ミリ秒）を 1回だけ 送る
     （名前・ニックネーム・端末を 見分ける 番号・1問ずつの 答えは 送らない）
   - サーバー（functions/api/*.js。Cloudflare Pages Functions）：数字を 検査して、「日にち × 遊び × 学年 × 単元 × あそびかた」ごとの 合計に 足す
     （1回ずつの 記録・接続元（IPアドレス）は のこさない）
   - 見る画面（stats.html）：運営者だけが 合言葉で ひらく。回数が MIN_ROUNDS 回 より 少ない 行は 出さない
   ON が false の あいだは、ブラウザは 何も 送らない。検査は node tools/test-statlib.js */
(function (root) {
  "use strict";
  const ON = false;                       // 送るかどうか（公開の スイッチ）。先生向けの 文が きまったら true に する
  // 送るのは 本番の 住所で 開いたときだけ（手もと・古い住所では 送らない）。住所は data/move.js の SITE.NEW_HOST（ここには 書かない）
  const ENDPOINT = "/api/stat";
  const CFG = "mh_statcfg";               // 先生が 端末に 保存する オン／オフ（{on:0} で 送らない）
  const GAMES = ["calc", "kuku", "kanji", "kencho", "eigo"];
  const MODES = ["n", "ta", "sd"];        // いつもの・タイムアタック・サドンデス
  const MAX_Q = 300, MAX_MS_Q = 60000;    // 1回の 問題数の 上限・1問に 数える 時間の 上限（60秒。席を はなれた 時間を 数えすぎない）
  const MIN_ROUNDS = 10;                  // 見る画面で 出す 行の 回数の 下限（少ないと だれの 数字か わかる おそれ）
  const UNIT_RE = /^[a-z][0-9]-[a-z0-9-]{1,40}$/;

  const int = v => typeof v === "number" && Number.isInteger(v);
  /* 送る 形（v:1）。だめなら null */
  function clean(o) {
    if (!o || typeof o !== "object" || o.v !== 1) return null;
    const g = o.g, u = o.u === undefined ? "" : o.u;
    if (!GAMES.includes(o.game) || !MODES.includes(o.m)) return null;
    if (!(g === 0 || (int(g) && g >= 1 && g <= 6))) return null;
    if (typeof u !== "string" || (u !== "" && !UNIT_RE.test(u))) return null;
    if (!int(o.q) || o.q < 1 || o.q > MAX_Q) return null;
    if (!int(o.ok) || o.ok < 0 || o.ok > o.q) return null;
    if (!int(o.ms) || o.ms < 0 || o.ms > o.q * MAX_MS_Q) return null;
    return { v: 1, game: o.game, g, u, m: o.m, q: o.q, ok: o.ok, ms: o.ms };
  }
  /* 1回の 練習（index.html の P）から 送る 形を つくる。数えた 問題が なければ null */
  function fromRun(p) {
    if (!p || !p.x || !p.aN) return null;
    const ids = p.u && Array.isArray(p.u.ids) ? p.u.ids : [];
    return clean({ v: 1, game: p.x.id, g: int(p.g) && p.g >= 1 && p.g <= 6 ? p.g : 0, u: ids.length === 1 ? ids[0] : "",
      m: MODES.includes(p.sm) ? p.sm : "n", q: p.aN, ok: Math.min(p.aOk || 0, p.aN), ms: Math.round(p.aMs || 0) });
  }
  /* 1問の 時間を 足す（上限つき） */
  const addMs = (p, ms) => { p.aMs = (p.aMs || 0) + Math.max(0, Math.min(MAX_MS_Q, ms || 0)); p.aN = (p.aN || 0) + 1; };
  /* 送ってよいか：スイッチ・住所・先生の オフ */
  function allowed(host, cfg, site) { return ON && !!site && !!site.ON && !!host && host === site.NEW_HOST && !(cfg && cfg.on === 0); }

  /* 日にち（日本時間）"2026-11-26" */
  const dayJST = t => new Date(t + 9 * 3600e3).toISOString().slice(0, 10);

  /* ---- サーバー（D1）---- */
  const SCHEMA = "CREATE TABLE IF NOT EXISTS agg (day TEXT NOT NULL, game TEXT NOT NULL, g INTEGER NOT NULL, u TEXT NOT NULL, m TEXT NOT NULL, " +
    "rounds INTEGER NOT NULL, q INTEGER NOT NULL, ok INTEGER NOT NULL, ms INTEGER NOT NULL, PRIMARY KEY (day, game, g, u, m))";
  const UPSERT = "INSERT INTO agg (day, game, g, u, m, rounds, q, ok, ms) VALUES (?1, ?2, ?3, ?4, ?5, 1, ?6, ?7, ?8) " +
    "ON CONFLICT (day, game, g, u, m) DO UPDATE SET rounds = rounds + 1, q = q + excluded.q, ok = ok + excluded.ok, ms = ms + excluded.ms";
  let made = false;
  async function ensure(db) { if (!made) { await db.prepare(SCHEMA).run(); made = true; } }
  const res = (status, body) => new Response(body === undefined ? null : JSON.stringify(body),
    { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });

  /* POST /api/stat */
  async function handlePost(request, env, now) {
    if (!env || !env.DB) return res(204);                    // データベースが まだ つながっていない：だまって 受けながす
    const len = +(request.headers.get("content-length") || 0);
    if (len > 1024) return res(413);
    let o; try { const t = await request.text(); if (t.length > 1024) return res(413); o = JSON.parse(t); } catch (e) { return res(400); }
    const c = clean(o); if (!c) return res(400);
    await ensure(env.DB);
    await env.DB.prepare(UPSERT).bind(dayJST(now || Date.now()), c.game, c.g, c.u, c.m, c.q, c.ok, c.ms).run();
    return res(204);
  }
  /* 合言葉を くらべる（長さが ちがっても 同じ 手間で） */
  function sameKey(a, b) {
    a = String(a || ""); b = String(b || ""); if (!a || !b) return false;
    let d = a.length ^ b.length; for (let i = 0; i < Math.max(a.length, b.length); i++) d |= (a.charCodeAt(i) | 0) ^ (b.charCodeAt(i) | 0);
    return d === 0;
  }
  /* GET /api/stats?days=7|30|0（0＝ぜんぶ）。合言葉は x-stats-key（日本語も 使えるよう encodeURIComponent した 形で 送る・くらべる） */
  async function handleGet(request, env, now) {
    if (!env || !env.STATS_KEY || !sameKey(request.headers.get("x-stats-key"), encodeURIComponent(env.STATS_KEY))) return res(401, { error: "key" });
    if (!env.DB) return res(503, { error: "db" });
    await ensure(env.DB);
    const days = +new URL(request.url).searchParams.get("days") || 0;
    const from = days > 0 ? dayJST((now || Date.now()) - (Math.min(days, 3650) - 1) * 864e5) : "0000-00-00";
    const r = await env.DB.prepare("SELECT game, g, u, m, SUM(rounds) AS rounds, SUM(q) AS q, SUM(ok) AS ok, SUM(ms) AS ms FROM agg WHERE day >= ?1 " +
      "GROUP BY game, g, u, m HAVING SUM(rounds) >= ?2 ORDER BY game, g, u, m").bind(from, MIN_ROUNDS).all();
    const d = await env.DB.prepare("SELECT day, SUM(rounds) AS rounds, SUM(q) AS q FROM agg WHERE day >= ?1 GROUP BY day ORDER BY day").bind(from).all();
    return res(200, { from, min: MIN_ROUNDS, rows: r.results || [], days: d.results || [] });
  }

  const API = { ON, ENDPOINT, CFG, GAMES, MODES, MAX_Q, MAX_MS_Q, MIN_ROUNDS, clean, fromRun, addMs, allowed, dayJST, sameKey, handlePost, handleGet,
    _reset() { made = false; } };
  if (typeof module === "object" && module.exports) module.exports = API;
  if (root) root.MH_STAT = API;
})(typeof window !== "undefined" ? window : null);
