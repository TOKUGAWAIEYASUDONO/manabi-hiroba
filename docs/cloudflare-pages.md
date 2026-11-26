# 新しい住所（hirametto.com）で 公開する 手順（Cloudflare Pages）

2026-11-20。今の 住所（`https://tokugawaieyasudono.github.io/manabi-hiroba/`）は そのまま 動かしながら、
同じ GitHub の リポジトリ・同じ `main` を、Cloudflare Pages からも 公開します。

- アカウントの 名前・パスワードは、この 手順の 中で だれにも 教えなくて いいです。
- **GitHub Pages の「Custom domain」（CNAME ファイル）は 使いません。** 使うと、古い住所が すぐ 新しい住所へ とんでしまい、古い住所に のこっている 子どもの 記録を はこべなくなるからです。

---

## 1. Cloudflare Pages と GitHub を つなぐ

1. Cloudflare に ログインする。
2. 左の メニューの **「Workers & Pages」** → **「作成」**（Create）→ **「Pages」** の タブ → **「Git に接続」**（Connect to Git）。
3. 「GitHub」を えらび、GitHub の 画面で Cloudflare に リポジトリを 見る ことを ゆるす。
   - 「Only select repositories」で **`manabi-hiroba` だけ** えらぶと 安心。
4. リポジトリ **`manabi-hiroba`** を えらんで **「セットアップを開始」**。

## 2. ビルドの 設定（ビルドは しない）

| 項目 | 入れる もの |
|---|---|
| プロジェクト名 | すきな 名前（例：`hirametto`）。`hirametto.pages.dev` の ような 予備の 住所に なる |
| 本番ブランチ（Production branch） | **`main`** |
| フレームワーク プリセット | **なし**（None） |
| ビルドコマンド | **空のまま** |
| ビルド出力ディレクトリ | **空のまま**（たずねられたら `/`） |

→ **「保存してデプロイ」**。1〜2分で 終わります。

### プレビューを 作らない（大事）

Cloudflare Pages は、`main` 以外の ブランチも「プレビュー」として 公開できて しまいます。
保護者・学校向けの 文章など、まだ 公開しない ものが べつの ブランチに あるので、**プレビューは 止めます**。

- プロジェクト → **「設定」**（Settings）→ **「ビルド」**（Builds）→ **「ブランチの管理」**（Branch control）
- 「プレビュー ブランチ」（Preview branch）を **「なし」**（None）に する。
- 「自動デプロイ」は **オン**（`main` が かわると 自動で 公開しなおす）。

## 3. 新しい住所（hirametto.com）を つける

1. プロジェクト → **「カスタムドメイン」**（Custom domains）→ **「カスタムドメインを設定」**。
2. **`hirametto.com`** を 入れて 進める。ドメインを Cloudflare で 買って いるので、**DNS は Cloudflare が 自動で 入れます**（自分で 入れなくて いい）。
3. もう 一度 **「カスタムドメインを設定」** で **`www.hirametto.com`** も 足す。
4. 状態が **「有効」**（Active）に なるまで 待つ（数分〜長くて 1日。鍵の マークの 証明書も 自動で できる）。

### www を つけない 住所に そろえる

`www.hirametto.com` と `hirametto.com` は、ブラウザの 中では **記録の 保存場所が べつ** です。
子どもの 記録が 2か所に 分かれないよう、`www` は つけない 住所へ とばします。

- Cloudflare の ドメイン `hirametto.com` の 画面 → **「ルール」**（Rules）→ **「リダイレクトルール」**（Redirect Rules）
  → テンプレートの **「Redirect from WWW to Root」**（WWW から ルートへ）を えらんで 保存（301、クエリ文字列は「保持」）。
- （ねんのため、サイトの 中でも `www` で 開いたら つけない 住所へ 移ります。`data/move.js`）

### pages.dev の 住所は 配らない

`hirametto.pages.dev` も 同じ ページが 開きますが、ここも 記録の 保存場所が べつです。
先生や 子どもには **`https://hirametto.com/` だけ** を 伝えて ください。

## 4. 動いたかを 確かめる

ブラウザで 次を 開いて、ふつうに 見えれば OK です。

- [ ] `https://hirametto.com/` … ホームが 出る（アドレスの 左に 鍵の マーク）
- [ ] `https://www.hirametto.com/` … `https://hirametto.com/` に かわる
- [ ] `https://hirametto.com/guide/` … 先生向けガイド
- [ ] `https://hirametto.com/apps/100masu/` … 100マス計算
- [ ] `https://hirametto.com/#u=m3-amari&n=10` … 3年「あまりの ある わり算」の 練習が はじまる
- [ ] `https://hirametto.com/move.html` … すぐ ホームへ もどる（受けとり用の ページ。記録が ないときは 何もしない）
- [ ] `https://hirametto.com/guide/g3-sansu.html` … アドレスが `…/guide/g3-sansu` に かわるか どうかを メモ
      （Cloudflare Pages は `.html` を はずした 住所へ とばす ことが あります。かわったら 司令塔に 知らせて ください。canonical の 書き方を あわせます）

