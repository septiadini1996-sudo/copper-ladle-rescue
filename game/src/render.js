// The Copper Ladle — canvas renderer. One warm light logic everywhere: lamps and the oven
// light the room, every surface takes a gradient, a shadow side and a highlight. draw(view)
// paints the current screen and returns the click hit-regions it used.

import {
  COMBO_WINDOW, DONENESS_MAX, LOAN_TOTAL, PERFECT_MIN, STAR_2, STAR_3,
  comboMult, starsFor,
} from './config.js';
import {
  ACHIEVEMENTS, CUSTOMER_TYPES, DECOR, DRINK_IDS, DRINKS, INGREDIENTS, INGREDIENT_IDS,
  RECIPES, RECIPE_BY_ID, STATIONS, UPGRADES,
} from './data.js';
import { dishLayersFor, effectiveSteps, perfectMax, stationSlots } from './kitchen.js';
import { paintDrink, paintIngredient, paintIngredientLayer } from './ingredients-art.js';
import { paintDish } from './dishes-art.js';

export const SCREEN = {
  TITLE: 'title', LADDER: 'ladder', INTRO: 'intro', STORY: 'story', SERVICE: 'service',
  PAUSED: 'paused', SUMMARY: 'summary', SHOP: 'shop', GAMEOVER: 'gameover', VICTORY: 'victory',
  HOWTO: 'howto', RECIPES: 'recipes', ACHIEVEMENTS: 'achievements', DISHES: 'dishes',
};

