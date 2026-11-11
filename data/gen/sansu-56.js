/* 算数 5〜6年の型。分数の答えは約分した形（calc.js と同じ。1より大きいときは仮分数） */
(function (G) {
  const g = G.gens, { ch, numFb, dec, frac, gcd, lcm } = G;
  const nf = (r, n, o) => numFb(r, n, o);
  const S = x => x.map(String);
  const nz = x => x % 10 !== 0;
  const isFrac = s => /^\d+\/\d+$/.test(s);
  // 分数の答えの「近い」まちがい（約分した形・整数にならないもの）
  function fracFb(ans) {
    const [n, d] = ans.split("/").map(Number);
    return [[n + 1, d], [n - 1, d], [n, d + 1], [n + 2, d], [n, d + 2], [n * 2, d + 1], [n + 3, d + 1], [n + 1, d + 1], [n, d - 1], [n + 4, d]]
      .filter(([a, b]) => a > 0 && b > 1).map(([a, b]) => frac(a, b)).filter(isFrac);
  }
  const fr = (n, d) => frac(n, d);
  const coprime = (r, d) => { let a; do { a = r.range(1, d - 1); } while (gcd(a, d) !== 1); return a; };

  // ===== 5年 =====
  g.baisu5 = (r) => {                                      // 倍数をえらぶ
    const n = r.range(2, 9), k = r.range(2, 12), ans = n * k;
    const bad = [];
    for (const c of r.shuffle([ans + 1, ans - 1, ans + 2, ans - 2, ans + n + 1, ans - n + 1, ans + n - 1, ans + 3])) if (c > 1 && c % n !== 0 && !bad.includes(c)) bad.push(c);
    return { q: `${n}の 倍数は どれ？`, a: String(ans), ans: "choice4", choices: r.shuffle([String(ans), ...bad.slice(0, 3).map(String)]) };
  };
  g.yakusu5 = (r) => {                                     // 約数をえらぶ
    const n = r.pick([12, 16, 18, 20, 24, 28, 30, 36, 40, 42, 45, 48, 60]), dv = []; for (let i = 2; i < n; i++) if (n % i === 0) dv.push(i);
    const ans = r.pick(dv), bad = r.shuffle([...Array(n - 3).keys()].map(i => i + 2).filter(i => n % i !== 0)).slice(0, 3);
    return { q: `${n}の 約数は どれ？`, a: String(ans), ans: "choice4", choices: r.shuffle([String(ans), ...bad.map(String)]) };
  };
  g.kobaisu5 = (r) => {                                    // 最小公倍数
    for (;;) {
      const a = r.range(2, 12), b = r.range(2, 12); if (a === b) continue;
      const L = lcm(a, b), G0 = gcd(a, b); if (L === a || L === b || L > 90) continue;
      return { q: `${a}と ${b}の 最小公倍数は？`, a: String(L), choices: ch(r, L, S([a * b, G0, Math.max(a, b), L * 2, a + b, L + a, L - b]).filter(x => +x !== L), nf(r, L, { min: 2, max: 140 })) };
    }
  };
  g.koyakusu5 = (r) => {                                   // 最大公約数
    for (;;) {
      const k = r.range(2, 12), x = r.range(2, 6), y = r.range(2, 6); if (x === y || gcd(x, y) !== 1) continue;
      const a = k * x, b = k * y; if (a > 60 || b > 60) continue;
      const cd = []; for (let i = 2; i < k; i++) if (k % i === 0) cd.push(i);
      return { q: `${a}と ${b}の 最大公約数は？`, a: String(k), choices: ch(r, k, S([...cd, lcm(a, b), Math.min(a, b), k * 2, k + 1, k - 1, Math.abs(a - b) === k ? k + 2 : Math.abs(a - b)]).filter(v => +v !== k), nf(r, k, { min: 2, max: 40 })) };
    }
  };
  g.shosuKake5 = (r, p) => {                               // 小数×小数
    for (;;) {
      const a = r.range(11, p.maxA || 99), b = r.range(11, p.maxB || 99);
      if (!nz(a) || !nz(b) || !nz(a * b)) continue;
      const s = a * b, ok = x => x > 0 && nz(x);
      return { q: `${dec(a, 1)} × ${dec(b, 1)}`, a: dec(s, 2), hissan: { a: dec(a, 1), b: dec(b, 1), op: "×" }, choices: ch(r, dec(s, 2), [dec(s, 1), dec(s, 3), dec(a + b, 1), ...[s + 1, s - 1, s + 10, s - 10, s + 100].filter(ok).map(x => dec(x, 2))], nf(r, s, { min: 1, ok, fmt: x => dec(x, 2) })) };
    }
  };
  g.shosuWari5 = (r) => {                                  // 小数÷小数（わりきれる）
    for (;;) {
      const d = r.range(2, 99), c = r.range(2, 60); if (!nz(d)) continue;
      const n = d * c;
      return { q: `${dec(n, 1)} ÷ ${dec(d, 1)}`, a: String(c), hissan: { a: dec(n, 1), b: dec(d, 1), op: "÷" }, choices: ch(r, c, S([c + 1, c - 1, c + 2, c - 2, c + 10, c - 10]), nf(r, c, { min: 2, max: 99 })) };
    }
  };
  g.yakubun5 = (r) => {                                    // 約分
    for (;;) {
      const b0 = r.range(2, 9), a0 = coprime(r, b0), k = r.range(2, 9), a = a0 * k, b = b0 * k; if (b > 72) continue;
      const A = `${a0}/${b0}`, part = [];
      for (let i = 2; i < k; i++) if (k % i === 0) part.push(`${a / i}/${b / i}`);
      return { q: `${a}/${b}を これいじょう 約分できない 分数に しよう`, a: A, ans: "frac", choices: ch(r, A, [...part, `${a0}/${b}`, `${a}/${b0}`, `${a0 + 1}/${b0}`, `${a0}/${b0 + 1}`, `${b0}/${a0}`.replace(/^1\//, "2/")], [`${a0 + 2}/${b0}`, `${a0}/${b0 + 2}`, `${a0 + 1}/${b0 + 1}`].filter(x => !/\/1$/.test(x) && x !== A)) };
    }
  };
  g.tsubun5 = (r) => {                                     // 通分
    if (r.chance(0.5)) {
      const b = r.range(2, 9), a = coprime(r, b), k = r.range(2, 6), m = b * k, v = a * k;
      return { q: `${a}/${b} = □/${m}`, a: String(v), choices: ch(r, v, S([a + (m - b), a + k, v + 1, v - 1, a * m, v + k]), nf(r, v, { min: 2, max: 99 })) };
    }
    for (;;) {
      const b = r.range(2, 9), d = r.range(2, 9); if (b === d || gcd(b, d) === 1 && r.chance(0.5)) continue;
      const a = coprime(r, b), c = coprime(r, d), L = lcm(b, d);
      if (L === b * d && r.chance(0.5)) continue;
      return { q: `${a}/${b}と ${c}/${d}を 通分するとき、 分母は いくつに すると いちばん ちいさい？`, a: String(L), choices: ch(r, L, S([b * d, Math.max(b, d), b + d, L * 2, L + b, L - d]).filter(x => +x !== L), nf(r, L, { min: 2, max: 90 })) };
    }
  };
  g.bunsuAddSub5 = (r, p) => {                             // 分母がちがう分数のたし算・ひき算
    for (;;) {
      const b = r.range(2, 9), d = r.range(2, 9); if (b === d) continue;
      let a = coprime(r, b), c = coprime(r, d); const sub = p.op === "−" || (p.op === "±" && r.chance(0.5));
      if (sub && a * d <= c * b) { if (a * d === c * b) continue; [a, b, c, d] = [c, d, a, b]; }
      const n = sub ? a * d - c * b : a * d + c * b, A = fr(n, b * d); if (!isFrac(A)) continue;
      const w = [fr(sub ? a - c : a + c, sub ? Math.abs(b - d) || 1 : b + d), fr(sub ? a - c : a + c, Math.max(b, d)), fr(n + 1, b * d), fr(n - 1, b * d), fr(a * c, b * d)].filter(x => isFrac(x) && x !== A);
      return { q: `${a}/${b} ${sub ? "−" : "+"} ${c}/${d}`, a: A, choices: ch(r, A, w, fracFb(A)) };
    }
  };
  g.bunsuShosu5 = (r) => {                                 // 分数と小数
    if (r.chance(0.5)) {
      const T = [[2, 1], [4, 3], [5, 2], [5, 3], [5, 4], [8, 3], [8, 5], [20, 7], [25, 6], [4, 1], [10, 7], [8, 7]], [d, n] = r.pick(T), v = Math.round(n / d * 1000), P = d === 8 ? 3 : (d === 2 || d === 5 || d === 10 ? 1 : 2);
      const sc = Math.round(n / d * 10 ** P), A = dec(sc, P);
      return { q: `${n}/${d}を 小数で あらわすと？`, a: A, choices: ch(r, A, [`0.${n}${d}`, `${n}.${d}`, dec(sc * 10, P), dec(Math.round(d / n * 10 ** P), P), ...[sc + 5, sc - 5, sc + 10].filter(x => x > 0 && nz(x) || P > 1).map(x => dec(x, P))], nf(r, sc, { step: P === 1 ? 1 : 5, min: 1, ok: x => nz(x) || P === 3, fmt: x => dec(x, P) })) };
    }
    const T2 = [[5, 1], [25, 7], [75, 3], [6, 3], [4, 1], [8, 1], [35, 7], [45, 9], [15, 3]];
    for (;;) {
      const x = r.pick([15, 25, 35, 45, 55, 65, 75, 85, 12, 24, 36, 48, 4, 8, 6, 2, 5]), P = x < 10 ? 1 : 2, d = 10 ** P, A = fr(x, d); if (!isFrac(A) || x % 10 === 0) continue;
      return { q: `${dec(x, P)}を 分数で あらわし、 約分すると？`, a: A, ans: "frac", choices: ch(r, A, [`${x}/${d}`, fr(x, d * 10), fr(d, x), fr(x + 1, d), fr(x, d + 10)].filter(v => v !== A), fracFb(A)) };
    }
  };
  g.heikin5 = (r) => {                                     // 平均
    for (;;) {
      const n = r.range(3, 5), xs = Array.from({ length: n }, () => r.range(5, 20) * 5), s = xs.reduce((a, b) => a + b, 0);
      if (s % n) continue;
      const m = s / n; if (xs.includes(m) && r.chance(0.5)) continue;
      return { q: `${n}回の テストの 点は ${xs.join("点、")}点でした。 平均は 何点？`, a: String(m), choices: ch(r, m, S([s, Math.floor(s / (n - 1)), Math.max(...xs), Math.min(...xs), m + 5, m - 5, Math.round(s / (n + 1))]).filter(v => +v !== m), nf(r, m, { step: 5, min: 10, max: 120 })) };
    }
  };
  g.hyakubun5 = (r) => {                                   // 百分率
    const k = r.int(3);
    if (k === 0) { const x = r.range(1, 19) * 5, A = dec(x, 2); return { q: `${x}%を 小数で あらわすと？`, a: A, choices: ch(r, A, [dec(x, 1), dec(x, 3), dec(x * 10, 2), dec(x + 5, 2), dec(x - 5, 2)].filter(v => v !== A && nz(+v.replace(".", ""))), [dec(x + 10, 2), dec(x - 10, 2), dec(x + 15, 2)]) }; }
    if (k === 1) { const a = r.pick([20, 25, 40, 50, 80, 200, 250, 400]), p = r.pick([10, 20, 25, 30, 40, 50, 60, 75, 80]), b = a * p / 100; if (!Number.isInteger(b) || b === a) return g.hyakubun5(r);
      const A = p + "%"; return { q: `${b}は ${a}の 何%？`, a: A, choices: ch(r, A, S([100 - p, p * 2, p / 10, p + 10, p - 10, Math.round(a / b * 100)]).filter(x => +x > 0 && x !== String(p)).map(x => x + "%"), nf(r, p, { step: 5, min: 5, max: 100, fmt: x => x + "%" })) }; }
    const a = r.pick([40, 50, 60, 80, 120, 200, 300, 400, 500]), p = r.pick([5, 10, 20, 25, 30, 40, 50, 60]), v = a * p / 100; if (!Number.isInteger(v)) return g.hyakubun5(r);
    return { q: `${a}人の ${p}%は 何人？`, a: String(v), choices: ch(r, v, S([a * p, a / p, v + 10, v - 10, a - v, Math.round(v * 2)]).filter(x => +x !== v), nf(r, v, { step: 5, min: 1, max: 400 })) };
  };
  g.hayasa5 = (r) => {                                     // 速さ（道のり・速さ・時間）
    const k = r.int(3), v = r.pick([40, 50, 60, 70, 80, 90]), t = r.range(2, 6);
    if (k === 0) { const s = v * t; return { q: `時速 ${v}kmで ${t}時間 走ると、 道のりは 何km？`, a: s + "km", choices: ch(r, s + "km", S([v + t, v / t < 1 ? v : Math.round(v / t), s + v, s - v, s + 10, s * 10]).map(x => x + "km"), nf(r, s, { step: 10, min: 80, max: 600, fmt: x => x + "km" })) }; }
    if (k === 1) { const s = v * t; return { q: `${s}kmを ${t}時間で 走りました。 時速は 何km？`, a: v + "km", choices: ch(r, v + "km", S([s * t, v + 10, v - 10, s - t, v + 20, t]).filter(x => +x > 0).map(x => x + "km"), nf(r, v, { step: 10, min: 10, max: 120, fmt: x => x + "km" })) }; }
    const m = r.pick([60, 70, 80, 90, 100]), u = r.range(3, 9), s = m * u; return { q: `分速 ${m}mで ${u}分 歩くと、 道のりは 何m？`, a: s + "m", choices: ch(r, s + "m", S([m + u, s + m, s - m, s + 10, s * 10, m * 60]).map(x => x + "m"), nf(r, s, { step: 10, min: 100, max: 1000, fmt: x => x + "m" })) };
  };
  g.taiseki5 = (r) => {                                    // 体積（直方体・立方体）
    if (r.chance(0.7)) { const a = r.range(2, 9), b = r.range(2, 9), c = r.range(2, 9), s = a * b * c;
      return { q: `たて ${a}cm、 よこ ${b}cm、 高さ ${c}cmの 直方体の 体積は？`, a: s + "cm³", choices: ch(r, s + "cm³", S([2 * (a * b + b * c + a * c), a + b + c, s + a, s - b, a * b, s + c]).map(x => x + "cm³"), nf(r, s, { min: 8, max: 729, fmt: x => x + "cm³" })) }; }
    const a = r.range(2, 9), s = a ** 3; return { q: `1へんが ${a}cmの 立方体の 体積は？`, a: s + "cm³", choices: ch(r, s + "cm³", S([a * a, 3 * a, 6 * a * a, s + a, s - a, a * a * 2]).map(x => x + "cm³"), nf(r, s, { min: 8, max: 729, fmt: x => x + "cm³" })) };
  };
  g.naikaku5 = (r) => {                                    // 図形の角（内角の和）
    const k = r.int(4);
    if (k === 0) { const a = r.range(3, 15) * 5, b = r.range(3, 15) * 5, v = 180 - a - b; if (v <= 0) return g.naikaku5(r);
      return { q: `三角形の 3つの 角の 和は 180度。 2つの 角が ${a}度と ${b}度の とき、 のこりの 角は？`, a: v + "度", choices: ch(r, v + "度", S([a + b, 360 - a - b, 180 - a, 90 - a, v + 10, v - 10]).filter(x => +x > 0).map(x => x + "度"), nf(r, v, { step: 5, min: 5, max: 170, fmt: x => x + "度" })) }; }
    if (k === 1) { const a = r.range(6, 20) * 5, b = r.range(6, 20) * 5, c = r.range(4, 14) * 5, v = 360 - a - b - c; if (v <= 0) return g.naikaku5(r);
      return { q: `四角形の 4つの 角の 和は 360度。 3つの 角が ${a}度、 ${b}度、 ${c}度の とき、 のこりの 角は？`, a: v + "度", choices: ch(r, v + "度", S([a + b + c, 180 - a - b - c, v + 10, v - 10, 360 - a - b, v + 20]).filter(x => +x > 0).map(x => x + "度"), nf(r, v, { step: 5, min: 5, max: 300, fmt: x => x + "度" })) }; }
    if (k === 2) { const n = r.range(5, 9), v = (n - 2) * 180; return { q: `${n}角形の 内角の 和は？`, a: v + "度", choices: ch(r, v + "度", S([n * 180, (n - 1) * 180, (n - 3) * 180, (n - 2) * 360, (n - 2) * 90]).filter(x => +x > 0).map(x => x + "度"), nf(r, v, { step: 180, min: 180, max: 1800, fmt: x => x + "度" })) }; }
    const n = r.pick([5, 6, 8, 9, 10, 12]), v = (n - 2) * 180 / n; return { q: `正${n}角形の 1つの 角の 大きさは？`, a: v + "度", choices: ch(r, v + "度", S([(n - 2) * 180, 360 / n, 180 - 360 / n * 2, v + 10, v - 10, 180 / n]).filter(x => +x > 0).map(x => x + "度"), nf(r, v, { step: 6, min: 30, max: 170, fmt: x => x + "度" })) };
  };
  g.menseki5 = (r, p) => {                                 // 図形の面積（三角形・平行四辺形／台形・ひし形）
    const kind = r.pick(p.kinds);
    if (kind === "tri") { let b, h; do { b = r.range(3, 20); h = r.range(2, 15); } while ((b * h) % 2);
      return { q: `底辺 ${b}cm、 高さ ${h}cmの 三角形の 面積は？`, a: b * h / 2 + "cm²", choices: ch(r, b * h / 2 + "cm²", S([b * h, b + h, b * h / 2 + b, b * h / 2 - h, b * h * 2]).map(x => x + "cm²"), nf(r, b * h / 2, { min: 3, max: 200, fmt: x => x + "cm²" })) }; }
    if (kind === "para") { const b = r.range(3, 20), h = r.range(2, 15), s = b * h;
      return { q: `底辺 ${b}cm、 高さ ${h}cmの 平行四辺形の 面積は？`, a: s + "cm²", choices: ch(r, s + "cm²", S([s / 2, 2 * (b + h), b + h, s + b, s - h]).map(x => x + "cm²"), nf(r, s, { min: 6, max: 300, fmt: x => x + "cm²" })) }; }
    if (kind === "trap") { let u, l, h; do { u = r.range(2, 10); l = r.range(u + 1, 16); h = r.range(2, 12); } while (((u + l) * h) % 2);
      const s = (u + l) * h / 2; return { q: `上底 ${u}cm、 下底 ${l}cm、 高さ ${h}cmの 台形の 面積は？`, a: s + "cm²", choices: ch(r, s + "cm²", S([(u + l) * h, u * l / 2 || 1, (u + l) / 2, s + h, s - h, l * h]).map(x => x + "cm²"), nf(r, s, { min: 3, max: 200, fmt: x => x + "cm²" })) }; }
    let a, b; do { a = r.range(3, 20); b = r.range(3, 20); } while ((a * b) % 2);
    const s = a * b / 2; return { q: `対角線が ${a}cmと ${b}cmの ひし形の 面積は？`, a: s + "cm²", choices: ch(r, s + "cm²", S([a * b, a + b, s + a, s - b, 2 * (a + b)]).map(x => x + "cm²"), nf(r, s, { min: 3, max: 200, fmt: x => x + "cm²" })) };
  };
  g.enshu5 = (r) => {                                      // 円周（円周率3.14）
    for (;;) {
      const d = r.range(2, 30); if (d % 10 === 0 || !nz(d * 314) && d % 5) continue;
      const k = r.int(3);
      if (k < 2) { const useR = k === 1 && d % 2 === 0, base = useR ? d / 2 : d, s = d * 314;
        return { q: `${useR ? "半径" : "直径"} ${base}cmの 円の 円周は？ （円周率は 3.14）`, a: dec(s, 2) + "cm", choices: ch(r, dec(s, 2) + "cm", [dec(base * 314, 2), dec(base * d * 314, 2), dec(d * 628, 2), dec(s * 10, 2), dec(s + 100, 2), dec(s - 100, 2)].filter(x => x !== dec(s, 2)).map(x => x + "cm"), nf(r, s, { step: 10, min: 100, fmt: x => dec(x, 2) + "cm" })) }; }
      const e = d * 314; if (!nz(e)) continue;
      return { q: `円周が ${dec(e, 2)}cmの 円の 直径は？ （円周率は 3.14）`, a: d + "cm", choices: ch(r, d + "cm", S([d / 2, d * 2, d + 1, d - 1, d + 2, 314]).filter(x => +x > 0 && Number.isInteger(+x)).map(x => x + "cm"), nf(r, d, { min: 1, max: 99, fmt: x => x + "cm" })) };
    }
  };

  // ===== 6年 =====
  g.bunsuMul6 = (r, p) => {                                // 分数×分数・分数÷分数・分数と整数
    for (;;) {
      const b = r.range(2, 9), d = r.range(2, 9), a = coprime(r, b), c = coprime(r, d), k = p.op;
      let n, m, q, w;
      if (k === "×") { n = a * c; m = b * d; q = `${a}/${b} × ${c}/${d}`; w = [fr(a * d, b * c), fr(a + c, b + d), fr(a * c, b + d), fr(a * c + 1, b * d)]; }
      else if (k === "÷") { n = a * d; m = b * c; q = `${a}/${b} ÷ ${c}/${d}`; w = [fr(a * c, b * d), fr(b * c, a * d), fr(a + d, b + c), fr(a * d + 1, b * c)]; }
      else { const z = r.range(2, 9), mul = r.chance(0.5); if (mul) { n = a * z; m = b; q = `${a}/${b} × ${z}`; w = [fr(a, b * z), fr(a * z, b * z), fr(a + z, b), fr(a * z + 1, b)]; } else { n = a; m = b * z; q = `${a}/${b} ÷ ${z}`; w = [fr(a * z, b), fr(a, b + z), fr(a + z, b), fr(a + 1, b * z)]; } }
      const A = fr(n, m); if (!isFrac(A)) continue;
      return { q, a: A, choices: ch(r, A, w.filter(x => isFrac(x) && x !== A), fracFb(A)) };
    }
  };
  g.moji6 = (r) => {                                       // 文字と式
    const k = r.int(3);
    if (k === 0) { const a = r.range(2, 9), b = r.range(1, 20), x = r.range(2, 12), v = a * x + b;
      return { q: `x = ${x}の とき、 ${a} × x + ${b}の 値は？`, a: String(v), choices: ch(r, v, S([a * (x + b), a + x + b, a * x - b, v + a, v - a, v + 10]), nf(r, v, { min: 5, max: 150 })) }; }
    if (k === 1) { const a = r.range(2, 9), x = r.range(2, 12);
      return { q: `${a} × x = ${a * x}の とき、 x の 値は？`, a: String(x), choices: ch(r, x, S([a * x - a, a, x + 1, x - 1, a * x / 2 | 0 || 1, x + 2]), nf(r, x, { min: 1, max: 12 })) }; }
    const b = r.range(2, 20), x = r.range(2, 25);
    return { q: `x + ${b} = ${x + b}の とき、 x の 値は？`, a: String(x), choices: ch(r, x, S([x + 2 * b, b, x + b, x + 1, x - 1, Math.abs(x - b) || 1]), nf(r, x, { min: 1, max: 45 })) };
  };
  g.hirei6 = (r) => {                                      // 比例と反比例
    if (r.chance(0.6)) { const k = r.range(2, 9), x1 = r.range(2, 6), x2 = r.range(x1 + 1, 12), y1 = k * x1, y2 = k * x2;
      return { q: `y は x に 比例します。 x = ${x1}の とき y = ${y1}です。 x = ${x2}の とき、 y は？`, a: String(y2), choices: ch(r, y2, S([y1 + (x2 - x1), y2 + k, y2 - k, x2 + k, y1 * x1, Math.round(y1 / x1 * x2) + 1]).filter(v => +v !== y2), nf(r, y2, { min: 5, max: 120 })) }; }
    const k = r.pick([12, 18, 24, 36, 48, 60]), ds = []; for (let i = 2; i <= 12; i++) if (k % i === 0 && k / i >= 2) ds.push(i);
    const x1 = r.pick(ds); let x2; do { x2 = r.pick(ds); } while (x2 === x1);
    const y1 = k / x1, y2 = k / x2; return { q: `y は x に 反比例します。 x = ${x1}の とき y = ${y1}です。 x = ${x2}の とき、 y は？`, a: String(y2), choices: ch(r, y2, S([y1 + (x2 - x1), y1 * x2 / 2 | 0, k, y2 + 1, y2 - 1, y1 * (x2 - x1) || 1]).filter(v => +v !== y2 && +v > 0), nf(r, y2, { min: 1, max: 40 })) };
  };
  g.hiKantan6 = (r) => {                                   // 比をかんたんに／比の値
    for (;;) {
      const k = r.range(2, 9), a0 = r.range(1, 9), b0 = r.range(1, 9); if (a0 === b0 || gcd(a0, b0) !== 1) continue;
      const a = a0 * k, b = b0 * k;
      if (r.chance(0.6)) { const A = `${a0}:${b0}`; return { q: `${a}:${b}を いちばん かんたんな 整数の 比に すると？`, a: A, ans: "choice4", choices: ch(r, A, [`${b0}:${a0}`, `${a0}:${b}`, `${a}:${b0}`, `${a0 + 1}:${b0}`, `${a0}:${b0 + 1}`], [`${a0 + 2}:${b0}`, `${a0}:${b0 + 2}`, `${a0 + 1}:${b0 + 1}`], { loose: true }) }; }
      const A = fr(a0, b0); if (!isFrac(A)) continue;
      return { q: `${a}:${b}の 比の値は？`, a: A, ans: "frac", choices: ch(r, A, [fr(b0, a0), fr(a0, b), fr(a, b0), fr(a0 + 1, b0)].filter(x => isFrac(x) && x !== A), fracFb(A)) };
    }
  };
  g.hiEq6 = (r) => {                                       // 比の考え方（等しい比）
    const a = r.range(2, 9), b = r.range(2, 9); if (a === b || gcd(a, b) !== 1) return g.hiEq6(r);
    const k = r.range(2, 9), c = a * k, d = b * k, hide = r.chance(0.5);
    return hide ? { q: `${a}:${b} = ${c}:□`, a: String(d), choices: ch(r, d, S([b + (c - a), b + k, d + k, d - k, c * b, d + 1]).filter(x => +x !== d), nf(r, d, { min: 2, max: 90 })) }
      : { q: `${a}:${b} = □:${d}`, a: String(c), choices: ch(r, c, S([a + (d - b), a + k, c + k, c - k, d * a, c + 1]).filter(x => +x !== c), nf(r, c, { min: 2, max: 90 })) };
  };
  g.enMenseki6 = (r) => {                                  // 円の面積
    for (;;) {
      const rd = r.range(2, 15); if (rd % 10 === 0) continue;
      const useD = r.chance(0.4) && rd % 1 === 0, s = rd * rd * 314;
      return { q: `${useD ? "直径 " + rd * 2 : "半径 " + rd}cmの 円の 面積は？ （円周率は 3.14）`, a: dec(s, 2) + "cm²", choices: ch(r, dec(s, 2) + "cm²", [dec(rd * 628, 2), dec(rd * 314, 2), dec(rd * rd * 628, 2), dec(rd * 2 * rd * 2 * 314, 2), dec(s + 100, 2), dec(s - 100, 2)].filter(x => x !== dec(s, 2)).map(x => x + "cm²"), nf(r, s, { step: 10, min: 100, fmt: x => dec(x, 2) + "cm²" })) };
    }
  };
  g.chuutai6 = (r) => {                                    // 柱の体積
    if (r.chance(0.5)) { const s = r.range(4, 30), h = r.range(2, 15), v = s * h;
      return { q: `底面積が ${s}cm²、 高さが ${h}cmの 角柱の 体積は？`, a: v + "cm³", choices: ch(r, v + "cm³", S([s + h, v / 2, v + s, v - h, 2 * (s + h), v * 3]).filter(x => Number.isInteger(+x)).map(x => x + "cm³"), nf(r, v, { min: 8, max: 450, fmt: x => x + "cm³" })) }; }
    const rd = r.range(2, 9), h = r.range(2, 12), v = rd * rd * 314 * h;
    return { q: `底面の 半径が ${rd}cm、 高さが ${h}cmの 円柱の 体積は？ （円周率は 3.14）`, a: dec(v, 2) + "cm³", choices: ch(r, dec(v, 2) + "cm³", [dec(rd * 314 * h, 2), dec(rd * rd * 314, 2), dec(rd * rd * 314 * h * 2, 2), dec(rd * 628 * h, 2), dec(v + 100, 2), dec(v - 100, 2)].filter(x => x !== dec(v, 2) && !/^\d+cm/.test(x)).map(x => x.endsWith("cm³") ? x : x + "cm³"), nf(r, v, { step: 10, min: 100, ok: x => nz(x) || true, fmt: x => dec(x, 2) + "cm³" })) };
  };
  g.baai6 = (r) => {                                       // 場合の数
    const k = r.int(2);
    if (k === 0) { const n = r.range(3, 5), v = [1, 1, 2, 6, 24, 120][n]; return { q: `${n}人が 1れつに ならぶ ならび方は 何通り？`, a: String(v), choices: ch(r, v, S([n * n, n * 2, v + n, v - 1, n + (n - 1), v * 2, n * (n - 1)]).filter(x => +x !== v), nf(r, v, { min: 2, max: 150 })) }; }
    const n = r.range(4, 7), v = n * (n - 1) / 2; return { q: `${n}人から 2人を えらぶ えらび方は 何通り？`, a: String(v), choices: ch(r, v, S([n * (n - 1), n * 2, n + (n - 1), v + 1, v - 1, n * n, v + n]).filter(x => +x !== v), nf(r, v, { min: 2, max: 60 })) };
  };
  g.daihyou6 = (r) => {                                    // 代表値（平均・中央値・さいひん値）
    const k = r.int(3);
    if (k === 0) { const xs = r.shuffle([...new Set(Array.from({ length: 12 }, () => r.range(2, 30)))]).slice(0, r.pick([5, 7])); if (xs.length < 5) return g.daihyou6(r);
      const s = [...xs].sort((a, b) => a - b), m = s[(s.length - 1) / 2], others = xs.filter(x => x !== m);
      return { q: `${xs.join("、")}の 中央値は？`, a: String(m), ans: "choice4", choices: r.shuffle([String(m), ...r.shuffle(others).slice(0, 3).map(String)]) }; }
    if (k === 1) { const mode = r.range(2, 20), rest = [...new Set(Array.from({ length: 10 }, () => r.range(2, 20)))].filter(x => x !== mode).slice(0, 4); if (rest.length < 4) return g.daihyou6(r);
      const xs = r.shuffle([mode, mode, mode, ...rest.slice(0, 3), rest[3], rest[3]]);
      return { q: `${xs.join("、")}の さいひん値は？`, a: String(mode), ans: "choice4", choices: r.shuffle([String(mode), ...rest.slice(0, 3).map(String)]) }; }
    for (;;) { const xs = Array.from({ length: 5 }, () => r.range(2, 20)), s = xs.reduce((a, b) => a + b, 0); if (s % 5) continue; const m = s / 5, sorted = [...xs].sort((a, b) => a - b); if (sorted[2] === m || xs.includes(m)) continue;
      return { q: `${xs.join("、")}の 平均は？`, a: String(m), choices: ch(r, m, S([sorted[2], s, Math.max(...xs), Math.min(...xs), m + 1, m - 1]).filter(x => +x !== m), nf(r, m, { min: 2, max: 25 })) }; }
  };
  g.bunsuShosu6 = (r) => {                                 // 小数と分数のまじった計算
    for (;;) {
      const x = r.pick([2, 4, 5, 6, 8]), P = 1, d = r.pick([2, 3, 4, 5]), n = coprime(r, d), k = r.int(3);
      let A, q, w;
      if (k === 0) { const t = x * d + n * 10; A = fr(t, 10 * d); q = `0.${x} + ${n}/${d}`; w = [fr(x + n, 10 + d), fr(x + n * 10, d), fr(t + 1, 10 * d)]; }
      else if (k === 1) { const t = x * n; A = fr(t, 10 * d); q = `${n}/${d} × 0.${x}`; w = [fr(t, d), fr(t, 10 + d), fr(x * d, 10 * n)]; }
      else { const t = n * 10; A = fr(t, d * x); q = `${n}/${d} ÷ 0.${x}`; w = [fr(n * x, 10 * d), fr(d * x, 10 * n), fr(n, d * x)]; }
      if (!isFrac(A)) continue;
      return { q, a: A, ans: "frac", choices: ch(r, A, w.filter(v => isFrac(v) && v !== A), fracFb(A)) };
    }
  };
  g.tani6 = (r, p) => {                                    // いろいろな単位
    const T = [["1L", "cm³", 1000], ["1m³", "L", 1000], ["1m³", "cm³", 1000000], ["1kL", "L", 1000], ["1t", "kg", 1000], ["1km²", "m²", 1000000]], [u1, u2, f] = r.pick(T), x = r.range(2, 9), n = u1.replace(/^1/, ""), v = x * f;
    const w = [x * f * 10, x * f / 10, x * f * 100, x * f / 100, x * 100, x * 10000].filter(y => Number.isInteger(y) && y !== v);
    return { q: `${x}${n} = □${u2}`, a: v + u2, choices: ch(r, v + u2, w.map(y => y + u2), [x * f * 1000, x * f * 5].map(y => y + u2), { loose: true }) };
  };
  g.tan5 = (r) => {                                        // 単位量あたりの大きさ
    const k = r.int(3);
    if (k === 0) { const a = r.range(4, 12), c = r.range(2, 9), b = a * c;
      return { q: `たたみ ${a}まいの 部屋に ${b}人 います。 たたみ 1まいあたり 何人？`, a: String(c), choices: ch(r, c, S([a, b - a, c + 1, c - 1, c + 2]), nf(r, c, { min: 1, max: 12 })) }; }
    if (k === 1) { const a = r.range(3, 9), c = r.range(20, 90) , b = a * c; 
      return { q: `${a}m²の 畑で ${b}kgの いもが とれました。 1m²あたり 何kg？`, a: c + "kg", choices: ch(r, c + "kg", S([a, b - a, c + 10, c - 10, c + 5]).filter(x => +x > 0).map(x => x + "kg"), nf(r, c, { step: 5, min: 10, max: 120, fmt: x => x + "kg" })) }; }
    const a = r.range(2, 9), c = r.range(3, 12), n = r.range(3, 9), s = c * n;
    return { q: `1m²あたり ${c}人 いるとき、 ${n}m²では 何人？`, a: String(s), choices: ch(r, s, S([c + n, s + c, s - c, s + n, c]), nf(r, s, { min: 6, max: 120 })) };
  };
})(window.MH_GEN);
