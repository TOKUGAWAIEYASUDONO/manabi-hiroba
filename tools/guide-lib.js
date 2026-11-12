/* build-guide.js と check-guide.js が共有する読み込み（data/*.js は window グローバル形式なので vm で読む） */
const fs = require("fs"), path = require("path"), vm = require("vm");
const root = path.join(__dirname, "..");
function load() {
  const ctx = { window: {} };
  vm.createContext(ctx);
  const files = ["data/kanji-grade.js", "data/questions.js", "data/choices.js", "data/gen/core.js"];
  for (const f of fs.readdirSync(path.join(root, "data/gen")).sort()) if (f !== "core.js" && f.endsWith(".js")) files.push("data/gen/" + f);
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
const BASE = "https://tokugawaieyasudono.github.io/manabi-hiroba/";
const SUBJ = { sansu: "算数", kokugo: "国語", shakai: "社会", eigo: "英語" };
const SUBJ_ORDER = ["sansu", "kokugo", "shakai", "eigo"];
const pageName = (g, s) => `g${g}-${s}.html`;
module.exports = { root, load, BASE, SUBJ, SUBJ_ORDER, pageName };
