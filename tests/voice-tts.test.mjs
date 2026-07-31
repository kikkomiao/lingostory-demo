import assert from "node:assert/strict";
import test from "node:test";
import {
  backendTtsErrorMessage,
  buildTtsSessionConfig,
  buildTtsTextInput,
  buildSherpaOnnxRequest,
  SHERPA_ONNX_SAMPLE_RATE,
  isSherpaOnnxProfile,
  PcmStartupBuffer,
  WavPcmStreamDecoder,
} from "../voice-tts.js";

const profile = {
  model: "Qwen3-TTS-12Hz-1.7B-CustomVoice",
  voiceId: "vivian",
  language: "English",
  gender: "female",
  style: "Highly dramatic, with laughter",
  instruct: "Add laughter",
  emotion: "excited",
  speed: 1.5,
  split_granularity: "sentence",
};

test("builds the verified minimal TTS session configuration", () => {
  assert.deepEqual(buildTtsSessionConfig(profile, "Japanese"), {
    type: "session.config",
    model: "Qwen3-TTS-12Hz-1.7B-CustomVoice",
    voice: "vivian",
    task_type: "CustomVoice",
    language: "English",
    response_format: "pcm",
    stream_audio: true,
    max_new_tokens: 1024,
  });
});

test("preserves source text byte-for-byte in the TTS input message", () => {
  const text = "  Wait—room 204 is ready at 10:30.\n次はどうしますか。  ";
  assert.deepEqual(buildTtsTextInput(text), { type: "input.text", text });
});

test("routes the fixed Mary profile to the backend Sherpa contract", () => {
  const maryProfile = {
    provider: "sherpa-onnx-vits",
    model: "vits-cantonese-hf-xiaomaiiwn",
    voiceId: "mary-yue-v1",
    language: "Cantonese",
  };
  assert.equal(isSherpaOnnxProfile(maryProfile), true);
  assert.equal(isSherpaOnnxProfile({ provider: "qwen3-tts" }), false);
  assert.deepEqual(buildSherpaOnnxRequest("好，你想由天后站去中環。", maryProfile, "confirm_central"), {
    provider: "sherpa-onnx-vits",
    voiceId: "mary-yue-v1",
    actionId: "confirm_central",
    text: "好，你想由天后站去中環。",
  });
});

test("localizes backend Cantonese TTS errors", () => {
  assert.equal(
    backendTtsErrorMessage({ code: "TTS_UNAVAILABLE", error: "Cantonese voice is not configured" }, 503),
    "粤语语音服务尚未配置",
  );
  assert.equal(backendTtsErrorMessage({ code: "TTS_TIMEOUT" }, 504), "粤语语音服务响应超时");
  assert.equal(backendTtsErrorMessage({}, 503), "粤语语音服务暂时不可用（503）");
});

test("waits for 400ms of PCM before starting and streams later chunks", () => {
  const played = [];
  const buffer = new PcmStartupBuffer({ onChunk: (chunk) => played.push(chunk) });
  const first = new ArrayBuffer(10_000);
  const second = new ArrayBuffer(9_200);
  const third = new ArrayBuffer(100);
  buffer.enqueue(first);
  assert.deepEqual(played, []);
  buffer.enqueue(second);
  assert.deepEqual(played, [first, second]);
  buffer.enqueue(third);
  assert.deepEqual(played, [first, second, third]);
});

test("plays a short response only when the TTS session completes", () => {
  const played = [];
  const buffer = new PcmStartupBuffer({ onChunk: (chunk) => played.push(chunk) });
  const short = new ArrayBuffer(2_000);
  buffer.enqueue(short);
  assert.deepEqual(played, []);
  buffer.complete();
  assert.deepEqual(played, [short]);
});

test("drops pending PCM on interruption or failure", () => {
  const played = [];
  const buffer = new PcmStartupBuffer({ onChunk: (chunk) => played.push(chunk) });
  buffer.enqueue(new ArrayBuffer(2_000));
  buffer.reset();
  buffer.complete();
  assert.deepEqual(played, []);
});
test("decodes a split 22.05 kHz mono PCM WAV stream", () => {
  const header = new ArrayBuffer(44);
  const view = new DataView(header);
  for (const [offset, value] of [[0, "RIFF"], [8, "WAVE"], [36, "data"]]) {
    for (let index = 0; index < value.length; index += 1) {
      view.setUint8(offset + index, value.charCodeAt(index));
    }
  }
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, SHERPA_ONNX_SAMPLE_RATE, true);
  view.setUint16(34, 16, true);
  const pcm = new Uint8Array([1, 2, 3, 4, 5]);
  const combined = new Uint8Array(49);
  combined.set(new Uint8Array(header));
  combined.set(pcm, 44);
  const decoded = [];
  const decoder = new WavPcmStreamDecoder({ onPcm: (chunk) => decoded.push(...new Uint8Array(chunk)) });
  decoder.push(combined.subarray(0, 17));
  decoder.push(combined.subarray(17));
  decoder.push(new Uint8Array([6, 7, 8]));
  decoder.complete();
  assert.deepEqual(decoded, [1, 2, 3, 4, 5, 6, 7, 8]);
});
