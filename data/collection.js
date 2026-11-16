/* まなびひろば コレクション v1・v2 の中身（どんぐり・ずかん・ひろば・たんけんチケット・たんけんメモ・バックアップ）。画面は持たない。
   ブラウザでは window.MH_COL、Node では require("./collection.js")。tools/test-collection.js が単体テストする。
   決まり（plan/collection-plan.md 末尾の決定と plan/review-fable-collection.md を反映）
   ・「できた」＝その単元で 5問以上・○が7割以上の回が、べつの日にもう一度ある。「マスター」＝さらにべつの日に 5問以上・○が9割以上
   ・どんぐり：できた +2／マスター +3（項目ごと一生に1回）。2学年以上下の単元は +1。きょうの1回め +1。先生のクイズ +2。はじめの5こは1回だけ
   ・1日にもらえるのは 20こまで。あふれた分は あしたに持ちこす（なくならない）
   ・記録した日より前の日付（時計を戻した）のときは、どんぐりも段階も進めない
   ・たんけんチケット（v2）：「できた」「マスター」が 5つで 1まい。持てるのは 3まい。1日に もらえるのは 2まい、つかえるのは 2回まで（先生が 0〜5）。
     たんけんの 中の せいかいは チケットの ★ にならない（recordRun を通さない）。どんぐりも出さない
   ・たんけんメモ（v2）：ゴールで 1つ。ひろばの物の豆知識（16）か、単元の例題の一言。保存は mo（物）と mu（単元）
   ・まなびっこ（v3.0。plan/collection-v3-plan.md 5章・7章）：教科の 小さな なかま。
     ① はじめて 5問《もん》以上 こたえた回（先生の クイズは 3問）で 1たい「えらべる」（初日に かならず 1たい）
     ② 単元が「できた」に なるたびに 1たい えらべる（2学年以上 下の単元は ふやさない）。えらぶ候補は 3つ（その教科の子を先に。
        足りなければ ほかの教科の子で うめる）。まだ えらんでいない分は q に たまり、なくならない（新しい子が ふえたら えらべる）
     ③ なかよし 3段階（であった→なかよし→いっしょに まなぶ）。その教科を 5問以上 れんしゅうした「べつの日」ごとに +1、
        その教科の「できた」「マスター」で +1。3 と 8 で 次の すがた。下がらない・世話の罰なし
     ④ ひろばに 3たいまで だせる（sh）。きらきら（k）・おまけシールは のちの段階（データの場所だけ k を とってある）
     ⑤ アバター（v3.1-a）：友だち対戦で 自分の子を 名前の よこに 出せる。送るのは ID と 段階だけ（mkWire で 調べる）
   ・名前・順位・やりとりはない。保存は端末の localStorage（キー mh_col）だけ */
