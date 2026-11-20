#!/usr/bin/env node
// 実ブラウザーを使わず、各画面の描画時に未定義変数などで落ちないことを調べる。
const fs=require('fs'), path=require('path'), vm=require('vm');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const src=html.slice(html.lastIndexOf('<script>')+8,html.lastIndexOf('</script>'))
  .replace(/fgFromHash\(\); fgWalk\(document\.body\); refreshMedals\(\); route\(\);\s*$/,'');
function element(){return {
  style:{getPropertyValue(){return ''},setProperty(){}},dataset:{},replaceWith(){},classList:{add(){},remove(){},toggle(){}},children:[],
  appendChild(x){this.children.push(x);return x},append(...xs){this.children.push(...xs)},
  insertAdjacentHTML(){},
  replaceChildren(...xs){this.children=xs},setAttribute(){},removeAttribute(){},closest(){return null},addEventListener(){},removeEventListener(){},
  querySelector(){return element()},querySelectorAll(){return []},getAttribute(){return null},
  focus(){},remove(){},scrollIntoView(){},getBoundingClientRect(){return {width:375,height:667}},
  innerHTML:'',get textContent(){return this._t||''},set textContent(v){this._t=v;this.children=[]},value:'calc',options:[],firstChild:{textContent:''}
}};
const byId=new Map();
const document={body:element(),documentElement:element(),head:element(),
  createElement:element,createElementNS:element,createTextNode:t=>({textContent:t}),
  getElementById:id=>{if(!byId.has(id)) byId.set(id,element());return byId.get(id)},querySelector:s=>s.startsWith('#')?document.getElementById(s.slice(1)):element(),querySelectorAll:()=>[],
  addEventListener(){},removeEventListener(){}};
const storage={getItem(){return null},setItem(){},removeItem(){}};
const window={document,location:{hash:'#home',href:'http://localhost/',protocol:'http:'},
  addEventListener(){},removeEventListener(){},scrollTo(){},innerWidth:375,innerHeight:667};
const ctx={window,document,location:window.location,localStorage:storage,sessionStorage:storage,
  history:{replaceState(){}},navigator:{language:'ja'},console,setInterval(){return 1},clearInterval(){},
  setTimeout(){return 1},clearTimeout(){},URL,URLSearchParams,TextEncoder,Date,Math,Promise,
  fetch(){return Promise.resolve({ok:false})},MutationObserver:class{observe(){} disconnect(){}}};
