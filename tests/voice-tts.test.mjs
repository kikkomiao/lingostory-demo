import assert from "node:assert/strict";
import test from "node:test";
import { buildTtsSessionConfig, buildTtsTextInput, PcmStartupBuffer } from "../voice-tts.js";

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
