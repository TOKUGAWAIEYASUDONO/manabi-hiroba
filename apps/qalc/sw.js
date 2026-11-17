/* Qalc は まなびひろば の けいさん スプリントに合体しました。前のサービスワーカーを止めるための版。 */
self.addEventListener("install",()=>self.skipWaiting());
self.addEventListener("activate",e=>{e.waitUntil((async()=>{
  try{const ks=await caches.keys();await Promise.all(ks.filter(k=>k.indexOf("qalc-cache-")===0).map(k=>caches.delete(k)));}catch(_){}
  await self.registration.unregister();
  const cs=await self.clients.matchAll({type:"window"});cs.forEach(c=>{try{c.navigate("../../index.html#units?kid=1&subj=sansu")}catch(_){}});
})())});
