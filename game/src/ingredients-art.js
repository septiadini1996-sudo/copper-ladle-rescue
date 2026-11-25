// The Copper Ladle — every ingredient is drawn in code, twice: as a pantry/station ICON and as
// a wide flat LAYER for the plating stack. All painters share one polish language: the same
// outline weight relative to size, a light side (top-left highlight), a shadow side (darker
// base), and one small white glint. No images, no icon fonts — paths only.

import { INGREDIENTS } from './data.js';

const OUTLINE = 'rgba(46,26,12,0.6)';

function style(ctx, s, fill) {
  ctx.fillStyle = fill;
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = Math.max(1, s * 0.07);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
}

function glint(ctx, x, y, s) {
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.beginPath();
  ctx.ellipse(x - s * 0.16, y - s * 0.18, s * 0.13, s * 0.07, -0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function shade(ctx, x, y, s, dark) {
  ctx.save();
  ctx.fillStyle = dark;
  ctx.globalAlpha = 0.35;
  ctx.beginPath();
  ctx.ellipse(x, y + s * 0.22, s * 0.34, s * 0.16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function circ(ctx, x, y, r, fill) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.stroke();
}

function ell(ctx, x, y, rx, ry, fill) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.stroke();
}

/** Icon painters: draw inside a box of size s centred on (x, y). */
const ICONS = {
  bun(c, x, y, s, d) {
    style(c, s, d.color);
    c.beginPath(); c.arc(x, y + s * 0.08, s * 0.36, Math.PI, 0); c.closePath(); c.fill(); c.stroke();
    shade(c, x, y + s * 0.1, s, d.dark);
    c.fillStyle = '#fff6d8';
    for (const [dx, dy] of [[-0.14, -0.14], [0.02, -0.2], [0.16, -0.1]]) {
      c.beginPath(); c.ellipse(x + dx * s, y + dy * s, s * 0.035, s * 0.02, 0.5, 0, Math.PI * 2); c.fill();
    }
    glint(c, x, y, s);
  },
  patty(c, x, y, s, d) {
    style(c, s, d.color);
    ell(c, x, y, s * 0.38, s * 0.24, d.color);
    c.fillStyle = d.dark;
    for (const [dx, dy] of [[-0.18, -0.04], [0.1, 0.06], [0.2, -0.08]]) {
      c.beginPath(); c.ellipse(x + dx * s, y + dy * s, s * 0.05, s * 0.03, 0.4, 0, Math.PI * 2); c.fill();
    }
    glint(c, x, y, s);
  },
  cheese(c, x, y, s, d) {
    style(c, s, d.color);
    c.beginPath();
    c.moveTo(x - s * 0.36, y + s * 0.22); c.lineTo(x + s * 0.36, y + s * 0.22); c.lineTo(x + s * 0.1, y - s * 0.26); c.closePath();
    c.fill(); c.stroke();
    c.fillStyle = d.dark;
    for (const [dx, dy, r] of [[-0.12, 0.08, 0.05], [0.08, 0.02, 0.04], [0.02, 0.14, 0.03]]) circ(c, x + dx * s, y + dy * s, r * s, d.dark);
    glint(c, x, y, s);
  },
  lettuce(c, x, y, s, d) {
    style(c, s, d.color);
    c.beginPath();
    for (let i = 0; i <= 6; i++) {
      const px = x - s * 0.36 + (i * s * 0.72) / 6;
      const py = y - s * 0.1 + (i % 2 ? -s * 0.12 : s * 0.02);
      if (i === 0) c.moveTo(px, py); else c.lineTo(px, py);
    }
    c.lineTo(x + s * 0.36, y + s * 0.26); c.lineTo(x - s * 0.36, y + s * 0.26); c.closePath();
    c.fill(); c.stroke();
    c.strokeStyle = d.dark; c.lineWidth = Math.max(1, s * 0.04);
    c.beginPath(); c.moveTo(x, y - s * 0.12); c.lineTo(x, y + s * 0.24); c.stroke();
    glint(c, x, y, s);
  },
  tomato(c, x, y, s, d) {
    style(c, s, d.color);
    circ(c, x, y + s * 0.05, s * 0.34, d.color);
    shade(c, x, y + s * 0.05, s, d.dark);
    c.fillStyle = '#3f9e4d';
    c.beginPath();
    c.moveTo(x, y - s * 0.36);
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i * Math.PI * 2) / 5;
      c.lineTo(x + Math.cos(a) * s * 0.16, y - s * 0.24 + Math.sin(a) * s * 0.1);
      const a2 = a + Math.PI / 5;
      c.lineTo(x + Math.cos(a2) * s * 0.07, y - s * 0.24 + Math.sin(a2) * s * 0.05);
    }
    c.closePath(); c.fill(); c.stroke();
    glint(c, x, y, s);
  },
  onion(c, x, y, s, d) {
    style(c, s, d.color);
    c.beginPath();
    c.moveTo(x, y - s * 0.38);
    c.bezierCurveTo(x + s * 0.36, y - s * 0.12, x + s * 0.34, y + s * 0.3, x, y + s * 0.36);
    c.bezierCurveTo(x - s * 0.34, y + s * 0.3, x - s * 0.36, y - s * 0.12, x, y - s * 0.38);
    c.fill(); c.stroke();
    c.strokeStyle = d.dark; c.lineWidth = Math.max(1, s * 0.04);
    for (const off of [-0.16, 0, 0.16]) {
      c.beginPath(); c.moveTo(x + off * s, y - s * 0.22); c.quadraticCurveTo(x + off * s * 1.4, y, x + off * s, y + s * 0.3); c.stroke();
    }
    glint(c, x, y, s);
  },
  bacon(c, x, y, s, d) {
    style(c, s, d.color);
    for (const off of [-0.16, 0.14]) {
      c.beginPath();
      c.moveTo(x - s * 0.34, y + off * s);
      c.bezierCurveTo(x - s * 0.12, y + (off - 0.14) * s, x + s * 0.12, y + (off + 0.14) * s, x + s * 0.34, y + off * s);
      c.lineTo(x + s * 0.34, y + (off + 0.16) * s);
      c.bezierCurveTo(x + s * 0.12, y + (off + 0.3) * s, x - s * 0.12, y + (off + 0.02) * s, x - s * 0.34, y + (off + 0.16) * s);
      c.closePath(); c.fill(); c.stroke();
    }
    c.strokeStyle = '#f3d9c8'; c.lineWidth = Math.max(1, s * 0.05);
    c.beginPath(); c.moveTo(x - s * 0.3, y - s * 0.08); c.bezierCurveTo(x, y - s * 0.2, x, y + s * 0.04, x + s * 0.3, y - s * 0.08); c.stroke();
    glint(c, x, y, s);
  },
  egg(c, x, y, s, d) {
    style(c, s, d.color);
    ell(c, x, y, s * 0.38, s * 0.3, '#fdf6e3');
    circ(c, x, y, s * 0.16, '#f6b81e');
    glint(c, x, y, s);
  },
  chicken(c, x, y, s, d) {
    style(c, s, d.color);
    ell(c, x - s * 0.04, y + s * 0.02, s * 0.32, s * 0.26, d.color);
    shade(c, x, y, s, d.dark);
    c.strokeStyle = d.dark; c.lineWidth = Math.max(1, s * 0.045);
    for (const off of [-0.12, 0.02, 0.16]) {
      c.beginPath(); c.moveTo(x - s * 0.2, y + off * s); c.lineTo(x + s * 0.16, y + off * s); c.stroke();
    }
    circ(c, x + s * 0.24, y + s * 0.24, s * 0.09, '#f5efe0');
    glint(c, x, y, s);
  },
  fish(c, x, y, s, d) {
    style(c, s, d.color);
    c.beginPath();
    c.moveTo(x - s * 0.38, y);
    c.quadraticCurveTo(x - s * 0.05, y - s * 0.3, x + s * 0.22, y - s * 0.05);
    c.lineTo(x + s * 0.4, y - s * 0.2); c.lineTo(x + s * 0.4, y + s * 0.2); c.lineTo(x + s * 0.22, y + s * 0.05);
    c.quadraticCurveTo(x - s * 0.05, y + s * 0.3, x - s * 0.38, y);
    c.fill(); c.stroke();
    circ(c, x - s * 0.2, y - s * 0.04, s * 0.045, '#20303c');
    c.strokeStyle = d.dark; c.lineWidth = Math.max(1, s * 0.04);
    c.beginPath(); c.arc(x + s * 0.02, y, s * 0.16, -0.9, 0.9); c.stroke();
    glint(c, x, y, s);
  },
  shrimp(c, x, y, s, d) {
    style(c, s, d.color);
    c.beginPath(); c.arc(x, y, s * 0.3, Math.PI * 0.4, Math.PI * 1.75); c.stroke();
    c.lineWidth = Math.max(1.5, s * 0.16); c.strokeStyle = d.color;
    c.beginPath(); c.arc(x, y, s * 0.26, Math.PI * 0.45, Math.PI * 1.7); c.stroke();
    c.lineWidth = Math.max(1, s * 0.05); c.strokeStyle = d.dark;
    for (const a of [0.7, 1.05, 1.4]) {
      c.beginPath();
      c.moveTo(x + Math.cos(a * Math.PI) * s * 0.16, y + Math.sin(a * Math.PI) * s * 0.16);
      c.lineTo(x + Math.cos(a * Math.PI) * s * 0.36, y + Math.sin(a * Math.PI) * s * 0.36);
      c.stroke();
    }
    c.strokeStyle = d.color; c.lineWidth = Math.max(1, s * 0.09);
    c.beginPath(); c.moveTo(x + s * 0.24, y - s * 0.2); c.lineTo(x + s * 0.4, y - s * 0.34); c.stroke();
    glint(c, x, y, s);
  },
  noodles(c, x, y, s, d) {
    style(c, s, d.color);
    c.strokeStyle = d.color; c.lineWidth = Math.max(1.5, s * 0.09);
    for (const off of [-0.16, 0, 0.16]) {
      c.beginPath();
      c.moveTo(x - s * 0.34, y + off * s);
      c.bezierCurveTo(x - s * 0.1, y + (off - 0.16) * s, x + s * 0.1, y + (off + 0.16) * s, x + s * 0.34, y + off * s);
      c.stroke();
    }
    c.strokeStyle = d.dark; c.lineWidth = Math.max(1, s * 0.03);
    c.beginPath(); c.moveTo(x - s * 0.34, y - s * 0.05); c.bezierCurveTo(x, y - s * 0.22, x, y + s * 0.1, x + s * 0.34, y - s * 0.05); c.stroke();
    glint(c, x, y, s);
  },
  rice(c, x, y, s, d) {
    style(c, s, d.color);
    c.fillStyle = d.color;
    const grains = [[-0.2, -0.1], [0, -0.18], [0.2, -0.08], [-0.12, 0.08], [0.1, 0.1], [0, 0.22], [-0.26, 0.14], [0.26, 0.16]];
    for (const [dx, dy] of grains) {
      c.beginPath(); c.ellipse(x + dx * s, y + dy * s, s * 0.11, s * 0.05, dx * 2, 0, Math.PI * 2); c.fill(); c.stroke();
    }
    glint(c, x, y, s);
  },
  pasta(c, x, y, s, d) {
    style(c, s, d.color);
    c.strokeStyle = d.color; c.lineWidth = Math.max(1.5, s * 0.1);
    for (const off of [-0.14, 0.05]) {
      c.beginPath(); c.moveTo(x - s * 0.3, y + off * s); c.lineTo(x + s * 0.3, y + (off - 0.1) * s); c.stroke();
      c.beginPath(); c.moveTo(x - s * 0.3, y + (off + 0.14) * s); c.lineTo(x + s * 0.3, y + off * s); c.stroke();
    }
    glint(c, x, y, s);
  },
  broth(c, x, y, s, d) {
    style(c, s, d.color);
    c.beginPath();
    c.moveTo(x - s * 0.36, y - s * 0.1); c.lineTo(x + s * 0.36, y - s * 0.1);
    c.quadraticCurveTo(x + s * 0.3, y + s * 0.32, x, y + s * 0.34);
    c.quadraticCurveTo(x - s * 0.3, y + s * 0.32, x - s * 0.36, y - s * 0.1);
    c.fill(); c.stroke();
    ell(c, x, y - s * 0.1, s * 0.36, s * 0.09, d.light);
    c.strokeStyle = 'rgba(255,255,255,0.65)'; c.lineWidth = Math.max(1, s * 0.045);
    for (const off of [-0.14, 0.1]) {
      c.beginPath(); c.moveTo(x + off * s, y - s * 0.3); c.quadraticCurveTo(x + (off + 0.08) * s, y - s * 0.42, x + off * s, y - s * 0.52); c.stroke();
    }
    glint(c, x, y, s);
  },
  mushroom(c, x, y, s, d) {
    style(c, s, d.color);
    c.beginPath(); c.arc(x, y - s * 0.02, s * 0.36, Math.PI, 0); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#fff';
    for (const [dx, dy, r] of [[-0.16, -0.18, 0.05], [0.08, -0.24, 0.04], [0.2, -0.08, 0.035]]) circ(c, x + dx * s, y + dy * s, r * s, 'rgba(255,255,255,0.85)');
    ell(c, x, y + s * 0.16, s * 0.13, s * 0.18, '#f3e6cf');
    glint(c, x, y, s);
  },
  carrot(c, x, y, s, d) {
    style(c, s, d.color);
    c.beginPath();
    c.moveTo(x - s * 0.2, y - s * 0.18); c.lineTo(x + s * 0.22, y - s * 0.14); c.lineTo(x - s * 0.02, y + s * 0.38); c.closePath();
    c.fill(); c.stroke();
    c.strokeStyle = d.dark; c.lineWidth = Math.max(1, s * 0.04);
    c.beginPath(); c.moveTo(x - s * 0.1, y + s * 0.02); c.lineTo(x + s * 0.06, y + s * 0.03); c.stroke();
    c.beginPath(); c.moveTo(x - s * 0.05, y + s * 0.16); c.lineTo(x + s * 0.05, y + s * 0.17); c.stroke();
    c.strokeStyle = '#3f9e4d';
    for (const a of [-0.5, 0, 0.5]) {
      c.beginPath(); c.moveTo(x, y - s * 0.18); c.quadraticCurveTo(x + Math.sin(a) * s * 0.2, y - s * 0.34, x + Math.sin(a) * s * 0.26, y - s * 0.42); c.stroke();
    }
    glint(c, x, y, s);
  },
  potato(c, x, y, s, d) {
    style(c, s, d.color);
    c.fillStyle = d.color;
    for (const off of [-0.2, 0, 0.2]) {
      c.save(); c.translate(x + off * s, y); c.rotate(off * 0.5);
      c.beginPath(); c.roundRect(-s * 0.07, -s * 0.34, s * 0.14, s * 0.62, s * 0.05); c.fill(); c.stroke();
      c.restore();
    }
    glint(c, x, y, s);
  },
  dough(c, x, y, s, d) {
    style(c, s, d.color);
    ell(c, x, y + s * 0.06, s * 0.36, s * 0.26, d.color);
    shade(c, x, y, s, d.dark);
    c.fillStyle = 'rgba(255,255,255,0.75)';
    for (const [dx, dy] of [[-0.16, -0.08], [0.06, -0.14], [0.18, 0.02]]) circ(c, x + dx * s, y + dy * s, s * 0.03, 'rgba(255,255,255,0.8)');
    glint(c, x, y, s);
  },
  bread(c, x, y, s, d) {
    style(c, s, d.color);
    c.beginPath();
    c.moveTo(x - s * 0.34, y + s * 0.28); c.lineTo(x - s * 0.34, y - s * 0.05);
    c.quadraticCurveTo(x - s * 0.34, y - s * 0.3, x, y - s * 0.3);
    c.quadraticCurveTo(x + s * 0.34, y - s * 0.3, x + s * 0.34, y - s * 0.05);
    c.lineTo(x + s * 0.34, y + s * 0.28); c.closePath();
    c.fill(); c.stroke();
    c.strokeStyle = d.dark; c.lineWidth = Math.max(1, s * 0.045);
    for (const off of [-0.16, 0, 0.16]) {
      c.beginPath(); c.moveTo(x + off * s - s * 0.05, y - s * 0.16); c.lineTo(x + off * s + s * 0.05, y - s * 0.22); c.stroke();
    }
    glint(c, x, y, s);
  },
  sausage(c, x, y, s, d) {
    style(c, s, d.color);
    c.save(); c.translate(x, y); c.rotate(-0.5);
    c.beginPath(); c.roundRect(-s * 0.38, -s * 0.13, s * 0.76, s * 0.26, s * 0.13); c.fill(); c.stroke();
    c.restore();
    glint(c, x, y, s);
  },
  steak(c, x, y, s, d) {
    style(c, s, d.color);
    ell(c, x, y, s * 0.38, s * 0.28, d.color);
    ell(c, x, y, s * 0.24, s * 0.16, d.light);
    ell(c, x, y, s * 0.1, s * 0.06, '#f3d9c8');
    glint(c, x, y, s);
  },
  avocado(c, x, y, s, d) {
    style(c, s, d.color);
    c.beginPath();
    c.moveTo(x, y - s * 0.38);
    c.bezierCurveTo(x + s * 0.3, y - s * 0.1, x + s * 0.3, y + s * 0.3, x, y + s * 0.36);
    c.bezierCurveTo(x - s * 0.3, y + s * 0.3, x - s * 0.3, y - s * 0.1, x, y - s * 0.38);
    c.fill(); c.stroke();
    ell(c, x, y + s * 0.02, s * 0.19, s * 0.24, d.light);
    circ(c, x, y + s * 0.1, s * 0.1, '#8a5a33');
    glint(c, x, y, s);
  },
  pepper(c, x, y, s, d) {
    style(c, s, d.color);
    c.beginPath();
    c.moveTo(x, y - s * 0.26);
    c.bezierCurveTo(x + s * 0.3, y - s * 0.3, x + s * 0.34, y + s * 0.1, x + s * 0.2, y + s * 0.34);
    c.lineTo(x - s * 0.2, y + s * 0.34);
    c.bezierCurveTo(x - s * 0.34, y + s * 0.1, x - s * 0.3, y - s * 0.3, x, y - s * 0.26);
    c.fill(); c.stroke();
    ell(c, x, y - s * 0.3, s * 0.14, s * 0.07, '#2e7d32');
    c.fillStyle = '#277034';
    c.fillRect(x - s * 0.03, y - s * 0.44, s * 0.06, s * 0.12);
    glint(c, x, y, s);
  },
  greens(c, x, y, s, d) {
    style(c, s, d.color);
    for (const [dx, r] of [[-0.16, -0.4], [0, 0], [0.16, 0.4]]) {
      c.save(); c.translate(x + dx * s, y + Math.abs(dx) * s * 0.4); c.rotate(r);
      ell(c, 0, 0, s * 0.13, s * 0.3, d.color);
      c.restore();
    }
    glint(c, x, y, s);
  },
  berries(c, x, y, s, d) {
    style(c, s, d.color);
    for (const [dx, dy] of [[-0.16, 0.08], [0.14, 0.12], [0, -0.14], [-0.02, 0.2]]) circ(c, x + dx * s, y + dy * s, s * 0.15, d.color);
    c.fillStyle = '#3f9e4d';
    c.beginPath(); c.ellipse(x, y - s * 0.3, s * 0.16, s * 0.07, 0, 0, Math.PI * 2); c.fill(); c.stroke();
    glint(c, x, y, s);
  },
  cream(c, x, y, s, d) {
    style(c, s, d.color);
    c.beginPath();
    c.moveTo(x, y - s * 0.36);
    c.bezierCurveTo(x + s * 0.06, y - s * 0.12, x + s * 0.3, y - s * 0.1, x + s * 0.28, y + s * 0.08);
    c.bezierCurveTo(x + s * 0.42, y + s * 0.3, x + s * 0.14, y + s * 0.36, x, y + s * 0.34);
    c.bezierCurveTo(x - s * 0.2, y + s * 0.38, x - s * 0.4, y + s * 0.26, x - s * 0.26, y + s * 0.06);
    c.bezierCurveTo(x - s * 0.28, y - s * 0.14, x - s * 0.05, y - s * 0.14, x, y - s * 0.36);
    c.fill(); c.stroke();
    glint(c, x, y, s);
  },
  honey(c, x, y, s, d) {
    style(c, s, d.color);
    c.beginPath(); c.roundRect(x - s * 0.2, y - s * 0.2, s * 0.4, s * 0.52, s * 0.08); c.fill(); c.stroke();
    c.fillStyle = d.dark;
    c.fillRect(x - s * 0.22, y - s * 0.34, s * 0.44, s * 0.13);
    c.strokeRect(x - s * 0.22, y - s * 0.34, s * 0.44, s * 0.13);
    ell(c, x, y + s * 0.05, s * 0.13, s * 0.16, d.light);
    glint(c, x, y, s);
  },
  chocolate(c, x, y, s, d) {
    style(c, s, d.color);
    c.save(); c.translate(x, y); c.rotate(0.35);
    c.beginPath(); c.roundRect(-s * 0.34, -s * 0.22, s * 0.68, s * 0.44, s * 0.05); c.fill(); c.stroke();
    c.strokeStyle = d.dark; c.lineWidth = Math.max(1, s * 0.04);
    c.beginPath(); c.moveTo(0, -s * 0.22); c.lineTo(0, s * 0.22); c.stroke();
    c.beginPath(); c.moveTo(-s * 0.34, 0); c.lineTo(s * 0.34, 0); c.stroke();
    c.restore();
    glint(c, x, y, s);
  },
};

