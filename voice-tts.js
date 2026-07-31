export const TTS_MODEL = "Qwen3-TTS-12Hz-1.7B-CustomVoice";
export const TTS_SAMPLE_RATE = 24_000;
export const TTS_STARTUP_BUFFER_MS = 400;

export function buildTtsSessionConfig(profile, fallbackLanguage) {
  return {
    type: "session.config",
    model: profile.model || TTS_MODEL,
    voice: profile.voiceId,
    task_type: "CustomVoice",
    language: profile.language || fallbackLanguage,
    response_format: "pcm",
    stream_audio: true,
    max_new_tokens: 1024,
  };
}

export function buildTtsTextInput(text) {
  return { type: "input.text", text };
}

export class PcmStartupBuffer {
  constructor({ onChunk, startupMs = TTS_STARTUP_BUFFER_MS, sampleRate = TTS_SAMPLE_RATE }) {
    this.onChunk = onChunk;
    this.thresholdBytes = Math.ceil((startupMs / 1000) * sampleRate * 2);
    this.pending = [];
    this.pendingBytes = 0;
    this.started = false;
  }

  enqueue(data) {
    if (this.started) {
      this.onChunk(data);
      return;
    }
    this.pending.push(data);
    this.pendingBytes += data.byteLength;
    if (this.pendingBytes >= this.thresholdBytes) this.flush();
  }

  complete() {
    this.flush();
  }

  reset() {
    this.pending = [];
    this.pendingBytes = 0;
    this.started = false;
  }

  flush() {
    if (this.started || !this.pending.length) return;
    this.started = true;
    const chunks = this.pending;
    this.pending = [];
    this.pendingBytes = 0;
    for (const chunk of chunks) this.onChunk(chunk);
  }
}
