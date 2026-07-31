import {
  cantoneseRecognitionContext,
  cleanTranscript,
  correctCantoneseMtrTranscript,
  targetLanguageConfig,
} from "./transcript.js";
import {
  backendTtsErrorMessage,
  buildTtsSessionConfig,
  buildTtsTextInput,
  buildGptSovitsRequest,
  GPT_SOVITS_SAMPLE_RATE,
  isGptSovitsProfile,
  PcmStartupBuffer,
  TTS_SAMPLE_RATE,
  WavPcmStreamDecoder,
} from "./voice-tts.js";

const config = {
  asrUrl:
    "wss://joiagent.devops.beta.xiaohongshu.com/asr/v1/realtime?model=Qwen3-ASR-1.7B-V2",
  ttsUrl:
    "wss://joiagent.devops.beta.xiaohongshu.com/tts/qwen3cus/v1/audio/speech/stream",
  assetBase: "/vendor/voice/",
  apiBaseUrl: String(window.LINGOSTORY_API_BASE_URL || "").replace(/\/$/, ""),
  ...window.LINGOSTORY_VOICE_CONFIG,
};
const MAX_RECORDING_MS = 30_000;

function floatToPcm16(frame) {
  const bytes = new Uint8Array(frame.length * 2);
  const view = new DataView(bytes.buffer);
  for (let index = 0; index < frame.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, frame[index]));
    view.setInt16(index * 2, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
  }
  return bytes;
}

function bytesToBase64(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

class StreamingAsr {
  constructor(onPartial, onFinal, onError) {
    this.onPartial = onPartial;
    this.onFinal = onFinal;
    this.onError = onError;
    this.targetLanguage = "en";
    this.socket = null;
    this.connecting = null;
    this.samples = [];
    this.utteranceOpen = false;
    this.rawTranscript = "";
    this.recognitionContext = null;
  }

  setLanguage(targetLanguage) {
    const normalized = ["en", "ja", "yue"].includes(targetLanguage)
      ? targetLanguage
      : "en";
    if (normalized === this.targetLanguage) return;
    this.targetLanguage = normalized;
    this.close();
  }

  setRecognitionContext(recognitionContext) {
    this.recognitionContext = recognitionContext;
    if (this.socket?.readyState === WebSocket.OPEN) this.sendSessionUpdate();
  }

  sendSessionUpdate() {
    const language = targetLanguageConfig[this.targetLanguage].providerLanguage;
    this.socket?.send(
      JSON.stringify({
        type: "session.update",
        model: "Qwen3-ASR-1.7B-V2",
        language,
        ...(this.targetLanguage === "yue" && this.recognitionContext
          ? {
              context: this.recognitionContext.context,
              hotwords: this.recognitionContext.hotwords,
            }
          : {}),
      }),
    );
  }

  async connect() {
    if (this.socket?.readyState === WebSocket.OPEN) return;
    if (this.connecting) return this.connecting;
    this.connecting = new Promise((resolve, reject) => {
      const socket = new WebSocket(config.asrUrl);
      this.socket = socket;
      const timeout = setTimeout(() => {
        socket.close();
        reject(new Error("ASR 连接超时"));
      }, 10_000);
      socket.onopen = () => {
        clearTimeout(timeout);
        this.sendSessionUpdate();
        resolve();
      };
      socket.onerror = () => {
        clearTimeout(timeout);
        reject(new Error("ASR WebSocket 连接失败"));
      };
      socket.onclose = () => {
        clearTimeout(timeout);
        if (this.socket === socket) this.socket = null;
        this.connecting = null;
      };
      socket.onmessage = (event) => {
        if (typeof event.data !== "string") return;
        try {
          const message = JSON.parse(event.data);
          if (message.type === "transcription.delta") {
            this.rawTranscript += message.delta || "";
            this.onPartial(cleanTranscript(this.rawTranscript, this.targetLanguage));
          } else if (message.type === "transcription.done") {
            this.utteranceOpen = false;
            const text = cleanTranscript(
              message.text || this.rawTranscript,
              this.targetLanguage,
            );
            this.onFinal(text);
          } else if (message.type === "error") {
            this.onError(new Error(message.message || message.error || "ASR 服务异常"));
          }
        } catch {
          this.onError(new Error("ASR 返回了无法解析的消息"));
        }
      };
    }).finally(() => {
      this.connecting = null;
    });
    return this.connecting;
  }

  begin() {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN || this.utteranceOpen) {
      throw new Error("ASR 尚未就绪");
    }
    this.samples = [];
    this.rawTranscript = "";
    this.utteranceOpen = true;
    this.socket.send(JSON.stringify({ type: "input_audio_buffer.commit" }));
  }

  append(frame) {
    if (!this.utteranceOpen) return;
    for (const sample of frame) this.samples.push(sample);
    while (this.samples.length >= 320) {
      this.sendChunk(new Float32Array(this.samples.splice(0, 320)));
    }
  }

  finish() {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN || !this.utteranceOpen) return;
    if (this.samples.length) this.sendChunk(new Float32Array(this.samples.splice(0)));
    this.socket.send(JSON.stringify({ type: "input_audio_buffer.commit", final: true }));
  }

  close() {
    this.socket?.close();
    this.socket = null;
    this.samples = [];
    this.rawTranscript = "";
    this.utteranceOpen = false;
  }

  sendChunk(chunk) {
    this.socket?.send(
      JSON.stringify({
        type: "input_audio_buffer.append",
        audio: bytesToBase64(floatToPcm16(chunk)),
      }),
    );
  }
}

