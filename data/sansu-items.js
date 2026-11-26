/* ひらめっと 算数の「まとまり」（教科の へや の 項目タイル）と「とっくん」
   docs/screen-split.md 3章の 段階①（データだけ）。画面はまだ これを 読まない（段階②〜④で使う）。
   単元（data/units.js）の item（学習項目タグ）を、子ども向けの 11の まとまりに 分ける。2026-11-19 ユーザーが 決めた。
   学年ごとに、単元が ある まとまりだけ 出す（1年は5こ・3年は10こ・5年は7こ ＋とっくん）。

   ■ GROUPS[i] = { id, t:[漢字《よみ》, ひらがな], d:[説明, ひらがな], items:[タグ], tools:[とっくんの id] }
     t・d の 2つめは 1・2年の やさしい表示用（index.html の T() の [漢字, ひらがな] と同じ 形）
     items   この まとまりに 入れる 単元の item。「その他」や、べつの まとまりに 入れたい 単元は MOVE に 書く
     tools   この まとまりの 中にも 出す どうぐ（TOKKUN の id。学年は TOKKUN の g で しぼる）
   ■ MOVE = { 単元ID: まとまりの id } … item とは べつの まとまりに 入れる 単元（「その他」は ぜんぶ ここ）
   ■ TOKKUN[i] = { id, t, d, g:[学年], go } … 単元と つながらない れんしゅう。go は 今の 入口（課題リンクの 形は かえない）
     go が "url:" で はじまる ものは べつの アプリ（同じ オリジン）
   ■ groupOf(unit) → まとまりの id（算数で ない・どこにも 入らない ときは null）
     unitsOf(units, groupId, g) → その まとまり・学年の 単元（units の 順。status:"later" も ふくむ）
     groupsFor(units, g) → 単元が ある まとまりだけ [{ ...GROUPS[i], units:[…], tools:[TOKKUN…] }]
     tokkunFor(g) → その学年の TOKKUN
   画面（DOM）・保存（localStorage）には さわらない。tools/test-sansu-items.js で 検査する。 */
