// The Copper Ladle — content data: ingredients, recipes, customers, shop, story.
// Pure data only; every painter and rule lives elsewhere.

/** Processes and the station each one cooks on. `none` goes straight to the plate. */
export const PROCESS_STATION = {
  chop: 'prep',
  grill: 'grill',
  fry: 'fryer',
  boil: 'stove',
  bake: 'oven',
  none: null,
};

export const STATIONS = {
  prep: { name: 'Prep Board', slots: 3 },
  grill: { name: 'Grill', slots: 2 },
  fryer: { name: 'Fryer', slots: 2 },
  stove: { name: 'Stove', slots: 2 },
  oven: { name: 'Brick Oven', slots: 1 },
  drinks: { name: 'Drinks Machine', slots: 2 },
};

/** 29 pantry ingredients. `color`/`dark`/`light` drive the polished painters. */
export const INGREDIENTS = {
  bun: { name: 'Bun', process: 'none', color: '#e8b96f', dark: '#b97f35', light: '#f7dc9f' },
  patty: { name: 'Patty', process: 'grill', color: '#8a5a33', dark: '#5d3a1e', light: '#b07f4e' },
  cheese: { name: 'Cheese', process: 'none', color: '#f6c945', dark: '#d99a17', light: '#ffe083' },
  lettuce: { name: 'Lettuce', process: 'none', color: '#7ec850', dark: '#4d9427', light: '#b2e88a' },
  tomato: { name: 'Tomato', process: 'chop', color: '#e8452c', dark: '#b02a18', light: '#ff7a5c' },
  onion: { name: 'Onion', process: 'chop', color: '#cdb4dd', dark: '#9a7ab5', light: '#eee0f7' },
  bacon: { name: 'Bacon', process: 'fry', color: '#c65b4e', dark: '#93382e', light: '#eda294' },
  egg: { name: 'Egg', process: 'fry', color: '#fdf6e3', dark: '#e8c95a', light: '#ffffff' },
  chicken: { name: 'Chicken', process: 'grill', color: '#e0a05c', dark: '#b0763a', light: '#f4c384' },
  fish: { name: 'Fish', process: 'fry', color: '#7fb3d9', dark: '#4a7ea6', light: '#b3d7f2' },
  shrimp: { name: 'Shrimp', process: 'fry', color: '#f09468', dark: '#c25e35', light: '#ffc09e' },
  noodles: { name: 'Noodles', process: 'boil', color: '#f2d06b', dark: '#cfa62e', light: '#fce89a' },
  rice: { name: 'Rice', process: 'boil', color: '#f5efe0', dark: '#cfc3a5', light: '#ffffff' },
  pasta: { name: 'Pasta', process: 'boil', color: '#eec25e', dark: '#c29434', light: '#fbe08a' },
  broth: { name: 'Broth', process: 'boil', color: '#c97e2c', dark: '#96560f', light: '#eda845' },
  mushroom: { name: 'Mushroom', process: 'chop', color: '#c8a165', dark: '#96703d', light: '#ecd3a4' },
  carrot: { name: 'Carrot', process: 'chop', color: '#ef7d1a', dark: '#bc5707', light: '#ffa94d' },
  potato: { name: 'Potato', process: 'fry', color: '#e5c07b', dark: '#bd9243', light: '#f7e2ac' },
  dough: { name: 'Dough', process: 'bake', color: '#efd9ae', dark: '#c4a061', light: '#fbeed3' },
  bread: { name: 'Bread', process: 'none', color: '#d99a4e', dark: '#a96f2c', light: '#f2c078' },
  sausage: { name: 'Sausage', process: 'grill', color: '#b0512f', dark: '#7e3519', light: '#d97e57' },
  steak: { name: 'Steak', process: 'grill', color: '#a03d2d', dark: '#702618', light: '#cc6a52' },
  avocado: { name: 'Avocado', process: 'chop', color: '#5da244', dark: '#3a6e28', light: '#cfe08a' },
  pepper: { name: 'Pepper', process: 'chop', color: '#3f9e4d', dark: '#277034', light: '#74cc84' },
  greens: { name: 'Greens', process: 'none', color: '#4caf50', dark: '#2e7d32', light: '#8fd694' },
  berries: { name: 'Berries', process: 'none', color: '#6c4fb0', dark: '#472f7d', light: '#9d82d9' },
  cream: { name: 'Cream', process: 'none', color: '#fdfaf2', dark: '#ddd3ba', light: '#ffffff' },
  honey: { name: 'Honey', process: 'none', color: '#f0a81c', dark: '#bd7d08', light: '#ffc94d' },
  chocolate: { name: 'Chocolate', process: 'none', color: '#5d3a24', dark: '#3a2113', light: '#8a5f3d' },
};
export const INGREDIENT_IDS = Object.keys(INGREDIENTS);

