#!/usr/bin/env node
// 文章題と 段階5で 足した単元（data/gen/bunsho.js）を 各200問 作り、問題文を 別の計算で とき直して 答えを 確かめる。
// 答えが テンキーで 打てる形か・同じ問題ばかり 出ないか・1年の文章題で「ずで かんがえる」のブロックが 答えと 合うかも 見る。
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..'), ctx = { window: {} }; vm.createContext(ctx);
for (const f of ['data/kanji-grade.js', 'data/questions.js', 'data/choices.js', 'data/gen/core.js', ...fs.readdirSync(path.join(root, 'data/gen')).filter(x => x !== 'core.js' && x.endsWith('.js')).sort().map(x => 'data/gen/' + x), 'data/units.js', 'data/tools-viz.js'])
  vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
const U = ctx.window.MH_UNITS, TL = ctx.window.MH_TOOLS, P = U.plain, N = 200;
const gcd = (a, b) => { while (b) [a, b] = [b, a % b]; return a; };
const fr = (n, d) => { const k = gcd(n, d); return d / k === 1 ? String(n / k) : `${n / k}/${d / k}`; };
const nums = s => (s.replace(/1れつ/g, '').match(/\d+(?:\.\d+)?/g) || []).map(Number);
const t10 = x => Math.round(x * 10);
const has = (s, re) => re.test(s);
/* 単元ごとの とき方（問題文 → 正しい答えの文字） */
const SOLVE = {
  'm1-bun-awase': s => { const n = nums(s); return n[0] + n[1]; },
  'm1-bun-add20': s => { const n = nums(s); return n[0] + n[1]; },
  'm1-bun-nokori': s => { const n = nums(s); return n[0] - n[1]; },
  'm1-bun-sub20': s => { const n = nums(s); return has(s, /ちがい/) ? Math.abs(n[0] - n[1]) : n[0] - n[1]; },
  'm1-bun-chigai': s => { const n = nums(s); return has(s, /それより/) ? n[0] - n[1] : has(s, /あと/) ? n[1] - n[0] : Math.abs(n[0] - n[1]); },
  'm1-bun-junjo': s => { let m;
    if ((m = s.match(/まえから (\d+)ばんめで、 その うしろに (\d+)にん/))) return +m[1] + +m[2];
    if ((m = s.match(/ひだりから (\d+)ばんめ、 みぎから (\d+)ばんめ/))) return +m[1] + +m[2] - 1;
    m = s.match(/(\d+)にん 1れつに.*まえから (\d+)ばんめ/); return has(s, /うしろには/) ? m[1] - m[2] : m[1] - m[2] + 1; },
  'm1-bun-3kazu': s => { const n = nums(s); return has(s, /おりて/) ? n[0] - n[1] + n[2] : has(s, /のこり/) ? n[0] - n[1] - n[2] : n[0] + n[1] + n[2]; },
  'm1-nanjuu': s => { const m = s.match(/^(\d+) ([+−]) (\d+)$/); return m[2] === '+' ? +m[1] + +m[3] : m[1] - m[3]; },
  'm2-nanjuu': s => SOLVE['m1-nanjuu'](s),
  'm2-kuku-1': s => { const m = s.match(/^(\d+) × (\d+)$/); return m[1] * m[2]; },
  'm2-bun-add': s => { const n = nums(s); return n[0] + n[1]; },
  'm2-bun-sub': s => { const n = nums(s); return n[0] - n[1]; },
  'm2-bun-gyaku': s => { const n = nums(s); return has(s, /もらったので/) ? n[1] - n[0] : has(s, /つかったので/) ? n[0] + n[1] : has(s, /のって きたので/) ? n[1] - n[0] : n[0] - n[1]; },
  'm2-bun-kake': s => { const n = nums(s); if (has(s, /ほかに/)) return n[0] * n[1] + n[2]; const v = n.filter(x => x !== 1); return v[0] * v[1]; },
  'm2-bun-tani': s => { const n = nums(s);
    if (has(s, /テープと/)) return (n[0] * 10 + n[1] + n[2] * 10 + n[3]) + 'mm';
    if (has(s, /ひもから/)) return (n[0] - n[1]) + 'cm';
    if (has(s, /L\d+dL/)) return (n[0] * 10 + n[1] + n[2]) + 'dL';
    return (n[0] - n[1]) + 'dL'; },
  'm3-bun-addsub': s => { const n = nums(s); return has(s, /のこり|ちがい/) ? n[0] - n[1] : n[0] + n[1]; },
  'm3-bun-kake': s => { const n = nums(s).filter(x => x !== 1); return n[0] * n[1]; },
  'm3-bun-bai': s => { const n = nums(s); return has(s, /何倍？/) ? n[0] / n[1] : has(s, /分けると/) ? n[0] / n[1] : n[0] * n[1]; },
  'm3-bun-amari': s => { const n = nums(s).filter(x => x !== 1); return `${Math.floor(n[0] / n[1])}あまり${n[0] % n[1]}`; },
  'm3-bun-kiri': s => { const n = nums(s).filter(x => x !== 1); return has(s, /いる？/) ? Math.ceil(n[0] / n[1]) : Math.floor(n[0] / n[1]); },
  'm3-bun-tani': s => { const n = nums(s);
    if (has(s, /かごに/)) return (n[0] + n[1]) + 'g';
    if (has(s, /kg\d+gの にもつ/)) return (n[0] * 1000 + n[1] - n[2]) + 'g';
    if (has(s, /kmの 道のり/)) return (n[0] * 1000 - n[1]) + 'm';
    return (n[0] + n[1]) + 'm'; },
  'm3-byou': s => { let m;
    if ((m = s.match(/^(\d+)分(\d+)秒は 何秒/))) return m[1] * 60 + +m[2];
    if ((m = s.match(/^(\d+)秒は 何分？/))) return m[1] / 60;
    m = s.match(/^(\d+)秒は 何分何秒/); return `${Math.floor(m[1] / 60)}分${m[1] % 60}秒`; },
  'm4-bun-bai': s => { const n = nums(s); return has(s, /何倍？/) ? n[0] / n[1] : has(s, /倍は 何m/) ? n[0] * n[1] : has(s, /倍すると/) ? n[1] / n[0] : n[0] / n[1]; },
  'm4-bun-shiki': s => { const n = nums(s);
    if (has(s, /組/)) { const v = n.filter(x => x !== 1); return (v[0] + v[1]) * v[2]; }
    if (has(s, /おつり/)) { const v = n.filter(x => x !== 1); return v[0] - v[1] * v[2]; }
    if (has(s, /配ります/)) return n[0] - n[1] * n[2];
    const v = n.slice(1); return v[0] * v[1] + v[2]; },
  'm4-bun-shosu': s => { const n = nums(s), x = n.map(t10);
    if (has(s, /ジュース/)) return U.canon('dec', String(x[1] * n[2] / 10));
    if (has(s, /リボン/)) return U.canon('dec', String(x[0] / n[1] / 10));
    if (has(s, /ふやす/)) return U.canon('dec', String((x[0] + x[1]) / 10));
    return U.canon('dec', String((x[0] - x[1]) / 10)); },
  'm5-bun-wariai': s => { const n = nums(s);
    if (has(s, /定員/)) return n[0] * n[1] / 100;
    if (has(s, /引き/)) return n[0] * (100 - n[1]) / 100;
    if (has(s, /学年/)) return n[0] * 100 / n[1];
    return n[1] / n[0] * 100; },
  'm5-bun-buai': s => { const n = nums(s);
    if (has(s, /人の \d+わりは/)) return n[0] * n[1] / 10;
    if (has(s, /わり引き/)) return n[0] * (10 - n[1]) / 10;
    if (has(s, /シュート/)) return n[1] / n[0] * 10;
    return n[0] / n[1] * 10; },
  'm6-bun-hi': s => { const m = s.match(/(\d+):(\d+)/), p = +m[1], q = +m[2], n = nums(s.replace(/\d+:\d+/, ''));
    if (has(s, /赤い 玉が/)) return n[0] / p * q;
    if (has(s, /姉/)) return n[0] * p / (p + q);
    if (has(s, /横を/)) return n[0] / q * p;
    return n[0] / p * q; },
  'm6-bun-bunsu': s => { const f = [...s.matchAll(/(\d+)\/(\d+)/g)].map(m => [+m[1], +m[2]]);
    if (has(s, /1mの 重さ/)) return fr(f[0][0] * f[1][0], f[0][1] * f[1][1]);
    if (has(s, /ペンキ/)) return fr(f[0][0] * f[1][1], f[0][1] * f[1][0]);
    const k = +s.match(/、 (\d+)人で/)[1]; return fr(f[0][0], f[0][1] * k); }
};
const FORM = { num: /^\d{1,5}$/, dec: /^\d{1,3}\.\d{1,2}$/, frac: /^\d{1,3}\/\d{1,3}$/, amari: /^\d{1,3}あまり\d{1,2}$/, unit: /^\d{1,5}(mm|cm|m|dL|g)$/, choice4: /^\d+分\d+秒$/ };
const ids = Object.keys(SOLVE), bad = [];
for (const id of ids) {
  const u = U.byId[id]; if (!u || u.status !== 'ready') { bad.push(`${id}: 単元がない`); continue; }
  const seen = new Map();
  for (let i = 0; i < N; i++) {
    const it = U.make(u, `bunsho|${id}|${i}`), q = P(it.q), a = P(it.a);
    let want; try { want = String(SOLVE[id](q)); } catch (e) { bad.push(`${id}: 問題文が読めない「${q}」`); continue; }
    if (want !== a && !(it.ans === 'dec' && want === U.canon('dec', a))) bad.push(`${id}: 「${q}」の答えは ${want}（出した答え ${a}）`);
    if (!FORM[it.ans] || !FORM[it.ans].test(a)) bad.push(`${id}: 答え「${a}」が テンキーの形（${it.ans}）でない`);
    if (it.ans === 'amari') { const m = a.match(/^(\d+)あまり(\d+)$/), d = nums(q).filter(x => x !== 1)[1]; if (!(+m[2] >= 1 && +m[2] < d)) bad.push(`${id}: あまりが わる数以上か 0「${q}」`); }
    if (it.ans === 'frac' && !/\//.test(a)) bad.push(`${id}: 分数の答えが 整数`);
    if (!U.check(it, it.a)) bad.push(`${id}: check が 正解を 通さない「${q}」`);
    if (it.choices.length !== 4 || new Set(it.choices).size !== 4 || !it.choices.includes(it.a)) bad.push(`${id}: 選択肢が おかしい「${q}」`);
    if (/NaN|undefined|Infinity|-\d/.test(q + a + it.choices.join(''))) bad.push(`${id}: 負の数・NaN「${q}」`);
    seen.set(q, (seen.get(q) || 0) + 1);
    // 1年の 文章題：ブロックの図が 出るなら、図の さいごの 数が 答えと 同じ
    if (/^m1-bun-/.test(id)) {
      const tl = TL.detect({ q: it.q, unit: id, g: 1, subj: 'sansu', area: 'A' }), b = tl.find(t => t.id === 'blocks');
      if (id === 'm1-bun-junjo') { if (tl.length) bad.push(`${id}: じゅんばんに 図が 出た`); }
      else if (!b) bad.push(`${id}: ブロックが 出ない「${q}」`);
      else { const v = b.steps.reduce((x, st) => st.op === '+' ? x + st.n : x - st.n, b.start); if (String(v) !== a) bad.push(`${id}: ブロックの 式が 答えと ちがう「${q}」 ${v}`); }
      if (/add20|sub20/.test(id) && !tl.some(t => t.id === 'sakuranbo') && !/ちがい/.test(q)) bad.push(`${id}: くり上がり・くり下がりに さくらんぼが 出ない「${q}」`);
    }
  }
  const kinds = seen.size, top = Math.max(...seen.values()), need = id === 'm2-kuku-1' ? 15 : 60;
  if (kinds < need) bad.push(`${id}: ${N}問で ${kinds}種類しか ない（${need}種類 以上ほしい）`);
  if (top > (id === 'm2-kuku-1' ? 30 : 12)) bad.push(`${id}: 同じ問題が ${top}回 出た`);
}
// 学習項目「文章題」の まとまり：step が 学年の順・重ならない・UNIT_IDS に入っている
const C = require('../data/collection.js');
const bun = U.UNITS.filter(u => u.item === '文章題');
for (const u of bun) { if (u.series !== '文章題' || !Number.isInteger(u.step) || u.step < 200 || Math.floor((u.step - 200) / 10) + 1 !== u.g) bad.push(`${u.id}: 文章題の step（${u.step}）が 学年（${u.g}年）の 範囲でない`); }
if (new Set(bun.map(u => u.step)).size !== bun.length) bad.push('文章題の step が 重なっている');
for (const id of ids) if (!C.UNIT_IDS.includes(id)) bad.push(`${id}: UNIT_IDS に ない`);
const last = C.UNIT_IDS.slice(-ids.length); if (ids.some(id => !last.includes(id))) bad.push('新しい単元は UNIT_IDS の 末尾に 足す');
if (bad.length) { console.log([...new Set(bad)].slice(0, 30).join('\n')); console.log(`NG ${bad.length} 件`); process.exit(1); }
console.log(`文章題・段階5の単元 ${ids.length} 件・各${N}問：答え・テンキーの形・ばらつき・ブロックの図 OK（文章題の まとまり ${bun.length} 単元）`);
