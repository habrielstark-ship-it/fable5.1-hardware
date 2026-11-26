// Deterministic soundtrack: a 120 BPM bed locked to the scene grid plus SFX placed at (frame + 1) / FPS.
// usage: node audio.mjs <out.wav> [gainDb]
import fs from 'node:fs';
import { createRequire } from 'node:module';
const { TL } = createRequire(import.meta.url)('./timeline.js');
const { S, K, EV, FPS, DUR, BPM } = TL;

const SR = 48000, N = Math.round(DUR * SR), BEAT = 60 / BPM, BAR = 4 * BEAT;
const TAU = Math.PI * 2;
const mkBus = () => [new Float64Array(N), new Float64Array(N)];
const dry = mkBus(), rev = mkBus(), dly = mkBus();
const duck = new Float64Array(N).fill(1);                 // pad/bass ducking under the kick
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let x = Math.imul(s ^ (s >>> 15), 1 | s); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; }; }
const clamp = (x, a = 0, b = 1) => x < a ? a : x > b ? b : x;
const midi = m => 440 * Math.pow(2, (m - 69) / 12);

// write a mono voice into the buses with equal-power pan and reverb/delay sends
function voice(t0, dur, fn, { gain = 1, pan = 0, rv = 0, dl = 0 } = {}) {
  const i0 = Math.round(t0 * SR), n = Math.round(dur * SR), a = (pan + 1) * Math.PI / 4, gl = Math.cos(a) * gain, gr = Math.sin(a) * gain;
  for (let i = 0; i < n; i++) {
    const j = i0 + i; if (j < 0 || j >= N) continue;
    const v = fn(i / SR, i);
    dry[0][j] += v * gl; dry[1][j] += v * gr;
    if (rv) { rev[0][j] += v * gl * rv; rev[1][j] += v * gr * rv; }
    if (dl) { dly[0][j] += v * gl * dl; dly[1][j] += v * gr * dl; }
  }
}
// state-variable filter factory (per voice)
function svf() { let lo = 0, bd = 0; return (x, fc, q = .7) => { const f = 2 * Math.sin(Math.PI * Math.min(fc, SR * .22) / SR); lo += f * bd; const hi = x - lo - q * bd; bd += f * hi; return { lo, bd, hi }; }; }
const env = (t, a, d) => t < a ? t / a : Math.exp(-(t - a) / d);

/* ------------------------------ music bed ------------------------------ */
// The bar grid starts at 1.0 s with the first scene; the opening bloom and the pad swell are its pickup.
const BAR0 = 1.0, nBars = Math.ceil((DUR - BAR0) / BAR);
const CH = [                                    // A minor, calm and open: Am9  Fmaj7  Cmaj9  G6
  { root: 45, tones: [57, 60, 64, 71] }, { root: 41, tones: [57, 60, 64, 65] },
  { root: 48, tones: [55, 59, 64, 67] }, { root: 43, tones: [55, 59, 62, 64] },
];
const chordAt = bar => CH[((bar % 4) + 4) % 4];
const barT = b => BAR0 + b * BAR;
const ch2 = S.T2;                               // chapter two lifts the groove
const endHit = (TL.fr(K.end + .08) + 1) / FPS;  // sign-off

