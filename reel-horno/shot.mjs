import { chromium } from 'playwright';
import { createServer } from 'node:http'; import { readFile } from 'node:fs/promises'; import path from 'node:path';
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.svg':'image/svg+xml','.ttf':'font/ttf','.png':'image/png','.json':'application/json'};
export function serve(root, port=8765){ return new Promise(res=>{ const s=createServer(async(q,r)=>{ try{ const f=path.join(root,decodeURIComponent(q.url.split('?')[0].split('#')[0])); r.writeHead(200,{'content-type':types[path.extname(f)]||'application/octet-stream'}); r.end(await readFile(f)); }catch{ r.writeHead(404); r.end(); } }).listen(port,()=>res(s)); }); }
export const launchArgs={args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']};
if (import.meta.url === `file://${process.argv[1]}`) {
  const [page_, out] = process.argv.slice(2);
  const srv = await serve(process.cwd());
  const b = await chromium.launch(launchArgs); const p = await b.newPage({viewport:{width:1080,height:1920}});
  p.on('console', m => console.log('[page]', m.text())); p.on('pageerror', e => { console.log('[err]', e.message); process.exit(1); });
  const t0=Date.now(); await p.goto('http://localhost:8765/'+page_); await p.waitForFunction(()=>window.done,null,{timeout:120000});
  console.log('render ms', Date.now()-t0); await p.screenshot({path:out}); await b.close(); srv.close();
}
