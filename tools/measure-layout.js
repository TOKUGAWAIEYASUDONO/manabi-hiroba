#!/usr/bin/env node
// node tools/measure-layout.js --write で基準を更新。通常は基準との差を検査する。
const fs=require('fs'),path=require('path'),cp=require('child_process'),net=require('net'),crypto=require('crypto');
const root=path.resolve(__dirname,'..'), baseline=path.join(__dirname,'layout-baseline.json');
const browsers=['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'];
const browser=browsers.find(fs.existsSync);
if(!browser){console.error('Chrome / Edge が見つかりません');process.exit(2)}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const port=()=>new Promise((resolve,reject)=>{const s=net.createServer();s.once('error',reject);s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>resolve(p))})});
let server,chrome;
async function main(){
 const httpPort=await port(),cdpPort=await port();
 console.log(`layout: Chrome/Edge ${path.basename(browser)}、一時ポート ${httpPort}/${cdpPort}`);
 server=cp.spawn('python',['-m','http.server',String(httpPort),'--bind','127.0.0.1'],{cwd:root,stdio:'ignore',windowsHide:true});
 chrome=cp.spawn(browser,['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--remote-allow-origins=*',`--remote-debugging-port=${cdpPort}`,'--user-data-dir='+path.join(require('os').tmpdir(),`mh-layout-${process.pid}`),'about:blank'],{stdio:'ignore',windowsHide:true});
 let pages;for(let i=0;i<80;i++){try{pages=await (await fetch(`http://127.0.0.1:${cdpPort}/json`)).json();if(pages[0]?.webSocketDebuggerUrl)break}catch{}await sleep(150)}
 if(!pages?.[0]?.webSocketDebuggerUrl)throw Error('CDP を起動できません');
 console.log('layout: CDP に接続');
 const ws=new WebSocket(pages[0].webSocketDebuggerUrl);await new Promise((ok,ng)=>{ws.onopen=ok;ws.onerror=ng});
 let id=0;const pending=new Map();ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id&&pending.has(m.id)){const [ok,ng]=pending.get(m.id);pending.delete(m.id);m.error?ng(Error(m.error.message)):ok(m.result)}};
 const send=(method,params={})=>new Promise((ok,ng)=>{const n=++id;const timer=setTimeout(()=>{pending.delete(n);ng(Error(`CDP 応答待ち: ${method}`))},10000);pending.set(n,[(v)=>{clearTimeout(timer);ok(v)},(e)=>{clearTimeout(timer);ng(e)}]);ws.send(JSON.stringify({id:n,method,params}))});
 await send('Page.enable');await send('Runtime.enable');
 const cases=[['計算スプリント','#play?game=add&g=1&t=60'],['漢字よみ','#play?game=kanji&g=2&t=60'],['単元の練習','#u=m2-hyo&n=10&s=1'],['1年の絵つき問題','#u=m1-nanbanme&n=10&s=1']];
 const out={indexSha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'index.html'))).digest('hex'),browser:path.basename(browser),measurements:{}};
 for(const [width,height] of [[375,667],[1366,768]]){
  await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<500});
  for(const [name,hash] of cases){
   await send('Page.navigate',{url:`http://127.0.0.1:${httpPort}/index.html${hash}`});
   let value;for(let i=0;i<40;i++){await sleep(150);const r=await send('Runtime.evaluate',{expression:`(()=>{let q=document.querySelector('#qq'),buttons=[...document.querySelectorAll('.choice')];if(!q||!buttons.length)return null;let b=buttons[buttons.length-1].getBoundingClientRect();return {fontSize:parseFloat(getComputedStyle(q).fontSize),choicesBottom:Math.round(b.bottom*10)/10,choiceCount:buttons.length,question:q.innerText.slice(0,80)}})()`,returnByValue:true});value=r.result?.value;if(value)break}
   if(!value)throw Error(`${name} ${width}×${height}: 問題と選択肢を表示できません`);
   out.measurements[`${width}x${height}/${name}`]={fontSize:value.fontSize,choicesBottom:value.choicesBottom};
  }
 }
 ws.close();
 if(process.argv.includes('--write')){fs.writeFileSync(baseline,JSON.stringify(out,null,2)+'\n');console.log('基準を作成:',out.indexSha256);return}
 const old=JSON.parse(fs.readFileSync(baseline,'utf8'));let bad=0;
 for(const [key,v] of Object.entries(out.measurements)){const b=old.measurements[key];if(!b||Math.abs(v.fontSize-b.fontSize)>0.1||Math.abs(v.choicesBottom-b.choicesBottom)>1){console.error(key,'基準',b,'現在',v);bad++}}
 if(bad)throw Error(`レイアウト ${bad} 件が基準からずれました`);
 console.log(`レイアウト ${Object.keys(out.measurements).length} 件一致（基準 index.html: ${old.indexSha256}）`);
}
main().catch(e=>{console.error(e.stack||e);process.exitCode=1}).finally(async()=>{if(chrome){chrome.kill();await sleep(300)}if(server){server.kill();await sleep(300)}});
