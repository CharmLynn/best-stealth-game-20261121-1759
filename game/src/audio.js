// audio.js — every sound in the game, synthesized live with WebAudio.
// One clear job: make footsteps, chimes, clinks and alarms from oscillators, so the
// game ships no sound files at all. All sounds are original and generated in code.

export class SoundBank {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.stepPhase = 0;
  }

  // The browser only lets audio start after a user gesture; call this on first input.
  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.35;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  tone(freq, seconds, type = 'sine', volume = 0.5, when = 0, slideTo = null) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + seconds);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(volume, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + seconds);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + seconds + 0.05);
  }

  // A soft footstep tick. `loud` (running) is sharper than sneaking.
  footstep(sneaking) {
    this.tone(sneaking ? 140 : 190, 0.07, 'triangle', sneaking ? 0.10 : 0.22);
  }

  // A guard's heavy boot, heard through the floor; `distance` 0..1 fades it.
  guardStep(distance) {
    const vol = 0.28 * (1 - distance);
    if (vol <= 0.02) return;
    this.tone(95, 0.09, 'sine', vol);
  }

  pickup() {
    this.tone(880, 0.12, 'sine', 0.4);
    this.tone(1318, 0.18, 'sine', 0.35, 0.07);
  }

  coin() {
    this.tone(2093, 0.1, 'triangle', 0.3);
    this.tone(1568, 0.16, 'triangle', 0.25, 0.06);
  }

  suspicious() {
    this.tone(520, 0.14, 'square', 0.12);
    this.tone(660, 0.14, 'square', 0.12, 0.12);
  }

  alarm() {
    this.tone(392, 0.22, 'sawtooth', 0.22, 0, 311);
    this.tone(311, 0.22, 'sawtooth', 0.22, 0.22, 392);
  }

  caught() {
    this.tone(220, 0.3, 'sawtooth', 0.25, 0, 110);
    this.tone(110, 0.5, 'sawtooth', 0.25, 0.28, 55);
  }

  levelClear() {
    [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.22, 'sine', 0.35, i * 0.11));
  }

  win() {
    [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => this.tone(f, 0.3, 'sine', 0.32, i * 0.13));
  }
}
