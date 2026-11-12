/* Run: node tools/test-mathview.js */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const site = path.resolve(__dirname, '..');
class Node {
  constructor(tag, text = '') { this.tagName = tag; this.textContent = text; this.children = []; this.attrs = {}; this.className = ''; }
  appendChild(n) { this.children.push(n); return n; }
  setAttribute(k,v) { this.attrs[k] = String(v); }
  getAttribute(k) { return this.attrs[k]; }
}
const doc = {createDocumentFragment:()=>new Node('#fragment'),createTextNode:t=>new Node('#text',t),createElement:t=>new Node(t),createElementNS:(_,t)=>new Node(t)};
const ctx = {document:doc}; ctx.window = ctx;
vm.runInNewContext(fs.readFileSync(path.join(site,'data/mathview.js'),'utf8'),ctx);
const view = ctx.MH_MATHVIEW;
function walk(n) { return [n,...n.children.flatMap(walk)]; }
let nodes = walk(view.fracNodes('3/4 と 1と2/5、12/3じ https://x.test/1/2 漢字《かんじ》 2/3',doc));
let fractions = nodes.filter(n=>n.className==='frac');
assert.equal(fractions.length,3);
assert.deepEqual(fractions.map(n=>n.getAttribute('aria-label')),['4ぶんの3','1と5ぶんの2','3ぶんの2']);
assert.deepEqual(fractions.map(n=>walk(n).filter(x=>x.className==='whole').map(x=>x.textContent)),[[],['1'],[]]);
assert.equal(nodes.filter(n=>n.tagName==='#text').map(n=>n.textContent).join('').includes('12/3じ'),true);
assert.equal(nodes.filter(n=>n.tagName==='#text').map(n=>n.textContent).join('').includes('https://x.test/1/2'),true);
assert.equal(view.parseClockQ('不明'),null);
const svg=view.clockSVG(4,30,{doc,size:120}); assert.equal(svg.tagName,'svg'); assert.equal(svg.getAttribute('aria-label'),'4じ30ぷん');
assert.equal(walk(svg).filter(n=>n.tagName==='text').length,12);
for (const picture of [{kind:'tapes',blue:5,red:3},{kind:'cups',blue:4,red:7},{kind:'line',count:8,target:3}]) {
  const art=view.pictureSVG(picture,doc);
  assert.equal(art.tagName,'svg');
  assert.ok(art.getAttribute('aria-label'));
  assert.ok(walk(art).length>3);
}
assert.equal(view.pictureSVG({kind:'unknown'},doc),null);
// Generate 1,000 questions in the same two templates as sansu-12.js.
for(let i=0;i<1000;i++) {
  const h=i%12+1, fine=i%2===1, mark=fine ? (Math.floor(i/2)%11+1) : (Math.floor(i/2)%2 ? 6 : 12);
  const next=h%12+1, between=fine || mark===6;
  const q=`みじかい はりが ${between?`${h}と${next}の あいだ`:h}、ながい はりが ${mark} の とき、${fine?'なんじなんぷん':'なんじ'}？`;
  const parsed=view.parseClockQ(q);
  assert.deepEqual({...parsed},{h,m:mark===12?0:mark*5},q);
}
console.log('mathview: fraction, SVG, clock templates × 1,000 OK');
