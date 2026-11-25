#!/usr/bin/env node
// 算数の 単元の ★（いつもの・タイムアタック・サドンデス）の きまり（index.html の UST-BEGIN〜UST-END）を調べる。
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..'), html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const a=html.indexOf('/* UST-BEGIN'), b=html.indexOf('/* UST-END */');
assert(a>0&&b>a,'UST-BEGIN / UST-END が見つかりません');
const ctx={}; vm.createContext(ctx);
vm.runInContext('const U_ACC=[60,75,90];'+html.slice(a,b)+';Object.assign(this,{UST_N,UST_TA,UST_SD,UST_TA_OK3,ustTier,ustN,ustTA,ustSD,ustClamp});',ctx);
const S=ctx;

// タイプ
assert.equal(S.ustTier({ans:'num',item:'たし算',load:3.4,hs:false}),'A','1年の たし算');
assert.equal(S.ustTier({ans:'num',item:'かけ算',load:4,hs:false}),'A','九九');
assert.equal(S.ustTier({ans:'num',item:'わり算',load:3.9,hs:true}),'A','九九の わり算（ひっ算つき）');
assert.equal(S.ustTier({ans:'num',item:'たし算',load:6.5,hs:true}),'B','2けたの ひっ算');
assert.equal(S.ustTier({ans:'num',item:'かけ算',load:7.9,hs:true}),'C','2けた×2けた');
assert.equal(S.ustTier({ans:'num',item:'数をおぼえる',load:6.2,hs:false}),'B');
assert.equal(S.ustTier({ans:'num',item:'文章題',load:3.2,hs:false}),'C','文章題');
assert.equal(S.ustTier({ans:'frac',item:'分数',load:5,hs:false}),'B');
assert.equal(S.ustTier({ans:'amari',item:'文章題',load:5,hs:false}),'C');
assert.equal(S.ustTier({ans:'choice4',item:'その他',load:2,hs:false}),'D');
assert.equal(S.ustTier({ans:'num',item:'たし算',load:3,hs:false,choice:true}),'D','4つから えらぶ ときは D');

// いつもの：○の数と 正答率
assert.equal(S.ustN('A',14,15,1,3).stars,3);
assert.equal(S.ustN('A',14,16,1,3).stars,2,'正答率が 90% ないと ★2');
assert.equal(S.ustN('A',13,13,1,3).stars,2);
assert.equal(S.ustN('A',6,10,1,3).stars,1);
assert.equal(S.ustN('A',5,5,1,3).stars,0);
assert.equal(S.ustN('C',7,7,1,3).stars,3);
assert.equal(S.ustN('D',12,12,1,2).stars,2,'上限 ★2（4つから えらぶ）');
assert.equal(S.ustN('D',12,12,1,2).raw,3);
assert.deepEqual([...S.ustN('A',0,0,2,2).need],[3,5,7],'2単元を まぜると 半分');
assert.deepEqual([...S.ustN('C',0,0,6,2).need],[2,2,2],'さいてい 2こ');
for(const t of 'ABCD'){ const n=S.UST_N[t]; assert(n[0]<n[1]&&n[1]<n[2],'いつものの 基準は ふえていく '+t); const s=S.UST_SD[t]; assert(s[0]<s[1]&&s[1]<s[2]); const ta=S.UST_TA[t]; assert(ta[1]>ta[2]&&ta[2]>0); }

// タイムアタック
assert.equal(S.ustTA('A',20,15,50,3),0,'16問 ○ が ないと ★なし');
assert.equal(S.ustTA('A',19,19,50,3),0,'さいごまで いかないと ★なし');
assert.equal(S.ustTA('A',20,16,300,3),1);
assert.equal(S.ustTA('A',20,16,120,3),2);
assert.equal(S.ustTA('A',20,17,60,3),2,'★3は 18問 ○ が いる');
assert.equal(S.ustTA('A',20,18,85,3),3);
assert.equal(S.ustTA('A',20,20,85.1,3),2);
assert.equal(S.ustTA('C',20,20,170,2),2,'上限');

// サドンデス
assert.equal(S.ustSD('A',4,3),0); assert.equal(S.ustSD('A',5,3),1); assert.equal(S.ustSD('A',19,3),2); assert.equal(S.ustSD('A',20,3),3);
assert.equal(S.ustSD('C',10,3),3); assert.equal(S.ustSD('B',15,2),2);

assert.equal(S.ustClamp(7),3); assert.equal(S.ustClamp(-1),0); assert.equal(S.ustClamp(undefined),0); assert.equal(S.ustClamp('2'),2);

// 画面の ほうの きまり（文字で たしかめる）
assert(html.includes('lock:!LESSON'),'ひとりで あそぶ バトルだけ ロック（授業モードは かけない）');
assert(/let roomSelected=unitPicker\(\$\("#roomUnits"\),\+\$\("#ngr"\)\.value\);/.test(html),'先生の へやは ロックなし');
console.log('test-unit-stars: OK');
