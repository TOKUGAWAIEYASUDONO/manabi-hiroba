#!/usr/bin/env node
// 公開前の一括確認。生成後にすべての check-* / test-* を実行する。
const fs = require('fs'), path = require('path'), cp = require('child_process');
const dir = __dirname;
const scripts = ['stamp-version.js', 'build-guide.js', ...fs.readdirSync(dir).filter(f => /^(check|test)-.*\.js$/.test(f)).sort()];
for (const file of scripts) {
  console.log(`\n▶ ${file}`);
  const result = cp.spawnSync(process.execPath, [path.join(dir, file)], { cwd: path.join(dir, '..'), stdio: 'inherit' });
  if (result.status !== 0) { console.error(`停止: ${file} (終了 ${result.status})`); process.exit(result.status || 1); }
}
console.log('\n公開前検査: 全件合格');