(function (root) {
  "use strict";
  const ALL = [1, 2, 3, 4, 5, 6];
  const GROUPS = [
    { id: "kazu", t: ["数《かず》", "かず"], d: ["数《かず》の しくみ・大《おお》きい 数《かず》", "かずの しくみ・おおきい かず"], items: ["数をおぼえる"], tools: [] },
    { id: "tashihiki", t: ["たし算《ざん》・ひき算《ざん》", "たしざん・ひきざん"], d: ["たす・ひく・ひっ算《さん》", "たす・ひく・ひっさん"], items: ["たし算", "ひき算"], tools: [] },
    { id: "kake", t: ["かけ算《ざん》", "かけざん"], d: ["九九《くく》・かけ算《ざん》の ひっ算《さん》", "くく・かけざんの ひっさん"], items: ["かけ算"], tools: [] },
    { id: "wari", t: ["わり算《ざん》", "わりざん"], d: ["わける・あまり・ひっ算《さん》", "わける・あまり・ひっさん"], items: ["わり算"], tools: [] },
    { id: "shosu", t: ["小数《しょうすう》", "しょうすう"], d: ["0.1 の しくみ・小数《しょうすう》の 計算《けいさん》", "0.1の しくみ・しょうすうの けいさん"], items: ["小数"], tools: [] },
    { id: "bunsu", t: ["分数《ぶんすう》", "ぶんすう"], d: ["分数《ぶんすう》の しくみ・分数《ぶんすう》の 計算《けいさん》", "ぶんすうの しくみ・ぶんすうの けいさん"], items: ["分数", "分数と小数"], tools: [] },
    { id: "zukei", t: ["図形《ずけい》", "ずけい"], d: ["かたち・角《かく》・面積《めんせき》・体積《たいせき》", "かたち"], items: ["図形"], tools: [] },
    { id: "tani", t: ["単位《たんい》・はかり", "たんい・はかり"], d: ["長《なが》さ・かさ・重《おも》さ・時《じ》こく", "ながさ・かさ・とけい"], items: ["単位"], tools: ["meter"] },
    { id: "graph", t: ["グラフ・表《ひょう》", "グラフ・ひょう"], d: ["表《ひょう》や グラフを よむ・平均《へいきん》", "ひょうや グラフを よむ"], items: ["表とグラフ"], tools: [] },
    { id: "wariai", t: ["わりあい・はやさ・比《ひ》", "わりあい・はやさ・ひ"], d: ["割合《わりあい》・速《はや》さ・比《ひ》・比例《ひれい》", "わりあい・はやさ・ひ"], items: [], tools: [] },
    { id: "bunsho", t: ["文章題《ぶんしょうだい》・しき", "ぶんしょうだい・しき"], d: ["お話《はなし》を しきに する・□の 数《かず》", "おはなしを しきに する"], items: ["文章題", "□の数", "計算のきまり"], tools: [] }
  ];
  const MOVE = {
    // 「その他」の 行き先
    "m1-tokei": "tani", "m1-tokei-fun": "tani",                                    // とけい（時こく）
    "m4-gaisu": "kazu", "m4-gaisu-shisha": "kazu", "m4-gaisu-ue": "kazu", "m4-gaisu-hanni": "kazu", "m4-gaisu-mitsumori": "kazu",                                                            // がい数
    "m5-baisu": "kazu", "m5-yakusu": "kazu", "m5-kobaisu": "kazu", "m5-koyakusu": "kazu",   // 整数の 性質
    "m6-baai": "graph",                                                            // 場合の数（データの活用）
    "m4-henka": "wariai",                                                          // 変わり方
    "m5-tan-ryou": "wariai", "m5-hyakubun": "wariai",
    "m6-hayasa": "wariai", "m6-speed-distance": "wariai", "m6-speed-time": "wariai",
    "m6-hirei": "wariai", "m6-hi-kantan": "wariai", "m6-hi-tokku": "wariai", "m6-ratio-reduce": "wariai",
    // item とは べつの まとまりに 入れる
    "m2-kuku-hole": "kake",            // □の数：九九の □ は かけ算の 中で
    "m2-keisan-kufu": "tashihiki",     // 計算のきまり：2年の けいさんの くふうは たし算
    "m5-seisu-shosu": "shosu"          // 数をおぼえる：整数と 小数の しくみは 小数の 中で
  };
  const TOKKUN = [
    { id: "kuku", t: ["九九《くく》チャレンジ", "くく チャレンジ"], d: ["九九《くく》を すばやく 答《こた》えよう", "くくを はやく こたえよう"], g: [2, 3], go: "#setup?game=kuku" },
    { id: "masu100", t: ["100マス けいさん", "100マス けいさん"], d: ["たし算《ざん》・ひき算《ざん》・かけ算《ざん》の 100マス", "たしざん・ひきざん・かけざんの 100マス"], g: ALL, go: "url:apps/100masu/index.html" },
    { id: "meter", t: ["めもり名人《めいじん》", "めもりめいじん"], d: ["数直線《すうちょくせん》と はかりを よもう", "すうちょくせんと はかりを よもう"], g: [2, 3, 4], go: "#meter" }
  ];
  const byItem = {};
  GROUPS.forEach(x => x.items.forEach(it => { byItem[it] = x.id; }));
  const tokById = {};
  TOKKUN.forEach(x => { tokById[x.id] = x; });

  function groupOf(u) {
    if (!u || u.subj !== "sansu") return null;
    return MOVE[u.id] || byItem[u.item] || null;
  }
  function unitsOf(units, groupId, g) {
    return (units || []).filter(u => u.subj === "sansu" && (g == null || u.g === g) && groupOf(u) === groupId);
  }
  function tokkunFor(g) {
    return TOKKUN.filter(x => g == null || x.g.includes(g));
  }
  function groupsFor(units, g) {
    return GROUPS.map(x => Object.assign({}, x, {
      units: unitsOf(units, x.id, g),
      tools: x.tools.map(id => tokById[id]).filter(t => t && (g == null || t.g.includes(g)))
    })).filter(x => x.units.length);
  }
  root.MH_SANSU_ITEMS = { GROUPS, MOVE, TOKKUN, groupOf, unitsOf, groupsFor, tokkunFor };
})(typeof window !== "undefined" ? window : this);
