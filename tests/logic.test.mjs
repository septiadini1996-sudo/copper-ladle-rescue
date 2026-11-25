// The Copper Ladle — logic test suite. Drives the pure rules core (game/src/kitchen.js)
// directly: every expansion system end-to-end, the dish–ingredient sync proof for all 26
// recipes, and one full simulated playthrough that uses drinks, phone orders, mise en
// place and FEVER on the way to winning the 12-day campaign on Normal.
// Run: node tests/logic.test.mjs  (exit code 0 = all pass)

import { readFileSync } from 'node:fs';
import {
  CLICK_BOOST, DAY_GOALS, DONENESS_MAX, DRINK_PRICE, FEVER_AT, LOAN_TOTAL, LOYALTY_BONUS,
  PERFECT_MAX, PERFECT_MIN, PHONE_PAYOUT, TRICKLE, comboMult, starsFor,
} from '../game/src/config.js';
import {
  CUSTOMER_TYPE_IDS, DECOR, DRINK_IDS, INGREDIENTS, INGREDIENT_IDS, RECIPES, RECIPE_BY_ID,
  STORY, UPGRADES,
} from '../game/src/data.js';
import {
  buyDecor, buyUpgrade, clickDrink, clickIngredient, clickItem, clickTray, createDay,
  createMeta, decorBonus, dishLayersFor, dishOfTheDay, drainEvents, effectiveSteps,
  finishDay, nextNeeded, perfectMax, plateComplete, selectTarget, serve, serveDrinkAlone,
  spawnCustomer, spawnPhone, stationSlots, tick, trayCapacity,
} from '../game/src/kitchen.js';
import { hasPainters, paintDrink, paintIngredient, paintIngredientLayer } from '../game/src/ingredients-art.js';
import { DISH_VESSELS, dishElements, paintDish } from '../game/src/dishes-art.js';
import { ALL_SCENES, stageShot } from '../game/src/shots.js';

let pass = 0;
let fail = 0;
const failures = [];
function ok(cond, label) {
  if (cond) { pass += 1; } else { fail += 1; failures.push(label); console.log('  FAIL:', label); }
}
function eq(a, b, label) { ok(a === b, `${label} (got ${a}, want ${b})`); }
function near(a, b, tol, label) { ok(Math.abs(a - b) <= tol, `${label} (got ${a}, want ~${b}±${tol})`); }
function section(name) { console.log(`\n== ${name}`); }

/** A canvas 2d stub: records nothing, answers everything, never throws. */
function mockCtx() {
  const grad = { addColorStop() {} };
  const base = {
    canvas: { width: 1280, height: 800 },
    measureText: () => ({ width: 10 }),
    createLinearGradient: () => grad,
    createRadialGradient: () => grad,
  };
  return new Proxy(base, {
    get(t, p) { if (p in t) return t[p]; return () => undefined; },
    set(t, p, v) { t[p] = v; return true; },
  });
}

/** Build the active order to completion using only the public click API. */
function buildCurrent(state, meta) {
  let guard = 0;
  while (!plateComplete(state) && guard++ < 300) {
    const need = nextNeeded(state);
    if (!need) return false;
    const before = state.plate ? state.plate.layers.length : 0;
    clickIngredient(state, meta, need);
    if (state.plate && state.plate.layers.length > before) continue;
    const item = state.items.find((i) => i.ing === need);
    if (!item) return false;
    let g = 0;
    while (state.items.includes(item) && g++ < 30) clickItem(state, meta, item.id);
    if (state.items.includes(item)) return false;
  }
  return plateComplete(state);
}

/** Spawn a fully forced customer, target them, build, and serve. Returns serve result. */
function serveForced(state, meta, force) {
  const c = spawnCustomer(state, meta, { drink: null, variation: null, ...force });
  selectTarget(state, { type: 'seat', id: c.id });
  if (!buildCurrent(state, meta)) return { customer: c, result: null };
  return { customer: c, result: serve(state, meta) };
}

function eventsOf(state) { return drainEvents(state).map((e) => e.type); }

