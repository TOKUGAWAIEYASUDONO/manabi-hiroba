// しまの データ（2D版・3D版で おなじものを つかう）
// マスは (i, j)。i が ふえると 画面の みぎした、j が ふえると ひだりした。

export const HUB = { id: "hub", name: "ひろば", ci: 0, cj: 0 };
export const ISLANDS = [
  HUB,
  { id: "math", name: "さんすうじま", subj: "math", ci: 12, cj: 0, axis: "i", dir: 1 },
  { id: "japanese", name: "こくごじま", subj: "japanese", ci: 0, cj: 12, axis: "j", dir: 1 },
  { id: "english", name: "えいごじま", subj: "english", ci: -12, cj: 0, axis: "i", dir: -1 }
];
export const BRIDGE_AT = 3; // その きょうかの「できた」が 3 で はしが かかる

export function hash(i, j, s = 0) {
  let h = (i * 374761393 + j * 668265263 + s * 982451653) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function noise(i, j) { // なめらかな でこぼこ（丘を つくる）
  const x = i / 3.2, y = j / 3.2, x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0;
  const s = t => t * t * (3 - 2 * t), a = hash(x0, y0, 3), b = hash(x0 + 1, y0, 3), c = hash(x0, y0 + 1, 3), d = hash(x0 + 1, y0 + 1, 3);
  return (a + (b - a) * s(fx)) + ((c + (d - c) * s(fx)) - (a + (b - a) * s(fx))) * s(fy);
}

// できたの ぜんぶの 数を、きょうかに わける（ためし用の きまった わりあい）
export function splitDone(total) {
  const math = Math.round(total * 0.4), japanese = Math.round(total * 0.35);
  return { total, math, japanese, english: Math.max(0, total - math - japanese) };
}
export const level = d => ({ lv: 1 + Math.floor(d / 4), rest: 4 - (d % 4), pct: ((d % 4) / 4) * 100 });

// しまに たつ もの（しまの まんなかからの ばしょ）
const FIXED = {
  hub: [{ k: "school", di: -2, dj: -2, tap: "school" }, { k: "tree", di: -3, dj: -3 }, { k: "tree", di: 3, dj: -3 }, { k: "tree", di: -3, dj: 3 }, { k: "flower", di: -1, dj: 2 }],
  math: [{ k: "play", di: 1, dj: -1, tap: "play" }, { k: "tree", di: -1, dj: -2 }],
  japanese: [{ k: "library", di: 1, dj: 1, tap: "library" }, { k: "tree", di: -2, dj: 1 }],
  english: [{ k: "flag", di: -1, dj: -1, tap: "flag" }, { k: "tree", di: 1, dj: 1 }]
};
const SLOTS = { hub: [[-1, -2], [2, 1], [1, 3]], math: [[-1, 1]], japanese: [[1, -1]], english: [[-1, 1]] };
const PONDS = { hub: [[2, 2], [2, 3], [3, 2]], math: [], japanese: [[-1, -1]], english: [] };

function sizeOf(isl, d) {
  if (isl.id === "hub") return Math.min(125, 37 + Math.round(d.total * 0.8));
  return Math.min(72, 7 + d[isl.subj] * 2);
}

// world を つくる。edits：ぬった マス、placed：おいた もの
export function buildWorld(total, edits = {}, placed = []) {
  const d = splitDone(total);
  const tiles = new Map(); // "i,j" -> {i,j,h,t,isl}
  const things = [], slots = [], labels = [];
  for (const isl of ISLANDS) {
    const n = sizeOf(isl, d), R = 7;
    const reserved = new Set([...(FIXED[isl.id] || []).map(f => f.di + "," + f.dj), ...SLOTS[isl.id].map(s => s.join(",")), ...PONDS[isl.id].map(s => s.join(","))]);
    const cand = [];
    for (let di = -R; di <= R; di++) for (let dj = -R; dj <= R; dj++) {
      const r = Math.hypot(di, dj); if (r > R) continue;
      const i = isl.ci + di, j = isl.cj + dj;
      let sc = r + (hash(i, j, 1) - 0.5) * 1.6;
      if (reserved.has(di + "," + dj) || (Math.abs(di) <= 1 && Math.abs(dj) <= 1)) sc = -10 + r;
      cand.push({ i, j, di, dj, sc });
    }
    cand.sort((a, b) => a.sc - b.sc);
    for (const c of cand.slice(0, n)) tiles.set(c.i + "," + c.j, { i: c.i, j: c.j, h: 0, t: "grass", isl: isl.id });
    for (const [di, dj] of PONDS[isl.id]) { const t = tiles.get((isl.ci + di) + "," + (isl.cj + dj)); if (t) t.t = "pond"; }
    // みち：しまの まんなかから はしの ほうへ
    for (let k = -R; k <= R; k++) {
      const onAxis = isl.id === "hub" ? [[k, 0], ...(k >= 0 ? [[0, k]] : [])] : isl.axis === "i" ? (k * isl.dir <= 0 ? [[k, 0]] : []) : (k * isl.dir <= 0 ? [[0, k]] : []);
      for (const [di, dj] of onAxis) { const t = tiles.get((isl.ci + di) + "," + (isl.cj + dj)); if (t && t.t === "grass") t.t = "path"; }
    }
    for (const f of FIXED[isl.id] || []) things.push({ k: f.k, i: isl.ci + f.di, j: isl.cj + f.dj, tap: f.tap, isl: isl.id });
    for (const [di, dj] of SLOTS[isl.id]) slots.push({ slot: true, i: isl.ci + di, j: isl.cj + dj, isl: isl.id });
    labels.push({ isl, i: isl.ci, j: isl.cj });
  }
  // はし：その きょうかの できたが BRIDGE_AT 以上で かかる
  for (const isl of ISLANDS.slice(1)) {
    isl.bridge = d[isl.subj] >= BRIDGE_AT;
    if (!isl.bridge) continue;
    for (let k = 1; k < 12; k++) {
      const i = isl.axis === "i" ? k * isl.dir : 0, j = isl.axis === "j" ? k * isl.dir : 0, key = i + "," + j;
      if (!tiles.has(key)) tiles.set(key, { i, j, h: 0, t: "bridge", isl: "bridge" });
    }
  }
  // ぬった マス
  for (const key in edits) { const t = tiles.get(key); if (t && t.t !== "bridge") t.t = edits[key]; }
  const busy = new Set([...things, ...slots].map(t => t.i + "," + t.j));
  // 丘（だんさ）：まわりが ぜんぶ りくの マスだけ
  const land = (i, j) => { const t = tiles.get(i + "," + j); return t && t.t !== "bridge"; };
  for (const t of tiles.values()) {
    if (t.t !== "grass" || busy.has(t.i + "," + t.j)) continue;
    let inner = true; for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) if (!land(t.i + a, t.j + b)) inner = false;
    if (inner && noise(t.i, t.j) > 0.6) t.h = 1;
  }
  // 木を ちらす
  for (const t of tiles.values()) {
    const key = t.i + "," + t.j;
    if (t.t === "grass" && !busy.has(key) && hash(t.i, t.j, 9) < 0.1) {
      const isl = ISLANDS.find(x => x.id === t.isl);
      if (Math.abs(t.i - isl.ci) <= 1 && Math.abs(t.j - isl.cj) <= 1) continue;
      things.push({ k: "tree", i: t.i, j: t.j, isl: t.isl }); busy.add(key);
    }
  }
  // おいた もの（スロットの ばしょ）
  for (const p of placed) { const s = slots.findIndex(s => s.i === p.i && s.j === p.j); if (s >= 0) slots.splice(s, 1); things.push({ ...p }); }
  return { d, tiles, things, slots, labels, hAt: (i, j) => (tiles.get(i + "," + j) || { h: 0 }).h };
}

// まなびっこが あるける マスか
export function walkable(world, mates, i, j) {
  const t = world.tiles.get(i + "," + j);
  if (!t || t.isl !== "hub" || t.t === "pond") return false;
  if (world.things.some(x => x.i === i && x.j === j) || world.slots.some(x => x.i === i && x.j === j)) return false;
  return !mates.some(m => m.i === i && m.j === j);
}

// マスの まわりの はし（地図の 大きさ）
export function bounds(world) {
  let a = Infinity, b = -Infinity, c = Infinity, e = -Infinity;
  for (const t of world.tiles.values()) { const x = t.i - t.j, y = t.i + t.j; a = Math.min(a, x); b = Math.max(b, x); c = Math.min(c, y); e = Math.max(e, y); }
  return { xmin: a, xmax: b, ymin: c, ymax: e };
}
