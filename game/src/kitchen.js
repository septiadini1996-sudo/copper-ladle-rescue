// The Copper Ladle — the pure rules core. No DOM, no canvas: the renderer draws this state,
// the controller feeds it clicks, and the logic tests drive it directly.

import {
  CLICK_BOOST, COMBO_WINDOW, COOKED_MIN, DAY_GOALS, DIFFICULTY, DONENESS_MAX, DRINK_BOOST,
  DRINK_PATIENCE_BOOST, DRINK_PRICE, DRINK_TRICKLE, ENDLESS_BASE, ENDLESS_STEP, FEVER_AT,
  FEVER_SECONDS, HELPER_INTERVAL, LOAN_TOTAL, LOYALTY_BONUS, LOYALTY_MAX, OVERCOOK_STEP_1,
  OVERCOOK_STEP_2, PERFECT_MAX, PERFECT_MIN, PHONE_COUNTDOWN, PHONE_PAYOUT, TRICKLE,
  comboMult, dayLength, starsFor,
} from './config.js';
import {
  CUSTOMER_TYPES, DECOR, DRINK_IDS, INGREDIENTS, PHONE_RECIPES, PROCESS_STATION, RECIPES,
  RECIPE_BY_ID, REGULAR, STATIONS, UPGRADES,
} from './data.js';
import { createRandom, pick } from './random.js';

let nextId = 1;
function uid() { return nextId++; }

/** The effective step list of an order: the recipe with its variation applied. */
export function effectiveSteps(recipeId, variation) {
  const steps = [...RECIPE_BY_ID[recipeId].steps];
  if (!variation) return steps;
  if (variation.kind === 'no') {
    const i = steps.indexOf(variation.ing);
    if (i >= 0) steps.splice(i, 1);
  } else if (variation.kind === 'extra') {
    const i = steps.indexOf(variation.ing);
    if (i >= 0) steps.splice(i + 1, 0, variation.ing);
  }
  return steps;
}

/**
 * DISH–INGREDIENT SYNC: the ordered painters a finished dish is drawn from. This is the one
 * source the plating renderer and the tests both read — a dish is exactly its recipe's steps,
 * in order, with the variation applied. Nothing more, nothing less.
 */
export function dishLayersFor(recipeId, variation) {
  return effectiveSteps(recipeId, variation);
}

export function createMeta(difficulty = 'normal') {
  return {
    difficulty,
    bank: 0,
    totalEarned: 0,
    stars: {},
    bestEarned: {},
    unlockedMax: 1,
    campaignWon: false,
    upgrades: {},
    decor: {},
    achievements: {},
    loyalty: 0,
    loyaltyBonusPaid: false,
    endlessBest: 0,
    tutorialDone: false,
    stats: { serves: 0, perfects: 0, maxCombo: 0, fevers: 0, phoneDone: 0, drinks: 0 },
  };
}

export function decorBonus(meta) {
  let patience = 0;
  let tip = 0;
  for (const d of DECOR) {
    if (meta.decor[d.id]) { patience += d.patience; tip += d.tip; }
  }
  return { patience, tip };
}

export function trayCapacity(meta) {
  return 3 + (meta.upgrades.trayxl ? 2 : 0);
}

export function stationSlots(meta, station) {
  let slots = STATIONS[station].slots;
  if (station === 'grill' && meta.upgrades.grillxl) slots += 1;
  if (station === 'fryer' && meta.upgrades.fryerxl) slots += 1;
  return slots;
}

export function perfectMax(meta) {
  return PERFECT_MAX + (meta.upgrades.widegold ? 15 : 0);
}

export function dishOfTheDay(day) {
  return RECIPES[(day - 1) % RECIPES.length].id;
}

