/**
 * Life_OS v2 — Ambient sound engine.
 *
 * Generates rain, ocean, wind, and forest sounds procedurally using the
 * Web Audio API. No audio files needed — everything is synthesized in
 * real-time. Also supports playing user-provided music files from
 * /assets/audio/music/meditation/ and /assets/audio/music/focus/.
 */
"use client";

let audioCtx: AudioContext | null = null;
const activeNodes: Map<string, { stop: () => void }> = new Map();

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    } catch {
      return null;
    }
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

// ─── White/pink/brown noise generators ──────────────────────────────────────

function createNoiseBuffer(ctx: AudioContext, type: "white" | "pink" | "brown"): AudioBuffer {
  const bufferSize = ctx.sampleRate * 2;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  if (type === "white") {
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
  } else if (type === "pink") {
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }
  } else {
    // brown
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = data[i];
      data[i] *= 3.5;
    }
  }

  return buffer;
}

// ─── Sound generators ────────────────────────────────────────────────────────

export type AmbientSound = "rain" | "ocean" | "wind" | "forest" | "whitenoise" | "brownnoise";

export const AMBIENT_SOUNDS: { id: AmbientSound; label: string; icon: string }[] = [
  { id: "rain",       label: "Rain",        icon: "🌧️" },
  { id: "ocean",      label: "Ocean",       icon: "🌊" },
  { id: "wind",       label: "Wind",        icon: "🍃" },
  { id: "forest",     label: "Forest",      icon: "🌲" },
  { id: "whitenoise", label: "White Noise", icon: "📻" },
  { id: "brownnoise", label: "Brown Noise", icon: "🔊" },
];

export function playAmbient(sound: AmbientSound, volume: number = 0.5): void {
  const ctx = getCtx();
  if (!ctx) return;

  // Stop if already playing
  stopAmbient(sound);

  const gainNode = ctx.createGain();
  gainNode.gain.value = volume;
  gainNode.connect(ctx.destination);

  let source: AudioBufferSourceNode | AudioNode;
  let lfo: OscillatorNode | null = null;

  if (sound === "rain") {
    // Pink noise + high-pass filter for rain sound
    const buffer = createNoiseBuffer(ctx, "pink");
    source = ctx.createBufferSource();
    (source as AudioBufferSourceNode).buffer = buffer;
    (source as AudioBufferSourceNode).loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = 800;
    source.connect(filter);
    filter.connect(gainNode);
    (source as AudioBufferSourceNode).start();
  } else if (sound === "ocean") {
    // Brown noise + LFO modulating gain for ocean wave effect
    const buffer = createNoiseBuffer(ctx, "brown");
    source = ctx.createBufferSource();
    (source as AudioBufferSourceNode).buffer = buffer;
    (source as AudioBufferSourceNode).loop = true;
    const waveGain = ctx.createGain();
    waveGain.gain.value = 0.3;
    source.connect(waveGain);
    waveGain.connect(gainNode);
    // LFO for wave swells
    lfo = ctx.createOscillator();
    lfo.frequency.value = 0.1; // slow wave
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.4;
    lfo.connect(lfoGain);
    lfoGain.connect(waveGain.gain);
    lfo.start();
    (source as AudioBufferSourceNode).start();
  } else if (sound === "wind") {
    // Brown noise + bandpass filter with slow LFO for wind
    const buffer = createNoiseBuffer(ctx, "brown");
    source = ctx.createBufferSource();
    (source as AudioBufferSourceNode).buffer = buffer;
    (source as AudioBufferSourceNode).loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 400;
    filter.Q.value = 0.5;
    source.connect(filter);
    filter.connect(gainNode);
    // LFO for wind gusts
    lfo = ctx.createOscillator();
    lfo.frequency.value = 0.15;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 200;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start();
    (source as AudioBufferSourceNode).start();
  } else if (sound === "forest") {
    // White noise + bandpass for "leaves" + occasional bird chirps
    const buffer = createNoiseBuffer(ctx, "white");
    source = ctx.createBufferSource();
    (source as AudioBufferSourceNode).buffer = buffer;
    (source as AudioBufferSourceNode).loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 2000;
    filter.Q.value = 0.3;
    source.connect(filter);
    filter.connect(gainNode);
    (source as AudioBufferSourceNode).start();
    // Bird chirps every ~8 seconds
    const chirpInterval = setInterval(() => {
      if (!activeNodes.has(sound)) return;
      const osc = ctx.createOscillator();
      const chirpGain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 2000 + Math.random() * 1500;
      chirpGain.gain.value = 0.05;
      osc.connect(chirpGain);
      chirpGain.connect(ctx.destination);
      const t = ctx.currentTime;
      chirpGain.gain.setValueAtTime(0, t);
      chirpGain.gain.linearRampToValueAtTime(0.05, t + 0.05);
      chirpGain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      osc.start(t);
      osc.stop(t + 0.2);
    }, 6000 + Math.random() * 4000);
    activeNodes.set(sound + "_chirps", { stop: () => clearInterval(chirpInterval) });
  } else if (sound === "whitenoise") {
    const buffer = createNoiseBuffer(ctx, "white");
    source = ctx.createBufferSource();
    (source as AudioBufferSourceNode).buffer = buffer;
    (source as AudioBufferSourceNode).loop = true;
    source.connect(gainNode);
    (source as AudioBufferSourceNode).start();
  } else {
    // brownnoise
    const buffer = createNoiseBuffer(ctx, "brown");
    source = ctx.createBufferSource();
    (source as AudioBufferSourceNode).buffer = buffer;
    (source as AudioBufferSourceNode).loop = true;
    source.connect(gainNode);
    (source as AudioBufferSourceNode).start();
  }

  activeNodes.set(sound, {
    stop: () => {
      try {
        if (source instanceof AudioBufferSourceNode) {
          source.stop();
        }
        if (lfo) lfo.stop();
        gainNode.disconnect();
      } catch {
        // already stopped
      }
    },
  });
}

export function stopAmbient(sound: AmbientSound): void {
  const node = activeNodes.get(sound);
  if (node) {
    node.stop();
    activeNodes.delete(sound);
  }
  // Also stop any chirp intervals
  const chirps = activeNodes.get(sound + "_chirps");
  if (chirps) {
    chirps.stop();
    activeNodes.delete(sound + "_chirps");
  }
}

export function stopAllAmbient(): void {
  for (const [, node] of activeNodes) {
    node.stop();
  }
  activeNodes.clear();
}

export function isAmbientPlaying(sound: AmbientSound): boolean {
  return activeNodes.has(sound);
}

export function getActiveSounds(): AmbientSound[] {
  return Array.from(activeNodes.keys()).filter((k) => !k.endsWith("_chirps")) as AmbientSound[];
}

// ─── Music file player ──────────────────────────────────────────────────────

let musicAudio: HTMLAudioElement | null = null;

export function playMusic(path: string, volume: number = 0.3): void {
  if (!musicAudio) {
    musicAudio = new Audio();
    musicAudio.loop = true;
  }
  musicAudio.src = path;
  musicAudio.volume = volume;
  musicAudio.play().catch(() => {
    // Autoplay blocked — user needs to interact first
  });
}

export function stopMusic(): void {
  if (musicAudio) {
    musicAudio.pause();
    musicAudio.currentTime = 0;
  }
}

export function setMusicVolume(volume: number): void {
  if (musicAudio) musicAudio.volume = volume;
}
