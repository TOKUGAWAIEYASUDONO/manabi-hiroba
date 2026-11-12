/* 図なしで解ける教科書単元の問題型。 */
(function (G) {
  const g = G.gens, { ch, numFb } = G;
  const pick = (r, a, wrong, min, max, loose) => ch(r, a, wrong.map(String), numFb(r, +a, { min, max }), { loose });
  g.ordinal1 = r => {
    const n = r.range(2, 9), before = n - 1;
    return { q: `まえに ${before}人 います。つぎの 人は まえから なんばんめ？`, a: String(n), choices: pick(r, n, [before, n + 1, before - 1], 1, 10, true) };
  };
  g.compareMeasure1 = (r, p) => {
    const x = r.range(2, 15), y = r.range(2, 15), a = Math.max(x, y), unit = p.kind === "capacity" ? "コップ" : "つみき";
    if (x === y) return g.compareMeasure1(r, p);
    return { q: `おなじ ${unit}で くらべます。あおは ${x}こ、あかは ${y}こ。おおい ほうは なんこ？`, a: String(a), choices: pick(r, a, [Math.min(x, y), a + 1, a - 1], 1, 20, true) };
  };
  g.groupAdd2 = r => {
    const a = r.range(2, 8), b = r.range(2, 9), c = 10 - a, n = a + b + c;
    return { q: `${a} + ${b} + ${c}`, a: String(n), choices: pick(r, n, [a + b, b + c, n - 1, n + 1], 10, 27) };
  };
  g.timeCalc3 = r => {
    const start = r.range(1, 45), duration = r.range(5, 59 - start), end = start + duration;
    return { q: `9時${start}分から 9時${end}分まで なんぷん？`, a: String(duration), choices: pick(r, duration, [end, start, duration + 5, duration - 5], 1, 60, true) };
  };
  g.mental3 = r => {
    const a = r.range(12, 79) * 10, b = r.range(1, 9) * 10, n = a + b;
    return { q: `${a} + ${b}`, a: String(n), choices: pick(r, n, [a + b / 10, n + 100, n - 100, a - b], 100, 999) };
  };
  g.largeDiv3 = r => {
    const d = r.range(2, 9), q = r.range(2, 9) * 10, n = d * q;
    return { q: `${n} ÷ ${d}`, a: String(q), choices: pick(r, q, [q / 10, q + 10, q - 10, n / 10], 10, 90) };
  };
  g.divEstimate4 = r => {
    const d = r.range(2, 9) * 10, q = r.range(2, 9), n = d * q, actual = n + r.range(-4, 4);
    return { q: `${actual} ÷ ${d} の 商を みつもると およそ いくつ？`, a: String(q), choices: pick(r, q, [q + 1, q - 1, q * 10, d / 10], 1, 99, true) };
  };
  g.placeValue5 = r => {
    const x = r.range(11, 99), a = x, v = (x / 10).toFixed(1);
    return { q: `${v}を 10倍すると いくつ？`, a: String(a), choices: pick(r, a, [x * 10, x + 10, x - 10, x + 1], 1, 999) };
  };
  g.approxVolume6 = r => {
    const x = r.range(3, 10), y = r.range(3, 10), volume = r.chance(0.5), z = volume ? r.range(2, 8) : 1, n = x * y * z, u = volume ? "cm³" : "cm²";
    const q = volume ? `形を 直方体と みなします。たて およそ ${x}cm、よこ およそ ${y}cm、高さ およそ ${z}cm。体積は およそ 何cm³？` : `形を 長方形と みなします。たて およそ ${x}cm、よこ およそ ${y}cm。面積は およそ 何cm²？`;
    return { q, a: `${n}${u}`, choices: ch(r, `${n}${u}`, [x + y + z, x * y, n + x, n * 2].map(v => `${v}${u}`), numFb(r, n, { min: 1, max: 1000, fmt: v => `${v}${u}` }), { loose: true }) };
  };
})(window.MH_GEN);
