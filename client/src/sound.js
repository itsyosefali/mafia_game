// Lightweight synthesized sound effects via the Web Audio API.
// No asset files: every sound is generated from oscillators + gain envelopes.
// The AudioContext is created lazily on first use (after a user gesture).

let ctx = null;
let enabled = true;

try {
  const stored = localStorage.getItem('sahara_sound');
  if (stored !== null) enabled = stored === '1';
} catch {
  // localStorage unavailable; keep default
}

function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

// One oscillator "blip" with an ADSR-ish gain envelope.
function tone({ freq = 440, type = 'sine', start = 0, dur = 0.2, vol = 0.2, slideTo = null }) {
  const a = ac();
  if (!a) return;
  const t0 = a.currentTime + start;
  const osc = a.createOscillator();
  const gain = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain);
  gain.connect(a.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function noise({ start = 0, dur = 0.25, vol = 0.18, lowpass = 1200 }) {
  const a = ac();
  if (!a) return;
  const t0 = a.currentTime + start;
  const frames = Math.floor(a.sampleRate * dur);
  const buffer = a.createBuffer(1, frames, a.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
  const src = a.createBufferSource();
  src.buffer = buffer;
  const filter = a.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = lowpass;
  const gain = a.createGain();
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(a.destination);
  src.start(t0);
  src.stop(t0 + dur);
}

const SOUNDS = {
  draw: () => noise({ dur: 0.18, vol: 0.12, lowpass: 2200 }),
  play: () => tone({ freq: 320, type: 'triangle', dur: 0.14, vol: 0.16, slideTo: 520 }),
  turn: () => tone({ freq: 660, type: 'sine', dur: 0.16, vol: 0.14 }),
  night: () => {
    tone({ freq: 180, type: 'sine', dur: 1.1, vol: 0.22, slideTo: 90 });
    tone({ freq: 90, type: 'sine', start: 0.05, dur: 1.2, vol: 0.16 });
  },
  day: () => {
    tone({ freq: 523, type: 'sine', dur: 0.5, vol: 0.16 });
    tone({ freq: 784, type: 'sine', start: 0.08, dur: 0.5, vol: 0.13 });
  },
  trial: () => {
    tone({ freq: 240, type: 'square', dur: 0.09, vol: 0.18 });
    tone({ freq: 200, type: 'square', start: 0.13, dur: 0.12, vol: 0.18 });
  },
  death: () => {
    noise({ dur: 0.4, vol: 0.22, lowpass: 500 });
    tone({ freq: 140, type: 'sawtooth', dur: 0.5, vol: 0.16, slideTo: 60 });
  },
  attack: () => tone({ freq: 420, type: 'sawtooth', dur: 0.22, vol: 0.2, slideTo: 160 }),
  win: () => {
    [523, 659, 784, 1047].forEach((f, i) =>
      tone({ freq: f, type: 'triangle', start: i * 0.12, dur: 0.3, vol: 0.18 })
    );
  },
  lose: () => {
    [392, 330, 262, 196].forEach((f, i) =>
      tone({ freq: f, type: 'sawtooth', start: i * 0.14, dur: 0.32, vol: 0.18 })
    );
  },
};

export function playSound(name) {
  if (!enabled) return;
  const fn = SOUNDS[name];
  if (fn) {
    try {
      fn();
    } catch {
      // ignore audio failures
    }
  }
}

export function isSoundEnabled() {
  return enabled;
}

export function setSoundEnabled(value) {
  enabled = !!value;
  try {
    localStorage.setItem('sahara_sound', enabled ? '1' : '0');
  } catch {
    // ignore
  }
  if (enabled) playSound('turn');
}
