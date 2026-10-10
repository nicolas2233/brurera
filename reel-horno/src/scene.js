import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { croissant } from './croissant.js';
import * as B from './breads.js';
import { rng, makeNoise } from './noise.js';
import { T } from './timeline.js';

// ---------- easing / interpolation ----------
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const prog = (t, a, b) => clamp((t - a) / (b - a));
const eio = (x) => x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2;
const eout = (x) => 1 - (1 - x) ** 3;
const ein = (x) => x * x * x;
const eback = (x) => { const c = 1.9; return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2; };
const bounce = (x) => { // door slam settle
  return 1 - Math.cos(x * Math.PI * 3.5) * Math.exp(-x * 6) * (1 - x);
};

const W = 1080, H = 1920;
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(W, H); renderer.setPixelRatio(1);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('gl').appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#120c08');
scene.fog = new THREE.Fog('#120c08', 120, 260);
const pm = new THREE.PMREMGenerator(renderer);
scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.22;

const camera = new THREE.PerspectiveCamera(50, W / H, 0.5, 600);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), 0.5, 0.5, 1.8);
composer.addPass(bloom);
composer.addPass(new OutputPass());

// ---------- lights ----------
const key = new THREE.SpotLight('#ffe1b5', 0, 0, 0.55, 0.65, 1.5);
key.position.set(-30, 85, 70); key.target.position.set(0, 0, 10);
key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.radius = 5; key.shadow.bias = -0.0004;
key.shadow.camera.near = 40; key.shadow.camera.far = 220;
scene.add(key, key.target);
const fill = new THREE.HemisphereLight('#ffd9b0', '#2a1a10', 0.25); scene.add(fill);
const ovenL1 = new THREE.PointLight('#ff6a1e', 0, 0, 1.6); ovenL1.position.set(0, 22, -22); scene.add(ovenL1);
const ovenL2 = new THREE.PointLight('#ff8a3a', 0, 0, 1.6); ovenL2.position.set(0, 6, -8); scene.add(ovenL2);
const mouth = new THREE.PointLight('#ff9a4a', 0, 0, 1.4); mouth.position.set(0, 18, 4); scene.add(mouth);

// ---------- materials ----------
const steel = new THREE.MeshStandardMaterial({ color: '#2d2c2b', metalness: 0.75, roughness: 0.38 });
const steelLight = new THREE.MeshStandardMaterial({ color: '#8a8580', metalness: 0.9, roughness: 0.28 });
const enamel = new THREE.MeshStandardMaterial({ color: '#2a201a', metalness: 0.2, roughness: 0.55, side: THREE.BackSide });
const black = new THREE.MeshStandardMaterial({ color: '#141312', metalness: 0.3, roughness: 0.4 });

