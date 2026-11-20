/* おひっこし（新しい住所 https://hirametto.com/ へ）。設定は この ファイルの SITE だけ。
   同じ ファイルが 古い住所（GitHub Pages）と 新しい住所（Cloudflare Pages）の 両方で 公開されるので、ページが 自分の 住所を 見て 役わりを かえる。
   ・古い住所で 開かれたとき（ON の ときだけ）＝「引っ越し係」：この 端末の 記録（localStorage）を まとめて、新しい住所の move.html へ 移る。
     記録は URL の「#」の 後ろに 入れて はこぶ（「#」の 後ろは サーバーに 送られない。記録を 端末の 外に 出さない）。
     はこんだら「ひっこしずみ」の しるし（mh_moved）を のこし、次からは すぐ 新しい住所へ 移るだけ。古い 記録は 消さない。
     大きすぎて URL に 入らないとき・圧縮に 失敗したときは 移らずに、バックアップの 文字で 手で はこぶ 案内を 出す。
     #mhmove で 開くと、しるしが あっても もう一度 はこぶ（新しい住所の「きろく」の「まえの ばしょから もってくる」から 来る）。
   ・新しい住所の move.html ＝「受けとり」：とどいた 記録を いまの 記録と 合わせて（減らさない）書き、「#」の 後ろを URL から 消して、もとの ページへ。
   ・課題リンクや ブックマークの つづき（#u=… #play #meter #q= など）と パス（/guide/… apps/100masu/ など）・?net=server も 引きつぐ。
   ・iframe と postMessage は 使わない（サードパーティの ストレージの 分離で、新しい住所の 本当の 保存場所に 書けないため）。
   ・保存名（キー）と 中身の 形は かえない。Node では require して tools/test-move.js が 検査する。 */
