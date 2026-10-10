import * as THREE from 'three';
import { surface, ramp, crustRamp } from './surface.js';
import { makeNoise, rng } from './noise.js';
import { crustMaterial } from './croissant.js';

const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const spow = (x, e) => Math.sign(x) * Math.pow(Math.abs(x), e);
const mesh = (g, mat) => { const m = new THREE.Mesh(g, mat); m.castShadow = true; m.receiveShadow = true; return m; };

// Superellipsoid "blob" resting on y=0. disp(x,y,z,nx,ny,nz) -> {d, c:[r,g,b]} displacement + colour.
function blob(o, shade, nu = 120, nv = 160) {
  const { rx, ry, rz, e1 = 1, e2 = 1, flat = 0.25 } = o;
  return surface(nu, nv, (u, v) => {
    const phi = -Math.PI / 2 + u * Math.PI, th = v * Math.PI * 2;
    const cp = Math.cos(phi), sp = Math.sin(phi);
    let x = rx * spow(cp, e1) * spow(Math.cos(th), e2);
    let z = rz * spow(cp, e1) * spow(Math.sin(th), e2);
    let y = ry * spow(sp, e1);
    if (y < 0) y *= flat;                      // flattened base
    const nx = x / rx, ny = y / ry, nz = z / rz, nl = Math.hypot(nx, ny, nz) || 1;
    const r = shade(x, y, z, nx / nl, ny / nl, nz / nl, sp);
    x += r.d * nx / nl; y += r.d * ny / nl; z += r.d * nz / nl;
    return [x, Math.max(0.01, y + ry * flat), z, ...r.c];
  });
}

const white = new THREE.Color('#f4efe6');
const mixc = (c, k) => [c[0] + (white.r - c[0]) * k, c[1] + (white.g - c[1]) * k, c[2] + (white.b - c[2]) * k];
const crumb = new THREE.Color('#dcb67a');

// Round sourdough boule with a curved "ear" score and flour dusting.
export function boule(seed = 1, opt = {}) {
  const n = makeNoise(seed), r = opt.r ?? 8;
  return mesh(blob({ rx: r, ry: r * 0.62, rz: r, e1: 0.85, e2: 1, flat: 0.12 }, (x, y, z, nx, ny, nz, sp) => {
    // score: arc across the top
    const sc = Math.abs(Math.hypot(x + r * 0.9, z - r * 0.15) - r * 1.05);
    const cut = Math.exp(-((sc / (r * 0.07)) ** 2)) * sstep(0.35, 0.7, ny);
    const cut2 = Math.exp(-((Math.abs(x * 0.6 + z) - r * 0.0) ** 2 / (r * 0.05) ** 2)) * sstep(0.6, 0.85, ny) * 0;
    let d = 0.35 * n.fbm(x * 0.25, y * 0.25, z * 0.25, 4) + 0.08 * n(x * 1.5, y * 1.5, z * 1.5) - 0.9 * cut + 0.5 * Math.exp(-(((sc - r * 0.12) / (r * 0.06)) ** 2)) * sstep(0.35, 0.7, ny);
    let dark = 0.8 + 0.12 * n.fbm(x * 0.4, y * 0.4, z * 0.4, 3) + 0.08 * ny - 0.55 * cut + 0.06 * n(x * 3, y * 3, z * 3) + (opt.bake ?? 0);
    let c = crustRamp(dark);
    const flour = sstep(0.25, 0.75, n.fbm(x * 0.3 + 5, y * 0.3, z * 0.3, 3) + 0.2 * ny) * 0.14 * (1 - cut) + 0.1 * sstep(0.7, 0.95, n(x * 5, y * 5, z * 5));
    c = mixc(c, Math.min(0.85, flour * (sp > 0 ? 1 : 0.2)));
    if (cut > 0.5) c = [crumb.r, crumb.g, crumb.b].map((q, i) => q * 0.9 + c[i] * 0.1);
    return { d, c };
  }), crustMaterial({ roughness: 0.75, clearcoat: 0.05 }));
}

