/* まなびひろば「ロケット はっしゃ」の絵（SVG の symbol）。ロケットのモードに入るときだけ読みこむ（index.html の loadScript）。
   描き方は hiroba-art.js と同じ：太い線 3.5・丸い角／色は CSS 変数だけ（背景の空と宇宙の色だけは、この絵の中で決める。ステージ4の惑星だけ vendor/img/planet.png）／文字なし／aria-hidden で使う。
   中身：ロケット rk-rocket・脇のブースター rk-side・炎 rk-fl1 rk-fl2・発射台 rk-pad・流れ星 rk-star・ブーストの絵 rk-bolt・
         せーのの的 rk-ring・ほしの印 rk-gem・ステージ背景 rk-bg0〜rk-bg5（地上・くも・そら・うちゅう・つき・ほし）・雲 rk-cloud */
(function () {
  if (document.getElementById("rocket-art")) return;
  const G = '<g stroke="var(--edge)" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round">';
  const S = (id, vb, body) => `<symbol id="${id}" viewBox="${vb}">${G}${body}</g></symbol>`;
  const P = (id, vb, body) => `<symbol id="${id}" viewBox="${vb}">${body}</symbol>`;      // 線なし（背景）
  const stars = (pts, c) => pts.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c || "#fff"}"/>`).join("");
  const cloud = (x, y, k, o) => `<g transform="translate(${x} ${y}) scale(${k})" fill="#fff" opacity="${o || 1}"><ellipse cx="0" cy="0" rx="70" ry="26"/><circle cx="-24" cy="-18" r="26"/><circle cx="18" cy="-26" r="32"/></g>`;
  const svg = [
    /* ロケット：120×220。機首・まど・ひれ・すそ。炎は別の絵 */
    S("rk-rocket", "0 0 120 150",
      '<path d="M32 118V84C32 52 44 26 60 8c16 18 28 44 28 76v34z" fill="var(--paper)"/>' +
      '<path d="M60 8c8 9 14 20 19 32H41C46 28 52 17 60 8z" fill="var(--math)"/>' +
      '<circle cx="60" cy="80" r="15" fill="var(--jp)"/><circle cx="55" cy="75" r="4.5" fill="var(--paper)" stroke="none"/>' +
      '<path d="M32 98 12 138v24l20-14zM88 98l20 40v24l-20-14z" fill="var(--math)"/>' +
      '<path d="M32 118h56l-6 22H38z" fill="var(--agray)"/><path d="M32 106h56" fill="none" stroke-width="3"/>'),
    S("rk-side", "0 0 120 150",
      '<path d="M4 128v-32c0-12 6-22 12-30 6 8 12 18 12 30v32z" fill="var(--soc)"/><path d="M92 128v-32c0-12 6-22 12-30 6 8 12 18 12 30v32z" fill="var(--soc)"/>' +
      '<path d="M4 128h24l-3 12H7zM92 128h24l-3 12H95z" fill="var(--agray)"/>'),
    S("rk-fl1", "0 0 60 90", '<path d="M30 6c14 22 22 36 22 52 0 17-10 28-22 28S8 75 8 58C8 42 16 28 30 6z" fill="var(--sun)"/><path d="M30 34c8 12 12 20 12 30 0 9-5 15-12 15s-12-6-12-15c0-10 4-18 12-30z" fill="var(--soc)" stroke-width="2.5"/>'),
    S("rk-fl2", "0 0 60 90", '<path d="M30 14c12 20 24 32 22 50-1 15-10 24-22 24S9 79 8 64C6 46 18 34 30 14z" fill="var(--sun)"/><path d="M30 44c7 10 10 16 10 24 0 7-4 12-10 12s-10-5-10-12c0-8 3-14 10-24z" fill="var(--soc)" stroke-width="2.5"/>'),
    /* 発射台 360×60 */
    S("rk-pad", "0 0 360 60", '<path d="M10 22h340v14H10z" fill="var(--agray)"/><path d="M40 36h32l-6 20H46zM288 36h32l-6 20h-20z" fill="var(--btl)"/><path d="M130 22h100l-12-12H142z" fill="var(--wood)"/>'),
    /* 流れ星 64×64：星と、うしろに のびる光 */
    S("rk-star", "0 0 64 64", '<path d="M3 56 24 40M7 44l14-10M14 62l12-12" fill="none" stroke="var(--soc)" stroke-width="4"/><path d="M42 5l5.6 12.4 13.4 1.4-10 9.2 2.9 13.2L42 34.4 30.1 41.2 33 28 23 18.8l13.4-1.4z" fill="var(--soc)"/>'),
    /* ブーストの絵：いなずまの丸 64×64 */
    S("rk-bolt", "0 0 64 64", '<circle cx="32" cy="32" r="26" fill="var(--sun)"/><path d="M36 8 18 36h12l-4 20 20-30H34z" fill="var(--paper)"/>'),
    /* せーのの的 64×64 */
    S("rk-ring", "0 0 64 64", '<circle cx="32" cy="32" r="27" fill="var(--paper)"/><circle cx="32" cy="32" r="18" fill="var(--jp)"/><circle cx="32" cy="32" r="9" fill="var(--soc)"/>'),
    /* ほしの印（集めた数のとなり）48×48 */
    S("rk-gem", "0 0 48 48", '<path d="M24 4l5.4 12.2L43 17.6l-10 9 3 13.4L24 33.4 12 40l3-13.4-10-9 13.6-1.4z" fill="var(--soc)"/>'),
    P("rk-cloud", "-80 -60 160 90", `${cloud(0, 0, 1)}`),
    /* ステージ背景 1280×720（地上・くも・そら・うちゅう・つき・ほし） */
    P("rk-bg0", "0 0 1280 720",
      '<defs><linearGradient id="rk-g0" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8fd0ff"/><stop offset="1" stop-color="#e6f6ff"/></linearGradient></defs>' +
      '<rect width="1280" height="720" fill="url(#rk-g0)"/>' + cloud(200, 150, 1, .9) + cloud(900, 110, .8, .9) + cloud(1100, 260, .6, .8) +
      '<ellipse cx="300" cy="760" rx="620" ry="170" fill="#7ccf6b"/><ellipse cx="1020" cy="780" rx="620" ry="190" fill="#5fbf55"/>'),
    P("rk-bg1", "0 0 1280 720",
      '<defs><linearGradient id="rk-g1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5ab0ff"/><stop offset="1" stop-color="#cdeaff"/></linearGradient></defs>' +
      '<rect width="1280" height="720" fill="url(#rk-g1)"/>' + cloud(180, 560, 1.5, .95) + cloud(520, 640, 1.8, .95) + cloud(980, 580, 1.6, .95) + cloud(1220, 660, 1.4, .95) + cloud(300, 230, .8, .8) + cloud(860, 150, .9, .8)),
    P("rk-bg2", "0 0 1280 720",
      '<defs><linearGradient id="rk-g2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1f4fa8"/><stop offset="1" stop-color="#58a6ff"/></linearGradient></defs>' +
      '<rect width="1280" height="720" fill="url(#rk-g2)"/>' + cloud(260, 520, .9, .55) + cloud(1000, 400, 1.1, .5) + cloud(640, 130, .7, .45) + stars([[120, 90, 3], [420, 60, 2.5], [820, 100, 3], [1150, 70, 2.5]], "#fff")),
    P("rk-bg3", "0 0 1280 720",
      '<defs><linearGradient id="rk-g3" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b0d2b"/><stop offset="1" stop-color="#232a6b"/></linearGradient></defs>' +
      '<rect width="1280" height="720" fill="url(#rk-g3)"/>' +
      stars([[80, 80, 3], [190, 300, 2], [330, 130, 3.5], [470, 420, 2], [560, 70, 2.5], [700, 220, 3], [820, 560, 2.5], [930, 100, 3.5], [1040, 360, 2], [1170, 200, 3], [1210, 600, 2.5], [260, 600, 2.5], [640, 640, 2]]) +
      '<circle cx="700" cy="590" r="56" fill="#e7945a"/><ellipse cx="700" cy="590" rx="92" ry="15" fill="none" stroke="#f6c431" stroke-width="7" transform="rotate(-18 700 590)"/>'),
    P("rk-bg4", "0 0 1280 720",
      '<defs><linearGradient id="rk-g4" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b0d2b"/><stop offset="1" stop-color="#2b2f78"/></linearGradient></defs>' +
      '<rect width="1280" height="720" fill="url(#rk-g4)"/>' + stars([[90, 90, 3], [300, 160, 2.5], [520, 80, 3], [760, 130, 2], [980, 70, 3], [1180, 160, 2.5], [200, 330, 2], [1100, 330, 2]]) +
      '<clipPath id="rk-pc"><circle cx="225" cy="245" r="72"/></clipPath><image href="vendor/img/planet.png" x="150" y="170" width="150" height="150" clip-path="url(#rk-pc)"/>' +      /* 惑星（CC0・Kenney）。ここだけ画像を使う */
      '<ellipse cx="560" cy="860" rx="1000" ry="300" fill="#d9d9de"/><ellipse cx="260" cy="650" rx="70" ry="20" fill="#b9bac4"/><ellipse cx="860" cy="640" rx="90" ry="24" fill="#b9bac4"/><ellipse cx="620" cy="700" rx="50" ry="14" fill="#b9bac4"/>'),
    P("rk-bg5", "0 0 1280 720",
      '<defs><linearGradient id="rk-g5" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a0f5e"/><stop offset="1" stop-color="#7a3fbf"/></linearGradient></defs>' +
      '<rect width="1280" height="720" fill="url(#rk-g5)"/>' +
      stars([[100, 100, 4], [250, 260, 3], [420, 90, 4], [590, 330, 3], [720, 120, 3.5], [900, 280, 3], [1150, 120, 4], [1230, 380, 3], [160, 520, 3], [330, 640, 3.5], [1040, 600, 3.5]], "#ffe066") +
      '<path transform="translate(-170 170)" d="M980 330l26 58 62 6-47 42 14 62-55-33-55 33 14-62-47-42 62-6z" fill="#f6c431" stroke="#fff3b0" stroke-width="6" stroke-linejoin="round"/>')
  ].join("");
  const d = document.createElement("div");
  d.id = "rocket-art"; d.setAttribute("aria-hidden", "true"); d.style.cssText = "position:absolute;width:0;height:0;overflow:hidden";
  d.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" focusable="false">${svg}</svg>`;
  document.body.appendChild(d);
})();
