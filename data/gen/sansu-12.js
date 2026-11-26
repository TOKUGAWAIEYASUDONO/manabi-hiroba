/* 算数 1〜2年の型。1年の問題文はひらがな（学年配当の漢字だけ使う） */
(function (G) {
  const g = G.gens, { ch, numFb, noCarry, noBorrow } = G;
  const nf = (r, n, o) => numFb(r, n, o);
  // 細分単元: 条件を満たす組だけから作る（上限付き抽選）。
  // carry：none＝どの くらいも くり上がらない／ones＝一のくらいだけ（答え 2けた）／tens＝十のくらいだけ／both＝一と十の 両方
  // borrow：none＝どの くらいも くり下がらない／ones＝一のくらいで くり下がる（今まで通り）／tens＝十のくらいだけ／both＝一と十の 両方
  const dg = (n, k) => Math.floor(n / Math.pow(10, k)) % 10;
  const colsAdd = (a, b) => { const o = []; let c = 0; for (let k = 0; k < 3; k++) { const t = dg(a, k) + dg(b, k) + c; o.push(t >= 10); c = t >= 10 ? 1 : 0; } return o; };
  const colsSub = (a, b) => { const o = []; let br = 0; for (let k = 0; k < 3; k++) { const t = dg(a, k) - br - dg(b, k); o.push(t < 0); br = t < 0 ? 1 : 0; } return o; };
  const PL = ["一のくらい", "十のくらい", "百のくらい"];
  /* その 問題の 数で 書く「ときかた」（1年でも 読めるように ひらがな＋1年の 字だけ） */
  G.howCalc = (a, b, op) => {
    const sub = op === '−', v = sub ? a - b : a + b;
    if (!sub && a < 10 && b < 10) {
      if (v <= 10) return [`${a} と ${b} を あわせて ${v}。`, "ゆびや ブロックで たしかめても いいよ。"];
      const big = Math.max(a, b), sm = a + b - big, need = 10 - big;
      return [`${big} は あと ${need} で 10。`, `${sm} を ${need} と ${sm - need} に わける。`, `${big} ＋ ${need} ＝ 10、10 と ${sm - need} で ${v}。`];
    }
    if (sub && a <= 10) return [`${a} から ${b} を とると ${v}。`, b === 0 ? "0 を ひいても かずは かわらないよ。" : a === b ? "おなじ かずを ひくと 0 に なるよ。" : "ゆびや ブロックで たしかめても いいよ。"];
    if (sub && a < 20 && b < 10 && a % 10 < b) return [`${a} を 10 と ${a - 10} に わける。`, `10 − ${b} ＝ ${10 - b}。`, `${10 - b} と ${a - 10} で ${v}。`];
    const n = Math.max(String(a).length, String(b).length), L = [];
    if (!sub) {
      let c = 0;
      for (let k = 0; k < n; k++) {
        const x = dg(a, k), y = dg(b, k), t = x + y + c;
        if (k >= String(b).length && !c) { L.push(`${PL[k]}：${x} を そのまま おろす。`); continue; }
        L.push(`${PL[k]}：${x} ＋ ${y}${c ? " ＋ 1（くり上げた 1）" : ""} ＝ ${t}` + (t >= 10 && k < n - 1 ? `。${t % 10} を かいて、1 を くり上げる。` : "。"));
        c = t >= 10 ? 1 : 0;
      }
    } else {
      let br = 0;
      for (let k = 0; k < n; k++) {
        const x = dg(a, k), y = dg(b, k), e = x - br;
        if (k >= String(b).length && k === n - 1 && e === 0) { if (br) L.push(`${PL[k]}：1 かしたので 0。`); break; }
        if (k >= String(b).length && !br) { L.push(`${PL[k]}：${x} を そのまま おろす。`); continue; }
        if (e < y) {
          const head = br ? (x === 0 ? `${PL[k]}：0 は 上の くらいから 1 かりて 10、となりに 1 かして 9。` : `${PL[k]}：1 かしたので ${e}。`) : `${PL[k]}：`;
          const xx = br && x === 0 ? 9 : e + 10;
          if (br && x === 0) L.push(head + `9 − ${y} ＝ ${9 - y}。`), br = 1;
          else { L.push(head + `${e} から ${y} は ひけないので、上の くらいから 1 かりて ${xx} − ${y} ＝ ${xx - y}。`); br = 1; }
        } else { L.push(`${PL[k]}：${br ? `1 かしたので ${e}。` : ""}${e} − ${y} ＝ ${e - y}。`); br = 0; }
      }
    }
    L.push(`こたえは ${v}。`);
    return L;
  };
  g.detail12 = (r, p) => {
    const [amin, amax, bmin, bmax] = p.range;
    let a, b, v, found = false;
    for (let i = 0; i < 20000; i++) {
      a = r.range(amin, amax); b = r.range(bmin, bmax);
      v = p.op === '−' ? a - b : p.op === '×' ? a * b : a + b;
      if (v < 0 || (p.min != null && v < p.min) || (p.max != null && v > p.max)) continue;
      const ca = colsAdd(a, b), cs = colsSub(a, b);
      if (p.carry === 'none' && ca.some(x => x)) continue;
      if (p.carry === 'ones' && (!ca[0] || v >= 100)) continue;
      if (p.carry === 'tens' && (ca[0] || !ca[1])) continue;
      if (p.carry === 'both' && (!ca[0] || !ca[1])) continue;
      if (p.borrow === 'none' && cs.some(x => x)) continue;
      if (p.borrow === 'ones' && (a <= b || a % 10 >= b % 10) && a !== 100) continue;
      if (p.borrow === 'tens' && (a <= b || cs[0] || !cs[1])) continue;
      if (p.borrow === 'both' && (a <= b || !cs[0] || !cs[1])) continue;
      found = true; break;
    }
    if (!found) throw Error('detail12 candidate');
    const q = `${a} ${p.op || '+'} ${b}`;
    return { q, a: String(v), hissan: p.hissan ? { a, b, op: p.op || '+' } : undefined, how: p.op === '×' ? undefined : G.howCalc(a, b, p.op || '+'),
      choices: ch(r, v, [v + 1, v - 1, v + 10, v - 10, a, b].map(String), nf(r, v, { min: 0, max: p.max || 198 }), { loose: true }) };
  };
  g.detailAdd3 = (r, p) => {
    let a, b, c, s;
    do { a = r.range(1, p.max === 10 ? 5 : 9); b = r.range(1, p.max === 10 ? 5 : 9); c = r.range(1, p.max === 10 ? 5 : 9); s = a + b + c; } while (s < p.min || s > p.max);
    return { q: `${a} + ${b} + ${c}`, a: String(s), how: [`まえから じゅんに けいさんするよ。`, `${a} ＋ ${b} ＝ ${a + b}。`, `${a + b} ＋ ${c} ＝ ${s}。`], choices: ch(r, s, [s + 1, s - 1, s + 2, s - 2].map(String), nf(r, s, { min: p.min, max: p.max }), { loose: true }) };
  };

  // ===== 1年 =====
  g.kazoeru = (r, p) => {                                  // 絵文字を数える（20まで）
    const n = r.range(p.min || 1, p.max || 20), e = r.pick(["🍎", "🐟", "⭐", "🍓", "🌸", "🐥", "🎈"]);
    return { q: `${e}は いくつ ある？ ${e.repeat(n)}`, a: String(n), choices: ch(r, n, [n + 1, n - 1, n + 2, n - 2], nf(r, n, { min: 1, max: 22 }), { loose: true }) };
  };
  g.kazuOokii = (r, p) => {                                // 4つの数から いちばん大きい／小さい
    const max = p.max || 99, big = r.chance(0.5);
    let xs;
    do {
      const a = r.range(1, 9), b = r.range(0, 9);
      xs = new Set([a * 10 + b, b * 10 + a, r.range(1, max), r.range(1, max)]);
      xs.delete(0);
    } while (xs.size < 4 || [...xs].some(x => x > max));
    const L = [...xs], a = big ? Math.max(...L) : Math.min(...L);
    return { q: `いちばん ${big ? "おおきい" : "ちいさい"} かずは どれ？`, a: String(a), choices: r.shuffle(L.map(String)), ans: "choice4" };
  };
  g.juuToIchi = (r, p) => {                                // 10が □こ と 1が □こ
    const t = r.range(1, p.maxTens || 9), o = r.range(0, 9), n = t * 10 + o;
    if (r.chance(0.3)) {
      const k = r.range(1, 9);
      return { q: `10が ${k}こで いくつ？`, a: String(k * 10), choices: ch(r, k * 10, [k, k * 10 + 1, k * 100, (k + 1) * 10, (k - 1) * 10 || 10].map(String), nf(r, k * 10, { step: 10, min: 10, max: 90 })) };
    }
    const w = [o * 10 + t, t + o, n + 10, n - 10, n + 1, n - 1];
    return { q: `10が ${t}こと 1が ${o}こで いくつ？`, a: String(n), choices: ch(r, n, w.map(String), nf(r, n, { min: 10, max: 99 })) };
  };
  g.tsugiKazu = (r, p) => {                                // かずの ならび
    const st = r.pick(p.steps || [1, 2, 5, 10]), s0 = st > 1 ? r.range(0, 8) * st : r.range(1, 40), seq = [0, 1, 2, 3].map(i => s0 + i * st);
    const a = s0 + 4 * st;
    if (a > (p.max || 100) || seq[0] < 1) return g.tsugiKazu(r, p);
    return { q: `${seq.join("、")}、□ に はいる かずは？`, a: String(a), choices: ch(r, a, [a + 1, a - 1, a + st * 2, a - st, seq[3] + 1].map(String), nf(r, a, { min: 1, max: 100 })) };
  };
  g.gousei10 = (r) => {                                    // 10は □と □
    const x = r.range(1, 9), a = 10 - x;
    return { q: `10は ${x}と いくつ？`, a: String(a), choices: ch(r, a, [x, a + 1, a - 1, a + 2, a - 2].map(String), nf(r, a, { min: 1, max: 9 })) };
  };
  g.add10 = (r, p) => {                                    // 答えが10までのたし算
    const lim = p.limit || 10, a = r.range(1, lim - 1), b = r.range(1, lim - a), s = a + b;
    return { q: `${a} + ${b}`, a: String(s), how: G.howCalc(a, b, '+'), choices: ch(r, s, [Math.abs(a - b) || 1, s + 1, s - 1, s + 2, a, b].map(String), nf(r, s, { min: 1, max: lim }), { loose: p.loose }), tag: "yoko" };
  };
  g.sub10 = (r, p) => {
    const lim = p.limit || 10, a = r.range(2, lim), b = r.range(1, a - 1), d = a - b;
    return { q: `${a} − ${b}`, a: String(d), how: G.howCalc(a, b, '−'), choices: ch(r, d, [a + b > lim ? 0 : a + b, d + 1, d - 1, d + 2, b].map(String), nf(r, d, { min: 1, max: lim })), tag: "yoko" };
  };
  g.addKuriage = (r) => {                                  // くり上がり：1けた+1けたで10をこえる
    let a, b;
    do { a = r.range(2, 9); b = r.range(2, 9); } while (a + b < 11);
    const s = a + b;
    return { q: `${a} + ${b}`, a: String(s), how: G.howCalc(a, b, '+'), choices: ch(r, s, [s - 10, s + 1, s - 1, s + 2, s - 2, 10 + Math.abs(a - b)].map(String), nf(r, s, { min: 11, max: 18 })), tag: "yoko" };
  };
  g.subKurisage = (r) => {                                 // くり下がり：10いくつ−1けた
    let a, b;
    do { a = r.range(11, 18); b = r.range(2, 9); } while (a % 10 >= b);
    const d = a - b;
    return { q: `${a} − ${b}`, a: String(d), how: G.howCalc(a, b, '−'), choices: ch(r, d, [b - a % 10, d + 1, d - 1, d + 2, d + 10, a % 10 + b].map(String), nf(r, d, { min: 1, max: 9 })), tag: "yoko" };
  };
  g.add3 = (r) => {                                        // 3つのかずの計算
    if (r.chance(0.6)) {
      const a = r.range(1, 9), b = r.range(1, 9), c = r.range(1, 9), s = a + b + c;
      return { q: `${a} + ${b} + ${c}`, a: String(s), how: [`まえから じゅんに けいさんするよ。`, `${a} ＋ ${b} ＝ ${a + b}。`, `${a + b} ＋ ${c} ＝ ${s}。`], choices: ch(r, s, [s + 1, s - 1, s + 2, s - 2, s + 10].map(String), nf(r, s, { min: 3, max: 27 })) };
    }
    const x = r.range(8, 18), y = r.range(1, 5), z = r.range(1, Math.min(5, x - y - 1)), d = x - y - z;
    return { q: `${x} − ${y} − ${z}`, a: String(d), choices: ch(r, d, [x - y + z, d + 1, d - 1, d + 2].map(String), nf(r, d, { min: 1, max: 17 })) };
  };
  g.add2plus1 = (r) => {                                   // 2けた＋1けた（くり上がりなし）
    const t = r.range(1, 8);
      const o = r.range(0, 8), b = r.range(1, 9 - o), a = t * 10 + o;
      return { q: `${a} + ${b}`, a: String(a + b), how: G.howCalc(a, b, '+'), choices: ch(r, a + b, [a - b, a + b + 10, a + b - 10, a + b + 1, a + b - 1].map(String), nf(r, a + b, { min: 10, max: 99 })), tag: "yoko" };
  };
  g.tokei1 = (r) => {                                      // とけい（なんじ・なんじはん）
    const h = r.range(1, 12), half = r.chance(0.5), L = half ? 6 : 12, nx = h % 12 + 1, pv = (h + 10) % 12 + 1;
    const a = half ? `${h}じはん` : `${h}じ`;
    const sh = half ? `${h}と${nx}の あいだ` : `${h}`;   // 「はん」のとき みじかい はりは つぎの 数との あいだ
    return { q: `みじかい はりが ${sh}、ながい はりが ${L} の とき、なんじ？`, a, ans: "choice4",
      choices: ch(r, a, [half ? `${h}じ` : `${h}じはん`, `${L}じ`, `${nx}じ`, `${pv}じ`, `${nx}じはん`, `${pv}じはん`, `${L}じはん`], [`${r.range(1, 12)}じ`, `${r.range(1, 12)}じはん`], { loose: true }) };
  };
  g.tokeiFun1 = (r) => {                                   // 5分きざみの なんじなんぷん
    const h = r.range(1, 12), mark = r.range(1, 11), minute = mark * 5;
    const next = h % 12 + 1;
    const short = `${h}と${next}の あいだ`;
    const fn = (hh, m) => `${hh}じ${m}${m % 10 === 0 ? "ぷん" : "ふん"}`;   // 10・20…は「ぷん」、5・15…は「ふん」
    const a = fn(h, minute);
    const up = minute === 55 ? 50 : minute + 5, down = minute === 5 ? 10 : minute - 5;
    const wrong = [fn(next, minute), fn(h, up), fn(h, down), fn(mark, minute)];
    return { q: `みじかい はりが ${short}、ながい はりが ${mark} の とき、なんじなんぷん？`, a, ans: "choice4",
      choices: ch(r, a, wrong, [fn(h, r.range(1, 11) * 5), fn(next, r.range(1, 11) * 5)], { loose: true }) };
  };

  // ===== 2年 =====
  g.add2hissan = (r, p) => {                               // 2けた+2けた（くり上がりあり）
    let a, b;
    do { a = r.range(11, 99); b = r.range(11, 99); } while ((a % 10) + (b % 10) < 10 || a + b > (p.sumMax || 198));
    const s = a + b;
    return { q: `${a} + ${b}`, a: String(s), hissan: { a, b, op: "+" }, how: G.howCalc(a, b, '+'), choices: ch(r, s, [noCarry(a, b), s - 10, s + 10, s + 1, s - 1, s + 100].map(String), nf(r, s, { min: 20, max: 198 })) };
  };
  g.sub2hissan = (r) => {                                  // 2けた−2けた（くり下がりあり）
    let a, b;
    do { a = r.range(21, 99); b = r.range(11, a - 1); } while (a % 10 >= b % 10);
    const d = a - b;
    return { q: `${a} − ${b}`, a: String(d), hissan: { a, b, op: "−" }, how: G.howCalc(a, b, '−'), choices: ch(r, d, [noBorrow(a, b), d + 10, d - 10, d + 1, d - 1].map(String), nf(r, d, { min: 1, max: 99 })) };
  };
  g.keta3 = (r) => {                                       // 100が□こ、10が□こ、1が□こ
    const h = r.range(1, 9), t = r.range(0, 9), o = r.range(0, 9), n = h * 100 + t * 10 + o;
    const zero = (t === 0 || o === 0) && r.chance(0.7);
    const v = zero ? h * 100 + (t ? t * 10 : o) : n;
    const q = zero ? `100が ${h}こと ${t ? "10が " + t + "こ" : "1が " + o + "こ"}で いくつ？` : `100が ${h}こ、10が ${t}こ、1が ${o}こで いくつ？`;
    const w = zero ? [h * 100 + (t ? t : o * 10), h * 10 + (t ? t : o), h * 1000 + (t ? t * 10 : o), v + 1] : [t * 100 + h * 10 + o, o * 100 + t * 10 + h, h * 100 + o * 10 + t, h * 10 + t + o];
    return { q, a: String(v), choices: ch(r, v, w.map(String), nf(r, v, { min: 100, max: 999 })) };
  };
  g.keta3Compare = (r) => {                                // 3けたの数 いちばん大きい／小さい
    const big = r.chance(0.5), f = d => d[0] * 100 + d[1] * 10 + d[2];
    let xs;
    do {
      const d = r.shuffle([r.range(1, 9), r.range(1, 9), r.range(0, 9)]);
      xs = new Set([f(d), f([d[1], d[0], d[2]]), f([d[2], d[1], d[0]]), r.range(100, 999)]);
    } while (xs.size < 4 || [...xs].some(x => x < 100));
    const L = [...xs], a = big ? Math.max(...L) : Math.min(...L);
    return { q: `いちばん ${big ? "大きい" : "小さい"} 数は どれ？`, a: String(a), choices: r.shuffle(L.map(String)), ans: "choice4" };
  };
  g.keta4 = (r) => {                                       // 4けたの数・まとまり・大小
    const kind = r.int(4);
    if (kind === 0) {
      const th = r.range(1, 9), h = r.range(0, 9), t = r.range(0, 9), o = r.range(0, 9);
      const n = th * 1000 + h * 100 + t * 10 + o;
      return { q: `1000が ${th}こ、100が ${h}こ、10が ${t}こ、1が ${o}こで いくつ？`, a: String(n),
        choices: ch(r, n, [n + 100, n - 100, n + 10, n - 10, n + 1000].filter(x => x >= 1000 && x <= 9999).map(String), nf(r, n, { min: 1000, max: 9999 })) };
    }
    if (kind === 1) {
      const size = r.pick([10, 100]), n = size === 10 ? r.range(100, 1000) : r.range(10, 100), a = n * size;
      return { q: `${size}が ${n}こで いくつ？`, a: String(a),
        choices: ch(r, a, [a + size, a - size, a + 10 * size, a - 10 * size].filter(x => x >= 1000 && x <= 10000).map(String), nf(r, a, { min: 1000, max: 10000 })) };
    }
    const nums = new Set(); while (nums.size < 4) nums.add(r.range(1000, 9999));
    const xs = [...nums], big = kind === 2, a = big ? Math.max(...xs) : Math.min(...xs);
    return { q: `いちばん ${big ? "大きい" : "小さい"} 数は どれ？`, a: String(a), choices: r.shuffle(xs.map(String)), ans: "choice4" };
  };
  g.kuku = (r, p) => {                                     // 九九（dans：[はじめ,おわり]の段）
    const [lo, hi] = p.dans || [2, 9], a = r.range(lo, hi), b = r.range(p.minB || 1, 9), s = a * b;
    const sw = r.chance(0.5), x = sw ? a : b, y = sw ? b : a;
    const how = [`${x} × ${y} は ${x} が ${y}こ分。`, y > 1 ? `${x} × ${y - 1} ＝ ${x * (y - 1)} より ${x} 大きいので ${s}。` : `${x} が 1こ分 だから ${s}。`, `九九で「${x} × ${y} ＝ ${s}」。`];
    return { q: `${x} × ${y}`, a: String(s), how, choices: ch(r, s, [s + a, s - a, a + b, s + b, s - b].map(String), nf(r, s, { min: 1, max: 81 })), tag: "kuku" };
  };
  g.kukuHole = (r, p) => {                                 // □×6=42
    const [lo, hi] = p.dans || [2, 9], a = r.range(lo, hi), b = r.range(2, 9), s = a * b, left = r.chance(0.5);
    return { q: left ? `□ × ${a} = ${s}` : `${a} × □ = ${s}`, a: String(b), choices: ch(r, b, [b + 1, b - 1, a, b + 2, Math.floor(s / 10) + (s % 10)].map(String), nf(r, b, { min: 1, max: 9 })) };
  };
  const THINGS2 = [["みかん", "こ"], ["あめ", "こ"], ["えんぴつ", "ほん"], ["シール", "まい"], ["おりがみ", "まい"]];
  g.kakeBunsho = (r, p) => {                               // かけ算の文章題（1つぶんの数×いくつ分）
    const [lo, hi] = p.dans || [2, 9], a = r.range(lo, hi), b = r.range(2, 9), [t, u] = r.pick(THINGS2), s = a * b;
    return { q: `1さらに ${t}を ${a}${u}ずつ のせます。 さらが ${b}まい あると、ぜんぶで なん${u}？`, a: String(s), choices: ch(r, s, [a + b, s + a, s - a, s + b, s - b].map(String), nf(r, s, { min: 4, max: 81 })) };
  };
  g.length2 = (r, p) => {                                     // 長さのたんい（cm・mm・m）
    if (r.chance(0.5)) {
      const a = r.range(1, 9), b = r.range(1, 9), s = a * 10 + b;
      return { q: `${a}cm ${b}mm = □mm`, a: `${s}mm`, choices: ch(r, `${s}mm`, [a + b, a * 100 + b, s * 10, b * 10 + a, s + 10].map(x => x + "mm"), nf(r, s, { min: 11, max: 99, fmt: x => x + "mm" }), { loose: p.loose }) };
    }
    const a = r.range(1, 5), b = r.range(1, 9) * 10, s = a * 100 + b;
    return { q: `${a}m ${b}cm = □cm`, a: `${s}cm`, choices: ch(r, `${s}cm`, [a * 10 + b, a * 1000 + b, a * 100 + b / 10, b * 10 + a, s + 10].map(x => x + "cm"), nf(r, s, { step: 10, min: 110, max: 599, fmt: x => x + "cm" }), { loose: p.loose }) };
  };
  g.kasa2 = (r, p) => {                                       // かさのたんい（L・dL・mL）
    const mk = (q, v, u, w) => ({ q, a: v + u, choices: ch(r, v + u, w.map(x => x + u), nf(r, v, { step: v >= 1000 ? 100 : v >= 100 ? 10 : 1, min: 1, max: v * 3, fmt: x => x + u }), { loose: p.loose }) });
    const k = r.int(4), a = r.range(2, 9);
    if (k === 0) return mk(`${a}L = □dL`, a * 10, "dL", [a, a * 100, a * 10 + 10]);
    if (k === 1) { const b = r.range(1, 9), a1 = r.range(1, 5); return mk(`${a1}L ${b}dL = □dL`, a1 * 10 + b, "dL", [a1 + b, a1 * 100 + b, b * 10 + a1, a1 * 10 + b + 10]); }
    if (k === 2) return mk(`${a}L = □mL`, a * 1000, "mL", [a * 100, a * 10000, a * 10, a * 1000 + 100]);
    return mk(`${a}dL = □mL`, a * 100, "mL", [a * 10, a * 1000, a, a * 100 + 10]);
  };
  g.jikan2 = (r) => {                                      // 時こくと時間
    const k = r.int(3);
    if (k === 0) {
      const h = r.range(7, 11), m = r.range(1, 3) * 10, d = r.range(1, 2) * 10 + 5 * r.int(2), t = m + d;
      if (t >= 60) return g.jikan2(r);
      const a = `${h}時${t}分`;
      return { q: `午前 ${h}時${m}分の ${d}分後は？`, a, ans: "choice4", choices: ch(r, a, [`${h}時${Math.abs(m - d)}分`, `${h + 1}時${t}分`, `${h}時${t + 10}分`, `${h + 1}時${m}分`, `${h}時${t - 10}分`, `${h}時${d}分`], [`${h}時${t + 5}分`, `${h}時${t - 5}分`], { loose: true }) };
    }
    if (k === 1) {
      const m = r.range(1, 5) * 10, s = 60 + m;
      return { q: `1時間${m}分は ぜんぶで なん分？`, a: String(s), choices: ch(r, s, [10 + m, 100 + m, s + 10, m * 10, 60 - m].map(String), nf(r, s, { step: 10, min: 70, max: 130 })) };
    }
    const a = r.range(7, 10), b = r.range(1, 9), s = 12 - a + b;
    return { q: `午前 ${a}時から 午後 ${b}時までは なん時間？`, a: String(s), choices: ch(r, s, [a + b, 12 - a, s + 1, s - 1, s + 2].map(String), nf(r, s, { min: 2, max: 20 })) };
  };
  g.nissu = (r) => {                                       // 1週間は7日
    const w = r.range(2, 5), d = r.range(1, 6), k = r.int(3);
    if (k === 0) return { q: `${w}週間は なん日？`, a: String(w * 7), choices: ch(r, w * 7, [w * 5, w * 10, w * 7 + 7, w * 7 - 7, w + 7, w * 6].map(String), nf(r, w * 7, { step: 7, min: 7, max: 60 })) };
    if (k === 1) return { q: `${w}週間と ${d}日は ぜんぶで なん日？`, a: String(w * 7 + d), choices: ch(r, w * 7 + d, [w + d, w * 7 - d, w * 10 + d, (w + d) * 7, w * 7 + d + 7].map(String), nf(r, w * 7 + d, { min: 8, max: 40 })) };
    const n = w * 7 + d, a = `${w}週間${d}日`;
    return { q: `${n}日は なん週間と なん日？`, a, ans: "choice4", choices: ch(r, a, [`${d}週間${w}日`, `${w + 1}週間${d}日`, `${w}週間${d + 1}日`, `${w - 1}週間${d + 7}日`, `${w}週間${Math.abs(d - 1) || 2}日`], [`${w + 2}週間${d}日`], { loose: true }) };
  };
  g.hyo2 = (r) => {                                        // 表を読む（すきな どうぶつ）
    const names = ["いぬ", "ねこ", "うさぎ", "ことり"], cnt = r.shuffle([2, 3, 4, 5, 6, 7, 8, 9]).slice(0, 4), tbl = names.map((n, i) => `${n} ${cnt[i]}人`).join("、");
    const k = r.int(4);
    if (k < 2) {
      const big = k === 0, v = big ? Math.max(...cnt) : Math.min(...cnt), a = names[cnt.indexOf(v)];
      return { q: `すきな どうぶつ しらべ：${tbl}。いちばん ${big ? "おおい" : "すくない"}のは？`, a, ans: "choice4", choices: r.shuffle(names) };
    }
    const i = r.int(4); let j;
    do { j = r.int(4); } while (j === i);
    if (k === 2) {
      const d = Math.abs(cnt[i] - cnt[j]);
      return { q: `すきな どうぶつ しらべ：${tbl}。${names[i]}と ${names[j]}の ちがいは なん人？`, a: String(d), choices: ch(r, d, [cnt[i] + cnt[j], d + 1, d - 1, d + 2].map(String), nf(r, d, { min: 1, max: 9 })) };
    }
    const s = cnt.reduce((x, y) => x + y, 0);
    return { q: `すきな どうぶつ しらべ：${tbl}。ぜんぶで なん人？`, a: String(s), choices: ch(r, s, [s + 1, s - 1, s + 10, s - 10, s + 2].map(String), nf(r, s, { min: 10, max: 40 })) };
  };
  const ZU = [["三角形", "へん", 3], ["三角形", "ちょう点", 3], ["四角形", "へん", 4], ["四角形", "ちょう点", 4], ["長方形", "へん", 4], ["長方形", "ちょう点", 4], ["長方形", "直角", 4], ["正方形", "へん", 4], ["正方形", "直角", 4], ["直角三角形", "直角", 1], ["直角三角形", "へん", 3]];
  g.zukei2 = (r) => {                                      // 三角形・四角形の へん・ちょう点・直角の数
    const [n, k, v] = r.pick(ZU);
    return { q: `${n}の ${k}の かずは いくつ？`, a: String(v), choices: ch(r, v, [3, 4, 5, 6, 2, v + 1].map(String), nf(r, v, { min: 1, max: 8 }), { loose: true }) };
  };
  g.bunsuKiso = (r) => {                                   // 2年：1/2・1/4・1/8
    const n = r.pick([2, 4, 8]), a = `1/${n}`;
    return { q: `おなじ 大きさに ${n}つに わけた 1つぶんを、 なんぶんの 1と いう？`, a, choices: ch(r, a, [`1/${n * 2}`, `1/${n + 1}`, `1/${Math.max(2, n - 1)}`, `1/${n / 2 + 1}`], ["1/3", "1/5", "1/6", "1/10"]) };
  };
  // ===== 1・2年の だんかい分け（2026-11-26）。どの型も how:[行] を返す（その 問題の 数で 出る「ときかた」） =====
  const pick4 = (r, a, L) => { const w = [...new Set(L.filter(x => x && x !== a && !/NaN|-/.test(x)))]; if (w.length < 3) throw Error('pick4 ' + a); return r.shuffle([a, ...r.shuffle(w).slice(0, 3)]); };
  g.zero1 = (r) => {                                       // 0の たしざん・ひきざん
    const a = r.range(1, 9), k = r.int(4);
    const [q, v] = [[`${a} + 0`, a], [`0 + ${a}`, a], [`${a} − 0`, a], [`${a} − ${a}`, 0]][k];
    const how = k < 2 ? ["0 を たしても かずは かわらないよ。", `こたえは ${v}。`] : k === 2 ? ["0 を ひいても かずは かわらないよ。", `こたえは ${v}。`] : ["おなじ かずを ひくと なにも のこらない。", "こたえは 0。"];
    return { q, a: String(v), how, choices: ch(r, v, [0, 1, a, a + 1, a - 1, 10].map(String), nf(r, v, { min: 0, max: 10 }), { loose: true }) };
  };
  g.bunkai1 = (r, p) => {                                  // 7は 3と いくつ
    const n = r.range(p.lo || 5, p.hi || 9), x = r.range(1, n - 1), v = n - x;
    return { q: `${n}は ${x}と いくつ？`, a: String(v), how: [`${x} と いくつで ${n} に なるかな。`, `${x} から ${n} まで かぞえると ${v}。`, `${n} は ${x} と ${v}。`],
      choices: ch(r, v, [n, x, v + 1, v - 1, n + x].map(String), nf(r, v, { min: 0, max: 10 }), { loose: true }) };
  };
  g.big120 = (r) => {                                      // 100より 大きい かず（120まで）
    const k = r.int(5);
    if (k === 4) {
      const xs = new Set(); while (xs.size < 4) xs.add(r.range(96, 120));
      const L = [...xs], a = Math.max(...L);
      return { q: "いちばん おおきい かずは どれ？", a: String(a), ans: "choice4", choices: r.shuffle(L.map(String)), how: ["まず 百のくらいを くらべる。", "おなじなら 十のくらい、つぎに 一のくらいを くらべるよ。", `いちばん おおきいのは ${a}。`] };
    }
    let q, v, how;
    if (k === 0) { const d = r.range(1, 20); v = 100 + d; q = `100と ${d}で いくつ？`; how = [`100 と ${d} を あわせる。`, `こたえは ${v}。`]; }
    else if (k === 1) { const n = r.range(99, 119); v = n + 1; q = `${n}の つぎの かずは？`; how = ["つぎの かずは 1 おおきい かず。", `${n} より 1 おおきいので ${v}。`]; }
    else if (k === 2) { const d = r.range(2, 5), n = r.range(98, 120 - d); v = n + d; q = `${n}より ${d} おおきい かずは？`; how = [`${n} から ${d} かぞえて すすむ。`, `こたえは ${v}。`]; }
    else { const d = r.range(2, 5), n = r.range(100 + d, 120); v = n - d; q = `${n}より ${d} ちいさい かずは？`; how = [`${n} から ${d} かぞえて もどる。`, `こたえは ${v}。`]; }
    return { q, a: String(v), how, choices: ch(r, v, [v + 1, v - 1, v + 10, v - 10, v + 2].map(String), nf(r, v, { min: 80, max: 130 }), { loose: true }) };
  };
  g.kakeKimari2 = (r) => {                                 // かけ算の きまり（かける数が 1 ふえると・入れかえ）
    const a = r.range(2, 9), b = r.range(2, 8), k = r.int(4);
    if (k === 0) return { q: `${a} × ${b + 1} の 答えは、${a} × ${b} の 答えより いくつ 大きい？`, a: String(a),
      how: ["かける数が 1 ふえると、答えは かけられる数 だけ ふえる。", `${a} × ${b} ＝ ${a * b}、${a} × ${b + 1} ＝ ${a * (b + 1)}。`, `ちがいは ${a}。`], choices: ch(r, a, [b, b + 1, 1, a + 1, a * b].map(String), nf(r, a, { min: 1, max: 81 }), { loose: true }) };
    if (k === 1) return { q: `${a} × ${b} の 答えは、${a} × ${b + 1} の 答えより いくつ 小さい？`, a: String(a),
      how: ["かける数が 1 へると、答えは かけられる数 だけ へる。", `${a} × ${b + 1} ＝ ${a * (b + 1)}、${a} × ${b} ＝ ${a * b}。`, `ちがいは ${a}。`], choices: ch(r, a, [b, b + 1, 1, a + 1, a * b].map(String), nf(r, a, { min: 1, max: 81 }), { loose: true }) };
    const c = b + 1;
    if (k === 2) return { q: `${a} × ${c} ＝ ${c} × □`, a: String(a), how: ["かける数と かけられる数を 入れかえても、答えは 同じ。", `${a} × ${c} も ${c} × ${a} も ${a * c}。`, `□ は ${a}。`],
      choices: ch(r, a, [c, a * c, a + 1, c + 1, 1].map(String), nf(r, a, { min: 1, max: 81 }), { loose: true }) };
    return { q: `□ × ${a} ＝ ${a} × ${c}`, a: String(c), how: ["かける数と かけられる数を 入れかえても、答えは 同じ。", `${c} × ${a} も ${a} × ${c} も ${a * c}。`, `□ は ${c}。`],
      choices: ch(r, c, [a, a * c, a + 1, c + 1, 1].map(String), nf(r, c, { min: 1, max: 81 }), { loose: true }) };
  };
  const cmm = (c, m) => (c ? `${c}cm` : "") + (m ? `${m}mm` : "") || "0mm";
  const mcm = (m, c) => (m ? `${m}m` : "") + (c ? `${c}cm` : "") || "0cm";
  g.nagasa2d = (r, p) => {                                 // 長さ：cmと mm／mと cm／長さの 計算
    const k = r.int(2);
    if (p.kind === "mm") {
      const a = r.range(1, 15), b = r.range(1, 9), n = a * 10 + b;
      if (k === 0) return { q: `${a}cm ${b}mm ＝ □mm`, a: `${n}mm`, how: ["1cm ＝ 10mm。", `${a}cm は ${a * 10}mm。`, `${a * 10}mm と ${b}mm で ${n}mm。`],
        choices: ch(r, `${n}mm`, [a + b, a * 100 + b, b * 10 + a, n + 10, n - 10].map(x => x + "mm"), nf(r, n, { min: 1, max: 200, fmt: x => x + "mm" }), { loose: true }) };
      const A = cmm(a, b);
      return { q: `${n}mm ＝ □cm □mm`, a: A, ans: "choice4", how: ["10mm で 1cm。", `${n}mm は 10mm が ${a}こと ${b}mm。`, `だから ${A}。`],
        choices: pick4(r, A, [cmm(b, a), cmm(a + 1, b), cmm(a, b + 1 > 9 ? b - 1 : b + 1), cmm(Math.floor(n / 100), n % 100), cmm(a - 1 || a + 2, b)]) };
    }
    if (p.kind === "m") {
      const a = r.range(1, 5), b = r.range(1, 99), n = a * 100 + b;
      if (k === 0) return { q: `${a}m ${b}cm ＝ □cm`, a: `${n}cm`, how: ["1m ＝ 100cm。", `${a}m は ${a * 100}cm。`, `${a * 100}cm と ${b}cm で ${n}cm。`],
        choices: ch(r, `${n}cm`, [a * 10 + b, a + b, a * 1000 + b, n + 100, n - 100, n + 10].map(x => x + "cm"), nf(r, n, { min: 1, max: 700, fmt: x => x + "cm" }), { loose: true }) };
      const A = mcm(a, b);
      return { q: `${n}cm ＝ □m □cm`, a: A, ans: "choice4", how: ["100cm で 1m。", `${n}cm は 100cm が ${a}こと ${b}cm。`, `だから ${A}。`],
        choices: pick4(r, A, [mcm(a + 1, b), mcm(a - 1 || a + 2, b), mcm(Math.floor(n / 10), n % 10), mcm(a, (b + 10) % 100 || 5), mcm(b % 10 || 1, a), mcm(a, b > 10 ? b - 10 : b + 20)]) };
    }
    // 長さの 計算（同じ たんいどうし。くり上がり・くり下がりなし）
    const kk = r.int(4);
    if (kk < 2) {
      let a, b, c, d; do { a = r.range(1, 9); b = r.range(1, 8); c = r.range(1, 9); d = r.range(1, 8); } while (kk === 0 ? b + d > 9 : (a <= c || b < d));
      const add = kk === 0, x = add ? a + c : a - c, y = add ? b + d : b - d, A = cmm(x, y);
      return { q: `${a}cm ${b}mm ${add ? "＋" : "−"} ${c}cm ${d}mm`, a: A, ans: "choice4",
        how: ["cm は cm どうし、mm は mm どうしで 計算する。", `${a} ${add ? "＋" : "−"} ${c} ＝ ${x}（cm）、${b} ${add ? "＋" : "−"} ${d} ＝ ${y}（mm）。`, `答えは ${A}。`],
        choices: pick4(r, A, [cmm(x + 1, y), cmm(x, y + 1 > 9 ? y - 1 : y + 1), cmm(x - 1 || x + 2, y), cmm(y || 1, x), cmm(add ? x : a + c, add ? y : b + d), cmm(x + 2, y)]) };
    }
    let a, b, c; do { a = r.range(1, 5); b = r.range(1, 9) * 10; c = r.range(1, 9) * 10; } while (kk === 2 ? b + c >= 100 : b <= c);
    const add = kk === 2, y = add ? b + c : b - c, A = mcm(a, y);
    return { q: `${a}m ${b}cm ${add ? "＋" : "−"} ${c}cm`, a: A, ans: "choice4",
      how: ["m は そのまま。cm どうしを 計算する。", `${b} ${add ? "＋" : "−"} ${c} ＝ ${y}（cm）。`, `答えは ${A}。`],
      choices: pick4(r, A, [mcm(a + 1, y), mcm(a, y + 10), mcm(a, Math.abs(y - 10) || 5), mcm(add ? a + 1 : a - 1 || 9, y), mcm(a, add ? Math.abs(b - c) || 5 : b + c), mcm(a, y + 20)]) };
  };
  const ldl = (l, d) => (l ? `${l}L` : "") + (d ? `${d}dL` : "") || "0dL";
  g.kasa2d = (r, p) => {                                   // かさ：Lと dL／mL／かさの 計算
    if (p.kind === "dl") {
      const k = r.int(3), a = r.range(1, 9), b = r.range(1, 9), n = a * 10 + b;
      if (k === 0) return { q: `${a}L ＝ □dL`, a: `${a * 10}dL`, how: ["1L ＝ 10dL。", `${a}L は 10dL が ${a}こ分で ${a * 10}dL。`],
        choices: ch(r, `${a * 10}dL`, [a, a * 100, a * 10 + 10, a * 10 - 10 || 5].map(x => x + "dL"), nf(r, a * 10, { step: 10, min: 10, max: 200, fmt: x => x + "dL" }), { loose: true }) };
      if (k === 1) return { q: `${a}L ${b}dL ＝ □dL`, a: `${n}dL`, how: ["1L ＝ 10dL。", `${a}L は ${a * 10}dL。`, `${a * 10}dL と ${b}dL で ${n}dL。`],
        choices: ch(r, `${n}dL`, [a + b, a * 100 + b, b * 10 + a, n + 10].map(x => x + "dL"), nf(r, n, { min: 1, max: 200, fmt: x => x + "dL" }), { loose: true }) };
      const A = ldl(a, b);
      return { q: `${n}dL ＝ □L □dL`, a: A, ans: "choice4", how: ["10dL で 1L。", `${n}dL は 10dL が ${a}こと ${b}dL。`, `だから ${A}。`],
        choices: pick4(r, A, [ldl(b, a), ldl(a + 1, b), ldl(a, b + 1 > 9 ? b - 1 : b + 1), ldl(a - 1 || a + 2, b)]) };
    }
    if (p.kind === "ml") {
      const k = r.int(4), a = r.range(1, 9);
      const mk = (q, v, u, w, how) => ({ q, a: v + u, how, choices: ch(r, v + u, w.map(x => x + u), nf(r, v, { step: v >= 1000 ? 1000 : v >= 100 ? 100 : 1, min: 1, max: 10000, fmt: x => x + u }), { loose: true }) });
      if (k === 0) return mk(`${a}L ＝ □mL`, a * 1000, "mL", [a * 100, a * 10, a * 10000], ["1L ＝ 1000mL。", `${a}L は ${a * 1000}mL。`]);
      if (k === 1) return mk(`${a}dL ＝ □mL`, a * 100, "mL", [a * 10, a * 1000, a], ["1dL ＝ 100mL。", `${a}dL は ${a * 100}mL。`]);
      if (k === 2) return mk(`${a * 100}mL ＝ □dL`, a, "dL", [a * 10, a * 100, a + 1], ["100mL で 1dL。", `${a * 100}mL は 100mL が ${a}こ分で ${a}dL。`]);
      return mk(`1L ＝ □dL`, 10, "dL", [100, 1000, 1], ["1L ＝ 10dL、1dL ＝ 100mL。", "1L は 10dL。"]);
    }
    const kk = r.int(3);
    if (kk === 2) {
      const b = r.range(1, 9), A = ldl(0, 10 - b);
      return { q: `1L − ${b}dL`, a: A, ans: "choice4", how: ["1L を 10dL に なおす。", `10dL − ${b}dL ＝ ${10 - b}dL。`],
        choices: pick4(r, A, [ldl(0, b), ldl(1, 10 - b), ldl(0, 11 - b), ldl(0, 9 - b || 9), ldl(1, b), ldl(0, 10 + b)]) };
    }
    let a, b, c, d; do { a = r.range(1, 9); b = r.range(1, 8); c = r.range(1, 9); d = r.range(1, 8); } while (kk === 0 ? b + d > 9 : (a <= c || b < d));
    const add = kk === 0, x = add ? a + c : a - c, y = add ? b + d : b - d, A = ldl(x, y);
    return { q: `${a}L ${b}dL ${add ? "＋" : "−"} ${c}L ${d}dL`, a: A, ans: "choice4",
      how: ["L は L どうし、dL は dL どうしで 計算する。", `${a} ${add ? "＋" : "−"} ${c} ＝ ${x}（L）、${b} ${add ? "＋" : "−"} ${d} ＝ ${y}（dL）。`, `答えは ${A}。`],
      choices: pick4(r, A, [ldl(x + 1, y), ldl(x, y + 1 > 9 ? y - 1 : y + 1), ldl(x - 1 || x + 2, y), ldl(y || 1, x)]) };
  };
  const hm = (h, m) => `${h}時${m ? m + "分" : ""}`;
  g.jikan2d = (r, p) => {                                  // 時こく：何分後・何分前／午前と 午後／1日と 1時間
    if (p.kind === "fun") {
      const h = r.range(1, 11), m = r.range(0, 9) * 5, d = r.pick([5, 10, 15, 20, 25, 30]), ato = r.chance(0.5);
      const t = ato ? m + d : m - d;
      if (t < 0 || t >= 60) return g.jikan2d(r, p);
      const A = hm(h, t);
      return { q: `${hm(h, m)}の ${d}分${ato ? "後" : "前"}の 時こくは？`, a: A, ans: "choice4",
        how: [`長い はりが ${d}分 ${ato ? "すすむ" : "もどる"}。`, `${m}分 ${ato ? "＋" : "−"} ${d}分 ＝ ${t}分。`, `答えは ${A}。`],
        choices: pick4(r, A, [hm(h, ato ? Math.abs(m - d) : m + d < 60 ? m + d : 55), hm(h + 1, t), hm(h, t + 5 < 60 ? t + 5 : t - 10), hm(h, t >= 10 ? t - 5 : t + 10), hm(h - 1 || 12, t), hm(h, m)]) };
    }
    if (p.kind === "gozen") {
      const k = r.int(3);
      if (k === 0) {
        const h = r.range(8, 11), d = r.range(2, 4), t = h + d - 12;
        if (t < 1) return g.jikan2d(r, p);
        const A = `午後${t}時`;
        return { q: `午前${h}時の ${d}時間後の 時こくは？`, a: A, ans: "choice4", how: [`午前${h}時から ${12 - h}時間で 正午（午後0時）。`, `のこり ${t}時間で 午後${t}時。`],
          choices: pick4(r, A, [`午前${t}時`, `午後${t + 1}時`, `午後${t + 2}時`, `午前${h}時`, `午後${t - 1 || 3}時`]) };
      }
      if (k === 1) {
        const a = r.range(7, 11), b = r.range(1, 5), v = 12 - a + b;
        return { q: `午前${a}時から 午後${b}時までは 何時間？`, a: String(v), how: [`午前${a}時から 正午までが ${12 - a}時間。`, `正午から 午後${b}時までが ${b}時間。`, `${12 - a} ＋ ${b} ＝ ${v}（時間）。`],
          choices: ch(r, v, [a + b, b - a < 1 ? 12 - b : b - a, v + 1, v - 1, 12 - a].map(String), nf(r, v, { min: 1, max: 12 }), { loose: true }) };
      }
      const T = [["正午は 午前 何時の こと？", "12", "正午は 午前12時。午後0時とも いう。"], ["午前は 何時間 ある？", "12", "午前は 夜中の 0時から 正午までの 12時間。"], ["午後は 何時間 ある？", "12", "午後は 正午から 夜中の 12時までの 12時間。"]];
      const [q, a, h] = r.pick(T);
      return { q, a, how: [h], choices: ch(r, a, ["24", "10", "6", "60", "11"], nf(r, 12, { min: 1, max: 60 }), { loose: true }) };
    }
    const k = r.int(4);
    if (k === 0) { const h = r.range(1, 3); return { q: `${h}時間は 何分？`, a: String(60 * h), how: ["1時間 ＝ 60分。", `${h}時間は 60分が ${h}こ分で ${60 * h}分。`], choices: ch(r, 60 * h, [100 * h, 10 * h, 60 * h + 10, 24 * h, 60 * h - 10].map(String), nf(r, 60 * h, { step: 10, min: 10, max: 200 }), { loose: true }) }; }
    if (k === 1) {
      const m = r.range(1, 11) * 5, A = `1時間${m}分`;
      return { q: `${60 + m}分は 何時間何分？`, a: A, ans: "choice4", how: ["60分で 1時間。", `${60 + m}分 は 60分と ${m}分。`, `だから ${A}。`],
        choices: pick4(r, A, [`1時間${(60 + m) % 100 || 10}分`, `${Math.floor((60 + m) / 10)}時間${(60 + m) % 10 || 5}分`, `1時間${m + 5 < 60 ? m + 5 : m - 10}分`, `2時間${m}分`]) };
    }
    if (k === 2) return { q: "1日は 何時間？", a: "24", how: ["午前が 12時間、午後が 12時間。", "12 ＋ 12 ＝ 24（時間）。"], choices: ch(r, "24", ["12", "60", "20", "100"], [], { loose: true }) };
    const m = r.range(1, 5) * 10;
    return { q: `1時間${m}分は 何分？`, a: String(60 + m), how: ["1時間 ＝ 60分。", `60分 ＋ ${m}分 ＝ ${60 + m}分。`], choices: ch(r, 60 + m, [100 + m, 10 + m, 60 + m + 10, m, 60 - m].map(String), nf(r, 60 + m, { step: 10, min: 10, max: 200 }), { loose: true }) };
  };
  const SH = ["三角形", "四角形", "長方形", "正方形", "直角三角形"];
  g.zukei2d = (r, p) => {                                  // 三角形と 四角形：なかまわけ／長方形・正方形・直角三角形／へんの 長さ
    if (p.kind === "namae") {
      const T = [["3本の 直線で かこまれた 形を 何と いう？", "三角形", ["三角形", "四角形", "へん", "ちょう点"], "3本の 直線で かこまれた 形が 三角形。"],
        ["4本の 直線で かこまれた 形を 何と いう？", "四角形", ["三角形", "四角形", "へん", "ちょう点"], "4本の 直線で かこまれた 形が 四角形。"],
        ["三角形や 四角形の まわりの 直線を 何と いう？", "へん", ["三角形", "四角形", "へん", "ちょう点"], "まわりの 直線が へん、かどの 点が ちょう点。"],
        ["三角形や 四角形の かどの 点を 何と いう？", "ちょう点", ["三角形", "四角形", "へん", "ちょう点"], "まわりの 直線が へん、かどの 点が ちょう点。"],
        ["三角形の へんは 何本？", "3", null, "三角形は へんが 3本、ちょう点が 3つ。"], ["四角形の へんは 何本？", "4", null, "四角形は へんが 4本、ちょう点が 4つ。"],
        ["三角形の ちょう点は いくつ？", "3", null, "三角形は へんが 3本、ちょう点が 3つ。"], ["四角形の ちょう点は いくつ？", "4", null, "四角形は へんが 4本、ちょう点が 4つ。"],
        ["まるい 線が ある 形は 三角形？", "ちがう", ["三角形", "ちがう"], "三角形は 直線だけで かこまれた 形。まがった 線が あると 三角形では ない。"]];
      const [q, a, c, h] = r.pick(T.slice(0, 8));
      return c ? { q, a, ans: "choice4", choices: r.shuffle(c.slice()), how: [h] } : { q, a, how: [h], choices: ch(r, a, ["2", "3", "4", "5", "6"], [], { loose: true }) };
    }
    if (p.kind === "chokkaku") {
      const T = [["4つの かどが みんな 直角で、4つの へんの 長さが みんな 同じ 四角形は？", "正方形", "かどが みんな 直角で、へんの 長さが みんな 同じなら 正方形。"],
        ["4つの かどが みんな 直角で、たてと よこの 長さが ちがう 四角形は？", "長方形", "かどが みんな 直角の 四角形が 長方形。"],
        ["直角の かどが ある 三角形は？", "直角三角形", "直角の かどが ある 三角形を 直角三角形と いう。"],
        ["長方形を 1本の 直線で ななめに 切ると、どんな 三角形が 2つ できる？", "直角三角形", "長方形の かどは 直角なので、切った 三角形にも 直角が のこる。"]];
      if (r.chance(0.35)) {
        const N = [["長方形の 直角は いくつ？", "4", "長方形は 4つの かどが みんな 直角。"], ["正方形の 直角は いくつ？", "4", "正方形も 4つの かどが みんな 直角。"], ["直角三角形の 直角は いくつ？", "1", "直角三角形の 直角は 1つ。"]];
        const [q, a, h] = r.pick(N);
        return { q, a, how: [h], choices: ch(r, a, ["1", "2", "3", "4", "0"], [], { loose: true }) };
      }
      const [q, a, h] = r.pick(T);
      return { q, a, ans: "choice4", how: [h], choices: r.shuffle(["長方形", "正方形", "直角三角形", "三角形"]) };
    }
    // へんの 長さ
    const k = r.int(3);
    if (k === 0) { const a = r.range(2, 9), b = r.range(2, 9); if (a === b) return g.zukei2d(r, p); const v = (a + b) * 2;
      return { q: `たて ${a}cm、よこ ${b}cmの 長方形。4本の へんの 長さを ぜんぶ たすと 何cm？`, a: `${v}cm`, how: ["長方形は むかいあう へんの 長さが 同じ。", `${a}cmが 2本、${b}cmが 2本。`, `${a} ＋ ${b} ＋ ${a} ＋ ${b} ＝ ${v}（cm）。`],
        choices: ch(r, `${v}cm`, [a + b, a * b, v + 2, v - 2, (a + b) * 4].map(x => x + "cm"), nf(r, v, { min: 4, max: 99, fmt: x => x + "cm" }), { loose: true }) }; }
    if (k === 1) { const a = r.range(2, 9), v = a * 4;
      return { q: `1つの へんが ${a}cmの 正方形。4本の へんの 長さを ぜんぶ たすと 何cm？`, a: `${v}cm`, how: ["正方形は 4本の へんの 長さが みんな 同じ。", `${a}cmが 4本で ${a} × 4 ＝ ${v}（cm）。`],
        choices: ch(r, `${v}cm`, [a * 2, a * 3, a + 4, v + 4, a * a].map(x => x + "cm"), nf(r, v, { min: 4, max: 99, fmt: x => x + "cm" }), { loose: true }) }; }
    const a = r.range(2, 9); let b; do { b = r.range(2, 9); } while (b === a);
    return { q: `たて ${a}cm、よこ ${b}cmの 長方形。むかいあう へんの うち、よこの へんの 長さは？`, a: `${b}cm`, how: ["長方形は むかいあう へんの 長さが 同じ。", `よこの へんは 2本とも ${b}cm。`],
      choices: ch(r, `${b}cm`, [a, a + b, b * 2, b + 1, b - 1].map(x => x + "cm"), nf(r, b, { min: 1, max: 20, fmt: x => x + "cm" }), { loose: true }) };
  };
  g.kazu1000 = (r, p) => {                                 // 1000までの 数：10が いくつ／数の線／1000
    if (p.kind === "10ko") {
      if (r.chance(0.5)) { const k = r.range(11, 99), v = k * 10;
        return { q: `10を ${k}こ あつめた 数は？`, a: String(v), how: [`10が 10こで 100。`, `${k}こは 10が ${Math.floor(k / 10)}こ分の 100 と、10が ${k % 10}こ。`, `${Math.floor(k / 10) * 100} と ${(k % 10) * 10} で ${v}。`],
          choices: ch(r, v, [k, k * 100, v + 10, v - 10, v + 100].map(String), nf(r, v, { step: 10, min: 10, max: 1000 }), { loose: true }) }; }
      const v = r.range(11, 99), n = v * 10;
      return { q: `${n}は 10を 何こ あつめた 数？`, a: String(v), how: [`100 は 10が 10こ。`, `${Math.floor(n / 100) * 100} は 10が ${Math.floor(v / 10) * 10}こ、${(v % 10) * 10} は 10が ${v % 10}こ。`, `あわせて ${v}こ。`],
        choices: ch(r, v, [n, Math.floor(v / 10), v + 1, v - 1, v + 10].map(String), nf(r, v, { min: 1, max: 100 }), { loose: true }) };
    }
    if (p.kind === "sen") {
      const u = r.pick([1, 10, 100]), m = r.range(2, 6), right = r.chance(0.6);
      const base = u === 100 ? r.range(1, 3) * 100 : u === 10 ? r.range(1, 8) * 100 : r.range(10, 90) * 10, v = right ? base + u * m : base - u * m;
      if (v < 0 || v > 1000) return g.kazu1000(r, p);
      return { q: `1めもりが ${u}の 数の線で、${base}から ${m}めもり ${right ? "右" : "左"}の 数は？`, a: String(v),
        how: [`1めもり ${u} だから、${m}めもりで ${u * m}。`, `${right ? "右へ いくと 大きく なる" : "左へ いくと 小さく なる"}。`, `${base} ${right ? "＋" : "−"} ${u * m} ＝ ${v}。`],
        choices: ch(r, v, [base + (right ? m : -m), base + (right ? -1 : 1) * u * m, v + u, v - u, base + (right ? 1 : -1) * 10 * u * m].map(String), nf(r, v, { step: u, min: 0, max: 1000 }), { loose: true }) };
    }
    const T = [
      () => { const d = r.pick([1, 10, 100]); return [`1000より ${d} 小さい 数は？`, 1000 - d, [`1000 − ${d} ＝ ${1000 - d}。`], [990, 999, 900, 100, 1010].filter(x => x !== 1000 - d)]; },
      () => [`100を 10こ あつめた 数は？`, 1000, ["100が 10こで 1000（千）。"], [100, 110, 10000, 900]],
      () => { const d = r.pick([1, 10, 100]); return [`${1000 - d}より ${d} 大きい 数は？`, 1000, [`${1000 - d} ＋ ${d} ＝ 1000。`], [1000 - d + 1 === 1000 ? 1001 : 1000 - d + 1, 1000 + d, 1100, 990]]; },
      () => [`1000は 10を 何こ あつめた 数？`, 100, ["100 は 10が 10こ、1000 は 100が 10こ。", "だから 1000 は 10が 100こ。"], [10, 1000, 1000 / 2, 110]]];
    const [q, v, how, w] = r.pick(T)();
    return { q, a: String(v), how, choices: ch(r, v, w.map(String), nf(r, v, { min: 1, max: 10000 }), { loose: true }) };
  };
  g.hako2 = (r) => {                                       // はこの 形（面・へん・ちょう点）
    const x = r.range(3, 9), y = r.range(3, 9), z = r.range(3, 9);
    const T = [["はこの 形に めんは いくつ ある？", "6", ["はこの 形には 上・下・前・後ろ・右・左の 6つの めんが ある。"]],
      ["はこの 形に へんは いくつ ある？", "12", ["はこの 形の へんは 12。", "同じ 長さの へんが 4本ずつ 3しゅるい。"]],
      ["はこの 形に ちょう点は いくつ ある？", "8", ["はこの 形の ちょう点は 8つ。上に 4つ、下に 4つ。"]],
      ["ひごと ねん土玉で はこの 形を つくる。ねん土玉は いくつ いる？", "8", ["ねん土玉は ちょう点に なる。", "はこの 形の ちょう点は 8つ。"]],
      [`${x}cm・${y}cm・${z}cmの ひごで はこの 形を つくる。ひごは ぜんぶで 何本 いる？`, "12", ["ひごは へんに なる。", "はこの 形の へんは 12本。"]],
      ["さいころの 形の めんは どんな 形？", "正方形", ["さいころの 形は、6つの めんが みんな 同じ 大きさの 正方形。"]],
      ["はこの 形で、同じ 形の めんは いくつずつ ある？", "2", ["むかいあう めんが 同じ 形。", "だから 2つずつ（3くみ）。"]]];
    const [q, a, how] = r.pick(T);
    if (a === "正方形") return { q, a, how, ans: "choice4", choices: r.shuffle(["正方形", "長方形", "三角形", "直角三角形"]) };
    return { q, a, how, choices: ch(r, a, ["4", "6", "8", "12", "2", "3", "10"], [], { loose: true }) };
  };
})(window.MH_GEN);
