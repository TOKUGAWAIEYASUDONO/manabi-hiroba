# 組みこんでいるアプリ（MITライセンス）

| フォルダ | アプリ | 元のリポジトリ | 版 | ライセンス |
|---|---|---|---|---|
| apps/100masu/ | 100マス計算（GIGAスクール構想対応版） | https://github.com/GIGAyama/online-100square-calculation | 7dba864 | MIT（LICENSE.txt） © 2026 GIGAyama |
| apps/qalc/ | Qalc 小学生用計算学習Webアプリ | https://github.com/GIGAyama/Qalc | 813bbc5 | MIT（LICENSE.txt） © 2026 GIGAyama |

- 元のリポジトリを `npm ci` → `npm run build` した dist をそのまま置いています。
- 変更点：独自ドメイン用の CNAME を外しました。学習ログを外部（gamification.giga-school.com）の記録ボックスへ写す `records-hub-client.js` の読み込みを、index.html から外しました（まなびひろばは記録を端末の外へ出さない方針のため）。それ以外は元のままです。
- 利用規約・プライバシー等のリンクは元アプリのもの（giga-school.com）を指しています。
