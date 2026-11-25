#!/usr/bin/env node
// どんぐりの シミュレーション（docs/rewards-study.md の 表を 作る。2026-11-23）。
// ※2026-11-25 から 本番の コードが 案B＋案C に なった。いまは「--plan A」が 本番そのもの（B・C・BC は 本番に さらに 足すので 二重に なる）。
// 本番の data/collection.js・data/masu100.js を そのまま 読んで、recordRun・give・buy・kzBuy・MASU.reward を 動かす。本番の コードは かえない。
// prepublish には 入れない（名前が check-／test- で はじまらない）。
//   node tools/sim-rewards.js            … 表（マークダウン）を 出す
//   node tools/sim-rewards.js --plan BC   … 1つの 案だけ（A／B／C／BC）
//   node tools/sim-rewards.js --trials 20   （ふつうは 50回の 中央値。2分くらい）
// 子どもの モデル（かんたんな 仮定。くわしくは docs/rewards-study.md の 2章）：
//   ・1回の れんしゅう＝1つの 単元を 10問。せいかいの 数は 二項分布（1問ごとに p で せいかい）
//   ・p は その単元を やった 回数で 少しずつ 上がる：p = min(0.97, p0 + 0.04×回数)
//   ・その日に やる単元は「とちゅうの 単元」から W こ。1日 R 回（R＞W なら 同じ単元を くりかえす）
//   ・単元の じゅんばん：自分の学年 → 1つ下の学年（どちらも 満額）。かんたん派は 2学年以上 下だけ
//   ・ぜんぶ「マスター」に なったら、マスターした 単元を くりかえす（ふくしゅう）
//   ・かいもの：買える中で いちばん 安い物から すぐ買う（かざりは すぐ おく）
"use strict";
const path = require("path");
const C = require(path.join(__dirname, "..", "data", "collection.js"));
const MASU = require(path.join(__dirname, "..", "data", "masu100.js"));

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? +process.argv[i + 1] : d; };
const TRIALS = arg("--trials", 50);
const DAY0 = C.dayNum(new Date(2026, 3, 6));     // 2026-04-06（月）から
const PERIODS = [["1週間", 7], ["1か月", 30], ["1学期", 105]];   // 1学期＝15週（4月〜7月）
const HORIZON = 400;
const SHOP = C.DECOR.map(d => ({ k: "d", id: d.id, price: d.price })).concat(C.KZ.filter(k => k.price).map(k => ({ k: "z", id: k.id, price: k.price })))
  .sort((a, b) => a.price - b.price || (a.k === "d" ? -1 : 1));
const SHOP_TOTAL = SHOP.reduce((n, s) => n + s.price, 0);

function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const binom = (r, n, p) => { let k = 0; for (let i = 0; i < n; i++) if (r() < p) k++; return k; };

function poolFor(g, easy) {
  const ug = id => C.uGrade(id);
  if (easy) return C.UNIT_IDS.filter(id => g - ug(id) >= 2).sort((a, b) => ug(b) - ug(a));    // 2学年以上 下（近い学年から）
  const own = C.UNIT_IDS.filter(id => ug(id) === g), low = C.UNIT_IDS.filter(id => ug(id) === g - 1);
  return own.concat(low);
}

/* 案ごとの 決まり（本番の 決まりに 足す・けずる 部分だけ。本番の 関数は そのまま 呼ぶ）
   cap：1日の 上限を 本番の 20 より 小さくする（あふれた分は 本番と 同じく 持ちこし）
   review：ふくしゅう（「できた」以上の 単元を べつの日に 9割）で +1、1日 reviewMax こまで
   dayBonus：あそんだ日（5問以上 6割）の 数が bonusEvery の 倍数に なるたび +bonus（れんぞくで なくてよい） */
const PLANS = {
  A: { name: "案A 今のまま" },
  B: { name: "案B ふくしゅうも ほめる", review: 1, reviewMax: 2 },
  C: { name: "案C 上限10＋あそんだ日", cap: 10, dayBonus: 3, bonusEvery: 5 },
  BC: { name: "案B＋案C", review: 1, reviewMax: 2, cap: 10, dayBonus: 3, bonusEvery: 5 }
};

