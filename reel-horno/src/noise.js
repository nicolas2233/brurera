// Seeded RNG + 3D simplex noise (Stefan Gustavson's algorithm, compact port).
export function rng(seed = 1) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

const G3 = [[1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],[1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],[0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]];
export function makeNoise(seed = 1) {
  const r = rng(seed), p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
  const perm = new Uint8Array(512); for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  const F3 = 1 / 3, Gc = 1 / 6;
  function n3(x, y, z) {
    const s = (x + y + z) * F3, i = Math.floor(x + s), j = Math.floor(y + s), k = Math.floor(z + s);
    const t = (i + j + k) * Gc, x0 = x - i + t, y0 = y - j + t, z0 = z - k + t;
    let i1, j1, k1, i2, j2, k2;
    if (x0 >= y0) { if (y0 >= z0) { i1=1;j1=0;k1=0;i2=1;j2=1;k2=0; } else if (x0 >= z0) { i1=1;j1=0;k1=0;i2=1;j2=0;k2=1; } else { i1=0;j1=0;k1=1;i2=1;j2=0;k2=1; } }
    else { if (y0 < z0) { i1=0;j1=0;k1=1;i2=0;j2=1;k2=1; } else if (x0 < z0) { i1=0;j1=1;k1=0;i2=0;j2=1;k2=1; } else { i1=0;j1=1;k1=0;i2=1;j2=1;k2=0; } }
    const x1 = x0 - i1 + Gc, y1 = y0 - j1 + Gc, z1 = z0 - k1 + Gc;
    const x2 = x0 - i2 + 2 * Gc, y2 = y0 - j2 + 2 * Gc, z2 = z0 - k2 + 2 * Gc;
    const x3 = x0 - 1 + 3 * Gc, y3 = y0 - 1 + 3 * Gc, z3 = z0 - 1 + 3 * Gc;
    const ii = i & 255, jj = j & 255, kk = k & 255;
    const c = (gx, gy, gz, X, Y, Z) => { let tt = 0.6 - X * X - Y * Y - Z * Z; if (tt < 0) return 0;
      const g = G3[perm[gx + perm[gy + perm[gz]]] % 12]; tt *= tt; return tt * tt * (g[0] * X + g[1] * Y + g[2] * Z); };
    return 32 * (c(ii, jj, kk, x0, y0, z0) + c(ii + i1, jj + j1, kk + k1, x1, y1, z1) +
                 c(ii + i2, jj + j2, kk + k2, x2, y2, z2) + c(ii + 1, jj + 1, kk + 1, x3, y3, z3));
  }
  n3.fbm = (x, y, z, oct = 4) => { let a = 0, f = 1, amp = 0.5; for (let o = 0; o < oct; o++) { a += amp * n3(x * f, y * f, z * f); f *= 2.03; amp *= 0.5; } return a; };
  return n3;
}
