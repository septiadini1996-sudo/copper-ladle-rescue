// The Copper Ladle — screenshot capture + headless render check.
// Serves the repo statically, drives headless Chromium over CDP, captures the four
// official screenshots from shots.json into screenshots/, and render-checks EVERY
// staged scene: no page errors (window.__shotErrors must be empty) and a non-blank,
// colourful canvas. Scene renders also land in /tmp/v5-scenes/ for visual inspection.
// Run: node tools/capture.mjs

import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const CHROME = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1255/chrome-headless-shell-linux64/chrome-headless-shell';
const PORT = 9341;
const SCENES = ['cover', 'assembly', 'shop', 'summary', 'title', 'ladder', 'intro', 'story', 'howto', 'recipes', 'achievements', 'gameover', 'victory', 'paused', 'dishes'];
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png', '.md': 'text/plain' };

const server = createServer((req, res) => {
  const path = normalize(join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname)));
  if (!path.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
  try {
    const body = readFileSync(path);
    res.writeHead(200, { 'content-type': MIME[extname(path)] || 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404); res.end('not found'); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

const chrome = spawn(CHROME, [
  '--headless', '--no-sandbox', '--disable-gpu', `--remote-debugging-port=${PORT}`,
  '--window-size=1280,800', 'about:blank',
], { stdio: 'ignore' });

async function pageWsUrl() {
  for (let i = 0; i < 50; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      const page = list.find((t) => t.type === 'page');
      if (page) return page.webSocketDebuggerUrl;
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('chromium CDP never came up');
}

const ws = new WebSocket(await pageWsUrl());
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
let nextId = 1;
const pending = new Map();
ws.onmessage = (msg) => {
  const data = JSON.parse(msg.data);
  if (data.id && pending.has(data.id)) { pending.get(data.id)(data); pending.delete(data.id); }
};
function send(method, params = {}) {
  const id = nextId++;
  return new Promise((resolve) => { pending.set(id, resolve); ws.send(JSON.stringify({ id, method, params })); });
}
async function evaluate(expression) {
  const res = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (res.result?.exceptionDetails) throw new Error('page exception: ' + JSON.stringify(res.result.exceptionDetails).slice(0, 300));
  return res.result?.result?.value;
}
async function gotoShot(query) {
  await send('Page.navigate', { url: `${base}/game/index.html${query}` });
  for (let i = 0; i < 150; i++) {
    if (await evaluate('window.__shotReady === true')) return;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error('shot never became ready: ' + query);
}
async function screenshotJpeg(quality) {
  const res = await send('Page.captureScreenshot', { format: 'jpeg', quality, captureBeyondViewport: false });
  return Buffer.from(res.result.data, 'base64');
}

await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });

let failures = 0;
// ---- render check: every scene, no errors, non-blank canvas
mkdirSync('/tmp/v5-scenes', { recursive: true });
for (const scene of SCENES) {
  await gotoShot(`?shot=${scene}&seed=3`);
  const errors = await evaluate('JSON.stringify(window.__shotErrors || [])');
  const distinct = await evaluate(`(() => {
    const c = document.getElementById('game');
    const ctx = c.getContext('2d');
    const img = ctx.getImageData(0, 0, c.width, c.height).data;
    const seen = new Set();
    for (let i = 0; i < img.length; i += 9973 * 4) seen.add((img[i] >> 4) + ',' + (img[i + 1] >> 4) + ',' + (img[i + 2] >> 4));
    return seen.size;
  })()`);
  const errs = JSON.parse(errors);
  const good = errs.length === 0 && distinct > 12;
  if (!good) failures += 1;
  console.log(`${good ? 'OK  ' : 'FAIL'} scene ${scene}: errors=${errs.length}${errs.length ? ' ' + errors : ''} distinctColours~${distinct}`);
  writeFileSync(`/tmp/v5-scenes/${scene}.jpg`, await screenshotJpeg(72));
}

// ---- official screenshots
const shots = JSON.parse(readFileSync(join(ROOT, 'shots.json'), 'utf8'));
mkdirSync(join(ROOT, 'screenshots'), { recursive: true });
for (const shot of shots) {
  await gotoShot(shot.query);
  const errors = JSON.parse(await evaluate('JSON.stringify(window.__shotErrors || [])'));
  let quality = 82;
  let buf = await screenshotJpeg(quality);
  while (buf.length > 262144 && quality > 30) { quality -= 12; buf = await screenshotJpeg(quality); }
  writeFileSync(join(ROOT, 'screenshots', shot.name), buf);
  const size = statSync(join(ROOT, 'screenshots', shot.name)).size;
  const good = errors.length === 0 && size <= 262144;
  if (!good) failures += 1;
  console.log(`${good ? 'OK  ' : 'FAIL'} screenshot ${shot.name}: ${size} bytes (jpeg q${quality}), errors=${errors.length}`);
}

ws.close();
chrome.kill();
server.close();
console.log(failures === 0 ? '\nALL RENDER CHECKS PASSED' : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