// ---------------------------------------------------------------- data integrity
section('data integrity');
eq(RECIPES.length, 26, '26 recipes');
eq(INGREDIENT_IDS.length, 29, '29 ingredients');
eq(CUSTOMER_TYPE_IDS.length, 6, '6 customer types');
eq(UPGRADES.length, 8, '8 upgrades');
eq(DECOR.length, 4, '4 decor items');
eq(LOAN_TOTAL, 5370, 'loan total is the sum of day goals');
for (const r of RECIPES) {
  ok(r.steps.length >= 2 && r.steps.length <= 6, `recipe ${r.id} has 2..6 steps`);
  for (const s of r.steps) ok(INGREDIENTS[s], `recipe ${r.id} step ${s} is a real ingredient`);
  ok(r.price > 0, `recipe ${r.id} has a price`);
}
for (const key of ['intro', 'mid', 'final', 'win']) {
  ok(Array.isArray(STORY[key]) && STORY[key].length >= 2, `story scene '${key}' has at least 2 lines`);
  for (const line of STORY[key]) ok(line.who && line.text, `story '${key}' line is speaker + text`);
}

// ---------------------------------------------------------------- painters & icons
section('ingredient + dish painters (mock canvas)');
{
  const ctx = mockCtx();
  for (const ing of INGREDIENT_IDS) {
    ok(hasPainters(ing), `ingredient ${ing} has painters`);
    let threw = false;
    try { paintIngredient(ctx, ing, 100, 100, 40); paintIngredientLayer(ctx, ing, 100, 100, 80); } catch { threw = true; }
    ok(!threw, `ingredient ${ing} paints without error`);
  }
  for (const d of DRINK_IDS) {
    let threw = false;
    try { paintDrink(ctx, d, 100, 100, 40); } catch { threw = true; }
    ok(!threw, `drink ${d} paints without error`);
  }
}

// ---------------------------------------------------------------- DISH SYNC (hard rule)
section('dish–ingredient sync: layers, finished art, simulated builds');
{
  const setEq = (a, b) => {
    const sa = [...a].sort().join(',');
    const sb = [...b].sort().join(',');
    return sa === sb;
  };
  const ctx = mockCtx();
  for (const r of RECIPES) {
    // 1) the layer definition IS the recipe, in order
    ok(JSON.stringify(dishLayersFor(r.id, null)) === JSON.stringify(r.steps), `${r.id}: dishLayersFor == steps in order`);
    // 2) the finished-dish painter references exactly the recipe's ingredients
    ok(setEq(dishElements(r.id), r.steps), `${r.id}: finished dish elements == recipe ingredients`);
    ok(DISH_VESSELS[r.id] === 'bowl' || DISH_VESSELS[r.id] === 'plate' || DISH_VESSELS[r.id] === 'board', `${r.id}: has a vessel`);
    let threw = false;
    try { paintDish(ctx, r.id, 200, 200, 120, 1.5); } catch { threw = true; }
    ok(!threw, `${r.id}: finished dish paints without error`);
    // 3) variations: no-X removes exactly that layer, extra-Y doubles exactly it
    for (const ing of [...new Set(r.steps)]) {
      const noVar = dishLayersFor(r.id, { kind: 'no', ing });
      eq(noVar.length, r.steps.length - 1, `${r.id} no-${ing}: one layer removed`);
      eq(noVar.filter((x) => x === ing).length, r.steps.filter((x) => x === ing).length - 1, `${r.id} no-${ing}: removes exactly that ingredient`);
      const exVar = dishLayersFor(r.id, { kind: 'extra', ing });
      eq(exVar.length, r.steps.length + 1, `${r.id} extra-${ing}: one layer added`);
      eq(exVar.filter((x) => x === ing).length, r.steps.filter((x) => x === ing).length + 1, `${r.id} extra-${ing}: doubles exactly that ingredient`);
    }
    // 4) a simulated full build through the kitchen yields exactly the defined layers
    for (const variation of [null, { kind: 'no', ing: r.steps[r.steps.length - 1] }, { kind: 'extra', ing: r.steps[0] }]) {
      const meta = createMeta('normal');
      const day = createDay(meta, 6, { seed: 42 });
      const c = spawnCustomer(day, meta, { typeId: 'student', recipeId: r.id, drink: null, variation });
      selectTarget(day, { type: 'seat', id: c.id });
      ok(buildCurrent(day, meta), `${r.id} builds to completion (variation ${variation ? variation.kind : 'none'})`);
      const layers = day.plate.layers.map((l) => l.ing);
      ok(JSON.stringify(layers) === JSON.stringify(effectiveSteps(r.id, variation)), `${r.id}: built layers == dish definition (variation ${variation ? variation.kind : 'none'})`);
    }
  }
}

