import * as THREE from 'three';

// Build a closed tube-like parametric surface. fn(u, v) -> [x, y, z, r, g, b]
// u in [0,1] runs along the object (ends should collapse to points), v in [0,1) wraps around.
export function surface(nu, nv, fn) {
  const pos = new Float32Array((nu + 1) * nv * 3), col = new Float32Array((nu + 1) * nv * 3);
  for (let i = 0; i <= nu; i++) for (let j = 0; j < nv; j++) {
    const o = (i * nv + j) * 3, q = fn(i / nu, j / nv);
    pos[o] = q[0]; pos[o + 1] = q[1]; pos[o + 2] = q[2]; col[o] = q[3]; col[o + 1] = q[4]; col[o + 2] = q[5];
  }
  const idx = [];
  for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
    const a = i * nv + j, b = i * nv + (j + 1) % nv, c = (i + 1) * nv + j, d = (i + 1) * nv + (j + 1) % nv;
    idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// sRGB colour ramp -> linear rgb triple
export function ramp(stops) {
  const cs = stops.map(([t, hex]) => [t, new THREE.Color(hex)]); // THREE.Color(hex) is converted to linear
  return (x) => {
    x = Math.min(1, Math.max(0, x));
    for (let k = 1; k < cs.length; k++) if (x <= cs[k][0]) {
      const [t0, c0] = cs[k - 1], [t1, c1] = cs[k], f = (x - t0) / (t1 - t0);
      return [c0.r + (c1.r - c0.r) * f, c0.g + (c1.g - c0.g) * f, c0.b + (c1.b - c0.b) * f];
    }
    const c = cs[cs.length - 1][1]; return [c.r, c.g, c.b];
  };
}
export const crustRamp = ramp([[0, '#f6dca6'], [0.3, '#e8b464'], [0.55, '#c98338'], [0.78, '#9a5220'], [1, '#5e2b0e']]);
