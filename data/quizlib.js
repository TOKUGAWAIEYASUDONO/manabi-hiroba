/* まなびひろば「先生がつくる もんだい」の部品（画面には触らない）
   ブラウザでは window.MH_QUIZ、Node.js（server.js・tools/）では require で使う。外部には通信しない。
   中身：形式チェック／ルビ／表の取り込み（TSV・CSV）／書き出し（CSV・JSON）／れんしゅう用リンク／ライブ出題の進行（engine） */
(function(root){
"use strict";
const LIM={title:40,memo:200,q:120,ch:60,maxQ:200,minCh:2,maxCh:4,name:40};
const SECS=[5,10,20,30,60,90,120], DEFSEC=20, PTS=["normal","double","none"];
const PT_JA={normal:"ふつう",double:"2ばい",none:"なし"}, PT_MULT={normal:1,double:2,none:0};
const TF_CH=["○","×"];
const len=s=>Array.from(s).length;
const clean=s=>typeof s==="string"?s.replace(/[\u0000-\u001f\u007f\u200b-\u200f\u2028\u2029\ufeff]/g," ").replace(/\s+/g," ").trim():"";
const cut=(s,n)=>Array.from(s).slice(0,n).join("");
const bad=why=>({ok:false,why});

/* ---------- ルビ：`漢字《かんじ》`／`｜漢字《かんじ》`（青空文庫式）。画面では <ruby> を DOM で組み立てる ---------- */
const KAN="\\u3400-\\u4dbf\\u4e00-\\u9fff\\uf900-\\ufaff々〆〇ヶ";
const RUBY_RE=new RegExp("(?:[｜|]([^｜|《》\\n]{1,30})|([" + KAN + "]+))《([^《》\\n]{1,30})》","g");
function rubyParts(s){
  s=String(s==null?"":s); const out=[]; let last=0, m; RUBY_RE.lastIndex=0;
  while((m=RUBY_RE.exec(s))){ if(m.index>last) out.push({t:s.slice(last,m.index)}); out.push({b:m[1]||m[2],r:m[3]}); last=m.index+m[0].length; }
  if(last<s.length) out.push({t:s.slice(last)});
  return out;
}
const plain=s=>rubyParts(s).map(p=>p.b!=null?p.b:p.t).join("");

/* ---------- 1問・1セットの形式チェック ----------
   問題：{t:"mc"|"tf", q, ch:[…], ok:[0始まりの番号…], sec, pt}  ○×は ch が ["○","×"] 固定 */
function cleanQ(r,o){
  o=o||{}; const warn=[];
  if(!r||typeof r!=="object"||Array.isArray(r)) return bad("形式が正しくありません");
  const t=r.t==="tf"?"tf":r.t==="mc"?"mc":null; if(!t) return bad("種類（4択か○×）が正しくありません");
  const q=clean(r.q); if(!q) return bad("問題文が空です"); if(len(q)>LIM.q) return bad(`問題文が${LIM.q}字をこえています`);
  let ch, ok;
  if(!Array.isArray(r.ch)||r.ch.length>8) return bad("選択肢の形式が正しくありません");
  if(!Array.isArray(r.ok)||r.ok.length>8) return bad("正解の形式が正しくありません");
  if(t==="tf"){
    ch=TF_CH.slice();
    ok=[...new Set(r.ok.map(Number))].filter(n=>n===0||n===1);
    if(ok.length!==1||r.ok.length!==1) return bad("○と×のどちらが正しいか、1つえらんでください");
  } else {
    if(r.ch.length<LIM.minCh||r.ch.length>LIM.maxCh) return bad(`選択肢は${LIM.minCh}〜${LIM.maxCh}個にしてください`);
    const map=new Map(); ch=[];
    for(let i=0;i<r.ch.length;i++){
      if(typeof r.ch[i]!=="string") return bad("選択肢の形式が正しくありません");
      const c=clean(r.ch[i]); if(!c) continue;
      if(len(c)>LIM.ch) return bad(`選択肢${i+1}が${LIM.ch}字をこえています`);
      map.set(i,ch.length); ch.push(c);
    }
    if(ch.length<LIM.minCh) return bad(`選択肢が${LIM.minCh}つ以上ありません`);
    const oks=[];
    for(const n of r.ok){
      if(!Number.isInteger(n)||n<0||n>=r.ch.length) return bad("正解の番号が選択肢の外です");
      if(!map.has(n)) return bad("正解が、空の選択肢を指しています");
      oks.push(map.get(n));
    }
    ok=[...new Set(oks)].sort((a,b)=>a-b);
    if(!ok.length) return bad("正解が選ばれていません");
  }
  let sec=DEFSEC;
  if(r.sec!==undefined&&r.sec!==null&&r.sec!==""){
    if(SECS.includes(Number(r.sec))) sec=Number(r.sec); else { if(o.strict) return bad("制限時間の値が正しくありません"); warn.push(`制限時間を${DEFSEC}秒にしました`); }
  }
  let pt="normal";
  if(r.pt!==undefined&&r.pt!==null&&r.pt!==""){ if(PTS.includes(r.pt)) pt=r.pt; else { if(o.strict) return bad("得点の値が正しくありません"); warn.push("得点を「ふつう」にしました"); } }
  return {ok:true,q:{t,q,ch,ok,sec,pt},warn};
}
/* セット：{title,g,memo,qs}。形式がおかしい問題は bad に入れて飛ばす（1問も使えなければ失敗） */
function cleanSet(raw,o){
  o=o||{};
  if(!raw||typeof raw!=="object"||Array.isArray(raw)) return bad("形式が正しくありません");
  if(raw.format!==undefined&&raw.format!=="manabi-quiz") return bad("まなびひろばの もんだいファイルではありません");
  if(raw.v!==undefined&&raw.v!==1) return bad("新しい形式のファイルです（このページでは読めません）");
  if(!Array.isArray(raw.qs)) return bad("問題の一覧がありません");
  if(raw.qs.length>LIM.maxQ) return bad(`問題が${LIM.maxQ}問をこえています`);
  const warn=[], badQ=[], qs=[];
  raw.qs.forEach((x,i)=>{ const r=cleanQ(x,o); if(r.ok){ qs.push(r.q); r.warn.forEach(w=>warn.push(`${i+1}問目：${w}`)); } else badQ.push({i,why:r.why}); });
  if(!qs.length) return bad(badQ.length?`使える問題がありません（${badQ[0].i+1}問目：${badQ[0].why}）`:"問題がありません");
  let title=clean(raw.title); if(len(title)>LIM.title){ title=cut(title,LIM.title); warn.push("タイトルを短くしました"); }
  const g=Number.isInteger(raw.g)&&raw.g>=0&&raw.g<=6?raw.g:0;
  let memo=clean(raw.memo); if(len(memo)>LIM.memo) memo=cut(memo,LIM.memo);
  return {ok:true,set:{title,g,memo,qs},warn,bad:badQ};
}
/* 編集中の下書き（形式が未完成でもよい）。保存データがこわれていても画面が動くように、型だけそろえる */
function draftQ(r){
  r=r&&typeof r==="object"?r:{};
  const t=r.t==="tf"?"tf":"mc";
  const q=typeof r.q==="string"?cut(r.q,LIM.q*2):"";
  let ch=Array.isArray(r.ch)?r.ch.slice(0,4).map(c=>typeof c==="string"?cut(c,LIM.ch*2):""):[];
  while(ch.length<4) ch.push("");
  if(t==="tf") ch=TF_CH.slice();
  const ok=Array.isArray(r.ok)?[...new Set(r.ok.filter(n=>Number.isInteger(n)&&n>=0&&n<(t==="tf"?2:4)))].sort((a,b)=>a-b):[];
  return {t,q,ch,ok:t==="tf"?ok.slice(0,1):ok,sec:SECS.includes(r.sec)?r.sec:DEFSEC,pt:PTS.includes(r.pt)?r.pt:"normal"};
}
function blankQ(t){ return draftQ({t:t==="tf"?"tf":"mc",q:"",ch:t==="tf"?TF_CH:["","","",""],ok:t==="tf"?[0]:[],sec:DEFSEC,pt:"normal"}); }
function draftSet(r){
  r=r&&typeof r==="object"?r:{};
  return {id:typeof r.id==="string"&&/^[a-z0-9]{4,16}$/.test(r.id)?r.id:newId(),title:typeof r.title==="string"?cut(r.title,LIM.title):"",
    g:Number.isInteger(r.g)&&r.g>=0&&r.g<=6?r.g:0,memo:typeof r.memo==="string"?cut(r.memo,LIM.memo):"",upd:Number.isFinite(r.upd)?r.upd:0,
    qs:(Array.isArray(r.qs)?r.qs:[]).slice(0,LIM.maxQ).map(draftQ)};
}
function newId(){ let s=""; const a="abcdefghijklmnopqrstuvwxyz0123456789"; for(let i=0;i<8;i++) s+=a[Math.floor(Math.random()*a.length)]; return s; }

/* ---------- 得点：正解で 500＋500×（のこり時間/制限時間）。2ばいは×2、なしは0 ---------- */
function points(correct,leftSec,sec,pt){
  if(!correct) return 0;
  const f=Math.max(0,Math.min(1,leftSec/sec)), m=PT_MULT[pt]!=null?PT_MULT[pt]:1;
  return Math.round((500+500*f)*m);
}

/* ---------- 表（TSV・CSV）の読み取り ---------- */
function parseDelim(text,d){
  text=String(text).replace(/^\ufeff/,"");
  const rows=[]; let row=[], cur="", inQ=false;
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(inQ){ if(c==='"'){ if(text[i+1]==='"'){ cur+='"'; i++; } else inQ=false; } else cur+=c; continue; }
    if(c==='"'&&cur===""){ inQ=true; continue; }
    if(c===d){ row.push(cur); cur=""; continue; }
    if(c==="\r"||c==="\n"){ if(c==="\r"&&text[i+1]==="\n") i++; row.push(cur); cur=""; rows.push(row); row=[]; continue; }
    cur+=c;
  }
  if(cur!==""||row.length){ row.push(cur); rows.push(row); }
  return rows;
}
const detectDelim=t=>/\t/.test(String(t).slice(0,20000))?"\t":",";
const HEAD={q:/問題|質問|question/i,qnum:/番号|number|^no\.?$|^#$/i,a:/(?:選択肢|answer|回答|こたえ|答え)\s*([1-4１-４])/i,time:/時間|time|秒|limit/i,ok:/正解|correct|right/i,pt:/得点|配点|ポイント|point|score/i};
function mapHeader(cells){
  const m={q:-1,a:[-1,-1,-1,-1],time:-1,ok:-1,pt:-1};
  cells.forEach((c,i)=>{ c=String(c==null?"":c).trim(); if(!c) return;
    let x=c.match(HEAD.a);
    if(x){ const k=+String(x[1]).replace(/[１-４]/,ch=>String.fromCharCode(ch.charCodeAt(0)-65248))-1; if(m.a[k]<0) m.a[k]=i; return; }
    if(HEAD.ok.test(c)){ if(m.ok<0) m.ok=i; }
    else if(HEAD.time.test(c)){ if(m.time<0) m.time=i; }
    else if(HEAD.pt.test(c)){ if(m.pt<0) m.pt=i; }
    else if(HEAD.q.test(c)&&!HEAD.qnum.test(c)){ if(m.q<0) m.q=i; }
  });
  return m;
}
const isHeaderMap=m=>m.q>=0&&(m.a.filter(i=>i>=0).length>=2||m.ok>=0||m.time>=0);
const POS={q:0,a:[1,2,3,4],time:5,ok:6,pt:7};
const TF_T=["○","〇","◯","o","O","まる","true","TRUE","True","正","正しい"], TF_F=["×","✕","✗","x","X","ばつ","false","FALSE","False","誤","まちがい"];
const PT_PARSE={"ふつう":"normal","普通":"normal","1":"normal","1ばい":"normal","normal":"normal","2ばい":"double","2倍":"double","2":"double","x2":"double","×2":"double","double":"double","なし":"none","無し":"none","0":"none","none":"none"};
const toHalf=s=>String(s).replace(/[０-９]/g,c=>String.fromCharCode(c.charCodeAt(0)-65248));

/* 取り込む前の分析：行ごとに {line,status:"ok"|"warn"|"ng",reasons,q,view}
   existing：いまセットにある問題数（200問の上限に使う） */
function analyzeTable(rows,o){
  o=o||{}; const existing=o.existing|0;
  let map=Object.assign({},POS,{a:POS.a.slice()}), start=0, header=false, named=false;
  for(let i=0;i<Math.min(rows.length,12);i++){ const m=mapHeader(rows[i]); if(isHeaderMap(m)){ map=m; start=i+1; header=true; named=true; break; } }
  if(!header&&rows.length>=2){      // 見出しの文字が読めなくても、2行目の正解の欄だけが数字なら、1行目を見出しとする
    const r0=rows[0], r1=rows[1], num=c=>/^\s*\d+(\s*[,、，/／・]\s*\d+)*\s*$/.test(toHalf(c||""));
    if(String(r0[6]||"").trim()&&!num(r0[6])&&num(r1[6])){ start=1; header=true; }
  }
  const out=[]; let accepted=0;
  for(let i=start;i<rows.length;i++){
    const r=rows[i]; if(!r||r.every(c=>String(c).trim()==="")) continue;
    const line=i+1, cell=k=>(k>=0&&k<r.length)?String(r[k]):"", reasons=[]; let status="ok";
    const ng=why=>{ out.push({line,status:"ng",reasons:[why],q:null,view:{q:clean(cell(map.q)),ch:[],sec:"",ok:""}}); };
    const need=Math.max(map.q,map.ok,...map.a.filter(k=>k>=0))+1;
    if(r.length<need) { ng(`列が足りません（${need}列ほしいのに、この行は${r.length}列です）`); continue; }
    const qtext=clean(cell(map.q));
    if(!qtext){ ng("問題文が空です"); continue; }
    if(len(qtext)>LIM.q){ ng(`問題文が${LIM.q}字をこえています（${len(qtext)}字）`); continue; }
    const raw=map.a.map(k=>clean(cell(k))), pos=[]; raw.forEach((c,k)=>{ if(c) pos.push(k); });
    if(pos.length<LIM.minCh){ ng(`選択肢が${LIM.minCh}つ未満です`); continue; }
    const long=pos.find(k=>len(raw[k])>LIM.ch);
    if(long!==undefined){ ng(`選択肢${long+1}が${LIM.ch}字をこえています`); continue; }
    if(pos.length<raw.slice(0,Math.max(...pos)+1).length) reasons.push("空の選択肢をつめました");
    /* 正解の番号（列の番号。1〜4） */
    const okRaw=toHalf(cell(map.ok)).trim();
    if(!okRaw){ ng("正解の番号が空です"); continue; }
    const nums=okRaw.split(/[\s,、，/／・;；]+/).filter(Boolean);
    let badNum=null; const okCols=[];
    for(const n of nums){ if(!/^\d+$/.test(n)||+n<1||+n>4||!pos.includes(+n-1)){ badNum=n; break; } okCols.push(+n-1); }
    if(badNum!==null){ ng(`正解の番号が正しくありません（${cut(badNum,8)}）。選択肢のある列の番号（1〜4）で書いてください`); continue; }
    let t="mc", ch=pos.map(k=>raw[k]), ok=[...new Set(okCols.map(k=>pos.indexOf(k)))];
    if(ch.length===2){        // ○ と × だけなら、○×問題にする
      const a=ch[0],b=ch[1];
      if((TF_T.includes(a)&&TF_F.includes(b))||(TF_F.includes(a)&&TF_T.includes(b))){
        if(ok.length!==1){ ng("○と×の両方を正解にはできません"); continue; }
        t="tf"; const truth=TF_T.includes(ch[ok[0]]); ok=[truth?0:1]; ch=TF_CH.slice();
      }
    }
    /* 制限時間：空欄・範囲外は20秒にして、取り込みは止めない */
    let sec=DEFSEC; const tRaw=toHalf(cell(map.time)).trim();
    if(map.time>=0){
      if(!tRaw){ reasons.push(`制限時間が空欄なので${DEFSEC}秒にしました`); status="warn"; }
      else { const mm=tRaw.match(/^(\d+)\s*(秒|s|sec|secs)?$/i);
        if(mm&&SECS.includes(+mm[1])) sec=+mm[1]; else { reasons.push(`制限時間「${cut(tRaw,10)}」は使えないので${DEFSEC}秒にしました（使える値：${SECS.join("・")}）`); status="warn"; } }
    }
    let pt="normal"; const pRaw=toHalf(cell(map.pt)).trim();
    if(map.pt>=0&&pRaw){ if(PT_PARSE[pRaw]!=null) pt=PT_PARSE[pRaw]; else { reasons.push(`得点「${cut(pRaw,10)}」は読めないので「ふつう」にしました`); status="warn"; } }
    if(reasons.length&&status==="ok") status="warn";
    if(existing+accepted>=LIM.maxQ){ out.push({line,status:"ng",reasons:[`${LIM.maxQ}問をこえるので取り込めません`],q:null,view:{q:qtext,ch,sec:"",ok:""}}); continue; }
    accepted++;
    const q={t,q:qtext,ch,ok,sec,pt};
    out.push({line,status,reasons,q,view:{q:qtext,ch,sec,ok:ok.map(k=>k+1).join(",")}});
  }
  return {rows:out,header,named};
}
/* 貼りつけた文字（表）またはJSONの文字を分析する */
function analyzeText(text,o){
  text=String(text==null?"":text).replace(/^\ufeff/,"");
  if(!text.trim()) return {rows:[],kind:"empty"};
  if(text.trim()[0]==="{"){
    let j; try{ j=JSON.parse(text); }catch(e){ return {rows:[],kind:"json",error:"JSONとして読めませんでした"}; }
    if(!j||typeof j!=="object"||j.format!=="manabi-quiz"||j.v!==1||!Array.isArray(j.qs)) return {rows:[],kind:"json",error:"まなびひろばの もんだいファイル（manabi-quiz v1）ではありません"};
    const cap=LIM.maxQ-((o&&o.existing)|0);
    const rows=j.qs.slice(0,LIM.maxQ+1).map((x,i)=>{ const r=cleanQ(x);
      if(!r.ok) return {line:i+1,status:"ng",reasons:[r.why],q:null,view:{q:x&&typeof x.q==="string"?clean(x.q):"",ch:[],sec:"",ok:""}};
      return {line:i+1,status:r.warn.length?"warn":"ok",reasons:r.warn,q:r.q,view:{q:r.q.q,ch:r.q.ch,sec:r.q.sec,ok:r.q.ok.map(k=>k+1).join(",")}}; });
    let n=0; for(const r of rows){ if(r.q){ if(n>=cap){ r.status="ng"; r.reasons=[`${LIM.maxQ}問をこえるので取り込めません`]; r.q=null; } else n++; } }
    return {rows,kind:"json",title:clean(j.title),g:Number.isInteger(j.g)?j.g:0};
  }
  const r=analyzeTable(parseDelim(text,detectDelim(text)),o);
  return {rows:r.rows,kind:"table",header:r.header};
}

/* ---------- 書き出し ---------- */
const csvCell=s=>{ s=String(s); return /[",\r\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s; };
const CSV_HEAD=["問題文","選択肢1","選択肢2","選択肢3","選択肢4","制限時間(秒)","正解の番号","得点"];
function toCsv(set){
  const rows=[CSV_HEAD];
  for(const q of set.qs) rows.push([q.q,q.ch[0]||"",q.ch[1]||"",q.ch[2]||"",q.ch[3]||"",q.sec,q.ok.map(k=>k+1).join(","),PT_JA[q.pt]]);
  return "\ufeff"+rows.map(r=>r.map(csvCell).join(",")).join("\r\n")+"\r\n";
}
function templateCsv(){
  return toCsv({qs:[
    {t:"mc",q:"日本の首都は？",ch:["大阪","東京","京都","名古屋"],ok:[1],sec:20,pt:"normal"},
    {t:"tf",q:"1年は12か月ある",ch:TF_CH,ok:[0],sec:10,pt:"normal"}]});
}
function toJson(set){
  return JSON.stringify({format:"manabi-quiz",v:1,title:set.title||"",g:set.g||0,memo:set.memo||"",qs:set.qs.map(q=>({t:q.t,q:q.q,ch:q.ch,ok:q.ok,sec:q.sec,pt:q.pt}))},null,1);
}
/* 結果のCSV：ニックネームと正誤だけ（実名は持たない）。players:[{name,v,ok,rec:"1,0,-"…}] stat:[{ok,tot}] */
function resultsCsv(o){
  const n=o.qs.length, head=[o.nameHead||"ニックネーム","合計点","正解数",...o.qs.map((_,i)=>`${i+1}問目`)];
  const rows=[head];
  for(const p of o.players){ const rec=String(p.rec||""); rows.push([p.name,p.v,p.ok,...o.qs.map((_,i)=>rec[i]==="1"?"○":rec[i]==="0"?"×":"−")]); }
  rows.push(["正答率","","",...o.qs.map((_,i)=>{ const s=o.stat[i]; return s&&s.tot?Math.round(s.ok/s.tot*100)+"%":""; })]);
  rows.push(["問題","","",...o.qs.map(q=>plain(q.q))]);
  return "\ufeff"+rows.map(r=>r.map(csvCell).join(",")).join("\r\n")+"\r\n";
}

/* ---------- れんしゅう用リンク：#q= のあとに、(z=deflate-raw圧縮 | r=無圧縮) ＋ base64url ---------- */
const MAX_INFLATED=400000, MAX_LINKCODE=200000;
function b64u(u8){ let s=""; for(let i=0;i<u8.length;i+=0x8000) s+=String.fromCharCode.apply(null,u8.subarray(i,i+0x8000)); return btoa(s).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,""); }
function unb64u(s){ s=s.replace(/-/g,"+").replace(/_/g,"/"); while(s.length%4) s+="="; const b=atob(s), u=new Uint8Array(b.length); for(let i=0;i<b.length;i++) u[i]=b.charCodeAt(i); return u; }
const canZip=()=>typeof CompressionStream==="function"&&typeof DecompressionStream==="function"&&typeof Response==="function";
async function readAll(stream,max){
  const rd=stream.getReader(), parts=[]; let n=0;
  for(;;){ const {done,value}=await rd.read(); if(done) break; n+=value.length; if(n>max){ try{ rd.cancel(); }catch(e){} throw new Error("big"); } parts.push(value); }
  const u=new Uint8Array(n); let k=0; for(const p of parts){ u.set(p,k); k+=p.length; } return u;
}
async function zip(u8,fmt){
  const s=new (fmt==="d"?DecompressionStream:CompressionStream)("deflate-raw"), w=s.writable.getWriter();
  w.write(u8).catch(()=>{}); w.close().catch(()=>{});
  return readAll(s.readable,MAX_INFLATED);
}
async function encodeLink(set,o){
  const json=JSON.stringify({v:1,title:set.title||"",g:set.g||0,qs:set.qs.map(q=>({t:q.t,q:q.q,ch:q.ch,ok:q.ok,sec:q.sec,pt:q.pt}))});
  const raw=new TextEncoder().encode(json);
  if(canZip()&&!(o&&o.plain)){ try{ return "z"+b64u(await zip(raw,"c")); }catch(e){} }
  return "r"+b64u(raw);
}
async function decodeLink(code){
  try{
    code=String(code||""); if(code.length<2||code.length>MAX_LINKCODE||!/^[zr][A-Za-z0-9_-]+$/.test(code)) return bad("リンクの形式が正しくありません");
    let u=unb64u(code.slice(1));
    if(code[0]==="z"){ if(!canZip()) return bad("このブラウザでは、このリンクを開けません"); u=await zip(u,"d"); }
    else if(u.length>MAX_INFLATED) return bad("リンクが大きすぎます");
    const j=JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(u));
    const r=cleanSet(j,{strict:false}); return r.ok?r:bad(r.why);
  }catch(e){ return bad("リンクを読みとれませんでした"); }
}

/* ---------- ライブ出題の進行（先生の端末／server.js が持つ。児童の端末には問題の答えを送らない） ----------
   phase: lobby → q（出題中）→ reveal（正解と分かれ方）→ board（数問ごとに上位5人）→ q … → end */
function engine(qs,o){
  o=o||{};
  const E={qs:qs.slice(),idx:-1,phase:"lobby",qStart:0,qEnd:0,ans:new Map(),P:new Map(),hist:[],easy:!!o.easy,every:o.every||3};
  const pl=pid=>{ let p=E.P.get(pid); if(!p){ p={v:0,ok:0,ng:0,st:0,lp:0,lc:0,rec:[]}; E.P.set(pid,p); } return p; };
  E.add=pid=>{ pl(pid); };
  E.remove=pid=>{ E.P.delete(pid); E.ans.delete(pid); };     // へやから出された子
  E.answeredBy=pid=>E.ans.has(pid);                          // いまの問題に答えたか（正誤は返さない）
  E.nextQ=now=>{
    if(E.idx+1>=E.qs.length) return false;
    E.idx++; E.phase="q"; E.qStart=now; E.qEnd=now+E.qs[E.idx].sec*1000; E.ans=new Map(); return true;
  };
  E.begin=(now,subset)=>{          // 最初から（subset：別の問題だけで、もう一度）
    if(subset) E.qs=subset.slice();
    E.idx=-1; E.hist=[]; E.ans=new Map();
    for(const p of E.P.values()) Object.assign(p,{v:0,ok:0,ng:0,st:0,lp:0,lc:0,rec:[]});
    return E.nextQ(now);
  };
  /* 回答：出題中の1回だけ。選んだ番号は範囲を調べる。点は reveal で足す */
  E.answer=(pid,qi,c,now)=>{
    if(E.phase!=="q") return {ok:false,why:"late"};
    if(qi!==E.idx) return {ok:false,why:"old"};
    const q=E.qs[E.idx];
    if(!Number.isInteger(c)||c<0||c>=q.ch.length) return {ok:false,why:"bad"};
    if(!E.P.has(pid)) return {ok:false,why:"who"};
    if(E.ans.has(pid)) return {ok:false,why:"twice"};
    if(now>E.qEnd+500) return {ok:false,why:"late"};
    const correct=q.ok.includes(c);
    E.ans.set(pid,{c,correct,pts:points(correct,(E.qEnd-now)/1000,q.sec,q.pt)});
    return {ok:true};
  };
  E.reveal=()=>{
    if(E.phase!=="q") return false;
    const q=E.qs[E.idx], dist=q.ch.map(()=>0); let nok=0;
    for(const [pid,p] of E.P){
      const a=E.ans.get(pid);
      if(a){ dist[a.c]++; if(a.correct){ nok++; p.ok++; p.st++; p.v+=a.pts; p.lp=a.pts; p.lc=1; p.rec[E.idx]=1; } else { p.ng++; p.st=0; p.lp=0; p.lc=0; p.rec[E.idx]=0; } }
      else { p.ng++; p.st=0; p.lp=0; p.lc=-1; p.rec[E.idx]=-1; }
    }
    E.hist[E.idx]={dist,n:E.ans.size,ok:nok,tot:E.P.size};
    E.phase="reveal"; return true;
  };
  E.tick=now=>{
    if(E.phase!=="q") return false;
    if(now>=E.qEnd||(E.P.size>0&&E.ans.size>=E.P.size)) return E.reveal();
    return false;
  };
  E.finish=()=>{ if(E.phase==="q") E.reveal(); if(E.phase!=="lobby") E.phase="end"; };
  E.next=now=>{
    if(E.phase==="q") return E.reveal();
    if(E.phase==="reveal"){
      if(E.idx>=E.qs.length-1){ E.phase="end"; return true; }
      if(!E.easy&&(E.idx+1)%E.every===0){ E.phase="board"; return true; }
      return E.nextQ(now);
    }
    if(E.phase==="board") return E.nextQ(now);
    return false;
  };
  E.low=(rate)=>{ const a=[]; E.hist.forEach((h,i)=>{ if(h&&h.tot&&h.ok/h.tot<rate) a.push(i); }); return a; };
  E.recStr=pid=>{ const p=E.P.get(pid); if(!p) return ""; let s=""; for(let i=0;i<E.qs.length;i++) s+=p.rec[i]===1?"1":p.rec[i]===0?"0":"-"; return s; };
  /* 児童に見せる状態。出題中は正解（ok）を入れない */
  E.pub=()=>{
    const q=E.qs[E.idx], o={phase:E.phase,idx:E.idx,n:E.qs.length,easy:E.easy,startAt:E.qStart,endAt:E.qEnd,answered:E.ans.size,total:E.P.size};
    if(q&&(E.phase==="q"||E.phase==="reveal"||E.phase==="board")){
      o.q={t:q.t,q:q.q,ch:q.ch,sec:q.sec,pt:q.pt};
      if(E.phase!=="q"){ o.q.ok=q.ok; o.dist=(E.hist[E.idx]||{dist:q.ch.map(()=>0)}).dist; }
    }
    if(E.phase==="end"){
      let all=0; for(const p of E.P.values()) all+=p.ok; o.all=all;
      o.stat=E.qs.map((_,i)=>{ const h=E.hist[i]; return h?{ok:h.ok,tot:h.tot,n:h.n}:{ok:0,tot:0,n:0}; });
      o.list=E.qs.map(q=>q.q);
    }
    return o;
  };
  return E;
}
/* 受け取った状態（児童の端末で）の検査。使えるところだけを取り出す。だめなら null */
const intIn=(v,a,b)=>Number.isInteger(v)&&v>=a&&v<=b;
function cleanQuizPub(r){
  if(!r||typeof r!=="object") return null;
  const PH=["lobby","q","reveal","board","end"];
  if(!PH.includes(r.phase)||!intIn(r.idx,-1,LIM.maxQ)||!intIn(r.n,0,LIM.maxQ)) return null;
  const o={phase:r.phase,idx:r.idx,n:r.n,easy:!!r.easy,startAt:Number.isFinite(r.startAt)?r.startAt:0,endAt:Number.isFinite(r.endAt)?r.endAt:0,
    answered:intIn(r.answered,0,100000)?r.answered:0,total:intIn(r.total,0,100000)?r.total:0};
  if(r.q){
    const c=cleanQ({t:r.q.t,q:r.q.q,ch:r.q.ch,ok:Array.isArray(r.q.ok)?r.q.ok:[0],sec:r.q.sec,pt:r.q.pt},{strict:true});
    if(!c.ok) return null;
    o.q=c.q; o.hasOk=Array.isArray(r.q.ok);
    if(o.hasOk&&Array.isArray(r.dist)&&r.dist.length===o.q.ch.length&&r.dist.every(n=>intIn(n,0,100000))) o.dist=r.dist.slice();
  }
  if(r.phase==="end"){
    o.all=intIn(r.all,0,10000000)?r.all:0;
    o.stat=Array.isArray(r.stat)?r.stat.slice(0,LIM.maxQ).map(s=>({ok:intIn(s&&s.ok,0,100000)?s.ok:0,tot:intIn(s&&s.tot,0,100000)?s.tot:0,n:intIn(s&&s.n,0,100000)?s.n:0})):[];
    o.list=Array.isArray(r.list)?r.list.slice(0,LIM.maxQ).map(x=>typeof x==="string"?cut(clean(x),LIM.q):""):[];
  }
  return o;
}

const API={LIM,SECS,DEFSEC,PTS,PT_JA,PT_MULT,TF_CH,len,clean,cut,rubyParts,plain,cleanQ,cleanSet,draftQ,draftSet,blankQ,newId,points,
  parseDelim,detectDelim,analyzeTable,analyzeText,toCsv,templateCsv,toJson,resultsCsv,encodeLink,decodeLink,canZip,engine,cleanQuizPub,b64u,unb64u};
if(typeof module!=="undefined"&&module.exports) module.exports=API; else root.MH_QUIZ=API;
})(typeof window!=="undefined"?window:globalThis);
