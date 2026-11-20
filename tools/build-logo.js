#!/usr/bin/env node
// 「ひらめっと」のロゴ（案A：ひらめき電球）を作る。文字はフォントを使わず、線で描いた形。
//   node tools/build-logo.js        … vendor/img/ に SVG を書く
//   node tools/build-logo.js --png  … あわせて PNG（ファビコン・ホーム画面・共有画像）を書く（Playwright が必要）
// 色：ネイビー #243B53（信頼）・イエロー #F4C650（ひらめき）・ターコイズ #32B7A2（成長）・ライトグレー #F5F7FA
const fs = require("fs"), path = require("path");
const OUT = path.join(__dirname, "..", "vendor", "img");
const C = { navy: "#243B53", yellow: "#F4C650", teal: "#32B7A2", gray: "#F5F7FA", white: "#FFFFFF" };

// 100×100 の箱に、ひらがなを 丸い はしの線で描く
const LETTERS = {
  hi: ["M10 30 Q24 24 34 23 Q16 48 20 68 Q26 88 50 86 Q72 83 76 28 Q82 46 94 58"],
  ra: ["M40 10 Q52 12 62 19", "M30 28 Q26 48 28 62 Q50 42 70 52 Q86 62 74 78 Q62 92 36 88"],
  me: ["M24 30 Q30 56 46 82", "M60 12 Q57 42 38 64 Q22 84 15 70 Q10 52 42 43 Q74 36 86 56 Q94 78 62 86"],
  ttu: ["M26 58 Q50 48 66 52 Q82 58 74 72 Q66 84 44 84"],
  to: ["M34 14 Q38 32 44 48", "M76 30 Q42 44 32 60 Q24 80 52 84 Q68 85 84 81"],
};
const ORDER = ["hi", "ra", "me", "ttu", "to"], ADV = { hi: 92, ra: 86, me: 96, ttu: 78, to: 90 };

function word(color) {
  let x = 0, g = "";
  for (const k of ORDER) { g += `<g transform="translate(${x} 0)">` + LETTERS[k].map(d => `<path d="${d}"/>`).join("") + "</g>"; x += ADV[k]; }
  return { g: `<g fill="none" stroke="${color}" stroke-width="13" stroke-linecap="round" stroke-linejoin="round">${g}</g>`, w: x };
}
// 電球の中で 3つの点が線でつながる（ひらめき × ネット）。rays=false は小さいアイコン用
function mark(dark, rays = true) {
  const ln = dark ? C.white : C.navy;
  return (rays ? `<g stroke="${C.yellow}" stroke-width="6" stroke-linecap="round"><path d="M50 3v6M16 16l5 5M84 16l-5 5M4 46h6M90 46h6"/></g>` : "") +
    `<path d="M50 12a31 31 0 0 1 18 56V75H32v-7A31 31 0 0 1 50 12z" fill="${C.yellow}" stroke="${ln}" stroke-width="7" stroke-linejoin="round"/>` +
    `<path d="M36 84h28M41 94h18" stroke="${ln}" stroke-width="7" stroke-linecap="round"/>` +
    `<path d="M39 54L50 35L61 54Z" fill="none" stroke="${C.navy}" stroke-width="4.5" stroke-linejoin="round"/>` +
    [[50, 35], [39, 54], [61, 54]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="6" fill="${C.teal}" stroke="${C.navy}" stroke-width="3"/>`).join("");
}
const svg = (w, h, body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="ひらめっと"><title>ひらめっと</title>${body}</svg>\n`;
function logo(dark) {
  const t = word(dark ? C.white : C.navy), s = 0.62, W = Math.ceil(116 + t.w * s + 6);
  return svg(W, 100, `<g>${mark(dark)}</g><g transform="translate(116 ${50 - 50 * s}) scale(${s})">${t.g}</g>`);
}
// ファビコン：どの色のタブでも見えるよう、ネイビーの台にのせる
const favicon = () => svg(100, 100, `<rect width="100" height="100" rx="22" fill="${C.navy}"/><g transform="translate(6 6) scale(.88)">${mark(true, false)}</g>`);
// ホーム画面のアイコン：角は OS が丸めるので四角い台
const appIcon = () => svg(100, 100, `<rect width="100" height="100" fill="${C.navy}"/><g transform="translate(14 13) scale(.72)">${mark(true)}</g>`);
// 共有画像（1200×630）：明るい台の まん中に 横長ロゴ、下に つながる点の帯
function ogImage() {
  const t = word(C.navy), s = 0.62, W = 116 + t.w * s + 6, k = 2.3, x = (1200 - W * k) / 2, y = 315 - 50 * k - 30;
  const dots = [[120, 560], [260, 590], [400, 548], [540, 588], [680, 552], [820, 590], [960, 556], [1090, 586]];
  const net = `<path d="M${dots.map(d => d.join(" ")).join(" L")}" fill="none" stroke="${C.teal}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" opacity=".55"/>` +
    dots.map(([a, b], i) => `<circle cx="${a}" cy="${b}" r="${i % 3 ? 9 : 13}" fill="${i % 3 ? C.teal : C.yellow}"/>`).join("");
  return svg(1200, 630, `<rect width="1200" height="630" fill="${C.gray}"/><rect x="0" y="500" width="1200" height="130" fill="${C.navy}"/>${net}` +
    `<g transform="translate(${x} ${y}) scale(${k})"><g>${mark(false)}</g><g transform="translate(116 ${50 - 50 * s}) scale(${s})">${t.g}</g></g>`);
}

const files = {
  "logo-hirametto.svg": logo(false),
  "logo-hirametto-dark.svg": logo(true),
  "logo-hirametto-mark.svg": svg(100, 100, mark(false)),
  "logo-hirametto-mark-dark.svg": svg(100, 100, mark(true)),
  "favicon.svg": favicon(),
};
for (const [f, s] of Object.entries(files)) fs.writeFileSync(path.join(OUT, f), s);
console.log("SVG:", Object.keys(files).join(", "));

if (process.argv.includes("--png")) (async () => {
  const { chromium } = require("playwright");
  const b = await chromium.launch(), p = await b.newPage();
  const png = async (name, body, size, w = size, h = size) => {
    await p.setViewportSize({ width: w, height: h });
    await p.setContent(`<style>html,body{margin:0;background:transparent}svg{display:block;width:${w}px;height:${h}px}</style>${body}`);
    await p.screenshot({ path: path.join(OUT, name), omitBackground: true });
  };
  await png("favicon-32.png", favicon(), 32);
  await png("apple-touch-icon.png", appIcon(), 180);
  await png("icon-192.png", appIcon(), 192);
  await png("icon-512.png", appIcon(), 512);
  await png("og-hirametto.png", ogImage(), 0, 1200, 630);
  await b.close();
  console.log("PNG: favicon-32, apple-touch-icon(180), icon-192, icon-512, og-hirametto(1200×630)");
})();
