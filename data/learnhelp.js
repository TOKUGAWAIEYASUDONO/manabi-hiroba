/* まなびの たすけ（2026-11-25）。画面には 依存しない。tools/test-learnhelp.js で 検査する。
   ねらいは「ちゃんと わかって、おぼえる」こと。4択を でたらめに おして すすむのを ふせぎ、わからない子を たすける。
   ・はやすぎる まちがい：問題が 出てから FAST_MS より はやく まちがえるのが FAST_N 回 つづいたら、ひと休み（FAST_REST）
   ・あとで もう一度：まちがえた（△・×）問題を、RE_MIN〜RE_MAX 問 あとに もう一度 出す（1問 1回だけ）
   ・この問題の とき方：たし算・ひき算・かけ算・わり算（整数）を、その問題の 数で 1行ずつ 説明する。
     作れない問題（小数・分数・文章題など）は null（画面は 単元の れいだいを 出す）
   ・つまずき：同じ 単元で × が STUCK_N 回 つづいたら 声を かける。ひとつ やさしい ステップ（同じ series の 前の step）を さがす */
(function (root) {
  const LH = { FAST_MS: 600, FAST_N: 2, FAST_REST: 2000, RETRY_REST: 1500, RE_MIN: 3, RE_MAX: 5, STUCK_N: 3 };

  /* はやすぎる まちがい。n：いままでの つづいた 回数。はやい まちがいで +1、ゆっくり こたえたら 0、はやい せいかいは そのまま */
  LH.fast = function (n, ms, right) {
    n = n | 0;
    if (!(ms >= 0)) return { n, rest: false };
    if (ms >= LH.FAST_MS) return { n: 0, rest: false };
    if (right) return { n, rest: false };
    n++;
    return n >= LH.FAST_N ? { n: 0, rest: true } : { n, rest: false };
  };

  /* あとで もう一度。q：[{item,due}]。shown：いままでに 出した 問題の 数。rnd：0〜1 の 乱数 */
  LH.reAdd = function (q, item, shown, rnd) {
    if (!Array.isArray(q) || item == null || q.some(e => e.item === item)) return q;
    const span = LH.RE_MAX - LH.RE_MIN + 1, r = typeof rnd === "number" && rnd >= 0 && rnd < 1 ? rnd : 0.5;
    q.push({ item, due: (shown | 0) + LH.RE_MIN + Math.floor(r * span) });
    return q;
  };
  LH.rePop = function (q, shown) {
    if (!Array.isArray(q)) return null;
    let best = -1;
    for (let i = 0; i < q.length; i++) if (q[i].due <= shown && (best < 0 || q[i].due < q[best].due)) best = i;
    return best < 0 ? null : q.splice(best, 1)[0].item;
  };

  /* つまずき：同じ 単元で × が つづいた 数。○ で 0 にもどす（△は そのまま） */
  LH.stuck = function (st, uid, mark) {
    st = st && typeof st === "object" ? st : {};
    if (!uid) return { st, ask: false };
    if (mark === "○") { st[uid] = 0; return { st, ask: false }; }
    if (mark !== "×") return { st, ask: false };
    st[uid] = (st[uid] | 0) + 1;
    if (st[uid] >= LH.STUCK_N) { st[uid] = 0; return { st, ask: true }; }
    return { st, ask: false };
  };
  /* ひとつ やさしい ステップ：同じ 教科・同じ series で、step が 1つ 小さい 単元（同じ 学年を さきに） */
  LH.easier = function (u, all) {
    if (!u || !u.series || !(u.step > 1) || !Array.isArray(all)) return null;
    const c = all.filter(x => x && x.id !== u.id && x.subj === u.subj && x.series === u.series && x.step === u.step - 1 && x.status !== "later");
    if (!c.length) return null;
    return c.find(x => x.g === u.g) || c.sort((a, b) => Math.abs(a.g - u.g) - Math.abs(b.g - u.g) || b.g - a.g)[0];
  };

  /* ---- この問題の とき方 ---- */
  const PL = ["一のくらい", "十のくらい", "百のくらい", "千のくらい", "一万のくらい", "十万のくらい"];
  const OPS = { "+": "+", "＋": "+", "-": "−", "−": "−", "ー": "−", "×": "×", "x": "×", "÷": "÷" };
  const SYM = { "+": "＋", "−": "−", "×": "×", "÷": "÷" };
  const MAXN = 999999;
  const digs = n => String(n).split("").reverse().map(Number);
  const isInt = s => /^\d{1,6}$/.test(String(s));

  /* 問題文から 式を よむ：「8 + 5」「2 + 3 + 4」「17 ÷ 5」。数は 整数だけ（小数・分数・□ は よまない） */
  LH.parse = function (q, hissan) {
    if (hissan && isInt(hissan.a) && isInt(hissan.b) && OPS[String(hissan.op)]) {
      return { nums: [+hissan.a, +hissan.b], ops: [OPS[String(hissan.op)]] };
    }
    const s = String(q || "").replace(/[《][^》]*[》]/g, "").replace(/[｜|]/g, "").replace(/[０-９]/g, d => String.fromCharCode(d.charCodeAt(0) - 0xFEE0)).replace(/\s*[=＝]\s*[?？□]?\s*$/, "").trim();
    const m = s.match(/^(\d{1,6})((?:\s*[+＋\-−ー×x÷]\s*\d{1,6})+)$/);
    if (!m) return null;
    const nums = [+m[1]], ops = [];
    const re = /\s*([+＋\-−ー×x÷])\s*(\d{1,6})/g; let t;
    while ((t = re.exec(m[2]))) { ops.push(OPS[t[1]]); nums.push(+t[2]); }
    if (ops.length > 1 && ops.some(o => o === "×" || o === "÷")) return null;      // まぜた 式（×÷ と ＋− の じゅんばん）は 説明しない
    return { nums, ops };
  };

  function addLines(a, b) {
    const s = a + b;
    if (a < 10 && b < 10) {
      if (s <= 10) {
        if (b <= 5 && b > 0) { const seq = []; for (let i = 1; i <= b; i++) seq.push(a + i); return [`${a} の つぎから ${b}こ かぞえる：${seq.join("、")}`]; }
        return [`${a} と ${b} を あわせて ${s}`];
      }
      const big = Math.max(a, b), small = Math.min(a, b), k = 10 - big, L = [];
      if (a < b) L.push(`じゅんばんを かえても おなじ：${big} ＋ ${small}`);
      L.push(`${big} は あと ${k} で 10`, `${small} を ${k} と ${small - k} に わける`, `${big} ＋ ${k} ＝ 10、10 ＋ ${small - k} ＝ ${s}`);
      return L;
    }
    const A = digs(a), B = digs(b), L = [`一のくらいから じゅんに たす`];
    let c = 0;
    for (let i = 0; i < Math.max(A.length, B.length); i++) {
      const x = A[i] || 0, y = B[i] || 0, v = x + y + c;
      if (i >= B.length && i >= A.length) break;
      const left = i >= B.length ? `${x}` : i >= A.length ? `${y}` : `${x} ＋ ${y}`;
      L.push(`${PL[i]}：${left}${c ? " ＋ 1（くりあがり）" : ""} ＝ ${v}${v >= 10 ? ` → ${v % 10} を かいて、1 くりあげる` : ""}`);
      c = v >= 10 ? 1 : 0;
    }
    if (c) L.push(`${PL[Math.max(A.length, B.length)]}：くりあがりの 1`);
    return L;
  }
  function subLines(a, b) {
    const d = a - b;
    if (a <= 10 && b <= 10) return [`${a} から ${b} とると、のこりは ${d}`];
    if (a < 20 && b < 10 && a % 10 < b) {
      const o = a - 10;
      return [`${a} を 10 と ${o} に わける`, `10 − ${b} ＝ ${10 - b}`, `${10 - b} ＋ ${o} ＝ ${d}`];
    }
    const A = digs(a), B = digs(b), L = [`一のくらいから じゅんに ひく`];
    let bo = 0;
    for (let i = 0; i < A.length; i++) {
      const top = A[i], y = B[i] || 0, has = i < B.length, t = top - bo, need = t < y, r = (need ? t + 10 : t) - y;
      const pre = bo && top > 0 ? `${top} は となりに 1 かしたので ${t}` : "";
      let line;
      if (bo && top === 0) line = `0 は となりに かしたので、さらに となりから かりて 9${has ? ` − ${y} ＝ ${r}` : " を おろす"}`;
      else if (need) line = `${pre ? pre + "。" : ""}${t} から ${y} は ひけないので、となりから 10 かりて ${t + 10} − ${y} ＝ ${r}`;
      else if (has) line = `${pre ? pre + "、" : ""}${t} − ${y} ＝ ${r}`;
      else if (i === A.length - 1 && r === 0) line = pre ? `${pre}（なにも かかない）` : null;
      else line = `${pre ? pre + "、" : ""}${t} を おろす`;
      if (line) L.push(`${PL[i]}：${line}`);
      bo = need ? 1 : 0;
    }
    return L;
  }
  function mulLines(a, b) {
    const p = a * b;
    if (a < 10 && b < 10) {
      const L = [`${a} の だん：${a} × ${b} ＝ ${p}`];
      if (b >= 2 && b <= 5) L.push(`${a} を ${b}回 たす：${Array(b).fill(a).join(" ＋ ")} ＝ ${p}`);
      return L;
    }
    const L = [];
    if (b >= 10 && a < 10) { L.push(`じゅんばんを かえても おなじ：${b} × ${a}`); [a, b] = [b, a]; }
    if (b < 10) {
      const A = digs(a); let c = 0; L.push(`一のくらいから じゅんに ${b} を かける`);
      for (let i = 0; i < A.length; i++) {
        const v = A[i] * b + c, last = i === A.length - 1;
        L.push(`${PL[i]}：${A[i]} × ${b}${c ? ` ＋ ${c}（くりあがり）` : ""} ＝ ${v}${!last && v >= 10 ? ` → ${v % 10} を かいて、${Math.floor(v / 10)} くりあげる` : ""}`);
        c = Math.floor(v / 10);
      }
      return L;
    }
    const B = digs(b), parts = [];
    for (let i = 0; i < B.length; i++) {
      if (!B[i]) continue;
      const m = B[i] * 10 ** i; parts.push(a * m);
      L.push(`${a} × ${m} ＝ ${a * m}`);
    }
    if (parts.length > 1) L.push(`あわせる：${parts.join(" ＋ ")} ＝ ${p}`);
    return L;
  }
  function divLines(a, b) {
    if (!b) return null;
    const q = Math.floor(a / b), r = a % b;
    if (q < 10) {
      if (!r) return [`${b} × □ ＝ ${a} の □ を さがす（${b} の だん）`, `${b} × ${q} ＝ ${a}`];
      return [`${b} × □ が ${a} を こえない、いちばん おおきい □ を さがす（${b} の だん）`,
        `${b} × ${q} ＝ ${b * q}（${b} × ${q + 1} ＝ ${b * (q + 1)} は おおきすぎる）`, `${a} − ${b * q} ＝ ${r} が あまり`];
    }
    const A = String(a).split("").map(Number), L = [`上の くらいから「たてる・かける・ひく・おろす」`];
    let cur = 0, started = false;
    for (let i = 0; i < A.length; i++) {
      cur = cur * 10 + A[i];
      if (!started && cur < b && i < A.length - 1) continue;
      started = true;
      const d = Math.floor(cur / b), rest = cur - b * d;
      L.push(`${cur} ÷ ${b} → ${d} を たてる、${b} × ${d} ＝ ${b * d}、${cur} − ${b * d} ＝ ${rest}${i < A.length - 1 ? `、つぎの ${A[i + 1]} を おろす` : ""}`);
      cur = rest;
    }
    if (L.length > 6) return null;      // ながすぎる 説明は 出さない
    return L;
  }
  function solve(nums, ops) {
    if (nums.some(n => !(n >= 0 && n <= MAXN))) return null;
    if (ops.length > 1) {      // ＋−だけの 3つ いじょうの 式：左から じゅんに
      let v = nums[0]; const L = [`左から じゅんに けいさんする`];
      for (let i = 0; i < ops.length; i++) {
        const w = ops[i] === "+" ? v + nums[i + 1] : v - nums[i + 1];
        if (w < 0) return null;
        L.push(`${v} ${SYM[ops[i]]} ${nums[i + 1]} ＝ ${w}`); v = w;
      }
      return { lines: L, ans: [v] };
    }
    const [a, b] = nums, op = ops[0];
    if (op === "+") return { lines: addLines(a, b), ans: [a + b] };
    if (op === "−") return a >= b ? { lines: subLines(a, b), ans: [a - b] } : null;
    if (op === "×") return { lines: mulLines(a, b), ans: [a * b] };
    if (op === "÷") { const L = divLines(a, b); return L ? { lines: L, ans: a % b ? [Math.floor(a / b), a % b] : [a / b] } : null; }
    return null;
  }
  const ansTxt = v => v.length > 1 ? `${v[0]} あまり ${v[1]}` : `${v[0]}`;
  /* こたえ（a）の 数と 合うときだけ 説明を 出す（まちがった 説明を 出さないため）。a は「13」「3 あまり 2」「3|2」など */
  LH.howTo = function (q, hissan, a) {
    const e = LH.parse(q, hissan); if (!e) return null;
    const r = solve(e.nums, e.ops); if (!r || !r.lines || !r.lines.length) return null;
    const want = String(a == null ? "" : a).replace(/[０-９]/g, d => String.fromCharCode(d.charCodeAt(0) - 0xFEE0)).match(/\d+(?:\.\d+)?/g);
    if (!want || want.length !== r.ans.length || want.some((w, i) => Number(w) !== r.ans[i])) return null;
    return [...r.lines, `こたえ ${ansTxt(r.ans)}`];
  };

  root.MH_LEARN = LH;
  if (typeof module !== "undefined" && module.exports) module.exports = LH;
})(typeof window !== "undefined" ? window : globalThis);
