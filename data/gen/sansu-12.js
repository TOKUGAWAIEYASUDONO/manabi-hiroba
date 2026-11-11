/* 算数 1〜2年の型。1年の問題文はひらがな（学年配当の漢字だけ使う） */
(function (G) {
  const g = G.gens, { ch, numFb, noCarry, noBorrow } = G;
  const nf = (r, n, o) => numFb(r, n, o);

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
    return { q: `${a} + ${b}`, a: String(s), choices: ch(r, s, [Math.abs(a - b) || 1, s + 1, s - 1, s + 2, a, b].map(String), nf(r, s, { min: 1, max: lim }), { loose: p.loose }), tag: "yoko" };
  };
  g.sub10 = (r, p) => {
    const lim = p.limit || 10, a = r.range(2, lim), b = r.range(1, a - 1), d = a - b;
    return { q: `${a} − ${b}`, a: String(d), choices: ch(r, d, [a + b > lim ? 0 : a + b, d + 1, d - 1, d + 2, b].map(String), nf(r, d, { min: 1, max: lim })), tag: "yoko" };
  };
  g.addKuriage = (r) => {                                  // くり上がり：1けた+1けたで10をこえる
    let a, b;
    do { a = r.range(2, 9); b = r.range(2, 9); } while (a + b < 11);
    const s = a + b;
    return { q: `${a} + ${b}`, a: String(s), choices: ch(r, s, [s - 10, s + 1, s - 1, s + 2, s - 2, 10 + Math.abs(a - b)].map(String), nf(r, s, { min: 11, max: 18 })), tag: "yoko" };
  };
  g.subKurisage = (r) => {                                 // くり下がり：10いくつ−1けた
    let a, b;
    do { a = r.range(11, 18); b = r.range(2, 9); } while (a % 10 >= b);
    const d = a - b;
    return { q: `${a} − ${b}`, a: String(d), choices: ch(r, d, [b - a % 10, d + 1, d - 1, d + 2, d + 10, a % 10 + b].map(String), nf(r, d, { min: 1, max: 9 })), tag: "yoko" };
  };
  g.add3 = (r) => {                                        // 3つのかずの計算
    if (r.chance(0.6)) {
      const a = r.range(1, 9), b = r.range(1, 9), c = r.range(1, 9), s = a + b + c;
      return { q: `${a} + ${b} + ${c}`, a: String(s), choices: ch(r, s, [s + 1, s - 1, s + 2, s - 2, s + 10].map(String), nf(r, s, { min: 3, max: 27 })) };
    }
    const x = r.range(8, 18), y = r.range(1, 5), z = r.range(1, Math.min(5, x - y - 1)), d = x - y - z;
    return { q: `${x} − ${y} − ${z}`, a: String(d), choices: ch(r, d, [x - y + z, d + 1, d - 1, d + 2].map(String), nf(r, d, { min: 1, max: 17 })) };
  };
  g.add2plus1 = (r) => {                                   // 2けた±1けた（くり上がり・くり下がりなし）
    const t = r.range(1, 8);
    if (r.chance(0.5)) {
      const o = r.range(0, 8), b = r.range(1, 9 - o), a = t * 10 + o;
      return { q: `${a} + ${b}`, a: String(a + b), choices: ch(r, a + b, [a - b, a + b + 10, a + b - 10, a + b + 1, a + b - 1].map(String), nf(r, a + b, { min: 10, max: 99 })), tag: "yoko" };
    }
    const o2 = r.range(1, 9), a2 = t * 10 + o2, b2 = r.range(1, o2);
    return { q: `${a2} − ${b2}`, a: String(a2 - b2), choices: ch(r, a2 - b2, [a2 + b2, a2 - b2 + 10, a2 - b2 - 10, a2 - b2 + 1].map(String), nf(r, a2 - b2, { min: 10, max: 99 })), tag: "yoko" };
  };
  g.tokei1 = (r) => {                                      // とけい（なんじ・なんじはん）
    const h = r.range(1, 12), half = r.chance(0.5), L = half ? 6 : 12, nx = h % 12 + 1, pv = (h + 10) % 12 + 1;
    const a = half ? `${h}じはん` : `${h}じ`;
    return { q: `みじかい はりが ${h}、ながい はりが ${L} の とき、なんじ？`, a, ans: "choice4",
      choices: ch(r, a, [half ? `${h}じ` : `${h}じはん`, `${L}じ`, `${nx}じ`, `${pv}じ`, `${nx}じはん`, `${pv}じはん`, `${L}じはん`], [`${r.range(1, 12)}じ`, `${r.range(1, 12)}じはん`], { loose: true }) };
  };

  // ===== 2年 =====
  g.add2hissan = (r, p) => {                               // 2けた+2けた（くり上がりあり）
    let a, b;
    do { a = r.range(11, 99); b = r.range(11, 99); } while ((a % 10) + (b % 10) < 10 || a + b > (p.sumMax || 198));
    const s = a + b;
    return { q: `${a} + ${b}`, a: String(s), hissan: { a, b, op: "+" }, choices: ch(r, s, [noCarry(a, b), s - 10, s + 10, s + 1, s - 1, s + 100].map(String), nf(r, s, { min: 20, max: 198 })) };
  };
  g.sub2hissan = (r) => {                                  // 2けた−2けた（くり下がりあり）
    let a, b;
    do { a = r.range(21, 99); b = r.range(11, a - 1); } while (a % 10 >= b % 10);
    const d = a - b;
    return { q: `${a} − ${b}`, a: String(d), hissan: { a, b, op: "−" }, choices: ch(r, d, [noBorrow(a, b), d + 10, d - 10, d + 1, d - 1].map(String), nf(r, d, { min: 1, max: 99 })) };
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
  g.kuku = (r, p) => {                                     // 九九（dans：[はじめ,おわり]の段）
    const [lo, hi] = p.dans || [2, 9], a = r.range(lo, hi), b = r.range(p.minB || 1, 9), s = a * b;
    return { q: r.chance(0.5) ? `${a} × ${b}` : `${b} × ${a}`, a: String(s), choices: ch(r, s, [s + a, s - a, a + b, s + b, s - b].map(String), nf(r, s, { min: 1, max: 81 })), tag: "kuku" };
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
})(window.MH_GEN);
