import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const source = await readFile(new URL("../audio.js", import.meta.url), "utf8");

function createHarness() {
  const instances = [];
  const pendingPlays = [];

  class FakeAudio {
    constructor(url) {
      this.url = url;
      this.paused = true;
      this.currentTime = 0;
      this.volume = 1;
      instances.push(this);
    }

    play() {
      this.paused = false;
      return new Promise((resolve) => pendingPlays.push(resolve));
    }

    pause() {
      this.paused = true;
    }
  }

  const document = {
    hidden: false,
    addEventListener() {},
    querySelectorAll() {
      return [];
    },
  };
  const localStorage = {
    getItem() {
      return null;
    },
    setItem() {},
  };
  const window = {
    addEventListener() {},
    localStorage,
  };
  const context = vm.createContext({
    Audio: FakeAudio,
    Element: class {},
    cancelAnimationFrame() {},
    document,
    localStorage,
    performance: { now: () => 0 },
    requestAnimationFrame: () => 1,
    window,
  });
  vm.runInContext(source, context);

  return {
    audio: window.lingostoryAudio,
    backgroundMusic: instances[0],
    effects: instances.slice(1),
    resolvePlays() {
      pendingPlays.splice(0).forEach((resolve) => resolve());
    },
  };
}

test("a pending menu playback cannot start after conversation mode begins", async () => {
  const harness = createHarness();
  harness.audio.unlock();
  harness.audio.enterConversation();
  harness.resolvePlays();
  await Promise.resolve();

  assert.equal(harness.backgroundMusic.paused, true);
});

test("conversation mode immediately stops music and every UI effect", () => {
  const harness = createHarness();
  harness.audio.unlock();
  harness.audio.playEffect("confirm");
  harness.audio.enterConversation();

  assert.equal(harness.backgroundMusic.paused, true);
  assert.ok(harness.effects.every((effect) => effect.paused));
  assert.ok(harness.effects.every((effect) => effect.currentTime === 0));

  harness.audio.playEffect("soft");
  assert.ok(harness.effects.every((effect) => effect.paused));
});
