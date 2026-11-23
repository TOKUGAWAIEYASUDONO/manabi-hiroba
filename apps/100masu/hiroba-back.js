/* ひらめっと で 足した 小さな スクリプト：100マス計算から ホームへ もどる ボタン
 *
 * ・メニューの ポップアップ（data-testid="start-menu"）の「スタート！」の下にだけ出す。
 *   とりくんでいる間は出さない（押しまちがえて とちゅうで ぬけないように）。
 *   とちゅうで やめるときは「ストップ」→「おわる」で メニューに もどってから押す。
 * ・ひらめっと から ひらいたとき（ホームの タイル・先生のページ）は、ブラウザの「戻る」と同じように
 *   ひらく前の 画面へ もどる。ほかの ひらき方（ブックマーク・インストールした アプリなど）は ひらめっとの ホームへ。
 * ・「100マス はっぴょう」は ひらめっとの 画面の 中（iframe）で ひらくので、ここでは 何も出さない
 *   （外の「◀ もどる」で とじる）。
 * ・記録（localStorage）には さわらない。build し直した dist でも index.html から読みこめば そのまま使える。
 */
(function () {
  'use strict';
  try { if (window.self !== window.top) return; } catch (e) { return; }

  var ID = 'mh-hiroba-back';
  var home = new URL('../../', location.href);

  function goHiroba() {
    try {
      var r = document.referrer ? new URL(document.referrer) : null;
      if (r && r.origin === location.origin && (r.pathname === home.pathname || r.pathname === home.pathname + 'index.html') && history.length > 1) {
        history.back();
        // もどれなかったとき（前の ページが 消えている など）は ホームを ひらく
        setTimeout(function () { location.href = home.href + 'index.html'; }, 1500);
        return;
      }
    } catch (e) { /* 下へ */ }
    location.href = home.href + 'index.html';
  }

  function makeButton() {
    var b = document.createElement('button');
    b.type = 'button';
    b.id = ID;
    b.textContent = '◀ ホームに もどる';
    var s = b.style;
    s.display = 'block'; s.width = '100%'; s.minHeight = '48px'; s.marginTop = '10px';
    s.border = '1px solid #cbd5e1'; s.borderRadius = '14px'; s.background = '#fff';
    s.color = '#334155'; s.fontWeight = '700'; s.fontSize = '17px'; s.cursor = 'pointer';
    b.addEventListener('click', goHiroba);
    return b;
  }

  function place() {
    var start = document.querySelector('[data-testid="start-menu"] [data-testid="menu-start"]');
    if (!start || !start.parentNode) return;
    if (start.parentNode.querySelector('#' + ID)) return;
    start.parentNode.appendChild(makeButton());
  }

  function boot() {
    place();
    new MutationObserver(place).observe(document.getElementById('root') || document.body, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
