// Deterministic frame renderer: launches headless Chrome, seeks the film with window.renderAt(t), saves frames.
// usage: node render.mjs <port> frames <from> <to> <outDir>      (frame indices, [from, to))
//        node render.mjs <port> stills <outDir> <t1,t2,...>      (PNG stills at given seconds)
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { connect } from './cdp.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const [port, mode, ...rest] = process.argv.slice(2);
const FPS = 60, W = 1080, H = 1920;
const chrome = spawn('google-chrome', ['--headless=new', '--no-sandbox', '--disable-dev-shm-usage', '--hide-scrollbars', '--mute-audio',
  `--remote-debugging-port=${port}`, `--user-data-dir=/tmp/chr-film-${port}`, `--window-size=${W},${H}`, '--force-device-scale-factor=1',
  '--allow-file-access-from-files', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let c;
for (let i = 0; i < 60 && !c; i++) { await sleep(250); try { c = await connect(port, 'about:blank'); } catch { } }
if (!c) { chrome.kill(); throw new Error('chrome did not start'); }
const errors = [];
c.on(m => {
  if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push(m.params.args.map(a => a.value || a.description).join(' '));
});
try {
  await c.send('Runtime.enable'); await c.send('Page.enable');
  await c.send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
  await c.send('Page.navigate', { url: pathToFileURL(path.join(here, 'index.html')).href });
  await sleep(600);
  const ok = await c.send('Runtime.evaluate', { expression: 'window.ready', awaitPromise: true, returnByValue: true });
  if (ok.exceptionDetails) throw new Error('page failed: ' + (ok.exceptionDetails.exception?.description || ok.exceptionDetails.text));
  const seek = async t => {
    const r = await c.send('Runtime.evaluate', { expression: `renderAt(${t}); new Promise(r => requestAnimationFrame(() => r(1)))`, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(`renderAt(${t}): ` + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
  };
  const shot = async (file, format) => {
    const r = await c.send('Page.captureScreenshot', { format, ...(format === 'jpeg' ? { quality: 97 } : {}), clip: { x: 0, y: 0, width: W, height: H, scale: 1 }, optimizeForSpeed: true });
    fs.writeFileSync(file, Buffer.from(r.data, 'base64'));
  };
  if (mode === 'stills') {
    const [outDir, list] = rest; fs.mkdirSync(outDir, { recursive: true });
    for (const s of list.split(',')) { const t = +s; await seek(t); await shot(path.join(outDir, `t${t.toFixed(3).padStart(6, '0')}.png`), 'png'); }
  } else {
    const [from, to, outDir] = [+rest[0], +rest[1], rest[2]]; fs.mkdirSync(outDir, { recursive: true });
    const t0 = Date.now();
    for (let f = from; f < to; f++) {
      await seek(f / FPS); await shot(path.join(outDir, `f${String(f).padStart(5, '0')}.jpg`), 'jpeg');
      if ((f - from) % 150 === 149) console.log(`frame ${f + 1}/${to} ${((Date.now() - t0) / (f - from + 1)).toFixed(0)}ms/frame`);
    }
  }
  if (errors.length) console.log('PAGE ERRORS:\n' + [...new Set(errors)].slice(0, 8).join('\n'));
  console.log('done', mode);
} finally { c.close(); chrome.kill(); }
