/* まなびひろば 問題の型（ジェネレーター）の共通部品
   - window.MH_GEN.gens[名前] = function (rng, params) → { q, a, choices, tag?, ans?, hissan?, ruby?, stem? }
   - rng はシード付き乱数：rng.int(n)=0〜n-1／rng.range(a,b)=a〜b／rng.pick(配列)／rng.shuffle(配列)／rng.chance(0〜1)
     同じシードなら同じ問題（別タブやリンクで同じ問題を出せる）
   - 選択肢（choices）は ch() で作る：正解と同じ形・桁にそろえ、重複なし。まちがいは「よくある間違い」を先に、足りない分は数をずらして補う
   - 読み込み順：core.js → 各学年の型 → data/units.js
   ※ index.html にはまだ組み込まない（組み込みは別担当）。file:// で動くよう、グローバル変数に置く形式 */
window.MH_GEN = (function () {
  const gens = {};
  // ---------- シード付き乱数（mulberry32） ----------
  function hashSeed(s) {                                   // 文字・数 → 32ビット整数
    s = String(s); let h = 2166136261 >>> 0;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return h >>> 0;
  }
  function rng(seed) {
    let t = hashSeed(seed);
    const next = () => { t = (t + 0x6D2B79F5) >>> 0; let x = t; x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
    const r = { next };
    r.int = n => Math.floor(next() * n);
    r.range = (a, b) => a + r.int(b - a + 1);
    r.pick = a => a[r.int(a.length)];
    r.chance = p => next() < p;
    r.shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = r.int(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    return r;
  }
  // ---------- 数の部品 ----------
  const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a || 1; };
  const lcm = (a, b) => a / gcd(a, b) * b;
  // 整数 n を 10^p でわった小数の文字（小数点以下の0は消す。例 dec(322,2)="3.22"、dec(300,2)="3"）
  function dec(n, p) {
    if (!p) return String(n);
    const s = String(Math.abs(n)).padStart(p + 1, "0");
    const t = (s.slice(0, -p) + "." + s.slice(-p)).replace(/0+$/, "").replace(/\.$/, "");
    return (n < 0 ? "-" : "") + t;
  }
  // 約分した分数の文字（整数になるときは整数）
  function frac(n, d) { const k = gcd(n, d); n /= k; d /= k; return d === 1 ? String(n) : n + "/" + d; }
  const digits = n => String(n).split("").map(Number);
  const fromDigits = a => Number(a.join(""));
  // くり上がりを忘れた足し算／くり下がりを忘れた引き算（位ごとに計算）
  function noCarry(a, b) { const x = String(a).padStart(String(b).length, "0").split("").reverse(), y = String(b).padStart(String(a).length, "0").split("").reverse(); return Number(x.map((d, i) => (+d + +y[i]) % 10).reverse().join("")); }
  function noBorrow(a, b) { const x = String(a).padStart(String(b).length, "0").split("").reverse(), y = String(b).padStart(String(a).length, "0").split("").reverse(); return Number(x.map((d, i) => Math.abs(+d - +y[i])).reverse().join("")); }

  // ---------- 選択肢 ----------
  // 「形」：数字のならびを桁数つきで見る（数が1つだけの文字は桁数、2つ以上は # に）
  function sigOf(s, loose) {
    s = String(s);
    if (loose) return s.replace(/\d+/g, "#");
    const runs = s.match(/\d+/g) || [];
    return runs.length === 1 ? s.replace(/\d+/, m => "d" + m.length) : s.replace(/\d+/g, "#");
  }
  /* ch(rng, 正解, まちがい候補[], 補う候補[], {loose}) → 正解を含む4つ（並べかえ済み）
     まちがい候補は「よくある間違い」。正解と同じ形のものだけ使い、足りなければ補う候補から */
  function ch(r, ans, wrongs, fb, o) {
    o = o || {}; const A = String(ans), out = [A], want = sigOf(A, o.loose);
    const lists = [r.shuffle((wrongs || []).filter(x => x != null)), (fb || []).filter(x => x != null)];
    const neg = /^-/.test(A);
    for (const pass of [s => sigOf(s, o.loose) === want, s => sigOf(s, true) === sigOf(A, true)]) {
      for (const L of lists) for (const c0 of L) {
        const c = String(c0);
        if (out.length >= 4) break;
        if (!c || out.includes(c) || (!neg && /(^|[^\d])-\d/.test(c)) || /NaN|Infinity/.test(c)) continue;
        if (pass(c)) out.push(c);
      }
    }
    if (out.length < 4) throw new Error("選択肢が足りない: " + A + " / " + JSON.stringify(wrongs));
    return r.shuffle(out);
  }
  /* numFb(rng, 整数n, {step, min, max, fmt, ok}) → n の近くの数（表示用の文字）のならび。ch の「補う候補」に使う */
  function numFb(r, n, o) {
    o = o || {}; const st = o.step || 1, fmt = o.fmt || String, mn = o.min == null ? 0 : o.min, mx = o.max == null ? Infinity : o.max;
    const ds = [...r.shuffle([1, -1, 2, -2, 3, -3]), ...r.shuffle([10, -10, 5, -5, 4, -4, 20, -20]), ...r.shuffle([100, -100, 50, -50, 30, -30, 7, -7, 1000, -1000])];
    const seen = new Set([n]), res = [];
    for (const d of ds) { const v = n + d * st; if (v < mn || v > mx || seen.has(v) || (o.ok && !o.ok(v))) continue; seen.add(v); res.push(fmt(v)); }
    return res;
  }
  const comma = n => String(n);   // 3けた区切りのコンマは使わない（教科書にならう）
  return { gens, rng, hashSeed, gcd, lcm, dec, frac, digits, fromDigits, noCarry, noBorrow, ch, numFb, sigOf, comma };
})();
