// 回答スピードの まとめ（運営者だけ。合言葉は 環境変数 STATS_KEY、送るときは x-stats-key）。中身は data/statlib.js
import SL from "../../data/statlib.js";
export const onRequestGet = ({ request, env }) => SL.handleGet(request, env);