// ---------------------------------------------------------------- click cooking
section('active click-cooking, wide perfect zone, no-burn rule');
{
  ok((PERFECT_MAX - PERFECT_MIN) / DONENESS_MAX >= 0.4, 'PERFECT zone spans at least 40% of doneness');
  const meta = createMeta('normal');
  const day = createDay(meta, 1, { seed: 7 });
  clickIngredient(day, meta, 'patty');
  const patty = day.items.find((i) => i.ing === 'patty');
  ok(patty && patty.doneness === 0, 'clicking a pantry ingredient starts it cooking at 0');
  clickItem(day, meta, patty.id);
  clickItem(day, meta, patty.id);
  drainEvents(day);
  clickItem(day, meta, patty.id);
  eq(patty.doneness, CLICK_BOOST * 3, 'three clicks give 3x the click boost');
  ok(eventsOf(day).includes('perfect-zone'), 'entering the PERFECT zone emits its cue event');
  // trickle comparison: 3 idle seconds add far less than 3 clicks
  clickIngredient(day, meta, 'steak');
  const steak = day.items.find((i) => i.ing === 'steak');
  tick(day, meta, 3);
  eq(steak.doneness, TRICKLE * 3, 'passive trickle is slow (5/s)');
  ok(patty.doneness > steak.doneness * 3, 'active clicks dominate the trickle');
  // no-burn: an item left at full doneness for ages is never removed, quality only steps down
  clickIngredient(day, meta, 'potato');
  const potato = day.items.find((i) => i.ing === 'potato');
  potato.doneness = DONENESS_MAX;
  tick(day, meta, 45); // past the first overcook step
  ok(day.items.includes(potato), 'overcooked item is NOT removed by neglect');
  clickItem(day, meta, potato.id);
  const trayEntry = day.tray.find((t) => t.ing === 'potato');
  ok(trayEntry && trayEntry.quality <= 0.85 && trayEntry.qualityName !== 'perfect', 'overcook step 1: quality steps down from perfect');
  // a PERFECT-zone item left too long steps down to 'good' by name as well
  clickIngredient(day, meta, 'shrimp');
  const shrimp = day.items.find((i) => i.ing === 'shrimp');
  shrimp.doneness = 100; // inside the PERFECT zone
  shrimp.overT = 50; // past the first overcook step
  clickItem(day, meta, shrimp.id);
  const shrimpTray = day.tray.find((t) => t.ing === 'shrimp');
  ok(shrimpTray && shrimpTray.qualityName === 'good' && shrimpTray.quality === 0.85, 'overcook step 1 renames perfect to good');
  clickIngredient(day, meta, 'fish');
  const fish = day.items.find((i) => i.ing === 'fish');
  fish.doneness = DONENESS_MAX;
  fish.overT = 100000; // an eternity past done
  clickItem(day, meta, fish.id);
  const fishTray = day.tray.find((t) => t.ing === 'fish');
  ok(fishTray && fishTray.qualityName === 'plain' && fishTray.quality === 0.6, 'extreme overcook: quality bottoms out at plain — never burnt, never gone');
  // wide gold zone widens further with the upgrade
  eq(perfectMax(createMeta('normal')), PERFECT_MAX, 'perfect zone base width');
  const rich = createMeta('normal');
  rich.upgrades.widegold = true;
  eq(perfectMax(rich), PERFECT_MAX + 15, 'Wide Gold upgrade widens the PERFECT zone');
}

// ---------------------------------------------------------------- combo
section('combo math and breaks');
{
  eq(comboMult(0), 1, 'combo 0 pays x1');
  eq(comboMult(2), 1, 'combo 2 pays x1');
  eq(comboMult(3), 1.5, 'combo 3 pays x1.5');
  eq(comboMult(5), 2, 'combo 5 pays x2');
  eq(comboMult(8), 3, 'combo 8 pays x3');
  eq(comboMult(20), 3, 'combo caps at x3');
  // timeout break
  const meta = createMeta('normal');
  const day = createDay(meta, 3, { seed: 11 });
  day.combo = 3; day.comboT = 0.1;
  tick(day, meta, 0.2);
  eq(day.combo, 0, 'combo times out and breaks');
  ok(day.events.some((e) => e.type === 'combo-break' && e.why === 'timeout'), 'timeout break emits combo-break');
  // walkout break
  const day2 = createDay(meta, 3, { seed: 12 });
  const c = spawnCustomer(day2, meta, { typeId: 'student', recipeId: 'burger', drink: null, variation: null });
  day2.combo = 4; day2.comboT = 9;
  c.patience = 0.05;
  tick(day2, meta, 0.1);
  eq(day2.walkouts, 1, 'impatient customer walks out');
  eq(day2.combo, 0, 'an angry walkout breaks the combo');
  ok(day2.events.some((e) => e.type === 'combo-break' && e.why === 'walkout'), 'walkout break emits combo-break');
  // perfect serves count double toward the chain
  const day3 = createDay(meta, 3, { seed: 13 });
  const s1 = serveForced(day3, meta, { typeId: 'student', recipeId: 'fishchips' });
  ok(s1.result && s1.result.perfectDish, 'careful build serves a perfect dish');
  eq(day3.combo, 2, 'a perfect serve adds +2 to the combo');
}