export function createDay(meta, day, opts = {}) {
  const endless = Boolean(opts.endless);
  const diff = DIFFICULTY[meta.difficulty] || DIFFICULTY.normal;
  const goal = endless
    ? Math.round((ENDLESS_BASE + ENDLESS_STEP * (day - 1)) * diff.goalMult)
    : Math.round(DAY_GOALS[day - 1] * diff.goalMult);
  const rng = createRandom(opts.seed ?? (day * 7919 + (endless ? 131071 : 0) + 17));
  return {
    kind: endless ? 'endless' : 'campaign',
    day,
    goal,
    dotd: dishOfTheDay(endless ? ((day - 1) % 12) + 1 : day),
    length: dayLength(Math.min(day, 12)),
    t: 0,
    earned: 0,
    served: 0,
    perfectDishes: 0,
    walkouts: 0,
    customers: [],
    items: [],
    readyDrinks: [],
    plate: null,
    activeTarget: null,
    tray: [],
    phone: null,
    phoneT: 18,
    combo: 0,
    comboT: 0,
    fever: false,
    feverT: 0,
    spawnT: 1.2,
    regularSpawned: false,
    helperT: HELPER_INTERVAL,
    over: false,
    won: false,
    events: [],
    rng,
    diff,
  };
}

function emit(state, type, data = {}) {
  state.events.push({ type, ...data });
}

export function drainEvents(state) {
  const out = state.events;
  state.events = [];
  return out;
}

function freeSeats(state) {
  return 4 - state.customers.filter((c) => c.state === 'waiting').length;
}

export function spawnCustomer(state, meta, force = {}) {
  if (freeSeats(state) <= 0) return null;
  const isRegular = Boolean(force.regular);
  const typeId = force.typeId || (isRegular ? 'marco' : pick(state.rng, ['student', 'worker', 'auntie', 'tourist', 'foodie', 'critic']));
  const type = isRegular ? REGULAR.type : CUSTOMER_TYPES[typeId];
  const poolSize = Math.min(RECIPES.length, 8 + state.day * 2);
  const recipeId = force.recipeId || pick(state.rng, RECIPES.slice(0, state.kind === 'endless' ? RECIPES.length : poolSize)).id;
  const recipe = RECIPE_BY_ID[recipeId];
  let variation = force.variation ?? null;
  if (variation === null && !force.recipeId && state.day >= 2 && state.rng() < 0.3) {
    const ing = pick(state.rng, recipe.steps.slice(1));
    variation = { kind: state.rng() < 0.5 ? 'no' : 'extra', ing };
  }
  const drink = force.drink !== undefined ? force.drink : (state.day >= 2 && state.rng() < 0.35 ? pick(state.rng, DRINK_IDS) : null);
  const decor = decorBonus(meta);
  const patienceMax = Math.round(
    type.patience * state.diff.patienceMult * (meta.upgrades.stools ? 1.25 : 1) * (1 + decor.patience),
  );
  const customer = {
    id: uid(),
    typeId,
    type,
    isRegular,
    recipeId,
    variation,
    drink,
    patience: patienceMax,
    patienceMax,
    state: 'waiting',
    bubble: pick(state.rng, type.arrive),
    bubbleKind: 'arrive',
    servedAt: 0,
  };
  state.customers.push(customer);
  emit(state, 'arrive', { customer });
  return customer;
}

export function spawnPhone(state, force = {}) {
  const recipeId = force.recipeId || pick(state.rng, PHONE_RECIPES);
  state.phone = { recipeId, timeLeft: PHONE_COUNTDOWN };
  emit(state, 'phone-ring', { recipeId });
  return state.phone;
}

function orderOf(state, target) {
  if (!target) return null;
  if (target.type === 'phone') {
    return state.phone ? { recipeId: state.phone.recipeId, variation: null, phone: true } : null;
  }
  const c = state.customers.find((x) => x.id === target.id && x.state === 'waiting');
  return c ? { recipeId: c.recipeId, variation: c.variation, customer: c } : null;
}

export function selectTarget(state, target) {
  if (state.plate && state.plate.layers.length > 0) {
    const same = state.activeTarget && target && state.activeTarget.type === target.type && state.activeTarget.id === target.id;
    if (!same) return false; // finish or trash the current plate first
  }
  state.activeTarget = target;
  if (!state.plate) state.plate = { layers: [] };
  return true;
}