// ---------- canvas textures ----------
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; t.userData = { c, g, draw }; return t;
}
// temperature display
const dispTex = canvasTex(512, 192, () => {});
const drawDisplay = (deg, blink) => {
  const { g } = dispTex.userData; g.fillStyle = '#0a0606'; g.fillRect(0, 0, 512, 192);
  g.font = '700 130px "DSEG", "Anton", monospace'; g.textAlign = 'right'; g.textBaseline = 'middle';
  g.shadowColor = '#ff5a1a'; g.shadowBlur = 24; g.fillStyle = blink ? '#ffb070' : '#ff7a30';
  g.fillText(String(Math.round(deg)).padStart(3, ' '), 380, 100);
  g.font = '700 70px Anton'; g.fillText('°C', 490, 82);
  dispTex.needsUpdate = true;
};
// door brand plate
const plateTex = canvasTex(1024, 160, (g, w, h) => {
  g.fillStyle = '#151413'; g.fillRect(0, 0, w, h);
  g.font = '700 96px Cinzel'; g.textAlign = 'center'; g.textBaseline = 'middle';
  const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#b8964e'); gr.addColorStop(0.5, '#f3dd9c'); gr.addColorStop(1, '#b8964e');
  g.fillStyle = gr; g.fillText('DUBRERA', w / 2, h / 2 + 6);
});
// parchment paper
const parchTex = canvasTex(1024, 1024, (g, w, h) => {
  const n = makeNoise(77); const im = g.createImageData(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const v = 0.5 + 0.5 * n.fbm(x / 160, y / 160, 0, 4), sp = n(x / 9, y / 9, 3) > 0.7 ? -18 : 0;
    const i = (y * w + x) * 4; im.data[i] = 226 + 18 * v + sp; im.data[i + 1] = 210 + 16 * v + sp; im.data[i + 2] = 178 + 14 * v + sp; im.data[i + 3] = 255;
  }
  g.putImageData(im, 0, 0);
  // toasted halos
  for (let k = 0; k < 14; k++) { const r = 60 + (k * 37) % 90; const gx = (k * 271) % w, gy = (k * 433) % h;
    const gr = g.createRadialGradient(gx, gy, 0, gx, gy, r * 1.6); gr.addColorStop(0, 'rgba(160,100,40,.28)'); gr.addColorStop(1, 'rgba(160,100,40,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }
});
// steam puff
const steamTex = canvasTex(256, 256, (g, w, h) => {
  const n = makeNoise(9); const im = g.createImageData(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const dx = (x - 128) / 128, dy = (y - 128) / 128, r = Math.hypot(dx, dy);
    const fall = Math.max(0, 1 - r) ** 1.6, cl = 0.55 + 0.45 * n.fbm(x / 48, y / 48, 0, 4);
    const i = (y * w + x) * 4; im.data[i] = im.data[i + 1] = im.data[i + 2] = 255; im.data[i + 3] = 255 * fall * cl;
  }
  g.putImageData(im, 0, 0);
});

// ---------- oven ----------
// Opening: x ±18, y 0..26 at z = 0; interior depth 52.
const oven = new THREE.Group(); scene.add(oven);
{
  const shape = new THREE.Shape(); shape.moveTo(-34, -40); shape.lineTo(34, -40); shape.lineTo(34, 50); shape.lineTo(-34, 50); shape.lineTo(-34, -40);
  const hole = new THREE.Path(); hole.moveTo(-18, 0); hole.lineTo(-18, 26); hole.lineTo(18, 26); hole.lineTo(18, 0); hole.lineTo(-18, 0); shape.holes.push(hole);
  const front = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 3, bevelEnabled: true, bevelSize: 0.6, bevelThickness: 0.6, bevelSegments: 3 }), steel);
  front.position.z = -3; front.receiveShadow = true; oven.add(front);
  const inner = new THREE.Mesh(new THREE.BoxGeometry(36, 30, 54), enamel); inner.position.set(0, 13, -27); inner.receiveShadow = true; oven.add(inner);
  // control panel strip
  const panel = new THREE.Mesh(new THREE.BoxGeometry(60, 12, 1), black); panel.position.set(0, 40, 0.6); oven.add(panel);
  const disp = new THREE.Mesh(new THREE.PlaneGeometry(14, 5.25), new THREE.MeshBasicMaterial({ map: dispTex, toneMapped: false }));
  disp.position.set(0, 40, 1.15); oven.add(disp);
  for (const x of [-21, -13, 13, 21]) {
    const k = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.6, 2.2, 40), steelLight); k.rotation.x = Math.PI / 2; k.position.set(x, 40, 2); oven.add(k);
    const mark = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.8, 0.3), black); mark.position.set(x, 41, 3.15); oven.add(mark);
  }
  // rack rails
  for (const x of [-17, 17]) { const r = new THREE.Mesh(new THREE.BoxGeometry(1, 0.8, 52), steelLight); r.position.set(x, 0.6, -26); oven.add(r); }
}
// heating elements (top + back), emissive
const coilMat = new THREE.MeshStandardMaterial({ color: '#3a2a22', emissive: new THREE.Color('#ff4a0e'), emissiveIntensity: 0, roughness: 0.5, metalness: 0.4 });
{
  const pts = []; for (let i = 0; i <= 8; i++) { const z = -48 + i * 5.4; pts.push(new THREE.Vector3(i % 2 ? 15 : -15, 26, z), new THREE.Vector3(i % 2 ? -15 : 15, 26, z)); }
  const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.05);
  oven.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 400, 0.45, 10), coilMat));
}
// door: pivot at the bottom hinge, opens toward camera
const door = new THREE.Group(); door.position.set(0, -1.5, 0.8); oven.add(door);
// oven glass: dark screen-printed border + reflection streaks, mostly see-through in the middle
const glassTex = canvasTex(512, 300, (g, w, h) => {
  g.clearRect(0, 0, w, h);
  g.fillStyle = 'rgba(8,6,5,0.35)'; g.fillRect(0, 0, w, h);
  g.strokeStyle = 'rgba(5,4,3,0.95)'; g.lineWidth = 46; g.strokeRect(0, 0, w, h);
  for (let x = 0; x < w; x += 6) for (let y = 23; y < 34; y += 6) { g.fillStyle = 'rgba(5,4,3,.8)'; g.beginPath(); g.arc(x, y, 2, 0, 7); g.arc(x, h - y, 2, 0, 7); g.fill(); }
  for (const [x0, wd, a] of [[90, 60, .16], [170, 18, .12], [330, 90, .08]]) {
    const gr = g.createLinearGradient(x0, 0, x0 + wd, 0); gr.addColorStop(0, 'rgba(255,240,220,0)'); gr.addColorStop(.5, `rgba(255,240,220,${a})`); gr.addColorStop(1, 'rgba(255,240,220,0)');
    g.save(); g.translate(0, 0); g.transform(1, 0, -0.45, 1, 0, 0); g.fillStyle = gr; g.fillRect(x0, 0, wd, h); g.restore();
  }
});
const glassMat = new THREE.MeshPhysicalMaterial({ map: glassTex, roughness: 0.05, metalness: 0, transparent: true, clearcoat: 1, clearcoatRoughness: 0.03, depthWrite: false });
{
  const s = new THREE.Shape(); s.moveTo(-21, 0); s.lineTo(21, 0); s.lineTo(21, 30); s.lineTo(-21, 30); s.lineTo(-21, 0);
  const h = new THREE.Path(); h.moveTo(-15, 7); h.lineTo(-15, 24); h.lineTo(15, 24); h.lineTo(15, 7); h.lineTo(-15, 7); s.holes.push(h);
  const frame = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 2.2, bevelEnabled: true, bevelSize: 0.5, bevelThickness: 0.5, bevelSegments: 3 }), steel);
  frame.castShadow = true; door.add(frame);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(30.5, 17.5), glassMat); glass.position.set(0, 15.5, 2.3); door.add(glass);
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(18, 2.8), new THREE.MeshStandardMaterial({ map: plateTex, metalness: 0.5, roughness: 0.35 }));
  plate.position.set(0, 3.6, 2.75); door.add(plate);
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 32, 24), steelLight); handle.rotation.z = Math.PI / 2; handle.position.set(0, 27, 6); handle.castShadow = true; door.add(handle);
  for (const x of [-14, 14]) { const st = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 4, 12), steelLight); st.rotation.x = Math.PI / 2; st.position.set(x, 27, 4); door.add(st); }
}
// counter below the oven (seen during top shots)
const counter = new THREE.Mesh(new THREE.BoxGeometry(160, 4, 120), new THREE.MeshStandardMaterial({ color: '#2a1e16', roughness: 0.7 }));
counter.position.set(0, -44, 40); counter.receiveShadow = true; scene.add(counter);

