/* 図なしで解ける教科書単元の問題型。 */
(function (G) {
  const g = G.gens, { ch, numFb } = G;
  const pick = (r, a, wrong, min, max, loose) => ch(r, a, wrong.map(String), numFb(r, +a, { min, max }), { loose });
  g.ordinal1 = r => {
    const n = r.range(2, 8), mode = r.int(3), answer = mode === 0 ? n + 1 : mode === 1 ? n - 1 : 10 - n + 1;
    const q = mode === 0 ? `まえに ${n}人 います。つぎの 人は まえから なんばんめ？` : mode === 1 ? `まえから ${n}ばんめの 人の まえには なん人？` : `10人の れつで まえから ${n}ばんめ。うしろから なんばんめ？`;
    return { q, a: String(answer), choices: pick(r, answer, [answer + 1, answer - 1, n], 1, 10, true), picture: {kind:"line", count:mode===2?10:Math.min(10,n+1), target:mode===0?n+1:n} };
  };
  g.compareMeasure1 = (r, p) => {
    const x = r.range(2, 9), y = r.range(2, 9), a = Math.max(x, y), unit = p.kind === "capacity" ? "コップ" : "テープ";
    if (x === y) return g.compareMeasure1(r, p);
    if (r.chance(0.5)) return {q:p.kind === "capacity" ? "どっちが おおい？" : "どっちが ながい？", a:x>y?"あお":"あか", ans:"choice4", choices:[x>y?"あお":"あか",x>y?"あか":"あお",String(a),String(Math.min(x,y))], picture:p.kind==="capacity"?{kind:"cups",blue:x,red:y}:{kind:"tapes",blue:x,red:y}};
    const q = p.kind === "capacity" ? `おなじ コップで くらべます。あおは コップ ${x}はいぶん、あかは コップ ${y}はいぶん。おおい ほうは コップ なんはいぶん？` : `テープを ますで くらべます。あおは ${x}こぶん、あかは ${y}こぶん。ながい ほうは ます なんこぶん？`;
    return { q, a: String(a), choices: pick(r, a, [Math.min(x, y), a + 1, a - 1], 1, 20, true), picture:p.kind==="capacity"?{kind:"cups",blue:x,red:y}:{kind:"tapes",blue:x,red:y,segmented:true} };
  };
  g.groupAdd2 = r => {
    const a = r.range(2, 8), b = r.range(2, 9), c = 10 - a, n = a + b + c;
    return { q: `${a} + ${b} + ${c}`, a: String(n), choices: pick(r, n, [a + b, b + c, n - 1, n + 1], 10, 27) };
  };
  g.timeCalc3 = r => {
    const start = r.range(15, 55), duration = r.range(10, 60), end = start + duration, hour = r.range(8, 15);
    const clock = m => { const h=hour+Math.floor(m/60); return `${h<12?"午前":"午後"} ${h>12?h-12:h}時${m%60}分`; };
    if (r.chance(0.5)) return { q: `${clock(start)}から ${clock(end)}まで 何分《なんぷん》？`, a: String(duration), choices: pick(r, duration, [end % 60, start, duration + 10, duration - 10], 1, 90, true) };
    return { q: `${clock(start)}の ${duration}分後は 何《なん》時《じ》何《なん》分《ぷん》？`, a: clock(end), ans: "choice4", choices: ch(r, clock(end), [clock(start + duration + 10), clock(start + duration - 10), clock(start + duration + 60), clock(start)], [], { loose: true }) };
  };
  g.mental3 = r => {
    const a = r.range(30, 89), b = r.range(11, Math.min(39, a - 10)), minus = r.chance(0.5), n = minus ? a - b : a + b;
    return { q: `${a} ${minus ? "−" : "+"} ${b}`, a: String(n), choices: pick(r, n, [minus ? a + b : a - b, n + 10, n - 10, n + 1], 10, 129, true) };
  };
  g.largeDiv3 = r => {
    const d = r.range(2, 9), q = r.range(2, 9) * 10, n = d * q;
    return { q: `${n} ÷ ${d}`, a: String(q), choices: pick(r, q, [q / 10, q + 10, q - 10, n / 10], 10, 90) };
  };
  g.divEstimate4 = r => {
    const d = r.range(2, 9) * 10, q = r.range(2, 9), rounded = d * q, actual = rounded + r.range(1, Math.min(4, d - 1));
    return { q: `${actual}を ${rounded}と みて、${actual} ÷ ${d} の 商《しょう》は およそ いくつ？`, a: String(q), choices: pick(r, q, [q + 1, q - 1, q * 10, d / 10], 1, 99, true) };
  };
  g.placeValue5 = r => {
    const x = r.range(11, 99), kind = r.int(4), factor = [10, 100, 10, 100][kind], source = kind < 2 ? G.dec(x, 1) : String(x);
    const answer = kind < 2 ? G.dec(x * factor, 1) : G.dec(x, Math.log10(factor));
    const fmt = v => kind < 2 ? G.dec(v * factor, 1) : G.dec(v, Math.log10(factor));
    return { q: `${source}を ${kind < 2 ? factor + "倍" : "1/" + factor}にすると いくつ？`, a: answer, ans: "choice4", choices: ch(r, answer, [fmt(x + 1), fmt(x - 1), fmt(x + 2), fmt(x - 2)], [], { loose: true }) };
  };
  g.approxVolume6 = r => {
    const x = r.range(3, 10), y = r.range(3, 10), volume = r.chance(0.5), z = volume ? r.range(2, 8) : 1, n = x * y * z, u = volume ? "cm³" : "cm²";
    const q = volume ? `形を 直方体と みなします。たて およそ ${x}cm、よこ およそ ${y}cm、高さ およそ ${z}cm。体積は およそ 何cm³？` : `形を 長方形と みなします。たて およそ ${x}cm、よこ およそ ${y}cm。面積は およそ 何cm²？`;
    return { q, a: `${n}${u}`, choices: ch(r, `${n}${u}`, [x + y + z, x * y, n + x, n * 2].map(v => `${v}${u}`), numFb(r, n, { min: 1, max: 1000, fmt: v => `${v}${u}` }), { loose: true }) };
  };
})(window.MH_GEN);

