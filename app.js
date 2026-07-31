const $ = (id) => document.getElementById(id);

const npcLibrary = [
  {
    id: "cyrus",
    name: "Cyrus",
    role: "大型科技公司高管",
    storyId: "lunch-mixup",
    episode: "LINGOSTORY · EP.01",
    storyTitle: "拿错了老板的午饭",
    storyDescription: "开口推动剧情！你有 4 轮对话，在 Cyrus 走进办公室之前补救这场午餐危机。",
    level: "A2–B1 · 职场沟通",
    selectImage: "/assets/npc/cyrus/Cyrus_00_grid_select.png",
    emotionAssets: {
      neutral: "/assets/npc/cyrus/Cyrus_01_neutral.png",
      happy: "/assets/npc/cyrus/Cyrus_02_happy.png",
      sad: "/assets/npc/cyrus/Cyrus_03_sad.png",
      angry: "/assets/npc/cyrus/Cyrus_04_angry.png",
      surprised: "/assets/npc/cyrus/Cyrus_05_surprised.png",
      nervous: "/assets/npc/cyrus/Cyrus_06_nervous.png",
    },
  },
];

let activeNpc = npcLibrary[0];

const rounds = [
  {
    state: "S1",
    task: "在他进门前叫住他",
    hint: "称呼 Cyrus，并明确让他先停下来。",
    seconds: 8,
    scene: "办公室走廊 · 12:21",
    mood: "正走向办公室",
    replies: {
      good: {
        user: "Wait, Cyrus—please don’t go into your office yet.",
        reply: "Okay, I’m stopping. What happened?",
        zh: "好，我停下了。发生什么事了？",
        mood: "neutral",
      },
      mid: {
        user: "Cyrus, can you come here for a second?",
        reply: "Sure—but is this about the lunch in my office?",
        zh: "可以——是因为我办公室里的午饭吗？",
        mood: "surprised",
      },
      bad: {
        user: "There is something wrong.",
        reply: "What exactly is wrong? I’m about to go in.",
        zh: "到底怎么了？我正准备进去。",
        mood: "angry",
      },
    },
  },
  {
    state: "S2",
    task: "解释发生了什么",
    hint: "说明两份午饭拿反了，不必追求完美语法。",
    seconds: 12,
    scene: "办公室门口 · 12:22",
    mood: "等你解释",
    replies: {
      good: {
        user: "I’m afraid I mixed up our lunches.",
        reply: "I see. So the lunch on my desk is yours?",
        zh: "明白了。所以我桌上的那份其实是你的？",
        mood: "surprised",
      },
      mid: {
        user: "The lunch is not right.",
        reply: "Do you mean we got each other’s lunch?",
        zh: "你的意思是，我们拿了对方的午饭？",
        mood: "nervous",
      },
      bad: {
        user: "That one is mine… maybe.",
        reply: "Which one? Please be clear—I’m getting hungry.",
        zh: "哪一份？请说清楚，我已经饿了。",
        mood: "angry",
      },
    },
  },
  {
    state: "S3",
    task: "给出一个解决方案",
    hint: "提出明确、现在就能执行的动作。",
    seconds: 12,
    scene: "工位旁 · 12:23",
    mood: "等待你的方案",
    replies: {
      good: {
        user: "Let me replace yours right away. I’ll order the same meal.",
        reply: "That works. Thanks for handling it quickly.",
        zh: "可以。谢谢你这么快处理好。",
        mood: "happy",
      },
      mid: {
        user: "I can buy something later.",
        reply: "Could you order it now? I have a meeting soon.",
        zh: "可以现在点吗？我马上有个会。",
        mood: "nervous",
      },
      bad: {
        user: "Can you eat mine?",
        reply: "I’d rather not. What else can we do?",
        zh: "我不太想。还有别的办法吗？",
        mood: "sad",
      },
    },
  },
  {
    state: "S4",
    task: "确认安排，完成收尾",
    hint: "确认下一步，再用简短道歉或感谢缓和气氛。",
    seconds: 10,
    scene: "危机收尾 · 12:24",
    mood: "事情快解决了",
    replies: {
      good: {
        user: "I’ve reordered it. It’ll be here in twenty minutes—sorry again.",
        reply: "No worries. Thanks for sorting it out.",
        zh: "没关系，谢谢你处理好了。",
        mood: "happy",
      },
      mid: {
        user: "Okay, I will do it.",
        reply: "All right. Just let me know when it arrives.",
        zh: "好。到了以后告诉我一声。",
        mood: "neutral",
      },
      bad: {
        user: "So… we are good?",
        reply: "Order it first, please. Then we’re good.",
        zh: "请先下单。然后就没事了。",
        mood: "angry",
      },
    },
  },
];

