// The Copper Ladle — all sound is synthesized WebAudio: a warm procedural music loop plus
// a cue for every game beat. One mute toggle governs everything.

export function createAudio() {
  let ctx = null;
  let master = null;
  let muted = false;
  let musicTimer = null;
  let step = 0;

  function ensure() {
    if (ctx) return true;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
      return true;
    } catch {
      return false;
    }
  }

  function tone(freq, dur, { type = 'sine', vol = 0.2, when = 0, slide = 0 } = {}) {
    if (!ensure() || muted) return;
    const t0 = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(vol, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain).connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  // A gentle 8-bar loop: C-major melody over a walking bass with soft chord stabs (132 BPM feel).
  const MELODY = [523, 587, 659, 784, 659, 587, 523, 440, 494, 523, 587, 659, 587, 523, 494, 392];
  const BASS = [131, 98, 110, 98, 87, 98, 110, 123];
  const CHORDS = [[262, 330, 392], [196, 247, 294], [220, 262, 330], [196, 247, 294]];

  function musicStep() {
    if (muted || !ctx) return;
    const bar = Math.floor(step / 16);
    const beat = step % 16;
    if (beat % 2 === 0) tone(MELODY[(step >> 1) % MELODY.length], 0.22, { type: 'triangle', vol: 0.07 });
    if (beat % 4 === 0) tone(BASS[(step >> 2) % BASS.length], 0.4, { type: 'sine', vol: 0.11 });
    if (beat === 0) {
      const chord = CHORDS[bar % CHORDS.length];
      for (const f of chord) tone(f, 0.9, { type: 'triangle', vol: 0.028 });
    }
    step += 1;
  }

  return {
    unlock() {
      if (!ensure()) return;
      if (ctx.state === 'suspended') ctx.resume();
      if (!musicTimer) musicTimer = setInterval(musicStep, 227);
    },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.5;
      return muted;
    },
    get muted() { return muted; },
    // --- SFX cues ---
    click() { tone(660, 0.06, { type: 'square', vol: 0.06 }); },
    boost() { tone(300 + Math.random() * 60, 0.08, { type: 'triangle', vol: 0.1, slide: 160 }); },
    sizzle() { tone(1800, 0.05, { type: 'sawtooth', vol: 0.02 }); },
    plate() { tone(880, 0.09, { type: 'triangle', vol: 0.12 }); },
    reject() { tone(160, 0.15, { type: 'square', vol: 0.08, slide: -60 }); },
    coin(amount = 10) { tone(988, 0.09, { vol: 0.12 }); tone(1319, 0.14, { vol: 0.12, when: 0.07 }); },
    pop() { tone(520, 0.07, { type: 'triangle', vol: 0.1, slide: 300 }); },
    walkout() { tone(392, 0.2, { vol: 0.1, slide: -120 }); tone(330, 0.3, { vol: 0.1, when: 0.15, slide: -80 }); },
    phone() { tone(1175, 0.1, { type: 'square', vol: 0.06 }); tone(1175, 0.1, { type: 'square', vol: 0.06, when: 0.16 }); },
    star(n) { tone(523 + n * 131, 0.25, { type: 'triangle', vol: 0.14 }); },
    win() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.3, { type: 'triangle', vol: 0.13, when: i * 0.12 })); },
    lose() { [440, 415, 392, 370].forEach((f, i) => tone(f, 0.3, { type: 'triangle', vol: 0.1, when: i * 0.14 })); },
    // --- The named cues (also listed on the How to Play page) ---
    perfectZone() { // bright chime: an item just entered the PERFECT zone
      tone(1568, 0.16, { type: 'sine', vol: 0.14 });
      tone(2093, 0.22, { type: 'sine', vol: 0.1, when: 0.05 });
    },
    perfectServe() { // sparkle arpeggio: a PERFECT dish was served
      [1319, 1568, 2093, 2637].forEach((f, i) => tone(f, 0.16, { type: 'sine', vol: 0.1, when: i * 0.05 }));
    },
    comboRise(level) { // blip that climbs in pitch with the combo level
      const base = 520 + Math.min(level, 14) * 45;
      tone(base, 0.09, { type: 'square', vol: 0.07 });
      tone(base * 1.335, 0.12, { type: 'square', vol: 0.06, when: 0.05 });
    },
    comboBreak() { // descending cue: the chain is gone
      tone(620, 0.14, { type: 'sawtooth', vol: 0.07, slide: -160 });
      tone(415, 0.24, { type: 'sawtooth', vol: 0.07, when: 0.1, slide: -140 });
    },
    feverStart() { // short fanfare: FEVER begins
      [392, 523, 659, 784].forEach((f, i) => tone(f, 0.18, { type: 'square', vol: 0.08, when: i * 0.07 }));
      tone(1047, 0.4, { type: 'triangle', vol: 0.12, when: 0.3 });
    },
  };
}
