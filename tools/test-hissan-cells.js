#!/usr/bin/env node
// ひっ算のマス入力：どの位置に どの数字のマスができるか（たし算・ひき算・かけ算・わり算・小数）を調べる。
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..'), html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const a=html.indexOf('/* HSC-BEGIN'), b=html.indexOf('/* HSC-END */');
assert(a>0&&b>a,'HSC-BEGIN / HSC-END が見つかりません');
const ctx={}; vm.createContext(ctx); vm.runInContext(html.slice(a,b)+';this.hsCells=hsCells;',ctx);
const H=(d,o)=>ctx.hsCells(d,o||{});
// 行ごとに「列:数字」を文字にする（小さいマスは ( ) で囲む、空の正解は _ ）
function rowsOf(L){ return Array.from(L.rows).filter(r=>r.t!=='rule').map(r=>r.kind+(r.pt>=0?'@'+r.pt:'')+' '+Array.from(r.cells).sort((x,y)=>x.col-y.col).map(c=>c.col+':'+(c.req===false?'('+(c.v||'_')+')':c.v)).join(' ')); }
const seq=L=>L.order.map(id=>L.cells[id].v||'_').join('');
const reqOk=L=>Object.values(L.cells).filter(c=>c.req).every(c=>/^\d$/.test(c.v));

// たし算：一の位から左へ。くり上がりがあれば つぎの位の小さいマスへ
let L=H({a:98,b:58,op:'+'},{val:'156'});
assert.equal(L.answer,'156'); assert.equal(L.W,3);
assert.deepEqual(rowsOf(L),['carry 1:(1)','a 1:9 2:8','b 1:5 2:8','ans 0:1 1:5 2:6']);
assert.equal(seq(L),'6151');
assert.equal(L.lead.text,'+');
// ひき算：くり下がる位の上に、へった数字の小さいマス（0 から かりるときは 9）
L=H({a:302,b:15,op:'−'},{val:'287'});
assert.deepEqual(rowsOf(L),['borrow 0:(2) 1:(9)','a 0:3 1:0 2:2','b 1:1 2:5','ans 0:2 1:8 2:7']);
assert.equal(seq(L),'97282');
L=H({a:354,b:352,op:'−'},{val:'2'});
assert.deepEqual(rowsOf(L).at(-1),'ans 2:2','答えの左に 0 のマスを作らない');
assert.equal(L.order.length,1);
// 小数：小数点は動かない（マスではない）。0.35 の 0 は書く
L=H({a:'3.55',b:'3.2',op:'−'},{val:'0.35'});
assert.equal(L.answer,'0.35'); assert.deepEqual(rowsOf(L).slice(1),['a@0 0:3 1:5 2:5','b@0 0:3 1:2','ans@0 0:0 1:3 2:5']);
L=H({a:'5.16',b:'7.1',op:'+'},{val:'12.26'});
assert.equal(L.answer,'12.26'); assert.deepEqual(rowsOf(L).slice(1),['a@1 1:5 2:1 3:6','b@1 1:7 2:1','ans@1 0:1 1:2 2:2 3:6']);
// かけ算（1けた）：答えの行と くり上がりの小さいマス
L=H({a:396,b:6,op:'×'},{val:'2376'});
assert.deepEqual(rowsOf(L),['carry 1:(5) 2:(3)','a 1:3 2:9 3:6','b 3:6','ans 0:2 1:3 2:7 3:6']);
assert.equal(seq(L),'637532');
// かけ算（2けた）：とちゅうの式2行（1けた ずらす）＋答えの行
L=H({a:46,b:65,op:'×'},{val:'2990'});
assert.deepEqual(rowsOf(L),['carry 2:(3)','carry 2:(3)','a 2:4 3:6','b 2:6 3:5','part 1:2 2:3 3:0','part 0:2 1:7 2:6','ans 0:2 1:9 2:9 3:0']);
assert.equal(seq(L),'033263720992');
assert.equal(L.rows.filter(r=>r.t==='rule').length,2);
// 一の位が 0 の かける数（×90）は、とちゅうの式を作らず 答えの行だけ
L=H({a:53,b:90,op:'×'},{val:'4770'});
assert.equal(L.rows.filter(r=>r.kind==='part').length,0); assert.equal(seq(L),'07274');
// 3けた×2けた
L=H({a:456,b:31,op:'×'},{val:'14136'}); assert.equal(L.W,5); assert.equal(L.rows.filter(r=>r.kind==='part').length,2); assert(reqOk(L));
// 小数のかけ算：右にそろえて計算し、答えに小数点
L=H({a:'5.3',b:'3.6',op:'×'},{val:'19.08'});
assert.equal(L.answer,'19.08'); assert.deepEqual(rowsOf(L).slice(2),['a@2 2:5 3:3','b@2 2:3 3:6','part 1:3 2:1 3:8','part 0:1 1:5 2:9','ans@1 0:1 1:9 2:0 3:8']);
L=H({a:'1.65',b:9,op:'×'},{val:'14.85'}); assert.equal(L.answer,'14.85'); assert.equal(rowsOf(L).at(-1),'ans@1 0:1 1:4 2:8 3:5');
// わり算（あまりあり）：商 → かける → ひく（おろした数字も） → … → あまり。左から右へ
L=H({a:59,b:2,op:'÷'},{val:'29|1',amari:true,g:4});
assert.equal(L.answer,'29|1'); assert.equal(L.lead.text,'2');
assert.deepEqual(rowsOf(L),['quot 0:2 1:9','dividend 0:5 1:9','prod 0:4','diff 0:1 1:9','prod 0:1 1:8','diff 1:1','rem 0:1']);
assert.equal(seq(L),'241991811');
// 商に 0 がたつとき：かける・ひく行を書かず、つぎの数字をおろす
L=H({a:411,b:2,op:'÷'},{val:'205|1',amari:true,g:4});
assert.deepEqual(rowsOf(L),['quot 0:2 1:0 2:5','dividend 0:4 1:1 2:1','prod 0:4','diff 1:1 2:1','prod 1:1 2:0','diff 2:1','rem 0:1']);
assert.equal(seq(L),'2410151011');
// 2けたでわる：商は たてられる位から
L=H({a:661,b:18,op:'÷'},{val:'36|13',amari:true,g:4});
assert.deepEqual(rowsOf(L)[0],'quot 1:3 2:6'); assert.equal(rowsOf(L).at(-1),'rem 0:1 1:3'); assert.equal(L.lead.text,'18');
// わりきれる（あまり 0）
L=H({a:300,b:3,op:'÷'},{val:'100|0',amari:true,g:4}); assert.equal(L.answer,'100|0'); assert.equal(rowsOf(L).at(-2),'diff 2:0');
L=H({a:66,b:6,op:'÷'},{val:'11|0',amari:true,g:4}); assert.deepEqual(rowsOf(L),['quot 0:1 1:1','dividend 0:6 1:6','prod 0:6','diff 1:6','prod 1:6','diff 1:0','rem 0:0']);
// あまりのない答え（num）の わり算
L=H({a:84,b:4,op:'÷'},{val:'21',g:4}); assert.equal(L.answer,'21'); assert(!L.rows.some(r=>r.kind==='rem'));
// 小数 ÷ 整数：商の小数点は わられる数の小数点の真上。0.8 の 0 も書く
L=H({a:'22.56',b:3,op:'÷'},{val:'7.52',g:4}); assert.equal(L.answer,'7.52'); assert.equal(rowsOf(L)[0],'quot@1 1:7 2:5 3:2');
L=H({a:'2.4',b:3,op:'÷'},{val:'0.8',g:4}); assert.equal(L.answer,'0.8'); assert.equal(rowsOf(L)[0],'quot@0 0:0 1:8');
// マスにしないもの：わる数が小数・3年の九九のわり算・答えと合わないデータ
assert.equal(H({a:'176.4',b:'6.3',op:'÷'},{val:'28',g:5}),null);
assert.equal(H({a:21,b:7,op:'÷'},{val:'3',g:3}),null);
assert.equal(H({a:23,b:45,op:'+'},{val:'99'}),null);
assert.equal(H({a:5,b:9,op:'−'},{val:'-4'}),null);