export function nextNeeded(state) {
  const order = orderOf(state, state.activeTarget);
  if (!order || !state.plate) return null;
  const steps = effectiveSteps(order.recipeId, order.variation);
  return state.plate.layers.length < steps.length ? steps[state.plate.layers.length] : null;
}

export function plateComplete(state) {
  const order = orderOf(state, state.activeTarget);
  if (!order || !state.plate) return false;
  return state.plate.layers.length >= effectiveSteps(order.recipeId, order.variation).length;
}

function qualityOf(item, meta) {
  let value;
  let name;
  if (item.doneness < COOKED_MIN) { value = 0.3; name = 'raw'; }
  else if (item.doneness < PERFECT_MIN) { value = 0.55; name = 'cooking'; }
  else if (item.doneness <= perfectMax(meta)) { value = 1; name = 'perfect'; }
  else { value = 0.85; name = 'done'; }
  if (item.overT > OVERCOOK_STEP_2) { value = Math.min(value, 0.6); name = value === 0.6 ? 'plain' : name; }
  else if (item.overT > OVERCOOK_STEP_1) { value = Math.min(value, 0.85); if (name === 'perfect') name = 'good'; }
  return { value, name };
}

function startCook(state, meta, ing) {
  const process = INGREDIENTS[ing].process;
  const station = PROCESS_STATION[process];
  const used = state.items.filter((i) => i.station === station).length;
  if (used >= stationSlots(meta, station)) { emit(state, 'reject', { why: 'station-full' }); return null; }
  const item = { id: uid(), ing, station, doneness: 0, overT: 0, inPerfect: false };
  state.items.push(item);
  emit(state, 'cook-start', { item });
  return item;
}

function plateLayer(state, ing, quality) {
  state.plate.layers.push({ ing, quality: quality.value, qualityName: quality.name });
  emit(state, 'plate', { ing, quality });
}

/** Click a pantry ingredient: use the tray if it holds what's needed, else start cooking. */
export function clickIngredient(state, meta, ing) {
  if (state.over) return;
  if (!state.plate) state.plate = { layers: [] };
  const needed = nextNeeded(state);
  if (needed === ing) {
    const trayIdx = state.tray.findIndex((t) => t.ing === ing);
    if (trayIdx >= 0) {
      const [t] = state.tray.splice(trayIdx, 1);
      plateLayer(state, ing, { value: t.quality, name: t.qualityName });
      emit(state, 'tray-use', { ing });
      return;
    }
  }
  const process = INGREDIENTS[ing].process;
  if (process === 'none') {
    if (needed === ing) plateLayer(state, ing, { value: 1, name: 'perfect' });
    else emit(state, 'reject', { why: 'not-needed' });
    return;
  }
  startCook(state, meta, ing);
}

/** Click a drink button on the drinks machine. */
export function clickDrink(state, meta, kind) {
  if (state.over) return;
  const used = state.items.filter((i) => i.station === 'drinks').length;
  if (used >= stationSlots(meta, 'drinks')) { emit(state, 'reject', { why: 'station-full' }); return; }
  const item = { id: uid(), ing: 'drink', drinkKind: kind, station: 'drinks', doneness: 0, overT: 0, inPerfect: false };
  state.items.push(item);
  emit(state, 'cook-start', { item });
}

/** Click a cooking item: boost it while it cooks; take it once it reaches the PERFECT zone. */
export function clickItem(state, meta, itemId) {
  if (state.over) return;
  const item = state.items.find((i) => i.id === itemId);
  if (!item) return;
  if (item.doneness < PERFECT_MIN) {
    let boost = item.ing === 'drink' ? DRINK_BOOST : CLICK_BOOST;
    if (item.ing !== 'drink' && INGREDIENTS[item.ing].process === 'chop' && meta.upgrades.knives) boost *= 1.5;
    if (state.fever) boost *= 2;
    item.doneness = Math.min(DONENESS_MAX, item.doneness + boost);
    emit(state, 'boost', { item });
    checkPerfectZone(state, meta, item);
    return;
  }
  // Take the item.
  state.items = state.items.filter((i) => i.id !== itemId);
  if (item.ing === 'drink') {
    state.readyDrinks.push({ kind: item.drinkKind });
    emit(state, 'drink-ready', { kind: item.drinkKind });
    return;
  }
  const quality = qualityOf(item, meta);
  if (!state.plate) state.plate = { layers: [] };
  if (nextNeeded(state) === item.ing) {
    plateLayer(state, item.ing, quality);
  } else if (state.tray.length < trayCapacity(meta)) {
    state.tray.push({ ing: item.ing, quality: quality.value, qualityName: quality.name });
    emit(state, 'tray-add', { ing: item.ing });
  } else {
    emit(state, 'reject', { why: 'tray-full' });
    state.items.push(item); // nowhere to put it: it stays on the station
  }
}

