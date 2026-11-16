// Every sound in EMBERFALL is synthesised with WebAudio — no audio files. A soft
// two-oscillator pad hums under the night, and each event (a catch, a pulse, a bite,
// a new phase, the dawn) gets a small voice of its own. The engine starts lazily on
// the player's first gesture, as browsers require, and M or the mute flag silences it.

export class SoundEngine {
  constructor() {
    this.context = null;
    this.master = null;
    this.padNodes = null;
    this.muted = false;
  }

  /** Create the context and start the pad. Safe to call on every gesture. */
  start() {
    if (this.context) {
      if (this.context.state === 'suspended') void this.context.resume();
      return;
    }
    const AudioCtor = window.AudioContext ?? window.webkitAudioContext;
    if (!AudioCtor) return;
    this.context = new AudioCtor();
    this.master = this.context.createGain();
    this.master.gain.value = this.muted ? 0 : 0.5;
    this.master.connect(this.context.destination);
    this.startPad();
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master && this.context) {
      this.master.gain.setTargetAtTime(muted ? 0 : 0.5, this.context.currentTime, 0.05);
    }
  }

  /** A slow, warm drone: two detuned triangles through a low-pass, breathing. */
  startPad() {
    const ctx = this.context;
    const gain = ctx.createGain();
    gain.gain.value = 0.05;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 420;
    for (const freq of [110, 164.8, 220]) {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      osc.detune.value = (freq % 7) - 3;
      osc.connect(filter);
      osc.start();
    }
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.02;
    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);
    lfo.start();
    filter.connect(gain);
    gain.connect(this.master);
    this.padNodes = { gain, filter };
  }

  /** One short envelope-shaped tone; the building block of every effect. */
  tone({ freq, freqEnd = null, type = 'sine', at = 0, dur = 0.18, vol = 0.2 }) {
    if (!this.context || this.muted) return;
    const ctx = this.context;
    const t0 = ctx.currentTime + at;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (freqEnd !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), t0 + dur);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(vol, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  /** Filtered noise, for whooshes and smoke. */
  noise({ at = 0, dur = 0.3, vol = 0.15, freq = 800, freqEnd = null }) {
    if (!this.context || this.muted) return;
    const ctx = this.context;
    const t0 = ctx.currentTime + at;
    const length = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(freq, t0);
    if (freqEnd !== null) filter.frequency.exponentialRampToValueAtTime(Math.max(30, freqEnd), t0 + dur);
    const gain = ctx.createGain();
    gain.gain.value = vol;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    source.start(t0);
  }

  /** An ember lands in the lantern: a bright two-note chime, higher in a combo. */
  catchChime(tier) {
    const base = 660 + tier * 90;
    this.tone({ freq: base, type: 'sine', dur: 0.14, vol: 0.16 });
    this.tone({ freq: base * 1.5, type: 'sine', at: 0.05, dur: 0.2, vol: 0.13 });
  }

  /** A moth is banished: a soft violet pop. */
  banishPop() {
    this.tone({ freq: 340, freqEnd: 90, type: 'square', dur: 0.16, vol: 0.07 });
    this.noise({ dur: 0.12, vol: 0.05, freq: 1800, freqEnd: 500 });
  }

  /** The light pulse: a warm whoosh outward. */
  pulseWhoosh() {
    this.noise({ dur: 0.35, vol: 0.14, freq: 300, freqEnd: 2400 });
    this.tone({ freq: 196, freqEnd: 392, type: 'sine', dur: 0.3, vol: 0.08 });
  }

  /** A moth bites the flame: a low, unhappy thud. */
  biteThud() {
    this.tone({ freq: 120, freqEnd: 55, type: 'sine', dur: 0.28, vol: 0.3 });
    this.noise({ dur: 0.2, vol: 0.1, freq: 300, freqEnd: 120 });
  }

  /** A new phase of the night: one deep bell. */
  phaseBell() {
    this.tone({ freq: 233, type: 'sine', dur: 0.9, vol: 0.16 });
    this.tone({ freq: 466, type: 'sine', dur: 0.7, vol: 0.05 });
  }

  /** The dawn: a small rising sunrise chord. */
  dawnChord() {
    [262, 330, 392, 523].forEach((freq, i) => {
      this.tone({ freq, type: 'triangle', at: i * 0.13, dur: 0.9, vol: 0.13 });
    });
  }

  /** The flame dies: everything falls away. */
  darkFall() {
    this.tone({ freq: 392, freqEnd: 49, type: 'triangle', dur: 1.4, vol: 0.2 });
    this.noise({ dur: 1.1, vol: 0.08, freq: 900, freqEnd: 90 });
  }
}
