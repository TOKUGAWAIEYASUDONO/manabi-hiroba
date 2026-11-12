#!/usr/bin/env node
/* まなびひろば 先生向け「学年・単元から さがす」ページの自動生成（Node.js 標準機能のみ）
   使い方：node tools/build-guide.js
   data/units.js・data/gen/*.js・data/calc.js（・あれば data/textbook-order.js）を元に、
   guide/（学年×教科ごとのページ・入口・custom.html）、guide/guide.css、sitemap.xml、robots.txt を書き出す。
   同じデータなら同じ出力（日付や乱数を入れない）。データを変えたら再生成して、生成物も commit する。 */
const fs = require("fs"), path = require("path"), crypto = require("crypto");
const { root, load, BASE, SUBJ, SUBJ_ORDER, pageName } = require("./guide-lib");
const W = load(), UN = W.MH_UNITS, plain = UN.plain, TB = W.TEXTBOOK_ORDER;
const UNITS = UN.UNITS, SEED = 1;

const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const jsonld = o => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, "\\u003c")}</script>`;
const nl2 = s => esc(s).replace(/\n/g, "<br>");
const GJ = g => `小${g}`;
const AREA = { low: { A: "A 数と計算", B: "B 図形", C: "C 測定", D: "D データの活用" }, high: { A: "A 数と計算", B: "B 図形", C: "C 変化と関係", D: "D データの活用" } };
const areaName = u => (u.subj !== "sansu" ? "" : (AREA[u.g <= 3 ? "low" : "high"][u.area] || u.area));
const ANS = { choice4: "4つから えらぶ（4択）", num: "数字を入れる（テンキー）", amari: "商とあまりを入れる", dec: "小数点つきの数を入れる", frac: "分数を入れる", unit: "数と単位を入れる" };
const ANSTXT = a => ANS[a] || ANS.choice4;
const MODES = [
  { t: "ひとり練習", d: "リンクから すぐ開いて、ひとりで" },
  { t: "1分スプリント", d: "1分で いくつ とけるか" },
  { t: "クイズ", d: "クラス全員で同時に（先生が出題）" },
  { t: "たからばこ", d: "クラス対戦" },
  { t: "すごろく", d: "クラス対戦" },
  { t: "ロケット", d: "協力ゲーム（ロケット はっしゃ）" }
];
const minutes = u => (u.ans === "choice4" ? "10問で 約3分" : "10問で 約5分");
const unitHref = u => `../index.html#u=${u.id}&amp;n=10&amp;s=${SEED}`;
const teachHref = u => `../index.html#units?pick=${u.id}`;   // 本体が ?pick=ID を受け付け、その単元を選択済みで開く

const byGS = new Map();
for (const u of UNITS) { const k = u.g + "-" + u.subj; if (!byGS.has(k)) byGS.set(k, []); byGS.get(k).push(u); }
// 東京書籍の最初の掲載位置を代表順とし、未掲載は従来順に残す。
for (const [key, list] of byGS) {
  const [g, subj] = key.split("-");
  const rows = TB && TB[subj] && TB[subj].tosho && TB[subj].tosho.g[g];
  if (!rows) continue;
  const order = new Map();
  for (const row of rows) for (const id of row.u || []) if (!order.has(id)) order.set(id, order.size);
  const original = new Map(list.map((u, i) => [u.id, i]));
  list.sort((a, b) => (order.get(a.id) ?? Infinity) - (order.get(b.id) ?? Infinity) || original.get(a.id) - original.get(b.id));
}
const pages = [];
for (let g = 1; g <= 6; g++) for (const s of SUBJ_ORDER) if (byGS.has(g + "-" + s)) pages.push({ g, subj: s, file: pageName(g, s), units: byGS.get(g + "-" + s) });
const T = u => plain(u.title);
const ready = us => us.filter(u => u.status === "ready");