vm.createContext(ctx);
window.RIKA_PUBLIC=process.env.RIKA_SMOKE_PUBLIC==='0'?false:/window\.RIKA_PUBLIC\s*=\s*true\s*;/.test(html);
for(const file of ['data/kanji-grade.js','data/questions.js','data/calc.js','data/choices.js','data/quizlib.js','data/mathview.js','data/ngwords.js','data/cooplib.js','data/gen/core.js',...(window.RIKA_PUBLIC?['data/gen/rika.js']:[]),'data/gen/other.js','data/gen/sansu-12.js','data/gen/sansu-34.js','data/gen/sansu-56.js','data/gen/textbook-extra.js','data/gen/bunsho.js','data/units.js','data/sansu-items.js','data/tools-viz.js','data/collection.js']) {
  vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),ctx,{filename:file});
}
Object.assign(ctx,window);
vm.runInContext(src,ctx,{filename:'index.html'});
if(!window.RIKA_PUBLIC){
  if(/^<script\s+src="data\/gen\/rika\.js/m.test(html)) throw Error('rika.js is loaded publicly');
  if(window.MH_UNITS.UNITS.some(u=>u.subj==='rika')) throw Error('rika units are public');
  if(!/window\.RIKA_PUBLIC\?\["rika"\]:\[\]/.test(html)) throw Error('rika subject gate missing');
  if(!/このリンクは つかえません/.test(html)) throw Error('rika deep-link guard missing');
}
else if (!window.MH_UNITS.UNITS.some(u=>u.subj==='rika')) throw Error('rika units are missing');
for(let g=1;g<=6;g++) {
  vm.runInContext(`ui.grade=${g}; renderHome()`,ctx,{filename:`home-${g}`});
  if(vm.runInContext('app.innerHTML',ctx).includes('id="quick"')) throw Error(`quick play remains on home: ${g}`);
  if(!vm.runInContext('app.innerHTML',ctx).includes(g<=2?'class="zones"':'class="sdoors"')) throw Error(`subject zones missing: ${g}`);      // 3〜6年は 教科の とびら（段階④）
  if(vm.runInContext('app.innerHTML',ctx).includes('rika-warning')) throw Error(`rika AI notice shown: ${g}`);      // 理科の「AI が作り」の注意は出さない（2026-11-18）
}
for(const [name,expr] of [['units','renderUnits(new URLSearchParams())'],['teacher','renderTeacher(new URLSearchParams())'],['practice',`renderUnitLink("#u=${window.RIKA_PUBLIC?'r3-living':'m3-amari'}&n=1")`]]) {
  vm.runInContext(expr,ctx,{filename:name});
}
for(const s of ['sansu','kokugo','shakai','eigo']) vm.runInContext(`ui.grade=5; renderSubjRoom(new URLSearchParams('s=${s}'))`,ctx,{filename:'subj-room-'+s});      // 教科の へや（国語・社会・英語は 小さい へや）
for(const g of [2,4,6]) vm.runInContext(`ui.grade=${g}; renderUnits(new URLSearchParams('kid=1&subj=sansu${g>2?'&all=1':''}'))`,ctx,{filename:'kid-units-'+g});      // 児童の単元えらび（3〜6年はコンパクト版。算数の へやの「ぜんぶの 単元から」）
// 古い 入口 #units?kid=1&subj=sansu（3〜6年）は 算数の へやへ つなぐ。1・2年は 今の 画面（段階⑤）
for(const [g,q,to] of [[4,'kid=1&subj=sansu','#subj?s=sansu'],[0,'kid=1','#subj?s=sansu'],[4,'kid=1&subj=kokugo',null],[2,'kid=1&subj=sansu',null],[4,'pick=m3-amari',null]]){
  let moved=null; window.location.replace=u=>{ moved=u.slice(u.indexOf('#')); };
  vm.runInContext(`ui.grade=${g}; renderUnits(new URLSearchParams('${q}'))`,ctx,{filename:'units-redirect-'+q});
  if(moved!==to) throw Error(`#units?${q}（${g}年）の つなぎ先: ${moved} （よてい ${to}）`);
}
for(const [g,id] of [[3,'kake'],[5,'shosu']]) vm.runInContext(`ui.grade=${g}; renderSubjItem(new URLSearchParams('s=sansu&item=${id}'))`,ctx,{filename:'subj-item-'+id});      // 単元カード
// 単元カードから はじめた 練習の 結果：「もどる」は はじめた 画面へ（段階⑤）
vm.runInContext(`RUNBACK='#subj?s=sansu&item=kake'; startUnitRun({ids:['m3-amari'],n:1,seed:1,mix:true,choice:false}); try{ finish(); }catch(e){ if(!/NodeFilter/.test(e.message)) throw e; }`,ctx,{filename:'runback'});      // 結果の 文字を かいた あとの 数式の 仕上げ（mathIn）は、にせの DOM では うごかない
if(!vm.runInContext('app.innerHTML',ctx).includes('go(runBack())')||vm.runInContext('runBack()',ctx)!=='#subj?s=sansu&item=kake') throw Error('結果の もどる先が はじめた 画面に なっていない');
vm.runInContext(`RUNBACK=null`,ctx);
vm.runInContext('renderFeedback()',ctx,{filename:'feedback'});
if(!vm.runInContext('app.innerHTML',ctx).includes('id="fbBody"')) throw Error('feedback form missing');
for(const grade of [1,2,3]){
  vm.runInContext(`ui.grade=${grade}; renderModeSetup(new URLSearchParams("m=chest"))`,ctx,{filename:'mode-unit-setup'});
  vm.runInContext(`ui.grade=${grade}; renderModeSetup(new URLSearchParams("m=race"))`,ctx,{filename:'race-unit-setup'});
}
vm.runInContext('renderTeacher(new URLSearchParams())',ctx,{filename:'teacher-unit-setup'});
const unitCheck=vm.runInContext('unitModeQuestions(["m3-amari"])',ctx);
if(!unitCheck.length||unitCheck.some(q=>!q.ch.includes(q.a))) throw Error('unit battle choices invalid');
for(const id of ['m2-add-hissan','m3-kake-hissan1','m4-wari-21']){
  vm.runInContext(`startUnitRun({ids:['${id}'],n:1,seed:123,mix:true,choice:false})`,ctx,{filename:'sprint-'+id});
  if(!vm.runInContext('P.cur.hissan',ctx)) throw Error('sprint lost hissan: '+id);
  if(byId.get('qq').children[0]?.className!=='hsc') throw Error('sprint did not render hissan cells: '+id);
  vm.runInContext('hsSwitch(false)',ctx,{filename:'hs-off-'+id});
  if(byId.get('qq').children[0]?.className!=='hissan') throw Error('sprint did not render vertical calculation: '+id);
  vm.runInContext('hsSwitch(true)',ctx,{filename:'hs-on-'+id});
  if(byId.get('qq').children[0]?.className!=='hsc') throw Error('hissan cells did not come back: '+id);
  // マスに正しい数字を順に入れると、自動で答え合わせになる
  vm.runInContext('(()=>{const L=P.hs.L;let n=0;while(P.hs&&!P.lock&&n<40){uKey(L.cells[P.hs.at].v);n++;}})()',ctx,{filename:'hs-type-'+id});
  if(vm.runInContext('P.ok',ctx)!==1) throw Error('hissan cells correct input was not accepted: '+id);
}
console.log('render smoke: home 1〜6年、単元選び、先生画面、練習 OK');
if(!process.env.RIKA_SMOKE_PUBLIC){
  const {spawnSync}=require('child_process');
  const result=spawnSync(process.execPath,[__filename],{env:{...process.env,RIKA_SMOKE_PUBLIC:'0'},encoding:'utf8'});
  if(result.status!==0) throw Error('rika private smoke failed: '+result.stderr+' '+result.stdout);
  console.log(result.stdout.trim());
}
