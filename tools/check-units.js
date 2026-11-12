#!/usr/bin/env node
/* まなびひろば 単元ごとの問題の型（data/units.js・data/gen/*.js）の自動検査（Node.js 標準機能のみ）
   使い方：node tools/check-units.js          （各型を1,000回ずつ作る）
          node tools/check-units.js 200      （回数を変える）
   検査すること（1問ずつ）
   - 選択肢が4つ・重複なし・正解がちょうど1つ／テンキー答えの正規化（check）が正解だけを通す
   - 正解が計算で合っている（式が読める問題は、別の計算で検算。□や分数の等式も代入して確かめる）
   - 数の範囲：問題文と答えの数が、単元の max 以下
   - 問題文・選択肢・例題の漢字が、その単元の学年までの配当（data/kanji-grade.js）
   - 誤答が正解と同じ形・桁（単元に loose:true があるものは除く）
   - 同じシードなら同じ問題（再現性）
   単元ぜんたい：図が要る単元は status:"later"、UNIT_SETS の単元ID、unitPick（単元の組み合わせ・学年またぎ・等分・再現）
   エラーが1件でもあれば終了コード 1 */
const fs = require("fs"), path = require("path"), vm = require("vm");
const root = path.join(__dirname, "..");
const ctx = { window: {} };
vm.createContext(ctx);
const files = ["data/kanji-grade.js", "data/questions.js", "data/choices.js", "data/gen/core.js"];
for (const f of fs.readdirSync(path.join(root, "data/gen")).sort()) if (f !== "core.js" && f.endsWith(".js")) files.push("data/gen/" + f);
files.push("data/units.js");
for (const f of files) vm.runInContext(fs.readFileSync(path.join(root, f), "utf8"), ctx, { filename: f });
const W = ctx.window, GRADE = W.MH_KANJI_GRADE, G = W.MH_GEN, UN = W.MH_UNITS;
const P = W.MH_UNITS.plain;                              // 読み《》を取り除いた本文（正解の比較・計算の検算・漢字の配当検査は本文でする）
const N = Number(process.argv.slice(2).find(x => /^\d+$/.test(x))) || 1000;

const errors = [], warns = [];
const gradeOf = new Map();
for (const g of Object.keys(GRADE)) for (const c of GRADE[g]) gradeOf.set(c, +g);
const isHan = c => /\p{Script=Han}/u.test(c);
const unitErr = new Map();              // 単元ID → Set(メッセージ)
const err = (id, msg) => { if (!unitErr.has(id)) unitErr.set(id, new Set()); unitErr.get(id).add(msg); };

/* ---------- 検算用の有理数計算（BigInt） ---------- */
const bg = (a, b) => { a = a < 0n ? -a : a; b = b < 0n ? -b : b; while (b) [a, b] = [b, a % b]; return a || 1n; };
const R = (n, d = 1n) => { if (d < 0n) { n = -n; d = -d; } const k = bg(n, d); return [n / k, d / k]; };
const add = (a, b) => R(a[0] * b[1] + b[0] * a[1], a[1] * b[1]), sub = (a, b) => R(a[0] * b[1] - b[0] * a[1], a[1] * b[1]);
const mul = (a, b) => R(a[0] * b[0], a[1] * b[1]), div = (a, b) => (b[0] === 0n ? null : R(a[0] * b[1], a[1] * b[0]));
function num(s) {                       // 数の文字 → 有理数（"3/4" "1と2/5" "2.35" "12"）
  let m;
  if ((m = s.match(/^(\d+)と(\d+)\/(\d+)$/))) return add(R(BigInt(m[1])), R(BigInt(m[2]), BigInt(m[3])));
  if ((m = s.match(/^(\d+)\/(\d+)$/))) return R(BigInt(m[1]), BigInt(m[2]));
  if ((m = s.match(/^(\d+)(?:\.(\d+))?$/))) return R(BigInt(m[1] + (m[2] || "")), 10n ** BigInt((m[2] || "").length));
  return null;
}
const TOK = /\d+と\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?|[+−×÷()]/g;
function evalExpr(s) {                  // 式 → 有理数（読めなければ null）。×÷を先に、( ) を先に
  const t = s.match(TOK); if (!t || t.join("") !== s.replace(/\s/g, "")) return null;
  let i = 0;
  const atom = () => { const x = t[i++]; if (x === "(") { const v = expr(); i++; return v; } return num(x); };
  const term = () => { let v = atom(); while (t[i] === "×" || t[i] === "÷") { const o = t[i++], b = atom(); if (!v || !b) return null; v = o === "×" ? mul(v, b) : div(v, b); if (!v) return null; } return v; };
  const expr = () => { let v = term(); while (t[i] === "+" || t[i] === "−") { const o = t[i++], b = term(); if (!v || !b) return null; v = o === "+" ? add(v, b) : sub(v, b); } return v; };
  try { const v = expr(); return i === t.length ? v : null; } catch (e) { return null; }
}
const eq = (a, b) => a && b && a[0] === b[0] && a[1] === b[1];
// 答えの文字 → 有理数（"4あまり3" は商と余りに分けて返す）
function parseAns(a) { const m = a.match(/^(\d+)あまり(\d+)$/); return m ? { q: BigInt(m[1]), r: BigInt(m[2]) } : num(a); }

