// The Copper Ladle — controller: screens, input, persistence, popups, tutorial, and the
// wiring from kitchen events to the synthesized sound cues.

import { DAY_GOALS, LOAN_TOTAL } from './config.js';
import { STORY } from './data.js';
import {
  buyDecor, buyUpgrade, createDay, createMeta, dishOfTheDay, drainEvents, finishDay,
  nextNeeded, plateComplete, selectTarget, serve, tick, trayCapacity,
  clickDrink, clickIngredient, clickItem, clickTray, serveDrinkAlone, trashPlate,
} from './kitchen.js';
import { SCREEN } from './render.js';
import { createAudio } from './audio.js';

const SAVE_KEY = 'copper-ladle-save-v5';
const SEAT_X = [180, 470, 760, 1050];

const TUTORIAL_STEPS = [
  '1 · Tap a guest’s ticket to take their order',
  '2 · Tap the glowing pantry ingredient to start cooking it',
  '3 · Keep CLICKING the cooking item — clicks cook it!',
  '4 · It is in the gold PERFECT zone — click it to plate it',
  '5 · Finish every step, then press SERVE (or Space)',
];

export function createGame() {
  const audio = createAudio();
  let meta = loadMeta();
  let screen = SCREEN.TITLE;
  let day = null;
  let hits = [];
  let popups = [];
  let time = 0;
  let recipePage = 0;
  let introInfo = null;
  let storyScene = null;
  let storyIdx = 0;
  let storyAfter = null;
  let starReveal = 0;
  let starSoundPlayed = 0;
  let summaryAt = 0;
  let tutorialStep = 0;
  let drinkArmed = false;
  let lastBoostSound = 0;

  function loadMeta() {
    try {
      const raw = window.localStorage.getItem(SAVE_KEY);
      if (raw) return { ...createMeta(), ...JSON.parse(raw) };
    } catch { /* storage off: play session-only */ }
    return createMeta();
  }
  function saveMeta() {
    try { window.localStorage.setItem(SAVE_KEY, JSON.stringify(meta)); } catch { /* ignore */ }
  }

  function popup(x, y, text, color) {
    popups.push({ x, y, text, color, age: 0 });
  }

  function goIntro(dayNum, endless = false) {
    const goal = endless
      ? Math.round((260 + 140 * (dayNum - 1)) * (meta.difficulty === 'relaxed' ? 0.8 : 1))
      : Math.round(DAY_GOALS[dayNum - 1] * (meta.difficulty === 'relaxed' ? 0.8 : 1));
    introInfo = {
      day: dayNum,
      endless,
      goal,
      dotd: dishOfTheDay(endless ? ((dayNum - 1) % 12) + 1 : dayNum),
      hasStory: !endless && ((dayNum === 1 && STORY.intro) || (dayNum === 6 && STORY.mid) || (dayNum === 12 && STORY.final)),
    };
    screen = SCREEN.INTRO;
  }

  function startDay() {
    day = createDay(meta, introInfo.day, { endless: introInfo.endless });
    tutorialStep = 0;
    popups = [];
    drinkArmed = false;
    screen = SCREEN.SERVICE;
    audio.unlock();
  }

  function showStory(key, after) {
    storyScene = STORY[key];
    storyIdx = 0;
    storyAfter = after;
    screen = SCREEN.STORY;
  }

  function endDay() {
    finishDay(meta, day);
    saveMeta();
    starReveal = 0;
    starSoundPlayed = 0;
    summaryAt = time;
    if (day.won) {
      screen = SCREEN.SUMMARY;
      audio.win();
    } else {
      screen = SCREEN.GAMEOVER;
      audio.lose();
    }
  }

  function handleEvents() {
    for (const ev of drainEvents(day)) {
      switch (ev.type) {
        case 'perfect-zone': audio.perfectZone(); break;
        case 'boost': if (time - lastBoostSound > 0.06) { audio.boost(); lastBoostSound = time; } break;
        case 'cook-start': audio.click(); break;
        case 'plate': audio.plate(); break;
        case 'reject': audio.reject(); break;
        case 'serve': {
          if (ev.perfectDish) audio.perfectServe(); else audio.coin(ev.amount);
          audio.comboRise(day.combo);
          const idx = day.customers.indexOf(ev.customer);
          popup(SEAT_X[Math.max(0, idx) % 4] || 640, 300, `+$${ev.amount}${ev.mult > 1 ? ` ×${ev.mult}` : ''}`, ev.perfectDish ? '#ffc93c' : '#ffe9c4');
          break;
        }
        case 'combo-break': audio.comboBreak(); popup(640, 120, 'COMBO BROKEN', '#e8452c'); break;
        case 'fever-start': audio.feverStart(); popup(640, 120, '🔥 FEVER! 🔥', '#ffb03a'); break;
        case 'fever-end': popup(640, 120, 'fever over', '#d9b98a'); break;
        case 'walkout': audio.walkout(); break;
        case 'phone-ring': audio.phone(); popup(1078, 560, '☎ phone order!', '#ffc93c'); break;
        case 'phone-done': audio.coin(ev.amount); popup(1078, 560, `+$${ev.amount} packed!`, '#7ec850'); break;
        case 'phone-missed': popup(1078, 560, 'phone order missed', '#e8452c'); break;
        case 'drink-ready': audio.pop(); break;
        case 'drink-serve': audio.coin(ev.amount); break;
        case 'loyalty': popup(640, 160, `♥ Marco loyalty ${ev.hearts}/5`, '#e8913a'); break;
        case 'loyalty-bonus': popup(640, 190, `♥♥ LOYALTY BONUS +$${ev.amount}`, '#ffc93c'); break;
        case 'helper-boost': break;
        case 'arrive': break;
        default: break;
      }
    }
  }

  function updateTutorial() {
    if (!day || day.kind !== 'campaign' || day.day !== 1 || meta.tutorialDone) return;
    const s = tutorialStep;
    if (s === 0 && day.activeTarget) tutorialStep = 1;
    else if (s === 1 && (day.items.length > 0 || day.plate.layers.length > 0)) tutorialStep = 2;
    else if (s === 2 && (day.items.some((i) => i.doneness >= 45) || day.plate.layers.length > 0)) tutorialStep = 3;
    else if (s === 3 && day.plate.layers.length > 0) tutorialStep = 4;
    else if (s === 4 && day.served > 0) { meta.tutorialDone = true; saveMeta(); }
  }

  function step(dt) {
    time += dt;
    for (const p of popups) p.age += dt;
    popups = popups.filter((p) => p.age < 1.4);
    if (screen === SCREEN.SERVICE && day && !day.over) {
      tick(day, meta, dt);
      handleEvents();
      updateTutorial();
      if (day.over) endDay();
    }
    if (screen === SCREEN.SUMMARY) {
      const target = Math.min(3, Math.floor((time - summaryAt) / 0.45));
      if (target > starReveal) {
        starReveal = target;
        const stars = day.earned >= day.goal ? (day.earned >= day.goal * 1.6 ? 3 : day.earned >= day.goal * 1.25 ? 2 : 1) : 0;
        if (starReveal <= stars && starSoundPlayed < starReveal) {
          audio.star(starReveal);
          starSoundPlayed = starReveal;
        }
      }
    }
  }

  function click(x, y) {
    audio.unlock();
    const hit = [...hits].reverse().find((h) => x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h);
    if (!hit) return;
    const id = hit.id;
    if (screen === SCREEN.SERVICE || screen === SCREEN.PAUSED) {
      if (id === 'pause') { screen = screen === SCREEN.PAUSED ? SCREEN.SERVICE : SCREEN.PAUSED; return; }
      if (id === 'resume') { screen = SCREEN.SERVICE; return; }
      if (id === 'quit') { screen = SCREEN.LADDER; day = null; return; }
      if (id === 'mute') { audio.toggleMute(); return; }
      if (screen === SCREEN.PAUSED) return;
      if (!day) return;
      if (id === 'customer') {
        if (drinkArmed) {
          serveDrinkAlone(day, meta, hit.data);
          drinkArmed = false;
        } else {
          selectTarget(day, { type: 'seat', id: hit.data });
        }
      } else if (id === 'phone') selectTarget(day, { type: 'phone', id: 'phone' });
      else if (id === 'ingredient') clickIngredient(day, meta, hit.data);
      else if (id === 'item') clickItem(day, meta, hit.data);
      else if (id === 'tray') clickTray(day, meta, hit.data);
      else if (id === 'drink') clickDrink(day, meta, hit.data);
      else if (id === 'serve') serve(day, meta);
      else if (id === 'trash') trashPlate(day);
      handleEvents();
      return;
    }
    switch (id) {
      case 'mute': audio.toggleMute(); break;
      case 'play': screen = SCREEN.LADDER; break;
      case 'difficulty': meta.difficulty = meta.difficulty === 'relaxed' ? 'normal' : 'relaxed'; saveMeta(); break;
      case 'howto': screen = SCREEN.HOWTO; break;
      case 'recipes': recipePage = 0; screen = SCREEN.RECIPES; break;
      case 'recipes-prev': recipePage = Math.max(0, recipePage - 1); break;
      case 'recipes-next': recipePage += 1; break;
      case 'achievements': screen = SCREEN.ACHIEVEMENTS; break;
      case 'endless': goIntro((meta.endlessBest || 0) + 1, true); break;
      case 'title': screen = SCREEN.TITLE; break;
      case 'ladder': screen = SCREEN.LADDER; break;
      case 'stage': goIntro(hit.data, false); break;
      case 'story': {
        const key = introInfo.day === 1 ? 'intro' : introInfo.day === 6 ? 'mid' : 'final';
        showStory(key, 'start');
        break;
      }
      case 'story-next':
        if (storyIdx < storyScene.length - 1) storyIdx += 1;
        else if (storyAfter === 'win') screen = SCREEN.VICTORY;
        else startDay();
        break;
      case 'story-skip':
        if (storyAfter === 'win') screen = SCREEN.VICTORY;
        else startDay();
        break;
      case 'start': startDay(); break;
      case 'shop': screen = SCREEN.SHOP; break;
      case 'buy-upgrade': if (buyUpgrade(meta, hit.data)) { audio.coin(0); saveMeta(); } else audio.reject(); break;
      case 'buy-decor': if (buyDecor(meta, hit.data)) { audio.coin(0); saveMeta(); } else audio.reject(); break;
      case 'shop-done': screen = SCREEN.LADDER; break;
      case 'next':
        if (day.kind === 'endless') goIntro(day.day + 1, true);
        else if (day.day >= 12) showStory('win', 'win');
        else goIntro(day.day + 1, false);
        break;
      case 'retry': goIntro(day.day, day.kind === 'endless'); break;
      default: break;
    }
  }

  function key(k) {
    if (screen === SCREEN.SERVICE && day) {
      if (k === ' ') { serve(day, meta); handleEvents(); }
      else if (k === 'Escape' || k === 'p' || k === 'P') screen = SCREEN.PAUSED;
      else if (k === 'm' || k === 'M') audio.toggleMute();
    } else if (screen === SCREEN.PAUSED && (k === 'Escape' || k === 'p')) {
      screen = SCREEN.SERVICE;
    }
  }

  function view() {
    return {
      screen,
      meta,
      day,
      time,
      muted: audio.muted,
      popups,
      recipePage,
      introInfo,
      storyScene,
      storyIdx,
      starReveal,
      plateComplete: day ? plateComplete(day) : false,
      nextNeeded: day ? nextNeeded(day) : null,
      trayCap: trayCapacity(meta),
      tutorial: screen === SCREEN.SERVICE && day && day.kind === 'campaign' && day.day === 1 && !meta.tutorialDone
        ? TUTORIAL_STEPS[Math.min(tutorialStep, TUTORIAL_STEPS.length - 1)]
        : null,
    };
  }

  return {
    step,
    click,
    key,
    view,
    setHits(h) { hits = h; },
    get screen() { return screen; },
    _meta: () => meta,
    _day: () => day,
    _audio: audio,
    _setScreen(s) { screen = s; },
    _startDay(dayNum, endless = false) { goIntro(dayNum, endless); startDay(); },
    _goIntro: goIntro,
    _showStory: showStory,
  };
}

export { LOAN_TOTAL };
