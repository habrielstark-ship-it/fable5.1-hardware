// Single source of truth for timing: the picture (index.html) and the soundtrack (audio.mjs) both read it.
// Every scene starts on a 0.5 s grid = one beat at 120 BPM, so picture changes and music coincide.
(function (root) {
  const FPS = 60, DUR = 30, BPM = 120;
  const S = { T1: 0, B: 1.0, C: 3.0, D: 5.0, E: 8.5, F: 11.0, G: 12.5, H: 13.5, T2: 16.5, I: 17.5, J: 20.0, K: 22.0, L: 24.0, M: 27.0, END: 29.0 };
  const K = {
    logoUp: 0.6,
    // B  seasons and tours
    segFill0: S.B + .45, segDur: .27, swap: S.B + 1.5, toChip: S.C - .12, rowsMorph: S.C - .1, chipLab: S.C + .42,
    // C  leaderboard
    hl: [S.C + .75, S.C + 1.0, S.C + 1.25], rank: S.C + 1.5,
    // D  badges
    crown: [S.D + .45, S.D + .6, S.D + .75], sub2: S.D + 1.75, leaf: S.D + 2.0,
    // E  prizes: rows leave bottom-first so they never cross on the way to the podium
    podium: S.E - .2, podStag: [.14, .07, 0], colRise: [S.E + .6, S.E + .45, S.E + .3], dollar: S.E + 1.0,
    // F  claiming the reward
    heroUp: S.F - .15, opts: S.F + .14, pick: S.F + .8, optsOut: S.G - .14,
    // G  extra rewards
    chips: [S.G + .12, S.G + .3], chipsOut: S.H - .14,
    // H  OONE vs Sparks
    tiles: [S.H + .12, S.H + .28], tileTxt: [S.H + .5, S.H + 1.3], hit: [S.H + .7, S.H + 1.5], tilesOut: S.T2 - .4,
    // T2 chapter two
    t2: S.T2 + .05, cluster: S.T2 + .2, toCard: S.T2 + .9,
    // I  nickname and avatar
    nickIn: S.I + .3, nick: [S.I + .55, S.I + .8, S.I + 1.05], dot: S.I + 1.45, toPin: S.J - .2,
    // J  map
    pins: S.J + .4, pinGap: .1, league: S.J + 1.2,
    // K  chat settings
    sheet: S.K - .05, chat: S.K + .36, select: S.K + .95, toL: S.L - .1,
    // L  referrals
    arrow1: S.L + .25, friend: S.L + .35, tanks: S.L + .7, tankGap: .12, km: S.L + 1.45, days: S.L + 1.9, arrow2: S.L + 2.1, badge: S.L + 2.5, lOut: S.M - .16,
    // M  notifications
    ban: S.M + .1, banGap: .2, end: S.END - .08,
  };
  const fr = t => Math.round(t * FPS);
  // Sound events. `t` is the picture time of the visual event; audio.mjs places the onset at (frame + 1) / FPS.
  // `f` is a pitch ratio; st(n) keeps every tonal cue inside the A-minor bed.
  const EV = [], st = n => Math.pow(2, n / 12);
  const ev = (t, k, g = 1, f = 1, pan = 0) => EV.push({ t, k, g, f, pan });
  ev(0.0, 'bloom', 0.9, 1);
  ev(K.logoUp, 'whoosh', 0.5);
  for (let i = 0; i < 4; i++) ev(K.segFill0 + (i + 1) * K.segDur - .04, 'tick', 0.55, st([0, 3, 5, 7][i]), -0.45 + i * 0.3);
  ev(K.swap, 'swish', 0.5);
  ev(K.rowsMorph, 'whoosh', 0.5);
  K.hl.forEach((t, i) => ev(t, 'pop', 0.5, st([0, 2, 5][i]), [0.4, -0.2, -0.4][i]));
  ev(K.rank, 'swish', 0.55); ev(K.rank + 0.56, 'tick', 0.6, st(3));
  K.crown.forEach((t, i) => ev(t + 0.06, 'sparkle', 0.5, st([0, 2, 5][i]), -0.3));
  ev(K.leaf, 'pop', 0.6, st(7), -0.1); ev(K.leaf + 0.75, 'sparkle', 0.4, st(7));
  ev(K.podium, 'whoosh', 0.55);
  [2, 1, 0].forEach((k, i) => ev(K.colRise[k] + 0.08, 'rise', 0.5, st([0, 3, 7][i]), [0, -0.5, 0.5][k]));
  ev(K.dollar, 'coin', 0.45, st(0));
  ev(K.heroUp, 'whoosh', 0.45);
  ev(K.opts + 0.05, 'tap', 0.4, st(0), -0.3); ev(K.opts + 0.15, 'tap', 0.4, st(2), 0.3);
  ev(K.pick, 'tick', 0.7, st(3), -0.3); ev(K.pick + 0.07, 'sparkle', 0.35, st(2), -0.3);
  K.chips.forEach((t, i) => ev(t, 'pop', 0.55, st([2, 7][i]), i ? 0.3 : -0.3));
  ev(S.H - 0.1, 'whoosh', 0.5);
  ev(K.hit[0], 'coin', 0.65, st(0), 0); ev(K.hit[1], 'coin', 0.65, st(3), 0);
  ev(S.T2 - 0.2, 'whoosh', 0.6); ev(K.t2, 'bloom', 0.6, 2);
  [0, 0.08, 0.16].forEach((d, i) => ev(K.cluster + d, 'pop', 0.4, st([0, 5, 7][i]), [0, -0.3, 0.3][i]));
  ev(K.toCard, 'swish', 0.45);
  K.nick.forEach((t, i) => ev(t, 'tick', 0.4, st([0, 3, 5][i])));
  ev(K.nick[2] + 0.18, 'sparkle', 0.3, st(7));
  ev(K.dot, 'tap', 0.5, st(5));
  ev(K.toPin, 'whoosh', 0.5);
  for (let i = 0; i < 5; i++) ev(K.pins + i * K.pinGap, 'pop', 0.38, st([0, 2, 5, 7, 10][i]), [-0.5, 0.5, 0.5, -0.5, 0][i]);
  ev(K.league, 'swish', 0.4); ev(K.league + 0.3, 'sparkle', 0.3, st(0));
  ev(K.sheet, 'whoosh', 0.45); ev(K.chat, 'pop', 0.4, st(7), 0.2);
  ev(K.select + 0.3, 'tick', 0.7, st(3));
  ev(K.toL, 'whoosh', 0.5);
  ev(K.friend, 'pop', 0.55, st(2), 0.4);
  for (let i = 0; i < 5; i++) ev(K.tanks + i * K.tankGap, 'pop', 0.5, st([0, 2, 5, 7, 10][i]), -0.5 + i * 0.25);
  ev(K.km, 'rise', 0.45, st(7)); ev(K.km + 0.55, 'tick', 0.55, st(7));
  ev(K.days, 'tap', 0.45, st(5));
  ev(K.arrow2, 'swish', 0.4); ev(K.badge, 'coin', 0.5, st(5), -0.4);
  ev(K.lOut, 'whoosh', 0.45);
  for (let i = 0; i < 4; i++) ev(K.ban + i * K.banGap, 'ding', 0.5, st([0, 3, 5, 7][i]), [-0.2, 0.2, -0.1, 0.1][i]);
  ev(K.end + 0.08, 'bloom', 1.0, 1);
  root.TL = { FPS, DUR, BPM, S, K, EV, fr };
})(typeof module !== 'undefined' ? module.exports : window);