// Long loaf (batard) studded with olives.
export function oliveLoaf(seed = 2) {
  const n = makeNoise(seed), R = rng(seed);
  const g = new THREE.Group();
  const L = 11, W = 5.4, H = 4.6;
  const olives = Array.from({ length: 22 }, () => [(R() * 2 - 1) * L * 0.85, (R() * 2 - 1) * W * 0.9, R() < 0.5]);
  g.add(mesh(blob({ rx: W, ry: H, rz: L, e1: 0.8, e2: 0.9, flat: 0.12 }, (x, y, z, nx, ny, nz, sp) => {
    const cut = Math.exp(-(((x - 0.25 * Math.sin(z * 0.25) * W * 0.3) / 0.55) ** 2)) * sstep(0.55, 0.85, ny) * sstep(-L * 0.85, -L * 0.5, z) * (1 - sstep(L * 0.5, L * 0.85, z));
    let d = 0.28 * n.fbm(x * 0.3, y * 0.3, z * 0.3, 4) - 0.8 * cut + 0.45 * Math.exp(-(((x - 0.9) / 0.5) ** 2)) * sstep(0.55, 0.85, ny) * (1 - sstep(L * 0.5, L * 0.85, Math.abs(z)));
    let dark = 0.66 + 0.12 * n.fbm(x * 0.5, y * 0.5, z * 0.5, 3) + 0.1 * ny - 0.5 * cut;
    let c = crustRamp(dark);
    for (const [oz, ox, black] of olives) {
      const k = Math.exp(-(((z - oz) ** 2 + (x - ox) ** 2) / 0.9));
      if (k > 0.05) { const oc = black ? [0.03, 0.02, 0.025] : [0.12, 0.13, 0.03]; c = c.map((q, i) => q + (oc[i] - q) * Math.min(1, k * 1.6)); d -= 0.15 * k; }
    }
    if (cut > 0.5) c = [crumb.r, crumb.g, crumb.b];
    return { d, c };
  }), crustMaterial({ roughness: 0.7, clearcoat: 0.1 })));
  return g;
}

// Small olive / tomato / herb toppings
const oliveGeo = new THREE.SphereGeometry(1, 20, 14);
export function oliveHalf(color = '#5b6b1c') {
  const m = new THREE.Mesh(oliveGeo, new THREE.MeshPhysicalMaterial({ color, roughness: 0.25, clearcoat: 0.8 }));
  m.scale.set(0.75, 0.38, 1.0); m.castShadow = true; return m;
}
export function tomatoHalf() {
  const g = new THREE.Group();
  const skin = new THREE.Mesh(oliveGeo, new THREE.MeshPhysicalMaterial({ color: '#b3160c', roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.1 }));
  skin.scale.set(1.15, 0.6, 1.15); skin.castShadow = true; g.add(skin);
  const flesh = new THREE.Mesh(new THREE.CircleGeometry(1, 24), new THREE.MeshPhysicalMaterial({ color: '#e8492a', roughness: 0.3, clearcoat: 1 }));
  flesh.rotation.x = -Math.PI / 2; flesh.position.y = 0.6; flesh.scale.setScalar(0.95); g.add(flesh);
  return g;
}
const needleGeo = new THREE.CylinderGeometry(0.035, 0.06, 1.1, 5);
const needleMat = new THREE.MeshStandardMaterial({ color: '#2e4a1e', roughness: 0.55 });
export function rosemary(seed = 1) {
  const R = rng(seed), g = new THREE.Group();
  for (let i = 0; i < 9; i++) {
    const m = new THREE.Mesh(needleGeo, needleMat);
    const a = (i / 9) * 3 - 1.5; m.position.set(a, 0.1, (R() - 0.5) * 0.4);
    m.rotation.set(Math.PI / 2, 0, (i % 2 ? 1 : -1) * (0.5 + R() * 0.3)); m.castShadow = true; g.add(m);
  }
  return g;
}