function verify(u, it) {                // 正しければ null、まちがいなら理由
  const q = it.q, a = it.a;
  if (q.includes("□") && / = /.test(q) && !/[あ-ん]/.test(q)) {
    const [L, Rr] = q.replace(/□/, a).split(" = "), l = evalExpr(L.trim()), r = evalExpr(Rr.trim());
    return l && r ? (eq(l, r) ? null : `□に ${a} を入れると 等しくない（${q}）`) : null;
  }
  const m = q.match(/^\d[\d\s.+−×÷()/と]*$/); if (!m) return null;
  const pa = parseAns(a);
  if (pa && pa.q !== undefined) {       // 商とあまり
    const t = q.match(/^(\d+) ÷ (\d+)$/); if (!t) return "あまり付きの答えなのに わり算の形でない";
    const n = BigInt(t[1]), d = BigInt(t[2]);
    return n / d === pa.q && n % d === pa.r && pa.r < d ? null : `${q} の商とあまりが ちがう（${a}）`;
  }
  const v = evalExpr(q); if (!v) return null;
  if (/あまり/.test(a)) return null;
  if (/^(\d+)あまり/.test(a)) return null;
  const pv = num(a); if (!pv) return null;
  // わり算で割り切れないのに あまりなしの答えは別扱い（4年のあまりなし単元は整数で割り切れる）
  return eq(v, pv) ? null : `${q} の答えは ${a} ではない`;
}

/* ---------- 検査本体 ---------- */
const defMax = { 1: 100, 2: 1000, 3: 100000, 4: 1e9, 5: 1e9, 6: 1e9 };
const sigOf = (s, loose) => G.sigOf(s, loose);
const stats = {};
const units = UN.UNITS, ready = units.filter(u => u.status === "ready"), later = units.filter(u => u.status === "later");
const idSeen = new Set();
const patternCounts = { estimate: 0, estimateMismatch: 0, estimateWrong: 0, time: 0, timeCross: 0, timeAfter: 0, mental: 0, mentalMinus: 0, place: new Set(), placeZero: 0, ordinal: new Set(), addMinus: 0 };
for (const u of units) {
  if (idSeen.has(u.id)) err(u.id, "IDが重複している"); idSeen.add(u.id);
  if (!/^[mjse]\d-[a-z0-9-]+$/.test(u.id)) err(u.id, "IDの形式がおかしい");
  if (!(u.g >= 1 && u.g <= 6)) err(u.id, "学年がおかしい");
  if (u.subj === "sansu" && !/^[ABCD]$/.test(u.area)) err(u.id, "領域(area)が A〜D でない");
  if (!u.base) err(u.id, "学習指導要領の根拠メモ(base)が空");
  if (!u.item) err(u.id, "学習項目タグ(item)が空");
  if (u.status === "ready" && !u.ex) err(u.id, "例題(ex)が空");
  if (u.status === "ready" && u.ex && u.ex.split("\n").length > 3) err(u.id, "例題が4行以上");
  if (u.status === "ready" && u.ex && (u.subj === "sansu" || u.subj === "kokugo")) {
    for (const c of u.ex) if (isHan(c)) { const cg = gradeOf.get(c); if (!cg) err(u.id, `例題の「${c}」は配当表にない`); else if (cg > u.g) err(u.id, `例題の「${c}」は${cg}年の漢字（この単元は${u.g}年）`); }
  }
  if (u.status === "ready" && !["choice4", "num", "amari", "dec", "frac", "unit"].includes(u.ans)) err(u.id, `答え方(ans)「${u.ans}」がおかしい`);
}

