#!/usr/bin/env node
/* まなびひろば 画面の文言のふりがな検査（Node.js 標準機能のみ）
   使い方：node tools/check-furigana-ui.js [--list]
   index.html の中の「児童が見る文言」に、読みの付いていない漢字が残っていないかを数える。
   （問題データ側は tools/check-furigana.js が別に検査する）

   検査する場所
   1. 文言の表 TX のふつう側・やさしい側（関数の文言は、数字を入れて呼び出した結果）
   2. index.html の <script> の中の、文字列・テンプレートの文字（${…} の外）
   検査しない場所（先生向けの画面など）
   - T-BEGIN と T-END の印（スラッシュ＋アスタリスクのコメント）で囲んだ範囲、行末に //T と書いた行
   - TX のうち EXEMPT に書いたキー（先生・ICT担当向け）
   - コメント、正規表現、HTML のタグの中の属性名（読みを付ける文字ではない）
   OK の形：漢字の連なりの直後に《よみ》が付いている（例：先生《せんせい》、｜漢字かな《よみ》）
   エラーが1件でもあれば終了コード 1 */
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const root = path.join(__dirname, "..");
const KAN = "\\u3400-\\u4dbf\\u4e00-\\u9fff\\uf900-\\ufaff々〆ヶ";
const KRUN = new RegExp("[" + KAN + "]+", "g");
const EXEMPT = new Set(["home.check"]);          // TX のうち、先生・ICT担当だけが見るもの

/* ---------- JavaScript の文字列・テンプレートを取り出す（簡易の字句解析） ---------- */
function scanJs(src) {
  const lits = [], marks = [], tLines = new Set();
  let i = 0, line = 1, prev = "", prevWord = "";
  const stack = [];            // テンプレートの ${ に入ったときの { の深さ
  let depth = 0, tpl = null;   // tpl：いまのテンプレートの文字
  const isWord = c => /[A-Za-z0-9_$]/.test(c);
  const REGEX_AFTER = new Set(["return", "typeof", "case", "in", "of", "else", "do", "void", "delete", "new", "throw"]);
  const push = (kind, text, start, ln) => lits.push({ kind, text, start, line: ln });
  const nl = s => { for (const c of s) if (c === "\n") line++; };
  while (i < src.length) {
    const c = src[i], n = src[i + 1];
    if (c === "\n") { line++; i++; continue; }
    if (tpl && !tpl.inExpr) {            // テンプレートの文字の途中
      if (c === "\\") { tpl.text += c + (n || ""); if (n === "\n") line++; i += 2; continue; }
      if (c === "`") { push("tpl", tpl.text, tpl.start, tpl.line); tpl = tpl.up; prev = "`"; prevWord = ""; i++; continue; }
      if (c === "$" && n === "{") { push("tpl", tpl.text, tpl.start, tpl.line); tpl.text = ""; tpl.start = i + 2; tpl.line = line; stack.push({ tpl, depth }); depth = 0; tpl.inExpr = true; tpl = null; i += 2; prev = "{"; continue; }
      tpl.text += c; i++; continue;
    }
    if (c === "/" && n === "/") {
      let e = src.indexOf("\n", i); if (e < 0) e = src.length;
      const body = src.slice(i + 2, e);
      if (/^T(\s|$)/.test(body)) tLines.add(line);
      i = e; continue;
    }
    if (c === "/" && n === "*") {
      let e = src.indexOf("*/", i + 2); if (e < 0) e = src.length;
      const body = src.slice(i + 2, e);
      if (/^T-BEGIN/.test(body)) marks.push({ pos: i, on: true });
      else if (/^T-END/.test(body)) marks.push({ pos: i, on: false });
      nl(src.slice(i, e + 2)); i = e + 2; continue;
    }
    if (c === '"' || c === "'") {
      const st = i, ln = line; i++; let t = "";
      while (i < src.length && src[i] !== c) { if (src[i] === "\\") { t += src[i] + (src[i + 1] || ""); i += 2; continue; } if (src[i] === "\n") break; t += src[i++]; }
      i++; push("str", t, st + 1, ln); prev = c; prevWord = ""; continue;
    }
    if (c === "`") { tpl = { text: "", start: i + 1, line, up: tpl, inExpr: false }; i++; continue; }
    if (c === "/") {                   // 正規表現か割り算か
      const re = prev === "" || "(,=:[!&|?{};+-*%<>~^".includes(prev) || REGEX_AFTER.has(prevWord);
      if (re) {
        i++; let cls = false;
        while (i < src.length) { const d = src[i]; if (d === "\\") { i += 2; continue; } if (d === "[") cls = true; else if (d === "]") cls = false; else if (d === "/" && !cls) break; else if (d === "\n") break; i++; }
        i++; while (i < src.length && /[a-z]/.test(src[i])) i++;
        prev = "/"; prevWord = ""; continue;
      }
    }
    if (c === "{") { if (stack.length) depth++; prev = c; prevWord = ""; i++; continue; }
    if (c === "}") {
      if (stack.length && depth === 0) { const s = stack.pop(); tpl = s.tpl; depth = s.depth; tpl.inExpr = false; tpl.text = ""; tpl.start = i + 1; tpl.line = line; i++; continue; }
      if (stack.length) depth--;
      prev = c; prevWord = ""; i++; continue;
    }
    if (isWord(c)) { let j = i; while (j < src.length && isWord(src[j])) j++; prevWord = src.slice(i, j); prev = "a"; i = j; continue; }
    if (!/\s/.test(c)) { prev = c; prevWord = ""; }
    i++;
  }
  return { lits, marks, tLines };
}
const inT = (marks, pos) => { let on = false; for (const m of marks) { if (m.pos > pos) break; on = m.on; } return on; };

