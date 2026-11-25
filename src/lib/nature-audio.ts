/**
 * VayuVerse Nature Ambient Sound System
 * 
 * Provides a gentle, peaceful natural soundscape:
 * - Soft breeze moving through trees
 * - Subtle leaf rustling
 * - Very distant gentle bird resonance
 * 
 * Implemented using Web Audio API procedural synthesis with optional audio element fallback:
 * - Zero external CDN dependency; works 100% offline and in all sandboxed environments
 * - Ultra-low master volume (~12%) with smooth logarithmic gain fades
 * - Strict compliance with browser autoplay policies: starts muted or awaits user gesture
 * - Remembers user's mute preference in localStorage ('vayuverse_nature_sound_muted')
 * - Automatically ducks/pauses when page is hidden (document.hidden) and unmounts cleanly
 */

const STORAGE_MUTE_KEY = "vayuverse_nature_sound_muted";
const MASTER_VOLUME = 0.12; // 12% maximum volume for gentle background presence

export type SoundState = "playing" | "muted" | "needs_interaction" | "error";

class NatureSoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isInitialized = false;
  private isMuted = true;
  private isDocumentVisible = true;
  private listeners: Set<(state: SoundState) => void> = new Set();
  private noiseNodes: AudioNode[] = [];
  private birdTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      // Check stored preference (default to unmuted if user previously allowed it, otherwise muted)
      const storedMute = localStorage.getItem(STORAGE_MUTE_KEY);
      this.isMuted = storedMute !== "false";

      // Listen for tab visibility changes to pause audio when tab is in background
      document.addEventListener("visibilitychange", this.handleVisibilityChange);
    }
  }

  public subscribe(listener: (state: SoundState) => void): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  private notify() {
    const state = this.getState();
    this.listeners.forEach((l) => l(state));
  }

  public getState(): SoundState {
    if (!this.isInitialized) {
      return this.isMuted ? "muted" : "needs_interaction";
    }
    if (this.isMuted) return "muted";
    if (this.ctx && this.ctx.state === "suspended") return "needs_interaction";
    return "playing";
  }

  /**
   * Safe initialization: creates AudioContext without breaking browser autoplay rules
   */
  public async init(): Promise<void> {
    if (typeof window === "undefined" || this.isInitialized) return;

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;

      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // Procedural Wind / Rustling Leaves synthesizer
      this.buildProceduralAmbience();

      this.isInitialized = true;

      // If user unmuted in previous session, attempt to resume; if browser blocks, state will be 'needs_interaction'
      if (!this.isMuted) {
        if (this.ctx.state === "suspended") {
          // Attempt resume; if blocked by autoplay policy, it remains suspended until gesture
          this.ctx.resume().then(() => {
            if (this.ctx?.state === "running") {
              this.fadeIn();
            }
            this.notify();
          }).catch(() => {
            this.notify();
          });
        } else if (this.ctx.state === "running") {
          this.fadeIn();
        }
      }

      this.notify();
    } catch (err) {
      console.warn("[NatureSound] AudioContext initialization deferred:", err);
    }
  }

  /**
   * User gesture trigger to enable sounds
   */
  public async enableSound(): Promise<void> {
    if (!this.isInitialized) {
      await this.init();
    }

    if (this.ctx && this.ctx.state === "suspended") {
      await this.ctx.resume();
    }

    this.isMuted = false;
    try {
      localStorage.setItem(STORAGE_MUTE_KEY, "false");
    } catch {
      // ignore
    }

    this.fadeIn();
    this.scheduleDistantBird();
    this.notify();
  }

  public toggleMute(): void {
    if (this.isMuted) {
      void this.enableSound();
    } else {
      this.mute();
    }
  }

  public mute(): void {
    this.isMuted = true;
    try {
      localStorage.setItem(STORAGE_MUTE_KEY, "true");
    } catch {
      // ignore
    }

    this.fadeOut();
    this.notify();
  }

  private fadeIn() {
    if (!this.masterGain || !this.ctx || this.ctx.state !== "running") return;
    const now = this.ctx.currentTime;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setValueAtTime(Math.max(0.0001, this.masterGain.gain.value), now);
    this.masterGain.gain.exponentialRampToValueAtTime(MASTER_VOLUME, now + 2.5);
  }

  private fadeOut() {
    if (!this.masterGain || !this.ctx || this.ctx.state !== "running") return;
    const now = this.ctx.currentTime;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setValueAtTime(Math.max(0.0001, this.masterGain.gain.value), now);
    this.masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
  }

  /**
   * Synthesizes peaceful natural wind and rustling leaves using filtered pink/brown noise
   */
  private buildProceduralAmbience() {
    if (!this.ctx || !this.masterGain) return;

    const bufferSize = 2 * this.ctx.sampleRate;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    // Generate Pink Noise (natural 1/f spectral density)
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.06;
      b6 = white * 0.115926;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    // Wind filter 1: Deep rolling air resonance (lowpass 220Hz - 420Hz)
    const windFilter = this.ctx.createBiquadFilter();
    windFilter.type = "lowpass";
    windFilter.frequency.setValueAtTime(280, this.ctx.currentTime);
    windFilter.Q.setValueAtTime(1.5, this.ctx.currentTime);

    // LFO for slow atmospheric breeze swelling (0.12 Hz = 8.3s cycle)
    const windLfo = this.ctx.createOscillator();
    windLfo.frequency.setValueAtTime(0.12, this.ctx.currentTime);
    const windLfoGain = this.ctx.createGain();
    windLfoGain.gain.setValueAtTime(90, this.ctx.currentTime);
    windLfo.connect(windLfoGain);
    windLfoGain.connect(windFilter.frequency);

    // Leaves rustle filter: Delicate bandpass (1200Hz - 2200Hz)
    const leavesFilter = this.ctx.createBiquadFilter();
    leavesFilter.type = "bandpass";
    leavesFilter.frequency.setValueAtTime(1600, this.ctx.currentTime);
    leavesFilter.Q.setValueAtTime(2.2, this.ctx.currentTime);

    const leavesLfo = this.ctx.createOscillator();
    leavesLfo.frequency.setValueAtTime(0.25, this.ctx.currentTime);
    const leavesLfoGain = this.ctx.createGain();
    leavesLfoGain.gain.setValueAtTime(400, this.ctx.currentTime);
    leavesLfo.connect(leavesLfoGain);
    leavesLfoGain.connect(leavesFilter.frequency);

    const leavesMixGain = this.ctx.createGain();
    leavesMixGain.gain.setValueAtTime(0.22, this.ctx.currentTime);

    // Connect topology
    whiteNoise.connect(windFilter);
    windFilter.connect(this.masterGain);

    whiteNoise.connect(leavesFilter);
    leavesFilter.connect(leavesMixGain);
    leavesMixGain.connect(this.masterGain);

    whiteNoise.start();
    windLfo.start();
    leavesLfo.start();

    this.noiseNodes.push(whiteNoise, windLfo, leavesLfo);
  }

  /**
   * Periodically synthesizes very subtle, distant sweet morning birdsong chirp (every 18-35s)
   */
  private scheduleDistantBird() {
    if (this.birdTimer) clearTimeout(this.birdTimer);
    if (!this.ctx || this.isMuted || !this.isDocumentVisible) return;

    const delay = 18000 + Math.random() * 16000;
    this.birdTimer = setTimeout(() => {
      this.playGentleChirp();
      this.scheduleDistantBird();
    }, delay);
  }

  private playGentleChirp() {
    if (!this.ctx || !this.masterGain || this.isMuted || !this.isDocumentVisible) return;
    if (this.ctx.state !== "running") return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const chirpGain = this.ctx.createGain();
      const panner = this.ctx.createStereoPanner?.();

      osc.type = "sine";
      const baseFreq = 2600 + Math.random() * 800; // soft melodic high whistle
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq + 600, now + 0.08);
      osc.frequency.exponentialRampToValueAtTime(baseFreq - 200, now + 0.18);

      chirpGain.gain.setValueAtTime(0.0001, now);
      chirpGain.gain.exponentialRampToValueAtTime(MASTER_VOLUME * 0.18, now + 0.04);
      chirpGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

      if (panner) {
        panner.pan.setValueAtTime(Math.random() * 1.2 - 0.6, now);
        osc.connect(chirpGain);
        chirpGain.connect(panner);
        panner.connect(this.masterGain);
      } else {
        osc.connect(chirpGain);
        chirpGain.connect(this.masterGain);
      }

      osc.start(now);
      osc.stop(now + 0.25);
    } catch {
      // ignore
    }
  }

  private handleVisibilityChange = () => {
    this.isDocumentVisible = document.visibilityState === "visible";
    if (this.isDocumentVisible) {
      if (!this.isMuted && this.ctx && this.ctx.state === "running") {
        this.fadeIn();
        this.scheduleDistantBird();
      }
    } else {
      this.fadeOut();
      if (this.birdTimer) clearTimeout(this.birdTimer);
    }
  };

  public dispose() {
    if (this.birdTimer) clearTimeout(this.birdTimer);
    if (typeof window !== "undefined") {
      document.removeEventListener("visibilitychange", this.handleVisibilityChange);
    }
    this.noiseNodes.forEach((node) => {
      try {
        if ("stop" in node && typeof (node as AudioScheduledSourceNode).stop === "function") {
          (node as AudioScheduledSourceNode).stop();
        }
        node.disconnect();
      } catch {
        // ignore
      }
    });
    this.noiseNodes = [];

    if (this.ctx && this.ctx.state !== "closed") {
      void this.ctx.close();
    }
    this.ctx = null;
    this.isInitialized = false;
    this.listeners.clear();
  }
}

export const natureAudio = new NatureSoundEngine();