/** A recipe is an ordered list of ingredient ids; a component's process is its ingredient's. */
export const RECIPES = [
  { id: 'burger', name: 'Classic Burger', price: 14, steps: ['bun', 'patty', 'cheese', 'lettuce', 'tomato'] },
  { id: 'double', name: 'Double Stack', price: 19, steps: ['bun', 'patty', 'patty', 'cheese', 'bacon'] },
  { id: 'garden', name: 'Garden Burger', price: 13, steps: ['bun', 'lettuce', 'tomato', 'avocado', 'onion'] },
  { id: 'breakfast', name: 'Breakfast Plate', price: 13, steps: ['egg', 'bacon', 'bread', 'tomato'] },
  { id: 'chickplate', name: 'Chicken Grill Plate', price: 16, steps: ['chicken', 'rice', 'greens'] },
  { id: 'fishchips', name: 'Fish & Chips', price: 14, steps: ['fish', 'potato'] },
  { id: 'shrimpnood', name: 'Shrimp Noodles', price: 16, steps: ['noodles', 'shrimp', 'pepper', 'greens'] },
  { id: 'ladle', name: "Rosa's Ladle Special", price: 18, steps: ['broth', 'noodles', 'chicken', 'mushroom'] },
  { id: 'mushsoup', name: 'Mushroom Soup', price: 12, steps: ['broth', 'mushroom', 'cream', 'onion'] },
  { id: 'tomsoup', name: 'Tomato Soup', price: 11, steps: ['broth', 'tomato', 'cream'] },
  { id: 'steakdin', name: 'Steak Dinner', price: 21, steps: ['steak', 'potato', 'mushroom'] },
  { id: 'skillet', name: 'Sausage Skillet', price: 15, steps: ['sausage', 'egg', 'potato', 'pepper'] },
  { id: 'avotoast', name: 'Avocado Toast', price: 12, steps: ['bread', 'avocado', 'egg'] },
  { id: 'pancakes', name: 'Berry Pancakes', price: 13, steps: ['dough', 'berries', 'cream', 'honey'] },
  { id: 'honeychick', name: 'Honey Chicken', price: 17, steps: ['chicken', 'honey', 'rice'] },
  { id: 'fondant', name: 'Chocolate Fondant', price: 12, steps: ['dough', 'chocolate', 'cream'] },
  { id: 'alfredo', name: 'Pasta Alfredo', price: 15, steps: ['pasta', 'cream', 'cheese', 'mushroom'] },
  { id: 'seapasta', name: 'Seafood Pasta', price: 18, steps: ['pasta', 'shrimp', 'tomato', 'greens'] },
  { id: 'stirfry', name: 'Veggie Stir Fry', price: 13, steps: ['rice', 'carrot', 'pepper', 'mushroom', 'onion'] },
  { id: 'fishrice', name: 'Grilled Fish Rice', price: 16, steps: ['fish', 'rice', 'greens', 'carrot'] },
  { id: 'blt', name: 'BLT Sandwich', price: 12, steps: ['bread', 'bacon', 'lettuce', 'tomato'] },
  { id: 'eggrice', name: 'Egg Fried Rice', price: 12, steps: ['rice', 'egg', 'carrot', 'greens'] },
  { id: 'omelette', name: 'Cheese Omelette', price: 11, steps: ['egg', 'cheese', 'tomato'] },
  { id: 'pepsteak', name: 'Pepper Steak', price: 20, steps: ['steak', 'pepper', 'onion', 'rice'] },
  { id: 'shrimprice', name: 'Shrimp Fried Rice', price: 16, steps: ['rice', 'shrimp', 'egg', 'pepper'] },
  { id: 'feast', name: 'Grand Rosa Feast', price: 24, steps: ['steak', 'chicken', 'potato', 'mushroom', 'greens'] },
];
export const RECIPE_BY_ID = Object.fromEntries(RECIPES.map((r) => [r.id, r]));

