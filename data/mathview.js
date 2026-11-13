/* Browser global; no modules or HTML parsing. */
(function (root) {
  "use strict";
  const SVG = "http://www.w3.org/2000/svg";
  const css = `.frac{display:inline-flex;vertical-align:-.42em;align-items:center;white-space:nowrap;line-height:1;max-width:100%;font-size:1em}.frac .whole{margin-right:.12em;align-self:center}.frac .stack{display:inline-flex;flex-direction:column;align-items:center;min-width:1.15em;line-height:1}.frac .num,.frac .den{display:block;padding:0 .12em;text-align:center;font-size:.75em;line-height:1.05}.frac .bar{display:block;align-self:stretch;border-top:1.5px solid currentColor;margin:.06em 0}.frac+ruby,ruby+.frac{margin-left:.06em}.big:has(.frac){display:flex;align-items:center;justify-content:center;gap:.12em;flex-wrap:wrap}.big:has(.frac) .frac{vertical-align:middle}@media(max-width:375px){.frac{font-size:.94em}}`;
  function pictureSVG(data, doc) {
    doc=doc||root.document; if(!data||!["tapes","cups","line"].includes(data.kind)) return null;
    const svg=doc.createElementNS(SVG,"svg"); svg.setAttribute("viewBox","0 0 320 100"); svg.setAttribute("role","img"); svg.setAttribute("style","display:block;width:min(100%,320px);height:auto;margin:0 auto 8px");
    const add=(tag,attrs,parent=svg)=>{ const e=doc.createElementNS(SVG,tag); for(const k in attrs)e.setAttribute(k,attrs[k]); parent.appendChild(e); return e; };
    if(data.kind==="tapes") { svg.setAttribute("aria-label","あおと あかの テープ"); for(const [i,n,color] of [[0,data.blue,"#3979e5"],[1,data.red,"#e35a56"]]) {const count=Math.min(9,+n), y=12+i*49; add("rect",{x:28,y,width:Math.max(20,count*26),height:30,rx:5,fill:color,stroke:"#243447","stroke-width":2}); if(data.segmented) for(let j=1;j<count;j++) add("line",{x1:28+j*26,y1:y,x2:28+j*26,y2:y+30,stroke:"#fff","stroke-width":2}); add("text",{x:4,y:34+i*49,fill:"#fff","font-size":17,"font-weight":700}).textContent=i?"あか":"あお";} }
    if(data.kind==="cups") { svg.setAttribute("aria-label","あおと あかの コップ"); for(const [i,n,color] of [[0,data.blue,"#3979e5"],[1,data.red,"#e35a56"]]) {add("text",{x:2,y:37+i*52,fill:"#fff","font-size":16,"font-weight":700}).textContent=i?"あか":"あお"; for(let j=0;j<Math.min(9,+n);j++) add("path",{d:`M ${32+j*31} ${14+i*52} h 24 l -4 30 h -16 z`,fill:color,stroke:"#243447","stroke-width":1});} }
    if(data.kind==="line") { const count=Math.max(1,Math.min(10,+data.count||1)); svg.setAttribute("aria-label","ひだりが まえ、みぎが うしろの "+count+"にんの れつ"); add("text",{x:4,y:99,fill:"#fff","font-size":17,"font-weight":700}).textContent="まえ"; add("text",{x:316,y:99,fill:"#fff","font-size":17,"font-weight":700,"text-anchor":"end"}).textContent="うしろ"; for(let i=0;i<count;i++){ const x=18+i*30; add("circle",{cx:x,cy:34,r:11,fill:i+1===data.target?"#f6c44f":"#8fc9e9",stroke:"#243447"}); add("path",{d:`M ${x-13} 78 v -22 q 0 -10 13 -10 q 13 0 13 10 v 22 z`,fill:i+1===data.target?"#f6c44f":"#8fc9e9",stroke:"#243447"});} }
    return svg;
  }
  function fracNodes(text, doc) {
    doc = doc || root.document;
    const frag = doc.createDocumentFragment();
    text = String(text == null ? "" : text);
    // Treat ruby annotations and URL-like runs as opaque. A fraction requires
    // boundaries: no adjacent ASCII word/slash/dot, and no Japanese time suffix.
    const parts = text.split(/(https?:\/\/[^\s]+|www\.[^\s]+|[^\s《》]*《[^》]*》)/g);
    for (const part of parts) {
      if (!part) continue;
      if (/^(?:https?:\/\/|www\.)/.test(part) || part.includes("《")) { frag.appendChild(doc.createTextNode(part)); continue; }
      const re = /(\d+と)?(\d+)\/(\d+)/g;
      let last = 0, match;
      while ((match = re.exec(part))) {
        const before = part[match.index - 1] || "", after = part[re.lastIndex] || "";
        if (/[\w/.]/.test(before) || /[\w/.じ時日月年]/.test(after) || Number(match[3]) === 0) continue;
        frag.appendChild(doc.createTextNode(part.slice(last, match.index)));
        const outer = doc.createElement("span"); outer.className = "frac";
        const whole = match[1] ? match[1].slice(0, -1) : "";
        if (whole) { const el = doc.createElement("span"); el.className = "whole"; el.textContent = whole; outer.appendChild(el); }
        const stack = doc.createElement("span"); stack.className = "stack";
        for (const [cls, value] of [["num", match[2]], ["bar", ""], ["den", match[3]]]) {
          const el = doc.createElement("span"); el.className = cls; el.textContent = value; stack.appendChild(el);
        }
        outer.appendChild(stack);
        outer.setAttribute("role", "img"); outer.setAttribute("aria-label", (whole ? whole + "と" : "") + match[3] + "ぶんの" + match[2]);
        frag.appendChild(outer); last = re.lastIndex;
      }
      frag.appendChild(doc.createTextNode(part.slice(last)));
    }
    return frag;
  }
  function clockSVG(h, m, opts) {
    opts = opts || {}; const doc = opts.doc || root.document;
    h = Number(h); m = Number(m);
    if (!Number.isInteger(h) || h < 1 || h > 12 || !Number.isInteger(m) || m < 0 || m > 59) return null;
    const size = Math.max(80, Math.min(600, Number(opts.size) || 160));
    const svg = doc.createElementNS(SVG, "svg");
    function add(tag, attrs, content) { const el = doc.createElementNS(SVG, tag); for (const k in attrs) el.setAttribute(k, attrs[k]); if (content != null) el.textContent = content; svg.appendChild(el); return el; }
    svg.setAttribute("viewBox", "0 0 200 200"); svg.setAttribute("width", size); svg.setAttribute("height", size);
    svg.setAttribute("role", "img"); svg.setAttribute("aria-label", h + "じ" + m + "ぷん");
    svg.setAttribute("style", "display:block;max-width:100%;height:auto;color:var(--ink,#243447)");
    add("circle", {cx:100,cy:100,r:94,fill:"var(--paper,#fff)",stroke:"var(--ink,#243447)","stroke-width":4});
    for (let n=1;n<=12;n++) { const a=(n*30-90)*Math.PI/180; add("text",{x:100+75*Math.cos(a),y:100+75*Math.sin(a),"text-anchor":"middle","dominant-baseline":"central",fill:"var(--ink,#243447)","font-size":19,"font-family":"sans-serif","font-weight":700},n); }
    function hand(deg,length,width,color) { const a=(deg-90)*Math.PI/180; add("line",{x1:100,y1:100,x2:100+length*Math.cos(a),y2:100+length*Math.sin(a),stroke:color,"stroke-width":width,"stroke-linecap":"round"}); }
    hand((h%12+m/60)*30,49,8,"var(--ink,#243447)"); hand(m*6,68,5,"var(--accent,var(--ink,#243447))");
    add("circle",{cx:100,cy:100,r:5,fill:"var(--ink,#243447)"}); return svg;
  }
  function parseClockQ(q) {
    q = String(q == null ? "" : q).replace(/《[^》]*》/g, "");
    const short = q.match(/みじかい\s*はりが\s*(1[0-2]|[1-9])(?:と(1[0-2]|[1-9])の\s*あいだ)?/);
    const long = q.match(/ながい\s*はりが\s*(1[0-2]|[1-9])/);
    if (!short || !long) return null;
    const h=Number(short[1]), mark=Number(long[1]);
    if (short[2] && Number(short[2]) !== h%12+1) return null;
    const fine = /なんじ\s*なんぷん/.test(q), half = /なんじ\s*はん/.test(q);
    if (!fine && mark !== 6 && mark !== 12) return null;
    if (half && mark !== 6) return null;
    if (short[2] && mark === 12) return null;
    if (!short[2] && mark !== 12) return null;
    return {h, m:mark === 12 ? 0 : mark*5};
  }
  root.MH_MATHVIEW = {fracNodes, css, clockSVG, parseClockQ, pictureSVG};
})(typeof window !== "undefined" ? window : globalThis);
