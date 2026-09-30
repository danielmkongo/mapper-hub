// Audible "Man down" alarm. Synthesised with Web Audio, so there is no sound file to load and
// it works offline like the rest of the twin.
//
// Browsers only let a page make sound after the viewer has clicked, tapped or pressed a key,
// so the audio is unlocked on the first gesture. Until then an alarm can't be heard; the
// caller shows that (state.locked) so the operator knows to tap once.

const PERIOD_MS = 1600; // one "hi-lo hi-lo" burst, then a short gap

export function createAlarm({ muted = false, onChange = () => {} } = {}) {
  let ctx = null;
  let timer = null;
  let isMuted = muted;
  let down = new Set(); // people currently down
  let silenced = new Set(); // down people the operator has acknowledged

  function audio() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    return ctx;
  }

  function unlock() {
    const c = audio();
    if (c && c.state !== 'running') c.resume().then(emit, () => {});
  }
  addEventListener('pointerdown', unlock, true);
  addEventListener('keydown', unlock, true);

  // Two-tone siren burst: 880 / 660 Hz, twice.
  function burst() {
    const c = audio();
    if (!c || c.state !== 'running') return;
    const t0 = c.currentTime + 0.02;
    const tones = [880, 660, 880, 660];
    tones.forEach((freq, i) => {
      const start = t0 + i * 0.22;
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = 'square';
      osc.frequency.value = freq;
      // Short attack/release so the tones don't click.
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.18, start + 0.015);
      gain.gain.setValueAtTime(0.18, start + 0.18);
      gain.gain.linearRampToValueAtTime(0, start + 0.2);
      osc.connect(gain).connect(c.destination);
      osc.start(start);
      osc.stop(start + 0.21);
    });
  }

  const unacknowledged = () => [...down].filter((id) => !silenced.has(id));
  const shouldSound = () => !isMuted && unacknowledged().length > 0;

  function state() {
    const c = ctx;
    return {
      muted: isMuted,
      active: unacknowledged().length > 0, // someone down and not silenced
      sounding: shouldSound() && !!c && c.state === 'running',
      locked: shouldSound() && (!c || c.state !== 'running'), // needs one tap to be heard
    };
  }
  function emit() { onChange(state()); }

  function refresh() {
    if (shouldSound()) {
      if (!timer) {
        burst();
        timer = setInterval(burst, PERIOD_MS);
      }
    } else if (timer) {
      clearInterval(timer);
      timer = null;
    }
    emit();
  }

  return {
    // ids of everyone currently in a "man down" alert
    update(ids) {
      down = new Set(ids.map(String));
      // Someone who got up is no longer silenced: going down again sounds again.
      silenced = new Set([...silenced].filter((id) => down.has(id)));
      refresh();
    },
    // Acknowledge everyone down right now; a new person going down sounds again.
    silence() {
      silenced = new Set(down);
      refresh();
    },
    setMuted(value) {
      isMuted = value;
      if (!value) unlock();
      refresh();
    },
    get muted() { return isMuted; },
    state,
  };
}
