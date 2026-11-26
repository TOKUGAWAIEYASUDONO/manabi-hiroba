#!/usr/bin/env node
// 教科の へや の 流れを 実ブラウザーで たどる検査（docs/screen-split.md 3章の 段階⑤）。
//   ホーム → 算数の とびら → まとまり → 単元カード → 問題 → 結果 → もどる（はじめた カードに もどる）
//   1年は ホーム → 計算スプリント → 単元カード（1タップ）→ 結果 → もどる（単元えらびに もどる）
// スマホ 375×812・タブレット 768×1024・PC 1366×768 × 1年・3年・5年。どの 画面でも 横はみ出し・44px 未満の ボタンが ないこと。
// 古い URL（#units?kid=1 など）と 課題リンク（#u= #play #meter の task=1）から 入っても こわれないことも しらべる。
// Playwright（require('playwright')）が いる。prepublish には 入れていない（measure-layout.js と おなじ あつかい）。
//   node tools/measure-flow.js            … しらべるだけ
//   node tools/measure-flow.js --shots DIR … 画面の 写真も DIR に のこす
const fs = require('fs'), path = require('path'), http = require('http');
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { console.error('playwright が ありません（npm i -D playwright などで 入れてください）'); process.exit(2); }
const root = path.resolve(__dirname, '..');
const shotArg = process.argv.indexOf('--shots'), shotDir = shotArg > 0 ? path.resolve(process.argv[shotArg + 1]) : null;
if (shotDir) fs.mkdirSync(shotDir, { recursive: true });
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json' };
const server = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
  if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(res);
});
const errors = [];
const bad = (where, msg) => { errors.push(`${where}: ${msg}`); console.error(`× ${where}: ${msg}`); };
// 画面の しらべ：横はみ出し・小さい ボタン（下の 先生・保護者向けの 文字リンク .gdlink と、あそびかたの 切りかえ .spm は のぞく。
//   .spm は 高さ 40px で 前から この 大きさ。べつの 作業で なおす よてい）
const LOOK = `(()=>{const e=document.documentElement, o=e.scrollWidth>innerWidth+1?e.scrollWidth-innerWidth:0;
  const small=[...document.querySelectorAll('#app button,#app a.btn,#app .tile,#app .sdoor')].filter(b=>{const r=b.getBoundingClientRect(),s=getComputedStyle(b);
    return r.width>0&&r.height>0&&s.visibility!=='hidden'&&!b.closest('.gdlink,.more,.links,.bottom,.spm')&&(r.height<44||r.width<44);}).map(b=>(b.className||b.tagName)+':'+(b.innerText||b.getAttribute('aria-label')||'').trim().slice(0,12)+' '+Math.round(b.getBoundingClientRect().width)+'×'+Math.round(b.getBoundingClientRect().height));
  return {overflow:o,small,hash:location.hash,h:e.scrollHeight};})()`;