const coaching = [
  {
    label: "叫住对方",
    upgrade: "Wait, Cyrus—please don’t go into your office yet.",
    chunks: ["Wait, Cyrus", "please don’t go in", "yet"],
    feedback: {
      good: { grammar: "语法：准确", vocab: "用词：自然", issue: "称呼、请求和时间压力都表达得很清楚。" },
      mid: { grammar: "语法：准确", vocab: "用词：信息不足", issue: "对方会停下，但还不知道为什么不能进办公室。" },
      bad: { grammar: "语法：准确", vocab: "用词：过于模糊", issue: "something wrong 没有说明需要 Cyrus 立刻停下。" },
    },
  },
  {
    label: "解释问题",
    upgrade: "I’m afraid I mixed up our lunches.",
    chunks: ["I’m afraid", "I mixed up", "our lunches"],
    feedback: {
      good: { grammar: "语法：准确", vocab: "用词：地道", issue: "用 I’m afraid 缓和语气，信息完整而自然。" },
      mid: { grammar: "语法：准确", vocab: "用词：不够具体", issue: "not right 可以理解，但没有直接说清拿反了午饭。" },
      bad: { grammar: "语法：结构松散", vocab: "指代：不清楚", issue: "That one 和 maybe 让关键信息变得不确定。" },
    },
  },
  {
    label: "提出方案",
    upgrade: "Let me replace yours right away. I’ll order the same meal.",
    chunks: ["Let me replace yours", "right away", "I’ll order the same meal"],
    feedback: {
      good: { grammar: "语法：准确", vocab: "行动：明确", issue: "方案、时间和具体动作都很可靠。" },
      mid: { grammar: "语法：准确", vocab: "时间：不够及时", issue: "later 会让对方担心问题不能马上解决。" },
      bad: { grammar: "语法：准确", vocab: "语气：转移责任", issue: "让对方吃你的午饭，没有承担解决问题的动作。" },
    },
  },
  {
    label: "确认收尾",
    upgrade: "I’ve reordered it. It’ll be here in twenty minutes—sorry again.",
    chunks: ["I’ve reordered it", "it’ll be here in twenty minutes", "sorry again"],
    feedback: {
      good: { grammar: "语法：准确", vocab: "收尾：自然", issue: "结果、等待时间和道歉都有交代。" },
      mid: { grammar: "语法：准确", vocab: "用词：过于笼统", issue: "I will do it 没有说明是否已经下单以及何时送到。" },
      bad: { grammar: "语法：可以理解", vocab: "语气：偏直接", issue: "先问 we are good，会让人感觉动作还没完成就急着结束对话。" },
    },
  },
];

const scoreProfiles = {
  good: { fluency: 92, localness: 94, accuracy: 96 },
  mid: { fluency: 78, localness: 68, accuracy: 82 },
  bad: { fluency: 58, localness: 47, accuracy: 63 },
};

let round = -1;
let timerId = null;
let secondsLeft = 8;
let currentPath = "good";
let history = [];
let listening = false;
let reviewEntries = [];
let coachStep = -1;
let focusReviewIndex = 0;

