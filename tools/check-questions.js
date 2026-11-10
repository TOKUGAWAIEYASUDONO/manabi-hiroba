#!/usr/bin/env node
/* まなびひろば 問題データの自動検査（Node.js 標準機能のみ）
   使い方：node tools/check-questions.js
   検査すること
   - ID の重複・形式、学年（1〜6）、問題・答えの空欄
   - 漢字よみ：問題の漢字が、その問題の学年以下に配当されているか（data/kanji-grade.js）
               読みがひらがなか、4択を作れるだけの「ちがう読み」が学年内にあるか
   - 県庁所在地・英単語：4択を作れるだけの「ちがう答え」があるか
   - 計算：学年ごとに200回作り、答えが正しいか（分数・小数は誤差なしで検算）、
           分数は約分済みか、4択がそろっているか、全単元が出ているか
   エラーが1件でもあれば終了コード 1 */
const fs = require("fs"), path = require("path"), vm = require("vm");
const root = path.join(__dirname, "..");
const ctx = { window: {} };
vm.createContext(ctx);
for (const f of ["data/kanji-grade.js", "data/questions.js", "data/calc.js"]) {
  vm.runInContext(fs.readFileSync(path.join(root, f), "utf8"), ctx, { filename: f });
}
const GRADE = ctx.window.MH_KANJI_GRADE, Q = ctx.window.MH_QUESTIONS, CALC = ctx.window.MH_CALC;

const errors = [], warns = [];
const err = (id, msg) => errors.push(`✗ ${id}: ${msg}`);

/* ---------- 配当表そのもの ---------- */
const gradeOf = new Map();
for (const g of Object.keys(GRADE)) for (const c of GRADE[g]) {
  if (gradeOf.has(c)) err("配当表", `「${c}」が ${gradeOf.get(c)}年 と ${g}年 の両方にある`);
  gradeOf.set(c, +g);
}
if (gradeOf.size !== 1026) warns.push(`配当表の字数が ${gradeOf.size} 字（1026字のはず）`);

/* ---------- 選択問題 ---------- */
const seen = new Set();
const isKanji = c => /\p{Script=Han}/u.test(c);
function common(set, name, idRe) {
  for (const x of set) {
    const id = x && x.id || "(IDなし)";
    if (!x.id || !idRe.test(x.id)) err(id, "IDの形式が正しくない");
    if (seen.has(x.id)) err(id, "IDが重複している"); seen.add(x.id);
    if (!(Number.isInteger(x.g) && x.g >= 1 && x.g <= 6)) err(id, "学年(g)が1〜6でない");
    if (!String(x.q || "").trim()) err(id, "問題が空欄");
    if (!String(x.a || "").trim()) err(id, "答えが空欄");
  }
  // 4択：同じ学年の中に、答えとちがうものが3つ以上必要
  const byG = {};
  for (const x of set) (byG[x.g] = byG[x.g] || new Set()).add(x.a);
  for (const g in byG) if (byG[g].size < 4) err(`${name} ${g}年`, `ちがう答えが ${byG[g].size} 個しかなく4択を作れない`);
}
common(Q.kanji, "漢字", /^kanji-g[1-6]-\d{3}$/);
common(Q.kencho, "県庁", /^kencho-\d{3}$/);
common(Q.eigo, "英単語", /^eigo-\d{3}$/);

let kanjiBad = 0;
for (const x of Q.kanji) {
  if (x.id && x.id.slice(7, 8) !== String(x.g)) err(x.id, `IDの学年と g(${x.g}) が合わない`);
  if (!/^[ぁ-ゖー]+$/.test(x.a || "")) err(x.id, `読み「${x.a}」がひらがなだけになっていない`);
  for (const c of x.q || "") {
    if (!isKanji(c)) continue;
    const cg = gradeOf.get(c);
    if (!cg) { kanjiBad++; err(x.id, `「${x.q}」の「${c}」は小学校の配当表にない`); }
    else if (cg > x.g) { kanjiBad++; err(x.id, `「${x.q}」の「${c}」は${cg}年の漢字（この問題は${x.g}年）`); }
  }
}
// 同じ学年に同じ問題が2回あると、4択で正解が2つになることがある
const dupQ = new Map();
for (const x of [...Q.kanji, ...Q.kencho, ...Q.eigo]) {
  const k = x.id.split("-")[0] + x.g + "|" + x.q;
  if (dupQ.has(k)) err(x.id, `問題「${x.q}」が ${dupQ.get(k)} と重複`); else dupQ.set(k, x.id);
}

/* ---------- 計算（誤差のない分数で検算） ---------- */
const bgcd = (a, b) => { a = a < 0n ? -a : a; b = b < 0n ? -b : b; while (b) [a, b] = [b, a % b]; return a; };
const R = (n, d = 1n) => { if (d < 0n) { n = -n; d = -d; } const k = bgcd(n, d) || 1n; return [n / k, d / k]; };
function parseNum(s) {                    // "3/4" "2.35" "12" → 分数
  s = String(s).trim();
  if (/^\d+\/\d+$/.test(s)) { const [n, d] = s.split("/").map(BigInt); return R(n, d); }
  if (/^\d+(\.\d+)?$/.test(s)) { const [i, f = ""] = s.split("."); return R(BigInt(i + f), 10n ** BigInt(f.length)); }
  return null;
}
const OPS = { "+": (a, b) => R(a[0] * b[1] + b[0] * a[1], a[1] * b[1]), "−": (a, b) => R(a[0] * b[1] - b[0] * a[1], a[1] * b[1]),
  "×": (a, b) => R(a[0] * b[0], a[1] * b[1]), "÷": (a, b) => R(a[0] * b[1], a[1] * b[0]) };
