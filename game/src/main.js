// The Copper Ladle — boot and the one loop. The game advances in fixed 1/60 s steps and the
// renderer paints what is there. ?shot=<scene>&seed=N stages a screenshot scene instead:
// it paints twice, records any error, and sets window.__shotReady.

import { createGame } from './game.js';
import { createRenderer } from './render.js';
import { stageShot } from './shots.js';

const STEP = 1 / 60;
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const canvas = document.getElementById('game');
const status = document.getElementById('status');
const renderer = createRenderer(canvas);

window.__shotErrors = [];
window.addEventListener('error', (e) => {
  window.__shotErrors.push(String(e.message || e.error || 'unknown error'));
});

if (shot) {
  let view;
  try {
    view = stageShot(shot);
  } catch (err) {
    window.__shotErrors.push(String(err && err.message ? err.message : err));
    view = stageShot('title');
  }
  let painted = 0;
  const paint = () => {
    try {
      renderer.draw(view);
    } catch (err) {
      window.__shotErrors.push(String(err && err.message ? err.message : err));
    }
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  };
  requestAnimationFrame(paint);
} else {
  const game = createGame();
  let last = performance.now();
  let acc = 0;

  function frame(now) {
    let dt = (now - last) / 1000;
    last = now;
    if (dt > MAX_FRAME) dt = MAX_FRAME;
    acc += dt;
    while (acc >= STEP) {
      game.step(STEP);
      acc -= STEP;
    }
    game.setHits(renderer.draw(game.view()));
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  function toGameCoords(evt) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((evt.clientX - rect.left) / rect.width) * 1280,
      y: ((evt.clientY - rect.top) / rect.height) * 800,
    };
  }
  canvas.addEventListener('pointerdown', (evt) => {
    const { x, y } = toGameCoords(evt);
    game.click(x, y);
  });
  window.addEventListener('keydown', (evt) => {
    if (evt.key === ' ') evt.preventDefault();
    game.key(evt.key);
  });
  status.textContent = 'The Copper Ladle: a cooking game. Use the mouse, Space to serve, M to mute.';
}