/* ---------- 共通の部品 ---------- */
function head({ title, desc, canonical, ld }) {
  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${canonical}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="まなびひろば">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${canonical}">
<meta property="og:locale" content="ja_JP">
<meta name="twitter:card" content="summary_large_image">
<meta property="og:image" content="${BASE}vendor/img/og-home.png">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<link rel="stylesheet" href="../vendor/fonts/biz-udpgothic.css">
<link rel="stylesheet" href="guide.css">
${ld.map(jsonld).join("\n")}
</head>
<body>
`;
}
const header = crumbs => `<header class="top"><div class="wrap"><a class="brand" href="../index.html">まなびひろば</a><span class="tag">先生向けガイド</span></div></header>
<nav class="crumb wrap" aria-label="パンくず">${crumbs.map(([t, h]) => h ? `<a href="${h}">${esc(t)}</a>` : `<span aria-current="page">${esc(t)}</span>`).join(" › ")}</nav>
`;
const footer = () => `<footer class="foot"><div class="wrap">
<p>まなびひろば：学校の端末で使える、小学生向けの無料の学習ゲーム（登録不要・広告なし。ひとりで遊ぶときは外部への通信なし。友だち対戦のときだけ、端末どうしをつなぐ仲介サーバーに接続）。</p>
<p>学習指導要領の項目番号（base）はAIが作成したもので、人の確認待ちです。教科書の単元名・順は出版社により異なります。</p>
<p><a href="../index.html">まなびひろば ホーム</a> ／ <a href="index.html">学年・単元から さがす</a> ／ <a href="custom.html">先生の問題で遊ぶ</a> ／ <a href="about.html">保護者・学校向け</a></p>
</div></footer>
<a class="totop" href="#" aria-label="ページの先頭へ">▲ 先頭へ</a>
</body>
</html>
`;
const gradeNav = cur => `<nav class="gnav" aria-label="学年">${[1, 2, 3, 4, 5, 6].map(g => `<a href="${pages.find(p => p.g === g).file}"${cur === g ? ' aria-current="page"' : ""}>${GJ(g)}</a>`).join("")}</nav>`;

/* ---------- 教科書会社ごとの並び ---------- */
function tbCompanies(subj, g) {
  const sub = TB && TB[subj]; if (!sub) return [];
  return Object.keys(sub).filter(k => sub[k] && sub[k].g && Array.isArray(sub[k].g[g]) && sub[k].g[g].length).map(k => ({ key: k, name: sub[k].name || k, rows: sub[k].g[g] }));
}
function textbookSection(p) {
  const cos = tbCompanies(p.subj, p.g); if (!cos.length) return "";
  let h = `<section aria-labelledby="tb"><h2 id="tb" class="sect">教科書の順で見る</h2><p class="note">教科書会社ごとの単元の並び（年間指導計画の目安）です。まなびひろばの単元名が教科書の名前と ちがうときは、両方を出しています。時期は学校により前後します。</p>`;
  h += `<nav class="tbnav" aria-label="教科書会社"><span>教科書：</span><a href="#top-units" aria-current="true">標準（このページの並び）</a>${cos.map(c => `<a href="#tb-${c.key}">${esc(c.name)}</a>`).join("")}</nav>`;
  for (const c of cos) {
    h += `<div class="tbblock" id="tb-${c.key}"><h3>${esc(c.name)}　${GJ(p.g)} ${SUBJ[p.subj]}</h3><div class="tablewrap"><table class="grid tbt"><thead><tr><th scope="col">教科書の単元名</th><th scope="col">時期</th><th scope="col">まなびひろばの単元</th></tr></thead><tbody>`;
    for (const r of c.rows) {
      const us = (r.u || []).map(id => UN.byId[id]).filter(Boolean);
      const same = us.length === 1 && T(us[0]) === plain(r.t);
      h += `<tr><td>${esc(plain(r.t))}</td><td>${esc(r.term == null ? "" : r.term)}</td><td class="ul">${us.length ? us.map(u => `<a href="${pageName(u.g, u.subj)}#${u.id}">${same ? "ひろばの単元へ" : esc(T(u))}</a>${u.g !== p.g ? `<small>（${GJ(u.g)}）</small>` : ""}`).join("<br>") : '<span class="none">まだありません</span>'}</td></tr>`;
    }
    h += `</tbody></table></div><p class="backtop"><a href="#tb">↑ 教科書会社の切りかえにもどる</a></p></div>`;
  }
  return h + `</section>\n`;
}

/* ---------- 学年×教科ページ ---------- */
function unitCard(u, list) {
  const rd = u.status === "ready", out = [];
  out.push(`<article class="unit${rd ? "" : " later"}" id="${u.id}" aria-labelledby="h-${u.id}">`);
  out.push(`<h2 id="h-${u.id}">${esc(T(u))}${rd ? "" : ' <span class="badge">準備中</span>'}</h2>`);
  out.push(`<p class="meta">${[`${GJ(u.g)} ${SUBJ[u.subj]}`, areaName(u), u.item].filter(Boolean).map(esc).join(" ／ ")}</p>`);
  if (u.note) out.push(`<p class="note">${esc(plain(u.note))}</p>`);
  if (!rd) { out.push(`<p class="soon">この単元は、図や絵が必要なため、いま準備中です。公開したら この一覧にゲームが出ます。</p></article>`); return out.join("\n"); }
  out.push(`<div class="ex"><b>この単元で使えるゲーム</b><ul class="modes">${MODES.map(m => `<li${m.soon ? ' class="soon"' : ""}><b>${m.t}</b><span>${esc(m.d)}</span></li>`).join("")}</ul></div>`);
  const ex2 = [1, 2].map(i => UN.make(u, `guide|${u.id}|${i}`));
  out.push(`<div class="ex"><b>問題の例</b><ol class="qs">${ex2.map(it => `<li><span class="q">${esc(plain(it.q))}${it.stem ? ` <small>${esc(plain(it.stem))}</small>` : ""}</span><span class="a">答え：${esc(plain(it.a))}</span></li>`).join("")}</ol></div>`);
  if (u.series) {
    const sib = list.filter(x => x.series === u.series && x.status === "ready").sort((a, b) => a.step - b.step);
    if (sib.length > 1) out.push(`<p class="steps"><b>小分け（段階）</b> ${esc(u.series)}：${sib.map(x => x.id === u.id ? `<span class="cur">${esc(plain(x.stepLabel || ""))}</span>` : `<a href="#${x.id}">${esc(plain(x.stepLabel || ""))}</a>`).join(" → ")}</p>`);
    else if (u.stepLabel) out.push(`<p class="steps"><b>小分け（段階）</b> ${esc(u.series)}：<span class="cur">${esc(plain(u.stepLabel))}</span></p>`);
  }
  out.push(`<dl class="facts"><div><dt>答え方</dt><dd>${esc(ANSTXT(u.ans))}</dd></div><div><dt>所要時間の目安</dt><dd>${minutes(u)}</dd></div>${u.max ? `<div><dt>出る数の範囲</dt><dd>${u.max}まで</dd></div>` : ""}</dl>`);
  if (u.ex) out.push(`<details class="how"><summary>解き方のヒント（児童に出る例題）</summary><p>${nl2(plain(u.ex))}</p></details>`);
  out.push(`<p class="acts"><a class="btn go" href="${unitHref(u)}">この単元で ためす</a><a class="btn sub" href="${teachHref(u)}">課題リンクと QR を作る</a></p>`);
  if (u.base) out.push(`<p class="base">学習指導要領（平成29年告示）の項目：${esc(u.base)}（AI作成・要確認）</p>`);
  out.push(`</article>`);
  return out.join("\n");
}
function gradePage(p) {
  const { g, subj, units } = p, rd = ready(units), names = rd.map(T);
  let lead = names.slice(0, 3); if (lead.join("・").length > 36) lead = names.slice(0, 2);
  const rest = rd.length - lead.length;
  const leadTxt = `${lead.join("・")}${rest > 0 ? ` ほか${rest}単元` : ""}`;
  const title = `${leadTxt}｜${GJ(g)} ${SUBJ[subj]}の学習ゲーム｜まなびひろば（無料・登録不要）`;
  let desc = `${leadTxt}など、${GJ(g)} ${SUBJ[subj]}の単元から探せる学習ゲーム。単元一覧：${names.join("、")}`;
  if (desc.length > 120) desc = desc.slice(0, 119) + "…";
  desc += `。問題の例・答え方・課題リンクつき。無料・登録不要。`;
  const canonical = BASE + "guide/" + p.file;
  const sets = UN.UNIT_SETS.filter(s => s.units.some(id => { const u = UN.byId[id]; return u && u.g === g && u.subj === subj; }));
  const ld = [{
    "@context": "https://schema.org", "@type": "CollectionPage", name: title, description: desc, url: canonical, inLanguage: "ja",
    isPartOf: { "@type": "WebSite", name: "まなびひろば", url: BASE },
    mainEntity: {
      "@type": "ItemList", numberOfItems: units.length,
      itemListElement: units.map((u, i) => ({
        "@type": "ListItem", position: i + 1,
        item: {
          "@type": "LearningResource", name: T(u), url: `${canonical}#${u.id}`,
          description: `${GJ(u.g)} ${SUBJ[u.subj]}「${T(u)}」の学習ゲーム` + (u.status === "ready" ? "（問題の自動出題・無料）" : "（準備中）"),
          educationalLevel: `小学${u.g}年`, teaches: T(u), learningResourceType: "ゲーム・ドリル", inLanguage: "ja", isAccessibleForFree: true,
          interactivityType: "active", audience: { "@type": "EducationalAudience", educationalRole: "student" }, about: SUBJ[u.subj],
          provider: { "@type": "Organization", name: "まなびひろば", url: BASE }
        }
      }))
    }
  }, {
    "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "まなびひろば", item: BASE }, { "@type": "ListItem", position: 2, name: "学年・単元から さがす", item: BASE + "guide/" },
      { "@type": "ListItem", position: 3, name: `${GJ(g)} ${SUBJ[subj]}`, item: canonical }]
  }];
  let h = head({ title, desc, canonical, ld });
  h += header([["まなびひろば", "../index.html"], ["学年・単元から さがす", "index.html"], [`${GJ(g)} ${SUBJ[subj]}`]]);
  h += `<main class="wrap" id="top-units">\n<h1>${esc(leadTxt)}<span class="h1sub">${GJ(g)} ${SUBJ[subj]}の単元から さがす学習ゲーム</span></h1>\n`;
  h += `<p class="lead">${GJ(g)} ${SUBJ[subj]}の単元は全${units.length}単元（ゲームで使えるもの${rd.length}${units.length > rd.length ? `、準備中${units.length - rd.length}` : ""}）。単元名は教科書の並びに合わせています。</p>\n`;
  h += gradeNav(g) + "\n";
  h += `<nav class="subj" aria-label="${GJ(g)}の教科">${SUBJ_ORDER.filter(s => byGS.has(g + "-" + s)).map(s => `<a href="${pageName(g, s)}"${s === subj ? ' aria-current="page"' : ""}>${SUBJ[s]}</a>`).join("")}</nav>\n`;
  if (tbCompanies(subj, g).length) h += `<p class="note">教科書の順で見たいときは、<a href="#tb">教科書会社ごとの並び</a>へ。</p>\n`;
  h += `<section aria-labelledby="toc"><h2 id="toc" class="sect">単元の一覧</h2><ol class="toc">${units.map(u => `<li><a href="#${u.id}">${esc(T(u))}</a>${u.status === "ready" ? "" : ' <span class="badge">準備中</span>'}</li>`).join("")}</ol></section>\n`;
  h += `<section class="units" aria-label="単元ごとのゲーム">\n${units.map(u => unitCard(u, units)).join("\n")}\n</section>\n`;
  if (sets.length) {
    h += `<section aria-labelledby="sets"><h2 id="sets" class="sect">おすすめの組み合わせ</h2><p class="note">学年をまたいだ まとめ練習です。リンクを開くと そのまま始まります。</p><ul class="sets">`;
    h += sets.map(s => `<li><a class="btn sub" href="../index.html#u=${s.units.join(",")}&amp;n=20&amp;s=${SEED}">${esc(plain(s.title))}</a><span>${s.units.map(id => esc(T(UN.byId[id]))).join("、")}</span></li>`).join("");
    h += `</ul></section>\n`;
  }
  h += textbookSection(p);
  h += `<p class="backtop"><a href="index.html">← 学年・教科の一覧にもどる</a> ／ <a href="custom.html">どの教科でも使える：先生の問題で遊ぶ</a></p>\n</main>\n` + footer();
  return { title, desc, html: h };
}