// ---------------------------------------------------------------- FEVER
section('FEVER mode');
{
  const meta = createMeta('normal');
  const day = createDay(meta, 4, { seed: 21 });
  let feverSeen = false;
  for (let i = 0; i < 4; i++) {
    const { result } = serveForced(day, meta, { typeId: 'student', recipeId: 'fishchips' });
    ok(result && result.perfectDish, `fever setup serve ${i + 1} is perfect`);
    if (drainEvents(day).some((e) => e.type === 'fever-start')) feverSeen = true;
  }
  eq(day.combo, FEVER_AT, 'four perfect serves chain to the FEVER threshold');
  ok(day.fever && feverSeen, 'FEVER triggers at the threshold with its event');
  ok(meta.achievements.fever, 'FEVER unlocks its achievement');
  // fever clicks count double
  const day2 = createDay(meta, 4, { seed: 22 });
  day2.fever = true; day2.feverT = 20;
  clickIngredient(day2, meta, 'patty');
  const patty = day2.items.find((i) => i.ing === 'patty');
  clickItem(day2, meta, patty.id);
  eq(patty.doneness, CLICK_BOOST * 2, 'during FEVER a click counts double');
  // fever payouts double
  const metaA = createMeta('normal');
  const dayA = createDay(metaA, 4, { seed: 23 });
  const base = serveForced(dayA, metaA, { typeId: 'student', recipeId: 'burger' }).result.amount;
  const metaB = createMeta('normal');
  const dayB = createDay(metaB, 4, { seed: 23 });
  dayB.fever = true; dayB.feverT = 20;
  const hot = serveForced(dayB, metaB, { typeId: 'student', recipeId: 'burger' }).result.amount;
  near(hot, base * 2, 2, 'during FEVER the same serve pays double');
  // fever ends on its timer and can be re-earned later (state machine returns to off)
  tick(dayB, metaB, 21);
  eq(dayB.fever, false, 'FEVER ends when its timer runs out');
}

// ---------------------------------------------------------------- dish of the day
section('dish of the day');
{
  eq(dishOfTheDay(1), RECIPES[0].id, 'day 1 special is the first recipe');
  const mk = (dotd) => {
    const meta = createMeta('normal');
    const day = createDay(meta, 5, { seed: 31 });
    day.dotd = dotd;
    return serveForced(day, meta, { typeId: 'student', recipeId: 'burger' }).result.amount;
  };
  const normal = mk('omelette');
  const special = mk('burger');
  const pricePart = RECIPE_BY_ID.burger.price * 1.25; // all-perfect layers
  near(special - normal, pricePart, 1.5, 'the special pays DOUBLE its price part');
}

