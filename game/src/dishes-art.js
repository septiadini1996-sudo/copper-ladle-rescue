// The Copper Ladle — FINISHED-DISH art. When the last step of a dish is plated, the stack of
// layers transforms into one composed illustration: the food served in its proper vessel,
// garnished and steaming. Every finished dish is composed ONLY from its own recipe's
// ingredient painters — dishElements() is the single source the painter and the sync test
// both read, so a dish can never show an ingredient its recipe does not have.

import { INGREDIENTS, RECIPES, RECIPE_BY_ID } from './data.js';
import { paintIngredient, paintIngredientLayer } from './ingredients-art.js';

/** Which vessel each recipe is served in. */
export const DISH_VESSELS = {
  burger: 'plate', double: 'plate', garden: 'plate', breakfast: 'plate',
  chickplate: 'plate', fishchips: 'plate', shrimpnood: 'bowl', ladle: 'bowl',
  mushsoup: 'bowl', tomsoup: 'bowl', steakdin: 'plate', skillet: 'plate',
  avotoast: 'board', pancakes: 'plate', honeychick: 'plate', fondant: 'plate',
  alfredo: 'bowl', seapasta: 'bowl', stirfry: 'bowl', fishrice: 'plate',
  blt: 'board', eggrice: 'bowl', omelette: 'plate', pepsteak: 'plate',
  shrimprice: 'bowl', feast: 'plate',
};

/** Stack-style dishes (burgers, sandwiches) finish as a composed stack, not a scatter. */
const STACK_DISHES = new Set(['burger', 'double', 'garden', 'blt', 'avotoast']);

/** The exact ingredient elements a finished dish is composed from: its recipe's steps. */
export function dishElements(recipeId) {
  return [...RECIPE_BY_ID[recipeId].steps];
}

export function dishVessel(recipeId) {
  return DISH_VESSELS[recipeId] || 'plate';
}

function isHot(recipeId) {
  return RECIPE_BY_ID[recipeId].steps.some((ing) => INGREDIENTS[ing].process !== 'none');
}

function steam(ctx, x, y, s, t) {
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.38)';
  ctx.lineWidth = Math.max(1.2, s * 0.02);
  for (const off of [-0.18, 0.05, 0.26]) {
    const wob = Math.sin(t * 2.2 + off * 9) * s * 0.03;
    ctx.beginPath();
    ctx.moveTo(x + off * s, y - s * 0.28);
    ctx.quadraticCurveTo(x + off * s - wob, y - s * 0.44, x + off * s + wob, y - s * 0.6);
    ctx.stroke();
  }
  ctx.restore();
}

