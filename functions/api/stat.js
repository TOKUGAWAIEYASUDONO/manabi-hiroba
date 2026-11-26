// 回答スピードの 受けとり口（Cloudflare Pages Functions）。中身は data/statlib.js（ブラウザ・検査と 同じ 部品）
// データベース（D1）は Cloudflare の 管理画面で「DB」という 名前で つなぐ。つないでいなければ 何も せず 204 を 返す
import SL from "../../data/statlib.js";
export const onRequestPost = ({ request, env }) => SL.handlePost(request, env);
