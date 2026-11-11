/* 算数 3〜4年の型。漢字は学年配当の範囲だけ（ない字はひらがな） */
(function (G) {
  const g = G.gens, { ch, numFb, noCarry, noBorrow, dec, frac, gcd } = G;
  const nf = (r, n, o) => numFb(r, n, o);
  const S = x => x.map(String);
  const nz = x => x % 10 !== 0;                            // 小数にしたとき末尾が0にならない

  // ===== 3年 =====
  g.add3hissan = (r) => {                                  // 3けた+3けた（くり上がりあり）
    let a, b;
    do { a = r.range(100, 899); b = r.range(100, 899); } while ((a % 10) + (b % 10) < 10 && (Math.floor(a / 10) % 10) + (Math.floor(b / 10) % 10) < 10);
    const s = a + b;
    return { q: `${a} + ${b}`, a: String(s), hissan: { a, b, op: "+" }, choices: ch(r, s, S([noCarry(a, b), s + 10, s - 10, s + 100, s - 100, s + 1]), nf(r, s, { step: 10, min: 200, max: 1798 })) };
  };
  g.sub3hissan = (r) => {                                  // 3けた−3けた（くり下がりあり）
    let a, b;
    do { a = r.range(300, 999); b = r.range(100, a - 100); } while ((a % 10) >= (b % 10) && (Math.floor(a / 10) % 10) >= (Math.floor(b / 10) % 10));
    const d = a - b;
    return { q: `${a} − ${b}`, a: String(d), hissan: { a, b, op: "−" }, choices: ch(r, d, S([noBorrow(a, b), d + 10, d - 10, d + 100, d - 100, d + 1]), nf(r, d, { step: 10, min: 1, max: 899 })) };
  };
  g.man3 = (r) => {                                        // 万の位まで（千万まで）
    const k = r.int(3);
    if (k === 0) {
      const a = r.range(1, 9), b = r.range(1, 9), n = a * 10000 + b * 1000;
      return { q: `10000が ${a}こと 1000が ${b}こで いくつ？`, a: String(n), choices: ch(r, n, S([a * 1000 + b * 10000, a * 10000 + b * 100, a * 10000 + b * 10, a * 1000 + b * 100 + 10000]), nf(r, n, { step: 1000, min: 11000, max: 99000 })) };
    }
    if (k === 1) {
      const a = r.range(1, 9), b = r.range(1, 9), n = a * 10000 + b * 1000;
      return { q: `${a}万${b}000を 数字で かくと？`, a: String(n), choices: ch(r, n, S([a * 1000 + b, a * 100000 + b * 1000, a * 10000 + b * 100, a * 10000 + b * 10]), nf(r, n, { step: 1000, min: 11000, max: 99000 })) };
    }
    const m = r.range(12, 99), n = m * 1000;
    return { q: `${n}は 1000が なんこ？`, a: String(m), choices: ch(r, m, S([m * 10, Math.floor(m / 10), m + 1, m - 1, m * 100]), nf(r, m, { min: 11, max: 99 })) };
  };
  /* かけ算（ひっ算）：a=[最小,最大] b=[最小,最大] */
  g.kake = (r, p) => {
    const a = r.range(p.a[0], p.a[1]), b = r.range(p.b[0], p.b[1]), s = a * b;
    const w = [], oneDigit = b < 10;
    if (oneDigit) w.push(Number(String(a).split("").map(d => (d * b) % 10).join("")), s + b, s - b, s + 10, s - 10);
    else { const bt = Math.floor(b / 10), bo = b % 10; w.push(a * bo + a * bt, a * bo * 1 + a * bt * 10 + a * 10, s + 10, s - 10, s + 100, s - 100, a * bo + a * bt * 100); }
    return { q: `${a} × ${b}`, a: String(s), hissan: { a, b, op: "×" }, choices: ch(r, s, S(w), nf(r, s, { step: oneDigit ? 1 : 10, min: 10, max: 99999 })) };
  };
  g.kakeJuu = (r) => {                                     // 何十・何百×何
    const big = r.chance(0.4), a = big ? r.range(2, 9) * 100 : r.range(2, 9) * 10, b = r.range(2, 9), s = a * b;
    return { q: `${a} × ${b}`, a: String(s), choices: ch(r, s, S([s / 10, s * 10, a + b, s + (big ? 100 : 10), s - (big ? 100 : 10)]), nf(r, s, { step: big ? 100 : 10, min: 20, max: 9999 }), { loose: true }) };
  };
  /* わり算（あまりなし／あり）：d=[わる数の範囲] q=[商の範囲] amariP=あまりが出る確率 nMax=わられる数の上限 */
  g.warizan = (r, p) => {
    let d, qq, rem, n;
    do {
      d = r.range(p.d[0], p.d[1]); qq = r.range(p.q[0], p.q[1]);
      rem = r.chance(p.amariP) ? r.range(1, d - 1) : 0; n = d * qq + rem;
    } while (n > (p.nMax || 9999) || (p.zero && !/0/.test(String(qq))) && r.chance(0.8));
    const f = (a, b) => b ? `${a}あまり${b}` : String(a), A = f(qq, rem);
    const w = [];
    if (rem) w.push(f(qq - 1, rem + d), f(qq + 1, rem), f(qq, rem + 1), f(rem, qq), f(qq, rem === 1 ? 2 : rem - 1), f(qq + 1, Math.max(0, rem - 1)));
    else { w.push(qq + 1, qq - 1, qq + 10, qq - 10, Number(String(qq).replace(/0/g, "")) || qq + 2, d); }
    const fb = rem ? [f(qq + 2, rem), f(qq, rem + 2), f(qq - 2, rem), f(qq + 1, rem + 1)] : nf(r, qq, { min: 1 });
    return { q: `${n} ÷ ${d}`, a: A, hissan: { a: n, b: d, op: "÷", q: qq, r: rem }, choices: ch(r, A, w.map(String), fb, { loose: rem > 0 }) };
  };
  const WITEM = [["あめ", "こ"], ["えんぴつ", "ほん"], ["シール", "まい"], ["ビー玉", "こ"]];
  g.wariBunsho = (r) => {                                  // わり算の文章題（等分・包含）
    const [t, u] = r.pick(WITEM), d = r.range(2, 9), c = r.range(2, 9), n = d * c;
    if (r.chance(0.5)) return { q: `${t}が ${n}${u} あります。 ${d}人で おなじ数ずつ わけると、 1人 なん${u}？`, a: String(c), choices: ch(r, c, S([d, c + 1, c - 1, n - d, c + 2]), nf(r, c, { min: 2, max: 9 })) };
    return { q: `${t}が ${n}${u} あります。 1人に ${c}${u}ずつ わけると、 なん人に わけられる？`, a: String(d), choices: ch(r, d, S([c, d + 1, d - 1, n - c, d + 2]), nf(r, d, { min: 2, max: 9 })) };
  };
  /* 小数のたし算・ひき算：dpSet=[[aの小数の桁数,bの桁数]...] maxInt=整数部の最大 op は '+' '−' 両方 */
  g.shosuAddSub = (r, p) => {
    for (;;) {
      const [pa, pb] = r.pick(p.dpSet), P = Math.max(pa, pb), sub = p.op === "−" || (p.op === "±" && r.chance(0.5));
      const a = r.range(1, (p.maxInt || 9) * 10 ** pa), b = r.range(1, (p.maxInt || 9) * 10 ** pb);
      if (!nz(a) || !nz(b)) continue;
      const A = a * 10 ** (P - pa), B = b * 10 ** (P - pb);
      if (sub && A <= B) continue;
      const ans = sub ? A - B : A + B;
      if (!nz(ans)) continue;
      const wr = [sub ? Math.abs(a - b) : a + b, ans + 1, ans - 1, ans + 10, ans - 10, ans + 100, ans - 100].filter((x, i) => i < 1 ? pa !== pb : true);
      const ok = x => x > 0 && nz(x);
      const wrongs = [];
      if (pa !== pb) wrongs.push(dec(sub ? Math.abs(a - b) : a + b, P));
      wrongs.push(...[ans + 1, ans - 1, ans + 10, ans - 10, ans + 100, ans - 100].filter(ok).map(x => dec(x, P)));
      if (P === 1 && !sub && ans >= 20) wrongs.push(dec(ans - 9, 1));
      return { q: `${dec(a, pa)} ${sub ? "−" : "+"} ${dec(b, pb)}`, a: dec(ans, P), hissan: { a: dec(a, pa), b: dec(b, pb), op: sub ? "−" : "+" }, choices: ch(r, dec(ans, P), wrongs, nf(r, ans, { step: 1, min: 1, ok, fmt: x => dec(x, P) })) };
    }
  };
  /* 同じ分母の分数のたし算・ひき算（3年：約分しない） */
  g.bunsuAddSub3 = (r, p) => {
    for (;;) {
      const d = r.range(4, 12), a = r.range(1, d - 1), b = r.range(1, d - 1), sub = p.op === "−" || (p.op === "±" && r.chance(0.5));
      let n;
      if (sub) { if (a <= b) continue; n = a - b; } else { n = a + b; if (n >= d) continue; }
      if (gcd(n, d) !== 1) continue;
      const A = `${n}/${d}`, w = sub ? [`${n}/${d - d + 1 && 1}`, `${a - b}/${d - b}`, `${a}/${d - b}`] : [`${n}/${d + d}`, `${n}/${d + 1}`, `${a + b}/${d * 2 - 1}`];
      const wr = [...w, `${n + 1}/${d}`, `${n - 1}/${d}`, sub ? `${a + b}/${d}` : `${a * b}/${d}`, `${n}/${d + 2}`].filter(x => !/\/0$/.test(x) && !/^0\//.test(x));
      return { q: `${a}/${d} ${sub ? "−" : "+"} ${b}/${d}`, a: A, choices: ch(r, A, wr, [`${n + 2}/${d}`, `${Math.max(1, n - 2)}/${d}`, `${n}/${d - 1}`, `${n + 1}/${d + 1}`]) };
    }
  };
  g.bunsuImi3 = (r) => {                                   // 分数の意味（1/□の □こ分）
    const d = r.range(3, 10), k = r.range(2, d - 1);
    if (r.chance(0.5)) {
      const A = `${k}/${d}`;
      return { q: `1/${d}が ${k}こ あつまると、 いくつ？`, a: A, choices: ch(r, A, [`${d}/${k}`, `1/${d * k}`, `${k + 1}/${d}`, `${k}/${d + k}`, `${k - 1}/${d}`], [`${k}/${d + 1}`, `${k + 2}/${d}`, `${k}/${d - 1}`]) };
    }
    return { q: `${k}/${d}は 1/${d}の なんこ分？`, a: String(k), choices: ch(r, k, S([d, k + 1, k - 1, d - k, k + 2]), nf(r, k, { min: 1, max: 12 })) };
  };
  g.tanLength3 = (r, p) => {                               // 長いものの長さ（km と m）
    const k = r.int(3);
    if (k === 0) { const a = r.range(1, 9), b = r.range(1, 9) * 100, v = a * 1000 + b;
      return { q: `${a}km ${b}m = □m`, a: v + "m", choices: ch(r, v + "m", S([a * 1000 + b / 10, a * 1000 + b + 100, a * 1000 + b - 100, a * 100 + b, b * 10 + a, a * 10000 + b]).map(x => x + "m"), nf(r, v, { step: 100, min: 1100, max: 9900, fmt: x => x + "m" }), { loose: p.loose }) }; }
    if (k === 1) { const a = r.range(2, 9), v = a * 1000;
      return { q: `${a}km = □m`, a: v + "m", choices: ch(r, v + "m", S([a * 100, a * 10000, a * 10, v + 100]).map(x => x + "m"), nf(r, v, { step: 1000, min: 1000, max: 9000, fmt: x => x + "m" }), { loose: p.loose }) }; }
    const a = r.range(1, 9), b = r.range(1, 9) * 100, n = a * 1000 + b, A = `${a}km${b}m`;
    return { q: `${n}mは 何km何m？`, a: A, ans: "choice4", choices: ch(r, A, [`${a}km${b / 100}m`, `${a * 10}km${b}m`, `${b / 100}km${a}00m`, `${a}km${b + 100}m`, `${a + 1}km${b}m`, `${a}km${b - 100 || 50}m`], [`${a}km${b + 200}m`, `${a + 2}km${b}m`], { loose: true }) };
  };
  g.tanWeight3 = (r, p) => {                               // 重さのたんい（g・kg・t）
    const k = r.int(3);
    if (k === 0) { const a = r.range(1, 9), b = r.range(1, 9) * 100, v = a * 1000 + b;
      return { q: `${a}kg ${b}g = □g`, a: v + "g", choices: ch(r, v + "g", S([a * 1000 + b / 10, a * 100 + b, a * 1000 + b + 100, a * 1000 + b - 100, b * 10 + a]).map(x => x + "g"), nf(r, v, { step: 100, min: 1100, max: 9900, fmt: x => x + "g" }), { loose: p.loose }) }; }
    if (k === 1) { const a = r.range(2, 9), v = a * 1000;
      return { q: `${a}t = □kg`, a: v + "kg", choices: ch(r, v + "kg", S([a * 100, a * 10000, a * 10, v + 100]).map(x => x + "kg"), nf(r, v, { step: 1000, min: 1000, max: 9000, fmt: x => x + "kg" }), { loose: p.loose }) }; }
    const a = r.range(1, 9), b = r.range(1, 9) * 100, n = a * 1000 + b, A = `${a}kg${b}g`;
    return { q: `${n}gは 何kg何g？`, a: A, ans: "choice4", choices: ch(r, A, [`${a}kg${b / 100}g`, `${a * 10}kg${b}g`, `${b / 100}kg${a}00g`, `${a}kg${b + 100}g`, `${a + 1}kg${b}g`], [`${a}kg${b + 200}g`, `${a + 2}kg${b}g`], { loose: true }) };
  };
  g.kuuran3 = (r) => {                                     // □を使った式
    const k = r.int(4);
    if (k === 0) { const b = r.range(5, 60), a = r.range(5, 60), c = a + b; return { q: `□ + ${b} = ${c}`, a: String(a), choices: ch(r, a, S([c + b, b, c, a + 1, a - 1, a + 10, a - 10]), nf(r, a, { min: 1, max: 99 })) }; }
    if (k === 1) { const c = r.range(5, 50), x = r.range(5, 50), A = c + x; return { q: `${A} − □ = ${c}`, a: String(x), choices: ch(r, x, S([A + c, c, A, x + 1, x - 1, x + 10]), nf(r, x, { min: 1, max: 99 })) }; }
    if (k === 2) { const b = r.range(5, 40), c = r.range(5, 50), a = c + b; return { q: `□ − ${b} = ${c}`, a: String(a), choices: ch(r, a, S([Math.abs(c - b) || 1, b, c, a + 1, a - 1, a + 10]), nf(r, a, { min: 10, max: 99 })) }; }
    const b = r.range(2, 9), x = r.range(2, 12), c = b * x; return { q: `□ × ${b} = ${c}`, a: String(x), choices: ch(r, x, S([c - b, b, x + 1, x - 1, c + b > 99 ? x + 2 : c + b]), nf(r, x, { min: 2, max: 12 })) };
  };
  g.hyo3 = (r) => {                                        // 表・ぼうグラフを読む（数字で出す）
    const nm = ["りんご", "みかん", "バナナ", "ぶどう"], v = r.shuffle([3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 18, 20]).slice(0, 4), tbl = nm.map((n, i) => `${n} ${v[i]}こ`).join("、");
    const k = r.int(3), i = r.int(4);
    if (k === 0) { const big = r.chance(0.5), x = big ? Math.max(...v) : Math.min(...v), a = nm[v.indexOf(x)];
      return { q: `くだものの 数：${tbl}。いちばん ${big ? "多い" : "少ない"}のは？`, a, ans: "choice4", choices: r.shuffle(nm) }; }
    if (k === 1) { const s = v.reduce((x, y) => x + y, 0); return { q: `くだものの 数：${tbl}。ぜんぶで なんこ？`, a: String(s), choices: ch(r, s, S([s + 1, s - 1, s + 10, s - 10, s + 2]), nf(r, s, { min: 10, max: 99 })) }; }
    let j; do { j = r.int(4); } while (j === i); const d = Math.abs(v[i] - v[j]);
    return { q: `くだものの 数：${tbl}。${nm[i]}と ${nm[j]}の ちがいは なんこ？`, a: String(d), choices: ch(r, d, S([v[i] + v[j], d + 1, d - 1, d + 2]), nf(r, d, { min: 1, max: 19 })) };
  };
  g.en3 = (r) => {                                         // 円と球（半径・直径）
    const k = r.int(3), x = r.range(2, 9);
    if (k === 0) return { q: `はんけいが ${x}cmの 円の ちょっけいは？`, a: `${x * 2}cm`, choices: ch(r, `${x * 2}cm`, S([x, x * 2 + 1, x * 2 - 1, x * 4, x + 2]).map(v => v + "cm"), nf(r, x * 2, { min: 2, max: 30, fmt: v => v + "cm" })) };
    if (k === 1) { const d = x * 2; return { q: `ちょっけいが ${d}cmの 円の はんけいは？`, a: `${x}cm`, choices: ch(r, `${x}cm`, S([d, x + 1, x - 1, d * 2, x + 2]).map(v => v + "cm"), nf(r, x, { min: 1, max: 30, fmt: v => v + "cm" })) }; }
    const d = x * 2; return { q: `はんけいが ${x}cmの 球を まっすぐ 切ったとき、 切り口の 円の ちょっけいは いちばん 大きくて？`, a: `${d}cm`, choices: ch(r, `${d}cm`, S([x, d + 1, d - 1, d * 2, d + 2]).map(v => v + "cm"), nf(r, d, { min: 2, max: 40, fmt: v => v + "cm" })) };
  };

  // ===== 4年 =====
  g.oku4 = (r) => {                                        // 億・万の数
    if (r.chance(0.65)) {
      const a = r.range(1, 9), b = r.range(100, 9999), n = a * 1e8 + b * 1e4;
      return { q: `${a}億${b}万を 数字で かくと？`, a: String(n), choices: ch(r, n, S([a * 1e8 + b * 1e3, a * 1e8 + b, a * 1e8 + b * 1e4 + 1e4, a * 1e8 + b * 1e4 - 1e4, a * 1e8 + Math.floor(b / 10) * 1e5]), nf(r, n, { step: 1e4, min: 1e8, max: 999999999 })) };
    }
    const places = [["億", 1e8], ["千万", 1e7], ["百万", 1e6], ["十万", 1e5], ["万", 1e4]], [nm, u] = r.pick(places);
    const n = r.range(100000000, 999999999), dg = Math.floor(n / u) % 10, all = [...new Set(String(n).split("").map(Number))].filter(x => x !== dg);
    if (all.length < 3) return g.oku4(r);
    return { q: `${n}の ${nm}の位の 数字は？`, a: String(dg), choices: ch(r, dg, S(all), nf(r, dg, { min: 0, max: 9 }), { loose: true }) };
  };
  g.gaisu4 = (r, p) => {                                   // がい数（ししゃごにゅう）
    const pl = r.pick(p.places || [[10, "十"], [100, "百"], [1000, "千"]]), [pp, nm] = pl;
    const n = r.range(1001, 94999);
    if (n % pp === 0) return g.gaisu4(r, p);
    const ans = Math.round(n / pp) * pp, fl = Math.floor(n / pp) * pp, ce = Math.ceil(n / pp) * pp;
    const w = [fl, ce, Math.round(n / (pp * 10)) * pp * 10, Math.round(n / (pp / 10)) * (pp / 10), ans + pp, ans - pp];
    return { q: `${n}を ししゃごにゅうして、 ${nm}の位までの がい数に すると？`, a: String(ans), choices: ch(r, ans, S(w), nf(r, ans, { step: pp, min: 1000, max: 100000 })) };
  };
  g.shosuInt4 = (r, p) => {                                // 小数×整数・小数÷整数
    for (;;) {
      const dp = r.pick(p.dps || [1, 2]), mul = p.op === "×" || (p.op === "±" && r.chance(0.5)), b = r.range(2, 9);
      if (mul) {
        const a = r.range(11, 9 * 10 ** dp + 9); if (!nz(a) || !nz(a * b)) continue;
        const s = a * b, w = [dec(s, dp + 1), dec(s, dp - 1), dec(a + b, dp), ...[s + 1, s - 1, s + 10, s - 10].filter(x => x > 0 && nz(x)).map(x => dec(x, dp))];
        return { q: `${dec(a, dp)} × ${b}`, a: dec(s, dp), hissan: { a: dec(a, dp), b, op: "×" }, choices: ch(r, dec(s, dp), w, nf(r, s, { min: 11, ok: x => nz(x), fmt: x => dec(x, dp) })) };
      }
      const c = r.range(11, 9 * 10 ** dp + 9); if (!nz(c) || !nz(c * b)) continue;
      const n = b * c, w = [dec(c, dp + 1), dec(c * 10, dp), dec(Math.floor(n / b / 10), dp), ...[c + 1, c - 1, c + 10, c - 10].filter(x => x > 0 && nz(x)).map(x => dec(x, dp))];
      return { q: `${dec(n, dp)} ÷ ${b}`, a: dec(c, dp), hissan: { a: dec(n, dp), b, op: "÷" }, choices: ch(r, dec(c, dp), w, nf(r, c, { min: 11, ok: x => nz(x), fmt: x => dec(x, dp) })) };
    }
  };
  const mixed = (W, N, d) => N ? `${W}と${N}/${d}` : String(W);
  g.bunsuMixed4 = (r, p) => {                              // 帯分数の たし算・ひき算（同じ分母）
    for (;;) {
      const d = r.pick([3, 5, 7]), w1 = r.range(1, 5), w2 = r.range(1, 4), n1 = r.range(1, d - 1), n2 = r.range(1, d - 1), sub = p.op === "−" || (p.op === "±" && r.chance(0.5));
      let t1 = w1 * d + n1, t2 = w2 * d + n2;
      if (sub) { if (t1 <= t2) continue; }
      const t = sub ? t1 - t2 : t1 + t2, W = Math.floor(t / d), N = t % d;
      if (!N || (sub ? t1 % d === 0 : false)) continue;
      const A = mixed(W, N, d), carry = sub ? n1 < n2 : n1 + n2 > d;
      const w = [mixed(W + 1, N, d), mixed(W - 1, N, d), mixed(W, d - N, d), mixed(W, N === d - 1 ? 1 : N + 1, d), ...(sub ? [`${Math.abs(w1 - w2)}と${Math.abs(n1 - n2)}/${d}`] : [])];
      if (carry) w.push(mixed(sub ? W + 1 : W - 1, N, d));
      return { q: `${w1}と${n1}/${d} ${sub ? "−" : "+"} ${w2}と${n2}/${d}`, a: A, choices: ch(r, A, w.filter(x => x !== A && !/^\d+と\d+\/\d+$/.test(x) ? true : x !== A), [mixed(W + 2, N, d), mixed(W, N === 1 ? 2 : N - 1, d), mixed(Math.max(1, W - 2), N, d)]) };
    }
  };
  g.bunsuKawaru4 = (r) => {                                // 仮分数 ⇔ 帯分数
    for (;;) {
      const d = r.range(3, 9), W = r.range(1, 4), N = r.range(1, d - 1);
      if (gcd(N, d) !== 1) continue;
      const imp = W * d + N;
      if (r.chance(0.5)) { const A = `${W}と${N}/${d}`;
        return { q: `${imp}/${d}を 帯分数に すると？`, a: A, choices: ch(r, A, [`${W + 1}と${N}/${d}`, `${N}と${W}/${d}`, `${W}と${N}/${d + 1}`, `${W - 1 || 5}と${N + d - 1 > 0 ? N : 1}/${d}`, `${W}と${(N + 1) % d || 1}/${d}`], [`${W + 2}と${N}/${d}`, `${W}と${N === 1 ? 2 : N - 1}/${d}`, `${W}と${N}/${d - 1 || 2}`]) }; }
      const A = `${imp}/${d}`;
      return { q: `${W}と${N}/${d}を かりぶんすうに すると？`, a: A, choices: ch(r, A, [`${W + N}/${d}`, `${W * N}/${d}`, `${imp + 1}/${d}`, `${imp - 1}/${d}`, `${imp}/${d + 1}`, `${W * d}/${d}`], [`${imp + 2}/${d}`, `${imp}/${d - 1}`, `${imp - 2}/${d}`]) };
    }
  };
  g.mixOrder4 = (r) => {                                   // 計算のじゅんじょ（×÷を先、( ) を先）
    for (;;) {
      const k = r.int(4), a = r.range(2, 30), b = r.range(2, 9), c = r.range(2, 9);
      let q, ans, naive;
      if (k === 0) { q = `${a} + ${b} × ${c}`; ans = a + b * c; naive = (a + b) * c; }
      else if (k === 1) { q = `${a * 3} − ${b} × ${c}`; ans = a * 3 - b * c; naive = (a * 3 - b) * c; if (ans <= 0) continue; }
      else if (k === 2) { q = `(${a} + ${b}) × ${c}`; ans = (a + b) * c; naive = a + b * c; }
      else { q = `${a} + ${b * c} ÷ ${c}`; ans = a + b; naive = (a + b * c) / c; if (!Number.isInteger(naive)) naive = a + b + 1; }
      if (naive === ans || ans > 200) continue;
      return { q, a: String(ans), choices: ch(r, ans, S([naive, ans + 1, ans - 1, ans + 10, ans - 10, ans + c]), nf(r, ans, { min: 1, max: 200 })) };
    }
  };
  g.menseki4 = (r) => {                                    // 長方形・正方形のめんせき（4年は「めんせき」とかな）
    if (r.chance(0.6)) {
      const a = r.range(2, 20), b = r.range(2, 20), s = a * b;
      return { q: `たて ${a}cm、 よこ ${b}cmの 長方形の めんせきは？`, a: s + "cm²", choices: ch(r, s + "cm²", S([2 * (a + b), a + b, s + a, s - b, s + b, s - a]).map(x => x + "cm²"), nf(r, s, { min: 4, max: 400, fmt: x => x + "cm²" })) };
    }
    const a = r.range(2, 20), s = a * a;
    return { q: `1へんが ${a}cmの 正方形の めんせきは？`, a: s + "cm²", choices: ch(r, s + "cm²", S([4 * a, 2 * a, s + a, s - a, a * (a + 1), a * (a - 1)]).map(x => x + "cm²"), nf(r, s, { min: 4, max: 400, fmt: x => x + "cm²" })) };
  };
  g.mensekiTan4 = (r, p) => {                              // めんせきの たんい
    const T = [["m²", "cm²", 10000], ["a", "m²", 100], ["ha", "a", 100], ["ha", "m²", 10000], ["km²", "ha", 100], ["km²", "m²", 1000000]], [u1, u2, f] = r.pick(T), x = r.range(2, 9), v = x * f;
    const w = [x * f * 10, x * f / 10, x * f * 100, x * (f > 100 ? f / 10 : f * 10), x * f / 100 || x * 10].filter(y => Number.isInteger(y) && y !== v);
    return { q: `${x}${u1} = □${u2}`, a: v + u2, choices: ch(r, v + u2, w.map(y => y + u2), [x * f * 1000, x * f / 1000 || x * 7].map(y => y + u2), { loose: true }) };
  };
  g.kakudo4 = (r) => {                                     // 角の大きさ（180度・360度・90度）
    const T = [[180, "一直線の 角は 180度。 1つの 角が", "もう1つの 角は？"], [360, "1しゅうの 角は 360度。 1つの 角が", "のこりの 角は？"], [90, "直角は 90度。 1つの 角が", "のこりの 角は？"]], [S0, h, t] = r.pick(T);
    const a = r.range(S0 === 90 ? 1 : 2, Math.floor(S0 / 5) - 1) * 5, v = S0 - a;
    if (a <= 0 || v <= 0) return g.kakudo4(r);
    return { q: `${h} ${a}度の とき、 ${t}`, a: v + "度", choices: ch(r, v + "度", S([a, S0 === 180 ? 360 - a : 180 - a > 0 ? 180 - a : a + 10, v + 10, v - 10, a + v > 0 ? 90 - (a % 90) : 0, v + 5]).map(x => x + "度").filter(x => !/^0度|^-/.test(x)), nf(r, v, { step: 5, min: 5, max: 360, fmt: x => x + "度" })) };
  };
  g.henka4 = (r) => {                                      // 変わり方（きまりをみつける）
    const k = r.int(3), xs = [1, 2, 3, 4, 5];
    let ys, f, desc;
    if (k === 0) { const m = r.range(2, 9); f = x => m * x; }
    else if (k === 1) { const m = r.range(3, 12); f = x => x + m; }
    else { const m = r.range(12, 24); f = x => m - x; }
    ys = xs.map(f); const a = ys[4], prev = ys[3];
    return { q: `x が 1、2、3、4、5 の とき、 y は ${ys.slice(0, 4).join("、")}、□ です。 □に はいる 数は？`, a: String(a), choices: ch(r, a, S([prev + (prev - ys[2]) + 1, prev, a + 1, a - 1, a + 2, prev + 1]), nf(r, a, { min: 1, max: 60 })) };
  };
})(window.MH_GEN);