/** Click a tray slot: plate its component if the active order needs it next. */
export function clickTray(state, meta, index) {
  if (state.over) return;
  const t = state.tray[index];
  if (!t) return;
  if (nextNeeded(state) === t.ing) {
    state.tray.splice(index, 1);
    plateLayer(state, t.ing, { value: t.quality, name: t.qualityName });
    emit(state, 'tray-use', { ing: t.ing });
  } else {
    emit(state, 'reject', { why: 'not-needed' });
  }
}

/** Serve a ready drink on its own to a waiting customer: small pay, real patience. */
export function serveDrinkAlone(state, meta, customerId) {
  const idx = state.readyDrinks.length - 1;
  if (idx < 0) return false;
  const c = state.customers.find((x) => x.id === customerId && x.state === 'waiting');
  if (!c) return false;
  state.readyDrinks.splice(idx, 1);
  c.patience = Math.min(c.patienceMax, c.patience + c.patienceMax * DRINK_PATIENCE_BOOST);
  state.earned += DRINK_PRICE;
  meta.stats.drinks += 1;
  emit(state, 'drink-serve', { customer: c, amount: DRINK_PRICE });
  return true;
}

export function trashPlate(state) {
  if (state.plate) state.plate.layers = [];
  emit(state, 'trash', {});
}

function payoutFor(state, meta, order, layers) {
  const recipe = RECIPE_BY_ID[order.recipeId];
  const avgQ = layers.reduce((a, l) => a + l.quality, 0) / layers.length;
  const perfectDish = layers.every((l) => l.qualityName === 'perfect');
  let pricePart = recipe.price * (0.6 + 0.65 * avgQ);
  if (order.recipeId === state.dotd) pricePart *= 2;
  let tip = 0;
  if (order.customer) {
    const c = order.customer;
    const patienceFrac = Math.max(0, c.patience / c.patienceMax);
    tip = recipe.price * c.type.tip * patienceFrac;
    if (c.typeId === 'critic' && !perfectDish) tip = 0;
    if (c.typeId === 'foodie' && perfectDish) tip *= 1.5;
    if (meta.upgrades.tipjar) tip *= 1.2;
    tip *= 1 + decorBonus(meta).tip;
  }
  const mult = comboMult(state.combo) * (state.fever ? 2 : 1);
  return { total: Math.round((pricePart + tip) * mult), perfectDish, mult };
}

