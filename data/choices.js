/* まなびひろば 4択の選択肢の作りかた（index.html と tools/check-questions.js の両方が使う）
   - 漢字よみ：正解と「長さが同じか±1」の読みを優先。送りがな付きの問題には、送りがな付きの読みを優先
   - 英単語：同じ種類（data/questions.js の c）の語から選ぶ。足りないときだけほかの種類で補う
   消去法（長さや種類のちがいだけで答えが分かること）を防ぐためのもの */
window.MH_CHOICE = (function () {
  const okuri = q => /[ぁ-ゖ]$/.test(plain(q));               // 送りがな付き（例：早い・読む）
  /* 《》で付けた読みを取り除いた本文（data/quizlib.js の plain と同じ結果）。長さの比べ・重複の判定はこの本文でする */
  const KAN = "\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff々〆〇ヶ";
  const RB = new RegExp("(?:[｜|]([^｜|《》\n]{1,30})|([" + KAN + "]+))《[^《》\n]{1,30}》", "g");
  const plain = s => String(s == null ? "" : s).replace(RB, (m, a, b) => a || b);
  const lenOf = s => [...plain(s)].length;
  /* all = 読みの候補を取る問題（全学年）、item = 出す問題。まちがいの読みを3つ返す */
  function kanji(all, item, shuffle) {
    const ok = okuri(item.q), n = lenOf(item.a), seen = new Set([item.a]), tiers = Array.from({length: 7 * 4}, () => []);
    for (const x of shuffle(all)) {
      if (seen.has(x.a)) continue; seen.add(x.a);
      const same = okuri(x.q) === ok, near = Math.abs(lenOf(x.a) - n) <= 1;
      const distance = Math.min(6, Math.abs((x.g || item.g) - item.g));
      const kind = same && near ? 0 : same ? 1 : near ? 2 : 3;
      const tier = distance === 0 ? (same ? kind : 14 + kind) : (same ? 2 + (distance - 1) * 2 + (near ? 0 : 1) : 18 + distance);
      tiers[tier].push(x.a);
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
  return { kanji, eigo, okuri, plain };
})();
