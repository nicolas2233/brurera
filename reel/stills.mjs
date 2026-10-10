import { chromium } from 'playwright';
import path from 'node:path';
const outDir = process.argv[2]; const times = process.argv.slice(3).map(Number);
const b = await chromium.launch(); const p = await b.newPage({ viewport:{width:1080,height:1920} });
await p.goto('file://'+path.resolve('reel.html')+'#render'); await p.evaluate(()=>window.ready);
console.log('total', await p.evaluate(()=>window.TOTAL));
for (const t of times){ await p.evaluate(t=>seek(t),t); await p.screenshot({path:`${outDir}/s_${t}.png`}); }
await b.close();