// Heightfield on a grid: h(x,z) -> {y, c}. Used for flat breads seen from above.
function heightfield(W, L, nx, nz, fn) {
  const g = new THREE.PlaneGeometry(W * 2, L * 2, nx, nz); g.rotateX(-Math.PI / 2);
  const p = g.attributes.position, col = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) { const r = fn(p.getX(i), p.getZ(i)); p.setY(i, r.y); col.set(r.c, i * 3); }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals(); return g;
}
// Rounded-rectangle signed distance (negative inside)
const rrect = (x, z, w, l, r) => { const qx = Math.abs(x) - w + r, qz = Math.abs(z) - l + r; return Math.hypot(Math.max(qx, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qz), 0) - r; };

// Focaccia slab with oily dimples and toppings
export function focaccia(seed = 3, kind = 'romero') {
  const n = makeNoise(seed), R = rng(seed);
  const W = 6.6, L = 9.4, H = 2.6;
  const dimples = []; for (let i = 0; i < 4; i++) for (let j = 0; j < 6; j++) dimples.push([(i - 1.5) * 3.0 + (R() - 0.5) * 1.2, (j - 2.5) * 3.0 + (R() - 0.5) * 1.2]);
  const g = new THREE.Group();
  g.add(mesh(heightfield(W + 0.6, L + 0.6, 170, 240, (x, z) => {
    const sd = rrect(x + 0.3 * n(x * 0.2, 0, z * 0.2), z, W, L, 2.2);
    const edge = sstep(0.4, -1.6, sd);                     // 0 outside, 1 inside
    let dim = 0; for (const [dx, dz] of dimples) dim += Math.exp(-((x - dx) ** 2 + (z - dz) ** 2) / 0.38);
    dim = Math.min(1, dim);
    const y = edge * (H + 0.35 * n.fbm(x * 0.3, 1, z * 0.3, 3) + 0.06 * n(x * 2.5, 0, z * 2.5) - 0.85 * dim * sstep(-0.5, -2.5, sd));
    const rim = sstep(-2.6, -0.6, sd);
    let dark = 0.5 + 0.16 * n.fbm(x * 0.35, 3, z * 0.35, 3) + 0.22 * rim - 0.16 * dim + 0.08 * Math.max(0, n(x * 1.3, 7, z * 1.3)) + 0.05 * n(x * 6, 0, z * 6);
    let c = crustRamp(dark);
    if (edge > 0.9 && n(x * 4, 2, z * 4) > 0.82) c = [0.92, 0.9, 0.86];   // flaky salt
    return { y: edge < 0.02 ? -0.6 : Math.max(0.01, y), c };
  }), crustMaterial({ roughness: 0.42, clearcoat: 0.55 })));
  const top = (x, z) => H + 0.05;
  if (kind === 'romero') {
    for (let k = 0; k < 10; k++) { const [x, z] = dimples[(k * 5 + 3) % dimples.length]; const t = tomatoHalf(); t.position.set(x, H - 0.4, z); t.scale.setScalar(1.05); g.add(t); }
  } else {
    for (let k = 0; k < 18; k++) { const [x, z] = dimples[(k * 7 + 1) % dimples.length]; const o = oliveHalf(R() < 0.75 ? '#7a8a2a' : '#5b6a1c'); o.position.set(x + (R() - 0.5) * 0.6, H - 0.55, z + (R() - 0.5) * 0.6); o.rotation.y = R() * 6; o.scale.multiplyScalar(0.8); g.add(o); }
  }
  // scattered rosemary needles lying on the surface
  const needles = kind === 'romero' ? 70 : 25;
  for (let k = 0; k < needles; k++) {
    const m = new THREE.Mesh(needleGeo, needleMat);
    m.position.set((R() - 0.5) * W * 1.7, H + 0.12, (R() - 0.5) * L * 1.7);
    m.rotation.set(Math.PI / 2 + (R() - 0.5) * 0.2, 0, 0); m.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), R() * Math.PI * 2);
    m.scale.set(0.8, 0.6 + R() * 0.5, 0.8); m.castShadow = true; g.add(m);
  }
  return g;
}