/* ---------- 入口 ---------- */
function indexPage() {
  const total = UNITS.length, rdn = ready(UNITS).length;
  const title = `小1〜小6 単元から さがす学習ゲーム｜算数 あまりのあるわり算・分数・小数ほか${rdn}単元｜まなびひろば（無料・登録不要）`;
  const desc = `小1〜小6の学年・教科・単元から、使える学習ゲームを探せる先生向けの一覧。算数の九九・あまりのあるわり算・分数・小数、国語の漢字、社会、英語など全${rdn}単元。問題の例と課題リンク・QRつき。無料・登録不要。`;
  const canonical = BASE + "guide/";
  const ld = [{
    "@context": "https://schema.org", "@type": "CollectionPage", name: "学年・単元から さがす（先生向け）", description: desc, url: canonical, inLanguage: "ja",
    isPartOf: { "@type": "WebSite", name: "まなびひろば", url: BASE },
    mainEntity: { "@type": "ItemList", numberOfItems: pages.length, itemListElement: pages.map((p, i) => ({ "@type": "ListItem", position: i + 1, name: `${GJ(p.g)} ${SUBJ[p.subj]}の単元と学習ゲーム`, url: BASE + "guide/" + p.file })) },
    audience: { "@type": "EducationalAudience", educationalRole: "teacher" }, educationalLevel: "小学校", teaches: "算数・国語・社会・英語"
  }, { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "まなびひろば", item: BASE }, { "@type": "ListItem", position: 2, name: "学年・単元から さがす", item: canonical }] }];
  let h = head({ title, desc, canonical, ld });
  h += header([["まなびひろば", "../index.html"], ["学年・単元から さがす"]]);
  h += `<main class="wrap">\n<h1>学年・単元から さがす<span class="h1sub">小学校 算数・国語・社会・英語の学習ゲーム（先生向け）</span></h1>\n`;
  h += `<p class="lead">授業で使いたい単元から、使えるゲームと 使い方（ひとりで・クラスで・課題リンク）を見つけられます。全${total}単元（ゲームで使えるもの${rdn}、準備中${total - rdn}）。無料・登録不要。</p>\n`;
  h += `<section aria-labelledby="grid"><h2 id="grid" class="sect">1. 学年と教科をえらぶ</h2>\n<div class="tablewrap"><table class="grid"><caption>学年×教科の単元数（数字を押すと その単元の一覧）</caption><thead><tr><th scope="col">学年</th>${SUBJ_ORDER.map(s => `<th scope="col">${SUBJ[s]}</th>`).join("")}</tr></thead><tbody>`;
  for (let g = 1; g <= 6; g++) {
    h += `<tr><th scope="row">${GJ(g)}</th>`;
    for (const s of SUBJ_ORDER) { const us = byGS.get(g + "-" + s); h += us ? `<td><a class="cell s-${s}" href="${pageName(g, s)}"><b>${us.length}</b>単元</a></td>` : `<td class="none" aria-label="なし">―</td>`; }
    h += `</tr>`;
  }
  h += `</tbody></table></div></section>\n`;
  h += `<section aria-labelledby="all"><h2 id="all" class="sect">2. 単元名からさがす</h2><p class="note">教科書の単元の並びです。単元名を押すと、問題の例と ためすリンクが出ます。点線の単元は準備中です。</p>`;
  for (let g = 1; g <= 6; g++) {
    h += `<div class="gblock"><h3>${GJ(g)}</h3>`;
    for (const s of SUBJ_ORDER) { const us = byGS.get(g + "-" + s); if (!us) continue;
      h += `<p class="srow"><a class="slink s-${s}" href="${pageName(g, s)}">${SUBJ[s]}（${us.length}）</a>${us.map(u => `<a class="ulink${u.status === "ready" ? "" : " later"}" href="${pageName(g, s)}#${u.id}">${esc(T(u))}</a>`).join("")}</p>`; }
    h += `</div>`;
  }
  h += `</section>\n`;
  h += `<section aria-labelledby="use"><h2 id="use" class="sect">3. 使い方（どの単元でも同じです）</h2><ol class="how3"><li><b>ひとりで</b>：「この単元で ためす」を押すと、すぐ始まります。児童にもこのリンクを配れます。</li><li><b>課題として配る</b>：先生の画面の「単元からつくる」で単元を選ぶと、課題リンクと QR コードを作れます。</li><li><b>クラスで</b>：同じ画面から クイズ・たからばこ・すごろくの問題セットにできます。</li></ol></section>\n`;
  h += `<section aria-labelledby="cus" class="aside"><h2 id="cus" class="sect">どの教科でも使える：先生の問題で遊ぶ</h2><p>単元に合う問題が見つからないときは、先生が自分で問題を作って、クイズ・たからばこ・すごろく・ロケットはっしゃで遊べます。表（Excel など）からの取り込みもできます。<br><a class="btn sub" href="custom.html">先生の問題で遊ぶ 使い方を見る</a></p></section>\n`;
  const sh = [["計算スプリント", "小1〜小6", "たし算・ひき算・九九・わり算・かけ算・小数・分数（学年ごと）"], ["九九チャレンジ", "小2〜小3", "九九"], ["漢字よみクイズ", "小1〜小6", "学年配当の漢字の読み"], ["県庁所在地クイズ", "小4〜小6", "社会 都道府県"], ["英単語クイズ", "小5〜小6", "英語 単語の意味"]];
  h += `<section aria-labelledby="games"><h2 id="games" class="sect">ゲーム名から さがす（ひろば本体のゲーム）</h2><p class="note">単元に関係なく遊べる、はじめからあるゲームです。</p>\n<div class="tablewrap"><table class="grid games"><thead><tr><th scope="col">ゲーム</th><th scope="col">対象学年</th><th scope="col">内容・単元</th></tr></thead><tbody>${sh.map(r => `<tr><th scope="row">${r[0]}</th><td>${r[1]}</td><td>${r[2]}</td></tr>`).join("")}</tbody></table></div>\n`;
  h += `<h3 class="sub3">計算スプリントの学年ごとの単元</h3><ul class="calc">${Object.keys(W.MH_CALC.UNITS).map(g => `<li><b>${GJ(g)}</b>：${Object.values(W.MH_CALC.UNITS[g]).map(x => esc(plain(x))).join("、")}</li>`).join("")}</ul></section>\n`;
  h += `<section class="aside"><h2 class="sect">この一覧について</h2><p class="note">単元の名前・学年は まなびひろばのデータ（data/units.js）から自動で作っています。学習指導要領の項目番号はAIが作成したもので、人の確認待ちです。教科書の会社によって単元の名前や順番が ちがうことがあります。</p></section>\n`;
  h += `<p><a href="about.html">保護者・学校向け：運営とデータの扱い</a></p>\n</main>\n` + footer();
  return { title, desc, html: h };
}

