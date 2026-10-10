# Reel "Recién salido del horno" — Dubrera

Video vertical 1080×1920 (30 fps, ~28 s) con productos modelados en 3D (three.js) y textos animados.

- `index.html` — capa de textos/animaciones + carga de la escena 3D
- `src/scene.js` — horno, bandejas, vapor, cámara e iluminación
- `src/croissant.js`, `src/breads.js` — medialunas, panes, focaccias, chipá y scon procedurales
- `src/timeline.js` — tiempos de cada escena (compartidos por 3D, textos y sonido)
- `sfx.py` — genera `sfx.wav` (timer, ding, puerta, vapor, whooshes)

Render:

```sh
npm install
python3 sfx.py
node render.mjs dubrera-horno.mp4 3   # 3 navegadores en paralelo
```

Vista previa en vivo: `node -e "import('./shot.mjs').then(m=>m.serve('.',8765))"` y abrir http://localhost:8765/
