const $ = (id) => document.getElementById(id);

const rounds = [
  {
    state: "S1",
    task: "在他进门前叫住他",
    hint: "称呼 Alex，并明确让他先停下来。",
    seconds: 8,
    scene: "办公室走廊 · 12:21",
    mood: "正走向办公室",
    replies: {
      good: {
        user: "Wait, Alex—please don’t go into your office yet.",
        reply: "Okay, I’m stopping. What happened?",
        zh: "好，我停下了。发生什么事了？",
        mood: "neutral",
      },
      mid: {
        user: "Alex, can you come here for a second?",
        reply: "Sure—but is this about the lunch in my office?",
        zh: "可以——是因为我办公室里的午饭吗？",
        mood: "neutral",
      },
      bad: {
        user: "There is something wrong.",
        reply: "What exactly is wrong? I’m about to go in.",
        zh: "到底怎么了？我正准备进去。",
        mood: "impatient",
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
        mood: "neutral",
      },
      mid: {
        user: "The lunch is not right.",
        reply: "Do you mean we got each other’s lunch?",
        zh: "你的意思是，我们拿了对方的午饭？",
        mood: "neutral",
      },
      bad: {
        user: "That one is mine… maybe.",
        reply: "Which one? Please be clear—I’m getting hungry.",
        zh: "哪一份？请说清楚，我已经饿了。",
        mood: "impatient",
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
        mood: "relieved",
      },
      mid: {
        user: "I can buy something later.",
        reply: "Could you order it now? I have a meeting soon.",
        zh: "可以现在点吗？我马上有个会。",
        mood: "neutral",
      },
      bad: {
        user: "Can you eat mine?",
        reply: "I’d rather not. What else can we do?",
        zh: "我不太想。还有别的办法吗？",
        mood: "impatient",
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
        mood: "relieved",
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
        mood: "impatient",
      },
    },
  },
];

let round = -1;
let timerId = null;
let secondsLeft = 8;
let currentPath = "good";
let history = [];
let listening = false;

function setCharacter(mood) {
  $("character").className = `character character--${mood}`;
  const labels = {
    neutral: "在听你解释",
    impatient: "有点不耐烦",
    relieved: "松了一口气",
  };
  $("moodLabel").textContent = labels[mood] || "还没发现问题";
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
  $("subtitle").textContent = index === 0 ? "Alex 正走向办公室。你得马上叫住他。" : "轮到你了。用自己的方式推动剧情。";
  $("translation").textContent = data.hint;
  $("transcript").textContent = "你的表达会出现在这里…";
  $("transcriptBox").classList.remove("processing");
  $("crisisBadge").classList.toggle("visible", index === 0 || currentPath === "bad");
  setCharacter(index > 0 && currentPath === "bad" ? "impatient" : "neutral");
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
  history.push({ round, path, line: answer.user });

  setTimeout(() => {
    $("speakerName").textContent = "Alex";
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
    $("endingDesc").textContent = "Alex 接受了你的解决方案，你也用自然、得体的方式完成了道歉。";
    $("endingStamp").style.background = "#dfe9df";
    setCharacter("relieved");
  } else if (badCount >= 2) {
    $("endingStamp").textContent = "惊险收尾";
    $("endingTitle").textContent = "午饭保住了，气氛有点尴尬";
    $("endingDesc").textContent = "你的意思最终被理解，但更明确的动作和语气会让沟通轻松很多。";
    $("endingStamp").style.background = "#f1ddd7";
    setCharacter("impatient");
  } else {
    $("endingStamp").textContent = "普通结局";
    $("endingTitle").textContent = "问题解决了";
    $("endingDesc").textContent = "你的表达可以理解。再补充具体行动，语气会更自然、更可靠。";
    $("endingStamp").style.background = "#eee4cf";
    setCharacter("neutral");
  }

  $("originalLine").textContent = history.at(-1)?.line || "I mixed up our lunches.";
  $("endingOverlay").classList.remove("hidden");
}

function reset() {
  clearInterval(timerId);
  round = -1;
  history = [];
  currentPath = "good";
  listening = false;
  $("introOverlay").classList.remove("hidden");
  $("endingOverlay").classList.add("hidden");
  $("progressFill").style.width = "0";
  $("roundLabel").textContent = "准备阶段";
  $("roundCount").textContent = "0 / 4";
  $("taskTitle").textContent = "先看清发生了什么";
  $("taskHint").textContent = "点击开始挑战，进入第一轮沟通。";
  $("subtitle").textContent = "你刚坐下就发现——两份午饭拿反了。老板那份，已经被你打开过。";
  $("translation").textContent = "而 Alex 正走向他的办公室。";
  $("crisisBadge").classList.remove("visible");
  setCharacter("neutral");
  updateTimer();
}

$("startBtn").addEventListener("click", () => {
  $("introOverlay").classList.add("hidden");
  loadRound(0);
});
$("restartBtn").addEventListener("click", reset);
$("retryBtn").addEventListener("click", reset);
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

reset();
