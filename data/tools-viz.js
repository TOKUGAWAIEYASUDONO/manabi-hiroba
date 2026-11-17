/* まなびひろば 「ずで かんがえる」どうぐ（計算スプリント・単元練習の 1人の 算数）
   Qalc（MIT・GIGAyama。apps/README.md）の「かんがえるどうぐ」（src/LearningTools.jsx・src/learningTools/detect.js）を もとに、
   よく使う5つだけを vanilla JS で作りなおした：ブロック・さくらんぼ・アレイ・くらい（位取り表）・ぶんすう（分数バー）。
   ひっ算は 問題が もう たての形で 出ているので 入れない。

   ■ detect(ctx) → [{id, label, ...data}]（先頭が はじめに 開く どうぐ。合う どうぐが 無ければ []）
     ctx = { q:問題文, unit:単元ID（計算スプリントは "calc-"+式の種類）, g:学年, subj, area:領域(A〜D), hissan:{a,b,op}? }
     判定は 単元ID・hissan（数と演算）を先に使い、なければ 問題文を読む（Qalc の detect と同じ考え）。
   ■ draw(tool, doc) → 図の要素（SVG と ひらがなの 説明）。SVG の中の文字は 数字と ひらがなだけ（ふりがなの変換が SVG に入らないため）
   画面・保存には さわらない。tools/test-tools-viz.js で 判定を 検査する。 */
