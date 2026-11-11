#!/usr/bin/env node
/* まなびひろば ふりがな（読み《》）の自動検査（Node.js 標準機能のみ）
   使い方：node tools/check-furigana.js          （各型を1,000回ずつ作る）
          node tools/check-furigana.js 200      （回数を変える）
          node tools/check-furigana.js --all    （まちがいを全部表示）
   児童に表示される文字列の中に、読みの付いていない漢字（裸の漢字）が残っていないかを数える。エラーが1件でもあれば終了コード 1。
   検査する欄
   - 単元：title・note・ex・stepLabel、UNIT_SETS の title（item・base・area・series は先生向けの分類名なので対象外）
   - 単元の問題（ready の全単元を N 回ずつ）：q・a・choices・stem   ※「漢字の読み」の q（問われている漢字）は対象外
   - 問題データ：県庁（q・a）、英単語（a）、漢字よみ（a は かな。q は対象外）
   - 計算：MH_CALC.UNITS の名前、MH_CALC.make の q・a・ch・small（学年ごとに N 回）
   ほかに確かめること
   - 読みがひらがな・カタカナ・長音だけ／《》が対応している
   - 漢字よみの q（問われている漢字）に《》が付いていない（答えがばれない）
   - 読みを取り除いた本文（plain）が、元の本文と同じ（読みを付けただけで文字が変わっていない） */
const fs = require("fs"), path = require("path"), vm = require("vm");
const QZ = require("../data/quizlib.js");
const root = path.join(__dirname, "..");
const ctx = { window: {} };
vm.createContext(ctx);
const files = ["data/kanji-grade.js", "data/questions.js", "data/calc.js", "data/choices.js", "data/gen/core.js"];
for (const f of fs.readdirSync(path.join(root, "data/gen")).sort()) if (f !== "core.js" && f.endsWith(".js")) files.push("data/gen/" + f);
files.push("data/units.js");
for (const f of files) vm.runInContext(fs.readFileSync(path.join(root, f), "utf8"), ctx, { filename: f });
const W = ctx.window, UN = W.MH_UNITS, Q = W.MH_QUESTIONS, CALC = W.MH_CALC;
const N = Number(process.argv.slice(2).find(x => /^\d+$/.test(x))) || 1000;
const ALL = process.argv.includes("--all");
const HAN = /[㐀-䶿一-鿿豈-﫿々〆〇ヶ]/u;

const bad = new Map();            // 「欄 : 本文」→ 裸の漢字
let checked = 0, rubies = 0;
const seen = new Set();
function check(where, s, o) {
  if (s == null) return;
  s = String(s);
  const key = where + "\u0000" + s;
  if (seen.has(key)) return; seen.add(key);
  checked++;
  const parts = QZ.rubyParts(s);
  const left = [];
  for (const p of parts) {
    if (p.b != null) {
      rubies++;
      if (!/^[ぁ-ゖァ-ヶー]+$/.test(p.r)) bad.set(`${where}: 「${s}」`, `読み「${p.r}」がかなだけでない`);
    } else for (const c of p.t) if (HAN.test(c)) left.push(c);
  }
  if (/[《》]/.test(QZ.plain(s))) bad.set(`${where}: 「${s}」`, "《》が対応していない");
  if (o && o.noRuby) { if (parts.some(p => p.b != null)) bad.set(`${where}: 「${s}」`, "問われている漢字に読みが付いている（答えになる）"); return; }
  if (left.length) bad.set(`${where}: 「${s}」`, `読みのない漢字「${[...new Set(left)].join("")}」`);
}

/* ---------- 単元の文字 ---------- */
for (const u of UN.UNITS) {
  for (const k of ["title", "note", "ex", "stepLabel"]) check(`単元 ${u.id}.${k}`, u[k]);
}
for (const s of UN.UNIT_SETS) check(`UNIT_SETS ${s.id}.title`, s.title);

/* ---------- 単元の問題 ---------- */
for (const u of UN.UNITS.filter(x => x.status === "ready")) {
  for (let i = 0; i < N; i++) {
    let it;
    try { it = UN.make(u, `fg|${u.id}|${i}`); } catch (e) { bad.set(`作成に失敗 ${u.id}`, e.message); break; }
    const kq = u.gen === "kanjiYomi";               // 漢字よみの q は「問われている漢字」
    check(`問題 ${u.id}.q`, it.q, { noRuby: kq });
    if (kq) check(`問題 ${u.id}.q(漢字)`, it.q, { noRuby: true });
    check(`問題 ${u.id}.a`, it.a); for (const c of it.choices) check(`問題 ${u.id}.choices`, c); if (it.stem) check(`問題 ${u.id}.stem`, it.stem);
    if (kq) { if (HAN.test(it.q) === false) bad.set(`問題 ${u.id}.q`, `「${it.q}」に漢字がない`); }
  }
}