/** Recipes cheap and quick enough for phone orders. */
export const PHONE_RECIPES = ['tomsoup', 'omelette', 'blt', 'eggrice', 'fishchips', 'avotoast'];

export const DRINKS = {
  coffee: { name: 'Coffee', color: '#6f4a2a' },
  juice: { name: 'Juice', color: '#f59d23' },
  soda: { name: 'Soda', color: '#d94f3d' },
};
export const DRINK_IDS = Object.keys(DRINKS);

/** Six customer types. patience in seconds, tip as a fraction of price. */
export const CUSTOMER_TYPES = {
  student: {
    name: 'Student', patience: 95, tip: 0.08, skin: '#f2c184', hair: '#3a2a1a', shirt: '#4a7fb5',
    arrive: ['Cheap and cheerful, please!', 'One of the usual!'],
    waiting: ['No rush... much.', 'My lecture can wait.'],
    happy: ['Worth every coin!', 'Yum!'],
    angry: ['Too slow!'],
  },
  worker: {
    name: 'Office Worker', patience: 75, tip: 0.15, skin: '#e8b088', hair: '#22201e', shirt: '#5b6770',
    arrive: ['Lunch break — quick one!', 'Something warm, please.'],
    waiting: ['Meeting in twenty...', 'Tick tock.'],
    happy: ['Efficient. Thank you!', 'Perfect timing!'],
    angry: ['I have to go.'],
  },
  auntie: {
    name: 'Auntie May', patience: 120, tip: 0.18, skin: '#f6cd9a', hair: '#d9d9d9', shirt: '#8e5aa8',
    arrive: ['No rush, dear.', 'The famous diner!'],
    waiting: ['Take your time, chef.', 'Smells lovely in here.'],
    happy: ['Just like home, dear.', 'Bless you!'],
    angry: ['Oh dear...'],
  },
  tourist: {
    name: 'Tourist', patience: 80, tip: 0.25, skin: '#d99e63', hair: '#151312', shirt: '#d96b43',
    arrive: ['I heard this place is famous!', 'One local special!'],
    waiting: ['The guidebook said fast...', 'Still waiting...'],
    happy: ['Five stars online!', 'Worth the trip!'],
    angry: ['One star!'],
  },
  foodie: {
    name: 'Foodie', patience: 85, tip: 0.3, skin: '#eec39b', hair: '#6b4423', shirt: '#3f7d5d',
    arrive: ['Impress me, chef.', 'I blog everything I eat.'],
    waiting: ['Quality takes time...', 'Hmm.'],
    happy: ['A masterpiece!', 'Blogging this!'],
    angry: ['Mediocre at best.'],
  },
  critic: {
    name: 'The Critic', patience: 65, tip: 0.5, skin: '#f0d7b8', hair: '#4a4a4a', shirt: '#2e2a3a',
    arrive: ['I have heard... things.', 'We shall see.'],
    waiting: ['My pen is poised.', 'Duly noted.'],
    happy: ['...Exceptional.', 'A rare pleasure.'],
    angry: ['As expected.'],
  },
};
export const CUSTOMER_TYPE_IDS = Object.keys(CUSTOMER_TYPES);

/** The named regular: returns on set days, fills loyalty hearts. */
export const REGULAR = {
  id: 'marco',
  name: 'Marco',
  type: {
    name: 'Marco (Regular)', patience: 110, tip: 0.22, skin: '#e8b088', hair: '#7a4a21', shirt: '#b5452f',
    arrive: ['Rosa! My table misses me.', 'The usual, with love.'],
    waiting: ['I would wait all day.', 'Worth waiting for.'],
    happy: ['Nobody cooks like Rosa!', 'Another heart earned!'],
    angry: ['Even I have limits...'],
  },
  days: [2, 4, 6, 8, 10, 12],
};

