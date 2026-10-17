// THE FILM — Dubrera en el Parque Centenario. Every frame is a pure function of t.
(function () {
  const U = globalThis.U, G = globalThis.G, S = globalThis.SCORE, Studio = globalThis.Studio, Data = globalThis.Data;
  const { BEAT, ev, clock, T } = S;
  const { clamp, lerp, ease, pulse } = U;
  const W = G.W, H = G.H, SF = G.SAFE;
  const CX = SF.x + SF.w / 2; // centre of the safe area (the right edge is reserved for the app UI)
  const C = { green: '#3b473c', green2: '#56705a', cream: '#f7ecd3', gold: '#e0ad4c', gold2: '#f3d58e', terra: '#c8643b', ink: '#2a2118', crust: '#d98b33', crust2: '#a65a1c', sky: '#9fd8f2', grass: '#7cbf5a' };
  const hop = (t, amp) => amp * Math.sin(Math.PI * clock.phase(t));
  const since = (t, t0) => t - t0;
  const pop = (t, t0, d = 0.32) => ease.outBack(clamp((t - t0) / d), 2.4);

  // ---------- text helpers ----------
  function stamp(ctx, str, x, y, t, t0, o = {}) {
    if (t < t0) return;
    const p = clamp((t - t0) / 0.22), sc = lerp(o.from ?? 2.4, 1, ease.outBack(p, 1.6));
    ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot ?? -0.04); ctx.scale(sc, sc);
    G.text(ctx, str, 0, 0, { size: o.size || 120, fam: o.fam || 'Anton', weight: 400, color: o.color || C.cream, align: 'center', stroke: o.stroke ?? C.ink, strokeW: o.strokeW ?? (o.size || 120) * 0.09, alpha: Math.min(1, p * 3) });
    ctx.restore();
  }

  // ---------- characters & props ----------
  function croissantGuy(ctx, x, y, s, o = {}) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot || 0); ctx.scale(s * (o.sx || 1), s * (o.sy || 1));
    // legs + feet
    for (const d of [-1, 1]) {
      const kick = (o.kick || 0) * d;
      G.line(ctx, [[d * 22, -40], [d * 26 + kick * 10, -6]], { color: C.ink, lw: 7, seed: 3 + d });
      G.ellipse(ctx, d * 32 + kick * 10, -4, 16, 8, { fill: C.ink, lw: 3, seed: 5 + d });
    }
    // arms
    const aL = o.armL ?? 0.3, aR = o.armR ?? 0.3;
    G.line(ctx, [[-70, -95], [-70 - Math.cos(aL) * 46, -95 - Math.sin(aL) * 46]], { color: C.ink, lw: 7, seed: 7 });
    G.line(ctx, [[70, -95], [70 + Math.cos(aR) * 46, -95 - Math.sin(aR) * 46]], { color: C.ink, lw: 7, seed: 8 });
    // crescent of rolled segments, tips first so the centre sits on top
    for (const i of [-2, 2, -1, 1, 0]) {
      const a = Math.abs(i);
      const cx = i * 44, cy = -92 + a * a * 9, rx = 44 - a * 9, ry = 54 - a * 12;
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(i * 0.28);
      G.ellipse(ctx, 0, 0, rx, ry, { fill: a === 2 ? C.crust2 : a === 1 ? '#c7782a' : C.crust, lw: 5, stroke: '#5e3412', seed: 20 + i, hatch: { color: 'rgba(90,45,10,0.18)', gap: 9 } });
      G.line(ctx, [[-rx * 0.5, -ry * 0.55], [rx * 0.1, -ry * 0.75]], { color: 'rgba(255,230,170,0.7)', lw: 5, seed: 30 + i });
      ctx.restore();
    }
    // face
    const e = o.eyes || 'normal';
    for (const d of [-1, 1]) {
      if (e === 'happy') G.line(ctx, [[d * 16 - 9, -112], [d * 16, -120], [d * 16 + 9, -112]], { color: C.ink, lw: 5, seed: 40 + d });
      else { G.ellipse(ctx, d * 16, -114, 10, e === 'wide' ? 14 : 11, { fill: '#fff', lw: 3, seed: 41 + d }); G.ellipse(ctx, d * 16 + (o.look || 0) * 3, -112, 5, 6, { fill: C.ink, lw: 0, seed: 43 + d }); }
      G.ellipse(ctx, d * 28, -96, 8, 5, { fill: 'rgba(230,100,80,0.5)', lw: 0, seed: 45 + d });
    }
    if (o.mouth === 'open') G.ellipse(ctx, 0, -92, 11, 12, { fill: '#6b1f12', lw: 4, seed: 47 });
    else G.line(ctx, [[-12, -96], [0, -88], [12, -96]], { color: C.ink, lw: 5, seed: 48 });
    ctx.restore();
  }
  function miniCroissant(ctx, x, y, s, rot) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
    for (const i of [-2, 2, -1, 1, 0]) { const a = Math.abs(i); G.ellipse(ctx, i * 12, a * a * 3, 13 - a * 2.5, 16 - a * 3.5, { fill: a === 2 ? C.crust2 : C.crust, lw: 3, stroke: '#5e3412', seed: 60 + i }); }
    ctx.restore();
  }
  function cart(ctx, x, y, s, wheel, t) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    // poles + striped awning
    G.line(ctx, [[-190, -150], [-190, -430]], { color: C.ink, lw: 9, seed: 70 }); G.line(ctx, [[190, -150], [190, -430]], { color: C.ink, lw: 9, seed: 71 });
    for (let k = 0; k < 8; k++) {
      const x0 = -230 + k * 57.5, wave = Math.sin(t * 6 + k) * 3;
      G.poly(ctx, [[x0, -470], [x0 + 57.5, -470], [x0 + 57.5, -400 + wave], [x0 + 28, -380 + wave], [x0, -400 + wave]], { fill: k % 2 ? C.cream : C.green, lw: 4, seed: 72 + k });
    }
    G.rrect(ctx, -240, -500, 480, 40, 14, { fill: C.green, lw: 5, seed: 80 });
    G.text(ctx, 'DUBRERA', 0, -468, { size: 34, fam: 'Cinzel', weight: 700, color: C.gold2, align: 'center' });
    // basket of croissants on the counter
    for (let k = 0; k < 7; k++) miniCroissant(ctx, -150 + k * 50, -168 - (k % 2) * 16, 1.4, (k % 3 - 1) * 0.25);
    // body
    G.rrect(ctx, -230, -160, 460, 150, 18, { fill: '#c99a5b', lw: 6, seed: 81, hatch: { color: 'rgba(90,50,20,0.2)', gap: 12, angle: 1.57 } });
    G.rrect(ctx, -150, -135, 300, 90, 12, { fill: C.cream, lw: 5, seed: 82 });
    G.text(ctx, 'panadería artesanal', 0, -78, { size: 34, fam: 'Caveat', weight: 700, color: C.green, align: 'center' });
    // wheels
    for (const d of [-1, 1]) {
      G.ellipse(ctx, d * 150, 0, 46, 46, { fill: C.ink, lw: 5, seed: 83 + d });
      G.ellipse(ctx, d * 150, 0, 30, 30, { fill: C.gold, lw: 4, seed: 85 + d });
      for (let k = 0; k < 3; k++) { const a = wheel + k * Math.PI / 3; G.line(ctx, [[d * 150 - Math.cos(a) * 28, -Math.sin(a) * 28], [d * 150 + Math.cos(a) * 28, Math.sin(a) * 28]], { color: C.ink, lw: 4, seed: 87 + k }); }
    }
    ctx.restore();
  }
  function tree(ctx, x, y, s, seed) {
    G.line(ctx, [[x, y], [x, y - 120 * s]], { color: '#6b4a2b', lw: 16 * s, seed });
    G.ellipse(ctx, x, y - 170 * s, 90 * s, 80 * s, { fill: '#4f9a45', lw: 5, seed: seed + 1, hatch: { color: 'rgba(0,60,0,0.18)', gap: 10 } });
    G.ellipse(ctx, x - 50 * s, y - 130 * s, 60 * s, 50 * s, { fill: '#5aab4d', lw: 5, seed: seed + 2 });
    G.ellipse(ctx, x + 55 * s, y - 135 * s, 58 * s, 50 * s, { fill: '#5aab4d', lw: 5, seed: seed + 3 });
  }
  function logo(ctx, x, y, r, t, t0) {
    const p = pop(t, t0, 0.5); if (p <= 0) return;
    ctx.save(); ctx.translate(x, y); ctx.scale(p, p); ctx.rotate((1 - p) * -0.6);
    G.ellipse(ctx, 0, 0, r, r, { fill: '#2a332b', lw: 0, seed: 90 });
    G.ellipse(ctx, 0, 0, r * 0.96, r * 0.96, { fill: C.green2, lw: 0, seed: 91 });
    G.ellipse(ctx, 0, 0, r * 0.91, r * 0.91, { fill: 'none', stroke: '#d8bf7a', lw: r * 0.025, seed: 92 });
    ctx.strokeStyle = '#e7d39b'; ctx.lineWidth = r * 0.016;
    for (const dx of [-0.1, 0, 0.1]) { ctx.beginPath(); ctx.ellipse(dx * r, -r * 0.5, r * 0.08, r * 0.1, 0, 0, 7); ctx.stroke(); }
    ctx.beginPath(); ctx.ellipse(0, -r * 0.5, r * 0.26, r * 0.13, 0, 0, 7); ctx.stroke();
    for (const yy of [-0.23, 0.2]) { ctx.beginPath(); ctx.moveTo(-r * 0.86, yy * r); ctx.lineTo(r * 0.86, yy * r); ctx.stroke(); }
    G.text(ctx, 'DUBRERA', 0, r * 0.1, { size: r * 0.31, fam: 'Cinzel', weight: 700, color: '#f3e5bf', align: 'center', boil: 0 });
    G.text(ctx, 'PANADERÍA ARTESANAL', 0, r * 0.4, { size: r * 0.098, fam: 'Cinzel', weight: 700, color: '#f3e5bf', align: 'center', boil: 0 });
    ctx.restore();
  }

  // ---------- backgrounds ----------
  function sky(ctx, t, sunY) {
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#7cc9ee'); g.addColorStop(0.6, '#cdeaf2'); g.addColorStop(1, '#fdf0cf');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    G.rays(ctx, W * 0.78, sunY, { n: 14, r0: 120, r1: 260, color: 'rgba(255,214,90,0.55)', lw: 10, spin: t * 0.4 });
    G.ellipse(ctx, W * 0.78, sunY, 100, 100, { fill: '#ffd24a', lw: 6, seed: 1 });
    for (const [x, y, s] of [[160, 380, 1], [600, 300, 0.8]]) { const xx = (x + t * 25) % (W + 300) - 150; G.ellipse(ctx, xx, y, 110 * s, 40 * s, { fill: '#fff', lw: 4, seed: 2 }); G.ellipse(ctx, xx + 50 * s, y - 25 * s, 70 * s, 40 * s, { fill: '#fff', lw: 4, seed: 3 }); }
  }
  function ground(ctx, gy) {
    G.poly(ctx, [[-40, gy - 60], [300, gy - 120], [700, gy - 70], [1120, gy - 140], [1120, H + 40], [-40, H + 40]], { fill: '#68ad4c', lw: 5, seed: 10, hatch: { color: 'rgba(0,70,0,0.13)', gap: 10 } });
    G.poly(ctx, [[-40, gy], [1120, gy], [1120, H + 40], [-40, H + 40]], { fill: C.grass, lw: 5, seed: 11, hatch: { color: 'rgba(0,80,0,0.12)', gap: 9 } });
    G.poly(ctx, [[380, H + 40], [470, gy], [610, gy], [700, H + 40]], { fill: '#e8d6ad', lw: 4, seed: 12 });
  }

  // ---------- scenes ----------
  const GY = Math.round(H * 0.72);

  function sceneHoy(ctx, t) {
    sky(ctx, t, lerp(1100, 470, ease.outCubic(clamp(t / 1.2))));
    ground(ctx, GY);
    tree(ctx, 120, GY + 10, 1.1, 100); tree(ctx, 930, GY - 20, 0.9, 110);
    const b = Math.max(pulse(t, ev.hoy, 8), pulse(t, ev.fecha, 8));
    croissantGuy(ctx, CX, GY + 40 - hop(t, 60), 2.2, { eyes: t < ev.fecha ? 'wide' : 'happy', mouth: 'open', armL: 1.2 + 0.4 * Math.sin(t * 9), armR: 1.2 + 0.4 * Math.sin(t * 9 + 2), sy: 1 - 0.15 * b, sx: 1 + 0.1 * b, kick: Math.sin(t * 9) });
    stamp(ctx, '¡HOY!', CX, SF.y + 260, t, ev.hoy, { size: 300, color: '#fff3c4', rot: -0.06 });
    // date tag
    if (t >= ev.fecha) {
      const p = pop(t, ev.fecha, 0.3);
      ctx.save(); ctx.translate(CX, SF.y + 420); ctx.rotate(0.03); ctx.scale(p, p);
      G.rrect(ctx, -330, -70, 660, 130, 30, { fill: C.terra, lw: 6, seed: 120 });
      G.text(ctx, 'SÁBADO 17/10', 0, 30, { size: 96, fam: 'Anton', weight: 400, color: '#fff', align: 'center' });
      ctx.restore();
    }
  }

  function sceneCarrito(ctx, t) {
    sky(ctx, t, 470); ground(ctx, GY);
    tree(ctx, 110, GY - 10, 1.0, 130); tree(ctx, 960, GY - 30, 1.15, 140); tree(ctx, 760, GY - 60, 0.6, 150);
    const u = clamp((t - ev.cartIn) / (ev.cartStop - ev.cartIn));
    const x = lerp(-420, CX, ease.outCubic(u));
    const settle = t >= ev.cartStop ? Math.exp(-(t - ev.cartStop) * 7) * Math.sin((t - ev.cartStop) * 30) : 0;
    const bump = t < ev.cartStop ? Math.abs(Math.sin((t - ev.cartIn) * Math.PI * 4 / (BEAT * 2))) * 8 : 0;
    cart(ctx, x, GY + 150 - bump, 1.25, -x / 45, t);
    // the croissant rides on top of the awning, waves when the cart stops
    const st = t >= ev.cartStop;
    croissantGuy(ctx, x + 40 + settle * 10, GY + 150 - 1.25 * 500 - bump - (st ? hop(t, 40) : 0), 1.05, { eyes: st ? 'happy' : 'wide', mouth: 'open', armL: st ? 1.4 + 0.5 * Math.sin(t * 12) : 0.6, armR: st ? 0.3 : 0.6, rot: settle * 0.15 });
    if (t >= ev.cartStop) { const p = pop(t, ev.cartStop, 0.35); G.rays(ctx, x, GY - 180, { n: 12, r0: 330, r1: 420, color: `rgba(255,255,255,${0.8 * (1 - clamp((t - ev.cartStop) / 0.5))})`, lw: 8 }); }
    stamp(ctx, 'NOS VAMOS', CX, SF.y + 140, t, ev.cartIn + BEAT, { size: 140, color: '#fff', rot: -0.05 });
    stamp(ctx, 'DE PASEO', CX, SF.y + 290, t, ev.cartIn + BEAT * 2, { size: 140, color: C.gold2, rot: 0.04 });
  }

  function sceneParque(ctx, t) {
    // top-down park map: Parque Centenario is a big circle with a lake
    ctx.fillStyle = '#efe6d2'; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.strokeStyle = 'rgba(120,100,70,0.25)'; ctx.lineWidth = 26;
    for (let i = -2; i < 8; i++) { ctx.beginPath(); ctx.moveTo(i * 220 + 40, 0); ctx.lineTo(i * 220 - 260, H); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, i * 300 + 60); ctx.lineTo(W, i * 300 + 260); ctx.stroke(); }
    ctx.restore();
    const px = CX, py = H * 0.47, R = 360 * (1 + 0.03 * pulse(t, ev.pin, 6));
    G.ellipse(ctx, px, py, R + 26, R + 26, { fill: '#e2d3ae', lw: 6, seed: 200 });
    G.ellipse(ctx, px, py, R, R, { fill: '#79bb57', lw: 6, seed: 201, hatch: { color: 'rgba(0,80,0,0.15)', gap: 10 } });
    G.ellipse(ctx, px, py, R * 0.62, R * 0.62, { fill: 'none', stroke: '#e8d6ad', lw: 22, seed: 202 });
    G.shape(ctx, G.wobble(G.ellPts(px + 70, py + 40, 120, 80), 203, 14), { fill: '#7fc6e6', lw: 5, seed: 204 });
    for (let k = 0; k < 22; k++) { const a = k / 22 * Math.PI * 2 + 0.2, rr = R * (0.8 + 0.12 * Math.sin(k * 3)); G.ellipse(ctx, px + Math.cos(a) * rr, py + Math.sin(a) * rr, 26, 26, { fill: '#3f8a3a', lw: 4, seed: 210 + k }); }
    // the pin drops on the beat
    if (t >= ev.pin - 0.45) {
      const fall = clamp((t - (ev.pin - 0.45)) / 0.45), land = t >= ev.pin ? Math.exp(-(t - ev.pin) * 9) * Math.cos((t - ev.pin) * 35) : 0;
      const yy = lerp(-300, py - 60, ease.inQuad(fall));
      ctx.save(); ctx.translate(px - 60, yy); ctx.scale(1 + 0.25 * land, 1 - 0.25 * land);
      G.ellipse(ctx, 0, 6, 40 * fall, 12 * fall, { fill: 'rgba(0,0,0,0.25)', lw: 0, seed: 220 });
      G.shape(ctx, [[0, 0], [-58, -110], [-62, -160], [-40, -200], [0, -218], [40, -200], [62, -160], [58, -110]], { fill: C.terra, lw: 6, seed: 221, closed: true });
      G.ellipse(ctx, 0, -150, 26, 26, { fill: C.cream, lw: 5, seed: 222 });
      ctx.restore();
    }
    if (t >= ev.pin) G.rays(ctx, px - 60, py - 60, { n: 10, r0: 70, r1: 150, color: `rgba(200,100,59,${0.9 * (1 - clamp((t - ev.pin) / 0.45))})`, lw: 9 });
    croissantGuy(ctx, px + 150, py + 250 - hop(t, 35), 0.9, { eyes: 'happy', mouth: 'open', armL: 1.3, armR: 1.3 + 0.4 * Math.sin(t * 10) });
    stamp(ctx, 'PARQUE', CX, SF.y + 120, t, ev.parque, { size: 170, color: C.green, stroke: '#fff', rot: -0.04 });
    stamp(ctx, 'CENTENARIO', CX, H * 0.47 + R + 190, t, ev.centenario, { size: 150, color: C.terra, stroke: '#fff', rot: 0.03 });
  }

  function sceneReloj(ctx, t) {
    ctx.fillStyle = '#fbe6b2'; ctx.fillRect(0, 0, W, H);
    G.rays(ctx, CX, H * 0.44, { n: 18, r0: 0, r1: 1400, color: 'rgba(255,255,255,0.35)', lw: 40, spin: t * 0.2 });
    const cx = CX, cy = H * 0.44, R = 330 * pop(t, ev.clockIn, 0.4);
    if (R > 1) {
      G.ellipse(ctx, cx, cy, R + 24, R + 24, { fill: C.green, lw: 6, seed: 300 });
      G.ellipse(ctx, cx, cy, R, R, { fill: C.cream, lw: 5, seed: 301 });
      for (let h = 1; h <= 12; h++) { const a = h / 12 * Math.PI * 2 - Math.PI / 2; G.text(ctx, String(h), cx + Math.cos(a) * R * 0.8, cy + Math.sin(a) * R * 0.8 + R * 0.06, { size: R * 0.15, fam: 'Bungee', weight: 400, color: C.ink, align: 'center' }); }
      // hours passed: each tick snaps forward one hour with a spring
      let hrs = 0; for (const tk of ev.ticks) if (t >= tk) hrs += 1 - Math.exp(-(t - tk) * 22) * Math.cos((t - tk) * 40);
      // the lit slice of the afternoon (12 -> now)
      if (hrs > 0.01) { ctx.save(); ctx.fillStyle = 'rgba(224,173,76,0.45)'; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R * 0.68, -Math.PI / 2, -Math.PI / 2 + hrs / 12 * Math.PI * 2); ctx.closePath(); ctx.fill(); ctx.restore(); }
      const a = -Math.PI / 2 + hrs / 12 * Math.PI * 2;
      G.line(ctx, [[cx, cy], [cx + Math.cos(a) * R * 0.55, cy + Math.sin(a) * R * 0.55]], { color: C.ink, lw: 18, seed: 310 });
      const ma = -Math.PI / 2 + t * 9;
      G.line(ctx, [[cx, cy], [cx + Math.cos(ma) * R * 0.75, cy + Math.sin(ma) * R * 0.75]], { color: C.terra, lw: 9, seed: 311 });
      G.ellipse(ctx, cx, cy, 20, 20, { fill: C.ink, lw: 0, seed: 312 });
    }
    // digital readout above
    const shown = 12 + ev.ticks.filter((tk) => t >= tk).length;
    const last = [...ev.ticks].reverse().find((tk) => t >= tk) ?? ev.clockIn;
    stamp(ctx, `${shown}:00`, CX, SF.y + 140, t, last, { size: 150, from: 1.4, color: '#fff', rot: 0 });
    if (t >= ev.ticks[5]) {
      stamp(ctx, 'DE 12 A 18 HS', CX, H * 0.44 + 500, t, ev.ticks[5], { size: 150, color: C.terra, stroke: '#fff', rot: -0.03 });
    } else stamp(ctx, 'DESDE LAS 12', CX, H * 0.44 + 500, t, ev.clockIn + 0.1, { size: 110, color: C.green, stroke: '#fff', rot: -0.02 });
  }

  function sceneDrop(ctx, t) {
    ctx.fillStyle = C.green; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.translate(CX, H * 0.45); ctx.rotate((t - ev.drop) * 0.35);
    const pz = 0.5 + 0.25 * pulse(t, ev.drop + Math.floor((t - ev.drop) / BEAT) * BEAT, 7);
    for (let i = 0; i < 24; i++) { ctx.fillStyle = i % 2 ? `rgba(224,173,76,${pz})` : 'rgba(86,112,90,0.9)'; const a0 = i / 24 * Math.PI * 2, a1 = (i + 1) / 24 * Math.PI * 2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a0) * 2400, Math.sin(a0) * 2400); ctx.lineTo(Math.cos(a1) * 2400, Math.sin(a1) * 2400); ctx.fill(); }
    ctx.restore();
    // croissant rain
    for (let k = 0; k < 40; k++) {
      const h1 = U.hash(k, 1), h2 = U.hash(k, 2), h3 = U.hash(k, 3);
      const age = t - ev.drop - h2 * 1.4; if (age < 0) continue;
      const y = -100 + age * (500 + h3 * 400), x = 40 + h1 * (W - 80);
      if (y > H + 100) continue;
      miniCroissant(ctx, x, y, 1.6 + h3 * 1.4, age * (h1 - 0.5) * 6);
    }
    // invitation card
    const p = pop(t, ev.drop, 0.4);
    ctx.save(); ctx.translate(CX, H * 0.42); ctx.scale(p, p); ctx.rotate(-0.025);
    G.tornPaper(ctx, -400, -360, 800, 760, { fill: C.cream, seed: 400, shadow: true });
    G.text(ctx, 'HOY · SÁBADO 17/10', 0, -250, { size: 70, fam: 'Anton', weight: 400, color: C.terra, align: 'center' });
    G.text(ctx, 'PARQUE', 0, -110, { size: 150, fam: 'Anton', weight: 400, color: C.green, align: 'center' });
    G.text(ctx, 'CENTENARIO', 0, 40, { size: 150, fam: 'Anton', weight: 400, color: C.green, align: 'center' });
    G.rrect(ctx, -300, 90, 600, 150, 30, { fill: C.gold, lw: 6, seed: 401 });
    G.text(ctx, 'DE 12 A 18 HS', 0, 200, { size: 100, fam: 'Anton', weight: 400, color: C.ink, align: 'center' });
    G.text(ctx, '¡con medialunas recién hechas!', 0, 330, { size: 58, fam: 'Caveat', weight: 700, color: '#7a5a32', align: 'center' });
    ctx.restore();
    // dancing croissant
    const b = clock.phase(t);
    croissantGuy(ctx, CX - 270, H * 0.42 + 660 - hop(t, 70), 1.2, { eyes: 'happy', mouth: 'open', armL: 1.5 + 0.5 * Math.sin(t * 11), armR: 1.5 + 0.5 * Math.sin(t * 11 + 3), rot: Math.sin(t * Math.PI / BEAT) * 0.15, kick: Math.sin(t * 11) });
    croissantGuy(ctx, CX + 270, H * 0.42 + 660 - hop(t + BEAT / 2, 70), 1.2, { eyes: 'happy', mouth: 'open', armL: 1.5 + 0.5 * Math.sin(t * 11 + 1), armR: 1.5 + 0.5 * Math.sin(t * 11 + 2), rot: -Math.sin(t * Math.PI / BEAT) * 0.15, kick: -Math.sin(t * 11) });
  }

  function sceneOutro(ctx, t) {
    sky(ctx, t, 420); ground(ctx, GY + 80);
    tree(ctx, 100, GY + 70, 1.0, 500); tree(ctx, 980, GY + 50, 0.9, 510);
    cart(ctx, CX + 10, GY + 320, 0.9, 0, t);
    croissantGuy(ctx, CX + 200, GY + 320 - 0.9 * 500 - hop(t, 25), 0.8, { eyes: 'happy', mouth: 'open', armL: 0.4, armR: 1.4 + 0.5 * Math.sin(t * 10) });
    logo(ctx, CX, SF.y + 190, 175, t, ev.outro);
    stamp(ctx, '¡TE ESPERAMOS!', CX, SF.y + 500, t, ev.outro + BEAT, { size: 130, color: '#fff', rot: -0.04 });
    if (t >= ev.outro + BEAT * 2) {
      const p = pop(t, ev.outro + BEAT * 2, 0.3);
      ctx.save(); ctx.translate(CX, SF.y + 640); ctx.scale(p, p);
      const grd = ctx.createLinearGradient(-280, 0, 280, 0); grd.addColorStop(0, '#f9a03f'); grd.addColorStop(0.5, '#e1306c'); grd.addColorStop(1, '#833ab4');
      ctx.fillStyle = grd; ctx.beginPath(); ctx.roundRect(-290, -55, 580, 110, 55); ctx.fill();
      G.text(ctx, '@dubrerapan', 0, 22, { size: 64, fam: 'Inter', weight: 800, color: '#fff', align: 'center', boil: 0 });
      ctx.restore();
    }
  }

  const scenes = [
    [0, ev.cartIn, sceneHoy], [ev.cartIn, ev.pin, sceneCarrito], [ev.pin, ev.clockIn, sceneParque],
    [ev.clockIn, ev.drop, sceneReloj], [ev.drop, ev.outro, sceneDrop], [ev.outro, 1e9, sceneOutro],
  ];
  const cuts = [ev.fecha, ev.cartIn, ev.cartStop, ev.pin, ev.clockIn, ev.ticks[5], ev.drop, ev.outro];

  Studio.film({
    async init() {
      await Studio.loadFont('Anton', 'assets/Anton.ttf', 400);
      await Studio.loadFont('Cinzel', 'assets/Cinzel-Bold.ttf', 700);
    },
    draw(ctx, t) {
      const sc = scenes.find(([a, b]) => t >= a && t < b);
      const shake = Math.max(t >= ev.drop ? 22 * Math.exp(-(t - ev.drop) * 5) : 0, t >= ev.hoy ? 14 * Math.exp(-(t - ev.hoy) * 7) : 0, t >= ev.pin ? 12 * Math.exp(-(t - ev.pin) * 8) : 0);
      ctx.save(); ctx.translate(U.noise1(t * 30, 1) * shake, U.noise1(t * 30, 2) * shake);
      sc[2](ctx, t);
      ctx.restore();
      if (t >= ev.breath && t < ev.drop) { ctx.fillStyle = 'rgba(20,14,8,0.45)'; ctx.fillRect(0, 0, W, H); }
      const last = [...cuts].reverse().find((c) => t >= c);
      if (last !== undefined) { const f = 0.75 * Math.exp(-(t - last) * 14); if (f > 0.01) { ctx.fillStyle = `rgba(255,250,235,${f})`; ctx.fillRect(0, 0, W, H); } }
    },
    post: { paper: 0.35, vignette: 0.25, grain: 0.05 },
    fadeOut: 0.8,
  });
})();
