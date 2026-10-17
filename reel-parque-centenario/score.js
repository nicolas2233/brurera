// THE SCORE — single source of truth for music AND picture.
// Dubrera en el Parque Centenario: HOY sábado 17/10, de 12 a 18 hs.
(function () {
  const node = typeof require !== 'undefined';
  const U = node ? require('./engine/util') : globalThis.U;
  const MU = node ? require('./engine/music') : globalThis.MUSIC;
  const { m, makeClock, placeBar, makeChords } = MU;

  const FPS = 30;
  const FORMAT = U.pickFormat('9:16');
  const [W, H] = U.formatSize(FORMAT);
  const SAFE = U.safeArea(W, H);
  const WIDE = W / H > 1.2;
  const clock = makeClock({ bpm: 112, offset: 0.15 }); // sunny afrobeats-pop: 1 bar ≈ 2.14 s
  const { T, BEAT } = clock;
  const DURATION = T(11) + 0.9;

  const S = {
    hoy: [0, T(2)],          // ¡HOY! SÁBADO 17/10
    carrito: [T(2), T(4)],   // the bakery cart rolls into the park
    parque: [T(4), T(6)],    // pin drops on Parque Centenario
    reloj: [T(6), T(7, 3)],  // clock ticks 12 -> 18
    breath: [T(7, 3), T(8)], // held breath
    drop: [T(8), T(10)],     // the full invitation
    outro: [T(10), DURATION],
  };

  const { chords, chordAt } = makeChords(clock, {
    F: { notes: ['A3', 'C4', 'F4'], bass: 'F2' },
    C: { notes: ['G3', 'C4', 'E4'], bass: 'C2' },
    Dm: { notes: ['A3', 'D4', 'F4'], bass: 'D2' },
    Bb: { notes: ['Bb3', 'D4', 'F4'], bass: 'Bb1' },
    Csus: { notes: ['G3', 'C4', 'F4'], bass: 'C2' },
    Fmaj9: { notes: ['A3', 'C4', 'E4', 'G4'], bass: 'F1' },
  }, [
    [0, 0, 4, 'F'], [1, 0, 4, 'C'], [2, 0, 4, 'Dm'], [3, 0, 4, 'Bb'],
    [4, 0, 4, 'F'], [5, 0, 4, 'C'], [6, 0, 4, 'Bb'], [7, 0, 3, 'Csus'],
    [8, 0, 4, 'F'], [9, 0, 4, 'C'], [10, 0, 4, 'Fmaj9'],
  ]);

  // the hook (8th grid: [note, start8th, len8ths])
  const HOOK = {
    a: [['C5', 0, 2], ['A4', 2, 1], ['C5', 3, 1], ['F5', 4, 2], ['E5', 6, 1], ['C5', 7, 1]],
    b: [['D5', 0, 2], ['C5', 2, 1], ['A4', 3, 1], ['G4', 4, 3]],
    c: [['D5', 0, 2], ['F5', 2, 1], ['D5', 3, 1], ['C5', 4, 2], ['Bb4', 6, 1], ['A4', 7, 1]],
    d: [['G4', 0, 2], ['A4', 2, 1], ['C5', 3, 1], ['C5', 4, 4]],
    end: [['F5', 0, 2], ['E5', 2, 1], ['C5', 3, 1], ['F5', 4, 4]],
  };

  const ev = {
    hoy: T(0, 0),
    fecha: T(1, 0),
    cartIn: T(2, 0),
    cartStop: T(3, 0),
    pin: T(4, 0),
    parque: T(5, 0),
    centenario: T(5, 2),
    clockIn: T(6, 0),
    ticks: [T(6, 1), T(6, 2), T(6, 3), T(7, 0), T(7, 1), T(7, 2)], // 13, 14, 15, 16, 17, 18 hs
    breath: T(7, 3),
    drop: T(8),
    outro: T(10),
  };

  // hook as plucky marimba through the story, brass on the drop
  const lead = [
    ...placeBar(clock, HOOK.a, 2), ...placeBar(clock, HOOK.b, 3),
    ...placeBar(clock, HOOK.c, 4), ...placeBar(clock, HOOK.d, 5),
  ];
  const brass = [...placeBar(clock, HOOK.a, 8), ...placeBar(clock, HOOK.b, 9), ...placeBar(clock, HOOK.end, 10)];
  // each clock tick plays the next note up the scale
  const tickNotes = ['G4', 'A4', 'Bb4', 'C5', 'D5', 'F5'].map((n, i) => ({ t: ev.ticks[i], midi: m(n), hour: 13 + i }));

  const markers = {
    hoy: { t: ev.hoy + 0.0001, sync: 'a' },
    fecha: { t: ev.fecha, sync: 'av' },
    cartStop: { t: ev.cartStop, sync: 'av' },
    pin: { t: ev.pin, sync: 'av' },
    centenario: { t: ev.centenario, sync: 'av' },
    hs18: { t: ev.ticks[5], sync: 'av' },
    breath: ev.breath,
    drop: { t: ev.drop, sync: 'av' },
    outro: { t: ev.outro, sync: 'av' },
  };

  const SCORE = { FPS, FORMAT, W, H, SAFE, WIDE, DURATION, clock, T, BEAT, S, m, chords, chordAt, HOOK, ev, markers, lead, brass, tickNotes };
  if (node) module.exports = SCORE; else globalThis.SCORE = SCORE;
})();