/* ---------- 先生の問題で遊ぶ（custom.html） ---------- */
function customPage() {
  const title = "先生がつくる問題で遊ぶ｜クイズ・たからばこ・すごろく・ロケットはっしゃ・Excel取り込み｜まなびひろば（無料・登録不要）";
  const desc = "どの教科でも使える、先生が自分で問題を作るクラス用ゲーム。クイズ・たからばこ・すごろく・ロケットはっしゃで遊べて、練習用リンクの配布や Excel（表）からの取り込みもできます。無料・登録不要。";
  const canonical = BASE + "guide/custom.html";
  const ld = [{
    "@context": "https://schema.org", "@type": "WebPage", name: title, description: desc, url: canonical, inLanguage: "ja",
    isPartOf: { "@type": "WebSite", name: "まなびひろば", url: BASE }, audience: { "@type": "EducationalAudience", educationalRole: "teacher" },
    about: "先生が作る問題を使った学習ゲーム", mainEntity: { "@type": "LearningResource", name: "先生がつくる もんだい", learningResourceType: "クイズ作成・ゲーム", teaches: "すべての教科", educationalLevel: "小学校", inLanguage: "ja", isAccessibleForFree: true, provider: { "@type": "Organization", name: "まなびひろば", url: BASE } }
  }, { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "まなびひろば", item: BASE }, { "@type": "ListItem", position: 2, name: "学年・単元から さがす", item: BASE + "guide/" }, { "@type": "ListItem", position: 3, name: "先生の問題で遊ぶ", item: canonical }] }];
  let h = head({ title, desc, canonical, ld });
  h += header([["まなびひろば", "../index.html"], ["学年・単元から さがす", "index.html"], ["先生の問題で遊ぶ"]]);
  h += `<main class="wrap">\n<h1>先生がつくる問題で遊ぶ<span class="h1sub">どの教科でも使える（単元の一覧にない内容にも）</span></h1>
<p class="lead">単元の一覧にない内容や、学級オリジナルの問題は、先生が自分で問題を作って遊べます。学年や教科は問いません。</p>
<section aria-labelledby="c1"><h2 id="c1" class="sect">できること</h2><ul class="modes big">
<li><b>クイズ</b><span>全員が同時に答える。先生が画面に結果を出す</span></li>
<li><b>たからばこ</b><span>正解するとたからばこが開く、クラス対戦</span></li>
<li><b>すごろく</b><span>正解で進むクラス対戦</span></li>
<li><b>ロケットはっしゃ</b><span>みんなで力を合わせる協力ゲーム</span></li>
<li><b>練習用リンク</b><span>リンクを開くと、児童がひとりで練習できる</span></li>
<li><b>Excel（表）から取り込み</b><span>表をコピーして貼ると、問題がまとめて入る</span></li></ul></section>
<section aria-labelledby="c2"><h2 id="c2" class="sect">使い方</h2><ol class="how3"><li>「先生がつくる もんだい」を開いて、問題と答えを入力します（表からの貼り付けもできます）。</li><li>ゲーム（クイズ・たからばこ・すごろく）を選んで、クラスに参加用のコードや QR を見せます。</li><li>練習用リンクを作って配ると、授業の外でも練習できます。</li></ol>
<p class="acts"><a class="btn go" href="../index.html#make">先生がつくる もんだいを 開く</a><a class="btn sub" href="index.html">単元から さがす</a></p></section>
<section aria-labelledby="c3"><h2 id="c3" class="sect">単元から作るなら</h2><p>算数などの単元の問題を、そのままクラス用の問題セットにすることもできます。<a href="index.html">学年・単元から さがす</a>で単元を選び、「課題リンクと QR を作る」へ進んでください。</p></section>
</main>\n` + footer();
  return { title, desc, html: h };
}

