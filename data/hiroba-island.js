/* ひらめっと「じぶんの ひろば」の 島（水彩の 一枚絵 ＋ きまった ばしょ）。ひろばを 開くときだけ 読みこむ（index.html の loadScript）。
   2026-11-26：マス目の 島を やめて、PC の image2 で かいた 一枚絵（vendor/img/island/base-a.webp）の 上に、かざりを 大きく のせる 形に。
   - ばしょは 絵の 上の 足もとの 点（1152×768 の 目もり）。SPOTS の ならび＝ data/collection.js の place の cell 番号（1〜CELLS）。足すだけ・順番を かえない。
   - おける ばしょの 数は「できた」の 数で ふえる（はじめ 11 → 35）。学びで ふえる もの（すべりだい など）は きまった ばしょ。
   - まなびっこは 道と 広場を 歩く。かざりを さわると ぷるんと うごく（動きを へらす 設定では 止める）。
   - 島を ふやす ときは BASES に 絵と ばしょの 表を 足す（いまは 1つ）。
   - 重さ：絵は img を ならべる だけ。うごきは CSS の transform。 */
(function (root) {
  "use strict";
  const W = 1152, H = 768;
  const SPOTS = [
    [668, 372], [452, 352], [462, 262], [640, 205], [558, 325], [352, 412], [272, 338], [150, 305], [762, 398], [655, 498], [425, 528],
    [262, 470], [108, 478], [105, 245], [332, 568], [230, 575], [165, 530], [560, 590], [470, 640], [812, 455], [850, 575], [890, 515],
    [1012, 458], [1062, 335], [962, 255], [905, 330], [872, 408], [805, 338], [702, 438], [890, 150], [775, 150], [322, 150], [430, 110],
    [385, 480], [500, 480]
  ];
  // 学びで ふえる もの・学校（きまった ばしょ）。part：data/collection.js の PARTS の id。need：その教科の「できた」が 1つ 以上
  const FIXED = [
    { k: "school", x: 385, y: 238 }, { k: "lib", x: 735, y: 228, part: "lib" }, { k: "book1", x: 808, y: 292, part: "book1" },
    { k: "slide", x: 470, y: 160, part: "slide" }, { k: "swing", x: 655, y: 138, part: "swing" }, { k: "jungle", x: 205, y: 192, part: "jungle" }, { k: "bar", x: 245, y: 262, part: "bar" },
    { k: "flagjp", x: 520, y: 95, part: "flagjp" }, { k: "flagus", x: 602, y: 82, part: "flagus" },
    { k: "telescope", x: 985, y: 150, need: "r" }, { k: "mapboard", x: 760, y: 560, need: "s" }
  ];
  // 絵の 大きさ（1152 の 目もりでの はば）
  const SIZE = { school: 205, lib: 170, book1: 85, slide: 120, swing: 125, jungle: 120, bar: 95, flagjp: 95, flagus: 95, telescope: 90, mapboard: 100,
    tree: 105, flower: 85, bench: 85, hutch: 110, pond: 110, clock: 130, rainbow: 150,
    mushroom: 62, grass: 70, sunflower: 92, sakura: 125, appletree: 125, arch: 105, sandbox: 100, seesaw: 100, fountain: 135, lamp: 95, post: 70, picnic: 95,
    house: 150, bakery: 150, treehouse: 180, tent: 125, tower: 150, windmill: 165, doghouse: 100, chicken: 72, cat: 70, sheep: 82, duck: 72,
    balloon: 140, carousel: 175, castle: 200 };
  const SWAY = { duck: 1, sheep: 1, chicken: 1, cat: 1, doghouse: 1, sunflower: 1, sakura: 1, appletree: 1, tree: 1, balloon: 1, grass: 1, flagjp: 1, flagus: 1 };
  // まなびっこが 歩く 点（道と 広場）
  const WAY = [[558, 300], [558, 180], [560, 60], [558, 300], [300, 290], [90, 300], [558, 300], [840, 300], [1000, 300], [558, 300], [550, 450], [560, 540], [650, 560], [470, 330], [640, 330]];
  const ART = {}; // k -> 絵の パス。index.html が きめる
  const BASE = { src: "", w: W, h: H }; // 島の 絵。index.html が src を きめる

  const openCount = (total, cells) => Math.min(cells, SPOTS.length, 11 + Math.floor((total || 0) / 2));
  const spots = n => SPOTS.slice(0, n).map(([x, y]) => ({ x, y }));

  /* counts：{ total, m, j, e, s, r }（できた 以上の 単元の数）。parts：{ id: true }。placed：[{ id, cell }]。cells：おける ばしょの 数（COL.CELLS） */
  function build(counts, parts, placed, cells) {
    const c = counts || {}, open = openCount(c.total, cells), things = [], used = {};
    for (const f of FIXED) {
      if (f.part && !parts[f.part]) continue;
      if (f.need && !c[f.need]) continue;
      things.push({ k: f.k, x: f.x, y: f.y, fixed: 1 });
    }
    for (const p of placed) { const s = SPOTS[p.cell - 1]; if (!s) continue; used[p.cell] = 1; things.push({ k: p.id, x: s[0], y: s[1], cell: p.cell, decor: 1 }); }   // ばしょが まだ ひらいて いなくても、おいた ものは 出す
    const free = []; for (let i = 1; i <= open; i++) if (!used[i]) free.push({ cell: i, x: SPOTS[i - 1][0], y: SPOTS[i - 1][1] });
    return { c, open, total: Math.min(cells, SPOTS.length), things, spots: free };
  }

  /* opt：{ world, placing（おく ものを えらんでいる）, sel（えらんでいる かざりの id）, mates：[まなびっこの 絵の パス], zoom, aria,
            spotLabel(cell), decorLabel(id), onSpot(cell), onDecor(cell), onZoom(z) } */
  function mount(host, opt) {
    const w = opt.world, calm = root.matchMedia && root.matchMedia("(prefers-reduced-motion:reduce)").matches;
    const vp = document.createElement("div"); vp.className = "isle-vp"; host.appendChild(vp);
    const st = document.createElement("div"); st.className = "isle-st" + (opt.placing ? " placing" : ""); st.setAttribute("role", "group"); st.setAttribute("aria-label", opt.aria || ""); vp.appendChild(st);
    const px = v => (v / W * 100).toFixed(2) + "%", py = v => (v / H * 100).toFixed(2) + "%";
    const base = document.createElement("img"); base.className = "isle-base"; base.src = BASE.src; base.alt = ""; base.decoding = "async"; base.draggable = false; st.appendChild(base);
    const timers = [];
    w.things.slice().sort((a, b) => a.y - b.y).forEach(t => {
      const sz = SIZE[t.k] || 90, img = document.createElement("img");
      img.src = ART[t.k] || ""; img.alt = ""; img.draggable = false; img.decoding = "async";
      let e = img;
      if (t.decor) {
        e = document.createElement("button"); e.type = "button"; e.className = "isle-it isle-decor" + (opt.sel === t.k ? " sel" : "");
        e.dataset.decor = t.cell; e.setAttribute("aria-label", opt.decorLabel ? opt.decorLabel(t.k) : t.k); if (opt.sel === t.k) e.setAttribute("aria-pressed", "true");
        e.appendChild(img);
        e.onclick = () => { opt.onDecor && opt.onDecor(t.cell); };
      } else { img.className = "isle-it isle-fx"; img.onclick = () => wob(img); }
      if (SWAY[t.k] && !calm) (t.decor ? img : e).classList.add("isle-sway");
      e.style.left = px(t.x); e.style.top = py(t.y); e.style.width = px(sz); e.style.zIndex = Math.round(t.y);
      st.appendChild(e);
    });
    function wob(e) { if (calm) return; e.classList.remove("isle-wob"); void e.offsetWidth; e.classList.add("isle-wob"); }
    if (opt.placing) for (const s of w.spots) {
      const b = document.createElement("button"); b.type = "button"; b.className = "isle-spot"; b.dataset.spot = s.cell; b.setAttribute("aria-label", opt.spotLabel ? opt.spotLabel(s.cell) : "");
      b.style.left = px(s.x); b.style.top = py(s.y); b.style.zIndex = 2000 + s.cell;
      b.onclick = () => { opt.onSpot && opt.onSpot(s.cell); };
      st.appendChild(b);
    }
    // まなびっこ：道と 広場を 歩く（動きを へらす 設定では 広場に 立つ だけ）
    (opt.mates || []).slice(0, 4).forEach((src, k) => {
      const m = document.createElement("div"); m.className = "isle-mk"; m.setAttribute("aria-hidden", "true");
      const i = document.createElement("img"); i.src = src; i.alt = ""; i.draggable = false; i.style.animationDelay = (k * .15) + "s"; m.appendChild(i); st.appendChild(m);
      let n = k * 3;
      const go = () => { const p = calm ? [470 + k * 60, 330] : WAY[n % WAY.length]; n += 1 + ((k + n) % 3); m.style.left = px(p[0]); m.style.top = py(p[1]); m.style.zIndex = Math.round(p[1]); };
      go();
      if (!calm) timers.push(setTimeout(() => { go(); timers.push(setInterval(go, 2600 + k * 300)); }, 400 + k * 500));
    });
    // 大きさ：＋ － で 1〜3ばい（はみ出したら ゆびで うごかす＝ふつうの スクロール）
    const zc = opt.cover ? Math.max(1, Math.min(3, vp.clientHeight * 1.5 / (vp.clientWidth || 1))) : 1;      // cover：島で 画面を うめる 大きさ
    let z = Math.max(1, Math.min(3, opt.zoom || zc));
    const center = () => { vp.scrollLeft = (st.offsetWidth - vp.clientWidth) / 2; vp.scrollTop = (st.offsetHeight - vp.clientHeight) / 2; };
    const apply = () => { st.style.width = (z * 100) + "%"; };
    apply();
    if (opt.scroll) { vp.scrollLeft = opt.scroll[0]; vp.scrollTop = opt.scroll[1]; } else center();
    return {
      scroll: () => [vp.scrollLeft, vp.scrollTop],
      zoom(f) { const r = vp.getBoundingClientRect(), cx = (vp.scrollLeft + r.width / 2) / (r.width * z), cy = (vp.scrollTop + r.height / 2) / (st.offsetHeight || 1);
        z = Math.max(1, Math.min(3, z * f)); apply(); vp.scrollLeft = cx * r.width * z - r.width / 2; vp.scrollTop = cy * st.offsetHeight - r.height / 2; if (opt.onZoom) opt.onZoom(z); },
      home() { z = zc; apply(); center(); if (opt.onZoom) opt.onZoom(z); },
      nodes: () => st.querySelectorAll("*").length,
      destroy() { timers.forEach(t => { clearTimeout(t); clearInterval(t); }); vp.remove(); }
    };
  }

  root.MH_ISLE = { SPOTS, FIXED, SIZE, ART, BASE, build, spots, openCount, mount };
})(typeof self !== "undefined" ? self : this);
