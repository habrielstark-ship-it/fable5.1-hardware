// Minimal CDP client (Node built-in WebSocket) for driving the already-open Figma tab.
import fs from 'node:fs';

export async function connect(port, match = 'figma.com') {
  const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const page = list.find(t => t.type === 'page' && t.url.includes(match));
  if (!page) throw new Error('no page target: ' + list.map(t => t.type + ' ' + t.url.slice(0, 60)).join(' | '));
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0;
  const pending = new Map();
  const listeners = [];
  ws.onmessage = ev => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) {
      const { res, rej } = pending.get(m.id);
      pending.delete(m.id);
      m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result);
    } else if (m.method) listeners.forEach(l => l(m));
  };
  const send = (method, params = {}) => new Promise((res, rej) => {
    const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params }));
  });
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const api = {
    send, sleep, on: l => listeners.push(l), close: () => ws.close(),
    async click(x, y, count = 1) {
      await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
      for (let c = 1; c <= count; c++) {
        await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: c });
        await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: c });
      }
    },
    async key(key, code, vk, modifiers = 0, text) {
      const base = { key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, modifiers };
      await send('Input.dispatchKeyEvent', { type: text ? 'keyDown' : 'rawKeyDown', ...base, ...(text ? { text } : {}) });
      await send('Input.dispatchKeyEvent', { type: 'keyUp', ...base });
    },
    async evaluate(expression) {
      const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
      return r.result?.value;
    },
    async shot(file, clip) {
      const r = await send('Page.captureScreenshot', { format: 'png', ...(clip ? { clip: { ...clip, scale: clip.scale || 1 } } : {}) });
      fs.writeFileSync(file, Buffer.from(r.data, 'base64'));
    },
    zoomLabel: () => api.evaluate(`(()=>{const b=[...document.querySelectorAll('button')].find(b=>/zoom and view options/.test(b.getAttribute('aria-label')||''));return b?b.getAttribute('aria-label'):'?'})()`),
    url: () => api.evaluate('location.href'),
  };
  return api;
}
