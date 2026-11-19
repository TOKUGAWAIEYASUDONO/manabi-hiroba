// 3D版：Three.js（ひろばを ひらいた ときだけ よみこむ）。
// かくばった かたち・かげは 色で・うごいて いない ときは かきなおさない・こまかさに 上限
import * as THREE from "./vendor/three-0.160.1.module.min.js";

const INK = 0x3a2f28, TOP = 0.12, LIFT = 0.42, SEA_Y = -0.75;
const MAX_DPR = 1.5;

export function webglOK() {
  try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); } catch { return false; }
}

export function mount(host, ctx) {
  const vp = document.createElement("div"); vp.className = "vp3d"; host.appendChild(vp);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_DPR));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  vp.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, -100, 200);
  scene.add(new THREE.HemisphereLight(0xfff6e6, 0x8a7a66, 1.9));
  const sun = new THREE.DirectionalLight(0xffffff, 1.5); sun.position.set(-3, 8, 5); scene.add(sun);

  // すきとおる ものが キャンバスごと すけない ように（アルファは かさねて 1 に ちかづける）
  const clear = m => Object.assign(m, { blending: THREE.CustomBlending, blendSrc: THREE.SrcAlphaFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneMinusSrcAlphaFactor });
  const lam = c => new THREE.MeshLambertMaterial({ color: c, flatShading: true });
  const mats = {};
  const M = c => (mats[c] ??= lam(c));
  // うみと そらは うしろの CSS（2D版と おなじ）。3Dでは かかない

  let world = null, mates = [], deco = false;
  let root = new THREE.Group(); scene.add(root);
  const pickables = []; // {obj, ref}
  let tileMesh = null, tileList = [];
  const texLoader = new THREE.TextureLoader(), texCache = {};
  const tex = name => { if (!texCache[name]) { const t = texLoader.load(`img/${name}-v3-256.webp`, () => need()); t.colorSpace = THREE.SRGBColorSpace; texCache[name] = t; } return texCache[name]; };

  // ---- かめら ----
  const view = { tx: 0, tz: 0, az: Math.PI / 4, azTo: Math.PI / 4, zoom: 1, fitZoom: 1, el: 0.62 };
  function placeCam() {
    const d = 40;
    cam.position.set(view.tx + Math.sin(view.az) * Math.cos(view.el) * d, Math.sin(view.el) * d, view.tz + Math.cos(view.az) * Math.cos(view.el) * d);
    cam.lookAt(view.tx, 0, view.tz); cam.zoom = view.zoom; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
  }
  function size() {
    const w = vp.clientWidth || 1, h = vp.clientHeight || 1; renderer.setSize(w, h, false);
    renderer.domElement.style.width = w + "px"; renderer.domElement.style.height = h + "px";
    cam.left = -w / 2; cam.right = w / 2; cam.top = h / 2; cam.bottom = -h / 2; // 1 ズーム = 1px
  }

  // ---- たてもの ----
  const edges = (mesh) => { const l = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry, 20), new THREE.LineBasicMaterial({ color: INK })); l.position.copy(mesh.position); l.rotation.copy(mesh.rotation); l.scale.copy(mesh.scale); return l; };
  function boxM(g, w, h, d, c, x = 0, y = 0, z = 0, line = true) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M(c)); m.position.set(x, y + h / 2, z); g.add(m); if (line) g.add(edges(m)); return m; }
  function roofM(g, w, d, h, y, c) {
    const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(0, h); s.lineTo(-w / 2, 0);
    const geo = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false }); geo.translate(0, 0, -d / 2);
    const m = new THREE.Mesh(geo, M(c)); m.position.y = y; m.rotation.y = Math.PI / 4; g.add(m); g.add(edges(m)); return m;
  }
  const B = {
    school(g) { boxM(g, .82, .95, .82, 0xf5ecdc); roofM(g, 1.02, 1.02, .55, .95, 0xe07a6a);
      for (const [x, z] of [[.42, -.18], [.42, .18], [-.18, .42], [.18, .42]]) boxM(g, x === .42 ? .02 : .2, .22, x === .42 ? .2 : .02, 0x9fd0f0, x === .42 ? .42 : x, .45, x === .42 ? z : .42, false);
      const c = new THREE.Mesh(new THREE.CylinderGeometry(.11, .11, .03, 10), M(0xffffff)); c.rotation.set(Math.PI / 2, 0, -Math.PI / 4); c.position.set(.25, 1.25, .25); g.add(c); },
    library(g) { boxM(g, .82, .7, .82, 0xe3edf9); roofM(g, 1.02, 1.02, .38, .7, 0x4b7fd1); boxM(g, .02, .26, .5, 0xfff7d6, .42, .25, 0, false);
      [0xe07a6a, 0x86b85f, 0xf2b544].forEach((c, k) => boxM(g, .05, .18, .06, c, .44, .28, -.14 + k * .12, false)); },
    play(g) { boxM(g, .12, .85, .12, 0xe07a6a, -.25, 0, -.25); boxM(g, .4, .08, .3, 0xf2b544, -.12, .85, -.25);
      const s = boxM(g, .2, .05, 1.1, 0xf2b544, 0, 0, 0); s.position.set(.05, .45, .12); s.rotation.x = .9; s.rotation.y = 0; g.children.at(-1).position.copy(s.position); g.children.at(-1).rotation.copy(s.rotation); },
    flag(g) { boxM(g, .06, 1.25, .06, 0x9a6a40, 0, 0, 0); const f = new THREE.Group(); boxM(f, .03, .34, .52, 0xffffff, 0, 0, .27);
      const dot = new THREE.Mesh(new THREE.CylinderGeometry(.09, .09, .04, 12), M(0xe07a6a)); dot.rotation.z = Math.PI / 2; dot.position.set(0, .17, .27); f.add(dot);
      f.position.y = .88; g.add(f); g.userData.wave = f; },
    tree(g) { boxM(g, .12, .4, .12, 0x9a6a40, 0, 0, 0, false); const c = new THREE.Mesh(new THREE.IcosahedronGeometry(.34, 0), M(0x86b85f)); c.position.y = .66; g.add(c); g.add(edges(c)); },
    flower(g) { boxM(g, .7, .1, .4, 0xb98656); [[0xf5a9c0, -.2], [0xf2b544, 0], [0xf5a9c0, .2]].forEach(([c, x]) => { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(.09, 0), M(c)); m.position.set(x, .18, 0); m.rotation.y = 0; g.add(m); }); g.rotation.y = Math.PI / 4; },
    bench(g) { boxM(g, .6, .06, .2, 0xc98a3d, 0, .22, 0); boxM(g, .05, .22, .05, INK, -.24, 0, 0, false); boxM(g, .05, .22, .05, INK, .24, 0, 0, false); g.rotation.y = -Math.PI / 4; },
    fountain(g) { const b = new THREE.Mesh(new THREE.CylinderGeometry(.42, .46, .14, 10), M(0xcfe9f3)); b.position.y = .07; g.add(b); g.add(edges(b));
      const w = new THREE.Mesh(new THREE.CylinderGeometry(.34, .34, .02, 10), M(0x8fd0e6)); w.position.y = .15; g.add(w); boxM(g, .06, .5, .06, 0x3f7fc4, 0, .1, 0, false); }
  };

  // ---- まなびっこ（たてかんばん） ----
  function mateSprite(m) {
    const mat = clear(new THREE.SpriteMaterial({ map: tex(`${m.art}-${m.face || m.st}`), transparent: true, alphaTest: .05 }));
    const sp = new THREE.Sprite(mat); sp.center.set(.5, .04);
    const s = m.sz / 79 * 0.85; sp.scale.set(s, s, 1); sp.userData.base = s;
    const g = new THREE.Group(); g.add(sp);
    const sh = new THREE.Mesh(new THREE.CircleGeometry(.26 * m.sz / 128, 16), clear(new THREE.MeshBasicMaterial({ color: INK, transparent: true, opacity: .18, depthWrite: false })));
    sh.rotation.x = -Math.PI / 2; sh.position.y = .01; sh.scale.y = .45; g.add(sh);
    g.userData = { sp, m }; return g;
  }

  // ---- しまを くみたてる ----
  function build() {
    scene.remove(root); root.traverse(o => { if (o.geometry) o.geometry.dispose(); }); root = new THREE.Group(); scene.add(root);
    pickables.length = 0;
    tileList = [...world.tiles.values()];
    const land = tileList.filter(t => t.t !== "bridge");
    const box = new THREE.BoxGeometry(1, 1, 1);
    // つちの はしら（がけ）
    const soil = new THREE.InstancedMesh(box, M(0xa8774a), land.length);
    const top = new THREE.InstancedMesh(box, new THREE.MeshLambertMaterial({ flatShading: true }), tileList.length);
    const m4 = new THREE.Matrix4(), col = new THREE.Color();
    land.forEach((t, k) => { const y1 = t.h * LIFT + (t.t === "pond" ? -.1 : 0) - TOP, y0 = SEA_Y - .05;
      m4.makeScale(1, y1 - y0, 1).setPosition(t.i, (y0 + y1) / 2, t.j); soil.setMatrixAt(k, m4); });
    tileList.forEach((t, k) => {
      const bridge = t.t === "bridge", y = bridge ? -.05 : t.h * LIFT + (t.t === "pond" ? -.1 : 0) - TOP / 2;
      m4.makeScale(bridge ? .8 : 1, bridge ? .1 : TOP, bridge ? .8 : 1).setPosition(t.i, y, t.j); top.setMatrixAt(k, m4);
      col.set(t.t === "pond" ? 0x6fc0dc : t.t === "path" ? 0xf3e2bd : bridge ? 0xc98a3d : t.h ? ((t.i + t.j) & 1 ? 0xb8dc8e : 0xaad480) : ((t.i + t.j) & 1 ? 0xa3cf78 : 0x92c46a));
      top.setColorAt(k, col);
    });
    root.add(soil, top); tileMesh = top;
    // ふちの せん（しまの まわり）は つちの いろで にじませる かわりに、がけに こい いろの おび
    const band = new THREE.InstancedMesh(box, M(0x8a5d36), land.length);
    land.forEach((t, k) => { m4.makeScale(1.002, .34, 1.002).setPosition(t.i, SEA_Y + .12, t.j); band.setMatrixAt(k, m4); }); root.add(band);
    // もの
    for (const t of world.things) {
      const g = new THREE.Group(); B[t.k](g); g.position.set(t.i, world.hAt(t.i, t.j) * LIFT, t.j);
      if (t.fresh) { g.userData.pop = performance.now(); t.fresh = false; }
      root.add(g); if (t.tap) pickables.push({ obj: g, ref: t });
    }
    buildSlots(); buildMates();
  }
  let slotG = null, mateG = null;
  function buildSlots() {
    if (slotG) root.remove(slotG); slotG = new THREE.Group(); root.add(slotG);
    if (!deco) return;
    for (const s of world.slots) {
      const ring = new THREE.Mesh(new THREE.RingGeometry(.3, .46, 4, 1), clear(new THREE.MeshBasicMaterial({ color: 0xe0942a, transparent: true, opacity: .9 })));
      ring.rotation.x = -Math.PI / 2; ring.rotation.z = Math.PI / 4; ring.position.set(s.i, world.hAt(s.i, s.j) * LIFT + .02, s.j);
      const plus = new THREE.Group(); boxM(plus, .36, .04, .08, 0xe0942a, 0, 0, 0, false); boxM(plus, .08, .04, .36, 0xe0942a, 0, 0, 0, false); plus.position.copy(ring.position);
      slotG.add(ring, plus); pickables.push({ obj: ring, ref: s }); ring.userData.pulse = true;
    }
  }
  function buildMates() {
    if (mateG) root.remove(mateG); mateG = new THREE.Group(); root.add(mateG);
    for (const m of mates) { const g = mateSprite(m); g.position.set(m.i, world.hAt(m.i, m.j) * LIFT, m.j); m._3d = g; mateG.add(g); pickables.push({ obj: g.userData.sp, ref: m }); }
  }

  // ---- かきなおしの きまり ----
  let dirty = true, alive = true, anims = 0, lastIdle = 0, renders = 0, renderMs = 0;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  const need = () => { dirty = true; };
  const hops = new Map(); // m -> t0
  const walks = new Map(); // m -> {from,to,t0}
  function frame(now) {
    if (!alive) return; requestAnimationFrame(frame);
    let active = false;
    // まわす
    if (Math.abs(view.azTo - view.az) > 1e-3) { view.az += (view.azTo - view.az) * .18; active = true; } else view.az = view.azTo;
    for (const [m, t0] of hops) { const k = (now - t0) / 550; const sp = m._3d && m._3d.userData.sp; if (!sp) { hops.delete(m); continue; }
      if (k >= 1) { sp.position.y = 0; hops.delete(m); } else sp.position.y = Math.sin(Math.PI * k) * .45; active = true; }
    for (const [m, w] of walks) { const k = Math.min(1, (now - w.t0) / 600); if (m._3d) m._3d.position.set(w.a[0] + (w.b[0] - w.a[0]) * k, w.a[1] + (w.b[1] - w.a[1]) * k, w.a[2] + (w.b[2] - w.a[2]) * k); if (k >= 1) walks.delete(m); active = true; }
    root.traverse(o => { if (o.userData.pop) { const k = Math.min(1, (now - o.userData.pop) / 450); const s = k < 1 ? .2 + .8 * (1 + Math.sin(k * Math.PI) * .25) * k : 1; o.scale.setScalar(s); if (k >= 1) delete o.userData.pop; active = true; } });
    // ゆっくりの うごき（いき・はた・＋）は 1びょう 20かい だけ
    const idleOK = !reduce.matches && !document.hidden && now - lastIdle > 50;
    if (idleOK) {
      lastIdle = now;
      for (const m of mates) { const sp = m._3d && m._3d.userData.sp; if (!sp) continue; const b = sp.userData.base, k = Math.sin(now / 382 + m.d * 2.6);
        sp.scale.set(b * (1 - k * .012), b * (1 + k * .02), 1); }
      root.traverse(o => { if (o.userData.wave) o.userData.wave.rotation.y = Math.sin(now / 600) * .25; if (o.userData.pulse) o.material.opacity = .55 + .45 * (0.5 + 0.5 * Math.sin(now / 255)); });
      dirty = true;
    }
    if (active) { dirty = true; anims++; }
    if (dirty) { const t0 = performance.now(); placeCam(); renderer.render(scene, cam); renderMs += performance.now() - t0; renders++; dirty = false; if (active || anims) ctx.onView(); anims = 0; }
  }

  // ---- うごかす・つまむ・タップ ----
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const ptrs = new Map(); let moved = 0, pinch = null;
  const el = renderer.domElement; el.style.touchAction = "none";
  function panBy(dx, dy) {
    // がめんの うごきを じめんの うごきに
    const s = 1 / view.zoom, ca = Math.cos(view.az), sa = Math.sin(view.az), sy = 1 / Math.sin(view.el);
    view.tx += -dx * s * ca - dy * s * sy * sa;
    view.tz += dx * s * sa - dy * s * sy * ca;
    need(); ctx.onView();
  }
  el.addEventListener("pointerdown", e => { el.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (ptrs.size === 1) moved = 0; else moved = 99; pinch = null; });
  el.addEventListener("pointermove", e => {
    const p = ptrs.get(e.pointerId); if (!p) return;
    if (ptrs.size === 1) { const dx = e.clientX - p.x, dy = e.clientY - p.y; moved += Math.abs(dx) + Math.abs(dy); if (moved > 8) panBy(dx, dy); }
    else if (ptrs.size === 2) { const [a, b] = [...ptrs.values()], d0 = Math.hypot(a.x - b.x, a.y - b.y); p.x = e.clientX; p.y = e.clientY; const [c, d] = [...ptrs.values()];
      const mx = (c.x + d.x) / 2, my = (c.y + d.y) / 2; if (pinch) panBy(mx - pinch.x, my - pinch.y); pinch = { x: mx, y: my };
      zoomBy(Math.hypot(c.x - d.x, c.y - d.y) / d0); return; }
    p.x = e.clientX; p.y = e.clientY;
  });
  const up = e => { if (!ptrs.has(e.pointerId)) return; ptrs.delete(e.pointerId); if (!ptrs.size && moved <= 8 && e.type === "pointerup") tapAt(e); pinch = null; };
  el.addEventListener("pointerup", up); el.addEventListener("pointercancel", up);
  el.addEventListener("wheel", e => { e.preventDefault(); zoomBy(Math.exp(-e.deltaY * 0.0015)); }, { passive: false });
  function zoomBy(f) { view.zoom = Math.max(view.fitZoom * .7, Math.min(view.fitZoom * 4, view.zoom * f)); need(); ctx.onView(); }
  function tapAt(e) {
    const r = el.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    placeCam(); ray.setFromCamera(ndc, cam);
    const objs = pickables.map(p => p.obj); const hits = ray.intersectObjects(objs, true);
    if (hits.length) { let o = hits[0].object; while (o && !objs.includes(o)) o = o.parent; const p = pickables.find(p => p.obj === o); if (p) return ctx.onTap(p.ref); }
    const th = ray.intersectObject(tileMesh, false);
    if (th.length) { const t = tileList[th[0].instanceId]; if (t) return ctx.onTile(t.i, t.j); }
    ctx.onTap(null);
  }

  function fit() {
    size();
    const r = ctx.freeRect(), w = vp.clientWidth, h = vp.clientHeight;
    let a = Infinity, b = -Infinity, c = Infinity, d = -Infinity, cx = 0, cz = 0, n = 0;
    for (const t of world.tiles.values()) { cx += t.i; cz += t.j; n++; }
    view.az = view.azTo = view.azTo; // そのまま
    // まずは かめらを まんなかに、がめんでの ひろがりを はかる
    view.tx = cx / n; view.tz = cz / n; view.zoom = 1; placeCam();
    const v = new THREE.Vector3();
    for (const t of world.tiles.values()) for (const y of [SEA_Y, 1.4]) { v.set(t.i, y, t.j).project(cam); const x = v.x * w / 2, yy = v.y * h / 2; a = Math.min(a, x); b = Math.max(b, x); c = Math.min(c, yy); d = Math.max(d, yy); }
    const z = Math.min(r.w * .95 / (b - a), r.h * .92 / (d - c));
    view.zoom = view.fitZoom = z;
    // あいている ところの まんなかに よせる
    const offX = (r.x + r.w / 2) - w / 2, offY = (r.y + r.h / 2) - h / 2, midX = (a + b) / 2 * z, midY = -(c + d) / 2 * z;
    panBy(offX - midX, offY - midY);
    need();
  }

  const ro = new ResizeObserver(() => { size(); need(); }); ro.observe(vp);
  size();
  requestAnimationFrame(frame);

  return {
    kind: "3d",
    setWorld(w, m, keepView) { world = w; mates = m; build(); if (!keepView) fit(); need(); },
    redrawObjects() { // まなびっこが あるいた
      for (const m of mates) { if (!m._3d) continue; const p = m._3d.position, to = [m.i, world.hAt(m.i, m.j) * LIFT, m.j];
        if (p.x !== to[0] || p.z !== to[2]) walks.set(m, { a: [p.x, p.y, p.z], b: to, t0: performance.now() }); }
    },
    setDeco(v) { deco = v; pickables.splice(0, pickables.length, ...pickables.filter(p => !p.ref.slot)); buildSlots(); need(); },
    toScreen(i, j, up = 0) { const v = new THREE.Vector3(i, world.hAt(i, j) * LIFT, j); placeCam(); v.project(cam);
      return [(v.x + 1) / 2 * vp.clientWidth, (1 - v.y) / 2 * vp.clientHeight - up * this.scale()]; },
    scale() { return view.zoom / 79; },
    hop(m) { hops.set(m, performance.now()); },
    face(m) { const sp = m._3d && m._3d.userData.sp; if (sp) { sp.material.map = tex(`${m.art}-${m.face || m.st}`); sp.material.needsUpdate = true; need(); } },
    zoom: zoomBy,
    rotate(dir) { view.azTo += dir * Math.PI / 2; need(); },
    home: fit,
    resize() { size(); need(); },
    stats() { const s = `えがいた ${renders}かい/びょう・1かい ${(renders ? renderMs / renders : 0).toFixed(1)}ms・drawcall ${renderer.info.render.calls}`; renders = 0; renderMs = 0; return s; },
    destroy() { alive = false; ro.disconnect(); renderer.dispose(); vp.remove(); }
  };
}
