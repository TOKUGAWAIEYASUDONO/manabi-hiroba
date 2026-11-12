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
const QZ = require("../data/quizlib.js");          // 読み《》の処理（plain = 読みを取り除いた本文）
const P = QZ.plain, yomiOf = s => QZ.rubyParts(s).map(p => (p.b != null ? p.r : p.t)).join("");
const root = path.join(__dirname, "..");
const ctx = { window: {} };
vm.createContext(ctx);
for (const f of ["data/kanji-grade.js", "data/questions.js", "data/calc.js", "data/choices.js"]) {
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


/* ---------- 県庁所在地：地方・ふりがな ---------- */
{
  const RG = Q.kenchoRegions || {}, cnt = {}, EXP = { hk: 1, th: 6, kt: 7, cb: 9, kn: 7, cg: 5, sk: 4, ky: 8 };
  for (const x of Q.kencho) {
    if (!RG[x.rg]) err(x.id, `地方(rg)「${x.rg}」が kenchoRegions にない`);
    cnt[x.rg] = (cnt[x.rg] || 0) + 1;
    if (!/^[ぁ-ん（）]+$/.test(x.r || "")) err(x.id, `読み(r)がひらがなでない：${x.r}`);
  }
  for (const k of Object.keys(EXP)) if (cnt[k] !== EXP[k]) err("地方", `${k} の県数が ${cnt[k]}（${EXP[k]} のはず）`);
  for (const k of Object.keys(RG)) if (new Set(RG[k].near).size !== 7 || RG[k].near.includes(k)) err("地方", `${k} の near が正しくない`);
  for (const x of Q.kencho) {                // 県名・県庁名の《》の読みが、読みデータ(r)と合っているか
    if (yomiOf(x.a) !== x.r) err(x.id, `答え「${x.a}」の《》の読みが r「${x.r}」と合わない`);
    if (!/《/.test(x.q) || P(x.q) === x.q) err(x.id, `県名「${x.q}」に読み《》がない`);
  }
  const diff = Q.kencho.filter(x => P(x.a).includes("（") || P(x.q).replace(/[都道府県]$/, "") !== P(x.a).replace(/市$/, ""));
  if (diff.length !== 19) err("県庁", `県名と市名がちがう県が ${diff.length}（19のはず）`);
}
/* ---------- やさしい文字：画面の文言の辞書（index.html の TX）---------- */
{
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8").split(String.fromCharCode(13)).join("");
  const m = html.match(/\/\*TX-BEGIN\*\/([\s\S]*?)\/\*TX-END\*\//);
  if (!m) err("TX", "index.html に文言の辞書が見つからない");
  else {
    const TX = vm.runInNewContext("(()=>{" + m[1] + ";return TX})()");
    let n = 0;
    for (const [k, e] of Object.entries(TX)) {
      if (e[1] == null) continue; n++;
      const probe = typeof e[1] === "function" ? e[1](..."abcde".split("").map((_, i) => i + 1)) : e[1];
      for (const c of String(probe)) if (isKanji(c) && gradeOf.get(c) !== 1) err("TX:" + k, `やさしい文字に1年で習わない漢字「${c}」`);
    }
    console.log(`やさしい文字の辞書：${n}件を検査`);
  }
}


/* ---------- 児童向け画面のコードに直接書いた文字（TX を通していないもの） ----------
   ホーム・学年えらび・九九／県庁のえらび・やさしい文字になる画面の関数から、${...} の中身とコメントを除き、
   残った文字に小1で習わない漢字がないか調べる（1〜2年に見せる画面。先生向けの画面は対象外） */
{
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8").split(String.fromCharCode(13)).join("");
  const strip = src => { let o = "", d = 0;
    for (let i = 0; i < src.length; i++) {
      if (src[i] === "$" && src[i + 1] === "{") { d = 1; i++; continue; }
      if (d) { if (src[i] === "{") d++; else if (src[i] === "}") d--; continue; }
      o += src[i];
    } return o; };
  for (const fn of ["renderHome", "renderRecord", "renderGradePick", "renderSetup", "renderModeSetup", "renderJoin", "lobbyView", "finish", "modeResult", "netResult", "startReview", "reviewDone", "qzSoloIntro", "qzSoloQ", "qzSoloAnswer", "qzSoloResult", "qzKidDraw", "qzKidEnd"]) {
    const a = html.indexOf("function " + fn + "(");
    if (a < 0) { err("画面", `${fn} が見つからない`); continue; }
    const z = html.indexOf("\n}\n", a), body = html.slice(a, z).replace(/const report=`[^`]*`;/g, "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|\s)\/\/[^\n]*/g, "$1");
    for (const ch of new Set(strip(body))) if (isKanji(ch) && gradeOf.get(ch) !== 1) err("画面:" + fn, `TX を通さず、小1で習わない漢字「${ch}」が書いてある`);
  }
}


/* ---------- 問題の量・確認状況・重複（content-1 で追加） ---------- */
{
  const MIN_KANJI = 40, MIN_EIGO = 60;
  for (let g = 1; g <= 6; g++) {
    const xs = Q.kanji.filter(x => x.g === g);
    if (xs.length < MIN_KANJI) err("漢字 " + g + "年", "問題が " + xs.length + " 問しかない（" + MIN_KANJI + " 問以上必要）");
    // 同じ読みの答えが2つあると、4択で正解が2つに見えることがある
    const ans = new Map();
    for (const x of xs) { if (ans.has(x.a)) err(x.id, "読み「" + x.a + "」が " + ans.get(x.a) + " と同じ（4択で正解が2つになるおそれ）"); else ans.set(x.a, x.id); }
  }
  if (Q.eigo.length < MIN_EIGO) err("英単語", "語が " + Q.eigo.length + " 語しかない（" + MIN_EIGO + " 語以上必要）");
  { const seenE = new Map();
    for (const x of Q.eigo) {
      const k = x.q.toLowerCase().trim();
      if (seenE.has(k)) err(x.id, "英単語「" + x.q + "」が " + seenE.get(k) + " と重複"); else seenE.set(k, x.id);
    }
    const ansE = new Map();
    for (const x of Q.eigo) { if (ansE.has(x.a)) err(x.id, "意味「" + x.a + "」が " + ansE.get(x.a) + " と同じ"); else ansE.set(x.a, x.id); }
    // 意味に使う漢字も、その学年までに習う字だけ
    for (const x of Q.eigo) if (/[一-龥]/.test(P(x.a)) && P(x.a) === x.a) err(x.id, "意味「" + x.a + "」に読み《》がない");
    for (const x of Q.eigo) for (const c of P(x.a)) if (isKanji(c)) {
      const cg = gradeOf.get(c);
      if (!cg || cg > x.g) err(x.id, "意味「" + x.a + "」の「" + c + "」は学年(" + x.g + "年)までに習わない字");
    }
    for (const x of Q.eigo) if (/^[A-Za-z. ]+$/.test(x.a)) err(x.id, "答え「" + x.a + "」が英字だけ（意味は日本語にする）");
    for (const x of Q.eigo) if (!/^[A-Za-z. ]+$/.test(x.q)) err(x.id, "英単語「" + x.q + "」に英字以外が入っている");
  }
  // reviewed：false = 人の確認待ち、ない／true = 確認済み
  const rv = { kanji: Q.kanji, 英単語: Q.eigo };
  for (const [name, arr] of Object.entries(rv)) {
    for (const x of arr) if ("reviewed" in x && typeof x.reviewed !== "boolean") err(x.id, "reviewed は true か false にする");
  }
  const cnt = a => { const w = a.filter(x => x.reviewed === false).length; return "確認済み " + (a.length - w) + "問／確認待ち " + w + "問"; };
  for (let g = 1; g <= 6; g++) console.log("漢字 " + g + "年：" + Q.kanji.filter(x => x.g === g).length + "問（" + cnt(Q.kanji.filter(x => x.g === g)) + "）");
  console.log("英単語：" + Q.eigo.length + "語（" + cnt(Q.eigo) + "）");
}

/* ---------- 4択の選択肢の質（消去法で当たらないこと） ---------- */
{
  const CH = ctx.window.MH_CHOICE, N = 1000;
  if (!CH) err("選択肢", "data/choices.js が読み込めない");
  else {
    const KINDS = ["food", "animal", "subject", "day", "month", "color", "sport", "job", "place", "feeling", "action", "season", "thing"];
    for (const x of Q.eigo) if (!KINDS.includes(x.c)) err(x.id, "種類(c)がない／正しくない：" + x.c);
    for (const G of [...new Set(Q.eigo.map(x => x.g))].sort()) {   // その学年で出せる語の中に、同じ種類が4語以上あること
      const pool = Q.eigo.filter(x => x.g <= G), cnt = {};
      for (const x of pool) cnt[x.c] = (cnt[x.c] || 0) + 1;
      for (const k of Object.keys(cnt)) if (cnt[k] < 4) err("英単語 " + G + "年", "種類「" + k + "」が " + cnt[k] + " 語しかない（4語以上で、同じ種類から4択が作れる）");
    }
    // 漢字よみ：正解との文字数の差の平均、送りがな付き問題の選択肢の送りがな率
    for (let g = 1; g <= 6; g++) {
      const list = Q.kanji.filter(x => x.g === g); let diff = 0, nd = 0, ok = 0, nok = 0, other = 0;
      for (let i = 0; i < N; i++) {
        const it = list[rnd(list.length)], ds = CH.kanji(Q.kanji, it, shuffle);
        if (ds.length !== 3 || new Set([it.a, ...ds]).size !== 4) { err(it.id, "4択がそろわない"); continue; }
        for (const d of ds) { diff += Math.abs([...d].length - [...it.a].length); nd++; if (!list.some(y => y.a === d)) other++; }
        if (CH.okuri(it.q)) for (const d of ds) { nok++; const o = Q.kanji.find(y => y.a === d); if (o && CH.okuri(o.q)) ok++; }
      }
      const avg = diff / nd, rate = nok ? ok / nok : 1;
      console.log(`漢字 ${g}年の4択：${N}回／文字数の差の平均 ${avg.toFixed(2)}／送りがな付きの問題で送りがな付きの選択肢 ${nok ? Math.round(rate * 100) + "%" : "（該当なし）"}`);
      if (avg > 1) err("漢字 " + g + "年", "選択肢の文字数の差の平均が " + avg.toFixed(2) + "（1以下にする）");
      if (rate < 0.8) err("漢字 " + g + "年", "送りがな付きの問題の選択肢で、送りがな付きが " + Math.round(rate * 100) + "%（80%以上にする）");
      console.log(`漢字 ${g}年の4択：他学年の読み ${Math.round(other / nd * 100)}%`);
      if (other / nd > 0.2) err("漢字 " + g + "年", "他学年の読みが " + Math.round(other / nd * 100) + "%（20%以下にする）");
    }
    // 英単語：選択肢が正解と同じ種類の割合
    for (const G of [...new Set(Q.eigo.map(x => x.g))].sort()) {
      const pool = Q.eigo.filter(x => x.g <= G); let same = 0, n = 0;
      for (let i = 0; i < N; i++) {
        const it = pool[rnd(pool.length)], ds = CH.eigo(pool, it, shuffle);
        if (ds.length !== 3) { err(it.id, "4択がそろわない"); continue; }
        for (const d of ds) { n++; const o = pool.find(y => y.a === d); if (o && o.c === it.c) same++; }
      }
      const rate = same / n;
      console.log(`英単語 ${G}年の4択：${N}回／正解と同じ種類の選択肢 ${Math.round(rate * 100)}%`);
      if (rate < 0.9) err("英単語 " + G + "年", "同じ種類の選択肢が " + Math.round(rate * 100) + "%（90%以上にする）");
    }
  }
}

/* ---------- 結果 ---------- */
console.log(`漢字よみ ${Q.kanji.length}問・県庁所在地 ${Q.kencho.length}問・英単語 ${Q.eigo.length}問・配当表 ${gradeOf.size}字`);
console.log(`漢字の配当誤り：${kanjiBad}件`);
warns.forEach(w => console.log("⚠ " + w));
errors.slice(0, 100).forEach(e => console.log(e));
if (errors.length > 100) console.log(`…ほか ${errors.length - 100}件`);
console.log(errors.length ? `\nエラー ${errors.length}件` : "\nエラー 0件（OK）");
process.exit(errors.length ? 1 : 0);
