/* まなびひろば「みんなで あそぶ」（協力モード）の部品（画面には触らない）
   ブラウザでは window.MH_COOP、Node.js（server.js・tools/）では require で使う。外部には通信しない。
   いまの中身：「ロケット はっしゃ」の進行（engine）。
   流れ：問題タイム（正解で燃料）→ 目標に届いたらミニゲーム（全員同時・15〜25秒）→ クリアで次のステージ。5ステージ。
   ミニゲームは「せーので はっしゃ」（3・2・1 に合わせて押す）と「ほしを あつめよう」（流れ星をタップ）。
   失敗しても もういちど は1回だけ。2回目は条件をゆるめて、必ず次へ進む（責めない・止めない）。
   時刻はすべて引数の now（先生の端末の Date.now()）で渡す。部品の中で時計は読まない（検査しやすくするため）。 */
(function(root){
"use strict";
const STAGES=5;
const KINDS=["sy","st","sy","st","sy"];            // ステージごとのミニゲーム：sy＝せーので はっしゃ／st＝ほしを あつめよう
const OPS=["cans","boost","mini"];                  // 児童が送ってよい操作
const SY={LEAD:4000,GAP:5000,ROUNDS:3,TAIL:2500};   // せーので：最初の「3」まで／ラウンドの間／ラウンド数／さいごの余韻（ミリ秒）
const ST={LEAD:3000,DUR:17000,MIN:8000};            // ほし：はじまるまで／あつめる時間／早く終われる最短
const C={COUNT:3000,PLAY:[40000,45000],CAP:[60000,65000],CLEAR:3500,AGAIN:2800,MAXALL:14*60000};   // [ふつう,やさしい]
const intIn=(v,a,b)=>Number.isInteger(v)&&v>=a&&v<=b;
const bad=(c,msg)=>[c,{error:msg}];

/* ---------- 目標の式（plan/spec-coop-modes.md 2-1 を、1ステージぶんに） ----------
   1人が1分に答える数 p：1〜2年 4／3〜4年 5.5／5〜6年 6.5。1問の期待燃料 f＝5×正答率＋1×(1−正答率)（正答率 0.7、1〜2年は 0.75）。
   参加率 r＝0.85。期待値 E＝人数×p×時間(分)×f×r。目標＝E×むずかしさ（ふつう 0.7／やさしい 0.55）。最小 10。 */
function stageTarget(n,g,easy){
  const p=g<=2?4:g<=4?5.5:6.5, acc=g<=2?.75:.7, f=5*acc+(1-acc), r=.85, min=(easy?C.PLAY[1]:C.PLAY[0])/60000;
  const E=Math.max(1,n|0)*p*min*f*r;
  return Math.max(10,Math.round(E*(easy?.55:.7)/5)*5);
}
const capOf=(G,n)=>Math.max(8,Math.round(G/Math.max(1,n)*2.2));           // 1人の上限＝（目標÷人数）×2.2

function engine(o){
  o=o||{};
  const easy=!!o.easy, g=intIn(o.g,1,6)?o.g:3, sc=o.scale>0&&o.scale<=1?o.scale:1;     // scale：検査で時間をちぢめるときだけ使う
  const rand=typeof o.rand==="function"?o.rand:Math.random;
  const T=ms=>Math.round(ms*sc), E={easy,g,sc,ph:"lobby",sg:0,st:0,fp:0,G:0,capF:8,wind:0,bonus:0,boN:0,ps:0,pe:0,m:null,evid:0,ev:null,
    P:new Map(),seq:0,Q:[],bb:null,bbAt:0,lastPick:0,t0:0,res:null,bbN:0};

  E.add=pid=>{ if(!E.P.has(pid)) E.P.set(pid,{ix:E.seq++,lastK:0,lastAt:0,lastOk:true,ts:[],f:0,bo:0,ok:0,ng:0,mh:false,rd:0,ms:0,lastStar:0,shown:0,shownAt:-1e12,tot:{ok:0,ans:0,bo:0,hit:0,st:0}}); };
  E.remove=pid=>{ E.P.delete(pid); E.Q=E.Q.filter(c=>c.pid!==pid); };
  const N=()=>E.P.size;
  const ev=t=>{ E.ev={id:++E.evid,t}; };

  /* ----- 段階の切りかえ ----- */
  function startPlay(now){
    E.ph="play"; E.ps=now; E.pe=now+T(C.CAP[easy?1:0]); E.fp=0; E.wind=0; E.bonus=0; E.boN=0;
    for(const p of E.P.values()){ p.f=0; p.bo=0; }
  }
  function toMini(now,att){
    const k=KINDS[E.sg], n=Math.max(1,N()), m={k,a:att,s:now,hits:0,total:0};
    if(k==="sy"){
      m.t0=[]; for(let i=0;i<SY.ROUNDS;i++) m.t0.push(now+T(SY.LEAD+i*SY.GAP));
      m.win=(easy?[800,1400]:[600,1200])[att-1];                                    // 「1」の前後このミリ秒いないなら ぴったり
      m.need=Math.max(1,Math.ceil((easy?[.45,.2]:[.6,.25])[att-1]*n));               // クラスのこの人数が ぴったりなら クリア
      m.e=m.t0[SY.ROUNDS-1]+T(SY.TAIL);
    } else {
      m.target=Math.max(4,Math.ceil(n*(easy?6:8)*(att===2?.5:1)));                  // みんなの ほしの合計
      m.cap=Math.max(4,Math.ceil(m.target/n*2.5));                                  // 1人の上限（連打で稼げない）
      m.e=now+T(ST.LEAD+ST.DUR);
    }
    E.ph="mini"; E.m=m;
    for(const p of E.P.values()){ p.mh=false; p.rd=0; p.ms=0; }
  }
  function toClear(now){ E.st++; E.ph="clear"; E.pe=now+T(C.CLEAR); ev("c"+E.st); }
  function finish(now){ if(E.ph==="end") return; E.ph="end"; E.res={st:E.st,n:N()}; ev("end"); E.pe=now; }
  E.finish=finish;
  E.begin=now=>{
    E.t0=now; E.st=0; E.sg=0; E.G=stageTarget(N(),g,easy); E.capF=capOf(E.G,N()); E.ph="count"; E.pe=now+T(C.COUNT); E.res=null; E.ev=null; E.evid=0;
    for(const p of E.P.values()) Object.assign(p,{f:0,bo:0,ok:0,ng:0,lastK:0,lastAt:0,ts:[],shown:0,shownAt:-1e12,tot:{ok:0,ans:0,bo:0,hit:0,st:0}});
  };
  const progress=()=>{ const m=E.m; if(!m) return 0;
    return Math.min(100,Math.floor(100*(m.k==="sy"?m.hits/m.need:m.total/m.target))); };
  E.progress=progress;

  /* ----- 名前の吹き出し：先生の画面だけが使う。良いことだけ・まだ出ていない子を優先・1秒に最大2つ・同じ子は20秒に1回まで ----- */
  function queue(pid,kind){ const p=E.P.get(pid); if(!p) return; E.Q.push({pid,ix:p.ix,kind}); if(E.Q.length>16) E.Q.shift(); }
  function pick(now){
    if(!E.Q.length||now-E.lastPick<T(1000)) return false;
    const seen=new Set(), cs=[];
    for(const c of E.Q){ const p=E.P.get(c.pid); if(!p||seen.has(c.pid)) continue; seen.add(c.pid);
      if(p.shown>0&&now-p.shownAt<T(20000)) continue; cs.push({c,p,r:rand()}); }
    E.Q=[]; if(!cs.length) return false;
    cs.sort((a,b)=>(a.p.shown>0)-(b.p.shown>0)||a.r-b.r);
    const out=cs.slice(0,2); for(const x of out){ x.p.shown++; x.p.shownAt=now; }
    E.bb={i:++E.bbN,l:out.map(x=>[x.c.ix,x.c.kind])}; E.bbAt=now; E.lastPick=now; return true;
  }

  /* ----- 児童の操作：cans（答えた）／boost／mini（せーのの押した時刻・ほしの数） ----- */
  E.act=(pid,op,b,now)=>{
    const p=E.P.get(pid); if(!p) return bad(403,"参加情報が正しくありません");
    if(!OPS.includes(op)) return bad(403,"この遊び方では使えない操作です");
    b=b&&typeof b==="object"?b:{};
    let changed=false;
    if(op==="cans"){
      if(typeof b.ok!=="boolean") return bad(400,"値が正しくありません");
      if(!intIn(b.k,1,1e9)||b.k<=p.lastK) return bad(409,"この答えは使えません");          // 連番が進まないもの（くり返しの送信）は受けない
      if(E.ph!=="play") return [200,{ok:true,fp:0,late:true}];
      p.ts=p.ts.filter(t=>now-t<T(60000));
      if(p.ts.length>=12||now-p.lastAt<T(p.lastOk?1100:2400)) return bad(429,"少しゆっくり送ってね");   // 1分に12回まで／正解のあと1.1秒・まちがいのあと2.4秒はあける
      p.lastK=b.k; p.lastAt=now; p.lastOk=b.ok; p.ts.push(now); p.tot.ans++;
      const want=b.ok?5:1, give=Math.max(0,Math.min(want,E.capF-p.f));
      if(b.ok){ p.ok++; p.tot.ok++; } else p.ng++;
      if(give>0){ p.f+=give; E.fp+=give*(E.wind?1.25:1); if(b.ok) queue(pid,1); }
      if(E.fp>=E.G){ toMini(now,1); changed=true; }
      pick(now);
      return [200,{ok:true,fp:give,cap:give<=0},changed];
    }
    if(op==="boost"){
      if(E.ph!=="play") return [200,{ok:true,fp:0,late:true}];
      if(p.bo) return bad(409,"もう押しました");
      p.bo=1; E.boN++; p.tot.bo++; E.fp+=2; queue(pid,2);
      if(!E.bonus&&E.boN>=Math.ceil(.6*N())){ E.bonus=1; E.fp+=E.G*.1; ev("bo"); }          // 6割が押すと「そろった！」で全体に +10%
      if(E.fp>=E.G){ toMini(now,1); changed=true; }
      pick(now);
      return [200,{ok:true,fp:2},changed];
    }
    /* mini */
    if(E.ph!=="mini") return [200,{ok:true,late:true}];
    const m=E.m;
    if(m.k==="sy"){
      const at=b.at; if(typeof at!=="number"||!Number.isFinite(at)||Math.abs(at-now)>5000) return bad(400,"値が正しくありません");
      let ri=0,best=Infinity; m.t0.forEach((t,i)=>{ const d=Math.abs(at-t); if(d<best){ best=d; ri=i; } });
      if(best>T(2500)) return [200,{ok:true,hit:false}];
      if(p.rd&(1<<ri)) return [200,{ok:true,hit:false,dup:true}];
      p.rd|=1<<ri; const hit=best<=T(m.win);
      if(hit&&!p.mh){ p.mh=true; m.hits++; p.tot.hit++; queue(pid,3); }
      pick(now);
      return [200,{ok:true,hit}];
    }
    if(!intIn(b.n,1,5)) return bad(400,"値が正しくありません");
    if(now-p.lastStar<T(150)) return bad(429,"少しゆっくり送ってね");
    p.lastStar=now;
    const add=Math.max(0,Math.min(b.n,m.cap-p.ms)); p.ms+=add; m.total+=add; p.tot.st+=add;
    if(add>0) queue(pid,3);
    pick(now);
    return [200,{ok:true,n:add,cap:add<b.n}];
  };

  /* ----- 時計：段階を進める。画面に すぐ知らせたいとき true ----- */
  E.tick=now=>{
    let ch=false;
    if(E.ph==="lobby"||E.ph==="end") return false;
    if(now-E.t0>T(C.MAXALL)){ finish(now); return true; }
    if(E.ph==="count"){ if(now>=E.pe){ startPlay(now); ch=true; } }
    else if(E.ph==="play"){
      if(E.fp>=E.G||now>=E.pe){ toMini(now,1); ch=true; }
      else if(!E.wind&&now-E.ps>=T(C.PLAY[easy?1:0]*.6)&&E.fp<E.G*.45) E.wind=1;       // おいかぜ：時間の6割で燃料が45%未満なら、以後 1.25倍（全員同じ・理由は出さない）
    }
    else if(E.ph==="mini"){
      const m=E.m;
      if(m.k==="sy"&&m.hits>=m.need) m.e=Math.min(m.e,Math.max(now,m.t0[0])+T(1500));
      if(m.k==="st"&&m.total>=m.target&&now-m.s>=T(ST.MIN)) m.e=Math.min(m.e,now+T(1200));
      if(now>=m.e){
        const win=m.k==="sy"?m.hits>=m.need:m.total>=m.target;
        if(win||m.a===2) toClear(now); else { E.ph="again"; E.pe=now+T(C.AGAIN); ev("again"); }
        ch=true;
      }
    }
    else if(E.ph==="again"){ if(now>=E.pe){ toMini(now,2); ch=true; } }
    else if(E.ph==="clear"){ if(now>=E.pe){ if(E.st>=STAGES) finish(now); else { E.sg++; startPlay(now); } ch=true; } }
    if(pick(now)) ch=true;
    return ch;
  };

  /* ----- 画面に送る状態（小さく。人ごとの数字は入れない。吹き出し bb は先生の画面だけ） ----- */
  E.pub=(now,host)=>{
    const o={k:"rk",ph:E.ph,sg:E.sg,st:E.st,n:N()};
    if(E.ph==="play"){ o.p=Math.min(100,Math.floor(100*E.fp/E.G)); o.as=E.ps; o.ae=E.pe; if(E.wind) o.wd=1; o.bo=Math.min(100,Math.floor(100*E.boN/Math.max(1,Math.ceil(.6*N())))); }
    else if(E.ph==="count"||E.ph==="again"||E.ph==="clear") o.ae=E.pe;
    else if(E.ph==="mini"){ o.p=100; o.mg={k:E.m.k,a:E.m.a,s:E.m.s,e:E.m.e,p:progress()}; }
    if(E.ev) o.ev=E.ev;
    if(E.ph==="end") o.res=E.res;
    if(host&&E.bb&&now-E.bbAt<=1100) o.bb=E.bb;      // 表示の長さは時間の倍率と関係なく 1.1秒
    return o;
  };
  E.stats=()=>({G:E.G,capF:E.capF,fp:E.fp,st:E.st,sg:E.sg,ph:E.ph,m:E.m,players:[...E.P.values()]});
  return E;
}

/* 通信で来た co の形を調べて、使える値だけ取り出す（児童・先生の画面から） */
function clean(co){
  if(!co||typeof co!=="object"||co.k!=="rk") return null;
  const PH=["lobby","count","play","mini","again","clear","end"];
  if(!PH.includes(co.ph)||!intIn(co.sg,0,STAGES-1)||!intIn(co.st,0,STAGES)) return null;
  const o={k:"rk",ph:co.ph,sg:co.sg,st:co.st,n:intIn(co.n,0,1000)?co.n:0,p:intIn(co.p,0,100)?co.p:0,wd:co.wd?1:0,bo:intIn(co.bo,0,100)?co.bo:0,
    as:Number.isFinite(co.as)?co.as:0,ae:Number.isFinite(co.ae)?co.ae:0,ev:null,mg:null,res:null,bb:null};
  if(co.ev&&intIn(co.ev.id,0,1e6)&&typeof co.ev.t==="string") o.ev={id:co.ev.id,t:co.ev.t.slice(0,8)};
  const m=co.mg;
  if(co.ph==="mini"&&m&&(m.k==="sy"||m.k==="st")&&intIn(m.a,1,2)&&Number.isFinite(m.s)&&Number.isFinite(m.e)) o.mg={k:m.k,a:m.a,s:m.s,e:m.e,p:intIn(m.p,0,100)?m.p:0};
  if(co.ph==="mini"&&!o.mg) return null;
  if(co.ph==="end") o.res={st:intIn(co.res&&co.res.st,0,STAGES)?co.res.st:co.st};
  if(co.bb&&intIn(co.bb.i,0,1e9)&&Array.isArray(co.bb.l)) o.bb={i:co.bb.i,l:co.bb.l.filter(x=>Array.isArray(x)&&intIn(x[0],0,1e6)&&intIn(x[1],1,4)).slice(0,3).map(x=>[x[0],x[1]])};
  return o;
}

const API={STAGES,KINDS,OPS,SY,ST,C,stageTarget,capOf,engine,clean};
if(typeof module!=="undefined"&&module.exports) module.exports=API; else root.MH_COOP=API;
})(typeof window!=="undefined"?window:globalThis);