// ---------------------------------------------------------------- drinks
section('drinks station');
{
  const meta = createMeta('normal');
  const day = createDay(meta, 3, { seed: 41 });
  const c = spawnCustomer(day, meta, { typeId: 'worker', recipeId: 'omelette', drink: 'coffee', variation: null });
  clickDrink(day, meta, 'coffee');
  const drinkItem = day.items.find((i) => i.ing === 'drink');
  ok(drinkItem && drinkItem.station === 'drinks', 'a drink brews on the drinks station');
  let g = 0;
  while (day.items.includes(drinkItem) && g++ < 10) clickItem(day, meta, drinkItem.id);
  eq(day.readyDrinks.length, 1, 'a finished drink waits ready');
  selectTarget(day, { type: 'seat', id: c.id });
  ok(buildCurrent(day, meta), 'dish builds alongside the drink');
  const withDrink = serve(day, meta).amount;
  eq(day.readyDrinks.length, 0, 'the drink is served with the dish');
  const meta2 = createMeta('normal');
  const day2 = createDay(meta2, 3, { seed: 41 });
  const plain = serveForced(day2, meta2, { typeId: 'worker', recipeId: 'omelette' }).result.amount;
  eq(withDrink - plain, DRINK_PRICE, 'a drink served with the dish adds its price');
  // a drink alone buys patience
  const day3 = createDay(meta2, 3, { seed: 42 });
  const c3 = spawnCustomer(day3, meta2, { typeId: 'worker', recipeId: 'burger', drink: null, variation: null });
  clickDrink(day3, meta2, 'juice');
  const d3 = day3.items.find((i) => i.ing === 'drink');
  let g3 = 0;
  while (day3.items.includes(d3) && g3++ < 10) clickItem(day3, meta2, d3.id);
  c3.patience = 30;
  const before = day3.earned;
  ok(serveDrinkAlone(day3, meta2, c3.id), 'a lone drink can be served to a waiting guest');
  near(c3.patience, 30 + c3.patienceMax * 0.2, 0.01, 'a lone drink restores 20% patience');
  eq(day3.earned - before, DRINK_PRICE, 'a lone drink pays its price');
}

// ---------------------------------------------------------------- mise en place
section('mise en place');
{
  const meta = createMeta('normal');
  eq(trayCapacity(meta), 3, 'tray holds 3 by default');
  const day = createDay(meta, 6, { seed: 51 });
  // pre-cook a mushroom with no order targeted: it lands in the tray
  clickIngredient(day, meta, 'mushroom');
  const mush = day.items.find((i) => i.ing === 'mushroom');
  let g = 0;
  while (day.items.includes(mush) && g++ < 30) clickItem(day, meta, mush.id);
  eq(day.tray.length, 1, 'a pre-cooked component waits in the tray');
  eq(day.tray[0].ing, 'mushroom', 'the tray shows what it holds');
  // an order needing mushroom consumes the tray component instantly
  const c = spawnCustomer(day, meta, { typeId: 'student', recipeId: 'ladle', drink: null, variation: null });
  selectTarget(day, { type: 'seat', id: c.id });
  ok(buildCurrent(day, meta), 'the ladle special builds');
  ok(eventsOf(day).includes('tray-use'), 'building consumed the tray component (tray-use event)');
  eq(day.tray.length, 0, 'the tray slot freed after use');
  ok(JSON.stringify(day.plate.layers.map((l) => l.ing)) === JSON.stringify(RECIPE_BY_ID.ladle.steps), 'the plated dish is exactly the recipe');
  // clickTray plates a held component when it is next needed
  const day2 = createDay(meta, 6, { seed: 52 });
  day2.tray.push({ ing: 'broth', quality: 1, qualityName: 'perfect' });
  const c2 = spawnCustomer(day2, meta, { typeId: 'student', recipeId: 'tomsoup', drink: null, variation: null });
  selectTarget(day2, { type: 'seat', id: c2.id });
  clickTray(day2, meta, 0);
  eq(day2.plate.layers.length, 1, 'clicking the tray plates its component');
  eq(day2.tray.length, 0, 'the tray empties');
  // tray upgrade
  const rich = createMeta('normal');
  rich.upgrades.trayxl = true;
  eq(trayCapacity(rich), 5, 'Extra Prep Tray upgrade holds 5');
}

// ---------------------------------------------------------------- phone orders
section('phone / takeaway orders');
{
  const meta = createMeta('normal');
  const day = createDay(meta, 5, { seed: 61 });
  spawnPhone(day, { recipeId: 'blt' });
  ok(day.phone && day.phone.timeLeft > 0, 'a phone order appears with its countdown');
  selectTarget(day, { type: 'phone' });
  ok(buildCurrent(day, meta), 'the phone dish builds');
  const res = serve(day, meta);
  eq(res.amount, PHONE_PAYOUT, 'a phone order pays its flat payout');
  eq(day.earned, PHONE_PAYOUT, 'the payout lands in the day earnings');
  eq(day.combo, 0, 'phone orders do not touch the combo');
  eq(meta.stats.phoneDone, 1, 'phone completion is counted');
  ok(day.phone === null, 'the phone panel clears after packing');
  // expiry costs nothing
  const day2 = createDay(meta, 5, { seed: 62 });
  spawnPhone(day2, { recipeId: 'blt' });
  for (let i = 0; i < 60 && day2.phone; i++) tick(day2, meta, 1);
  ok(day2.phone === null, 'an unanswered phone order expires');
  eq(day2.earned, 0, 'missing a phone order costs nothing');
  ok(day2.events.some((e) => e.type === 'phone-missed') || eventsOf(day2).includes('phone-missed'), 'expiry emits phone-missed');
}