function renderNpcLibrary() {
  const grid = $("npcGrid");
  grid.replaceChildren();
  $("npcCount").textContent = String(npcLibrary.length);

  npcLibrary.forEach((npc) => {
    const card = document.createElement("article");
    card.className = "npc-card";
    card.dataset.npcId = npc.id;
    card.innerHTML = `
      <div class="npc-portrait">
        <span class="npc-availability">可体验</span>
        <img src="${npc.selectImage}" alt="${npc.name} 的角色选择立绘" />
      </div>
      <div class="npc-card-body">
        <span class="npc-role">${npc.role}</span>
        <h2>${npc.name}</h2>
        <span class="npc-story-label">专属剧情 · ${npc.episode.replace("LINGOSTORY · ", "")}</span>
        <p class="npc-story-title">${npc.storyTitle}</p>
        <div class="npc-emotions" aria-label="支持的剧情情绪">
          <span>中性</span><span>开心</span><span>难过</span>
          <span>生气</span><span>紧张</span><span>惊讶</span>
        </div>
        <button class="npc-enter" type="button" data-select-npc="${npc.id}">
          选择 ${npc.name}，进入剧情 →
        </button>
      </div>
    `;
    grid.append(card);
  });
}

function applyActiveNpc() {
  $("characterName").textContent = activeNpc.name;
  $("storyEpisode").textContent = activeNpc.episode;
  $("storyTitle").textContent = activeNpc.storyTitle;
  $("storyDescription").textContent = activeNpc.storyDescription;
  $("character").alt = `${activeNpc.name} 的中性情绪立绘`;
  setCharacter("neutral");
}

function setCharacter(mood) {
  const character = $("character");
  const safeMood = activeNpc.emotionAssets[mood] ? mood : "neutral";
  character.src = activeNpc.emotionAssets[safeMood];
  character.dataset.mood = safeMood;
  character.alt = `${activeNpc.name} 的${safeMood}情绪立绘`;
  const labels = {
    neutral: "在听你解释",
    happy: "开心地接受了",
    sad: "有些失望",
    angry: "明显生气了",
    nervous: "有一点紧张",
    surprised: "有些惊讶",
  };
  $("moodLabel").textContent = labels[safeMood] || "还没发现问题";
}

function updateTimer() {
  const total = rounds[round]?.seconds || 8;
  $("timerValue").textContent = Math.max(0, secondsLeft);
  $("timer").style.setProperty("--progress", String(Math.max(0, secondsLeft / total)));
}

function startTimer() {
  clearInterval(timerId);
  secondsLeft = rounds[round].seconds;
  updateTimer();
  timerId = setInterval(() => {
    secondsLeft -= 1;
    updateTimer();
    if (secondsLeft <= 0) {
      clearInterval(timerId);
      choosePath("bad", true);
    }
  }, 1000);
}

function loadRound(index) {
  round = index;
  const data = rounds[index];
  $("roundLabel").textContent = `${data.state} · 沟通目标`;
  $("roundCount").textContent = `${index + 1} / 4`;
  $("progressFill").style.width = `${(index / 4) * 100}%`;
  $("taskTitle").textContent = data.task;
  $("taskHint").textContent = data.hint;
  $("sceneLabel").textContent = data.scene;
  $("moodLabel").textContent = data.mood;
  $("speakerName").textContent = "旁白";
  $("subtitle").textContent =
    index === 0 ? `${activeNpc.name} 正走向办公室。你得马上叫住他。` : "轮到你了。用自己的方式推动剧情。";
  $("translation").textContent = data.hint;
  $("transcript").textContent = "你的表达会出现在这里…";
  $("transcriptBox").classList.remove("processing");
  $("crisisBadge").classList.toggle("visible", index === 0 || currentPath === "bad");
  setCharacter(index > 0 && currentPath === "bad" ? "angry" : "neutral");
  setPathDisabled(false);
  startTimer();
}

