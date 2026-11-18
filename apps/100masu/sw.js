const o = "square100-", f = "v310e758d1e80", u = o + "static-" + f, h = o + "runtime-" + f, w = [...new Set(([{"revision":"340e369078d394568f2ef95d51333b96","url":"terms.html"},{"revision":"84487e4cfb3ad8cb9e06fe75673cb0fe","url":"records-hub-client.js"},{"revision":"c5fa069f4d6d2c8ab1ad236ffc73d9b7","url":"records-export.js"},{"revision":"02e422f5ad44dcad1936d8051d1d116f","url":"records-export.html"},{"revision":"2874328b461798560818e1b3a2c8cb5e","url":"pwa-maskable-512x512.png"},{"revision":"0ea20fa7b500a711864b3f05f3554c64","url":"pwa-maskable-192x192.png"},{"revision":"6aaac60327fcc0e9ebf166d3da224a33","url":"pwa-512x512.png"},{"revision":"50a97893f2611774c6956804c01b1634","url":"pwa-192x192.png"},{"revision":"fdf7d83ee1ca0dce1062652ae1889315","url":"privacy.html"},{"revision":"7a9e9d54c11140ade64416aa6e7c7c5c","url":"offline.html"},{"revision":"f642115ceb1c4ebe747dea3150bc16d1","url":"model.json"},{"revision":"04e8e07d7e39600596fd2c85643b1ed1","url":"install-hook.js"},{"revision":"3615b19519d29640699e9e50807637f5","url":"index.html"},{"revision":"168c08d80c84f1f05504deefceec2edb","url":"group1-shard1of1.bin"},{"revision":"ec62fd720b58d28d1d368b5c2be4f92d","url":"giga-app-links.js"},{"revision":"e33d2a6282b2d7208724c73a17a0207d","url":"favicon.png"},{"revision":"3a32752ac39a55518d5a3bbb967a835e","url":"apple-touch-icon.png"},{"revision":null,"url":"assets/index-f8402591.js"},{"revision":null,"url":"assets/index-f0d3184f.css"},{"revision":null,"url":"assets/helpers-de833af9.js"},{"revision":"e33d2a6282b2d7208724c73a17a0207d","url":"favicon.png"},{"revision":"3a32752ac39a55518d5a3bbb967a835e","url":"apple-touch-icon.png"},{"revision":"04e8e07d7e39600596fd2c85643b1ed1","url":"install-hook.js"},{"revision":"7a9e9d54c11140ade64416aa6e7c7c5c","url":"offline.html"},{"revision":"02e422f5ad44dcad1936d8051d1d116f","url":"records-export.html"},{"revision":"c5fa069f4d6d2c8ab1ad236ffc73d9b7","url":"records-export.js"},{"revision":"50a97893f2611774c6956804c01b1634","url":"pwa-192x192.png"},{"revision":"6aaac60327fcc0e9ebf166d3da224a33","url":"pwa-512x512.png"},{"revision":"0ea20fa7b500a711864b3f05f3554c64","url":"pwa-maskable-192x192.png"},{"revision":"2874328b461798560818e1b3a2c8cb5e","url":"pwa-maskable-512x512.png"},{"revision":"070252ee2572f7e972c3d589aa24a4bf","url":"manifest.webmanifest"}] || []).map(
  (c) => typeof c == "string" ? c : c.url
))], m = 3e3;
self.addEventListener("install", (c) => c.waitUntil((async () => {
  const t = await caches.open(u);
  await Promise.all(w.map((e) => t.add(new Request(e, { cache: "reload" })).catch((n) => console.warn("[sw] precache skipped", e, n))));
})()));
self.addEventListener("activate", (c) => c.waitUntil((async () => {
  const t = await caches.keys();
  await Promise.all(t.filter((e) => e.startsWith(o) && e !== u && e !== h).map((e) => caches.delete(e))), await self.clients.claim();
})()));
self.addEventListener("fetch", (c) => {
  const t = c.request;
  if (t.method !== "GET")
    return;
  let e;
  try {
    e = new URL(t.url);
  } catch {
    return;
  }
  if (e.origin === self.location.origin) {
    if (t.mode === "navigate") {
      c.respondWith((async () => {
        const n = async () => {
          const i = await caches.match(t, { ignoreSearch: !0 });
          if (i)
            return i;
          const l = new URL("./", self.location.href).pathname;
          if (e.pathname === l || e.pathname === `${l}index.html`)
            return caches.match("./index.html");
        }, a = fetch(t);
        a.catch(() => {
        });
        let s;
        const r = new Promise((i) => {
          s = setTimeout(() => i(null), m);
        });
        try {
          const i = await Promise.race([a, r]);
          return i || await n() || await a;
        } catch {
          return await n() || await caches.match("./offline.html") || Response.error();
        } finally {
          clearTimeout(s);
        }
      })());
      return;
    }
    c.respondWith((async () => {
      const n = await caches.match(t);
      if (n)
        return n;
      try {
        const a = await fetch(t);
        if (a && a.ok && a.type === "basic") {
          const s = a.clone();
          caches.open(h).then((r) => r.put(t, s));
        }
        return a;
      } catch {
        return await caches.match("./offline.html") || Response.error();
      }
    })());
  }
});
self.addEventListener("message", (c) => {
  const t = c.data;
  t && (t.type === "SKIP_WAITING" && self.skipWaiting(), t.type === "CACHE_URLS" && Array.isArray(t.urls) && c.waitUntil((async () => {
    const e = await caches.open(h);
    for (const n of t.urls.slice(0, 40))
      try {
        const a = new URL(n, self.location.href);
        if (a.origin !== self.location.origin || await caches.match(a.href))
          continue;
        const s = await fetch(a.href);
        s.ok && s.type === "basic" && await e.put(a.href, s);
      } catch {
      }
  })()));
});
