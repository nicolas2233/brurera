import { chromium } from 'playwright';
import { serve, launchArgs } from './shot.mjs';
const [outDir, t, ...cfgs] = process.argv.slice(2);
const srv = await serve(process.cwd(), 8767);
const b = await chromium.launch(launchArgs); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
p.on('pageerror', e => { console.log('[err]', e.message); process.exit(1); });
await p.goto('http://localhost:8767/index.html#render'); await p.waitForFunction(() => window.done, null, { timeout: 300000 });
for (const c of cfgs) { await p.evaluate(([c, t]) => { Object.assign(window.cfg, JSON.parse(c)); window.seek(+t); }, [c, t]); await p.screenshot({ path: `${outDir}/d_${cfgs.indexOf(c)}.png` }); }
await b.close(); srv.close();