const W = 1280;
const H = 800;

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}
function fillR(ctx, x, y, w, h, r, fill) {
  rr(ctx, x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
}
function panel(ctx, x, y, w, h, fill = 'rgba(24,14,20,0.88)') {
  fillR(ctx, x, y, w, h, 12, fill);
  ctx.strokeStyle = 'rgba(255,190,110,0.25)';
  ctx.lineWidth = 1.5;
  rr(ctx, x, y, w, h, 12);
  ctx.stroke();
}
function text(ctx, str, x, y, { size = 16, color = '#f5e6cf', align = 'left', bold = false, font = 'Georgia, serif' } = {}) {
  ctx.fillStyle = color;
  ctx.font = `${bold ? 'bold ' : ''}${size}px ${font}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
}
function button(ctx, hits, id, x, y, w, h, label, { fill = '#7a4a21', color = '#ffe9c4', size = 16, disabled = false, data } = {}) {
  fillR(ctx, x, y, w, h, 10, disabled ? 'rgba(90,80,70,0.6)' : fill);
  ctx.strokeStyle = 'rgba(255,210,130,0.5)';
  ctx.lineWidth = 1.5;
  rr(ctx, x, y, w, h, 10);
  ctx.stroke();
  text(ctx, label, x + w / 2, y + h / 2 + 1, { size, color: disabled ? '#bdb2a2' : color, align: 'center', bold: true });
  if (!disabled) hits.push({ id, x, y, w, h, data });
  return { x, y, w, h };
}
function star(ctx, x, y, r, filled) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 ? r * 0.45 : r;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const px = x + Math.cos(a) * rad;
    const py = y + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = filled ? '#ffc93c' : 'rgba(255,255,255,0.14)';
  ctx.fill();
  ctx.strokeStyle = filled ? '#a86e00' : 'rgba(255,255,255,0.3)';
  ctx.lineWidth = 1.2;
  ctx.stroke();
}
function heart(ctx, x, y, s, filled) {
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.32);
  ctx.bezierCurveTo(x - s * 0.55, y - s * 0.12, x - s * 0.28, y - s * 0.5, x, y - s * 0.18);
  ctx.bezierCurveTo(x + s * 0.28, y - s * 0.5, x + s * 0.55, y - s * 0.12, x, y + s * 0.32);
  ctx.closePath();
  ctx.fillStyle = filled ? '#e8452c' : 'rgba(255,255,255,0.15)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(46,26,12,0.5)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

/** A diner character: distinct hair/shirt per type, face follows mood. */
function drawFigure(ctx, type, x, y, s, mood, t) {
  const bob = Math.sin(t * 1.6 + x) * 2;
  ctx.save();
  ctx.translate(x, y + bob);
  // body / shirt
  ctx.fillStyle = type.shirt;
  ctx.strokeStyle = 'rgba(46,26,12,0.55)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-s * 0.34, s * 0.18, s * 0.68, s * 0.62, s * 0.18);
  ctx.fill(); ctx.stroke();
  // head
  ctx.fillStyle = type.skin;
  ctx.beginPath(); ctx.arc(0, -s * 0.08, s * 0.3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  // hair
  ctx.fillStyle = type.hair;
  ctx.beginPath(); ctx.arc(0, -s * 0.16, s * 0.3, Math.PI * 1.02, Math.PI * 1.98); ctx.closePath(); ctx.fill();
  if (type.name.includes('Marco')) { // the regular: cap + moustache
    ctx.fillStyle = '#7a4a21';
    ctx.fillRect(-s * 0.32, -s * 0.34, s * 0.64, s * 0.1);
    ctx.fillStyle = type.hair;
    ctx.beginPath(); ctx.ellipse(0, s * 0.08, s * 0.14, s * 0.045, 0, 0, Math.PI * 2); ctx.fill();
  }
  if (type.name.includes('Auntie')) { // bun
    ctx.fillStyle = type.hair;
    ctx.beginPath(); ctx.arc(0, -s * 0.4, s * 0.13, 0, Math.PI * 2); ctx.fill();
  }
  if (type.name.includes('Critic')) { // bow tie
    ctx.fillStyle = '#b5452f';
    ctx.beginPath();
    ctx.moveTo(-s * 0.12, s * 0.24); ctx.lineTo(0, s * 0.3); ctx.lineTo(-s * 0.12, s * 0.36); ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(s * 0.12, s * 0.24); ctx.lineTo(0, s * 0.3); ctx.lineTo(s * 0.12, s * 0.36); ctx.closePath(); ctx.fill();
  }
  // face
  ctx.fillStyle = '#2b1a10';
  const blink = Math.sin(t * 0.9 + x * 0.7) > 0.97;
  if (!blink) {
    ctx.beginPath(); ctx.arc(-s * 0.11, -s * 0.1, s * 0.032, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(s * 0.11, -s * 0.1, s * 0.032, 0, Math.PI * 2); ctx.fill();
  }
  ctx.strokeStyle = '#2b1a10';
  ctx.lineWidth = Math.max(1.2, s * 0.03);
  ctx.beginPath();
  if (mood === 'happy') ctx.arc(0, s * 0.02, s * 0.13, 0.15 * Math.PI, 0.85 * Math.PI);
  else if (mood === 'angry') ctx.arc(0, s * 0.16, s * 0.11, 1.15 * Math.PI, 1.85 * Math.PI);
  else ctx.moveTo(-s * 0.08, s * 0.1), ctx.lineTo(s * 0.08, s * 0.1);
  ctx.stroke();
  // cheeks
  ctx.fillStyle = 'rgba(232,69,44,0.25)';
  ctx.beginPath(); ctx.arc(-s * 0.19, s * 0.03, s * 0.05, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(s * 0.19, s * 0.03, s * 0.05, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

/** Miso, the sleeping cat: curled, breathing, with drifting z's. */
function drawCat(ctx, x, y, s, t) {
  const breathe = 1 + Math.sin(t * 1.4) * 0.03;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(breathe, breathe);
  ctx.fillStyle = '#e8913a';
  ctx.strokeStyle = 'rgba(46,26,12,0.5)';
  ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.ellipse(0, 0, s * 0.52, s * 0.3, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.arc(s * 0.34, -s * 0.14, s * 0.24, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); // ear
  ctx.moveTo(s * 0.2, -s * 0.32); ctx.lineTo(s * 0.3, -s * 0.5); ctx.lineTo(s * 0.42, -s * 0.34); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = '#b45f16';
  ctx.lineWidth = Math.max(1.2, s * 0.05);
  for (const dx of [-0.28, -0.05, 0.16]) {
    ctx.beginPath(); ctx.arc(dx * s, -s * 0.05, s * 0.1, 0.3, 2.4); ctx.stroke();
  }
  ctx.strokeStyle = '#2b1a10';
  ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.arc(s * 0.3, -s * 0.14, s * 0.07, 0.2, Math.PI - 0.4); ctx.stroke(); // closed eye
  ctx.restore();
  ctx.fillStyle = 'rgba(245,230,207,0.75)';
  ctx.font = `bold ${Math.round(s * 0.34)}px Georgia, serif`;
  ctx.textAlign = 'left';
  const zx = x + s * 0.55 + Math.sin(t * 0.8) * 3;
  const zy = y - s * 0.55 - ((t * 9) % 22);
  ctx.fillText('z', zx, zy);
  ctx.font = `bold ${Math.round(s * 0.24)}px Georgia, serif`;
  ctx.fillText('z', zx + s * 0.22, zy - s * 0.2);
}

function drawScene(ctx, view, { customers = true } = {}) {
  const { meta, day, time } = view;
  const g = ctx.createLinearGradient(0, 54, 0, 300);
  g.addColorStop(0, '#3a2330');
  g.addColorStop(1, '#59362b');
  ctx.fillStyle = g;
  ctx.fillRect(0, 54, W, 246);
  // window with an evening street; the sky deepens as the day drains
  const dayFrac = day ? Math.min(1, day.t / day.length) : 0.3;
  const sky = ctx.createLinearGradient(0, 70, 0, 210);
  sky.addColorStop(0, `rgb(${58 - dayFrac * 26},${44 - dayFrac * 14},${92 - dayFrac * 30})`);
  sky.addColorStop(1, `rgb(${214 - dayFrac * 90},${130 - dayFrac * 40},${84 - dayFrac * 20})`);
  fillR(ctx, 26, 70, 268, 148, 8, '#241722');
  ctx.save();
  rr(ctx, 32, 76, 256, 136, 6); ctx.clip();
  ctx.fillStyle = sky; ctx.fillRect(32, 76, 256, 136);
  ctx.fillStyle = '#f7e3ac';
  ctx.beginPath(); ctx.arc(238, 104, 17, 0, Math.PI * 2); ctx.fill(); // moon / low sun
  ctx.fillStyle = 'rgba(20,14,30,0.85)';
  const buildings = [[40, 140, 44, 72], [92, 122, 52, 90], [152, 148, 40, 64], [200, 130, 62, 82]];
  for (const [bx, by, bw, bh] of buildings) {
    ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = 'rgba(255,196,86,0.85)';
    for (let wy = by + 10; wy < by + bh - 8; wy += 16) for (let wx = bx + 7; wx < bx + bw - 8; wx += 13) {
      if ((wx * wy) % 3 !== 0) ctx.fillRect(wx, wy, 6, 8);
    }
    ctx.fillStyle = 'rgba(20,14,30,0.85)';
  }
  ctx.fillStyle = 'rgba(12,8,18,0.9)';
  ctx.fillRect(32, 196, 256, 16);
  ctx.restore();
  ctx.strokeStyle = '#17101a'; ctx.lineWidth = 5;
  rr(ctx, 32, 76, 256, 136, 6); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(160, 76); ctx.lineTo(160, 212); ctx.stroke();
  // shelf with labeled jars
  const jars = [['FLOUR', '#e8dcc0'], ['SUGAR', '#f4f0e6'], ['SALT', '#eef2f5'], ['RICE', '#efe6cf'], ['PASTA', '#eec25e'], ['SPICE', '#c65b2e'], ['HONEY', '#f0a81c'], ['COCOA', '#5d3a24'], ['HERBS', '#4caf50'], ['TEA', '#8a6fb8'], ['CHILI', '#d23c28'], ['OATS', '#d9c08a']];
  ctx.fillStyle = '#4a2c17';
  ctx.fillRect(318, 128, 348, 8);
  ctx.fillRect(318, 196, 348, 8);
  jars.forEach(([label, col], i) => {
    const row = i < 6 ? 0 : 1;
    const jx = 330 + (i % 6) * 56;
    const jy = row === 0 ? 92 : 160;
    fillR(ctx, jx, jy, 44, 36, 5, 'rgba(240,230,205,0.92)');
    fillR(ctx, jx + 4, jy + 16, 36, 16, 3, col);
    ctx.fillStyle = '#5d3a1e';
    ctx.font = 'bold 8px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, jx + 22, jy + 10);
    ctx.fillStyle = '#7a4a21';
    ctx.fillRect(jx - 1, jy - 5, 46, 6);
  });
  // hanging copper pans + utensils
  for (let i = 0; i < 4; i++) {
    const px = 700 + i * 44;
    ctx.strokeStyle = '#2b1a10'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(px, 70); ctx.lineTo(px, 92); ctx.stroke();
    ctx.fillStyle = '#c87f4a';
    ctx.strokeStyle = 'rgba(46,26,12,0.55)';
    ctx.beginPath(); ctx.arc(px, 112, 17, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,220,170,0.5)';
    ctx.beginPath(); ctx.arc(px - 5, 106, 6, 0, Math.PI * 2); ctx.fill();
  }
  ctx.strokeStyle = '#cfd4d8'; ctx.lineWidth = 3;
  for (let i = 0; i < 3; i++) {
    const ux = 892 + i * 20;
    ctx.beginPath(); ctx.moveTo(ux, 84); ctx.lineTo(ux, 116); ctx.stroke();
    ctx.beginPath(); ctx.arc(ux, 121, 5, 0, Math.PI * 2); ctx.stroke();
  }
  // posters
  fillR(ctx, 936, 74, 92, 104, 6, '#f3e5c8');
  text(ctx, 'EAT!', 982, 112, { size: 24, color: '#b5452f', align: 'center', bold: true });
  text(ctx, 'fresh daily', 982, 142, { size: 11, color: '#7a5a34', align: 'center' });
  fillR(ctx, 1038, 74, 92, 104, 6, '#e8eef2');
  text(ctx, "ROSA'S", 1084, 112, { size: 17, color: '#33566b', align: 'center', bold: true });
  text(ctx, 'since 1987', 1084, 142, { size: 11, color: '#5d7a8a', align: 'center' });
  if (meta.decor.painting) {
    fillR(ctx, 700, 150, 120, 62, 4, '#8a6d3b');
    fillR(ctx, 706, 156, 108, 50, 3, '#7fb3d9');
    ctx.fillStyle = '#e8913a';
    ctx.beginPath(); ctx.arc(736, 176, 10, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#4d7c43';
    ctx.beginPath(); ctx.moveTo(706, 206); ctx.lineTo(748, 178); ctx.lineTo(782, 206); ctx.lineTo(814, 186); ctx.lineTo(814, 206); ctx.closePath(); ctx.fill();
  }
  // wall clock, hands follow service time
  const cx = 880, cy = 216;
  ctx.fillStyle = '#f3e5c8';
  ctx.beginPath(); ctx.arc(cx, cy, 24, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#5d3a1e'; ctx.lineWidth = 3; ctx.stroke();
  const ang = (day ? (day.t / day.length) : 0.3) * Math.PI * 2 - Math.PI / 2;
  ctx.strokeStyle = '#2b1a10'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(ang) * 15, cy + Math.sin(ang) * 15); ctx.stroke();
  // chalk specials board — dish of the day starred, paying double
  fillR(ctx, 1140, 66, 128, 150, 6, '#22382c');
  ctx.strokeStyle = '#8a6d3b'; ctx.lineWidth = 3; rr(ctx, 1140, 66, 128, 150, 6); ctx.stroke();
  text(ctx, "TODAY'S", 1204, 82, { size: 12, color: '#ffe9c4', align: 'center', bold: true });
  text(ctx, 'SPECIALS', 1204, 98, { size: 12, color: '#ffe9c4', align: 'center', bold: true });
  const specials = RECIPES.slice(0, 5);
  specials.forEach((r, i) => {
    const isDotd = day && r.id === day.dotd;
    text(ctx, `${isDotd ? '★ ' : ''}${r.name.split(' ')[0]}`, 1148, 122 + i * 18, { size: 11, color: isDotd ? '#ffc93c' : '#d9e8d9' });
    text(ctx, `$${r.price}`, 1260, 122 + i * 18, { size: 11, color: '#d9e8d9', align: 'right' });
  });
  // pendant lamps with glow pools (stronger with Golden Lamps decor)
  for (const lx of [170, 520, 880, 1180]) {
    const sway = Math.sin(time * 0.9 + lx) * 3;
    const glow = ctx.createRadialGradient(lx + sway, 66, 6, lx + sway, 66, meta.decor.lamps ? 120 : 92);
    glow.addColorStop(0, 'rgba(255,196,86,0.5)');
    glow.addColorStop(1, 'rgba(255,196,86,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(lx - 130, 0, 260, 200);
    ctx.strokeStyle = '#17101a'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(lx, 54); ctx.lineTo(lx + sway, 66); ctx.stroke();
    ctx.fillStyle = meta.decor.lamps ? '#d9a41e' : '#3f7d5d';
    ctx.beginPath();
    ctx.moveTo(lx + sway - 20, 84); ctx.lineTo(lx + sway + 20, 84); ctx.lineTo(lx + sway + 9, 64); ctx.lineTo(lx + sway - 9, 64); ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffd873';
    ctx.beginPath(); ctx.arc(lx + sway, 88, 5, 0, Math.PI * 2); ctx.fill();
  }
  if (meta.decor.plant) { // potted plant on the window sill
    ctx.fillStyle = '#b5452f';
    ctx.beginPath(); ctx.roundRect(282, 196, 26, 20, 4); ctx.fill();
    ctx.strokeStyle = '#3f7d32'; ctx.lineWidth = 3;
    for (const a of [-0.5, 0, 0.5]) {
      ctx.beginPath(); ctx.moveTo(295, 198); ctx.quadraticCurveTo(295 + a * 22, 178, 295 + a * 30, 168); ctx.stroke();
    }
  }
  if (customers && day) drawCustomers(ctx, view);
}

const SEAT_X = [180, 470, 760, 1050];

function drawCustomers(ctx, view) {
  const { day, time } = view;
  day.customers.forEach((c, idx) => {
    if (c.state === 'gone') return;
    const x = SEAT_X[idx % SEAT_X.length];
    const frac = Math.max(0, c.patience / c.patienceMax);
    const mood = c.state === 'leaving' || c.bubbleKind === 'happy' ? 'happy' : frac < 0.3 ? 'angry' : 'neutral';
    drawFigure(ctx, c.type, x, 252, 74, mood, time + idx);
    // a served guest carries their finished dish away from the pass
    if (c.state === 'leaving' && c.servedRecipeId) paintDish(ctx, c.servedRecipeId, x + 30, 292, 44, time);
    // patience bar beside the figure
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(x + 44, 208, 7, 74);
    ctx.fillStyle = frac > 0.5 ? '#7ec850' : frac > 0.28 ? '#f6c945' : '#e8452c';
    ctx.fillRect(x + 44, 208 + 74 * (1 - frac), 7, 74 * frac);
    // order ticket above
    const recipe = RECIPE_BY_ID[c.recipeId];
    const ty = 96;
    fillR(ctx, x - 86, ty, 172, 62, 8, 'rgba(250,243,225,0.97)');
    ctx.strokeStyle = c.isRegular ? '#e8452c' : 'rgba(46,26,12,0.4)';
    ctx.lineWidth = c.isRegular ? 2.5 : 1.2;
    rr(ctx, x - 86, ty, 172, 62, 8); ctx.stroke();
    text(ctx, recipe.name, x - 78, ty + 15, { size: 13.5, color: '#3a2413', bold: true });
    if (c.recipeId === day.dotd) text(ctx, '★×2', x + 78, ty + 15, { size: 12, color: '#d99a17', align: 'right', bold: true });
    // the finished dish itself, as the ticket's icon
    paintDish(ctx, c.recipeId, x + 64, ty + 44, 34, view.time);
    let sub = c.isRegular ? 'Marco ♥' : c.type.name;
    if (c.variation) sub += c.variation.kind === 'no' ? ` · no ${INGREDIENTS[c.variation.ing].name}` : ` · extra ${INGREDIENTS[c.variation.ing].name}`;
    if (c.drink) sub += ` · +${DRINKS[c.drink].name}`;
    text(ctx, sub, x - 78, ty + 34, { size: 11, color: '#7a5a34' });
    const steps = effectiveSteps(c.recipeId, c.variation);
    steps.forEach((ing, i) => {
      const done = view.day.plate && view.day.activeTarget?.id === c.id && view.day.plate.layers.length > i;
      ctx.fillStyle = done ? '#7ec850' : 'rgba(46,26,12,0.25)';
      ctx.beginPath(); ctx.arc(x - 70 + i * 15, ty + 51, 4.5, 0, Math.PI * 2); ctx.fill();
    });
    // speech bubble
    if (c.bubble) {
      ctx.font = 'italic 12.5px Georgia, serif';
      const wText = Math.min(190, ctx.measureText(c.bubble).width + 22);
      const bx = Math.max(10, Math.min(W - wText - 10, x - wText / 2));
      fillR(ctx, bx, 168, wText, 26, 10, 'rgba(255,252,244,0.96)');
      ctx.beginPath();
      ctx.moveTo(x - 6, 194); ctx.lineTo(x + 6, 194); ctx.lineTo(x, 204); ctx.closePath();
      ctx.fillStyle = 'rgba(255,252,244,0.96)'; ctx.fill();
      text(ctx, c.bubble, bx + wText / 2, 182, { size: 12.5, color: '#4a3220', align: 'center', font: 'italic Georgia, serif' });
    }
  });
}

/** The counter: ONE long worktop. Appliances stand on it; plating is its right-hand section. */
const APPLIANCES = [
  { id: 'prep', label: 'PREP BOARD' },
  { id: 'grill', label: 'GRILL' },
  { id: 'fryer', label: 'FRYER' },
  { id: 'stove', label: 'STOVE' },
  { id: 'oven', label: 'BRICK OVEN' },
  { id: 'drinks', label: 'DRINKS' },
];
const APP_X = 16;
const APP_W = 128;
const APP_GAP = 6;

function drawApplianceBody(ctx, id, x, y, w, h, day) {
  ctx.save();
  if (id === 'prep') {
    fillR(ctx, x, y + h * 0.42, w, h * 0.5, 6, '#c9a15f');
    ctx.strokeStyle = 'rgba(122,74,33,0.6)'; ctx.lineWidth = 1.5;
    for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(x + 6, y + h * 0.42 + i * h * 0.12); ctx.lineTo(x + w - 6, y + h * 0.42 + i * h * 0.12); ctx.stroke(); }
  } else if (id === 'grill') {
    fillR(ctx, x, y + h * 0.4, w, h * 0.52, 6, '#3c3f45');
    ctx.strokeStyle = '#191b1e'; ctx.lineWidth = 3;
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(x + 8, y + h * (0.48 + i * 0.11)); ctx.lineTo(x + w - 8, y + h * (0.48 + i * 0.11)); ctx.stroke(); }
    ctx.fillStyle = 'rgba(255,110,40,0.35)';
    ctx.fillRect(x + 6, y + h * 0.86, w - 12, 4);
  } else if (id === 'fryer') {
    fillR(ctx, x, y + h * 0.34, w, h * 0.58, 6, '#8b939c');
    fillR(ctx, x + 8, y + h * 0.42, w - 16, h * 0.3, 4, '#e8a33c');
    ctx.fillStyle = 'rgba(255,235,180,0.7)';
    for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(x + 18 + i * (w - 36) / 4, y + h * 0.47, 3, 0, Math.PI * 2); ctx.fill(); }
  } else if (id === 'stove') {
    fillR(ctx, x, y + h * 0.4, w, h * 0.52, 6, '#494540');
    for (const [dx, dy] of [[0.28, 0.58], [0.72, 0.58]]) {
      ctx.fillStyle = '#22201e';
      ctx.beginPath(); ctx.arc(x + w * dx, y + h * dy, w * 0.15, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#6b675f'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = 'rgba(90,140,255,0.55)';
      ctx.beginPath(); ctx.arc(x + w * dx, y + h * dy, w * 0.06, 0, Math.PI * 2); ctx.fill();
    }
  } else if (id === 'oven') {
    fillR(ctx, x, y + h * 0.18, w, h * 0.74, 8, '#9c4a2e');
    ctx.fillStyle = 'rgba(70,26,12,0.35)';
    for (let r = 0; r < 3; r++) for (let i = 0; i < 4; i++) ctx.fillRect(x + 8 + i * (w - 14) / 3.4, y + h * (0.24 + r * 0.22), (w - 20) / 3.6, 3);
    ctx.fillStyle = '#2b1408';
    ctx.beginPath();
    ctx.moveTo(x + w * 0.22, y + h * 0.92);
    ctx.lineTo(x + w * 0.22, y + h * 0.55);
    ctx.quadraticCurveTo(x + w * 0.5, y + h * 0.3, x + w * 0.78, y + h * 0.55);
    ctx.lineTo(x + w * 0.78, y + h * 0.92);
    ctx.closePath(); ctx.fill();
    const flicker = 0.75 + Math.sin(Date.now() / 90) * 0.15;
    const fire = ctx.createRadialGradient(x + w / 2, y + h * 0.85, 3, x + w / 2, y + h * 0.85, w * 0.3);
    fire.addColorStop(0, `rgba(255,190,60,${0.85 * flicker})`);
    fire.addColorStop(1, 'rgba(255,90,20,0)');
    ctx.fillStyle = fire;
    ctx.beginPath(); ctx.arc(x + w / 2, y + h * 0.85, w * 0.3, 0, Math.PI * 2); ctx.fill();
  } else if (id === 'drinks') {
    fillR(ctx, x, y + h * 0.16, w, h * 0.76, 8, '#5b7d8a');
    fillR(ctx, x + 10, y + h * 0.24, w - 20, h * 0.3, 5, '#31444d');
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = ['#6f4a2a', '#f59d23', '#d94f3d'][i];
      ctx.beginPath(); ctx.arc(x + w * (0.28 + i * 0.22), y + h * 0.39, 6, 0, Math.PI * 2); ctx.fill();
    }
    fillR(ctx, x + 10, y + h * 0.62, w - 20, h * 0.2, 4, '#7595a3');
  }
  ctx.restore();
}

function drawService(ctx, view, hits) {
  const { meta, day, time } = view;
  drawScene(ctx, view);
  // counter top slab — one continuous worktop from wall to wall
  const topY = 448;
  const grad = ctx.createLinearGradient(0, topY, 0, topY + 40);
  grad.addColorStop(0, '#a9743f');
  grad.addColorStop(0.25, '#8a5a2e');
  grad.addColorStop(1, '#6e4520');
  ctx.fillStyle = grad;
  ctx.fillRect(0, topY, W, 40);
  ctx.fillStyle = 'rgba(255,220,160,0.35)';
  ctx.fillRect(0, topY, W, 4);
  // counter front face with panel mouldings
  const front = ctx.createLinearGradient(0, topY + 40, 0, 556);
  front.addColorStop(0, '#5d3a1e');
  front.addColorStop(1, '#40260f');
  ctx.fillStyle = front;
  ctx.fillRect(0, topY + 40, W, 68);
  ctx.strokeStyle = 'rgba(255,200,130,0.18)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 8; i++) {
    rr(ctx, 18 + i * 158, topY + 52, 138, 44, 6); ctx.stroke();
  }
  // stools in front (velvet when decorated)
  day.customers.forEach((c, idx) => {
    if (c.state === 'gone') return;
    const x = SEAT_X[idx % SEAT_X.length];
    ctx.fillStyle = meta.decor.velvet ? '#7a2e4a' : '#6e4520';
    ctx.beginPath(); ctx.ellipse(x, 546, 34, 9, 0, 0, Math.PI * 2); ctx.fill();
  });
  // appliances standing on the counter
  APPLIANCES.forEach((app, i) => {
    const x = APP_X + i * (APP_W + APP_GAP);
    const y = 322;
    const h = 126;
    drawApplianceBody(ctx, app.id, x, y, APP_W, h, day);
    text(ctx, app.label, x + APP_W / 2, y + h + 14, { size: 10.5, color: '#d9b98a', align: 'center', bold: true });
    const slots = stationSlots(meta, app.id);
    for (let sIdx = 0; sIdx < slots; sIdx++) {
      const sx = x + APP_W / 2 + (sIdx - (slots - 1) / 2) * 42;
      const sy = y + h * 0.62;
      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      ctx.beginPath(); ctx.arc(sx, sy, 21, 0, Math.PI * 2); ctx.fill();
    }
    if (app.id === 'drinks') {
      DRINK_IDS.forEach((kind, di) => {
        const bx = x + 14 + di * 38;
        const by = y + h + 24;
        fillR(ctx, bx, by, 32, 26, 6, 'rgba(20,12,16,0.75)');
        paintDrink(ctx, kind, bx + 16, by + 13, 20);
        hits.push({ id: 'drink', x: bx, y: by, w: 32, h: 26, data: kind });
      });
    }
  });
  // cooking items on their stations
  const byStation = {};
  for (const item of day.items) (byStation[item.station] = byStation[item.station] || []).push(item);
  APPLIANCES.forEach((app, i) => {
    const x = APP_X + i * (APP_W + APP_GAP);
    const y = 322;
    const items = byStation[app.id] || [];
    items.forEach((item, sIdx) => {
      const sx = x + APP_W / 2 + (sIdx - (stationSlots(meta, app.id) - 1) / 2) * 42;
      const sy = y + 126 * 0.62;
      const frac = item.doneness / DONENESS_MAX;
      // doneness ring
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath(); ctx.arc(sx, sy, 24, 0, Math.PI * 2); ctx.stroke();
      const inPerfect = item.doneness >= PERFECT_MIN && item.doneness <= perfectMax(meta);
      ctx.strokeStyle = inPerfect ? '#ffc93c' : item.doneness >= PERFECT_MIN ? '#7ec850' : '#e8913a';
      ctx.beginPath(); ctx.arc(sx, sy, 24, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2); ctx.stroke();
      if (inPerfect && Math.sin(time * 6) > 0) {
        ctx.strokeStyle = 'rgba(255,201,60,0.45)';
        ctx.lineWidth = 8;
        ctx.beginPath(); ctx.arc(sx, sy, 27, 0, Math.PI * 2); ctx.stroke();
      }
      if (item.ing === 'drink') paintDrink(ctx, item.drinkKind, sx, sy, 36);
      else paintIngredient(ctx, item.ing, sx, sy, 38);
      // steam
      if (item.doneness > 30) {
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.lineWidth = 2;
        const wob = Math.sin(time * 3 + item.id) * 3;
        ctx.beginPath(); ctx.moveTo(sx + wob, sy - 26); ctx.quadraticCurveTo(sx - wob, sy - 36, sx + wob, sy - 46); ctx.stroke();
      }
      if (inPerfect) text(ctx, 'PERFECT!', sx, sy + 34, { size: 10, color: '#ffc93c', align: 'center', bold: true });
      hits.push({ id: 'item', x: sx - 24, y: sy - 24, w: 48, h: 48, data: item.id });
    });
  });
  // helper character at work behind the counter
  if (meta.upgrades.helper) {
    drawFigure(ctx, { name: 'Helper', skin: '#d99e63', hair: '#22201e', shirt: '#3f7d5d' }, 838, 396, 46, 'happy', time);
    text(ctx, 'Marco Jr.', 838, 448, { size: 10, color: '#d9b98a', align: 'center' });
  }
  // plating section of the same counter (right end)
  const px = 856;
  text(ctx, 'PLATING', px + 120, 316, { size: 11, color: '#d9b98a', align: 'center', bold: true });
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath(); ctx.ellipse(px + 108, 442, 104, 14, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#f7f1e3';
  ctx.strokeStyle = 'rgba(46,26,12,0.4)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(px + 108, 428, 100, 30, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#e6dcc4';
  ctx.beginPath(); ctx.ellipse(px + 108, 426, 78, 21, 0, 0, Math.PI * 2); ctx.fill();
  const layers = day.plate ? day.plate.layers : [];
  const target = day.activeTarget ? (day.activeTarget.type === 'phone' ? day.phone : day.customers.find((c) => c.id === day.activeTarget.id)) : null;
  const recipeId = target ? target.recipeId : null;
  const variation = target && target.type !== 'phone' ? target.variation : null;
  const expected = recipeId ? dishLayersFor(recipeId, variation) : layers.map((l) => l.ing);
  if (recipeId && view.plateComplete) {
    // TRANSFORM: the finished step turns the layer stack into the composed dish, with a flourish.
    const pop = 1 + Math.max(0, Math.sin(Math.min(1, (time % 1)) * Math.PI)) * 0.03;
    ctx.save();
    ctx.translate(px + 108, 420);
    ctx.scale(pop, pop);
    ctx.translate(-(px + 108), -420);
    paintDish(ctx, recipeId, px + 108, 420, 128, time);
    ctx.restore();
    for (let sIdx = 0; sIdx < 4; sIdx++) {
      const a = time * 1.8 + (sIdx * Math.PI) / 2;
      const sx = px + 108 + Math.cos(a) * 74;
      const sy = 408 + Math.sin(a) * 30;
      star(ctx, sx, sy, 6, true);
    }
    text(ctx, 'READY — SERVE!', px + 108, 470, { size: 12.5, color: '#7ec850', align: 'center', bold: true });
  } else {
    // Draw the stack from the dish definition itself: plated layers in recipe order.
    layers.forEach((layer, i) => {
      paintIngredientLayer(ctx, layer.ing, px + 108, 424 - i * 7, 118);
    });
  }
  // checklist ticket pinned on the counter front, under the plate
  if (recipeId) {
    const steps = expected;
    panel(ctx, px + 216, 330, 196, 118, 'rgba(250,243,225,0.96)');
    text(ctx, RECIPE_BY_ID[recipeId].name, px + 226, 348, { size: 13, color: '#3a2413', bold: true });
    steps.slice(0, 7).forEach((ing, i) => {
      const done = i < layers.length;
      const isNext = i === layers.length;
      text(ctx, done ? '✓' : isNext ? '▸' : '·', px + 228, 368 + i * 13.5, { size: 11, color: done ? '#4d9427' : '#b5452f', bold: true });
      text(ctx, `${INGREDIENTS[ing].name} · ${INGREDIENTS[ing].process}`, px + 244, 368 + i * 13.5, { size: 11, color: done ? '#7a9a6a' : '#4a3220' });
      paintIngredient(ctx, ing, px + 396, 368 + i * 13.5, 15);
    });
  } else {
    panel(ctx, px + 216, 330, 196, 118, 'rgba(20,12,16,0.7)');
    text(ctx, 'Tap a ticket to', px + 314, 378, { size: 13, color: '#d9b98a', align: 'center' });
    text(ctx, 'start plating', px + 314, 398, { size: 13, color: '#d9b98a', align: 'center' });
  }
  // serve bell + trash on the counter front
  const serveReady = view.plateComplete;
  button(ctx, hits, 'serve', px + 226, 470, 120, 44, 'SERVE ␇', { fill: serveReady ? '#4d9427' : '#5d5148', disabled: !serveReady });
  button(ctx, hits, 'trash', px + 354, 470, 58, 44, '🗑', { fill: '#6e3a2a', size: 18 });
  // the cat sleeps on the counter's left end, low enough to clear the PERFECT! labels
  drawCat(ctx, 60, 452, 50, time);
  drawHUD(ctx, view, hits);
  drawBottom(ctx, view, hits);
  // customer ticket hit regions
  day.customers.forEach((c, idx) => {
    if (c.state !== 'waiting') return;
    const x = SEAT_X[idx % SEAT_X.length];
    hits.push({ id: 'customer', x: x - 86, y: 96, w: 172, h: 130, data: c.id });
  });
  // popups
  for (const p of view.popups || []) {
    const a = Math.max(0, 1 - p.age / 1.4);
    ctx.globalAlpha = a;
    text(ctx, p.text, p.x, p.y - p.age * 34, { size: 19, color: p.color || '#ffc93c', align: 'center', bold: true });
    ctx.globalAlpha = 1;
  }
  if (view.tutorial) {
    fillR(ctx, 240, 556, 800, 40, 10, 'rgba(255,201,60,0.95)');
    text(ctx, view.tutorial, 640, 577, { size: 16, color: '#3a2413', align: 'center', bold: true });
  }
  if (day.fever) {
    ctx.fillStyle = 'rgba(255,110,30,0.10)';
    ctx.fillRect(0, 54, W, 502);
  }
}

function drawHUD(ctx, view, hits) {
  const { meta, day } = view;
  const g = ctx.createLinearGradient(0, 0, 0, 54);
  g.addColorStop(0, '#2b1a20');
  g.addColorStop(1, '#1c1016');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, 54);
  text(ctx, day.kind === 'endless' ? `WAVE ${day.day}` : `DAY ${day.day}`, 18, 28, { size: 19, bold: true });
  // day timer
  const frac = Math.max(0, 1 - day.t / day.length);
  fillR(ctx, 110, 20, 190, 15, 7, 'rgba(255,255,255,0.15)');
  fillR(ctx, 110, 20, Math.max(0, 190 * frac), 15, 7, frac > 0.25 ? '#e8913a' : '#e8452c');
  text(ctx, `${Math.ceil(day.length - day.t)}s`, 316, 28, { size: 14, color: '#d9b98a' });
  text(ctx, `$${day.earned} / $${day.goal}`, 380, 28, { size: 16, bold: true, color: day.earned >= day.goal ? '#7ec850' : '#f5e6cf' });
  text(ctx, `Bank $${meta.bank}`, 520, 28, { size: 14, color: '#d9b98a' });
  // combo pill with draining bar
  const cx = 660;
  fillR(ctx, cx, 8, 210, 38, 10, day.combo > 0 ? 'rgba(122,74,33,0.9)' : 'rgba(40,28,24,0.8)');
  text(ctx, day.fever ? `🔥 FEVER ×${comboMult(day.combo)}` : `COMBO ×${day.combo} · pay ×${comboMult(day.combo)}`, cx + 105, 24, { size: 15, align: 'center', bold: true, color: day.fever ? '#ffb03a' : '#ffe9c4' });
  if (day.comboT > 0) fillR(ctx, cx + 8, 38, 194 * (day.comboT / COMBO_WINDOW), 4, 2, '#ffc93c');
  if (day.fever) text(ctx, `${Math.ceil(day.feverT)}s`, cx + 105, 44, { size: 9, align: 'center', color: '#ffb03a' });
  text(ctx, meta.difficulty === 'relaxed' ? 'Relaxed' : 'Normal', 900, 28, { size: 13, color: '#9a8a76' });
  button(ctx, hits, 'mute', 1152, 9, 52, 36, view.muted ? '🔇' : '♪', { fill: '#3a2a30', size: 17 });
  button(ctx, hits, 'pause', 1212, 9, 52, 36, 'II', { fill: '#3a2a30', size: 15 });
}

function drawBottom(ctx, view, hits) {
  const { meta, day } = view;
  ctx.fillStyle = '#170d12';
  ctx.fillRect(0, 556, W, 244);
  // pantry
  panel(ctx, 8, 564, 612, 228);
  text(ctx, 'PANTRY', 20, 582, { size: 13, bold: true, color: '#d9b98a' });
  text(ctx, 'click an ingredient to cook it', 608, 582, { size: 11, color: '#9a8a76', align: 'right' });
  const needed = view.nextNeeded;
  INGREDIENT_IDS.forEach((id, i) => {
    const col = i % 6;
    const row = Math.floor(i / 6);
    const x = 20 + col * 100;
    const y = 596 + row * 39;
    fillR(ctx, x, y, 92, 35, 7, 'rgba(255,240,214,0.07)');
    if (needed === id) {
      ctx.strokeStyle = '#ffc93c';
      ctx.lineWidth = 2;
      rr(ctx, x, y, 92, 35, 7); ctx.stroke();
    }
    paintIngredient(ctx, id, x + 18, y + 17.5, 26);
    text(ctx, INGREDIENTS[id].name, x + 34, y + 18, { size: 11.5, color: '#e8dcc4' });
    hits.push({ id: 'ingredient', x, y, w: 92, h: 35, data: id });
  });
  // mise en place tray
  panel(ctx, 632, 564, 240, 228);
  text(ctx, 'MISE EN PLACE', 644, 582, { size: 13, bold: true, color: '#d9b98a' });
  const cap = view.trayCap;
  for (let i = 0; i < cap; i++) {
    const x = 648 + (i % 3) * 74;
    const y = 600 + Math.floor(i / 3) * 74;
    fillR(ctx, x, y, 64, 64, 9, 'rgba(255,240,214,0.06)');
    ctx.strokeStyle = 'rgba(255,190,110,0.25)';
    rr(ctx, x, y, 64, 64, 9); ctx.stroke();
    const t = day.tray[i];
    if (t) {
      paintIngredient(ctx, t.ing, x + 32, y + 30, 40);
      text(ctx, t.qualityName, x + 32, y + 56, { size: 9.5, align: 'center', color: t.qualityName === 'perfect' ? '#ffc93c' : '#bdb2a2' });
      hits.push({ id: 'tray', x, y, w: 64, h: 64, data: i });
    }
  }
  text(ctx, 'pre-cook ahead;', 644, 762, { size: 11, color: '#9a8a76' });
  text(ctx, 'click to use in the dish', 644, 778, { size: 11, color: '#9a8a76' });
  // phone + ready drinks
  panel(ctx, 884, 564, 388, 228);
  text(ctx, 'PHONE ORDERS', 896, 582, { size: 13, bold: true, color: '#d9b98a' });
  if (day.phone) {
    const recipe = RECIPE_BY_ID[day.phone.recipeId];
    fillR(ctx, 896, 594, 364, 74, 9, 'rgba(255,201,60,0.14)');
    text(ctx, `☎ ${recipe.name}`, 908, 616, { size: 15, bold: true, color: '#ffe9c4' });
    text(ctx, `pack it for $${26} · ${Math.ceil(day.phone.timeLeft)}s left`, 908, 640, { size: 12, color: '#d9b98a' });
    const active = day.activeTarget?.type === 'phone';
    button(ctx, hits, 'phone', 1136, 606, 108, 34, active ? 'PACKING…' : 'TAKE ORDER', { fill: active ? '#4d9427' : '#7a4a21', size: 12 });
    text(ctx, recipe.steps.map((s) => INGREDIENTS[s].name).join(' · '), 908, 660, { size: 11, color: '#bdb2a2' });
  } else {
    text(ctx, 'No calls right now — the phone', 896, 622, { size: 12.5, color: '#9a8a76' });
    text(ctx, 'rings on its own. Pack orders pay flat.', 896, 642, { size: 12.5, color: '#9a8a76' });
  }
  text(ctx, 'READY DRINKS', 896, 692, { size: 12, bold: true, color: '#d9b98a' });
  day.readyDrinks.forEach((d, i) => {
    const x = 896 + i * 46;
    fillR(ctx, x, 704, 40, 52, 7, 'rgba(255,240,214,0.07)');
    paintDrink(ctx, d.kind, x + 20, 730, 34);
  });
  if (!day.readyDrinks.length) text(ctx, 'none — brew one on the DRINKS machine, then tap a guest to serve it alone', 896, 730, { size: 11.5, color: '#9a8a76' });
  text(ctx, 'tap a ready drink, then a guest: +patience', 896, 778, { size: 11, color: '#9a8a76' });
}

// ---------- other screens ----------

function backdrop(ctx, view) {
  drawScene(ctx, view, { customers: false });
  ctx.fillStyle = 'rgba(12,6,10,0.45)';
  ctx.fillRect(0, 300, W, 500);
  ctx.fillStyle = '#170d12';
  ctx.fillRect(0, 556, W, 244);
}

function drawTitle(ctx, view, hits) {
  drawScene(ctx, view, { customers: false });
  drawCat(ctx, 1130, 428, 64, view.time);
  ctx.fillStyle = 'rgba(12,6,10,0.35)';
  ctx.fillRect(0, 300, W, 500);
  ctx.fillStyle = '#170d12';
  ctx.fillRect(0, 556, W, 244);
  text(ctx, 'THE COPPER LADLE', 640, 356, { size: 64, align: 'center', bold: true, color: '#ffd873' });
  text(ctx, 'A 12-day diner rescue — cook fast, cook kind, save Rosa’s kitchen', 640, 402, { size: 19, align: 'center', color: '#f5e6cf' });
  const loanPaid = Math.min(LOAN_TOTAL, view.meta.totalEarned);
  text(ctx, `Loan repaid $${loanPaid} / $${LOAN_TOTAL} · Bank $${view.meta.bank}`, 640, 438, { size: 15, align: 'center', color: '#d9b98a' });
  button(ctx, hits, 'play', 490, 470, 300, 56, '▶  PLAY — STAGE LADDER', { fill: '#4d9427', size: 19 });
  const diff = view.meta.difficulty;
  button(ctx, hits, 'difficulty', 490, 540, 300, 40, `Difficulty: ${diff === 'relaxed' ? 'Relaxed' : 'Normal'}`, { fill: '#3a2a30', size: 14 });
  button(ctx, hits, 'howto', 180, 470, 220, 46, 'HOW TO PLAY', { size: 15 });
  button(ctx, hits, 'recipes', 180, 528, 220, 46, 'RECIPE BOOK', { size: 15 });
  button(ctx, hits, 'achievements', 880, 470, 220, 46, 'ACHIEVEMENTS', { size: 15 });
  if (view.meta.campaignWon) button(ctx, hits, 'endless', 880, 528, 220, 46, `ENDLESS (best ${view.meta.endlessBest})`, { fill: '#8a5a2e', size: 14 });
  button(ctx, hits, 'mute', 1152, 570, 52, 36, view.muted ? '🔇' : '♪', { fill: '#3a2a30', size: 17 });
}

/** The stage map: a dusk neighbourhood, a winding trail of stepping stones from Rosa's
 * diner (stage 1) to the BANK (stage 12). Rosa herself stands at the current stage. */
const MAP_NODES = [
  [140, 648], [262, 596], [388, 640], [512, 580], [636, 624], [756, 566],
  [872, 610], [988, 540], [1076, 452], [972, 392], [1076, 322], [1180, 262],
];
const ROSA_FIGURE = { name: 'Rosa', skin: '#f2c184', hair: '#5a3a22', shirt: '#b5452f' };

function drawMapBuilding(ctx, x, y, w, h, wall, roof) {
  ctx.fillStyle = wall;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = roof;
  ctx.beginPath();
  ctx.moveTo(x - 6, y); ctx.lineTo(x + w / 2, y - h * 0.28); ctx.lineTo(x + w + 6, y); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,196,86,0.9)';
  for (let wy = y + 14; wy < y + h - 12; wy += 24) for (let wx = x + 10; wx < x + w - 12; wx += 22) {
    if ((wx * wy) % 3 !== 0) ctx.fillRect(wx, wy, 9, 12);
  }
}

function drawLadder(ctx, view, hits) {
  const { meta, time } = view;
  // dusk sky
  const sky = ctx.createLinearGradient(0, 0, 0, 470);
  sky.addColorStop(0, '#241a3d');
  sky.addColorStop(0.55, '#5d3550');
  sky.addColorStop(1, '#c97a3d');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  for (let i = 0; i < 40; i++) {
    const sx = (i * 173) % 1280;
    const sy = (i * 89) % 210;
    ctx.fillRect(sx, sy, 2, 2);
  }
  ctx.fillStyle = '#f7e3ac';
  ctx.beginPath(); ctx.arc(120, 84, 26, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(36,26,61,0.35)';
  ctx.beginPath(); ctx.arc(108, 76, 22, 0, Math.PI * 2); ctx.fill();
  // distant skyline
  ctx.fillStyle = 'rgba(24,16,38,0.75)';
  const skyline = [[0, 330, 120, 140], [150, 300, 90, 170], [880, 310, 110, 160], [700, 340, 80, 130]];
  for (const [bx, by, bw, bh] of skyline) ctx.fillRect(bx, by, bw, bh);
  // ground: street and plaza
  const ground = ctx.createLinearGradient(0, 430, 0, 800);
  ground.addColorStop(0, '#4a3049');
  ground.addColorStop(1, '#2b1a26');
  ctx.fillStyle = ground;
  ctx.fillRect(0, 430, W, 370);
  // houses and shops along the way
  drawMapBuilding(ctx, 300, 452, 74, 74, '#6e4a3a', '#3a2430');
  drawMapBuilding(ctx, 560, 438, 84, 88, '#5d4a6e', '#2e2138');
  drawMapBuilding(ctx, 806, 446, 70, 80, '#74603a', '#40301c');
  text(ctx, 'BAKERY', 602, 470, { size: 10, color: '#ffe9c4', bold: true });
  text(ctx, 'MARKET', 841, 478, { size: 10, color: '#ffe9c4', align: 'center', bold: true });
  // trees
  for (const [tx, ty, ts] of [[228, 520, 30], [452, 500, 36], [690, 500, 28], [920, 470, 32], [1010, 560, 26]]) {
    ctx.fillStyle = '#4a3220';
    ctx.fillRect(tx - 3, ty, 6, ts * 0.7);
    ctx.fillStyle = '#2e5d33';
    ctx.beginPath(); ctx.arc(tx, ty - ts * 0.3, ts * 0.55, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#3f7d43';
    ctx.beginPath(); ctx.arc(tx - ts * 0.25, ty - ts * 0.12, ts * 0.36, 0, Math.PI * 2); ctx.fill();
  }
  // THE DINER at the start of the trail
  ctx.fillStyle = '#7a4632';
  ctx.fillRect(24, 452, 168, 108);
  ctx.fillStyle = '#b5452f';
  ctx.beginPath();
  ctx.moveTo(16, 452); ctx.lineTo(200, 452); ctx.lineTo(184, 424); ctx.lineTo(32, 424); ctx.closePath(); ctx.fill();
  fillR(ctx, 40, 396, 136, 30, 6, '#f3e5c8');
  text(ctx, "ROSA'S DINER", 108, 412, { size: 13.5, color: '#b5452f', align: 'center', bold: true });
  ctx.fillStyle = 'rgba(255,196,86,0.95)';
  ctx.fillRect(44, 478, 34, 30);
  ctx.fillRect(96, 478, 34, 30);
  ctx.fillStyle = '#5d3a1e';
  ctx.fillRect(146, 470, 28, 90);
  text(ctx, 'THE COPPER LADLE', 108, 578, { size: 10, color: '#ffd873', align: 'center', bold: true });
  // THE BANK at the end of the trail
  ctx.fillStyle = '#8a7a5c';
  ctx.fillRect(1064, 176, 200, 118);
  ctx.fillStyle = '#a8926a';
  ctx.beginPath();
  ctx.moveTo(1052, 176); ctx.lineTo(1164, 128); ctx.lineTo(1276, 176); ctx.closePath(); ctx.fill();
  text(ctx, 'BANK', 1164, 162, { size: 21, color: '#3a2f1a', align: 'center', bold: true });
  ctx.fillStyle = '#e8dcc0';
  for (let i = 0; i < 4; i++) ctx.fillRect(1082 + i * 48, 190, 16, 88);
  ctx.fillStyle = '#6e5c3a';
  ctx.fillRect(1056, 286, 216, 10);
  ctx.fillStyle = '#ffd873';
  ctx.beginPath(); ctx.arc(1164, 140, 9, 0, Math.PI * 2); ctx.fill();
  // the winding trail: a sandy path with stepping stones
  ctx.strokeStyle = 'rgba(222,190,140,0.4)';
  ctx.lineWidth = 30;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  MAP_NODES.forEach(([nx, ny], i) => { if (i === 0) ctx.moveTo(nx, ny); else ctx.lineTo(nx, ny); });
  ctx.stroke();
  ctx.fillStyle = 'rgba(240,214,164,0.75)';
  for (let i = 0; i < MAP_NODES.length - 1; i++) {
    const [ax, ay] = MAP_NODES[i];
    const [bx, by] = MAP_NODES[i + 1];
    for (let sIdx = 1; sIdx <= 3; sIdx++) {
      const f = sIdx / 4;
      ctx.beginPath();
      ctx.ellipse(ax + (bx - ax) * f, ay + (by - ay) * f, 9, 5.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // street lamps along the trail
  for (const [lx, ly] of [[330, 560], [586, 548], [830, 540], [1010, 430]]) {
    ctx.strokeStyle = '#17101a'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx, ly - 44); ctx.stroke();
    const glow = ctx.createRadialGradient(lx, ly - 50, 3, lx, ly - 50, 42);
    glow.addColorStop(0, 'rgba(255,196,86,0.55)');
    glow.addColorStop(1, 'rgba(255,196,86,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(lx - 44, ly - 94, 88, 88);
    ctx.fillStyle = '#ffd873';
    ctx.beginPath(); ctx.arc(lx, ly - 50, 5, 0, Math.PI * 2); ctx.fill();
  }
  // stage nodes as badges
  const current = meta.campaignWon ? 0 : meta.unlockedMax;
  MAP_NODES.forEach(([nx, ny], i) => {
    const d = i + 1;
    const unlocked = d <= meta.unlockedMax;
    const stars = meta.stars[d] || 0;
    const completed = stars > 0 || (meta.bestEarned[d] || 0) > 0;
    const isCurrent = d === current && !completed;
    const r = isCurrent ? 33 : 25;
    if (isCurrent) {
      const pulse = 0.6 + Math.sin(time * 3.2) * 0.25;
      ctx.strokeStyle = `rgba(255,201,60,${pulse})`;
      ctx.lineWidth = 5;
      ctx.beginPath(); ctx.arc(nx, ny, r + 8 + Math.sin(time * 3.2) * 2.5, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.fillStyle = completed ? '#c97e2c' : isCurrent ? '#e8913a' : unlocked ? '#8a5a2e' : 'rgba(70,62,66,0.92)';
    ctx.beginPath(); ctx.arc(nx, ny, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = completed ? '#ffc93c' : 'rgba(255,210,130,0.45)';
    ctx.lineWidth = 2.5; ctx.stroke();
    if (!unlocked) {
      // a small padlock
      ctx.fillStyle = '#cfc8bd';
      ctx.beginPath(); ctx.roundRect(nx - 8, ny - 2, 16, 13, 3); ctx.fill();
      ctx.strokeStyle = '#cfc8bd'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(nx, ny - 3, 6, Math.PI, 0); ctx.stroke();
    } else {
      text(ctx, `${d}`, nx, ny + 1, { size: isCurrent ? 24 : 19, align: 'center', bold: true, color: '#fff6e0' });
    }
    if (completed) for (let sIdx = 0; sIdx < 3; sIdx++) star(ctx, nx - 17 + sIdx * 17, ny + r + 13, 8, sIdx < stars);
    if (unlocked) {
      const goal = Math.round((meta.difficulty === 'relaxed' ? 0.8 : 1) * [70, 110, 160, 220, 290, 370, 460, 540, 630, 730, 830, 960][d - 1]);
      text(ctx, `$${goal}`, nx, ny + r + (completed ? 30 : 16), { size: 11, align: 'center', color: '#e8dcc4' });
      hits.push({ id: 'stage', x: nx - r - 6, y: ny - r - 6, w: (r + 6) * 2, h: (r + 6) * 2, data: d });
    }
    if (isCurrent) {
      // Rosa stands at the current stage, chef hat and all
      drawFigure(ctx, ROSA_FIGURE, nx, ny - r - 26, 40, 'happy', time);
      ctx.fillStyle = '#f7f1e3';
      ctx.beginPath(); ctx.roundRect(nx - 11, ny - r - 62, 22, 10, 4); ctx.fill();
      ctx.beginPath(); ctx.arc(nx, ny - r - 60, 8, 0, Math.PI * 2); ctx.fill();
    }
  });
  // header panel: total stars + the loan journey bar
  panel(ctx, 330, 56, 620, 86, 'rgba(20,11,16,0.88)');
  text(ctx, 'STAGE LADDER — the road to the bank', 640, 82, { size: 19, align: 'center', bold: true, color: '#ffd873' });
  const totalStars = Object.values(meta.stars).reduce((a, b) => a + b, 0);
  text(ctx, `★ ${totalStars} / 36`, 366, 118, { size: 16, bold: true, color: '#ffc93c' });
  const repaid = Math.min(LOAN_TOTAL, meta.totalEarned);
  fillR(ctx, 470, 108, 330, 16, 8, 'rgba(255,255,255,0.14)');
  fillR(ctx, 470, 108, 330 * (repaid / LOAN_TOTAL), 16, 8, '#7ec850');
  text(ctx, `$${repaid} / $${LOAN_TOTAL} repaid`, 816, 117, { size: 13.5, color: '#d9b98a' });
  button(ctx, hits, 'title', 24, 736, 150, 42, '← TITLE', { size: 14, fill: 'rgba(38,22,26,0.9)' });
  if (meta.campaignWon) button(ctx, hits, 'endless', 1056, 736, 200, 42, 'ENDLESS MODE', { fill: '#8a5a2e', size: 14 });
}

function drawIntro(ctx, view, hits) {
  backdrop(ctx, view);
  const { day, goal, dotd } = view.introInfo;
  panel(ctx, 340, 330, 600, 330);
  text(ctx, view.introInfo.endless ? `ENDLESS — WAVE ${day}` : `DAY ${day}`, 640, 380, { size: 36, align: 'center', bold: true, color: '#ffd873' });
  text(ctx, `Goal: earn $${goal} before close`, 640, 428, { size: 19, align: 'center' });
  text(ctx, `Dish of the Day: ${RECIPE_BY_ID[dotd].name} — pays DOUBLE`, 640, 464, { size: 16, align: 'center', color: '#ffc93c' });
  text(ctx, `Stars: 1★ $${goal} · 2★ $${Math.round(goal * STAR_2)} · 3★ $${Math.round(goal * STAR_3)}`, 640, 500, { size: 15, align: 'center', color: '#d9b98a' });
  for (let sIdx = 0; sIdx < 3; sIdx++) star(ctx, 596 + sIdx * 44, 540, 17, sIdx < (view.meta.stars[day] || 0));
  if (view.introInfo.hasStory) button(ctx, hits, 'story', 380, 584, 180, 48, 'STORY ▶', { fill: '#5d4a7a', size: 16 });
  button(ctx, hits, 'start', 700, 584, 200, 48, 'START DAY ▶', { fill: '#4d9427', size: 17 });
  button(ctx, hits, 'ladder', 30, 570, 150, 42, '← LADDER', { size: 14 });
}

function drawStory(ctx, view, hits) {
  backdrop(ctx, view);
  const scene = view.storyScene;
  const line = scene[view.storyIdx];
  panel(ctx, 240, 380, 800, 240);
  text(ctx, line.who, 290, 430, { size: 22, bold: true, color: line.who === 'Rosa' ? '#ffc93c' : line.who === 'Marco' ? '#e8913a' : '#9db8c9' });
  // wrap text
  const words = line.text.split(' ');
  const lines = [];
  let cur = '';
  ctx.font = '19px Georgia, serif';
  for (const w of words) {
    if (ctx.measureText(cur + ' ' + w).width > 700 && cur) { lines.push(cur); cur = w; }
    else cur = cur ? cur + ' ' + w : w;
  }
  if (cur) lines.push(cur);
  lines.forEach((l, i) => text(ctx, l, 290, 478 + i * 28, { size: 19 }));
  const last = view.storyIdx >= scene.length - 1;
  button(ctx, hits, 'story-next', 760, 552, 200, 44, last ? 'TO THE KITCHEN ▶' : 'NEXT ▶', { fill: '#4d9427', size: 15 });
  button(ctx, hits, 'story-skip', 290, 552, 140, 44, 'SKIP', { fill: '#3a2a30', size: 14 });
}

function drawSummary(ctx, view, hits) {
  backdrop(ctx, view);
  const { day } = view;
  const stars = starsFor(day.earned, day.goal);
  panel(ctx, 340, 330, 600, 340);
  text(ctx, day.kind === 'endless' ? `WAVE ${day.day} COMPLETE!` : `DAY ${day.day} COMPLETE!`, 640, 378, { size: 30, align: 'center', bold: true, color: '#ffd873' });
  for (let sIdx = 0; sIdx < 3; sIdx++) {
    const filled = sIdx < stars && view.starReveal > sIdx;
    star(ctx, 556 + sIdx * 84, 448, 34, filled);
  }
  text(ctx, `Earned $${day.earned} of $${day.goal}`, 640, 512, { size: 20, align: 'center' });
  text(ctx, `Served ${day.served} · Perfect dishes ${day.perfectDishes} · Walkouts ${day.walkouts}`, 640, 548, { size: 15, align: 'center', color: '#d9b98a' });
  text(ctx, `Loan repaid $${Math.min(LOAN_TOTAL, view.meta.totalEarned)} / $${LOAN_TOTAL}`, 640, 580, { size: 15, align: 'center', color: '#d9b98a' });
  button(ctx, hits, 'shop', 380, 606, 160, 46, 'NIGHT SHOP', { size: 15 });
  if (day.day < 12 || day.kind === 'endless') button(ctx, hits, 'next', 720, 606, 180, 46, day.kind === 'endless' ? 'NEXT WAVE ▶' : 'NEXT DAY ▶', { fill: '#4d9427', size: 15 });
  else button(ctx, hits, 'ladder', 720, 606, 180, 46, 'FINISH', { fill: '#4d9427', size: 15 });
}

function drawGameOver(ctx, view, hits) {
  backdrop(ctx, view);
  const { day } = view;
  panel(ctx, 340, 350, 600, 280);
  text(ctx, 'SHORT OF THE GOAL', 640, 408, { size: 30, align: 'center', bold: true, color: '#e8452c' });
  text(ctx, `Earned $${day.earned} of $${day.goal}`, 640, 456, { size: 19, align: 'center' });
  text(ctx, 'The bank waits another day — Rosa does not give up.', 640, 494, { size: 15, align: 'center', color: '#d9b98a' });
  button(ctx, hits, 'retry', 420, 540, 180, 48, 'RETRY DAY', { fill: '#4d9427', size: 16 });
  button(ctx, hits, 'ladder', 680, 540, 180, 48, 'LADDER', { size: 16 });
}

function drawVictory(ctx, view, hits) {
  backdrop(ctx, view);
  panel(ctx, 300, 330, 680, 320);
  text(ctx, 'THE DINER IS SAVED!', 640, 392, { size: 36, align: 'center', bold: true, color: '#ffd873' });
  const totalStars = Object.values(view.meta.stars).reduce((a, b) => a + b, 0);
  text(ctx, `The $${LOAN_TOTAL} loan is repaid in full.`, 640, 442, { size: 18, align: 'center' });
  text(ctx, `Total stars ★ ${totalStars} / 36 · Perfect dishes ${view.meta.stats.perfects} · Serves ${view.meta.stats.serves}`, 640, 480, { size: 15, align: 'center', color: '#d9b98a' });
  text(ctx, 'Endless Mode is now unlocked on the ladder!', 640, 518, { size: 16, align: 'center', color: '#ffc93c' });
  button(ctx, hits, 'ladder', 520, 556, 240, 48, 'TO THE LADDER', { fill: '#4d9427', size: 16 });
}

function drawShop(ctx, view, hits) {
  backdrop(ctx, view);
  text(ctx, 'NIGHT SHOP', 640, 336, { size: 30, align: 'center', bold: true, color: '#ffd873' });
  text(ctx, `Bank $${view.meta.bank}`, 640, 372, { size: 17, align: 'center', color: '#d9b98a' });
  // upgrades panel (left) and decor panel (right): both tabs visible on one screen
  panel(ctx, 40, 396, 700, 330);
  text(ctx, '⚙ UPGRADES', 64, 424, { size: 17, bold: true, color: '#ffc93c' });
  UPGRADES.forEach((u, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 56 + col * 342;
    const y = 444 + row * 68;
    const owned = view.meta.upgrades[u.id];
    fillR(ctx, x, y, 326, 60, 9, 'rgba(255,240,214,0.06)');
    text(ctx, u.name, x + 12, y + 18, { size: 14.5, bold: true });
    text(ctx, u.desc, x + 12, y + 40, { size: 11.5, color: '#bdb2a2' });
    if (owned) text(ctx, 'OWNED ✓', x + 314, y + 30, { size: 13, align: 'right', color: '#7ec850', bold: true });
    else button(ctx, hits, 'buy-upgrade', x + 226, y + 12, 88, 36, `$${u.price}`, { fill: view.meta.bank >= u.price ? '#7a4a21' : '#4a4038', size: 14, disabled: view.meta.bank < u.price, data: u.id });
  });
  panel(ctx, 764, 396, 476, 330);
  text(ctx, '🪴 DECOR — visible in your diner', 788, 424, { size: 17, bold: true, color: '#ffc93c' });
  DECOR.forEach((d, i) => {
    const y = 444 + i * 68;
    const owned = view.meta.decor[d.id];
    fillR(ctx, 780, y, 444, 60, 9, 'rgba(255,240,214,0.06)');
    text(ctx, d.name, 792, y + 18, { size: 14.5, bold: true });
    text(ctx, d.desc, 792, y + 40, { size: 11.5, color: '#bdb2a2' });
    if (owned) text(ctx, 'IN PLACE ✓', 1212, y + 30, { size: 13, align: 'right', color: '#7ec850', bold: true });
    else button(ctx, hits, 'buy-decor', 1124, y + 12, 88, 36, `$${d.price}`, { fill: view.meta.bank >= d.price ? '#7a4a21' : '#4a4038', size: 14, disabled: view.meta.bank < d.price, data: d.id });
  });
  button(ctx, hits, 'shop-done', 1050, 740 - 14, 200, 44, 'DONE ▶', { fill: '#4d9427', size: 16 });
  button(ctx, hits, 'ladder', 30, 740 - 14, 170, 44, '← LADDER', { size: 14 });
}

function drawHowTo(ctx, view, hits) {
  backdrop(ctx, view);
  panel(ctx, 190, 322, 900, 420);
  text(ctx, 'HOW TO PLAY', 640, 356, { size: 26, align: 'center', bold: true, color: '#ffd873' });
  const lines = [
    '1. Tap a guest’s ticket, then tap pantry ingredients to cook them.',
    '2. Cooking is ACTIVE: keep clicking a cooking item to flip and stir it —',
    '    waiting alone is slow. Click it again in the gold zone to plate it.',
    '3. PERFECT zone is wide and forgiving: it only ever steps down slowly.',
    '    Nothing ever burns, and only your Trash button throws food away.',
    '4. Serve complete plates (Space) to build COMBO: ×1.5 / ×2 / ×3 payouts.',
    '    At combo 8, FEVER starts: 20s of double clicks and double pay!',
    '5. Pre-cook into MISE EN PLACE for later; pack PHONE orders on the side;',
    '    brew DRINKS and tap a guest to serve one alone for +patience.',
    '6. Dish of the Day pays DOUBLE. Variations: “no X” skips a layer,',
    '    “extra Y” doubles it — the dish you plate is exactly the ticket.',
    'Sounds: a bright chime = item entered PERFECT · a sparkle arpeggio =',
    'PERFECT dish served · combo blips rise in pitch as the chain grows ·',
    'a descending cue = combo broken · a fanfare = FEVER starts. ♪ mutes all.',
  ];
  lines.forEach((l, i) => text(ctx, l, 240, 390 + i * 23, { size: 15.5 }));
  button(ctx, hits, 'title', 540, 698, 200, 40, 'BACK', { size: 15 });
}

function drawRecipes(ctx, view, hits) {
  backdrop(ctx, view);
  text(ctx, 'RECIPE BOOK', 640, 336, { size: 28, align: 'center', bold: true, color: '#ffd873' });
  const page = view.recipePage || 0;
  const perPage = 9;
  RECIPES.slice(page * perPage, page * perPage + perPage).forEach((r, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 46 + col * 404;
    const y = 366 + row * 118;
    panel(ctx, x, y, 388, 106);
    text(ctx, r.name, x + 14, y + 22, { size: 15.5, bold: true });
    text(ctx, `$${r.price}`, x + 374, y + 22, { size: 14, align: 'right', color: '#ffc93c', bold: true });
    r.steps.forEach((ing, si) => {
      paintIngredient(ctx, ing, x + 30 + si * 44, y + 58, 34);
      if (si < r.steps.length - 1) text(ctx, '›', x + 52 + si * 44, y + 58, { size: 14, align: 'center', color: '#9a8a76' });
    });
    text(ctx, r.steps.map((s) => INGREDIENTS[s].process).join(' · '), x + 14, y + 90, { size: 10.5, color: '#9a8a76' });
  });
  if (page > 0) button(ctx, hits, 'recipes-prev', 46, 736, 130, 40, '← PREV', { size: 14 });
  if ((page + 1) * perPage < RECIPES.length) button(ctx, hits, 'recipes-next', 1104, 736, 130, 40, 'NEXT →', { size: 14 });
  button(ctx, hits, 'title', 540, 736, 200, 40, 'BACK', { size: 14 });
}

function drawAchievements(ctx, view, hits) {
  backdrop(ctx, view);
  text(ctx, 'ACHIEVEMENTS', 640, 336, { size: 28, align: 'center', bold: true, color: '#ffd873' });
  text(ctx, 'Marco’s loyalty:', 496, 380, { size: 15, color: '#d9b98a', align: 'right' });
  for (let i = 0; i < 5; i++) heart(ctx, 516 + i * 30, 380, 22, i < view.meta.loyalty);
  ACHIEVEMENTS.forEach((a, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 46 + col * 404;
    const y = 410 + row * 104;
    const earned = view.meta.achievements[a.id];
    panel(ctx, x, y, 388, 92, earned ? 'rgba(80,54,20,0.9)' : 'rgba(24,14,20,0.88)');
    star(ctx, x + 34, y + 46, 20, Boolean(earned));
    text(ctx, a.name, x + 66, y + 34, { size: 16, bold: true, color: earned ? '#ffd873' : '#bdb2a2' });
    text(ctx, a.desc, x + 66, y + 60, { size: 12.5, color: '#9a8a76' });
    text(ctx, earned ? 'EARNED' : 'LOCKED', x + 374, y + 34, { size: 11, align: 'right', color: earned ? '#7ec850' : '#6e6257', bold: true });
  });
  button(ctx, hits, 'title', 540, 736, 200, 40, 'BACK', { size: 14 });
}

function drawPaused(ctx, view, hits) {
  drawService(ctx, view, hits);
  ctx.fillStyle = 'rgba(8,4,8,0.62)';
  ctx.fillRect(0, 0, W, H);
  panel(ctx, 440, 280, 400, 260);
  text(ctx, 'PAUSED', 640, 330, { size: 30, align: 'center', bold: true, color: '#ffd873' });
  button(ctx, hits, 'resume', 490, 366, 300, 48, 'RESUME', { fill: '#4d9427', size: 17 });
  button(ctx, hits, 'mute', 490, 426, 300, 44, view.muted ? 'UNMUTE ♪' : 'MUTE ♪', { size: 15 });
  button(ctx, hits, 'quit', 490, 482, 300, 44, 'QUIT TO LADDER', { fill: '#6e3a2a', size: 15 });
}

/** Staging-only screen: three finished dishes large — a bowl, a plate, a board — plus a
 * drink glass. Used by the render check to prove finished-dish art draws cleanly. */
function drawDishesCheck(ctx, view) {
  ctx.fillStyle = '#1d1016';
  ctx.fillRect(0, 0, W, H);
  text(ctx, 'FINISHED DISHES', 640, 110, { size: 30, align: 'center', bold: true, color: '#ffd873' });
  paintDish(ctx, 'ladle', 250, 390, 300, view.time);
  text(ctx, "BOWL — Rosa's Ladle Special", 250, 610, { size: 15, align: 'center', color: '#ffe9c4' });
  paintDish(ctx, 'steakdin', 640, 390, 300, view.time);
  text(ctx, 'PLATE — Steak Dinner', 640, 610, { size: 15, align: 'center', color: '#ffe9c4' });
  paintDish(ctx, 'blt', 1030, 390, 300, view.time);
  text(ctx, 'BOARD — BLT Sandwich', 1030, 610, { size: 15, align: 'center', color: '#ffe9c4' });
  paintDrink(ctx, 'coffee', 1150, 700, 54);
  text(ctx, 'GLASS — Coffee', 1150, 648, { size: 13, align: 'center', color: '#ffe9c4' });
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  return {
    draw(view) {
      const hits = [];
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#170d12';
      ctx.fillRect(0, 0, W, H);
      switch (view.screen) {
        case SCREEN.TITLE: drawTitle(ctx, view, hits); break;
        case SCREEN.LADDER: drawLadder(ctx, view, hits); break;
        case SCREEN.INTRO: drawIntro(ctx, view, hits); break;
        case SCREEN.STORY: drawStory(ctx, view, hits); break;
        case SCREEN.SERVICE: drawService(ctx, view, hits); break;
        case SCREEN.PAUSED: drawPaused(ctx, view, hits); break;
        case SCREEN.SUMMARY: drawSummary(ctx, view, hits); break;
        case SCREEN.SHOP: drawShop(ctx, view, hits); break;
        case SCREEN.GAMEOVER: drawGameOver(ctx, view, hits); break;
        case SCREEN.VICTORY: drawVictory(ctx, view, hits); break;
        case SCREEN.HOWTO: drawHowTo(ctx, view, hits); break;
        case SCREEN.RECIPES: drawRecipes(ctx, view, hits); break;
        case SCREEN.ACHIEVEMENTS: drawAchievements(ctx, view, hits); break;
        case SCREEN.DISHES: drawDishesCheck(ctx, view); break;
        default: drawTitle(ctx, view, hits);
      }
      return hits;
    },
  };
}

export { SEAT_X };
