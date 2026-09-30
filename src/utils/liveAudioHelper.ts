/**
 * Audio processing utilities for Gemini Live API (gemini-3.8-live)
 * - Converts microphone audio (Float32Array) to 16kHz 16-bit PCM little-endian Base64
 * - Decodes 24kHz 16-bit PCM Base64 to AudioBuffer
 * - Schedules gapless audio streaming playback with instant interruption handling
 */

/**
 * Converts a Float32Array channel buffer to a 16-bit PCM (little-endian) Base64 string
 */
export function float32ToPcmBase64(input: Float32Array): string {
  const buffer = new ArrayBuffer(input.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true); // true = little-endian
  }
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Decodes 16-bit PCM little-endian Base64 audio into an AudioBuffer at the specified sample rate (default: 24kHz)
 */
export function pcmBase64ToAudioBuffer(
  ctx: AudioContext,
  base64Pcm: string,
  sampleRate = 24000
): AudioBuffer {
  const binary = atob(base64Pcm);
  const len = binary.length;
  const numSamples = Math.floor(len / 2);
  const audioBuffer = ctx.createBuffer(1, numSamples, sampleRate);
  const channelData = audioBuffer.getChannelData(0);
  const buffer = new ArrayBuffer(len);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const dataView = new DataView(buffer);
  for (let i = 0; i < numSamples; i++) {
    const int16 = dataView.getInt16(i * 2, true); // little-endian
    channelData[i] = int16 < 0 ? int16 / 0x8000 : int16 / 0x7fff;
  }
  return audioBuffer;
}

/**
 * Live audio streaming player with gapless queue scheduling and interruption handling
 */
export class LiveAudioPlayer {
  private ctx: AudioContext | null = null;
  private nextStartTime = 0;
  private activeSources: AudioBufferSourceNode[] = [];
  private sampleRate: number;

  constructor(sampleRate = 24000) {
    this.sampleRate = sampleRate;
  }

  public getContext(): AudioContext {
    if (!this.ctx || this.ctx.state === 'closed') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx({ sampleRate: this.sampleRate });
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public playChunk(base64Pcm: string, onEnded?: () => void) {
    try {
      const ctx = this.getContext();
      const buffer = pcmBase64ToAudioBuffer(ctx, base64Pcm, this.sampleRate);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);

      const now = ctx.currentTime;
      if (this.nextStartTime < now) {
        this.nextStartTime = now;
      }

      source.start(this.nextStartTime);
      this.nextStartTime += buffer.duration;
      this.activeSources.push(source);

      source.onended = () => {
        this.activeSources = this.activeSources.filter((s) => s !== source);
        onEnded?.();
      };
    } catch (err) {
      console.error('[LiveAudioPlayer] Error playing audio chunk:', err);
    }
  }

  /**
   * Immediately stops all currently playing and queued audio (called on interruption)
   */
  public stopAll() {
    for (const src of this.activeSources) {
      try {
        src.stop();
        src.disconnect();
      } catch {}
    }
    this.activeSources = [];
    if (this.ctx) {
      this.nextStartTime = this.ctx.currentTime;
    }
  }

  public close() {
    this.stopAll();
    if (this.ctx && this.ctx.state !== 'closed') {
      this.ctx.close();
    }
    this.ctx = null;
  }
}