function clampCap(S, cap) {         // 本番の CAP(20) を cap に 見立てる：今日の分の こえた分を 持ちこしへ もどす
  if (!cap || S.day.got <= cap) return;
  const x = S.day.got - cap; S.day.got -= x; S.ac.e -= x; S.day.carry += x;
}
function extraGive(S, n, plan) {
  const ctx = { paid: 0, deferred: 0, capFirst: false };
  if (plan.cap) {                  // 案C：上限の 中で わたす
    const room = Math.max(0, plan.cap - S.day.got), pay = Math.min(room, n);
    if (S.done && !C.kzLeft(S)) return 0;
    S.day.got += pay; S.ac.e += pay; S.day.carry += n - pay; return pay;
  }
  C.give(S, n, ctx); return ctx.paid;
}

function simulate(kid, plan, seed) {
  const r = rng(seed), S = C.fresh(DAY0), pool = poolFor(kid.g, kid.easy), tries = {}, rev = {};
  let earned = 0, idx = 0, cell = 1, playDays = 0, lastBuy = 0, maxGap = 0, allDay = 0, doneDay = 0, poolOutDay = 0;
  const work = [], at = {}, buys = [];
  const m100 = { st: null, runs: [] };
  let started = false;
  const earnedAt = e => { earned = C.balance(S) + S.ac.s; return earned; };
  for (let d = 0; d < HORIZON; d++) {
    const today = DAY0 + d;
    if (kid.days(d)) {
      if (!started) { C.claimGift(S, today); started = true; }
      if (kid.m100) {              // 100マス：本番の MASU.reward を そのまま 使う（ホームに もどるたび）
        C.sync(S, today);
        const ms = (today * 864e5) + 15 * 36e5;
        kid.m100.forEach((op, i) => {
          const end = ms + i * 180e3;
          m100.runs.push({ end, day: today, op, valid: true });
          const rr = MASU.reward(m100.st, m100.runs, end + 1000);
          m100.st = rr.st;
          if (rr.give > 0) { const ctx = { paid: 0, deferred: 0, capFirst: false }; C.give(S, rr.give, ctx); clampCap(S, plan.cap); }
        });
      }
      let todayFirst = false;
      for (let k = 0; k < kid.R; k++) {
        while (work.length < kid.W && idx < pool.length) work.push(pool[idx++]);
        if (!work.length) break;
        if (!poolOutDay && idx >= pool.length && work.every(id => C.stage(S, id) >= 3)) poolOutDay = d + 1;
        const id = work[k % work.length];
        const t = tries[id] = (tries[id] || 0);
        const p = Math.min(0.97, (kid.p0 + (kid.easy ? 0.12 : 0)) + 0.04 * t);
        const o = binom(r, 10, p); tries[id]++;
        const st0 = C.stage(S, id), firstBefore = S.day.first;
        C.sync(S, today); clampCap(S, plan.cap);
        C.recordRun(S, { today, grade: kid.g, units: [{ id, n: 10, o }], answered: 10, correct: o, quiz: false });
        clampCap(S, plan.cap);
        if (!firstBefore && S.day.first) todayFirst = true;
        if (plan.review && st0 >= 2 && o >= 9 && rev[id] !== today && (rev._d !== today || rev._n < plan.reviewMax)) {
          if (rev._d !== today) { rev._d = today; rev._n = 0; }
          rev[id] = today; rev._n++; extraGive(S, plan.review, plan);
        }
        if (C.stage(S, id) >= 3 && idx < pool.length) work.splice(work.indexOf(id), 1);   // マスターしたら つぎの 単元へ（ぜんぶ おわったら くりかえす）
        if (!Object.keys(S.mk.own).length && C.mkAvail(S)) C.mkPick(S, C.mkCands(S)[0].id, today);
      }
      if (kid.quiz) { C.sync(S, today); C.recordRun(S, { today, grade: kid.g, units: [], answered: 5, correct: 4, quiz: true }); clampCap(S, plan.cap); }
      if (kid.R || kid.quiz) { if (S.day.first) playDays++; }
      else playDays++;
      if (plan.dayBonus && playDays && playDays % plan.bonusEvery === 0 && at._bd !== playDays) { at._bd = playDays; extraGive(S, plan.dayBonus, plan); }
      // かいもの
      for (const s of SHOP) {
        if (s.k === "d" ? S.own.includes(s.id) : S.kz.o.includes(s.id)) continue;
        if (C.balance(S) < s.price) break;
        const ok = s.k === "d" ? C.buy(S, s.id) : C.kzBuy(S, s.id);
        if (ok) { if (s.k === "d") C.place(S, s.id, cell++); buys.push(d + 1); if (lastBuy) maxGap = Math.max(maxGap, d + 1 - lastBuy); lastBuy = d + 1; }
      }
      if (!doneDay && C.checkDone(S, today)) doneDay = d + 1;
      if (!allDay && S.own.length === C.DECOR.length && C.kzLeft(S) === 0) allDay = d + 1;
    } else C.sync(S, today);
    for (const [, n] of PERIODS) if (d + 1 === n) at[n] = earnedAt();
    if (d + 1 === 105) at.buys105 = buys.length;
  }
  return { at, allDay, doneDay, maxGap, poolOutDay, poolN: pool.length, mk: Object.keys(S.mk.own).length };
}