// pad: detuned partials, slow attack, gentle movement
for (let b = -1; b < nBars; b++) {
  const c = b < 0 ? CH[0] : chordAt(b), t0 = Math.max(0, barT(b) - .12), len = b < 0 ? barT(0) + .9 : BAR + .9;
  if (t0 >= endHit) continue;
  c.tones.forEach((m, k) => {
    const f = midi(m), ph = k * 1.7 + b, lift = t0 >= ch2 ? 1.25 : 1;
    voice(t0, len, t => {
      const e = Math.min(1, t / .7) * Math.min(1, (len - t) / .9) * (t0 + t > endHit - .05 ? Math.max(0, 1 - (t0 + t - endHit + .05) / .1) : 1);
      const w = Math.sin(TAU * f * t + ph) + .5 * Math.sin(TAU * f * 1.004 * t) + .28 * Math.sin(TAU * f * 2 * t + ph * .5) * (.6 + .4 * Math.sin(TAU * .23 * (t0 + t))) + .12 * Math.sin(TAU * f * 3 * t);
      return w * e * .034 * lift;
    }, { pan: [-.5, .35, -.2, .55][k], rv: .5 });
  });
}
// bass: warm sine with a little second harmonic
for (let b = 0; b < nBars; b++) {
  const c = chordAt(b), f = midi(c.root - 12);
  [[0, 1.4, 1], [2.5, .5, .7], [3, .9, .8]].forEach(([beat, len, g]) => {
    const t0 = barT(b) + beat * BEAT; if (t0 >= endHit - .2 || t0 < S.B - .01) return;
    voice(t0, len, t => (Math.sin(TAU * f * t) + .22 * Math.sin(TAU * 2 * f * t)) * Math.min(1, t / .012) * Math.exp(-t / (len * .55)) * .2 * g);
  });
}
// kick: soft, on beats 1 and 3; adds the "and of 4" lift in chapter two
for (let b = 0; b < nBars; b++) {
  const beats = barT(b) >= ch2 ? [0, 2, 3.5] : [0, 2];
  beats.forEach(beat => {
    const t0 = barT(b) + beat * BEAT; if (t0 < S.B - .01 || t0 >= endHit - .2) return;
    const g = beat === 3.5 ? .5 : 1;
    voice(t0, .32, t => Math.sin(TAU * (44 * t + (118 - 44) * .045 * (1 - Math.exp(-t / .045)))) * Math.min(1, t / .002) * Math.exp(-t / .11) * .5 * g);
    const i0 = Math.round(t0 * SR);
    for (let i = 0; i < .26 * SR; i++) { const j = i0 + i; if (j >= 0 && j < N) duck[j] = Math.min(duck[j], 1 - .34 * g * Math.exp(-(i / SR) / .09)); }
  });
}
// hats: quiet 8ths (16ths in chapter two), seeded
{
  const r = rng(11);
  for (let t0 = S.C; t0 < endHit - .3; t0 += BEAT / 4) {
    const step = Math.round((t0 - BAR0) / (BEAT / 4)), on8 = step % 2 === 0, late = t0 >= ch2;
    if (!on8 && !late) continue;
    const g = (step % 4 === 2 ? 1 : on8 ? .55 : .3) * (late ? 1 : .8), f = svf(), seed = rng(1000 + step);
    voice(t0, .07, t => f(seed() * 2 - 1, 9000, .9).hi * Math.exp(-t / .018) * .05 * g, { pan: (r() - .5) * .7, rv: .1 });
  }
}
// soft rim on beats 2 and 4 in chapter two
for (let b = 8; b < nBars; b++) [1, 3].forEach(beat => {
  const t0 = barT(b) + beat * BEAT; if (t0 >= endHit - .3) return;
  const f = svf(), seed = rng(5000 + b * 4 + beat);
  voice(t0, .16, t => (f(seed() * 2 - 1, 1900, .5).bd * .7 + Math.sin(TAU * 410 * t) * .25) * Math.exp(-t / .035) * .11, { pan: .12, rv: .35 });
});
// pluck arpeggio on 8ths with a dotted-eighth echo
{
  const PAT = [0, 2, 1, 3, 2, 1, 3, 2];
  for (let b = 0; b < nBars; b++) for (let s = 0; s < 8; s++) {
    const t0 = barT(b) + s * BEAT / 2; if (t0 < S.B - .01 || t0 >= endHit - .25) continue;
    const c = chordAt(b), late = t0 >= ch2, m = c.tones[PAT[s]] + 12 + (late && s % 4 === 3 ? 12 : 0), f = midi(m);
    const g = (s % 2 ? .6 : 1) * (late ? 1.1 : .85);
    voice(t0, .5, t => {
      const e = Math.min(1, t / .003) * Math.exp(-t / .12);
      return (Math.sin(TAU * f * t + 1.6 * Math.exp(-t / .05) * Math.sin(TAU * f * 2 * t)) + .2 * Math.sin(TAU * f * 2 * t)) * e * .05 * g;
    }, { pan: [-.35, .35][s % 2], rv: .3, dl: .4 });
  }
}

