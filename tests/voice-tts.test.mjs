import assert from "node:assert/strict";
import test from "node:test";
import {
  buildTtsSessionConfig,
  buildTtsTextInput,
  buildGptSovitsRequest,
  GPT_SOVITS_SAMPLE_RATE,
  isGptSovitsProfile,
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

test("routes the fixed Mike profile to the backend GPT-SoVITS contract", () => {
  const mikeProfile = {
    provider: "gpt-sovits",
    model: "GPT-SoVITS-v2ProPlus",
    voiceId: "mike-yue-v1",
    language: "Cantonese",
  };
  assert.equal(isGptSovitsProfile(mikeProfile), true);
  assert.equal(isGptSovitsProfile({ provider: "qwen3-tts" }), false);
  assert.deepEqual(buildGptSovitsRequest("好，資料正確。", mikeProfile), {
    provider: "gpt-sovits",
    voiceId: "mike-yue-v1",
    text: "好，資料正確。",
  });
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
test("decodes a split 32 kHz mono PCM WAV stream", () => {
  const header = new ArrayBuffer(44);
  const view = new DataView(header);
  for (const [offset, value] of [[0, "RIFF"], [8, "WAVE"], [36, "data"]]) {
    for (let index = 0; index < value.length; index += 1) {
      view.setUint8(offset + index, value.charCodeAt(index));
    }
  }
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, GPT_SOVITS_SAMPLE_RATE, true);
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
