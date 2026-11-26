#!/usr/bin/env node
// 回答スピードの あつまり（data/statlib.js）の 単体テスト。node tools/test-statlib.js
// ・送る 形の 検査（名前などの よけいな 物は 落とす・おかしな 数は 受けとらない）
// ・受けとり口：合計に 足す・1回ずつは のこさない・データベースが なければ だまって 204
// ・まとめ：合言葉・回数の 少ない 行は 出さない
// ・index.html：送るのは 練習の おわりの 1回だけ・先生の オフ・Pages Functions の 入口
process.removeAllListeners('warning');
const assert=require('node:assert/strict'), fs=require('node:fs'), path=require('node:path');
const root=path.resolve(__dirname,'..');
const SL=require(path.join(root,'data/statlib.js'));
const { DatabaseSync } = require('node:sqlite');

(async()=>{
/* 送る 形 */
const ok={v:1,game:'calc',g:3,u:'m3-amari',m:'n',q:20,ok:18,ms:64000};
assert.deepEqual(SL.clean(ok),ok);
assert.deepEqual(SL.clean({...ok,name:'たろう',id:'abc'}),ok,'よけいな 物は 落とす');
for(const bad of [{...ok,v:2},{...ok,game:'x'},{...ok,m:'z'},{...ok,g:7},{...ok,g:1.5},{...ok,u:'<b>'},{...ok,u:'たろう'},
  {...ok,q:0},{...ok,q:301},{...ok,ok:21},{...ok,ok:-1},{...ok,ms:-1},{...ok,ms:20*60000+1},{...ok,q:'20'},null,'x'])
  assert.equal(SL.clean(bad),null,JSON.stringify(bad));
assert.equal(SL.clean({...ok,u:''}).u,'');
assert.equal(SL.clean({...ok,g:0}).g,0);

/* 1回の 練習から */
const p={x:{id:'calc'},g:3,sm:'ta',u:{ids:['m3-amari']},ok:5};
SL.addMs(p,3000); SL.addMs(p,999999); SL.addMs(p,-5); p.aOk=2;
assert.deepEqual(SL.fromRun(p),{v:1,game:'calc',g:3,u:'m3-amari',m:'ta',q:3,ok:2,ms:63000},'1問は 60秒まで');
assert.equal(SL.fromRun({...p,u:{ids:['m3-amari','m3-kake']}}).u,'','単元が 2つ以上なら 単元は 空');
assert.equal(SL.fromRun({x:{id:'calc'}}),null,'答えて いなければ 送らない');

/* 送ってよいか */
const SITE=require(path.join(root,'data/move.js')).SITE, H=SITE.NEW_HOST;
assert.equal(SL.allowed(H,null,SITE),SL.ON&&SITE.ON);
assert.equal(SL.allowed('localhost',null,SITE),false);
assert.equal(SL.allowed(H,null,null),false);
assert.equal(SL.allowed(H,{on:0},SITE),false,'先生の オフ');
assert.equal(SL.dayJST(Date.UTC(2026,10,25,15,30)),'2026-11-26','日本時間で 日を 分ける');

/* D1 の かわり（node:sqlite で 同じ SQL を 動かす） */
const mem=new DatabaseSync(':memory:');
const DB={prepare(sql){ const st=mem.prepare(sql); let args=[];
  const o={bind(...a){ args=a; return o; }, async run(){ st.run(...args); return {}; }, async all(){ return {results:st.all(...args).map(r=>({...r}))}; }};
  return o; }};
const req=(body,h={})=>new Request('https://example.test/api/stat',{method:'POST',body:typeof body==='string'?body:JSON.stringify(body),headers:h});
const T0=Date.UTC(2026,10,26,3);
assert.equal((await SL.handlePost(req(ok),{} ,T0)).status,204,'データベースが なければ 204');
for(let i=0;i<12;i++) assert.equal((await SL.handlePost(req({...ok,name:'x'}),{DB},T0)).status,204);
assert.equal((await SL.handlePost(req({...ok,u:'m3-kake'}),{DB},T0)).status,204);
assert.equal((await SL.handlePost(req('{'),{DB},T0)).status,400);
assert.equal((await SL.handlePost(req({...ok,q:0}),{DB},T0)).status,400);
assert.equal((await SL.handlePost(req('x'.repeat(2000)),{DB},T0)).status,413);
const all=mem.prepare('SELECT * FROM agg').all();
assert.equal(all.length,2,'1回ずつは のこさず 合計の 行だけ');
const r0=all.find(r=>r.u==='m3-amari');
assert.deepEqual([r0.day,r0.rounds,r0.q,r0.ok,r0.ms],['2026-11-26',12,240,216,768000]);
assert.deepEqual(Object.keys(r0).sort(),['day','g','game','m','ms','ok','q','rounds','u'],'名前などの 列は ない');

/* まとめ */
const get=(k,days=30)=>new Request('https://example.test/api/stats?days='+days,{headers:k?{'x-stats-key':k}:{}});
const env={DB,STATS_KEY:'himitsu-123'};
assert.equal((await SL.handleGet(get(''),env,T0)).status,401);
assert.equal((await SL.handleGet(get('himitsu-12'),env,T0)).status,401);
assert.equal((await SL.handleGet(get('x'),{DB},T0)).status,401,'合言葉が 設定されて いなければ 見せない');
const g=await (await SL.handleGet(get('himitsu-123'),env,T0)).json();
assert.equal(g.rows.length,1,'回数の 少ない 行（1回）は 出さない');
assert.equal(g.rows[0].rounds,12);
assert.deepEqual(g.days,[{day:'2026-11-26',rounds:13,q:260}]);
const g7=await (await SL.handleGet(get('himitsu-123',7),env,T0+40*864e5)).json();
assert.equal(g7.rows.length,0,'期間の 外は 出さない');
assert.equal(SL.sameKey('a','a'),true); assert.equal(SL.sameKey('a','ab'),false); assert.equal(SL.sameKey('',''),false);

/* index.html・stats.html・functions */
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
assert.ok(/<script src="data\/statlib\.js\?v=[0-9a-f]{8}"><\/script>/.test(html),'index.html が 読みこむ');
assert.equal((html.match(/stSend\(p\);/g)||[]).length,1,'送るのは finish の 1か所だけ');
assert.ok(/id="statOn"/.test(html)&&/ST\.CFG,\{on:so\.checked\?1:0\}/.test(html),'先生の 設定で オフに できる');
const st=fs.readFileSync(path.join(root,'stats.html'),'utf8');
assert.ok(/name="robots" content="noindex/.test(st),'見る画面は 検索に 出さない');
assert.ok(!html.includes('stats.html'),'児童の 画面から 見る画面へ リンクしない');
for(const f of ['stat.js','stats.js']) assert.ok(/from "\.\.\/\.\.\/data\/statlib\.js"/.test(fs.readFileSync(path.join(root,'functions/api',f),'utf8')),f);
const sm=fs.readFileSync(path.join(root,'sitemap.xml'),'utf8'); assert.ok(!sm.includes('stats'),'sitemap に 入れない');
console.log('statlib: clean, upsert, min rounds, key, teacher off OK');
})().catch(e=>{ console.error(e); process.exit(1); });
