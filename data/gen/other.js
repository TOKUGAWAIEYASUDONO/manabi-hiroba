/* 国語・社会・英語の型：既存の問題データ（window.MH_QUESTIONS）を単元で切り出す。データはコピーせず参照する。
   読み込み順：data/kanji-grade.js・data/questions.js・data/choices.js のあと（呼ばれたときに参照するので、順番はゆるい） */
(function (G) {
  const g = G.gens;
  const Q = () => window.MH_QUESTIONS || { kanji: [], kencho: [], eigo: [] };
  const CH = () => window.MH_CHOICE;
  // 漢字の読み（p.g 年の漢字。p.upTo=true なら p.g 年までの全部）
  g.kanjiYomi = (r, p) => {
    const all = Q().kanji, pool = all.filter(x => p.upTo ? x.g <= p.g : x.g === p.g);
    const item = r.pick(pool), wrong = CH().kanji(all, item, r.shuffle);
    return { q: item.q, stem: p.g <= 2 ? "この かんじの よみは？" : "この漢字の読みは？", a: item.a, ans: "choice4", choices: r.shuffle([item.a, ...wrong]), src: item.id };
  };
  // 県庁所在地（p.rg=地方コードの配列。なければ全国）。まちがいは同じ地方から、足りなければ近い地方から
  g.kencho = (r, p) => {
    const D = Q(), all = D.kencho, pool = p.rg ? all.filter(x => p.rg.includes(x.rg)) : all, item = r.pick(pool);
    const reg = D.kenchoRegions || {}, order = [item.rg, ...((reg[item.rg] || {}).near || [])];
    const wrong = [];
    for (const rg of order) for (const x of r.shuffle(all.filter(y => y.rg === rg && y.a !== item.a && !wrong.some(w => w.a === y.a)))) { if (wrong.length < 3) wrong.push(x); }
    const ruby = { [item.a]: item.r }; wrong.forEach(w => { ruby[w.a] = w.r; });
    return { q: item.q, stem: "県庁所在地は？", a: item.a, ans: "choice4", choices: r.shuffle([item.a, ...wrong.map(w => w.a)]), ruby, src: item.id };
  };
  // 英単語（p.g 年・種類 p.cs の語を出す。まちがいは同じ種類から：choices.js）
  g.eigo = (r, p) => {
    const all = Q().eigo, list = all.filter(x => x.g <= p.g), pool = all.filter(x => x.g === p.g && (!p.cs || p.cs.includes(x.c))), item = r.pick(pool);
    const wrong = CH().eigo(list, item, r.shuffle);
    return { q: item.q, stem: "意味は？", a: item.a, ans: "choice4", choices: r.shuffle([item.a, ...wrong]), src: item.id };
  };
})(window.MH_GEN);