// ---------- trays ----------
const OUT = 14, IN = -26;
function tray(fill) {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(32, 0.6, 44), steel); base.position.y = 1.2; base.receiveShadow = true; g.add(base);
  for (const [w, d, x, z] of [[32, 0.8, 0, 21.8], [32, 0.8, 0, -21.8], [0.8, 44, 15.8, 0], [0.8, 44, -15.8, 0]]) {
    const r = new THREE.Mesh(new THREE.BoxGeometry(w, 1.6, d), steel); r.position.set(x, 2, z); r.castShadow = true; g.add(r);
  }
  const paper = new THREE.Mesh(new THREE.PlaneGeometry(30, 42, 30, 42), new THREE.MeshStandardMaterial({ map: parchTex, color: '#c9b898', roughness: 0.85 }));
  { const n = makeNoise(5), p = paper.geometry.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, 0.06 * n(p.getX(i) * 0.2, p.getY(i) * 0.2, 0)); paper.geometry.computeVertexNormals(); }
  paper.rotation.x = -Math.PI / 2; paper.position.y = 1.6; paper.receiveShadow = true; g.add(paper);
  const items = new THREE.Group(); items.position.y = 1.72; g.add(items);
  fill(items);
  g.visible = false; scene.add(g);
  return g;
}
const put = (grp, m, x, z, ry = 0, s = 1) => { m.position.set(x, 0, z); m.rotation.y = ry; m.scale.multiplyScalar(s); grp.add(m); return m; };

