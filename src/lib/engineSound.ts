/**
 * A synthesised 270°-crank parallel twin (it fires like a 90° V-twin). No samples: the firing pulses come from a sawtooth at
 * the firing frequency, shaped by an uneven "potato" amplitude pattern (two
 * close beats, then a gap), driven through a soft-clipping waveshaper and an
 * intake-like low-pass that opens with revs. Mechanical noise rides on top.
 */

/** 4-stroke twin: each cylinder fires once every two revolutions → rpm / 60 combined. */
export const firingHz = (rpm: number) => rpm / 60;
export const IDLE_RPM = 1150;
export const REDLINE = 10000;

/** Map scroll speed (px/s) and a held throttle to a target rpm. */
export function targetRpm(scrollSpeed: number, throttle: boolean) {
  const fromScroll = Math.min(1, Math.abs(scrollSpeed) / 2500);
  const t = Math.max(fromScroll, throttle ? 1 : 0);
  return IDLE_RPM + t * (REDLINE * 0.85 - IDLE_RPM);
}

function softClip(amount: number) {
  const n = 1024;
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    curve[i] = Math.tanh(x * amount) / Math.tanh(amount);
  }
  return curve;
}

export class EngineSound {
  private ctx: AudioContext | null = null;
  private nodes: {
    osc: OscillatorNode;
    sub: OscillatorNode;
    potato: OscillatorNode;
    filter: BiquadFilterNode;
    out: GainNode;
    noiseGain: GainNode;
  } | null = null;
  rpm = 0;
  running = false;

  async start() {
    if (this.running) return;
    this.ctx ??= new AudioContext();
    const ctx = this.ctx;
    await ctx.resume();

    const out = ctx.createGain();
    out.gain.value = 0;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    out.connect(comp).connect(ctx.destination);

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.Q.value = 3;
    const shaper = ctx.createWaveShaper();
    shaper.curve = softClip(3.5);
    shaper.oversample = "4x";
    shaper.connect(filter).connect(out);

    // Firing pulses + a sub-octave for chest.
    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    const sub = ctx.createOscillator();
    sub.type = "square";
    const pulseGain = ctx.createGain();
    pulseGain.gain.value = 0.5;
    osc.connect(pulseGain);
    const subGain = ctx.createGain();
    subGain.gain.value = 0.25;
    sub.connect(subGain).connect(shaper);

    // Uneven-firing amplitude modulation at half the firing rate.
    const potato = ctx.createOscillator();
    potato.type = "square";
    const potatoDepth = ctx.createGain();
    potatoDepth.gain.value = 0.45;
    const lope = ctx.createGain();
    lope.gain.value = 0.55;
    potato.connect(potatoDepth).connect(lope.gain);
    pulseGain.connect(lope).connect(shaper);

    // Mechanical / intake noise.
    const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    noise.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 900;
    bp.Q.value = 0.8;
    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.02;
    noise.connect(bp).connect(noiseGain).connect(filter);

    [osc, sub, potato, noise].forEach((n) => n.start());
    this.nodes = { osc, sub, potato, filter, out, noiseGain };
    this.running = true;

    // Starter: crank, catch, settle to idle.
    const t = ctx.currentTime;
    this.rpm = 300;
    out.gain.setValueAtTime(0, t);
    out.gain.linearRampToValueAtTime(0.3, t + 0.35);
    this.update(300);
    window.setTimeout(() => (this.rpm = 2600), 550);
  }

  /** Call per frame with the desired rpm; the engine has inertia. */
  update(target: number, dt = 1 / 60) {
    if (!this.nodes || !this.ctx) return;
    const rate = target > this.rpm ? 6 : 2.2; // revs up fast, falls slowly
    this.rpm += (target - this.rpm) * Math.min(1, dt * rate);
    const f = firingHz(this.rpm);
    const now = this.ctx.currentTime;
    const { osc, sub, potato, filter, noiseGain } = this.nodes;
    osc.frequency.setTargetAtTime(f, now, 0.02);
    sub.frequency.setTargetAtTime(f / 2, now, 0.02);
    potato.frequency.setTargetAtTime(f / 2, now, 0.02);
    filter.frequency.setTargetAtTime(220 + this.rpm * 0.32, now, 0.04);
    noiseGain.gain.setTargetAtTime(0.015 + (this.rpm / REDLINE) * 0.05, now, 0.05);
  }

  stop() {
    if (!this.nodes || !this.ctx) return;
    const { out, osc, sub, potato } = this.nodes;
    const now = this.ctx.currentTime;
    out.gain.cancelScheduledValues(now);
    out.gain.setValueAtTime(out.gain.value, now);
    out.gain.linearRampToValueAtTime(0, now + 0.5);
    const n = this.nodes;
    window.setTimeout(() => {
      [osc, sub, potato].forEach((o) => o.stop());
      n.out.disconnect();
    }, 600);
    this.nodes = null;
    this.running = false;
    this.rpm = 0;
  }
}

export const engine = new EngineSound();
