import assert from "node:assert/strict";
import test from "node:test";
import {
  cantoneseRecognitionContext,
  cleanTranscript,
  correctCantoneseMtrTranscript,
} from "../transcript.js";

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

test("keeps only explicitly labelled Cantonese segments", () => {
  assert.equal(
    cleanTranscript(
      "language Mandarin 请送到这里 language Cantonese 唔該，請星期五送到。 language English Thanks.",
      "yue",
    ),
    "唔該，請星期五送到。",
  );
});

test("accepts unlabelled Cantonese Han text without rewriting script", () => {
  assert.equal(
    cleanTranscript("唔该，我想改做五包A4打印纸。", "yue"),
    "唔该，我想改做五包A4打印纸。",
  );
  assert.equal(cleanTranscript("荷物を確認します。", "yue"), "");
});

test("provides beat-specific Cantonese MTR recognition context", () => {
  const context = cantoneseRecognitionContext(
    "hong-kong-mtr-directions-mike-yue-v4",
    "ask_line",
  );
  assert.ok(context.hotwords.includes("港島線"));
  assert.equal(cantoneseRecognitionContext("another-story", "ask_line"), null);
});

test("corrects only safe MTR proper-name confusions and preserves numbers", () => {
  const storyId = "hong-kong-mtr-directions-mike-yue-v4";
  assert.equal(
    correctCantoneseMtrTranscript("我想去中還，係咪坐港島先？", storyId, "ask_line"),
    "我想去中環，係咪坐港島線？",
  );
  assert.equal(
    correctCantoneseMtrTranscript("我聽到係十個站", storyId, "ask_transfer"),
    "我聽到係十個站",
  );
});
