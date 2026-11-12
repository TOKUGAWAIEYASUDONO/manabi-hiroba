#!/usr/bin/env node
const assert=require('node:assert/strict'), fs=require('node:fs'), path=require('node:path'), vm=require('node:vm');
const root=path.resolve(__dirname,'..'), ctx={window:{}}; vm.createContext(ctx);
const files=['data/kanji-grade.js','data/questions.js','data/choices.js','data/gen/core.js'];
for(const f of fs.readdirSync(path.join(root,'data/gen')).sort()) if(f!=='core.js'&&f.endsWith('.js')) files.push('data/gen/'+f);
files.push('data/units.js','data/mathview.js');
for(const f of files) vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx,{filename:f});
const doc={createElementNS:(_,tag)=>({tagName:tag,children:[],attrs:{},setAttribute(k,v){this.attrs[k]=v},appendChild(n){this.children.push(n);return n}})};
for(const id of ['m1-nagasa-kurabe','m1-kasa-kurabe','m1-nanbanme']){
  let found=false;
  for(let seed=0;seed<200;seed++){
    const item=ctx.window.MH_UNITS.make(id,seed), pic=item.picture;
    assert.ok(pic,`${id}: picture missing`);
    const svg=ctx.window.MH_MATHVIEW.pictureSVG(pic,doc);
    assert.equal(svg?.tagName,'svg',`${id}: SVG missing`);
    found=true;
    if(pic.kind==='tapes'&&item.choices.includes('あお')&&item.choices.includes('あか')){
      assert.ok(['あお','あか'].includes(item.a));
      const expected=pic.blue>pic.red?'あお':pic.red>pic.blue?'あか':null;
      if(expected && /ながい/.test(ctx.window.MH_UNITS.plain(item.q))) assert.equal(item.a,expected);
    }
  }
  assert.ok(found);
}
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const helper=html.match(/function shouldBlockLessonNavigation\([^\n]+/);
assert.ok(helper,'route guard helper missing');
const guard=vm.runInNewContext(helper[0]+';shouldBlockLessonNavigation');
assert.equal(guard(null,'#home',false),false,'ordinary practice must be able to go home');
assert.equal(guard('#u=lesson&task=1','#home',false),true,'lesson navigation must remain blocked');
assert.match(html,/\.colorpick \.choice\[data-c="あお"\]\{background:#3979e5/);
assert.match(html,/\.colorpick \.choice\[data-c="あか"\]\{background:#e35a56/);
console.log('unit render: first-grade pictures, color labels, route guard OK');
