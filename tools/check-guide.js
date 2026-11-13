#!/usr/bin/env node
/* 先生向けガイド（guide/）の検査。node tools/check-guide.js（先に node tools/build-guide.js）
   - 全単元（ready と later）がどれかのページに載っている／リンク先の単元IDが実在する
   - 各ページに title・description・h1・canonical・JSON-LD（JSONとして読める）がある／スクリプトタグ（JSON-LD以外）・外部読み込みがない
   - sitemap.xml にすべてのページがある／robots.txt から sitemap を指している
   - ページ内リンク（#id）と他ページへのリンクの先が実在する
   - TEXTBOOK_ORDER（あれば）の単元IDが実在する */
const fs = require("fs"), path = require("path");
const { root, load, BASE, SUBJ_ORDER, pageName } = require("./guide-lib");
const W = load(), UN = W.MH_UNITS, TB = W.TEXTBOOK_ORDER;
const errors = [], err = m => errors.push(m);
const gdir = path.join(root, "guide");
const read = f => (fs.existsSync(f) ? fs.readFileSync(f, "utf8") : null);

const expected = new Set(["index.html", "custom.html", "about.html"]);
for (const u of UN.UNITS) expected.add(pageName(u.g, u.subj));
const pageHtml = {};
for (const f of expected) { const s = read(path.join(gdir, f)); if (s === null) err(`ページがありません: guide/${f}`); else pageHtml[f] = s; }
for (const f of fs.existsSync(gdir) ? fs.readdirSync(gdir) : []) if (f.endsWith(".html") && !expected.has(f)) err(`想定外のページ: guide/${f}`);

const idsOf = html => new Set([...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]));
const allIds = {}; for (const f in pageHtml) allIds[f] = idsOf(pageHtml[f]);

// 全単元の掲載
for (const u of UN.UNITS) {
  const f = pageName(u.g, u.subj), h = pageHtml[f];
  if (!h) continue;
  if (!allIds[f].has(u.id)) err(`単元が載っていません: ${u.id} (${f})`);
  if (u.status === "ready" && !h.includes(`href="../index.html#u=${u.id}&amp;`) && !h.includes(`href="../index.html#u=${u.id}&n=10`)) err(`「ためす」リンクがありません: ${u.id}`);
  if (u.status !== "ready" && !new RegExp(`id="${u.id}"[\\s\\S]*?準備中`).test(h)) err(`準備中の表示がありません: ${u.id}`);
}
// 各ページの必須要素・リンク
for (const f in pageHtml) {
  const h = pageHtml[f], need = (re, name) => { if (!re.test(h)) err(`${f}: ${name}がありません`); };
  need(/<title>[^<]{10,}<\/title>/, "title"); need(/<meta name="description" content="[^"]{30,}">/, "description");
  need(/<h1[ >]/, "h1"); need(new RegExp(`<link rel="canonical" href="${BASE}${f === "index.html" ? "guide/" : "guide/" + f}">`.replace(/\//g, "\\/")), "canonical（絶対URL）");
  const lds = [...h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  if (!lds.length) err(`${f}: JSON-LD がありません`);
  for (const m of lds) { try { JSON.parse(m[1]); } catch (e) { err(`${f}: JSON-LD が読めません`); } }
  const scripts = [...h.matchAll(/<script\b([^>]*)>/g)].filter(m => !/application\/ld\+json/.test(m[1]));
  if (scripts.length) err(`${f}: JSON-LD 以外の script があります`);
  if (/<(?:link|img|iframe|script)[^>]+(?:href|src)="https?:/.test(h.replace(/<link rel="canonical"[^>]*>/, ""))) err(`${f}: 外部読み込みがあります`);
  if (/google-analytics|gtag|googletagmanager/.test(h)) err(`${f}: 解析タグがあります`);
  if (/《|》/.test(h)) err(`${f}: ふりがな記法《》が残っています`);
  if ((h.match(/<h1[ >]/g) || []).length !== 1) err(`${f}: h1 が1つではありません`);
  // リンク
  for (const m of h.matchAll(/<a [^>]*href="([^"]+)"/g)) {
    const href = m[1].replace(/&amp;/g, "&");
    if (/^https?:/.test(href)) continue;
    if (href.startsWith("../index.html")) {
      const hash = href.split("#")[1] || "";
      if (hash.startsWith("u=")) {
        const ids = hash.slice(2).split("&")[0].split(",");
        for (const id of ids) if (!UN.byId[id]) err(`${f}: リンク先の単元IDが存在しません: ${id}`);
      }
      continue;
    }
    const [p, a] = href.split("#"), tf = p || f;
    if (!(tf in pageHtml) && !fs.existsSync(path.join(gdir, tf))) { err(`${f}: リンク先がありません: ${href}`); continue; }
    if (a && pageHtml[tf] && !allIds[tf].has(a)) err(`${f}: リンク先の id がありません: ${href}`);
  }
}
// sitemap / robots
const sm = read(path.join(root, "sitemap.xml")), rb = read(path.join(root, "robots.txt"));
if (!sm) err("sitemap.xml がありません");
else {
  const must = [BASE, BASE + "guide/", ...[...expected].filter(f => f !== "index.html").map(f => BASE + "guide/" + f)];
  for (const u of must) if (!u.endsWith("-rika.html") && !sm.includes(`<loc>${u}</loc>`)) err(`sitemap.xml にありません: ${u}`);
}
if (!rb || !rb.includes(`Sitemap: ${BASE}sitemap.xml`)) err("robots.txt から sitemap を指していません");
// 教科書の並び
let tbRows = 0;
if (TB) for (const s of Object.keys(TB)) for (const c of Object.keys(TB[s] || {})) for (const g of Object.keys((TB[s][c] || {}).g || {})) for (const r of TB[s][c].g[g]) {
  tbRows++;
  if (!r.t) err(`TEXTBOOK_ORDER ${s}/${c}/${g}: 単元名 t がありません`);
  for (const id of r.u || []) if (!UN.byId[id]) err(`TEXTBOOK_ORDER ${s}/${c}/${g} 「${r.t}」: 単元IDが存在しません: ${id}`);
}
// 同じデータなら同じ出力か（build を二度走らせた比較は手順で行う）
if (errors.length) { console.error(errors.join("\n")); console.error(`\nエラー ${errors.length} 件`); process.exit(1); }
console.log(`OK: ページ ${Object.keys(pageHtml).length}、単元 ${UN.UNITS.length} すべて掲載、教科書の並び ${TB ? tbRows + "行を確認" : "なし（標準のみ）"}`);