function setPathDisabled(disabled) {
  document.querySelectorAll(".path-btn").forEach((button) => {
    button.disabled = disabled;
  });
}

function simulateListening() {
  if (round < 0 || listening) return;
  listening = true;
  $("micBtn").classList.add("listening");
  $("wave").classList.add("active");
  $("voiceStatus").textContent = "正在聆听…再次点击结束";
  $("transcript").textContent = "Listening…";
  $("transcriptBox").classList.add("processing");
  setTimeout(() => {
    if (listening) choosePath("good");
  }, 1600);
}

function choosePath(path, timedOut = false) {
  if (round < 0 || round >= rounds.length) return;
  clearInterval(timerId);
  listening = false;
  currentPath = path;
  $("micBtn").classList.remove("listening");
  $("wave").classList.remove("active");
  $("voiceStatus").textContent = "AI 正在理解你的意思…";
  $("transcriptBox").classList.add("processing");
  setPathDisabled(true);

  const answer = rounds[round].replies[path];
  $("transcript").textContent = timedOut ? "（没有识别到有效表达）" : answer.user;
  history.push({ round, path, line: timedOut ? "（没有识别到有效表达）" : answer.user });

  setTimeout(() => {
    $("speakerName").textContent = activeNpc.name;
    $("subtitle").innerHTML =
      path === "good"
        ? answer.reply.replace(/(stopping|mixed up|order|Thanks|No worries)/gi, '<span class="highlight">$1</span>')
        : answer.reply;
    $("translation").textContent = answer.zh;
    $("voiceStatus").textContent = path === "bad" ? "你获得了一次补救机会" : "表达已推动剧情";
    $("transcriptBox").classList.remove("processing");
    setCharacter(answer.mood);
    $("progressFill").style.width = `${((round + 1) / 4) * 100}%`;

    setTimeout(() => {
      if (round < rounds.length - 1) loadRound(round + 1);
      else showEnding();
    }, 1900);
  }, 650);
}

function clampScore(value) {
  return Math.max(0, Math.min(100, value));
}

function scoreHistoryItem(item) {
  const profile = scoreProfiles[item.path];
  const roundAdjustments = [
    { fluency: 1, localness: 0, accuracy: 0 },
    { fluency: -2, localness: 1, accuracy: -1 },
    { fluency: 2, localness: -1, accuracy: 1 },
    { fluency: 0, localness: -2, accuracy: 0 },
  ][item.round];
  const fluency = clampScore(profile.fluency + roundAdjustments.fluency);
  const localness = clampScore(profile.localness + roundAdjustments.localness);
  const accuracy = clampScore(profile.accuracy + roundAdjustments.accuracy);
  return {
    ...item,
    fluency,
    localness,
    accuracy,
    score: Math.round((fluency + localness + accuracy) / 3),
  };
}

function averageScore(entries, key) {
  return Math.round(entries.reduce((sum, item) => sum + item[key], 0) / Math.max(1, entries.length));
}

