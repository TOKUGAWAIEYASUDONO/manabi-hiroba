/* build-guide.js と check-guide.js が共有する読み込み（data/*.js は window グローバル形式なので vm で読む） */
const fs = require("fs"), path = require("path"), vm = require("vm");
const root = path.join(__dirname, "..");
function load() {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const ctx = { window: { RIKA_PUBLIC: /window\.RIKA_PUBLIC\s*=\s*true\s*;/.test(html) } };
  vm.createContext(ctx);
  const files = ["data/kanji-grade.js", "data/questions.js", "data/choices.js", "data/gen/core.js"];
  for (const f of fs.readdirSync(path.join(root, "data/gen")).sort()) if (f !== "core.js" && f.endsWith(".js") && (f !== "rika.js" || ctx.window.RIKA_PUBLIC)) files.push("data/gen/" + f);
  files.push("data/units.js", "data/calc.js");
  for (const f of files) vm.runInContext(fs.readFileSync(path.join(root, f), "utf8"), ctx, { filename: f });
  // 教科書会社ごとの並び（別担当が作る。無ければ標準の並びだけ）。const/var/window どれで書かれていても拾う
  const tbFile = path.join(root, "data/textbook-order.js");
  ctx.window.TEXTBOOK_ORDER = null;
  if (fs.existsSync(tbFile)) {
    vm.runInContext(fs.readFileSync(tbFile, "utf8") + "\n;window.__tb = (typeof TEXTBOOK_ORDER !== 'undefined') ? TEXTBOOK_ORDER : window.TEXTBOOK_ORDER;", ctx, { filename: "data/textbook-order.js" });
    ctx.window.TEXTBOOK_ORDER = ctx.window.__tb || null;
  }
  return ctx.window;
}
/* 住所は data/move.js の SITE だけ（ON で 新しい住所 hirametto.com に かわる）。canonical・sitemap・robots・JSON-LD・OGP に 使う */
const MOVE = require("../data/move.js");
const BASE = MOVE.BASE;
/* 先生向けガイドの ページも、古い住所で 開かれたら 新しい住所へ 移る（オフの あいだは 何もしない）。版は 中身の ハッシュ */
const MOVE_TAG = `<script src="../data/move.js?v=${require("crypto").createHash("sha256").update(fs.readFileSync(path.join(root, "data/move.js"))).digest("hex").slice(0, 8)}"></script>`;
const SUBJ = { sansu: "算数", kokugo: "国語", shakai: "社会", eigo: "英語" };
const SUBJ_ORDER = ["sansu", "kokugo", "shakai", "eigo"];
const pageName = (g, s) => `g${g}-${s}.html`;
module.exports = { root, load, BASE, SUBJ, SUBJ_ORDER, pageName, MOVE_TAG };
