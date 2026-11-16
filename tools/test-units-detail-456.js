#!/usr/bin/env node
// 新しい4〜6年の細分単元（step 144〜）の条件を、単元ごとに各1000問、独立に検査する。
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..'), ctx = { window: {} }; vm.createContext(ctx);
for (const f of ['data/kanji-grade.js', 'data/questions.js', 'data/choices.js', 'data/gen/core.js', ...fs.readdirSync(path.join(root, 'data/gen')).filter(x => x !== 'core.js' && x.endsWith('.js')).sort().map(x => 'data/gen/' + x), 'data/units.js']) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
const U = ctx.window.MH_UNITS, C = require('../data/collection.js');
const units = U.UNITS.filter(u => u.subj === 'sansu' && u.step >= 144 && u.step < 300);
const gcd = (a, b) => { while (b) [a, b] = [b, a % b]; return a; };
const dp = s => (String(s).split('.')[1] || '').length;
const toInt = (s, p) => Math.round(Number(s) * 10 ** p);
const F = s => { let m = String(s).match(/^(\d+)と(\d+)\/(\d+)$/); if (m) return [+m[1] * +m[3] + +m[2], +m[3]]; m = String(s).match(/^(\d+)\/(\d+)$/); if (m) return [+m[1], +m[2]]; m = String(s).match(/^\d+$/); return m ? [+s, 1] : null; };
const feq = (x, y) => x && y && x[0] * y[1] === y[0] * x[1];
const inR = (v, [a, b]) => v >= a && v <= b;
const mulCarry = (a, b) => { const parts = []; for (let y = b, k = 0; y; y = Math.floor(y / 10), k++) { for (let x = a; x; x = Math.floor(x / 10)) if (x % 10 * (y % 10) >= 10) return true; parts.push(a * (y % 10) * 10 ** k); } let s = 0; for (const v of parts) { for (let x = s, y = v; x || y; x = Math.floor(x / 10), y = Math.floor(y / 10)) if (x % 10 + y % 10 >= 10) return true; s += v; } return false; };
function div(u, it, m) {                                   // "n ÷ d"、答え "q" か "qあまりr"
  const p = u.params, n = +m[1], d = +m[3], a = it.a.match(/^(\d+)(?:あまり(\d+))?$/), q = +a[1], r = +(a[2] || 0);
  return m[2] === '÷' && d * q + r === n && r < d && inR(n, p.n) && inR(d, p.d) && inR(q, p.q) && (p.rem ? r >= 1 : r === 0)
    && (!p.qz || Math.floor(q / 10) % 10 === 0) && it.hissan && it.hissan.q === q && it.hissan.r === r;
}
const CHECK = {
  'm4-div-': div,
  'm4-mul-3d2d-': (u, it, m) => { const p = u.params, a = +m[1], b = +m[3]; return m[2] === '×' && +it.a === a * b && inR(a, p.a) && inR(b, p.b) && b % 10 !== 0 && mulCarry(a, b) === (p.carry === 'yes') && !!it.hissan; },
  'm4-dec-add-hundredth': (u, it, m) => m[2] === '+' && dp(m[1]) === 2 && dp(m[3]) === 2 && toInt(m[1], 2) + toInt(m[3], 2) === toInt(it.a, 2) && +it.a <= 19.98 && !!it.hissan,
  'm4-dec-sub-hundredth': (u, it, m) => m[2] === '−' && dp(m[1]) === 2 && dp(m[3]) === 2 && toInt(m[1], 2) - toInt(m[3], 2) === toInt(it.a, 2) && toInt(it.a, 2) > 0 && !!it.hissan,
  'm4-dec-mul-int': (u, it, m) => m[2] === '×' && dp(m[1]) === 1 && inR(+m[3], [2, 9]) && toInt(m[1], 1) * +m[3] === toInt(it.a, 1) && !!it.hissan,
  'm4-dec-div-int': (u, it, m) => m[2] === '÷' && dp(it.a) === 1 && inR(+m[3], [2, 9]) && toInt(it.a, 1) * +m[3] === toInt(m[1], 1) && !!it.hissan,
  'm4-frac-mixed-add': (u, it) => { const t = it.q.match(/^(\d+)と(\d+)\/(\d+) \+ (\d+)と(\d+)\/(\d+)$/); return t && +t[2] + +t[5] > +t[3] && feq(F(it.a), [(+t[1] + +t[4]) * +t[3] + +t[2] + +t[5], +t[3]]); },
  'm4-frac-mixed-sub': (u, it) => { const t = it.q.match(/^(\d+)と(\d+)\/(\d+) − (\d+)と(\d+)\/(\d+)$/); return t && +t[2] < +t[5] && feq(F(it.a), [(+t[1] - +t[4]) * +t[3] + +t[2] - +t[5], +t[3]]) && F(it.a)[0] > F(it.a)[1]; },
  'm5-dec-mul-tenths': (u, it, m) => m[2] === '×' && dp(m[1]) === 1 && dp(m[3]) === 1 && toInt(m[1], 1) * toInt(m[3], 1) === toInt(it.a, 2) && dp(it.a) === 2 && !!it.hissan,
  'm5-dec-mul-hundredths': (u, it, m) => m[2] === '×' && dp(m[1]) === 2 && dp(m[3]) === 1 && toInt(m[1], 2) * toInt(m[3], 1) === toInt(it.a, 3) && dp(it.a) === 3 && !!it.hissan,
  'm5-dec-div-tenths': (u, it, m) => m[2] === '÷' && dp(m[1]) === 0 && inR(+m[1], [1, 99]) && dp(m[3]) === 1 && Math.abs(toInt(it.a, 2) * toInt(m[3], 1) - +m[1] * 1000) === 0 && it.ans === 'dec' && !!it.hissan,
  'm5-dec-div-hundredths': (u, it, m) => m[2] === '÷' && dp(m[3]) === 2 && toInt(it.a, 2) * toInt(m[3], 2) === toInt(m[1], 2) * 100 && it.ans === 'dec' && !!it.hissan,
  'm5-frac-reduce-': (u, it) => { const t = it.q.match(/^(\d+)\/(\d+)を/), n = +t[1], d = +t[2], k = gcd(n, d); return d <= u.params.maxD && k >= (u.params.k ? 10 : 2) && it.a === `${n / k}/${d / k}`; },
  'm5-frac-common-': (u, it) => { const t = it.q.match(/^(\d+)\/(\d+)と (\d+)\/(\d+)を 通分すると、 (\d+)\/(\d+)は/), b = +t[2], d = +t[4], L = b * d / gcd(b, d), A = F(it.a); return (u.params.kind === 'multiple' ? (b % d === 0 || d % b === 0) : gcd(b, d) === 1) && b <= 12 && d <= 12 && A[1] === L && feq(A, [+t[5], +t[6]]) && it.a.split('/')[1] === String(L); },
  'm5-frac-add-': fracAS, 'm5-frac-sub-': fracAS,
  'm5-frac-mul-int': (u, it) => { const t = it.q.match(/^(\d+)\/(\d+) × (\d+)$/); return t && +t[2] <= 12 && inR(+t[3], [2, 9]) && feq(F(it.a), [+t[1] * +t[3], +t[2]]) && gcd(...F(it.a)) === 1 && u.g === 6; },
  'm5-frac-div-int': (u, it) => { const t = it.q.match(/^(\d+)\/(\d+) ÷ (\d+)$/); return t && +t[2] <= 12 && inR(+t[3], [2, 9]) && feq(F(it.a), [+t[1], +t[2] * +t[3]]) && gcd(...F(it.a)) === 1 && u.g === 6; },
  'm6-frac-mul-': (u, it) => { const t = it.q.match(/^(\d+)\/(\d+) × (\d+)\/(\d+)$/), [a, b, c, d] = t.slice(1).map(Number); return a < b && c < d && b <= 12 && d <= 12 && feq(F(it.a), [a * c, b * d]) && gcd(...F(it.a)) === 1 && (gcd(a, d) > 1 || gcd(c, b) > 1) === !!u.params.cross; },
  'm6-frac-div-proper': (u, it) => { const t = it.q.match(/^(\d+)\/(\d+) ÷ (\d+)\/(\d+)$/), [a, b, c, d] = t.slice(1).map(Number); return a < b && c < d && b <= 12 && d <= 12 && feq(F(it.a), [a * d, b * c]) && gcd(...F(it.a)) === 1 && F(it.a)[1] > 1; },
  'm6-frac-div-mixed': (u, it) => { const t = it.q.match(/^(\d+)と(\d+)\/(\d+) ÷ (\d+)\/(\d+)$/), [w, a, b, c, d] = t.slice(1).map(Number); return inR(w, [1, 3]) && a < b && c < d && feq(F(it.a), [(w * b + a) * d, b * c]) && gcd(...F(it.a)) === 1 && F(it.a)[1] > 1; },
  'm6-mix-dec-frac': (u, it) => { const t = it.q.match(/^(\d+(?:\.\d)?|\d+\/\d+) ([+−×÷]) (\d+(?:\.\d)?|\d+\/\d+)$/); const v = s => /\//.test(s) ? F(s) : [toInt(s, 1), 10]; const x = v(t[1]), y = v(t[3]); const dd = [t[1], t[3]].find(s => s.includes('.')), ff = [t[1], t[3]].find(s => s.includes('/'));
    if (!dd || !ff || !inR(toInt(dd, 1), [1, 29]) || ![2, 4, 5, 10].includes(F(ff)[1])) return false;
    const r = t[2] === '+' ? [x[0] * y[1] + y[0] * x[1], x[1] * y[1]] : t[2] === '−' ? [x[0] * y[1] - y[0] * x[1], x[1] * y[1]] : t[2] === '×' ? [x[0] * y[0], x[1] * y[1]] : [x[0] * y[1], x[1] * y[0]];
    return r[0] > 0 && feq(F(it.a), r) && gcd(...F(it.a)) === 1; },
  'm6-ratio-reduce': (u, it) => { const t = it.q.match(/^(\d+):(\d+)を/), a = +t[1], b = +t[2], k = gcd(a, b); return a <= 99 && b <= 99 && k >= 2 && it.a === `${a / k}:${b / k}`; },
  'm6-speed-distance': (u, it) => { const t = it.q.match(/(時速|分速|秒速) (\d+)(km|m)で (\d+)(時間|分|秒) 進みました/); return t && inR(+t[2], [2, 90]) && inR(+t[4], [1, 9]) && it.a === `${+t[2] * +t[4]}${t[3]}` && u.g === 5; },
  'm6-speed-time': (u, it) => { const t = it.q.match(/(時速|分速|秒速) (\d+)(km|m)で (\d+)(km|m) 進むと/); return t && inR(+t[2], [2, 90]) && inR(+it.a, [1, 9]) && +t[2] * +it.a === +t[4] && +t[4] <= 810 && u.g === 5; },
};
function fracAS(u, it) {                                   // 異分母の たし算・ひき算：通分した 分子と 分母に 公約数が あるか
  const t = it.q.match(/^(\d+)\/(\d+) ([+−]) (\d+)\/(\d+)$/), a = +t[1], b = +t[2], c = +t[4], d = +t[5], L = b * d / gcd(b, d);
  const n = t[3] === '+' ? a * L / b + c * L / d : a * L / b - c * L / d, A = F(it.a);
  return b !== d && b <= 12 && d <= 12 && n > 0 && feq(A, [n, L]) && gcd(...A) === 1 && (gcd(n, L) > 1) === !!u.params.reduce && (!u.params.max1 || n < L);
}
let total = 0;
for (const u of units) {
  const key = Object.keys(CHECK).find(k => u.id.startsWith(k)); if (!key) throw Error(`${u.id}: 検査がない`);
  if (!C.UNIT_IDS.includes(u.id)) throw Error(`${u.id}: collection.js の UNIT_IDS にない`);
  for (let i = 0; i < 1000; i++) {
    let it; try { it = U.make(u, `detail456|${i}`); } catch (e) { throw Error(`${u.id}: ${e.message}`); }
    it = { ...it, q: U.plain(it.q), a: U.plain(it.a) };
    const m = it.q.match(/^(\d+(?:\.\d+)?) ([+−×÷]) (\d+(?:\.\d+)?)$/);
    let ok; try { ok = CHECK[key](u, it, m || []); } catch (e) { ok = false; }
    if (!ok) throw Error(`${u.id}: 条件に合わない「${it.q} = ${it.a}」`);
    if (!U.check(it, it.a)) throw Error(`${u.id}: 正解が通らない「${it.q}」`);
    total++;
  }
}
console.log(`細分単元（4〜6年） ${units.length} 件・各1000問（計 ${total}）: 合格`);
