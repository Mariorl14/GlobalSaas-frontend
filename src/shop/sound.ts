/**
 * Soft notification chime for new appointments.
 * Uses Web Audio API (no asset files). Browsers may require a prior user gesture.
 */

let ctx: AudioContext | null = null;
let unlocked = false;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  return ctx;
}

/** Call after a click/tap so later chimes are allowed without blocking. */
export function unlockShopAudio(): void {
  const c = getCtx();
  if (!c) return;
  if (c.state === "suspended") {
    void c.resume().then(() => {
      unlocked = true;
    });
  } else {
    unlocked = true;
  }
}

/**
 * Short two-tone “ding” (~0.45s). Safe to call often; overlaps fade quickly.
 */
export function playAppointmentChime(): void {
  const c = getCtx();
  if (!c) return;

  const run = () => {
    const now = c.currentTime;
    const tones: [number, number][] = [
      [880, 0],
      [1174.7, 0.12],
    ];

    for (const [freq, delay] of tones) {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.12, now + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.28);
      osc.connect(gain);
      gain.connect(c.destination);
      osc.start(now + delay);
      osc.stop(now + delay + 0.32);
    }
  };

  if (c.state === "suspended") {
    void c.resume().then(() => {
      unlocked = true;
      run();
    });
  } else {
    unlocked = true;
    run();
  }
}

export function isShopAudioUnlocked(): boolean {
  return unlocked && !!ctx && ctx.state === "running";
}
