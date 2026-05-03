class AudioSystem {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private ambientNodes: AudioNode[] = [];
  private isRunning = false;
  private bubbleTimeout: ReturnType<typeof setTimeout> | null = null;

  private getCtx(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.connect(this.ctx.destination);
      this.masterGain.gain.value = 0.3;
    }
    return this.ctx;
  }

  setVolume(vol: number) {
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(vol, this.getCtx().currentTime, 0.1);
    }
  }

  startAmbient() {
    if (this.isRunning) return;
    const ctx = this.getCtx();
    if (ctx.state === "suspended") ctx.resume();
    this.isRunning = true;

    // Underwater noise (low rumble)
    const bufferSize = ctx.sampleRate * 4;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = "lowpass";
    lowpass.frequency.value = 200;
    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.04;
    noise.connect(lowpass);
    lowpass.connect(noiseGain);
    noiseGain.connect(this.masterGain!);
    noise.start();
    this.ambientNodes.push(noise);

    // Slow oscillating sine (deep hum)
    const osc1 = ctx.createOscillator();
    osc1.type = "sine";
    osc1.frequency.value = 55;
    const lfo1 = ctx.createOscillator();
    lfo1.type = "sine";
    lfo1.frequency.value = 0.08;
    const lfoGain1 = ctx.createGain();
    lfoGain1.gain.value = 8;
    lfo1.connect(lfoGain1);
    lfoGain1.connect(osc1.frequency);
    const osc1Gain = ctx.createGain();
    osc1Gain.gain.value = 0.03;
    osc1.connect(osc1Gain);
    osc1Gain.connect(this.masterGain!);
    osc1.start();
    lfo1.start();
    this.ambientNodes.push(osc1, lfo1);

    // Higher harmonic
    const osc2 = ctx.createOscillator();
    osc2.type = "sine";
    osc2.frequency.value = 110;
    const lfo2 = ctx.createOscillator();
    lfo2.type = "sine";
    lfo2.frequency.value = 0.13;
    const lfoGain2 = ctx.createGain();
    lfoGain2.gain.value = 5;
    lfo2.connect(lfoGain2);
    lfoGain2.connect(osc2.frequency);
    const osc2Gain = ctx.createGain();
    osc2Gain.gain.value = 0.015;
    osc2.connect(osc2Gain);
    osc2Gain.connect(this.masterGain!);
    osc2.start();
    lfo2.start();
    this.ambientNodes.push(osc2, lfo2);

    this.scheduleBubbles();
  }

  private scheduleBubbles() {
    if (!this.isRunning) return;
    const delay = 800 + Math.random() * 3000;
    this.bubbleTimeout = setTimeout(() => {
      if (!this.isRunning) return;
      this.playBubble();
      this.scheduleBubbles();
    }, delay);
  }

  private playBubble() {
    try {
      const ctx = this.getCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      const baseFreq = 600 + Math.random() * 800;
      osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.8, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.15);
    } catch {}
  }

  stopAmbient() {
    this.isRunning = false;
    if (this.bubbleTimeout) clearTimeout(this.bubbleTimeout);
    this.ambientNodes.forEach((n) => {
      try { (n as AudioScheduledSourceNode).stop(); } catch {}
      try { n.disconnect(); } catch {}
    });
    this.ambientNodes = [];
  }

  playClick() {
    try {
      const ctx = this.getCtx();
      if (ctx.state === "suspended") ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.06);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(this.masterGain ?? ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.1);
    } catch {}
  }

  playSuccess() {
    try {
      const ctx = this.getCtx();
      if (ctx.state === "suspended") ctx.resume();
      const notes = [523, 659, 784, 1047];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        const t = ctx.currentTime + i * 0.12;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.12, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
        osc.connect(gain);
        gain.connect(this.masterGain ?? ctx.destination);
        osc.start(t);
        osc.stop(t + 0.35);
      });
    } catch {}
  }

  playChime() {
    this.playSuccess();
  }
}

export const audioSystem = new AudioSystem();