/* ---------- 書き出し ---------- */
function aboutPage() {
  const title = "保護者・学校向け｜まなびひろばの運営とデータの扱い";
  const desc = "まなびひろばは個人開発の無料学習ゲームです。登録不要。端末に残る記録、対戦時の通信先、名前の扱い、連絡先を説明します。";
  const canonical = BASE + "guide/about.html";
  const ld = [{ "@context": "https://schema.org", "@type": "WebPage", name: title, description: desc, url: canonical, inLanguage: "ja" }];
  let h = head({ title, desc, canonical, ld });
  h += header([["まなびひろば", "../index.html"], ["学年・単元から さがす", "index.html"], ["保護者・学校向け"]]);
  h += `<main class="wrap about"><h1>保護者・学校向け<span class="h1sub">運営とデータの扱い</span></h1>
<p>まなびひろばは、個人が開発・運営する無料の学習ゲームです。登録も広告もありません。お問い合わせ・不具合の報告は <a href="https://github.com/TOKUGAWAIEYASUDONO/manabi-hiroba/issues">GitHub リポジトリの Issues</a> へお願いします。公開投稿なので、児童の個人情報は書かないでください。</p>
<h2>集めない物・端末に残る物</h2><p>このサイトの運営者は名前、メールアドレス、アカウント、位置情報、成績を収集しません。端末には学年・遊びの記録・どんぐり・ふりがな等の設定が保存されます。主な保存キー：<code>mh_setup</code>、<code>mh_best</code>、<code>mh_col</code>、<code>mh_colcfg</code>、<code>mh_fg</code>、<code>mh_ui</code>、<code>mh_sound</code>、<code>mh_quiz_sets</code>、<code>mh_upick</code>、<code>mh_troom</code>。対戦中の一時情報：<code>mh_net</code>、<code>mh_host</code>、<code>mh_name_s</code>。授業リンクの固定には、このタブだけに <code>mh_lesson_hash</code> を使います。自分専用の端末と指定した場合だけ <code>mh_name</code> に名前が残ります。共有端末では指定しないでください。記録は端末で遊んだ履歴であり、成績評価には使えません。</p>
<p>共有画像 <code>vendor/img/og-home.png</code> は AI生成画像（このプロジェクトで Codex の画像生成を使い、2026-11-12 に作成）。実在の人物の写真ではありません。</p>
<p>授業リンクの固定には、このタブだけに <code>mh_lesson_lock</code>（固定を始めた時刻）を使います。タブを閉じると消えます。</p>
<h2>対戦時の名前・通信</h2><p>名前は既定では自動ニックネームです。先生が名前入力を選んだ場合だけ児童が入力できます。</p>
<h3>通常方式：GitHub Pages ＋ PeerJS</h3><p>通常のサイト表示は GitHub Pages から配信されます。友だち対戦では <code>0.peerjs.com</code>（接続仲介）と STUN/TURN（<code>stun.l.google.com</code>・<code>*.turn.peerjs.com</code>、接続補助・中継）にも通信します。これらには接続に必要な IP アドレスが届きます。対戦用の名前や得点は先生の端末のメモリに置かれ、部屋を閉じると消えます。</p>
<h3>予備方式：学校が動かす node サーバー（<code>?net=server</code>）</h3><p>学校が自分で <code>server.js</code> を動かす場合、対戦中だけ、その学校のサーバーのメモリに名前（または自動ニックネーム）・得点・正誤が置かれます。部屋が消えると、これらも消えます。このサーバーとデータを管理するのは、サーバーを動かした学校です。通常方式の PeerJS ではなく、学校のサーバーに接続します。</p>
<p><a href="index.html">← 学年・単元ガイドへ</a></p></main>` + footer();
  return { title, desc, html: h };
}

