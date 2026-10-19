const CACHE='shear-v1.0.0';
const APP=['./','./index.html','./styles.css','./app.js','./manifest.webmanifest','./icons/icon.svg','./icons/icon-192.png','./icons/icon-512.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(c=>c.addAll(APP)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil((async()=>{await Promise.all((await caches.keys()).filter(k=>k.startsWith('shear-')&&k!==CACHE).map(k=>caches.delete(k)));await self.clients.claim()})()));
self.addEventListener('fetch',event=>{if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;event.respondWith((async()=>{try{const res=await fetch(event.request);if(res&&res.ok){const cache=await caches.open(CACHE);cache.put(event.request,res.clone())}return res}catch(e){return await caches.match(event.request)||await caches.match('./index.html')||Response.error()}})())});
