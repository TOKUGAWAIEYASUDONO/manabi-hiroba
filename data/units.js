/* まなびひろば 単元の一覧（教科 › 学年 › 単元）と、単元から問題を作る入口
   読み込み順：data/kanji-grade.js・data/questions.js・data/choices.js → data/gen/core.js → data/gen/*.js → data/units.js
   （index.html への組み込みは別担当。file:// で動くよう、グローバル変数 MH_UNITS に置く）

   ■ 単元 UNITS[i]
     id      "m3-amari" のような一意のID（m=算数 j=国語 s=社会 e=英語 ＋ 学年 ＋ 名前）。リンクや QR にはこの id を入れる
     subj    sansu / kokugo / shakai / eigo
     g       学年（1〜6）。学年をまたぐ組み合わせは unitPick で
     area    学習指導要領（平成29年告示）算数の領域 A 数と計算／B 図形／C 測定(1〜3年)・変化と関係(4〜6年)／D データの活用
     base    内容の項目番号メモ（AIが記憶で書いたもの。人の確認待ち）
     item    ネットレ風の学習項目タグ（数をおぼえる／たし算／ひき算／かけ算／わり算／小数／分数／分数と小数／表とグラフ／図形／単位／□の数／計算のきまり／その他）
     title   単元名（すきるまドリルなど、教科書の単元の並びに合わせた名前）
     note    短い説明
     ex      例題（解き方を1〜3行のやさしい文で。予習ボタン用）
     gen     data/gen/*.js の型の名前（null なら status:"later"＝図が要るので後回し）
     params  型に渡す設定
     max     この単元で出てよい数の上限（check-units が検査）
     ans     答え方の標準（"choice4" 4択／"num" テンキー／"amari" 商とあまり／"dec" 小数点つき／"frac" 分数／"unit" 数＋単位）。どの問題も choices（4択）も必ず持つ
     series / step / stepLabel   段階（例：わり算 1あまりなし→2あまりあり→…）。同じ series の中で step の小さい順に進む
     status  "ready"（出題できる）／"later"（あとで）
     sample  見本に出す問題数（3）

   ■ 1問 make(unit, seed) → { q, a, choices:[4つ], ans, val, tag?, hissan?, ruby?, stem?, unit, g, subj, src? }
     val は正解を正規化した値。判定は MH_UNITS.check(item, 入力) で行う（4択なら選んだ文字、テンキーなら文字列か {q,r}・{w,n,d}・{num,unit}）
     hissan = ひっ算の表示用データ { a, b, op, q?, r? }（わり算は q=商, r=あまり）
   ■ unitPick(unitIds[], n, seed, mix) → 問題の配列（単元を等分、あまりはシードでくばる。mix=false なら単元順）
   ■ UNIT_SETS … 学年をまたぐ「おすすめの組み合わせ」 */
