#!/usr/bin/env node
// 先生向けの紹介ページ（sensei.html）の検査。
//  1) 生成物が tools/lp-page.js と同じ（作りなおし忘れがない）
//  2) 外部から何も読みこまない・リンク先と画像・フォントのファイルがある
//  3) 見出し用フォント（使う文字だけ）に、ページの文字がすべて入っている（vendor/fonts/lp-chars.txt）
//  4) 一方通行：index.html・guide/・404.html・move.html から sensei へのリンクがない。サイトマップには入っている
const fs = require("fs"), path = require("path");
const root = path.resolve(__dirname, "..");
const read = f => fs.readFileSync(path.join(root, f), "utf8");
let bad = 0; const ng = m => { console.log("NG  " + m); bad++; };
const html = read("sensei.html");

// 2) 外部読みこみなし・ファイルがある
const refs = [...html.matchAll(/\b(?:src|href)="([^"]+)"/g)].map(m => m[1]).concat([...html.matchAll(/url\(([^)]+)\)/g)].map(m => m[1].replace(/["']/g, "")));
for (const r of refs) {
  if (/^https:\/\/hirametto\.com\//.test(r) || /^https:\/\/[a-z0-9-]+\.github\.io\//.test(r)) continue; // canonical など（自分の住所）
  if (/^(https?:)?\/\//.test(r)) { ng("外部の住所を読んでいる: " + r); continue; }
  if (r.startsWith("#") || r.startsWith("data:")) continue;
  let f = r.split("#")[0].split("?")[0];
  if (f === "./" || f === "") f = "index.html"; else if (f.endsWith("/")) f += "index.html";
  if (!fs.existsSync(path.join(root, f))) ng("ファイルがない: " + r);
}
if (/<link[^>]+fonts\.googleapis|<script[^>]+src="http/.test(html)) ng("外部のフォント・スクリプトを読んでいる");

// 3) 見出し用フォントの文字
const body = html.slice(html.indexOf("<body>")).replace(/<(script|style)\b[\s\S]*?<\/\1>/g, "").replace(/<[^>]+>/g, "")
  .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"');
const have = new Set(read("vendor/fonts/lp-chars.txt"));
const miss = [...new Set(body)].filter(c => !/\s/.test(c) && !have.has(c));
if (miss.length) ng("見出し用フォントに入っていない文字: " + miss.join("") + "（python3 tools/build-lp-fonts.py で作りなおす）");

// 4) 一方通行とサイトマップ
const oneWay = ["index.html", "404.html", "move.html", ...fs.readdirSync(path.join(root, "guide")).filter(f => f.endsWith(".html")).map(f => "guide/" + f)];
for (const f of oneWay) if (/href="[^"]*sensei(\.html)?["#?]/.test(read(f))) ng(f + " から sensei へのリンクがある（一方通行のきまり）");
if (!/<loc>[^<]*\/sensei(\.html)?<\/loc>/.test(read("sitemap.xml"))) ng("sitemap.xml に sensei がない");
if (!/href="\.\/#teacher"/.test(html) || !/href="guide\/"/.test(html)) ng("ひらめっと本体・ガイドへのボタンがない");

// 1) 生成物が最新（build-guide.js と同じ材料で作りなおして比べる）
const cp = require("child_process");
const tmp = fs.mkdtempSync(path.join(require("os").tmpdir(), "lp-"));
fs.copyFileSync(path.join(root, "sensei.html"), path.join(tmp, "sensei.html"));
cp.spawnSync(process.execPath, [path.join(__dirname, "build-guide.js")], { cwd: root, stdio: "ignore" });
if (read("sensei.html") !== fs.readFileSync(path.join(tmp, "sensei.html"), "utf8")) ng("sensei.html が tools/lp-page.js と ちがっていた（作りなおした。commit する）");

console.log(bad ? `${bad} 件の問題` : "sensei.html：外部読みこみなし・リンク先あり・フォントの文字そろい・一方通行 OK");
process.exitCode = bad ? 1 : 0;
