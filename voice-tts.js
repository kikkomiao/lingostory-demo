export const TTS_MODEL = "Qwen3-TTS-12Hz-1.7B-CustomVoice";
export const TTS_SAMPLE_RATE = 24_000;
export const SHERPA_ONNX_SAMPLE_RATE = 22_050;
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

export function isSherpaOnnxProfile(profile) {
  return profile?.provider === "sherpa-onnx-vits";
}

export function buildSherpaOnnxRequest(text, profile) {
  return {
    provider: "sherpa-onnx-vits",
    voiceId: profile.voiceId,
    text,
  };
}

export function backendTtsErrorMessage(payload, status) {
  const messages = {
    TTS_UNAVAILABLE: "粤语语音服务尚未配置",
    TTS_TIMEOUT: "粤语语音服务响应超时",
    TTS_UPSTREAM_ERROR: "粤语语音服务暂时不可用",
  };
  return messages[payload?.code] || payload?.message || payload?.error || `粤语语音服务暂时不可用（${status}）`;
}

export class WavPcmStreamDecoder {
  constructor({ onPcm, expectedSampleRate = SHERPA_ONNX_SAMPLE_RATE }) {
    this.onPcm = onPcm;
    this.expectedSampleRate = expectedSampleRate;
    this.header = new Uint8Array(0);
    this.ready = false;
    this.pendingPcmByte = null;
  }

  push(data) {
    const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
    if (this.ready) {
      this.emit(bytes);
      return;
    }
    const combined = new Uint8Array(this.header.byteLength + bytes.byteLength);
    combined.set(this.header);
    combined.set(bytes, this.header.byteLength);
    if (combined.byteLength < 44) {
      this.header = combined;
      return;
    }

    const text = (start, length) =>
      String.fromCharCode(...combined.subarray(start, start + length));
    const view = new DataView(combined.buffer, combined.byteOffset, combined.byteLength);
    const channels = view.getUint16(22, true);
    const sampleRate = view.getUint32(24, true);
    const bitsPerSample = view.getUint16(34, true);
    if (
      text(0, 4) !== "RIFF" ||
      text(8, 4) !== "WAVE" ||
      text(36, 4) !== "data" ||
      channels !== 1 ||
      sampleRate !== this.expectedSampleRate ||
      bitsPerSample !== 16
    ) {
      throw new Error("粤语音频格式不受支持");
    }
    this.ready = true;
    this.header = new Uint8Array(0);
    this.emit(combined.subarray(44));
  }

  complete() {
    if (!this.ready) throw new Error("粤语音频数据不完整");
    if (this.pendingPcmByte !== null) throw new Error("粤语 PCM 数据长度无效");
  }

  emit(bytes) {
    if (!bytes.byteLength) return;
    let aligned = bytes;
    if (this.pendingPcmByte !== null) {
      aligned = new Uint8Array(bytes.byteLength + 1);
      aligned[0] = this.pendingPcmByte;
      aligned.set(bytes, 1);
      this.pendingPcmByte = null;
    }
    if (aligned.byteLength % 2) {
      this.pendingPcmByte = aligned[aligned.byteLength - 1];
      aligned = aligned.subarray(0, aligned.byteLength - 1);
    }
    if (!aligned.byteLength) return;
    this.onPcm(
      aligned.buffer.slice(aligned.byteOffset, aligned.byteOffset + aligned.byteLength),
    );
  }
}

export class PcmStartupBuffer {
  constructor({
    onChunk,
    startupMs = TTS_STARTUP_BUFFER_MS,
    sampleRate = TTS_SAMPLE_RATE,
    bytesPerSample = 2,
  }) {
    this.onChunk = onChunk;
    this.thresholdBytes = Math.ceil((startupMs / 1000) * sampleRate * bytesPerSample);
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
