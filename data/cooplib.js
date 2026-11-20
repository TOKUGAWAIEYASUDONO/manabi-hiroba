/* ひらめっと「みんなで あそぶ」（協力モード）の部品（画面には触らない）
   ブラウザでは window.MH_COOP、Node.js（server.js・tools/）では require で使う。外部には通信しない。
   いまの中身：「ロケット はっしゃ」の進行（engine）。
   流れ：問題タイム（正解で燃料）→ 目標に届いたらミニゲーム（全員同時・1回12秒いない）→ クリアで次のステージ。ふつう5ステージ／みじかい3ステージ（先生がえらぶ）。
   ミニゲームは「せーので はっしゃ」（3・2・1 に合わせて押す）と「ほしを あつめよう」（流れ星をタップ）。
   失敗しても もういちど は1回だけ。2回目は条件をゆるめて、必ず次へ進む（責めない・止めない）。
   時刻はすべて引数の now（先生の端末の Date.now()）で渡す。部品の中で時計は読まない（検査しやすくするため）。 */
(function(root){
"use strict";
const STAGES=5, SHORT=3;                            // ふつう 5ステージ／みじかい 3ステージ
const KINDS=["sy","st","sy","st","sy"];            // ステージごとのミニゲーム：sy＝せーので はっしゃ／st＝ほしを あつめよう
const OPS=["cans","boost","mini"];                  // 児童が送ってよい操作
const SY={LEAD:2500,GAP:3000,ROUNDS:3,TAIL:1500};   // せーので：最初の「3」まで／ラウンドの間／ラウンド数／さいごの余韻（ミリ秒）。全部で 10秒
const ST={LEAD:2000,DUR:9000,MIN:5000};             // ほし：はじまるまで／あつめる時間／早く終われる最短。全部で 11秒
const C={COUNT:3000,PLAY:[50000,55000],CAP:[60000,65000],CLEAR:2500,AGAIN:2000,MAXALL:14*60000};   // [ふつう,やさしい]
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
  const easy=!!o.easy, g=intIn(o.g,1,6)?o.g:3, NS=o.stages===SHORT?SHORT:STAGES, sc=o.scale>0&&o.scale<=1?o.scale:1;     // scale：検査で時間をちぢめるときだけ使う
  const rand=typeof o.rand==="function"?o.rand:Math.random;
  const T=ms=>Math.round(ms*sc), E={OPS,easy,g,sc,ns:NS,an:0,ph:"lobby",sg:0,st:0,fp:0,G:0,capF:8,wind:0,bonus:0,boN:0,ps:0,pe:0,m:null,evid:0,ev:null,
    P:new Map(),seq:0,Q:[],bb:null,bbAt:0,lastPick:0,t0:0,res:null,bbN:0};

  E.add=pid=>{ if(!E.P.has(pid)) E.P.set(pid,{ix:E.seq++,lastK:0,lastAt:0,lastOk:true,ts:[],f:0,bo:0,ok:0,ng:0,mh:false,rd:0,ms:0,lastStar:0,shown:0,shownAt:-1e12,tot:{ok:0,ans:0,bo:0,hit:0,st:0}}); };
  E.remove=pid=>{ E.P.delete(pid); E.Q=E.Q.filter(c=>c.pid!==pid); };
  const N=()=>E.P.size;
  const ev=t=>{ E.ev={id:++E.evid,t}; };

  /* ----- 段階の切りかえ ----- */
  function startPlay(now){
    E.ph="play"; E.ps=now; E.pe=now+T(C.CAP[easy?1:0]); E.fp=0; E.wind=0; E.bonus=0; E.boN=0;
    for(const p of E.P.values()){ p.f=0; p.bo=0; p.ok=0; }
  }
  function toMini(now,att){
    const k=KINDS[E.sg], n=Math.max(1,N()), m={k,a:att,s:now,hits:0,total:0};
    if(k==="sy"){
      m.t0=[]; for(let i=0;i<SY.ROUNDS;i++) m.t0.push(now+T(SY.LEAD+i*SY.GAP));
      m.win=(easy?[800,1400]:[600,1200])[att-1];                                    // 「1」の前後このミリ秒いないなら ぴったり
      m.need=Math.max(1,Math.ceil((easy?[.45,.2]:[.6,.25])[att-1]*n));               // クラスのこの人数が ぴったりなら クリア
      m.e=m.t0[SY.ROUNDS-1]+T(SY.TAIL);
    } else {
      m.target=Math.max(4,Math.ceil(n*(easy?3:4)*(att===2?.5:1)));                  // みんなの ほしの合計（9秒で 1人 約10こ流れる）
      m.cap=Math.max(4,Math.ceil(m.target/n*2.5));                                  // 1人の上限（連打で稼げない）
      m.e=now+T(ST.LEAD+ST.DUR);
    }
    E.ph="mini"; E.m=m;
    for(const p of E.P.values()){ p.mh=false; p.rd=0; p.ms=0; }
  }
  function toClear(now){ E.st++; E.ph="clear"; E.pe=now+T(C.CLEAR); ev("c"+E.st); }
  function finish(now){ if(E.ph==="end") return; E.ph="end"; E.res={st:E.st,n:N(),an:E.an}; ev("end"); E.pe=now; }
  E.finish=finish;
  E.begin=now=>{
    E.t0=now; E.st=0; E.sg=0; E.an=0; E.G=stageTarget(N(),g,easy); E.capF=capOf(E.G,N()); E.ph="count"; E.pe=now+T(C.COUNT); E.res=null; E.ev=null; E.evid=0;
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
      p.lastK=b.k; p.lastAt=now; p.lastOk=b.ok; p.ts.push(now); p.tot.ans++; E.an++;
      const want=b.ok?5:1, give=Math.max(0,Math.min(want,E.capF-p.f));
      if(b.ok){ p.ok++; p.tot.ok++; } else p.ng++;
      if(give>0){ p.f+=give; E.fp+=give*(E.wind?1.25:1); if(b.ok) queue(pid,1); }
      if(E.fp>=E.G){ toMini(now,1); changed=true; }
      pick(now);
      return [200,{ok:true,fp:give,cap:give<=0},changed];
    }
    if(op==="boost"){
      if(E.ph!=="play") return [200,{ok:true,fp:0,late:true}];
      if(p.bo>=Math.floor(p.ok/3)) return bad(409,"もう押しました");
      p.bo++; E.boN++; p.tot.bo++; E.fp+=2; queue(pid,2);
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
    else if(E.ph==="clear"){ if(now>=E.pe){ if(E.st>=NS) finish(now); else { E.sg++; startPlay(now); } ch=true; } }
    if(pick(now)) ch=true;
    return ch;
  };

  /* ----- 画面に送る状態（小さく。人ごとの数字は入れない。吹き出し bb は先生の画面だけ） ----- */
  E.pub=(now,host)=>{
    const o={k:"rk",ph:E.ph,sg:E.sg,st:E.st,n:N(),ns:NS};
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
  if(co&&typeof co==="object"&&co.k==="bs") return cleanBs(co);
  if(co&&typeof co==="object"&&co.k==="jn") return cleanJn(co);
  if(!co||typeof co!=="object"||co.k!=="rk") return null;
  const PH=["lobby","count","play","mini","again","clear","end"];
  if(!PH.includes(co.ph)||!intIn(co.sg,0,STAGES-1)||!intIn(co.st,0,STAGES)) return null;
  const o={k:"rk",ns:co.ns===SHORT?SHORT:STAGES,ph:co.ph,sg:co.sg,st:co.st,n:intIn(co.n,0,1000)?co.n:0,p:intIn(co.p,0,100)?co.p:0,wd:co.wd?1:0,bo:intIn(co.bo,0,100)?co.bo:0,
    as:Number.isFinite(co.as)?co.as:0,ae:Number.isFinite(co.ae)?co.ae:0,ev:null,mg:null,res:null,bb:null};
  if(co.ev&&intIn(co.ev.id,0,1e6)&&typeof co.ev.t==="string") o.ev={id:co.ev.id,t:co.ev.t.slice(0,8)};
  const m=co.mg;
  if(co.ph==="mini"&&m&&(m.k==="sy"||m.k==="st")&&intIn(m.a,1,2)&&Number.isFinite(m.s)&&Number.isFinite(m.e)) o.mg={k:m.k,a:m.a,s:m.s,e:m.e,p:intIn(m.p,0,100)?m.p:0};
  if(co.ph==="mini"&&!o.mg) return null;
  if(co.ph==="end") o.res={st:intIn(co.res&&co.res.st,0,STAGES)?co.res.st:co.st,an:intIn(co.res&&co.res.an,0,1e6)?co.res.an:0};
  if(co.bb&&intIn(co.bb.i,0,1e9)&&Array.isArray(co.bb.l)) o.bb={i:co.bb.i,l:co.bb.l.filter(x=>Array.isArray(x)&&intIn(x[0],0,1e6)&&intIn(x[1],1,4)).slice(0,3).map(x=>[x[0],x[1]])};
  return o;
}

/* ======================================================================
   ここから「ボスバトル」（協力）と「じんとりバトル」（2チーム）。Qalc（MIT © 2026 GIGAyama）の
   src/battles/raidLogic.js・territoryLogic.js の決まりを参考に、先生の端末・server.js で動く形に書き直した。
   児童が送るのは「答えた（ok と連番）」だけ。ダメージ・ぬる場所・チームは、すべて部屋の側で決める。
   ====================================================================== */

/* 名前の吹き出し（先生の画面だけ）：良いことだけ・まだ出ていない子を優先・1秒に最大2つ・同じ子は20秒に1回まで（pri は とどめ など 1回きりのもの） */
function mkPop(T,rand){
  const S={Q:[],bb:null,bbAt:0,last:0,n:0,seen:new Map()};
  S.q=(pid,ix,kind,pri)=>{ S.Q.push({pid,ix,kind,pri:pri?1:0}); if(S.Q.length>16) S.Q.shift(); };
  S.drop=pid=>{ S.Q=S.Q.filter(c=>c.pid!==pid); };
  S.reset=()=>{ S.Q=[]; S.bb=null; S.seen.clear(); S.last=0; };
  S.pick=now=>{
    if(!S.Q.length||now-S.last<T(1000)) return false;
    const seen=new Set(), cs=[];
    for(const c of S.Q){ if(seen.has(c.pid)) continue; seen.add(c.pid); const sh=S.seen.get(c.pid);
      if(sh&&!c.pri&&now-sh.at<T(20000)) continue; cs.push({c,sh:sh?sh.n:0,r:rand()}); }
    S.Q=[]; if(!cs.length) return false;
    cs.sort((a,b)=>(b.c.pri-a.c.pri)||((a.sh>0)-(b.sh>0))||a.r-b.r);
    const out=cs.slice(0,2); for(const x of out) S.seen.set(x.c.pid,{n:x.sh+1,at:now});
    S.bb={i:++S.n,l:out.map(x=>[x.c.ix,x.c.kind])}; S.bbAt=now; S.last=now; return true;
  };
  S.pub=now=>S.bb&&now-S.bbAt<=1100?S.bb:null;
  return S;
}
/* 「答えた」の共通の検査（ロケットと同じ決まり）。だめなら [code,{error}]、よければ null */
function ansCheck(p,b,now,T){
  if(typeof b.ok!=="boolean") return bad(400,"値が正しくありません");
  if(!intIn(b.k,1,1e9)||b.k<=p.lastK) return bad(409,"この答えは使えません");
  return null;
}
function ansRate(p,now,T){
  p.ts=p.ts.filter(t=>now-t<T(60000));
  if(p.ts.length>=12||now-p.lastAt<T(p.lastOk?1100:2400)) return bad(429,"少しゆっくり送ってね");   // 1分に12回まで／正解のあと1.1秒・まちがいのあと2.4秒はあける
  return null;
}
const optsOf=o=>{ o=o||{}; return {easy:!!o.easy,g:intIn(o.g,1,6)?o.g:3,sc:o.scale>0&&o.scale<=1?o.scale:1,rand:typeof o.rand==="function"?o.rand:Math.random,dur:(intIn(o.t,30,600)?o.t:180)*1000}; };
const cleanBb=bb=>bb&&intIn(bb.i,0,1e9)&&Array.isArray(bb.l)?{i:bb.i,l:bb.l.filter(x=>Array.isArray(x)&&intIn(x[0],0,1e6)&&intIn(x[1],1,4)).slice(0,3).map(x=>[x[0],x[1]])}:null;
const cleanEv=ev=>ev&&intIn(ev.id,0,1e6)&&typeof ev.t==="string"?{id:ev.id,t:ev.t.slice(0,8)}:null;
const num=(v,a,b,d)=>intIn(v,a,b)?v:d;

/* ---------- ボスバトル（協力・k:"bs"） ----------
   ボス＝いたずらモンスター。正解するとボスの「げんき」がへり、0 になると ボスは小さくなって にげていく（たおす・やっつける とは言わない）。
   つぎのボスは少しだけ げんきが多い。時間（先生がえらぶ 2〜5分）の間に、クラスで何ひき おいはらえるか。
   ダメージ：正解 10＋れんぞく正解 1回ごとに +2（最大 +10）。まちがいでも答えたら 1（ちょうせん）。
   1人の上限：そのボスの げんきの（÷人数）×2.2 まで（強い子ひとりで背負わない）。
   いたずら：20〜30秒おきに 3秒、ボスが あわ・くすぐり・かくれんぼ をする。画面の飾りだけで、点数・答えには何も起きない。 */
const BS={COUNT:3000,RUN:2600,DMG:10,STEP:2,CMAX:5,TRICK:[20000,30000],TRICK_MS:3000,TRICKS:3};
function bossHp(n,g,easy,lv){
  const p=g<=2?4:g<=4?5.5:6.5, acc=g<=2?.75:.7, per=acc*(BS.DMG+4)+(1-acc), r=.85;
  const E=Math.max(1,n|0)*p*(35/60)*per*r;                 // 35秒で おいはらえる見込み
  return Math.max(40,Math.round(E*(easy?.7:.9)*Math.pow(1.2,Math.min(lv|0,10))/10)*10);
}
const bossCap=(H,n)=>Math.max(30,Math.round(H/Math.max(1,n)*2.2));
const bossDmg=combo=>BS.DMG+BS.STEP*Math.min(Math.max(0,combo-1),BS.CMAX);
function bossEngine(o){
  const {easy,g,sc,rand,dur}=optsOf(o), T=ms=>Math.round(ms*sc);
  const E={OPS:["cans"],easy,g,ph:"lobby",P:new Map(),seq:0,lv:0,H:0,hp:0,cap:30,dn:0,td:0,an:0,t0:0,ae:0,pe:0,tr:null,trN:0,nextTr:0,ev:null,evid:0,res:null};
  const pop=mkPop(T,rand), N=()=>E.P.size, ev=t=>{ E.ev={id:++E.evid,t}; };
  const fresh=ix=>({ix,lastK:0,lastAt:0,lastOk:true,ts:[],d:0,cb:0,tot:{ok:0,ans:0,d:0,ko:0}});
  E.add=pid=>{ if(!E.P.has(pid)) E.P.set(pid,fresh(E.seq++)); };
  E.remove=pid=>{ E.P.delete(pid); pop.drop(pid); };
  const nextTrick=now=>{ E.nextTr=now+T(BS.TRICK[0]+rand()*(BS.TRICK[1]-BS.TRICK[0])); };
  function newBoss(){ E.H=bossHp(N(),g,easy,E.lv); E.hp=E.H; E.cap=bossCap(E.H,N()); for(const p of E.P.values()) p.d=0; }
  function finish(now){ if(E.ph==="end") return; E.ph="end"; E.tr=null; E.res={dn:E.dn,td:E.td,an:E.an,n:N(),hp:E.H?Math.ceil(100*E.hp/E.H):0}; E.pe=now; ev("end"); }
  E.finish=finish;
  E.begin=now=>{
    E.t0=now; E.lv=0; E.dn=0; E.td=0; E.an=0; E.res=null; E.ev=null; E.evid=0; E.tr=null; pop.reset();
    for(const [pid,p] of E.P) E.P.set(pid,{...fresh(p.ix)});
    E.ph="count"; E.pe=now+T(BS.COUNT); E.ae=E.pe+T(dur); newBoss(); nextTrick(E.pe);
  };
  E.act=(pid,op,b,now)=>{
    const p=E.P.get(pid); if(!p) return bad(403,"参加情報が正しくありません");
    if(op!=="cans") return bad(403,"この遊び方では使えない操作です");
    b=b&&typeof b==="object"?b:{};
    const c=ansCheck(p,b); if(c) return c;
    if(E.ph!=="play") return [200,{ok:true,dm:0,late:true}];
    const rt=ansRate(p,now,T); if(rt) return rt;
    p.lastK=b.k; p.lastAt=now; p.lastOk=b.ok; p.ts.push(now); p.tot.ans++; E.an++;
    if(b.ok){ p.cb++; p.tot.ok++; } else p.cb=0;
    const want=b.ok?bossDmg(p.cb):1, room=E.cap-p.d, give=Math.max(0,Math.min(want,room,E.hp));
    if(give>0){ p.d+=give; p.tot.d+=give; E.hp-=give; E.td+=give; if(b.ok) pop.q(pid,p.ix,1); }
    let ko=false;
    if(E.hp<=0){ ko=true; E.dn++; p.tot.ko++; pop.q(pid,p.ix,2,true); E.ph="run"; E.pe=now+T(BS.RUN); E.tr=null; ev("ko"); }
    pop.pick(now);
    return [200,{ok:true,dm:give,cap:room<want&&room<E.hp+give,ko},ko];
  };
  E.tick=now=>{
    if(E.ph==="lobby"||E.ph==="end") return false;
    if(now>=E.ae&&E.ph!=="count"){ finish(now); return true; }
    let ch=false;
    if(E.ph==="count"){ if(now>=E.pe){ E.ph="play"; ch=true; } }
    else if(E.ph==="run"){ if(now>=E.pe){ E.lv++; newBoss(); E.ph="play"; E.nextTr=Math.max(E.nextTr,now+T(4000)); ev("nb"); ch=true; } }
    else if(E.ph==="play"){
      if(E.tr&&now>=E.tr.e){ E.tr=null; nextTrick(now); ch=true; }
      else if(!E.tr&&now>=E.nextTr&&E.ae-now>T(BS.TRICK_MS+2000)){ E.trN++; E.tr={i:E.trN,k:(E.trN-1)%BS.TRICKS,e:now+T(BS.TRICK_MS)}; ch=true; }
    }
    if(pop.pick(now)) ch=true;
    return ch;
  };
  E.pub=(now,host)=>{
    const o={k:"bs",ph:E.ph,lv:E.lv,n:N(),dn:E.dn,td:E.td,ae:E.ae};
    if(E.ph==="play"||E.ph==="run"){ o.hp=Math.ceil(100*E.hp/E.H); o.H=E.H; o.d=E.hp; }
    if(E.ph==="count"||E.ph==="run") o.pe=E.pe;
    if(E.tr&&E.ph==="play") o.tr={i:E.tr.i,k:E.tr.k};
    if(E.ev) o.ev=E.ev;
    if(E.ph==="end") o.res=E.res;
    const bb=host&&pop.pub(now); if(bb) o.bb=bb;
    return o;
  };
  E.stats=()=>({H:E.H,hp:E.hp,cap:E.cap,lv:E.lv,dn:E.dn,td:E.td,ph:E.ph,players:[...E.P.values()]});
  return E;
}
function cleanBs(co){
  const PH=["lobby","count","play","run","end"];
  if(!PH.includes(co.ph)) return null;
  const o={k:"bs",ph:co.ph,lv:num(co.lv,0,999,0),n:num(co.n,0,1000,0),dn:num(co.dn,0,999,0),td:num(co.td,0,1e8,0),ae:Number.isFinite(co.ae)?co.ae:0,pe:Number.isFinite(co.pe)?co.pe:0,
    hp:num(co.hp,0,100,100),H:num(co.H,0,1e8,0),d:num(co.d,0,1e8,0),tr:null,ev:cleanEv(co.ev),res:null,bb:cleanBb(co.bb)};
  if(co.tr&&intIn(co.tr.i,1,1e6)&&intIn(co.tr.k,0,BS.TRICKS-1)&&o.ph==="play") o.tr={i:co.tr.i,k:co.tr.k};
  if(o.ph==="end"){ const r=co.res||{}; o.res={dn:num(r.dn,0,999,o.dn),td:num(r.td,0,1e8,o.td),an:num(r.an,0,1e7,0),hp:num(r.hp,0,100,0)}; }
  return o;
}

/* ---------- じんとりバトル（2チーム・k:"jn"） ----------
   7×7 の盤。あか（左上）と あお（右下）の「本陣」は うばえない。正解すると、チームの「ねらいマス」に ぬりが 1 たまる。
   マスごとに必要な ぬりの数があり（ふつう 2・★ 4・まんなか 6）、たまると そのチームの色になる。
   あいてのマスを うばうには +1、自分の陣地に となりあっていないマスは +1（前線を広げるほうが安い）。
   ぬれた瞬間、となりのマスに インクが 1 はねる（れんさは 1回だけ）。ぬられたマスは 15秒、あいてから ぬられない（とりあいの ピンポンを ふせぐ）。
   ねらいマスは自動（えらべない）：前に ぬったマスの となりで、のこりが少なく、点の大きいマス。
   人数の差：1正解の ぬり＝min(4, 1チームの平均人数) ÷ そのチームの人数（大きいクラスでも 盤が すぐ うまらない・人数の多いチームが有利にならない）。
   のこり 30秒は ラストスパート（ぬり 2ばい）。やさしいルール：うばう ができない（あいたマスだけ）。点＝マスの点（ふつう1・★3・まんなか5）の合計。同点は ひきわけ。 */
const JN={COLS:7,ROWS:7,COUNT:3000,BASE:2,STAR:4,CENTER:6,STEAL:1,REMOTE:1,SPLASH:1,PROT:15000,LAST:30000,LASTX:2,PW:4,LOOPS:24};
const JN_N=JN.COLS*JN.ROWS, JN_CENTER=Math.floor(JN_N/2), JN_STARS=[6,16,32,42];
const JN_DEF=Array.from({length:JN_N},(_,i)=>i===0?{cost:0,v:1,home:0}:i===JN_N-1?{cost:0,v:1,home:1}:i===JN_CENTER?{cost:JN.CENTER,v:5,star:2,home:-1}:JN_STARS.includes(i)?{cost:JN.STAR,v:3,star:1,home:-1}:{cost:JN.BASE,v:1,star:0,home:-1});
const JN_NB=Array.from({length:JN_N},(_,i)=>{ const c=i%JN.COLS, r=Math.floor(i/JN.COLS), l=[]; if(c>0) l.push(i-1); if(c<JN.COLS-1) l.push(i+1); if(r>0) l.push(i-JN.COLS); if(r<JN.ROWS-1) l.push(i+JN.COLS); return l; });
const jnBoard=()=>Array.from({length:JN_N},(_,i)=>({o:JN_DEF[i].home,c:[0,0],pt:0}));
const jnAdj=(B,i,t)=>JN_NB[i].some(n=>B[n].o===t);
const jnCost=(B,i,t)=>JN_DEF[i].cost+(B[i].o>=0&&B[i].o!==t?JN.STEAL:0)+(jnAdj(B,i,t)?0:JN.REMOTE);
/* ぬれるマスか：本陣・自分のマスは だめ／やさしいルールは あいたマスだけ／ぬられて 15秒は あいてから ぬれない */
const jnOk=(B,i,t,now,easy)=>JN_DEF[i].home<0&&B[i].o!==t&&!(easy&&B[i].o>=0)&&!(B[i].o>=0&&now<B[i].pt);
const jnLeft=(B,i,t)=>Math.max(1,jnCost(B,i,t)-B[i].c[t]);
function jnBest(B,t,now,easy,list){      // のこりが少ない → 点が大きい → 自分の本陣に近い順（あか と あお で盤を 180度まわした同じ決まり）
  let best=-1,bl=1e9,bv=-1,bk=1e9;
  for(const i of list){ if(!jnOk(B,i,t,now,easy)) continue; const l=jnLeft(B,i,t), v=JN_DEF[i].v, k=t===0?i:JN_N-1-i;
    if(l<bl||(l===bl&&(v>bv||(v===bv&&k<bk)))){ best=i; bl=l; bv=v; bk=k; } }
  return best;
}
const JN_ALL=Array.from({length:JN_N},(_,i)=>i);
const jnPick=(B,t,prev,now,easy)=>{ if(prev>=0){ const n=jnBest(B,t,now,easy,JN_NB[prev]); if(n>=0) return n; } return jnBest(B,t,now,easy,JN_ALL); };
/* たまった ぬりが 必要な数に届いたマスを ぬる。ぬれたら となりへ インクが はねる（さいしょの1回だけ）。変化がなくなるまで */
function jnResolve(B,now,easy,prot,pref){      // 1回ごとに「いまの盤」で まとめて決めてから ぬる（調べる順番で あか・あおに差が出ないように）
  const got=[]; let loops=0;
  while(loops<JN.LOOPS){
    const pass=[];
    for(let i=0;i<JN_N;i++){
      const ex=[0,1].map(t=>jnOk(B,i,t,now,easy)?B[i].c[t]-jnCost(B,i,t):-1);
      if(ex[0]<0&&ex[1]<0) continue;
      pass.push({i,t:ex[0]===ex[1]?(pref===1?1:0):ex[0]>ex[1]?0:1});      // 同じ回に 両チームが 同じだけ届いたら、いま ぬったチーム
    }
    if(!pass.length) break;
    for(const x of pass){ x.steal=B[x.i].o>=0; B[x.i].o=x.t; B[x.i].c=[0,0]; B[x.i].pt=now+(prot==null?JN.PROT:prot); got.push(x); }
    if(loops===0) for(const x of pass) for(const n of JN_NB[x.i]) if(jnOk(B,n,x.t,now,easy)) B[n].c[x.t]+=JN.SPLASH;    // インクが はねるのは、じかに ぬれたマスから 1回だけ
    loops++;
  }
  return got;
}
const jnScore=B=>{ const sc=[0,0], cn=[0,0]; B.forEach((x,i)=>{ if(x.o>=0){ sc[x.o]+=JN_DEF[i].v; cn[x.o]++; } }); return {sc,cn}; };
/* チーム分け：まぜてから 交互に（人数の差は 最大1人） */
function splitTeams(ids,rand){
  const a=[...ids], r=typeof rand==="function"?rand:Math.random;
  for(let i=a.length-1;i>0;i--){ const j=Math.floor(r()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; }
  const m=new Map(); a.forEach((id,k)=>m.set(id,k%2)); return m;
}
function jinEngine(o){
  const {easy,sc,rand,dur}=optsOf(o), T=ms=>Math.round(ms*sc);
  const E={OPS:["cans"],easy,ph:"lobby",P:new Map(),seq:0,B:jnBoard(),tg:[-1,-1],lc:[-1,-1],acc:[0,0],an:0,t0:0,ae:0,pe:0,ls:0,pa:[],paN:0,ev:null,evid:0,res:null};
  const pop=mkPop(T,rand), N=()=>E.P.size, ev=t=>{ E.ev={id:++E.evid,t}; };
  const sizes=()=>{ const n=[0,0]; for(const p of E.P.values()) n[p.tm]++; return n; };
  const fresh=(ix,tm)=>({ix,tm,lastK:0,lastAt:0,lastOk:true,ts:[],tot:{ok:0,ans:0,cap:0}});
  E.add=pid=>{ if(E.P.has(pid)) return; const n=sizes(); E.P.set(pid,fresh(E.seq++,n[1]<n[0]?1:0)); };
  E.remove=pid=>{ E.P.delete(pid); pop.drop(pid); };
  E.teams=sizes;
  E.teamOf=pid=>{ const p=E.P.get(pid); return p?p.tm:-1; };
  E.mine=pid=>{ const p=E.P.get(pid); return p?{mt:p.tm}:{}; };
  E.setTeam=(pid,tm)=>{ const p=E.P.get(pid); if(!p||E.ph!=="lobby"||!(tm===0||tm===1)) return false; p.tm=tm; return true; };
  E.split=()=>{ if(E.ph!=="lobby") return false; const m=splitTeams([...E.P.keys()],rand); for(const [pid,t] of m) E.P.get(pid).tm=t; return true; };
  const retarget=now=>{ for(const t of [0,1]) if(E.tg[t]<0||!jnOk(E.B,E.tg[t],t,now,easy)) E.tg[t]=jnPick(E.B,t,E.lc[t],now,easy); };
  const full=()=>E.B.every((x,i)=>JN_DEF[i].home>=0||x.o>=0);
  function finish(now){ if(E.ph==="end") return; E.ph="end"; const s=jnScore(E.B); E.res={sc:s.sc,cn:s.cn,w:s.sc[0]>s.sc[1]?0:s.sc[1]>s.sc[0]?1:-1,an:E.an,tn:sizes()}; E.pe=now; ev("end"); }
  E.finish=finish;
  E.begin=now=>{
    const n=sizes(); if(N()>=2&&(!n[0]||!n[1])) { const m=splitTeams([...E.P.keys()],rand); for(const [pid,t] of m) E.P.get(pid).tm=t; }    // かたほうのチームが 0人なら、自動で分ける
    for(const [pid,p] of E.P) E.P.set(pid,fresh(p.ix,p.tm));
    E.B=jnBoard(); E.tg=[-1,-1]; E.lc=[-1,-1]; E.acc=[0,0]; E.an=0; E.ls=0; E.pa=[]; E.res=null; E.ev=null; E.evid=0; pop.reset();
    E.t0=now; E.ph="count"; E.pe=now+T(JN.COUNT); E.ae=E.pe+T(dur); retarget(now);
  };
  /* チーム t が u 回 ぬる。ぬれたマスの一覧を返す */
  function paint(t,u,now){
    const got=[];
    for(let k=0;k<u;k++){
      retarget(now); const i=E.tg[t]; if(i<0) break;
      E.B[i].c[t]+=1;
      const g=jnResolve(E.B,now,easy,T(JN.PROT),t);
      for(const x of g){ got.push(x); E.pa.push([x.i,x.t]); E.paN++; if(x.i===i) E.lc[t]=i; }
    }
    if(E.pa.length>6) E.pa=E.pa.slice(-6);
    retarget(now);
    return got;
  }
  E.power=t=>{ const n=sizes(), teams=(n[0]?1:0)+(n[1]?1:0)||1, avg=N()/teams; return n[t]?Math.min(JN.PW,avg)/n[t]:0; };
  E.act=(pid,op,b,now)=>{
    const p=E.P.get(pid); if(!p) return bad(403,"参加情報が正しくありません");
    if(op!=="cans") return bad(403,"この遊び方では使えない操作です");
    b=b&&typeof b==="object"?b:{};
    const c=ansCheck(p,b); if(c) return c;
    if(E.ph!=="play") return [200,{ok:true,pt:0,late:true}];
    const rt=ansRate(p,now,T); if(rt) return rt;
    p.lastK=b.k; p.lastAt=now; p.lastOk=b.ok; p.ts.push(now); p.tot.ans++; E.an++;
    if(!b.ok) return [200,{ok:true,pt:0}];
    p.tot.ok++;
    const t=p.tm, mult=now>=E.ae-T(JN.LAST)?JN.LASTX:1;
    E.acc[t]+=E.power(t)*mult;
    const u=Math.floor(E.acc[t]+1e-9); E.acc[t]-=u;
    const got=u>0?paint(t,u,now):[], mine=got.filter(x=>x.t===t).length;
    if(mine>0){ p.tot.cap+=mine; pop.q(pid,p.ix,1); }
    pop.pick(now);
    if(easy&&full()){ finish(now); return [200,{ok:true,pt:mine},true]; }
    return [200,{ok:true,pt:mine},got.length>0];
  };
  E.tick=now=>{
    if(E.ph==="lobby"||E.ph==="end") return false;
    let ch=false;
    if(E.ph==="count"){ if(now>=E.pe){ E.ph="play"; ch=true; } }
    else if(E.ph==="play"){
      if(now>=E.ae){ finish(now); return true; }
      if(!E.ls&&now>=E.ae-T(JN.LAST)){ E.ls=1; ev("ls"); ch=true; }
    }
    if(pop.pick(now)) ch=true;
    return ch;
  };
  E.pub=(now,host)=>{
    const s=jnScore(E.B), o={k:"jn",ph:E.ph,n:N(),tn:sizes(),ae:E.ae,cl:E.B.map(x=>x.o<0?".":x.o===0?"a":"b").join(""),sc:s.sc,cn:s.cn};
    if(E.ph==="count") o.pe=E.pe;
    if(E.ph==="play"){ o.tg=E.tg.slice(); o.tp=E.tg.map((i,t)=>i<0?0:Math.min(100,Math.floor(100*E.B[i].c[t]/jnCost(E.B,i,t)))); if(E.ls) o.ls=1; o.pa=E.pa.slice(-4); o.pn=E.paN; }
    if(E.ev) o.ev=E.ev;
    if(E.ph==="end") o.res=E.res;
    const bb=host&&pop.pub(now); if(bb) o.bb=bb;
    return o;
  };
  E.stats=()=>({B:E.B,tg:E.tg,acc:E.acc,ph:E.ph,players:[...E.P.values()]});
  return E;
}
function cleanJn(co){
  const PH=["lobby","count","play","end"];
  if(!PH.includes(co.ph)||typeof co.cl!=="string"||!new RegExp("^[.ab]{"+JN_N+"}$").test(co.cl)) return null;
  const pair=(a,lo,hi,d)=>Array.isArray(a)&&a.length===2?[num(a[0],lo,hi,d),num(a[1],lo,hi,d)]:[d,d];
  const o={k:"jn",ph:co.ph,n:num(co.n,0,1000,0),tn:pair(co.tn,0,1000,0),ae:Number.isFinite(co.ae)?co.ae:0,pe:Number.isFinite(co.pe)?co.pe:0,cl:co.cl,sc:pair(co.sc,0,999,0),cn:pair(co.cn,0,JN_N,0),
    tg:pair(co.tg,-1,JN_N-1,-1),tp:pair(co.tp,0,100,0),ls:co.ls?1:0,pa:[],pn:num(co.pn,0,1e7,0),ev:cleanEv(co.ev),res:null,bb:cleanBb(co.bb)};
  if(Array.isArray(co.pa)) o.pa=co.pa.filter(x=>Array.isArray(x)&&intIn(x[0],0,JN_N-1)&&intIn(x[1],0,1)).slice(-6).map(x=>[x[0],x[1]]);
  if(o.ph==="end"){ const r=co.res||{}; o.res={sc:pair(r.sc,0,999,0),cn:pair(r.cn,0,JN_N,0),w:intIn(r.w,-1,1)?r.w:-1,an:num(r.an,0,1e7,0),tn:pair(r.tn,0,1000,0)}; }
  return o;
}

const API={STAGES,SHORT,KINDS,OPS,SY,ST,C,stageTarget,capOf,engine,clean,
  BS,bossHp,bossCap,bossDmg,bossEngine,JN,JN_N,JN_DEF,JN_NB,jnBoard,jnCost,jnOk,jnPick,jnResolve,jnScore,splitTeams,jinEngine,mkPop};
if(typeof module!=="undefined"&&module.exports) module.exports=API; else root.MH_COOP=API;
})(typeof window!=="undefined"?window:globalThis);
