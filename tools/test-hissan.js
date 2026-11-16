#!/usr/bin/env node
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const src=html.slice(html.indexOf('function renderHissan('),html.indexOf('function uCur(',html.indexOf('function renderHissan(')));
class El { constructor(tag){this.tag=tag;this.children=[];this.attrs={};this.className='';this.textContent='';} setAttribute(k,v){this.attrs[k]=v;} append(x){this.children.push(x);} }
const ctx={document:{createElement:t=>new El(t)},mathIn:()=>{}};vm.createContext(ctx);vm.runInContext(src,ctx);
for(const op of ['+','−','×','÷']) for(const [a,b] of [['23','45'],['12.3','4.5']]){
  const el=ctx.renderHissan({a,b,op,q:2,r:1});
  assert.equal(el.className,'hissan');assert.equal(el.attrs['aria-label'],`${a} ${op} ${b}`);
  assert.equal(el.attrs.role,'img');assert(el.children.some(x=>x.className=== (op==='÷'?'hs-dividend':'hs-rule')));
  assert(!el.children.some(x=>x.textContent==='2'||x.textContent==='1'));
}
const target=new El('div');ctx.showQuestion(target,{q:'23 + 45',hissan:{a:23,b:45,op:'+'}});assert.equal(target.children[0].className,'hissan');
assert.match(html,/hissan:it\.hissan/);assert.match(html,/showQuestion\(qq,c\)/);assert.match(html,/showQuestion\(qq,P\.cur\)/);assert.match(html,/P\.cur\.hsL=calcCells\(P\.cur,P\.g\)/);
console.log('hissan: 4演算・小数・あまり・画面接続 OK');
