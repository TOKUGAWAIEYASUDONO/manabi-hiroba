#!/usr/bin/env node
// 実ブラウザーを使わず、各画面の描画時に未定義変数などで落ちないことを調べる。
const fs=require('fs'), path=require('path'), vm=require('vm');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const src=html.slice(html.lastIndexOf('<script>')+8,html.lastIndexOf('</script>'))
  .replace(/fgFromHash\(\); fgWalk\(document\.body\); refreshMedals\(\); route\(\);\s*$/,'');
function element(){return {
  style:{},dataset:{},classList:{add(){},remove(){},toggle(){}},children:[],
  appendChild(x){this.children.push(x);return x},append(...xs){this.children.push(...xs)},
  replaceChildren(...xs){this.children=xs},setAttribute(){},addEventListener(){},removeEventListener(){},
  querySelector(){return element()},querySelectorAll(){return []},getAttribute(){return null},
  focus(){},remove(){},scrollIntoView(){},getBoundingClientRect(){return {width:375,height:667}},
  innerHTML:'',textContent:'',value:'calc',options:[],firstChild:{textContent:''}
}};
const document={body:element(),documentElement:element(),head:element(),
  createElement:element,createElementNS:element,createTextNode:t=>({textContent:t}),
  getElementById:()=>element(),querySelector:()=>element(),querySelectorAll:()=>[],
  addEventListener(){},removeEventListener(){}};
const storage={getItem(){return null},setItem(){},removeItem(){}};
const window={document,location:{hash:'#home',href:'http://localhost/',protocol:'http:'},
  addEventListener(){},removeEventListener(){},scrollTo(){},innerWidth:375,innerHeight:667};
const ctx={window,document,location:window.location,localStorage:storage,sessionStorage:storage,
  history:{replaceState(){}},navigator:{language:'ja'},console,setInterval(){return 1},clearInterval(){},
  setTimeout(){return 1},clearTimeout(){},URL,URLSearchParams,TextEncoder,Date,Math,Promise,
  fetch(){return Promise.resolve({ok:false})},MutationObserver:class{observe(){} disconnect(){}}};
vm.createContext(ctx);
for(const file of ['data/kanji-grade.js','data/questions.js','data/calc.js','data/choices.js','data/quizlib.js','data/mathview.js','data/ngwords.js','data/cooplib.js','data/gen/core.js','data/gen/rika.js','data/gen/other.js','data/gen/sansu-12.js','data/gen/sansu-34.js','data/gen/sansu-56.js','data/gen/textbook-extra.js','data/units.js','data/collection.js']) {
  vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),ctx,{filename:file});
}
Object.assign(ctx,window);
vm.runInContext(src,ctx,{filename:'index.html'});
for(let g=1;g<=6;g++) {
  vm.runInContext(`ui.grade=${g}; renderHome()`,ctx,{filename:`home-${g}`});
}
for(const [name,expr] of [['units','renderUnits(new URLSearchParams())'],['teacher','renderTeacher(new URLSearchParams())'],['practice','renderUnitLink("#u=r3-living&n=1")']]) {
  vm.runInContext(expr,ctx,{filename:name});
}
console.log('render smoke: home 1〜6年、単元選び、先生画面、練習 OK');
