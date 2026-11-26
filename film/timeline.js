// Single source of truth for timing: the picture (index.html) and the soundtrack (audio.mjs) both read it.
(function (root) {
  const FPS = 60, DUR = 30;
  // scene starts, seconds, on a 0.5 s grid (60 BPM half-time pulse)
  const S = { T1: 0, B: 1.0, C: 3.5, D: 5.5, E: 9.5, F: 12.0, G: 13.5, H: 14.5, T2: 18.0, I: 19.0, J: 21.5, K: 23.5, L: 25.5, M: 28.5, END: 29.5 };
  const K = {
    segFill0: 1.55, segDur: 0.36, swap: 3.0, rowsMorph: 3.4,
    call: [4.15, 4.45, 4.75], rank: 5.15,
    crown: [6.0, 6.15, 6.3], leaf: 7.6,
    podium: 9.3, colRise: [10.05, 9.9, 9.75], dollar: 10.4,
    opts: 12.12, pick: 12.8, chips: [13.62, 13.8],
    cardsH: [14.62, 14.78], plus: [15.4, 16.3],
    t2: 18.05, cluster: 18.2, toCard: 18.9, nick: [19.55, 19.8, 20.05], dot: 20.45,
    toPin: 21.3, pins: 21.9, pinGap: 0.1, league: 22.7,
    sheet: 23.45, select: 24.45,
    toL: 25.4, arrow1: 25.75, friend: 25.85, tanks: 26.2, tankGap: 0.12, km: 26.95, days: 27.4, arrow2: 27.6, badge: 28.0,
    ban: 28.55, banGap: 0.2, end: 29.42,
  };
  const fr = t => Math.round(t * FPS);
  // Sound events. `t` is the picture time of the visual event; audio.mjs places the onset at (frame + 1) / FPS.
  const EV = [];
  const ev = (t, k, g = 1, f = 1, pan = 0) => EV.push({ t, k, g, f, pan });
  ev(0.0, 'bloom', 0.9);
  ev(S.B - 0.12, 'whoosh', 0.55);
  for (let i = 0; i < 4; i++) ev(K.segFill0 + (i + 1) * K.segDur, 'tick', 0.55, 1 + i * 0.12, -0.45 + i * 0.3);
  ev(K.swap, 'swish', 0.5);
  ev(K.rowsMorph, 'whoosh', 0.5);
  for (let i = 0; i < 6; i++) ev(3.78 + i * 0.05, 'tap', 0.28, 1 + i * 0.05);
  K.call.forEach((t, i) => ev(t, 'pop', 0.55, 1 + i * 0.12, [0.3, 0.1, -0.1][i]));
  ev(K.rank, 'swish', 0.55); ev(K.rank + 0.56, 'tick', 0.6, 1.3);
  K.crown.forEach((t, i) => ev(t + 0.06, 'sparkle', 0.5, 1 + i * 0.125, -0.3));
  ev(K.leaf, 'pop', 0.6, 1.5, -0.1); ev(K.leaf + 0.75, 'sparkle', 0.4, 1.5);
  ev(K.podium, 'whoosh', 0.55);
  [2, 1, 0].forEach((k, i) => ev(K.colRise[k] + 0.1, 'rise', 0.5, 1 + i * 0.19, [0, -0.5, 0.5][k]));
  ev(K.dollar, 'coin', 0.45, 1.0);
  ev(S.F - 0.12, 'whoosh', 0.45);
  ev(K.opts + 0.05, 'tap', 0.4, 0.9, -0.3); ev(K.opts + 0.15, 'tap', 0.4, 1.0, 0.3);
  ev(K.pick, 'tick', 0.7, 1.2, -0.3); ev(K.pick + 0.07, 'sparkle', 0.35, 1.25, -0.3);
  K.chips.forEach((t, i) => ev(t, 'pop', 0.55, 1.1 + i * 0.2, i ? 0.3 : -0.3));
  ev(S.H - 0.1, 'whoosh', 0.5);
  ev(K.plus[0], 'coin', 0.65, 1.0, -0.25); ev(K.plus[1], 'coin', 0.65, 1.26, 0.25);
  ev(S.T2 - 0.18, 'whoosh', 0.6); ev(K.t2, 'bloom', 0.6, 1.26);
  [0, 0.08, 0.16].forEach((d, i) => ev(K.cluster + d, 'pop', 0.4, 1 + i * 0.15, [0, -0.3, 0.3][i]));
  ev(K.toCard, 'swish', 0.45);
  K.nick.forEach((t, i) => ev(t, 'tick', 0.4, 1.1 + i * 0.12));
  ev(K.nick[2] + 0.18, 'sparkle', 0.3, 1.5);
  ev(K.dot, 'tap', 0.5, 1.2);
  ev(K.toPin, 'whoosh', 0.5);
  for (let i = 0; i < 5; i++) ev(K.pins + i * K.pinGap, 'pop', 0.38, 0.9 + i * 0.1, [-0.5, 0.5, 0.5, -0.5, 0][i]);
  ev(K.league, 'swish', 0.4); ev(K.league + 0.3, 'sparkle', 0.3, 1.0);
  ev(K.sheet, 'whoosh', 0.45); ev(K.sheet + 0.45, 'tap', 0.4, 0.8);
  ev(K.select + 0.3, 'tick', 0.7, 1.2);
  ev(K.toL, 'whoosh', 0.5);
  ev(K.friend, 'pop', 0.55, 1.2, 0.4);
  for (let i = 0; i < 5; i++) ev(K.tanks + i * K.tankGap, 'pop', 0.5, 1 + i * 0.122, -0.5 + i * 0.25);
  ev(K.km, 'rise', 0.45, 1.5); ev(K.km + 0.55, 'tick', 0.55, 1.5);
  ev(K.days, 'tap', 0.45, 1.3);
  ev(K.arrow2, 'swish', 0.4); ev(K.badge, 'coin', 0.5, 1.5, -0.4);
  ev(K.ban - 0.2, 'whoosh', 0.45);
  for (let i = 0; i < 4; i++) ev(K.ban + i * K.banGap, 'ding', 0.5, [1, 1.125, 1.26, 1.5][i], [-0.2, 0.2, -0.1, 0.1][i]);
  ev(K.end + 0.08, 'bloom', 1.0, 1.0);
  root.TL = { FPS, DUR, S, K, EV, fr };
})(typeof module !== 'undefined' ? module.exports : window);
