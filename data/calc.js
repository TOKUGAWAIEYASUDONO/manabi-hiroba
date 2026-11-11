/* まなびひろば 計算問題の自動生成（計算スプリント・バトルモードで使う）
   学習指導要領の主な単元に合わせて、学年ごとに出す問題を決めている。

   学年 | 出す問題（単元）
   1年  | 20までのたし算／20までのひき算（くり上がり・くり下がりあり）
   2年  | 2けたのたし算／2けたのひき算／九九
   3年  | 3けたのたし算／3けたのひき算／わり算（九九の範囲・わり切れる）／2けた×1けた
   4年  | わり算（2けた÷1けた・商は2けた・わり切れる）／小数のたし算・ひき算（1/10・1/100の位）／3けた×2けた
   5年  | 小数×小数／小数÷整数（わり切れる）／分母がちがう分数のたし算・ひき算（4択）
   6年  | 分数×分数／分数÷分数（4択）

   - 小数は整数で計算してから文字にするので、0.1+0.2=0.30000000000000004 のような誤差は出ない。
   - 分数の答えは約分した形（例 6/8 → 3/4、4/4 → 1）。1より大きいときは仮分数（例 5/4）。
   - 分数の問題は 4択（ch に選択肢）。それ以外は数字を入力（a は数値）。
   - 単元の名前（UNITS）の漢字には《》で読みを付けてある（書き方は data/quizlib.js と同じ）。本文だけにするときは MH_CHOICE.plain
   - 検査：node tools/check-questions.js（学年ごとに200回ずつ作って答えを確かめる） */
