# じぶんのひろば：島の 2D版・3D版 試作

本番（`index.html`・`data/`）には つないでいない、くらべるための 試作です。

- ひらきかた：このフォルダを そのまま 配信して `index.html` をひらく（例：`npx serve proto/hiroba-island` や `python3 -m http.server`）。
  `?v=2d` / `?v=3d` で さいしょの 版、`?done=60` で「できた」の数を きめられる。
- 枠（上・左・右・下）は 2つで おなじ（`app.js`）。ちがうのは 島だけ。
  - `world.js`：島の データ（2つで 共通）。できたが ふえると マスが ふえる・教科の島・はし（その教科 3 で かかる）・丘・みち・いけ
  - `island2d.js`：SVG。ゆびで うごかす・つまんで 大きく（うごかしている あいだだけ `will-change`）
  - `island3d.js`：Three.js r160（`vendor/`、gzip で 約167KB）。3D を えらんだ ときだけ よみこむ。
    ローポリ・リアルな影なし（色と ライトだけ）・うごきが ないときは かきなおさない（ゆっくりの うごきは 1秒20回）・
    devicePixelRatio は 1.5 まで・WebGL が つかえないと 2D に もどる。まなびっこは 今の イラストを 立て看板（Sprite）で。
- 左下の「ためし用」パネル：2D/3D の きりかえ、なめらかさ（fps・さいてい・いちばん長いコマ）、よみこみ時間、できたの数を かえるボタン。

## ライセンス
- `vendor/three-0.160.1.module.min.js`：three.js（MIT）。`vendor/three-LICENSE.txt`