この 時点では まだ **おひっこしは オフ** です。古い住所は 今まで どおり 動きます。

---

## 5. 公開の 日の 順番

1. 上の 1〜4 が できて いる（新しい住所で 動く）。
2. 名前の 変更・ロゴ・おひっこしの ブランチを `main` に 入れる。
3. **`data/move.js` の いちばん上の `ON: false` を `ON: true` に かえる**（設定は ここ 1か所だけ）。
4. `node tools/prepublish.js` を 実行する（canonical・sitemap・robots・OGP・JSON-LD の 住所が 新しい住所に かわり、各ページの 版も そろう）。
5. コミットして `main` に push する。GitHub Pages（古い住所）と Cloudflare Pages（新しい住所）の 両方が 新しく なる。
6. 確かめる：
   - [ ] 古い住所 `https://tokugawaieyasudono.github.io/manabi-hiroba/` を 開くと、新しい住所へ 移る
   - [ ] 記録の ある 端末で 移ったあと、「きろく」の メダルの 数・めもり名人の ★ が 前と 同じ
   - [ ] 古い住所の 課題リンク（`…/manabi-hiroba/#u=…&task=1`）を 開くと、新しい住所で 同じ 課題が はじまる
   - [ ] 新しい住所の「きろく」の いちばん下に「前の ばしょから きろくを もってくる」が 出る
7. Google Search Console に **新しい住所 `https://hirametto.com/`** を 登録して、`https://hirametto.com/sitemap.xml` を 送る。
   （古い住所は `github.io` の 中の 1つの フォルダなので、「アドレス変更ツール」は 使えません。canonical と 移動で 少しずつ 新しい住所に かわります）

## 6. 注意

- 古い住所の GitHub Pages は **止めないで ください**。古い住所に 記録が のこって いる 端末が、開いた ときに はこべなく なります（何か月か 動かしつづける）。
- おひっこしを やめたい ときは、`ON: true` を `ON: false` に もどして 5. の 4〜5 を する。古い住所の 記録は 消して いないので、そのまま 使えます。
- 記録が 大きすぎて 自動で はこべない 端末には、古い住所で「バックアップの もじ」で はこぶ 案内が 出ます。
- 100マス計算の ページは オフラインでも 動く しくみ（サービスワーカー）が あるので、古い住所で 開いた とき、ネットが つながって いれば ふつうに 移ります。

## 7. 住所が 書いてある 場所（ぜんぶ `data/move.js` の 設定から 作る）

| 場所 | 作るもの | ON で |
|---|---|---|
| `index.html` の canonical・og:url・og:image・twitter:image | `tools/site-url.js` | 新しい住所 |
| `guide/*.html` の canonical・og:url・og:image・JSON-LD（WebSite・パンくず・提供者） | `tools/build-guide.js`（`tools/guide-lib.js` の `BASE`） | 新しい住所 |
| `sitemap.xml`・`robots.txt` | `tools/build-guide.js` | 新しい住所 |
| 課題リンク・部屋の QR・れんしゅう用リンク（先生の 画面） | その場で `location` から 作る | 開いて いる 住所（書きかえ 不要） |
| おひっこしの 行き先・「もってくる」入口 | `data/move.js` | — |

`tools/prepublish.js` が `site-url.js` と `build-guide.js` を 先に 実行するので、ON を かえたら `node tools/prepublish.js` だけで そろいます。
`tools/test-move.js` が「新しい住所を ほかの ファイルに 直接 書いていない」ことと「住所が 設定と そろっている」ことを 調べます。


## 回答スピードの集計（data/statlib.js）

ひとりの練習が1回おわるたびに、名前のない数字だけを `/api/stat` に送り、Cloudflare の D1（無料のデータベース）に「日にち × 遊び × 学年 × 単元 × あそびかた」ごとの合計として足していきます。1回ずつの記録・接続元は残しません。

1. Cloudflare の管理画面 → **「ストレージとデータベース」→「D1 SQL データベース」→「作成」**。名前は `hirametto-stats`（何でもよい）。表は最初の受けとりで自動で作られます。
2. **「Workers & Pages」→ ひらめっと のプロジェクト →「設定」→「バインディング」→「追加」→「D1 データベース」**。変数名は **`DB`**、データベースは 1 で作ったもの。
3. 同じ「設定」→**「変数とシークレット」→「追加」**。種類は「シークレット」、名前は **`STATS_KEY`**、値は運営者だけが知る合言葉（長めに）。
4. もう一度デプロイ（main に入れる、または「デプロイ」→「再試行」）すると、つないだ物が効きます。
5. `data/statlib.js` の `ON` が送るスイッチ（2026-11-26 から `true`）。`false` にすると、ブラウザは何も送りません。

見る画面は `https://hirametto.com/stats.html`（合言葉を入れる）。回数が 10 回未満の組み合わせは出しません。無料枠（Pages Functions は 1日10万回、D1 の書きこみは 1日10万行）をこえると、その日は受けとれなくなるだけで、お金はかかりません。