// ---------------------------------------------------------------- the regular
section('named regular & loyalty');
{
  const meta = createMeta('normal');
  for (let visit = 1; visit <= 5; visit++) {
    const day = createDay(meta, visit * 2, { seed: 70 + visit });
    const { result } = serveForced(day, meta, { regular: true, recipeId: 'omelette' });
    ok(result, `Marco's visit ${visit} is served`);
    if (visit < 5) eq(meta.loyalty, visit, `loyalty hearts after visit ${visit}`);
    if (visit === 5) {
      eq(meta.loyalty, 5, 'the heart meter fills at five visits');
      ok(meta.loyaltyBonusPaid, 'a full meter pays the loyalty bonus');
      eq(day.earned - result.amount, LOYALTY_BONUS, 'the bonus lands on top of the fifth serve');
      ok(meta.achievements.loyal, 'the loyalty achievement unlocks');
    }
  }
}

// ---------------------------------------------------------------- helper staff
section('helper staff');
{
  const meta = createMeta('normal');
  meta.upgrades.helper = true;
  const day = createDay(meta, 5, { seed: 81 });
  clickIngredient(day, meta, 'patty');
  clickIngredient(day, meta, 'potato');
  const patty = day.items.find((i) => i.ing === 'patty');
  const potato = day.items.find((i) => i.ing === 'potato');
  patty.doneness = 10;
  potato.doneness = 40;
  tick(day, meta, 3.2);
  ok(day.events.some((e) => e.type === 'helper-boost'), 'the helper visibly boosts on his timer');
  near(patty.doneness, 10 + TRICKLE * 3.2 + CLICK_BOOST, 0.6, 'the helper boosts the SLOWEST item first');
  near(potato.doneness, 40 + TRICKLE * 3.2, 0.6, 'the faster item is left alone');
  const solo = createMeta('normal');
  const daySolo = createDay(solo, 5, { seed: 81 });
  clickIngredient(daySolo, solo, 'patty');
  const p2 = daySolo.items.find((i) => i.ing === 'patty');
  p2.doneness = 10;
  tick(daySolo, solo, 3.2);
  ok(!daySolo.events.some((e) => e.type === 'helper-boost'), 'no helper, no free boosts');
}

// ---------------------------------------------------------------- shop: upgrades + decor
section('night shop: upgrades and decor');
{
  const meta = createMeta('normal');
  meta.bank = 50;
  ok(!buyUpgrade(meta, 'knives'), 'cannot buy what you cannot afford');
  meta.bank = 500;
  ok(buyUpgrade(meta, 'knives'), 'buying an upgrade works');
  eq(meta.bank, 410, 'the price is deducted');
  ok(!buyUpgrade(meta, 'knives'), 'an upgrade is bought once');
  eq(stationSlots(meta, 'grill'), 2, 'grill slots base');
  buyUpgrade(meta, 'grillxl');
  eq(stationSlots(meta, 'grill'), 3, 'Grill XL adds a slot');
  // decor: bought once, permanent boosts, felt in patience
  const plain = createMeta('normal');
  const dayPlain = createDay(plain, 3, { seed: 91 });
  const cPlain = spawnCustomer(dayPlain, plain, { typeId: 'student', recipeId: 'burger', drink: null, variation: null });
  const deco = createMeta('normal');
  deco.bank = 500;
  ok(buyDecor(deco, 'plant'), 'buying decor works');
  ok(!buyDecor(deco, 'plant'), 'decor is bought once');
  ok(decorBonus(deco).patience > 0, 'the plant raises patience');
  const dayDeco = createDay(deco, 3, { seed: 91 });
  const cDeco = spawnCustomer(dayDeco, deco, { typeId: 'student', recipeId: 'burger', drink: null, variation: null });
  ok(cDeco.patienceMax > cPlain.patienceMax, 'decor patience shows up on real customers');
  buyDecor(deco, 'painting');
  ok(decorBonus(deco).tip > 0, 'the painting raises tips');
  ok(deco.achievements.decorator, 'two decorations unlock the Decorator achievement');
}

