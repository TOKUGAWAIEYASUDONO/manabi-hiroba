# 算数単元の細分化案（調査・設計のみ）

## 方針
- `data/units.js` の現行算数 ID はすべて残し、既存の大きな単元は「まとめ」として扱う。新 ID は未使用を実装前に再照合し、`data/collection.js` の `UNIT_IDS` には末尾追加のみ。`series` は同系統で共通、`step` は既存値を含めて重複しない学習順に再設計する（既存 ID・問題生成の意味は維持）。
- 下表の「答」は原則 `num`（整数）。`余` は `amari`、`小` は `dec`、`分` は `frac`。表示の選択肢は既存生成器の契約に合わせ、数値入力に変える場合は UI との整合を別途検証する。
- `H` と記した筆算は生成結果に **必ず** `hissan:{a,b,op,q?,r?}` を付ける。除算では `q` を商、`r` を余りとし、縦書き表示と解答形式を両方検証する。小数筆算では桁・小数点位置を正確に保持できるよう表示仕様を事前確認する。
- 各行は独立の生成条件として乱数で問題を作り、条件を満たすまで有界リトライする。極端に候補が少ない条件は候補集合から乱数選択。`a`,`b` は問題の被演算数、`s=a+b`,`d=a-b`。桁ごとの和・差を判定して繰り上がり・繰り下がりを保証する。文章題は新規の文型を作る。