/** Layer painters: wide flat versions drawn on the plate, width w, centred (x, y). */
function layerBase(c, x, y, w, d, h = 0.32) {
  style(c, w * 0.45, d.color);
  ell(c, x, y, w * 0.5, w * h * 0.5, d.color);
  shade(c, x, y + w * 0.02, w * 0.45, d.dark);
}

const LAYERS = {
  bun(c, x, y, w, d) {
    style(c, w * 0.45, d.color);
    c.beginPath(); c.arc(x, y + w * 0.06, w * 0.42, Math.PI, 0); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#fff6d8';
    for (const dx of [-0.2, 0, 0.2]) { c.beginPath(); c.ellipse(x + dx * w, y - w * 0.22, w * 0.03, w * 0.015, 0.4, 0, Math.PI * 2); c.fill(); }
  },
  patty(c, x, y, w, d) { layerBase(c, x, y, w, d, 0.3); },
  cheese(c, x, y, w, d) {
    style(c, w * 0.45, d.color);
    c.beginPath();
    c.moveTo(x - w * 0.48, y - w * 0.05); c.lineTo(x + w * 0.48, y - w * 0.05);
    c.lineTo(x + w * 0.4, y + w * 0.1); c.lineTo(x + w * 0.18, y + w * 0.03); c.lineTo(x - w * 0.05, y + w * 0.12);
    c.lineTo(x - w * 0.3, y + w * 0.04); c.lineTo(x - w * 0.44, y + w * 0.1); c.closePath();
    c.fill(); c.stroke();
  },
  lettuce(c, x, y, w, d) {
    style(c, w * 0.45, d.color);
    c.beginPath();
    for (let i = 0; i <= 8; i++) {
      const px = x - w * 0.5 + (i * w) / 8;
      const py = y + (i % 2 ? -w * 0.07 : w * 0.03);
      if (i === 0) c.moveTo(px, py); else c.lineTo(px, py);
    }
    c.lineTo(x + w * 0.5, y + w * 0.1); c.lineTo(x - w * 0.5, y + w * 0.1); c.closePath();
    c.fill(); c.stroke();
  },
  tomato(c, x, y, w, d) { layerBase(c, x, y, w, d, 0.22); },
  onion(c, x, y, w, d) {
    style(c, w * 0.45, d.light);
    c.strokeStyle = d.dark; c.lineWidth = Math.max(1, w * 0.03);
    for (const dx of [-0.22, 0, 0.22]) { c.beginPath(); c.arc(x + dx * w, y, w * 0.11, 0, Math.PI * 2); c.stroke(); }
    ell(c, x, y, w * 0.5, w * 0.07, 'rgba(205,180,221,0.5)');
  },
  bacon(c, x, y, w, d) {
    style(c, w * 0.45, d.color);
    c.beginPath();
    c.moveTo(x - w * 0.5, y);
    c.bezierCurveTo(x - w * 0.25, y - w * 0.12, x + w * 0.25, y + w * 0.1, x + w * 0.5, y);
    c.lineTo(x + w * 0.5, y + w * 0.1);
    c.bezierCurveTo(x + w * 0.25, y + w * 0.2, x - w * 0.25, y - w * 0.02, x - w * 0.5, y + w * 0.1);
    c.closePath(); c.fill(); c.stroke();
  },
  egg(c, x, y, w, d) {
    ell(c, x, y, w * 0.46, w * 0.13, '#fdf6e3');
    circ(c, x, y - w * 0.01, w * 0.09, '#f6b81e');
  },
  chicken(c, x, y, w, d) { layerBase(c, x, y, w, d, 0.3); },
  fish(c, x, y, w, d) { layerBase(c, x, y, w, d, 0.26); },
  shrimp(c, x, y, w, d) {
    for (const dx of [-0.24, 0.02, 0.27]) ICONS.shrimp(c, x + dx * w, y, w * 0.3, d);
  },
  noodles(c, x, y, w, d) {
    style(c, w * 0.45, d.color);
    ell(c, x, y, w * 0.5, w * 0.14, d.color);
    c.strokeStyle = d.dark; c.lineWidth = Math.max(1, w * 0.025);
    for (const off of [-0.25, 0, 0.25]) {
      c.beginPath(); c.moveTo(x - w * 0.4, y + off * w * 0.2); c.bezierCurveTo(x, y - w * 0.08, x, y + w * 0.1, x + w * 0.4, y + off * w * 0.2); c.stroke();
    }
  },
  rice(c, x, y, w, d) {
    style(c, w * 0.45, d.color);
    ell(c, x, y, w * 0.5, w * 0.13, d.color);
    c.fillStyle = '#fff';
    for (const dx of [-0.3, -0.1, 0.12, 0.3]) { c.beginPath(); c.ellipse(x + dx * w, y - w * 0.04, w * 0.05, w * 0.02, dx, 0, Math.PI * 2); c.fill(); }
  },
  pasta(c, x, y, w, d) {
    style(c, w * 0.45, d.color);
    ell(c, x, y, w * 0.5, w * 0.13, d.color);
    c.strokeStyle = d.dark; c.lineWidth = Math.max(1, w * 0.03);
    c.beginPath(); c.moveTo(x - w * 0.4, y); c.lineTo(x + w * 0.4, y - w * 0.05); c.stroke();
  },
  broth(c, x, y, w, d) {
    ell(c, x, y, w * 0.52, w * 0.16, d.color);
    ell(c, x, y - w * 0.02, w * 0.44, w * 0.1, d.light);
  },
  mushroom(c, x, y, w, d) {
    for (const dx of [-0.22, 0.05, 0.3]) ICONS.mushroom(c, x + dx * w, y, w * 0.26, d);
  },
  carrot(c, x, y, w, d) {
    style(c, w * 0.45, d.color);
    ell(c, x, y, w * 0.48, w * 0.08, d.color);
    c.fillStyle = d.light;
    for (const dx of [-0.28, 0, 0.28]) circ(c, x + dx * w, y, w * 0.055, d.light);
  },
  potato(c, x, y, w, d) {
    style(c, w * 0.45, d.color);
    for (const dx of [-0.3, -0.1, 0.1, 0.3]) {
      c.beginPath(); c.roundRect(x + dx * w - w * 0.045, y - w * 0.16, w * 0.09, w * 0.3, w * 0.03); c.fill(); c.stroke();
    }
  },
  dough(c, x, y, w, d) { layerBase(c, x, y, w, d, 0.34); },
  bread(c, x, y, w, d) { layerBase(c, x, y, w, d, 0.3); },
  sausage(c, x, y, w, d) {
    style(c, w * 0.45, d.color);
    c.beginPath(); c.roundRect(x - w * 0.46, y - w * 0.07, w * 0.92, w * 0.14, w * 0.07); c.fill(); c.stroke();
  },
  steak(c, x, y, w, d) {
    layerBase(c, x, y, w, d, 0.3);
    ell(c, x, y, w * 0.2, w * 0.05, d.light);
  },
  avocado(c, x, y, w, d) {
    style(c, w * 0.45, d.color);
    ell(c, x, y, w * 0.5, w * 0.1, d.color);
    ell(c, x, y - w * 0.01, w * 0.4, w * 0.06, d.light);
  },
  pepper(c, x, y, w, d) {
    style(c, w * 0.45, d.color);
    ell(c, x, y, w * 0.48, w * 0.08, d.color);
    c.fillStyle = d.light;
    for (const dx of [-0.25, 0.05, 0.3]) circ(c, x + dx * w, y, w * 0.045, d.light);
  },
  greens(c, x, y, w, d) {
    style(c, w * 0.45, d.color);
    ell(c, x, y, w * 0.5, w * 0.09, d.color);
    c.fillStyle = d.light;
    for (const dx of [-0.3, -0.05, 0.22]) { c.beginPath(); c.ellipse(x + dx * w, y - w * 0.03, w * 0.09, w * 0.035, dx, 0, Math.PI * 2); c.fill(); }
  },
  berries(c, x, y, w, d) {
    for (const dx of [-0.3, -0.1, 0.12, 0.32]) circ(c, x + dx * w, y, w * 0.075, d.color);
  },
  cream(c, x, y, w, d) {
    style(c, w * 0.45, d.color);
    ell(c, x, y, w * 0.48, w * 0.09, '#fdfaf2');
    c.beginPath(); c.arc(x, y - w * 0.05, w * 0.1, Math.PI, 0); c.closePath(); c.fill(); c.stroke();
  },
  honey(c, x, y, w, d) {
    style(c, w * 0.45, d.color);
    ell(c, x, y, w * 0.48, w * 0.07, d.color);
    c.fillStyle = d.light;
    c.beginPath(); c.ellipse(x - w * 0.15, y - w * 0.02, w * 0.16, w * 0.025, -0.2, 0, Math.PI * 2); c.fill();
  },
  chocolate(c, x, y, w, d) {
    style(c, w * 0.45, d.color);
    c.beginPath(); c.roundRect(x - w * 0.44, y - w * 0.08, w * 0.88, w * 0.16, w * 0.04); c.fill(); c.stroke();
  },
};