class PcmPlayer {
  constructor({ sampleRate = TTS_SAMPLE_RATE } = {}) {
    this.sampleRate = sampleRate;
    this.context = null;
    this.nextStart = 0;
    this.sources = new Set();
    this.streamComplete = true;
    this.idleWaiters = [];
    this.startupBuffer = new PcmStartupBuffer({
      sampleRate,
      onChunk: (data) => this.schedule(data),
    });
  }

  async resume() {
    this.context ||= new AudioContext();
    if (this.context.state === "suspended") await this.context.resume();
  }

  enqueue(data) {
    this.startupBuffer.enqueue(data);
  }

  begin() {
    this.streamComplete = false;
  }

  complete() {
    this.startupBuffer.complete();
    this.streamComplete = true;
    this.resolveIdleIfNeeded();
  }

  waitForEnd() {
    if (this.streamComplete && this.sources.size === 0) return Promise.resolve();
    return new Promise((resolve) => this.idleWaiters.push(resolve));
  }

  schedule(data) {
    if (!this.context) return;
    const view = new DataView(data);
    const sampleCount = Math.floor(data.byteLength / 2);
    const buffer = this.context.createBuffer(1, sampleCount, this.sampleRate);
    const channel = buffer.getChannelData(0);
    for (let index = 0; index < sampleCount; index += 1) {
      channel[index] = view.getInt16(index * 2, true) / 0x8000;
    }
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.connect(this.context.destination);
    const startAt = Math.max(this.context.currentTime + 0.025, this.nextStart);
    source.start(startAt);
    this.nextStart = startAt + buffer.duration;
    this.sources.add(source);
    source.onended = () => {
      this.sources.delete(source);
      this.resolveIdleIfNeeded();
    };
  }

  stop() {
    this.startupBuffer.reset();
    for (const source of this.sources) {
      try {
        source.stop();
      } catch {
        // The source has already finished.
      }
    }
    this.sources.clear();
    this.nextStart = this.context?.currentTime || 0;
    this.streamComplete = true;
    this.resolveIdleIfNeeded();
  }

  resolveIdleIfNeeded() {
    if (!this.streamComplete || this.sources.size) return;
    const waiters = this.idleWaiters.splice(0);
    for (const resolve of waiters) resolve();
  }
}