function drawScoreTrendChart(focusIndex) {
  const canvas = $("scoreTrendChart");
  if (!canvas || !reviewEntries.length) return;
  const width = Math.max(320, Math.floor(canvas.getBoundingClientRect().width || 760));
  const height = width < 520 ? 260 : 310;
  const ratio = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.floor(width * ratio);
  canvas.height = Math.floor(height * ratio);
  const context = canvas.getContext("2d");
  context.scale(ratio, ratio);
  context.clearRect(0, 0, width, height);

  const padding = { top: 28, right: 24, bottom: 48, left: 42 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const minScore = 40;
  const maxScore = 100;
  const x = (index) => padding.left + (plotWidth / 3) * index;
  const y = (score) => padding.top + ((maxScore - score) / (maxScore - minScore)) * plotHeight;

  context.save();
  const focusX = x(focusIndex);
  context.fillStyle = "rgba(255, 211, 36, .18)";
  context.fillRect(focusX - Math.min(54, plotWidth / 10), padding.top - 10, Math.min(108, plotWidth / 5), plotHeight + 22);
  context.restore();

  context.font = '700 10px "PingFang SC", sans-serif';
  context.textAlign = "right";
  context.textBaseline = "middle";
  [40, 60, 80, 100].forEach((score) => {
    const lineY = y(score);
    context.setLineDash([5, 6]);
    context.strokeStyle = "rgba(23, 23, 23, .2)";
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(padding.left, lineY);
    context.lineTo(width - padding.right, lineY);
    context.stroke();
    context.fillStyle = "#777066";
    context.fillText(String(score), padding.left - 9, lineY);
  });
  context.setLineDash([]);

  const series = [
    { key: "fluency", color: "#2488ed" },
    { key: "localness", color: "#f0b900" },
    { key: "accuracy", color: "#36a85f" },
  ];

  series.forEach((item) => {
    context.strokeStyle = item.color;
    context.lineWidth = 4;
    context.lineJoin = "round";
    context.lineCap = "round";
    context.beginPath();
    reviewEntries.forEach((entry, index) => {
      const pointX = x(index);
      const pointY = y(entry[item.key]);
      if (index === 0) context.moveTo(pointX, pointY);
      else context.lineTo(pointX, pointY);
    });
    context.stroke();

    reviewEntries.forEach((entry, index) => {
      const pointX = x(index);
      const pointY = y(entry[item.key]);
      context.fillStyle = "#fffdf7";
      context.strokeStyle = "#171717";
      context.lineWidth = 2;
      context.beginPath();
      context.arc(pointX, pointY, index === focusIndex ? 7 : 5, 0, Math.PI * 2);
      context.fill();
      context.stroke();
      context.fillStyle = item.color;
      context.beginPath();
      context.arc(pointX, pointY, index === focusIndex ? 3.5 : 2.5, 0, Math.PI * 2);
      context.fill();
    });
  });

  context.textAlign = "center";
  reviewEntries.forEach((entry, index) => {
    const pointX = x(index);
    context.fillStyle = index === focusIndex ? "#ff3347" : "#171717";
    context.font = `900 ${index === focusIndex ? 12 : 10}px "PingFang SC", sans-serif`;
    context.fillText(rounds[entry.round].state, pointX, height - 25);
    context.fillStyle = "#777066";
    context.font = '700 8px "PingFang SC", sans-serif';
    context.fillText(coaching[entry.round].label, pointX, height - 10);
  });

  canvas.setAttribute(
    "aria-label",
    reviewEntries
      .map(
        (entry) =>
          `${rounds[entry.round].state}：流畅度 ${entry.fluency}，地道度 ${entry.localness}，正确度 ${entry.accuracy}`,
      )
      .join("；"),
  );
}

function selectFocusSentence(index) {
  const entry = reviewEntries[index];
  if (!entry) return;
  const coach = coaching[entry.round];
  const feedback = coach.feedback[entry.path];
  coachStep = -1;

  $("focusRound").textContent = `${rounds[entry.round].state} · ${coach.label}`;
  $("focusScore").textContent = String(entry.score);
  $("originalLine").textContent = entry.line;
  $("grammarFeedback").textContent = feedback.grammar;
  $("vocabFeedback").textContent = feedback.vocab;
  $("focusIssue").textContent = feedback.issue;
  $("upgradeLine").textContent = coach.upgrade;
  $("coachStatus").textContent = "先听整句，再分成语块跟读。";
  $("coachBtn").textContent = "开始带练";

  const chunks = $("coachChunks");
  chunks.replaceChildren();
  coach.chunks.forEach((chunk) => {
    const item = document.createElement("span");
    item.className = "coach-chunk";
    item.textContent = chunk;
    chunks.append(item);
  });
}

function showEnding() {
  clearInterval(timerId);
  const goodCount = history.filter((item) => item.path === "good").length;
  const badCount = history.filter((item) => item.path === "bad").length;
  $("progressFill").style.width = "100%";
  $("roundLabel").textContent = "END · 学习复盘";
  $("roundCount").textContent = "完成";

  if (goodCount >= 3) {
    $("endingStamp").textContent = "危机解除";
    $("endingTitle").textContent = "你成功换回了午饭";
    $("endingDesc").textContent = `${activeNpc.name} 接受了你的解决方案，你也用自然、得体的方式完成了道歉。`;
    $("endingStamp").style.background = "#dff0c0";
    setCharacter("happy");
  } else if (badCount >= 2) {
    $("endingStamp").textContent = "惊险收尾";
    $("endingTitle").textContent = "午饭保住了，气氛有点尴尬";
    $("endingDesc").textContent = "你的意思最终被理解，但更明确的动作和语气会让沟通轻松很多。";
    $("endingStamp").style.background = "#ffd9e5";
    setCharacter("angry");
  } else {
    $("endingStamp").textContent = "普通结局";
    $("endingTitle").textContent = "问题解决了";
    $("endingDesc").textContent = "你的表达可以理解。再补充具体行动，语气会更自然、更可靠。";
    $("endingStamp").style.background = "#fff0a9";
    setCharacter("neutral");
  }

  reviewEntries = history.map(scoreHistoryItem);
  const fluency = averageScore(reviewEntries, "fluency");
  const localness = averageScore(reviewEntries, "localness");
  const accuracy = averageScore(reviewEntries, "accuracy");
  const overall = Math.round((fluency + localness + accuracy) / 3);
  const weakestIndex = reviewEntries.reduce(
    (lowest, entry, index, entries) => (entry.score < entries[lowest].score ? index : lowest),
    0,
  );
  focusReviewIndex = weakestIndex;
  const weakestDimension = [
    ["流畅度", fluency],
    ["地道度", localness],
    ["正确度", accuracy],
  ].sort((a, b) => a[1] - b[1])[0][0];
  const suggestions = {
    流畅度: "先按语块跟读，再尝试一口气说完整句。",
    地道度: "优先把“意思正确”升级为“这个场景里真的会这样说”。",
    正确度: "重点留意句子结构和动作发生的时间。",
  };

  $("overallScore").textContent = String(overall);
  $("overallScoreRing").style.setProperty("--score", String(overall));
  $("fluencyScore").textContent = String(fluency);
  $("localScore").textContent = String(localness);
  $("accuracyScore").textContent = String(accuracy);
  $("reviewSuggestion").textContent = suggestions[weakestDimension];
  $("chartSummary").textContent =
    `${rounds[reviewEntries[weakestIndex].round].state} 的总分最低，` +
    `其中${weakestDimension}最值得优先加强。`;

  selectFocusSentence(weakestIndex);
  document.querySelector(".experience").classList.add("review-mode");
  $("endingOverlay").classList.remove("hidden");
  requestAnimationFrame(() => drawScoreTrendChart(weakestIndex));
}

function resetStoryState() {
  clearInterval(timerId);
  round = -1;
  history = [];
  currentPath = "good";
  listening = false;
  reviewEntries = [];
  coachStep = -1;
  focusReviewIndex = 0;
  $("endingOverlay").classList.add("hidden");
  $("progressFill").style.width = "0";
  $("roundLabel").textContent = "准备阶段";
  $("roundCount").textContent = "0 / 4";
  $("taskTitle").textContent = "先看清发生了什么";
  $("taskHint").textContent = "点击开始挑战，进入第一轮沟通。";
  $("subtitle").textContent = "你刚坐下就发现——两份午饭拿反了。老板那份，已经被你打开过。";
  $("translation").textContent = `而 ${activeNpc.name} 正走向他的办公室。`;
  $("speakerName").textContent = "旁白";
  $("voiceStatus").textContent = "点击麦克风，或按住空格说话";
  $("transcript").textContent = "你的表达会出现在这里…";
  $("transcriptBox").classList.remove("processing");
  $("micBtn").classList.remove("listening");
  $("wave").classList.remove("active");
  $("crisisBadge").classList.remove("visible");
  setPathDisabled(false);
  setCharacter("neutral");
  updateTimer();
}

function resetStory() {
  resetStoryState();
  const experience = document.querySelector(".experience");
  experience.classList.remove("review-mode", "library-mode");
  $("npcLibraryOverlay").classList.add("hidden");
  $("introOverlay").classList.remove("hidden");
}

function showNpcLibrary() {
  resetStoryState();
  const experience = document.querySelector(".experience");
  experience.classList.remove("review-mode");
  experience.classList.add("library-mode");
  $("introOverlay").classList.add("hidden");
  $("npcLibraryOverlay").classList.remove("hidden");
}

function selectNpc(npcId) {
  const nextNpc = npcLibrary.find((npc) => npc.id === npcId);
  if (!nextNpc) return;
  activeNpc = nextNpc;
  applyActiveNpc();
  resetStory();
}

$("startBtn").addEventListener("click", () => {
  $("introOverlay").classList.add("hidden");
  loadRound(0);
});
$("npcGrid").addEventListener("click", (event) => {
  const button = event.target.closest("[data-select-npc]");
  if (button) selectNpc(button.dataset.selectNpc);
});
$("brandHome").addEventListener("click", (event) => {
  event.preventDefault();
  showNpcLibrary();
});
$("restartBtn").addEventListener("click", showNpcLibrary);
$("retryBtn").addEventListener("click", resetStory);
$("listenBtn").addEventListener("click", () => {
  $("listenBtn").textContent = "♪ 正在播放…";
  $("coachStatus").textContent = "先听重音和停顿：不要逐词翻译。";
  setTimeout(() => {
    $("listenBtn").textContent = "▶ 再听一次";
  }, 1100);
});
$("coachBtn").addEventListener("click", () => {
  const chunks = [...document.querySelectorAll(".coach-chunk")];
  if (!chunks.length) return;
  if (coachStep >= chunks.length - 1) {
    coachStep = -1;
    chunks.forEach((chunk) => chunk.classList.remove("active", "done"));
    $("coachStatus").textContent = "已重置。准备好后再跟读一遍。";
    $("coachBtn").textContent = "再练一次";
    return;
  }

  coachStep += 1;
  chunks.forEach((chunk, index) => {
    chunk.classList.toggle("active", index === coachStep);
    chunk.classList.toggle("done", index < coachStep);
  });
  $("coachStatus").textContent = `跟读 ${coachStep + 1} / ${chunks.length}：${chunks[coachStep].textContent}`;
  $("coachBtn").textContent = coachStep === chunks.length - 1 ? "带练完成 ✓" : "下一语块 →";
});
$("micBtn").addEventListener("click", () => (listening ? choosePath("good") : simulateListening()));
$("soundBtn").addEventListener("click", (event) => {
  event.currentTarget.textContent = event.currentTarget.textContent === "♪" ? "×" : "♪";
});
document.querySelectorAll(".path-btn").forEach((button) => {
  button.addEventListener("click", () => choosePath(button.dataset.path));
});
document.addEventListener("keydown", (event) => {
  if (event.code === "Space") {
    event.preventDefault();
    if (round >= 0) simulateListening();
  }
  if (event.key === "1") choosePath("good");
  if (event.key === "2") choosePath("mid");
  if (event.key === "3") choosePath("bad");
});
window.addEventListener("resize", () => {
  if (document.querySelector(".experience").classList.contains("review-mode")) {
    drawScoreTrendChart(focusReviewIndex);
  }
});

renderNpcLibrary();
applyActiveNpc();
showNpcLibrary();
