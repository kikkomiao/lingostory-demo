import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [app, html, fixture] = await Promise.all([
  readFile(new URL("../app.js", import.meta.url), "utf8"),
  readFile(new URL("../index.html", import.meta.url), "utf8"),
  readFile(new URL("../scripts/fixture-server.mjs", import.meta.url), "utf8"),
]);

test("shows history only in the NPC library topbar", () => {
  assert.match(html, /id="historyBtn" class="soft-btn hidden"/);
  assert.match(
    app,
    /function setLibraryTopbar\(isLibrary\)[\s\S]*?historyBtn[\s\S]*?toggle\("hidden", !isLibrary\)/,
  );
});

test("provides list, detail, filtering, and saved review surfaces", () => {
  assert.match(html, /id="historyGrid"/);
  assert.match(html, /id="historyDetailContent"/);
  assert.match(html, /id="historyRoute"/);
  assert.match(html, /id="historyConversation"/);
  assert.match(html, /id="historyDimensionList"/);
  assert.match(app, /\/api\/playthroughs\/history/);
  assert.match(app, /\/history-detail/);
});

test("fixture covers multiple stories and a completed historical review", () => {
  assert.match(fixture, /playthroughId: "history-1"/);
  assert.match(fixture, /playthroughId: "history-2"/);
  assert.match(fixture, /status: "completed"/);
  assert.match(fixture, /history-detail/);
});