const CSS = `/* まなびひろば 先生向けガイド（本体の色・文字と同じ。外部読み込みなし） */
:root{--board:#1f4d3a;--field:#e9f4e4;--ink:#1b2a22;--muted:#46564d;--edge:#16372a;--paper:#fff;--line:#c9d8c8;--chalk:#d6ebdd;--math:#cf3d2c;--jp:#2f6fd8;--soc:#f2c230;--eng:#7a4cc8;--go:#1b7a4b;--sun:#ff9422;--bad:#b3261e}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--field);color:var(--ink);font-family:'BIZ UDPGothic',"Hiragino Kaku Gothic ProN","Yu Gothic UI","Yu Gothic","Meiryo",system-ui,sans-serif;line-height:1.75;font-size:16px}
.wrap{max-width:960px;margin:0 auto;padding:0 16px}
a{color:#0f5a35}
a:focus-visible,summary:focus-visible{outline:3px solid var(--sun);outline-offset:2px}
.top{background:var(--board);color:#fff}.top .wrap{display:flex;align-items:center;gap:12px;min-height:52px}
.brand{color:#fff;font-weight:bold;font-size:20px;text-decoration:none}.tag{color:var(--chalk);font-size:14px}
.crumb{font-size:14px;padding-top:10px;padding-bottom:2px;color:var(--muted)}.crumb a{color:var(--muted)}
h1{font-size:clamp(22px,4.6vw,32px);line-height:1.4;margin:14px 0 8px}
.h1sub{display:block;font-size:clamp(15px,2.6vw,18px);color:var(--muted);font-weight:normal;margin-top:2px}
.lead{margin:6px 0 14px}
.sect{font-size:20px;margin:28px 0 8px;padding-left:10px;border-left:8px solid var(--board)}
.note{color:var(--muted);margin:4px 0 10px}
.gnav,.subj,.tbnav{display:flex;flex-wrap:wrap;gap:8px;margin:8px 0;align-items:center}
.gnav a,.subj a{min-width:56px;min-height:44px;display:inline-flex;align-items:center;justify-content:center;padding:4px 14px;background:var(--paper);border:2px solid var(--edge);border-radius:10px;text-decoration:none;color:var(--ink);font-weight:bold;box-shadow:0 3px 0 var(--edge)}
.gnav a[aria-current],.subj a[aria-current]{background:var(--board);color:#fff}
.subj a{border-radius:999px;box-shadow:none}
.tbnav a{min-height:40px;display:inline-flex;align-items:center;padding:2px 12px;background:var(--paper);border:2px solid var(--edge);border-radius:999px;text-decoration:none;color:var(--ink);font-weight:bold}
.tbnav a[aria-current]{background:var(--board);color:#fff}
.tbblock{margin:16px 0;scroll-margin-top:12px}.tbblock h3{font-size:18px;margin:6px 0}
.tbt td.ul small{color:var(--muted)}
.toc{columns:2 280px;margin:6px 0;padding-left:1.6em}.toc li{break-inside:avoid;padding:2px 0}
.badge{display:inline-block;font-size:12px;background:#fff3d6;border:1px solid #c9a066;border-radius:6px;padding:0 6px;vertical-align:middle;color:#5b3d10;font-weight:normal}
.units{display:grid;gap:16px;margin-top:12px}
.unit{background:var(--paper);border:2px solid var(--line);border-left:10px solid var(--board);border-radius:12px;padding:14px 16px 16px;scroll-margin-top:12px}
.unit.later{background:#f4f6f3;border-left-color:#aeb9b2}
.unit h2{font-size:clamp(22px,4.4vw,28px);line-height:1.35;margin:0 0 2px}
.meta{margin:0;color:var(--muted);font-size:14px}
.steps{margin:8px 0;font-size:15px}.steps .cur{background:var(--board);color:#fff;border-radius:6px;padding:0 8px;font-weight:bold}
.ex{margin:10px 0}.ex>b{display:block;font-size:14px;color:var(--muted)}
.modes{list-style:none;padding:0;margin:4px 0;display:flex;flex-wrap:wrap;gap:6px}
.modes li{border:2px solid var(--edge);border-radius:10px;padding:2px 10px;background:#e1f0e3;display:flex;flex-direction:column;line-height:1.4;font-size:15px}
.modes li span{font-size:12px;color:var(--muted)}.modes li.soon{background:#f4f6f3;border-style:dashed}
.modes.big li{padding:8px 14px;flex:1 1 240px;font-size:17px}.modes.big li span{font-size:14px}
.qs{margin:4px 0;padding-left:1.6em}.qs li{padding:3px 0}.qs .q{font-size:18px;font-weight:bold;margin-right:12px}.qs .q small{font-weight:normal;color:var(--muted)}.qs .a{color:var(--go);font-weight:bold;white-space:nowrap}
.facts{display:flex;flex-wrap:wrap;gap:6px 24px;margin:8px 0}.facts div{display:flex;gap:8px}.facts dt{color:var(--muted)}.facts dt::after{content:"："}.facts dd{margin:0;font-weight:bold}
.how{margin:8px 0}.how summary{cursor:pointer;min-height:32px}.how p{background:var(--field);border-radius:8px;padding:8px 12px;margin:6px 0}
.acts{display:flex;flex-wrap:wrap;gap:10px;margin:12px 0 4px}
.btn{display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:6px 18px;border-radius:12px;border:2px solid var(--edge);text-decoration:none;font-weight:bold;box-shadow:0 4px 0 var(--edge);color:var(--ink);background:#fff}
.btn.go{background:var(--go);color:#fff}
.base,.soon{font-size:13px;color:var(--muted);margin:6px 0 0}
.sets{list-style:none;padding:0;display:grid;gap:10px}.sets li{display:flex;flex-wrap:wrap;gap:6px 14px;align-items:center}.sets li span{font-size:14px;color:var(--muted);flex:1 1 260px}
.tablewrap{overflow-x:auto}
table.grid{border-collapse:collapse;width:100%;background:var(--paper);border:2px solid var(--edge)}
.grid caption{text-align:left;color:var(--muted);font-size:14px;padding:4px 0}
.grid th,.grid td{border:1px solid var(--line);padding:6px 10px;text-align:center}
.grid thead th{background:var(--board);color:#fff}.grid tbody th{background:#e1f0e3;white-space:nowrap}
.grid.games td,.grid.games th,.grid.tbt td{text-align:left}
.cell{display:flex;align-items:center;justify-content:center;gap:4px;min-height:48px;text-decoration:none;font-weight:bold;color:var(--ink);border-radius:8px}
.cell b{font-size:22px}.cell.s-sansu b{color:var(--math)}.cell.s-kokugo b{color:var(--jp)}.cell.s-shakai b{color:#7a5d00}.cell.s-eigo b{color:var(--eng)}
.none{color:#6f7d75}
.gblock{background:var(--paper);border:2px solid var(--line);border-radius:12px;padding:6px 14px 10px;margin:10px 0}.gblock h3{margin:6px 0;font-size:20px}
.srow{margin:6px 0;display:flex;flex-wrap:wrap;gap:4px 8px;align-items:center}
.slink{font-weight:bold;color:#fff;background:var(--board);padding:2px 10px;border-radius:8px;text-decoration:none}
.slink.s-sansu{background:var(--math)}.slink.s-kokugo{background:var(--jp)}.slink.s-shakai{background:#f2c230;color:var(--ink)}.slink.s-eigo{background:var(--eng)}
.ulink{font-size:15px;padding:2px 8px;border:1px solid var(--line);border-radius:999px;text-decoration:none;color:var(--ink);background:#fafdf9}.ulink.later{color:var(--muted);border-style:dashed}
.how3{padding-left:1.4em}.how3 li{margin:6px 0}
.sub3{font-size:17px;margin:14px 0 4px}.calc{padding-left:1.2em;margin:4px 0}
.backtop{margin:24px 0}
.totop{position:fixed;right:12px;bottom:12px;z-index:20;background:#fff;color:var(--ink,#1f3a2c);border:2px solid var(--edge,#1d4b36);border-radius:12px;padding:10px 14px;min-height:44px;display:inline-flex;align-items:center;font-weight:700;font-size:15px;text-decoration:none;box-shadow:0 3px 0 var(--edge,#1d4b36)}
.foot{background:var(--board);color:var(--chalk);margin-top:32px;padding:14px 0;font-size:14px}.foot a{color:#fff}.foot p{margin:4px 0}
@media (max-width:520px){.unit{padding:12px;border-left-width:8px}.qs .a{white-space:normal}.grid th,.grid td{padding:4px 6px}}
@media print{
  :root{--field:#fff}
  body{font-size:11pt;line-height:1.5;background:#fff}
  .top,.crumb,.gnav,.subj,.tbnav,.acts,.backtop,.totop,.foot,.how summary,.sets a.btn{display:none}
  .wrap{max-width:none;padding:0}
  .unit{break-inside:avoid;border:1px solid #888;border-left:6px solid #333;margin:0 0 8px;padding:6px 10px}
  .unit h2{font-size:15pt}
  .modes li{background:#fff;border:1px solid #666}
  .toc{columns:3}
  a{color:#000;text-decoration:none}
  .gblock,.tbblock{break-inside:avoid}
}
`;
const out = new Map();
out.set("guide/guide.css", CSS);
const cssVersion = crypto.createHash("sha256").update(Buffer.from(CSS, "utf8")).digest("hex").slice(0, 8);
const names = [];
for (const p of pages) { out.set("guide/" + p.file, gradePage(p).html); names.push(p.file); }
out.set("guide/index.html", indexPage().html);
out.set("guide/custom.html", customPage().html);
out.set("guide/about.html", aboutPage().html);
const urls = [BASE, BASE + "guide/", ...pages.map(p => BASE + "guide/" + p.file), BASE + "guide/custom.html", BASE + "guide/about.html"];
out.set("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u, i) => `  <url><loc>${u}</loc><priority>${i === 0 ? "1.0" : i === 1 ? "0.9" : "0.7"}</priority></url>`).join("\n")}\n</urlset>\n`);
out.set("robots.txt", `User-agent: *\nAllow: /\n\nSitemap: ${BASE}sitemap.xml\n`);
fs.mkdirSync(path.join(root, "guide"), { recursive: true });
for (const [f, s] of out) fs.writeFileSync(path.join(root, f), f.startsWith("guide/") && f.endsWith(".html") ? s.replace(/href="guide\.css(?:\?v=[0-9a-f]{8})?"/g, `href="guide.css?v=${cssVersion}"`) : s, "utf8");
for (const f of fs.readdirSync(path.join(root, "guide"))) if (/^g\d-[a-z]+\.html$/.test(f) && !names.includes(f)) fs.unlinkSync(path.join(root, "guide", f));
console.log(`guide: 教科ページ${pages.length} + 入口 + custom、単元 ${UNITS.length}（ready ${ready(UNITS).length}）、教科書の並び：${TB ? "あり" : "なし"}`);