const trays = {
  medialunas: tray(g => {
    const R = rng(3);
    [[-7.3, -14, 0.25], [7.3, -13, -0.2], [-7.6, 0, -0.15], [7.4, 1, 0.3], [-7.2, 14, 0.2], [7.5, 14.5, -0.25]]
      .forEach(([x, z, r], i) => put(g, croissant(i * 13 + 1, { bake: (R() - 0.5) * 0.1, arc: 2.2 + R() * 0.25 }), x, z, r + (i % 2 ? Math.PI : 0), 0.95));
  }),
  panes: tray(g => {
    put(g, B.boule(2), -6.4, -9, 0.4, 0.95);
    put(g, B.oliveLoaf(4), 7.6, 5, 0.12, 1.15);
    put(g, B.boule(6, { r: 6.4, bake: 0.04 }), -6.8, 11, 2.0, 1);
  }),
  focaccias: tray(g => { put(g, B.focaccia(3, 'romero'), -7.4, 0, 0, 1); put(g, B.focaccia(8, 'olivas'), 7.4, 0, 0, 1); }),
  chipa: tray(g => {
    const R = rng(11); let k = 0;
    for (let i = 0; i < 4; i++) for (let j = 0; j < 6; j++) put(g, B.chipa(++k, 2.25 + R() * 0.35), (i - 1.5) * 7 + (R() - 0.5) * 1.4, (j - 2.5) * 6.8 + (R() - 0.5) * 1.4, R() * 6);
  }),
  scon: tray(g => {
    const R = rng(21); let k = 0;
    for (let i = 0; i < 3; i++) for (let j = 0; j < 4; j++) put(g, B.scone(++k, 3.1 + R() * 0.3), (i - 1) * 9 + (R() - 0.5), (j - 1.5) * 9.8 + (R() - 0.5), R() * 6);
  }),
  mix: tray(g => {
    put(g, croissant(5), -7.2, -13.5, 0.2, 0.92); put(g, croissant(9), 7.4, -12.5, Math.PI - 0.2, 0.92);
    put(g, B.focaccia(12, 'romero'), -7.4, 6, 0, 0.55);
    const R = rng(4);
    for (let k = 0; k < 4; k++) put(g, B.chipa(40 + k, 2.2), 4.5 + (k % 2) * 6, -1 + Math.floor(k / 2) * 6, R() * 6);
    put(g, B.scone(33), 5, 13.5, 0, 0.95); put(g, B.scone(34), 12, 15, 1, 0.8);
    put(g, B.chipa(50, 2.1), -12, 16.5, 0);
  }),
};

// ---------- steam ----------
const steamGroup = new THREE.Group(); scene.add(steamGroup);
const puffs = [];
function makePuffs(count, seed, spec) {
  const R = rng(seed);
  for (let i = 0; i < count; i++) {
    const m = new THREE.SpriteMaterial({ map: steamTex, color: '#fff4e6', transparent: true, opacity: 0, depthWrite: false });
    const s = new THREE.Sprite(m); steamGroup.add(s);
    puffs.push({ s, r: [R(), R(), R(), R(), R()], spec });
  }
}
makePuffs(46, 1, 'tray');   // gentle steam rising off the active tray
makePuffs(40, 2, 'burst');  // big puff at door opening / tray swaps

// ---------- timeline-driven state ----------
const camKeys = [ // time, position, target
  [0.0, [0, 22, 80], [0, 25, 0]],
  [T.open, [0, 20, 64], [0, 22, 0]],
  [T.open + 0.9, [0, 24, 66], [0, 8, 4]],
  [T.trayOut + 1.6, [0, 60, 52], [0, 0, 23]],
  [T.cta, [0, 60, 52], [0, 0, 23]],
  [T.cta + 1.2, [0, 70, 44], [0, 0, 13]],
  [T.end, [0, 72, 42], [0, 0, 13]],
];
const v3 = new THREE.Vector3(), tgt = new THREE.Vector3();
function camAt(t) {
  let i = 0; while (i < camKeys.length - 2 && t > camKeys[i + 1][0]) i++;
  const [t0, p0, a0] = camKeys[i], [t1, p1, a1] = camKeys[i + 1];
  const f = eio(prog(t, t0, t1));
  v3.set(...p0.map((q, k) => q + (p1[k] - q) * f)); tgt.set(...a0.map((q, k) => q + (a1[k] - q) * f));
  // slow handheld-ish drift once the tray is out
  const drift = prog(t, T.trayOut, T.trayOut + 2);
  v3.x += drift * 7 * Math.sin(t * 0.45); v3.y += drift * 1.2 * Math.sin(t * 0.9 + 1); v3.z += drift * 2 * Math.cos(t * 0.37);
  // door-slam shake
  const sh = Math.exp(-(((t - T.open - 0.75) / 0.12) ** 2)) * 0.6;
  v3.x += sh * Math.sin(t * 90); v3.y += sh * Math.cos(t * 77);
  camera.position.copy(v3); camera.lookAt(tgt);
}