const every = () => true, weekdays2 = d => d % 7 === 1 || d % 7 === 3;   // 火・木
const KIDS = [
  { key: "A3", name: "毎日10分・3年（自分の学年を少しずつ）", g: 3, R: 3, W: 3, p0: 0.72, days: every },
  { key: "B3", name: "週2回・授業だけ・3年（先生のクイズも）", g: 3, R: 4, W: 4, p0: 0.72, days: weekdays2, quiz: true },
  { key: "C3", name: "毎日40分・3年（いろいろな単元）", g: 3, R: 12, W: 12, p0: 0.72, days: every },
  { key: "C3s", name: "毎日40分・3年（同じ単元を くりかえす）", g: 3, R: 12, W: 3, p0: 0.72, days: every },
  { key: "M3", name: "100マスばかり・3年（毎日 たし・ひき・かけ 各2回）", g: 3, R: 0, W: 0, p0: 0.72, days: every, m100: ["add", "add", "sub", "sub", "mul", "mul"] },
  { key: "E3", name: "かんたんな単元ばかり・3年（1年の単元）", g: 3, R: 3, W: 3, p0: 0.72, days: every, easy: true },
  { key: "A1", name: "毎日10分・1年", g: 1, R: 3, W: 3, p0: 0.72, days: every },
  { key: "A6", name: "毎日10分・6年", g: 6, R: 3, W: 3, p0: 0.72, days: every },
  { key: "L3", name: "毎日10分・3年・にがてな子（はじめ5割）", g: 3, R: 3, W: 3, p0: 0.5, days: every }
];

const med = a => { const b = a.slice().sort((x, y) => x - y); return b[Math.floor(b.length / 2)]; };
const fmtDay = (v, kid) => { if (!v) return `${HORIZON}日で おわらない`; const w = Math.ceil(v / 7); return `${v}日め（${w}週め）`; };
function run(planKey) {
  const plan = PLANS[planKey], rows = [];
  for (const kid of KIDS) {
    const rs = []; for (let t = 0; t < TRIALS; t++) rs.push(simulate(kid, plan, 1000 + t * 7919));
    const pick = f => med(rs.map(f));
    const all = rs.map(x => x.allDay || 1e9), allM = med(all);
    rows.push({ kid, w: pick(x => x.at[7]), m: pick(x => x.at[30]), t: pick(x => x.at[105]), buys: pick(x => x.at.buys105), done: med(rs.map(x => x.doneDay || 1e9)), all: allM, gap: pick(x => x.maxGap), out: med(rs.map(x => x.poolOutDay || 1e9)), poolN: rs[0].poolN, mk: rs[0].mk });
  }
  return { plan, rows };
}
const d = v => (v >= 1e9 ? `—（${HORIZON}日でも）` : `${v}日め`);
console.log(`<!-- node tools/sim-rewards.js --trials ${TRIALS} の 出力（中央値）。お店の 合計 ${SHOP_TOTAL}こ（かざり ${C.PRICE_TOTAL}・きせかえ ${C.KZ_PRICE_TOTAL}） -->`);
const only = process.argv.includes("--plan") ? [process.argv[process.argv.indexOf("--plan") + 1]] : Object.keys(PLANS);
for (const k of only) {
  const { plan, rows } = run(k);
  console.log(`\n#### ${plan.name}\n`);
  console.log("| 子ども | 1週間 | 1か月 | 1学期 | 1学期に買えた数（37こ中） | ひろば完成 | 全部買い終わる | 買い物の あいだ（最長） | 単元が なくなる |");
  console.log("|---|---:|---:|---:|---:|---:|---:|---:|---:|");
  for (const r of rows) console.log(`| ${r.kid.name} | ${r.w} | ${r.m} | ${r.t} | ${r.buys} | ${d(r.done)} | ${d(r.all)} | ${r.gap}日 | ${r.kid.R ? d(r.out) + `（${r.poolN}単元）` : "—"} |`);
}
