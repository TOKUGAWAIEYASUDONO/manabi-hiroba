const assert=require('assert');
const {awards}=require('../data/awardlib.js');
const ps=Array.from({length:5},(_,i)=>({pid:String(i),name:'子'+i,emoji:'🙂',ok:5-i,ng:1,maxStreak:5-i,comeback:5-i,speedSum:(i+1)*1000,speedCount:1,chest:5-i,star:5-i,boost:5-i}));
for(const mode of ['quiz','chest','race','rocket']){
  const a=awards(mode,'normal',ps); assert.equal(a.length,mode==='quiz'?4:5);
  assert(a.every(c=>c.winners.length<=3));
  const first=a.map(c=>c.winners[0].pid); assert([...new Set(first)].length>=Math.ceil(a.length/2));
  assert(first.every(id=>first.filter(x=>x===id).length<=2));
  assert(!a.some(c=>c.winners.some(w=>w.pid==='4')));
  const easy=awards(mode,'easy',ps); assert(easy.every(c=>c.winners.length===1));
}
const speed=awards('quiz','normal',[{...ps[0],speedSum:5000},{...ps[1],speedSum:100}]).find(x=>x.key==='speed');
assert.equal(speed.winners[0].pid,'1');
console.log('award aggregation OK');