for (const u of ready) {
  const mx = u.max || defMax[u.g], loose = !!(u.params && u.params.loose), qs = new Set(), modes = new Set();
  let n = 0;
  for (let i = 0; i < N; i++) {
    let it, it2, raw;
    try { it = UN.make(u, `chk|${u.id}|${i}`); it2 = UN.make(u, `chk|${u.id}|${i}`); } catch (e) { err(u.id, "作成に失敗: " + e.message); break; }
    raw = it; n++; qs.add(it.q + "|" + (it.stem || "") + "|" + [...it.choices].sort().join(",")); modes.add(it.ans);
    const tag = `「${it.q}」`;
    if (JSON.stringify(it) !== JSON.stringify(it2)) err(u.id, `同じシードで結果がちがう ${tag}`);
    let ch = it.choices;
    if (!Array.isArray(ch) || ch.length !== 4) { err(u.id, `選択肢が4つない ${tag}`); continue; }
    if (new Set(ch).size !== 4) err(u.id, `選択肢が重複 ${tag} [${ch}]`);
    if (ch.filter(c => c === it.a).length !== 1) err(u.id, `正解が選択肢に1つだけ入っていない ${tag} [${ch}] 正解${it.a}`);
    if (!["choice4", "num", "amari", "dec", "frac", "unit"].includes(it.ans)) err(u.id, `ans「${it.ans}」がおかしい`);
    if (!UN.check(it, it.ans === "choice4" ? it.a : it.a)) err(u.id, `check が正解を通さない ${tag} 正解${it.a}`);
    if (it.ans !== "choice4") {
      const vals = new Set([it.val]);
      for (const c of ch) if (c !== it.a) {
        if (UN.check(it, c)) err(u.id, `check が誤答「${c}」を通してしまう ${tag}`);
        const cv = UN.canon(it.ans, c);
        if (cv === null) err(u.id, `選択肢「${c}」が答え方(${it.ans})の形でない ${tag}`);
        else if (vals.has(cv)) err(u.id, `選択肢「${c}」が他と同じ値 ${tag}`); else vals.add(cv);
      }
    }
    it = { ...it, q: P(it.q), a: P(it.a), stem: it.stem && P(it.stem) }; ch = ch.map(P);   // ここから先は読みを取り除いた本文で検査
    if (u.id === "m4-wari-mitsumori") {
      const m = it.q.match(/(\d+) ÷ (\d+) の 商/);
      if (!m) err(u.id, `式が読めない ${tag}`);
      else { const actual = Math.floor(+m[1] / +m[2]); patternCounts.estimate++;
        if (actual !== +it.a) patternCounts.estimateMismatch++;
        if (ch.some(c => c !== it.a && +c === actual)) patternCounts.estimateWrong++;
      }
    }
    if (u.id === "m3-jikan-keisan") { patternCounts.time++; if (/分(?:後|前)/.test(it.q)) patternCounts.timeAfter++; else { const tm = it.q.match(/(\d+)時\d+分から\s*(\d+)時/); if (tm && tm[1] !== tm[2]) patternCounts.timeCross++; } }
    if (u.id === "m3-anzan") { patternCounts.mental++; if (/−/.test(it.q)) patternCounts.mentalMinus++; if (!/^\d{2} [＋+−] \d{2}$/.test(it.q)) err(u.id, `2けた±2けたでない ${tag}`); }
    if (u.id === "m5-seisu-shosu") { patternCounts.place.add(it.q.match(/(100倍|10倍|1\/100|1\/10)/)?.[0]); if (/\d+\.\d*0(?:\D|$)/.test(it.q + " " + it.a)) patternCounts.placeZero++; }
    if (u.id === "m1-nanbanme") patternCounts.ordinal.add(it.q.replace(/\d+/g, "#"));
    if (u.id === "m1-add-2keta" && /−/.test(it.q)) patternCounts.addMinus++;
    if (u.subj === "sansu") {
      const why = verify(u, it); if (why) err(u.id, "答えがまちがい：" + why);
      // 分数：誤答が正解と同じ大きさ（見かけだけちがう）にならない（約分の練習だけ例外）
      if (it.ans === "frac" || /\//.test(it.a)) for (const c of ch) if (c !== it.a) { const x = num(c), y = num(it.a); if (x && y && eq(x, y) && !/yakubun|shosu/i.test(u.gen)) err(u.id, `正解と同じ大きさの選択肢「${c}」 ${tag}`); }
      // 数の範囲
      for (const s of [it.q, it.a]) for (const t of s.match(/\d+(?:\.\d+)?/g) || []) if (Number(t) > mx) err(u.id, `数 ${t} が単元の上限 ${mx} をこえる ${tag}`);
      // 漢字
      for (const s of [it.q, it.a, ...ch, it.stem || ""]) for (const c of s) if (isHan(c)) {
        const cg = gradeOf.get(c);
        if (!cg) err(u.id, `「${c}」は配当表にない ${tag}`); else if (cg > u.g) err(u.id, `「${c}」は${cg}年の漢字（この単元は${u.g}年）`);
      }
      // 誤答の形・桁
      if (!loose && /\d/.test(it.a)) { const want = sigOf(it.a, false); for (const c of ch) if (sigOf(c, false) !== want) { err(u.id, `誤答「${c}」が正解「${it.a}」と形・桁がちがう`); break; } }
      if (/NaN|undefined|Infinity|-\d/.test(it.q + ch.join(""))) err(u.id, `NaN・負の数・undefined が出ている ${tag}`);
    } else if (u.subj === "kokugo") {
      for (const c of it.q) if (isHan(c)) { const cg = gradeOf.get(c); if (!cg || cg > u.g) err(u.id, `「${c}」が${u.g}年より上の漢字`); }
      if (!/^[ぁ-ゖー]+$/.test(it.a)) err(u.id, "読みがひらがなでない");
      for (const c of it.stem) if (isHan(c)) { const cg = gradeOf.get(c); if (!cg || cg > u.g) err(u.id, `ステム「${it.stem}」の「${c}」が${u.g}年より上`); }
    } else if (u.subj === "shakai") {
      for (const c of it.q) if (isHan(c)) { const cg = gradeOf.get(c); if (!cg || cg > u.g) err(u.id, `「${c}」が${u.g}年より上の漢字`); }
      for (const c of raw.choices) if (!/《/.test(c)) err(u.id, `選択肢「${c}」にふりがな《》がない`);
    }
  }
  const row = (stats[`${u.subj}${u.g}`] = stats[`${u.subj}${u.g}`] || { units: 0, made: 0 }); row.units++; row.made += n;
  if (u.subj === "sansu" && qs.size < 8) warns.push(`${u.id}: ${n}回で問題が ${qs.size} 種類しか出ない（少なめ）`);
  if (modes.size > 1 && !(modes.size === 2 && modes.has("choice4") && modes.has("num"))) warns.push(`${u.id}: 答え方が問題ごとにちがう [${[...modes]}]`);
  if (u.gen && u.ans !== "choice4" && !modes.has(u.ans)) err(u.id, `単元の答え方(${u.ans})と実際(${[...modes]})がちがう`);
}
if (patternCounts.estimateMismatch || patternCounts.estimateWrong) err("m4-wari-mitsumori", `本当の商と正解の不一致 ${patternCounts.estimateMismatch}件／本当の商が誤答 ${patternCounts.estimateWrong}件`);
if (patternCounts.time && (patternCounts.timeCross + patternCounts.timeAfter) / patternCounts.time < 0.5) err("m3-jikan-keisan", "時をまたぐ問題・分後／分前が5割未満");
if (patternCounts.mental && patternCounts.mentalMinus / patternCounts.mental < 0.4) err("m3-anzan", "ひき算が4割未満");
if (patternCounts.place.size < 4 || patternCounts.placeZero) err("m5-seisu-shosu", `4種類不足または末尾0 ${patternCounts.placeZero}件`);
if (N >= 30 && patternCounts.ordinal.size < 3) err("m1-nanbanme", "問題の型が3種類未満");
if (patternCounts.addMinus) err("m1-add-2keta", "たしざん単元にひき算がある");
console.log(`単元別検査：見積もり ${patternCounts.estimate}問・本当の商が誤答 ${patternCounts.estimateWrong}件／時刻の時またぎ・分後 ${patternCounts.timeCross + patternCounts.timeAfter}/${patternCounts.time}／暗算のひき算 ${patternCounts.mentalMinus}/${patternCounts.mental}`);
console.log(`型の内訳：時こくと時間 ${patternCounts.timeCross + patternCounts.timeAfter}/${patternCounts.time}（${patternCounts.time ? Math.round(100 * (patternCounts.timeCross + patternCounts.timeAfter) / patternCounts.time) : 0}%）／あんざん・ひき算 ${patternCounts.mentalMinus}/${patternCounts.mental}（${patternCounts.mental ? Math.round(100 * patternCounts.mentalMinus / patternCounts.mental) : 0}%）／整数と小数 ${patternCounts.place.size}種類・末尾0 ${patternCounts.placeZero}件／なんばんめ ${patternCounts.ordinal.size}種類／1年たしざん・ひき算 ${patternCounts.addMinus}件`);

/* ---------- 単元の並び・段階・おすすめ・later ---------- */
const seriesSteps = {};
for (const u of units) if (u.series) (seriesSteps[u.series] = seriesSteps[u.series] || []).push(u);
for (const [s, us] of Object.entries(seriesSteps)) for (const u of us) { if (!Number.isInteger(u.step)) err(u.id, `series「${s}」の step が整数でない`); if (!u.stepLabel) err(u.id, "stepLabel が空"); }
for (const u of later) if (u.gen) err(u.id, "later なのに gen がある");
for (const s of UN.UNIT_SETS) { if (!s.title || !s.units.length) err("UNIT_SETS", `${s.id} が空`); for (const id of s.units) if (!UN.byId[id]) err("UNIT_SETS", `${s.id}: 単元「${id}」がない`); else if (UN.byId[id].status !== "ready") err("UNIT_SETS", `${s.id}: 単元「${id}」は後回し(later)`); }
if (new Set(UN.UNIT_SETS.map(s => s.id)).size !== UN.UNIT_SETS.length) err("UNIT_SETS", "IDが重複");

/* ---------- unitPick（組み合わせ） ---------- */
const rnd = (() => { let s = 20261111; return n => { s = (s * 1103515245 + 12345) % 2147483648; return Math.floor(s / 2147483648 * n); }; })();
let pickRuns = 0;
const pickCheck = (ids, n, seed, mix, label) => {
  pickRuns++;
  let a, b;
  try { a = UN.unitPick(ids, n, seed, mix); b = UN.unitPick(ids, n, seed, mix); } catch (e) { err("unitPick", `${label}: 例外 ${e.message}`); return; }
  if (JSON.stringify(a) !== JSON.stringify(b)) err("unitPick", `${label}: 同じシードで結果がちがう`);
  if (a.length !== n) err("unitPick", `${label}: ${n}問のはずが ${a.length}問`);
  const cnt = {}; for (const it of a) cnt[it.unit] = (cnt[it.unit] || 0) + 1;
  const uniq = [...new Set(ids)].filter(i => UN.byId[i] && UN.byId[i].status === "ready"), lo = Math.floor(n / uniq.length), hi = Math.ceil(n / uniq.length);
  for (const id of uniq) if (!((cnt[id] || 0) >= lo && (cnt[id] || 0) <= hi)) err("unitPick", `${label}: 単元 ${id} が ${cnt[id] || 0}問（等分は ${lo}〜${hi}）`);
  for (const it of a) { if (it.choices.length !== 4 || new Set(it.choices).size !== 4 || !it.choices.includes(it.a)) err("unitPick", `${label}: 選択肢がおかしい ${it.q}`); }
  if (mix === false) { const order = a.map(i => i.unit).filter((x, i, arr) => arr.indexOf(x) === i); if (JSON.stringify(order) !== JSON.stringify(uniq.filter(x => cnt[x]))) err("unitPick", `${label}: mix=false なのに単元順でない`); }
  return a;
};
const readyIds = ready.map(u => u.id);
for (const s of UN.UNIT_SETS) for (const n of [10, 20, 30]) for (const mix of [true, false]) pickCheck(s.units, n, `set|${s.id}|${n}`, mix, `UNIT_SETS ${s.id} n=${n} mix=${mix}`);
for (let i = 0; i < 300; i++) {                         // ランダムな組み合わせ（学年・教科またぎ）
  const k = 1 + rnd(5), ids = Array.from({ length: k }, () => readyIds[rnd(readyIds.length)]), n = 1 + rnd(30);
  pickCheck(ids, n, "r" + i, rnd(2) === 0, `random ${ids.join(",")} n=${n}`);
}
pickCheck(["m3-wari99", "m4-menseki", "j3-kanji-yomi", "e5-food", "s4-kencho-kn"], 20, "mix5", true, "教科またぎ5単元");
pickCheck(readyIds, 100, "all", true, "全単元");
if (UN.unitPick([], 10, 1).length !== 0) err("unitPick", "空の単元で問題が出た");
if (UN.unitPick(["m3-wari99", "m3-wari99"], 6, 1).length !== 6) err("unitPick", "同じ単元を2回指定したときの数が合わない");
// 学年またぎ（3年と6年）が両方出る
const cross = UN.unitPick(["m3-amari", "m6-bunsu-kake"], 10, "x", true);
if (!(cross.some(i => i.g === 3) && cross.some(i => i.g === 6))) err("unitPick", "3年と6年の単元を組み合わせたのに両方出ない");

/* ---------- 集計・出力 ---------- */
for (const [id, set] of unitErr) for (const m of set) errors.push(`✗ ${id}: ${m}`);
const bySubj = {};
for (const u of units) { const k = `${u.subj}`; (bySubj[k] = bySubj[k] || {})[u.g] = (bySubj[k][u.g] || 0) + 1; }
const nm = { sansu: "算数", kokugo: "国語", shakai: "社会", eigo: "英語" };
console.log(`単元 ${units.length}（出せる ${ready.length}／あとで ${later.length}）／各型 ${N} 回ずつ作成`);
for (const [s, o] of Object.entries(bySubj)) console.log(`  ${nm[s]}：${Object.keys(o).sort().map(g => `${g}年 ${o[g]}`).join("／")}（計 ${Object.values(o).reduce((a, b) => a + b, 0)}）`);
console.log(`  算数で出せる単元：${ready.filter(u => u.subj === "sansu").length}／おすすめセット ${UN.UNIT_SETS.length}／unitPick の検査 ${pickRuns} 通り`);
// 単元ごとに、同じ種類のメッセージは数字をそろえてまとめ、先頭の数件だけ見せる（--all で全部）
const all = process.argv.includes("--all");
for (const [id, set] of unitErr) {
  const ms = [...set], shown = all ? ms : ms.slice(0, 3);
  shown.forEach(m => console.log(`✗ ${id}: ${m}`));
  if (ms.length > shown.length) console.log(`  …${id} はほか ${ms.length - shown.length} 種類`);
}
warns.forEach(w => console.log("△ " + w));
console.log(`\nエラー ${errors.length} 件／注意 ${warns.length} 件`);
if (errors.length) process.exit(1);
