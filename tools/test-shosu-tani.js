#!/usr/bin/env node
/* 3年「小数と 単位（cm・mm／L・dL）」（m3-shosu-tani）の検査（Node.js 標準機能のみ）
   - 答えを 1mm = 0.1cm、1dL = 0.1L の きまりで 問題文から 計算しなおして、正解と くらべる（逆算）
   - 3年の はんい：小数は 1/10の位（小数第一位）まで、数は 0.1〜9.9（小さい単位で 1〜99）
   - 単位の 書き方は 教科書と 同じ（cm・mm・L・dL。dL の d は 小文字、L は 大文字）。ほかの 単位（km・m・mL・kg など）は 出さない
   - 4択は 正解が ちょうど 1つ。テンキーの 問題は 小数点の キーが 出る 答え方（dec）
   使い方：node tools/test-shosu-tani.js */
const fs = require("fs"), path = require("path"), vm = require("vm"), assert = require("assert");
const root = path.join(__dirname, "..");
const ctx = { window: {} };
vm.createContext(ctx);
const files = ["data/kanji-grade.js", "data/questions.js", "data/choices.js", "data/gen/core.js"];
for (const f of fs.readdirSync(path.join(root, "data/gen")).sort()) if (f !== "core.js" && f.endsWith(".js")) files.push("data/gen/" + f);
files.push("data/units.js");
for (const f of files) vm.runInContext(fs.readFileSync(path.join(root, f), "utf8"), ctx, { filename: f });
const UN = ctx.window.MH_UNITS, P = UN.plain;

const ID = "m3-shosu-tani";
const u = UN.UNITS.find(x => x.id === ID);
assert(u, "単元が ない: " + ID);
assert.strictEqual(u.g, 3); assert.strictEqual(u.item, "小数"); assert.strictEqual(u.subj, "sansu");

const BIG = { mm: "cm", dL: "L" };                        // 小さい単位 → 大きい単位（10こで 1）
const SMALL = { cm: "mm", L: "dL" };
const D = "(\\d+(?:\\.\\d)?)";                             // 小数第一位まで（それより 下の 位は マッチしない）
const toTenth = s => { const [i, f = "0"] = s.split("."); return Number(i) * 10 + Number(f); };   // 文字 → 0.1 が いくつ（整数で 計算・誤差なし）
const tenthStr = n => (n % 10 ? `${Math.floor(n / 10)}.${n % 10}` : String(n / 10));
const okRange = n => n >= 1 && n <= 99;                    // 0.1〜9.9（小さい単位で 1〜99）

let n = 0;
const seen = { k0: 0, k0zero: 0, k1: 0, k2: 0, k3: 0, nagasa: 0, kasa: 0 };
for (let s = 0; s < 3000; s++) {
  const it = UN.make(ID, s), q = P(it.q), a = P(it.a), ch = it.choices.map(P);
  // 単位の 文字は cm・mm・L・dL だけ
  const units = q.match(/[a-zA-Z]+/g) || [];
  for (const x of units) assert(["cm", "mm", "L", "dL"].includes(x), `単位の 書き方: ${q}`);
  // 小数第二位 以下は 出さない
  for (const x of [q, a, ...ch]) assert(!/\d\.\d\d/.test(x), `小数第二位: ${x}`);
  assert.strictEqual(ch.length, 4); assert.strictEqual(new Set(ch).size, 4, `選択肢の 重複: ${ch}`);
  assert.strictEqual(ch.filter(c => c === a).length, 1, `正解が 4択に 1つ: ${q} ${ch}`);
  let m, want, mode;
  if ((m = q.match(new RegExp(`^(\\d)(cm|L) (\\d)(mm|dL) = □(cm|L)$`)))) {           // 3cm 5mm = □cm
    assert.strictEqual(SMALL[m[2]], m[4]); assert.strictEqual(m[5], m[2]);
    const v = Number(m[1]) * 10 + Number(m[3]); want = tenthStr(v); mode = "dec"; seen.k0++;
    assert(okRange(v) && v % 10, q);
  } else if ((m = q.match(new RegExp(`^(\\d)(mm|dL) = □(cm|L)$`)))) {                 // 7mm = □cm
    assert.strictEqual(BIG[m[2]], m[3]);
    want = tenthStr(Number(m[1])); mode = "dec"; seen.k0zero++;
  } else if ((m = q.match(new RegExp(`^${D}(cm|L) = □(mm|dL)$`)))) {                 // 2.7cm = □mm
    assert.strictEqual(SMALL[m[2]], m[3]);
    const v = toTenth(m[1]); want = String(v); mode = "dec"; seen.k1++;
    assert(okRange(v) && v % 10, q);
  } else if ((m = q.match(/^(\d+)(mm|dL) = □(cm|L)$/))) {                              // 45mm = □cm
    assert.strictEqual(BIG[m[2]], m[3]);
    const v = Number(m[1]); want = tenthStr(v); mode = "dec"; seen.k2++;
    assert(okRange(v) && v % 10, q);
  } else if ((m = q.match(new RegExp(`^${D}(cm|L)は 何(cm|L)何(mm|dL)？$`)))) {       // 2.7cmは 何cm何mm？
    assert.strictEqual(m[2], m[3]); assert.strictEqual(SMALL[m[2]], m[4]);
    const v = toTenth(m[1]); want = `${Math.floor(v / 10)}${m[2]}${v % 10}${m[4]}`; mode = "choice4"; seen.k3++;
    assert(v >= 11 && v <= 99 && v % 10, q);
  } else assert.fail("読めない 問題: " + q);
  if (/cm|mm/.test(q)) seen.nagasa++; else seen.kasa++;
  assert.strictEqual(a, want, `答えが ちがう: ${q} → ${a}（正しくは ${want}）`);
  assert.strictEqual(it.ans, mode, `答え方: ${q}`);
  // 判定：正解は 通る・ほかの 3つは 通らない
  assert(UN.check(it, mode === "choice4" ? it.a : a), `正解が 通らない: ${q}`);
  if (mode === "dec" && a.includes(".")) assert(UN.check(it, a + "0"), `3.50 の 形でも 通る: ${q}`);
  for (const c of it.choices) if (P(c) !== a) assert(!UN.check(it, mode === "choice4" ? c : P(c)), `まちがいが 通る: ${q} ${c}`);
  // 同じ シードなら 同じ 問題
  assert.strictEqual(JSON.stringify(UN.make(ID, s)), JSON.stringify(it));
  n++;
}
for (const [k, v] of Object.entries(seen)) assert(v > 0, "出ない 形: " + k);
// 単元の 説明・例題も 3年の はんい
assert(/1mm ＝ 0\.1cm/.test(P(u.note)) && /1dL ＝ 0\.1L/.test(P(u.note)), u.note);
for (const x of [u.title, u.note, u.ex]) assert(!/\d\.\d\d/.test(P(x)), x);
console.log(`小数と 単位（3年）：${n}問 OK`, JSON.stringify(seen));
