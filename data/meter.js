/* まなびひろば 「めもり名人《めいじん》」：数直線《すうちょくせん》と はかりの めもりを よむ ゲームの 問題と 絵
   index.html の #meter が loadScript で読みこむ。画面（DOM）には 依存しない（tools/test-meter.js で検査）
   ■ 問題 q = { st, kind:"line"|"dial", ask, sp, v, a, unit, q, steps? , items?, target? }
     ask   read（▼・はりを よむ）／tick（1めもりは いくつ）／max（いちばん おもくて）／zero（なにも のせないとき）
           place（ここは どこ？ タッチ）／kgg（□kg□g で よむ）／shop（ぴったり おかいもの）
     sp    数直線 {t:1めもり, n:めもりの数, b:数字の ある めもりの 間かく}
           はかり {key, max, t:1めもり, lab:数字の 間かく, mid:長めの めもりの 間かく}
     v     ▼・はり・おく場所の 値（数直線は 数、はかりは g）
     a     答え（数。kgg だけ {kg,g}）
   ■ 絵は SVG の文字列（lineSVG・dialSVG）。黒板（深緑）の上で 白い線・クリーム色の 目もり板 */
window.MH_METER = (function () {
  "use strict";
  /* 数直線：1めもりの 大きさごとの [めもりの数, 数字の間かく] */
  const LINES = { 1: [[10, 5], [20, 5], [20, 10]], 2: [[10, 5], [20, 5]], 5: [[10, 2], [20, 4], [20, 2]], 10: [[10, 5], [20, 5], [20, 10]], 100: [[10, 5], [10, 2]] };
  /* はかり：じっさいの はかりに 合わせた 目もり（1kg は 5g、2kg は 10g、4kg は 20g。台所の 200g・500g） */
  const DIALS = {
    g200: { key: "g200", max: 200, t: 2, lab: 20, mid: 10 },
    g500: { key: "g500", max: 500, t: 5, lab: 50, mid: 25 },
    kg1: { key: "kg1", max: 1000, t: 5, lab: 100, mid: 50 },
    kg2: { key: "kg2", max: 2000, t: 10, lab: 200, mid: 100 },
    kg4: { key: "kg4", max: 4000, t: 20, lab: 500, mid: 100 }
  };
  const SPAN = 360;                                   // 目もりの ある 角度（0 は 上。ぐるっと 1しゅうして さいごの 数は 0 と 同じ ところ）
  const ITEMS = [["🍎", "りんご", 300], ["🍌", "バナナ", 180], ["🍊", "みかん", 100], ["🍇", "ぶどう", 400], ["🥕", "にんじん", 150],
    ["🍞", "パン", 250], ["🧀", "チーズ", 120], ["🍙", "おにぎり", 110], ["🥚", "たまご", 60], ["🍪", "クッキー", 40], ["🥛", "ぎゅうにゅう", 210], ["🍠", "さつまいも", 350]];

  const STAGES = [
    { id: 1, g: "line", t: "1めもり＝1", d: "▼の 数《かず》を よもう", n: 5 },
    { id: 2, g: "line", t: "ここは どこ？", d: "数《かず》の ばしょを タッチ", n: 5 },
    { id: 3, g: "line", t: "1めもりは いくつ？", d: "数字《すうじ》の 間《あいだ》を かぞえる", n: 5 },
    { id: 4, g: "line", t: "すうちょくせんを よむ", d: "1めもりを 見《み》て よむ", n: 5 },
    { id: 5, g: "line", t: "ここは どこ？ 2", d: "2・5・10・100とび", n: 5 },
    { id: 6, g: "dial", t: "はかりの さいだい", d: "いちばん おもくて なんg？", n: 5 },
    { id: 7, g: "dial", t: "はかりの 1めもり", d: "1めもりは なんg？", n: 5 },
    { id: 8, g: "dial", t: "はりを よむ", d: "なんg かな？", n: 5 },
    { id: 9, g: "dial", t: "kgと g", d: "□kg□g で よむ", n: 5 },
    { id: 10, g: "dial", t: "ぴったり おかいもの", d: "のせて はりを よむ", n: 4 },
    { id: 11, g: "all", t: "めもり名人《めいじん》テスト", d: "ぜんぶ まぜて", n: 6 }
  ];

  const pick = (r, a) => a[Math.floor(r() * a.length)];
  const range = (r, lo, hi) => lo + Math.floor(r() * (hi - lo + 1));
  /* はかりの 数字（2kg・4kg の はかりは、1kg を こえると 200・400… と g だけ 書く。じっさいの はかりと 同じ） */
  const dialLab = (sp, v) => v === 0 ? "0" : v % 1000 === 0 && sp.max >= 1000 ? `${v / 1000}kg` : String(sp.max > 1000 ? v % 1000 : v);
  const kgg = v => v >= 1000 ? `${Math.floor(v / 1000)}kg${v % 1000 ? v % 1000 + "g" : ""}` : `${v}g`;
  const gTxt = v => `${v}g`;

  /* ---------- 問題を つくる ---------- */
  function lineSpec(r, ts) { const t = pick(r, ts), c = pick(r, LINES[t]); return { t, n: c[0], b: c[1] }; }
  function lineK(r, sp) {                              // 数字の ない めもりを えらぶ（両はしと 数字の ある めもりは さける）
    for (let i = 0; i < 40; i++) { const k = range(r, 1, sp.n - 1); if (k % sp.b) return k; }
    return 1;
  }
  function mkLine(r, st, ask, ts) {
    const sp = lineSpec(r, ts), k = lineK(r, sp), v = k * sp.t;
    if (ask === "tick") return { st, kind: "line", ask, sp, v: null, a: sp.t, unit: "", q: "1めもりは いくつ？" };
    if (ask === "place") return { st, kind: "line", ask, sp, v, a: v, unit: "", q: `${v} は どこ？` };
    const q = { st, kind: "line", ask: "read", sp, v, a: v, unit: "", q: "▼の 数《かず》は いくつ？" };
    if (sp.t !== 1) q.steps = ["tick", "read"];
    return q;
  }
  function dialV(r, sp, lo, hi) {                      // 数字の ない めもりを えらぶ（はしは さける）
    const k0 = Math.ceil((lo == null ? sp.t : lo) / sp.t), k1 = Math.floor((hi == null ? sp.max - sp.t : hi) / sp.t);
    for (let i = 0; i < 40; i++) { const v = range(r, k0, k1) * sp.t; if (v % sp.lab) return v; }
    return k0 * sp.t;
  }
  function mkDial(r, st, ask, keys) {
    const sp = DIALS[pick(r, keys)];
    if (ask === "max") { const kg = sp.max >= 1000; return { st, kind: "dial", ask, sp, v: 0, a: kg ? sp.max / 1000 : sp.max, unit: kg ? "kg" : "g", q: `この はかりは、いちばん おもくて なん${kg ? "kg" : "g"} まで はかれる？` }; }
    if (ask === "zero") return { st, kind: "dial", ask, sp, v: 0, a: 0, unit: "g", q: "なにも のせて いない とき、はりは なんg？" };
    if (ask === "tick") return { st, kind: "dial", ask, sp, v: 0, a: sp.t, unit: "g", q: "この はかりの 1めもりは なんg？" };
    if (ask === "kgg") { const v = dialV(r, sp, 1000 + sp.t, sp.max - sp.t); return { st, kind: "dial", ask, sp, v, a: { kg: Math.floor(v / 1000), g: v % 1000 }, unit: "kgg", q: "はりは なんkg なんg？", steps: ["max", "tick", "kgg"] }; }
    const v = dialV(r, sp); return { st, kind: "dial", ask: "read", sp, v, a: v, unit: "g", q: "はりは なんg？", steps: ["max", "tick", "read"] };
  }
  function mkShop(r, st) {
    const sp = DIALS[r() < 0.5 ? "kg1" : "kg2"], step = sp.key === "kg1" ? 10 : 20;
    for (let tries = 0; tries < 80; tries++) {
      const base = [...ITEMS].sort(() => r() - 0.5).slice(0, 4);
      const items = base.map(([e, nm, w]) => ({ e, nm, w: Math.max(step * 2, w + range(r, -3, 3) * step) * (sp.key === "kg2" && r() < 0.5 ? 2 : 1) }));
      if (new Set(items.map(x => x.w)).size < 4) continue;
      const n = range(r, 2, 3), idx = [0, 1, 2, 3].sort(() => r() - 0.5).slice(0, n), target = idx.reduce((s, i) => s + items[i].w, 0);
      if (target >= sp.max || target % sp.lab === 0) continue;
      return { st, kind: "dial", ask: "shop", sp, v: 0, a: target, target, items, unit: "g", q: `${kgg(target)} ぴったりに しよう！` };
    }
    return null;
  }
  /* 1回分（ステージの 問題を まとめて）。r は 0〜1 の 乱数の 関数 */
  function round(st, r) {
    r = r || Math.random;
    const S = STAGES.find(s => s.id === st); if (!S) return [];
    const out = [];
    for (let i = 0; out.length < S.n && i < 100; i++) {
      let q = null;
      if (st === 1) q = mkLine(r, st, "read", [1]);
      else if (st === 2) q = mkLine(r, st, "place", [1]);
      else if (st === 3) q = mkLine(r, st, "tick", [2, 5, 10, 100]);
      else if (st === 4) q = mkLine(r, st, "read", [2, 5, 10, 100]);
      else if (st === 5) q = mkLine(r, st, "place", [2, 5, 10, 100]);
      else if (st === 6) q = out.length === 1 ? mkDial(r, st, "zero", ["g200", "g500", "kg1"]) : mkDial(r, st, "max", Object.keys(DIALS));
      else if (st === 7) q = mkDial(r, st, "tick", Object.keys(DIALS));
      else if (st === 8) q = mkDial(r, st, "read", ["g200", "g500", "kg1"]);
      else if (st === 9) q = mkDial(r, st, "kgg", ["kg2", "kg4"]);
      else if (st === 10) q = mkShop(r, st);
      else {
        const k = out.length;
        q = k === 0 ? mkLine(r, st, "read", [1, 2, 5]) : k === 1 ? mkLine(r, st, "read", [10, 100]) : k === 2 ? mkDial(r, st, "max", Object.keys(DIALS))
          : k === 3 ? mkDial(r, st, "tick", Object.keys(DIALS)) : k === 4 ? mkDial(r, st, "read", ["g500", "kg1"]) : mkDial(r, st, "kgg", ["kg2", "kg4"]);
      }
      if (!q) continue;
      const key = JSON.stringify([q.ask, q.sp, q.v, q.target]);    // 同じ 問題が つづかない
      if (out.some(o => JSON.stringify([o.ask, o.sp, o.v, o.target]) === key)) continue;
      out.push(q);
    }
    return out;
  }
  /* 「ステップで よむ」の 小問《しょうもん》：さいだい → 1めもり → はり */
  function sub(q, ask) {
    if (ask === q.ask) return q;
    if (ask === "tick") return { ...q, ask, a: q.sp.t, unit: q.kind === "dial" ? "g" : "", q: q.kind === "dial" ? "1めもりは なんg？" : "1めもりは いくつ？", steps: null };
    if (ask === "max") { const kg = q.sp.max >= 1000; return { ...q, ask, a: kg ? q.sp.max / 1000 : q.sp.max, unit: kg ? "kg" : "g", q: `いちばん おもくて なん${kg ? "kg" : "g"} まで はかれる？`, steps: null }; }
    return q;
  }
  /* 答えあわせ：x は 数、kgg は {kg,g} */
  function check(q, x) {
    if (q.ask === "kgg") return !!x && x.g < 1000 && x.kg * 1000 + x.g === q.v;
    return Number(x) === Number(q.a);
  }
  const fmt = (q, a) => {
    a = a === undefined ? q.a : a;
    if (q.ask === "kgg") return `${a.kg}kg${a.g}g`;
    return q.unit === "kgg" ? kgg(a) : `${a}${q.unit}`;
  };
  /* 4つから えらぶ：正しい答えと、よくある まちがい（1めもりを 1と 思う・となりの めもり・数字を そのまま） */
  function choices(q, r) {
    r = r || Math.random;
    const sp = q.sp, a = q.ask === "kgg" ? q.v : q.a, c = [];
    const add = v => { if (v != null && v >= 0 && Number.isInteger(v) && v !== a && !c.includes(v)) c.push(v); };
    if (q.ask === "tick") { [sp.t * 2, sp.t / 2, 1, sp.b || sp.lab / sp.t, sp.lab || sp.t * sp.b, sp.t * 10, sp.t + 1].forEach(add); }
    else if (q.ask === "max") { const u = sp.max >= 1000 ? 1000 : 1; [(sp.max - sp.lab) / u, sp.max / u / 2, sp.max / u * 2, sp.lab / u, sp.max / u + 1, sp.max / u - 1].forEach(v => { if (Number.isInteger(v) && v > 0) add(v); }); }
    else if (q.ask === "zero") { [sp.t, sp.lab, sp.max].forEach(add); }
    else {
      const t = sp.t, L = q.kind === "line" ? sp.t * sp.b : sp.lab, base = Math.floor(a / L) * L, k = (a - base) / t;
      const lim = q.kind === "line" ? sp.t * sp.n : sp.max;
      [base + k, a + t, a - t, base + L - (a - base), a + 2 * t, a - 2 * t, base + k * 10].forEach(v => { if (v > 0 && v < lim) add(v); });
      if (q.ask === "kgg") [a - 1000 + 0, a + 1000].forEach(v => { if (v > 0 && v < sp.max) add(v); });
    }
    for (let i = 0; c.length < 3 && i < 50; i++) add(a + (range(r, 1, 6) * (r() < 0.5 ? -1 : 1)) * (sp.t || 1));
    const vals = [a, ...c.slice(0, 3)].sort(() => r() - 0.5);
    return vals.map(v => ({ v: q.ask === "kgg" ? { kg: Math.floor(v / 1000), g: v % 1000 } : v, label: q.ask === "kgg" ? kgg(v) : fmt(q, v) }));
  }
  /* まちがえた ときの 手がかり：hl は 絵の 光る ところ、msg は ことば */
  function hint(q, x, tries, extra) {
    const sp = q.sp;
    if (tries >= 2 && q.ask !== "place" && q.ask !== "shop") return { hl: hlOf(q), msg: `こたえは ${q.ask === "kgg" ? kgg(q.v) : fmt(q)} だよ。`, reveal: true };
    if (q.kind === "line") {
      const L = sp.t * sp.b;
      if (q.ask === "tick") return { hl: { from: 0, to: sp.b }, msg: `0 から ${L} まで ${sp.b}めもり。${sp.b}めもりで ${L} だね。` };
      const kv = q.v / sp.t, kl = Math.floor(kv / sp.b) * sp.b;
      if (q.ask === "place" && tries >= 2) return { hl: { from: kl, to: kv }, msg: `${kl * sp.t} から ${kv - kl}めもり。光《ひか》った ところだよ。`, show: true };
      return { hl: { from: kl, to: kv }, msg: `${kl * sp.t} から ${kv - kl}めもり。1めもりは ${sp.t} だよ。` };
    }
    if (q.ask === "max") return { hl: { max: true }, msg: "0 から はじまって、ぐるっと 1しゅう まわった さいごの 数字《すうじ》を 見《み》よう。0 の となりに あるよ。" };
    if (q.ask === "zero") return { hl: { zero: true }, msg: "なにも のせないと、はりは 0 の ところだよ。" };
    if (q.ask === "tick") { const to = sp.max > 1000 ? sp.mid : sp.lab; return { hl: { from: 0, to, z: to / 2 }, msg: sp.max > 1000 ? `0 から 長《なが》めの めもり（${to}g）まで ${to / sp.t}めもり。` : `0 から ${to}g まで ${to / sp.t}めもり。` }; }
    const v = q.ask === "shop" ? extra : q.v, vl = Math.floor(v / sp.lab) * sp.lab, n = (v - vl) / sp.t;
    if (q.ask === "shop") {
      if (tries >= 2) return { hl: { from: vl, to: v, z: v }, msg: `いまは ${kgg(v)}。${v < q.target ? `あと ${q.target - v}g` : `${v - q.target}g おおいよ`}。` };
      return { hl: { from: vl, to: v, z: v }, msg: `はりは ${kgg(vl)} から ${n}めもり。1めもりは ${sp.t}g。` };
    }
    let msg = `${kgg(vl)} から ${n}めもり。1めもりは ${sp.t}g だよ。`;
    if (q.ask === "kgg" && x && x.kg === 0 && x.g >= 1000) msg = "1000g は 1kg。kg の ところにも 数《かず》を 入《い》れよう。";
    else if (q.ask === "kgg" && vl >= 1000 && vl % 1000) msg = `「${vl % 1000}」は ${kgg(vl)} の こと。そこから ${n}めもり。`;
    return { hl: { from: vl, to: v, z: v }, msg };
  }
  function hlOf(q) {
    const sp = q.sp;
    if (q.kind === "line") { if (q.ask === "tick") return { from: 0, to: sp.b }; const kv = q.v / sp.t; return { from: Math.floor(kv / sp.b) * sp.b, to: kv }; }
    if (q.ask === "max") return { max: true }; if (q.ask === "zero") return { zero: true };
    if (q.ask === "tick") { const to = sp.max > 1000 ? sp.mid : sp.lab; return { from: 0, to, z: to / 2 }; }
    return { from: Math.floor(q.v / sp.lab) * sp.lab, to: q.v, z: q.v };
  }
  /* 「ステップで よむ」で 小問の 答えが あたったときの しるし */
  const chip = s => s.ask === "max" ? `さいだい ${fmt(s)}` : s.ask === "tick" ? `1めもり ${fmt(s)}` : fmt(s);

  /* ---------- 絵（SVG の 文字列） ---------- */
  const f1 = x => Math.round(x * 10) / 10;
  const CH = "#ffffff", CH2 = "#e3f1e8", YL = "#ffd84d", OR = "#ff8a3d";
  /* 数直線：o = { v（▼）, mark（おいた めもり k）, hl:{from,to}, tool, ok（正しい ばしょ k を 緑で） } */
  function lineSVG(sp, o) {
    o = o || {};
    const W = 360, x0 = 24, x1 = 336, y = 58, n = sp.n, dx = (x1 - x0) / n, X = k => f1(x0 + k * dx), s = [];
    s.push(`<svg class="mtsvg mtline" viewBox="0 0 ${W} 112" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${o.label || "すうちょくせん"}" shape-rendering="geometricPrecision">`);
    s.push(`<rect class="mthit" x="0" y="0" width="${W}" height="112" fill="transparent"/>`);
    const hl = o.hl;
    if (hl && hl.to != null) s.push(`<line x1="${X(hl.from)}" y1="${y}" x2="${X(hl.to)}" y2="${y}" stroke="${YL}" stroke-width="7" stroke-linecap="round" opacity=".9"/>`);
    s.push(`<line x1="${x0 - 8}" y1="${y}" x2="${x1 + 16}" y2="${y}" stroke="${CH}" stroke-width="3"/><path d="M${x1 + 20} ${y} l-10 -6 v12 z" fill="${CH}"/>`);
    for (let k = 0; k <= n; k++) {
      const big = k % sp.b === 0, mid = !big && sp.b % 2 === 0 && sp.b >= 4 && k % (sp.b / 2) === 0;
      const top = big ? y - 22 : mid ? y - 17 : y - 12, on = o.tool && big;
      s.push(`<line x1="${X(k)}" y1="${top}" x2="${X(k)}" y2="${big ? y + 6 : y}" stroke="${on ? YL : big ? CH : CH2}" stroke-width="${big ? 3 : 2}"/>`);
      if (big) {
        const ring = hl && hl.from === k;
        if (ring || on) s.push(`<rect x="${f1(X(k) - 21)}" y="${y + 11}" width="42" height="24" rx="12" fill="none" stroke="${YL}" stroke-width="${ring ? 3 : 2}"/>`);
        s.push(`<text x="${X(k)}" y="${y + 29}" font-size="18" font-weight="700" text-anchor="middle" fill="${ring || on ? YL : CH}">${k * sp.t}</text>`);
      }
    }
    const cnt = (k, i, col) => s.push(`<text x="${X(k)}" y="${y - 25}" font-size="${dx < 18 ? 11 : 13}" font-weight="700" text-anchor="middle" fill="${col}">${i}</text>`);
    if (hl && hl.to != null) for (let k = hl.from + 1, i = 1; k <= hl.to; k++, i++) cnt(k, i, YL);
    else if (o.tool) for (let k = 1; k < n; k++) if (k % sp.b) cnt(k, k % sp.b, "#fff1b8");
    if (o.v != null) { const xv = X(o.v / sp.t); s.push(`<path d="M${xv} ${hl && hl.to != null ? 22 : 30} l-9 -15 h18 z" fill="${YL}" stroke="#7a5a00" stroke-width="1"/>`); }
    if (o.ok != null) s.push(`<path d="M${X(o.ok)} 30 l-9 -15 h18 z" fill="#7be08f" stroke="#1b5e20" stroke-width="1"/>`);
    if (o.mark != null) { const xm = X(o.mark); s.push(`<g class="mtmark"><line x1="${xm}" y1="${y - 26}" x2="${xm}" y2="${y + 2}" stroke="${OR}" stroke-width="3"/><path d="M${xm} ${y - 26} l-10 -16 h20 z" fill="${OR}" stroke="#7a2e00" stroke-width="1"/></g>`); }
    s.push(`</svg>`);
    return s.join("");
  }
  /* はかり：o = { v（はり）, hl:{from,to,z}|{max}|{zero}, tool, zoom（その 値の まわりを 大きく）, items:[絵文字], body:false で 目もり板だけ } */
  const CX = 150, CY = 186, R = 122;
  const ang = (sp, v) => SPAN * v / sp.max;                       // 上から 時計まわりの 角度
  const nAng = (sp, v) => v > sp.max ? SPAN + 6 : ang(sp, v);   // はり：おもすぎる ときは 0 を 少し こえて とまる
  const pt = (a, r) => [f1(CX + r * Math.sin(a * Math.PI / 180)), f1(CY - r * Math.cos(a * Math.PI / 180))];
  function arc(sp, v0, v1, r) {
    const a0 = ang(sp, v0), a1 = ang(sp, v1), p0 = pt(a0, r), p1 = pt(a1, r);
    if (a1 - a0 >= 359.9) { const q = pt(a0 + 180, r); return `M${p0[0]} ${p0[1]} A${r} ${r} 0 1 1 ${q[0]} ${q[1]} A${r} ${r} 0 1 1 ${p0[0]} ${p0[1]}`; }
    return `M${p0[0]} ${p0[1]} A${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${p1[0]} ${p1[1]}`;
  }
  function dialSVG(sp, o) {
    o = o || {};
    const s = [], hl = o.hl || null, N = sp.max / sp.t;
    let vb = o.items ? "0 -10 300 340" : "0 16 300 314";
    if (o.zoom != null) { const p = pt(ang(sp, o.zoom), R - 12); vb = `${f1(p[0] - 32)} ${f1(p[1] - 32)} 64 64`; }
    s.push(`<svg class="mtsvg mtdial${o.zoom != null ? " mtzoom" : ""}" viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${o.label || "はかり"}" shape-rendering="geometricPrecision">`);
    s.push(`<rect x="14" y="52" width="272" height="272" rx="36" fill="#2f6db0" stroke="#173f6b" stroke-width="3"/>`);
    s.push(`<rect x="138" y="34" width="24" height="20" fill="#7d8b99"/><rect x="52" y="24" width="196" height="14" rx="7" fill="#d5dce3" stroke="#6b7988" stroke-width="2"/>`);
    if (o.items && o.items.length) { const w = 196 / o.items.length; o.items.forEach((e, i) => s.push(`<text x="${f1(52 + w * (i + .5))}" y="21" font-size="28" text-anchor="middle">${e}</text>`)); }
    s.push(`<circle cx="${CX}" cy="${CY}" r="${R}" fill="#fffbea" stroke="#13304d" stroke-width="4"/>`);
    if (hl && hl.to != null && hl.to > hl.from) s.push(`<path d="${arc(sp, hl.from, hl.to, R - 9)}" fill="none" stroke="${OR}" stroke-width="14" opacity=".55"/>`);
    if (hl && hl.max) s.push(`<path d="${arc(sp, 0, sp.max, R - 9)}" fill="none" stroke="${OR}" stroke-width="5" opacity=".35"/>`);
    for (let i = 0; i < N; i++) {                                   // さいごの 数は 0 と 同じ めもり
      const v = i * sp.t, a = ang(sp, v), big = v % sp.lab === 0, mid = !big && v % sp.mid === 0;
      const len = big ? 18 : mid ? 12 : 7, p0 = pt(a, R - 4), p1 = pt(a, R - 4 - len);
      s.push(`<line x1="${p0[0]}" y1="${p0[1]}" x2="${p1[0]}" y2="${p1[1]}" stroke="${o.tool && big ? "#d35400" : "#1b2a38"}" stroke-width="${big ? 2.6 : mid ? 1.6 : 0.9}" stroke-linecap="round"/>`);
      if (big) {
        /* 上（0）は 右に「0」、左に さいごの 数を ならべる（どちらも 同じ めもり） */
        const labs = v === 0 ? [[0, 16, (hl && hl.zero) || (hl && hl.from === 0 && hl.to != null)], [sp.max, -1, hl && hl.max]]
          : [[v, 0, hl && hl.from === v && hl.to != null]];
        for (const [lv, side, ring] of labs) {
          const t = dialLab(sp, lv), w = t.length > 3 ? 36 : t.length > 2 ? 30 : t.length > 1 ? 22 : 14, lp = pt(a, R - 38);
          const cx = side > 0 ? CX + side : side < 0 ? f1(CX - w / 2 - 6) : lp[0];
          if (ring || o.tool) s.push(`<circle cx="${cx}" cy="${lp[1]}" r="${t.length > 2 ? 19 : 15}" fill="${ring ? "#ffe0b2" : "none"}" stroke="${OR}" stroke-width="${ring ? 3 : 1.6}"/>`);
          s.push(`<text x="${cx}" y="${f1(lp[1] + 5.5)}" font-size="${t.length > 3 ? 13.5 : 15.5}" font-weight="700" text-anchor="middle" fill="#13202b">${t}</text>`);
        }
      }
    }
    /* かぞえる 数字（めもりの 外がわ。大きく 見る ときに よめる 大きさ） */
    const num = (v, i) => { const p = pt(ang(sp, v), R + 7); s.push(`<text x="${p[0]}" y="${f1(p[1] + 2)}" font-size="5.6" font-weight="700" text-anchor="middle" fill="#ffe27a">${i}</text>`); };
    if (hl && hl.to != null) { const n = (hl.to - hl.from) / sp.t; for (let i = 1; i <= n; i++) if (n <= 5 || i % 5 === 0 || i === n) num(hl.from + i * sp.t, i); }
    else if (o.tool) for (let i = 1; i < N; i++) { const v = i * sp.t, r = (v % sp.lab) / sp.t; if (r && (sp.lab / sp.t <= 5 || r % 5 === 0)) num(v, r); }
    if (sp.max <= 1000) s.push(`<text x="${CX}" y="${CY + 52}" font-size="18" font-weight="700" text-anchor="middle" fill="#13202b">g</text>`);
    const nv = o.v == null ? 0 : o.v;
    s.push(`<g class="mtneedle" style="transform-box:view-box;transform-origin:${CX}px ${CY}px;transform:rotate(${f1(nAng(sp, nv))}deg)"><line x1="${CX}" y1="${CY + 22}" x2="${CX}" y2="${CY - R + 8}" stroke="#d32f2f" stroke-width="3" stroke-linecap="round"/><circle cx="${CX}" cy="${CY}" r="9" fill="#d32f2f"/><circle cx="${CX}" cy="${CY}" r="3" fill="#fff"/></g>`);
    s.push(`</svg>`);
    return s.join("");
  }
  const needleDeg = (sp, v) => f1(nAng(sp, v));
  return { STAGES, DIALS, LINES, ITEMS, round, sub, check, fmt, choices, hint, hlOf, chip, kgg, gTxt, dialLab, lineSVG, dialSVG, needleDeg };
})();
