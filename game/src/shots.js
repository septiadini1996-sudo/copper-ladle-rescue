// The Copper Ladle — screenshot staging. Each scene builds a genuine game state through the
// kitchen's own functions (spawn, cook, boost, plate, serve) and hands the renderer a view,
// so every screenshot is a real frame of the real game. Same seed → same frame.

import { STORY } from './data.js';
import {
  clickDrink, clickIngredient, clickItem, createDay, createMeta, dishOfTheDay, selectTarget,
  serve, spawnCustomer, spawnPhone, trayCapacity, plateComplete, nextNeeded,
} from './kitchen.js';
import { SCREEN } from './render.js';

function richMeta() {
  const meta = createMeta('normal');
  meta.bank = 486;
  meta.totalEarned = 2210;
  meta.stars = { 1: 3, 2: 3, 3: 2, 4: 3 };
  meta.bestEarned = { 1: 210, 2: 260, 3: 240, 4: 360 };
  meta.unlockedMax = 6;
  meta.upgrades = { knives: true, stools: true };
  meta.decor = { plant: true, lamps: true };
  meta.loyalty = 3;
  meta.achievements = { first: true, perfect10: true };
  meta.stats = { serves: 120, perfects: 34, maxCombo: 9, fevers: 2, phoneDone: 5, drinks: 18 };
  return meta;
}

/** Cook one component all the way onto the plate (or as far as it goes). */
function cookAndPlate(state, meta, ing) {
  clickIngredient(state, meta, ing);
  const item = state.items.find((i) => i.ing === ing);
  if (item) {
    let guard = 0;
    while (item.doneness < 60 && guard++ < 12) clickItem(state, meta, item.id);
    if (state.items.includes(item)) clickItem(state, meta, item.id);
  }
}

function baseView(meta, day, screen) {
  return {
    screen, meta, day, time: 6.5, muted: false, popups: [],
    plateComplete: day ? plateComplete(day) : false,
    nextNeeded: day ? nextNeeded(day) : null,
    trayCap: trayCapacity(meta),
    recipePage: 0, starReveal: 3, tutorial: null, introInfo: null, storyScene: null, storyIdx: 0,
  };
}

function stageCover() {
  const meta = richMeta();
  const day = createDay(meta, 5, { seed: 555 });
  // A first guest is served in full, genuinely, so the combo is real.
  const first = spawnCustomer(day, meta, { typeId: 'student', recipeId: 'fishchips', drink: null, variation: null });
  selectTarget(day, { type: 'seat', id: first.id });
  for (const ing of ['fish', 'potato']) cookAndPlate(day, meta, ing);
  serve(day, meta);
  const second = spawnCustomer(day, meta, { typeId: 'auntie', recipeId: 'tomsoup', drink: null, variation: null });
  selectTarget(day, { type: 'seat', id: second.id });
  for (const ing of ['broth', 'tomato', 'cream']) cookAndPlate(day, meta, ing);
  serve(day, meta);
  // The first guest has already left; the second is still at the pass carrying their dish,
  // so the tableau keeps four figures in four seats.
  day.customers = day.customers.filter((c) => c.id !== first.id);
  day.combo = 4; // the chain the two serves began, kept warm for the frame
  day.comboT = 8;
  // The tableau: three guests, one dish half-built, one item sitting in the PERFECT zone.
  const star = spawnCustomer(day, meta, { typeId: 'tourist', recipeId: 'shrimpnood', drink: 'juice', variation: null });
  spawnCustomer(day, meta, { typeId: 'auntie', recipeId: 'burger', drink: null, variation: null });
  spawnCustomer(day, meta, { typeId: 'worker', recipeId: 'omelette', drink: null, variation: { kind: 'extra', ing: 'cheese' } });
  selectTarget(day, { type: 'seat', id: star.id });
  cookAndPlate(day, meta, 'noodles');
  cookAndPlate(day, meta, 'shrimp');
  // pepper left cooking ON the board, clicked into the gold PERFECT zone (48) — one more
  // click would take it, so the loop stops as soon as it enters the zone
  clickIngredient(day, meta, 'pepper');
  const pepper = day.items.find((i) => i.ing === 'pepper');
  if (pepper) { let g = 0; while (pepper.doneness < 45 && g++ < 12) clickItem(day, meta, pepper.id); }
  // mise en place: a pre-cooked mushroom waits in the tray
  clickIngredient(day, meta, 'mushroom');
  const mush = day.items.find((i) => i.ing === 'mushroom');
  if (mush) { let g = 0; while (mush.doneness < 60 && g++ < 12) clickItem(day, meta, mush.id); if (day.items.includes(mush)) clickItem(day, meta, mush.id); }
  // a coffee ready to serve
  clickDrink(day, meta, 'coffee');
  const coffee = day.items.find((i) => i.ing === 'drink');
  if (coffee) { let g = 0; while (coffee.doneness < 60 && g++ < 6) clickItem(day, meta, coffee.id); if (day.items.includes(coffee)) clickItem(day, meta, coffee.id); }
  spawnPhone(day, { recipeId: 'blt' });
  const view = baseView(meta, day, SCREEN.SERVICE);
  view.popups = [{ x: 470, y: 300, text: '+$41 ×1.5', color: '#ffc93c', age: 0.3 }];
  return view;
}

