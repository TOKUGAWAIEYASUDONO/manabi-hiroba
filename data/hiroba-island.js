/* ひらめっと「じぶんの ひろば」の 島（2D・ななめ上から 見た マス）。ひろばを 開くときだけ 読みこむ（index.html の loadScript）。
   試作 proto/hiroba-island（ブランチ claude/hiroba-island-proto）の 2D版を もとに、本番の 記録に つないだもの。
   - 島は 5つ：まんなかの ひろば＋さんすう・こくご・えいご・しゃかい/りか。島ごとの 広さは その教科の「できた」の数で ふえる。
   - ひろばの 島には かざりを おく「おける ばしょ」が CELLS こ ある（data/collection.js の place の cell 番号と おなじ）。
     番号の 小さい ばしょほど まんなかに 近い ＝ 前の 12マスの かざりは そのまま まんなか あたりに 出る。
   - 絵：vendor/img/island/{k}-256.webp が あれば それを、なければ index.html・hiroba-art.js の symbol を つかう。
   - 重さ：うごかすのは CSS transform だけ（かきなおさない）。じめんは 文字列で まとめて 1回で 入れる。 */
(function (root) {
  "use strict";
  const NS = "http://www.w3.org/2000/svg", INK = "#3a2f28";
  const HW = 56, HH = 28, LIFT = 18, WALL = 40;

  /* ---- 島の データ ---- */
  const D = 30; // 島と 島の あいだ（マス）
  const ISLANDS = [
    { id: "hub", subj: "", ci: 0, cj: 0, R: 12 },
    { id: "m", subj: "m", ci: D, cj: 0, R: 10, axis: "i", dir: 1 },
    { id: "j", subj: "j", ci: 0, cj: D, R: 10, axis: "j", dir: 1 },
    { id: "e", subj: "e", ci: -D, cj: 0, R: 10, axis: "i", dir: -1 },
    { id: "sr", subj: "sr", ci: 0, cj: -D, R: 10, axis: "j", dir: -1 }
  ];
  const BRIDGE_AT = 1; // その教科で「できた」が 1つで はしが かかる
  function hash(i, j, s) {
    let h = (i * 374761393 + j * 668265263 + (s || 0) * 982451653) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  function noise(i, j) {
    const x = i / 3.6, y = j / 3.6, x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0;
    const s = t => t * t * (3 - 2 * t), a = hash(x0, y0, 3), b = hash(x0 + 1, y0, 3), c = hash(x0, y0 + 1, 3), d = hash(x0 + 1, y0 + 1, 3);
    const top = a + (b - a) * s(fx), bot = c + (d - c) * s(fx);
    return top + (bot - top) * s(fy);
  }
  // 島に 立つ もの（島の まんなかからの ばしょ）。part：data/collection.js の PARTS の id（来ている ときだけ 出る）
  const FIXED = {
    hub: [{ k: "school", di: -2, dj: -2 }, { k: "tree", di: -4, dj: -3 }, { k: "tree", di: 3, dj: -4 }, { k: "tree", di: -3, dj: 4 }],
    m: [{ k: "slide", di: 2, dj: -2, part: "slide" }, { k: "swing", di: -2, dj: -2, part: "swing" }, { k: "bar", di: 2, dj: 2, part: "bar" }, { k: "jungle", di: -2, dj: 2, part: "jungle" }],
    j: [{ k: "book1", di: 2, dj: -2, part: "book1" }, { k: "lib", di: -2, dj: -2, part: "lib" }, { k: "tree", di: 3, dj: 3 }],
    e: [{ k: "flagjp", di: -2, dj: -2, part: "flagjp" }, { k: "flagus", di: 2, dj: -2, part: "flagus" }, { k: "tree", di: -3, dj: 3 }],
    sr: [{ k: "mapboard", di: -2, dj: 2, need: "s" }, { k: "telescope", di: 2, dj: 2, need: "r" }, { k: "tree", di: -3, dj: -3 }]
  };
  const REST = { m: "lighthouse", j: "tent", e: "windmill", sr: "well" }; // とちゅうの 小島に 立つ もの
  const PONDS = { hub: [[3, 3], [3, 4], [4, 3]], m: [], j: [[-3, 2]], e: [], sr: [[2, -3]] };
  const area = R => { let n = 0; for (let a = -R; a <= R; a++) for (let b = -R; b <= R; b++) if (Math.hypot(a, b) <= R) n++; return n; };
  function sizeOf(isl, c) {
    if (isl.id === "hub") return Math.min(area(isl.R), 70 + c.total * 4);
    return Math.min(area(isl.R), 16 + c[isl.subj] * 8);
  }
  // 島の マスの ならび（ふえる じゅん）。まんなか・きまった もの は さいしょ
  const orderCache = {};
  function order(isl) {
    if (orderCache[isl.id]) return orderCache[isl.id];
    const reserved = new Set([...(FIXED[isl.id] || []).map(f => f.di + "," + f.dj), ...PONDS[isl.id].map(p => p.join(","))]);
    const cand = [];
    for (let di = -isl.R; di <= isl.R; di++) for (let dj = -isl.R; dj <= isl.R; dj++) {
      const r = Math.hypot(di, dj); if (r > isl.R) continue;
      let sc = r + (hash(isl.ci + di, isl.cj + dj, 1) - 0.5) * 2.2;
      if (reserved.has(di + "," + dj) || (Math.abs(di) <= 1 && Math.abs(dj) <= 1)) sc = -10 + r;
      cand.push({ di, dj, sc });
    }
    cand.sort((a, b) => a.sc - b.sc);
    return (orderCache[isl.id] = cand);
  }
  // ひろばの島の「おける ばしょ」：ふえる じゅんに、となり あわない ように えらぶ（n こ）
  const spotCache = {};
  function spots(n) {
    if (spotCache[n]) return spotCache[n];
    const hub = ISLANDS[0], bad = new Set([...FIXED.hub.map(f => f.di + "," + f.dj), ...PONDS.hub.map(p => p.join(","))]), out = [];
    const near = (a, b) => Math.abs(a.di - b.di) <= 1 && Math.abs(a.dj - b.dj) <= 1;
    for (const c of order(hub)) {
      if (out.length >= n) break;
      if (bad.has(c.di + "," + c.dj) || c.di === 0 || c.dj === 0 || (Math.abs(c.di) <= 1 && Math.abs(c.dj) <= 1)) continue; // みちと まんなかは あける
      if ([...bad].some(k => { const [a, b] = k.split(",").map(Number); return near(c, { di: a, dj: b }); })) continue;
      if (out.some(o => near(o, c))) continue;
      out.push({ i: c.di, j: c.dj });
    }
    return (spotCache[n] = out);
  }

  /* counts：{ total, m, j, e, s, r }（できた 以上の 単元の数）。parts：{ id: true }（来ている 成果）。
     placed：[{ id, art, cell }]。cells：おける ばしょの 数。 */
  function build(counts, parts, placed, cells) {
    const c = { total: counts.total || 0, m: counts.m || 0, j: counts.j || 0, e: counts.e || 0, sr: (counts.s || 0) + (counts.r || 0), s: counts.s || 0, r: counts.r || 0 };
    const tiles = new Map(), things = [], labels = [];
    const sp = spots(cells);
    for (const isl of ISLANDS) {
      const n = sizeOf(isl, c), list = order(isl);
      for (const o of list.slice(0, n)) { const i = isl.ci + o.di, j = isl.cj + o.dj; tiles.set(i + "," + j, { i, j, h: 0, t: "grass", isl: isl.id }); }
      for (const [di, dj] of PONDS[isl.id]) { const t = tiles.get((isl.ci + di) + "," + (isl.cj + dj)); if (t) t.t = "pond"; }
      for (let k = -isl.R; k <= isl.R; k++) { // みち：まんなか から はしの ほうへ
        const on = isl.id === "hub" ? [[k, 0], [0, k]] : isl.axis === "i" ? (k * isl.dir <= 0 ? [[k, 0]] : []) : (k * isl.dir <= 0 ? [[0, k]] : []);
        for (const [di, dj] of on) { const t = tiles.get((isl.ci + di) + "," + (isl.cj + dj)); if (t && t.t === "grass") t.t = "path"; }
      }
      for (const f of FIXED[isl.id]) {
        if (f.part && !parts[f.part]) continue;
        if (f.need && !c[f.need]) continue;
        if (!tiles.has((isl.ci + f.di) + "," + (isl.cj + f.dj))) continue;
        things.push({ k: f.k, i: isl.ci + f.di, j: isl.cj + f.dj, isl: isl.id, fixed: 1 });
      }
      labels.push({ isl, n: isl.id === "hub" ? c.total : c[isl.subj] });
    }
    // はし
    for (const isl of ISLANDS.slice(1)) {
      isl.bridge = c[isl.subj] >= BRIDGE_AT;
      if (!isl.bridge) continue;
      for (let k = 1; k < D; k++) {
        const i = isl.axis === "i" ? k * isl.dir : 0, j = isl.axis === "j" ? k * isl.dir : 0, key = i + "," + j;
        if (!tiles.has(key)) tiles.set(key, { i, j, h: 0, t: "bridge", isl: "bridge" });
      }
    }
    // とちゅうの 小島（はしの まんなか。ひとやすみの ばしょ）
    for (const isl of ISLANDS.slice(1)) {
      const m = D / 2, ci = isl.axis === "i" ? m * isl.dir : 0, cj = isl.axis === "j" ? m * isl.dir : 0;
      for (let a = -2; a <= 2; a++) for (let b = -2; b <= 2; b++) {
        if (Math.hypot(a, b) > 2.3 + (hash(ci + a, cj + b, 5) - .5)) continue;
        const key = (ci + a) + "," + (cj + b), old = tiles.get(key), onWay = (isl.axis === "i" ? b : a) === 0;
        tiles.set(key, { i: ci + a, j: cj + b, h: 0, t: onWay && old ? "path" : "grass", isl: "rest" });
      }
      things.push({ k: REST[isl.id], i: ci + (isl.axis === "i" ? 0 : 1), j: cj + (isl.axis === "i" ? 1 : 0), isl: "rest", sea: 1 });
    }
    // おける ばしょ（いまの 広さに ある ものだけ）と、おいた かざり
    const spotList = [];
    sp.forEach((s, x) => { const t = tiles.get(s.i + "," + s.j); if (t && t.t === "grass") spotList.push({ cell: x + 1, i: s.i, j: s.j }); });
    for (const p of placed) {
      const s = spotList.find(o => o.cell === p.cell) || (sp[p.cell - 1] ? { cell: p.cell, i: sp[p.cell - 1].i, j: sp[p.cell - 1].j } : null);
      if (!s) continue;
      if (!tiles.has(s.i + "," + s.j)) tiles.set(s.i + "," + s.j, { i: s.i, j: s.j, h: 0, t: "grass", isl: "hub" }); // 広さが たりなくても おいた ものは 出す
      things.push({ k: p.id, art: p.art, i: s.i, j: s.j, isl: "hub", cell: p.cell, decor: 1 });
    }
    const busy = new Set([...things, ...spotList].map(t => t.i + "," + t.j));
    const land = (i, j) => { const t = tiles.get(i + "," + j); return t && t.t !== "bridge"; };
    for (const t of tiles.values()) { // 丘（まわりが ぜんぶ りく）
      if (t.t !== "grass" || busy.has(t.i + "," + t.j)) continue;
      let inner = true; for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) if (!land(t.i + a, t.j + b)) inner = false;
      if (inner && noise(t.i, t.j) > 0.64) t.h = 1;
    }
    for (const t of tiles.values()) { // 木を ちらす（ひろばの島は すくなめ＝かざりの ばしょを のこす）
      const key = t.i + "," + t.j, isl = ISLANDS.find(x => x.id === t.isl);
      if (!isl || t.t !== "grass" || busy.has(key) || hash(t.i, t.j, 9) > (isl.id === "hub" ? 0.05 : 0.09)) continue;
      if (Math.abs(t.i - isl.ci) <= 1 && Math.abs(t.j - isl.cj) <= 1) continue;
      things.push({ k: "tree", i: t.i, j: t.j, isl: t.isl, wild: 1 }); busy.add(key);
    }
    // うみの もの（いわ・すな の小島・うきわ・ふね・さかな・なみ）。りくから はなれた ところに、きまった ばしょで
    const sea = [], far = (i, j, r) => { for (let a = -r; a <= r; a++) for (let b = -r; b <= r; b++) if (tiles.has((i + a) + "," + (j + b))) return false; return true; };
    const E = D + 13;
    for (let i = -E; i <= E; i++) for (let j = -E; j <= E; j++) {
      if (Math.abs(i - j) > E + 8 || Math.abs(i + j) > E + 8) continue;
      const h = hash(i, j, 21); if (h > 0.045) continue;
      const v = hash(i, j, 22), k = v < .34 ? "wave" : v < .56 ? "rock" : v < .68 ? "islet" : v < .78 ? "lily" : v < .87 ? "boat" : v < .94 ? "fish" : "buoy";
      if (!far(i, j, k === "islet" ? 4 : k === "wave" ? 2 : 3)) continue;
      if (k !== "wave" && sea.some(o => o.k !== "wave" && Math.abs(o.i - i) < 5 && Math.abs(o.j - j) < 5)) continue;
      sea.push({ k, i, j, f: v });
    }
    return { c, tiles, things, labels, sea, spots: spotList, hAt: (i, j) => (tiles.get(i + "," + j) || { h: 0 }).h };
  }
  function bounds(w) {
    let a = Infinity, b = -Infinity, c = Infinity, e = -Infinity;
    for (const t of w.tiles.values()) { const x = t.i - t.j, y = t.i + t.j; a = Math.min(a, x); b = Math.max(b, x); c = Math.min(c, y); e = Math.max(e, y); }
    return { xmin: a, xmax: b, ymin: c, ymax: e };
  }

  /* ---- かく ---- */
  const el = (tag, at, parent) => { const e = document.createElementNS(NS, tag); for (const k in at) e.setAttribute(k, at[k]); if (parent) parent.appendChild(e); return e; };
  const pts = a => a.map(p => p.map(v => Math.round(v * 10) / 10).join(",")).join(" ");
  const ART = {}; // k -> 画像の パス（vendor/img/island に あるもの）。index.html が きめる
  const SYM = { school: "h-school", lib: "h-lib", book1: "h-book1", slide: "d-slide", swing: "d-swing", bar: "h-bar", jungle: "h-jungle", flagjp: "h-flagjp", flagus: "h-flagus", tree: "d-tree" };
  const SIZE = { school: 190, lib: 160, tree: 110, jungle: 120, rainbow: 120, clock: 130, hutch: 110, mapboard: 110, book1: 100, pond: 120, flower: 95, bench: 90 };

  const OL = `stroke="${INK}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"`;
  const RESTART = { // とちゅうの 小島の たてもの（SVG）
    lighthouse: (x, y) => `<path d="M${x - 16} ${y}l6 -70h20l6 70z" fill="#fffaf0" ${OL}/><path d="M${x - 13} ${y - 30}h26l1 14h-28z" fill="#e85d4a" ${OL}/><rect x="${x - 14}" y="${y - 88}" width="28" height="18" rx="3" fill="#ffe58a" ${OL}/><path d="M${x - 18} ${y - 88}l18 -16 18 16z" fill="#e85d4a" ${OL}/>`,
    tent: (x, y) => `<path d="M${x - 40} ${y}l40 -62 40 62z" fill="#f2b544" ${OL}/><path d="M${x} ${y - 62}l-12 62h24z" fill="#e0942a" ${OL}/><path d="M${x} ${y - 62}v-14" ${OL}/><path d="M${x} ${y - 76}l16 6 -16 6z" fill="#e85d4a" ${OL}/>`,
    windmill: (x, y) => `<path d="M${x - 18} ${y}l6 -58h24l6 58z" fill="#f5ecdc" ${OL}/><path d="M${x - 14} ${y - 58}l14 -16 14 16z" fill="#4b7fd1" ${OL}/><g class="isle-spin" style="transform-origin:${x}px ${y - 60}px"><path d="M${x} ${y - 60}l-8 -40h16zM${x} ${y - 60}l40 -8v16zM${x} ${y - 60}l8 40h-16zM${x} ${y - 60}l-40 8v-16z" fill="#fffaf0" ${OL}/></g><circle cx="${x}" cy="${y - 60}" r="5" fill="#f2b544" ${OL}/>`,
    well: (x, y) => `<ellipse cx="${x}" cy="${y - 6}" rx="28" ry="12" fill="#b9b3a8" ${OL}/><path d="M${x - 28} ${y - 6}v-16a28 12 0 0 1 56 0v16" fill="#cfc9be" ${OL}/><ellipse cx="${x}" cy="${y - 22}" rx="20" ry="8" fill="#5fb0d0" ${OL}/><path d="M${x - 26} ${y - 22}v-40M${x + 26} ${y - 22}v-40" ${OL}/><path d="M${x - 36} ${y - 58}l36 -20 36 20z" fill="#e07a6a" ${OL}/>`
  };

  /* opt：{ world, label(isl, n) → 文字, placing（おく ものを えらんでいる）, sel（えらんでいる かざりの id）, view, onSpot(cell), onDecor(cell), onView(view) } */
  function mount(host, opt) {
    const w = opt.world;
    const vp = document.createElement("div"); vp.className = "isle-vp"; host.appendChild(vp);
    const svg = el("svg", { class: "isle-svg", role: "group", "aria-label": opt.aria || "" }); vp.appendChild(svg);
    el("defs", {}, svg).innerHTML = '<linearGradient id="isG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a9d17e"/><stop offset="1" stop-color="#8cc066"/></linearGradient>'
      + '<linearGradient id="isW" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8fd0e6"/><stop offset="1" stop-color="#5fb0d0"/></linearGradient>';
    const P = (i, j, h) => [(i - j) * HW, (i + j) * HH - (h || 0) * LIFT];
    const b = bounds(w);
    const box = { x: b.xmin * HW - HW - 40, y: b.ymin * HH - HH - 170, w: (b.xmax - b.xmin) * HW + 2 * HW + 80, h: (b.ymax - b.ymin) * HH + 2 * HH + WALL + 230 };
    svg.setAttribute("viewBox", `${box.x} ${box.y} ${box.w} ${box.h}`); svg.setAttribute("width", box.w); svg.setAttribute("height", box.h);
    const seaG = el("g", { class: "isle-sea" }, svg), ground = el("g", {}, svg), objs = el("g", {}, svg), tags = el("g", { class: "isle-tags" }, svg);

    // じめん
    const list = [...w.tiles.values()].sort((a, c) => (a.i + a.j) - (c.i + c.j) || a.h - c.h);
    const T = (i, j) => w.tiles.get(i + "," + j);
    const tops = [];
    for (const t of list) {
      const [x, y] = P(t.i, t.j, t.h);
      if (t.t === "bridge") { tops.push(`<polygon points="${pts([[x, y - HH + 6], [x + HW - 10, y + 2], [x, y + HH - 4], [x - HW + 10, y + 2]])}" fill="#c98a3d" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>`); continue; }
      const nR = T(t.i + 1, t.j), nL = T(t.i, t.j + 1);
      const hR = nR && nR.t !== "bridge" ? nR.h : -1, hL = nL && nL.t !== "bridge" ? nL.h : -1;
      const wr = hR < 0 ? t.h * LIFT + WALL : (t.h - hR) * LIFT, wl = hL < 0 ? t.h * LIFT + WALL : (t.h - hL) * LIFT;
      if (wr > 0) tops.push(`<polygon points="${pts([[x + HW, y], [x, y + HH], [x, y + HH + wr], [x + HW, y + wr]])}" fill="${hR < 0 ? "#8a5d36" : "#a8774a"}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>`);
      if (wl > 0) tops.push(`<polygon points="${pts([[x - HW, y], [x, y + HH], [x, y + HH + wl], [x - HW, y + wl]])}" fill="${hL < 0 ? "#a5774b" : "#c29262"}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>`);
      const pond = t.t === "pond", path = t.t === "path";
      tops.push(`<polygon points="${pts([[x, y - HH], [x + HW, y], [x, y + HH], [x - HW, y]])}" fill="${pond ? "url(#isW)" : path ? "#f3e2bd" : (t.i + t.j) & 1 ? "url(#isG)" : t.h ? "#b3d987" : "#9fcb74"}" stroke="${pond ? "#4f9cbf" : path ? "#dcc391" : "#7fae58"}" stroke-width="1.2"/>`);
    }
    ground.innerHTML = tops.join("");
    // うみ：島の まわりの あさせ（2だん）と、うみの もの
    const seaS = [];
    for (const pass of [[3.2, "#a5def0", .85], [1.9, "#c9f0f3", .95]]) { // りくの マスを 大きくした ひしがたを かさねる＝きしに そった かたち（path 1つ）
      const k = pass[0]; let d = "";
      for (const t of w.tiles.values()) { if (t.t === "bridge") continue; const [x, y] = P(t.i, t.j); d += `M${x} ${Math.round(y + 24 - HH * k)}l${Math.round(HW * k)} ${Math.round(HH * k)}l${-Math.round(HW * k)} ${Math.round(HH * k)}l${-Math.round(HW * k)} ${-Math.round(HH * k)}z`; }
      seaS.push(`<path d="${d}" fill="${pass[1]}" opacity="${pass[2]}" stroke="${pass[1]}" stroke-width="${Math.round(k * 22)}" stroke-linejoin="round"/>`);
    }
    const O = `stroke="${INK}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"`;
    const SEA = {
      wave: (x, y, f) => `<path class="isle-wv" d="M${x - 30} ${y}q8 -8 16 0t16 0M${x + 4} ${y + 14}q8 -8 16 0t16 0" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" opacity=".75"/>`,
      rock: (x, y, f) => `<ellipse cx="${x}" cy="${y + 8}" rx="40" ry="12" fill="#d3f1f4"/><path d="M${x - 26} ${y + 6}l6 -22 14 -8 12 10 6 20z" fill="#b9b3a8" ${O}/><path d="M${x + 6} ${y + 8}l4 -12 10 -3 8 15z" fill="#cfc9be" ${O}/><path d="M${x - 14} ${y - 12}l8 -4" stroke="#fff" stroke-width="3" stroke-linecap="round"/>`,
      islet: (x, y, f) => `<ellipse cx="${x}" cy="${y + 6}" rx="78" ry="30" fill="#d3f1f4"/><ellipse cx="${x}" cy="${y}" rx="56" ry="20" fill="#f6e3b4" ${O}/><path d="M${x - 6} ${y - 2}q-6 -30 6 -52" fill="none" stroke="${INK}" stroke-width="9" stroke-linecap="round"/><path d="M${x - 6} ${y - 2}q-6 -30 6 -52" fill="none" stroke="#b98656" stroke-width="5" stroke-linecap="round"/><path d="M${x} ${y - 54}q-26 -14 -40 6q20 -6 40 -6q26 -14 40 6q-20 -6 -40 -6q-4 -24 -24 -24q16 6 24 24q4 -24 24 -24q-16 6 -24 24z" fill="#7fbf6a" ${O}/><circle cx="${x + 26}" cy="${y + 2}" r="5" fill="#f5a9c0" ${O}/>`,
      lily: (x, y, f) => `<ellipse cx="${x - 14}" cy="${y}" rx="18" ry="8" fill="#8fcf7a" ${O}/><ellipse cx="${x + 16}" cy="${y + 10}" rx="14" ry="6" fill="#a9d98a" ${O}/><circle cx="${x - 14}" cy="${y - 3}" r="6" fill="#f9c6d8" ${O}/>`,
      boat: (x, y, f) => `<g class="isle-bob"><path d="M${x - 34} ${y - 4}h68l-12 18h-44z" fill="#e07a6a" ${O}/><path d="M${x} ${y - 4}v-52" ${O}/><path d="M${x + 3} ${y - 54}l30 42h-30z" fill="#fffaf0" ${O}/><path d="M${x - 3} ${y - 46}l-22 34h22z" fill="#f2b544" ${O}/></g><path d="M${x - 44} ${y + 18}q10 -7 20 0t20 0t20 0t20 0" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".8"/>`,
      fish: (x, y, f) => `<g class="isle-jump"><path d="M${x - 16} ${y - 24}q16 -14 30 0q-14 14 -30 0zM${x - 16} ${y - 24}l-12 -9v18z" fill="#f2a05a" ${O}/><circle cx="${x + 6}" cy="${y - 26}" r="2.2" fill="${INK}"/></g><ellipse cx="${x}" cy="${y + 2}" rx="22" ry="7" fill="none" stroke="#fff" stroke-width="3" opacity=".8"/>`,
      buoy: (x, y, f) => `<g class="isle-bob"><path d="M${x - 12} ${y}q12 -34 24 0z" fill="#e85d4a" ${O}/><path d="M${x - 7} ${y - 12}h14" stroke="#fff" stroke-width="5"/><circle cx="${x}" cy="${y - 22}" r="4" fill="#f2b544" ${O}/></g><ellipse cx="${x}" cy="${y + 2}" rx="20" ry="6" fill="none" stroke="#fff" stroke-width="3" opacity=".8"/>`
    };
    for (const o of w.sea) { const [x, y] = P(o.i, o.j), X = Math.round(x), Y = Math.round(y); seaS.push(`<g transform="translate(${X} ${Y}) scale(1.6) translate(${-X} ${-Y})">${SEA[o.k](X, Y, o.f)}</g>`); }
    seaG.innerHTML = seaS.join("");

    // もの・おける ばしょ
    const drawn = [...w.things, ...(opt.placing ? w.spots.filter(s => !w.things.some(t => t.i === s.i && t.j === s.j)).map(s => ({ ...s, spot: 1 })) : [])]
      .sort((a, c) => (a.i + a.j) - (c.i + c.j));
    for (const t of drawn) {
      const [x, y] = P(t.i, t.j, w.hAt(t.i, t.j));
      if (t.spot) {
        const g = el("g", { class: "isle-tap isle-spot", tabindex: 0, role: "button", "data-spot": t.cell, "aria-label": opt.spotLabel ? opt.spotLabel(t.cell) : "" }, objs);
        el("polygon", { points: pts([[x, y - HH + 4], [x + HW - 6, y], [x, y + HH - 4], [x - HW + 6, y]]), fill: "#fff", "fill-opacity": .6, stroke: "#e0942a", "stroke-width": 3, "stroke-dasharray": "8 6" }, g);
        el("path", { d: `M${x} ${y - 9}v18M${x - 9} ${y}h18`, stroke: "#e0942a", "stroke-width": 4, "stroke-linecap": "round" }, g);
        continue;
      }
      if (t.sea) { const g = el("g", {}, objs); g.innerHTML = RESTART[t.k](Math.round(x), Math.round(y)); continue; }
      const sz = SIZE[t.k] || 90;
      const g = t.decor ? el("g", { class: "isle-tap isle-decor" + (opt.sel === t.k ? " sel" : ""), tabindex: 0, role: "button", "data-decor": t.cell, "aria-label": opt.decorLabel ? opt.decorLabel(t.k) : t.k, ...(opt.sel === t.k ? { "aria-pressed": "true" } : {}) }, objs) : el("g", {}, objs);
      if (t.decor) el("polygon", { class: "hl", points: pts([[x, y - HH], [x + HW, y], [x, y + HH], [x - HW, y]]), fill: "#fff", "fill-opacity": .55, stroke: "#f2b544", "stroke-width": 4 }, g);
      if (ART[t.k]) el("image", { href: ART[t.k], x: x - sz / 2, y: y - sz + 10, width: sz, height: sz }, g);
      else { const id = t.art || SYM[t.k]; if (id) el("use", { href: "#" + id, x: x - sz / 2, y: y - sz + 6, width: sz, height: sz, class: "isle-sym" }, g); }
    }
    // 島の なまえ
    for (const L of w.labels) {
      const isl = L.isl, [x, y] = P(isl.ci + isl.R * 0.55, isl.cj + isl.R * 0.55);
      const s = opt.label ? opt.label(isl, L.n) : isl.id;
      const g = el("g", {}, tags), tw = Math.max(120, s.length * 36 + 40);
      el("rect", { x: x - tw / 2, y: y - 30, width: tw, height: 60, rx: 30, fill: "#fffaf0", stroke: INK, "stroke-width": 3 }, g);
      el("text", { x, y: y + 12, "text-anchor": "middle", "font-size": 34, "font-weight": 700, fill: INK }, g).textContent = s;
    }

    // うごかす・つまむ
    let view = opt.view ? { ...opt.view } : null, fitS = 1;
    const apply = () => { svg.style.transform = `translate(${view.x}px,${view.y}px) scale(${view.s})`; };
    function fit(focusHub) {
      const r = vp.getBoundingClientRect(), W = r.width || 320, H = r.height || 320;
      fitS = Math.min(W / box.w, H / box.h);
      if (focusHub) { // はじめは ひろばの島が 大きく 見える ように
        const R = ISLANDS[0].R, s = Math.min(W / ((2 * R + 4) * HW * 1.1), H / ((2 * R + 6) * HH * 1.3)), [hx, hy] = P(0, 0);
        view = { s: Math.max(fitS, s), x: 0, y: 0 }; view.x = W / 2 - (hx - box.x) * view.s; view.y = H / 2 - (hy - box.y) * view.s;
      } else { view = { s: fitS, x: (W - box.w * fitS) / 2, y: (H - box.h * fitS) / 2 }; }
      apply(); if (opt.onView) opt.onView(view);
    }
    function zoomAt(f, cx, cy) {
      const s = Math.max(fitS * 0.8, Math.min(fitS * 8, view.s * f)), k = s / view.s;
      view.x = cx - (cx - view.x) * k; view.y = cy - (cy - view.y) * k; view.s = s; apply(); if (opt.onView) opt.onView(view);
    }
    if (view) { const r = vp.getBoundingClientRect(); fitS = Math.min((r.width || 320) / box.w, (r.height || 320) / box.h); apply(); } else fit(true);

    const ptrs = new Map(); let gest = null, moved = 0;
    vp.addEventListener("pointerdown", e => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      try { vp.setPointerCapture(e.pointerId); } catch (_) {}
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      moved = ptrs.size === 1 ? 0 : 99; gest = null; svg.style.willChange = "transform";
    });
    vp.addEventListener("pointermove", e => {
      const p = ptrs.get(e.pointerId); if (!p) return;
      const r = vp.getBoundingClientRect();
      if (ptrs.size === 1) { const dx = e.clientX - p.x, dy = e.clientY - p.y; moved += Math.abs(dx) + Math.abs(dy); if (moved > 8) { view.x += dx; view.y += dy; apply(); } }
      else if (ptrs.size === 2) {
        const [a, c] = [...ptrs.values()], d0 = Math.hypot(a.x - c.x, a.y - c.y);
        p.x = e.clientX; p.y = e.clientY;
        const [q, u] = [...ptrs.values()], d1 = Math.hypot(q.x - u.x, q.y - u.y), mx = (q.x + u.x) / 2 - r.left, my = (q.y + u.y) / 2 - r.top;
        if (gest) { view.x += mx - gest.x; view.y += my - gest.y; } gest = { x: mx, y: my };
        if (d0 > 0) zoomAt(d1 / d0, mx, my); return;
      }
      p.x = e.clientX; p.y = e.clientY;
    });
    const up = e => {
      if (!ptrs.has(e.pointerId)) return; ptrs.delete(e.pointerId);
      if (ptrs.size === 0) { svg.style.willChange = "auto"; if (opt.onView) opt.onView(view); if (moved <= 8 && e.type === "pointerup") tap(e.clientX, e.clientY); }
      gest = null;
    };
    vp.addEventListener("pointerup", up); vp.addEventListener("pointercancel", up);
    vp.addEventListener("wheel", e => { e.preventDefault(); const r = vp.getBoundingClientRect(); zoomAt(Math.exp(-e.deltaY * 0.0015), e.clientX - r.left, e.clientY - r.top); }, { passive: false });
    function hit(g) {
      if (!g) return false;
      if (g.dataset.spot) { opt.onSpot && opt.onSpot(+g.dataset.spot); return true; }
      if (g.dataset.decor) { opt.onDecor && opt.onDecor(+g.dataset.decor); return true; }
      return false;
    }
    function tap(x, y) { const h = document.elementFromPoint(x, y); hit(h && h.closest ? h.closest(".isle-tap") : null); }
    objs.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { const g = e.target.closest(".isle-tap"); if (hit(g)) e.preventDefault(); } });

    return {
      zoom(f) { const r = vp.getBoundingClientRect(); zoomAt(f, r.width / 2, r.height / 2); },
      home() { fit(true); },
      all() { fit(false); },
      nodes: () => svg.querySelectorAll("*").length,
      destroy() { vp.remove(); }
    };
  }

  root.MH_ISLE = { ISLANDS, BRIDGE_AT, ART, build, spots, mount, hash };
})(typeof self !== "undefined" ? self : this);