/* ------------------------------ SFX ------------------------------ */
const A4 = 440, PENT = [0, 3, 5, 7, 10, 12, 15, 17];
// safety net: snap any tonal cue to A natural minor so SFX never clash with the bed
const SCALE = new Set([9, 11, 0, 2, 4, 5, 7]);
const key = f => { const m = Math.round(69 + 12 * Math.log2(f / 440)); for (const d of [0, -1, 1, -2, 2]) if (SCALE.has((((m + d) % 12) + 12) % 12)) return midi(m + d); return f; };
const SFX = {
  bloom(t0, g, f, pan) {                     // soft chord swell with shimmer
    (f > 1.5 ? [55, 62, 67, 71, 74] : [57, 64, 69, 72, 76]).forEach((m, k) => { const fr = midi(m); voice(t0, 2.2, t => (Math.sin(TAU * fr * t) + .3 * Math.sin(TAU * fr * 2.001 * t)) * Math.min(1, t / .09) * Math.exp(-t / .7) * .075 * g, { pan: (k - 2) * .3, rv: .9 }); });
    const fl = svf(), r = rng(21 + Math.round(t0 * 100));
    voice(t0, .9, t => fl(r() * 2 - 1, 1200 + 5200 * Math.exp(-t / .25), .6).bd * Math.min(1, t / .02) * Math.exp(-t / .22) * .1 * g, { rv: .7 });
    voice(t0, .5, t => Math.sin(TAU * (52 * t + 60 * .06 * (1 - Math.exp(-t / .06)))) * Math.min(1, t / .004) * Math.exp(-t / .16) * .34 * g);
  },
  whoosh(t0, g, f, pan) {                    // airy band-passed sweep
    const fl = svf(), r = rng(31 + Math.round(t0 * 100)), d = .62;
    voice(t0, d, t => { const u = t / d; return fl(r() * 2 - 1, (500 + 4200 * Math.sin(Math.PI * Math.pow(u, .7))) * f, .5).bd * Math.pow(Math.sin(Math.PI * Math.pow(u, .6)), 1.6) * .26 * g; }, { pan, rv: .45 });
  },
  swish(t0, g, f, pan) {
    const fl = svf(), r = rng(41 + Math.round(t0 * 100)), d = .32;
    voice(t0, d, t => { const u = t / d; return fl(r() * 2 - 1, (1500 + 5200 * u) * f, .6).bd * Math.pow(Math.sin(Math.PI * Math.pow(u, .55)), 1.4) * .2 * g; }, { pan, rv: .35 });
  },
  tick(t0, g, f, pan) {                      // tactile UI snap
    const fr = key(1760 * f), r = rng(51 + Math.round(t0 * 100)), fl = svf();
    voice(t0, .12, t => (Math.sin(TAU * fr * t) * Math.exp(-t / .016) * .5 + fl(r() * 2 - 1, 5200, .8).bd * Math.exp(-t / .005) * .5) * Math.min(1, t / .0008) * .3 * g, { pan, rv: .22 });
  },
  tap(t0, g, f, pan) {                       // soft thud
    const fr = key(196 * f);
    voice(t0, .2, t => Math.sin(TAU * (fr * t + fr * .5 * .02 * (1 - Math.exp(-t / .02)))) * Math.min(1, t / .002) * Math.exp(-t / .05) * .36 * g, { pan, rv: .2 });
  },
  pop(t0, g, f, pan) {                       // rounded blip with an upward pitch flick
    const fr = key(587.33 * f);
    voice(t0, .22, t => Math.sin(TAU * (fr * t - fr * .38 * .03 * (1 - Math.exp(-t / .03)))) * Math.min(1, t / .002) * Math.exp(-t / .055) * .3 * g, { pan, rv: .3, dl: .15 });
  },
  sparkle(t0, g, f, pan) {                   // three tiny bells climbing the scale
    [0, 2, 4].forEach((s, k) => { const fr = key(A4 * 4 * Math.pow(2, PENT[s + 2] / 12) * f / 2); voice(t0 + k * .045, .6, t => (Math.sin(TAU * fr * t) + .35 * Math.sin(TAU * fr * 2.76 * t) * Math.exp(-t / .05)) * Math.min(1, t / .002) * Math.exp(-t / .13) * .12 * g, { pan: clamp(pan + (k - 1) * .25, -1, 1), rv: .7, dl: .25 }); });
  },
  rise(t0, g, f, pan) {                      // column / counter rising
    const d = .5, f0 = 220 * f;
    voice(t0, d, t => { const u = t / d, ph = TAU * f0 * (t + .5 * t * t / d); return (Math.sin(ph) + .3 * Math.sin(2 * ph)) * Math.sin(Math.PI * Math.pow(u, .8)) * .15 * g; }, { pan, rv: .35 });
  },
  coin(t0, g, f, pan) {                      // two-note reward bell
    [[0, 1318.5], [.07, 1975.5]].forEach(([dt, fr0]) => { const fr = key(fr0 * f); voice(t0 + dt, .7, t => (Math.sin(TAU * fr * t) + .4 * Math.sin(TAU * fr * 2.41 * t) * Math.exp(-t / .06)) * Math.min(1, t / .0015) * Math.exp(-t / .16) * .17 * g, { pan, rv: .55, dl: .2 }); });
  },
  ding(t0, g, f, pan) {                      // notification
    const fr = key(880 * f);
    voice(t0, .8, t => (Math.sin(TAU * fr * t) + .5 * Math.sin(TAU * fr * 2 * t) * Math.exp(-t / .1) + .2 * Math.sin(TAU * fr * 3.01 * t) * Math.exp(-t / .05)) * Math.min(1, t / .002) * Math.exp(-t / .2) * .2 * g, { pan, rv: .55, dl: .2 });
    SFX.tap(t0, g * .6, .8, pan);
  },
};
const cues = [];
for (const e of EV) {
  if (e.t < 0 || e.t >= DUR) continue;
  const frame = Math.round(e.t * FPS), onset = (frame + 1) / FPS;      // frame + 1 rule
  SFX[e.k](onset, e.g, e.f, e.pan);
  cues.push({ k: e.k, frame, onset: +onset.toFixed(4) });
}