(function (root) {
  "use strict";
  const SVGN = "http://www.w3.org/2000/svg";
  const LABEL = { blocks: "ブロック", sakuranbo: "さくらんぼ", array: "アレイ", kurai: "くらい", bunsu: "ぶんすう" };
  const plain = s => String(s == null ? "" : s).replace(/｜/g, "").replace(/《[^《》]*》/g, "");
  const OPN = { "+": "+", "＋": "+", "-": "-", "−": "-", "ー": "-", "×": "×", "x": "×", "*": "×", "÷": "÷" };
  const isInt = n => Number.isInteger(n);
  const gcd = (a, b) => { while (b) [a, b] = [b, a % b]; return a; };
  const lcm = (a, b) => a / gcd(a, b) * b;

  /* 「8 + 5」「16 − 4 − 5」のような 数と演算だけの式 → {nums, ops}（それ以外は null） */
  function parseExpr(s) {
    const t = plain(s).replace(/\s+/g, "").replace(/[=＝]\?$/, "");
    if (!/^\d+(?:\.\d+)?(?:[+＋\-−ー×x*÷]\d+(?:\.\d+)?)+$/.test(t)) return null;
    const nums = t.split(/[+＋\-−ー×x*÷]/).map(Number), ops = (t.match(/[+＋\-−ー×x*÷]/g) || []).map(o => OPN[o]);
    return nums.length === ops.length + 1 && nums.every(n => isFinite(n)) ? { nums, ops } : null;
  }
  /* 分数の かたまり（「3と1/5」「2/7」）。小数は べつ */
  function parseFracs(s) {
    const out = [];
    for (const m of plain(s).matchAll(/(?:(\d+)と)?(\d+)\/(\d+)/g)) out.push({ w: +(m[1] || 0), n: +m[2], d: +m[3] });
    return out;
  }
  const PV_UNITS = new Set(["m1-juu-to-ichi", "m2-keta3", "m2-keta4", "m3-man", "m4-oku", "m5-seisu-shosu", "m4-gaisu"]);
  const NO_TOOL = /^m1-(tokei|kazoeru|kazu-kurabe|nanbanme|nagasa-kurabe|kasa-kurabe|narabi)/;

  function blocksOf(e) {        // 20までの たし算・ひき算（3つの数も）。とちゅうも 0〜20
    if (!e || !e.ops.every(o => o === "+" || o === "-") || !e.nums.every(isInt)) return null;
    let v = e.nums[0]; if (v > 20) return null;
    const steps = [];
    for (let i = 0; i < e.ops.length; i++) {
      const n = e.nums[i + 1]; v += e.ops[i] === "+" ? n : -n;
      if (n > 20 || v < 0 || v > 20) return null;
      steps.push({ op: e.ops[i], n });
    }
    return { id: "blocks", start: e.nums[0], steps };
  }
  function sakuranboOf(e) {      // くり上がり（8+5）・くり下がり（13−9）
    if (!e || e.ops.length !== 1 || !e.nums.every(isInt)) return null;
    const [a, b] = e.nums, op = e.ops[0];
    if (op === "+" && a < 10 && b < 10 && a + b > 10) {      // 大きいほうに あわせて 10を つくる（同じなら うしろを わける）
      const big = a >= b ? a : b, split = a >= b ? 1 : 0, other = a >= b ? b : a, need = 10 - big;
      return { id: "sakuranbo", op, a, b, split, parts: [need, other - need] };
    }
    if (op === "-" && a > 10 && a < 20 && b < 10 && a % 10 < b) return { id: "sakuranbo", op, a, b, split: 0, parts: [10, a - 10] };
    return null;
  }
  function arrayOf(e, q) {
    const s = plain(q).replace(/\s+/g, "");
    let m = s.match(/^(\d+)×□=(\d+)$/);
    if (m && +m[1] >= 1 && +m[1] <= 12 && +m[2] % +m[1] === 0 && +m[2] / +m[1] <= 12) return { id: "array", per: +m[1], total: +m[2], kind: "rows?" };
    m = s.match(/^□×(\d+)=(\d+)$/);
    if (m && +m[1] >= 1 && +m[1] <= 12 && +m[2] % +m[1] === 0 && +m[2] / +m[1] <= 12) return { id: "array", per: +m[2] / +m[1], total: +m[2], rows: +m[1], kind: "per?" };
    if (!e || e.ops.length !== 1 || !e.nums.every(isInt)) return null;
    const [a, b] = e.nums, op = e.ops[0];
    if (op === "×" && a >= 1 && b >= 1 && a <= 12 && b <= 12 && a * b <= 100) return { id: "array", per: a, total: a * b, rows: b, kind: "mul" };
    if (op === "÷" && b >= 2 && b <= 12 && a >= 1 && a <= 100 && Math.ceil(a / b) <= 12) return { id: "array", per: b, total: a, kind: a % b ? "rem" : "div" };
    return null;
  }
  function arrayWords(q) {        // かけ算・わり算の 文章題（「6ほんずつ」「7人で わける」）
    const s = plain(q); let nums = (s.match(/\d+/g) || []).map(Number);
    if (nums.length > 2) nums = nums.filter(n => n !== 1);      // 「1さらに」「1人」の 1は 数えない
    if (nums.length !== 2 || !/ずつ|わけ|くば/.test(s)) return null;
    const share = /(\d+)(?:人|にん)(?:で|に)/.test(s);
    if (/わけ|くば|なん(?:れつ|にん|はこ|ふくろ)|いくつ(?:に|分)/.test(s) || share) {
      const total = Math.max(...nums), b = Math.min(...nums);
      if (b < 2 || b > 12 || total > 100 || Math.ceil(total / b) > 12) return null;
      return { id: "array", per: b, total, kind: share ? "share" : total % b ? "rem" : "div" };
    }
    const pm = s.match(/(\d+)\D{0,4}ずつ/); if (!pm) return null;
    const per = +pm[1], rows = nums[0] === per && nums[1] !== per ? nums[1] : nums[0] === per ? nums[1] : nums[0];
    if (per < 1 || per > 12 || rows < 1 || rows > 12 || per * rows > 100) return null;
    return { id: "array", per, total: per * rows, rows, kind: "mul" };
  }
  function kuraiOf(ctx, q, e) {
    const s = plain(q), unit = ctx.unit || "";
    const pairs = [...s.matchAll(/(\d+)が\s*(\d+)こ/g)].map(m => [+m[1], +m[2]]).filter(([p]) => /^10*$/.test(String(p)));
    if (pairs.length) {
      const hi = Math.max(...pairs.map(([p]) => String(p).length - 1));      // ますは からっぽ（こたえに なるので 子どもが いれる）
      return { id: "kurai", hi, lo: 0, rows: [{ cells: {} }], kind: "count", given: pairs.map(([p, c]) => [String(p).length - 1, c]) };
    }
    if (/[万億兆]/.test(s)) {
      const hi = /兆/.test(s) ? 15 : /億/.test(s) ? 11 : 7;
      return { id: "kurai", hi, lo: 0, rows: [{ cells: {} }], kind: "big" };
    }
    if (!PV_UNITS.has(unit) && (ctx.hissan || parseFracs(s).length || (ctx.area && ctx.area !== "A"))) return null;    // ひっ算の形で 出ている式は もう くらいが そろっている
    const s2 = s.replace(/\d+\/\d+|\d+ばい/g, " "), toks = [...new Set((e ? e.nums.map(String) : (s2.match(/\d+(?:\.\d+)?/g) || [])))].filter(t => !/^0\d/.test(t)).slice(0, 3);
    if (!toks.length) return null;
    if (!PV_UNITS.has(unit) && !toks.some(t => t.includes(".") || +t >= 100)) return null;
    const ip = t => t.split(".")[0].length - 1, dp = t => (t.split(".")[1] || "").length;
    let hi = Math.max(...toks.map(ip)), lo = -Math.max(...toks.map(dp));
    if (/1\/10\b|10ばい|100ばい|1\/100/.test(s)) { hi++; lo = Math.min(lo, -1) - (/1\/100|100ばい/.test(s) ? 1 : 0); }
    if (hi > 11 || lo < -3) return null;
    const rows = toks.map(t => { const [ip0, dp0 = ""] = t.split("."), cells = {};
      [...ip0].forEach((d, i) => { cells[ip0.length - 1 - i] = d; }); [...dp0].forEach((d, i) => { cells[-(i + 1)] = d; }); return { cells, label: t }; });
    return { id: "kurai", hi, lo, rows, kind: "nums" };
  }
  function bunsuOf(ctx, q, e) {
    const s = plain(q);
    let m = s.match(/(\d+)つに\s*わけた\s*(\d+)つ\s*ぶん/);
    if (m && +m[1] >= 2 && +m[1] <= 12) return { id: "bunsu", fr: [{ w: 0, n: +m[2], d: +m[1] }], hide: true };
    const fr = parseFracs(s);
    if (!fr.length || fr.length > 3) return null;
    if (/\d\.\d/.test(s)) return null;                                     // 小数と まじった式は 分数バーでは わかりにくい
    if (/\d+\/\d+\s*[×÷]|[×÷]\s*\d+(?:と\d+)?\/\d+/.test(s)) return null;   // 分数の かけ算・わり算は 面積図が いる（いまは 出さない）
    if (!fr.every(f => f.d >= 2 && f.d <= 12 && f.n >= 1 && f.w + f.n / f.d <= 5)) return null;
    const ops = s.match(/\d\s*([+＋\-−])\s*\d/), op = ops ? OPN[ops[1]] : "";
    const o = { id: "bunsu", fr, op };
    if (fr.length === 2 && fr[0].d !== fr[1].d && lcm(fr[0].d, fr[1].d) <= 24) o.lcm = lcm(fr[0].d, fr[1].d);
    return o;
  }

  function detect(ctx) {
    ctx = ctx || {};
    if (ctx.subj && ctx.subj !== "sansu") return [];
    const unit = String(ctx.unit || ""), q = String(ctx.q || "");
    if (NO_TOOL.test(unit) || !q) return [];
    const out = [], add = t => { if (t && !out.some(x => x.id === t.id)) out.push({ ...t, label: LABEL[t.id] }); };
    const h = ctx.hissan && typeof ctx.hissan === "object" ? ctx.hissan : null;
    const e = h && h.a != null && h.b != null && OPN[h.op] ? { nums: [Number(h.a), Number(h.b)], ops: [OPN[h.op]] } : parseExpr(q);
    if (PV_UNITS.has(unit)) { add(kuraiOf(ctx, q, null)); return out; }
    add(bunsuOf(ctx, q, e)); if (out.length) return out;
    const s = plain(q), mk = s.match(/(\d+)は\s*(\d+)と\s*いくつ/);
    if (mk && +mk[1] <= 20 && +mk[2] <= +mk[1]) { add({ id: "blocks", start: +mk[2], steps: [], total: +mk[1] }); return out; }
    add(sakuranboOf(e));
    add(blocksOf(e));
    add(arrayOf(e, q) || (!e ? arrayWords(q) : null));
    if (!out.length) add(kuraiOf(ctx, q, e));
    return out;
  }

  /* ---------------- 絵（ブラウザだけ） ---------------- */
  const C = { y: "#f6d55c", b: "#8fc9e9", p: "#f39aa5", w: "#ffffff", line: "rgba(255,255,255,.75)", dim: "rgba(255,255,255,.18)", red: "#e85a6b", leaf: "#7cc47f" };
  function mk(doc, tag, attrs, parent) { const e = doc.createElementNS(SVGN, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }
  function txt(doc, parent, x, y, s, o) { o = o || {}; const t = mk(doc, "text", { x, y, fill: o.fill || C.w, "font-size": o.size || 22, "font-weight": 700, "text-anchor": o.anchor || "middle", "dominant-baseline": "central" }, parent); t.textContent = s; return t; }
  function svgBox(doc, w, hh, label) { const s = mk(doc, "svg", { viewBox: `0 0 ${w} ${hh}`, role: "img", "aria-label": label, class: "tlsvg" }); s.style.maxWidth = Math.min(w * 1.25, 460) + "px"; return s; }
  function wrap(doc, svg, lines) {
    const d = doc.createElement("div"); d.className = "tlfig"; if (svg) d.appendChild(svg);
    for (const l of lines.filter(Boolean)) { const p = doc.createElement("p"); p.className = "tlcap"; p.textContent = l; d.appendChild(p); }
    return d;
  }

  function drawBlocks(t, doc) {
    const cells = [];      // {c:色, x:けした色}
    const tf = t.total != null;
    for (let i = 0; i < t.start; i++) cells.push({ c: C.y });
    const cols = [C.b, C.p];
    t.steps.forEach((st, k) => {
      if (st.op === "+") for (let i = 0; i < st.n; i++) cells.push({ c: cols[k % 2] });
      else { let left = st.n; for (let i = cells.length - 1; i >= 0 && left > 0; i--) if (!cells[i].x) { cells[i].x = cols[k % 2]; left--; } }
    });
    if (tf) while (cells.length < t.total) cells.push({ c: null });
    const frames = Math.max(1, Math.ceil(cells.length / 10)), S = 32, G = 18, W = frames * (5 * S) + (frames - 1) * G + 16, H = 2 * S + 16;
    const svg = svgBox(doc, W, H, "ブロック");
    for (let f = 0; f < frames; f++) {
      const ox = 8 + f * (5 * S + G);
      mk(doc, "rect", { x: ox, y: 8, width: 5 * S, height: 2 * S, rx: 4, fill: "none", stroke: C.line, "stroke-width": 2 }, svg);
      for (let i = 0; i < 10; i++) {
        const k = f * 10 + i, x = ox + (i % 5) * S, y = 8 + Math.floor(i / 5) * S;
        if (i % 5) mk(doc, "line", { x1: x, y1: y, x2: x, y2: y + S, stroke: C.dim, "stroke-width": 1 }, svg);
        if (i === 5) mk(doc, "line", { x1: ox, y1: 8 + S, x2: ox + 5 * S, y2: 8 + S, stroke: C.dim, "stroke-width": 1 }, svg);
        const c = cells[k]; if (!c) continue;
        if (!c.c) { mk(doc, "rect", { x: x + 5, y: y + 5, width: S - 10, height: S - 10, rx: 5, fill: "none", stroke: C.w, "stroke-width": 2, "stroke-dasharray": "4 3" }, svg); txt(doc, svg, x + S / 2, y + S / 2 + 1, "?", { size: 16 }); continue; }
        mk(doc, "rect", { x: x + 4, y: y + 4, width: S - 8, height: S - 8, rx: 6, fill: c.c, opacity: c.x ? .35 : 1 }, svg);
        if (c.x) { mk(doc, "path", { d: `M${x + 8} ${y + 8}L${x + S - 8} ${y + S - 8}M${x + S - 8} ${y + 8}L${x + 8} ${y + S - 8}`, stroke: c.x, "stroke-width": 4, "stroke-linecap": "round" }, svg); }
      }
    }
    let cap;
    if (tf) cap = `${t.start}と あと いくつで ${t.total}に なるかな？　?の ますを かぞえよう`;
    else if (t.steps.every(s => s.op === "+")) cap = `${[t.start, ...t.steps.map(s => s.n)].join("こと ")}こを あわせるよ。10の まとまりを みつけると かぞえやすいよ`;
    else cap = `${t.start}こから ${t.steps.filter(s => s.op === "-").map(s => s.n + "こ").join("と ")} とるよ（×の ぶん）。のこりは いくつかな？`;
    return wrap(doc, svg, [cap]);
  }
  function drawSakuranbo(t, doc) {
    const W = 300, H = 150, svg = svgBox(doc, W, H, "さくらんぼ");
    const xs = [60, 110, 160, 210, 255], sym = t.op === "+" ? "+" : "−";
    [String(t.a), sym, String(t.b), "=", "?"].forEach((s, i) => txt(doc, svg, xs[i], 30, s, { size: 30, fill: i === 4 ? C.y : C.w }));
    const cx = t.split === 0 ? xs[0] : xs[2], kids = [cx - 26, cx + 26];
    for (let i = 0; i < 2; i++) {
      mk(doc, "path", { d: `M${cx} 52 Q ${cx + (i ? 8 : -8)} 80 ${kids[i]} 102`, stroke: C.leaf, "stroke-width": 4, fill: "none", "stroke-linecap": "round" }, svg);
      mk(doc, "circle", { cx: kids[i], cy: 118, r: 19, fill: C.red, stroke: "#fff", "stroke-width": 2 }, svg);
      txt(doc, svg, kids[i], 119, String(t.parts[i]), { size: 20 });
    }
    let lines;
    if (t.op === "+") {
      const big = t.split ? t.a : t.b;
      lines = [`${t.split ? t.b : t.a}を ${t.parts[0]}と ${t.parts[1]}に わけるよ`, `${big}と ${t.parts[0]}で 10。10と ${t.parts[1]}で いくつ？`];
    } else lines = [`${t.a}を 10と ${t.parts[1]}に わけるよ`, `10 − ${t.b} = ${10 - t.b}。${10 - t.b}と ${t.parts[1]}で いくつ？`];
    return wrap(doc, svg, lines);
  }
  function drawArray(t, doc) {
    const per = t.per, rows = Math.ceil(t.total / per), S = per > 9 ? 20 : 24, R = S * .34;
    const W = per * S + 24, H = rows * S + 16, svg = svgBox(doc, W, H, "アレイ");
    svg.style.maxWidth = Math.min(W * 1.4, 420) + "px";
    for (let r = 0; r < rows; r++) {
      const full = (r + 1) * per <= t.total, n = full ? per : t.total - r * per;
      mk(doc, "rect", { x: 8, y: 8 + r * S + 1, width: per * S + 8, height: S - 2, rx: S / 2 - 1, fill: full ? "rgba(255,255,255,.10)" : "none", stroke: full ? "none" : C.p, "stroke-dasharray": full ? "" : "4 3" }, svg);
      for (let i = 0; i < n; i++) mk(doc, "circle", { cx: 12 + i * S + S / 2, cy: 8 + r * S + S / 2, r: R, fill: full ? (r % 2 ? C.b : C.y) : C.p }, svg);
    }
    const cap = {
      mul: `${t.per}こずつ ${t.rows}れつ。ぜんぶで いくつかな？`,
      "rows?": `${t.per}こずつ ならべて ${t.total}こ。なんれつ かな？`,
      "per?": `${t.total}こを ${t.rows}れつに わけると、1れつは なんこ かな？`,
      div: `${t.total}こを ${t.per}こずつ ならべたよ。なんれつ できたかな？`,
      rem: `${t.total}こを ${t.per}こずつ ならべたよ。なんれつ できて、いくつ あまるかな？`,
      share: `${t.per}にんに 1こずつ じゅんばんに くばると…（よこ 1れつで みんなに 1こずつ）`
    }[t.kind];
    return wrap(doc, svg, [cap]);
  }
  const PV = ["一《いち》", "十《じゅう》", "百《ひゃく》", "千《せん》", "一万《いちまん》", "十万《じゅうまん》", "百万《ひゃくまん》", "千万《せんまん》", "一億《いちおく》", "十億《じゅうおく》", "百億《ひゃくおく》", "千億《せんおく》", "一兆《いっちょう》", "十兆《じゅっちょう》", "百兆《ひゃくちょう》", "千兆《せんちょう》"];
  function drawKurai(t, doc) {
    const tb = doc.createElement("table"); tb.className = "tlk";
    const cols = []; for (let p = t.hi; p >= t.lo; p--) cols.push(p);
    const tr0 = doc.createElement("tr");
    for (const p of cols) { const th = doc.createElement("th"); th.textContent = p >= 0 ? PV[p] : "1/" + Math.pow(10, -p); if (p % 4 === 0 && p > 0) th.className = "tlk4"; if (p === 0 && t.lo < 0) th.className = "tlkd"; tr0.appendChild(th); }
    tb.appendChild(tr0);
    for (const r of t.rows) {
      const tr = doc.createElement("tr");
      for (const p of cols) { const td = doc.createElement("td"); td.textContent = r.cells[p] != null ? r.cells[p] : ""; if (p % 4 === 0 && p > 0) td.className = "tlk4"; if (p === 0 && t.lo < 0) td.className = "tlkd"; tr.appendChild(td); }
      tb.appendChild(tr);
    }
    const cap = { count: "ますを おすと すうじが かわるよ。かずを その くらいの ますに いれて みよう", big: "4けたごとに まん・おく と よびかたが かわるよ。ますに すうじを いれて みよう", nums: t.lo < 0 ? "くらいを そろえて ならべたよ。てんの いちに きを つけよう" : "くらいを そろえて ならべたよ" }[t.kind];
    const d = wrap(doc, null, [cap]); d.insertBefore(tb, d.firstChild);
    if (t.kind !== "nums") tb.querySelectorAll("td").forEach(td => { td.tabIndex = 0; td.setAttribute("role", "button"); td.setAttribute("aria-label", "ますの すうじを かえる"); td.onclick = () => { const q = ["", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9"]; td.textContent = q[(q.indexOf(td.textContent) + 1) % q.length]; }; td.onkeydown = e => { if (/^[0-9]$/.test(e.key)) { td.textContent = e.key; e.preventDefault(); e.stopPropagation(); } else if (e.key === "Enter" || e.key === " ") { td.onclick(); e.preventDefault(); e.stopPropagation(); } }; });
    return d;
  }
  function drawBunsu(t, doc) {
    const rows = t.fr.map(f => ({ ...f, tot: f.w * f.d + f.n, bars: Math.max(1, Math.ceil(f.w + f.n / f.d)) }));
    const BW = 300, LW = t.hide ? 0 : 64, maxBars = Math.max(...rows.map(r => r.bars)), bw = Math.min(220, (BW - (maxBars - 1) * 8) / maxBars), RH = 44;
    const W = LW + maxBars * bw + (maxBars - 1) * 8 + 12, H = rows.length * RH + 8, svg = svgBox(doc, W, H, "ぶんすう");
    svg.style.maxWidth = "460px";
    rows.forEach((r, i) => {
      const y = 8 + i * RH;
      if (!t.hide) txt(doc, svg, LW / 2, y + 16, r.w ? `${r.w}と${r.n}/${r.d}` : `${r.n}/${r.d}`, { size: r.w ? 16 : 19, fill: i % 2 ? C.b : C.y });
      for (let b = 0; b < r.bars; b++) {
        const x = LW + 6 + b * (bw + 8), pw = bw / r.d;
        for (let k = 0; k < r.d; k++) {
          const on = b * r.d + k < r.tot;
          mk(doc, "rect", { x: x + k * pw, y, width: pw, height: 32, fill: on ? (i % 2 ? C.b : C.y) : "rgba(255,255,255,.08)", stroke: C.line, "stroke-width": 1.5 }, svg);
        }
        if (t.lcm) for (let k = 1; k < t.lcm; k++) mk(doc, "line", { x1: x + k * bw / t.lcm, y1: y + 2, x2: x + k * bw / t.lcm, y2: y + 30, stroke: "#1b2a22", "stroke-width": 1.2, "stroke-dasharray": "3 3", class: "tl-lcm" }, svg);
      }
    });
    const cap = t.hide ? "おなじ おおきさに わけた 1つぶんに いろを ぬったよ" : t.lcm ? "ぶんぼが ちがうと そのままでは たしたり ひいたり できないね" : t.op ? "おなじ ぶんぼなら、いろの ますの かずで けいさん できるよ" : "いろの ついた ところが ぶんすうの おおきさだよ";
    const d = wrap(doc, svg, [cap]);
    if (t.lcm) {
      svg.classList.add("tl-nolcm");
      const b = doc.createElement("button"); b.type = "button"; b.className = "btn sub s tllcm"; b.textContent = "こまかく わける"; b.setAttribute("aria-pressed", "false");
      b.onclick = () => { const on = svg.classList.toggle("tl-nolcm"); b.setAttribute("aria-pressed", String(!on)); };
      d.appendChild(b);
    }
    return d;
  }
  function draw(t, doc) {
    doc = doc || root.document;
    return ({ blocks: drawBlocks, sakuranbo: drawSakuranbo, array: drawArray, kurai: drawKurai, bunsu: drawBunsu }[t.id] || (() => null))(t, doc);
  }
  root.MH_TOOLS = { LABEL, detect, draw, parseExpr, parseFracs, plain };
})(typeof window !== "undefined" ? window : this);
