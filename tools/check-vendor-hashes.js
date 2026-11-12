// 同梱物（vendor/）の SHA-256 一覧の作成と検査
//   node tools/check-vendor-hashes.js          … vendor/SHA256SUMS.txt と現物を照らし合わせる（ちがえば失敗）
//   node tools/check-vendor-hashes.js --write  … 一覧を作りなおす（部品を入れかえたときだけ）
// 書式は sha256sum と同じ（"ハッシュ  ファイル名"）。 vendor フォルダで `sha256sum -c SHA256SUMS.txt` でも検査できる。
// 配布元・バージョン・ライセンスは vendor/THIRD-PARTY-LICENSES.txt を見る。
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const dir = path.join(__dirname, "..", "vendor"), out = path.join(dir, "SHA256SUMS.txt");
const walk = (d, base = "") => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name), base + e.name + "/") : [base + e.name]);
// 自作の共有カード画像は第三者提供の部品ではないため、同梱物一覧の対象外。
const files = walk(dir).filter(f => f !== "SHA256SUMS.txt" && !/^img\/og-[^/]+\.png$/.test(f)).sort();
const sha = f => crypto.createHash("sha256").update(fs.readFileSync(path.join(dir, f))).digest("hex");
const now = files.map(f => [sha(f), f]);
if (process.argv.includes("--write")) {
  fs.writeFileSync(out, now.map(([h, f]) => `${h}  ${f}`).join("\n") + "\n");
  console.log(`vendor/SHA256SUMS.txt に ${now.length} ファイルを書きました`); return;
}
if (!fs.existsSync(out)) { console.log("NG  vendor/SHA256SUMS.txt がありません（--write で作る）"); process.exit(1); }
const exp = new Map(fs.readFileSync(out, "utf8").split(/\r?\n/).filter(Boolean).map(l => { const m = l.match(/^([0-9a-f]{64})  (.+)$/); return m ? [m[2], m[1]] : [l, "?"]; }));
let bad = 0;
for (const [h, f] of now) { if (!exp.has(f)) { console.log("NG  一覧にない: " + f); bad++; } else if (exp.get(f) !== h) { console.log("NG  ハッシュがちがう: " + f); bad++; } }
for (const f of exp.keys()) if (!now.some(x => x[1] === f)) { console.log("NG  ファイルがない: " + f); bad++; }
console.log(bad ? `${bad} 件の不一致` : `vendor ${now.length} ファイルのSHA-256が一覧と一致しました`);
process.exitCode = bad ? 1 : 0;