const eq = (a, b) => a && b && a[0] === b[0] && a[1] === b[1];
const show = r => r[1] === 1n ? String(r[0]) : r[0] + "/" + r[1];

let seed = 12345;                         // 毎回同じ結果になるよう、決まった乱数を使う
const rnd = n => { seed = (seed * 1103515245 + 12345) % 2147483648; return Math.floor(seed / 2147483648 * n); };
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// 単元ごとの範囲（学年に合っているか）
const RANGE = {
  add20: (x, y, z) => z <= 20, sub20: (x, y, z) => x <= 20 && z >= 0,
  add2: (x, y) => x >= 10 && x <= 99 && y >= 10 && y <= 99, sub2: (x, y, z) => x <= 99 && y >= 10 && z >= 0, kuku: (x, y) => x <= 9 && y <= 9,
  add3: (x, y) => x >= 100 && x <= 999 && y >= 100 && y <= 999, sub3: (x, y, z) => x >= 100 && x <= 999 && y >= 100 && z >= 0,
  div99: (x, y, z) => y <= 9 && z <= 9, mul21: (x, y) => x >= 10 && x <= 99 && y <= 9,
  div21: (x, y, z) => x >= 10 && x <= 99 && y <= 9 && z >= 10, mul32: (x, y) => x >= 100 && x <= 999 && y >= 10 && y <= 99,
  decSub: (x, y, z) => z > 0, decDivInt: (x, y) => Number.isInteger(y)
};
const TRIES = 200;
for (let g = 1; g <= 6; g++) {
  const units = new Set(), bad = [];
  for (let i = 0; i < TRIES; i++) {
    const p = CALC.make(g, rnd, shuffle);
    const tag = `計算${g}年 ${p.unit}「${p.q} = ${p.a}」`;
    units.add(p.unit);
    if (!CALC.UNITS[g][p.unit]) { bad.push(`${tag}: この学年の単元ではない`); continue; }
    const m = String(p.q).match(/^(\S+) ([+−×÷]) (\S+)$/);
    const A = m && parseNum(m[1]), B = m && parseNum(m[3]);
    if (!A || !B) { bad.push(`${tag}: 問題の形が読めない`); continue; }
    const right = OPS[m[2]](A, B);
    if (right[0] < 0n) bad.push(`${tag}: 答えがマイナス`);
    const ans = parseNum(String(p.a));
    if (!eq(ans, right)) { bad.push(`${tag}: 答えがちがう（正しくは ${show(right)}）`); continue; }
    if (typeof p.a === "number" && (/e/i.test(String(p.a)) || (String(p.a).split(".")[1] || "").length > 3))
      bad.push(`${tag}: 小数の表示がおかしい（計算誤差のおそれ）`);
    for (const t of [m[1], m[3]]) if (t.includes("/") && t !== show(parseNum(t))) bad.push(`${tag}: 問題の分数「${t}」が約分されていない`);
    if (p.unit === "decDivInt" && !m[1].includes(".")) bad.push(`${tag}: わられる数が小数になっていない`);
    if (/\./.test(p.q) && /\d\.\d*0(\s|$)/.test(p.q)) bad.push(`${tag}: 小数の末尾に0がある`);
    if (p.ch) {
      if (typeof p.a !== "string" || String(p.a) !== show(right)) bad.push(`${tag}: 約分されていない（${show(right)} のはず）`);
      if (!Array.isArray(p.ch) || p.ch.length !== 4) bad.push(`${tag}: 選択肢が4つない`);
      else {
        if (new Set(p.ch).size !== 4) bad.push(`${tag}: 選択肢が重複 [${p.ch}]`);
        if (!p.ch.includes(p.a)) bad.push(`${tag}: 選択肢に正解がない [${p.ch}]`);
        for (const c of p.ch) {
          const v = parseNum(c);
          if (!v || v[0] <= 0n) bad.push(`${tag}: 選択肢「${c}」がおかしい`);
          else if (c !== p.a && eq(v, right)) bad.push(`${tag}: 正解と同じ大きさの選択肢「${c}」がある`);
          else if (c.includes("/") && c !== show(v)) bad.push(`${tag}: 選択肢「${c}」が約分されていない`);
        }
      }
    } else if (/\//.test(String(p.a))) bad.push(`${tag}: 分数の答えなのに4択になっていない`);
    const rg = RANGE[p.unit], num = r => Number(r[0]) / Number(r[1]);
    if (rg && !rg(num(A), num(B), num(right))) bad.push(`${tag}: 数の大きさが単元の範囲外`);
  }
  for (const u of Object.keys(CALC.UNITS[g])) if (!units.has(u)) bad.push(`計算${g}年: 単元「${CALC.UNITS[g][u]}」が${TRIES}回で1回も出なかった`);
  const uniq = [...new Set(bad)];
  uniq.forEach(b => errors.push("✗ " + b));
  console.log(`計算 ${g}年：${TRIES}回 作成／単元 ${[...units].map(u => CALC.UNITS[g][u]).join("・")}／誤り ${uniq.length}件`);
}

/* ---------- 結果 ---------- */
console.log(`漢字よみ ${Q.kanji.length}問・県庁所在地 ${Q.kencho.length}問・英単語 ${Q.eigo.length}問・配当表 ${gradeOf.size}字`);
console.log(`漢字の配当誤り：${kanjiBad}件`);
warns.forEach(w => console.log("⚠ " + w));
errors.slice(0, 100).forEach(e => console.log(e));
if (errors.length > 100) console.log(`…ほか ${errors.length - 100}件`);
console.log(errors.length ? `\nエラー ${errors.length}件` : "\nエラー 0件（OK）");
process.exit(errors.length ? 1 : 0);