/* ------------------------------ sends, master ------------------------------ */
// ducking applies to the sustained bed only via a broadband dip: cheap and musical at this depth
for (let c = 0; c < 2; c++) for (let i = 0; i < N; i++) dry[c][i] *= .72 + .28 * duck[i];
// dotted-eighth feedback delay, cross-fed
{
  const D = Math.round(.75 * BEAT * SR), fb = .36, lp = [0, 0];
  for (let i = D; i < N; i++) for (let c = 0; c < 2; c++) {
    const x = dly[1 - c][i - D]; lp[c] += .35 * (x - lp[c]);
    dly[c][i] += lp[c] * fb;
  }
  for (let c = 0; c < 2; c++) for (let i = 0; i < N; i++) { dry[c][i] += dly[c][i] * .5; rev[c][i] += dly[c][i] * .2; }
}
// small plate: 4 damped combs + 2 allpasses per side
{
  const combs = [[1557, 1617, 1491, 1422], [1583, 1640, 1513, 1447]], aps = [[225, 556], [248, 579]];
  for (let c = 0; c < 2; c++) {
    const out = new Float64Array(N);
    for (const d of combs[c]) { const buf = new Float64Array(d); let k = 0, lp = 0; for (let i = 0; i < N; i++) { const y = buf[k]; lp += .28 * (y - lp); buf[k] = rev[c][i] + lp * .8; out[i] += y; if (++k >= d) k = 0; } }
    for (const d of aps[c]) { const buf = new Float64Array(d); let k = 0; for (let i = 0; i < N; i++) { const b = buf[k], x = out[i]; const y = -x * .5 + b; buf[k] = x + b * .5; out[i] = y; if (++k >= d) k = 0; } }
    for (let i = 0; i < N; i++) dry[c][i] += out[i] * .15;
  }
}
// master: DC-safe high-pass, fades, gain, soft limiter with headroom below -1 dBTP
const gainDb = +(process.argv[3] || 0), gain = Math.pow(10, gainDb / 20), CEIL = .84;
let peak = 0, knee = 0;
for (let c = 0; c < 2; c++) {
  let hp = 0, px = 0;
  for (let i = 0; i < N; i++) {
    const x = dry[c][i]; hp = .9975 * (hp + x - px); px = x;
    const t = i / SR, fade = Math.min(1, t / .004) * Math.min(1, (DUR - t) / .5);
    let v = hp * gain * fade;
    const a = Math.abs(v); if (a > .6) { knee++; v = Math.sign(v) * (.6 + (CEIL - .6) * Math.tanh((a - .6) / (CEIL - .6))); }
    dry[c][i] = v; if (Math.abs(v) > peak) peak = Math.abs(v);
  }
}
const buf = Buffer.alloc(44 + N * 2 * 3);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 6, 4); buf.write('WAVEfmt ', 8); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 6, 28); buf.writeUInt16LE(6, 32); buf.writeUInt16LE(24, 34); buf.write('data', 36); buf.writeUInt32LE(N * 6, 40);
for (let i = 0, o = 44; i < N; i++) for (let c = 0; c < 2; c++, o += 3) buf.writeIntLE(Math.round(clamp(dry[c][i], -1, 1) * 8388607), o, 3);
fs.writeFileSync(process.argv[2], buf);
fs.writeFileSync(process.argv[2].replace(/\.wav$/, '.cues.json'), JSON.stringify(cues));
console.log(`wav ${process.argv[2]} dur=${(N / SR).toFixed(3)}s gain=${gainDb}dB samplePeak=${(20 * Math.log10(peak)).toFixed(2)}dBFS limited=${(100 * knee / (2 * N)).toFixed(3)}% cues=${cues.length}`);
