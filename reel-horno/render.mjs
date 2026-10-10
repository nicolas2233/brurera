// Frame-by-frame render of index.html -> MP4 (1080x1920, 30fps) with the SFX track.
// usage: node render.mjs [out.mp4] [workers]
import { chromium } from 'playwright';
import { spawnSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { serve, launchArgs } from './shot.mjs';

const out = process.argv[2] || 'dubrera-horno.mp4';
const workers = +(process.argv[3] || 3), fps = 30;
const dir = process.env.FRAMES_DIR || 'frames';
rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
const srv = await serve(process.cwd(), 8770);

async function worker(w) {
  const b = await chromium.launch(launchArgs);
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  p.on('pageerror', e => { console.error('[err]', e.message); process.exit(1); });
  await p.goto('http://localhost:8770/index.html#render');
  await p.waitForFunction(() => window.done, null, { timeout: 300000 });
  const total = Math.round(await p.evaluate(() => window.TOTAL) * fps);
  for (let i = w; i < total; i += workers) {
    await p.evaluate(t => window.seek(t), i / fps);
    await p.screenshot({ path: `${dir}/${String(i).padStart(5, '0')}.jpg`, type: 'jpeg', quality: 94 });
    if (i % 60 < workers) console.error(`frame ${i}/${total}`);
  }
  await b.close();
}
await Promise.all(Array.from({ length: workers }, (_, w) => worker(w)));
srv.close();
const r = spawnSync('ffmpeg', ['-y', '-v', 'error', '-framerate', String(fps), '-i', `${dir}/%05d.jpg`, '-i', 'sfx.wav',
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
  '-c:a', 'aac', '-b:a', '192k', '-shortest', out], { stdio: 'inherit' });
console.error(r.status === 0 ? `done -> ${out}` : 'ffmpeg failed');