// 実データ：ひっ算のある単元の問題は、マスにできる（または わざと しない）こと・正解の数字が答えと合うこと
const w={console,Math,Date}; w.window=w; vm.createContext(w);
for(const f of ['data/kanji-grade.js','data/questions.js','data/calc.js','data/choices.js','data/quizlib.js','data/mathview.js','data/gen/core.js','data/gen/rika.js','data/gen/other.js','data/gen/sansu-12.js','data/gen/sansu-34.js','data/gen/sansu-56.js','data/gen/textbook-extra.js','data/gen/bunsho.js','data/units.js'])
  if(fs.existsSync(path.join(root,f))) vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),w,{filename:f});
const U=w.MH_UNITS; let made=0, units=new Set();
for(const u of U.UNITS.filter(u=>u.status==='ready'&&u.gen)){
  for(const it of U.unitPick([u.id],40,11,true)){
    if(!it.hissan||!/^(num|dec|amari)$/.test(it.ans)) continue;
    const L=H(it.hissan,{val:it.val,amari:it.ans==='amari',g:it.g||u.g});
    if(!L){ const d=it.hissan; assert(String(d.b).includes('.')||u.g<4&&/[÷/]/.test(d.op),`マスにできない問題: ${u.id} ${it.q}`); continue; }
    assert(reqOk(L),`正解が1けたの数字でないマス: ${u.id} ${it.q}`);
    assert.equal(new Set(L.order).size,L.order.length,`入力の順番に重なり: ${u.id}`);
    assert(Object.values(L.cells).filter(c=>c.req).every(c=>L.order.includes(c.id)),`順番に入らない必須マス: ${u.id} ${it.q}`);
    made++; units.add(u.id);
  }
}
for(const id of ['m2-add-hissan','m2-sub-hissan','m3-add-hissan','m3-sub-hissan','m3-kake-hissan1','m3-kake-hissan2','m4-wari-21','m4-wari-32','m4-kake-32','m4-shosu-add','m4-shosu-wari','m5-shosu-kake']) assert(units.has(id),'マスにならない単元: '+id);
// 画面：単元練習の切りかえ・自動の答え合わせ・まちがいの段の表示がつながっていること
for(const re of [/hsSwitch\(true\)/,/hsSwitch\(false\)/,/"hs\.on":\["マスで とく"\]/,/"hs\.off":\["こたえだけ"\]/,/HSC_PREF="mh_hsc"/,/hsRetry\(fb\)/,/if\(m==="cells"\) return hsKey\(k\)/]) assert.match(html,re);
console.log(`hissan cells: 4演算・小数・あまり・商の0・実データ ${made}問（${units.size}単元） OK`);
