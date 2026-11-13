#!/usr/bin/env node
// ブラウザなしで問題文の文字サイズ規則と適用範囲を確認する。
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
assert.doesNotMatch(html, /id="quick"|home\.quick/, 'ホームの「1分であそぶ」は出さない');
const main = cp.execFileSync('git', ['show', 'main:index.html'], {cwd: root, encoding: 'utf8'});
const rules = source => [...source.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
  .filter(([, , body]) => /(?:^|;)\s*font-size\s*:/.test(body))
  .map(([, selector, body]) => ({selector: selector.trim(), size: body.match(/(?:^|;)\s*font-size\s*:\s*([^;}]+)/)[1].trim()}));
const get = (source, selector) => rules(source).filter(r => r.selector === selector);
const base = get(html, '.q .big');
assert.equal(base.length, 1, '共通の問題文サイズ規則は1つ');
assert.equal(base[0].size, get(main, '.q .big')[0]?.size, '共通の問題文サイズは main と同じ');
assert.equal(base[0].size, 'clamp(40px,11vw,76px)');
const art = get(html, '.play.pg .q:has(#qpic) .big');
assert.deepEqual(art.map(r => r.size).sort(), ['20px', 'clamp(26px,7vw,34px)'].sort(), '絵つき専用の通常・375px規則');
assert.match(html, /<div class="q"><div id="qpic"><\/div><div class="big" id="qq">/, '単元画面は絵の容器を持つ');
assert.equal((html.match(/id="qpic"/g) || []).length, 1, '絵の容器は単元画面だけ');
for (const r of rules(html)) {
  if (!/\.big(?:\b|:)/.test(r.selector) || !/\.play\.pg|\.q/.test(r.selector)) continue;
  if (r.size === 'clamp(26px,7vw,34px)') assert.equal(r.selector, '.play.pg .q:has(#qpic) .big', '小さい文字サイズは絵つき限定');
}
assert.doesNotMatch(html, /\.play\.pg \.q \.big\s*\{\s*font-size/, '練習全体への縮小を禁止');
console.log('layout: 共通の問題文は main と同じ、縮小は絵つき単元だけ');