/** Serve the active plate to its target (a seated customer or the phone panel). */
export function serve(state, meta) {
  if (state.over || !plateComplete(state)) return null;
  const target = state.activeTarget;
  const order = orderOf(state, target);
  if (!order) return null;
  const layers = state.plate.layers;

  if (order.phone) {
    const pay = PHONE_PAYOUT * (state.fever ? 2 : 1);
    state.earned += pay;
    state.phone = null;
    state.phoneT = 30;
    state.plate = { layers: [] };
    state.activeTarget = null;
    meta.stats.phoneDone += 1;
    emit(state, 'phone-done', { amount: pay });
    return { amount: pay, perfectDish: false };
  }

  const c = order.customer;
  // Combo first: the multiplier for this serve uses the chain it extends.
  const chained = state.comboT > 0;
  const perfectDish = layers.every((l) => l.qualityName === 'perfect');
  state.combo = chained ? state.combo + (perfectDish ? 2 : 1) : (perfectDish ? 2 : 1);
  state.comboT = COMBO_WINDOW;
  meta.stats.maxCombo = Math.max(meta.stats.maxCombo, state.combo);
  if (state.combo >= 9) meta.achievements.combo9 = true;
  const { total, mult } = payoutFor(state, meta, order, layers);

  let drinkBonus = 0;
  if (c.drink) {
    const di = state.readyDrinks.findIndex((d) => d.kind === c.drink);
    if (di >= 0) {
      state.readyDrinks.splice(di, 1);
      drinkBonus = DRINK_PRICE;
      meta.stats.drinks += 1;
    }
  }
  const amount = total + drinkBonus;
  state.earned += amount;
  state.served += 1;
  meta.stats.serves += 1;
  if (perfectDish) { state.perfectDishes += 1; meta.stats.perfects += 1; }
  c.state = 'leaving';
  c.servedRecipeId = order.recipeId;
  c.bubble = pick(state.rng, c.type.happy);
  c.bubbleKind = 'happy';
  c.servedAt = state.t;

  if (c.isRegular) {
    if (meta.loyalty < LOYALTY_MAX) {
      meta.loyalty += 1;
      emit(state, 'loyalty', { hearts: meta.loyalty });
      if (meta.loyalty >= LOYALTY_MAX && !meta.loyaltyBonusPaid) {
        meta.loyaltyBonusPaid = true;
        state.earned += LOYALTY_BONUS;
        meta.achievements.loyal = true;
        emit(state, 'loyalty-bonus', { amount: LOYALTY_BONUS });
      }
    }
  }

  if (!state.fever && state.combo >= FEVER_AT) {
    state.fever = true;
    state.feverT = FEVER_SECONDS;
    meta.stats.fevers += 1;
    meta.achievements.fever = true;
    emit(state, 'fever-start', {});
  }

  emit(state, 'serve', { customer: c, amount, mult, perfectDish });
  state.plate = { layers: [] };
  state.activeTarget = null;
  return { amount, perfectDish };
}

function checkPerfectZone(state, meta, item) {
  const inZone = item.doneness >= PERFECT_MIN && item.doneness <= perfectMax(meta);
  if (inZone && !item.inPerfect) emit(state, 'perfect-zone', { item });
  item.inPerfect = inZone;
}

