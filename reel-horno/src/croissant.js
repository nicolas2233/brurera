import * as THREE from 'three';
import { surface, crustRamp } from './surface.js';
import { makeNoise } from './noise.js';

const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// Procedural laminated croissant, ~14 units tip to tip, resting on y = 0.
export function croissantGeometry(seed = 1, opt = {}) {
  const n = makeNoise(seed);
  const arc = opt.arc ?? 2.3, Rarc = opt.Rarc ?? 5.4, Rmax = opt.Rmax ?? 2.55, bands = opt.bands ?? 7;
  const bake = opt.bake ?? 0;
  return surface(320, 110, (u, v) => {
    const s = u - 0.5, th = s * arc, V = v * Math.PI * 2;
    // spine on a crescent; tips curl toward +z
    const cx = Rarc * Math.sin(th), cz = Rarc * (1 - Math.cos(th)) - 1.4;
    const tx = Math.cos(th), tz = Math.sin(th);           // tangent
    const sx = -tz, sz = tx;                              // horizontal side vector
    const env = Math.pow(Math.sin(Math.PI * u), 0.62);    // thickness envelope
    let R = Rmax * env * (1 + 0.05 * Math.cos(2 * Math.PI * s * 2));
    // band coordinate: wide centre band, narrower toward tips, bands curve around the body
    const as = Math.abs(2 * s), w = bands * (0.5 + 0.5 * Math.sign(s) * Math.pow(as, 1.22)) + 0.3 * Math.cos(V) * Math.tanh(7 * s) + 0.1 * Math.sin(V);
    const f = w - Math.floor(w), d = Math.min(f, 1 - f);
    const groove = Math.exp(-((d / 0.085) ** 2)) * sstep(0.02, 0.15, Math.min(u, 1 - u));
    const lam = Math.exp(-((d / 0.2) ** 2));
    let rad = 1 - 0.19 * groove;
    rad *= 0.93 + 0.07 * Math.sin(Math.PI * f);
    rad *= 1 + 0.014 * Math.sin(2 * Math.PI * w * 10) * lam;     // laminated layers near the seams
    const cv = Math.cos(V), sv = Math.sin(V);
    const lx = cx + sx * R * cv, lz = cz + sz * R * cv, ly = R * sv;
    rad *= 1 + 0.055 * n.fbm(lx * 0.5, ly * 0.5, lz * 0.5, 3) + 0.016 * n(lx * 3.2, ly * 3.2, lz * 3.2) + 0.006 * n(lx * 9, ly * 9, lz * 9);
    const a = R * rad, b = R * rad * (sv > 0 ? 0.86 : 0.32);
    const yc = R * 0.34 + 0.02;
    const x = cx + sx * a * cv, z = cz + sz * a * cv, y = Math.max(0.005, yc + b * sv);
    // browning
    const top = Math.max(0, sv), tip = 1 - sstep(0.06, 0.3, Math.min(u, 1 - u));
    let dark = 0.5 + 0.3 * top * Math.sin(Math.PI * f) + 0.28 * tip + 0.12 * n.fbm(x * 0.9, y * 0.9, z * 0.9, 3) - 0.36 * groove - 0.1 * lam * (1 - groove)
      + 0.06 * n(x * 6, y * 6, z * 6) + bake;
    if (sv < -0.2) dark = 0.62 + 0.1 * n(x, y, z) + bake;
    const c = crustRamp(dark);
    return [x, y, z, c[0], c[1], c[2]];
  });
}

export function crustMaterial(opt = {}) {
  return new THREE.MeshPhysicalMaterial({
    vertexColors: true, roughness: opt.roughness ?? 0.48, metalness: 0,
    clearcoat: opt.clearcoat ?? 0.3, clearcoatRoughness: 0.32,
    sheen: 0.4, sheenRoughness: 0.6, sheenColor: new THREE.Color('#ffd9a0'),
  });
}

export function croissant(seed, opt) {
  const m = new THREE.Mesh(croissantGeometry(seed, opt), crustMaterial(opt));
  m.castShadow = true; m.receiveShadow = true;
  return m;
}
