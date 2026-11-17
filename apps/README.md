# 組みこんでいるアプリ（MITライセンス）

| フォルダ | アプリ | 元のリポジトリ | 版 | ライセンス |
|---|---|---|---|---|
| apps/100masu/ | 100マス計算（GIGAスクール構想対応版） | https://github.com/GIGAyama/online-100square-calculation | 7dba864 | MIT（LICENSE.txt） © 2026 GIGAyama |
| apps/qalc/ | Qalc 小学生用計算学習Webアプリ | https://github.com/GIGAyama/Qalc | 813bbc5 | MIT（LICENSE.txt） © 2026 GIGAyama |

- 元のリポジトリを `npm ci` → `npm run build` した dist をそのまま置いています。
- 変更点：独自ドメイン用の CNAME を外しました。学習ログを外部（gamification.giga-school.com）の記録ボックスへ写す `records-hub-client.js` の読み込みを、index.html から外しました（まなびひろばは記録を端末の外へ出さない方針のため）。それ以外は元のままです。
- 利用規約・プライバシー等のリンクは元アプリのもの（giga-school.com）を指しています。

## まなびひろば本体へ移した部分（Qalc の合体 段階1）

Qalc（MIT © 2026 GIGAyama、commit 813bbc5）の遊び方を参考に、計算スプリント（index.html）へ次の3つを作り直して入れました。コードは React から書き直しており、Qalc のファイルはそのまま使っていません。

- タイムアタック（20問をどれだけ速く解けるか）
- サドンデス（1問まちがえたら終わり。連続正解数をきそう）
- にがて克服ボックス（まちがえた問題を最新50問まで自動でためる。正解すると消える）→ まなびひろばでは「にがて ボックス」

まなびひろば側の変更：コインは入れず、どんぐり・メダルの決まりはそのまま。タイムアタックの記録は16問以上正解のときだけ。サドンデスとにがて ボックスの回は単元の「できた」に入れません。授業モード（課題リンク）では使えません。ライセンス全文は `apps/qalc/LICENSE.txt` と `vendor/THIRD-PARTY-LICENSES.txt`。