// ---------------------------------------------------------------- stars, ladder, replay
section('stars, stage unlock, replay');
{
  eq(starsFor(69, 70), 0, 'below goal: no stars');
  eq(starsFor(70, 70), 1, 'at goal: 1 star');
  eq(starsFor(87, 70), 1, 'below 125%: still 1 star');
  eq(starsFor(88, 70), 2, 'at ~125%: 2 stars');
  eq(starsFor(111, 70), 2, 'below 160%: still 2 stars');
  eq(starsFor(112, 70), 3, 'at 160%: 3 stars');
  const meta = createMeta('normal');
  const day = createDay(meta, 1, { seed: 101 });
  day.earned = 200; day.won = true;
  const res = finishDay(meta, day);
  eq(res.stars, 3, 'a big day 1 earns 3 stars');
  eq(meta.unlockedMax, 2, 'winning unlocks the next stage');
  eq(meta.bank, 200, 'earnings bank');
  const replay = createDay(meta, 1, { seed: 102 });
  replay.earned = 80; replay.won = true;
  finishDay(meta, replay);
  eq(meta.stars[1], 3, 'replaying keeps the best stars');
  eq(meta.bestEarned[1], 200, 'replaying keeps the best earnings');
  eq(meta.bank, 280, 'replay earnings still bank');
  const lost = createDay(meta, 2, { seed: 103 });
  lost.earned = 10; lost.won = false;
  finishDay(meta, lost);
  eq(meta.unlockedMax, 2, 'a lost day unlocks nothing');
  ok(!meta.stars[2], 'a lost day earns no stars');
}

// ---------------------------------------------------------------- difficulty
section('difficulty choice');
{
  const relaxed = createMeta('relaxed');
  const dayR = createDay(relaxed, 1, { seed: 111 });
  eq(dayR.goal, Math.round(DAY_GOALS[0] * 0.8), 'Relaxed lowers goals by the fixed multiplier');
  const cR = spawnCustomer(dayR, relaxed, { typeId: 'student', recipeId: 'burger', drink: null, variation: null });
  const normal = createMeta('normal');
  const dayN = createDay(normal, 1, { seed: 111 });
  const cN = spawnCustomer(dayN, normal, { typeId: 'student', recipeId: 'burger', drink: null, variation: null });
  ok(cR.patienceMax > cN.patienceMax, 'Relaxed lengthens patience by the fixed multiplier');
  near(cR.patienceMax, Math.round(95 * 1.4), 1, 'Relaxed patience is x1.4');
}

// ---------------------------------------------------------------- endless mode
section('endless mode');
{
  const meta = createMeta('normal');
  meta.campaignWon = true;
  const w1 = createDay(meta, 1, { endless: true, seed: 121 });
  eq(w1.goal, 260, 'wave 1 goal');
  const w3 = createDay(meta, 3, { endless: true, seed: 123 });
  eq(w3.goal, 260 + 140 * 2, 'wave goals escalate');
  w3.earned = w3.goal; w3.won = true;
  finishDay(meta, w3);
  eq(meta.endlessBest, 3, 'the best wave is recorded');
  ok(meta.achievements.endless3, 'reaching wave 3 unlocks its achievement');
  // a missed goal ends the run: nobody served, the day closes lost
  const run = createDay(meta, 1, { endless: true, seed: 124 });
  let guard = 0;
  while (!run.over && guard++ < 600) tick(run, meta, 1);
  ok(run.over && !run.won, 'an endless run ends when a wave goal is missed');
}

// ---------------------------------------------------------------- sound cue wiring
section('sound cues (wiring)');
{
  const audioSrc = readFileSync(new URL('../game/src/audio.js', import.meta.url), 'utf8');
  for (const cue of ['perfectZone', 'perfectServe', 'comboRise', 'comboBreak', 'feverStart']) {
    ok(audioSrc.includes(cue), `audio engine has the '${cue}' cue`);
  }
  const gameSrc = readFileSync(new URL('../game/src/game.js', import.meta.url), 'utf8');
  for (const cue of ['perfectZone', 'perfectServe', 'comboRise', 'comboBreak', 'feverStart']) {
    ok(gameSrc.includes(cue), `the controller plays '${cue}'`);
  }
  const renderSrc = readFileSync(new URL('../game/src/render.js', import.meta.url), 'utf8');
  ok(renderSrc.includes('sparkle arpeggio'), 'How to Play names the sound cues');
}

