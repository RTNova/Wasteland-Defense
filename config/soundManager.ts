// Web Audio API Synthesizer for Wasteland Defense
// Self-contained dynamic sound effects and ambient wasteland music without external audio asset dependencies

export interface SoundSettings {
  musicMuted: boolean;
  sfxMuted: boolean;
  musicVolume: number; // 0.0 - 1.0
  sfxVolume: number;   // 0.0 - 1.0
}

const STORAGE_KEY = 'wasteland_defense_sound_settings';

export const DEFAULT_SOUND_SETTINGS: SoundSettings = {
  musicMuted: false,
  sfxMuted: false,
  musicVolume: 0.35,
  sfxVolume: 0.5,
};

class SoundManager {
  private ctx: AudioContext | null = null;
  private settings: SoundSettings = { ...DEFAULT_SOUND_SETTINGS };
  private musicGainNode: GainNode | null = null;
  private sfxGainNode: GainNode | null = null;
  private masterGainNode: GainNode | null = null;
  private isMusicPlaying = false;
  private musicInterval: any = null;
  private currentBassOsc: OscillatorNode | null = null;

  constructor() {
    this.loadSettings();
  }

  public getSettings(): SoundSettings {
    return { ...this.settings };
  }

  public loadSettings(): SoundSettings {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        this.settings = { ...DEFAULT_SOUND_SETTINGS, ...parsed };
      }
    } catch (e) {
      console.error('Failed to load sound settings', e);
      this.settings = { ...DEFAULT_SOUND_SETTINGS };
    }
    return this.getSettings();
  }

  public saveSettings(newSettings: Partial<SoundSettings>): SoundSettings {
    this.settings = { ...this.settings, ...newSettings };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch (e) {
      console.error('Failed to save sound settings', e);
    }
    this.updateGains();
    if (newSettings.musicMuted === false || (newSettings.musicVolume !== undefined && newSettings.musicVolume > 0 && !this.settings.musicMuted)) {
      this.ensureAudioRunning();
    }
    return this.getSettings();
  }

  public ensureAudioRunning() {
    this.initContext();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    if (!this.settings.musicMuted && !this.isMusicPlaying) {
      this.startAmbientMusic();
    }
  }

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();

      this.masterGainNode = this.ctx.createGain();
      this.masterGainNode.connect(this.ctx.destination);

      this.musicGainNode = this.ctx.createGain();
      this.musicGainNode.connect(this.masterGainNode);

      this.sfxGainNode = this.ctx.createGain();
      this.sfxGainNode.connect(this.masterGainNode);

      this.updateGains();
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  private updateGains() {
    if (!this.ctx || !this.musicGainNode || !this.sfxGainNode) return;
    const now = this.ctx.currentTime;

    const targetMusic = this.settings.musicMuted ? 0 : this.settings.musicVolume;
    this.musicGainNode.gain.cancelScheduledValues(now);
    this.musicGainNode.gain.linearRampToValueAtTime(targetMusic, now + 0.1);

    const targetSfx = this.settings.sfxMuted ? 0 : this.settings.sfxVolume;
    this.sfxGainNode.gain.cancelScheduledValues(now);
    this.sfxGainNode.gain.linearRampToValueAtTime(targetSfx, now + 0.05);
  }

  // --- AMBIENT APOCALYPTIC MUSIC ---
  public startAmbientMusic() {
    if (this.isMusicPlaying) return;
    this.initContext();
    if (!this.ctx || !this.musicGainNode) return;

    this.isMusicPlaying = true;
    
    // Post-apocalyptic dark ambient drone generator
    const playDarkPad = () => {
      if (!this.ctx || !this.musicGainNode || !this.isMusicPlaying) return;

      const baseFreqs = [55, 65.4, 73.4, 82.4, 98]; // Low dark drone notes: A1, C2, D2, E2, G2
      const root = baseFreqs[Math.floor(Math.random() * baseFreqs.length)];

      const osc = this.ctx.createOscillator();
      const oscSub = this.ctx.createOscillator();
      const padGain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(root, this.ctx.currentTime);

      oscSub.type = 'sine';
      oscSub.frequency.setValueAtTime(root * 1.5, this.ctx.currentTime); // 5th harmonic

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(220, this.ctx.currentTime);
      filter.Q.setValueAtTime(3, this.ctx.currentTime);

      const dur = 7.0;
      const now = this.ctx.currentTime;
      padGain.gain.setValueAtTime(0, now);
      padGain.gain.linearRampToValueAtTime(0.08, now + 2.0);
      padGain.gain.linearRampToValueAtTime(0, now + dur);

      osc.connect(filter);
      oscSub.connect(filter);
      filter.connect(padGain);
      padGain.connect(this.musicGainNode);

      osc.start(now);
      oscSub.start(now);
      osc.stop(now + dur);
      oscSub.stop(now + dur);
    };

    playDarkPad();
    this.musicInterval = setInterval(() => {
      if (this.isMusicPlaying) {
        playDarkPad();
      }
    }, 4500);
  }

  public stopAmbientMusic() {
    this.isMusicPlaying = false;
    if (this.musicInterval) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
    if (this.currentBassOsc) {
      try {
        this.currentBassOsc.stop();
      } catch (e) {}
      this.currentBassOsc = null;
    }
  }

  // --- SOUND EFFECTS (SFX) ---

  // UI click
  public playClick() {
    if (this.settings.sfxMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGainNode) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.04);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.04);

    osc.connect(gain);
    gain.connect(this.sfxGainNode);

    osc.start(now);
    osc.stop(now + 0.04);
  }

  // Tower placement / build sound
  public playBuild() {
    if (this.settings.sfxMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGainNode) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.15);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    osc.connect(gain);
    gain.connect(this.sfxGainNode);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  // Wave start alarm / horn
  public playWaveStart() {
    if (this.settings.sfxMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGainNode) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.linearRampToValueAtTime(240, now + 0.25);
    osc.frequency.linearRampToValueAtTime(160, now + 0.5);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

    osc.connect(gain);
    gain.connect(this.sfxGainNode);

    osc.start(now);
    osc.stop(now + 0.5);
  }

  // Enemy kill / hit sound - Creamy, velvety ASMR pop & squish sound
  public playEnemyKilled() {
    if (this.settings.sfxMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGainNode) return;

    const now = this.ctx.currentTime;

    // Component 1: Creamy warm water droplet/bubble "pop" (Sine sweeping down smoothly through low-pass warmth)
    const popOsc = this.ctx.createOscillator();
    const popGain = this.ctx.createGain();
    const popFilter = this.ctx.createBiquadFilter();

    popOsc.type = 'sine';
    // Gentle ASMR acoustic pitch curve: starts at a pleasant warm 580Hz and slides down into a velvety 180Hz
    popOsc.frequency.setValueAtTime(580, now);
    popOsc.frequency.exponentialRampToValueAtTime(180, now + 0.08);

    popFilter.type = 'lowpass';
    popFilter.frequency.setValueAtTime(1400, now);
    popFilter.frequency.exponentialRampToValueAtTime(320, now + 0.12);
    popFilter.Q.setValueAtTime(2.5, now); // Creamy acoustic body resonance

    popGain.gain.setValueAtTime(0.001, now);
    popGain.gain.linearRampToValueAtTime(0.35, now + 0.008); // Soft non-click onset
    popGain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

    popOsc.connect(popFilter);
    popFilter.connect(popGain);
    popGain.connect(this.sfxGainNode);

    popOsc.start(now);
    popOsc.stop(now + 0.12);

    // Component 2: Soft sub-bass resonant thud (gives that tactile ASMR "squish/plop" sensation in the ears)
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();

    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(120, now);
    subOsc.frequency.exponentialRampToValueAtTime(45, now + 0.14);

    subGain.gain.setValueAtTime(0.28, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    subOsc.connect(subGain);
    subGain.connect(this.sfxGainNode);

    subOsc.start(now);
    subOsc.stop(now + 0.15);

    // Component 3: Sparkly velvety harmonic overtone for satisfying completion
    const harmonicOsc = this.ctx.createOscillator();
    const harmonicGain = this.ctx.createGain();

    harmonicOsc.type = 'triangle';
    harmonicOsc.frequency.setValueAtTime(880, now + 0.01);
    harmonicOsc.frequency.exponentialRampToValueAtTime(440, now + 0.09);

    harmonicGain.gain.setValueAtTime(0.001, now);
    harmonicGain.gain.linearRampToValueAtTime(0.09, now + 0.015);
    harmonicGain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    harmonicOsc.connect(harmonicGain);
    harmonicGain.connect(this.sfxGainNode);

    harmonicOsc.start(now + 0.01);
    harmonicOsc.stop(now + 0.09);
  }

  // Wave Victory / Debrief fanfare chime
  public playVictory() {
    if (this.settings.sfxMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGainNode) return;

    const now = this.ctx.currentTime;
    const notes = [330, 440, 554, 659]; // E major chord arpeggio
    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      const startTime = now + idx * 0.08;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.18, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);

      osc.connect(gain);
      gain.connect(this.sfxGainNode!);

      osc.start(startTime);
      osc.stop(startTime + 0.35);
    });
  }

  // Achievement Unlocked chime fanfare
  public playAchievementUnlocked() {
    if (this.settings.sfxMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGainNode) return;

    const now = this.ctx.currentTime;
    // Ascending brassy/crystal fanfare chords [C5, E5, G5, C6]
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      const startTime = now + idx * 0.09;

      osc.type = idx === notes.length - 1 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.linearRampToValueAtTime(0.24, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + (idx === notes.length - 1 ? 0.6 : 0.3));

      osc.connect(gain);
      gain.connect(this.sfxGainNode!);

      osc.start(startTime);
      osc.stop(startTime + (idx === notes.length - 1 ? 0.6 : 0.3));
    });
  }
}

export const soundManager = new SoundManager();
