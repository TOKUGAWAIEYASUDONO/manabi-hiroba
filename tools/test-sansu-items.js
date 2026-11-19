#!/usr/bin/env node
// 算数の「まとまり」と「とっくん」（data/sansu-items.js）の 形を 調べる。 node tools/test-sansu-items.js
// どの 算数の 単元も ちょうど 1つの まとまりに 入るか・「その他」の 行き先が ぜんぶ 書いてあるか・とっくんの 入口が 今の 形か。
const assert = require("node:assert/strict"), fs = require("node:fs"), vm = require("node:vm"), path = require("node:path");
const root = path.join(__dirname, ".."), ctx = { window: {} }; vm.createContext(ctx);
const files = ["data/kanji-grade.js", "data/questions.js", "data/choices.js", "data/gen/core.js"];
for (const f of fs.readdirSync(path.join(root, "data/gen")).sort()) if (f !== "core.js" && f.endsWith(".js")) files.push("data/gen/" + f);
files.push("data/units.js", "data/sansu-items.js");
for (const f of files) vm.runInContext(fs.readFileSync(path.join(root, f), "utf8"), ctx, { filename: f });
const SI = ctx.window.MH_SANSU_ITEMS, UN = ctx.window.MH_UNITS, UNITS = UN.UNITS, P = UN.plain;
const J = x => JSON.parse(JSON.stringify(x));     // vm の 中の 配列を ふつうの 配列に（deepEqual 用）
const M = UNITS.filter(u => u.subj === "sansu"), byId = UN.byId;
let n = 0;
const t = (name, fn) => { try { fn(); n++; console.log("ok  " + name); } catch (e) { console.log("NG  " + name + "\n    " + e.message); process.exitCode = 1; } };
const gid = new Set(SI.GROUPS.map(x => x.id)), tid = new Set(SI.TOKKUN.map(x => x.id));
const pair = (v, where) => {
  assert.ok(Array.isArray(v) && v.length === 2 && v.every(s => typeof s === "string" && s.trim()), where + "：[漢字, ひらがな] の 2つ");
  for (const s of v) assert.equal((s.match(/《/g) || []).length, (s.match(/》/g) || []).length, where + "：《》の 数が あわない " + s);
  assert.ok(!/\p{Script=Han}/u.test(v[1]), where + "：ひらがなの ほうに 漢字が ある " + v[1]);
  assert.ok(!/《/.test(v[1]), where + "：ひらがなの ほうに よみ《》は いらない " + v[1]);
  for (const m of v[0].matchAll(/(\p{Script=Han}+)(《)?/gu)) if (!m[2]) assert.fail(where + "：漢字に よみが ない " + m[1] + "（" + v[0] + "）");
};

