// The Copper Ladle — tuning constants. Every number the rules depend on lives here so the
// logic tests and the game itself always agree.

export const VIEW_W = 1280;
export const VIEW_H = 800;

/** Doneness runs 0..130. The PERFECT zone is 45..105 — 60 of 130, about 46% of the span. */
export const DONENESS_MAX = 130;
export const PERFECT_MIN = 45;
export const PERFECT_MAX = 105;
/** Below this an item is still raw; below PERFECT_MIN it is merely cooking. */
export const COOKED_MIN = 20;
/** Passive doneness per second (active clicking is the main driver). */
export const TRICKLE = 5;
/** Doneness added by one click on a cooking item. */
export const CLICK_BOOST = 16;
/** Seconds at full doneness before quality steps down (perfect->good, then good->plain). */
export const OVERCOOK_STEP_1 = 40;
export const OVERCOOK_STEP_2 = 90;

/** Combo: a serve within this many seconds of the previous one keeps the chain alive. */
export const COMBO_WINDOW = 10;
export const COMBO_TIERS = [
  { at: 3, mult: 1.5 },
  { at: 5, mult: 2 },
  { at: 8, mult: 3 },
];
/** Combo level that triggers FEVER, and how long fever lasts. */
export const FEVER_AT = 8;
export const FEVER_SECONDS = 20;

/** Campaign shape. */
export const DAY_GOALS = [70, 110, 160, 220, 290, 370, 460, 540, 630, 730, 830, 960];
export const LOAN_TOTAL = DAY_GOALS.reduce((a, b) => a + b, 0);
export const STAR_2 = 1.25;
export const STAR_3 = 1.6;

/** Difficulty multipliers, chosen on the title screen. */
export const DIFFICULTY = {
  normal: { label: 'Normal', goalMult: 1, patienceMult: 1 },
  relaxed: { label: 'Relaxed', goalMult: 0.8, patienceMult: 1.4 },
};

/** Drinks are fast: they trickle and boost at double rate on the drinks machine. */
export const DRINK_BOOST = 26;
export const DRINK_TRICKLE = 12;
export const DRINK_PRICE = 4;
export const DRINK_PATIENCE_BOOST = 0.2;

/** Phone orders: flat payout and their own countdown. */
export const PHONE_COUNTDOWN = 45;
export const PHONE_PAYOUT = 26;

/** The named regular's loyalty: hearts to fill, bonus when full. */
export const LOYALTY_MAX = 5;
export const LOYALTY_BONUS = 150;

/** Helper staff: seconds between automatic boosts. */
export const HELPER_INTERVAL = 3;

/** Endless mode wave goal: base + step per wave. */
export const ENDLESS_BASE = 260;
export const ENDLESS_STEP = 140;

export function comboMult(combo) {
  let mult = 1;
  for (const tier of COMBO_TIERS) if (combo >= tier.at) mult = tier.mult;
  return mult;
}

export function dayLength(day) {
  return 130 + day * 5;
}

export function starsFor(earned, goal) {
  if (earned < goal) return 0;
  if (earned >= goal * STAR_3) return 3;
  if (earned >= goal * STAR_2) return 2;
  return 1;
}