/* ---------- 読みの付いていない漢字を探す ---------- */
function bare(text) {            // 読みの付いていない漢字の連なりを返す
  const out = [];
  KRUN.lastIndex = 0; let m;
  while ((m = KRUN.exec(text))) {
    const after = text.slice(m.index + m[0].length, m.index + m[0].length + 1);
    if (after === "《") continue;
    out.push({ w: m[0], at: m.index });
  }
  return out;
}
function badYomi(text) {         // 《…》の中が、かな以外のとき
  const out = []; const re = /《([^《》\n]*)》/g; let m;
  while ((m = re.exec(text))) if (!/^[ぁ-ゖァ-ヺーー]+$/.test(m[1])) out.push(m[1]);
  return out;
}

function run(opts) {
  opts = opts || {};
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8").replace(/\r/g, "");
  const errors = [], seen = new Set();
  const err = (where, w, ctx) => { errors.push(`✗ ${where}: 「${w}」に読みがない　${ctx}`); };
  let nTx = 0, nLit = 0, nRuns = 0;
  /* 1. TX */
  const m = html.match(/\/\*TX-BEGIN\*\/([\s\S]*?)\/\*TX-END\*\//);
  if (!m) errors.push("✗ TX: index.html に文言の辞書が見つからない");
  else {
    const TX = vm.runInNewContext("(()=>{" + m[1] + ";return TX})()");
    for (const [k, e] of Object.entries(TX)) {
      if (EXEMPT.has(k)) continue;
      for (let side = 0; side < e.length; side++) {
        const v = e[side]; if (v == null) continue;
        const probes = typeof v === "function" ? [v(1, 2, 3), v("あ", "い", "う")] : [v];
        for (const p of probes) {
          const s = String(p); nTx++;
          for (const b of bare(s)) { nRuns++; err(`TX:${k}[${side}]`, b.w, s.slice(Math.max(0, b.at - 8), b.at + b.w.length + 8)); }
          for (const y of badYomi(s)) err(`TX:${k}[${side}]`, y, "読みにかな以外がある");
        }
      }
    }
  }
  /* 2. script の中の文字 */
  const sm = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].sort((a, b) => b[1].length - a[1].length)[0];
  if (sm) {
    const src = sm[1], txA = src.indexOf("/*TX-BEGIN*/"), txZ = src.indexOf("/*TX-END*/");
    const base = html.slice(0, sm.index).split("\n").length - 1;
    const { lits, marks, tLines } = scanJs(src);
    for (const L of lits) {
      if (L.start >= txA && L.start <= txZ) continue;            // TX は上で調べた
      if (!/[㐀-鿿々〆ヶ]/.test(L.text)) continue;
      const lastLine = L.line + (L.text.match(/\n/g) || []).length;
      if (inT(marks, L.start) || tLines.has(L.line) || tLines.has(lastLine)) continue;
      nLit++;
      for (const b of bare(L.text)) { nRuns++; err(`行${base + L.line}`, b.w, L.text.slice(Math.max(0, b.at - 8), b.at + b.w.length + 8).replace(/\n/g, " ")); }
      for (const y of badYomi(L.text)) err(`行${base + L.line}`, y, "読みにかな以外がある");
    }
  }
  return { errors, nTx, nLit, nRuns };
}

module.exports = { scanJs, inT, bare, badYomi, run, KAN };
if (require.main === module) {
  const r = run();
  const list = process.argv.includes("--list");
  const show = list ? r.errors : r.errors.slice(0, 60);
  for (const e of show) console.log(e);
  if (r.errors.length > show.length) console.log(`…ほか ${r.errors.length - show.length} 件（--list で全部）`);
  console.log(`検査：TX ${r.nTx} 文・コード中の文字 ${r.nLit} か所`);
  console.log(r.errors.length ? `\nエラー ${r.errors.length} 件` : "\nエラー 0 件（OK）");
  process.exit(r.errors.length ? 1 : 0);
}
