/* まなびひろば：児童が入力する名前の検査（ブラウザ・先生の端末・server.js で同じものを使う）
   - 長さ（1〜8文字）と文字の種類（ひらがな・カタカナ・漢字・英数字。空白・記号・絵文字は不可）
   - 簡易のNG語リスト。出典なし・自作の短いリスト（下品・悪口・個人を傷つける語）。完全ではありません。
     ひらがな／カタカナ／ローマ字、全角／半角、大文字／小文字のゆれを直してから、部分一致で調べます。漢字の悪口（馬鹿・死ね など）も別のリストで調べます。「しねしね」のようなくり返しも断ります。
     誤検出が多くなる短すぎる語は入れていません（2文字の語は EXACT に「その名前だけ」で入れたものがあります）。
   - 同じ名前には「ゆうと2」のように番号をつけます。 */
(function(root){
"use strict";
const MIN=1, MAX=8;

/* 部分一致で調べる語（ひらがなで書く。ローマ字・カタカナで書かれても、ひらがなに直して調べる） */
const KANA_NG=[
  "ばか","あほ","まぬけ","くそ","うんこ","うんち","ちんこ","ちんちん","まんこ","おっぱい","せっくす","ぶさいく","でぶ",
  "きもい","うざい","くたばれ","きえろ","しねよ","しねや","しんじまえ","しんでしまえ","しんじゃえ","ころす","ころしてやる",
  "いじめ","ちかん","ばいた","きちがい","めくら","つんぼ","かたわ","ごみくず","のろま","とんま"
];
/* ちょうどその名前のときだけ断る語（短くて、ほかの名前の一部になりやすいもの） */
const EXACT=["しね","くず","ごみ","かす","ぶす","はげ","えろ"];
/* 漢字・かな混じりの語（部分一致。漢字は読みに直せないので、そのままの形で調べる）。短い一字の語は入れていない（「殺」「糞」は名前に使われないので入れた） */
const KANJI_NG=[
  "馬鹿","莫迦","阿呆","死ね","死んで","氏ね","殺す","殺し","殺せ","殺さ","殺意","糞","消えろ","消え失せ","黙れ","変態","気持ち悪","気持悪","きもち悪","不細工","ぶ細工",
  "無能","低能","痴漢","強姦","淫乱","売春","自殺","首つり","首吊","外人","障害者","池沼","ガイジ","うんこ","便所","乳首","陰茎","精液"
];
/* 名前によくある並びで、NG語を含んでしまうもの（調べる前に取りのぞく） */
const SAFE=["しばか","ひばか","さくそ","ひろくそ"].map(w=>w);
/* 英語など（小文字の半角で書く。部分一致）。短い語（kill・ass など）は誤検出が多いので入れない */
const LATIN_NG=["fuck","shit","bitch","porn","nigger","nigga","pussy","dick","cunt","whore","slut","suicide"];

/* ---- ローマ字 → ひらがな（かんたんな変換。訓令式・ヘボン式のおもなもの） ---- */
const RT=(()=>{
  const t={}, V="aiueo";
  const row=(c,kana)=>{ for(let i=0;i<5;i++) if(kana[i]!=="-") t[c+V[i]]=kana[i]; };
  row("","あいうえお"); row("k","かきくけこ"); row("s","さしすせそ"); row("t","たちつてと"); row("n","なにぬねの");
  row("h","はひふへほ"); row("m","まみむめも"); row("r","らりるれろ"); row("g","がぎぐげご"); row("z","ざじずぜぞ");
  row("d","だぢづでど"); row("b","ばびぶべぼ"); row("p","ぱぴぷぺぽ"); row("y","や-ゆ-よ"); row("w","わ---を"); row("j","じゃじじゅじぇじょ");
  row("f","ふぁふぃふふぇふぉ"); row("v","ゔぁゔぃゔゔぇゔぉ");
  Object.assign(t,{shi:"し",chi:"ち",tsu:"つ",sha:"しゃ",shu:"しゅ",sho:"しょ",she:"しぇ",cha:"ちゃ",chu:"ちゅ",cho:"ちょ",che:"ちぇ",ji:"じ",
    kya:"きゃ",kyu:"きゅ",kyo:"きょ",nya:"にゃ",nyu:"にゅ",nyo:"にょ",hya:"ひゃ",hyu:"ひゅ",hyo:"ひょ",mya:"みゃ",myu:"みゅ",myo:"みょ",
    rya:"りゃ",ryu:"りゅ",ryo:"りょ",gya:"ぎゃ",gyu:"ぎゅ",gyo:"ぎょ",bya:"びゃ",byu:"びゅ",byo:"びょ",pya:"ぴゃ",pyu:"ぴゅ",pyo:"ぴょ",
    zya:"じゃ",zyu:"じゅ",zyo:"じょ",tya:"ちゃ",tyu:"ちゅ",tyo:"ちょ",sya:"しゃ",syu:"しゅ",syo:"しょ",dya:"ぢゃ",dyu:"ぢゅ",dyo:"ぢょ",
    si:"し",ti:"ち",tu:"つ",hu:"ふ",zi:"じ",di:"ぢ",du:"づ",wi:"うぃ",we:"うぇ",la:"ぁ",li:"ぃ",lu:"ぅ",le:"ぇ",lo:"ぉ",xa:"ぁ",xi:"ぃ",xu:"ぅ",xe:"ぇ",xo:"ぉ"});
  return t;
})();
function romajiToKana(s){
  let out="", i=0;
  while(i<s.length){
    const c=s[i];
    if(!/[a-z]/.test(c)){ out+=c; i++; continue; }
    if(c==="n"){                                    // ん（nn・n＋子音・語末の n）
      const nx=s[i+1];
      if(nx==="n"&&!/[aiueoy]/.test(s[i+2]||"")){ out+="ん"; i+=2; continue; }
      if(!nx||!/[aiueoy]/.test(nx)){ out+="ん"; i++; continue; }
    }
    if(i+1<s.length&&c===s[i+1]&&/[kstcpgzdbfjhmrwy]/.test(c)&&c!=="n"){ out+="っ"; i++; continue; }      // っ（kk・tt…）
    let hit=false;
    for(let n=3;n>=1&&!hit;n--){ const k=s.substr(i,n); if(k.length===n&&RT[k]){ out+=RT[k]; i+=n; hit=true; } }
    if(!hit){ out+=c; i++; }
  }
  return out;
}

/* ---- ゆれをそろえる：全角半角（NFKC）・小文字・カタカナ→ひらがな・長音・数字・「・」などをとる ---- */
const kataToHira=s=>s.replace(/[ァ-ヶ]/g,c=>String.fromCharCode(c.charCodeAt(0)-0x60));
function norm(s){
  let t=String(s==null?"":s).normalize("NFKC").toLowerCase();
  t=kataToHira(t).replace(/[ー‐-―\-_・･.\s]/g,"").replace(/[0-9]/g,"");
  return t;
}
/* NG語をひらがな・ローマ字の両方から調べるための文字列 */
function forms(s){
  const t=norm(s);
  return {kana:romajiToKana(t), latin:t.replace(/[^a-z]/g,"")};
}
const NG_KANA=KANA_NG.map(norm);
const NG_EXACT=new Set(EXACT.map(norm));
const NG_KANJI=KANJI_NG.map(norm);
const NG_REPEAT=EXACT.map(norm).concat(["死ね","氏ね","ばか","あほ"].map(norm));      // 「しねしね」のようなくり返しも断る

function isNg(name){
  const f=forms(name), raw=norm(name);
  const rm=t=>SAFE.reduce((a,w)=>a.split(w).join(""),t);
  if(NG_EXACT.has(raw)) return true;
  for(const w of NG_REPEAT){ if(raw.length>=w.length*2&&raw.length%w.length===0&&raw===w.repeat(raw.length/w.length)) return true; }     // くり返し（しねしね・くずくず）
  for(const w of NG_KANJI) if(raw.includes(w)) return true;           // その名前だけ（ローマ字から直した形では調べない：shine など英語の語を断らないため）
  for(const w of NG_KANA) if(rm(f.kana).includes(w)||rm(raw).includes(w)) return true;
  for(const w of LATIN_NG) if(f.latin.includes(w)) return true;
  return false;
}

/* 電話番号・メール・URL らしい名前（個人の連絡先を先生の大画面に出さないため）。NFKC のあとで調べる
   - 数字が5けた以上つづく／数字が合わせて7けた以上
   - http・www・メールの会社名などの文字（@ . / : - は、文字の種類の検査で先に断られる） */
const CONTACT_WORDS=["http","www","mailto","gmail","yahoo","icloud","hotmail","outlook","docomo","softbank","ezweb"];
function isContact(name){
  const t=String(name).normalize("NFKC").toLowerCase();
  if(/[0-9]{5,}/.test(t)) return true;
  if((t.match(/[0-9]/g)||[]).length>=7) return true;
  return CONTACT_WORDS.some(w=>t.includes(w));
}

/* 使える文字：ひらがな・カタカナ（ー を含む）・漢字（々 を含む）・英数字。NFKC のあと（全角英数は半角、半角カナは全角になる） */
const OK_CHARS=/^[ぁ-ゖァ-ヺー㐀-䶿一-鿿々A-Za-z0-9]+$/;
/* 名前を整えて検査する。 {ok:true,name} か {ok:false,why:"empty"|"long"|"chars"|"ng"|"pii"} */
function check(raw){
  if(typeof raw!=="string") return {ok:false,why:"empty"};
  const name=raw.normalize("NFKC").trim();
  if(name.length<MIN) return {ok:false,why:"empty"};
  if([...name].length>MAX) return {ok:false,why:"long"};
  if(!OK_CHARS.test(name)) return {ok:false,why:"chars"};
  if(isNg(name)) return {ok:false,why:"ng"};
  if(isContact(name)) return {ok:false,why:"pii"};
  return {ok:true,name};
}
/* 同じ名前があれば「ゆうと2」「ゆうと3」…。比べるときは大文字小文字・かな種を区別しない */
const key=s=>kataToHira(String(s).normalize("NFKC").toLowerCase());
function dedupe(name,used){
  const u=new Set([...used].map(key));
  if(!u.has(key(name))) return name;
  for(let n=2;n<1000;n++){ const c=name+n; if(!u.has(key(c))) return c; }
  return name+Math.floor(Math.random()*1e6);
}

const API={MIN,MAX,check,dedupe,isNg,isContact,norm,romajiToKana,key};
if(typeof module!=="undefined"&&module.exports) module.exports=API; else root.MH_NAMES=API;
})(typeof window!=="undefined"?window:globalThis);