// Solid of revolution following a rounded profile; u runs from top centre, over the edge, down to bottom centre.
function revolve(prof, shade, nu = 90, nv = 96) {
  return surface(nu, nv, (u, v) => {
    const [r, y] = prof(1 - u), th = v * Math.PI * 2;
    let x = r * Math.cos(th), z = r * Math.sin(th);
    const q = shade(x, y, z, u, th);
    const nl = Math.hypot(x, z) || 1;
    const dr = q.dr ?? 0, dy = q.dy ?? 0;
    return [x + dr * x / nl, Math.max(0.01, y + dy), z + dr * z / nl, ...q.c];
  });
}
// rounded-cylinder profile: top disc, quarter round, side, quarter round, bottom disc
function capsuleProfile(R, H, rt, rb) {
  const segs = [R - rt, Math.PI / 2 * rt, H - rt - rb, Math.PI / 2 * rb, R - rb];
  const tot = segs.reduce((a, b) => a + b);
  return (u) => {
    let d = u * tot;
    if (d <= segs[0]) return [d, H];
    d -= segs[0]; if (d <= segs[1]) { const a = d / rt; return [R - rt + rt * Math.sin(a), H - rt + rt * Math.cos(a)]; }
    d -= segs[1]; if (d <= segs[2]) return [R, H - rt - d];
    d -= segs[2]; if (d <= segs[3]) { const a = d / rb; return [R - rb + rb * Math.cos(a), rb - rb * Math.sin(a)]; }
    d -= segs[3]; return [Math.max(0, R - rb - d), 0];
  };
}

// Chipá: soft round cheese bread ball with a few cracks
export function chipa(seed = 4, r = 2.3) {
  const n = makeNoise(seed);
  return mesh(blob({ rx: r, ry: r * 0.86, rz: r, e1: 1, e2: 1, flat: 0.3 }, (x, y, z, nx, ny) => {
    const crack = 0;
    const d = 0.12 * n.fbm(x * 0.6, y * 0.6, z * 0.6, 3) * r / 2.3 + 0.025 * n(x * 3, y * 3, z * 3) - 0.08 * crack;
    const spots = sstep(0.3, 0.7, n(x * 1.5 + 3, y * 1.5, z * 1.5));
    const dark = 0.44 + 0.16 * ny + 0.16 * spots + 0.05 * n(x * 5, y * 5, z * 5) - 0.18 * crack + (ny < -0.3 ? 0.2 : 0);
    return { d, c: crustRamp(dark) };
  }, 56, 72), crustMaterial({ roughness: 0.55, clearcoat: 0.2 }));
}

// Cheese scone: squat rounded cylinder, craggy golden top with toasted parmesan, pale layered sides
export function scone(seed = 5, r = 3.2) {
  const n = makeNoise(seed), H = 3.4;
  const prof = capsuleProfile(r, H, 1.1, 0.4);
  return mesh(revolve(prof, (x, y, z, u) => {
    const top = sstep(H - 1.4, H - 0.3, y), side = 1 - top;
    const crag = n.fbm(x * 0.55, y * 0.55, z * 0.55, 4);
    const dr = side * (0.22 * crag + 0.035 * Math.sin(y * 5 + 4 * n(x * 0.4, y * 0.3, z * 0.4)));
    const dy = top * (0.5 + 1.1 * crag + 0.12 * n(x * 2.5, 0, z * 2.5)) * (1 - 0.25 * Math.hypot(x, z) / r);
    const cheese = top * sstep(0.15, 0.5, n(x * 1.1 + 9, 0, z * 1.1));
    const dark = 0.36 + 0.3 * top + 0.12 * crag + 0.2 * cheese - 0.06 * side + (y < 0.3 ? 0.3 : 0);
    return { dr, dy, c: crustRamp(dark) };
  }, 110, 120), crustMaterial({ roughness: 0.6, clearcoat: 0.15 }));
}
