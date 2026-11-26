/* 算数 3〜4年の型。漢字は学年配当の範囲だけ（ない字はひらがな） */
(function (G) {
  const g = G.gens, { ch, numFb, noCarry, noBorrow, dec, frac, gcd } = G;
  const nf = (r, n, o) => numFb(r, n, o);
  const S = x => x.map(String);
  g.detail3 = (r, p) => {
    const carries = (a, b, sub) => { const out = []; let c = 0; for (let i = 0; i < 3; i++) { const x = a % 10, y = b % 10; c = sub ? +(x - c < y) : +(x + y + c >= 10); out.push(c); a = Math.floor(a / 10); b = Math.floor(b / 10); } return out.join(''); };
    const mc = (a, b) => { let c = 0, yes = false; while (a) { c = Math.floor((a % 10 * b + c) / 10); yes ||= c > 0; a = Math.floor(a / 10); } return yes; };
    let a, b, v, found = false;
    for (let i = 0; i < 100000; i++) {
      a = r.range(...p.a); b = r.range(...p.b); v = p.op === '−' ? a - b : p.op === '×' ? a * b : a + b;
      if (v < (p.min || 1) || v > (p.max || 9999)) continue;
      if (p.pattern && carries(a, b, p.op === '−') !== p.pattern) continue;
      if (p.zero && !(Math.floor(a / 10) % 10 === 0 && a % 10 < b % 10)) continue;
      if (p.mul) { const yes = mc(a, b % 10) || (b >= 10 && (mc(a, Math.floor(b / 10)) || carries(a * (b % 10), a * Math.floor(b / 10) * 10, false) !== '000')); if ((p.mul === 'carry') !== yes) continue; }
      found = true; break;
    }
    if (!found) throw Error('detail3 candidate');
    return { q: `${a} ${p.op} ${b}`, a: String(v), hissan: { a, b, op: p.op }, choices: ch(r, v, S([v + 1, v - 1, v + 10, v - 10, v + 100, v - 100]), nf(r, v, { min: 1, max: p.max || 9999 }), { loose: true }) };
  };
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
      rem = r.chance(p.amariP) ? r.range(p.rem ? p.rem[0] : 1, Math.min(d - 1, p.rem ? p.rem[1] : d - 1)) : 0; n = d * qq + rem;
    } while (n > (p.nMax || 9999) || (p.zero && !/0/.test(String(qq))) && r.chance(0.8));
    return divOut(r, n, d, qq, rem);
  };
  /* わり算の問題と選択肢（warizan・detailDiv で共通） */
  function divOut(r, n, d, qq, rem) {
    const f = (a, b) => b ? `${a}あまり${b}` : String(a), A = f(qq, rem);
    const w = [];
    if (rem) w.push(f(qq - 1, rem + d), f(qq + 1, rem), f(qq, rem + 1), f(rem, qq), f(qq, rem === 1 ? 2 : rem - 1), f(qq + 1, Math.max(0, rem - 1)));
    else { w.push(qq + 1, qq - 1, qq + 10, qq - 10, Number(String(qq).replace(/0/g, "")) || qq + 2, d); }
    const fb = rem ? [f(qq + 2, rem), f(qq, rem + 2), f(qq - 2, rem), f(qq + 1, rem + 1)] : nf(r, qq, { min: 1 });
    return { q: `${n} ÷ ${d}`, a: A, hissan: { a: n, b: d, op: "÷", q: qq, r: rem }, choices: ch(r, A, w.map(String), fb, { loose: rem > 0 }) };
  }
  /* 細分単元（4年）：わり算の ひっ算。d=わる数 q=商 n=わられる数の範囲、rem=あまりあり、qz=商の十の位が0 */
  g.detailDiv = (r, p) => {
    for (let i = 0; i < 100000; i++) {
      const d = r.range(p.d[0], p.d[1]), qq = r.range(p.q[0], p.q[1]), rem = p.rem ? r.range(1, d - 1) : 0, n = d * qq + rem;
      if (n < p.n[0] || n > p.n[1]) continue;
      if (p.qz && !(qq >= 100 && Math.floor(qq / 10) % 10 === 0)) continue;
      return divOut(r, n, d, qq, rem);
    }
    throw Error('detailDiv candidate');
  };
  /* 細分単元（4年）：かけ算の ひっ算。carry='no' は どの位の かけ算も たし算も くり上がらない、'yes' は どこかで くり上がる */
  const mulCarry = (a, b) => {
    const parts = [];
    for (let y = b, k = 0; y; y = Math.floor(y / 10), k++) {
      const dg = y % 10;
      for (let x = a; x; x = Math.floor(x / 10)) if (x % 10 * dg >= 10) return true;
      parts.push(a * dg * 10 ** k);
    }
    let s = 0;
    for (const v of parts) { for (let x = s, y = v; x || y; x = Math.floor(x / 10), y = Math.floor(y / 10)) if (x % 10 + y % 10 >= 10) return true; s += v; }
    return false;
  };
  G.mulCarry = mulCarry;
  g.detailMul = (r, p) => {
    for (let i = 0; i < 100000; i++) {
      const a = r.range(p.a[0], p.a[1]), b = r.range(p.b[0], p.b[1]);
      if (b % 10 === 0 || (p.carry === 'yes') !== mulCarry(a, b)) continue;   // 何十を かける 問題は 出さない
      const s = a * b, bt = Math.floor(b / 10), bo = b % 10;
      return { q: `${a} × ${b}`, a: String(s), hissan: { a, b, op: "×" }, choices: ch(r, s, S([a * bo + a * bt, s + 10, s - 10, s + 100, s - 100, s + 1000]), nf(r, s, { step: 10, min: 1000, max: 99999 }), { loose: true }) };
    }
    throw Error('detailMul candidate');
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
      if (p.detailCarry === 'no' && a % 10 + b % 10 >= 10) continue;
      if (p.detailCarry === 'yes' && a % 10 + b % 10 < 10) continue;
      if (p.detailBorrow === 'no' && (!sub || A % 10 < B % 10)) continue;     // 3年 小数の ひき算：0.1の位で くり下がらない
      if (p.detailBorrow === 'yes' && (!sub || A % 10 >= B % 10)) continue;   // 0.1の位で くり下がる
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
  /* 3年 小数と 単位（1mm = 0.1cm、1dL = 0.1L）。小数は 1/10の位まで。
     k: 0 「3cm 5mm = □cm」 1 「2.7cm = □mm」 2 「45mm = □cm」 3 「2.7cmは 何cm何mm？」（4択）
     数は 10倍した 整数 v（mm・dL の数）で 作って、dec(v, 1) で 小数にする（誤差なし）。
     テンキーで 答える 問題は ans:"dec"（答えが 整数でも 小数点の キーが 出る＝答えの形の ヒントに ならない） */
  const TANI3 = [["cm", "mm"], ["L", "dL"]];
  g.shosuTani3 = (r, p) => {
    const [B, s] = p.kind === "kasa" ? TANI3[1] : p.kind === "nagasa" ? TANI3[0] : r.pick(TANI3);  // B=大きい単位、s=小さい単位
    const k = p.k != null ? p.k : r.int(4);
    let v = r.range(1, 99);                                // 小さい単位で 1〜99（0.1〜9.9）
    if (v % 10 === 0) v += r.range(1, 9);                 // 小数点の 下が 0 に ならない
    const a = Math.floor(v / 10), b = v % 10, D = dec(v, 1), pos = x => x >= 1 && x <= 99 && x % 10 !== 0;
    const fd = x => dec(x, 1), fi = x => String(x);
    if (k === 0) {                                         // a大 b小 = □大
      const q = a ? `${a}${B} ${b}${s} = □${B}` : `${b}${s} = □${B}`;
      const w = [b * 10 + a, a * 10 + b + 10, v + 1, v - 1, v + 10, v - 10].filter(pos).map(fd);
      return { q, a: D, ans: "dec", choices: ch(r, D, w, nf(r, v, { min: 1, max: 99, ok: pos, fmt: fd })) };
    }
    if (k === 1) {                                         // a.b大 = □小
      const w = [v * 10, a + b, b * 10 + a, v + 1, v - 1, v + 10, v - 10].filter(x => x >= 1 && x !== v);
      return { q: `${D}${B} = □${s}`, a: fi(v), ans: "dec", choices: ch(r, fi(v), S(w), nf(r, v, { min: 1, max: 99, fmt: fi })) };
    }
    if (k === 2) {                                         // v小 = □大
      const w = [b * 10 + a, v + 1, v - 1, v + 10, v - 10, v + 11].filter(pos).map(fd);
      return { q: `${v}${s} = □${B}`, a: D, ans: "dec", choices: ch(r, D, w, nf(r, v, { min: 1, max: 99, ok: pos, fmt: fd })) };
    }
    if (!a) return g.shosuTani3(r, Object.assign({}, p, { k }));   // 0.7cm は 何cm何mm に しない
    const A = `${a}${B}${b}${s}`, two = (x, y) => `${x}${B}${y}${s}`;
    return { q: `${D}${B}は 何${B}何${s}？`, a: A, ans: "choice4",
      choices: ch(r, A, [two(b, a), two(a, b * 10), two(v, b), two(a + 1, b), two(a, b + 1), two(a, Math.max(1, b - 1)), two(Math.max(1, a - 1), b)].filter(x => x !== A), [two(a + 2, b), two(a, b + 2), two(a + 1, b + 1)], { loose: true }) };
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
  const mixed = (W, N, d) => W < 0 ? null : !N ? String(W) : W === 0 ? `${N}/${d}` : `${W}と${N}/${d}`;   // 0は「0と」にしない
  g.bunsuMixed4 = (r, p) => {                              // 帯分数の たし算・ひき算（同じ分母）
    for (;;) {
      const d = r.pick(p.ds || [3, 5, 7]), w1 = r.range(1, 5), w2 = r.range(1, 4), n1 = r.range(1, d - 1), n2 = r.range(1, d - 1), sub = p.op === "−" || (p.op === "±" && r.chance(0.5));
      let t1 = w1 * d + n1, t2 = w2 * d + n2;
      if (sub) { if (t1 <= t2) continue; }
      const t = sub ? t1 - t2 : t1 + t2, W = Math.floor(t / d), N = t % d;
      if (!N || W < 1 || (sub ? t1 % d === 0 : false)) continue;   // 答えが1より小さくなる問題は出さない
      const A = mixed(W, N, d), carry = sub ? n1 < n2 : n1 + n2 > d;
      if (p.carry && !carry) continue;                             // 細分単元：くり上がり・くり下がりの ある 問題だけ
      const w = [mixed(W + 1, N, d), mixed(W - 1, N, d), mixed(W, d - N, d), mixed(W, N === d - 1 ? 1 : N + 1, d), ...(sub ? [mixed(Math.abs(w1 - w2), Math.abs(n1 - n2), d)] : [])].filter(x => x);
      if (carry) { const c = mixed(sub ? W + 1 : W - 1, N, d); if (c) w.push(c); }
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

  /* ===== 3年 こまかい だんかい（2026-11-26）=====
     どの型も how:[行] を返す。2回 まちがえたとき「この もんだいの ときかた」に その問題の 数で 出る（index.html lhHow）。
     p.k で 問い方を 1つに しぼる（だんかいごとに 1つの むずかしさ） */
  const cm = v => v + "cm";
  const pickK = (r, p, n) => p.k != null ? p.k : r.int(n);
  g.en3d = (r, p) => {                                     // 円と球：ことば／はんけいと ちょっけい／ならんだ円／球
    const kind = p.kind;
    if (kind === "kotoba") {
      const T = [
        ["円の 中心から まわりまで ひいた 直線を 何と いう？", "はんけい", "円の 中心から まわりまでが はんけい だよ。"],
        ["円の 中心を 通って、まわりから まわりまで ひいた 直線を 何と いう？", "ちょっけい", "中心を 通って 円の はしから はしまでが ちょっけい だよ。"],
        ["円の まん中の 点を 何と いう？", "中心", "円の まん中の 点が 中心 だよ。"],
        ["どこから 見ても 円に 見える 形を 何と いう？", "球", "ボールのように どこから 見ても 円に 見える 形が 球 だよ。"]
      ];
      const [q, a, how] = r.pick(T);
      return { q, a, ans: "choice4", choices: r.shuffle(["はんけい", "ちょっけい", "中心", "球"]), how: [how, "ちょっけいは はんけいの 2ばい だよ。"] };
    }
    if (kind === "hankei") {
      const x = r.range(2, 15), d = x * 2;
      if (r.chance(0.5)) return { q: `はんけいが ${x}cmの 円の ちょっけいは？`, a: cm(d), choices: ch(r, cm(d), S([x, d + 1, d - 1, x * 4, x + 2]).map(cm), nf(r, d, { min: 2, max: 60, fmt: cm }), { loose: true }),
        how: ["ちょっけいは はんけいの 2ばい", `${x} × 2 ＝ ${d}`, `答えは ${d}cm`] };
      return { q: `ちょっけいが ${d}cmの 円の はんけいは？`, a: cm(x), choices: ch(r, cm(x), S([d, x + 1, x - 1, d * 2, x + 2]).map(cm), nf(r, x, { min: 1, max: 30, fmt: cm }), { loose: true }),
        how: ["はんけいは ちょっけいの 半分", `${d} ÷ 2 ＝ ${x}`, `答えは ${x}cm`] };
    }
    if (kind === "narabi") {
      const x = r.range(2, 6), n = r.range(2, 5), d = x * 2, L = d * n;
      if (r.chance(0.6)) return { q: `はんけい ${x}cmの 同じ 円が ${n}こ、 よこに ぴったり ならんで 箱に 入っています。 箱の よこの 長さは？`, a: cm(L),
        choices: ch(r, cm(L), S([x * n, L + d, L - d, d + n, x * n * 4]).map(cm), nf(r, L, { min: 4, max: 80, fmt: cm }), { loose: true }),
        how: [`円 1この ちょっけいは ${x} × 2 ＝ ${d}cm`, `それが ${n}こ分 → ${d} × ${n} ＝ ${L}`, `答えは ${L}cm`] };
      return { q: `同じ 円が ${n}こ、 よこに ぴったり ならんで、 はしから はしまで ${L}cm です。 円の はんけいは？`, a: cm(x),
        choices: ch(r, cm(x), S([d, L / n + 1, x + 1, x - 1, L / 2]).map(cm), nf(r, x, { min: 1, max: 30, fmt: cm }), { loose: true }),
        how: [`円 1この ちょっけいは ${L} ÷ ${n} ＝ ${d}cm`, `はんけいは その 半分 → ${d} ÷ 2 ＝ ${x}`, `答えは ${x}cm`] };
    }
    const x = r.range(2, 9), d = x * 2, k = pickK(r, p, 3);   // 球
    if (k === 0) return { q: `はんけい ${x}cmの 球を まっすぐ 切ります。 切り口の 円の ちょっけいが いちばん 大きいのは 何cm？`, a: cm(d), choices: ch(r, cm(d), S([x, d + 1, d - 1, d * 2, d + 2]).map(cm), nf(r, d, { min: 2, max: 40, fmt: cm }), { loose: true }),
      how: ["球の 中心を 通るように 切ると、切り口が いちばん 大きい", "その 円の ちょっけいは 球の ちょっけいと 同じ", `${x} × 2 ＝ ${d}`] };
    if (k === 1) return { q: `はんけい ${x}cmの 球が ぴったり 入る さいころの 形の 箱が あります。 箱の 1つの へんの 長さは？`, a: cm(d), choices: ch(r, cm(d), S([x, d + 1, d - 1, d * 2, x * 3]).map(cm), nf(r, d, { min: 2, max: 40, fmt: cm }), { loose: true }),
      how: ["ぴったり 入るので、箱の へんの 長さは 球の ちょっけいと 同じ", `${x} × 2 ＝ ${d}`, `答えは ${d}cm`] };
    const n = r.range(2, 4), H = d * n;
    return { q: `ちょっけい ${d}cmの 球を ${n}こ、 たてに ぴったり つみます。 高さは 何cm？`, a: cm(H), choices: ch(r, cm(H), S([x * n, H + d, H - d, d + n]).map(cm), nf(r, H, { min: 4, max: 80, fmt: cm }), { loose: true }),
      how: [`球 1この 高さは ちょっけいの ${d}cm`, `${n}こ分 → ${d} × ${n} ＝ ${H}`] };
  };
  const gW = v => v + "g", kgW = v => v + "kg";
  g.omosa3d = (r, p) => {                                  // 重さ：kgと g／tと kg／重さの 計算
    if (p.kind === "kg") {
      const a = r.range(1, 9), b = r.chance(0.5) ? r.range(1, 9) * 100 : r.range(1, 99) * 10, v = a * 1000 + b;
      if (r.chance(0.5)) return { q: `${a}kg ${b}g = □g`, a: gW(v), choices: ch(r, gW(v), S([a * 100 + b, a * 1000 + b + 100, a * 1000 + b - 100, a + b, a * 10000 + b]).map(gW), nf(r, v, { step: 10, min: 1010, max: 9990, fmt: gW }), { loose: true }),
        how: ["1kg ＝ 1000g", `${a}kg ＝ ${a * 1000}g`, `${a * 1000} ＋ ${b} ＝ ${v}`] };
      const A = `${a}kg${b}g`;
      return { q: `${v}gは 何kg何g？`, a: A, ans: "choice4", choices: ch(r, A, [`${a * 10}kg${b}g`, `${a}kg${b + 100}g`, `${a + 1}kg${b}g`, `${a}kg${b * 10 > 999 ? b + 10 : b * 10}g`, `${Math.max(1, a - 1)}kg${b}g`], [`${a + 2}kg${b}g`, `${a}kg${b + 200}g`], { loose: true }),
        how: ["1000g ＝ 1kg", `${v}g は 1000gが ${a}こ と ${b}g`, `答えは ${a}kg${b}g`] };
    }
    if (p.kind === "t") {
      const a = r.range(1, 9), b = r.range(1, 9) * 100, v = a * 1000 + b;
      if (r.chance(0.5)) return { q: `${a}t ${b}kg = □kg`, a: kgW(v), choices: ch(r, kgW(v), S([a * 100 + b, a * 1000 + b + 100, a * 1000 + b - 100, a + b]).map(kgW), nf(r, v, { step: 100, min: 1100, max: 9900, fmt: kgW }), { loose: true }),
        how: ["1t ＝ 1000kg", `${a}t ＝ ${a * 1000}kg`, `${a * 1000} ＋ ${b} ＝ ${v}`] };
      return { q: `${a}t = □kg`, a: kgW(a * 1000), choices: ch(r, kgW(a * 1000), S([a * 100, a * 10000, a * 10, a * 1000 + 100]).map(kgW), nf(r, a * 1000, { step: 1000, min: 1000, max: 9000, fmt: kgW }), { loose: true }),
        how: ["1t ＝ 1000kg", `${a}t は 1000kgが ${a}こ → ${a * 1000}kg`] };
    }
    const sub = r.chance(0.5);                             // 重さの 計算（g で 答える）
    if (!sub) {
      const a = r.range(1, 5), b = r.range(1, 9) * 100, c = r.range(1, 9) * 100, v = a * 1000 + b + c;
      return { q: `${a}kg ${b}g と ${c}gを あわせると 何g？`, a: gW(v), choices: ch(r, gW(v), S([a * 1000 + b, a + b + c, v + 100, v - 100, v + 1000]).map(gW), nf(r, v, { step: 100, min: 1100, max: 9900, fmt: gW }), { loose: true }),
        how: [`${a}kg ${b}g ＝ ${a * 1000 + b}g`, `${a * 1000 + b} ＋ ${c} ＝ ${v}`, `答えは ${v}g`] };
    }
    const a = r.range(2, 5), c = r.range(1, 9) * 100, v = a * 1000 - c;
    return { q: `${a}kgから ${c}gを とると、 のこりは 何g？`, a: gW(v), choices: ch(r, gW(v), S([a - c > 0 ? a - c : a * 100, a * 1000 + c, v + 100, v - 100, a * 100 - c > 0 ? a * 100 - c : v + 200]).map(gW), nf(r, v, { step: 100, min: 100, max: 9900, fmt: gW }), { loose: true }),
      how: ["たんいを g に そろえる", `${a}kg ＝ ${a * 1000}g`, `${a * 1000} − ${c} ＝ ${v}`] };
  };
  const hm = m => `${Math.floor(m / 60)}時${m % 60 ? m % 60 + "分" : ""}`;
  g.jikoku3d = (r, p) => {                                  // 時こく：〜分後／〜分前／時間の 長さ／時間の たし算
    if (p.kind === "ato" || p.kind === "mae") {
      for (;;) {
        const h = r.range(7, 10), m = r.range(1, 11) * 5, d = r.range(2, 11) * 5, t = h * 60 + m, e = p.kind === "ato" ? t + d : t - d;
        if (Math.floor(e / 60) === h) continue;           // かならず 時を またぐ
        const A = hm(e), w = [hm(e + 60), hm(e - 60), hm(e + 10), hm(e - 10), hm(p.kind === "ato" ? t - d : t + d)].filter(x => x !== A);
        const nx = p.kind === "ato" ? (h + 1) * 60 : h * 60, gap = Math.abs(nx - t), rest = d - gap;
        return { q: `${hm(t)}の ${d}分${p.kind === "ato" ? "後" : "前"}の 時こくは？`, a: A, ans: "choice4", choices: ch(r, A, w, [hm(e + 5), hm(e - 5), hm(e + 15)], { loose: true }),
          how: [`${hm(t)}から ${hm(nx)}までは ${gap}分`, `${d}分 − ${gap}分 ＝ のこり ${rest}分`, `${hm(nx)}の ${rest}分${p.kind === "ato" ? "後" : "前"}で ${A}`] };
      }
    }
    if (p.kind === "aida") {
      for (;;) {
        const h = r.range(7, 10), m = r.range(4, 11) * 5, d = r.range(3, 11) * 5, t = h * 60 + m, e = t + d;
        if (Math.floor(e / 60) === h || d >= 60) continue;
        const nx = (h + 1) * 60, a1 = nx - t, a2 = e - nx;
        return { q: `${hm(t)}から ${hm(e)}までは 何分？`, a: String(d), choices: ch(r, d, S([e % 60 - m > 0 ? e % 60 - m : d + 20, d + 10, d - 5, a1, a2 + 60]), nf(r, d, { step: 5, min: 5, max: 60 }), { loose: true }),
          how: [`${hm(t)}から ${hm(nx)}までは ${a1}分`, `${hm(nx)}から ${hm(e)}までは ${a2}分`, `${a1} ＋ ${a2} ＝ ${d}`] };
      }
    }
    for (;;) {                                             // 時間の たし算（○分＋○分 → ○時間○分）
      const a = r.range(4, 11) * 5, b = r.range(3, 11) * 5, s = a + b;
      if (s <= 60 || s >= 120) continue;
      const A = `1時間${s - 60}分`;
      return { q: `${a}分 ＋ ${b}分 は 何時間何分？`, a: A, ans: "choice4", choices: ch(r, A, [`2時間${s - 60}分`, `1時間${s - 50}分`, `1時間${Math.max(5, s - 70)}分`, `${Math.floor(s / 100)}時間${s % 100}分`].filter(x => x !== A && !/時間0分$/.test(x) && +x.match(/(\d+)分$/)[1] < 60), [`1時間${(s - 40) % 60 || 25}分`, `1時間${(s - 35) % 60 || 35}分`, `1時間${(s - 30) % 60 || 45}分`], { loose: true }),
        how: [`${a} ＋ ${b} ＝ ${s}分`, "60分 ＝ 1時間", `${s}分 ＝ 60分 ＋ ${s - 60}分 → ${A}`] };
    }
  };
  g.shosu3d = (r, p) => {                                   // 小数：0.1の いくつ分／大小／整数と 小数の たしひき
    if (p.kind === "ikutsu") {
      let v = r.range(11, 99); if (v % 10 === 0) v++;
      const D = dec(v, 1);
      if (r.chance(0.5)) return { q: `0.1を ${v}こ あつめた 数は？`, a: D, ans: "dec", choices: ch(r, D, [String(v), dec(v, 2), dec(v + 1, 1), dec(v - 1, 1), dec(v + 10, 1)], nf(r, v, { min: 1, max: 99, fmt: x => dec(x, 1) }), { loose: true }),
        how: ["0.1が 10こで 1", `${v}こ は 10こが ${Math.floor(v / 10)}つ と ${v % 10}こ`, `${Math.floor(v / 10)} と 0.${v % 10} で ${D}`] };
      return { q: `${D}は 0.1を 何こ あつめた 数？`, a: String(v), choices: ch(r, v, S([Math.floor(v / 10) + v % 10, v % 10, v + 1, v - 1, v * 10]), nf(r, v, { min: 1, max: 99 }), { loose: true }),
        how: [`${Math.floor(v / 10)} は 0.1が ${Math.floor(v / 10) * 10}こ`, `0.${v % 10} は 0.1が ${v % 10}こ`, `${Math.floor(v / 10) * 10} ＋ ${v % 10} ＝ ${v}`] };
    }
    if (p.kind === "kurabe") {
      const set = new Set(); let v = r.range(12, 89); if (v % 10 === 0) v++;
      const rv = (v % 10) * 10 + Math.floor(v / 10);     // 1.3 と 3.1 の ような まちがえやすい 数
      [v, rv, v + 1, v - 1, v + 10, v - 10, v + 5].forEach(x => { if (x >= 1 && x <= 99 && set.size < 4) set.add(x); });
      const L = [...set], big = r.chance(0.5), x = big ? Math.max(...L) : Math.min(...L), A = dec(x, 1);
      return { q: `いちばん ${big ? "大きい" : "小さい"} 数は？`, a: A, ans: "choice4", choices: r.shuffle(L.map(y => dec(y, 1))),
        how: ["まず 整数の ところ（小数点の 左）を くらべる", "同じなら 0.1の くらいを くらべる", `いちばん ${big ? "大きい" : "小さい"}のは ${A}`] };
    }
    for (;;) {                                             // 整数と 小数の たし算・ひき算（答えが 整数に なるもの も ふくむ）
      const k = r.int(3); let q, v, how;
      if (k === 0) { const a = r.range(2, 9), b = r.range(1, 9); v = a * 10 - b; q = `${a} − 0.${b}`; how = [`${a} を ${a}.0 と 考える`, `0.1が ${a * 10}こ から ${b}こ とる → ${v}こ`, `答えは ${dec(v, 1)}`]; }
      else if (k === 1) { const a = r.range(1, 8), b = r.range(11, 89); if (b % 10 === 0) continue; v = a * 10 + b; q = `${a} + ${dec(b, 1)}`; how = [`整数の ところ どうしを たす：${a} ＋ ${Math.floor(b / 10)} ＝ ${a + Math.floor(b / 10)}`, `0.${b % 10} は そのまま`, `答えは ${dec(v, 1)}`]; }
      else { const b = r.range(1, 9), a = r.range(11, 79); if (a % 10 + b !== 10) continue; v = a + b; q = `${dec(a, 1)} + 0.${b}`; how = [`0.${a % 10} ＋ 0.${b} ＝ 1`, `${Math.floor(a / 10)} ＋ 1 ＝ ${v / 10}`, `答えは ${v / 10}（小数点の 後ろの 0は かかない）`]; }
      const D = dec(v, 1);
      return { q, a: D, ans: "dec", choices: ch(r, D, [dec(v + 1, 1), dec(v - 1, 1), dec(v + 10, 1), dec(v - 10, 1), dec(v + 9, 1)].filter(x => +x > 0), nf(r, v, { min: 1, max: 99, fmt: x => dec(x, 1) }), { loose: true }), how };
    }
  };
  g.bunsu3d = (r, p) => {                                   // 分数：大小／1から ひく
    if (p.kind === "kurabe") {
      const d = r.range(5, 10), ns = r.shuffle([...Array(d - 1)].map((_, i) => i + 1)).slice(0, 4), big = r.chance(0.5), x = big ? Math.max(...ns) : Math.min(...ns), A = `${x}/${d}`;
      return { q: `いちばん ${big ? "大きい" : "小さい"} 分数は？`, a: A, ans: "choice4", choices: r.shuffle(ns.map(n => `${n}/${d}`)),
        how: [`分母が どれも ${d} で 同じ`, "分母が 同じなら、分子が 大きいほど 大きい", `答えは ${A}`] };
    }
    for (;;) {
      const d = r.range(3, 10), a = r.range(1, d - 1), n = d - a;
      if (gcd(n, d) !== 1) continue;
      const A = `${n}/${d}`;
      return { q: `1 − ${a}/${d}`, a: A, choices: ch(r, A, [`${a}/${d}`, `${n}/${d - 1}`, `${n + 1}/${d}`, `${Math.max(1, n - 1)}/${d}`, `${1 - 0}/${d}`].filter(x => x !== A), [`${n + 2}/${d}`, `${n}/${d + 1}`, `${n + 1}/${d + 1}`]),
        how: [`1 は ${d}/${d} と 同じ`, `${d}/${d} − ${a}/${d} ＝ ${n}/${d}`] };
    }
  };
  g.graph3d = (r, p) => {                                   // ぼうグラフ：1めもりの 大きさ／めもりを よむ／何めもりか
    const unit = r.pick([["人", "人"], ["本", "本"], ["こ", "こ"]])[0], st = r.pick([1, 2, 5, 10]);
    if (p.kind === "memori") {
      const n = 5, top = st * n;
      return { q: `ぼうグラフの めもりで、 0から ${top}${unit}までが ${n}つに 分かれています。 1めもりは 何${unit}？`, a: String(st), choices: ch(r, st, S([n, top, st + 1, st * 2 === top ? st + 2 : st * 2, top - n]), nf(r, st, { min: 1, max: 20 }), { loose: true }),
        how: [`${top} を ${n}つに 分ける`, `${top} ÷ ${n} ＝ ${st}`, `1めもりは ${st}${unit}`] };
    }
    const k = r.range(3, 12), v = k * st;
    if (p.kind === "yomu") return { q: `1めもりが ${st}${unit}の ぼうグラフで、 ぼうの 長さが ${k}めもりです。 何${unit}？`, a: String(v), choices: ch(r, v, S([k, v + st, v - st, k + st, v + 1]), nf(r, v, { min: 1, max: 120 }), { loose: true }),
      how: [`1めもりが ${st}${unit}`, `${k}めもりは ${st} × ${k} ＝ ${v}`, `答えは ${v}${unit}`] };
    return { q: `1めもりが ${st}${unit}の ぼうグラフで、 ${v}${unit}を あらわすと 何めもり？`, a: String(k), choices: ch(r, k, S([v, k + 1, k - 1, k * 2, v - st]), nf(r, k, { min: 1, max: 30 }), { loose: true }),
      how: [`1めもりが ${st}${unit}`, `${v} ÷ ${st} ＝ ${k}`, `答えは ${k}めもり`] };
  };
  g.sankaku3d = (r, p) => {                                 // 三角形：なかまわけ／角／まわりの 長さ
    const N = ["正三角形", "二等へん三角形", "直角三角形", "四角形"];
    if (p.kind === "namae") {
      if (r.chance(0.5)) { const x = r.range(3, 9); return { q: `3つの へんの 長さが ${x}cm、${x}cm、${x}cm の 三角形は？`, a: N[0], ans: "choice4", choices: r.shuffle(N.slice()), how: ["3つの へんの 長さが ぜんぶ 同じ", "→ 正三角形"] }; }
      let x, y; do { x = r.range(3, 9); y = r.range(2, 9); } while (x === y || 2 * x <= y);
      return { q: `3つの へんの 長さが ${x}cm、${x}cm、${y}cm の 三角形は？`, a: N[1], ans: "choice4", choices: r.shuffle(N.slice()), how: ["2つの へんの 長さが 同じ", "→ 二等へん三角形"] };
    }
    if (p.kind === "kado") {
      const T = [["正三角形の 3つの 角の 大きさは？", "ぜんぶ 同じ", "正三角形は 3つの 角が ぜんぶ 同じ 大きさ"], ["二等へん三角形の 角は どう なっている？", "2つの 角が 同じ", "二等へん三角形は 2つの 角が 同じ 大きさ"]];
      const [q, a, how] = r.pick(T);
      return { q, a, ans: "choice4", choices: r.shuffle(["ぜんぶ 同じ", "2つの 角が 同じ", "ぜんぶ ちがう", "1つだけ 直角"]), how: [how] };
    }
    if (r.chance(0.5)) {
      const x = r.range(3, 12), v = x * 3;
      if (r.chance(0.5)) return { q: `1つの へんが ${x}cmの 正三角形の まわりの 長さは？`, a: cm(v), choices: ch(r, cm(v), S([x * 2, x * 4, v + 1, v - 1, x + 3]).map(cm), nf(r, v, { min: 6, max: 40, fmt: cm }), { loose: true }), how: ["正三角形は 3つの へんが 同じ 長さ", `${x} × 3 ＝ ${v}`] };
      return { q: `まわりの 長さが ${v}cmの 正三角形の 1つの へんは？`, a: cm(x), choices: ch(r, cm(x), S([v - 3, Math.floor(v / 2), x + 1, x - 1, x * 2]).map(cm), nf(r, x, { min: 1, max: 30, fmt: cm }), { loose: true }), how: ["正三角形は 3つの へんが 同じ 長さ", `${v} ÷ 3 ＝ ${x}`] };
    }
    let x, y; do { x = r.range(3, 9); y = r.range(2, 9); } while (x === y || 2 * x <= y);
    const v = x * 2 + y;
    return { q: `同じ 長さの へんが ${x}cm、 のこりの へんが ${y}cmの 二等へん三角形の まわりの 長さは？`, a: cm(v), choices: ch(r, cm(v), S([x + y, x * 3, y * 2 + x, v + 1, v - 1]).map(cm), nf(r, v, { min: 6, max: 40, fmt: cm }), { loose: true }),
      how: [`同じ 長さの へんが 2本 → ${x} × 2 ＝ ${x * 2}`, `${x * 2} ＋ ${y} ＝ ${v}`] };
  };
  g.mul3d0 = (r) => {                                       // 3けた×1けた（十の位が 0）
    const a = r.range(1, 9) * 100 + r.range(1, 9), b = r.range(2, 9), v = a * b;
    return { q: `${a} × ${b}`, a: String(v), hissan: { a, b, op: "×" }, choices: ch(r, v, S([(Math.floor(a / 100) * b) * 100 + (a % 10) * b % 10, v + 10, v - 10, v + 100, v - 100, Math.floor(a / 100) * b * 10 + a % 10 * b]), nf(r, v, { min: 100, max: 9999 }), { loose: true }) };
  };
  g.div01 = (r) => {                                        // 0 や 1 の わり算
    const k = r.int(3), d = r.range(2, 9);
    if (k === 0) return { q: `0 ÷ ${d}`, a: "0", choices: ch(r, 0, S([d, 1, 10]), ["2", "3"], { loose: true }), how: ["0こを 何人で 分けても 1人分は 0こ", `0 ÷ ${d} ＝ 0`] };
    if (k === 1) return { q: `${d} ÷ 1`, a: String(d), choices: ch(r, d, S([1, 0, d + 1, d - 1, d * 10]), nf(r, d, { min: 1, max: 20 }), { loose: true }), how: ["1で わると、答えは わられる数と 同じ", `${d} ÷ 1 ＝ ${d}`] };
    return { q: `${d} ÷ ${d}`, a: "1", choices: ch(r, 1, S([0, d, 2, 10]), ["3", "4"], { loose: true }), how: ["同じ 数で わると、答えは 1", `${d} ÷ ${d} ＝ 1`] };
  };
  /* ===== 4年 こまかい だんかい（2026-11-26）===== どの型も how:[行] を返す（3年と同じ） */
  const d2 = v => dec(v, 2), d1 = v => dec(v, 1);
  g.shosu4d = (r, p) => {                                   // 小数：けたちがい／整数と小数／0を消す／×2けた／わり進む／商を がい数で／あまり
    const K = p.kind;
    if (K === "keta") for (;;) {
      const sub = r.chance(0.5), a = r.range(101, 999), b = r.range(11, 99) * 10, flip = r.chance(0.5);  // a は 1/100の位まで、b は 1/10の位まで
      if (a % 10 === 0 || b % 100 === 0) continue;
      let x = flip ? b : a, y = flip ? a : b; if (sub && x <= y) [x, y] = [y, x];
      const v = sub ? x - y : x + y; if (v % 10 === 0 || v <= 0 || v > 1998) continue;
      const A = d2(v), xs = d2(x), ys = d2(y), xsP = (x / 100).toFixed(2), ysP = (y / 100).toFixed(2);
      const wrong = sub ? Math.abs(x - (y % 100 === 0 ? y / 10 : y)) : x + (y % 10 === 0 ? y / 10 : y);
      return { q: `${xs} ${sub ? "−" : "+"} ${ys}`, a: A, ans: "dec", choices: ch(r, A, [d2(wrong), d2(v + 10), d2(v - 10), d2(v + 100), d2(v - 1)].filter(s => +s > 0 && s !== A), nf(r, v, { min: 1, max: 1998, ok: z => z % 10 !== 0, fmt: d2 }), { loose: true }),
        how: ["小数点の 位置を そろえて かく", `${xsP} ${sub ? "−" : "＋"} ${ysP} と 考える`, `${x} ${sub ? "−" : "＋"} ${y} ＝ ${v} → ${A}`] };
    }
    if (K === "seisu") for (;;) {
      const sub = r.chance(0.6), n = r.range(2, 9), b = r.range(11, sub ? n * 100 - 1 : 899);
      if (b % 10 === 0) continue;
      const N = n * 100, v = sub ? N - b : N + b; if (v <= 0) continue;
      const A = d2(v);
      return { q: `${n} ${sub ? "−" : "+"} ${d2(b)}`, a: A, ans: "dec", choices: ch(r, A, [d2(sub ? n * 10 - b > 0 ? n * 10 - b : v + 100 : n * 10 + b), d2(v + 100), d2(v - 100), d2(v + 10), d2(v + 1)].filter(s => +s > 0 && s !== A), nf(r, v, { min: 1, max: 1899, ok: z => z % 10 !== 0, fmt: d2 }), { loose: true }),
        how: [`${n} を ${n}.00 と 考える`, `${N} ${sub ? "−" : "＋"} ${b} ＝ ${v}`, `答えは ${A}`] };
    }
    if (K === "zero") for (;;) {
      const sub = r.chance(0.4), a = r.range(101, 899), b = r.range(101, 899);
      if (a % 10 === 0 || b % 10 === 0) continue;
      const v = sub ? a - b : a + b; if (v <= 0 || v % 10 !== 0) continue;
      const A = d2(v), raw = (v / 100).toFixed(2);
      return { q: `${d2(a)} ${sub ? "−" : "+"} ${d2(b)}`, a: A, ans: "dec", choices: ch(r, A, [raw.replace(/\.?0+$/, "") === A ? (v % 100 ? d1(v / 10 + 1) : String(v / 100 + 1)) : raw, d2(v + 10), d2(v - 10), d2(v + 100), String(v / 10)].filter(s => s !== A && +s > 0), nf(r, v, { step: 10, min: 10, max: 1990, fmt: d2 }), { loose: true }),
        how: [`${a} ${sub ? "−" : "＋"} ${b} ＝ ${v} → ${raw}`, "小数点より 後ろの、さいごの 0は 消す", `答えは ${A}`] };
    }
    if (K === "mul2") for (;;) {
      const a = r.range(11, 99), b = r.range(11, 49), v = a * b;
      if (a % 10 === 0 || v % 10 === 0) continue;
      const A = d1(v);
      return { q: `${d1(a)} × ${b}`, a: A, ans: "dec", choices: ch(r, A, [String(v), d2(v), d1(v + 10), d1(v - 10), d1(a * (b % 10) + a * Math.floor(b / 10))].filter(s => s !== A), nf(r, v, { min: 11, ok: z => z % 10 !== 0, fmt: d1 }), { loose: true }),
        how: [`小数点を ないものと して ${a} × ${b} ＝ ${v}`, `${d1(a)} は 小数点の 下が 1けた`, `答えも 下から 1けたの ところに 小数点 → ${A}`] };
    }
    if (K === "susumu") for (;;) {
      const d = r.pick([2, 4, 5, 6, 8]), c = r.range(11, 499);            // c = 答え（1/100の位まで）
      if (c % 10 === 0) continue;
      const n = c * d; if (n % 10 !== 0 || n > 9990) continue;            // わられる数は 1/10の位まで
      const N = d1(n / 10), A = d2(c);
      return { q: `${N} ÷ ${d}`, a: A, ans: "dec", choices: ch(r, A, [d1(c), d2(c + 1), d2(c - 1), d2(c + 10), String(Math.floor(c / 100) || 1)].filter(s => s !== A && +s > 0), nf(r, c, { min: 1, ok: z => z % 10 !== 0, fmt: d2 }), { loose: true }),
        how: ["わりきれない ときは、わられる数の 後ろに 0が あると 考えて わり進める", `${N} を ${(n / 100).toFixed(2)} と 考えて ${d} で わる`, `答えは ${A}`] };
    }
    if (K === "gaisu") for (;;) {
      const d = r.pick([3, 6, 7, 9]), n = r.range(21, 99);                // n は 1/10の位まで（2.1〜9.9）
      if (n % 10 === 0 || (n * 10) % d === 0) continue;
      const h = Math.floor(n * 10 / d), t = Math.floor(h / 10) + (h % 10 >= 5 ? 1 : 0);   // h：1/100の位まで、t：四捨五入した 1/10の位
      if (t <= 0 || t % 10 === 0) continue;                           // 2.0 の ような 答え（0を 消すと 形が かわる）は 出さない
      const A = d1(t), H = d2(h);
      return { q: `${d1(n)} ÷ ${d} の 商を、 ししゃごにゅうして 1/10の位までの がい数で 表すと？`, a: A, ans: "dec", choices: ch(r, A, [H, d1(Math.floor(h / 10)) === A ? d1(t - 1) : d1(Math.floor(h / 10)), d1(t + 1), d1(t + 10)].filter(s => s !== A && +s > 0), nf(r, t, { min: 1, fmt: d1 }), { loose: true }),
        how: [`1/100の位まで 計算する：${H}…`, `1/100の位は ${h % 10} → ${h % 10 >= 5 ? "5以上なので 切り上げ" : "4以下なので 切りすて"}`, `答えは ${A}`] };
    }
    for (;;) {                                                            // あまりの ある 小数の わり算（商は 一の位まで）
      const d = r.range(3, 9), n = r.range(101, 499); if (n % 10 === 0) continue;
      const q = Math.floor(n / (d * 10)), rem = n - q * d * 10; if (q < 1 || rem <= 0) continue;
      const A = `${q}あまり${d1(rem)}`;
      return { q: `${d1(n)} ÷ ${d} の 商を 一の位まで もとめると、 商と あまりは？`, a: A, ans: "choice4", choices: ch(r, A, [`${q}あまり${rem}`, `${q}あまり${d2(rem)}`, `${q + 1}あまり${d1(rem)}`, `${q - 1 || q + 2}あまり${d1(rem + d * 10 * (q - 1 ? 1 : 0)) || d1(rem + 1)}`].filter(s => s !== A), [`${q}あまり${d1(rem + 1)}`, `${q + 2}あまり${d1(rem)}`], { loose: true }),
        how: [`商は 一の位まで：${d} × ${q} ＝ ${d * q}`, `${d1(n)} − ${d * q} ＝ ${d1(rem)}`, "あまりの 小数点は、わられる数の 小数点に そろえる", `たしかめ：${d} × ${q} ＋ ${d1(rem)} ＝ ${d1(n)}`] };
    }
  };
  const PLC = [[10, "十"], [100, "百"], [1000, "千"], [10000, "一万"]], low = { 10: "一", 100: "十", 1000: "百", 10000: "千" };
  const rnd = (n, pp) => Math.round(n / pp) * pp;
  g.gaisu4d = (r, p) => {                                    // がい数：ししゃごにゅう／上から○けた／はんい／見積もり
    const K = p.kind;
    if (K === "shisha") for (;;) {
      const [pp, nm] = r.pick(PLC.slice(0, 3)), n = r.range(1001, 99999); if (n % pp === 0) continue;
      const A = rnd(n, pp), dg = Math.floor(n / (pp / 10)) % 10, fl = Math.floor(n / pp) * pp, ce = fl + pp;
      return { q: `${n}を ししゃごにゅうして、 ${nm}の位までの がい数に すると？`, a: String(A), choices: ch(r, A, S([fl, ce, rnd(n, pp * 10), rnd(n, pp / 10), A + pp, A - pp].filter(x => x !== A && x > 0)), nf(r, A, { step: pp, min: pp }), { loose: true }),
        how: [`${nm}の位までなので、1つ 下の ${low[pp]}の位を 見る`, `${low[pp]}の位は ${dg} → ${dg >= 5 ? "5以上なので 切り上げ" : "4以下なので 切りすて"}`, `答えは ${A}`] };
    }
    if (K === "ue") for (;;) {
      const n = r.range(1001, 99999), k = r.pick([1, 2]), len = String(n).length, pp = 10 ** (len - k); if (n % pp === 0) continue;
      const A = rnd(n, pp), dg = Math.floor(n / (pp / 10)) % 10;
      return { q: `${n}を ししゃごにゅうして、 上から ${k}けたの がい数に すると？`, a: String(A), choices: ch(r, A, S([Math.floor(n / pp) * pp, Math.floor(n / pp) * pp + pp, rnd(n, k === 1 ? pp / 10 : pp * 10), A + pp].filter(x => x !== A && x > 0)), nf(r, A, { step: pp, min: pp }), { loose: true }),
        how: [`上から ${k}けた のこすので、上から ${k + 1}けためを 見る`, `上から ${k + 1}けためは ${dg} → ${dg >= 5 ? "切り上げ" : "切りすて"}`, `答えは ${A}`] };
    }
    if (K === "hanni") {
      const [pp, nm] = r.pick(PLC.slice(0, 2)), T = r.range(2, 98) * pp, small = r.chance(0.5), A = small ? T - pp / 2 : T + pp / 2 - 1;
      return { q: `ししゃごにゅうして ${nm}の位までの がい数に すると ${T}に なる 整数の うち、 いちばん ${small ? "小さい" : "大きい"} 数は？`, a: String(A), choices: ch(r, A, S([T - pp / 2, T + pp / 2 - 1, T + pp / 2, T - pp / 2 - 1, T - pp / 2 + 1, T + pp / 2 - 2].filter(x => x !== A)), nf(r, A, { min: 1 }), { loose: true }),
        how: [`${low[pp]}の位を ししゃごにゅうする`, `${T} に なるのは ${T - pp / 2} 以上 ${T + pp / 2} 未満`, `いちばん ${small ? "小さい" : "大きい"} 整数は ${A}`] };
    }
    for (;;) {                                                            // 見積もり（百の位までの がい数で たす）
      const xs = [r.range(120, 980), r.range(120, 980), r.range(120, 980)]; if (xs.some(x => x % 100 === 50 || x % 100 === 0)) continue;
      const rs = xs.map(x => rnd(x, 100)), A = rs.reduce((a, b) => a + b, 0), ex = xs.reduce((a, b) => a + b, 0); if (A === ex) continue;
      return { q: `${xs[0]}円、 ${xs[1]}円、 ${xs[2]}円の 買い物を します。 百の位までの がい数に して、 合計を 見積もると 何円？`, a: A + "円", choices: ch(r, A + "円", S([ex, A + 100, A - 100, rnd(ex, 1000)].filter(x => x !== A)).map(x => x + "円"), nf(r, A, { step: 100, min: 100, fmt: x => x + "円" }), { loose: true }),
        how: [`それぞれ 百の位までの がい数に する：${rs.join("、")}`, `${rs.join(" ＋ ")} ＝ ${A}`, `およそ ${A}円`] };
    }
  };
  const dg = v => v + "度";
  g.kakudo4d = (r, p) => {                                   // 角：180度より大きい角／三角じょうぎ／計算で もとめる
    const K = p.kind;
    if (K === "ookii") {
      const k = r.int(3), x = r.range(1, 17) * 10 + r.pick([0, 5]);
      if (k === 0) { const v = 180 + x; return { q: `${v}度は 180度より 何度 大きい？`, a: dg(x), choices: ch(r, dg(x), S([360 - v, v - 90, x + 10, x - 5]).filter(s => +s > 0).map(dg), nf(r, x, { step: 5, min: 5, max: 180, fmt: dg }), { loose: true }), how: [`${v} − 180 ＝ ${x}`, `答えは ${x}度`] }; }
      if (k === 1) { const v = 360 - x; return { q: `360度より ${x}度 小さい 角は 何度？`, a: dg(v), choices: ch(r, dg(v), S([180 - x > 0 ? 180 - x : 180 + x, 180 + x, v + 10, v - 10]).map(dg), nf(r, v, { step: 5, min: 180, max: 355, fmt: dg }), { loose: true }), how: ["1しゅうの 角は 360度", `360 − ${x} ＝ ${v}`] }; }
      const v = 180 + x; return { q: `180度と ${x}度を あわせた 角は 何度？`, a: dg(v), choices: ch(r, dg(v), S([180 - x > 0 ? 180 - x : v + 20, 360 - x, v + 10, v - 10]).map(dg), nf(r, v, { step: 5, min: 185, max: 355, fmt: dg }), { loose: true }), how: ["一直線の 角は 180度", `180 ＋ ${x} ＝ ${v}`] };
    }
    if (K === "jougi") for (;;) {
      const A0 = [30, 45, 60, 90], x = r.pick(A0), y = r.pick(A0), add = r.chance(0.6); if (x === y || (!add && x <= y)) continue;
      const v = add ? x + y : x - y;
      return { q: `2まいの 三角じょうぎの ${x}度の 角と ${y}度の 角を ${add ? "あわせると" : "かさねると、 ちがいは"} 何度？`, a: dg(v), choices: ch(r, dg(v), S([add ? Math.abs(x - y) : x + y, v + 15, v - 15, v + 30]).filter(s => +s > 0).map(dg), nf(r, v, { step: 5, min: 5, max: 180, fmt: dg }), { loose: true }),
        how: ["三角じょうぎの 角は 90度・45度・45度 と 90度・60度・30度", `${x} ${add ? "＋" : "−"} ${y} ＝ ${v}`] };
    }
    const k = r.int(3), x = r.range(3, 16) * 10 + r.pick([0, 5]);
    if (k === 0) return { q: `一直線を 2つの 角に 分けました。 1つが ${x}度の とき、 もう1つは 何度？`, a: dg(180 - x), choices: ch(r, dg(180 - x), S([360 - x, x, 90 - x > 0 ? 90 - x : 190 - x, 180 - x + 10]).map(dg), nf(r, 180 - x, { step: 5, min: 5, max: 175, fmt: dg }), { loose: true }), how: ["一直線の 角は 180度", `180 − ${x} ＝ ${180 - x}`] };
    if (k === 1) return { q: `2本の 直線が 交わって できた 角です。 1つの 角が ${x}度の とき、 向かい合う 角は 何度？`, a: dg(x), choices: ch(r, dg(x), S([180 - x, 360 - x, x + 10, x - 5]).filter(s => +s > 0).map(dg), nf(r, x, { step: 5, min: 5, max: 175, fmt: dg }), { loose: true }), how: ["向かい合う 角は 同じ 大きさ", `答えは ${x}度`] };
    return { q: `2本の 直線が 交わって できた 角です。 1つの 角が ${x}度の とき、 となりの 角は 何度？`, a: dg(180 - x), choices: ch(r, dg(180 - x), S([x, 360 - x, 90 + x, 180 - x + 10]).map(dg), nf(r, 180 - x, { step: 5, min: 5, max: 175, fmt: dg }), { loose: true }), how: ["となりあう 2つの 角で 一直線 ＝ 180度", `180 − ${x} ＝ ${180 - x}`] };
  };
  const c2 = v => v + "cm²", cmL = v => v + "cm";
  g.menseki4d = (r, p) => {                                  // 面積：長方形／正方形／へんの 長さ／L字／m²と a
    const K = p.kind;
    if (K === "chou") { const a = r.range(2, 20), b = r.range(2, 20), s = a * b; if (a === b) return g.menseki4d(r, p);
      return { q: `たて ${a}cm、 よこ ${b}cmの 長方形の めんせきは？`, a: c2(s), choices: ch(r, c2(s), S([2 * (a + b), a + b, s + a, s - b]).map(c2), nf(r, s, { min: 4, max: 400, fmt: c2 }), { loose: true }), how: ["長方形の めんせき ＝ たて × よこ", `${a} × ${b} ＝ ${s}`, `答えは ${s}cm²`] }; }
    if (K === "sei") { const a = r.range(2, 20), s = a * a;
      return { q: `1つの へんが ${a}cmの 正方形の めんせきは？`, a: c2(s), choices: ch(r, c2(s), S([4 * a, 2 * a, s + a, s - a]).map(c2), nf(r, s, { min: 4, max: 400, fmt: c2 }), { loose: true }), how: ["正方形の めんせき ＝ 1つの へん × 1つの へん", `${a} × ${a} ＝ ${s}`] }; }
    if (K === "hen") { const a = r.range(2, 15), b = r.range(2, 15), s = a * b, askB = r.chance(0.5);
      const known = askB ? a : b, A = askB ? b : a;
      return { q: `めんせきが ${s}cm²で、 ${askB ? "たて" : "よこ"}が ${known}cmの 長方形の ${askB ? "よこ" : "たて"}は？`, a: cmL(A), choices: ch(r, cmL(A), S([s - known, A + 1, A - 1, A * 2, s / 2].filter(x => Number.isInteger(x) && x > 0 && x !== A)).map(cmL), nf(r, A, { min: 1, max: 60, fmt: cmL }), { loose: true }),
        how: ["たて × よこ ＝ めんせき", `${s} ÷ ${known} ＝ ${A}`, `答えは ${A}cm`] }; }
    if (K === "L") for (;;) {
      const a = r.range(5, 15), b = r.range(5, 15), c = r.range(2, a - 2), d = r.range(2, b - 2), s = a * b - c * d;
      return { q: `たて ${a}cm、 よこ ${b}cmの 長方形から、 かどの たて ${c}cm、 よこ ${d}cmの 長方形を 切りとった 形の めんせきは？`, a: c2(s), choices: ch(r, c2(s), S([a * b, a * b + c * d, s + c, s - d, (a - c) * (b - d)].filter(x => x !== s && x > 0)).map(c2), nf(r, s, { min: 4, max: 400, fmt: c2 }), { loose: true }),
        how: [`大きい 長方形：${a} × ${b} ＝ ${a * b}`, `切りとった 長方形：${c} × ${d} ＝ ${c * d}`, `${a * b} − ${c * d} ＝ ${s}`] };
    }
    for (;;) {                                                            // m² と a
      const a = r.range(1, 9) * 10, b = r.range(1, 9) * 10, s = a * b; if (s % 100) continue;
      const A = s / 100 + "a";
      return { q: `たて ${a}m、 よこ ${b}mの 畑の めんせきは 何a？`, a: A, choices: ch(r, A, S([s, s / 10, s / 1000 >= 1 && Number.isInteger(s / 1000) ? s / 1000 : s / 100 + 10, s / 100 + 1, (a + b) / 10]).filter(x => x + "a" !== A).map(x => x + "a"), nf(r, s / 100, { min: 1, max: 99, fmt: x => x + "a" }), { loose: true }),
        how: [`${a} × ${b} ＝ ${s}m²`, "100m² ＝ 1a", `${s} ÷ 100 ＝ ${s / 100} → ${A}`] };
    }
  };
  g.kimari4d = (r, p) => {                                   // 計算の きまり：( )／×÷を 先に／まじった 式／くふう
    const K = p.kind, R = (q, v, wr, how) => ({ q, a: String(v), choices: ch(r, v, S(wr.filter(x => Number.isInteger(x) && x >= 0 && x !== v)), nf(r, v, { min: 0, max: 2000 }), { loose: true }), how });
    if (K === "kakko") for (;;) {
      const k = r.int(3), a = r.range(2, 30), b = r.range(2, 20), c = r.range(2, 9);
      if (k === 0) { const v = (a + b) * c; return R(`(${a} + ${b}) × ${c}`, v, [a + b * c, v + c, v - c], ["( )の 中を 先に 計算する", `${a} ＋ ${b} ＝ ${a + b}`, `${a + b} × ${c} ＝ ${v}`]); }
      if (k === 1) { if (a <= b) continue; const v = c * (a - b); return R(`${c} × (${a} − ${b})`, v, [c * a - b, v + c, v - c], ["( )の 中を 先に 計算する", `${a} − ${b} ＝ ${a - b}`, `${c} × ${a - b} ＝ ${v}`]); }
      const q = r.range(2, 9), n = q * c + b; return R(`(${n} − ${b}) ÷ ${c}`, q, [n - Math.floor(b / c), q + 1, q * c], ["( )の 中を 先に 計算する", `${n} − ${b} ＝ ${n - b}`, `${n - b} ÷ ${c} ＝ ${q}`]);
    }
    if (K === "saki") for (;;) {
      const k = r.int(3), a = r.range(2, 40), b = r.range(2, 9), c = r.range(2, 9);
      if (k === 0) { const v = a + b * c; return R(`${a} + ${b} × ${c}`, v, [(a + b) * c, v + 1, v - 1], ["×を 先に 計算する", `${b} × ${c} ＝ ${b * c}`, `${a} ＋ ${b * c} ＝ ${v}`]); }
      if (k === 1) { const n = a + b * c, v = n - b * c; if (v <= 0) continue; return R(`${n} − ${b} × ${c}`, v, [(n - b) * c, v + c, v + 1], ["×を 先に 計算する", `${b} × ${c} ＝ ${b * c}`, `${n} − ${b * c} ＝ ${v}`]); }
      const v = a + b; return R(`${a} + ${b * c} ÷ ${c}`, v, [Number.isInteger((a + b * c) / c) ? (a + b * c) / c : v + c, v + 1, v - 1], ["÷を 先に 計算する", `${b * c} ÷ ${c} ＝ ${b}`, `${a} ＋ ${b} ＝ ${v}`]);
    }
    if (K === "mix") for (;;) {
      const a = r.range(2, 20), b = r.range(2, 20), c = r.range(2, 6), e = r.range(2, 9), f = r.range(2, 9), d = e * f, x = (a + b) * c, v = x - f;
      if (v <= 0) continue;
      return R(`(${a} + ${b}) × ${c} − ${d} ÷ ${e}`, v, [(x - d) / e, x - d, v + 1, a + b * c - f], ["( )の 中 → ×÷ → ＋− の じゅんに 計算する", `(${a} ＋ ${b}) × ${c} ＝ ${a + b} × ${c} ＝ ${x}`, `${d} ÷ ${e} ＝ ${f}`, `${x} − ${f} ＝ ${v}`]);
    }
    const k = r.int(3), m = r.range(3, 9);
    if (k === 0) { const v = 100 * m; return R(`25 × ${m} × 4`, v, [25 * m + 4, v + 25, v - 4], ["かける じゅんばんを かえても 答えは 同じ", "25 × 4 ＝ 100 を 先に", `100 × ${m} ＝ ${v}`]); }
    if (k === 1) { const t = r.pick([-2, -1, 1, 2]), n = 100 + t, v = n * m; return R(`${n} × ${m}`, v, [v + 10, v - 10, 100 * m, v + m], [`${n} を (100 ${t < 0 ? "−" : "＋"} ${Math.abs(t)}) と 考える`, `100 × ${m} ＝ ${100 * m}、 ${Math.abs(t)} × ${m} ＝ ${Math.abs(t) * m}`, `${100 * m} ${t < 0 ? "−" : "＋"} ${Math.abs(t) * m} ＝ ${v}`]); }
    const a = r.range(11, 89), b = 100 - a, v = 100 * m; return R(`${a} × ${m} + ${b} × ${m}`, v, [a + b * m, v + m, v - m, a * m], [`同じ ${m} を かけているので まとめる`, `(${a} ＋ ${b}) × ${m} ＝ 100 × ${m}`, `答えは ${v}`]);
  };
})(window.MH_GEN);
