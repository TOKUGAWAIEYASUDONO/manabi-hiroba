/* 算数の 文章題（1〜6年）と、Qalc のコース一覧（MIT © 2026 GIGAyama）にあって まなびひろばに 無かった計算。
   Qalc の問題文は使わず、場面・言い回しは ここで新しく書いた（数は毎回ちがう）。人の名前は出さない。
   - 1年は ひらがなだけ。2年からは その学年までの漢字に 読み《》を 付けて書く（数＋かぞえ方の 人・本・回・日・分・倍 は core.js の counter が読みを付ける）
   - 答えは テンキーで 打てる形（整数／小数／分数／商とあまり／数＋単位）。秒の「何分何秒」だけ 4択
   - 文章題は tools-viz.js の「ずで かんがえる」が 1年は ブロック・さくらんぼ、かけ算・わり算は アレイを 出す（単元IDで 判定） */
(function (G) {
  const g = G.gens, { ch, numFb, noCarry, noBorrow, dec, frac, gcd } = G;
  const S = a => a.filter(x => x != null && isFinite(x) && x > 0).map(String);
  /* 整数の答え：まちがい候補（よくある間違い）と 近くの数 */
  const pk = (r, a, wrong, o) => ch(r, a, S(wrong).filter(x => x !== String(a)), numFb(r, a, Object.assign({ min: 1 }, o || {})), { loose: true });
  /* 数＋単位の答え（"350g"） */
  const pkU = (r, a, u, wrong, o) => ch(r, a + u, S(wrong).filter(x => x !== String(a)).map(x => x + u), numFb(r, a, Object.assign({ min: 1, fmt: x => x + u }, o || {})), { loose: true });
  /* 小数の答え：整数 n を 10^p でわった値。まちがいも 10^p 倍の整数で わたす */
  const pkD = (r, n, p, wrong) => {
    const A = dec(n, p), ok = x => x > 0 && x !== n;
    return ch(r, A, wrong.filter(ok).map(x => dec(x, p)).filter(x => x !== A), numFb(r, n, { min: 1, fmt: x => dec(x, p), ok: x => x % 10 !== 0 }), { loose: true });
  };
  const R1 = (r, a, b) => r.range(a, b);

  /* ================= 1年（ひらがな） ================= */
  const PAIR1 = [["あかい ボール", "あおい ボール", "こ", "あります"], ["おとこのこ", "おんなのこ", "にん", "います"], ["しろい くるま", "くろい くるま", "だい", "あります"],
    ["すずめ", "はと", "わ", "います"], ["うさぎの シール", "くまの シール", "まい", "あります"], ["りんご", "みかん", "こ", "あります"], ["あかい はな", "きいろい はな", "ほん", "あります"]];
  const INC1 = [["こうえんで こどもが", "にん", "あそんで います", "きました"], ["いけに あひるが", "わ", "います", "きました"], ["ちゅうしゃじょうに くるまが", "だい", "とまって います", "きました"],
    ["はこに ボールが", "こ", "はいって います", "いれました"], ["ノートに シールが", "まい", "はって あります", "はりました"], ["かびんに はなが", "ほん", "さして あります", "さしました"]];
  const DEC1 = [["こうえんで こどもが", "にん", "あそんで います", "かえりました"], ["でんせんに すずめが", "わ", "とまって います", "とんで いきました"], ["おさらに クッキーが", "こ", "あります", "たべました"],
    ["おりがみが", "まい", "あります", "つかいました"], ["ちゅうしゃじょうに くるまが", "だい", "とまって います", "でて いきました"], ["かごに みかんが", "こ", "はいって います", "たべました"]];
  const nan = u => "なん" + (u === "ほん" ? "ぼん" : u);
  const ks = u => (u === "ほん" ? "ほん" : u);          // 数の あとの かぞえかた（1年は ひらがなで 書く）
  /* あわせて・ふえると（p.carry：10を こえる） */
  g.bunAdd1 = (r, p) => {
    let a, b;
    if (p.carry) { a = R1(r, 2, 9); b = R1(r, Math.max(2, 11 - a), 9); } else { const s = R1(r, 3, 10); a = R1(r, 1, s - 1); b = s - a; }
    const s = a + b, w = [s + 1, s - 1, Math.abs(a - b), s + 10, s - 10];
    if (r.chance(0.5)) { const [x, y, u, be] = r.pick(PAIR1); return { q: `${x}が ${a}${ks(u)}、 ${y}が ${b}${ks(u)} ${be}。 あわせて ${nan(u)}？`, a: String(s), choices: pk(r, s, w, { max: 20 }) }; }
    const [sc, u, be, inc] = r.pick(INC1);
    return { q: `${sc} ${a}${ks(u)} ${be}。 ${b}${ks(u)} ${inc}。 ぜんぶで ${nan(u)}？`, a: String(s), choices: pk(r, s, w, { max: 20 }) };
  };
  /* のこりは いくつ（p.borrow：十いくつ − 1けたの くりさがり） */
  g.bunSub1 = (r, p) => {
    let a, b;
    if (p.borrow) { a = R1(r, 11, 18); b = R1(r, a % 10 + 1, 9); } else { a = R1(r, 3, 10); b = R1(r, 1, a - 1); }
    const d = a - b, w = [a + b, d + 1, d - 1, d + 10, b];
    if (p.borrow && r.chance(0.35)) { const [x, y, u, be] = r.pick(PAIR1); return { q: `${x}が ${a}${ks(u)}、 ${y}が ${b}${ks(u)} ${be}。 ちがいは ${nan(u)}？`, a: String(d), choices: pk(r, d, w, { max: 20 }) }; }
    const [sc, u, be, dc] = r.pick(DEC1);
    return { q: `${sc} ${a}${ks(u)} ${be}。 ${b}${ks(u)} ${dc}。 のこりは ${nan(u)}？`, a: String(d), choices: pk(r, d, w, { max: 20 }) };
  };
  /* ちがいは いくつ（くらべる・あと いくつ・すわれない・すくない） */
  const LACK1 = [["こども", "にん", "います", "いす", "こ", "いすに すわれない こどもは"], ["こども", "にん", "います", "ぼうし", "こ", "ぼうしが もらえない こどもは"], ["ケーキ", "こ", "あります", "おさら", "まい", "おさらに のらない ケーキは"]];
  g.bunChigai1 = (r) => {
    const k = r.int(4);
    let a = R1(r, 2, 10), b = R1(r, 1, 9);
    if (a === b) b = a === 1 ? 2 : a - 1;
    if (k === 0) { const [x, y, u, be] = r.pick(PAIR1), d = Math.abs(a - b); return { q: `${x}が ${a}${ks(u)}、 ${y}が ${b}${ks(u)} ${be}。 どちらが おおいかな。 ちがいは ${nan(u)}？`, a: String(d), choices: pk(r, d, [a + b, d + 1, d - 1, Math.max(a, b)], { max: 20 }) }; }
    if (a < b) [a, b] = [b, a];
    const d = a - b;
    if (k === 1) { const [x, u, be, y, v, tail] = r.pick(LACK1); return { q: `${x}が ${a}${u} ${be}。 ${y}が ${b}${v} あります。 ${tail} ${nan(u)}？`, a: String(d), choices: pk(r, d, [a + b, d + 1, d - 1, b], { max: 20 }) }; }
    if (k === 2) { const [x, , u] = r.pick(PAIR1.filter(t => t[3] === "あります")); return { q: `${x}を ${b}${ks(u)} もって います。 あと ${nan(u)}で ${a}${ks(u)}に なる？`, a: String(d), choices: pk(r, d, [a + b, d + 1, d - 1, a], { max: 20 }) }; }
    const [x, y, u, be] = r.pick(PAIR1);
    return { q: `${x}が ${a}${ks(u)} ${be}。 ${y}は それより ${d}${ks(u)} すくないです。 ${y}は ${nan(u)}？`, a: String(b), choices: pk(r, b, [a + d, b + 1, b - 1, d], { max: 20 }) };
  };
  /* 3つの かずの ぶんしょうだい（ふえる・へる・のって おりる） */
  g.bun3kazu1 = (r) => {
    const k = r.int(3);
    if (k === 0) {
      const a = R1(r, 2, 9), b = R1(r, 1, 6), c = R1(r, 1, Math.min(9, 20 - a - b)), s = a + b + c, [sc, u, be, inc] = r.pick(INC1);
      return { q: `${sc} ${a}${ks(u)} ${be}。 ${b}${ks(u)} ${inc}。 また ${c}${ks(u)} ${inc}。 ぜんぶで ${nan(u)}？`, a: String(s), choices: pk(r, s, [a + b, b + c, s + 1, s - 1, s - 10], { max: 20 }) };
    }
    if (k === 1) {
      const a = R1(r, 8, 18), b = R1(r, 1, Math.min(6, a - 3)), c = R1(r, 1, Math.min(6, a - b - 1)), d = a - b - c, [sc, u, be, dc] = r.pick(DEC1);
      return { q: `${sc} ${a}${ks(u)} ${be}。 ${b}${ks(u)} ${dc}。 また ${c}${ks(u)} ${dc}。 のこりは ${nan(u)}？`, a: String(d), choices: pk(r, d, [a - b, a - c, a - b + c, d + 1, d - 1], { max: 20 }) };
    }
    const a = R1(r, 4, 12), b = R1(r, 1, a - 1), c = R1(r, 1, Math.min(9, 20 - a + b)), s = a - b + c;
    return { q: `バスに ${a}にん のって います。 ていりゅうじょで ${b}にん おりて、 ${c}にん のりました。 いま なんにん？`, a: String(s), choices: pk(r, s, [a + b + c, a - b - c, a + b - c, s + 1, s - 1], { max: 20 }) };
  };
  /* じゅんじょ（なんばんめと なんにん） */
  g.bunJunjo1 = (r) => {
    const k = r.int(4);
    if (k === 0) { const i = R1(r, 2, 9), j = R1(r, 1, 9), s = i + j; return { q: `こどもが 1れつに ならんで います。 ぼうしを かぶった こは まえから ${i}ばんめで、 その うしろに ${j}にん います。 みんなで なんにん？`, a: String(s), choices: pk(r, s, [s - 1, s + 1, Math.abs(i - j)], { max: 20 }) }; }
    if (k === 1) { const i = R1(r, 2, 9), j = R1(r, 2, 9), s = i + j - 1; return { q: `たなに はこが よこに ならんで います。 あかい はこは ひだりから ${i}ばんめ、 みぎから ${j}ばんめです。 はこは ぜんぶで なんこ？`, a: String(s), choices: pk(r, s, [i + j, s - 1, i + j + 1], { max: 20 }) }; }
    const n = R1(r, 6, 15), i = R1(r, 2, n - 1);
    if (k === 2) { const s = n - i + 1; return { q: `こどもが ${n}にん 1れつに ならんで います。 まえから ${i}ばんめの こは、 うしろから なんばんめ？`, a: String(s), choices: pk(r, s, [n - i, n - i + 2, i], { max: 20 }) }; }
    const s = n - i; return { q: `こどもが ${n}にん 1れつに ならんで います。 まえから ${i}ばんめの こ の うしろには、 なんにん いる？`, a: String(s), choices: pk(r, s, [n - i + 1, s - 1, i - 1, i], { max: 20 }) };
  };
  /* なん十の たし算・ひき算（1年：100まで／2年：何十・何百） */
  g.nanjuu = (r, p) => {
    const k = r.int(2);
    if (p.big) {
      if (r.chance(0.5)) {          // 何十 ± 何十（100を こえる）
        if (k === 0) { const a = R1(r, 3, 9) * 10, b = R1(r, Math.max(2, 11 - a / 10), 9) * 10, s = a + b; return { q: `${a} + ${b}`, a: String(s), choices: pk(r, s, [s - 100, s + 10, s - 10, s * 10 / 10 + 100], { step: 10, max: 1000 }) }; }
        const a = R1(r, 11, 18) * 10, b = R1(r, a / 10 - 9, 9) * 10, d = a - b; return { q: `${a} − ${b}`, a: String(d), choices: pk(r, d, [d + 100, d + 10, d - 10, a + b], { step: 10, max: 1000 }) };
      }
      if (k === 0) { const a = R1(r, 1, 8) * 100, b = R1(r, 1, 10 - a / 100) * 100, s = a + b; return { q: `${a} + ${b}`, a: String(s), choices: pk(r, s, [s + 100, s - 100, s / 10, Math.abs(a - b)], { step: 100, max: 1000 }) }; }
      const a = R1(r, 3, 10) * 100, b = R1(r, 1, a / 100 - 1) * 100, d = a - b; return { q: `${a} − ${b}`, a: String(d), choices: pk(r, d, [d + 100, d - 100, a + b, d / 10], { step: 100, max: 1000 }) };
    }
    if (k === 0) { const a = R1(r, 1, 8) * 10, b = R1(r, 1, 10 - a / 10) * 10, s = a + b; return { q: `${a} + ${b}`, a: String(s), choices: pk(r, s, [s + 10, s - 10, a / 10 + b / 10, Math.abs(a - b)], { step: 10, max: 100 }) }; }
    const a = R1(r, 3, 10) * 10, b = R1(r, 1, a / 10 - 1) * 10, d = a - b; return { q: `${a} − ${b}`, a: String(d), choices: pk(r, d, [d + 10, d - 10, a + b > 100 ? null : a + b, a / 10 - b / 10], { step: 10, max: 100 }) };
  };

  /* ================= 2年（2年までの漢字・読みつき） ================= */
  const NANI = { "人": "何人《なんにん》", "本": "何本《なんぼん》", "回": "何回《なんかい》", "円": "何円《なんえん》", "倍": "何倍《なんばい》", "台": "何台《なんだい》", "秒": "何秒《なんびょう》", "分": "何分《なんぷん》" };
  const nani = u => NANI[u] || "何《なん》" + u;
  const PAIR2 = [["赤《あか》い 花《はな》", "白《しろ》い 花《はな》", "本", "さいて います"], ["男《おとこ》の子《こ》", "女《おんな》の子《こ》", "人", "います"],
    ["赤《あか》い 色紙《いろがみ》", "青《あお》い 色紙《いろがみ》", "まい", "あります"], ["えんぴつ", "ボールペン", "本", "あります"], ["絵本《えほん》", "｜図かん《ずかん》", "さつ", "あります"]];
  const INC2 = [["公園《こうえん》で 子《こ》どもが", "人", "あそんで います", "来《き》ました"], ["池《いけ》に 鳥《とり》が", "わ", "います", "とんで 来《き》ました"],
    ["本《ほん》だなに 本《ほん》が", "さつ", "あります", "ならべました"], ["はこに ビー玉《だま》が", "こ", "入《はい》って います", "入《い》れました"]];
  const DEC2 = [["色紙《いろがみ》が", "まい", "あります", "つかいました"], ["公園《こうえん》で 子《こ》どもが", "人", "あそんで います", "帰《かえ》りました"],
    ["シールが", "まい", "あります", "友《とも》だちに あげました"], ["池《いけ》に 鳥《とり》が", "わ", "います", "とんで いきました"]];
  const GOODS2 = ["ノート", "けしゴム", "はさみ", "のり", "ものさし", "クレヨン"];
  const two = (r, list) => { const s = r.shuffle(list); return [s[0], s[1]]; };
  /* 2けたの たし算の 文章題 */
  g.bunAdd2 = (r) => {
    const a = R1(r, 12, 89), b = R1(r, 11, Math.min(89, 150 - a)), s = a + b, w = [noCarry(a, b), s + 10, s - 10, s + 1, Math.abs(a - b)], k = r.int(4), o = { max: 200 };
    if (k === 0) { const [x, y, u, be] = r.pick(PAIR2); return { q: `${x}が ${a}${u}、 ${y}が ${b}${u} ${be}。 あわせて ${nani(u)}？`, a: String(s), choices: pk(r, s, w, o) }; }
    if (k === 1) { const [sc, u, be, inc] = r.pick(INC2); return { q: `${sc} ${a}${u} ${be}。 あとから ${b}${u} ${inc}。 ぜんぶで ${nani(u)}？`, a: String(s), choices: pk(r, s, w, o) }; }
    if (k === 2) { const [x, y] = two(r, GOODS2); return { q: `${a}円の ${x}と ${b}円の ${y}を 買《か》います。 あわせて 何円《なんえん》？`, a: String(s), choices: pk(r, s, w, o) }; }
    return { q: `なわとびを 朝《あさ》に ${a}回、 夜《よる》に ${b}回 とびました。 あわせて 何回《なんかい》 とんだ？`, a: String(s), choices: pk(r, s, w, o) };
  };
  /* 2けたの ひき算の 文章題（のこり・ちがい・おつり・のこりの ページ） */
  g.bunSub2 = (r) => {
    const k = r.int(4);
    let a = R1(r, 30, 99), b = R1(r, 11, a - 5);
    if (k === 2) { a = 100; b = R1(r, 12, 88); }
    const d = a - b, w = [noBorrow(a, b), a + b > 200 ? null : a + b, d + 10, d - 10, d + 1], o = { max: 200 };
    if (k === 0) { const [sc, u, be, dc] = r.pick(DEC2); return { q: `${sc} ${a}${u} ${be}。 ${b}${u} ${dc}。 のこりは ${nani(u)}？`, a: String(d), choices: pk(r, d, w, o) }; }
    if (k === 1) { const [x, y, u, be] = r.pick(PAIR2); return { q: `${x}が ${a}${u}、 ${y}が ${b}${u} ${be}。 ちがいは ${nani(u)}？`, a: String(d), choices: pk(r, d, w, o) }; }
    if (k === 2) { const x = r.pick(GOODS2); return { q: `${a}円 もって います。 ${b}円の ${x}を 買《か》うと、 のこりは 何円《なんえん》？`, a: String(d), choices: pk(r, d, w, o) }; }
    return { q: `${a}ページの 本《ほん》を ${b}ページまで 読《よ》みました。 のこりは 何《なん》ページ？`, a: String(d), choices: pk(r, d, w, o) };
  };
  /* はじめの 数・ふえた 数を もとめる（ぎゃくに 考《かんが》える） */
  const HAVE2 = [["色紙《いろがみ》", "まい"], ["シール", "まい"], ["あめ", "こ"], ["ビー玉《だま》", "こ"]];
  g.bunGyaku2 = (r) => {
    const k = r.int(4), [t, u] = r.pick(HAVE2), o = { max: 100 };
    if (k === 0) { const s = R1(r, 25, 95), b = R1(r, 6, s - 12), a = s - b; return { q: `${t}を 何《なん》${u}か もって いました。 ${b}${u} もらったので、 ${s}${u}に なりました。 はじめに 何《なん》${u} もって いた？`, a: String(a), choices: pk(r, a, [s + b, a + 10, a - 10, a + 1], o) }; }
    if (k === 1) { const s = R1(r, 12, 60), b = R1(r, 6, Math.min(39, 99 - s)), a = s + b; return { q: `${t}を 何《なん》${u}か もって いました。 ${b}${u} つかったので、 のこりが ${s}${u}に なりました。 はじめに 何《なん》${u} もって いた？`, a: String(a), choices: pk(r, a, [s - b, a + 10, a - 10, a + 1], o) }; }
    if (k === 2) { const a = R1(r, 12, 60), s = R1(r, a + 6, 95), d = s - a; return { q: `バスに ${a}人 のって いました。 ていりゅうじょで 何人《なんにん》か のって きたので、 ${s}人に なりました。 のって きたのは 何人《なんにん》？`, a: String(d), choices: pk(r, d, [a + s > 100 ? null : a + s, d + 10, d - 10, d + 1], o) }; }
    const a = R1(r, 5, 10) * 10, s = R1(r, 5, a - 15), d = a - s; return { q: `${a}円 もって いました。 おかしを 買《か》ったら、 のこりが ${s}円に なりました。 おかしは 何円《なんえん》？`, a: String(d), choices: pk(r, d, [a + s > 100 ? null : a + s, d + 10, d - 10, d + 1], o) };
  };
  /* かけ算の 文章題（ばい・くばる・すわる・あと いくつ） */
  g.bunKake2 = (r) => {
    const a = R1(r, 2, 9), k = R1(r, 2, 9), s = a * k, f = r.int(4), w = [a + k, s + a, s - a, s + k], o = { max: 90 };
    if (f === 0) return { q: `${a}cmの テープの ${k}ばいの 長《なが》さは 何《なん》cm？`, a: String(s), choices: pk(r, s, w, o) };
    if (f === 1) return { q: `あめを 1人に ${a}こずつ、 ${k}人に くばります。 あめは ぜんぶで 何《なん》こ いる？`, a: String(s), choices: pk(r, s, w, o) };
    if (f === 2) return { q: `長《なが》いす 1つに ${a}人ずつ すわります。 長《なが》いすが ${k}つ あると、 ぜんぶで 何人《なんにん》 すわれる？`, a: String(s), choices: pk(r, s, w, o) };
    const c = R1(r, 1, a - 1 || 1), t = s + c; return { q: `たまごが ${a}こずつ ${k}れつ ならんで いて、 ほかに ${c}こ あります。 たまごは ぜんぶで 何《なん》こ？`, a: String(t), choices: pk(r, t, [s, a * (k + 1), a + k + c, t + 1, t - 1], o) };
  };
  /* 長さ・かさの 文章題（数＋単位で 答える） */
  g.bunTani2 = (r) => {
    const f = r.int(4);
    if (f === 0) { const a = R1(r, 2, 9), b = R1(r, 1, 9), c = R1(r, 1, 9), d = R1(r, 1, 9), s = a * 10 + b + c * 10 + d; return { q: `${a}cm${b}mmの テープと ${c}cm${d}mmの テープを つなぎます。 ぜんぶで 何《なん》mm？`, a: s + "mm", choices: pkU(r, s, "mm", [a + b + c + d, (a + c) + (b + d) * 10, s + 10, s - 10], { max: 200 }) }; }
    if (f === 1) { const a = R1(r, 30, 99), b = R1(r, 12, a - 8), d = a - b; return { q: `${a}cmの ひもから ${b}cm 切《き》りとると、 のこりは 何《なん》cm？`, a: d + "cm", choices: pkU(r, d, "cm", [noBorrow(a, b), a + b, d + 10, d - 10], { max: 200 }) }; }
    if (f === 2) { const a = R1(r, 1, 4), b = R1(r, 1, 9), c = R1(r, 2, 9), s = a * 10 + b + c; return { q: `水《みず》が ${a}L${b}dL あります。 ${c}dL たすと、 何《なん》dLに なる？`, a: s + "dL", choices: pkU(r, s, "dL", [a + b + c, a * 100 + b + c, s + 10, s - 10], { max: 200 }) }; }
    const a = R1(r, 12, 30), b = R1(r, 3, a - 4), d = a - b; return { q: `ジュースが ${a}dL あります。 ${b}dL のむと、 のこりは 何《なん》dL？`, a: d + "dL", choices: pkU(r, d, "dL", [a + b, d + 10, d - 1, d + 1], { max: 200 }) };
  };

  /* ================= 3年 ================= */
  const PLACE3 = ["図書館《としょかん》", "動物園《どうぶつえん》", "水族館《すいぞくかん》"];
  const GOODS3 = ["ノート", "ペン", "絵《え》の具《ぐ》", "ボール", "本《ほん》"];
  /* 3けたの たし算・ひき算の 文章題 */
  g.bunAddSub3 = (r) => {
    const f = r.int(4), o = { max: 1000 };
    if (f === 0) { const a = r.pick([500, 600, 700, 800, 1000]), b = R1(r, 105, a - 30), d = a - b, x = r.pick(GOODS3); return { q: `${a}円 もって います。 ${b}円の ${x}を 買《か》うと、 のこりは 何円《なんえん》？`, a: String(d), choices: pk(r, d, [noBorrow(a, b), d + 100, d - 100, d + 10, d - 10], Object.assign({ step: 10 }, o)) }; }
    if (f === 1) { const a = R1(r, 120, 480), b = R1(r, 110, 480), s = a + b, pl = r.pick(PLACE3); return { q: `${pl}に きのうは ${a}人、 きょうは ${b}人 来《き》ました。 あわせて 何人《なんにん》？`, a: String(s), choices: pk(r, s, [noCarry(a, b), s + 100, s - 100, s + 10, s - 10], o) }; }
    if (f === 2) { const a = R1(r, 150, 490), b = R1(r, 102, a - 20), d = a - b; return { q: `青《あお》い 本《ほん》は ${a}ページ、 赤《あか》い 本《ほん》は ${b}ページ あります。 ちがいは 何《なん》ページ？`, a: String(d), choices: pk(r, d, [noBorrow(a, b), d + 100, d - 100, d + 10, d - 10], o) }; }
    const [x, y] = two(r, GOODS3), a = R1(r, 120, 480), b = R1(r, 105, 480), s = a + b; return { q: `${a}円の ${x}と ${b}円の ${y}を 買《か》うと、 代金《だいきん》は 何円《なんえん》？`, a: String(s), choices: pk(r, s, [noCarry(a, b), s + 100, s - 100, s + 10, s - 10], o) };
  };
  /* かけ算の 文章題（2・3けた×1けた、2けた×2けた） */
  g.bunKake3 = (r) => {
    const f = r.int(4), o = { max: 9999 };
    if (f === 3) { const a = R1(r, 12, 48), b = R1(r, 12, 30), s = a * b; return { q: `画用紙《がようし》が 1たば ${a}まいで、 ${b}たば あります。 画用紙《がようし》は ぜんぶで 何《なん》まい？`, a: String(s), choices: pk(r, s, [a * (b % 10) + Math.floor(b / 10) * a, s + a, s - a, s + 10, s - 10], o) }; }
    const a = f === 0 ? R1(r, 3, 25) * 10 + r.pick([0, 5]) : R1(r, 12, 98), b = R1(r, 3, 9), s = a * b, w = [a + b, s + a, s - a, s + 10, s - 10, s + 100];
    if (f === 0) { const x = r.pick(GOODS3); return { q: `1こ ${a}円の ${x}を ${b}こ 買《か》うと、 代金《だいきん》は 何円《なんえん》？`, a: String(s), choices: pk(r, s, w, o) }; }
    if (f === 1) return { q: `1はこに ${a}こ 入《はい》った クッキーが ${b}はこ あります。 クッキーは ぜんぶで 何《なん》こ？`, a: String(s), choices: pk(r, s, w, o) };
    return { q: `1日に ${a}ページずつ 本《ほん》を 読《よ》みます。 ${b}日で 何《なん》ページ 読《よ》める？`, a: String(s), choices: pk(r, s, w, o) };
  };
  /* 何倍・大きい数の わり算の 文章題 */
  g.bunBai3 = (r) => {
    const f = r.int(3), o = { max: 999 };
    if (f === 2) {             // 何十・2けた ÷ 1けた（どの くらいも わりきれる）
      const d = R1(r, 2, 4), t = R1(r, 1, Math.floor(9 / d)), u = R1(r, 0, Math.floor(9 / d)), q = t * 10 + u, n = d * q, x = r.pick([["あめ", "こ"], ["色紙《いろがみ》", "まい"], ["シール", "まい"]]);
      return { q: `${x[0]}が ${n}${x[1]} あります。 ${d}人で 同《おな》じ 数《かず》ずつ 分《わ》けると、 1人 何《なん》${x[1]}？`, a: String(q), choices: pk(r, q, [n - d, q + 10, q - 10, q + 1, d * 10], o) };
    }
    const s = R1(r, 3, 12), k = R1(r, 2, 9), b = s * k;
    if (f === 0) return { q: `赤《あか》い テープは ${b}cm、 白《しろ》い テープは ${s}cmです。 赤《あか》い テープの 長《なが》さは、 白《しろ》い テープの 何倍《なんばい》？`, a: String(k), choices: pk(r, k, [b - s, k + 1, k - 1, s], { max: 120 }) };
    return { q: `${s}cmの ${k}倍の 長《なが》さは 何《なん》cm？`, a: String(b), choices: pk(r, b, [s + k, b + s, b - s, b + k], { max: 120 }) };
  };
  /* あまりの ある わり算の 文章題（商と あまりで 答える） */
  const amr = (q, r0) => `${q}あまり${r0}`;
  const pkA = (r, q, r0, d) => ch(r, amr(q, r0), [amr(q + 1, r0), r0 + 1 < d ? amr(q, r0 + 1) : null, q > 1 ? amr(q - 1, r0 + d) : null, amr(q, r0 > 1 ? r0 - 1 : r0 + 2), amr(r0, q)].filter(x => x && x !== amr(q, r0)), [amr(q + 2, r0), amr(q + 1, r0 + 1)], { loose: true });
  g.bunAmari3 = (r) => {
    const d = R1(r, 3, 9), q = R1(r, 2, 9), r0 = R1(r, 1, d - 1), n = d * q + r0, f = r.int(3);
    let qq;
    if (f === 0) qq = `あめが ${n}こ あります。 1人に ${d}こずつ 分《わ》けると、 何人《なんにん》に 分《わ》けられて、 何《なん》こ あまる？`;
    else if (f === 1) qq = `色紙《いろがみ》が ${n}まい あります。 ${d}人で 同《おな》じ 数《かず》ずつ 分《わ》けると、 1人 何《なん》まいで、 何《なん》まい あまる？`;
    else qq = `花《はな》が ${n}本 あります。 ${d}本ずつ たばに すると、 何《なん》たば できて、 何本《なんぼん》 あまる？`;
    return { q: qq, a: amr(q, r0), choices: pkA(r, q, r0, d) };
  };
  /* あまりを 考《かんが》える わり算（切り上げ・切りすて） */
  g.bunKiri3 = (r) => {
    const d = R1(r, 3, 9), q = R1(r, 2, 9), r0 = R1(r, 1, d - 1), n = d * q + r0, f = r.int(4), up = q + 1, o = { max: 100 };
    if (f === 0) return { q: `${n}人が 1そうに ${d}人ずつ ボートに のります。 みんなが のるには、 ボートは 何《なん》そう いる？`, a: String(up), choices: pk(r, up, [q, r0, up + 1, d], o) };
    if (f === 1) return { q: `ボールが ${n}こ あります。 1はこに ${d}こずつ 入《い》れます。 ぜんぶ 入《い》れるには、 はこは 何《なん》はこ いる？`, a: String(up), choices: pk(r, up, [q, r0, up + 1, d], o) };
    if (f === 2) return { q: `${n}cmの リボンから、 ${d}cmの リボンを 切《き》りとります。 ${d}cmの リボンは 何本《なんぼん》 とれる？`, a: String(q), choices: pk(r, q, [up, r0, q - 1, d], o) };
    return { q: `${n * 10}円で、 1こ ${d * 10}円の ガムを 買《か》います。 ガムは 何《なん》こまで 買《か》える？`, a: String(q), choices: pk(r, q, [up, r0, q - 1, r0 * 10], { max: 1000 }) };
  };
  /* 時間の 単位（分と 秒） */
  const sec = s => `${s}秒《びょう》`;
  g.byou3 = (r) => {
    const f = r.int(3);
    if (f === 0) { const m = R1(r, 1, 3), s = R1(r, 1, 11) * 5, v = m * 60 + s; return { q: `${m}分${sec(s)}は 何秒《なんびょう》？`, a: String(v), choices: pk(r, v, [m * 100 + s, m + s, v + 60, v - 60, m * 10 + s], { step: 5, max: 600 }) }; }
    if (f === 1) { const m = R1(r, 2, 9), v = m * 60; return { q: `${sec(v)}は 何分《なんぷん》？`, a: String(m), choices: pk(r, m, [v / 10, v / 100 | 0, m + 1, m - 1], { max: 600 }) }; }
    const m = R1(r, 1, 4), s = R1(r, 1, 11) * 5, v = m * 60 + s, A = `${m}分${sec(s)}`;
    return { q: `${sec(v)}は 何分《なんぷん》何秒《なんびょう》？`, a: A, ans: "choice4", choices: ch(r, A, [`${Math.floor(v / 100)}分${sec(v % 100)}`, `${m + 1}分${sec(s)}`, `${m}分${sec(s + 10 > 55 ? s - 10 : s + 10)}`, `${m - 1 || m + 2}分${sec(s)}`].filter(x => !/分0秒|分[6-9]\d秒/.test(G.plain(x))), [`${m + 2}分${sec(s)}`], { loose: true }) };
  };
  /* 長さ・重さの 文章題（数＋単位で 答える） */
  g.bunTani3 = (r) => {
    const f = r.int(4), o = { max: 9999 };
    if (f === 0) { const a = R1(r, 12, 40) * 10, b = R1(r, 21, 90) * 10, s = a + b; return { q: `${a}gの かごに ${b}gの みかんを 入《い》れると、 ぜんたいの 重《おも》さは 何《なん》g？`, a: s + "g", choices: pkU(r, s, "g", [noCarry(a, b), s + 100, s - 100, Math.abs(a - b)], Object.assign({ step: 10 }, o)) }; }
    if (f === 1) { const k = R1(r, 1, 3), x = R1(r, 1, 9) * 50, y = R1(r, 3, 9) * 50 + 20, s = k * 1000 + x - y; return { q: `${k}kg${x}gの にもつから、 ${y}gの 本《ほん》を 出《だ》しました。 にもつは 何《なん》gに なった？`, a: s + "g", choices: pkU(r, s, "g", [k * 100 + x - y, s + 100, s - 100, k * 1000 + x + y], Object.assign({ step: 10 }, o)) }; }
    if (f === 2) { const a = R1(r, 1, 3), b = R1(r, 2, 9) * 100 + r.pick([0, 50]), s = a * 1000 - b; return { q: `${a}kmの 道《みち》のりの うち、 ${b}mを 歩《ある》きました。 のこりは 何《なん》m？`, a: s + "m", choices: pkU(r, s, "m", [a * 100 - b, s + 100, s - 100, a * 1000 + b], Object.assign({ step: 10 }, o)) }; }
    const a = R1(r, 25, 85) * 10, b = R1(r, 25, 85) * 10, s = a + b; return { q: `家《いえ》から 駅《えき》まで ${a}m、 駅《えき》から 公園《こうえん》まで ${b}mです。 家《いえ》から 駅《えき》を 通《とお》って 公園《こうえん》まで 何《なん》m？`, a: s + "m", choices: pkU(r, s, "m", [noCarry(a, b), s + 100, s - 100, Math.abs(a - b)], Object.assign({ step: 10 }, o)) };
  };

  /* ================= 4年 ================= */
  /* 何倍・もとの 大きさ（わり算・かけ算の 文章題） */
  g.bunBai4 = (r) => {
    const s = R1(r, 12, 99), k = R1(r, 2, 9), b = s * k, f = r.int(4), o = { max: 1000 };
    if (f === 0) return { q: `${s}mの ${k}倍は 何《なん》m？`, a: String(b), choices: pk(r, b, [s + k, b + s, b - s, b + 10], o) };
    if (f === 1) return { q: `赤《あか》い ゴムは ${b}cm、 白《しろ》い ゴムは ${s}cmです。 赤《あか》い ゴムの 長《なが》さは、 白《しろ》い ゴムの 何倍《なんばい》？`, a: String(k), choices: pk(r, k, [b - s, k + 1, k - 1, k + 2], o) };
    if (f === 2) return { q: `ある 数《かず》を ${k}倍すると ${b}に なります。 ある 数《かず》は いくつ？`, a: String(s), choices: pk(r, s, [b * k, b - k, s + 1, s - 1, s + 10], o) };
    return { q: `ビルの 高《たか》さは ${b}mで、 木《き》の 高《たか》さの ${k}倍です。 木《き》の 高《たか》さは 何《なん》m？`, a: String(s), choices: pk(r, s, [b * k, b - k, s + 1, s - 1, s + 10], o) };
  };
  /* 1つの 式に 表《あらわ》して とく（( )・×÷を 先に） */
  g.bunShiki4 = (r) => {
    const f = r.int(4), o = { max: 10000 };
    if (f === 0) { const a = R1(r, 6, 15) * 10, b = R1(r, 5, 12) * 10, c = R1(r, 2, 6), v = (a + b) * c; return { q: `1こ ${a}円の パンと、 1本 ${b}円の 牛《ぎゅう》にゅうを 1組《くみ》に して、 ${c}組《くみ》 買《か》います。 代金《だいきん》は 何円《なんえん》？`, a: String(v), choices: pk(r, v, [a + b * c, a * c + b, a + b + c, v + 10], Object.assign({ step: 10 }, o)) }; }
    if (f === 1) { const m = r.pick([500, 1000]), a = R1(r, 4, 12) * 10, c = R1(r, 2, 6), v = m - a * c; if (v <= 0) return g.bunShiki4(r); return { q: `${m}円 出《だ》して、 1こ ${a}円の ${r.pick(GOODS3)}を ${c}こ 買《か》いました。 おつりは 何円《なんえん》？`, a: String(v), choices: pk(r, v, [m - a + c, (m - a) * c, a * c, v + 10], Object.assign({ step: 10 }, o)) }; }
    if (f === 2) { const k = R1(r, 3, 9), p = R1(r, 3, 8), n = k * p + R1(r, 4, 40), v = n - k * p; return { q: `${n}まいの 色紙《いろがみ》を、 ${k}人に ${p}まいずつ 配《くば》ります。 のこりは 何《なん》まい？`, a: String(v), choices: pk(r, v, [(n - k) * p, n - k - p, k * p, v + 1], o) }; }
    const a = R1(r, 6, 24), b = R1(r, 3, 9), c = R1(r, 1, a - 1), v = a * b + c; return { q: `1はこ ${a}こ入《い》りの クッキーが ${b}はこと、 ばらの クッキーが ${c}こ あります。 クッキーは ぜんぶで 何《なん》こ？`, a: String(v), choices: pk(r, v, [a * (b + c), a + b + c, a * b, v + 10], o) };
  };
  /* 小数の 文章題（小数で 答える） */
  g.bunShosu4 = (r) => {
    const f = r.int(4);
    if (f === 0) { const x = R1(r, 12, 29), k = R1(r, 3, 9), v = x * k; if (v % 10 === 0 || x % 10 === 0) return g.bunShosu4(r); return { q: `1本 ${dec(x, 1)}Lの ジュースが ${k}本 あります。 ジュースは ぜんぶで 何《なん》L？`, a: dec(v, 1), ans: "dec", choices: pkD(r, v, 1, [v * 10, v / 10 | 0, x + k * 10, v + 10]) }; }
    if (f === 1) { const k = R1(r, 3, 8), q = R1(r, 12, 29), y = q * k; if (q % 10 === 0 || y % 10 === 0) return g.bunShosu4(r); return { q: `${dec(y, 1)}mの リボンを、 ${k}人で 同《おな》じ 長《なが》さずつ 分《わ》けます。 1人 何《なん》m？`, a: dec(q, 1), ans: "dec", choices: pkD(r, q, 1, [q * 10, q + 10, q - 10, q + 1]) }; }
    if (f === 2) { const a = R1(r, 11, 59), b = R1(r, 11, 39), v = a + b; if (a % 10 === 0 || b % 10 === 0 || v % 10 === 0) return g.bunShosu4(r); return { q: `米《こめ》が ${dec(a, 1)}kg あります。 ${dec(b, 1)}kg ふやすと、 何《なん》kgに なる？`, a: dec(v, 1), ans: "dec", choices: pkD(r, v, 1, [v + 10, v - 10, v + 1, a + b / 10 | 0]) }; }
    const a = R1(r, 25, 99), b = R1(r, 11, a - 8), v = a - b; if (a % 10 === 0 || b % 10 === 0 || v % 10 === 0) return g.bunShosu4(r);
    return { q: `水《みず》が ${dec(a, 1)}L あります。 ${dec(b, 1)}L 使《つか》うと、 のこりは 何《なん》L？`, a: dec(v, 1), ans: "dec", choices: pkD(r, v, 1, [v + 10, v - 10, v + 1, a + b]) };
  };

  /* ================= 5年（割《わり》は 6年の 漢字なので ひらがな） ================= */
  const PCT = [10, 20, 25, 30, 40, 50, 60, 75, 80];
  g.bunWariai5 = (r) => {
    const f = r.int(4), p = r.pick(PCT), o = { max: 10000 };
    const base = (unit) => { for (;;) { const b = R1(r, 2, 30) * unit; if (b * p % 100 === 0) return b; } };
    if (f === 0) { const b = base(10), v = b * p / 100; return { q: `定員《ていいん》 ${b}人の バスに、 定員《ていいん》の ${p}%の 人が 乗《の》って います。 乗《の》って いるのは 何人《なんにん》？`, a: String(v), choices: pk(r, v, [b - v, b * p, v + 10, v * 2, b / p | 0], o) }; }
    if (f === 1) { const pp = r.pick([10, 20, 25, 30, 40, 50]), b = (() => { for (;;) { const x = R1(r, 2, 30) * 100; if (x * pp % 100 === 0) return x; } })(), v = b * (100 - pp) / 100; if (pp !== p) return { q: `${b}円の 品物《しなもの》が ${pp}%引《び》きに なりました。 ねだんは 何円《なんえん》？`, a: String(v), choices: pk(r, v, [b * pp / 100, b - pp, v + 100, v - 100], Object.assign({ step: 10 }, o)) }; return { q: `${b}円の 品物《しなもの》が ${p}%引《び》きに なりました。 ねだんは 何円《なんえん》？`, a: String(v), choices: pk(r, v, [b * p / 100, b - p, v + 100, v - 100], Object.assign({ step: 10 }, o)) }; }
    if (f === 2) { const b = base(10), v = b * p / 100; return { q: `クラブに 入《はい》って いる ${v}人は、 学年《がくねん》 ぜんたいの ${p}%に あたります。 学年《がくねん》 ぜんたいは 何人《なんにん》？`, a: String(b), choices: pk(r, b, [v * p / 100 | 0, v + p, b + 10, b - 10, v * 2], o) }; }
    const n = r.pick([10, 20, 40, 50]), s = n * p / 100; if (!Number.isInteger(s) || s === 0) return g.bunWariai5(r);
    return { q: `シュートを ${n}回 して、 ${s}回 入《はい》りました。 入《はい》った わりあいは 何《なん》%？`, a: String(p), choices: pk(r, p, [s, n - s, 100 - p, p + 10, p - 10], { max: 100, step: 5 }) };
  };
  g.bunBuai5 = (r) => {
    const f = r.int(4), k = R1(r, 1, 9), o = { max: 10000 };
    if (f === 0) { const n = R1(r, 2, 40) * 10, v = n * k / 10; return { q: `${n}人の ${k}わりは 何人《なんにん》？`, a: String(v), choices: pk(r, v, [n * k, n - v, v + 10, k * 10], o) }; }
    if (f === 1) { const b = R1(r, 3, 30) * 100, v = b * (10 - k) / 10; return { q: `${b}円の ぼうしが ${k}わり引《び》きに なりました。 ねだんは 何円《なんえん》？`, a: String(v), choices: pk(r, v, [b * k / 10, b - k * 10, v + 100, v - 100], Object.assign({ step: 10 }, o)) }; }
    if (f === 2) { const n = r.pick([10, 20, 30, 40, 50]), s = n * k / 10; return { q: `シュートを ${n}回 して、 ${s}回 入《はい》りました。 入《はい》った わりあいは 何《なん》わり？`, a: String(k), choices: pk(r, k, [s, n - s, 10 - k, k + 1, k - 1].filter(x => x <= 10), { max: 10 }) }; }
    const b = R1(r, 2, 20) * 100, a = b * k / 10; return { q: `${a}円は ${b}円の 何《なん》わり？`, a: String(k), choices: pk(r, k, [10 - k, k + 1, k - 1, k + 2].filter(x => x <= 10), { max: 10 }) };
  };

  /* ================= 6年 ================= */
  const coprime = (r) => { for (;;) { const p = R1(r, 1, 9), q = R1(r, 1, 9); if (p !== q && gcd(p, q) === 1) return [p, q]; } };
  g.bunHi6 = (r) => {
    const [p, q] = coprime(r), k = R1(r, 2, 12), f = r.int(4), o = { max: 1000 };
    if (f === 0) { const v = q * k; return { q: `赤《あか》い 玉《たま》と 白《しろ》い 玉《たま》の 数《かず》の 比《ひ》は ${p}:${q}です。 赤《あか》い 玉《たま》が ${p * k}この とき、 白《しろ》い 玉《たま》は 何《なん》こ？`, a: String(v), choices: pk(r, v, [p * k, k, (p + q) * k, p * k + q, v + q], o) }; }
    if (f === 1) { const v = p * k; return { q: `色紙《いろがみ》 ${(p + q) * k}まいを、 姉《あね》と 妹《いもうと》で ${p}:${q}に 分《わ》けます。 姉《あね》は 何《なん》まい？`, a: String(v), choices: pk(r, v, [q * k, (p + q) * k / 2 | 0, k, v + k], o) }; }
    if (f === 2) { const v = p * k; return { q: `たてと 横《よこ》の 長《なが》さの 比《ひ》が ${p}:${q}の 長方形《ちょうほうけい》を かきます。 横《よこ》を ${q * k}cmに すると、 たては 何《なん》cm？`, a: String(v), choices: pk(r, v, [q * k * q, k, (p + q) * k, v + q], o) }; }
    const v = q * k * 10; return { q: `すと サラダ油《あぶら》を ${p}:${q}の 比《ひ》で まぜて、 ドレッシングを 作《つく》ります。 すを ${p * k * 10}mLに すると、 サラダ油《あぶら》は 何《なん》mL？`, a: String(v), choices: pk(r, v, [p * k * 10, k * 10, (p + q) * k * 10, v + 10], o) };
  };
  /* 分数の かけ算・わり算の 文章題（答えは 1より 小さい 分数） */
  const proper = (r) => { for (;;) { const d = R1(r, 2, 9), n = R1(r, 1, d - 1); if (gcd(n, d) === 1) return [n, d]; } };
  const fr = (n, d) => frac(n, d);
  g.bunBunsu6 = (r) => {
    const f = r.int(3);
    for (let t = 0; t < 200; t++) {
      const [a, b] = proper(r), [c, d] = proper(r);
      if (f === 0) {
        const A = fr(a * c, b * d); if (!/\//.test(A)) continue;
        const w = [fr(a + c, b + d), fr(a * d, b * c), fr(a * c, b + d), fr(c, d), fr(a, b)].filter(x => /\//.test(x) && x !== A);
        if (w.length < 2) continue;
        return { q: `1mの 重《おも》さが ${a}/${b} kgの ぼうが あります。 この ぼう ${c}/${d} mの 重《おも》さは 何《なん》kg？`, a: A, ans: "frac", choices: ch(r, A, w, [fr(a * c + 1, b * d), fr(Math.max(1, a * c - 1), b * d)].filter(x => /\//.test(x)), { loose: true }) };
      }
      if (f === 1) {
        if (c * b >= a * d) continue;                         // (c/d) ÷ (a/b) が 1より 小さい
        const A = fr(c * b, d * a); if (!/\//.test(A)) continue;
        const w = [fr(a * c, b * d), fr(a * d, b * c), fr(c + b, d + a), fr(c, d)].filter(x => /\//.test(x) && x !== A);
        if (w.length < 2) continue;
        return { q: `${c}/${d} m²の かべを ぬるのに、 ペンキを ${a}/${b} dL 使《つか》いました。 ペンキ 1dLで 何《なん》m² ぬれる？`, a: A, ans: "frac", choices: ch(r, A, w, [fr(c * b + 1, d * a), fr(Math.max(1, c * b - 1), d * a)].filter(x => /\//.test(x)), { loose: true }) };
      }
      const k = R1(r, 2, 5), A = fr(a, b * k); if (!/\//.test(A)) continue;
      const w = [fr(a * k, b), fr(a, b + k), fr(a + k, b * k), fr(a, b)].filter(x => /\//.test(x) && x !== A);
      if (w.length < 2) continue;
      return { q: `${a}/${b} Lの ジュースを、 ${k}人で 同《おな》じ かさずつ 分《わ》けます。 1人分《ぶん》は 何《なん》L？`, a: A, ans: "frac", choices: ch(r, A, w, [fr(a + 1, b * k), fr(a, b * k + 1)].filter(x => /\//.test(x)), { loose: true }) };
    }
    throw Error("bunBunsu6 candidate");
  };
})(window.MH_GEN);