t("まとまりの id は 重ならない・名前と 説明は [漢字《よみ》, ひらがな]", () => {
  assert.equal(gid.size, SI.GROUPS.length);
  assert.ok(!gid.has("tokkun") && !SI.GROUPS.some(x => tid.has(x.id)), "まとまりと とっくんの id が 重なる");
  for (const x of SI.GROUPS) { pair(x.t, x.id + ".t"); pair(x.d, x.id + ".d"); }
  for (const x of SI.TOKKUN) { pair(x.t, x.id + ".t"); pair(x.d, x.id + ".d"); }
});
t("どの item も 1つの まとまりにだけ 書く", () => {
  const seen = {};
  for (const x of SI.GROUPS) for (const it of x.items) { assert.ok(!seen[it], `item「${it}」が ${seen[it]} と ${x.id} の 2つに ある`); seen[it] = x.id; }
  assert.ok(!seen["その他"], "「その他」は まとめて 入れない（MOVE に 1つずつ 書く）");
});
t("算数の 単元は ぜんぶ ちょうど 1つの まとまりに 入る", () => {
  const miss = M.filter(u => !gid.has(SI.groupOf(u))).map(u => u.id + "（" + u.item + "）");
  assert.deepEqual(J(miss), [], "まとまりの ない 単元");
  for (let g = 1; g <= 6; g++) {
    const got = SI.groupsFor(UNITS, g).flatMap(x => x.units.map(u => u.id));
    assert.equal(new Set(got).size, got.length, g + "年：同じ 単元が 2つの まとまりに 入った");
    assert.deepEqual(J([...got].sort()), J(M.filter(u => u.g === g).map(u => u.id).sort()), g + "年：まとまりの 単元と 算数の 単元が あわない");
  }
});
t("「その他」の 単元は ぜんぶ MOVE に 行き先が ある", () => {
  const other = M.filter(u => u.item === "その他");
  assert.ok(other.length > 0);
  assert.deepEqual(J(other.filter(u => !SI.MOVE[u.id]).map(u => u.id)), []);
});
t("MOVE：ある 単元・ある まとまり・item の ままと ちがう 行き先", () => {
  for (const [id, to] of Object.entries(SI.MOVE)) {
    assert.ok(byId[id], "MOVE の 単元が ない：" + id);
    assert.equal(byId[id].subj, "sansu", "算数で ない：" + id);
    assert.ok(gid.has(to), "MOVE の 行き先が ない まとまり：" + id + " → " + to);
    const def = SI.GROUPS.find(x => x.items.includes(byId[id].item));
    assert.ok(!def || def.id !== to, "MOVE しなくても 同じ まとまり（いらない 行）：" + id);
  }
});
t("学年ごとの まとまりは 4〜11こ（1画面 10こ前後）・空の まとまりは 出さない", () => {
  const cnt = {};
  for (let g = 1; g <= 6; g++) {
    const gs = SI.groupsFor(UNITS, g); cnt[g] = gs.length;
    assert.ok(gs.length >= 4 && gs.length <= 11, g + "年 " + gs.length + "こ");
    assert.ok(gs.every(x => x.units.length > 0));
    assert.ok(gs.every(x => x.units.every(u => u.g === g)), g + "年に ほかの 学年の 単元");
  }
  assert.deepEqual([cnt[1], cnt[3], cnt[5]], [5, 10, 7], "ヘッダーの メモ（1年5こ・3年10こ・5年7こ）と あわせる");
  assert.equal(SI.groupsFor(UNITS).length, SI.GROUPS.length, "学年なしは ぜんぶの まとまり");
});
t("小数と 分数は べつの まとまり（ならった 日に その 単元を えらべる）", () => {
  assert.equal(SI.groupOf(byId["m3-shosu"]), "shosu");
  assert.equal(SI.groupOf(byId["m3-bunsu-imi"]), "bunsu");
  for (const u of M) if (u.item === "小数") assert.equal(SI.groupOf(u), "shosu", u.id);
  for (const u of M) if (u.item === "分数") assert.equal(SI.groupOf(u), "bunsu", u.id);
});
t("とっくん：九九（2・3年）・100マス（ぜんぶ）・めもり名人（2〜4年）。入口は 今の 形", () => {
  const T = Object.fromEntries(SI.TOKKUN.map(x => [x.id, x]));
  assert.deepEqual(Object.keys(T), ["kuku", "masu100", "meter"]);
  assert.deepEqual([...T.kuku.g], [2, 3]); assert.deepEqual([...T.masu100.g], [1, 2, 3, 4, 5, 6]); assert.deepEqual([...T.meter.g], [2, 3, 4]);
  assert.equal(T.kuku.go, "#setup?game=kuku"); assert.equal(T.meter.go, "#meter"); assert.equal(T.masu100.go, "url:apps/100masu/index.html");
  for (const x of SI.TOKKUN) if (x.go.startsWith("url:")) assert.ok(fs.existsSync(path.join(root, x.go.slice(4))), "ない ファイル：" + x.go);
  // 今の ホームと 同じ 学年（index.html の GAMES の 九九・meterTile）
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  assert.match(html, /\{id:"kuku",[^}]*g:\[2,3\]/, "index.html の 九九の 学年が かわった");
  assert.match(html, /function meterTile\(\)\{\s*if\(ui\.grade&&!\[2,3,4\]\.includes\(ui\.grade\)\)/, "index.html の めもり名人の 学年が かわった");
  assert.deepEqual(J(SI.tokkunFor(1).map(x => x.id)), ["masu100"]);
  assert.deepEqual(J(SI.tokkunFor(3).map(x => x.id)), ["kuku", "masu100", "meter"]);
  assert.deepEqual(J(SI.tokkunFor(5).map(x => x.id)), ["masu100"]);
});
t("めもり名人は「単位・はかり」（2〜4年）と「とっくん」の 2か所から", () => {
  for (const x of SI.GROUPS) for (const id of x.tools) assert.ok(tid.has(id), x.id + " の tools に ない とっくん：" + id);
  assert.deepEqual([...SI.GROUPS.find(x => x.id === "tani").tools], ["meter"]);
  for (let g = 1; g <= 6; g++) {
    const tani = SI.groupsFor(UNITS, g).find(x => x.id === "tani");
    const has = !!(tani && tani.tools.some(x => x.id === "meter"));
    assert.equal(has, [2, 3, 4].includes(g), g + "年の 単位・はかり の めもり名人");
    assert.equal(SI.tokkunFor(g).some(x => x.id === "meter"), [2, 3, 4].includes(g), g + "年の とっくんの めもり名人");
  }
});
t("おもな 単元の 行き先（調査で 気に なった もの）", () => {
  const G = id => SI.groupOf(byId[id]);
  assert.equal(G("m1-tokei"), "tani"); assert.equal(G("m2-kuku-hole"), "kake"); assert.equal(G("m3-kuuran"), "bunsho");
  assert.equal(G("m3-hyo"), "graph"); assert.equal(G("m3-en"), "zukei"); assert.equal(G("m3-omosa"), "tani");
  assert.equal(G("m5-hyakubun"), "wariai"); assert.equal(G("m6-baai"), "graph"); assert.equal(G("m5-baisu"), "kazu");
  assert.equal(G("m5-seisu-shosu"), "shosu"); assert.equal(G("m4-keisan-kimari"), "bunsho"); assert.equal(G("m6-moji"), "bunsho");
});
t("算数で ない 単元・こわれた 入力は null／空（落ちない）", () => {
  assert.equal(SI.groupOf(UNITS.find(u => u.subj !== "sansu")), null);
  assert.equal(SI.groupOf(null), null); assert.equal(SI.groupOf({ subj: "sansu", item: "ない" }), null);
  assert.deepEqual([...SI.unitsOf(null, "kazu", 1)], []); assert.deepEqual([...SI.groupsFor([], 3)], []);
  assert.ok(P(SI.GROUPS[0].t[0]) === "数", "よみを とると 漢字だけ");
});
t("画面が この データを 読む（段階②：まとまり → 単元カード）", () => {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  assert.ok(/<script src="data\/sansu-items\.js\?v=[0-9a-f]{8}"><\/script>/.test(html), "index.html が data/sansu-items.js を 読んでいない");
  assert.ok(html.includes("MH_SANSU_ITEMS") && html.includes('path==="subj"'), "#subj の 画面が ない");
});

console.log(`\nsansu-items: ${n}件 合格${process.exitCode ? "（NG あり）" : ""}`);
