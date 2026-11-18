#!/usr/bin/env node
/* めもり名人（data/meter.js）の検査（Node.js 標準機能のみ）
   各ステージ 300回分を作って、答え＝はり・▼の値、目もりの大きさ、テンキーで打てる答え、4択、SVG の形、はりが はかりの外に出ないことを調べる。
   index.html の入口（タイル・#meter・課題リンクの授業モード）が つながっていることも 文字で 確かめる。 */
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm"), assert = require("assert/strict");
const root = path.join(__dirname, "..");
const ctx = { window: {} }; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, "data/meter.js"), "utf8"), ctx);
const M = ctx.window.MH_METER;
let seed = 12345;
const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
const fails = []; const ok = (c, m) => { if (!c) fails.push(m); };

/* SVG が 閉じている（タグの 入れ子が そろう・属性の 引用符が そろう） */
function wellFormed(svg) {
  const st = []; const re = /<(\/?)([a-zA-Z]+)((?:\s+[\w:-]+="[^"<>]*")*)\s*(\/?)>/g; let m, last = 0, rest = "";
  while ((m = re.exec(svg))) {
    rest += svg.slice(last, m.index); last = re.lastIndex;
    if (m[1]) { if (st.pop() !== m[2]) return false; } else if (!m[4]) st.push(m[2]);
  }
  rest += svg.slice(last);
  return st.length === 0 && !/[<>]/.test(rest) && svg.startsWith("<svg") && svg.endsWith("</svg>");
}
const typeable = a => typeof a === "number" ? Number.isInteger(a) && a >= 0 && String(a).length <= 4 : a && Number.isInteger(a.kg) && a.kg >= 0 && a.kg <= 9 && Number.isInteger(a.g) && a.g >= 0 && a.g < 1000;

assert.equal(M.STAGES.length, 11, "ステージは 11");
const seen = {};
for (const S of M.STAGES) {
  const vals = new Set();
  for (let n = 0; n < 300; n++) {
    const list = M.round(S.id, rnd);
    ok(list.length === S.n, `st${S.id}: ${list.length}問（${S.n}問のはず）`);
    for (const q of list) {
      const tag = `st${S.id} ${q.ask} ${JSON.stringify(q.sp)} v=${q.v}`;
      seen[q.ask] = (seen[q.ask] || 0) + 1;
      const sp = q.sp;
      if (q.kind === "line") {
        ok([1, 2, 5, 10, 100].includes(sp.t), `${tag}: 1めもり`);
        ok(sp.n >= 10 && sp.n <= 20 && sp.n % sp.b === 0 && sp.n / sp.b >= 2, `${tag}: めもりの数と 数字の 間かく`);
        if (q.ask !== "tick") { ok(q.v > 0 && q.v < sp.t * sp.n && q.v % sp.t === 0, `${tag}: ▼は 線の 中の めもり`); ok((q.v / sp.t) % sp.b !== 0, `${tag}: ▼は 数字の ない めもり`); }
        const svg = M.lineSVG(sp, { v: q.v, mark: 3, tool: n % 2 === 0, hl: M.hlOf(q) });
        ok(wellFormed(svg), `${tag}: 数直線の SVG`);
        ok((svg.match(/<text /g) || []).length >= sp.n / sp.b + 1, `${tag}: 数字の ある めもり`);
      } else {
        const D = M.DIALS[sp.key];
        ok(D && D.max === sp.max && sp.max % sp.lab === 0 && sp.lab % sp.mid === 0 && sp.mid % sp.t === 0, `${tag}: はかりの 目もり`);
        ok(sp.max / sp.t <= 200, `${tag}: めもりは 200こまで`);
        ok(q.v >= 0 && q.v <= sp.max, `${tag}: はりが はかりの 外`);
        if (q.ask === "read" || q.ask === "kgg") { ok(q.v > 0 && q.v < sp.max && q.v % sp.t === 0 && q.v % sp.lab !== 0, `${tag}: はりは 数字の ない めもり`); }
        if (q.ask === "read") ok(q.v < 1000 && q.a === q.v, `${tag}: g で 答える はかりは 1kg まで`);
        if (q.ask === "kgg") ok(q.v > 1000 && q.a.kg * 1000 + q.a.g === q.v, `${tag}: kg と g`);
        if (q.ask === "tick") ok(q.a === sp.t, `${tag}: 1めもり`);
        if (q.ask === "max") ok(q.a === (sp.max >= 1000 ? sp.max / 1000 : sp.max), `${tag}: さいだい`);
        if (q.ask === "shop") {
          ok(q.items.length === 4 && new Set(q.items.map(x => x.w)).size === 4, `${tag}: しなものは 4つ・重さが ちがう`);
          ok(q.items.every(x => x.w > 0 && x.w % sp.t === 0), `${tag}: しなものの 重さは めもりに のる`);
          ok(q.items.reduce((s, x) => s + x.w, 0) > 0 && q.target < sp.max && q.target % sp.t === 0, `${tag}: めあて`);
          let reach = false; for (let b = 1; b < 16; b++) { let s = 0; for (let i = 0; i < 4; i++) if (b >> i & 1) s += q.items[i].w; if (s === q.target) reach = true; }
          ok(reach, `${tag}: ぴったりに できる`);
          ok(q.items.reduce((s, x) => s + x.w, 0) <= sp.max * 1.5, `${tag}: のせすぎても はかりの 1.5ばいまで`);
        }
        const svg = M.dialSVG(sp, { v: q.ask === "shop" ? q.target : q.v, hl: M.hlOf(q), tool: n % 2 === 0, items: q.items ? q.items.map(x => x.e) : null });
        ok(wellFormed(svg), `${tag}: はかりの SVG`);
        const deg = +(/rotate\(([-\d.]+)deg\)/.exec(svg) || [])[1];
        ok(deg >= 0 && deg < 360 && Math.abs(deg - M.needleDeg(sp, q.ask === "shop" ? q.target : q.v)) < 0.06, `${tag}: はりの 角度`);
        ok(wellFormed(M.dialSVG(sp, { v: q.v, hl: M.hlOf(q), zoom: q.v })), `${tag}: ルーペの SVG`);
        const labels = sp.max / sp.lab + 1; ok((svg.match(/font-weight="700" text-anchor="middle" fill="#13202b">/g) || []).length >= labels, `${tag}: はかりの 数字`);
      }
      /* 小問・答え・4択・手がかり */
      for (const a of (q.steps || [q.ask])) {
        const s = M.sub(q, a);
        if (s.ask === "place" || s.ask === "shop") { ok(M.check(s, s.a), `${tag}: 答えあわせ`); continue; }
        ok(typeable(s.a), `${tag}/${a}: テンキーで 打てる 答え ${JSON.stringify(s.a)}`);
        ok(M.check(s, s.a), `${tag}/${a}: 正しい 答えが ○`);
        ok(!M.check(s, s.ask === "kgg" ? { kg: s.a.kg, g: s.a.g + 1 } : s.a + 1), `${tag}/${a}: ちがう 答えが ×`);
        const ch = M.choices(s, rnd), keys = ch.map(c => JSON.stringify(c.v));
        ok(ch.length === 4 && new Set(keys).size === 4 && new Set(ch.map(c => c.label)).size === 4, `${tag}/${a}: 4択が 4つ ちがう ${ch.map(c => c.label)}`);
        ok(ch.filter(c => M.check(s, c.v)).length === 1, `${tag}/${a}: 4択の 正解は 1つ`);
        ok(ch.every(c => typeable(c.v)), `${tag}/${a}: 4択の 数`);
        if (s.ask === "read" || s.ask === "kgg") ok(ch.every(c => { const v = s.ask === "kgg" ? c.v.kg * 1000 + c.v.g : c.v; return v > 0 && v < (q.kind === "line" ? sp.t * sp.n : sp.max); }), `${tag}/${a}: 4択は めもりの 中`);
        const h1 = M.hint(s, s.ask === "kgg" ? { kg: 0, g: 5 } : 0, 1), h2 = M.hint(s, 0, 2);
        ok(h1 && typeof h1.msg === "string" && h1.msg.length > 4 && h1.hl, `${tag}/${a}: 手がかり`);
        ok(h2.reveal && h2.msg.includes(s.ask === "kgg" ? M.kgg(q.v) : M.fmt(s)), `${tag}/${a}: 2回目は 答えを 見せる`);
        ok(!/[<>]/.test(h1.msg + s.q), `${tag}: 文に タグが ない`);
      }
      if (q.ask === "read" || q.ask === "tick" || q.ask === "kgg") vals.add(JSON.stringify(q.a));
    }
  }
  if (["read", "tick"].includes(M.round(S.id, rnd)[0].ask) && S.id !== 11) ok(vals.size >= 3, `st${S.id}: 答えが ばらつく（${vals.size}）`);
}
for (const a of ["read", "tick", "max", "zero", "place", "kgg", "shop"]) ok(seen[a] > 0, `${a} の 問題が 出る`);
/* kg と g の 手がかり：g の ところに 1000 いじょう 入れたら kg を 教える */
{ const q = M.round(9, rnd)[0]; ok(/1kg/.test(M.hint(q, { kg: 0, g: q.v }, 1).msg), "kgg: 1000g は 1kg の 手がかり"); }
/* 2kg の はかりは 1kg を こえると g だけ 書く（じっさいの はかりと 同じ） */
ok(M.dialLab(M.DIALS.kg2, 1200) === "1kg 200" && M.dialLab(M.DIALS.kg2, 1000) === "1kg" && M.dialLab(M.DIALS.kg1, 1000) === "1kg" && M.dialLab(M.DIALS.g500, 450) === "450", "はかりの 数字");

/* index.html の 入口 */
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
ok(/data\/meter\.js\?v=[0-9a-f]{8}/.test(html), "meter.js を 版つきで 読みこむ");
ok(/else if\(path==="meter"\) renderMeter\(q\)/.test(html), "#meter の 画面");
ok(/#\(\?:play\|mode\|meter\)\\\?/.test(html), "課題リンク（授業モード）に #meter");
ok(/meterTile\(\)\+extTiles\(\)/.test(html), "ホームの 算数に タイル");
ok(/colRun\(\{units:\[\],answered:ans,correct:f,quiet:!!m\.task\}\)/.test(html), "どんぐりは colRun（授業モードは 記録だけ）");
ok(!/setInterval\([^)]*mt/i.test(html.slice(html.indexOf("const MTKEY"), html.indexOf("function shouldBlockLessonNavigation"))), "めもり名人に タイマーが ない");

if (fails.length) { console.error(`めもり名人: ${fails.length}件 NG`); [...new Set(fails)].slice(0, 30).forEach(f => console.error(" - " + f)); process.exit(1); }
console.log(`めもり名人: 11ステージ × 300回 OK（${Object.entries(seen).map(([k, v]) => k + v).join("・")}）`);
/* どの はかりも 5めもりで 中、10めもりで 大と 数字。1kg を こえた 数字は kg も 書く */
for (const sp of Object.values(M.DIALS)) {
  ok(sp.mid === sp.t * 5 && sp.lab === sp.t * 10 && sp.max % sp.lab === 0, `${sp.key}: 5めもりで 中・10めもりで 大`);
  for (let v = sp.lab; v < sp.max; v += sp.lab) { const l = M.dialLab(sp, v); ok(v < 1000 || /kg/.test(l), `${sp.key}: ${v} の 数字に kg（${l}）`); }
}
console.log("はかりの めもり：5・10 の きまり OK");