|学年|既存単元 → 新ID|新タイトル|数の範囲・条件|答|作問関数の作り方|
|---|---|---|---|---|---|
|1|m1-add10 → m1-add10-small|5までの たし算|1〜4同士、和≤5|num|加数2個を抽選|
|1|m1-add10 → m1-add10-ten|10までの たし算|1〜9同士、和6〜10|num|和から一方を分割|
|1|m1-ikutsu-to-ikutsu → m1-make10|10を つくる|1〜9、和10|num|片方を選び補数を問う|
|1|m1-add-kuriage → m1-add-over10|10を こえる たし算|1桁同士、和11〜18|num|一の位和>10で抽選|
|1|m1-sub10 → m1-sub10-small|5までの ひき算|2〜5−1〜4、差≥0|num|被減数と減数を抽選|
|1|m1-sub10 → m1-sub10-ten|10までの ひき算|6〜10−1〜9、差≥0|num|被減数より小さい数を抽選|
|1|m1-sub-kurisage → m1-sub-over10|10を またぐ ひき算|11〜18−2〜9、差1〜9|num|差が1桁となる組を抽選|
|1|m1-add-2keta → m1-add-2d1-no|2けたと 1けたの たし算（くり上がりなし）|20〜89＋1〜9、和≤99、一の位和≤9|num|既存 add2plus1 に carry=none 相当の条件追加|
|1|m1-add3 → m1-add3-under10|3つの かず（10まで）|1〜5を3個、和≤10|num|3項抽選後に和を検査|
|1|m1-add3 → m1-add3-over10|3つの かず（10こえ）|1〜9を3個、和11〜20|num|3項抽選後に和を検査|
|2|m2-add-hissan → m2-add-2d-no|2けた＋2けた（くり上がりなし）|10〜89同士、各桁和≤9|num H|add2hissan を桁条件で絞る|
|2|m2-add-hissan → m2-add-2d-ones|2けた＋2けた（一の位くり上がり）|10〜89同士、一の位和≥10、s≤99|num H|一の位だけ carry=1 を検査|
|2|m2-add-hissan → m2-add-2d-100|2けた＋2けた（答えが3けた）|10〜99同士、100≤s≤198|num H|和の範囲を検査|
|2|m2-add-hissan → m2-add-2d1d|2けた＋1けたの ひっ算|10〜99＋1〜9、s≤108|num H|加数の桁数固定、carry の有無を均等に抽選|
|2|m2-sub-hissan → m2-sub-2d-no|2けた−2けた（くり下がりなし）|20〜99−10〜89、各桁で引ける|num H|sub2hissan を borrow=0 に制限|
|2|m2-sub-hissan → m2-sub-2d-ones|2けた−2けた（一の位くり下がり）|20〜99−10〜89、a>b、一の位 a<b|num H|borrow=1 を検査|
|2|m2-sub-hissan → m2-sub-100|100から ひく ひっ算|100−1〜99|num H|減数を抽選、被減数100固定|
|2|m2-kuku-low → m2-kuku-2|2のだん|2×1〜9|num|kuku の dans=[2,2]|
|2|m2-kuku-low → m2-kuku-3|3のだん|3×1〜9|num|kuku の dans=[3,3]|
|2|m2-kuku-low → m2-kuku-4|4のだん|4×1〜9|num|kuku の dans=[4,4]|
|2|m2-kuku-low → m2-kuku-5|5のだん|5×1〜9|num|kuku の dans=[5,5]|
|2|m2-kuku-high → m2-kuku-6|6のだん|6×1〜9|num|kuku の dans=[6,6]|
|2|m2-kuku-high → m2-kuku-7|7のだん|7×1〜9|num|kuku の dans=[7,7]|
|2|m2-kuku-high → m2-kuku-8|8のだん|8×1〜9|num|kuku の dans=[8,8]|
|2|m2-kuku-high → m2-kuku-9|9のだん|9×1〜9|num|kuku の dans=[9,9]|
|3|m3-add-hissan → m3-add-3d-no|3けた＋3けた（くり上がりなし）|100〜899同士、各桁和≤9|num H|add3hissan に carry=0 条件|
|3|m3-add-hissan → m3-add-3d-ones|3けた＋3けた（一の位だけくり上がり）|100〜899同士、一の位のみ carry|num H|桁和を逐次評価|
|3|m3-add-hissan → m3-add-3d-tens|3けた＋3けた（十の位もくり上がり）|100〜899同士、百の位 carry なし、s≤999|num H|一・十の位 carry を両方保証|
|3|m3-add-hissan → m3-add-3d-1000|3けた＋3けた（答えが4けた）|100〜999同士、s≥1000|num H|和の桁数を検査|
|3|m3-sub-hissan → m3-sub-3d-no|3けた−3けた（くり下がりなし）|100〜999同士、a>b、各桁で引ける|num H|borrow=0|
|3|m3-sub-hissan → m3-sub-3d-ones|3けた−3けた（一の位くり下がり）|100〜999同士、一の位のみ borrow|num H|借りの遷移を検査|
|3|m3-sub-hissan → m3-sub-3d-chain|3けた−3けた（続けてくり下がり）|100〜999同士、一・十の位 borrow|num H|借りの遷移を検査|
|3|m3-sub-hissan → m3-sub-3d-zero|0を またぐ ひき算|100〜909−2〜99、十の位0を含む|num H|0越え borrow を保証|
|3|m3-kake-hissan1 → m3-mul-2d1d-no|2けた×1けた（くり上がりなし）|11〜49×2〜9、各段の積<10|num H|積の桁ごと carry=0|
|3|m3-kake-hissan1 → m3-mul-2d1d-carry|2けた×1けた（くり上がりあり）|11〜99×2〜9、carry≥1|num H|積の桁ごと carry 判定|
|3|m3-kake-hissan1 → m3-mul-3d1d|3けた×1けた|101〜399×2〜9|num H|桁を固定し carry は混合|
|3|m3-kake-hissan2 → m3-mul-2d2d-no|2けた×2けた（くり上がりなし）|11〜33同士、部分積・和で carry=0|num H|各部分積と加算の carry を検査|
|3|m3-kake-hissan2 → m3-mul-2d2d-carry|2けた×2けた（くり上がりあり）|11〜99同士、いずれかで carry|num H|部分積・加算の carry≥1|
|3|m3-wari99 → m3-div-kuku|九九で わる|2〜9×1〜9、余り0|num|除数・商を先に選び被除数を作る|
|3|m3-amari → m3-div-rem-small|あまり1〜3の わり算|除数4〜9、商2〜9、余り1〜3<除数|余|d×q+r を作る|
|3|m3-amari → m3-div-rem-large|あまりの ある わり算|除数4〜9、商2〜9、余り4〜d−1|余|d×q+r を作る|
|3|m3-shosu → m3-dec-add-no|小数第1位の たし算（くり上がりなし）|0.1〜9.9同士、小数1桁和<10|小 H|整数10倍で桁和判定し表示を戻す|
|3|m3-shosu → m3-dec-add-carry|小数第1位の たし算（くり上がりあり）|0.1〜9.9同士、小数1桁和≥10|小 H|整数10倍で桁和判定|
|3|m3-shosu → m3-dec-sub|小数第1位の ひき算|0.1〜9.9、a>b、差0.1刻み|小 H|整数10倍で生成、差を正規化|
|4|m4-wari-21 → m4-div-2d1d-exact|2けた÷1けた（あまりなし）|20〜99÷2〜9、商10〜49、余り0|num H|d×q が2桁になる組を抽選|
|4|m4-wari-21 → m4-div-2d1d-rem|2けた÷1けた（あまりあり）|20〜99÷2〜9、1≤r<d|余 H|d×q+r が2桁を保証|
|4|m4-wari-31 → m4-div-3d1d-short|3けた÷1けた（百の位に商が立たない）|100〜999÷2〜9、商10〜99|num H|a<100d、余り0|
|4|m4-wari-31 → m4-div-3d1d-zero|3けた÷1けた（商に0）|100〜999÷2〜9、商の十の位0|num H|商を101〜909から作る、余り0|
|4|m4-wari-31 → m4-div-3d1d-rem|3けた÷1けた（あまりあり）|100〜999÷2〜9、余り1〜d−1|余 H|d×q+r で作る|
|4|m4-wari-22 → m4-div-2d2d-exact|2けた÷2けた（あまりなし）|20〜99÷10〜49、商2〜9|num H|d×q を2桁にする|
|4|m4-wari-22 → m4-div-2d2d-rem|2けた÷2けた（あまりあり）|20〜99÷10〜49、商1〜9、余り1〜d−1|余 H|d×q+r の範囲を検査|
|4|m4-wari-32 → m4-div-3d2d-1q|3けた÷2けた（商1けた）|100〜999÷10〜99、商2〜9|num H|d×q を3桁にする|
|4|m4-wari-32 → m4-div-3d2d-2q|3けた÷2けた（商2けた）|100〜999÷10〜49、商10〜99|num H|d×q を3桁にする|
|4|m4-kake-32 → m4-mul-3d2d-no|3けた×2けた（くり上がりなし）|100〜333×10〜33、部分積と和の carry=0|num H|各部分積・加算を検査|
|4|m4-kake-32 → m4-mul-3d2d-carry|3けた×2けた（くり上がりあり）|100〜999×11〜99、carry≥1|num H|各部分積・加算を検査|
|4|m4-shosu-add → m4-dec-add-hundredth|小数第2位の たし算|0.01〜9.99同士、和≤19.98|小 H|100倍の整数で計算し小数点を復元|
|4|m4-shosu-sub → m4-dec-sub-hundredth|小数第2位の ひき算|0.01〜9.99、a>b|小 H|100倍の整数で計算|
|4|m4-shosu-kake → m4-dec-mul-int|小数×整数|0.1〜9.9×2〜9|小 H|10倍の整数積から小数1桁復元|
|4|m4-shosu-wari → m4-dec-div-int|小数÷整数（割り切れる）|0.1〜9.9÷2〜9、商0.1刻み|小 H|商と除数を先に選び被除数生成|
|4|m4-bunsu-mixed → m4-frac-mixed-add|帯分数の たし算|分母2〜9を揃え、分子和が分母以上|分|仮分数で和を作り帯分数化|
|4|m4-bunsu-mixed → m4-frac-mixed-sub|帯分数の ひき算|同分母2〜9、借りが必要|分|仮分数で差を作り帯分数化|
|5|m5-shosu-kake → m5-dec-mul-tenths|小数第1位×小数第1位|0.2〜9.9同士、積は小数第2位まで|小 H|10倍整数同士の積を100で戻す|
|5|m5-shosu-kake → m5-dec-mul-hundredths|小数第2位をかける|0.01〜9.99×0.1〜9.9|小 H|100倍・10倍整数で積を1000で戻す|
|5|m5-shosu-wari → m5-dec-div-tenths|整数÷小数第1位|整数1〜99÷0.2〜9.9、商が有限小数|小 H|商候補を先に作り被除数が整数か検査|
|5|m5-shosu-wari → m5-dec-div-hundredths|小数第2位でわる|0.01〜99.99÷0.01〜9.99、商が有限小数|小 H|整数尺度で割り切れる組を生成|
|5|m5-yakubun → m5-frac-reduce-one|1回で 約分|分子・分母≤30、共通因数2〜9|分|既約分数に共通因数を掛ける|
|5|m5-yakubun → m5-frac-reduce-multi|大きい数の 約分|分子・分母≤99、共通因数≥10|分|既約分数に共通因数を掛ける|
|5|m5-tsubun → m5-frac-common-multiple|分母が倍数の 通分|分母2〜12、一方が他方の倍数|分|基準分母と倍数を選ぶ|
|5|m5-tsubun → m5-frac-common-coprime|分母がちがう 通分|分母2〜12、互いに素|分|分母を抽選し最小公倍数に揃える|
|5|m5-bunsu-add → m5-frac-add-simple|異分母の たし算（約分なし）|分母2〜12、和≤1、既約結果|分|通分後に和・既約条件を確認|
|5|m5-bunsu-add → m5-frac-add-reduce|異分母の たし算（約分あり）|分母2〜12、和の分子分母に公約数>1|分|通分後に約分が必要な組を選ぶ|
|5|m5-bunsu-sub → m5-frac-sub-simple|異分母の ひき算（約分なし）|分母2〜12、正の差、既約結果|分|通分後に差・既約条件を確認|
|5|m5-bunsu-sub → m5-frac-sub-reduce|異分母の ひき算（約分あり）|分母2〜12、正の差、約分必要|分|通分後に差の公約数を検査|
|5|m5-bunsu-int → m5-frac-mul-int|分数×整数|分母2〜12、分子1〜11、整数2〜9|分|整数を分子に掛け約分|
|5|m5-bunsu-int → m5-frac-div-int|分数÷整数|分母2〜12、分子1〜11、整数2〜9|分|整数を分母に掛け約分|
|6|m6-bunsu-kake → m6-frac-mul-proper|真分数×真分数|分母2〜12、分子<分母|分|分子同士・分母同士を掛け約分|
|6|m6-bunsu-kake → m6-frac-mul-cross|約分してから かけ算|分母2〜12、交差約分可能|分|交差する分子・分母の gcd>1 を保証|
|6|m6-bunsu-wari → m6-frac-div-proper|真分数÷真分数|分母2〜12、分子<分母、除数≠0|分|逆数を掛け約分|
|6|m6-bunsu-wari → m6-frac-div-mixed|帯分数を わる|帯分数1〜3と真分数、除数≠0|分|帯分数を仮分数に変換して計算|
|6|m6-bunsu-shosu → m6-mix-dec-frac|小数と分数の まじった計算|小数0.1〜2.9、分母2・4・5・10|分|小数を分数へ正確に変換|
|6|m6-hi-kantan → m6-ratio-reduce|比を かんたんにする|整数比2〜99、gcd≥2|分|互いに素の比に倍率を掛けて作る|
|6|m6-hayasa → m6-speed-distance|速さから 道のり|速さ2〜90、時間1〜9|num|速さ×時間、単位を統一|
|6|m6-hayasa → m6-speed-time|道のりから 時間|速さ2〜90、時間1〜9、道のり≤810|num|速さ×時間から逆算問題を作る|