class VoiceController {
  constructor(callbacks) {
    this.callbacks = callbacks;
    this.targetLanguage = "en";
    this.vad = null;
    this.active = false;
    this.recording = false;
    this.speechDetected = false;
    this.recordingTimer = null;
    this.ttsSocket = null;
    this.ttsAbortController = null;
    this.wavAudio = null;
    this.wavUrl = null;
    this.speechGeneration = 0;
    this.player = new PcmPlayer();
    this.gptSovitsPlayer = new PcmPlayer({ sampleRate: GPT_SOVITS_SAMPLE_RATE });
    this.asr = new StreamingAsr(
      callbacks.onPartialTranscript,
      (text) => {
        this.callbacks.onState("ready", "语音输入已就绪");
        this.callbacks.onFinalTranscript(text);
      },
      callbacks.onError,
    );
  }

  setLanguage(targetLanguage) {
    const normalized = ["en", "ja", "yue"].includes(targetLanguage)
      ? targetLanguage
      : "en";
    if (normalized === this.targetLanguage) return;
    if (this.recording) this.finishRecording();
    this.targetLanguage = normalized;
    this.asr.setLanguage(normalized);
    this.callbacks.onState(
      "ready",
      `已切换为${targetLanguageConfig[normalized].displayNameZh}语音输入`,
    );
  }

  setRecognitionContext({ storyId, beatId } = {}) {
    this.storyId = storyId || null;
    this.beatId = beatId || null;
    this.asr.setRecognitionContext(
      cantoneseRecognitionContext(this.storyId, this.beatId),
    );
  }

  async start() {
    if (this.active) return;
    if (!window.vad?.MicVAD) throw new Error("语音检测资源未加载");
    this.callbacks.onState("starting", "正在加载语音输入…");
    await this.player.resume();
    await this.asr.connect();
    const assetBaseUrl = new URL(config.assetBase, window.location.href).href;
    this.vad ||= await window.vad.MicVAD.new({
      model: "v5",
      baseAssetPath: assetBaseUrl,
      onnxWASMBasePath: assetBaseUrl,
      startOnLoad: false,
      positiveSpeechThreshold: 0.6,
      negativeSpeechThreshold: 0.35,
      redemptionMs: 200,
      preSpeechPadMs: 300,
      minSpeechMs: 350,
      onFrameProcessed: (probabilities, frame) => {
        const level = Math.max(0, Math.min(1, probabilities.isSpeech));
        this.callbacks.onLevel(level);
        if (this.recording) this.asr.append(frame);
      },
      onSpeechStart: () => {
        if (this.recording) this.speechDetected = true;
      },
      onSpeechEnd: () => undefined,
      onVADMisfire: () => undefined,
    });
    this.callbacks.onState("starting", "请允许浏览器使用麦克风…");
    await this.vad.start();
    this.active = true;
    this.callbacks.onState("ready", "语音输入已就绪");
  }

  async toggleRecording() {
    if (this.recording) {
      this.finishRecording();
      return;
    }
    try {
      await this.beginRecording();
    } catch (error) {
      this.callbacks.onError(error instanceof Error ? error : new Error(String(error)));
    }
  }

  async beginRecording() {
    if (!this.active) await this.start();
    this.interruptSpeech();
    await this.asr.connect();
    this.speechDetected = false;
    this.recording = true;
    this.asr.begin();
    this.callbacks.onPartialTranscript("");
    this.callbacks.onState("recording", "正在聆听…再次点击麦克风或按空格结束");
    this.recordingTimer = setTimeout(() => this.finishRecording(), MAX_RECORDING_MS);
  }

  finishRecording() {
    if (!this.recording) return;
    if (this.recordingTimer) clearTimeout(this.recordingTimer);
    this.recordingTimer = null;
    this.recording = false;
    this.asr.finish();
    this.callbacks.onState(
      "transcribing",
      this.speechDetected ? "正在识别你的表达…" : "没有检测到清晰语音，正在检查音频…",
    );
  }

