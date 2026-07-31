import assert from "node:assert/strict";
import test from "node:test";
import { cleanTranscript } from "../transcript.js";

test("keeps only explicitly labelled English segments", () => {
  assert.equal(
    cleanTranscript("language Chinese 你好 language English Please stop.", "en"),
    "Please stop.",
  );
});

test("keeps only explicitly labelled Japanese segments", () => {
  assert.equal(
    cleanTranscript(
      "language Chinese 请帮忙 language Japanese 荷物を確認してください。 language English Help.",
      "ja",
    ),
    "荷物を確認してください。",
  );
});

test("accepts unlabelled Japanese only when kana is present", () => {
  assert.equal(cleanTranscript("大丈夫です。", "ja"), "大丈夫です。");
  assert.equal(cleanTranscript("确认行李", "ja"), "");
});

test("preserves the existing unlabelled English rule", () => {
  assert.equal(cleanTranscript("Could you help me?", "en"), "Could you help me?");
  assert.equal(cleanTranscript("手伝ってください。", "en"), "");
});