window.MH_CALC = (function () {
  const UNITS = {
    1: { add20: "20までのたし算《ざん》", sub20: "20までのひき算《ざん》" },
    2: { add2: "2けたのたし算《ざん》", sub2: "2けたのひき算《ざん》", kuku: "九九《くく》" },
    3: { add3: "3けたのたし算《ざん》", sub3: "3けたのひき算《ざん》", div99: "わり算《ざん》（九九《くく》の範囲《はんい》）", mul21: "2けた×1けた" },
    4: { div21: "わり算《ざん》（2けた÷1けた）", decAdd: "小数《しょうすう》のたし算《ざん》", decSub: "小数《しょうすう》のひき算《ざん》", mul32: "3けた×2けた" },
    5: { decMul: "小数《しょうすう》×小数《しょうすう》", decDivInt: "小数《しょうすう》÷整数《せいすう》", fracAdd: "分数《ぶんすう》のたし算《ざん》（分母《ぶんぼ》がちがう）", fracSub: "分数《ぶんすう》のひき算《ざん》（分母《ぶんぼ》がちがう）" },
    6: { fracMul: "分数《ぶんすう》×分数《ぶんすう》", fracDiv: "分数《ぶんすう》÷分数《ぶんすう》" }
  };
  // 出やすさ（重み）。むずかしい単元は少なめ
  const WEIGHT = { mul32: 1, decAdd: 2, decSub: 2, div21: 2 };

  const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a || 1; };
  // 整数 n を 10^p でわった小数の文字（例 dec(322,2) → "3.22"、dec(300,2) → "3"）
  function dec(n, p) {
    if (!p) return String(n);
    const s = String(Math.abs(n)).padStart(p + 1, "0");
    let t = s.slice(0, -p) + "." + s.slice(-p);
    t = t.replace(/0+$/, "").replace(/\.$/, "");
    return (n < 0 ? "-" : "") + t;
  }
  // 約分した分数の文字（整数になるときは整数）
  function frac(n, d) { const k = gcd(n, d); n /= k; d /= k; return d === 1 ? String(n) : n + "/" + d; }
  const val = s => { const [n, d] = String(s).split("/").map(Number); return n / (d || 1); };

  // 分数の4択：まちがえやすい答え（候補）から3つ、足りなければ分子・分母を少しずらす
  function fracChoices(ans, cands, shuffle) {
    const out = [ans], av = val(ans);
    const ok = s => s && !out.includes(s) && val(s) > 0 && Math.abs(val(s) - av) > 1e-9 && !/\/1$/.test(s);
    for (const s of shuffle(cands)) { if (out.length >= 4) break; if (ok(s)) out.push(s); }
    const [n, d] = ans.split("/").map(Number), dd = d || 1;
    const more = [[n + 1, dd], [n - 1, dd], [n, dd + 1], [n + 2, dd], [n, dd + 2], [n * 2, dd + 1], [n + 3, dd + 1]];
    for (const [a, b] of more) { if (out.length >= 4) break; if (a > 0 && b > 0) { const s = frac(a, b); if (ok(s)) out.push(s); } }
    return shuffle(out);
  }

  function pickUnit(g, rnd) {
    const keys = Object.keys(UNITS[g]), w = keys.map(k => WEIGHT[k] || 2);
    let r = rnd(w.reduce((a, b) => a + b, 0));
    for (let i = 0; i < keys.length; i++) { if ((r -= w[i]) < 0) return keys[i]; }
    return keys[0];
  }

  // rnd(n): 0〜n-1 の整数。shuffle(a): 並べかえた新しい配列
  function make(g, rnd, shuffle, unit) {
    g = UNITS[g] ? g : 1;
    const r = (a, b) => a + rnd(b - a + 1);
    const u = unit || pickUnit(g, rnd);
    const base = { unit: u, small: "= ?" };
    const num = d => { let a; do { a = r(1, d - 1); } while (gcd(a, d) !== 1); return a; };   // 約分できない分子
    switch (u) {
      case "add20": {                       // 1けた+1けた（くり上がりあり）か 10いくつ+1けた
        if (rnd(2)) { const a = r(1, 9), b = r(1, 9); return { ...base, q: `${a} + ${b}`, a: a + b }; }
        const a = r(10, 18), b = r(1, 20 - a); return { ...base, q: `${a} + ${b}`, a: a + b };
      }
      case "sub20": {
        const a = r(2, 20), b = r(1, Math.min(9, a - 1)); return { ...base, q: `${a} − ${b}`, a: a - b };
      }
      case "add2": { const a = r(10, 89), b = r(10, 89); return { ...base, q: `${a} + ${b}`, a: a + b }; }
      case "sub2": { const a = r(21, 99), b = r(10, a - 1); return { ...base, q: `${a} − ${b}`, a: a - b }; }
      case "kuku": { const a = r(1, 9), b = r(1, 9); return { ...base, q: `${a} × ${b}`, a: a * b }; }
      case "add3": { const a = r(100, 899), b = r(100, 899); return { ...base, q: `${a} + ${b}`, a: a + b }; }
      case "sub3": { const a = r(201, 999), b = r(100, a - 1); return { ...base, q: `${a} − ${b}`, a: a - b }; }
      case "div99": { const b = r(2, 9), c = r(1, 9); return { ...base, q: `${b * c} ÷ ${b}`, a: c }; }
      case "mul21": { const a = r(11, 99), b = r(2, 9); return { ...base, q: `${a} × ${b}`, a: a * b }; }
      case "div21": { const b = r(2, 9), c = r(10, Math.floor(99 / b)); return { ...base, q: `${b * c} ÷ ${b}`, a: c }; }
      case "decAdd": case "decSub": {
        const p = rnd(3) ? 1 : 2, m = Math.pow(10, p);        // 1/10の位（多め）か 1/100の位
        let a = r(1, 9 * m), b = r(1, 9 * m);
        if (a % 10 === 0) a++; if (b % 10 === 0) b++;              // 小数点以下が0にならないように
        if (u === "decSub") { if (a === b) a++; if (a < b) [a, b] = [b, a]; return { ...base, q: `${dec(a, p)} − ${dec(b, p)}`, a: Number(dec(a - b, p)) }; }
        return { ...base, q: `${dec(a, p)} + ${dec(b, p)}`, a: Number(dec(a + b, p)) };
      }
      case "mul32": { const a = r(101, 499), b = r(11, 39); return { ...base, q: `${a} × ${b}`, a: a * b }; }
      case "decMul": {                     // 1.1〜4.9 × 1.1〜2.9（0.1の位どうし）
        let a = r(11, 49), b = r(11, 29); if (a % 10 === 0) a++; if (b % 10 === 0) b++;
        return { ...base, q: `${dec(a, 1)} × ${dec(b, 1)}`, a: Number(dec(a * b, 2)) };
      }
      case "decDivInt": {                  // 例 7.2 ÷ 3 = 2.4
        let b, c; do { b = r(2, 9); c = r(11, 49); } while (c % 10 === 0 || (b * c) % 10 === 0);
        return { ...base, q: `${dec(b * c, 1)} ÷ ${b}`, a: Number(dec(c, 1)) };
      }
      case "fracAdd": case "fracSub": {
        let b, d; do { b = r(2, 9); d = r(2, 9); } while (b === d);
        let a = num(b), c = num(d);
        if (u === "fracSub" && a * d < c * b) { [a, b, c, d] = [c, d, a, b]; }
        if (u === "fracSub" && a * d === c * b) return make(g, rnd, shuffle, u);
        const sub = u === "fracSub", n = sub ? a * d - c * b : a * d + c * b, ans = frac(n, b * d);
        const op = sub ? "−" : "+", cands = [
          frac(sub ? Math.abs(a - c) : a + c, sub ? Math.abs(b - d) || 1 : b + d),   // 分子どうし・分母どうし
          frac(sub ? Math.abs(a - c) : a + c, Math.max(b, d)),                        // 分母をそろえずに分子だけ
          frac(sub ? n + 1 : n - 1, b * d), frac(n + 1, b * d), frac(a * c, b * d)
        ];
        return { unit: u, small: "答《こた》えを4つからえらぼう", q: `${a}/${b} ${op} ${c}/${d}`, a: ans, ch: fracChoices(ans, cands, shuffle) };
      }
      case "fracMul": case "fracDiv": {
        const b = r(2, 9), d = r(2, 9), a = num(b), c = num(d), div = u === "fracDiv";
        const ans = div ? frac(a * d, b * c) : frac(a * c, b * d);
        const cands = div
          ? [frac(a * c, b * d), frac(b * c, a * d), frac(a + d, b + c), frac(a * d + 1, b * c)]   // ひっくり返し忘れ・逆数 など
          : [frac(a * d, b * c), frac(a + c, b + d), frac(a * c, b + d), frac(a * c + 1, b * d)];
        return { unit: u, small: "答《こた》えを4つからえらぼう", q: `${a}/${b} ${div ? "÷" : "×"} ${c}/${d}`, a: ans, ch: fracChoices(ans, cands, shuffle) };
      }
    }
    return make(g, rnd, shuffle, Object.keys(UNITS[g])[0]);
  }
  return { UNITS, make, frac, dec };
})();