/* ---------- 問題データ ---------- */
for (const x of Q.kencho) { check(`県庁 ${x.id}.q`, x.q); check(`県庁 ${x.id}.a`, x.a); }
for (const x of Q.eigo) { check(`英単語 ${x.id}.a`, x.a); check(`英単語 ${x.id}.q`, x.q); }
for (const x of Q.kanji) { check(`漢字よみ ${x.id}.q`, x.q, { noRuby: true }); check(`漢字よみ ${x.id}.a`, x.a); }

/* ---------- 計算 ---------- */
for (const g of Object.keys(CALC.UNITS)) for (const k of Object.keys(CALC.UNITS[g])) check(`計算 ${g}年 ${k}（単元名）`, CALC.UNITS[g][k]);
let seed = 4242; const rnd = n => { seed = (seed * 1103515245 + 12345) % 2147483648; return Math.floor(seed / 2147483648 * n); };
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
for (let g = 1; g <= 6; g++) for (let i = 0; i < N; i++) {
  const p = CALC.make(g, rnd, shuffle);
  check(`計算 ${g}年.q`, p.q); check(`計算 ${g}年.small`, p.small); check(`計算 ${g}年.a`, p.a);
  if (p.ch) for (const c of p.ch) check(`計算 ${g}年.ch`, c);
}

/* ---------- ふりがな付けの自己検査（data/gen/core.js の ruby／plain） ---------- */
{
  const G = W.MH_GEN;
  const want = { "3人": "3人《にん》", "1人": "｜1人《ひとり》", "2人": "｜2人《ふたり》", "4人": "｜4人《よにん》", "2日": "｜2日《ふつか》", "7日": "｜7日《なのか》", "14日": "｜14日《じゅうよっか》", "10分": "10分《ぷん》", "5分": "5分《ふん》",
    "4時": "｜4時《よじ》", "7時": "｜7時《しちじ》", "9時": "｜9時《くじ》", "1週間": "｜1週間《いっしゅうかん》", "8点": "｜8点《はってん》", "10点": "｜10点《じゅってん》", "6回": "｜6回《ろっかい》", "1通り": "｜1通り《ひととおり》", "3通り": "3通《とお》り", "6角形": "｜6角形《ろっかくけい》", "4年": "｜4年《よねん》", "180度": "180度《ど》" };
  for (const [k, v] of Object.entries(want)) if (G.ruby(k) !== v) bad.set(`自己検査 ruby("${k}")`, `「${G.ruby(k)}」（${v} のはず）`);
  for (const s of ["何人", "三角形の面積", "大きい数", "県庁所在地", "一日"]) {
    const r = G.ruby(s);
    if (G.plain(r) !== s) bad.set(`自己検査 plain(ruby("${s}"))`, `「${G.plain(r)}」`);
    if (G.ruby(r) !== r) bad.set(`自己検査 ruby が二重に付く "${s}"`, r);
    if (QZ.plain(r) !== G.plain(r)) bad.set(`自己検査 quizlib の plain とちがう "${s}"`, r);
  }
  // 作った問題の文字は、読みを付け直しても変わらない（二重に付かない）／plain が quizlib と同じ
  for (const u of UN.UNITS.filter(x => x.status === "ready")) for (let i = 0; i < Math.min(N, 100); i++) {
    const it = UN.make(u, `fg2|${u.id}|${i}`);
    for (const s of [it.q, it.a, ...it.choices, it.stem || ""]) {
      if (u.gen === "kanjiYomi" && s === it.q) continue;
      if (G.ruby(s) !== s) { bad.set(`二重 ${u.id}`, `「${s}」→「${G.ruby(s)}」`); break; }
      if (QZ.plain(s) !== G.plain(s)) { bad.set(`plain不一致 ${u.id}`, s); break; }
    }
  }
}

/* ---------- 結果 ---------- */
const list = [...bad.entries()];
console.log(`ふりがな検査：${checked} 種類の文字列（読み《》 ${rubies} か所）／各型 ${N} 回ずつ作成`);
const bySrc = {};
for (const [k, v] of list) { const w = k.split(":")[0].replace(/\s.*$/, ""); (bySrc[w] = bySrc[w] || []).push([k, v]); }
let shown = 0;
for (const [k, v] of list) { if (!ALL && shown >= 40) break; console.log(`✗ ${k} → ${v}`); shown++; }
if (!ALL && list.length > shown) console.log(`  …ほか ${list.length - shown} 件（--all で全部）`);
console.log(list.length ? `\nエラー ${list.length} 件` : "\nエラー 0 件（OK）");
process.exit(list.length ? 1 : 0);