// 乱数を 固定する（出る 問題を 毎回 おなじに して、たまにしか 出ない はみ出しも 毎回 しらべられるように）
const SEEDED = () => { let x = 5 * 2654435761 >>> 0; Math.random = () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; };
// 1年「いくつ ある？」で つかう 絵文字（data/gen/sansu-12.js の kazoeru から よむ）。⭐ は 字と おなじ あつかいで、ならぶと 改行されず はみ出した（2026-11）
const KAZOERU = (() => { const m = fs.readFileSync(path.join(root, 'data/gen/sansu-12.js'), 'utf8').match(/g\.kazoeru[\s\S]*?r\.pick\(\[([^\]]+)\]/); return m ? JSON.parse('[' + m[1] + ']') : []; })();
if (!KAZOERU.length) { console.error('× kazoeru の 絵文字が よめない'); process.exit(1); }
// バトルの 設定画面の 横はみ出し・小さい ボタン
async function look2(page, where, name) {
  const v = await page.evaluate(LOOK);
  if (v.overflow) bad(`${where} ${name}`, `横に ${v.overflow}px はみ出し`);
  if (v.small.length) bad(`${where} ${name}`, '44px 未満の ボタン ' + v.small.join('、'));
  if (shotDir) await page.screenshot({ path: path.join(shotDir, `btl-${where.replace(/[^\w年]+/g, '_')}-${name}.png`), fullPage: true });
  return !v.overflow;
}
async function main() {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}/index.html`;
  const browser = await chromium.launch();
  try {
    for (const [w, h] of [[375, 812], [768, 1024], [1366, 768]]) {
      for (const g of [1, 3, 5]) {
        const where = `${w}×${h} ${g}年`;
        const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
        const page = await ctx.newPage();
        page.on('pageerror', e => bad(where, 'スクリプトの エラー ' + e.message));
        await page.clock.install();
        await page.addInitScript(SEEDED);
        await page.goto(base + '#home');
        await page.evaluate(gr => { localStorage.clear(); localStorage.setItem('mh_ui', JSON.stringify({ grade: gr, subj: 'all' })); }, g);
        await page.goto(base + '#home'); await page.reload(); await page.waitForSelector('.home');
        let n = 0;
        const look = async name => {
          await page.waitForTimeout(150);
          const v = await page.evaluate(LOOK);
          if (v.overflow) bad(`${where} ${name}`, `横に ${v.overflow}px はみ出し`);
          if (v.small.length) bad(`${where} ${name}`, '44px 未満の ボタン ' + v.small.join('、'));
          if (shotDir) await page.screenshot({ path: path.join(shotDir, `${w}-g${g}-${String(++n).padStart(2, '0')}-${name}.png`), fullPage: true });
          return v;
        };
        await look('ホーム');
        let card;
        if (g <= 2) {
          await page.click('.tile[data-id="calc"]');
          await page.waitForSelector('.up.kid .kidunits .ucard'); await look('単元えらび');
          card = await page.evaluate(() => location.hash);
          await page.click('.kidunits .ucard');
        } else {
          await page.click('.sdoor[data-door="math"]');
          await page.waitForSelector('.sroom .sritem'); await look('算数のへや');
          if (!(await page.evaluate(() => location.hash)).startsWith('#subj?s=sansu')) bad(where, '算数の とびらが へやに いかない');
          await page.click('.sroom .sritem');
          await page.waitForSelector('.sicards .ucard'); card = await page.evaluate(() => location.hash); await look('単元カード');
          await page.click('.sicards .ucard[data-id]');
        }
        await page.waitForSelector('#qq'); await look('問題');
        if (g <= 2) {   // 「いくつ ある？」の 絵文字が 20こ ならぶ 問題（いちばん 長い とき）を 1つずつ 入れて しらべる
          for (const e of KAZOERU) {
            await page.evaluate(t => { document.querySelector('#qq').textContent = t; }, `${e}は いくつ ある？ ${e.repeat(20)}`);
            const o = await page.evaluate(LOOK);
            if (o.overflow) bad(`${where} 問題（${e}×20）`, `横に ${o.overflow}px はみ出し`);
          }
        }
        await page.clock.runFor(61000);
        await page.waitForSelector('.res'); await look('結果');
        const back = page.locator('.res .subs button', { hasText: 'もどる' });
        if (!(await back.count())) bad(where, '結果に「もどる」が ない');
        else {
          await back.first().click(); await page.waitForTimeout(300);
          const now = await page.evaluate(() => location.hash);
          const shown = await page.evaluate(() => !!document.querySelector('.sicards,.kidunits'));
          if (now !== card || !shown) bad(where, `もどる先が ちがう：${now}（よてい ${card}）`);
        }
        await ctx.close();
      }
    }
    // バトル（たからばこ・すごろく）：ホームの 入口 → ① 教科（3年から 理科）→ ② その 教科の 単元を えらぶ → 「はじめる」が 画面の 中に 見えて 押せる → バトルが はじまる
    //   単元が 40こ 以上 ならぶと、ボタンが 一番下に かくれて「スタートボタンが ない」ように 見えた（2026-11）
    //   「問題を えらんで」に 理科が なくて まよう 子が いた（2026-11）。① に 理科が あり、② に 理科の 単元だけが 出ることも しらべる
    //   1年は 理科が ないので、① に 理科が 出ないこと・算数で おなじ 流れが できることを しらべる
    for (const [w, h] of [[375, 812], [768, 1024], [1366, 768]]) {
      for (const g of [0, 1, 3, 5]) for (const m of ['chest', 'race', 'sboss']) {
        const where = `${w}×${h} ${g ? g + '年' : 'ぜんぶ'} バトル ${m}`;
        const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
        const page = await ctx.newPage();
        page.on('pageerror', e => bad(where, 'スクリプトの エラー ' + e.message));
        await page.goto(base + '#home');
        await page.evaluate(gr => { localStorage.clear(); localStorage.setItem('mh_ui', JSON.stringify({ grade: gr, subj: 'all' })); }, g);
        await page.reload(); await page.waitForSelector('.home');
        if (!(await page.locator('.home #hUde').count())) { bad(where, 'ホームに うでだめしの 入口が ない'); await ctx.close(); continue; }
        await page.click('.home #hUde'); await page.waitForSelector(`#app .ude [data-m="${m}"]`);      // ホーム → うでだめし → バトル（2026-11-26）
        await page.click(`#app .ude [data-m="${m}"]`); await page.waitForSelector('#app .bsj[data-sj]');
        const sjs = await page.$$eval('#app .bsj[data-sj]', l => l.map(e => e.dataset.sj));
        if (await page.locator('#modeUnits .ucard,#app .tile[data-id]').count()) bad(where, '教科を えらぶ 前から 問題が ならんでいる');
        const want = g === 1 ? 'math' : 'rika';
        if (g === 1 && sjs.includes('rika')) bad(where, '1年なのに 理科が ある');
        if (!sjs.includes(want)) { bad(where, `① に ${want} が ない（${sjs.join('・')}）`); await ctx.close(); continue; }
        if (!(await look2(page, where, '①教科'))) { await ctx.close(); continue; }
        await page.click(`#app .bsj[data-sj="${want}"]`); await page.waitForSelector('#modeUnits .ucard');
        if (want === 'math' && !(await page.locator('#app .tile[data-id]').count())) bad(where, '算数に えらべる ゲームが ない');
        const subj = await page.evaluate(() => [...new Set([...document.querySelectorAll('#modeUnits .ucard')].map(b => { const u = window.MH_UNITS.byId ? window.MH_UNITS.UNITS.find(x => x.id === b.dataset.uid) : null; return u ? u.subj : '?'; }))]);
        if (subj.join() !== (want === 'math' ? 'sansu' : 'rika')) bad(where, `② に ほかの 教科の 単元が まざる（${subj.join('・')}）`);
        if (g && want === 'rika' && !(await page.evaluate(gr => [...document.querySelectorAll('#modeUnits .ucard')].every(b => { const u = window.MH_UNITS.UNITS.find(x => x.id === b.dataset.uid); return u && u.g === gr; }), g))) bad(where, '② に ほかの 学年の 単元が まざる');
        await look2(page, where, '②単元');
        await page.locator('#modeUnits .ucard').first().click(); await page.waitForTimeout(150);
        const v = await page.evaluate(() => {
          const b = document.querySelector('#ugo'); if (!b) return { none: true };
          const r = b.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2, hit = document.elementFromPoint(x, y);
          return { w: r.width, h: r.height, inView: r.top >= 0 && r.bottom <= innerHeight, hit: !!hit && b.contains(hit) };
        });
        if (v.none) bad(where, '「はじめる」ボタンが ない');
        else if (!v.w || !v.h) bad(where, '単元を えらんでも「はじめる」が 出ない');
        else if (!v.inView) bad(where, '「はじめる」が 画面の 外（スクロールしないと 見えない）');
        else if (!v.hit) bad(where, '「はじめる」の 上に ほかの ものが かぶさって 押せない');
        else if (v.h < 44) bad(where, `「はじめる」が 小さい（高さ ${Math.round(v.h)}px）`);
        else {
          await page.click('#ugo');
          if (!g) { await page.waitForSelector('.gradegrid [data-g="3"]', { timeout: 3000 }).catch(() => {}); if (await page.locator('.gradegrid [data-g="3"]').count()) await page.click('.gradegrid [data-g="3"]'); }      // 「ぜんぶ」は 学年を きいてから はじまる
          try { await page.waitForSelector('.mplay', { timeout: 3000 }); } catch (e) { bad(where, `「はじめる」で バトルが はじまらない（${await page.evaluate(() => location.hash)}）`); }
        }
        await ctx.close();
      }
    }
    console.log('○ バトルの 設定：① 教科（理科も）→ ② その 教科の 単元 → 「はじめる」が 画面に 見えて、押すと はじまる');
    // ひとりで ボスバトル：はじまる → 正解で ボスの げんきが へる → おいはらう → つぎの ボス → 時間で 結果（おいはらえた／0ぴきでも はげます）。
    //   メダル・きろく（mh_best）には 書かない。課題リンク（task=1）では 遊べない（ホームへ）
    for (const [w, h] of [[375, 812], [768, 1024], [1366, 768]]) {
      for (const win of [true, false]) {
        const where = `${w}×${h} ひとりで ボス（${win ? 'おいはらう' : '0ぴき'}）`;
        const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
        const page = await ctx.newPage();
        page.on('pageerror', e => bad(where, 'スクリプトの エラー ' + e.message));
        await page.clock.install();
        await page.goto(base + '#home');
        await page.evaluate(() => { localStorage.clear(); localStorage.setItem('mh_ui', JSON.stringify({ grade: 3, subj: 'all' })); });
        await page.reload(); await page.waitForSelector('.home');
        await page.click('.home #hUde'); await page.click('#app .ude [data-m="sboss"]'); await page.waitForSelector('#app .bsj[data-sj="math"]');
        await page.click('#app .bsj[data-sj="math"]'); await page.waitForSelector('#modeUnits .ucard');      // ① 教科 → ② 単元（ほかの バトルと おなじ 流れ）
        await page.locator('#modeUnits .ucard').first().click(); await page.click('#ugo');
        await page.waitForSelector('.mplay #sbst');
        const lk = async what => { const r = await page.evaluate(LOOK); if (r.overflow) bad(where, `${what}：横に ${r.overflow}px はみ出し`); if (r.small.length) bad(where, `${what}：44px 未満の ボタン ${r.small.join(' / ')}`); if (shotDir) await page.screenshot({ path: path.join(shotDir, `sboss-${w}-${win ? 'w' : 'z'}-${what}.png`) }); };
        await lk('はじめ');
        if (win) {
          const pick = ok => page.evaluate(ok => { const b = [...document.querySelectorAll('#mmain .choice')].find(e => mineRight(e.dataset.c) === ok); if (b) b.click(); return !!b; }, ok);
          const hp0 = await page.evaluate(() => M.sb.hp);
          await pick(true); await page.clock.runFor(900);
          if (!(await page.evaluate(h0 => M.sb.hp < h0 && parseFloat(document.getElementById('sbhp').style.width) < 100, hp0))) bad(where, '正解でも ボスの げんきが へらない');
          await pick(false); await page.clock.runFor(300);
          if (!(await page.evaluate(() => /げんき/.test(document.getElementById('sbtr').textContent)))) bad(where, 'まちがえても「げんきを とりもどした」が 出ない');
          await lk('まちがい'); await page.clock.runFor(1700);
          for (let k = 0; k < 12 && (await page.evaluate(() => M.sb.dn)) < 1; k++) { await pick(true); await page.clock.runFor(900); }
          if (!(await page.evaluate(() => M.sb.dn === 1 && !!document.querySelector('.bs-runq')))) bad(where, 'げんき 0 で にげていかない');
          else { await lk('にげる'); await page.clock.runFor(2600); if (!(await page.evaluate(() => M.sb.lv === 1 && !!document.querySelector('#mmain .choice')))) bad(where, 'つぎの ボスが 来ない・問題に もどらない'); }
        }
        await page.clock.runFor(125000);
        try { await page.waitForSelector('.res.sbres', { timeout: 3000 }); } catch (e) { bad(where, '時間で 結果に ならない'); await ctx.close(); continue; }
        await lk('結果');
        const res = await page.evaluate(() => ({ num: document.querySelector('.sbres .num').textContent, again: !!document.querySelector('#again'), best: localStorage.getItem('mh_best') }));
        if (win ? !/1ひき/.test(res.num) : !/すこし/.test(res.num)) bad(where, `結果の ことばが ちがう：${res.num}`);
        if (!res.again) bad(where, '結果に「もう一回」が ない');
        if (res.best) bad(where, 'メダル・きろく（mh_best）に 書いている');
        await ctx.close();
      }
    }
    {
      const ctx = await browser.newContext({ viewport: { width: 375, height: 812 } }), page = await ctx.newPage();
      await page.goto(base + '#mode?m=sboss&game=calc&g=3&t=120&task=1'); await page.waitForTimeout(400);
      if (await page.locator('.mplay').count()) bad('ひとりで ボス 課題リンク', 'task=1 でも 遊べてしまう');
      await ctx.close();
    }
    console.log('○ ひとりで ボスバトル：はじまって、げんきが へって、にげて、つぎの ボス、時間で 結果（0ぴきでも はげます）・課題リンクでは 出ない');
    // 古い URL・課題リンクから 入る（スマホ・3年）
    const ctx = await browser.newContext({ viewport: { width: 375, height: 812 } });
    const page = await ctx.newPage();
    page.on('pageerror', e => bad('古いURL', 'スクリプトの エラー ' + e.message));
    await page.goto(base + '#home');
    for (const [hash, g, want, sel] of [
      ['#units?kid=1&subj=sansu', 3, '#subj?s=sansu', '.sroom'],
      ['#units?kid=1', 5, '#subj?s=sansu', '.sroom'],
      ['#units?kid=1&subj=sansu&all=1', 5, null, '.up.kid.kc'],
      ['#units?kid=1&subj=kokugo', 4, null, '.up.kid'],
      ['#units?kid=1', 1, null, '.kidunits'],
      ['#units', 3, null, '.up:not(.kid)'],
      ['#units?pick=m3-amari', 3, null, '.up:not(.kid)'],
      ['#subj?s=kokugo', 3, null, '.smini'],
      ['#u=m3-amari&n=10&s=1', 3, null, '#ugo'],
      ['#u=m3-amari&n=10&s=1&task=1', 3, null, '#ugo'],
      ['#play?game=calc&g=3&t=60&task=1', 3, null, '#qq'],
      ['#meter?st=1&task=1', 3, null, '.mtplay'],
      ['#modesetup?m=chest', 3, null, '.bsj[data-sj="rika"]'],
      ['#modesetup?m=race&s=rika', 5, null, '#modeUnits .ucard'],
      ['#mode?m=chest&game=unit&g=3&t=120&r=normal&units=r3-living', 3, null, '.mplay'],
      ['#mode?m=race&game=calc&g=3&t=120', 3, null, '.mplay'],
    ]) {
      await page.evaluate(gr => { sessionStorage.clear(); localStorage.setItem('mh_ui', JSON.stringify({ grade: gr, subj: 'all' })); }, g);
      await page.goto('about:blank'); await page.goto(base + hash);
      try { await page.waitForSelector(sel, { timeout: 5000 }); } catch (e) { bad(hash, `${sel} が 出ない（${await page.evaluate(() => location.hash)}）`); continue; }
      const now = await page.evaluate(() => location.hash);
      if (want && now !== want) bad(hash, `つなぎ先が ${now}（よてい ${want}）`);
      const v = await page.evaluate(LOOK); if (v.overflow) bad(hash, `横に ${v.overflow}px はみ出し`);
      console.log(`○ ${hash}（${g}年）→ ${now}`);
    }
    await ctx.close();
  } finally { await browser.close(); server.close(); }
  if (errors.length) { console.error(`\n流れの 検査：${errors.length} 件`); process.exit(1); }
  console.log('流れの 検査：3つの はば × 1・3・5年で ホーム → へや → カード → 問題 → 結果 → もどる OK。古い URL・課題リンク OK');
}
main().catch(e => { console.error(e); server.close(); process.exit(1); });
