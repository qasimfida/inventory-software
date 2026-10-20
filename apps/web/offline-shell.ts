import type { Plugin } from 'vite';
import { createHash } from 'node:crypto';
export function offlineShell(): Plugin {
  return {
    name: 'offline-shell',
    apply: 'build',
    generateBundle(options, bundle) {
      void options;
      const files = [
        './',
        ...Object.keys(bundle)
          .filter((n) => /\.(js|css|svg|woff2)$/.test(n))
          .map((n) => './' + n),
      ];
      const version = createHash('sha256')
        .update(
          JSON.stringify(
            Object.values(bundle).map((b) => (b.type === 'chunk' ? b.code : String(b.source))),
          ),
        )
        .digest('hex')
        .slice(0, 16);
      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source: `const CACHE='inventory-shell-${version}',FILES=${JSON.stringify(files)};
 self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES))));
 self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('inventory-shell-')&&k!==CACHE).map(k=>caches.delete(k))))));
 self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==self.location.origin)return;const match=FILES.find(f=>new URL(f,self.registration.scope).href===u.href);if(!match&&e.request.mode!=='navigate')return;e.respondWith(caches.open(CACHE).then(async c=>(await c.match(match?e.request.url:new URL('./',self.registration.scope).href,{ignoreVary:true}))||fetch(e.request)));});`,
      });
    },
  };
}
