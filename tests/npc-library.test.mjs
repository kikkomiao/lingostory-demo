import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../app.js", import.meta.url), "utf8");

test("keeps the three English NPC cards before Japanese and Cantonese", () => {
  assert.match(
    source,
    /const NPC_LIBRARY_ORDER = \["cassie", "mike", "cyrus", "kate", "mary"\]/,
  );
});

test("binds Mike to the English café and Mary to the Cantonese MTR story", () => {
  assert.match(source, /id: "mike"[\s\S]*?role: "社区咖啡店咖啡师"[\s\S]*?storyId: "corner-cafe-order-mike-en-v1"/);
  assert.match(source, /id: "mary"[\s\S]*?role: "香港天后站友善路人"[\s\S]*?storyId: "hong-kong-mtr-directions-mary-yue-v1"/);
});
