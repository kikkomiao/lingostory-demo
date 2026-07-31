(function () {
  "use strict";

  const config = {
    asrUrl:
      "wss://joiagent.devops.beta.xiaohongshu.com/asr/v1/realtime?model=Qwen3-ASR-1.7B-V2",
    ttsUrl:
      "wss://joiagent.devops.beta.xiaohongshu.com/tts/qwen3cus/v1/audio/speech/stream",
    assetBase: "/vendor/voice/",
    ...window.LINGOSTORY_VOICE_CONFIG,
  };
  const MAX_RECORDING_MS = 30000;
  const LANGUAGE_NAMES = [
    "English",
    "Chinese",
    "Mandarin",
    "Cantonese",
    "Japanese",
    "Korean",
    "French",
    "German",
    "Spanish",
    "Italian",
    "Portuguese",
    "Russian",
    "Arabic",
    "Hindi",
  ];
  const LANGUAGE_ALTERNATION = LANGUAGE_NAMES.join("|");
  const CONTROL_TOKEN = /<\|?[^>]+\|?>/g;
  const CJK_CHARACTER = /[\u3040-\u30ff\u3400-\u9fff\uf900-\ufaff]/g;
  const LATIN_CHARACTER = /[A-Za-zÀ-ÖØ-öø-ÿ]/g;

  function normalizeLanguageMarkers(value) {
    return String(value || "")
      .replace(
        new RegExp(`<\\|?language\\|?>\\s*(${LANGUAGE_ALTERNATION})`, "gi"),
        "\n__ASR_LANGUAGE__$1\n",
      )
      .replace(
        new RegExp(`(?:^|[\\s|,;])language\\s*[:=]?\\s*(${LANGUAGE_ALTERNATION})`, "gi"),
        "\n__ASR_LANGUAGE__$1\n",
      );
  }

  function normalizeText(value) {
    return String(value || "")
      .replace(CONTROL_TOKEN, " ")
      .replace(/<\/?asr_text>/gi, " ")
      .replace(/\s+/g, " ")
      .replace(/\s+([,.!?;:])/g, "$1")
      .trim();
  }

  function isPlausiblyEnglish(value) {
    const latinCount = value.match(LATIN_CHARACTER)?.length || 0;
    const cjkCount = value.match(CJK_CHARACTER)?.length || 0;
    return latinCount > 0 && cjkCount === 0;
  }

  function cleanEnglishTranscript(value) {
    const normalized = normalizeLanguageMarkers(value);
    const markerPattern = new RegExp(`__ASR_LANGUAGE__(${LANGUAGE_ALTERNATION})`, "gi");
    const markers = [...normalized.matchAll(markerPattern)];
    if (!markers.length) {
      const text = normalizeText(normalized);
      return isPlausiblyEnglish(text) ? text : "";
    }

    const englishSegments = [];
    for (let index = 0; index < markers.length; index += 1) {
      const marker = markers[index];
      const start = (marker.index || 0) + marker[0].length;
      const end = markers[index + 1]?.index ?? normalized.length;
      if (marker[1].toLowerCase() !== "english") continue;
      const text = normalizeText(normalized.slice(start, end));
      if (text && isPlausiblyEnglish(text)) englishSegments.push(text);
    }
    return englishSegments.join(" ").trim();
  }

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
      this.socket = null;
      this.connecting = null;
      this.samples = [];
      this.utteranceOpen = false;
      this.rawTranscript = "";
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
        }, 10000);
        socket.onopen = () => {
          clearTimeout(timeout);
          socket.send(
            JSON.stringify({
              type: "session.update",
              model: "Qwen3-ASR-1.7B-V2",
              language: "English",
            }),
          );
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
              this.onPartial(cleanEnglishTranscript(this.rawTranscript));
            } else if (message.type === "transcription.done") {
              this.utteranceOpen = false;
              const finalText = cleanEnglishTranscript(message.text || this.rawTranscript);
              this.onFinal(finalText);
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
    constructor() {
      this.context = null;
      this.nextStart = 0;
      this.sources = new Set();
    }

    async resume() {
      this.context ||= new (window.AudioContext || window.webkitAudioContext)();
      if (this.context.state === "suspended") await this.context.resume();
    }

    enqueue(data) {
      if (!this.context) return;
      const view = new DataView(data);
      const sampleCount = Math.floor(data.byteLength / 2);
      if (!sampleCount) return;
      const buffer = this.context.createBuffer(1, sampleCount, 24000);
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
      source.onended = () => this.sources.delete(source);
    }

    stop() {
      for (const source of this.sources) {
        try {
          source.stop();
        } catch {
          // The source already ended.
        }
      }
      this.sources.clear();
      this.nextStart = this.context?.currentTime || 0;
    }
  }

  class VoiceController {
    constructor(callbacks) {
      this.callbacks = callbacks;
      this.vad = null;
      this.active = false;
      this.recording = false;
      this.speechDetected = false;
      this.recordingTimer = null;
      this.ttsSocket = null;
      this.speechGeneration = 0;
      this.player = new PcmPlayer();
      this.asr = new StreamingAsr(
        callbacks.onPartialTranscript,
        (text) => {
          this.callbacks.onState("ready", "语音已就绪");
          this.callbacks.onFinalTranscript(text);
        },
        callbacks.onError,
      );
    }

    get isRecording() {
      return this.recording;
    }

    async start() {
      if (this.active) return;
      this.callbacks.onState("starting", "正在加载语音输入…");
      if (!window.vad?.MicVAD || !window.ort) {
        throw new Error("VAD 资源未加载，请刷新页面重试");
      }
      await this.player.resume();
      await this.asr.connect();
      this.callbacks.onState("starting", "请允许浏览器使用麦克风…");
      this.vad ||= await window.vad.MicVAD.new({
        model: "v5",
        baseAssetPath: config.assetBase,
        onnxWASMBasePath: config.assetBase,
        startOnLoad: false,
        positiveSpeechThreshold: 0.6,
        negativeSpeechThreshold: 0.35,
        redemptionMs: 200,
        preSpeechPadMs: 300,
        minSpeechMs: 350,
        onFrameProcessed: (probabilities, frame) => {
          this.callbacks.onLevel(Math.max(0, Math.min(1, probabilities.isSpeech)));
          if (this.recording) this.asr.append(frame);
        },
        onSpeechStart: () => {
          if (this.recording) this.speechDetected = true;
        },
        onSpeechEnd: () => undefined,
        onVADMisfire: () => undefined,
      });
      await this.vad.start();
      this.active = true;
      this.callbacks.onState("ready", "语音已就绪");
    }

    async beginRecording() {
      if (!this.active) await this.start();
      if (this.recording) return;
      this.interruptSpeech();
      await this.asr.connect();
      this.speechDetected = false;
      this.recording = true;
      this.asr.begin();
      this.callbacks.onPartialTranscript("");
      this.callbacks.onState("recording", "正在聆听…再次点击结束");
      this.recordingTimer = setTimeout(() => this.finishRecording(), MAX_RECORDING_MS);
    }

    finishRecording() {
      if (!this.recording) return;
      clearTimeout(this.recordingTimer);
      this.recordingTimer = null;
      this.recording = false;
      this.asr.finish();
      this.callbacks.onState(
        "transcribing",
        this.speechDetected ? "正在完成语音转写…" : "未检测到清晰语音，正在检查…",
      );
    }

    async speak(text, profile, displayName = "NPC") {
      if (!text || document.getElementById("soundBtn")?.textContent === "×") return;
      const generation = ++this.speechGeneration;
      this.interruptSpeech(false);
      await this.player.resume();
      this.callbacks.onState("speaking", `${displayName} 正在说话…`);
      await new Promise((resolve, reject) => {
        const socket = new WebSocket(config.ttsUrl);
        socket.binaryType = "arraybuffer";
        this.ttsSocket = socket;
        const timeout = setTimeout(() => reject(new Error("TTS 连接超时")), 15000);
        socket.onopen = () => {
          clearTimeout(timeout);
          if (generation !== this.speechGeneration) {
            socket.close();
            resolve();
            return;
          }
          socket.send(
            JSON.stringify({
              type: "session.config",
              model: profile.model || "Qwen3-TTS-12Hz-1.7B-CustomVoice",
              voice: profile.voiceId || "vivian",
              task_type: "CustomVoice",
              language: profile.language || "English",
              response_format: "pcm",
              stream_audio: true,
              split_granularity: "sentence",
              max_new_tokens: 1024,
            }),
          );
          socket.send(JSON.stringify({ type: "input.text", text }));
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
              socket.close();
              this.callbacks.onState("ready", "可以继续说话");
              resolve();
            } else if (message.type === "error") {
              reject(new Error(message.message || "TTS 服务异常"));
            }
          } catch {
            reject(new Error("TTS 返回了无法解析的消息"));
          }
        };
        socket.onerror = () => reject(new Error("TTS WebSocket 连接失败"));
        socket.onclose = () => {
          clearTimeout(timeout);
          if (this.ttsSocket === socket) this.ttsSocket = null;
          resolve();
        };
      }).catch((error) => this.callbacks.onError(error instanceof Error ? error : new Error(String(error))));
    }

    interruptSpeech(incrementGeneration = true) {
      if (incrementGeneration) this.speechGeneration += 1;
      this.ttsSocket?.close();
      this.ttsSocket = null;
      this.player.stop();
    }
  }

  const micButton = document.getElementById("micBtn");
  const wave = document.getElementById("wave");
  const transcript = document.getElementById("transcript");
  const transcriptBox = document.getElementById("transcriptBox");
  const voiceStatus = document.getElementById("voiceStatus");
  let rawPartial = "";

  function setVoiceState(state, message) {
    voiceStatus.textContent = message;
    micButton.dataset.voiceState = state;
    const active = state === "recording";
    micButton.classList.toggle("listening", active);
    wave.classList.toggle("active", active);
    transcriptBox.classList.toggle("processing", ["starting", "recording", "transcribing"].includes(state));
    micButton.setAttribute("aria-label", active ? "结束录音" : "开始语音输入");
  }

  const voice = new VoiceController({
    onState: setVoiceState,
    onLevel: (level) => {
      wave.style.setProperty("--voice-level", String(Math.max(0.08, level)));
    },
    onPartialTranscript: (text) => {
      rawPartial = text;
      transcript.textContent = text || "正在识别…";
    },
    onFinalTranscript: async (text) => {
      const finalText = text || rawPartial;
      rawPartial = "";
      transcript.textContent = finalText || "（没有识别到有效的英文表达）";
      transcriptBox.classList.remove("processing");
      if (!finalText) {
        setVoiceState("ready", "没有识别到英文，请再试一次");
        return;
      }
      if (typeof appMode !== "undefined" && appMode === "live") {
        setVoiceState("thinking", "AI 正在理解你的意思并推进剧情…");
        await submitLiveTurn(finalText);
      } else if (typeof choosePath === "function" && typeof round !== "undefined" && round >= 0) {
        choosePath("good", false, finalText);
      } else {
        setVoiceState("ready", "语音识别成功；开始剧情后即可提交");
      }
    },
    onError: (error) => {
      console.error("[voice]", error);
      setVoiceState("error", `${error.message}；仍可使用文本输入`);
      transcriptBox.classList.remove("processing");
    },
  });

  micButton.addEventListener(
    "click",
    async (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (typeof submittingTurn !== "undefined" && submittingTurn) return;
      try {
        if (voice.isRecording) voice.finishRecording();
        else await voice.beginRecording();
      } catch (error) {
        const normalized = error instanceof Error ? error : new Error(String(error));
        setVoiceState("error", `${normalized.message}；仍可使用文本输入`);
      }
    },
    true,
  );

  document.addEventListener(
    "keydown",
    (event) => {
      const editing = event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement;
      if (editing || event.code !== "Space") return;
      event.preventDefault();
      event.stopImmediatePropagation();
      micButton.click();
    },
    true,
  );

  window.addEventListener("lingostory:npc-reply", (event) => {
    const detail = event.detail || {};
    const fallbackVoices = {
      cyrus: "ryan",
      kate: "vivian",
      mike: "aiden",
      mary: "serena",
      cassie: "vivian",
    };
    const profile = {
      model: "Qwen3-TTS-12Hz-1.7B-CustomVoice",
      voiceId: fallbackVoices[detail.npcId] || "vivian",
      language: "English",
      ...detail.voiceProfile,
    };
    void voice.speak(detail.text, profile, detail.displayName || "NPC");
  });

  document.getElementById("soundBtn")?.addEventListener("click", (event) => {
    if (event.currentTarget.textContent === "×") voice.interruptSpeech();
  });

  window.addEventListener("beforeunload", () => voice.interruptSpeech());
  window.lingostoryVoice = voice;
  window.cleanEnglishTranscript = cleanEnglishTranscript;
})();