(function (root, factory) {
  const M = factory(root);
  if (typeof module === "object" && module.exports) module.exports = M;
  else { root.MH_MOVE = M; try { M.boot(); } catch (e) {} }
})(typeof self !== "undefined" ? self : this, function (root) {
  "use strict";
  /* ===== 設定（ここだけ） =====
     ON：公開の 日に true にする。true で 古い住所は 引っ越し係になり、canonical・sitemap・OGP の 住所も 新しい住所になる
         （住所の 書きかえは node tools/prepublish.js の 中の build-guide.js と site-url.js が する）。
     NEW_HOST：新しい住所。OLD_HOST・OLD_PATH：今の 住所（GitHub Pages）。 */
  const SITE = { ON: false, NEW_HOST: "hirametto.com", OLD_HOST: "tokugawaieyasudono.github.io", OLD_PATH: "/manabi-hiroba" };

  const NEW_ORIGIN = "https://" + SITE.NEW_HOST, OLD_ORIGIN = "https://" + SITE.OLD_HOST;
  const NEW_BASE = NEW_ORIGIN + "/", OLD_BASE = OLD_ORIGIN + SITE.OLD_PATH + "/";
  const BASE = SITE.ON ? NEW_BASE : OLD_BASE;          // canonical・sitemap・JSON-LD・OGP に 書く 住所
  const PAGE = "move.html", TAG = "mhmv=", AGAIN = "mhmove", MARK = "mh_moved";
  const MAX_URL = 900000;                              // URL の 長さの 上限（Firefox の 1MB より 少し 小さく。Chrome は 2MB）
  const MAX_VAL = 4000000;                             // 1つの 記録の 大きさの 上限（文字）

  /* はこぶ 記録：本体（mh_*）・100マス（giga_calc_*・study.*）・前の Qalc（qalc_*）。
     古い住所の オリジン（tokugawaieyasudono.github.io）は ほかの リポジトリの ページとも 同じなので、ほかの 名前は はこばない */
  const isOurs = k => typeof k === "string" && k !== MARK && k.length <= 80 && /^(mh_|qalc_|giga_calc_|study\.)/.test(k);
  /* 記録ではなく 設定・下書きなどの キー（両方に あれば 新しい住所の ほうを のこす）は mergeKey の さいごで まとめて あつかう */

  /* ---------- 住所 ---------- */
  const isOld = host => host === SITE.OLD_HOST;
  const isNew = host => host === SITE.NEW_HOST;
  /* 古い住所の パス → 新しい住所の パス（/manabi-hiroba/guide/x.html → /guide/x.html） */
  function newPath(pathname) {
    const b = SITE.OLD_PATH;
    if (pathname === b) return "/";
    if (pathname.indexOf(b + "/") === 0) return pathname.slice(b.length);
    return "/";
  }
  /* もどり先は 同じ サイトの 中の パスだけ（ほかの サイトへ とばさない） */
  function safeTo(to) {
    to = typeof to === "string" ? to : "";
    if (to.charAt(0) !== "/" || to.charAt(1) === "/" || to.charAt(1) === "\\" || /[\u0000-\u001f\\]/.test(to) || to.length > 8000) return "/";
    return to;
  }
  const oldHref = to => OLD_ORIGIN + SITE.OLD_PATH + safeTo(to);
  const newHref = to => NEW_ORIGIN + safeTo(to);

  /* ---------- 記録を まとめる・ほどく ---------- */
  function collect(ls) {
    const out = {};
    const n = ls.length;
    for (let i = 0; i < n; i++) {
      const k = ls.key(i); if (!isOurs(k)) continue;
      const v = ls.getItem(k); if (typeof v === "string" && v.length <= MAX_VAL) out[k] = v;
    }
    return out;
  }
  function b64u(bytes) {
    let s = ""; const C = 0x8000;
    for (let i = 0; i < bytes.length; i += C) s += String.fromCharCode.apply(null, bytes.subarray(i, i + C));
    return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function unb64u(s) {
    if (!/^[A-Za-z0-9_-]*$/.test(s)) throw new Error("bad");
    const t = atob(s.replace(/-/g, "+").replace(/_/g, "/")), out = new Uint8Array(t.length);
    for (let i = 0; i < t.length; i++) out[i] = t.charCodeAt(i);
    return out;
  }
  async function through(bytes, stream) {
    const res = new Response(new Blob([bytes]).stream().pipeThrough(stream));
    return new Uint8Array(await res.arrayBuffer());
  }
  /* 先頭の 1字：z＝deflate-raw で 圧縮／j＝圧縮なし（CompressionStream の ない ブラウザ） */
  async function pack(obj, noZip) {
    const bytes = new TextEncoder().encode(JSON.stringify(obj));
    if (!noZip && typeof CompressionStream === "function") {
      try { return "z" + b64u(await through(bytes, new CompressionStream("deflate-raw"))); } catch (e) {}
    }
    return "j" + b64u(bytes);
  }
  async function unpack(s) {
    const t = s.charAt(0), b = unb64u(s.slice(1));
    let raw;
    if (t === "z") { if (typeof DecompressionStream !== "function") throw new Error("nozip"); raw = await through(b, new DecompressionStream("deflate-raw")); }
    else if (t === "j") raw = b;
    else throw new Error("bad");
    const p = JSON.parse(new TextDecoder().decode(raw));
    if (!p || typeof p !== "object" || p.v !== 1 || !p.k || typeof p.k !== "object" || Array.isArray(p.k)) throw new Error("bad");
    return p;
  }

  /* ---------- 合わせる（減らさない） ---------- */
  const parse = s => { try { return JSON.parse(s); } catch (e) { return undefined; } };
  const isObj = o => !!o && typeof o === "object" && !Array.isArray(o);
  const num = v => (typeof v === "number" && Number.isFinite(v) ? v : null);
  const hi = (a, b) => (num(a) == null ? b : num(b) == null ? a : Math.max(a, b));
  const lo = (a, b) => (num(a) == null || a <= 0 ? b : num(b) == null || b <= 0 ? a : Math.min(a, b));
  /* 配列を 合わせる：a の 順のまま、b にしか ない 物を あとに 足す（同じかどうかは id の 関数で） */
  function union(a, b, id) {
    const out = a.slice(), seen = new Set(a.map(id));
    for (const x of b) { const k = id(x); if (!seen.has(k)) { seen.add(k); out.push(x); } }
    return out;
  }
  const jsonId = x => { try { return JSON.stringify(x); } catch (e) { return String(x); } };
  /* ひろば（mh_col）：記録の 多いほうを もとにして、もう一方を バックアップの 文字（HR4）と 同じ 合わせ方で 足す */
  function colWeight(COL, S) {
    let n = 0; for (const id in S.u) n += S.u[id][0] * 1000 + (S.u[id][1] || 0);
    return n + S.ac.e * 50 + ((S.y && S.y.c) || 0) + Object.keys(S.mk.own).length * 500;
  }
  function mergeCol(cur, inc, COL, today) {
    if (!COL) return cur;
    const A = COL.clean(cur, today), B = COL.clean(inc, today);
    const [base, other] = colWeight(COL, A) >= colWeight(COL, B) ? [A, B] : [B, A];
    const r = COL.hrParse(COL.hrMake(other));
    if (r) COL.hrMerge(base, r, today);
    base.tk.n = Math.max(base.tk.n, other.tk.n); base.tk.star = Math.max(base.tk.star, other.tk.star);      // チケット（バックアップの 文字には 入らない）
    return base;
  }
  const MERGE = {
    mh_col: (a, b, C, today) => (isObj(a) && isObj(b) && a.v === 1 && b.v === 1 ? mergeCol(a, b, C, today) : a.v === 1 ? a : b),
    mh_best(a, b) {                                     // { key: { score, medal } }：大きいほう
      if (!isObj(a) || !isObj(b)) return isObj(a) ? a : b;
      const o = { ...a };
      for (const k of Object.keys(b)) { const x = o[k], y = b[k]; if (!isObj(y)) continue;
        o[k] = isObj(x) ? { ...x, score: hi(x.score, y.score) || 0, medal: hi(x.medal, y.medal) || 0 } : y; }
      return o;
    },
    mh_meter(a, b) {                                    // { s: { ステージ: ★ }, guide, ch }：★は 大きいほう。設定は いまの ほう
      if (!isObj(a) || !isObj(b)) return isObj(a) ? a : b;
      const s = { ...(isObj(a.s) ? a.s : {}) }, t = isObj(b.s) ? b.s : {};
      for (const k of Object.keys(t)) s[k] = hi(s[k], t[k]);
      return { ...a, s };
    },
    mh_spbest(a, b) {                                   // { key: { ta 秒（小さいほど よい）, sd 問, at } }
      if (!isObj(a) || !isObj(b)) return isObj(a) ? a : b;
      const o = { ...a };
      for (const k of Object.keys(b)) { const x = o[k], y = b[k]; if (!isObj(y)) continue;
        if (!isObj(x)) { o[k] = y; continue; }
        const e = { ...x, at: hi(x.at, y.at) || 0 }, ta = lo(x.ta, y.ta), sd = hi(x.sd, y.sd);
        if (ta != null) e.ta = ta; if (sd != null) e.sd = sd; o[k] = e; }
      return o;
    },
    mh_nigate: (a, b) => (Array.isArray(a) && Array.isArray(b) ? union(a, b, it => (isObj(it) ? (it.unit || "c") + "|" + it.q + "|" + (it.stem || "") : jsonId(it))) : Array.isArray(a) ? a : b),
    mh_quiz_sets(a, b) {                                // { v:1, sets:[{ id, upd, … }] }：id ごとに 新しいほう、ない物は 足す
      if (!isObj(a) || !Array.isArray(a.sets) || !isObj(b) || !Array.isArray(b.sets)) return isObj(a) && Array.isArray(a.sets) ? a : b;
      const sets = a.sets.slice(), at = new Map(sets.map((s, i) => [isObj(s) ? s.id : null, i]));
      for (const s of b.sets) { if (!isObj(s)) continue; const i = s.id != null ? at.get(s.id) : undefined;
        if (i == null) { sets.push(s); if (s.id != null) at.set(s.id, sets.length - 1); } else if ((num(s.upd) || 0) > (num(sets[i].upd) || 0)) sets[i] = s; }
      return { ...a, sets };
    },
    mh_m100(a, b) {                                     // 100マスの どんぐりの 数えた ところ：先へ すすんだ ほう（二重に もらわない）
      if (!isObj(a) || !isObj(b)) return isObj(a) ? a : b;
      return { ...a, c: hi(a.c, b.c) || 0 };
    },
    "study.records.v1"(a, b) {                          // 100マスの 学習ログ：両方の 回を のこす（同じ回は 1つ）。はじめた 時刻の 順
      if (!Array.isArray(a) || !Array.isArray(b)) return Array.isArray(a) ? a : b;
      const id = x => (isObj(x) && x.id != null ? "i:" + x.id : isObj(x) ? "s:" + x.appId + "|" + x.startedAt + "|" + x.mode : jsonId(x));
      const t = x => { const v = isObj(x) ? Date.parse(x.startedAt) : NaN; return Number.isFinite(v) ? v : 0; };
      return union(a, b, id).map((x, i) => [x, i]).sort((p, q) => t(p[0]) - t(q[0]) || p[1] - q[1]).map(p => p[0]);
    },
    giga_calc_records_v4(a, b) {                        // 100マスの 自己ベスト：{ 計算: { best {問題数: ミリ秒}, history [], bestSolved {時間: 数} } }
      if (!isObj(a) || !isObj(b)) return isObj(a) ? a : b;
      const o = { ...a };
      for (const m of Object.keys(b)) { const x = o[m], y = b[m]; if (!isObj(y)) continue;
        if (!isObj(x)) { o[m] = y; continue; }
        const best = { ...(isObj(x.best) ? x.best : {}) }, bs = { ...(isObj(x.bestSolved) ? x.bestSolved : {}) };
        if (isObj(y.best)) for (const k of Object.keys(y.best)) best[k] = lo(best[k], y.best[k]);
        if (isObj(y.bestSolved)) for (const k of Object.keys(y.bestSolved)) bs[k] = hi(bs[k], y.bestSolved[k]);
        const history = union(Array.isArray(x.history) ? x.history : [], Array.isArray(y.history) ? y.history : [], jsonId);
        o[m] = { ...x, best, history, bestSolved: bs }; }
      return o;
    }
  };
  /* 1つの キーを 合わせて、書く 文字を かえす。cur＝新しい住所に もう ある 文字（なければ null）、inc＝とどいた 文字。
     記録の キーは 上の 合わせ方。それ以外（設定・下書き・名前・しるし）は 新しい住所に あれば そのまま、なければ とどいた ほう */
  function mergeKey(k, cur, inc, COL, today) {
    if (cur == null) return inc;
    if (inc == null || cur === inc || !MERGE[k]) return cur;
    const a = parse(cur), b = parse(inc);
    if (a === undefined || a === null) return b === undefined ? cur : inc;        // いまの ほうが こわれている
    if (b === undefined || b === null) return cur;
    try { return JSON.stringify(MERGE[k](a, b, COL, today)); } catch (e) { return cur; }
  }
  /* とどいた 記録を ls に 書く。かえす：{ n はこんだ キーの 数, ch 書きかえた 数, bad 書けなかった キー } */
  function mergeInto(ls, inc, COL, today) {
    const res = { n: 0, ch: 0, bad: [] };
    for (const k of Object.keys(inc)) {
      const v = inc[k]; if (!isOurs(k) || typeof v !== "string" || v.length > MAX_VAL) continue;
      res.n++;
      let cur = null; try { cur = ls.getItem(k); } catch (e) {}
      const out = mergeKey(k, cur, v, COL, today);
      if (out === cur) continue;
      try { ls.setItem(k, out); res.ch++; } catch (e) { res.bad.push(k); }
    }
    return res;
  }

  /* ---------- 古い住所：引っ越し係 ---------- */
  function setMark(ls, n) { try { ls.setItem(MARK, JSON.stringify({ t: Date.now(), n: n | 0 })); } catch (e) {} }
  function hide(doc) {
    try { const s = doc.createElement("style"); s.id = "mhmvHide"; s.textContent = "html{visibility:hidden!important}"; (doc.head || doc.documentElement).appendChild(s); } catch (e) {}
  }
  function unhide(doc) { try { const s = doc.getElementById("mhmvHide"); if (s) s.remove(); } catch (e) {} }
  /* 自動で はこべなかったとき：バックアップの 文字で はこぶ 案内（ことばは ここ。ほかの ページにも 出るので 名前は 書かない） */
  const STUCK = {
    t: "おひっこし したよ",
    d: "この サイトは あたらしい ばしょ（" + SITE.NEW_HOST + "）に おひっこし したよ。きろくが おおきくて じどうで はこべなかったので、「きろく」の がめんで バックアップの もじを だして、あたらしい ばしょの「きろく」で いれてね。",
    bk: "バックアップの もじを だす", go: "あたらしい ばしょを ひらく", x: "とじる"
  };
  function stuck(doc, to) {
    const show = () => {
      if (doc.getElementById("mhmvStuck")) return;
      const box = doc.createElement("div"); box.id = "mhmvStuck"; box.setAttribute("role", "dialog"); box.setAttribute("aria-label", STUCK.t);
      box.style.cssText = "position:fixed;left:12px;right:12px;bottom:12px;z-index:2147483647;max-width:560px;margin:0 auto;background:#fff;color:#1b2a22;border:3px solid #16372a;border-radius:14px;padding:14px 16px;font:16px/1.7 sans-serif;box-shadow:0 6px 24px rgba(0,0,0,.25)";
      const a = (href, text, main) => `<a href="${href}" style="display:inline-block;min-height:44px;line-height:44px;padding:0 14px;margin:6px 8px 0 0;border-radius:10px;font-weight:bold;text-decoration:none;${main ? "background:#1f4d3a;color:#fff" : "border:2px solid #1f4d3a;color:#1f4d3a"}">${text}</a>`;
      box.innerHTML = `<b style="font-size:18px">${STUCK.t}</b><p style="margin:6px 0">${STUCK.d}</p>` + a(oldHref("/index.html#record"), STUCK.bk, true) + a(newHref(to), STUCK.go, false)
        + `<button type="button" style="min-height:44px;padding:0 14px;margin-top:6px;border:0;background:none;color:#46564d;font:inherit;text-decoration:underline;cursor:pointer">${STUCK.x}</button>`;
      box.querySelector("button").onclick = () => box.remove();
      (doc.body || doc.documentElement).appendChild(box);
    };
    if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", show); else show();
  }
  /* 古い住所で ひらかれたとき。done：テスト用（どこへ 移ったか／とまったか） */
  function leave(L, ls, doc, opt) {
    opt = opt || {};
    const again = L.hash === "#" + AGAIN;
    const to = again ? "/index.html#record" : safeTo(newPath(L.pathname) + L.search + L.hash);
    let mark = null; try { mark = ls && ls.getItem(MARK); } catch (e) { ls = null; }
    if (!ls || (mark && !again)) { L.replace(newHref(to)); return Promise.resolve("go"); }          // 2回目から（または 記録が 読めない）：すぐ 移るだけ
    let keys; try { keys = collect(ls); } catch (e) { keys = {}; }
    const n = Object.keys(keys).length;
    if (!n && !again) { setMark(ls, 0); L.replace(newHref(to)); return Promise.resolve("go"); }    // 記録が ない：はこぶ 物が ない
    if (doc) hide(doc);
    return pack({ v: 1, k: keys, to, m: again ? 1 : 0, t: Date.now() }, opt.noZip).then(p => {
      const url = NEW_ORIGIN + "/" + PAGE + "#" + TAG + p;
      if (url.length > (opt.max || MAX_URL)) throw new Error("big");
      setMark(ls, n); L.replace(url); return "send";
    }).catch(() => { if (doc) { unhide(doc); stuck(doc, to); } return "stuck"; });
  }
  /* ページの <head> で すぐ 動く。古い住所で ON のときだけ 何かする */
  function boot() {
    const L = root.location, doc = root.document;
    if (!L || !SITE.ON) return null;
    try { if (root.top !== root) return null; } catch (e) { return null; }       // iframe の 中では 何もしない
    if (isOld(L.hostname)) { let ls = null; try { ls = root.localStorage; void ls.length; } catch (e) { ls = null; } return leave(L, ls, doc); }
    if (L.hostname === "www." + SITE.NEW_HOST) { L.replace(newHref(L.pathname + L.search + L.hash)); return null; }      // www は つけない 住所に そろえる
    return null;
  }

  /* ---------- 新しい住所：受けとり（move.html から よぶ） ---------- */
  /* かえす：{ state: "none"|"ok"|"bad"|"full", to, m, n, ch } */
  async function receive(L, ls, COL, today, H) {
    const h = L.hash || "";
    if (h.indexOf("#" + TAG) !== 0) return { state: "none", to: "/" };
    const data = h.slice(1 + TAG.length);
    try { (H || root.history).replaceState(null, "", L.pathname); } catch (e) {}   // 「#」の 後ろの 記録を URL から 消す（戻るで 出てこない）
    let p; try { p = await unpack(data); } catch (e) { return { state: "bad", to: "/" }; }
    const to = safeTo(p.to);
    if (!ls) return { state: "full", to, m: p.m ? 1 : 0, n: 0, ch: 0 };
    const r = mergeInto(ls, p.k, COL, today);
    return { state: r.bad.length ? "full" : "ok", to, m: p.m ? 1 : 0, n: r.n, ch: r.ch, bad: r.bad };
  }
  /* 新しい住所の「きろく」に 出す 入口：古い住所で もう一度 はこぶ */
  const againHref = () => OLD_BASE + "#" + AGAIN;
  const here = () => { try { return root.location.hostname; } catch (e) { return ""; } };
  const showAgain = () => SITE.ON && isNew(here());

  return { SITE, BASE, NEW_BASE, OLD_BASE, NEW_ORIGIN, OLD_ORIGIN, PAGE, TAG, AGAIN, MARK, MAX_URL, STUCK, isOurs, isOld, isNew, newPath, safeTo, oldHref, newHref,
    collect, pack, unpack, mergeKey, mergeInto, MERGE, leave, boot, receive, againHref, showAgain };
});