function drawBowl(ctx, x, y, s, surfaceColor) {
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.ellipse(x, y + s * 0.34, s * 0.52, s * 0.1, 0, 0, Math.PI * 2); ctx.fill();
  const g = ctx.createLinearGradient(x, y - s * 0.2, x, y + s * 0.4);
  g.addColorStop(0, '#7fb3d9');
  g.addColorStop(1, '#4a7ea6');
  ctx.fillStyle = g;
  ctx.strokeStyle = 'rgba(46,26,12,0.55)';
  ctx.lineWidth = Math.max(1.2, s * 0.025);
  ctx.beginPath();
  ctx.moveTo(x - s * 0.52, y - s * 0.12);
  ctx.lineTo(x + s * 0.52, y - s * 0.12);
  ctx.quadraticCurveTo(x + s * 0.42, y + s * 0.34, x, y + s * 0.38);
  ctx.quadraticCurveTo(x - s * 0.42, y + s * 0.34, x - s * 0.52, y - s * 0.12);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = surfaceColor;
  ctx.beginPath(); ctx.ellipse(x, y - s * 0.12, s * 0.52, s * 0.13, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath(); ctx.ellipse(x - s * 0.2, y - s * 0.16, s * 0.18, s * 0.04, -0.2, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawPlate(ctx, x, y, s) {
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.ellipse(x, y + s * 0.3, s * 0.54, s * 0.11, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#f7f1e3';
  ctx.strokeStyle = 'rgba(46,26,12,0.4)';
  ctx.lineWidth = Math.max(1.2, s * 0.025);
  ctx.beginPath(); ctx.ellipse(x, y + s * 0.08, s * 0.56, s * 0.24, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#e9dfc8';
  ctx.beginPath(); ctx.ellipse(x, y + s * 0.06, s * 0.42, s * 0.16, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawBoard(ctx, x, y, s) {
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.ellipse(x, y + s * 0.32, s * 0.56, s * 0.1, 0, 0, Math.PI * 2); ctx.fill();
  const g = ctx.createLinearGradient(x, y - s * 0.2, x, y + s * 0.3);
  g.addColorStop(0, '#c9a15f');
  g.addColorStop(1, '#a1763a');
  ctx.fillStyle = g;
  ctx.strokeStyle = 'rgba(46,26,12,0.5)';
  ctx.lineWidth = Math.max(1.2, s * 0.025);
  ctx.beginPath(); ctx.roundRect(x - s * 0.58, y - s * 0.16, s * 1.16, s * 0.44, s * 0.08); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = 'rgba(122,74,33,0.5)';
  ctx.lineWidth = Math.max(1, s * 0.018);
  for (const off of [-0.05, 0.08, 0.2]) {
    ctx.beginPath(); ctx.moveTo(x - s * 0.52, y + off * s); ctx.lineTo(x + s * 0.52, y + off * s); ctx.stroke();
  }
  ctx.restore();
}

/**
 * Paint the finished dish for `recipeId`, centred on (x, y) at size s (roughly the vessel
 * width). Composed only from dishElements(recipeId) — its own ingredients.
 */
export function paintDish(ctx, recipeId, x, y, s, t = 0) {
  const recipe = RECIPE_BY_ID[recipeId];
  if (!recipe) return;
  const vessel = dishVessel(recipeId);
  const elements = dishElements(recipeId);
  ctx.save();
  if (vessel === 'bowl') {
    const base = elements.includes('broth') ? '#c97e2c' : elements.includes('noodles') || elements.includes('pasta') ? '#e8c96a' : '#f0e6ce';
    drawBowl(ctx, x, y, s, base);
    // Arrange the dish's own ingredients over the surface: first element centre-stage,
    // the rest around it — every element of the recipe, nothing else.
    const ring = [
      [0, -0.1, 0.42], [-0.26, -0.14, 0.3], [0.26, -0.14, 0.3], [-0.14, -0.02, 0.28],
      [0.15, -0.02, 0.28], [0, -0.2, 0.26], [-0.32, -0.05, 0.24], [0.33, -0.05, 0.24],
    ];
    elements.forEach((ing, i) => {
      const [dx, dy, sc] = ring[i % ring.length];
      paintIngredient(ctx, ing, x + dx * s, y + dy * s, s * sc);
    });
  } else if (STACK_DISHES.has(recipeId)) {
    if (vessel === 'board') drawBoard(ctx, x, y, s);
    else drawPlate(ctx, x, y, s);
    // A composed stack: the recipe's layers in order, the way the dish is actually built.
    elements.forEach((ing, i) => {
      paintIngredientLayer(ctx, ing, x, y + s * 0.1 - i * s * 0.09, s * 0.78);
    });
  } else {
    drawPlate(ctx, x, y, s);
    // Plate composition: the first (main) element large at centre, sides arranged around.
    const spots = [
      [0, -0.02, 0.52], [-0.3, 0.08, 0.3], [0.3, 0.08, 0.3], [-0.16, -0.16, 0.27],
      [0.18, -0.15, 0.27], [0, 0.14, 0.26], [-0.34, -0.1, 0.24], [0.36, -0.08, 0.24],
    ];
    elements.forEach((ing, i) => {
      const [dx, dy, sc] = spots[i % spots.length];
      paintIngredient(ctx, ing, x + dx * s, y + dy * s, s * sc);
    });
  }
  if (isHot(recipeId)) steam(ctx, x, y, s, t);
  ctx.restore();
}

/** Every recipe has a finished-dish painter: guaranteed by construction, asserted in tests. */
export function allDishIds() {
  return RECIPES.map((r) => r.id);
}
