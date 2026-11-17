#!/usr/bin/env node
// 「ずで かんがえる」どうぐ（data/tools-viz.js）の 判定を調べる。どの問題に どの図が出るか・出ないか。
// 単元の問題（MH_UNITS.make）と 学年別スプリントの式（MH_CALC.make）を 実際に作って、図の数が 描ける大きさに おさまるかも見る。
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..'), ctx={window:{}}; vm.createContext(ctx);
const files=['data/kanji-grade.js','data/questions.js','data/choices.js','data/gen/core.js'];
for(const f of fs.readdirSync(path.join(root,'data/gen')).sort()) if(f!=='core.js'&&f.endsWith('.js')) files.push('data/gen/'+f);
files.push('data/units.js','data/calc.js','data/tools-viz.js');
for(const f of files) vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx,{filename:f});
const TL=ctx.window.MH_TOOLS, U=ctx.window.MH_UNITS, CALC=ctx.window.MH_CALC;
const J=x=>JSON.parse(JSON.stringify(x)), ids=c=>J(TL.detect(c).map(t=>t.id)), D=c=>J(TL.detect(c));
const S=(q,o)=>({q,subj:'sansu',area:'A',...o});

// ブロック・さくらんぼ
assert.deepEqual(ids(S('8 + 5',{unit:'m1-add-kuriage'})),['sakuranbo','blocks'],'くり上がりは さくらんぼが 先');
assert.deepEqual(ids(S('13 − 9',{unit:'m1-sub-kurisage'})),['sakuranbo','blocks']);
assert.deepEqual(ids(S('3 + 4',{unit:'m1-add10'})),['blocks'],'くり上がりなしは ブロックだけ');
assert.deepEqual(ids(S('16 − 4 − 5',{unit:'m1-add3'})),['blocks'],'3つの数');
assert.deepEqual(ids(S('10は 6と いくつ？',{unit:'m1-make10'})),['blocks'],'10の合成');
assert.deepEqual(ids(S('56 + 2',{unit:'m1-add-2keta'})),[],'20をこえる たし算には 出さない');
let t=D(S('8 + 5'))[0]; assert.deepEqual([t.split,t.parts],[1,[2,3]],'8+5 は 5を 2と3に');
t=D(S('5 + 9'))[0]; assert.deepEqual([t.split,t.parts],[0,[1,4]],'5+9 は 5を 1と4に（大きいほうで 10を つくる）');
t=D(S('13 − 9'))[0]; assert.deepEqual(t.parts,[10,3]);
// hissan のデータ（計算スプリントの 1年は たての形で 出る）を 先に使う
assert.deepEqual(ids(S('ちがう文',{unit:'calc-add20',hissan:{a:'8',b:'6',op:'+'}})),['sakuranbo','blocks'],'hissan の数を 問題文より 先に 使う');

// アレイ
t=D(S('6 × 7',{unit:'m2-kuku-6'}))[0]; assert.equal(t.id,'array'); assert.deepEqual([t.per,t.rows,t.total],[6,7,42],'6×7 は 6こずつ 7れつ');
t=D(S('6 × □ = 42'))[0]; assert.deepEqual([t.id,t.per,t.total,t.kind],['array',6,42,'rows?']);
t=D(S('□ × 2 = 14'))[0]; assert.deepEqual([t.per,t.rows,t.kind],[7,2,'per?']);
t=D(S('57 ÷ 6',{hissan:{a:57,b:6,op:'÷',q:9,r:3}}))[0]; assert.deepEqual([t.id,t.per,t.total,t.kind],['array',6,57,'rem']);
t=D(S('1さらに えんぴつを 6ほんずつ のせます。 さらが 7まい あると、ぜんぶで なんほん？',{unit:'m2-kake-bunsho'}))[0];
assert.deepEqual([t.per,t.rows],[6,7],'かけ算の 文章題（1さらの 1は かぞえない）');
t=D(S('シールが 42まい あります。 7人《にん》で おなじ数《かず》ずつ わけると、 ｜1人《ひとり》 なんまい？',{unit:'m3-wari-bunsho'}))[0];
assert.deepEqual([t.per,t.total,t.kind],[7,42,'share'],'わり算の 文章題（ふりがなは 読まない）');
assert.deepEqual(ids(S('63 × 73',{hissan:{a:63,b:73,op:'×'}})),[],'大きい かけ算には 出さない（ひっ算は もう たての形）');

// くらい
t=D(S('100が 6こ、10が 7こ、1が 5こで いくつ？',{unit:'m2-keta3'}))[0];
assert.deepEqual([t.id,t.hi,t.lo,t.rows[0].cells,t.given],['kurai',2,0,{},[[2,6],[1,7],[0,5]]],'ますは からっぽ（こたえを 出さない）');
t=D(S('7万《まん》5000を 数字《すうじ》で かくと？',{unit:'m3-man'}))[0]; assert.deepEqual([t.id,t.kind,t.hi],['kurai','big',7]);
t=D(S('63を 1/10にすると いくつ？',{unit:'m5-seisu-shosu'}))[0];
assert.deepEqual([t.id,t.hi,t.lo,t.rows.length],['kurai',2,-1,1],'1/10 の 分数バーには しない（単元IDが 先）');
t=D(S('420 ÷ 6',{unit:'m3-ookii-wari'}))[0]; assert.equal(t.id,'kurai','ひっ算の形で ない 大きい数');
assert.deepEqual(ids(S('573 + 663',{unit:'m3-add-hissan',hissan:{a:573,b:663,op:'+'}})),[],'ひっ算の問題には くらいも 出さない');

