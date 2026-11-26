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
      const a = r.range(p.minA || 11, p.maxA || 99), b = r.range(p.minB || 11, p.maxB || 99);
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
  g.yakubun5 = (r, p = {}) => {                                    // 約分
    for (;;) {
      const b0 = r.range(2, 9), a0 = coprime(r, b0), k = r.range(...(p.k || [2, 9])), a = a0 * k, b = b0 * k; if (b > (p.maxD || 72)) continue;
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

  /* ---------- 細分単元（5〜6年） ---------- */
  const sameVal = (x, y) => { const [a, b] = x.split("/").map(Number), [c, d] = y.split("/").map(Number); return a * (d || 1) === c * (b || 1); };
  const fracWrong = (A, xs) => xs.filter(x => isFrac(x) && !/^0\//.test(x) && !sameVal(x, A));
  g.detailDecMul5 = (r) => {                              // 小数第2位 × 小数第1位
    for (;;) {
      const a = r.range(11, 999), b = r.range(2, 99), s = a * b;
      if (!nz(a) || !nz(b) || !nz(s)) continue;
      const ok = x => x > 0 && nz(x);
      return { q: `${dec(a, 2)} × ${dec(b, 1)}`, a: dec(s, 3), hissan: { a: dec(a, 2), b: dec(b, 1), op: "×" }, choices: ch(r, dec(s, 3), [dec(s, 2), dec(s, 4), ...[s + 1, s - 1, s + 10, s - 10, s + 100].filter(ok).map(x => dec(x, 3))], nf(r, s, { min: 1, ok, fmt: x => dec(x, 3) }), { loose: true }) };
    }
  };
  /* 小数で わる（わりきれる）。kind='int' は 整数 ÷ 小数第1位、'hund' は 小数 ÷ 小数第2位。答えは 小数（整数のときも ある） */
  g.detailDecDiv5 = (r, p) => {
    for (let i = 0; i < 100000; i++) {
      let n, b, q, N, B;                                  // q は 商の 100倍
      if (p.kind === 'int') { b = r.range(2, 99); n = r.range(1, 99); if (!nz(b) || n * 1000 % b) continue; q = n * 1000 / b; N = String(n); B = dec(b, 1); }
      else { b = r.range(11, 999); const c = r.range(2, 99); if (!nz(b) || b * c % 10 || b * c / 10 > 9999) continue; n = b * c / 10; q = c * 10; N = dec(n, 2); B = dec(b, 2); }
      if (q < 10 || q > 9900) continue;
      const u = q % 100 === 0 ? 100 : q % 10 === 0 ? 10 : 1, A = dec(q, 2);
      const w = [q * 10, q % 10 === 0 ? q / 10 : null, q + u, q - u, q + 2 * u, q + 10 * u].filter(x => x && x > 0).map(x => dec(x, 2));
      return { q: `${N} ÷ ${B}`, a: A, ans: "dec", hissan: { a: N, b: B, op: "÷" }, choices: ch(r, A, w, nf(r, q, { step: u, min: 1, fmt: x => dec(x, 2) }), { loose: true }) };
    }
    throw Error('detailDecDiv5 candidate');
  };
  /* 通分：kind='multiple' は 一方の 分母が もう一方の 倍数、'coprime' は 分母が たがいに素。分母の 小さい 方を 大きい 分母に なおす */
  g.detailTsubun5 = (r, p) => {
    for (;;) {
      const b = r.range(2, 12), d = r.range(2, 12); if (b === d) continue;
      if (p.kind === 'multiple' ? !(d % b === 0 || b % d === 0) : gcd(b, d) !== 1) continue;
      const a = coprime(r, b), c = coprime(r, d), L = lcm(b, d);
      let [x, y] = p.kind === 'multiple' ? (b < d ? [a, b] : [c, d]) : (r.chance(0.5) ? [a, b] : [c, d]);
      const k = L / y, A = `${x * k}/${L}`;
      const w = fracWrong(A, [`${x}/${L}`, `${x + k}/${L}`, `${x * k + 1}/${L}`, `${x * k - 1}/${L}`, `${x * k}/${L * 2}`, `${x * y}/${L}`]);
      return { q: `${a}/${b}と ${c}/${d}を 通分すると、 ${x}/${y}は いくつに なる？`, a: A, ans: "frac", choices: ch(r, A, w, fracWrong(A, [`${x * k + 2}/${L}`, `${x * k + 3}/${L}`, `${x * k}/${L + 1}`, `${x * k + 1}/${L + 1}`])) };
    }
  };
  /* 分母が ちがう 分数の たし算・ひき算。reduce=答えで 約分が いる、max1=答えが 1より 小さい */
  g.detailFracAS5 = (r, p) => {
    for (let i = 0; i < 100000; i++) {
      let b = r.range(2, 12), d = r.range(2, 12); if (b === d) continue;
      let a = coprime(r, b), c = coprime(r, d); const sub = p.op === "−";
      if (sub && a * d <= c * b) { if (a * d === c * b) continue; [a, b, c, d] = [c, d, a, b]; }
      const L = lcm(b, d), n = sub ? a * L / b - c * L / d : a * L / b + c * L / d;
      if (n % L === 0 || (gcd(n, L) > 1) !== !!p.reduce || (p.max1 && n >= L)) continue;
      const A = fr(n, L);
      const w = fracWrong(A, [fr(sub ? a - c : a + c, sub ? Math.abs(b - d) || 1 : b + d), fr(sub ? Math.max(a - c, 1) : a + c, Math.max(b, d)), fr(n + 1, L), fr(n - 1, L), fr(n, b * d + 1), fr(a * c, b * d)]);
      return { q: `${a}/${b} ${sub ? "−" : "+"} ${c}/${d}`, a: A, choices: ch(r, A, w, fracWrong(A, fracFb(A))) };
    }
    throw Error('detailFracAS5 candidate');
  };
  /* 分数 × 整数・分数 ÷ 整数（分母2〜12、整数2〜9。答えは 約分した 分数） */
  g.detailFracInt = (r, p) => {
    for (;;) {
      const b = r.range(2, 12), a = coprime(r, b), z = r.range(2, 9), mul = p.op === "×";
      const A = mul ? fr(a * z, b) : fr(a, b * z); if (!isFrac(A)) continue;
      const w = mul ? [fr(a, b * z), fr(a * z, b * z), fr(a + z, b), fr(a * z + 1, b)] : [fr(a * z, b), fr(a, b + z), fr(a + z, b), fr(a + 1, b * z)];
      return { q: `${a}/${b} ${mul ? "×" : "÷"} ${z}`, a: A, choices: ch(r, A, fracWrong(A, w), fracWrong(A, fracFb(A))) };
    }
  };

  /* 分数の かけ算・わり算（6年）。op='×' cross=約分できる組だけ（false は 約分しない組だけ）／op='÷' mixed=わられる数が 帯分数 */
  g.detailFracMul6 = (r, p) => {
    for (let i = 0; i < 100000; i++) {
      const b = r.range(2, 12), d = r.range(2, 12), a = coprime(r, b), c = coprime(r, d);
      let A, q, w;
      if (p.op === "×") {
        if ((gcd(a, d) > 1 || gcd(c, b) > 1) !== !!p.cross) continue;
        A = fr(a * c, b * d); q = `${a}/${b} × ${c}/${d}`; w = [fr(a * d, b * c), fr(a + c, b + d), fr(a * c, b + d), fr(a * c + 1, b * d)];
      } else if (p.mixed) {
        const W = r.range(1, 3), t = W * b + a; A = fr(t * d, b * c); q = `${W}と${a}/${b} ÷ ${c}/${d}`; w = [fr(t * c, b * d), fr(W * b * d + a * d, b), fr((W + a) * d, b * c), fr(t * d + 1, b * c)];
      } else { A = fr(a * d, b * c); q = `${a}/${b} ÷ ${c}/${d}`; w = [fr(a * c, b * d), fr(b * c, a * d), fr(a + d, b + c), fr(a * d + 1, b * c)]; }
      if (!isFrac(A)) continue;
      return { q, a: A, ans: "frac", choices: ch(r, A, fracWrong(A, w), fracWrong(A, fracFb(A))) };
    }
    throw Error('detailFracMul6 candidate');
  };
  /* 小数（0.1〜2.9）と 分数（分母 2・4・5・10）の まじった 計算 */
  g.detailDecFrac6 = (r) => {
    for (;;) {
      const x = r.range(1, 29), d = r.pick([2, 4, 5, 10]), n = r.range(1, d - 1), op = r.pick(["+", "−", "×", "÷"]);
      if (!nz(x) || gcd(n, d) !== 1) continue;
      const X = dec(x, 1), Fq = `${n}/${d}`, decFirst = r.chance(0.5);
      let num, den;                                        // x/10 と n/d の 計算
      if (op === "+") { num = x * d + n * 10; den = 10 * d; }
      else if (op === "×") { num = x * n; den = 10 * d; }
      else if (op === "−") { num = decFirst ? x * d - n * 10 : n * 10 - x * d; den = 10 * d; if (num <= 0) continue; }
      else { num = decFirst ? x * d : n * 10; den = decFirst ? 10 * n : x * d; }
      const A = fr(num, den); if (!isFrac(A)) continue;
      const q = decFirst ? `${X} ${op} ${Fq}` : `${Fq} ${op} ${X}`;
      const w = [fr(num + 1, den), fr(num, den + 1), fr(x + n, 10 + d), fr(Math.max(1, num - 1), den), fr(den, num)];
      return { q, a: A, ans: "frac", choices: ch(r, A, fracWrong(A, w), fracWrong(A, fracFb(A))) };
    }
  };
  /* 速さの 文章題（5年）。kind='distance' は 道のり、'time' は かかる時間 */
  const SPEED = [["電車《でんしゃ》", "時速", "km", "時間", 40, 90, "何時間《なんじかん》"], ["バス", "時速", "km", "時間", 20, 60, "何時間《なんじかん》"], ["自転車《じてんしゃ》", "時速", "km", "時間", 10, 20, "何時間《なんじかん》"], ["姉《あね》", "分速", "m", "分", 50, 90, "何分《なんぷん》"], ["ドローン", "秒速《びょうそく》", "m", "秒《びょう》", 2, 30, "何秒《なんびょう》"]];
  g.detailSpeed = (r, p) => {
    const [who, S0, U0, T0, lo, hi, HT] = r.pick(SPEED), v = r.range(lo, hi), t = r.range(1, 9), s = v * t;
    if (p.kind === "distance") {
      const A = s + U0;
      return { q: `${who}が ${S0} ${v}${U0}で ${t}${T0} 進《すす》みました。 進《すす》んだ 道《みち》のりは 何${U0}？`, a: A, how: ["道のり ＝ 速さ × 時間。", `${v} × ${t} ＝ ${s}（${U0}）。`], choices: ch(r, A, S([v + t, s + v, s - v, s + 10, s - 10, s * 10]).filter(x => +x > 0).map(x => x + U0), nf(r, s, { step: 1, min: 1, fmt: x => x + U0 }), { loose: true }) };
    }
    return { q: `${who}が ${S0} ${v}${U0}で ${s}${U0} 進《すす》むと、 ${HT} かかる？`, a: String(t), how: ["時間 ＝ 道のり ÷ 速さ。", `${s} ÷ ${v} ＝ ${t}（${T0}）。`], choices: ch(r, t, S([t + 1, t - 1, t + 2, t - 2, v, s - v]).filter(x => +x > 0), nf(r, t, { min: 1, max: 12 }), { loose: true }) };
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
  g.hiKantan6 = (r, p = {}) => {                                   // 比をかんたんに／比の値
    for (;;) {
      const k = r.range(...(p.k || [2, 9])), a0 = r.range(1, 9), b0 = r.range(1, 9); if (a0 === b0 || gcd(a0, b0) !== 1) continue;
      const a = a0 * k, b = b0 * k;
      if (p.simplify || r.chance(0.6)) { const A = `${a0}:${b0}`; return { q: `${a}:${b}を いちばん かんたんな 整数の 比に すると？`, a: A, ans: "choice4", choices: ch(r, A, [`${b0}:${a0}`, `${a0}:${b}`, `${a}:${b0}`, `${a0 + 1}:${b0}`, `${a0}:${b0 + 1}`], [`${a0 + 2}:${b0}`, `${a0}:${b0 + 2}`, `${a0 + 1}:${b0 + 1}`], { loose: true }) }; }
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
  /* ===== 5・6年の だんかい分け（2026-11-26）。どの型も how:[行] を返す（その 問題の 数で 出る「ときかた」） ===== */
  const W = (r, v, u, wrongs, how, o) => { const A = v + u; return { a: A, how, choices: ch(r, A, wrongs.filter(x => x != null && isFinite(x) && x > 0 && x !== v).map(x => x + u), nf(r, v, Object.assign({ min: 1, fmt: x => x + u }, o || {})), { loose: true }) }; };
  const WS = (r, A, wrongs, fb) => ({ a: A, choices: ch(r, A, wrongs.filter(x => x && x !== A), fb || [], { loose: true }) });
  const pd = p => String(p / 100);
  g.wari5 = (r, p) => {                                    // わりあい：わりあい／くらべる量／もとにする量／百分率と 小数
    if (p.kind === "wariai") {
      const a = r.pick([20, 40, 50, 60, 80, 100, 200]), t = r.pick([0.2, 0.25, 0.4, 0.5, 0.6, 0.75, 0.8, 1.2, 1.5]), b = a * t;
      if (!Number.isInteger(b)) return g.wari5(r, p);
      const T = [`定員 ${a}人の バスに ${b}人 乗っています。定員を もとに した 乗っている 人数の わりあいは？`, `シュートを ${a}回 して、${b}回 入りました。シュートした 回数を もとに した 入った 回数の わりあいは？`, `${a}ページの 本のうち ${b}ページ 読みました。本の ページ数を もとに した 読んだ ページ数の わりあいは？`];
      const q = t > 1 ? T[0] : r.pick(T), A = String(t);
      return Object.assign({ q, how: ["わりあい ＝ くらべる量 ÷ もとにする量。", `くらべる量は ${b}、もとにする量は ${a}。`, `${b} ÷ ${a} ＝ ${A}。`] },
        WS(r, A, [String(+(a / b).toFixed(2)), String(Math.round(t * 100)), String(+(t / 10).toFixed(3)), String(+Math.abs(1 - t).toFixed(2)) || "0.1", String(+(t + 0.1).toFixed(2))], ["0.3", "0.45", "0.9", "1.1"]));
    }
    if (p.kind === "kuraberu") {
      const a = r.pick([200, 300, 400, 500, 600, 800, 1200]), pc = r.pick([10, 15, 20, 25, 30, 40, 60, 75]), v = a * pc / 100;
      if (!Number.isInteger(v)) return g.wari5(r, p);
      const [t, u] = r.pick([["円", "円"], ["人", "人"], ["mL", "mL"], ["g", "g"]]);
      return Object.assign({ q: `${a}${t}の ${pc}%は 何${u}？` }, W(r, v, u, [a * pc, a / pc, a - v, v * 10, v + 10, Math.round(a / pc * 10)], ["くらべる量 ＝ もとにする量 × わりあい。", `${pc}% は 小数で ${pd(pc)}。`, `${a} × ${pd(pc)} ＝ ${v}。`], { step: 5, max: 2000 }));
    }
    if (p.kind === "moto") {
      const v = r.pick([200, 300, 400, 500, 800]), pc = r.pick([20, 25, 40, 50, 60, 75, 80]), b = v * pc / 100;
      const [q, u] = r.pick([[`ある日の 入場者の ${pc}%に あたる ${b}人が 子どもでした。入場者は 全部で 何人？`, "人"], [`本の ${pc}%に あたる ${b}ページを 読みました。本は 全部で 何ページ？`, "ページ"], [`ちょ金の ${pc}%に あたる ${b}円を 使いました。はじめの ちょ金は 何円？`, "円"]]);
      return Object.assign({ q }, W(r, v, u, [b * pc / 100, b * 2, b + pc, Math.round(b * (100 - pc) / 100), v + 100, v - 100], ["もとにする量 ＝ くらべる量 ÷ わりあい。", `${pc}% は 小数で ${pd(pc)}。`, `${b} ÷ ${pd(pc)} ＝ ${v}。`], { step: 50, max: 2000 }));
    }
    const k = r.int(4);
    if (k === 0) { const x = r.pick([5, 12, 35, 48, 60, 75, 8, 90]), D = pd(x), A = x + "%";
      return Object.assign({ q: `${D}を 百分率で 表すと？`, how: ["小数で 表した わりあいを 100倍すると 百分率。", `${D} × 100 ＝ ${x}、だから ${A}。`] }, WS(r, A, [x / 10 + "%", x * 10 + "%", D + "%", (x + 10) + "%", (x > 10 ? x - 5 : x + 5) + "%"])); }
    if (k === 1) { const x = r.pick([3, 7, 15, 24, 40, 65, 80, 9]), D = pd(x);
      return Object.assign({ q: `${x}%を 小数で 表すと？`, how: ["百分率を 100で わると 小数の わりあい。", `${x} ÷ 100 ＝ ${D}。`] }, WS(r, D, [String(x / 10), String(x / 1000), String(x), pd(x + 10), pd(x * 10 > 99 ? x + 5 : x * 10)])); }
    if (k === 2) { const x = r.pick([1.2, 1.5, 2, 1.05, 1.8]), A = Math.round(x * 100) + "%";
      return Object.assign({ q: `${x}を 百分率で 表すと？`, how: ["1 が 100%。小数を 100倍すると 百分率。", `${x} × 100 ＝ ${Math.round(x * 100)}、だから ${A}。`] }, WS(r, A, [Math.round(x * 10) + "%", x + "%", Math.round(x * 1000) + "%", Math.round(x * 100 + 10) + "%"])); }
    const x = r.range(1, 9), A = `${x}わり`;
    return Object.assign({ q: `0.${x}を 歩合で 表すと？`, how: ["小数の 0.1 が 1わり。", `0.${x} は 0.1 が ${x}こ分で ${A}。`] }, WS(r, A, [`${x}分`, `${x * 10}わり`, `${x}りん`, `${x + 1}わり`, `${10 - x}わり`]));
  };
  g.heikin5d = (r, p) => {                                 // 平均：求める／合計／あと何点
    if (p.kind === "goukei") { const n = r.range(3, 8), m = r.range(12, 19) * 5, v = n * m;
      return Object.assign({ q: `${n}回の テストの 平均は ${m}点でした。${n}回の 合計は 何点？` }, W(r, v, "点", [m + n, Math.round(m / n), v + m, v - m, v + 10], ["合計 ＝ 平均 × 回数。", `${m} × ${n} ＝ ${v}。`], { step: 5, max: 900 })); }
    if (p.kind === "nokori") {
      for (;;) { const m = r.range(14, 18) * 5, xs = [r.range(12, 19) * 5, r.range(12, 19) * 5, r.range(12, 19) * 5], s3 = xs[0] + xs[1] + xs[2], x = 4 * m - s3; if (x < 40 || x > 100) continue;
        return Object.assign({ q: `3回の テストは ${xs.join("点、")}点でした。4回の 平均を ${m}点に するには、4回めに 何点 とれば よい？` }, W(r, x, "点", [m, 4 * m, s3, x + 5, x - 5, Math.round(s3 / 3)], ["4回の 合計を 先に 求める。", `${m} × 4 ＝ ${4 * m}。`, `${4 * m} − （${xs.join(" ＋ ")}）＝ ${4 * m} − ${s3} ＝ ${x}。`], { step: 5, max: 100 })); }
    }
    for (;;) {
      const n = r.range(3, 5), xs = Array.from({ length: n }, () => r.range(2, 20)), t = xs.reduce((a, b) => a + b, 0);
      if (t % n || xs.includes(t / n)) continue;
      const m = t / n, [u, w] = r.pick([["さつ", "1週間に 読んだ 本"], ["こ", "1日に とれた たまご"], ["m", "ボール投げの きろく"]]);
      return Object.assign({ q: `${w}は ${xs.join(u + "、")}${u}でした。平均は 何${u}？` }, W(r, m, u, [t, Math.max(...xs), Math.min(...xs), Math.round(t / (n - 1)), m + 1], ["平均 ＝ 合計 ÷ 個数。", `合計は ${xs.join(" ＋ ")} ＝ ${t}。`, `${t} ÷ ${n} ＝ ${m}。`], { max: 30 }));
    }
  };
  g.taiseki5d = (r, p) => {                                // 体積：直方体／立方体／単位／組み合わせ
    if (p.kind === "chokuhou") { const a = r.range(2, 9), b = r.range(2, 9), c = r.range(2, 9), v = a * b * c, u = r.chance(0.3) ? "m" : "cm";
      return Object.assign({ q: `たて ${a}${u}、よこ ${b}${u}、高さ ${c}${u}の 直方体の 体積は？` }, W(r, v, u + "³", [a + b + c, a * b, 2 * (a * b + b * c + a * c), v + a, v - c], ["直方体の 体積 ＝ たて × よこ × 高さ。", `${a} × ${b} × ${c} ＝ ${v}（${u}³）。`], { max: 800 })); }
    if (p.kind === "rippou") { const a = r.range(2, 10), v = a ** 3;
      return Object.assign({ q: `1辺が ${a}cmの 立方体の 体積は？` }, W(r, v, "cm³", [a * a, a * 3, a * a * 6, v + a, a * a * 2], ["立方体の 体積 ＝ 1辺 × 1辺 × 1辺。", `${a} × ${a} × ${a} ＝ ${v}（cm³）。`], { max: 1100 })); }
    if (p.kind === "tani") {
      const k = r.int(4), x = r.range(2, 9);
      if (k === 0) return Object.assign({ q: `${x}L ＝ □cm³` }, W(r, x * 1000, "cm³", [x * 100, x * 10, x * 10000], ["1L は 1辺 10cmの 立方体の 体積。", `1L ＝ 1000cm³ だから ${x}L ＝ ${x * 1000}cm³。`], { step: 1000, max: 20000 }));
      if (k === 1) return Object.assign({ q: `${x}m³ ＝ □L` }, W(r, x * 1000, "L", [x * 100, x * 10, x * 1000000], ["1m³ ＝ 1000L。", `${x}m³ ＝ ${x * 1000}L。`], { step: 1000, max: 20000 }));
      if (k === 2) return Object.assign({ q: `${x * 1000}cm³ ＝ □L` }, W(r, x, "L", [x * 10, x * 100, x * 1000], ["1000cm³ で 1L。", `${x * 1000}cm³ は 1000cm³ が ${x}こ分で ${x}L。`], { max: 20 }));
      return Object.assign({ q: `${x}m³ ＝ □cm³` }, W(r, x * 1000000, "cm³", [x * 1000, x * 100, x * 10000, x * 100000], ["1m³ は 1辺 100cmの 立方体。", `100 × 100 × 100 ＝ 1000000 だから ${x}m³ ＝ ${x * 1000000}cm³。`], { step: 1000000, max: 20000000 }));
    }
    for (;;) { const a = r.range(2, 8), b = r.range(5, 10), c = r.range(4, 9), d = r.range(2, b - 2), e = r.range(1, c - 2), big = a * b * c, cut = a * d * e, v = big - cut;
      return Object.assign({ q: `たて ${a}cm、よこ ${b}cm、高さ ${c}cmの 直方体から、たて ${a}cm、よこ ${d}cm、高さ ${e}cmの 直方体を 切りとった 形の 体積は？` }, W(r, v, "cm³", [big, cut, big + cut, v + a, a * (b - d) * (c - e)], ["大きい 直方体の 体積から、切りとった 部分の 体積を ひく。", `${a} × ${b} × ${c} ＝ ${big}、${a} × ${d} × ${e} ＝ ${cut}。`, `${big} − ${cut} ＝ ${v}（cm³）。`], { max: 800 })); }
  };
  g.kaku5d = (r, p) => {                                   // 図形の角：三角形／四角形／多角形
    if (p.kind === "sankaku") {
      if (r.chance(0.35)) { const x = r.range(4, 16) * 10, v = (180 - x) / 2;
        return Object.assign({ q: `二等辺三角形で、等しく ない 角が ${x}度の とき、のこりの 1つの 角は？` }, W(r, v, "度", [180 - x, x, 90 - x / 2 + 10, v + 10, v - 5], ["三角形の 3つの 角の 和は 180度。", `180 − ${x} ＝ ${180 - x}、二等辺三角形の 2つの 角は 等しいので ÷ 2。`, `${180 - x} ÷ 2 ＝ ${v}（度）。`], { step: 5, max: 180 })); }
      const a = r.range(3, 15) * 5, b = r.range(3, 15) * 5, v = 180 - a - b; if (v <= 0) return g.kaku5d(r, p);
      return Object.assign({ q: `三角形の 2つの 角が ${a}度と ${b}度の とき、のこりの 角は？` }, W(r, v, "度", [a + b, 360 - a - b, 180 - a, v + 10, v - 10], ["三角形の 3つの 角の 和は 180度。", `180 − ${a} − ${b} ＝ ${v}（度）。`], { step: 5, max: 180 }));
    }
    if (p.kind === "shikaku") {
      if (r.chance(0.35)) { const a = r.range(7, 16) * 5, v = 180 - a;
        return Object.assign({ q: `平行四辺形の 1つの 角が ${a}度の とき、となりの 角は？` }, W(r, v, "度", [a, 360 - a, 90 - a > 0 ? 90 - a : 90 + a, v + 10, v - 10], ["平行四辺形の となりあう 角の 和は 180度。", `180 − ${a} ＝ ${v}（度）。`], { step: 5, max: 360 })); }
      const a = r.range(12, 24) * 5, b = r.range(12, 24) * 5, c = r.range(8, 20) * 5, v = 360 - a - b - c; if (v <= 0) return g.kaku5d(r, p);
      return Object.assign({ q: `四角形の 3つの 角が ${a}度、${b}度、${c}度の とき、のこりの 角は？` }, W(r, v, "度", [a + b + c, 180 - a - b - c, v + 10, v - 10, 360 - a - b], ["四角形の 4つの 角の 和は 360度（三角形 2つ分）。", `360 − ${a} − ${b} − ${c} ＝ ${v}（度）。`], { step: 5, max: 360 }));
    }
    if (r.chance(0.5)) { const n = r.range(5, 10), v = (n - 2) * 180;
      return Object.assign({ q: `${n}角形の 角の 大きさの 和は？` }, W(r, v, "度", [n * 180, (n - 1) * 180, (n - 3) * 180, (n - 2) * 360], [`${n}角形は 1つの ちょう点から 対角線を ひくと 三角形 ${n - 2}こに 分けられる。`, `180 × ${n - 2} ＝ ${v}（度）。`], { step: 180, max: 2000 })); }
    const n = r.pick([5, 6, 8, 9, 10, 12]), t = (n - 2) * 180, v = t / n;
    return Object.assign({ q: `正${n}角形の 1つの 角の 大きさは？` }, W(r, v, "度", [t, 360 / n, v + 10, v - 10, 180 / n], [`${n}角形の 角の 和は 180 × ${n - 2} ＝ ${t}（度）。`, `正${n}角形は ${n}つの 角が 等しいので ${t} ÷ ${n} ＝ ${v}（度）。`], { step: 6, max: 180 }));
  };
  g.menseki5d = (r, p) => {                                // 面積：平行四辺形／三角形／台形／ひし形
    if (p.kind === "para") { const b = r.range(3, 20), h = r.range(2, 15), v = b * h;
      return Object.assign({ q: `底辺 ${b}cm、高さ ${h}cmの 平行四辺形の 面積は？` }, W(r, v, "cm²", [v / 2, 2 * (b + h), b + h, v + b], ["平行四辺形の 面積 ＝ 底辺 × 高さ。", `${b} × ${h} ＝ ${v}（cm²）。`], { max: 400 })); }
    if (p.kind === "tri") { let b, h; do { b = r.range(3, 20); h = r.range(2, 15); } while ((b * h) % 2); const v = b * h / 2;
      return Object.assign({ q: `底辺 ${b}cm、高さ ${h}cmの 三角形の 面積は？` }, W(r, v, "cm²", [b * h, b + h, v + b, v * 4], ["三角形の 面積 ＝ 底辺 × 高さ ÷ 2。", `${b} × ${h} ÷ 2 ＝ ${v}（cm²）。`], { max: 400 })); }
    if (p.kind === "trap") { let u, l, h; do { u = r.range(2, 10); l = r.range(u + 1, 16); h = r.range(2, 12); } while (((u + l) * h) % 2); const v = (u + l) * h / 2;
      return Object.assign({ q: `上底 ${u}cm、下底 ${l}cm、高さ ${h}cmの 台形の 面積は？` }, W(r, v, "cm²", [(u + l) * h, l * h, u * h, v + h, (u + l) / 2], ["台形の 面積 ＝ （上底 ＋ 下底）× 高さ ÷ 2。", `（${u} ＋ ${l}）× ${h} ÷ 2 ＝ ${v}（cm²）。`], { max: 400 })); }
    let a, b; do { a = r.range(3, 20); b = r.range(3, 20); } while ((a * b) % 2); const v = a * b / 2;
    return Object.assign({ q: `対角線が ${a}cmと ${b}cmの ひし形の 面積は？` }, W(r, v, "cm²", [a * b, a + b, 2 * (a + b), v + a], ["ひし形の 面積 ＝ 対角線 × 対角線 ÷ 2。", `${a} × ${b} ÷ 2 ＝ ${v}（cm²）。`], { max: 400 }));
  };
  g.enshu5d = (r, p) => {                                  // 円周：円周を 求める／直径を 求める
    for (;;) {
      const d = r.range(2, 30); if (d % 10 === 0) continue;
      if (p.kind === "motomeru") { const useR = r.chance(0.4) && d % 2 === 0, base = useR ? d / 2 : d, A = dec(d * 314, 2) + "cm";
        return Object.assign({ q: `${useR ? "半径" : "直径"} ${base}cmの 円の 円周は？（円周率は 3.14）`, how: ["円周 ＝ 直径 × 3.14。", ...(useR ? [`直径は 半径の 2倍で ${d}cm。`] : []), `${d} × 3.14 ＝ ${dec(d * 314, 2)}（cm）。`] },
          WS(r, A, [dec(base * 314, 2), dec(d * 628, 2), dec(d * 314 * 10, 2), dec(d * 314 + 100, 2), dec(d * d * 314, 2)].map(x => x + "cm"), nf(r, d * 314, { step: 10, min: 100, fmt: x => dec(x, 2) + "cm" }))); }
      const e = d * 314, half = r.chance(0.3) && d % 2 === 0, v = half ? d / 2 : d;
      return Object.assign({ q: `円周が ${dec(e, 2)}cmの 円の ${half ? "半径" : "直径"}は？（円周率は 3.14）` }, W(r, v, "cm", [half ? d : d / 2, d * 2, v + 1, v - 1, v + 2], ["直径 ＝ 円周 ÷ 3.14。", `${dec(e, 2)} ÷ 3.14 ＝ ${d}（cm）。`, ...(half ? [`半径は その 半分で ${d / 2}cm。`] : [])], { max: 60 }));
    }
  };
  g.guusu5 = (r) => {                                      // ぐう数と き数
    const even = r.chance(0.5), xs = new Set();
    const one = () => { let n; do { n = r.range(10, 199); } while ((n % 2 === 0) !== even); return n; };
    const ans = one(); while (xs.size < 3) { let n; do { n = r.range(10, 199); } while ((n % 2 === 0) === even); xs.add(n); }
    return { q: `つぎの うち ${even ? "ぐう数" : "き数"}は どれ？`, a: String(ans), ans: "choice4", choices: r.shuffle([String(ans), ...[...xs].map(String)]),
      how: ["2で わりきれる 整数が ぐう数、わりきれない 整数が き数。", "一の位が 0・2・4・6・8 なら ぐう数、1・3・5・7・9 なら き数。", `${ans}の 一の位は ${ans % 10} だから ${even ? "ぐう数" : "き数"}。`] };
  };
  g.bunshou5 = (r, p) => {                                 // 分数と 小数：わり算の 商／分数を 小数に／小数を 分数に
    if (p.kind === "shou") {
      for (;;) { const b = r.range(2, 9), a = r.range(1, 15); if (a % b === 0) continue; const A = fr(a, b); if (!isFrac(A)) continue;
        const red = A !== `${a}/${b}`;
        return { q: `${a} ÷ ${b}の 商を 分数で 表すと？`, a: A, ans: "frac", how: ["わり算の 商は、わられる数を 分子、わる数を 分母に した 分数で 表せる。", `${a} ÷ ${b} ＝ ${a}/${b}${red ? `、約分して ${A}` : ""}。`],
          choices: ch(r, A, [fr(b, a), fr(a, b + 1), fr(a + 1, b), fr(a, a + b)].filter(x => isFrac(x) && x !== A), fracFb(A)) }; }
    }
    if (p.kind === "toshosu") {
      const T = [[2, 1], [4, 3], [5, 2], [5, 3], [5, 4], [8, 3], [8, 5], [20, 7], [25, 6], [4, 1], [10, 7], [8, 7]], [d, n] = r.pick(T), P = d === 8 ? 3 : (d === 2 || d === 5 || d === 10 ? 1 : 2), sc = Math.round(n / d * 10 ** P), A = dec(sc, P);
      return { q: `${n}/${d}を 小数で 表すと？`, a: A, how: ["分数は 分子 ÷ 分母 で 小数に できる。", `${n} ÷ ${d} ＝ ${A}。`],
        choices: ch(r, A, [`0.${n}${d}`, `${n}.${d}`, dec(Math.round(d / n * 10 ** P), P), dec(sc * 10, P), dec(sc + 5, P)].filter(x => x !== A), nf(r, sc, { step: P === 1 ? 1 : 5, min: 1, fmt: x => dec(x, P) })) };
    }
    for (;;) {
      const x = r.pick([15, 25, 35, 45, 55, 65, 75, 85, 12, 24, 36, 48, 4, 8, 6, 2, 5]), P = x < 10 ? 1 : 2, d = 10 ** P, A = fr(x, d); if (!isFrac(A) || x % 10 === 0) continue;
      return { q: `${dec(x, P)}を 分数で 表し、約分すると？`, a: A, ans: "frac", how: [`${dec(x, P)} は ${P === 1 ? "0.1" : "0.01"} が ${x}こ分で ${x}/${d}。`, `約分して ${A}。`],
        choices: ch(r, A, [fr(x, d * 10), fr(d, x), fr(x + 1, d), fr(x, d + 10)].filter(v => isFrac(v) && v !== A), fracFb(A)) };
    }
  };
  g.hayasa6d = (r, p) => {                                 // 速さ：速さを 求める／時速・分速・秒速
    if (p.kind === "motomeru") {
      const [who, S0, U0, T0, lo, hi] = r.pick(SPEED), v = r.range(lo, hi), t = r.range(2, 9), s = v * t;
      return Object.assign({ q: `${who}が ${s}${U0}を ${t}${T0}で 進みました。${S0} 何${U0}？` }, W(r, v, U0, [s * t, s - t, v + t, v + 10, v - 5], ["速さ ＝ 道のり ÷ 時間。", `${s} ÷ ${t} ＝ ${v}。`, `${S0} ${v}${U0}。`], { max: 200 }));
    }
    const k = r.int(3);
    if (k === 0) { const v = r.pick([6, 12, 18, 24, 30, 36, 42, 48, 54, 60, 72]), m = v * 1000 / 60;
      return Object.assign({ q: `時速 ${v}kmは 分速 何m？` }, W(r, m, "m", [v * 60, v * 1000, m * 10, Math.round(m / 10)], [`${v}km ＝ ${v * 1000}m。1時間 ＝ 60分。`, `${v * 1000} ÷ 60 ＝ ${m}、分速 ${m}m。`], { step: 100, max: 2000 })); }
    if (k === 1) { const m = r.range(1, 20) * 50, v = m * 60 / 1000; if (!Number.isInteger(v)) return g.hayasa6d(r, p);
      return Object.assign({ q: `分速 ${m}mは 時速 何km？` }, W(r, v, "km", [m * 60, m / 10, v * 10, v + 6], ["1時間 ＝ 60分。", `${m} × 60 ＝ ${m * 60}m、${m * 60}m ＝ ${v}km。`], { max: 100 })); }
    const x = r.range(2, 15), m = x * 60;
    return Object.assign({ q: `秒速 ${x}mは 分速 何m？` }, W(r, m, "m", [x * 10, x * 100, x * 3600, m + 60], ["1分 ＝ 60秒。", `${x} × 60 ＝ ${m}、分速 ${m}m。`], { step: 60, max: 1000 }));
  };
  g.moji6d = (r, p) => {                                   // 文字と式：あてはめる／xを 求める（＋−・×÷）／式に 表す
    if (p.kind === "atai") { const a = r.range(2, 9), b = r.range(1, 20), x = r.range(2, 12), v = a * x + b;
      return Object.assign({ q: `x ＝ ${x}の とき、${a} × x ＋ ${b}の 値は？` }, W(r, v, "", [a * (x + b), a + x + b, a * x - b, v + a, v - a], ["x の ところに 数を 入れて 計算する。", `${a} × ${x} ＋ ${b} ＝ ${a * x} ＋ ${b} ＝ ${v}。`], { max: 150 })); }
    if (p.kind === "xadd") { const b = r.range(2, 30), x = r.range(2, 40), plus = r.chance(0.5), c = plus ? x + b : x - b;
      if (c <= 0) return g.moji6d(r, p);
      return Object.assign({ q: `x ${plus ? "＋" : "−"} ${b} ＝ ${c}の とき、x の 値は？` }, W(r, x, "", [plus ? c + b : Math.abs(c - b) || 1, b, c, x + 1, x - 1], [plus ? "x は「ひき算」で もとめる。" : "x は「たし算」で もとめる。", `x ＝ ${c} ${plus ? "−" : "＋"} ${b} ＝ ${x}。`], { max: 80 })); }
    if (p.kind === "xmul") { const a = r.range(2, 9), x = r.range(2, 12), mul = r.chance(0.5);
      if (mul) return Object.assign({ q: `${a} × x ＝ ${a * x}の とき、x の 値は？` }, W(r, x, "", [a * x - a, a, a * x + a, x + 1, x - 1], ["x は「わり算」で もとめる。", `x ＝ ${a * x} ÷ ${a} ＝ ${x}。`], { max: 100 }));
      return Object.assign({ q: `x ÷ ${a} ＝ ${x}の とき、x の 値は？` }, W(r, a * x, "", [x, a + x, a * x + a, a * x - a, x - a > 0 ? x - a : 1], ["x は「かけ算」で もとめる。", `x ＝ ${x} × ${a} ＝ ${a * x}。`], { max: 120 }));
    }
    const n = r.range(3, 9), F = [`x ＋ ${n}`, `x − ${n}`, `x × ${n}`, `x ÷ ${n}`];
    const T = [[`1こ x円の パンを ${n}こ 買った ときの 代金`, 2, "1この ねだん × こ数 ＝ 代金"], [`x円 持っていて、${n}円 使った ときの のこりの お金`, 1, "持っていた お金 − 使った お金 ＝ のこり"],
      [`x本の えんぴつを ${n}人で 同じ数ずつ 分けた ときの 1人ぶん`, 3, "全部の 数 ÷ 人数 ＝ 1人ぶん"], [`x才の 妹より ${n}才 年上の 姉の 年れい`, 0, "妹の 年れい ＋ ちがい ＝ 姉の 年れい"],
      [`たて x cm、よこ ${n}cmの 長方形の 面積`, 2, "たて × よこ ＝ 長方形の 面積"], [`x mの テープから ${n}m 切りとった のこりの 長さ`, 1, "はじめの 長さ − 切りとった 長さ ＝ のこり"]];
    const [q, i, w] = r.pick(T);
    return { q: `${q}を 式に 表すと？`, a: F[i], ans: "choice4", choices: r.shuffle(F.slice()), how: [`言葉の 式で 考える：${w}。`, `だから ${F[i]}。`] };
  };
  g.hirei6d = (r, p) => {                                  // 比例と 反比例：yを 求める／きまった数
    if (p.kind === "hy" || p.kind === "hk") {
      const k = r.range(2, 9), x1 = r.range(2, 6), x2 = r.range(x1 + 1, 12), y1 = k * x1, y2 = k * x2;
      if (p.kind === "hk") return Object.assign({ q: `y は x に 比例します。x ＝ ${x1}の とき y ＝ ${y1}です。y ＝ きまった数 × x の、きまった数は？` }, W(r, k, "", [y1 - x1, y1 + x1, y1 * x1, k + 1, k - 1], ["比例の 式は y ＝ きまった数 × x。", `きまった数 ＝ y ÷ x ＝ ${y1} ÷ ${x1} ＝ ${k}。`], { max: 60 }));
      return Object.assign({ q: `y は x に 比例します。x ＝ ${x1}の とき y ＝ ${y1}です。x ＝ ${x2}の とき、y は？` }, W(r, y2, "", [y1 + (x2 - x1), y2 + k, y2 - k, x2 + k, y1 * x1], ["比例では x が □倍に なると y も □倍に なる。", `きまった数は ${y1} ÷ ${x1} ＝ ${k}、y ＝ ${k} × x。`, `y ＝ ${k} × ${x2} ＝ ${y2}。`], { max: 120 }));
    }
    const k = r.pick([12, 18, 24, 36, 48, 60]), ds = []; for (let i = 2; i <= 12; i++) if (k % i === 0 && k / i >= 2) ds.push(i);
    const x1 = r.pick(ds); let x2; do { x2 = r.pick(ds); } while (x2 === x1);
    const y1 = k / x1, y2 = k / x2;
    if (p.kind === "ak") return Object.assign({ q: `y は x に 反比例します。x ＝ ${x1}の とき y ＝ ${y1}です。x × y の きまった数は？` }, W(r, k, "", [x1 + y1, y1 - x1 > 0 ? y1 - x1 : x1 - y1 || 1, k + x1, k / 2, k * 2], ["反比例では x × y が いつも 同じ 数に なる。", `${x1} × ${y1} ＝ ${k}。`], { max: 120 }));
    return Object.assign({ q: `y は x に 反比例します。x ＝ ${x1}の とき y ＝ ${y1}です。x ＝ ${x2}の とき、y は？` }, W(r, y2, "", [y1 + (x2 - x1), y1 * x2, k, y2 + 1, y2 - 1], ["反比例では x × y が いつも 同じ。", `${x1} × ${y1} ＝ ${k}。`, `y ＝ ${k} ÷ ${x2} ＝ ${y2}。`], { max: 60 }));
  };
  g.enMen6d = (r, p) => {                                  // 円の 面積：半径から／直径から／半円・4分の1
    for (;;) {
      const rd = r.range(2, 15); if (rd % 10 === 0) continue;
      const S = rd * rd * 314, L1 = "円の 面積 ＝ 半径 × 半径 × 3.14。";
      if (p.kind === "hankei") return Object.assign({ q: `半径 ${rd}cmの 円の 面積は？（円周率は 3.14）`, how: [L1, `${rd} × ${rd} × 3.14 ＝ ${dec(S, 2)}（cm²）。`] },
        WS(r, dec(S, 2) + "cm²", [dec(rd * 628, 2), dec(rd * 314, 2), dec(S * 4, 2), dec(S + 314, 2), dec(S * 2, 2)].map(x => x + "cm²"), nf(r, S, { step: 10, min: 100, fmt: x => dec(x, 2) + "cm²" })));
      if (p.kind === "chokkei") return Object.assign({ q: `直径 ${rd * 2}cmの 円の 面積は？（円周率は 3.14）`, how: [L1, `半径は 直径の 半分で ${rd}cm。`, `${rd} × ${rd} × 3.14 ＝ ${dec(S, 2)}（cm²）。`] },
        WS(r, dec(S, 2) + "cm²", [dec(S * 4, 2), dec(rd * 2 * 314, 2), dec(rd * 4 * 314, 2), dec(S + 314, 2), dec(S * 2, 2)].map(x => x + "cm²"), nf(r, S, { step: 10, min: 100, fmt: x => dec(x, 2) + "cm²" })));
      const quarter = r.chance(0.5) && rd % 2 === 0, v = quarter ? S / 4 : S / 2;
      return Object.assign({ q: `半径 ${rd}cmの ${quarter ? "円を 4等分した 1つ分（おうぎ形）" : "半円"}の 面積は？（円周率は 3.14）`, how: [L1, `円 全体は ${rd} × ${rd} × 3.14 ＝ ${dec(S, 2)}（cm²）。`, `${quarter ? "4" : "2"}で わって ${dec(v, 2)}（cm²）。`] },
        WS(r, dec(v, 2) + "cm²", [dec(S, 2), dec(quarter ? S / 2 : S / 4, 2), dec(v * 2 + 314, 2), dec(v + 314, 2), dec(v + 157, 2)].filter(x => !/\.\d{3}/.test(x)).map(x => x + "cm²"), nf(r, v, { step: 10, min: 10, fmt: x => dec(x, 2) + "cm²" })));
    }
  };
  g.chuutai6d = (r, p) => {                                // 柱の 体積：角柱／円柱
    if (p.kind === "kaku") {
      if (r.chance(0.5)) { let b, h; do { b = r.range(3, 12); h = r.range(2, 10); } while ((b * h) % 2); const H = r.range(3, 12), base = b * h / 2, v = base * H;
        return Object.assign({ q: `底面が 底辺 ${b}cm・高さ ${h}cmの 三角形で、高さが ${H}cmの 三角柱の 体積は？` }, W(r, v, "cm³", [b * h * H, base + H, base, v + base, b + h + H], ["角柱の 体積 ＝ 底面積 × 高さ。", `底面積は ${b} × ${h} ÷ 2 ＝ ${base}（cm²）。`, `${base} × ${H} ＝ ${v}（cm³）。`], { max: 800 })); }
      const s = r.range(4, 30), H = r.range(2, 15), v = s * H;
      return Object.assign({ q: `底面積が ${s}cm²、高さが ${H}cmの 四角柱の 体積は？` }, W(r, v, "cm³", [s + H, v / 2, v + s, 2 * (s + H)], ["角柱の 体積 ＝ 底面積 × 高さ。", `${s} × ${H} ＝ ${v}（cm³）。`], { max: 500 }));
    }
    const rd = r.range(2, 9), H = r.range(2, 10), base = rd * rd * 314, v = base * H, useD = r.chance(0.35);
    return Object.assign({ q: `底面の ${useD ? "直径" : "半径"}が ${useD ? rd * 2 : rd}cm、高さが ${H}cmの 円柱の 体積は？（円周率は 3.14）`, how: ["円柱の 体積 ＝ 底面積 × 高さ。", ...(useD ? [`半径は ${rd}cm。`] : []), `底面積は ${rd} × ${rd} × 3.14 ＝ ${dec(base, 2)}（cm²）。`, `${dec(base, 2)} × ${H} ＝ ${dec(v, 2)}（cm³）。`] },
      WS(r, dec(v, 2) + "cm³", [dec(base, 2), dec(rd * 314 * H, 2), dec(v * 2, 2), dec(rd * 628 * H, 2), dec(v + 314, 2)].map(x => x + "cm³"), nf(r, v, { step: 10, min: 100, fmt: x => dec(x, 2) + "cm³" })));
  };
  g.baai6d = (r, p) => {                                   // 場合の数：ならべ方／組み合わせ／かけあわせ
    if (p.kind === "narabi") {
      if (r.chance(0.5)) { const n = r.range(3, 5), v = [1, 1, 2, 6, 24, 120][n], ks = Array.from({ length: n }, (_, i) => n - i);
        return Object.assign({ q: `${n}人が 1れつに ならぶ ならび方は 何通り？` }, W(r, v, "", [n * n, n * 2, n + (n - 1), v * 2, n * (n - 1) === v ? v + n : n * (n - 1)], ["1番目は " + n + "通り、2番目は のこりの " + (n - 1) + "通り…と 考える。", `${ks.join(" × ")} ＝ ${v}（通り）。`], { max: 150 })); }
      const n = r.range(3, 6), v = n * (n - 1);
      return Object.assign({ q: `1から ${n}までの 数字カード ${n}まいから 2まい ならべて 2けたの 数を つくります。何通り できる？` }, W(r, v, "", [n * n, n * (n - 1) / 2, n * 2, v + n, v - 1], [`十の位は ${n}通り、一の位は のこりの ${n - 1}通り。`, `${n} × ${n - 1} ＝ ${v}（通り）。`], { max: 40 }));
    }
    if (p.kind === "kumi") { const n = r.range(4, 8), v = n * (n - 1) / 2, ctx = r.chance(0.5);
      return Object.assign({ q: ctx ? `${n}チームが どの チームとも 1回ずつ 試合を します。試合は 全部で 何試合？` : `${n}人から 2人を えらぶ えらび方は 何通り？` }, W(r, v, "", [n * (n - 1), n * 2, n + (n - 1), v + 1, v - 1, n * n], ["ならべ方の 数を 出してから、同じ 組を 2回 数えて いるので 2で わる。", `${n} × ${n - 1} ÷ 2 ＝ ${v}（${ctx ? "試合" : "通り"}）。`], { max: 60 })); }
    if (r.chance(0.5)) { const n = r.range(2, 4), v = 2 ** n;
      return Object.assign({ q: `10円玉を ${n}回 投げます。表と うらの 出方は 全部で 何通り？` }, W(r, v, "", [n * 2, n + 2, v + 2, v * 2, n * n], ["1回ごとに 表か うらの 2通り。", `${Array(n).fill(2).join(" × ")} ＝ ${v}（通り）。`], { max: 40 })); }
    const a = r.range(2, 5), b = r.range(2, 5), v = a * b;
    return Object.assign({ q: `家から 駅までの 道が ${a}通り、駅から 学校までの 道が ${b}通り あります。家から 駅を 通って 学校まで 行く 行き方は 何通り？` }, W(r, v, "", [a + b, v + 1, v * 2, a * a, b * b === v ? v + 2 : b * b], [`家から 駅の ${a}通り それぞれに、駅から 学校の ${b}通りが ある。`, `${a} × ${b} ＝ ${v}（通り）。`], { max: 40 }));
  };
  g.daihyou6d = (r, p) => {                                // 代表値：中央値／さいひん値
    if (p.kind === "chuuou") {
      for (;;) {
        const n = r.pick([5, 7, 6, 8]), xs = Array.from({ length: n }, () => r.range(2, 30)); const s = [...xs].sort((a, b) => a - b);
        const m = n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; if (!Number.isInteger(m) || new Set(xs).size < n - 1) continue;
        return Object.assign({ q: `${xs.join("、")}の 中央値は？`, how: ["小さい じゅんに ならべる：" + s.join("、") + "。", n % 2 ? `まん中は ${(n + 1) / 2}番目で ${m}。` : `まん中の 2つ ${s[n / 2 - 1]} と ${s[n / 2]} の 平均で ${m}。`] },
          W(r, m, "", [Math.round(xs.reduce((a, b) => a + b, 0) / n) + 1, xs[Math.floor(n / 2)], s[0], s[n - 1], m + 1, m - 1], "", { max: 40 }), { how: ["小さい じゅんに ならべる：" + s.join("、") + "。", n % 2 ? `まん中は ${(n + 1) / 2}番目で ${m}。` : `まん中の 2つ ${s[n / 2 - 1]} と ${s[n / 2]} の 平均で ${m}。`] });
      }
    }
    const mode = r.range(2, 20), rest = [...new Set(Array.from({ length: 12 }, () => r.range(2, 20)))].filter(x => x !== mode).slice(0, 4); if (rest.length < 4) return g.daihyou6d(r, p);
    const xs = r.shuffle([mode, mode, mode, ...rest.slice(0, 3), rest[3], rest[3]]);
    return { q: `${xs.join("、")}の さいひん値は？`, a: String(mode), ans: "choice4", choices: r.shuffle([String(mode), String(rest[3]), ...rest.slice(0, 2).map(String)]), how: ["いちばん 多く 出てくる 値が さいひん値。", `${mode} が 3回、${rest[3]} が 2回、ほかは 1回。`, `さいひん値は ${mode}。`] };
  };
})(window.MH_GEN);