function stageAssembly() {
  const meta = richMeta();
  const day = createDay(meta, 7, { seed: 777 });
  const critic = spawnCustomer(day, meta, { typeId: 'critic', recipeId: 'double', drink: null, variation: null });
  spawnCustomer(day, meta, { typeId: 'auntie', recipeId: 'mushsoup', drink: null, variation: null });
  selectTarget(day, { type: 'seat', id: critic.id });
  for (const ing of ['bun', 'patty', 'patty', 'cheese']) cookAndPlate(day, meta, ing);
  clickIngredient(day, meta, 'bacon');
  const bacon = day.items.find((i) => i.ing === 'bacon');
  if (bacon) { let g = 0; while (bacon.doneness < 45 && g++ < 12) clickItem(day, meta, bacon.id); }
  day.combo = 2;
  day.comboT = 7;
  return baseView(meta, day, SCREEN.SERVICE);
}

function stageShop() {
  const meta = richMeta();
  meta.bank = 640;
  return baseView(meta, null, SCREEN.SHOP);
}

function stageSummary() {
  const meta = richMeta();
  const day = createDay(meta, 4, { seed: 444 });
  day.earned = 372;
  day.served = 16;
  day.perfectDishes = 7;
  day.walkouts = 0;
  day.over = true;
  day.won = true;
  const view = baseView(meta, day, SCREEN.SUMMARY);
  view.starReveal = 3;
  return view;
}

function stageSimple(name) {
  const meta = richMeta();
  switch (name) {
    case 'title': return baseView(meta, null, SCREEN.TITLE);
    case 'ladder': return baseView(meta, null, SCREEN.LADDER);
    case 'howto': return baseView(meta, null, SCREEN.HOWTO);
    case 'recipes': return baseView(meta, null, SCREEN.RECIPES);
    case 'achievements': return baseView(meta, null, SCREEN.ACHIEVEMENTS);
    case 'dishes': return baseView(meta, null, SCREEN.DISHES);
    case 'intro': {
      const view = baseView(meta, null, SCREEN.INTRO);
      view.introInfo = { day: 5, endless: false, goal: 290, dotd: dishOfTheDay(5), hasStory: false };
      return view;
    }
    case 'story': {
      const view = baseView(meta, null, SCREEN.STORY);
      view.storyScene = STORY.intro;
      view.storyIdx = 1;
      return view;
    }
    case 'gameover': {
      const day = createDay(meta, 3, { seed: 33 });
      day.earned = 96;
      day.goal = 160;
      day.over = true;
      return baseView(meta, day, SCREEN.GAMEOVER);
    }
    case 'victory': {
      meta.campaignWon = true;
      return baseView(meta, null, SCREEN.VICTORY);
    }
    case 'paused': {
      const view = stageAssembly();
      view.screen = SCREEN.PAUSED;
      return view;
    }
    default: return baseView(meta, null, SCREEN.TITLE);
  }
}

export function stageShot(name) {
  switch (name) {
    case 'cover': return stageCover();
    case 'assembly': return stageAssembly();
    case 'shop': return stageShop();
    case 'summary': return stageSummary();
    default: return stageSimple(name);
  }
}

export const ALL_SCENES = ['cover', 'assembly', 'shop', 'summary', 'title', 'ladder', 'intro', 'story', 'howto', 'recipes', 'achievements', 'gameover', 'victory', 'paused', 'dishes'];