// ぶんすう
t=D(S('2/7 + 3/7'))[0]; assert.deepEqual([t.id,t.fr.length,t.lcm],['bunsu',2,undefined]);
t=D(S('1/2 + 1/3',{unit:'calc-fracAdd'}))[0]; assert.equal(t.lcm,6,'分母が ちがうと こまかく わける線');
t=D(S('4と2/5 − 3と1/5'))[0]; assert.deepEqual(t.fr.map(f=>f.w),[4,3]);
t=D(S('おなじ 大《おお》きさに 4つに わけた 1つぶんを、 なんぶんの 1と いう？',{unit:'m2-bunsu'}))[0]; assert.deepEqual([t.id,t.hide,t.fr[0].d],['bunsu',true,4]);
assert.deepEqual(ids(S('2/3 × 3/4',{unit:'calc-fracMul'})),[],'分数の かけ算は まだ 出さない');
assert.deepEqual(ids(S('1.6 − 9/10',{unit:'m6-mix-dec-frac'})),[],'小数と 分数の まじった式は 出さない');

// 出さないもの
assert.deepEqual(ids({q:'7 × 8',subj:'kokugo'}),[],'算数だけ');
assert.deepEqual(ids(S('みじかい はりが 8、ながい はりが 12 の とき、なんじ？',{unit:'m1-tokei'})),[],'とけいは もう 絵が ある');
assert.deepEqual(ids(S('65 + 31',{unit:'m3-anzan'})),[]);
assert.deepEqual(ids(S('2.5 + 1.25',{area:'A',hissan:{a:'2.5',b:'1.25',op:'+'}})),[],'小数の ひっ算には 出さない');
assert.deepEqual(ids({}),[]);

// 実際の 問題で：図の大きさが 決まりの 中・ラベルが ある
let shown=0;
const check=(c,where)=>{ for(const x of TL.detect(c)){ shown++;
  assert.ok(TL.LABEL[x.id]&&x.label===TL.LABEL[x.id],where+' ラベル');
  if(x.id==='blocks'){ const v=[x.start,...x.steps.map(s=>s.n)]; assert.ok(v.every(n=>n>=0&&n<=20)&&(x.total==null||x.total<=20),where+' ブロックは 20まで'); }
  if(x.id==='array'){ assert.ok(x.per>=1&&x.per<=12&&x.total<=100&&Math.ceil(x.total/x.per)<=12,where+' アレイの大きさ '+JSON.stringify(x)); }
  if(x.id==='bunsu'){ assert.ok(x.fr.every(f=>f.d>=2&&f.d<=12&&f.w+f.n/f.d<=5),where+' 分数バー'); }
  if(x.id==='kurai'){ assert.ok(x.hi<=15&&x.lo>=-3&&x.rows.length>=1&&x.rows.length<=3,where+' くらい'); }
} };
for(const u of U.UNITS.filter(u=>u.subj==='sansu'&&u.status==='ready')) for(let s=1;s<=25;s++){ const it=U.make(u.id,s*17); check({q:it.q,unit:it.unit,g:it.g,subj:it.subj,area:u.area,hissan:it.hissan},u.id); }
let seed=7; const rnd=n=>{ seed=(seed+0x6D2B79F5)|0; let x=Math.imul(seed^seed>>>15,1|seed); x^=x+Math.imul(x^x>>>7,61|x); return Math.floor(((x^x>>>14)>>>0)/4294967296*n); }, sh=a=>{ a=a.slice(); for(let i=a.length-1;i>0;i--){ const j=rnd(i+1); [a[i],a[j]]=[a[j],a[i]]; } return a; };
const seen={};
for(let g=1;g<=6;g++) for(let i=0;i<200;i++){ const q=CALC.make(g,rnd,sh), m=/^([\d.]+)\s*([+−×÷])\s*([\d.]+)$/.exec(q.q);
  const c={q:q.q,unit:'calc-'+q.unit,g,subj:'sansu',area:'A',hissan:m&&q.unit!=='kuku'&&q.unit!=='div99'?{a:m[1],b:m[3],op:m[2]}:undefined};
  check(c,'calc g'+g); for(const x of TL.detect(c)) seen[q.unit+':'+x.id]=1; }
for(const k of ['add20:blocks','add20:sakuranbo','sub20:sakuranbo','kuku:array','div99:array','fracAdd:bunsu','fracSub:bunsu']) assert.ok(seen[k],'計算スプリントで 出る: '+k);
assert.ok(!Object.keys(seen).some(k=>/^(fracMul|fracDiv|add3|sub3|decAdd|decSub|mul32):/.test(k)),'計算スプリントで 出ない式 '+Object.keys(seen));
console.log(`ずで かんがえる どうぐ: 判定の検査 OK（図 ${shown} 件）`);
