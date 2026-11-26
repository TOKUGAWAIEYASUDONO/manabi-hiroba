#!/usr/bin/env node
// まなびの たすけ（data/learnhelp.js）の 単体テスト。node tools/test-learnhelp.js
// ・はやすぎる まちがい・あとで もう一度・つまずき・やさしい ステップ
// ・とき方：手で 決めた 例と、ほんものの 算数の 単元の 問題 ぜんぶ（説明の さいごの「こたえ」が 問題の こたえと 合う）
const assert=require('node:assert/strict'), fs=require('node:fs'), path=require('node:path'), vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const LH=require(path.join(root,'data/learnhelp.js'));

/* はやすぎる まちがい */
let f=LH.fast(0,200,false); assert.deepEqual(f,{n:1,rest:false});
f=LH.fast(f.n,300,true); assert.deepEqual(f,{n:1,rest:false},'はやい せいかいは そのまま');
f=LH.fast(f.n,100,false); assert.deepEqual(f,{n:0,rest:true},'2回 つづいたら ひと休み');
assert.deepEqual(LH.fast(1,1500,false),{n:0,rest:false},'ゆっくりなら 0 に もどす');
assert.deepEqual(LH.fast(1,NaN,false),{n:1,rest:false});

/* あとで もう一度 */
const q=[], a={id:1}, b={id:2};
LH.reAdd(q,a,5,0); LH.reAdd(q,a,5,0.9); assert.equal(q.length,1,'同じ問題は 1回だけ');
assert.equal(q[0].due,5+LH.RE_MIN);
LH.reAdd(q,b,6,0.99); assert.equal(q[1].due,6+LH.RE_MAX);
assert.equal(LH.rePop(q,7),null); assert.equal(LH.rePop(q,8),a); assert.equal(LH.rePop(q,20),b); assert.equal(q.length,0);
for(let i=0;i<200;i++){ const z=[]; LH.reAdd(z,{},10,Math.random()); assert.ok(z[0].due>=13&&z[0].due<=15); }

/* つまずき */
let st={}; let r;
r=LH.stuck(st,'u1','×'); assert.equal(r.ask,false); r=LH.stuck(st,'u1','△'); r=LH.stuck(st,'u1','×'); assert.equal(r.ask,false);
r=LH.stuck(st,'u1','×'); assert.equal(r.ask,true,'× が 3回で 声かけ'); assert.equal(st.u1,0);
LH.stuck(st,'u2','×'); LH.stuck(st,'u2','×'); LH.stuck(st,'u2','○'); assert.equal(LH.stuck(st,'u2','×').ask,false,'○ で もどす');

/* とき方（手の 例） */
const how=(q,a,hs)=>LH.howTo(q,hs||null,a);
assert.deepEqual(how('8 + 5','13').slice(-2),['8 ＋ 2 ＝ 10、10 ＋ 3 ＝ 13','こたえ 13']);
assert.equal(how('8 + 5','12'),null,'こたえと 合わなければ 出さない');
assert.equal(how('1.2 + 3','4.2'),null,'小数は 出さない');
assert.equal(how('3 + 4 × 2','11'),null,'まぜた 式は 出さない');
assert.equal(how('□ + 3 = 8','5'),null);
assert.deepEqual(how('17 ÷ 5','3 あまり 2').slice(-1),['こたえ 3 あまり 2']);
assert.deepEqual(how('17 ÷ 5','3|2').slice(-1),['こたえ 3 あまり 2']);
assert.ok(how('403 − 158','245').some(l=>/かりて 13 − 8 ＝ 5/.test(l)));
assert.ok(how('45 × 23','1035').includes('あわせる：135 ＋ 900 ＝ 1035'));
assert.ok(how('','85',{a:47,b:38,op:'+'}).includes('こたえ 85'));
assert.ok(how('2 + 3 + 4','9').includes('5 ＋ 4 ＝ 9'));
// 総当たり：小さい 数の 4つの 計算は いつも 説明が 出て、こたえが 正しい
for(let x=0;x<=120;x++) for(let y=0;y<=40;y++){
  const t=[[`${x} + ${y}`,x+y],[`${x} × ${y}`,x*y]]; if(x>=y) t.push([`${x} − ${y}`,x-y]);
  if(y>0) t.push([`${x} ÷ ${y}`,x%y?`${Math.floor(x/y)} あまり ${x%y}`:x/y]);
  for(const [qq,aa] of t){ const L=how(qq,String(aa)); assert.ok(L&&L.length>=2&&L.length<=8,`${qq}：説明が ない／ながい`); assert.equal(L[L.length-1],`こたえ ${aa}`); }
}

/* やさしい ステップ */
const U=[{id:'a1',subj:'sansu',series:'わり算',step:1,g:3},{id:'a2',subj:'sansu',series:'わり算',step:2,g:3},{id:'b1',subj:'sansu',series:'わり算',step:1,g:4},{id:'c',subj:'kokugo',series:'わり算',step:1,g:3}];
assert.equal(LH.easier(U[1],U).id,'a1'); assert.equal(LH.easier(U[0],U),null); assert.equal(LH.easier({id:'x',subj:'sansu',series:'わり算',step:2,g:4},U).id,'b1');

/* ほんものの 算数の 問題：説明が 出るときは、さいごの こたえが 問題の こたえと 同じ。説明の 行の 長さも 見る */
const ctx={window:{}}; vm.createContext(ctx);
const files=['data/kanji-grade.js','data/questions.js','data/choices.js','data/gen/core.js'];
for(const fl of fs.readdirSync(path.join(root,'data/gen')).sort()) if(fl!=='core.js'&&fl.endsWith('.js')) files.push('data/gen/'+fl);
files.push('data/units.js');
for(const fl of files) vm.runInContext(fs.readFileSync(path.join(root,fl),'utf8'),ctx,{filename:fl});
const UN=ctx.window.MH_UNITS, units=UN.UNITS.filter(u=>u.subj==='sansu'&&u.status==='ready'&&u.gen);
let made=0, tried=0, unitsWith=0;
for(const u of units){
  let any=false;
  for(let seed=0;seed<40;seed++){
    let it; try{ it=UN.make(u.id,seed); }catch(e){ continue; }
    if(!it) continue; tried++;
    const L=LH.howTo(it.q,it.hissan,it.a);
    if(!L) continue;
    made++; any=true;
    assert.ok(L.length<=8,`${u.id}: ${it.q} の 説明が ながい`);
    for(const l of L) assert.ok(l.length<=90,`${u.id}: ${it.q}：${l}`);
  }
  if(any) unitsWith++;
  if(u.step>1&&u.series) LH.easier(u,units);
}
console.log(`learnhelp: OK（算数 ${units.length}単元のうち ${unitsWith}単元で とき方が 出る・${tried}問中 ${made}問）`);