合計 **83 新単元**。表の `H` は既存 `hissan` 表示を再利用できるかを実装前に確認する印。特に除法・小数・分数・比の答え方は現行 `MH_UNITS.check`、`choices`、生成関数の戻り値と照合し、未対応なら計画の答え方を既存の選択式に合わせる。負数・無限小数・余りが除数以上・末尾が不必要な0の小数を出さない。

## 分類の参考（問題文・図・PDFは転載しない）
- [すらすらプリント（すらぷり）・筆算の準備](https://surapuri.jp/elementary_school02/hissan-p/)：2桁＋1桁、繰り上がり有無の段階。 [小数のたし算とひき算](https://surapuri.jp/decimal_addition_subtraction/)：小数第1位、小数点の位置、繰り上がり有無。
- [ちびむすドリル・四則計算](https://happylilac.net/p-keisan.html)：学年別、3桁÷1桁の商の立つ位や0の段階。[PDF例](https://happylilac.net/pdf/s12_3w1hya01.pdf) で3桁÷1桁、百の位に商が立たない形を確認。
- [ぷりんときっず・足し算と引き算の筆算](https://print-kids.net/print/sansuu/tashi-hiki-hissan/)：3桁筆算で繰り上がり・繰り下がり回数と答えの桁数を分ける。[PDF例](https://print-kids.net/print/sansuu/hissan-hikizan2/hissan-hikizan2-normal1.pdf) で3桁−2桁の縦配置を確認。
- [ふたば問題集・筆算PDF例](https://futaba-workbook.com/wp-content/uploads/drill/s03/d03-01-01.pdf)：3桁＋2・3桁、繰り上がりなしの桁配置を確認。