export function tick(state, meta, dt) {
  if (state.over) return;
  state.t += dt;

  // Cooking.
  for (const item of state.items) {
    const trickle = item.ing === 'drink' ? DRINK_TRICKLE : TRICKLE;
    if (item.doneness < DONENESS_MAX) {
      item.doneness = Math.min(DONENESS_MAX, item.doneness + trickle * dt);
      checkPerfectZone(state, meta, item);
    } else {
      item.overT += dt;
    }
  }

  // Helper staff: boost the least-cooked item on a timer.
  if (meta.upgrades.helper) {
    state.helperT -= dt;
    if (state.helperT <= 0) {
      state.helperT = HELPER_INTERVAL;
      const candidates = state.items.filter((i) => i.doneness < PERFECT_MIN);
      if (candidates.length) {
        const target = candidates.reduce((a, b) => (a.doneness <= b.doneness ? a : b));
        target.doneness = Math.min(DONENESS_MAX, target.doneness + CLICK_BOOST);
        checkPerfectZone(state, meta, target);
        emit(state, 'helper-boost', { item: target });
      }
    }
  }

  // Spawning.
  const timeLeft = state.length - state.t;
  if (timeLeft > 12) {
    state.spawnT -= dt;
    if (state.spawnT <= 0) {
      state.spawnT = Math.max(4.5, 11 - state.day * 0.5) * (0.8 + state.rng() * 0.5);
      const regularDue = !state.regularSpawned
        && ((state.kind === 'campaign' && REGULAR.days.includes(state.day)) || state.kind === 'endless');
      if (regularDue && freeSeats(state) > 0) {
        spawnCustomer(state, meta, { regular: true });
        state.regularSpawned = true;
      } else {
        spawnCustomer(state, meta);
      }
    }
    state.phoneT -= dt;
    if (state.phoneT <= 0 && !state.phone) {
      spawnPhone(state);
      state.phoneT = 40 + state.rng() * 20;
    }
  }

  // Phone countdown.
  if (state.phone) {
    state.phone.timeLeft -= dt;
    if (state.phone.timeLeft <= 0) {
      state.phone = null;
      state.phoneT = 25;
      if (state.activeTarget?.type === 'phone') { state.activeTarget = null; state.plate = { layers: [] }; }
      emit(state, 'phone-missed', {});
    }
  }

  // Patience.
  for (const c of state.customers) {
    if (c.state !== 'waiting') continue;
    c.patience -= dt;
    if (c.patience <= 0) {
      c.state = 'gone';
      state.walkouts += 1;
      if (state.combo > 0) { state.combo = 0; state.comboT = 0; emit(state, 'combo-break', { why: 'walkout' }); }
      if (state.activeTarget?.type === 'seat' && state.activeTarget.id === c.id) {
        state.activeTarget = null;
        state.plate = { layers: [] };
      }
      emit(state, 'walkout', { customer: c });
    } else if (c.patience < c.patienceMax * 0.35 && c.bubbleKind === 'arrive') {
      c.bubble = pick(state.rng, c.type.waiting);
      c.bubbleKind = 'waiting';
    }
  }
  state.customers = state.customers.filter((c) => c.state === 'waiting' || (c.state === 'leaving' && state.t - c.servedAt < 1.2));

  // Combo timer.
  if (state.comboT > 0) {
    state.comboT -= dt;
    if (state.comboT <= 0 && state.combo > 0) {
      state.combo = 0;
      emit(state, 'combo-break', { why: 'timeout' });
    }
  }

  // Fever timer.
  if (state.fever) {
    state.feverT -= dt;
    if (state.feverT <= 0) { state.fever = false; emit(state, 'fever-end', {}); }
  }

  // Day end.
  if (state.t >= state.length && state.customers.every((c) => c.state !== 'waiting')) {
    state.over = true;
    state.won = state.earned >= state.goal;
    emit(state, 'day-over', { won: state.won });
  }
}

/** Apply a finished day to the campaign meta: stars, bank, unlocks, achievements. */
export function finishDay(meta, state) {
  meta.bank += state.earned;
  meta.totalEarned += state.earned;
  if (meta.stats.perfects >= 10) meta.achievements.perfect10 = true;
  if (meta.stats.serves >= 1) meta.achievements.first = true;
  if (Object.keys(meta.decor).length >= 2) meta.achievements.decorator = true;
  if (state.kind === 'endless') {
    if (state.won) {
      meta.endlessBest = Math.max(meta.endlessBest, state.day);
      if (state.day >= 3) meta.achievements.endless3 = true;
    }
    return { stars: 0 };
  }
  const stars = starsFor(state.earned, state.goal);
  if (state.won) {
    meta.stars[state.day] = Math.max(meta.stars[state.day] || 0, stars);
    meta.bestEarned[state.day] = Math.max(meta.bestEarned[state.day] || 0, state.earned);
    meta.unlockedMax = Math.max(meta.unlockedMax, Math.min(12, state.day + 1));
    if (stars >= 3) meta.achievements.threestar = true;
    if (state.day === 12) { meta.campaignWon = true; meta.achievements.champion = true; }
  }
  return { stars };
}

export function buyUpgrade(meta, id) {
  const up = UPGRADES.find((u) => u.id === id);
  if (!up || meta.upgrades[id] || meta.bank < up.price) return false;
  meta.bank -= up.price;
  meta.upgrades[id] = true;
  return true;
}

export function buyDecor(meta, id) {
  const d = DECOR.find((x) => x.id === id);
  if (!d || meta.decor[id] || meta.bank < d.price) return false;
  meta.bank -= d.price;
  meta.decor[id] = true;
  if (Object.keys(meta.decor).length >= 2) meta.achievements.decorator = true;
  return true;
}

export { LOAN_TOTAL };
