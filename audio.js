(() => {
  const STORAGE_KEY = "lingostory:menu-sound-enabled";
  const BGM_VOLUME = 0.16;
  const SFX_VOLUME = 0.5;

  const readEnabled = () => {
    try {
      return window.localStorage.getItem(STORAGE_KEY) !== "0";
    } catch {
      return true;
    }
  };

  const backgroundMusic = new Audio("./assets/audio/upbeat-background-loop.mp3");
  backgroundMusic.loop = true;
  backgroundMusic.preload = "auto";
  backgroundMusic.volume = BGM_VOLUME;

  const effects = {
    soft: new Audio("./assets/audio/happy-pop-1.mp3"),
    confirm: new Audio("./assets/audio/happy-pop-2.mp3"),
  };
  Object.values(effects).forEach((effect) => {
    effect.preload = "auto";
    effect.volume = SFX_VOLUME;
  });

  let enabled = readEnabled();
  let unlocked = false;
  let mode = "menu";
  let fadeFrame = 0;
  let fadeVersion = 0;

  const syncControls = () => {
    document.querySelectorAll("[data-sound-toggle]").forEach((button) => {
      button.textContent = enabled ? "♪" : "×";
      button.setAttribute("aria-pressed", String(enabled));
      button.setAttribute(
        "aria-label",
        enabled ? "关闭背景音乐和按钮音效" : "开启背景音乐和按钮音效",
      );
      button.title = enabled ? "关闭声音" : "开启声音";
    });
  };

  const stopFade = () => {
    fadeVersion += 1;
    cancelAnimationFrame(fadeFrame);
  };

  const fadeTo = (target, duration, onComplete) => {
    stopFade();
    const version = fadeVersion;
    const startVolume = backgroundMusic.volume;
    const startedAt = performance.now();
    const tick = (now) => {
      if (version !== fadeVersion) return;
      const ratio = Math.min((now - startedAt) / duration, 1);
      backgroundMusic.volume = startVolume + (target - startVolume) * ratio;
      if (ratio < 1) {
        fadeFrame = requestAnimationFrame(tick);
      } else {
        onComplete?.();
      }
    };
    fadeFrame = requestAnimationFrame(tick);
  };

  const playBackgroundMusic = async () => {
    if (!enabled || !unlocked || mode !== "menu" || !backgroundMusic.paused) return;
    stopFade();
    backgroundMusic.volume = 0;
    try {
      await backgroundMusic.play();
      fadeTo(BGM_VOLUME, 280);
    } catch {
      // A later user interaction will retry if the browser blocked autoplay.
    }
  };

  const pauseBackgroundMusic = ({ fade = true } = {}) => {
    if (backgroundMusic.paused) return;
    const finish = () => {
      backgroundMusic.pause();
      backgroundMusic.volume = BGM_VOLUME;
    };
    if (fade) fadeTo(0, 320, finish);
    else {
      stopFade();
      finish();
    }
  };

  const stopEffects = () => {
    Object.values(effects).forEach((effect) => {
      effect.pause();
      effect.currentTime = 0;
    });
  };

  const audio = {
    get enabled() {
      return enabled;
    },

    unlock() {
      unlocked = true;
      void playBackgroundMusic();
    },

    setEnabled(nextEnabled) {
      enabled = Boolean(nextEnabled);
      try {
        window.localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");
      } catch {
        // Sound still works when storage is unavailable.
      }
      if (enabled) {
        unlocked = true;
        void playBackgroundMusic();
      } else {
        pauseBackgroundMusic({ fade: false });
        stopEffects();
      }
      syncControls();
    },

    playEffect(kind = "soft") {
      if (!enabled || !unlocked) return;
      const effect = effects[kind] || effects.soft;
      effect.pause();
      effect.currentTime = 0;
      void effect.play().catch(() => undefined);
    },

    enterMenu() {
      mode = "menu";
      void playBackgroundMusic();
    },

    enterConversation() {
      mode = "conversation";
      pauseBackgroundMusic();
    },

    syncControls,
  };

  document.addEventListener(
    "click",
    (event) => {
      const target = event.target instanceof Element ? event.target : null;
      const toggle = target?.closest("[data-sound-toggle]");
      if (toggle) {
        const nextEnabled = !enabled;
        audio.setEnabled(nextEnabled);
        if (nextEnabled) audio.playEffect("soft");
        return;
      }

      audio.unlock();
      if (target?.closest("#gameEntryTrigger, [data-select-npc], #startBtn")) {
        audio.playEffect("confirm");
        return;
      }
      if (
        target?.closest(
          "#brandHome, #homeBtn, #restartBtn, #retryBtn, #reviewRetryBtn, #apiRetryBtn",
        )
      ) {
        audio.playEffect("soft");
      }
    },
    true,
  );

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) pauseBackgroundMusic({ fade: false });
    else if (mode === "menu") void playBackgroundMusic();
  });
  window.addEventListener("beforeunload", () => {
    pauseBackgroundMusic({ fade: false });
    stopEffects();
  });

  window.lingostoryAudio = audio;
  syncControls();
})();
