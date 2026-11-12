/* まなびひろば「じぶんの ひろば」の絵（SVG の symbol）。ひろば・ずかんを開くときだけ読みこむ（index.html の loadScript）。
   描き方（plan/collection-v1-wire.md）：viewBox 0 0 64 64／線 3.5・丸い角／色は CSS 変数だけ／影は画面側の drop-shadow／形は基本図形3つ前後・文字なし・顔なし。
   すべりだい d-slide・ブランコ d-swing・木 d-tree は index.html にある既存の絵を使う。どんぐり h-acorn も index.html。 */
(function () {
  if (document.getElementById("hiroba-art")) return;
  const G = '<g stroke="var(--edge)" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round">';
  const S = (id, body) => `<symbol id="${id}" viewBox="0 0 64 64">${G}${body}</g></symbol>`;
  const svg = [
    /* 算数＝遊具 */
    S("h-bar", '<rect x="8" y="14" width="8" height="46" rx="2" fill="var(--wood)"/><rect x="48" y="14" width="8" height="46" rx="2" fill="var(--wood)"/><path d="M12 18H52" stroke-width="10"/><path d="M12 18H52" stroke="var(--eng)" stroke-width="4"/>'),
    S("h-jungle", '<g fill="none"><path d="M8 12h48v46H8zM8 27h48M8 42h48M24 12v46M40 12v46" stroke-width="8"/><path d="M8 12h48v46H8zM8 27h48M8 42h48M24 12v46M40 12v46" stroke="var(--sun)" stroke-width="3.5"/></g>'),
    /* 国語＝図書館 */
    S("h-book1", '<rect x="9" y="8" width="46" height="50" rx="3" fill="var(--wood)"/><path d="M9 33h46" fill="none"/><g stroke-width="2.5"><rect x="14" y="14" width="8" height="15" fill="var(--math)"/><rect x="24" y="12" width="8" height="17" fill="var(--jp)"/><rect x="34" y="15" width="8" height="14" fill="var(--soc)"/><rect x="44" y="13" width="6" height="16" fill="var(--eng)"/><rect x="14" y="39" width="9" height="15" fill="var(--eng)"/><rect x="25" y="37" width="8" height="17" fill="var(--go)"/><rect x="35" y="40" width="14" height="14" fill="var(--cream)"/></g>'),
    S("h-lib", '<path d="M5 28L32 7l27 21z" fill="var(--jp)"/><rect x="9" y="28" width="46" height="30" fill="var(--paper)"/><rect x="26" y="38" width="12" height="20" rx="2" fill="var(--wood)"/><rect x="13" y="34" width="9" height="11" fill="var(--soc)" stroke-width="2.5"/><rect x="42" y="34" width="9" height="11" fill="var(--soc)" stroke-width="2.5"/><circle cx="32" cy="20" r="4" fill="var(--paper)" stroke-width="2.5"/>'),
    /* 英語＝国旗 */
    S("h-flagjp", '<path d="M12 60V6" fill="none"/><rect x="12" y="9" width="44" height="30" fill="var(--paper)"/><circle cx="34" cy="24" r="8" fill="var(--math)" stroke-width="2.5"/><circle cx="12" cy="60" r="3" fill="var(--edge)"/>'),
    S("h-flagus", '<path d="M12 60V6" fill="none"/><rect x="12" y="9" width="44" height="30" fill="var(--paper)"/><path d="M30 15.5h24M30 21.5h24M14 27.5h40M14 33.5h40" fill="none" stroke="var(--math)" stroke-width="3" stroke-linecap="butt"/><rect x="12" y="9" width="18" height="15" fill="var(--jp)"/><g fill="var(--paper)" stroke="none"><circle cx="17" cy="14" r="1.5"/><circle cx="24" cy="14" r="1.5"/><circle cx="20.5" cy="19" r="1.5"/></g><rect x="12" y="9" width="44" height="30" fill="none"/><circle cx="12" cy="60" r="3" fill="var(--edge)"/>'),
    /* かざり */
    S("h-flower", '<rect x="5" y="46" width="54" height="13" rx="3" fill="var(--btl)"/><path d="M17 46V32M32 46V25M47 46V33" stroke="var(--go)" fill="none"/><circle cx="17" cy="27" r="6" fill="var(--pink)"/><circle cx="32" cy="19" r="7" fill="var(--soc)"/><circle cx="47" cy="28" r="6" fill="var(--math)"/><g stroke="none"><circle cx="32" cy="19" r="2.5" fill="var(--math)"/><circle cx="17" cy="27" r="2" fill="var(--soc)"/><circle cx="47" cy="28" r="2" fill="var(--soc)"/></g>'),
    S("h-bench", '<rect x="9" y="14" width="46" height="9" rx="2" fill="var(--wood)"/><rect x="6" y="32" width="52" height="9" rx="2" fill="var(--wood)"/><path d="M12 41v17M52 41v17M14 23v9M50 23v9" fill="none"/>'),
    S("h-hutch", '<rect x="8" y="30" width="48" height="28" fill="var(--wood)"/><path d="M4 32L32 9l28 23z" fill="var(--btl)"/><path d="M22 58V46a10 10 0 0 1 20 0v12z" fill="var(--cream)"/><ellipse cx="28" cy="43" rx="2.6" ry="6" fill="var(--paper)" stroke-width="2.5"/><ellipse cx="36" cy="43" rx="2.6" ry="6" fill="var(--paper)" stroke-width="2.5"/>'),
    S("h-pond", '<path d="M12 38V16" fill="none" stroke-width="3"/><ellipse cx="12" cy="14" rx="3" ry="6.5" fill="var(--btl)" stroke-width="3"/><ellipse cx="32" cy="42" rx="27" ry="16" fill="var(--agray)"/><ellipse cx="32" cy="42" rx="20" ry="10.5" fill="#8cc4f2"/><path d="M22 41q5-3 10 0t10 0" fill="none" stroke="var(--paper)" stroke-width="2.5"/><ellipse cx="43" cy="46" rx="5" ry="2.8" fill="var(--agreen)" stroke-width="2.5"/>'),
    S("h-clock", '<rect x="19" y="24" width="26" height="34" fill="var(--wood)"/><path d="M14 25L32 6l18 19z" fill="var(--math)"/><circle cx="32" cy="36" r="10" fill="var(--paper)"/><path d="M32 36v-6M32 36l5 3" fill="none" stroke-width="3"/><rect x="26" y="49" width="12" height="9" fill="var(--btl)" stroke-width="2.5"/>'),
    S("h-rainbow", '<path d="M12 52a20 20 0 0 1 40 0" fill="none" stroke-width="23" stroke-linecap="butt"/><g fill="none" stroke-linecap="butt" stroke-width="5.5"><path d="M6 52a26 26 0 0 1 52 0" stroke="var(--math)"/><path d="M12 52a20 20 0 0 1 40 0" stroke="var(--soc)"/><path d="M18 52a14 14 0 0 1 28 0" stroke="var(--jp)"/></g><g fill="var(--paper)"><circle cx="9" cy="53" r="7"/><circle cx="55" cy="53" r="7"/><circle cx="16" cy="55" r="5"/><circle cx="48" cy="55" r="5"/></g>'),
    /* 背景：校舎 */
    S("h-school", '<rect x="5" y="22" width="54" height="36" fill="var(--paper)"/><rect x="2" y="17" width="60" height="9" fill="var(--board)"/><rect x="25" y="5" width="14" height="13" fill="var(--paper)"/><circle cx="32" cy="11" r="3" fill="var(--soc)" stroke-width="2"/><g stroke-width="2.5"><rect x="10" y="31" width="10" height="9" fill="var(--jp)"/><rect x="44" y="31" width="10" height="9" fill="var(--jp)"/><rect x="26" y="44" width="12" height="14" fill="var(--wood)"/></g>')
  ].join("");
  const d = document.createElement("div"); d.id = "hiroba-art";
  d.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true" focusable="false"><defs>' + svg + "</defs></svg>";
  document.body.appendChild(d);
})();