  async speak(text, profile, displayName = "NPC") {
    if (!text || !profile?.voiceId) return;
    const generation = ++this.speechGeneration;
    this.interruptSpeech(false);
    if (isGptSovitsProfile(profile)) {
      await this.speakGptSovits(text, profile, displayName, generation);
      return;
    }
    try {
      await this.player.resume();
      this.callbacks.onState("speaking", `${displayName} 正在说话…`);
      await new Promise((resolve, reject) => {
        const socket = new WebSocket(config.ttsUrl);
        socket.binaryType = "arraybuffer";
        this.ttsSocket = socket;
        let completed = false;
        let settled = false;
        const resolveOnce = () => {
          if (settled) return;
          settled = true;
          resolve();
        };
        const rejectOnce = (error) => {
          if (settled) return;
          settled = true;
          this.player.stop();
          reject(error);
        };
        const timeout = setTimeout(() => {
          socket.close();
          rejectOnce(new Error("TTS 连接超时"));
        }, 15_000);
        socket.onopen = () => {
          clearTimeout(timeout);
          if (generation !== this.speechGeneration) {
            socket.close();
            resolveOnce();
            return;
          }
          socket.send(JSON.stringify(buildTtsSessionConfig(
            profile,
            targetLanguageConfig[this.targetLanguage].providerLanguage,
          )));
          socket.send(JSON.stringify(buildTtsTextInput(text)));
          socket.send(JSON.stringify({ type: "input.done" }));
        };
        socket.onmessage = (event) => {
          if (generation !== this.speechGeneration) return;
          if (event.data instanceof ArrayBuffer) {
            this.player.enqueue(event.data);
            return;
          }
          try {
            const message = JSON.parse(String(event.data));
            if (message.type === "session.done") {
              completed = true;
              this.player.complete();
              socket.close();
              this.callbacks.onState("ready", "可以继续说话");
              resolveOnce();
            } else if (message.type === "error") {
              socket.close();
              rejectOnce(new Error(message.message || "TTS 服务异常"));
            }
          } catch {
            socket.close();
            rejectOnce(new Error("TTS 返回了无法解析的消息"));
          }
        };
        socket.onerror = () => rejectOnce(new Error("TTS WebSocket 连接失败"));
        socket.onclose = () => {
          clearTimeout(timeout);
          if (this.ttsSocket === socket) this.ttsSocket = null;
          if (completed || generation !== this.speechGeneration) {
            resolveOnce();
          } else {
            rejectOnce(new Error("TTS 连接意外关闭"));
          }
        };
      });
    } catch (error) {
      this.callbacks.onError(error instanceof Error ? error : new Error(String(error)));
    }
  }

