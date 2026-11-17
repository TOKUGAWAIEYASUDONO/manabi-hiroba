#!/usr/bin/env node
// 計算スプリントの あそびかた（タイムアタック・サドンデス）と にがて ボックスの きまり（index.html の SPR-BEGIN〜SPR-END）を調べる。
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..'), html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const a=html.indexOf('/* SPR-BEGIN'), b=html.indexOf('/* SPR-END */');
assert(a>0&&b>a,'SPR-BEGIN / SPR-END が見つかりません');
const ctx={}; vm.createContext(ctx);
vm.runInContext(html.slice(a,b)+';Object.assign(this,{SP_TA,SP_TA_OK,BOX_MAX,SPB_MAX,boxValid,boxKey,boxClean,boxPut,boxDrop,spFmt,spTaCounted,spBestClean,spBestPut});',ctx);
const S=ctx, J=x=>JSON.parse(JSON.stringify(x));

// 単元の問題（そのまま）と、学年別スプリントの式（単元の形に そろえたもの）
const unitIt={unit:'m3-add-hissan',subj:'sansu',g:3,q:'356 + 478',a:'834',choices:['834','824','734','844'],ans:'num',val:'834',hissan:{a:'356',b:'478',op:'+'}};
const calcIt={unit:'',subj:'sansu',g:4,q:'12.5 − 3.7',a:'8.8',choices:[],ans:'dec',val:'8.8',hissan:{a:'12.5',b:'3.7',op:'−'}};
assert.equal(S.boxValid(unitIt),true);
assert.equal(S.boxValid(calcIt),true,'計算スプリントの式は 選択肢なしでも よい');
assert.equal(S.boxValid({...unitIt,choices:[]}),false,'単元の問題は 選択肢が いる');
assert.equal(S.boxValid({...unitIt,ans:'eval'}),false,'答え方は 決まったものだけ');
assert.equal(S.boxValid({...unitIt,unit:'<img>'}),false,'単元IDの形');
assert.equal(S.boxValid({...unitIt,g:9}),false,'学年は1〜6');
assert.equal(S.boxValid({...unitIt,q:'x'.repeat(500)}),false,'長すぎる問題は入れない');
assert.equal(S.boxValid({...unitIt,hissan:[1,2]}),false);
assert.equal(S.boxValid(null),false); assert.equal(S.boxValid('a'),false);

// ボックス：新しい順・同じ問題は前へ・50問まで・けす
let L=[];
L=S.boxPut(L,unitIt); L=S.boxPut(L,calcIt);
assert.deepEqual(J(L.map(x=>x.q)),['12.5 − 3.7','356 + 478']);
L=S.boxPut(L,{...unitIt});
assert.deepEqual(J(L.map(x=>x.q)),['356 + 478','12.5 − 3.7'],'同じ問題は1つだけ、新しい位置へ');
L=S.boxDrop(L,S.boxKey(unitIt));
assert.deepEqual(J(L.map(x=>x.q)),['12.5 − 3.7'],'正解で けす');
assert.notEqual(S.boxKey(calcIt),S.boxKey({...calcIt,unit:'m4-shosu-sub'}),'単元がちがえば別の問題');
for(let i=0;i<60;i++) L=S.boxPut(L,{...calcIt,q:`${i} + 1`,a:String(i+1),val:String(i+1)});
assert.equal(L.length,S.BOX_MAX); assert.equal(S.BOX_MAX,50);
assert.equal(L[0].q,'59 + 1','いちばん新しいものが先頭');
// 読みこみ：こわれたもの・重なりを すてる
const dirty=[unitIt,{...unitIt},{q:1},null,calcIt,'x',...Array.from({length:80},(_,i)=>({...calcIt,q:`${i} × 2`}))];
const C=S.boxClean(J(dirty));
assert.equal(C.length,50); assert.equal(C[0].q,'356 + 478'); assert.equal(C[1].q,'12.5 − 3.7');
assert.deepEqual(J(S.boxClean({})),[]); assert.deepEqual(J(S.boxClean(null)),[]);

// タイムアタック：20問・16問以上 ○ で きろく
assert.equal(S.SP_TA,20); assert.equal(S.SP_TA_OK,16);
assert.equal(S.spTaCounted(20,16),true); assert.equal(S.spTaCounted(20,15),false,'でたらめに おして はやくしても のこさない'); assert.equal(S.spTaCounted(19,19),false);
assert.equal(S.spFmt(12.34),'12.3'); assert.equal(S.spFmt(9.96),'10.0'); assert.equal(S.spFmt(-1),'0.0');

// じぶんの ベスト：タイムは小さいほど・れんぞくは大きいほど
let r=S.spBestPut(null,'u:m3-add-hissan','ta',31.26,1);
assert.equal(r.isNew,true); assert.equal(r.best,31.3);
r=S.spBestPut(r.all,'u:m3-add-hissan','ta',40,2); assert.equal(r.isNew,false); assert.equal(r.best,31.3);
r=S.spBestPut(r.all,'u:m3-add-hissan','ta',25,3); assert.equal(r.isNew,true); assert.equal(r.best,25);
r=S.spBestPut(r.all,'u:m3-add-hissan','sd',0,4); assert.equal(r.isNew,false,'0問は ベストにしない');
r=S.spBestPut(r.all,'u:m3-add-hissan','sd',7,5); assert.equal(r.isNew,true); assert.equal(r.best,7);
r=S.spBestPut(r.all,'u:m3-add-hissan','sd',7,6); assert.equal(r.isNew,false,'同じ数は こうしんではない');
assert.deepEqual(J(r.all['u:m3-add-hissan']),{at:5,ta:25,sd:7});
let all=r.all; for(let i=0;i<70;i++) all=S.spBestPut(all,'c:'+i,'sd',1,100+i).all;
assert.equal(Object.keys(all).length,S.SPB_MAX,'60件まで'); assert.ok(!('u:m3-add-hissan' in all),'古いものから けす'); assert.ok('c:69' in all);
assert.deepEqual(J(S.spBestClean({a:{ta:-1,sd:1.5},b:{ta:'3'},c:{sd:4,at:9}})),{c:{at:9,sd:4}},'こわれた値は すてる');

// 画面のきまり：課題リンクは いつもの・メダル（mh_best）は いつもの だけ・サドンデスとボックスは「できた」に入れない
assert.match(html,/const spModeOf=task=>spOn\(task\)\?SPM:"n";/);
assert.match(html,/const spOn=task=>!task&&!LESSON;/);
assert.match(html,/plain=!sp&&!bx;/);
assert.match(html,/if\(plain\)\{ all\[key\]=/,'メダル・自己ベストは いつもの だけ');
assert.match(html,/const units=p\.u&&p\.uSt&&p\.sm!=="sd"&&!p\.u\.box\?/,'サドンデス・ボックスは 単元の できた に入れない');
assert.match(html,/const again=c\.tries<2&&p\.sm!=="sd";/,'サドンデスは やりなおしなし');
console.log('sprint modes: タイムアタック・サドンデス・にがて ボックスの きまり OK');
