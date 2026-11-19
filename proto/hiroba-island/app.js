// まわりの 枠（上・左・右・下）と、2D/3D の しまの きりかえ。枠は 2つで おなじ
import { buildWorld, walkable, level, ISLANDS, BRIDGE_AT } from "./world.js";

const $ = id => document.getElementById(id);
const app = $("app"), stage = $("stage"), labelsEl = $("labels");
const store = { get(k) { try { return localStorage.getItem(k); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch {} } };

// ---- じょうたい ----
let total = 18, edits = {}, placed = [], acorn = 128, today = 14;
let world = null, island = null, kind = null, deco = false, pick = null;
const mates = [
  { mate: true, name: "さんかくる", art: "math", st: "grown", i: 1, j: 2, sz: 190, d: 0, lines: ["きょうも いっしょに がんばろう！", "はしを わたって あそびに いこう！", "たんけんに いきたいな〜"] },
  { mate: true, name: "ことはね", art: "japanese", st: "base", i: 2, j: 0, sz: 128, d: -.8, lines: ["こくごじまの としょかんに いこう", "あたらしい かんじ、おぼえたよ"] },
  { mate: true, name: "ちずぽん", art: "social", st: "base", i: -2, j: 1, sz: 128, d: -1.5, lines: ["しまの ちずを かいたよ！", "しまが ひろく なってきたね！"] }
];

const INFO = {
  school: { t: "がっこう", c: "#c25a4a", key: "total", p: "どの きょうかでも「できた」が ふえると、ひろばの しまが ひろがるよ。" },
  library: { t: "こくご としょかん", c: "#3b6fc0", key: "japanese", p: "こくごの たんげんを「できた」に すると、こくごじまが ひろがって ほんだなが ふえるよ。" },
  play: { t: "さんすう あそびば", c: "#b8551f", key: "math", p: "さんすうの「できた」で、さんすうじまが ひろがるよ。すべりだい → ブランコ → ジャングルジム。" },
  flag: { t: "えいご はたの ポール", c: "#6d47b8", key: "english", p: "えいごを「できた」に すると、えいごじまが ひろがって せかいの はたが ふえるよ。" }
};

function rebuild(keepView) {
  world = buildWorld(total, edits, placed);
  // まなびっこが たてない ばしょに なったら ちかくへ
  for (const m of mates) {
    const others = mates.filter(x => x !== m);
    if (walkable(world, others, m.i, m.j)) continue;
    let best = null;
    for (const t of world.tiles.values()) if (walkable(world, others, t.i, t.j)) { const d = Math.hypot(t.i, t.j - 1); if (!best || d < best.d) best = { t, d }; }
    if (best) { m.i = best.t.i; m.j = best.t.j; }
  }
  island.setWorld(world, mates, keepView);
  const lv = 1 + Math.floor(total / 6);
  $("plateTxt").textContent = `ひろば Lv ${lv} ・ できた ${total}`;
  $("plateXp").style.width = ((total % 6) / 6 * 100) + "%";
  $("doneN").textContent = total;
  updateLabels();
}

// ---- しまの なまえ ----
let labRaf = 0;
function updateLabels() {
  cancelAnimationFrame(labRaf);
  labRaf = requestAnimationFrame(() => {
    if (!world) return;
    labelsEl.innerHTML = "";
    for (const isl of ISLANDS) {
      let front = null; // いちばん てまえの マス
      for (const t of world.tiles.values()) if (t.isl === isl.id && (!front || t.i + t.j > front.i + front.j)) front = t;
      if (!front) continue;
      const [x, y] = island.toScreen(front.i, front.j, -(28 + 46));
      const d = isl.subj ? world.d[isl.subj] : total, L = level(d);
      const div = document.createElement("div"); div.className = "ilabel" + (isl.subj && !isl.bridge ? " lock" : "");
      div.innerHTML = isl.subj ? (isl.bridge ? `${isl.name}<small>Lv ${L.lv}</small>` : `${isl.name}<small>はしまで できた あと ${BRIDGE_AT - d}</small>`) : `${isl.name}`;
      div.style.left = x + "px"; div.style.top = y + "px";
      labelsEl.appendChild(div);
    }
  });
}

// ---- しまの ばしょ ----
function freeRect() {
  const cs = getComputedStyle(stage), w = stage.clientWidth, h = stage.clientHeight;
  const pl = parseFloat(cs.paddingLeft), pr = parseFloat(cs.paddingRight), pt = parseFloat(cs.paddingTop), pb = parseFloat(cs.paddingBottom);
  return { x: pl, y: pt, w: Math.max(100, w - pl - pr), h: Math.max(100, h - pt - pb) };
}
const ctx = {
  freeRect, appRect: () => app.getBoundingClientRect(),
  onView() { updateLabels(); if (cardEl || bubbleEl) { closeCard(); closeBubble(); } },
  onTap(ref) {
    if (!ref) return closeCard();
    if (ref.mate) return talk(ref);
    if (ref.slot) return place(ref);
    if (ref.tap) return card(ref);
  },
  onTile(i, j) {
    if (deco && pick && pick.paint) return paint(i, j);
    closeCard();
  }
};
// しまの 中での いち → app の 中での いち
function at(i, j, up) {
  const [x, y] = island.toScreen(i, j, up);
  const sr = stage.getBoundingClientRect(), ar = app.getBoundingClientRect();
  return [x + sr.left - ar.left, y + sr.top - ar.top];
}

// ---- 2D/3D を よみこむ ----
const fmt = ms => ms < 1000 ? Math.round(ms) + "ms" : (ms / 1000).toFixed(2) + "びょう";
let firstLoad = true;
async function use(v) {
  closeCard(); closeBubble();
  if (island) { island.destroy(); island = null; for (const m of mates) { m._3d = null; m._g = null; m._img = null; } }
  document.querySelectorAll(".lab .seg button").forEach(b => b.setAttribute("aria-pressed", b.dataset.v === v ? "true" : "false"));
  $("load").textContent = "よみこみちゅう…"; $("labNote").textContent = "";
  const t0 = performance.now();
  let mod;
  if (v === "3d") {
    mod = await import("./island3d.js");
    if (!mod.webglOK()) { toast("この たんまつでは 3D が つかえないので 2D に したよ"); $("labNote").textContent = "WebGL なし → 2D"; return use("2d"); }
  } else mod = await import("./island2d.js");
  const t1 = performance.now();
  kind = v; island = mod.mount(stage, ctx);
  $("rotL").hidden = $("rotR").hidden = v !== "3d";
  rebuild(false); island.setDeco(deco);
  // つぎの えが でるまで まつ
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  const t2 = performance.now();
  let s = `よみこみ ${fmt(t2 - t0)}（コード ${fmt(t1 - t0)}・くみたて ${fmt(t2 - t1)}）`;
  if (firstLoad) s += ` ／ ページ ぜんぶ ${fmt(t2)}`;
  if (v === "3d") { const e = performance.getEntriesByType("resource").find(e => e.name.includes("three-")); if (e) s += ` ／ three.js ${e.transferSize ? Math.round(e.transferSize / 1024) + "KB" : "キャッシュ"} ${fmt(e.duration)}`; }
  $("load").textContent = s;
  window.__perf.load = { v, total: t2 - t0, code: t1 - t0, build: t2 - t1, page: firstLoad ? t2 : null };
  firstLoad = false; minFps = Infinity; minStart = performance.now() + 1500;
  store.set("hiroba-v", v);
}

// ---- なめらかさ（fps）----
window.__perf = { fps: 0, min: 0, load: null };
let frames = 0, lastT = performance.now(), minFps = Infinity, minStart = Infinity, worst = 0, prevF = performance.now(), labOn = true;
function meter(now) {
  if (!labOn) return;
  frames++; worst = Math.max(worst, now - prevF); prevF = now;
  if (now - lastT >= 1000) {
    const fps = frames * 1000 / (now - lastT); frames = 0; lastT = now;
    if (now > minStart) minFps = Math.min(minFps, fps);
    const f = $("fps"); f.textContent = Math.round(fps); f.className = "fps " + (fps >= 50 ? "ok" : fps >= 30 ? "mid" : "bad");
    $("fpsMin").textContent = `さいてい ${isFinite(minFps) ? Math.round(minFps) : "--"} ・ いちばん ながい コマ ${Math.round(worst)}ms`;
    worst = 0;
    $("extra").textContent = island ? island.stats() : "";
    Object.assign(window.__perf, { fps, min: minFps });
  }
  requestAnimationFrame(meter);
}
requestAnimationFrame(meter);

// ---- ためし用の ボタン ----
document.querySelectorAll(".lab .seg button").forEach(b => b.onclick = () => { if (b.dataset.v !== kind) use(b.dataset.v); });
document.querySelectorAll(".lab [data-d],.lab [data-set]").forEach(b => b.onclick = () => {
  const before = world ? world.d : null;
  total = Math.max(0, Math.min(150, b.dataset.set != null ? +b.dataset.set : total + +b.dataset.d));
  rebuild(false);
  if (before) for (const isl of ISLANDS.slice(1)) if (before[isl.subj] < BRIDGE_AT && world.d[isl.subj] >= BRIDGE_AT) { toast(`${isl.name}に はしが かかったよ！`); break; }
});
$("zIn").onclick = () => island.zoom(1.35);
$("zOut").onclick = () => island.zoom(1 / 1.35);
$("zHome").onclick = () => island.home();
$("rotL").onclick = () => island.rotate && island.rotate(-1);
$("rotR").onclick = () => island.rotate && island.rotate(1);

// ---- まなびっこ：あるく ----
setInterval(() => {
  if (!island || matchMedia("(prefers-reduced-motion: reduce)").matches || document.hidden) return;
  const m = mates[1 + Math.floor(Math.random() * 2)], d = [[1, 0], [-1, 0], [0, 1], [0, -1]][Math.floor(Math.random() * 4)];
  if (walkable(world, mates.filter(x => x !== m), m.i + d[0], m.j + d[1])) { m.i += d[0]; m.j += d[1]; island.redrawObjects(); }
}, 2600);

// ---- ふきだし ----
let bubbleEl = null, bubbleT = 0;
function closeBubble() { clearTimeout(bubbleT); if (bubbleEl) bubbleEl.remove(); bubbleEl = null; }
function talk(m) {
  closeBubble(); closeCard();
  m.k = ((m.k ?? -1) + 1) % m.lines.length;
  const [x, top] = at(m.i, m.j, m.sz + 10);
  bubbleEl = document.createElement("div"); bubbleEl.className = "bubble"; bubbleEl.textContent = m.lines[m.k]; app.appendChild(bubbleEl);
  bubbleEl.style.left = Math.max(8, x - bubbleEl.offsetWidth / 2) + "px"; bubbleEl.style.top = Math.max(70, top - bubbleEl.offsetHeight) + "px";
  m.face = "joy"; island.face(m); island.hop(m);
  setTimeout(() => { m.face = null; island && island.face(m); }, 1400);
  hearts(x, top + 10);
  bubbleT = setTimeout(closeBubble, 2600);
}
function hearts(x, y) { for (let n = 0; n < 7; n++) { const s = document.createElement("span"); s.className = "spark"; s.style.left = x + "px"; s.style.top = y + "px";
  s.style.background = ["#f5a9c0", "#f2b544", "#fff"][n % 3]; s.style.setProperty("--dx", (Math.cos(n) * 60) + "px"); s.style.setProperty("--dy", (-30 - Math.random() * 50) + "px"); app.appendChild(s); setTimeout(() => s.remove(), 900); } }

// ---- たてものの カード ----
let cardEl = null;
function closeCard() { if (cardEl) { cardEl.remove(); cardEl = null; } }
function card(t) {
  closeCard(); closeBubble();
  const f = INFO[t.tap], d = f.key === "total" ? total : world.d[f.key], L = level(d), [x, y] = at(t.i, t.j, 0);
  cardEl = document.createElement("div"); cardEl.className = "pop-card"; cardEl.setAttribute("role", "dialog"); cardEl.setAttribute("aria-label", f.t);
  cardEl.innerHTML = `<h3>${f.t} <span class="lv" style="background:${f.c}">Lv ${L.lv}</span></h3><p>${f.p}</p><div class="xp"><i style="width:${L.pct}%;background:${f.c}"></i></div><div class="cap" style="margin-top:4px"><span>つぎの Lv まで できた あと ${L.rest}</span></div><div class="row"><button type="button" class="sub" id="cc">とじる</button><button type="button" id="cg">れんしゅうする</button></div>`;
  app.appendChild(cardEl);
  const w = cardEl.offsetWidth, h = cardEl.offsetHeight, aw = app.clientWidth;
  cardEl.style.left = Math.max(12, Math.min(aw - w - 12, x - w / 2)) + "px"; cardEl.style.top = Math.max(80, y - h - 110) + "px";
  cardEl.querySelector("#cc").onclick = closeCard; cardEl.querySelector("#cg").onclick = () => { closeCard(); toast("れんしゅうの がめんへ（見本では ここまで）"); };
  cardEl.querySelector("#cg").focus();
}
document.addEventListener("keydown", e => { if (e.key === "Escape") { closeCard(); setDeco(false); } });

// ---- どんぐり ----
const acEl = $("acorn"), pill = $("acornPill");
function setAcorn(v) { const from = acorn, to = v, t0 = performance.now(); acorn = v;
  const step = now => { const k = Math.min(1, (now - t0) / 500); acEl.textContent = Math.round(from + (to - from) * k); if (k < 1) requestAnimationFrame(step); }; requestAnimationFrame(step);
  setTimeout(() => { if (acorn === to) acEl.textContent = to; }, 650);
  pill.classList.remove("bump"); void pill.offsetWidth; pill.classList.add("bump"); }
function flyAcorns(fromEl, n, done) {
  const a = fromEl.getBoundingClientRect(), b = pill.getBoundingClientRect();
  for (let k = 0; k < n; k++) { const f = document.createElementNS("http://www.w3.org/2000/svg", "svg"); f.setAttribute("viewBox", "0 0 40 40"); f.setAttribute("class", "fly");
    f.innerHTML = `<ellipse cx="20" cy="25" rx="11" ry="12" fill="#c98a3d" stroke="#3a2f28" stroke-width="2.5"/><path d="M7 18 q13 -14 26 0 q-13 -4 -26 0z" fill="#7a4a1e" stroke="#3a2f28" stroke-width="2.5"/>`;
    f.style.left = (a.left + a.width / 2 - 15 + (k - n / 2) * 18) + "px"; f.style.top = (a.top + 4) + "px"; document.body.appendChild(f);
    setTimeout(() => { f.style.transform = `translate(${b.left + 20 - a.left - a.width / 2 - (k - n / 2) * 18}px,${b.top + 8 - a.top}px) scale(.8)`; f.style.opacity = "0"; }, 30 + k * 110);
    setTimeout(() => f.remove(), 1100 + k * 110); }
  setTimeout(done, 800 + n * 110);
}
const claim = $("claim");
claim.onclick = () => {
  const q3 = $("q3");
  q3.classList.remove("now"); q3.classList.add("done"); q3.querySelector(".ck").innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12l5 5 9-10" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const bar = q3.querySelector(".bar"); if (bar) bar.remove();
  $("qn").textContent = "3 / 3"; claim.disabled = true; claim.textContent = "きょうは ぜんぶ できた！";
  flyAcorns(claim, 2, () => { setAcorn(acorn + 2); today += 2; $("capn").textContent = today + " / 20"; toast("どんぐり +2 ・ あしたも まってるね"); });
};

// ---- もようがえ：＋ に おく・マスを ぬる ----
const drawer = $("drawer"), decoBtn = $("goDeco");
function setDeco(v) { deco = v; drawer.hidden = !v; decoBtn.setAttribute("aria-pressed", v ? "true" : "false");
  if (!v) { pick = null; drawer.querySelectorAll(".item").forEach(b => b.setAttribute("aria-pressed", "false")); }
  closeCard(); island && island.setDeco(v); }
decoBtn.onclick = () => setDeco(!deco);
drawer.querySelectorAll("button.item").forEach(b => b.onclick = () => {
  pick = b.dataset.paint ? { paint: b.dataset.paint, p: +b.dataset.p } : { k: b.dataset.k, p: +b.dataset.p };
  drawer.querySelectorAll("button.item").forEach(x => x.setAttribute("aria-pressed", x === b ? "true" : "false"));
  toast(pick.paint ? "ぬりたい マスを タップしてね" : "しまの ＋ を タップして おこう");
});
function place(slot) {
  if (!pick || pick.paint) return toast("さきに おく ものを えらんでね");
  if (acorn < pick.p) return toast("どんぐりが たりないよ");
  placed.push({ k: pick.k, i: slot.i, j: slot.j, fresh: true });
  setAcorn(acorn - pick.p); const [x, y] = at(slot.i, slot.j, 20); hearts(x, y);
  rebuild(true); island.setDeco(deco);
  if (!world.slots.length) setDeco(false);
}
function paint(i, j) {
  const t = world.tiles.get(i + "," + j);
  if (!t || t.t === "bridge" || world.things.some(x => x.i === i && x.j === j) || world.slots.some(x => x.i === i && x.j === j)) return toast("そこは ぬれないよ");
  if (pick.paint === "pond" && mates.some(m => m.i === i && m.j === j)) return toast("まなびっこが いるよ");
  if (t.t === pick.paint) return;
  if (acorn < pick.p) return toast("どんぐりが たりないよ");
  edits[i + "," + j] = pick.paint; if (pick.p) setAcorn(acorn - pick.p);
  rebuild(true); island.setDeco(deco);
}

// ---- そのほか ----
let toastEl = null, toastT = 0;
function toast(msg) { clearTimeout(toastT); if (toastEl) toastEl.remove(); toastEl = document.createElement("div"); toastEl.className = "toast"; toastEl.setAttribute("role", "status"); toastEl.textContent = msg; app.appendChild(toastEl); toastT = setTimeout(() => { toastEl && toastEl.remove(); toastEl = null; }, 2200); }
$("goEx").onclick = () => toast("たんけんへ しゅっぱつ！（見本では ここまで）");
document.querySelectorAll(".acts .gbtn:not(#goEx):not(#goDeco)").forEach(b => b.onclick = () => toast("見本では ここまで"));
document.querySelectorAll(".nav a").forEach(a => a.onclick = e => { e.preventDefault(); if (a.getAttribute("aria-current")) return; toast(a.textContent.trim() + "の がめんは つぎの 見本で"); });
let rz = 0; window.addEventListener("resize", () => { closeCard(); closeBubble(); clearTimeout(rz); rz = setTimeout(() => { island && island.resize(); updateLabels(); }, 150); });

// ---- はじめ ----
const q = new URLSearchParams(location.search);
const startV = q.get("v") || store.get("hiroba-v") || "2d";
if (q.get("done")) total = Math.max(0, Math.min(150, +q.get("done") || 0));
await use(startV === "3d" ? "3d" : "2d");
setTimeout(() => talk(mates[0]), 900); // ひらいた とき：パートナーが あいさつ
// ためし（Playwright）用
window.__hiroba = { get world() { return world; }, mates, at: (i, j, up) => { const [x, y] = at(i, j, up); const r = app.getBoundingClientRect(); return [x + r.left, y + r.top]; } };
