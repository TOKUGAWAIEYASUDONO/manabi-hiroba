// 2D版：ななめ上から 見た マスを SVG で かく。ゆびで うごかす・つまんで 大きく
import { bounds } from "./world.js";

const NS = "http://www.w3.org/2000/svg", INK = "#3a2f28";
const HW = 56, HH = 28, LIFT = 18, WALL = 40;
const el = (tag, at, parent) => { const e = document.createElementNS(NS, tag); for (const k in at) e.setAttribute(k, at[k]); if (parent) parent.appendChild(e); return e; };
const pts = a => a.map(p => p.map(v => Math.round(v * 10) / 10).join(",")).join(" ");
const shade = (hex, f) => { const n = parseInt(hex.slice(1), 16); const c = [n >> 16, (n >> 8) & 255, n & 255].map(v => Math.max(0, Math.min(255, Math.round(v * f)))); return "#" + c.map(v => v.toString(16).padStart(2, "0")).join(""); };

export function mount(host, ctx) {
  const vp = document.createElement("div"); vp.className = "vp2d"; host.appendChild(vp);
  const svg = el("svg", { role: "img", "aria-label": "しまの ちず" }); vp.appendChild(svg);
  const defs = el("defs", {}, svg);
  defs.innerHTML = `<linearGradient id="grass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a9d17e"/><stop offset="1" stop-color="#8cc066"/></linearGradient>
    <linearGradient id="water" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8fd0e6"/><stop offset="1" stop-color="#5fb0d0"/></linearGradient>`;
  const seaG = el("g", {}, svg), groundG = el("g", {}, svg), objG = el("g", {}, svg);
  let world = null, mates = [], deco = false, box = { x: 0, y: 0, w: 100, h: 100 };
  let view = { x: 0, y: 0, s: 1 }, fitS = 1;

  const P = (i, j, h = 0) => [(i - j) * HW, (i + j) * HH - h * LIFT];

  function drawGround() {
    seaG.innerHTML = ""; groundG.innerHTML = "";
    const b = bounds(world);
    box = { x: b.xmin * HW - HW - 40, y: b.ymin * HH - HH - 160, w: (b.xmax - b.xmin) * HW + 2 * HW + 80, h: (b.ymax - b.ymin) * HH + 2 * HH + WALL + 220 };
    svg.setAttribute("viewBox", `${box.x} ${box.y} ${box.w} ${box.h}`);
    svg.setAttribute("width", box.w); svg.setAttribute("height", box.h);
    // うみの きらきら
    const wv = el("g", { class: "wave" }, seaG);
    for (let k = 0; k < 10; k++) { const x = box.x + 60 + ((k * 397) % (box.w - 120)), y = box.y + box.h * 0.4 + ((k * 211) % (box.h * 0.55)), w = 40 + (k % 3) * 14;
      el("path", { d: `M${x} ${y} q${w / 4} -8 ${w / 2} 0 t${w / 2} 0`, fill: "none", stroke: "#fff", "stroke-width": 3, "stroke-linecap": "round", opacity: .7 }, wv); }
    const list = [...world.tiles.values()].sort((a, b) => (a.i + a.j) - (b.i + b.j) || a.h - b.h);
    const T = (i, j) => world.tiles.get(i + "," + j);
    for (const t of list) {
      const [x, y] = P(t.i, t.j, t.h);
      if (t.t === "bridge") {
        el("polygon", { points: pts([[x, y - HH + 6], [x + HW - 10, y + 2], [x, y + HH - 4], [x - HW + 10, y + 2]]), fill: "#c98a3d", stroke: INK, "stroke-width": 2, "stroke-linejoin": "round" }, groundG);
        el("path", { d: `M${x - 28} ${y - 12}l40 20M${x - 14} ${y - 18}l40 20`, stroke: "#9a6a40", "stroke-width": 2 }, groundG);
        continue;
      }
      // かべ：となりが ひくい／うみ の がわ だけ
      const nR = T(t.i + 1, t.j), nL = T(t.i, t.j + 1);
      const hR = nR && nR.t !== "bridge" ? nR.h : -1, hL = nL && nL.t !== "bridge" ? nL.h : -1;
      const wallR = hR < 0 ? t.h * LIFT + WALL : (t.h - hR) * LIFT, wallL = hL < 0 ? t.h * LIFT + WALL : (t.h - hL) * LIFT;
      if (wallR > 0) el("polygon", { points: pts([[x + HW, y], [x, y + HH], [x, y + HH + wallR], [x + HW, y + wallR]]), fill: hR < 0 ? "#8a5d36" : "#a8774a", stroke: INK, "stroke-width": 2, "stroke-linejoin": "round" }, groundG);
      if (wallL > 0) el("polygon", { points: pts([[x - HW, y], [x, y + HH], [x, y + HH + wallL], [x - HW, y + wallL]]), fill: hL < 0 ? "#a5774b" : "#c29262", stroke: INK, "stroke-width": 2, "stroke-linejoin": "round" }, groundG);
      if (hR < 0 && t.h === 0) el("polygon", { points: pts([[x + HW, y], [x, y + HH], [x, y + HH + 20], [x + HW, y + 20]]), fill: "#a8774a" }, groundG);
      if (hL < 0 && t.h === 0) el("polygon", { points: pts([[x - HW, y], [x, y + HH], [x, y + HH + 20], [x - HW, y + 20]]), fill: "#c29262" }, groundG);
      const pond = t.t === "pond", path = t.t === "path";
      el("polygon", { "data-tile": t.i + "," + t.j, points: pts([[x, y - HH], [x + HW, y], [x, y + HH], [x - HW, y]]),
        fill: pond ? "url(#water)" : path ? "#f3e2bd" : ((t.i + t.j) & 1 ? "url(#grass)" : t.h ? "#b3d987" : "#9fcb74"),
        stroke: pond ? "#4f9cbf" : path ? "#dcc391" : "#7fae58", "stroke-width": 1.2 }, groundG);
      if (pond && (t.i * 3 + t.j) % 2 === 0) el("path", { d: `M${x - 14} ${y + 4} q8 -6 16 0`, fill: "none", stroke: "#fff", "stroke-width": 2.5, "stroke-linecap": "round", class: "wave" }, groundG);
    }
  }

  // ---- たてもの（見本と おなじ かきかた） ----
  function boxAt(g, x, y, h, col) {
    el("polygon", { points: pts([[x - HW, y], [x, y + HH], [x, y + HH - h], [x - HW, y - h]]), fill: shade(col, .93), stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, g);
    el("polygon", { points: pts([[x + HW, y], [x, y + HH], [x, y + HH - h], [x + HW, y - h]]), fill: shade(col, .8), stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, g);
    el("polygon", { points: pts([[x, y - HH - h], [x + HW, y - h], [x, y + HH - h], [x - HW, y - h]]), fill: shade(col, 1.04), stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, g);
  }
  function win(g, x, y, side, u, v, ww, wh, col) {
    const at = (uu, vv) => [x + side * HW * (1 - uu), y + HH * uu - vv];
    el("polygon", { points: pts([at(u, v), at(u + ww, v), at(u + ww, v + wh), at(u, v + wh)]), fill: col, stroke: INK, "stroke-width": 2, "stroke-linejoin": "round" }, g);
  }
  function roof(g, x, y, h, rh, col) {
    const W = HW + 8, H = HH + 4, top = [x, y - h - rh];
    el("polygon", { points: pts([[x - W, y - h], [x, y + H - h], top]), fill: shade(col, .95), stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, g);
    el("polygon", { points: pts([[x + W, y - h], [x, y + H - h], top]), fill: shade(col, .78), stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, g);
  }
  const S = {
    school(g, x, y) { boxAt(g, x, y, 84, "#f5ecdc"); win(g, x, y, -1, .15, 20, .25, 22, "#9fd0f0"); win(g, x, y, -1, .6, 20, .25, 22, "#9fd0f0"); win(g, x, y, 1, .2, 20, .25, 22, "#7fb6d8"); win(g, x, y, 1, .6, 0, .2, 34, "#c98a3d");
      roof(g, x, y, 84, 50, "#e07a6a"); el("circle", { cx: x, cy: y - 120, r: 9, fill: "#fff", stroke: INK, "stroke-width": 2 }, g); el("path", { d: `M${x} ${y - 125}v5l3 2`, stroke: INK, "stroke-width": 2, fill: "none", "stroke-linecap": "round" }, g); },
    library(g, x, y) { boxAt(g, x, y, 62, "#e3edf9"); win(g, x, y, -1, .2, 16, .6, 26, "#fff7d6"); win(g, x, y, 1, .25, 0, .25, 30, "#c98a3d"); roof(g, x, y, 62, 34, "#4b7fd1");
      el("rect", { x: x - 30, y: y - 50, width: 4, height: 14, fill: "#e07a6a" }, g); el("rect", { x: x - 24, y: y - 52, width: 4, height: 16, fill: "#86b85f" }, g); el("rect", { x: x - 18, y: y - 49, width: 4, height: 13, fill: "#f2b544" }, g); },
    play(g, x, y) {
      el("rect", { x: x - 38, y: y - 74, width: 10, height: 74, rx: 3, fill: "#e07a6a", stroke: INK, "stroke-width": 2.5 }, g);
      el("rect", { x: x - 38, y: y - 80, width: 34, height: 10, rx: 3, fill: "#f2b544", stroke: INK, "stroke-width": 2.5 }, g);
      el("path", { d: `M${x - 6} ${y - 72} C ${x + 14} ${y - 50}, ${x + 22} ${y - 10}, ${x + 44} ${y + 4}`, fill: "none", stroke: INK, "stroke-width": 14, "stroke-linecap": "round" }, g);
      el("path", { d: `M${x - 6} ${y - 72} C ${x + 14} ${y - 50}, ${x + 22} ${y - 10}, ${x + 44} ${y + 4}`, fill: "none", stroke: "#f2b544", "stroke-width": 9, "stroke-linecap": "round" }, g); },
    flag(g, x, y) { el("rect", { x: x - 3, y: y - 104, width: 6, height: 104, rx: 3, fill: "#9a6a40", stroke: INK, "stroke-width": 2 }, g);
      const f = el("g", { class: "wave" }, g); el("path", { d: `M${x + 3} ${y - 100} q22 -8 44 0 v30 q-22 -8 -44 0z`, fill: "#fff", stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, f); el("circle", { cx: x + 25, cy: y - 86, r: 8, fill: "#e07a6a" }, f); },
    tree(g, x, y) { el("rect", { x: x - 5, y: y - 32, width: 10, height: 32, rx: 3, fill: "#9a6a40", stroke: INK, "stroke-width": 2.2 }, g);
      el("circle", { cx: x, cy: y - 50, r: 26, fill: "#86b85f", stroke: INK, "stroke-width": 2.5 }, g); el("circle", { cx: x - 9, cy: y - 58, r: 8, fill: "#a9d17e" }, g); },
    flower(g, x, y) { el("ellipse", { cx: x, cy: y, rx: 34, ry: 16, fill: "#b98656", stroke: INK, "stroke-width": 2.2 }, g);
      [["#f5a9c0", -18, -6], ["#f2b544", -4, -10], ["#f5a9c0", 10, -6], ["#fff", 22, -2], ["#f2b544", -24, 2]].forEach(([c, dx, dy]) => el("circle", { cx: x + dx, cy: y + dy, r: 7, fill: c, stroke: INK, "stroke-width": 1.8 }, g)); },
    bench(g, x, y) { el("path", { d: `M${x - 26} ${y - 6} l40 16 M${x - 26} ${y - 6} v14 M${x + 14} ${y + 10} v14`, stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, g);
      el("polygon", { points: pts([[x - 30, y - 12], [x + 18, y + 6], [x + 18, y], [x - 30, y - 18]]), fill: "#c98a3d", stroke: INK, "stroke-width": 2.2 }, g); },
    fountain(g, x, y) { el("ellipse", { cx: x, cy: y, rx: 36, ry: 17, fill: "#cfe9f3", stroke: INK, "stroke-width": 2.5 }, g); el("ellipse", { cx: x, cy: y - 2, rx: 26, ry: 11, fill: "#8fd0e6" }, g);
      const w = el("g", { class: "wave" }, g); el("path", { d: `M${x} ${y - 2} V ${y - 36} M${x} ${y - 36} q-14 4 -18 22 M${x} ${y - 36} q14 4 18 22`, fill: "none", stroke: "#3f7fc4", "stroke-width": 3, "stroke-linecap": "round" }, w); }
  };

  function drawObjects() {
    objG.innerHTML = "";
    const all = [...world.things, ...(deco ? world.slots : []), ...mates].sort((a, b) => (a.i + a.j) - (b.i + b.j) || (a.mate ? 1 : 0) - (b.mate ? 1 : 0));
    for (const t of all) {
      const h = world.hAt(t.i, t.j), [x, y] = P(t.i, t.j, h);
      if (t.slot) { const g = el("g", { class: "tap", tabindex: 0, role: "button", "aria-label": "ここに おく" }, objG); g._ref = t;
        el("polygon", { points: pts([[x, y - HH + 4], [x + HW - 6, y], [x, y + HH - 4], [x - HW + 6, y]]), fill: "#fff", "fill-opacity": .6, stroke: "#e0942a", "stroke-width": 3, "stroke-dasharray": "8 6", class: "slotpulse" }, g);
        el("path", { d: `M${x} ${y - 9}v18M${x - 9} ${y}h18`, stroke: "#e0942a", "stroke-width": 4, "stroke-linecap": "round" }, g); continue; }
      if (t.mate) { const sz = t.sz, g = el("g", { class: "tap", tabindex: 0, role: "button", "aria-label": t.name + "と はなす" }, objG); g._ref = t;
        el("ellipse", { cx: x, cy: y + 2, rx: sz * .26, ry: sz * .07, fill: INK, opacity: .18 }, g);
        const b = el("g", { class: "bob", style: `animation-delay:${t.d}s` }, g);
        t._img = el("image", { href: `img/${t.art}-${t.face || t.st}-v3-256.webp`, x: x - sz / 2, y: y - sz + 8, width: sz, height: sz }, b); t._g = b; continue; }
      const g = el("g", t.tap ? { class: "tap" + (t.fresh ? " pop" : ""), tabindex: 0, role: "button", "aria-label": t.tap } : { class: t.fresh ? "pop" : "" }, objG);
      if (t.tap) { g._ref = t; el("polygon", { class: "hl", points: pts([[x, y - HH], [x + HW, y], [x, y + HH], [x - HW, y]]), fill: "#fff", "fill-opacity": .5, stroke: "#f2b544", "stroke-width": 4 }, g); }
      S[t.k](g, x, y); t.fresh = false;
    }
  }

  // ---- うごかす・つまむ ----
  function apply() { svg.style.transform = `translate(${view.x}px,${view.y}px) scale(${view.s})`; ctx.onView(); }
  function fit() {
    const r = ctx.freeRect(); // vp の なかで あいている ところ
    fitS = Math.min(r.w / box.w, r.h / box.h) * 1.02;
    view.s = fitS; view.x = r.x + (r.w - box.w * fitS) / 2; view.y = r.y + (r.h - box.h * fitS) / 2; apply();
  }
  function zoomAt(f, cx, cy) {
    const s = Math.max(fitS * 0.7, Math.min(fitS * 4, view.s * f)), k = s / view.s;
    view.x = cx - (cx - view.x) * k; view.y = cy - (cy - view.y) * k; view.s = s; apply();
  }
  const ptrs = new Map(); let gest = null, moved = 0, downT = null;
  vp.addEventListener("pointerdown", e => {
    vp.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.size === 1) { moved = 0; downT = e.target; } else moved = 99;
    gest = null; svg.style.willChange = "transform";
  });
  vp.addEventListener("pointermove", e => {
    const p = ptrs.get(e.pointerId); if (!p) return;
    const r = vp.getBoundingClientRect();
    if (ptrs.size === 1) { const dx = e.clientX - p.x, dy = e.clientY - p.y; moved += Math.abs(dx) + Math.abs(dy); if (moved > 8) { view.x += dx; view.y += dy; apply(); } }
    else if (ptrs.size === 2) {
      const [a, b] = [...ptrs.values()], d0 = Math.hypot(a.x - b.x, a.y - b.y);
      p.x = e.clientX; p.y = e.clientY;
      const [c, d] = [...ptrs.values()], d1 = Math.hypot(c.x - d.x, c.y - d.y), mx = (c.x + d.x) / 2 - r.left, my = (c.y + d.y) / 2 - r.top;
      if (gest) { view.x += mx - gest.x; view.y += my - gest.y; } gest = { x: mx, y: my };
      zoomAt(d1 / d0, mx, my); return;
    }
    p.x = e.clientX; p.y = e.clientY;
  });
  const up = e => {
    if (!ptrs.has(e.pointerId)) return; ptrs.delete(e.pointerId);
    if (ptrs.size === 0) { svg.style.willChange = "auto"; if (moved <= 8 && e.type === "pointerup") tapAt(e); }
    gest = null;
  };
  vp.addEventListener("pointerup", up); vp.addEventListener("pointercancel", up);
  vp.addEventListener("wheel", e => { e.preventDefault(); const r = vp.getBoundingClientRect(); zoomAt(Math.exp(-e.deltaY * 0.0015), e.clientX - r.left, e.clientY - r.top); }, { passive: false });
  function tapAt(e) {
    const hit = document.elementFromPoint(e.clientX, e.clientY);
    const g = hit && hit.closest ? hit.closest(".tap") : null;
    if (g && g._ref) return ctx.onTap(g._ref);
    const tile = hit && hit.getAttribute && hit.getAttribute("data-tile");
    if (tile) { const [i, j] = tile.split(",").map(Number); return ctx.onTile(i, j); }
    ctx.onTap(null);
  }
  objG.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { const g = e.target.closest(".tap"); if (g && g._ref) { e.preventDefault(); ctx.onTap(g._ref); } } });

  return {
    kind: "2d",
    setWorld(w, m, keepView) { world = w; mates = m; drawGround(); drawObjects(); if (!keepView) fit(); },
    redrawObjects() { drawObjects(); },
    setDeco(v) { deco = v; drawObjects(); },
    toScreen(i, j, up = 0) { const h = world.hAt(i, j), [x, y] = P(i, j, h); return [view.x + (x - box.x) * view.s, view.y + (y - up - box.y) * view.s]; },
    scale() { return view.s; },
    hop(m) { if (!m._g) return; m._g.classList.remove("hop"); void m._g.getBBox(); m._g.classList.add("hop"); },
    face(m) { if (m._img && m._img.isConnected) m._img.setAttribute("href", `img/${m.art}-${m.face || m.st}-v3-256.webp`); },
    zoom(f) { const r = ctx.freeRect(); zoomAt(f, r.x + r.w / 2, r.y + r.h / 2); },
    home: fit,
    resize: fit,
    stats() { return `SVG ${svg.querySelectorAll("*").length} こ`; },
    destroy() { vp.remove(); }
  };
}