window.MH_UNITS = (function () {
  const G = window.MH_GEN, gens = G.gens;
  const list = [];
  const U = (id, subj, g, area, item, title, gen, params, o) => { o = o || {}; list.push({ id, subj, g, area, base: o.base || "", item, title, note: o.note || "", ex: o.ex || "", gen, params: params || {}, max: o.max, series: o.series, step: o.step, stepLabel: o.label, status: gen ? "ready" : "later", sample: 3 }); };
  const M = "sansu";

  /* ================= 算数 1年 ================= */
  U("m1-kazoeru", M, 1, "A", "数をおぼえる", "いくつかな かずとすうじ", "kazoeru", { max: 20, loose: true }, { base: "A(1)ア 数の数え方", max: 20, note: "20までのものの数をかぞえる", ex: "ものを 1つずつ ゆびで おさえて かぞえよう。\nさいごに かぞえた かずが こたえだよ。" });
  U("m1-kazu-kurabe", M, 1, "A", "数をおぼえる", "かずくらべ", "kazuOokii", { max: 99, loose: true }, { base: "A(1)ア 数の大小", max: 99, note: "いちばん おおきい・ちいさい かずを えらぶ", ex: "まず 十のくらいを くらべよう。\n十のくらいが おなじなら、一のくらいを くらべるよ。" });
  U("m1-juu-to-ichi", M, 1, "A", "数をおぼえる", "10より大きい数・100までの数", "juuToIchi", {}, { base: "A(1)イ 十進位取り記数法", max: 99, note: "10が いくつと 1が いくつ", ex: "10が 3こで 30。\nそれに 1が 5こで 35だよ。" });
  U("m1-narabi", M, 1, "A", "数をおぼえる", "かずの ならび", "tsugiKazu", { max: 99 }, { base: "A(1)ア 数の順序", max: 100, note: "2ずつ・5ずつ・10ずつ ふえる かず", ex: "となりどうしの かずが いくつ ちがうかを 見よう。\nおなじだけ ふやして □の かずを きめるよ。" });
  U("m1-ikutsu-to-ikutsu", M, 1, "A", "たし算", "いくつと いくつ", "gousei10", {}, { base: "A(1)ウ 数の合成・分解", max: 10, note: "10の ぶんかい（合成）", ex: "10は 7と 3、 6と 4 のように わけられるよ。\nゆびを 10本 だして かんがえよう。" });
  U("m1-add10", M, 1, "A", "たし算", "ぜんぶで いくつ（たしざん）", "add10", { limit: 10, loose: true }, { base: "A(2)ア 加法", series: "たし算", step: 1, label: "10まで", max: 10, note: "答えが 10までの たしざん", ex: "3 + 4 は、3から 4つ かぞえ足して 7。\nブロックを 3つと 4つ あわせて かぞえてみよう。" });
  U("m1-sub10", M, 1, "A", "ひき算", "のこりは いくつ（ひきざん）", "sub10", { limit: 10, loose: true }, { base: "A(2)ア 減法", series: "ひき算", step: 1, label: "10まで", max: 10, note: "10までの ひきざん", ex: "8 − 3 は、8こから 3こ とると のこりは 5こ。\nとった ぶんを けして かぞえよう。" });
  U("m1-add3", M, 1, "A", "たし算", "3つの かずの けいさん", "add3", {}, { base: "A(2)ア 3つの数の加減", series: "たし算", step: 2, label: "3つの数", max: 27, note: "3つの かずを 左から じゅんに", ex: "左から じゅんに けいさんするよ。\n2 + 3 + 4 は、2 + 3 = 5、 5 + 4 = 9。" });
  U("m1-add-kuriage", M, 1, "A", "たし算", "たしざん（くりあがり）", "addKuriage", {}, { base: "A(2)イ 繰り上がりのある加法", series: "たし算", step: 3, label: "くり上がり", max: 18, note: "10を こえる たしざん", ex: "9 + 4 は、4を 1と 3に わけるよ。\n9 + 1 = 10、 10 + 3 = 13。" });
  U("m1-sub-kurisage", M, 1, "A", "ひき算", "ひきざん（くりさがり）", "subKurisage", {}, { base: "A(2)イ 繰り下がりのある減法", series: "ひき算", step: 2, label: "くり下がり", max: 18, note: "十いくつ − 1けた", ex: "13 − 5 は、13を 10と 3に わけるよ。\n10 − 5 = 5、 5 + 3 = 8。" });
  U("m1-add-2keta", M, 1, "A", "たし算", "20より 大きい かずの けいさん", "add2plus1", {}, { base: "A(2)ア 2位数と1位数の加減", series: "たし算", step: 4, label: "2けた+1けた", max: 99, note: "2けた ± 1けた（くり上がりなし）", ex: "34 + 5 は、一のくらいだけ たすよ。\n4 + 5 = 9 だから 39。" });
  U("m1-tokei", M, 1, "C", "その他", "いま なんじ・とけい", "tokei1", { loose: true }, { base: "C(2)ア 時刻の読み", max: 12, note: "なんじ・なんじはん", ex: "みじかい はりが 「なんじ」。\nながい はりが 12 なら ちょうど、6 なら はん だよ。" });

  /* ================= 算数 2年 ================= */
  U("m2-hyo", M, 2, "D", "表とグラフ", "ひょうと グラフ", "hyo2", {}, { base: "D(1)ア 簡単な表・グラフ", max: 40, note: "ひょうを 読んで 数を くらべる", ex: "ひょうの 数を 見て、 いちばん 大きい 数を さがそう。\nちがいは ひき算で 出せるよ。" });
  U("m2-jikan", M, 2, "C", "単位", "時こくと 時間", "jikan2", { loose: true }, { base: "C(2)ア 時刻と時間", max: 130, note: "1時間＝60分、午前・午後", ex: "1時間は 60分だよ。\n1時間30分は 60 + 30 = 90分。" });
  U("m2-add-hissan", M, 2, "A", "たし算", "たし算の ひっ算", "add2hissan", {}, { base: "A(2)ア 2位数の加法・筆算", series: "たし算", step: 5, label: "2けた+2けた", max: 198, note: "2けた + 2けた（くり上がりあり）", ex: "一のくらいから たすよ。\n10に なったら 十のくらいに 1 くり上げる。" });
  U("m2-sub-hissan", M, 2, "A", "ひき算", "ひき算の ひっ算", "sub2hissan", {}, { base: "A(2)ア 2位数の減法・筆算", series: "ひき算", step: 3, label: "2けた−2けた", max: 99, note: "2けた − 2けた（くり下がりあり）", ex: "一のくらいが ひけないときは、\n十のくらいから 1 かりて 10 たして ひくよ。" });
  U("m2-nagasa", M, 2, "C", "単位", "長さの たんい", "length2", { loose: true }, { base: "C(1)ア 長さ（mm・cm・m）", max: 599, note: "mm・cm・m の かんさん", ex: "1cm は 10mm だよ。\n3cm 5mm は 30 + 5 = 35mm。" });
  U("m2-kasa", M, 2, "C", "単位", "かさの たんい", "kasa2", { loose: true }, { base: "C(1)ア かさ（L・dL・mL）", max: 9000, note: "L・dL・mL の かんさん", ex: "1L は 10dL、 1dL は 100mL だよ。\n1L は 1000mL。" });
  U("m2-keta3", M, 2, "A", "数をおぼえる", "大きい数（1000まで）", "keta3", {}, { base: "A(1)ア 3位数の表し方", max: 999, note: "100が □こ、10が □こ、1が □こ", ex: "100が 3こで 300、 10が 4こで 40、 1が 5こで 5。\nぜんぶ あわせて 345。" });
  U("m2-keta3-kurabe", M, 2, "A", "数をおぼえる", "大きい数の くらべかた", "keta3Compare", { loose: true }, { base: "A(1)ア 数の大小", max: 999, note: "3けたの数の 大小", ex: "百のくらいから じゅんに くらべよう。\n百のくらいが おなじなら 十のくらいを 見るよ。" });
  U("m2-zukei", M, 2, "B", "図形", "三角形と 四角形", "zukei2", { loose: true }, { base: "B(1)ア 三角形・四角形の構成要素", max: 8, note: "へん・ちょう点・直角の 数", ex: "かこんでいる まっすぐな せんが へん、\nかどの 点が ちょう点だよ。" });
  U("m2-kuku-low", M, 2, "A", "かけ算", "かけ算（1）2〜5のだん", "kuku", { dans: [2, 5] }, { base: "A(3)ア 乗法九九", series: "かけ算", step: 1, label: "2〜5のだん", max: 45, note: "2〜5の だんの 九九", ex: "3 × 4 は、3が 4つ分。\n3 + 3 + 3 + 3 = 12。" });
  U("m2-kuku-high", M, 2, "A", "かけ算", "かけ算（2）6〜9のだん", "kuku", { dans: [6, 9] }, { base: "A(3)ア 乗法九九", series: "かけ算", step: 2, label: "6〜9のだん", max: 81, note: "6〜9の だんの 九九", ex: "7 × 8 は、7の だんを 7、14、21、… と いって、\n8つめの 56 だよ。" });
  U("m2-kuku-hole", M, 2, "A", "□の数", "かけ算（3）□に 入る 数", "kukuHole", {}, { base: "A(3)ウ 乗法の式・□を使った式", max: 81, note: "□ × 6 ＝ 42 の □", ex: "□ × 6 = 42 は、6の だんで 42に なる 数を さがすよ。\n6 × 7 = 42 だから □ は 7。" });
  U("m2-kake-bunsho", M, 2, "A", "かけ算", "かけ算の もんだい", "kakeBunsho", {}, { base: "A(3)イ 乗法の意味", max: 81, note: "1つぶんの数 × いくつ分", ex: "1さらに 3こずつで さらが 4まい。\n3 × 4 = 12 だから ぜんぶで 12こ。" });
  U("m2-bunsu", M, 2, "A", "分数", "分数（わけた 大きさ）", "bunsuKiso", {}, { base: "A(4)ア 簡単な分数（1/2・1/4など）", series: "分数", step: 1, label: "分数の表し方", max: 10, note: "1/2・1/4・1/8", ex: "おなじ 大きさに 4つに わけた 1つぶんが 4ぶんの 1。\n数字では 1/4 と かくよ。" });

  /* ================= 算数 3年 ================= */
  U("m3-kake-kimari", M, 3, "A", "かけ算", "かけ算の きまり（何十・何百）", "kakeJuu", { loose: true }, { base: "A(3)ア 乗法の計算", series: "かけ算", step: 3, label: "何十・何百", max: 9999, note: "30 × 4 など", ex: "30 × 4 は、3 × 4 = 12 を つかうよ。\n12の 後ろに 0を 1つ つけて 120。" });
  U("m3-wari99", M, 3, "A", "わり算", "わり算（九九の はんい）", "warizan", { d: [2, 9], q: [1, 9], amariP: 0, nMax: 81 }, { base: "A(4)ア 除法の意味・九九による除法", series: "わり算", step: 1, label: "あまりなし", max: 81, note: "あまりのない わり算", ex: "12 ÷ 3 は、3の だんで 12に なる 数を さがすよ。\n3 × 4 = 12 だから 答えは 4。" });
  U("m3-add-hissan", M, 3, "A", "たし算", "たし算の ひっ算（3けた）", "add3hissan", {}, { base: "A(2)ア 3位数の加法・筆算", series: "たし算", step: 6, label: "3けた", max: 1798, note: "3けた + 3けた", ex: "一のくらいから じゅんに たすよ。\n10を こえたら となりの くらいに 1 くり上げる。" });
  U("m3-sub-hissan", M, 3, "A", "ひき算", "ひき算の ひっ算（3けた）", "sub3hissan", {}, { base: "A(2)ア 3位数の減法・筆算", series: "ひき算", step: 4, label: "3けた", max: 999, note: "3けた − 3けた", ex: "ひけない くらいは となりから 1 かりるよ。\nかりたら、となりは 1 へるのを わすれずに。" });
  U("m3-nagai", M, 3, "C", "単位", "長いものの 長さ（km）", "tanLength3", { loose: true }, { base: "C(1)ア 長さ（km）", max: 9900, note: "km と m の かんさん", ex: "1km は 1000m だよ。\n2km 300m は 2000 + 300 = 2300m。" });
  U("m3-amari", M, 3, "A", "わり算", "あまりの ある わり算", "warizan", { d: [2, 9], q: [2, 12], amariP: 1, nMax: 99 }, { base: "A(4)イ あまりのある除法", series: "わり算", step: 2, label: "あまりあり", max: 99, note: "÷1けた（あまりあり）", ex: "23 ÷ 5 は、5の だんで 23に ちかい 20 を 見つける。\n5 × 4 = 20、 23 − 20 = 3。 答えは 4 あまり 3。\nあまりは わる数より 小さく するよ。" });
  U("m3-man", M, 3, "A", "数をおぼえる", "大きい数（万）", "man3", {}, { base: "A(1)ア 万の単位", max: 99999, note: "1万・10万までの 数", ex: "10000が 3こで 30000 だよ。\n1000が 12こで 12000。" });
  U("m3-kake-hissan1", M, 3, "A", "かけ算", "かけ算の ひっ算（1）", "kake", { a: [11, 399], b: [2, 9], loose: false }, { base: "A(3)ア 2〜3位数×1位数", series: "かけ算", step: 4, label: "2・3けた×1けた", max: 3591, note: "2〜3けた × 1けた", ex: "一のくらいから じゅんに かけるよ。\nくり上がりの 数は、つぎの くらいの 答えに たす。" });
  U("m3-kake-hissan2", M, 3, "A", "かけ算", "かけ算の ひっ算（2）", "kake", { a: [11, 99], b: [11, 99] }, { base: "A(3)ア 2位数×2位数（要確認）", series: "かけ算", step: 5, label: "2けた×2けた", max: 9801, note: "2けた × 2けた", ex: "23 × 14 は、23 × 4 = 92 と 23 × 10 = 230。\nそれを たして 322。" });
  U("m3-wari-bunsho", M, 3, "A", "わり算", "わり算の もんだい", "wariBunsho", {}, { base: "A(4)ア 除法の意味（等分・包含）", max: 81, note: "同じ数ずつ わける", ex: "12こを 3人で 同じ数ずつ わけると、12 ÷ 3 = 4。\n1人 4こだよ。" });
  U("m3-en", M, 3, "B", "図形", "円と 球", "en3", {}, { base: "B(1)ア 円・球（半径・直径）", max: 40, note: "半径と 直径", ex: "円の 中心から ふちまでが はんけい。\nちょっけいは はんけいの 2ばいだよ。" });
  U("m3-shosu", M, 3, "A", "小数", "小数の しくみ・たし算とひき算", "shosuAddSub", { dpSet: [[1, 1]], op: "±", maxInt: 9 }, { base: "A(5)ア 小数の意味・加減（1/10の位）", series: "小数", step: 1, label: "0.1の くらい", max: 20, note: "0.1の くらいまでの たしひき", ex: "小数点を そろえて 計算するよ。\n2.3 + 1.4 は、23 + 14 = 37 だから 3.7。" });
  U("m3-bunsu-imi", M, 3, "A", "分数", "分数", "bunsuImi3", {}, { base: "A(6)ア 分数の意味・表し方", series: "分数", step: 2, label: "分数の意味", max: 12, note: "1/□の いくつぶん", ex: "1/5が 3こ あつまると 3/5。\n分母は 5、分子は 3こだよ。" });
  U("m3-bunsu-add", M, 3, "A", "分数", "分数の たし算・ひき算（同じ分母）", "bunsuAddSub3", { op: "±" }, { base: "A(6)イ 同分母分数の加減", series: "分数", step: 3, label: "同じ分母", max: 12, note: "分母が 同じ分数", ex: "分母が おなじなら、分子だけを 計算するよ。\n2/7 + 3/7 = 5/7。" });
  U("m3-omosa", M, 3, "C", "単位", "重さの たんい", "tanWeight3", { loose: true }, { base: "C(1)ア 重さ（g・kg・t）", max: 9900, note: "g・kg・t の かんさん", ex: "1kg は 1000g、 1t は 1000kg だよ。\n2kg 300g は 2300g。" });
  U("m3-kuuran", M, 3, "A", "□の数", "□を 使った 式", "kuuran3", {}, { base: "A(7)ア 数量の関係を表す式・□", max: 120, note: "□ ＋ 8 ＝ 15 の □", ex: "□ + 8 = 15 は、15 から 8を ひくと □が わかるよ。\n15 − 8 = 7。" });
  U("m3-hyo", M, 3, "D", "表とグラフ", "ぼうグラフと 表", "hyo3", {}, { base: "D(1)ア 表・棒グラフ", max: 99, note: "表を 読む", ex: "数が 大きいほど ぼうが 長いよ。\nちがいは 大きい 数 − 小さい 数。" });

  /* ================= 算数 4年 ================= */
  U("m4-oku", M, 4, "A", "数をおぼえる", "大きい数の しくみ（億）", "oku4", { loose: false }, { base: "A(1)ア 億・兆の単位", max: 999999999, note: "億・万の 数", ex: "1億は 1万が 10000こ。\n3億 5000万は 350000000 だよ。" });
  U("m4-kakudo", M, 4, "B", "図形", "角の 大きさ", "kakudo4", { loose: true }, { base: "B(1)ア 角の大きさ（度）", max: 360, note: "直線180度・1しゅう360度", ex: "一直線の 角は 180度。\n1つが 70度なら、もう 1つは 180 − 70 = 110度。" });
  U("m4-wari-21", M, 4, "A", "わり算", "わり算の ひっ算（1）÷1けた", "warizan", { d: [2, 9], q: [10, 49], amariP: 0.6, nMax: 99, ans: "amari" }, { base: "A(3)ア 2位数÷1位数", series: "わり算", step: 3, label: "2けた÷1けた", max: 99, note: "2けた ÷ 1けた", ex: "78 ÷ 5 は、たてる→かける→ひく→おろす の くりかえし。\n7の 中に 5は 1 → 15、 28の 中に 5は 5 → 25、 あまり 3。" });
  U("m4-wari-31", M, 4, "A", "わり算", "わり算の ひっ算（1）3けた÷1けた", "warizan", { d: [2, 9], q: [100, 333], amariP: 0.5, nMax: 999, zero: true, ans: "amari" }, { base: "A(3)ア 3位数÷1位数", series: "わり算", step: 4, label: "3けた÷1けた・0を ふくむ", max: 999, note: "3けた ÷ 1けた", ex: "百のくらいから じゅんに 商を たてるよ。\nたてられない ときは 0を かくのを わすれずに。" });
  U("m4-shosu-add", M, 4, "A", "小数", "小数の しくみ（たし算）", "shosuAddSub", { dpSet: [[1, 1], [1, 2], [2, 1], [2, 2]], op: "+", maxInt: 9 }, { base: "A(4)ア 小数の加法（1/100の位）", series: "小数", step: 2, label: "たし算", max: 20, note: "1/100の くらいまで", ex: "小数点の 位置を そろえて、右から たすよ。\n3.5 + 2.14 は 3.50 + 2.14 = 5.64。" });
  U("m4-shosu-sub", M, 4, "A", "小数", "小数の しくみ（ひき算）", "shosuAddSub", { dpSet: [[1, 1], [1, 2], [2, 1], [2, 2]], op: "−", maxInt: 9 }, { base: "A(4)ア 小数の減法（1/100の位）", series: "小数", step: 3, label: "ひき算", max: 10, note: "1/100の くらいまで", ex: "小数点を そろえて ひくよ。\n5.2 − 1.35 は 5.20 − 1.35 = 3.85。" });
  U("m4-wari-22", M, 4, "A", "わり算", "わり算の ひっ算（2）÷2けた", "warizan", { d: [11, 49], q: [2, 9], amariP: 0.5, nMax: 999, ans: "amari" }, { base: "A(3)ア 2位数でわる除法", series: "わり算", step: 5, label: "÷2けた", max: 999, note: "÷2けた（商は1けた）", ex: "84 ÷ 21 は、21を 20と 見て 8÷2 ぐらいで 商を たてるよ。\n21 × 4 = 84 で ちょうど。" });
  U("m4-wari-32", M, 4, "A", "わり算", "わり算の ひっ算（2）3けた÷2けた", "warizan", { d: [11, 49], q: [10, 40], amariP: 0.5, nMax: 999, ans: "amari" }, { base: "A(3)ア 3位数÷2位数", series: "わり算", step: 6, label: "3けた÷2けた", max: 999, note: "3けた ÷ 2けた", ex: "商の くらいを 考えて、たてる→かける→ひく→おろす。\n商が 大きすぎたら 1 へらして やりなおすよ。" });
  U("m4-gaisu", M, 4, "A", "その他", "がい数", "gaisu4", {}, { base: "A(2)ア 概数・四捨五入", max: 100000, note: "ししゃごにゅう", ex: "百のくらいまでの がい数は、十のくらいを 見るよ。\n5以上なら 切り上げ、4以下なら 切りすて。" });
  U("m4-keisan-kimari", M, 4, "A", "計算のきまり", "計算の きまり", "mixOrder4", {}, { base: "A(6)ア 四則混合・( )", max: 200, note: "×÷を 先、( )を 先", ex: "たし算と かけ算が まざっていたら、かけ算を 先に 計算するよ。\n( ) が あれば ( ) の 中を 1ばん 先に。" });
  U("m4-menseki", M, 4, "B", "図形", "面積（長方形・正方形）", "menseki4", {}, { base: "B(3)ア 面積の求め方（長方形・正方形）", series: "面積", step: 1, label: "公式", max: 400, note: "たて × よこ", ex: "長方形の めんせきは たて × よこ。\n正方形は 1へん × 1へん だよ。" });
  U("m4-menseki-tan", M, 4, "B", "単位", "面積の たんい", "mensekiTan4", { loose: true }, { base: "B(3)ア 面積の単位（cm²・m²・a・ha・km²）", series: "面積", step: 2, label: "たんい", max: 9000000, note: "m²・a・ha・km²", ex: "1m² は 10000cm²、 1a は 100m²、 1ha は 100a だよ。\nたんいが 1つ 大きく なるごとの ばいを おぼえよう。" });
  U("m4-henka", M, 4, "C", "その他", "変わり方", "henka4", {}, { base: "C(1)ア 伴って変わる二つの数量", max: 60, note: "きまりを 見つける", ex: "x が 1つ ふえると y が いくつ かわるかを 見よう。\nおなじだけ かわる きまりで つぎの 数を きめるよ。" });
  U("m4-bunsu-kawaru", M, 4, "A", "分数", "分数（仮分数・帯分数）", "bunsuKawaru4", {}, { base: "A(5)ア 仮分数・帯分数", series: "分数", step: 4, label: "仮分数・帯分数", max: 60, note: "仮分数 ⇔ 帯分数", ex: "7/3 は 3/3 が 2つで 6/3、 のこり 1/3。\nだから 2と1/3。 （2と1/3 は 2 + 1/3 の こと）" });
  U("m4-bunsu-mixed", M, 4, "A", "分数", "分数の たし算・ひき算（帯分数）", "bunsuMixed4", { op: "±" }, { base: "A(5)イ 同分母の帯分数の加減", series: "分数", step: 5, label: "帯分数", max: 40, note: "分母が 同じ 帯分数", ex: "整数どうし、分数どうしで 計算するよ。\n分数が 分母を こえたら、整数に 1 くり上げる。" });
  U("m4-kake-32", M, 4, "A", "かけ算", "かけ算の ひっ算（3けた×2けた）", "kake", { a: [101, 499], b: [11, 39] }, { base: "A(3)ア 3位数×2位数", series: "かけ算", step: 6, label: "3けた×2けた", max: 19461, note: "3けた × 2けた", ex: "一のくらいの 答えと 十のくらいの 答えを 出して たすよ。\n十のくらいの 答えは 1けた 左に ずらして かくよ。" });
  U("m4-shosu-kake", M, 4, "A", "小数", "小数の かけ算（整数をかける）", "shosuInt4", { op: "×" }, { base: "A(4)イ 小数×整数", series: "小数", step: 4, label: "小数×整数", max: 90, note: "小数 × 整数", ex: "小数点を 気にせず 整数の かけ算を して、\n小数点を もとの 位置に うつすよ。" });
  U("m4-shosu-wari", M, 4, "A", "小数", "小数の わり算（整数でわる）", "shosuInt4", { op: "÷" }, { base: "A(4)イ 小数÷整数", series: "小数", step: 5, label: "小数÷整数", max: 90, note: "小数 ÷ 整数", ex: "わられる数の 小数点の 上に 商の 小数点を うつして、\n整数と おなじように わるよ。" });

  /* ================= 算数 5年 ================= */
  U("m5-taiseki", M, 5, "B", "図形", "体積", "taiseki5", {}, { base: "B(2)ア 体積の求め方（直方体・立方体）", max: 729, note: "たて × よこ × 高さ", ex: "直方体の 体積は たて × よこ × 高さ。\n立方体は 1へん × 1へん × 1へん だよ。" });
  U("m5-shosu-kake", M, 5, "A", "小数", "小数の かけ算（小数をかける）", "shosuKake5", {}, { base: "A(3)ア 小数×小数", series: "小数", step: 6, label: "小数×小数", max: 99, note: "小数 × 小数", ex: "小数点を 考えずに かけて、\n小数点の 右の けた数の 合計だけ 右から 小数点を うつすよ。" });
  U("m5-shosu-wari", M, 5, "A", "小数", "小数の わり算（小数でわる）", "shosuWari5", {}, { base: "A(3)ア 小数÷小数", series: "小数", step: 7, label: "小数÷小数", max: 600, note: "小数 ÷ 小数（わりきれる）", ex: "わる数と わられる数を 10倍して 整数に してから わるよ。\n6.4 ÷ 1.6 は 64 ÷ 16 = 4。" });
  U("m5-baisu", M, 5, "A", "その他", "整数の 性質（倍数）", "baisu5", { loose: true }, { base: "A(1)ア 倍数・約数", max: 120, note: "倍数を えらぶ", ex: "3の 倍数は 3に 1、2、3… を かけた 数。\n3、6、9、12、… だよ。" });
  U("m5-yakusu", M, 5, "A", "その他", "整数の 性質（約数）", "yakusu5", { loose: true }, { base: "A(1)ア 倍数・約数", max: 60, note: "約数を えらぶ", ex: "12の 約数は 12を わりきれる 数。\n1、2、3、4、6、12 だよ。" });
  U("m5-kobaisu", M, 5, "A", "その他", "整数の 性質（最小公倍数）", "kobaisu5", {}, { base: "A(1)ア 公倍数・最小公倍数", max: 140, note: "最小公倍数", ex: "どちらの 倍数にも なっている 数が 公倍数。\nそのうち 1ばん 小さい 数が 最小公倍数。" });
  U("m5-koyakusu", M, 5, "A", "その他", "整数の 性質（最大公約数）", "koyakusu5", {}, { base: "A(1)ア 公約数・最大公約数", max: 60, note: "最大公約数", ex: "どちらも わりきれる 数が 公約数。\nそのうち 1ばん 大きい 数が 最大公約数。" });
  U("m5-heikin", M, 5, "D", "表とグラフ", "平均", "heikin5", {}, { base: "D(2)ア 測定値の平均", max: 120, note: "ぜんぶ たして 個数で わる", ex: "平均は、ぜんぶの 数を たして、 数の 個数で わるよ。\n(60 + 70 + 80) ÷ 3 = 70。" });
  U("m5-tan-ryou", M, 5, "C", "その他", "単位量あたりの 大きさ", "tan5", {}, { base: "C(2)ア 単位量あたりの大きさ", max: 900, note: "1あたりの 数", ex: "1あたりの 数は、全部の 数 ÷ いくつ分 で 出すよ。\n12人 ÷ 4まい = 1まいあたり 3人。" });
  U("m5-bunsu-shosu", M, 5, "A", "分数と小数", "分数と 小数", "bunsuShosu5", {}, { base: "A(4)ア 分数と小数・整数の関係", series: "分数", step: 9, label: "分数と小数", max: 100, note: "分数 ⇔ 小数", ex: "分数は 分子 ÷ 分母 で 小数に なるよ。\n3/4 は 3 ÷ 4 = 0.75。" });
  U("m5-yakubun", M, 5, "A", "分数", "約分", "yakubun5", { ans: "frac" }, { base: "A(4)イ 約分", series: "分数", step: 6, label: "約分", max: 72, note: "分母と 分子を おなじ 数で わる", ex: "分母と 分子を おなじ 数で わって 小さくするよ。\n12/18 は 6で わって 2/3。" });
  U("m5-tsubun", M, 5, "A", "分数", "通分", "tsubun5", {}, { base: "A(4)イ 通分", series: "分数", step: 7, label: "通分", max: 90, note: "分母を そろえる", ex: "分母を おなじに することを 通分と いうよ。\n1/3 = □/12 は、3を 4倍すると 12 だから、分子も 4倍して 4/12。" });
  U("m5-bunsu-add", M, 5, "A", "分数", "分数の たし算（分母がちがう）", "bunsuAddSub5", { op: "+" }, { base: "A(4)イ 異分母分数の加法", series: "分数", step: 8, label: "異分母たし算", max: 130, note: "通分して たす", ex: "まず 通分して 分母を そろえてから 分子を たすよ。\n答えは 約分を わすれずに。" });
  U("m5-bunsu-sub", M, 5, "A", "分数", "分数の ひき算（分母がちがう）", "bunsuAddSub5", { op: "−" }, { base: "A(4)イ 異分母分数の減法", series: "分数", step: 8, label: "異分母ひき算", max: 130, note: "通分して ひく", ex: "まず 通分して 分母を そろえてから 分子を ひくよ。\n答えは 約分を わすれずに。" });
  U("m5-bunsu-int", M, 5, "A", "分数", "分数の かけ算と わり算（整数）", "bunsuMul6", { op: "int" }, { base: "A(4)ア 分数×整数・分数÷整数", series: "分数", step: 10, label: "分数×整数・÷整数", max: 90, note: "分数 × 整数・分数 ÷ 整数", ex: "分数 × 整数 は 分子に 整数を かけるよ。\n分数 ÷ 整数 は 分母に 整数を かけるよ。" });
  U("m5-naikaku", M, 5, "B", "図形", "図形の 角（内角の和）", "naikaku5", { loose: true }, { base: "B(1)ア 三角形・四角形・多角形の角", max: 1800, note: "内角の 和", ex: "三角形の 3つの 角の 和は 180度、 四角形は 360度。\nn角形は (n − 2) × 180度 だよ。" });
  U("m5-menseki-sankaku", M, 5, "B", "図形", "図形の 面積（三角形・平行四辺形）", "menseki5", { kinds: ["tri", "para"] }, { base: "B(3)ア 三角形・平行四辺形の面積", series: "面積", step: 3, label: "三角形・平行四辺形", max: 300, note: "底辺 × 高さ（÷2）", ex: "平行四辺形は 底辺 × 高さ。\n三角形は その 半分だから 底辺 × 高さ ÷ 2。" });
  U("m5-menseki-daikei", M, 5, "B", "図形", "図形の 面積（台形・ひし形）", "menseki5", { kinds: ["trap", "rhom"] }, { base: "B(3)ア 台形・ひし形の面積", series: "面積", step: 4, label: "台形・ひし形", max: 300, note: "(上底＋下底) × 高さ ÷ 2", ex: "台形は (上底 + 下底) × 高さ ÷ 2。\nひし形は 対角線 × 対角線 ÷ 2。" });
  U("m5-hyakubun", M, 5, "C", "その他", "割合と 百分率", "hyakubun5", { loose: true }, { base: "C(3)ア 割合・百分率", max: 500, note: "%と 小数", ex: "百分率は 0.01を 1%と する 表し方。\n0.35 は 35% だよ。" });
  U("m5-enshu", M, 5, "B", "図形", "多角形と 円（円周）", "enshu5", { loose: true }, { base: "B(1)イ 円周・円周率", series: "面積", step: 5, label: "円周", max: 9420, note: "円周＝直径 × 3.14", ex: "円周は 直径 × 円周率 (3.14)。\n直径 10cm なら 10 × 3.14 = 31.4cm。" });

  /* ================= 算数 6年 ================= */
  U("m6-en-menseki", M, 6, "B", "図形", "円の 面積", "enMenseki6", { loose: true }, { base: "B(2)ア 円の面積", series: "面積", step: 6, label: "円の面積", max: 70650, note: "半径 × 半径 × 3.14", ex: "円の 面積は 半径 × 半径 × 3.14。\n半径 5cm なら 5 × 5 × 3.14 = 78.5cm²。" });
  U("m6-moji", M, 6, "A", "□の数", "文字と 式", "moji6", {}, { base: "A(2)ア 文字を用いた式", max: 150, note: "x に 数を 入れる", ex: "x に 数を 入れて 計算するよ。\nx = 3 のとき 2 × x + 1 は 2 × 3 + 1 = 7。" });
  U("m6-bunsu-kake", M, 6, "A", "分数", "分数の かけ算", "bunsuMul6", { op: "×" }, { base: "A(1)ア 分数×分数", series: "分数", step: 11, label: "分数×分数", max: 90, note: "分数 × 分数", ex: "分母どうし、分子どうしを かけるよ。\n計算の とちゅうで 約分すると らくだよ。" });
  U("m6-bunsu-wari", M, 6, "A", "分数", "分数の わり算", "bunsuMul6", { op: "÷" }, { base: "A(1)ア 分数÷分数", series: "分数", step: 12, label: "分数÷分数", max: 90, note: "分数 ÷ 分数", ex: "わる数の 分母と 分子を ひっくりかえして かけるよ。\n2/3 ÷ 4/5 = 2/3 × 5/4。" });
  U("m6-hayasa", M, 6, "C", "その他", "速さ", "hayasa5", { loose: true }, { base: "C(2)ア 速さ（異種の2量の割合）", max: 1000, note: "道のり ÷ 時間", ex: "速さ = 道のり ÷ 時間、 道のり = 速さ × 時間。\n時速 60km で 2時間 なら 60 × 2 = 120km。" });
  U("m6-hirei", M, 6, "C", "その他", "比例と 反比例", "hirei6", {}, { base: "C(1)ア 比例・反比例", max: 120, note: "x と y の 関係", ex: "比例は x が 2倍に なると y も 2倍。\n反比例は x が 2倍に なると y は 半分。" });
  U("m6-hi-kantan", M, 6, "C", "その他", "比と 比の値（かんたんにする）", "hiKantan6", { loose: true }, { base: "C(2)ア 比・比の値", series: "比", step: 1, label: "かんたんにする", max: 90, note: "比を かんたんにする・比の値", ex: "比の 両方を おなじ 数で わって かんたんに するよ。\n6:9 は 3で わって 2:3。" });
  U("m6-hi-tokku", M, 6, "C", "その他", "比と 比の値（等しい比）", "hiEq6", {}, { base: "C(2)ア 等しい比", series: "比", step: 2, label: "等しい比", max: 90, note: "2:3 ＝ 6:□", ex: "2:3 = 6:□ は、2を 3倍すると 6。\n3も 3倍して □ は 9。" });
  U("m6-chuutai", M, 6, "B", "図形", "角柱と 円柱の 体積", "chuutai6", { loose: true }, { base: "B(3)ア 角柱・円柱の体積", series: "体積", step: 1, label: "柱", max: 4000, note: "底面積 × 高さ", ex: "角柱も 円柱も 体積は 底面積 × 高さ。\n円柱の 底面積は 半径 × 半径 × 3.14。" });
  U("m6-baai", M, 6, "D", "その他", "場合の数", "baai6", {}, { base: "D(2)ア 並べ方・組み合わせ", max: 150, note: "ならべ方・えらび方", ex: "ならべ方は 1番目 3通り、2番目 2通り、3番目 1通り。\n3 × 2 × 1 = 6通り。" });
  U("m6-daihyou", M, 6, "D", "表とグラフ", "資料の 調べ方（代表値）", "daihyou6", { loose: true }, { base: "D(1)ア 平均値・中央値・最頻値", max: 30, note: "中央値・さいひん値・平均", ex: "中央値は 小さい じゅんに ならべた まん中の 数。\nさいひん値は 1ばん 多く 出る 数。" });
  U("m6-bunsu-shosu", M, 6, "A", "分数と小数", "分数と 小数の まじった 計算", "bunsuShosu6", {}, { base: "A(1)ア 分数と小数の混合計算", series: "分数", step: 13, label: "分数と小数", max: 90, note: "小数を 分数に なおして 計算", ex: "小数を 分数に なおすと 計算できるよ。\n0.5 は 5/10 = 1/2。" });
  U("m6-tani", M, 6, "C", "単位", "いろいろな 単位", "tani6", { loose: true }, { base: "C(2)イ 体積・重さの単位（要確認）", series: "単位", step: 1, label: "L・m³・kL", max: 9000000, note: "L・m³・kL・t", ex: "1L は 1000cm³、 1m³ は 1000L、 1kL は 1000L だよ。\nたんいの かんけいを おぼえよう。" });

  /* ============ 図が要る単元（あとで）：gen なし ============ */
  const later = (id, g, area, item, title, base) => U(id, M, g, area, item, title, null, {}, { base, note: "図が要るので後回し" });
  later("m1-katachi", 1, "B", "図形", "いろいろな かたち・かたちづくり", "B(1)ア 身の回りの形");
  later("m2-hako", 2, "B", "図形", "はこの 形", "B(1)イ 箱の形");
  later("m3-sankaku", 3, "B", "図形", "三角形と 角（二等辺・正三角形）", "B(1)イ 二等辺三角形・正三角形");
  later("m4-orelinegraph", 4, "D", "表とグラフ", "折れ線グラフ", "D(1)ア 折れ線グラフ");
  later("m4-suichoku", 4, "B", "図形", "垂直・平行と 四角形", "B(1)イ 平行・垂直");
  later("m4-chokuhoutai", 4, "B", "図形", "直方体と 立方体", "B(2)ア 直方体・立方体");
  later("m5-goudou", 5, "B", "図形", "合同な 図形", "B(1)ア 合同");
  later("m5-hyakubun-graph", 5, "D", "表とグラフ", "百分率と グラフ（円・帯）", "D(1)ア 円グラフ・帯グラフ");
  later("m6-taisho", 6, "B", "図形", "対称な 図形", "B(1)ア 線対称・点対称");
  later("m6-kakudai", 6, "B", "図形", "拡大図と 縮図", "B(1)イ 拡大図・縮図");

  /* ================= 国語・社会・英語（既存データの切り出し） ================= */
  const K = (g, ex) => U(`j${g}-kanji-yomi`, "kokugo", g, "-", "漢字", `${g}年の 漢字の読み`, "kanjiYomi", { g }, { base: "国語〔知識及び技能〕(1)エ 漢字（学年別漢字配当表）", note: `${g}年で ならう 漢字の よみ`, ex });
  K(1, "かんじを よく 見て、よみを えらぼう。\nわからなければ、ことばを おもいだして みよう。"); K(2, "かんじの よみを えらぼう。\nことばの かたちを おもいうかべると わかりやすいよ。");
  K(3, "漢字の 読みを えらぼう。\nことばの 意味を 考えると 読みが わかりやすいよ。"); K(4, "漢字の 読みを えらぼう。\n送りがなが ある ときは 読みも 長く なるよ。");
  K(5, "漢字の 読みを えらぼう。\n2つの 漢字の ことばは、1字ずつの 読みを つなげて 考えよう。"); K(6, "漢字の 読みを えらぼう。\n2つの 漢字の ことばは、1字ずつの 読みを つなげて 考えよう。");
  const REG = [["th", "東北"], ["kt", "関東"], ["cb", "中部"], ["kn", "近畿"], ["cg", "中国"], ["sk", "四国"], ["ky", "九州・沖縄"]];
  for (const [rg, nm] of REG) U(`s4-kencho-${rg}`, "shakai", 4, "-", "その他", `${nm}地方の 県庁所在地`, "kencho", { rg: [rg] }, { base: "社会 第4学年(1)ア 都道府県の位置と県庁所在地", note: `${nm}地方の 県の 県庁がある市`, ex: "県の 名前から、県庁が ある 市を えらぼう。\n県の名前と ちがう 市の 名前の 県に 気を つけよう。" });
  U("s4-kencho-all", "shakai", 4, "-", "その他", "全国の 県庁所在地", "kencho", {}, { base: "社会 第4学年(1)ア 都道府県の位置と県庁所在地", note: "47都道府県", ex: "県の 名前から、県庁が ある 市を えらぼう。" });
  const EG = [["food", ["food"], "食べ物"], ["animal", ["animal"], "動物"], ["action", ["action"], "動作"], ["place", ["place"], "場所"], ["daymonth", ["day", "month"], "曜日・月"], ["color", ["color"], "色"], ["school", ["subject", "job"], "教科・しごと"]];
  for (const [k, cs, nm] of EG) U(`e5-${k}`, "eigo", 5, "-", "その他", `英単語 5年・${nm}`, "eigo", { g: 5, cs }, { base: "外国語〔知識及び技能〕語彙（小学校5年）", note: `${nm}の 英単語`, ex: "英語を 見て、 日本語の 意味を えらぼう。\n声に 出して 読むと おぼえやすいよ。" });
  U("e6-all", "eigo", 6, "-", "その他", "英単語 6年", "eigo", { g: 6 }, { base: "外国語〔知識及び技能〕語彙（小学校6年）", note: "6年の 英単語", ex: "英語を 見て、 日本語の 意味を えらぼう。" });

  const byId = {}; list.forEach(u => { byId[u.id] = u; });

  /* ---------- 答え方 ---------- */
  function inferAns(a) {
    a = String(a);
    if (/^\d+$/.test(a)) return "num";
    if (/^\d+\.\d+$/.test(a)) return "dec";
    if (/^\d+あまり\d+$/.test(a)) return "amari";
    if (/^(\d+と)?\d+\/\d+$/.test(a)) return "frac";
    if (/^\d+(\.\d+)?(cm²|cm³|km²|m²|m³|mm|cm|km|kg|mL|dL|kL|ha|[mgLta]|度|%)$/.test(a)) return "unit";
    return "choice4";
  }
  const stripZ = s => s.replace(/^0+(?=\d)/, "");
  /* 正解・入力を正規化した文字にする（読めない入力は null） */
  function canon(mode, x) {
    if (x == null) return null;
    if (mode === "choice4") return String(x);
    let m;
    if (mode === "num") { const s = typeof x === "object" ? x.n : x; return /^\d+$/.test(String(s).trim()) ? stripZ(String(s).trim()) : null; }
    if (mode === "dec") { const s = String(x).trim(); if (!/^\d+(\.\d+)?$/.test(s)) return null; return stripZ(s.includes(".") ? s.replace(/0+$/, "").replace(/\.$/, "") : s); }
    if (mode === "amari") {
      if (typeof x === "object") return `${stripZ(String(x.q))}|${stripZ(String(x.r || 0))}`;
      m = String(x).replace(/\s/g, "").match(/^(\d+)(?:あまり|…|\.\.\.|r)?(\d+)?$/); return m ? `${stripZ(m[1])}|${stripZ(m[2] || "0")}` : null;
    }
    if (mode === "frac") {
      if (typeof x === "object") return `${x.w || 0}|${x.n}|${x.d}`;
      const s = String(x).replace(/\s/g, "");
      if ((m = s.match(/^(\d+)と(\d+)\/(\d+)$/))) return `${m[1]}|${m[2]}|${m[3]}`;
      if ((m = s.match(/^(\d+)\/(\d+)$/))) return `0|${m[1]}|${m[2]}`;
      return null;
    }
    if (mode === "unit") {
      if (typeof x === "object") return `${stripZ(String(x.num))}|${x.unit}`;
      m = String(x).replace(/\s/g, "").match(/^(\d+(?:\.\d+)?)(.+)$/); return m ? `${stripZ(m[1])}|${m[2]}` : null;
    }
    return null;
  }
  /* 判定：choice4 なら選んだ文字、そのほかは入力（文字・オブジェクト）。正しければ true */
  function check(item, input) {
    const c = canon(item.ans, input);
    return c !== null && c === item.val;
  }

  /* ---------- 1問つくる ---------- */
  function make(u, seed) {
    if (typeof u === "string") u = byId[u];
    if (!u || !u.gen || !gens[u.gen]) throw new Error("この単元はまだ出せません: " + (u && u.id));
    let it, err;
    for (let t = 0; t < 25; t++) {
      try { it = gens[u.gen](G.rng(seed === undefined ? 1 : seed + (t ? "|retry" + t : "")), u.params || {}); break; } catch (e) { err = e; }
    }
    if (!it) throw err;
    const ans = it.ans || (u.params && u.params.ans) || inferAns(it.a);
    const out = { unit: u.id, subj: u.subj, g: u.g, q: it.q, a: String(it.a), choices: it.choices, ans, val: canon(ans, it.a) };
    for (const k of ["tag", "hissan", "ruby", "stem", "src"]) if (it[k]) out[k] = it[k];
    return out;
  }
  /* 単元をまぜて n問。unitIds は学年をまたいでよい。mix=false なら単元の順に並べる */
  function unitPick(unitIds, n, seed, mix) {
    const ids = [...new Set(unitIds)], us = ids.map(i => byId[i]).filter(u => u && u.gen && gens[u.gen]);
    if (!us.length || !(n > 0)) return [];
    seed = seed === undefined ? 1 : seed;
    const R = G.rng(seed + "|pick"), base = Math.floor(n / us.length), bonus = new Set(R.shuffle(us.map((_, i) => i)).slice(0, n - base * us.length)), out = [];
    us.forEach((u, i) => {
      const cnt = base + (bonus.has(i) ? 1 : 0), seen = new Set();
      for (let k = 0; k < cnt; k++) {
        let it;
        for (let t = 0; t < 30; t++) { it = make(u, `${seed}|${u.id}|${k}|${t}`); if (!seen.has(it.q + (it.stem || ""))) break; }
        seen.add(it.q + (it.stem || "")); out.push(it);
      }
    });
    return mix === false ? out : R.shuffle(out);
  }

  const UNIT_SETS = [
    { id: "set-menseki", title: "面積のまとめ（4〜6年）", units: ["m4-menseki", "m4-menseki-tan", "m5-menseki-sankaku", "m5-menseki-daikei", "m5-enshu", "m6-en-menseki"] },
    { id: "set-wari-34", title: "わり算のまとめ（3〜4年）", units: ["m3-wari99", "m3-amari", "m4-wari-21", "m4-wari-31", "m4-wari-22", "m4-wari-32"] },
    { id: "set-bunsu-36", title: "分数のまとめ（3〜6年）", units: ["m3-bunsu-imi", "m3-bunsu-add", "m4-bunsu-kawaru", "m4-bunsu-mixed", "m5-yakubun", "m5-tsubun", "m5-bunsu-add", "m5-bunsu-sub", "m5-bunsu-int", "m6-bunsu-kake", "m6-bunsu-wari"] },
    { id: "set-shosu-35", title: "小数のまとめ（3〜5年）", units: ["m3-shosu", "m4-shosu-add", "m4-shosu-sub", "m4-shosu-kake", "m4-shosu-wari", "m5-shosu-kake", "m5-shosu-wari"] },
    { id: "set-kuku-23", title: "九九とかけ算（2〜3年）", units: ["m2-kuku-low", "m2-kuku-high", "m2-kuku-hole", "m3-kake-kimari", "m3-kake-hissan1"] },
    { id: "set-tashihiki-12", title: "たし算・ひき算（1〜2年）", units: ["m1-add10", "m1-sub10", "m1-add-kuriage", "m1-sub-kurisage", "m2-add-hissan", "m2-sub-hissan"] },
    { id: "set-tani", title: "単位のまとめ（2〜6年）", units: ["m2-nagasa", "m2-kasa", "m3-nagai", "m3-omosa", "m4-menseki-tan", "m6-tani"] },
    { id: "set-taiseki", title: "体積のまとめ（5〜6年）", units: ["m5-taiseki", "m6-chuutai", "m6-tani"] },
    { id: "set-wariai", title: "割合・比・速さのまとめ（5〜6年）", units: ["m5-tan-ryou", "m5-hyakubun", "m6-hayasa", "m6-hirei", "m6-hi-kantan", "m6-hi-tokku"] },
    { id: "set-hissan-all", title: "ひっ算のまとめ（2〜4年）", units: ["m2-add-hissan", "m2-sub-hissan", "m3-add-hissan", "m3-sub-hissan", "m3-kake-hissan1", "m3-kake-hissan2", "m4-wari-21", "m4-kake-32"] },
    { id: "set-kokugo-kanji-34", title: "漢字の読み（3〜4年）", units: ["j3-kanji-yomi", "j4-kanji-yomi"] }
  ];

  // 各単元の標準の答え方（見本の1問から決める）
  list.forEach(u => { if (u.gen) { try { u.ans = (u.params && u.params.ans) || make(u, "type|" + u.id).ans; } catch (e) { u.ans = "choice4"; } } });
  return { UNITS: list, byId, UNIT_SETS, make, unitPick, check, canon, inferAns };
})();
window.UNITS = window.MH_UNITS.UNITS;
window.UNIT_SETS = window.MH_UNITS.UNIT_SETS;
window.unitPick = window.MH_UNITS.unitPick;
