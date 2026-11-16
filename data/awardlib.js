// 部門賞はサーバーで確定する。順位の公開値には集計の数字を含めない。
const BASE=[['correct','ものしり はかせ'],['streak','れんぞく ロケット'],['speed','いなずま アンサー'],['comeback','あきらめない ヒーロー']];
const EXTRA={chest:['chest','たからさがし名人'],race:['star','ラッキースター'],rocket:['boost','エンジン全開']};
function awards(mode,rule,players){
  const cats=[...BASE,...(EXTRA[mode]?[EXTRA[mode]]:[])], first=new Map(), shown=new Map();
  return cats.map(([key,title])=>{
    const candidates=players.filter(p=>p.ok+p.ng>0 || (key==='boost'&&p.boost>0)).map(p=>({p,n:key==='correct'?p.ok:key==='streak'?p.maxStreak:key==='speed'?(p.speedCount?1000000/(p.speedSum/p.speedCount):0):key==='comeback'?p.comeback:p[key]||0})).filter(x=>x.n>0).sort((a,b)=>b.n-a.n||b.p.ok-a.p.ok||String(a.p.pid).localeCompare(String(b.p.pid)));
    const available=candidates.filter(x=>(first.get(x.p.pid)||0)<2);
    if(rule==='easy'){
      const winner=(available.find(x=>!shown.has(x.p.pid))||available[0]);
      if(winner) shown.set(winner.p.pid,true);
      return {key,title,winners:winner?[{pid:winner.p.pid,name:winner.p.name,emoji:winner.p.emoji}]:[]};
    }
    const top=available[0]; if(top) first.set(top.p.pid,(first.get(top.p.pid)||0)+1);
    const rest=candidates.filter(x=>x!==top).slice(0,2);
    return {key,title,winners:[top,...rest].filter(Boolean).map(x=>({pid:x.p.pid,name:x.p.name,emoji:x.p.emoji}))};
  }).filter(x=>x.winners.length);
}
module.exports={awards};