  async speakGptSovits(text, profile, displayName, generation) {
    const controller = new AbortController();
    this.ttsAbortController = controller;
    try {
      await this.gptSovitsPlayer.resume();
      this.gptSovitsPlayer.begin();
      this.callbacks.onState("speaking", `${displayName} 正在生成粤语语音…`);
      const response = await fetch(`${config.apiBaseUrl}/api/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildGptSovitsRequest(text, profile)),
        signal: controller.signal,
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(backendTtsErrorMessage(payload, response.status));
      }
      if (!response.body) throw new Error("粤语语音没有返回音频流");
      let playbackStarted = false;
      const decoder = new WavPcmStreamDecoder({
        onPcm: (pcm) => {
          if (generation !== this.speechGeneration) return;
          if (!playbackStarted) {
            playbackStarted = true;
            this.callbacks.onState("speaking", `${displayName} 正在说话…`);
          }
          this.gptSovitsPlayer.enqueue(pcm);
        },
      });
      const reader = response.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (generation !== this.speechGeneration) {
          await reader.cancel();
          return;
        }
        if (value?.byteLength) decoder.push(value);
      }
      decoder.complete();
      this.gptSovitsPlayer.complete();
      await this.gptSovitsPlayer.waitForEnd();
      if (generation === this.speechGeneration) {
        this.callbacks.onState("ready", "可以继续说话");
      }
    } catch (error) {
      if (controller.signal.aborted || generation !== this.speechGeneration) return;
      this.gptSovitsPlayer.stop();
      this.callbacks.onError(
        new Error(
          `${error instanceof Error ? error.message : String(error)}；粤语语音已跳过`,
        ),
      );
    } finally {
      if (this.ttsAbortController === controller) this.ttsAbortController = null;
      if (this.wavAudio && this.wavAudio.ended) this.wavAudio = null;
      if (this.wavUrl && (!this.wavAudio || this.wavAudio.ended)) {
        URL.revokeObjectURL(this.wavUrl);
        this.wavUrl = null;
      }
    }
  }

  interruptSpeech(incrementGeneration = true) {
    if (incrementGeneration) this.speechGeneration += 1;
    this.ttsSocket?.close();
    this.ttsSocket = null;
    this.ttsAbortController?.abort();
    this.ttsAbortController = null;
    if (this.wavAudio) {
      this.wavAudio.pause();
      this.wavAudio.removeAttribute("src");
      this.wavAudio.load();
      this.wavAudio = null;
    }
    if (this.wavUrl) {
      URL.revokeObjectURL(this.wavUrl);
      this.wavUrl = null;
    }
    this.player.stop();
    this.gptSovitsPlayer.stop();
  }
}

const micButton = document.getElementById("micBtn");
const wave = document.getElementById("wave");
const transcript = document.getElementById("transcript");
const transcriptBox = document.getElementById("transcriptBox");
const voiceStatus = document.getElementById("voiceStatus");
let rawPartial = "";

function setVoiceState(state, message) {
  if (!voiceStatus || !micButton) return;
  voiceStatus.textContent = message;
  micButton.dataset.voiceState = state;
  const recording = state === "recording";
  micButton.classList.toggle("listening", recording);
  wave?.classList.toggle("active", recording);
  transcriptBox?.classList.toggle(
    "processing",
    ["starting", "recording", "transcribing"].includes(state),
  );
  micButton.setAttribute("aria-label", recording ? "结束录音" : "开始语音输入");
}

const voice = new VoiceController({
  onState: setVoiceState,
  onLevel: (level) => wave?.style.setProperty("--voice-level", String(Math.max(0.08, level))),
  onPartialTranscript: (text) => {
    rawPartial = text;
    if (transcript) transcript.textContent = text || "正在识别…";
  },
  onFinalTranscript: async (text) => {
    const rawFinalText = text || rawPartial;
    const finalText = correctCantoneseMtrTranscript(
      rawFinalText,
      voice.storyId,
      voice.beatId,
    );
    rawPartial = "";
    const languageName = targetLanguageConfig[voice.targetLanguage].displayNameZh;
    if (transcript) transcript.textContent = finalText || `（没有识别到有效的${languageName}表达）`;
    transcriptBox?.classList.remove("processing");
    if (!finalText) {
      setVoiceState("ready", `没有识别到${languageName}，请再试一次`);
      return;
    }
    if (typeof window.submitLiveTurn === "function") {
      setVoiceState("thinking", "AI 正在理解你的意思并推进剧情…");
      await window.submitLiveTurn(finalText, null, "voice");
    }
  },
  onError: (error) => {
    console.error("[voice]", error);
    setVoiceState("error", `${error.message}；仍可使用文本输入`);
    transcriptBox?.classList.remove("processing");
  },
});

window.addEventListener("lingostory:npc-reply", (event) => {
  const detail = event.detail || {};
  void voice.speak(detail.text, detail.voiceProfile, detail.displayName || "NPC");
});
window.addEventListener("beforeunload", () => voice.interruptSpeech());
window.lingostoryVoice = voice;