(function (root, factory) {
  const M = factory();
  if (typeof module === "object" && module.exports) module.exports = M; else root.MH_COL = M;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const CAP = 20, GIFT = 5, CELLS = 12;
  const TK_MAX = 3, TK_GET = 2, TK_STARS = 5, TK_USE = 2, TK_USE_MAX = 5;
  /* 単元の ID の固定表（追加だけ。順番を変えない）。id の1字目＝教科（m算数 j国語 s社会 e英語）、2字目＝学年 */
  const UNIT_IDS = [
    "m1-kazoeru","m1-kazu-kurabe","m1-juu-to-ichi","m1-narabi","m1-ikutsu-to-ikutsu","m1-add10","m1-sub10",
    "m1-add3","m1-add-kuriage","m1-sub-kurisage","m1-add-2keta","m1-tokei","m2-hyo","m2-jikan","m2-add-hissan",
    "m2-sub-hissan","m2-nagasa","m2-kasa","m2-keta3","m2-keta3-kurabe","m2-zukei","m2-kuku-low","m2-kuku-high",
    "m2-kuku-hole","m2-kake-bunsho","m2-bunsu","m3-kake-kimari","m3-wari99","m3-add-hissan","m3-sub-hissan",
    "m3-nagai","m3-amari","m3-man","m3-kake-hissan1","m3-kake-hissan2","m3-wari-bunsho","m3-en","m3-shosu",
    "m3-bunsu-imi","m3-bunsu-add","m3-omosa","m3-kuuran","m3-hyo","m4-oku","m4-kakudo","m4-wari-21","m4-wari-31",
    "m4-shosu-add","m4-shosu-sub","m4-wari-22","m4-wari-32","m4-gaisu","m4-keisan-kimari","m4-menseki",
    "m4-menseki-tan","m4-henka","m4-bunsu-kawaru","m4-bunsu-mixed","m4-kake-32","m4-shosu-kake","m4-shosu-wari",
    "m5-taiseki","m5-shosu-kake","m5-shosu-wari","m5-baisu","m5-yakusu","m5-kobaisu","m5-koyakusu","m5-heikin",
    "m5-tan-ryou","m5-bunsu-shosu","m5-yakubun","m5-tsubun","m5-bunsu-add","m5-bunsu-sub","m5-bunsu-int",
    "m5-naikaku","m5-menseki-sankaku","m5-menseki-daikei","m5-hyakubun","m5-enshu","m6-en-menseki","m6-moji",
    "m6-bunsu-kake","m6-bunsu-wari","m6-hayasa","m6-hirei","m6-hi-kantan","m6-hi-tokku","m6-chuutai","m6-baai",
    "m6-daihyou","m6-bunsu-shosu","m6-tani","j1-kanji-yomi","j2-kanji-yomi","j3-kanji-yomi","j4-kanji-yomi",
    "j5-kanji-yomi","j6-kanji-yomi","s4-kencho-th","s4-kencho-kt","s4-kencho-cb","s4-kencho-kn","s4-kencho-cg",
    "s4-kencho-sk","s4-kencho-ky","s4-kencho-all","e5-food","e5-animal","e5-action","e5-place","e5-daymonth",
    "e5-color","e5-school","e6-all","m1-tokei-fun","m2-keta4",
    "m1-nanbanme","m1-nagasa-kurabe","m1-kasa-kurabe","m2-keisan-kufu","m3-jikan-keisan",
    "m3-anzan","m3-ookii-wari","m4-wari-mitsumori","m5-seisu-shosu","m6-oyoso-menseki",
    "r3-living","r3-plants","r3-sun","r3-light","r3-sound","r3-wind","r3-magnet","r3-electric","r3-weight","r3-earth","r4-season","r4-body","r4-electric","r4-air","r4-water","r4-metal","r4-heat","r4-weather","r4-moon","r4-land","r5-seed","r5-growth","r5-flower","r5-animal","r5-cloud","r5-typhoon","r5-river","r5-solubility","r5-pendulum","r5-electromagnet","r6-burn","r6-body","r6-plant","r6-chain","r6-water","r6-gas","r6-lever","r6-electric","r6-land","r6-moon",
    "m1-add10-small","m1-add10-ten","m1-make10","m1-add-over10","m1-sub10-small","m1-sub10-ten","m1-sub-over10","m1-add-2d1-no","m1-add3-under10","m1-add3-over10","m2-add-2d-no","m2-add-2d-ones","m2-add-2d-100","m2-add-2d1d","m2-sub-2d-no","m2-sub-2d-ones","m2-sub-100","m2-kuku-2","m2-kuku-3","m2-kuku-4","m2-kuku-5","m2-kuku-6","m2-kuku-7","m2-kuku-8","m2-kuku-9","m3-add-3d-no","m3-add-3d-ones","m3-add-3d-tens","m3-add-3d-1000","m3-sub-3d-no","m3-sub-3d-ones","m3-sub-3d-chain","m3-sub-3d-zero","m3-mul-2d1d-no","m3-mul-2d1d-carry","m3-mul-3d1d","m3-mul-2d2d-no","m3-mul-2d2d-carry","m3-div-kuku","m3-div-rem-small","m3-div-rem-large","m3-dec-add-no","m3-dec-add-carry","m3-dec-sub",
    "m4-div-2d1d-exact","m4-div-2d1d-rem","m4-div-3d1d-short","m4-div-3d1d-zero","m4-div-3d1d-rem","m4-div-2d2d-exact","m4-div-2d2d-rem","m4-div-3d2d-1q","m4-div-3d2d-2q","m4-mul-3d2d-no","m4-mul-3d2d-carry","m4-dec-add-hundredth","m4-dec-sub-hundredth","m4-dec-mul-int","m4-dec-div-int","m4-frac-mixed-add","m4-frac-mixed-sub",
    "m5-dec-mul-tenths","m5-dec-mul-hundredths","m5-dec-div-tenths","m5-dec-div-hundredths","m5-frac-reduce-one","m5-frac-reduce-multi","m5-frac-common-multiple","m5-frac-common-coprime","m5-frac-add-simple","m5-frac-add-reduce","m5-frac-sub-simple","m5-frac-sub-reduce","m5-frac-mul-int","m5-frac-div-int",
    "m6-frac-mul-proper","m6-frac-mul-cross","m6-frac-div-proper","m6-frac-div-mixed","m6-mix-dec-frac","m6-ratio-reduce","m6-speed-distance","m6-speed-time"
  ];
  const IDX = {}; UNIT_IDS.forEach((id, i) => { IDX[id] = i; });
  const GRADE_FIX = { "m6-hayasa": 5, "m5-bunsu-int": 6, "m5-frac-mul-int": 6, "m5-frac-div-int": 6, "m6-speed-distance": 5, "m6-speed-time": 5 }; /* 現行教科書に合わせて学年を直した単元（IDは互換のため据え置き） */
  const uGrade = id => GRADE_FIX[id] || +id[1];
  /* 教科の成果（固定ゾーン）。track：play 算数＝遊具／lib 国語＝図書館／flag 英語＝国旗。need：その教科で「できた」以上の単元の数 */
  const PARTS = [
    { id: "slide", art: "d-slide", track: "play", need: 1 }, { id: "swing", art: "d-swing", track: "play", need: 3 },
    { id: "bar", art: "h-bar", track: "play", need: 6 }, { id: "jungle", art: "h-jungle", track: "play", need: 10 },
    { id: "book1", art: "h-book1", track: "lib", need: 1 }, { id: "lib", art: "h-lib", track: "lib", need: 2 },
    { id: "flagjp", art: "h-flagjp", track: "flag", need: 1 }, { id: "flagus", art: "h-flagus", track: "flag", need: 3 }
  ];
  const TRACK_SUBJ = { play: "m", lib: "j", flag: "e" };
  /* かざり（どんぐりで買う）。値段の合計 380 */
  const DECOR = [
    { id: "tree", art: "d-tree", price: 5 }, { id: "flower", art: "h-flower", price: 10 }, { id: "bench", art: "h-bench", price: 25 },
    { id: "hutch", art: "h-hutch", price: 40 }, { id: "pond", art: "h-pond", price: 60 }, { id: "clock", art: "h-clock", price: 90 },
    { id: "rainbow", art: "h-rainbow", price: 150 }
  ];
  const DIDX = {}; DECOR.forEach((d, i) => { DIDX[d.id] = i; });
  const PRICE_TOTAL = DECOR.reduce((n, d) => n + d.price, 0);
  /* たんけんメモ（ひろばの物ぶん）：がっこう ＋ 固定ゾーン 8 ＋ かざり 7 ＝ 16 */
  const MEMO_O = ["school"].concat(PARTS.map(p => p.id), DECOR.map(d => d.id));
  /* まなびっこ（v3.0）。MK_IDS は バックアップ・（のちの）友だち対戦で送る番号なので、追加だけ。順番を変えない。
     subj は 単元 ID の1字目と同じ。art は vendor/img/manabikko/{art}-{base|grown|joy}-v3-{256|128}.webp（null なら絵がまだ＝出さない）。
     理科（r）など 絵のない教科は MK_SOON に 書いておき、画面では「もうすぐ」の枠だけ出す */
  const MK_IDS = ["sankakuru", "kotohane", "chizupon", "eimaru"];
  const MK = [
    { id: "sankakuru", subj: "m", art: "math" }, { id: "kotohane", subj: "j", art: "japanese" },
    { id: "chizupon", subj: "s", art: "social" }, { id: "eimaru", subj: "e", art: "english" }
  ];
  const MK_SOON = ["r"];
  const MK_BY = {}; MK.forEach(c => { MK_BY[c.id] = c; });
  const MK_STAGE = [0, 3, 8], MK_CAND = 3, MK_SHOW = 3, MK_QMAX = 24, MK_ART = ["base", "grown", "joy"];
  const QCODE = "*mjser";        // q の中身：* はじめの1たい／m j s e r その教科の「できた」

  const int = (v, lo, hi, d) => { v = Math.floor(+v); return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d; };
  const dayNum = d => Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5);
  const dayDate = n => new Date(n * 864e5 + 12 * 36e5);   // 表示用（その日の昼）

  function fresh(today) {
    return { v: 1, d0: today, last: today, u: {}, ac: { e: 0, s: 0 }, day: { n: today, got: 0, carry: 0, first: 0, quiz: 0, cap: 0, shown: 0 },
      own: [], pl: {}, gift: 0, done: 0, theme: 0, vp: 0, vz: 0, tk: { n: 0, star: 0, d: today, got: 0, used: 0 }, mo: [], mu: [], mk: mkFresh() };
  }
  /* mk：w はじめの1たいを もらった／q えらべる分（QCODE の字）／own { id: { d もらった日, p なかよし, ld なかよしが ふえた日, k きらきら(のちの段階), v 見せた段階 } }
     sh ひろばに だしている子／mg 古い記録から 計算した（はじめの 案内を出す） */
  function mkFresh() { return { w: 0, q: [], own: {}, sh: [], mg: 0 }; }
  const uniq = (a, ok) => (Array.isArray(a) ? a : []).filter((id, i, b) => typeof id === "string" && ok(id) && b.indexOf(id) === i);
  const mkStageP = p => (p >= MK_STAGE[2] ? 2 : p >= MK_STAGE[1] ? 1 : 0);
  function mkClean(raw, S, today) {
    const M = mkFresh();
    if (!raw || typeof raw !== "object") {          // まなびっこの前の記録：これまでの学びから えらべる分を 計算する（一方向・1回だけ）
      if (Object.keys(S.u).length) { M.w = 1; M.q.push("*"); }
      for (const id of UNIT_IDS) if (S.u[id] && S.u[id][0] >= 2 && M.q.length < MK_QMAX) M.q.push(id[0]);
      M.mg = M.q.length ? 1 : 0;
      return M;
    }
    M.w = raw.w ? 1 : 0; M.mg = raw.mg ? 1 : 0;
    M.q = (Array.isArray(raw.q) ? raw.q : []).filter(h => typeof h === "string" && h.length === 1 && QCODE.includes(h)).slice(0, MK_QMAX);
    if (raw.own && typeof raw.own === "object") for (const id of Object.keys(raw.own)) {
      if (!MK_BY[id] || !raw.own[id] || typeof raw.own[id] !== "object") continue;
      const o = raw.own[id];
      M.own[id] = { d: int(o.d, 0, 9e6, today), p: int(o.p, 0, 1295, 0), ld: int(o.ld, 0, 9e6, 0), k: o.k ? 1 : 0, v: int(o.v, 0, 2, 0) };
    }
    M.sh = uniq(raw.sh, id => id in M.own).slice(0, MK_SHOW);
    return M;
  }
  /* 保存された物を、形を確かめて作り直す（壊れていても、使える所だけ残す） */
  function clean(raw, today) {
    const S = fresh(today);
    if (!raw || typeof raw !== "object" || raw.v !== 1) return S;
    S.d0 = int(raw.d0, 1, 9e6, today); S.last = int(raw.last, 1, 9e6, today);
    if (raw.u && typeof raw.u === "object") for (const id of Object.keys(raw.u)) {
      if (!(id in IDX) || !Array.isArray(raw.u[id])) continue;
      const [s, q, t] = raw.u[id], st = int(s, 0, 3, 0); if (!st) continue;
      S.u[id] = [st, int(q, 0, 9e6, 0), int(t, 0, 9e6, 0)];
    }
    if (raw.ac) { S.ac.e = int(raw.ac.e, 0, 9e6, 0); S.ac.s = Math.min(S.ac.e, int(raw.ac.s, 0, 9e6, 0)); }
    const d = raw.day || {};
    S.day = { n: int(d.n, 0, 9e6, today), got: int(d.got, 0, CAP, 0), carry: int(d.carry, 0, 9e6, 0), first: d.first ? 1 : 0, quiz: d.quiz ? 1 : 0, cap: d.cap ? 1 : 0, shown: d.shown ? 1 : 0 };
    S.own = (Array.isArray(raw.own) ? raw.own : []).filter((id, i, a) => id in DIDX && a.indexOf(id) === i);
    const used = new Set();
    if (raw.pl && typeof raw.pl === "object") for (const id of Object.keys(raw.pl)) {
      const c = int(raw.pl[id], 0, CELLS, 0);
      if (S.own.includes(id) && c && !used.has(c)) { S.pl[id] = c; used.add(c); }
    }
    S.gift = raw.gift ? 1 : 0; S.done = int(raw.done, 0, 9e6, 0); S.theme = int(raw.theme, 0, 2, 0);
    S.vp = int(raw.vp, 0, 99, 0); S.vz = int(raw.vz, 0, 999, 0);
    const k = raw.tk && typeof raw.tk === "object" ? raw.tk : {};            // v2：古い記録には無い（そのときは 0 から）
    S.tk = { n: int(k.n, 0, TK_MAX, 0), star: int(k.star, 0, TK_STARS, 0), d: int(k.d, 0, 9e6, today), got: int(k.got, 0, TK_GET, 0), used: int(k.used, 0, TK_USE_MAX, 0) };
    S.mo = uniq(raw.mo, id => MEMO_O.includes(id)); S.mu = uniq(raw.mu, id => id in IDX);
    S.mk = mkClean(raw.mk, S, today);                                       // v3.0：古い記録には無い（そのときは 学びから 計算）
    return S;
  }
  const balance = S => S.ac.e - S.ac.s;
  /* 日付をそろえる。戻っていたら true（何も動かさない）。新しい日なら、持ちこしの分を今日の分として渡す */
  function sync(S, today) {
    if (today < S.last) return true;
    S.last = today;
    if (S.day.n !== today) {
      const pay = Math.min(S.day.carry, CAP);
      S.day = { n: today, got: pay, carry: S.day.carry - pay, first: 0, quiz: 0, cap: 0, shown: 0 };
      S.ac.e += pay;
    }
    return false;
  }
  /* どんぐりを渡す。1日 CAP まで。あふれた分は持ちこし。完成後は出さない。 */
  function give(S, n, ctx) {
    if (n <= 0 || S.done) return;
    const room = Math.max(0, CAP - S.day.got), pay = Math.min(room, n), rest = n - pay;
    S.day.got += pay; S.ac.e += pay; S.day.carry += rest;
    ctx.paid += pay; ctx.deferred += rest;
    if (rest > 0 && !S.day.cap) { S.day.cap = 1; ctx.capFirst = true; }
  }
  const gapFull = (grade, ug) => !grade || grade - ug <= 1;      // 自分の学年と1つ下までは満額

  function count(S, subj, min) { let n = 0; for (const id in S.u) if (id[0] === subj && S.u[id][0] >= (min || 2)) n++; return n; }
  const partHave = (S, p) => count(S, TRACK_SUBJ[p.track]) >= p.need;
  function parts(S) {         // 固定ゾーンの8つ。have：来ている／next：その教科の次の1つ（シルエットに出す）
    const out = PARTS.map(p => ({ ...p, have: partHave(S, p), next: false })), seen = {};
    for (const o of out) if (!o.have && !seen[o.track]) { o.next = true; seen[o.track] = 1; }
    return out;
  }
  const stage = (S, id) => (S.u[id] ? S.u[id][0] : 0);
  const pending = (S, id) => !!(S.u[id] && S.u[id][0] === 1 && S.u[id][1]);      // 1回めの条件は満たした（あしたの2回めを待つ）

  /* ---------- たんけんチケット ----------
     ★ は「できた」「マスター」1つにつき1つ。5つで 1まい。持てるのは 3まい。1日に増えるのは 2まいまで。
     3まい持っているとき・今日 2まい増えたときは ★ を 5つで止めておく（なくならない。あとで まい数にかわる） */
  function tkRoll(S, today) {
    if (today > S.tk.d) { S.tk.d = today; S.tk.got = 0; S.tk.used = 0; }
    return tkGrant(S);
  }
  function tkGrant(S) {
    let g = 0;
    while (S.tk.star >= TK_STARS && S.tk.n < TK_MAX && S.tk.got < TK_GET) { S.tk.star -= TK_STARS; S.tk.n++; S.tk.got++; g++; }
    S.tk.star = Math.min(S.tk.star, TK_STARS);
    return g;
  }
  /* 1日に つかえる数：端末の せってい(0〜5。ふつう 2)と、リンクの tk（あれば）の 小さいほう */
  function tkLimit(dev, link) {
    const d = dev === undefined || dev === null ? TK_USE : int(dev, 0, TK_USE_MAX, TK_USE);
    return link === undefined || link === null ? d : Math.min(d, int(link, 0, TK_USE_MAX, TK_USE));
  }
  /* いまの状態：n まい／left＝きょう あと何回／ok＝いま つかえる／why＝つかえない理由（none チケットなし／day きょうはおしまい／off せんせいがオフ／back 日付がもどっている） */
  function tkState(S, today, limit) {
    tkRoll(S, today);
    const left = Math.max(0, limit - S.tk.used), back = today < S.last;
    const why = limit <= 0 ? "off" : back ? "back" : left <= 0 ? "day" : S.tk.n <= 0 ? "none" : "";
    return { n: S.tk.n, left, ok: !why, why };
  }
  function tkUse(S, today, limit) {
    const st = tkState(S, today, limit); if (!st.ok) return false;
    S.tk.n--; S.tk.used++; tkGrant(S); return true;
  }

  /* ---------- たんけんメモ ---------- */
  const memoCount = S => S.mo.length + S.mu.length;
  const memoTotal = () => MEMO_O.length + UNIT_IDS.length;
  function memoAdd(S, k, id) {
    const a = k === "o" ? S.mo : S.mu;
    if (k === "o" ? !MEMO_O.includes(id) : !(id in IDX)) return false;
    if (a.includes(id)) return false;
    a.push(id); return true;
  }
  /* ゴールで 1つ えらぶ。ひろばに ある物の メモ と 自分の学年の単元の メモを かわりばんこに。ぜんぶ もっていれば 持っている中から（isNew:false）。o = { grade, seed } */
  function memoPick(S, o) {
    const g = o.grade | 0, seed = Math.abs(o.seed | 0);
    const have = ["school"].concat(PARTS.filter(p => partHave(S, p)).map(p => p.id), S.own);
    const objs = have.filter(id => !S.mo.includes(id));
    const mine = UNIT_IDS.filter(id => !S.mu.includes(id) && (!g || uGrade(id) === g));
    const any = UNIT_IDS.filter(id => !S.mu.includes(id));
    const units = mine.length ? mine : any;
    const pickU = () => units.length ? { k: "u", id: units[seed % units.length], isNew: true } : null;
    const pickO = () => objs.length ? { k: "o", id: objs[seed % objs.length], isNew: true } : null;
    const r = memoCount(S) % 2 === 0 ? (pickO() || pickU()) : (pickU() || pickO());
    if (r) return r;
    return { k: "o", id: have[seed % have.length], isNew: false };
  }

  /* ---------- ひろばたんけんの地図 ----------
     7×5 マス。左下が スタート、右上が ゴール。ゴールの手前の とびら F は 1つだけで、かならず通る（2問 せいかいで ひらく。まちがえても 何度でも）。
     とびら D（3〜5つ）は 近道：まちがえると とじるが、D を ぜんぶ 通らない 遠まわりの道が かならず ある（まちがえても 先へ進める）。
     ひろばの 物が多いほど、かべが ぬけて 近道が ふえる（0〜3）。かざり用の 柱は (奇数, 奇数) の 6か所。
     マス：1 かべ／0 みち／2 とびら D／3 とびら F／4 スタート／5 ゴール */
  const MW = 7, MH = 5, DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  function mulberry(a) { a = a >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function bfs(g, blockD, from) {            // blockD=true で 近道（D）をふさぐ。F・スタート・ゴールは通れる
    const dist = Array.from({ length: MH }, () => Array(MW).fill(-1)), q = [from]; dist[from[1]][from[0]] = 0;
    for (let i = 0; i < q.length; i++) {
      const [x, y] = q[i];
      for (const [dx, dy] of DIRS) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= MW || ny >= MH || dist[ny][nx] >= 0) continue;
        const c = g[ny][nx]; if (c === 1 || (blockD && c === 2)) continue;
        dist[ny][nx] = dist[y][x] + 1; q.push([nx, ny]);
      }
    }
    return dist;
  }
  function explorerMap(seed, nItems, depth) {
    const extraN = Math.min(3, Math.floor((nItems | 0) / 4)), S0 = [0, MH - 1], G0 = [MW - 1, 0];
    let last = null, spare = null;
    for (let at = 0; at < 60; at++) {
      const r = mulberry((seed | 0) * 7919 + at * 104729 + 13), g = Array.from({ length: MH }, () => Array(MW).fill(1));
      const seen = new Set(["0,2"]), cs = [[0, 2]]; g[4][0] = 0;
      while (cs.length) {
        const [cx, cy] = cs[cs.length - 1], nb = DIRS.map(([dx, dy]) => [cx + dx, cy + dy, dx, dy]).filter(([x, y]) => x >= 0 && y >= 0 && x < 4 && y < 3 && !seen.has(x + "," + y));
        if (!nb.length) { cs.pop(); continue; }
        const [nx, ny, dx, dy] = nb[Math.floor(r() * nb.length)];
        g[2 * cy + dy][2 * cx + dx] = 0; g[2 * ny][2 * nx] = 0; seen.add(nx + "," + ny); cs.push([nx, ny]);
      }
      const d0 = bfs(g, false, S0); let [x, y] = G0; const path = [[x, y]];
      while (x !== S0[0] || y !== S0[1]) {
        const k = DIRS.map(([dx, dy]) => [x + dx, y + dy]).find(([a, b]) => a >= 0 && b >= 0 && a < MW && b < MH && d0[b][a] === d0[y][x] - 1);
        [x, y] = k; path.push([x, y]);
      }
      path.reverse();
      const pas = path.filter(([a, b]) => (a % 2) !== (b % 2)), L = pas.length;     // 道の「あいだ」のマス
      if (L < 4) continue;
      const F = pas[L - 1], c = Math.min(5, L - 1), D = [];
      for (let k = 0; k < c; k++) D.push(pas[Math.floor((k + 0.5) * (L - 1) / c)]);
      D.push(F);
      D.forEach(([a, b]) => { g[b][a] = 2; }); g[F[1]][F[0]] = 3;
      const isLock = (a, b) => (a === G0[0] - 1 && b === G0[1]) || (a === G0[0] && b === G0[1] + 1);   // ゴールの となりは F いがい かべのまま
      for (const [dx, dy] of [[-1, 0], [0, 1]]) { const a = G0[0] + dx, b = G0[1] + dy; if (!(a === F[0] && b === F[1])) g[b][a] = 1; }
      const dd = bfs(g, false, S0);                    // ゴールの 反対がわに 切りはなされた 行きどまりは かべに する
      for (let b = 0; b < MH; b++) for (let a = 0; a < MW; a++) if (g[b][a] === 0 && dd[b][a] < 0) g[b][a] = 1;
      const both = (a, b) => (a % 2 ? [[a - 1, b], [a + 1, b]] : [[a, b - 1], [a, b + 1]]).every(([x, y]) => g[y][x] !== 1);
      const walls = []; for (let b = 0; b < MH; b++) for (let a = 0; a < MW; a++) if (g[b][a] === 1 && (a % 2) !== (b % 2) && !isLock(a, b) && both(a, b)) walls.push([a, b]);
      for (let i = walls.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [walls[i], walls[j]] = [walls[j], walls[i]]; }
      const reach = () => { const d = bfs(g, true, S0); return d[G0[1]][G0[0]] >= 0 ? 1e6 : d.flat().filter(v => v >= 0).length; };
      let cur = reach(), loops = 0;
      for (const [a, b] of walls) {
        if (cur >= 1e6) break;
        g[b][a] = 0; const c2 = reach();
        if (c2 > cur) { cur = c2; loops++; } else g[b][a] = 1;
      }
      if (cur < 1e6) continue;
      const gap = () => bfs(g, true, S0)[G0[1]][G0[0]] - bfs(g, false, S0)[G0[1]][G0[0]];
      if (gap() < 4) { if (!spare || gap() > spare.gap) spare = { gap: gap(), g, walls, D, c, loops, F }; if (at < 59) continue; break; }
      last = finish(g, walls, D, c, loops, gap, extraN);
      break;
    }
    if (!last && spare && spare.gap >= 2) {
      const { g, walls, D, c, loops } = spare;
      last = finish(g, walls, D, c, loops, () => bfs(g, true, S0)[G0[1]][G0[0]] - bfs(g, false, S0)[G0[1]][G0[0]], extraN);
    }
    return last || ((depth | 0) < 40 ? explorerMap((seed | 0) + 7777, nItems, (depth | 0) + 1) : null);
    function finish(g, walls, D, c, loops, gap, extraN) {
      let extra = 0;                                   // ひろばの 物の ぶんだけ かべを ぬく。遠まわりが 近道より 2 以上 長い間だけ
      for (const [a, b] of walls) {
        if (extra >= extraN) break;
        if (g[b][a] !== 1) continue;
        g[b][a] = 0;
        if (gap() >= 2) extra++; else g[b][a] = 1;
      }
      g[S0[1]][S0[0]] = 4; g[G0[1]][G0[0]] = 5;
      return { W: MW, H: MH, grid: g.map(row => row.slice()), start: S0, goal: G0, doors: D.map(([a, b], i) => ({ x: a, y: b, final: i === c, q: i === c ? 2 : 1 })),
        short: bfs(g, false, S0)[G0[1]][G0[0]], long: bfs(g, true, S0)[G0[1]][G0[0]], loops: loops + extra };
    }
  }

  /* ---------- まなびっこ ---------- */
  const mkStage = (S, id) => (S.mk.own[id] ? mkStageP(S.mk.own[id].p) : -1);
  const mkFree = S => MK.filter(c => c.art && !S.mk.own[c.id]);              // まだ なかまに なっていない（絵のある）子
  const mkAvail = S => Math.min(S.mk.q.length, mkFree(S).length);            // いま えらべる数
  function mkPush(S, h, ctx) { if (S.mk.q.length < MK_QMAX) { S.mk.q.push(h); if (ctx) ctx.mk.add++; } }
  /* えらぶ候補（最大3）。q の先頭の教科の子が先。はじめの1たい（*）や その教科の子が いないときは、
     よく れんしゅうしている教科の子 → 表の順。同じ記録なら いつも 同じ候補 */
  function mkCands(S) {
    if (!mkAvail(S)) return [];
    const h = S.mk.q[0], cnt = {}; MK.forEach(c => { cnt[c.subj] = count(S, c.subj, 1); });
    return mkFree(S).map((c, i) => ({ c, i })).sort((a, b) => ((a.c.subj === h ? 0 : 1) - (b.c.subj === h ? 0 : 1)) || (cnt[b.c.subj] - cnt[a.c.subj]) || (a.i - b.i))
      .slice(0, MK_CAND).map(x => x.c);
  }
  function mkPick(S, id, today) {
    if (!mkCands(S).some(c => c.id === id)) return false;
    S.mk.q.shift(); S.mk.own[id] = { d: today, p: 0, ld: today, k: 0, v: 0 }; S.mk.mg = 0;
    if (S.mk.sh.length < MK_SHOW) S.mk.sh.push(id);
    return true;
  }
  /* ひろばに だす／もどす。3たいまで */
  function mkShow(S, id) {
    const i = S.mk.sh.indexOf(id);
    if (i >= 0) { S.mk.sh.splice(i, 1); return true; }
    if (!S.mk.own[id] || S.mk.sh.length >= MK_SHOW) return false;
    S.mk.sh.push(id); return true;
  }
  /* アバター（v3.1-a）：友だち対戦で 送るのは MK_IDS の ID と すがたの段階（0〜2）だけ。名前・文字・絵は 送らない。
     mkWire は 受けとった 値を 調べる：ID は 表（MK_IDS）に あって 絵の ある子だけ。段階は 0〜2 に まるめる（ちがえば 0）。だめなら null */
  function mkWire(id, ms) {
    if (typeof id !== "string" || id.length > 16 || !MK_IDS.includes(id) || !MK_BY[id] || !MK_BY[id].art) return null;
    const st = typeof ms === "number" && Number.isInteger(ms) && ms >= 0 && ms <= 2 ? ms : 0;
    return { mk: id, ms: st };
  }
  /* 自分の アバター：pref が "" なら「なし」。pref が もっている子なら その子。それ以外は ひろばの 1ばんめ→もっている 1ばんめ→なし */
  function mkAvatar(S, pref) {
    if (!S || !S.mk) return null;
    const ok = id => !!(id && S.mk.own[id] && MK_BY[id] && MK_BY[id].art);
    if (pref === "") return null;
    const id = ok(pref) ? pref : S.mk.sh.find(ok) || MK_IDS.find(ok);
    return id ? { mk: id, ms: mkStageP(S.mk.own[id].p) } : null;
  }
  /* つぎの すがたまで：{ st 段階0〜2, left あと いくつ（さいごなら 0）, p } */
  function mkNext(S, id) {
    const o = S.mk.own[id]; if (!o) return null;
    const st = mkStageP(o.p); return { st, p: o.p, left: st >= 2 ? 0 : MK_STAGE[st + 1] - o.p };
  }

  /* 1回の れんしゅう（単元・ゲーム・先生のクイズ）が終わったときの処理。
     run = { today, grade, units:[{id,n,o}], answered, correct, quiz }
     返り値 = { blocked, events:[{t,id?,gain?}], paid, deferred, capFirst, newParts:[id], mk:{ add えらべる分が ふえた数, grow:[すがたが かわった子] } } */
  function recordRun(S, run) {
    const ctx = { blocked: false, events: [], paid: 0, deferred: 0, capFirst: false, newParts: [], tickets: 0, mk: { add: 0, grow: [] } };
    if (sync(S, run.today)) { ctx.blocked = true; return ctx; }
    const before = new Set(parts(S).filter(p => p.have).map(p => p.id)), today = run.today;
    for (const r of run.units || []) {
      if (!(r.id in IDX) || !(r.n > 0)) continue;
      let u = S.u[r.id];
      if (r.o >= 1 && !u) { u = S.u[r.id] = [1, 0, today]; ctx.events.push({ t: "found", id: r.id }); }
      if (!u) continue;
      const ok7 = r.n >= 5 && r.o / r.n >= 0.7, ok9 = r.n >= 5 && r.o / r.n >= 0.9;
      const low = !gapFull(run.grade, uGrade(r.id));
      if (u[0] < 2 && ok7) {
        if (!u[1]) { u[1] = today; ctx.events.push({ t: "pend", id: r.id }); }
        else if (today > u[1]) { u[0] = 2; u[2] = today; const g = low ? 1 : 2; give(S, g, ctx); ctx.events.push({ t: "can", id: r.id, gain: g }); }
      } else if (u[0] === 2 && ok9 && today > u[2]) {
        u[0] = 3; u[2] = today; const g = low ? 1 : 3; give(S, g, ctx); ctx.events.push({ t: "master", id: r.id, gain: g });
      }
    }
    tkRoll(S, today);
    S.tk.star = Math.min(TK_STARS, S.tk.star + ctx.events.filter(e => e.t === "can" || e.t === "master").length);
    ctx.tickets = tkGrant(S);
    const ans = run.answered | 0, cor = run.correct | 0;
    if (!S.day.first && ans >= 5 && cor / ans >= 0.6) { S.day.first = 1; give(S, 1, ctx); ctx.events.push({ t: "first", gain: 1 }); }
    if (run.quiz && !S.day.quiz && ans >= 3) { S.day.quiz = 1; give(S, 2, ctx); ctx.events.push({ t: "quiz", gain: 2 }); }
    ctx.newParts = parts(S).filter(p => p.have && !before.has(p.id)).map(p => p.id);
    /* まなびっこ：はじめの1たい・「できた」で えらべる分。なかよしは べつの日の れんしゅうと「できた」「マスター」で。下の学年（2つ以上）は 数えない */
    const M = S.mk, low = id => !gapFull(run.grade, uGrade(id));
    if (!M.w && (ans >= 5 || (run.quiz && ans >= 3))) { M.w = 1; mkPush(S, "*", ctx); }
    for (const e of ctx.events) if (e.t === "can" && !low(e.id)) mkPush(S, e.id[0], ctx);
    const per = {}; for (const r of run.units || []) if (r.id in IDX && r.n > 0 && !low(r.id)) per[r.id[0]] = (per[r.id[0]] || 0) + (r.n | 0);
    for (const id in M.own) {
      const o = M.own[id], subj = MK_BY[id].subj, st0 = mkStageP(o.p);
      if ((per[subj] || 0) >= 5 && today > o.ld) { o.p++; o.ld = today; }
      o.p = Math.min(1295, o.p + ctx.events.filter(e => (e.t === "can" || e.t === "master") && e.id[0] === subj && !low(e.id)).length);
      if (mkStageP(o.p) > st0) ctx.mk.grow.push(id);
    }
    return ctx;
  }
  /* ひろばをはじめて開いたとき、はじめの どんぐり5こ（1回だけ。1日の上限には入れない） */
  function claimGift(S, today) {
    sync(S, today);
    if (S.gift) return 0;
    S.gift = 1; S.ac.e += GIFT; return GIFT;
  }
  function buy(S, id) {
    const d = DECOR[DIDX[id]];
    if (!d || S.own.includes(id) || balance(S) < d.price) return false;
    S.ac.s += d.price; S.own.push(id); return true;
  }
  const cellOf = (S, c) => Object.keys(S.pl).find(id => S.pl[id] === c) || null;
  function place(S, id, cell) {
    if (!S.own.includes(id) || !(cell >= 1 && cell <= CELLS)) return false;
    const o = cellOf(S, cell); if (o && o !== id) return false;
    S.pl[id] = cell; return true;
  }
  function unplace(S, id) { if (!(id in S.pl)) return false; delete S.pl[id]; return true; }
  /* 完成：かざり7つが全部そろって、全部置いてある。完成日を記録（1回だけ） */
  function checkDone(S, today) {
    if (S.done || S.own.length < DECOR.length || !DECOR.every(d => d.id in S.pl)) return false;
    S.done = today; return true;
  }
  function summary(S) {
    const r = { found: 0, can: 0, master: 0, total: UNIT_IDS.length };
    for (const id in S.u) { const s = S.u[id][0]; if (s >= 1) r.found++; if (s >= 2) r.can++; if (s >= 3) r.master++; }
    return r;
  }

  /* ---------- バックアップの文字 HR1（MH1／MH2 とは別。変わった分だけ） ----------
     「HR1」＋ はじめの日(3)・もらった(3)・つかった(3)・完成日(3)・かざりの持ち物(2)・かざりの場所(7)・個数(2)＋（単元 2字ずつ：番号×4＋段階）＋確認(3)。英数字だけ。
     日は 2020-01-01 からの日数。
     HR2（v3.0）＝「HR2」＋ まなびっこの部分 ＋ HR1 と同じ中身 ＋ 確認(3)。まなびっこが まだ 何もないときは 今まで通り HR1 を作る。
     HR1 は これからも 読める（読んだあと、まなびっこの えらべる分を 学びから 計算する）。古い版のサイトは HR2 を こわれた文字として 断る（だまって 消えない）。
     まなびっこの部分：しるし(1：はじめの1たい)・数(1)・［番号(2)・なかよし(2)・きらきら(1)］×数・えらべる分（QCODE の字ごとの数(1)×6）・ひろばの数(1)・［番号(2)］×数 */
  const EPOCH = 18262, RE = /^HR[12][0-9A-Z]+$/;
  const b36 = (n, w) => Math.min(Math.pow(36, w) - 1, Math.max(0, n | 0)).toString(36).toUpperCase().padStart(w, "0");
  const sum3 = t => { let h = 7; for (const c of t) h = (h * 31 + c.charCodeAt(0)) % 46656; return h.toString(36).toUpperCase().padStart(3, "0"); };
  const HEAD = 3 + 3 + 3 + 3 + 2 + DECOR.length + 2;
  /* たんけんメモ（あるときだけ 末尾に 28字）：ひろばの物 16ビット(4字)＋単元 20ビットずつ×6(24字) */
  const MEMO_LEN = 4 + 4 * Math.ceil(UNIT_IDS.length / 20);
  function memoStr(S) {
    if (!S.mo.length && !S.mu.length) return "";
    let m = 0; MEMO_O.forEach((id, i) => { if (S.mo.includes(id)) m |= 1 << i; });
    let out = b36(m, 4);
    for (let c = 0; c * 20 < UNIT_IDS.length; c++) { let v = 0; for (let i = 0; i < 20; i++) { const id = UNIT_IDS[c * 20 + i]; if (id && S.mu.includes(id)) v |= 1 << i; } out += b36(v, 4); }
    return out;
  }
  function mkStr(S) {
    const M = S.mk, ids = MK_IDS.filter(id => M.own[id]);
    if (!M.w && !ids.length && !M.q.length) return "";
    const q = M.q.slice(0, MK_QMAX), sh = M.sh.filter(id => M.own[id]).slice(0, MK_SHOW);
    return b36(M.w ? 1 : 0, 1) + b36(ids.length, 1) + ids.map(id => b36(MK_IDS.indexOf(id), 2) + b36(M.own[id].p, 2) + b36(M.own[id].k ? 1 : 0, 1)).join("")
      + QCODE.split("").map(h => b36(q.filter(x => x === h).length, 1)).join("") + b36(sh.length, 1) + sh.map(id => b36(MK_IDS.indexOf(id), 2)).join("");
  }
  function mkParse(body) {
    let p = 0; const rd = w => { if (p + w > body.length) throw new Error("short"); const v = parseInt(body.slice(p, p + w), 36); p += w; return v; };
    try {
      const w = rd(1), n = rd(1), own = {}; if (w > 1) return null;
      for (let i = 0; i < n; i++) { const id = MK_IDS[rd(2)], pt = rd(2), k = rd(1); if (!id || own[id] || k > 1) return null; own[id] = { p: pt, k }; }
      const q = []; for (const h of QCODE) { const c = rd(1); for (let i = 0; i < c; i++) q.push(h); }
      if (q.length > MK_QMAX) return null;
      const sn = rd(1), sh = []; if (sn > MK_SHOW) return null;
      for (let i = 0; i < sn; i++) { const id = MK_IDS[rd(2)]; if (!id || !own[id] || sh.includes(id)) return null; sh.push(id); }
      return { mk: { w, own, q, sh }, len: p };
    } catch (e) { return null; }
  }
  function hrMake(S) {
    const ids = UNIT_IDS.filter(id => stage(S, id) >= 1), mks = mkStr(S), tag = mks ? "HR2" : "HR1";
    let own = 0; DECOR.forEach((d, i) => { if (S.own.includes(d.id)) own |= 1 << i; });
    const body = mks + b36(S.d0 - EPOCH, 3) + b36(S.ac.e, 3) + b36(S.ac.s, 3) + b36(S.done ? S.done - EPOCH : 0, 3) + b36(own, 2)
      + DECOR.map(d => (S.pl[d.id] || 0).toString(36).toUpperCase()).join("") + b36(ids.length, 2)
      + ids.map(id => b36(IDX[id] * 4 + stage(S, id), 2)).join("") + memoStr(S);
    return (tag + body + sum3(tag + body)).match(/.{1,8}/g).join("-");
  }
  function hrParse(str) {
    const t = String(str || "").toUpperCase().replace(/[^0-9A-Z]/g, "");
    if (!RE.test(t) || t.length < 3 + HEAD + 3) return null;
    const tag = t.slice(0, 3); let body = t.slice(3, -3); if (sum3(tag + body) !== t.slice(-3)) return null;
    let mk = null;
    if (tag === "HR2") { const m = mkParse(body); if (!m) return null; mk = m.mk; body = body.slice(m.len); if (body.length < HEAD) return null; }
    const r = coreParse(body); if (r) r.mk = mk;
    return r;
  }
  function coreParse(body) {
    let p = 0; const rd = w => { const v = parseInt(body.slice(p, p + w), 36); p += w; return v; };
    const d0 = rd(3), e = rd(3), s = rd(3), dn = rd(3), ownM = rd(2);
    if (!(s <= e) || ownM >= (1 << DECOR.length)) return null;
    const pl = {}, used = new Set();
    for (let i = 0; i < DECOR.length; i++) {
      const c = parseInt(body[p++], 36);
      if (!(c >= 0 && c <= CELLS)) return null;
      if (c) { if (used.has(c) || !(ownM & (1 << i))) return null; used.add(c); pl[DECOR[i].id] = c; }
    }
    const n = rd(2);
    const rest = body.length - (p + n * 2);
    if (!(n >= 0) || (rest !== 0 && rest !== MEMO_LEN)) return null;
    const u = {}, seen = new Set();
    for (let i = 0; i < n; i++) {
      const v = rd(2), idx = Math.floor(v / 4), st = v % 4;
      if (!(idx < UNIT_IDS.length) || !st || seen.has(idx)) return null;
      seen.add(idx); u[UNIT_IDS[idx]] = st;
    }
    const mo = [], mu = [];
    if (rest) {
      const mm = rd(4); if (!(mm >= 0) || mm >= (1 << MEMO_O.length)) return null;
      MEMO_O.forEach((id, i) => { if (mm & (1 << i)) mo.push(id); });
      for (let c = 0; c * 20 < UNIT_IDS.length; c++) {
        const v = rd(4); if (!(v >= 0 && v < (1 << 20))) return null;
        for (let i = 0; i < 20; i++) if (v & (1 << i)) { const id = UNIT_IDS[c * 20 + i]; if (!id) return null; mu.push(id); }
      }
    }
    return { d0: d0 + EPOCH, e, s, done: dn ? dn + EPOCH : 0, own: DECOR.filter((d, i) => ownM & (1 << i)).map(d => d.id), pl, u, mo, mu };
  }
  /* 読みこみ：記録が減らない合成。段階は大きいほう、かざりは両方、もらった／つかったは大きいほう（残りがマイナスなら つかったを下げる）。
     今日の分・持ちこし・日付のしるしは読みこまない（読みこみで上限は戻らない） */
  function hrMerge(S, r, today) {
    S.d0 = Math.min(S.d0, r.d0 > 0 ? r.d0 : S.d0);
    const raised = [];             // この読みこみで はじめて「できた」以上に なった単元（HR1 のとき まなびっこを 計算する）
    for (const id in r.u) {
      const c = S.u[id], was = c ? c[0] : 0;
      if (!c) S.u[id] = [r.u[id], 0, r.u[id] >= 2 ? today : 0];
      else if (r.u[id] > c[0]) { c[0] = r.u[id]; if (c[0] >= 2 && !c[2]) c[2] = today; }
      if (was < 2 && r.u[id] >= 2) raised.push(id);
    }
    mkMerge(S, r, raised, today);
    for (const id of r.own) if (!S.own.includes(id)) S.own.push(id);
    for (const id in r.pl) if (!(id in S.pl) && !cellOf(S, r.pl[id])) S.pl[id] = r.pl[id];
    S.ac.e = Math.max(S.ac.e, r.e); S.ac.s = Math.min(Math.max(S.ac.s, r.s), S.ac.e);
    if (r.done && (!S.done || r.done < S.done)) S.done = r.done;
    for (const id of r.mo || []) if (!S.mo.includes(id)) S.mo.push(id);       // メモは足すだけ（チケットは読みこまない）
    for (const id of r.mu || []) if (!S.mu.includes(id)) S.mu.push(id);
    if (r.e > 0 || r.own.length) S.gift = 1;
    checkDone(S, S.done || today);
    return S;
  }
  /* まなびっこの合成。くり返し読みこんでも ふえない：なかまは 両方・なかよしは 大きいほう・えらべる分は 字ごとに 多いほう。
     読みこんだ記録が はじめの1たいを もらっていれば、この端末の まだ えらんでいない はじめの1たいは 消す（二重に もらわない） */
  function mkMerge(S, r, raised, today) {
    const M = S.mk;
    if (!r.mk) {                   // 古い HR1：合成した あとの 学びから 計算する
      if (!M.w && Object.keys(r.u).length) { M.w = 1; mkPush(S, "*"); }
      for (const id of raised) mkPush(S, id[0]);
      return;
    }
    const x = r.mk;
    if (x.w && M.q.includes("*")) M.q.splice(M.q.indexOf("*"), 1);
    M.w = M.w || x.w ? 1 : 0;
    const cnt = a => { const o = {}; a.forEach(h => { o[h] = (o[h] || 0) + 1; }); return o; }, a = cnt(M.q), b = cnt(x.q);
    for (const h in b) for (let i = a[h] || 0; i < b[h]; i++) mkPush(S, h);
    for (const id in x.own) {
      const o = M.own[id], y = x.own[id];
      if (!o) M.own[id] = { d: today, p: y.p, ld: today, k: y.k ? 1 : 0, v: mkStageP(y.p) };
      else { o.p = Math.max(o.p, y.p); o.k = o.k || y.k ? 1 : 0; o.v = Math.max(o.v, mkStageP(o.p)); }
    }
    for (const id of x.sh) if (M.sh.length < MK_SHOW && !M.sh.includes(id)) M.sh.push(id);
  }

  return { TK_MAX, TK_GET, TK_STARS, TK_USE, MEMO_O, tkRoll, tkLimit, tkState, tkUse, memoCount, memoTotal, memoAdd, memoPick, explorerMap, CAP, GIFT, CELLS, UNIT_IDS, IDX, PARTS, DECOR, PRICE_TOTAL, TRACK_SUBJ, uGrade, dayNum, dayDate, fresh, clean, balance, sync, give, gapFull,
    MK, MK_IDS, MK_SOON, MK_STAGE, MK_CAND, MK_SHOW, MK_ART, mkFresh, mkStage, mkFree, mkAvail, mkCands, mkPick, mkShow, mkNext, mkWire, mkAvatar,
    count, parts, stage, pending, recordRun, claimGift, buy, cellOf, place, unplace, checkDone, summary, hrMake, hrParse, hrMerge };
});
