/* まなびひろば 4択の選択肢の作りかた（index.html と tools/check-questions.js の両方が使う）
   - 漢字よみ：正解と「長さが同じか±1」の読みを優先。送りがな付きの問題には、送りがな付きの読みを優先
   - 英単語：同じ種類（data/questions.js の c）の語から選ぶ。足りないときだけほかの種類で補う
   消去法（長さや種類のちがいだけで答えが分かること）を防ぐためのもの */
window.MH_CHOICE = (function () {
  const okuri = q => /[ぁ-ゖ]$/.test(String(q));               // 送りがな付き（例：早い・読む）
  const lenOf = s => [...String(s)].length;
  /* all = 読みの候補を取る問題（全学年）、item = 出す問題。まちがいの読みを3つ返す */
  function kanji(all, item, shuffle) {
    const ok = okuri(item.q), n = lenOf(item.a), seen = new Set([item.a]), tiers = [[], [], [], []];
    for (const x of shuffle(all)) {
      if (seen.has(x.a)) continue; seen.add(x.a);
      const same = okuri(x.q) === ok, near = Math.abs(lenOf(x.a) - n) <= 1;
      tiers[same && near ? 0 : same ? 1 : near ? 2 : 3].push(x.a);
    }
    return [].concat(...tiers).slice(0, 3);
  }
  /* list = その学年で出せる英単語（c は種類） */
  function eigo(list, item, shuffle) {
    const seen = new Set([item.a]), same = [], rest = [];
    for (const x of shuffle(list)) {
      if (seen.has(x.a)) continue; seen.add(x.a);
      (x.c && x.c === item.c ? same : rest).push(x.a);
    }
    return [...same, ...rest].slice(0, 3);
  }
  return { kanji, eigo, okuri };
})();
