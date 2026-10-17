// THE SONG — every sound from the score -> out/music.wav
const path = require('path');
const { SR, Bus, reverb, pingpong } = require('./engine/audio/dsp');
const I = require('./engine/audio/instruments');
const MIX = require('./engine/audio/mix');
const Genre = require('./engine/audio/genres');
const sc = require('./score');
const { T, BEAT, DURATION, m, ev, clock } = sc;

const N = Math.ceil(DURATION * SR);
const bus = () => new Bus(N);
const drums = bus(), bass = bus(), pad = bus(), keys = bus(), brass = bus(), fx = bus(), verb = bus(), dly = bus();

// backing: afrobeats groove from the very first frame (hook), then again on the drop
const k1 = Genre.play('afrobeats', { clock, from: 0, to: 8, chordAt: sc.chordAt, buses: { drums, bass, pad, keys } }).kicks;
const k2 = Genre.play('afrobeats', { clock, from: 8, to: 10, chordAt: sc.chordAt, buses: { drums, bass, pad, keys }, gain: 1.15 }).kicks;
const kicks = [...k1, ...k2];
const K = I.kick({ punch: 1.3, tail: 0.4 }), CR = I.crash(18), CL = I.clap({ spread: 1.2 });
// extra four-on-the-floor in the drop
for (let b = 8; b < 10; b++) for (let q = 0; q < 4; q++) { drums.addMono(K, T(b, q), 0.6); kicks.push(T(b, q)); }

// stamps: big hits on ¡HOY! and the date
drums.addMono(K, ev.hoy, 0.9); drums.addMono(CR, ev.hoy, 0.3, -0.2);
fx.addMono(I.thwack(), ev.hoy, 0.5);
fx.addMono(I.thwack(), ev.fecha, 0.45); drums.addMono(CL, ev.fecha, 0.4);

// the cart: rolling rattle, then a bell + thud when it stops
fx.addMono(I.noiseSweep(ev.cartStop - ev.cartIn, 600, 1800, { q: 1.4, pink: true }), ev.cartIn, 0.12);
for (let i = 0; i < 8; i++) fx.addMono(I.woodTick(1 + (i % 2) * 0.2), ev.cartIn + i * BEAT / 2, 0.18, -0.3);
fx.addMono(I.thud(90, 0.1), ev.cartStop, 0.55);
fx.addMono(I.bell(1568, 0.9, 2, 2.8), ev.cartStop, 0.25);
fx.addMono(I.bell(2093, 0.9, 2, 2.8), ev.cartStop + BEAT / 2, 0.18);

// the pin: falling whistle then a pop on landing
fx.addMono(I.noiseSweep(0.45, 3000, 500, { q: 1, pink: true }), ev.pin - 0.45, 0.25);
fx.addMono(I.pop(1.2), ev.pin, 0.5); fx.addMono(I.thud(70, 0.08), ev.pin, 0.5);
fx.addMono(I.paperFwip(1.0, 3), ev.parque - 0.02, 0.3, -0.2);
fx.addMono(I.thwack(), ev.centenario, 0.4); drums.addMono(CL, ev.centenario, 0.35);

// clock ticks: wood tick + a rising marimba note each hour
fx.addMono(I.paperFwip(0.8, 5), ev.clockIn - 0.02, 0.25);
for (const n of sc.tickNotes) {
  fx.addMono(I.woodTick(1.6), n.t, 0.4);
  const x = I.marimba(n.midi + 12, { thock: 0.3 }); keys.addMono(x, n.t, 0.5); verb.addMono(x, n.t, 0.2);
}
fx.addMono(I.bell(1760, 1.2, 2, 2.8), ev.ticks[5], 0.35); // ding at 18 hs

// marimba hook
for (const n of sc.lead) { const x = I.marimba(n.midi, { thock: 0.1 }); keys.addMono(x, n.t, 0.42, 0.1); verb.addMono(x, n.t, 0.15); dly.addMono(x, n.t, 0.05); }

// riser into the breath, silence, then the drop
fx.addMono(I.noiseSweep(ev.breath - T(6), 300, 7000, { q: 0.9, shape: (x) => x * x, pink: true }), T(6), 0.3);
fx.addMono(I.subBoom(2.2), ev.drop, 0.7);
drums.addMono(K, ev.drop, 1); drums.addMono(CR, ev.drop, 0.45, 0.2);
for (const n of sc.brass) {
  const a = I.brassNote(n.midi, n.dur * 0.9), b = I.brassNote(n.midi - 12, n.dur * 0.9, { bright: 0.8, seed: 9 });
  brass.addStereo(a.L, a.R, n.t, 0.3); brass.addStereo(b.L, b.R, n.t, 0.15); verb.addStereo(a.L, a.R, n.t, 0.1);
}
// outro: pad + music box, crash
drums.addMono(CR, ev.outro, 0.3, -0.2); drums.addMono(K, ev.outro, 0.8);
for (const c of sc.chords.filter((c) => c.t0 >= ev.outro - 0.01)) for (const nn of c.notes) { const p = I.padNote(nn, DURATION - c.t0, { cutoff: 1800, attack: 0.05, release: 1.2 }); pad.addStereo(p.L, p.R, c.t0, 0.1); }
for (const n of placeBar_(sc.HOOK.end, 10)) { const mb = I.musicBox(n.midi + 12); keys.addMono(mb, n.t, 0.12); verb.addMono(mb, n.t, 0.2); }
function placeBar_(bar8, b) { return require('./engine/music').placeBar(clock, bar8, b); }
fx.addMono(I.pop(1.5), ev.outro, 0.4);

MIX.sidechain([pad, bass], kicks.filter((t) => t >= ev.drop && t < ev.outro));
const stems = { drums, bass, pad, keys, brass, fx, verb: reverb(verb, { room: 0.8, damp: 0.35 }), dly: pingpong(dly, BEAT * 0.75, 0.35, 3500) };
const GAIN = { drums: 0.55, bass: 0.8, pad: 1.4, keys: 0.95, brass: 1.8, fx: 0.9, verb: 1, dly: 1 };
const out = path.join(__dirname, 'out');
const mix = MIX.mixdown(stems, GAIN, { stemDir: process.env.STEMS ? out : null });
MIX.highpass(mix, 22);
MIX.gate(mix, ev.breath, ev.drop);
MIX.fadeOut(mix, DURATION - 1.2, DURATION);
const M = MIX.master(mix, 0.8, undefined, { lufs: parseFloat(process.env.LUFS || '-13') });
MIX.writeWav(path.join(out, 'music.wav'), mix);
console.log(`wrote out/music.wav (${DURATION.toFixed(2)}s, ${M.lufs.toFixed(1)} LUFS)`);
