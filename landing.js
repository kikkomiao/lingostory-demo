const slideDuration = 8000;
const transitionDuration = 1100;
const slides = [...document.querySelectorAll("[data-slide]")];
const dots = [...document.querySelectorAll("[data-go]")];
const kiosk = document.querySelector(".kiosk");
const counter = document.querySelector("[data-counter]");
const progressFill = document.querySelector("[data-progress-fill]");
const slideName = document.querySelector("[data-slide-name]");
const playToggle = document.querySelector(".play-toggle");
const playLabel = document.querySelector("[data-play-label]");
const transitionLayer = document.querySelector("[data-scene-transition]");
const transitionWord = document.querySelector("[data-transition-word]");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const names = [
  "把外语练进真实生活",
  "NPC 真正理解你的表达",
  "判断事情是否办成",
  "真实生活就是任务世界",
  "交流结束后集中复盘",
];

const transitionWords = ["SPEAK!", "LISTEN!", "DO IT!", "LIVE IT!", "GROW!"];

const englishExamples = [
  { phrase: "Wait, Cyrus. Please don't go in yet.", reply: "Oh, sure. What's up?", result: "他停下来了，任务推进" },
  { phrase: "Could you hold the door for me?", reply: "Of course. I've got it.", result: "NPC 理解请求并采取行动" },
  { phrase: "I think we should check the room first.", reply: "Good idea. Let's take a look.", result: "你的建议改变了下一步" },
  { phrase: "The order is wrong. Can we fix it?", reply: "Absolutely. Let me help you.", result: "问题被理解，解决方案出现" },
];

let current = 0;
let playing = true;
let slideTimer = 0;
let transitionTimer = 0;
let transitionCleanupTimer = 0;
let startedAt = performance.now();
let remaining = slideDuration;
let progressFrame = 0;
let exampleTimer = 0;
let hotspotTimer = 0;
let transitioning = false;

const stopSceneLoops = () => {
  window.clearInterval(exampleTimer);
  window.clearInterval(hotspotTimer);
};

const startEnglishLoop = () => {
  let index = 0;
  const transcript = document.querySelector("[data-demo-transcript] strong");
  const language = document.querySelector("[data-demo-transcript] > span");
  const reply = document.querySelector("[data-demo-reply]");
  const result = document.querySelector("[data-demo-result]");
  const reaction = document.querySelector("[data-npc-reaction]");
  const buttons = [...document.querySelectorAll("[data-example]")];

  const update = () => {
    const exampleIndex = index;
    const example = englishExamples[exampleIndex];
    reaction?.classList.add("is-switching");
    window.setTimeout(() => {
      if (transcript) transcript.textContent = example.phrase;
      if (language) language.textContent = `ENGLISH / 0${exampleIndex + 1}`;
      if (reply) reply.textContent = example.reply;
      if (result) result.textContent = example.result;
      buttons.forEach((button, buttonIndex) => button.classList.toggle("is-active", buttonIndex === exampleIndex));
      reaction?.classList.remove("is-switching");
    }, reducedMotion ? 0 : 180);
    index = (index + 1) % englishExamples.length;
  };

  update();
  exampleTimer = window.setInterval(update, 1900);
};

const startHotspotLoop = () => {
  const hotspots = [...document.querySelectorAll("[data-hotspot]")];
  let index = 0;
  const update = () => {
    hotspots.forEach((hotspot, hotspotIndex) => hotspot.classList.toggle("is-active", hotspotIndex === index));
    index = (index + 1) % hotspots.length;
  };
  update();
  hotspotTimer = window.setInterval(update, 1450);
};

const startSceneLoops = () => {
  stopSceneLoops();
  if (!playing) return;
  if (current === 1) startEnglishLoop();
  if (current === 3) startHotspotLoop();
};

const updateProgress = (now) => {
  if (!playing || transitioning) return;
  const elapsed = now - startedAt;
  const ratio = Math.min(elapsed / remaining, 1);
  if (progressFill) progressFill.style.transform = `scaleX(${ratio})`;
  if (ratio < 1) progressFrame = requestAnimationFrame(updateProgress);
};

const scheduleSlide = (duration = slideDuration) => {
  window.clearTimeout(slideTimer);
  cancelAnimationFrame(progressFrame);
  remaining = duration;
  startedAt = performance.now();
  if (progressFill) progressFill.style.transform = "scaleX(0)";
  if (!playing) return;
  slideTimer = window.setTimeout(() => showSlide((current + 1) % slides.length), duration);
  progressFrame = requestAnimationFrame(updateProgress);
};

const applySlide = (index) => {
  current = index;
  slides.forEach((slide, slideIndex) => {
    const active = slideIndex === current;
    slide.classList.remove("is-leaving");
    slide.classList.toggle("is-active", active);
    slide.setAttribute("aria-hidden", String(!active));
  });
  dots.forEach((dot, dotIndex) => {
    const active = dotIndex === current;
    dot.classList.toggle("is-active", active);
    dot.setAttribute("aria-selected", String(active));
  });
  kiosk?.setAttribute("data-theme", String(current));
  if (counter) counter.textContent = `${String(current + 1).padStart(2, "0")} / ${String(slides.length).padStart(2, "0")}`;
  if (slideName) slideName.textContent = names[current];
  startSceneLoops();
  scheduleSlide();
};

function showSlide(index, instant = false) {
  const next = (index + slides.length) % slides.length;
  if (transitioning || next === current) return;
  window.clearTimeout(slideTimer);
  cancelAnimationFrame(progressFrame);
  stopSceneLoops();

  if (instant || reducedMotion) {
    applySlide(next);
    return;
  }

  transitioning = true;
  slides[current]?.classList.add("is-leaving");
  if (transitionWord) transitionWord.textContent = transitionWords[next];
  transitionLayer?.classList.remove("is-changing");
  void transitionLayer?.offsetWidth;
  transitionLayer?.classList.add("is-changing");

  transitionTimer = window.setTimeout(() => applySlide(next), 430);
  transitionCleanupTimer = window.setTimeout(() => {
    transitionLayer?.classList.remove("is-changing");
    transitioning = false;
    startedAt = performance.now();
    progressFrame = requestAnimationFrame(updateProgress);
  }, transitionDuration);
}

const setPlaying = (nextPlaying) => {
  playing = nextPlaying;
  playToggle?.setAttribute("aria-pressed", String(!playing));
  playToggle?.setAttribute("aria-label", playing ? "暂停自动播放" : "继续自动播放");
  playToggle?.classList.toggle("is-paused", !playing);
  if (playLabel) playLabel.textContent = playing ? "自动播放中" : "已暂停";
  if (playing) {
    startSceneLoops();
    scheduleSlide(remaining || slideDuration);
  } else {
    window.clearTimeout(slideTimer);
    cancelAnimationFrame(progressFrame);
    stopSceneLoops();
    const elapsed = performance.now() - startedAt;
    remaining = Math.max(600, remaining - elapsed);
  }
};

playToggle?.addEventListener("click", () => setPlaying(!playing));
dots.forEach((dot) => dot.addEventListener("click", () => showSlide(Number(dot.dataset.go || 0))));

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    window.clearTimeout(slideTimer);
    window.clearTimeout(transitionTimer);
    window.clearTimeout(transitionCleanupTimer);
    cancelAnimationFrame(progressFrame);
    stopSceneLoops();
  } else if (playing) {
    transitioning = false;
    transitionLayer?.classList.remove("is-changing");
    startSceneLoops();
    scheduleSlide();
  }
});

applySlide(0);