export function paintIngredient(ctx, id, x, y, s) {
  const d = INGREDIENTS[id];
  if (d && ICONS[id]) ICONS[id](ctx, x, y, s, d);
}

export function paintIngredientLayer(ctx, id, x, y, w) {
  const d = INGREDIENTS[id];
  if (d && LAYERS[id]) LAYERS[id](ctx, x, y, w, d);
}

export function hasPainters(id) {
  return Boolean(ICONS[id] && LAYERS[id]);
}

/** A drink cup in the machine's colours. */
export function paintDrink(ctx, kind, x, y, s) {
  const colors = { coffee: '#6f4a2a', juice: '#f59d23', soda: '#d94f3d' };
  const col = colors[kind] || '#888';
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = Math.max(1, s * 0.06);
  ctx.beginPath();
  ctx.moveTo(x - s * 0.26, y - s * 0.3); ctx.lineTo(x + s * 0.26, y - s * 0.3);
  ctx.lineTo(x + s * 0.19, y + s * 0.34); ctx.lineTo(x - s * 0.19, y + s * 0.34);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(x - s * 0.22, y - s * 0.18); ctx.lineTo(x + s * 0.22, y - s * 0.18);
  ctx.lineTo(x + s * 0.17, y + s * 0.3); ctx.lineTo(x - s * 0.17, y + s * 0.3);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#d94f3d'; ctx.lineWidth = Math.max(1, s * 0.07);
  ctx.beginPath(); ctx.moveTo(x + s * 0.08, y - s * 0.3); ctx.lineTo(x + s * 0.2, y - s * 0.52); ctx.stroke();
  glint(ctx, x, y, s);
  ctx.restore();
}