// ---------------------------------------------------------------- shot staging smoke
section('screenshot staging builds every scene');
for (const name of ALL_SCENES) {
  let view = null;
  let threw = false;
  try { view = stageShot(name); } catch { threw = true; }
  ok(!threw && view && view.screen, `scene '${name}' stages without error`);
}

// ---------------------------------------------------------------- FULL PLAYTHROUGH
section('full simulated playthrough — modest bot, Normal, all 12 days');
{
  const meta = createMeta('normal');
  const totals = { trayUse: 0, phoneDone: 0, feverStart: 0, serves: 0 };
  function playDay(dayNum) {
    const state = createDay(meta, dayNum, { seed: 1000 * dayNum + 7 });
    let prepped = false;
    let guard = 0;
    const collect = () => {
      for (const e of drainEvents(state)) {
        if (e.type === 'tray-use') totals.trayUse += 1;
        if (e.type === 'phone-done') totals.phoneDone += 1;
        if (e.type === 'fever-start') totals.feverStart += 1;
        if (e.type === 'serve') totals.serves += 1;
      }
    };
    while (!state.over && guard++ < 60000) {
      collect();
      const waiting = state.customers.filter((c) => c.state === 'waiting');
      if (!state.activeTarget) {
        if (state.phone) {
          selectTarget(state, { type: 'phone' });
        } else if (waiting.length) {
          if (!prepped) {
            // mise en place: pre-cook the first guest's first cooked step into the tray
            const steps = effectiveSteps(waiting[0].recipeId, waiting[0].variation);
            const cooked = steps.find((s) => INGREDIENTS[s].process !== 'none');
            if (cooked) {
              clickIngredient(state, meta, cooked);
              const it = state.items.find((i) => i.ing === cooked);
              if (it) { let g = 0; while (state.items.includes(it) && g++ < 30) clickItem(state, meta, it.id); }
            }
            prepped = true;
          }
          selectTarget(state, { type: 'seat', id: waiting[0].id });
        }
      }
      if (state.activeTarget) {
        const tgt = state.activeTarget.type === 'seat'
          ? state.customers.find((c) => c.id === state.activeTarget.id) : null;
        if (tgt && tgt.drink && !state.readyDrinks.some((d) => d.kind === tgt.drink)
          && !state.items.some((i) => i.ing === 'drink')) {
          clickDrink(state, meta, tgt.drink);
        }
        const drinkItem = state.items.find((i) => i.ing === 'drink');
        if (drinkItem) { let g = 0; while (state.items.includes(drinkItem) && g++ < 10) clickItem(state, meta, drinkItem.id); }
        if (plateComplete(state)) serve(state, meta);
        else buildCurrent(state, meta);
        const impatient = waiting
          .filter((c) => !tgt || c.id !== tgt.id)
          .sort((a, b) => a.patience - b.patience)[0];
        if (impatient && impatient.patience < impatient.patienceMax * 0.5 && state.readyDrinks.length) {
          serveDrinkAlone(state, meta, impatient.id);
        }
      }
      tick(state, meta, 0.25);
    }
    collect();
    return state;
  }
  for (let d = 1; d <= 12; d++) {
    const state = playDay(d);
    ok(state.over, `day ${d} ends`);
    ok(state.won, `day ${d} goal met ($${state.earned} >= $${state.goal})`);
    finishDay(meta, state);
  }
  ok(meta.campaignWon, 'the campaign is WON by the modest bot');
  eq(meta.unlockedMax, 12, 'all stages unlocked along the way');
  ok(totals.serves >= 100, `the bot served a full campaign (${totals.serves} serves)`);
  ok(totals.trayUse >= 1, 'the playthrough used mise en place (tray components consumed)');
  ok(totals.phoneDone >= 1, 'the playthrough completed phone orders');
  ok(totals.feverStart >= 1, 'the playthrough triggered FEVER');
  ok(meta.stats.drinks >= 1, 'the playthrough served drinks');
  ok(meta.loyalty >= 1, 'Marco the regular was served during the campaign');
}

console.log(`\n${pass} passed, ${fail} failed`);
if (failures.length) { console.log('failures:\n - ' + failures.join('\n - ')); process.exit(1); }