// tray schedule: [name, outStart, inStart]
const order = ['medialunas', 'panes', 'focaccias', 'chipa', 'scon', 'mix'];
function trayZ(name, t) {
  const idx = order.indexOf(name);
  const outAt = idx === 0 ? T.trayOut : T.swaps[idx - 1] + 0.42;
  const inAt = idx < T.swaps.length ? T.swaps[idx] : 1e9;
  const dOut = idx === 0 ? 1.5 : 0.62;
  if (t < outAt) return null;
  if (t < inAt) { const f = prog(t, outAt, outAt + dOut); return IN + (OUT - IN) * (idx === 0 ? eout(f) : eback(f)); }
  const f = prog(t, inAt, inAt + 0.42); if (f >= 1) return null;
  return OUT + (IN - OUT) * ein(f);
}

export const cfg = (window.cfg = { steam: 1, bloom: 1 });
export function seek(t) {
  bloom.enabled = !!cfg.bloom; steamGroup.visible = !!cfg.steam;
  // heat ramps up during the intro
  const h = eout(prog(t, 0.2, T.open - 0.3));
  coilMat.emissiveIntensity = 0.3 + 6 * h;
  const flick = 1 + 0.04 * Math.sin(t * 23) + 0.03 * Math.sin(t * 37);
  const opened = eout(prog(t, T.open, T.open + 0.8));
  const dim = 1 - 0.9 * eout(prog(t, T.open + 0.3, T.trayOut + 1.2));
  ovenL1.intensity = (300 + 2600 * h) * flick * dim;
  ovenL2.intensity = (100 + 900 * h) * flick * dim;
  mouth.intensity = 220 * opened * flick + 900 * Math.exp(-(((t - T.open - 0.5) / 0.35) ** 2));
  key.intensity = 1500 + 2300 * eout(prog(t, T.open, T.trayOut + 1));
  fill.intensity = 0.12 + 0.25 * opened;
  // temperature display
  const deg = 20 + 200 * eout(prog(t, 0.1, T.open - 0.6));
  drawDisplay(deg, t > T.open - 0.6 && Math.floor(t * 6) % 2 === 0);
  // door
  const dOpen = prog(t, T.open, T.open + 0.75);
  door.rotation.x = (Math.PI / 2) * (dOpen < 1 ? ein(dOpen) * 0.98 : 1 - (1 - bounce(Math.min(1, (t - T.open - 0.75) / 0.6))) * 0.04);
  if (t < T.open) door.rotation.x = 0;
  // trays
  for (const name of order) {
    const z = trayZ(name, t), g = trays[name];
    if (name === 'medialunas' && t < T.trayOut) { g.visible = true; g.position.set(0, 0, IN + 1.5); continue; }
    g.visible = z !== null; if (z !== null) g.position.set(0, 0, z === null ? 0 : z);
  }
  // steam
  const active = order.find(n => trays[n].visible && Math.abs(trays[n].position.z - OUT) < 3);
  const trayAmt = (active ? 1 : 0) * prog(t, T.trayOut, T.trayOut + 1.2);
  const bursts = [T.open + 0.35, ...T.swaps.map(s => s + 0.25)];
  for (const p of puffs) {
    const [a, b, c, d, e] = p.r, m = p.s.material;
    if (p.spec === 'tray') {
      const life = 2.6 + d, age = ((t + a * life) % life) / life;
      p.s.position.set((b - 0.5) * 28 + Math.sin(t + a * 6) * 1.5, 4 + age * 26, OUT + (c - 0.5) * 36);
      p.s.scale.setScalar(5 + age * 14);
      m.opacity = trayAmt * 0.16 * Math.sin(Math.PI * age) ** 1.5;
      m.rotation = a * 6 + age * (e - 0.5);
    } else {
      let best = 0, age = 0;
      for (const bt of bursts) { const g = (t - bt - a * 0.25) / (1.4 + d * 0.6); if (g > 0 && g < 1) { age = g; best = 1; } }
      const big = bursts[0] <= t && t < bursts[0] + 2 ? 1.6 : 1;
      p.s.position.set((b - 0.5) * 34, 10 + c * 14 + age * 30 * big, 4 + age * 36 + e * 8);
      p.s.scale.setScalar((10 + age * 30) * big);
      m.opacity = best * (big > 1 ? 0.3 : 0.42) * Math.sin(Math.PI * Math.min(1, age * 1.4)) ** 1.2;
      m.rotation = a * 6 + age;
    }
  }
  camAt(t);
  composer.render();
}
