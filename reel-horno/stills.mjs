import { chromium } from 'playwright';
import { serve, launchArgs } from './shot.mjs';
const [outDir, ...ts] = process.argv.slice(2);
const srv = await serve(process.cwd(), 8766);
const b = await chromium.launch(launchArgs); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
p.on('pageerror', e => { console.log('[err]', e.message); process.exit(1); }); p.on('console', m => m.type() === 'error' && console.log('[console]', m.text()));
await p.goto('http://localhost:8766/index.html#render'); await p.waitForFunction(() => window.done, null, { timeout: 300000 });
for (const t of ts) { const t0 = Date.now(); await p.evaluate(t => window.seek(+t), t); await p.screenshot({ path: `${outDir}/f_${t}.png` }); console.log(t, Date.now() - t0, 'ms'); }
await b.close(); srv.close();