/** Eight functional upgrades in the night shop. */
export const UPGRADES = [
  { id: 'knives', name: 'Sharp Knives', price: 90, desc: 'Chop clicks count +50%.' },
  { id: 'grillxl', name: 'Grill XL', price: 120, desc: 'Grill gains a third slot.' },
  { id: 'fryerxl', name: 'Fryer XL', price: 120, desc: 'Fryer gains a third slot.' },
  { id: 'widegold', name: 'Wide Gold', price: 150, desc: 'The PERFECT zone widens.' },
  { id: 'stools', name: 'Comfy Stools', price: 110, desc: 'Customers wait 25% longer.' },
  { id: 'tipjar', name: 'Golden Tip Jar', price: 130, desc: 'All tips +20%.' },
  { id: 'trayxl', name: 'Extra Prep Tray', price: 100, desc: 'Mise en place holds 2 more.' },
  { id: 'helper', name: 'Hire Marco Jr.', price: 220, desc: 'An assistant boosts cooking for you.' },
];

/** Decor tab: bought once, visible in the diner, small permanent boosts. */
export const DECOR = [
  { id: 'plant', name: 'Potted Plant', price: 60, patience: 0.08, tip: 0, desc: 'Greenery calms the room. Patience +8%.' },
  { id: 'painting', name: 'Wall Painting', price: 80, patience: 0, tip: 0.06, desc: 'Art on the wall. Tips +6%.' },
  { id: 'lamps', name: 'Golden Lamps', price: 100, patience: 0.05, tip: 0.04, desc: 'Warmer light. Patience +5%, tips +4%.' },
  { id: 'velvet', name: 'Velvet Stools', price: 140, patience: 0.12, tip: 0, desc: 'Sit in luxury. Patience +12%.' },
];

export const ACHIEVEMENTS = [
  { id: 'first', name: 'First Serve', desc: 'Serve your first dish.' },
  { id: 'perfect10', name: 'Perfect Ten', desc: 'Serve 10 perfect dishes.' },
  { id: 'combo9', name: 'Combo King', desc: 'Reach a ×9 combo chain (tier ×3).' },
  { id: 'fever', name: 'Fever!', desc: 'Trigger FEVER mode.' },
  { id: 'loyal', name: 'Loyal Friend', desc: 'Fill Marco’s loyalty hearts.' },
  { id: 'threestar', name: 'Three-Star Day', desc: 'Earn 3 stars on a day.' },
  { id: 'decorator', name: 'Decorator', desc: 'Buy 2 decorations.' },
  { id: 'champion', name: 'Loan Slayer', desc: 'Win the campaign and save the diner.' },
  { id: 'endless3', name: 'Endless Appetite', desc: 'Reach wave 3 in Endless mode.' },
];

/** Story cards: shown before the keyed day ('win' after day 12). */
export const STORY = {
  intro: [
    { who: 'Rosa', text: 'Thirty years I have cooked in this diner. The bank will not take it without a fight.' },
    { who: 'Mr. Bank', text: 'Twelve days, Rosa. Repay the loan — $5,370 — or the Copper Ladle is ours.' },
    { who: 'Rosa', text: 'Then we cook like never before. Apron on. Ladle up!' },
  ],
  mid: [
    { who: 'Marco', text: 'Half the street eats here now, Rosa. Word travels fast.' },
    { who: 'Rosa', text: 'Halfway to the loan, too. Keep the pans hot and the hearts warm.' },
    { who: 'Mr. Bank', text: '(scribbling) ...She might actually do it.' },
  ],
  final: [
    { who: 'Mr. Bank', text: 'The final day, Rosa. The whole town is watching.' },
    { who: 'Rosa', text: 'Then let them watch a feast. One more service — the biggest yet!' },
  ],
  win: [
    { who: 'Rosa', text: 'Paid. Every last coin. The Copper Ladle stays OURS!' },
    { who: 'Marco', text: 'To Rosa! And to the best little diner in the world!' },
  ],
};
