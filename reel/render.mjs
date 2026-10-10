// Renders reel.html frame-by-frame and encodes a 1080x1920 MP4 with ffmpeg.
// usage: node render.mjs [out.mp4] [fps]
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import path from 'node:path';

const out = process.argv[2] || 'dubrera-reel.mp4';
const fps = +(process.argv[3] || 30);
const html = 'file://' + path.resolve('reel.html') + '#render';

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
await page.goto(html);
await page.evaluate(() => window.ready);
const total = await page.evaluate(() => window.TOTAL);
const frames = Math.round(total * fps);

const ff = spawn('ffmpeg', ['-y', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-',
  '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo', '-shortest',
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
  '-c:a', 'aac', out], { stdio: ['pipe', 'inherit', 'inherit'] });

for (let i = 0; i < frames; i++) {
  await page.evaluate(t => window.seek(t), i / fps);
  const buf = await page.screenshot({ type: 'png' });
  if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
  if (i % 60 === 0) console.error(`frame ${i}/${frames}`);
}
ff.stdin.end();
await new Promise(r => ff.on('close', r));
await browser.close();
console.error('done ->', out);
