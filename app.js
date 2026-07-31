const $ = (id) => document.getElementById(id);

const API_BASE_URL = String(window.LINGOSTORY_API_BASE_URL || "").replace(/\/$/, "");
const API_TIMEOUT_MS = 12000;
const API_DISCOVERY_TIMEOUT_MS = 2500;
const SUPPORTED_API_PROTOCOL_MAJOR = "1";
const PLAYTHROUGH_STORAGE_KEY = "lingostory.playthroughId";
const REQUESTED_NPC_ID = String(new URLSearchParams(window.location.search).get("npc") || "")
  .trim()
  .toLowerCase();

const demoNpcLibrary = [
  {
    id: "cyrus",
    source: "demo",
    availability: "available",
    name: "Cyrus",
    role: "大型科技公司高管",
    storyId: "lunch-mixup",
    episode: "LINGOSTORY · EP.01",
    storyTitle: "拿错了老板的午饭",
    storyDescription: "开口推动剧情！你有 4 轮对话，在 Cyrus 走进办公室之前补救这场午餐危机。",
    estimatedMinutes: 3,
    level: "A2–B1 · 职场沟通",
    accent: "#ffd95e",
    selectImage: "./npc/cyrus/Cyrus_00_grid_select.png",
    emotionAssets: {
      neutral: "./npc/cyrus/Cyrus_01_neutral.png",
      happy: "./npc/cyrus/Cyrus_02_happy.png",
      sad: "./npc/cyrus/Cyrus_03_sad.png",
      angry: "./npc/cyrus/Cyrus_04_angry.png",
      surprised: "./npc/cyrus/Cyrus_05_surprised.png",
      nervous: "./npc/cyrus/Cyrus_06_nervous.png",
    },
  },
  {
    id: "kate",
    source: "demo",
    availability: "comingSoon",
    name: "Kate",
    role: "社区图书馆助理",
    storyId: null,
    episode: "专属剧情 · 待公布",
    storyTitle: "故事正在筹备中",
    storyDescription: "Kate 的图书馆服务与日常英语场景正在编排，故事确定后即可开放。",
    level: "故事待定",
    accent: "#cfe6ff",
    selectImage: "./npc/kate/Kate_00_grid_select.png",
    emotionAssets: {
      neutral: "./npc/kate/Kate_01_neutral.png",
      happy: "./npc/kate/Kate_02_happy.png",
      sad: "./npc/kate/Kate_03_sad.png",
      angry: "./npc/kate/Kate_04_angry.png",
      surprised: "./npc/kate/Kate_05_surprised.png",
      nervous: "./npc/kate/Kate_06_nervous.png",
    },
  },
  {
    id: "mike",
    source: "demo",
    availability: "comingSoon",
    name: "Mike",
    role: "办公用品公司客服协调员",
    storyId: null,
    episode: "专属剧情 · 待公布",
    storyTitle: "故事正在筹备中",
    storyDescription: "Mike 的客户沟通与职场日常场景正在编排，故事确定后即可开放。",
    level: "故事待定",
    accent: "#f2a05f",
    selectImage: "./npc/mike/Mike_00_grid_select.png",
    emotionAssets: {
      neutral: "./npc/mike/Mike_01_neutral.png",
      happy: "./npc/mike/Mike_02_happy.png",
      sad: "./npc/mike/Mike_03_sad.png",
      angry: "./npc/mike/Mike_04_angry.png",
      surprised: "./npc/mike/Mike_05_surprised.png",
      nervous: "./npc/mike/Mike_06_nervous.png",
    },
  },
  {
    id: "mary",
    source: "demo",
    availability: "comingSoon",
    name: "Mary",
    role: "社区图书馆助理 · 日常会话伙伴",
    storyId: null,
    episode: "专属剧情 · 待公布",
    storyTitle: "故事正在筹备中",
    storyDescription: "Mary 的图书馆服务与日常会话场景正在编排，故事确定后即可开放。",
    level: "故事待定",
    accent: "#d89a6a",
    selectImage: "./npc/mary/Mary_00_grid_select.png",
    emotionAssets: {
      neutral: "./npc/mary/Mary_01_neutral.png",
      happy: "./npc/mary/Mary_02_happy.png",
      sad: "./npc/mary/Mary_03_sad.png",
      angry: "./npc/mary/Mary_04_angry.png",
      surprised: "./npc/mary/Mary_05_surprised.png",
      nervous: "./npc/mary/Mary_06_nervous.png",
    },
  },
  {
    id: "cassie",
    source: "demo",
    availability: "comingSoon",
    name: "Cassie",
    role: "社区中心前台协调员",
    storyId: null,
    episode: "专属剧情 · 待公布",
    storyTitle: "故事正在筹备中",
    storyDescription: "Cassie 的社区活动与前台沟通场景正在编排，故事确定后即可开放。",
    level: "故事待定",
    accent: "#f6b1ca",
    selectImage: "./npc/cassie/Cassie_00_grid_select.png",
    emotionAssets: {
      neutral: "./npc/cassie/Cassie_01_neutral.png",
      happy: "./npc/cassie/Cassie_02_happy.png",
      sad: "./npc/cassie/Cassie_03_sad.png",
      angry: "./npc/cassie/Cassie_04_angry.png",
      surprised: "./npc/cassie/Cassie_05_surprised.png",
      nervous: "./npc/cassie/Cassie_06_nervous.png",
    },
  },
];

const npcPresentation = Object.fromEntries(
  demoNpcLibrary.map((npc) => [
    npc.id,
    {
      role: npc.role,
      episode: npc.episode,
      storyTitle: npc.storyTitle,
      storyDescription: npc.storyDescription,
      level: npc.level,
      availability: npc.availability,
      accent: npc.accent,
      selectImage: npc.selectImage,
      emotionAssets: npc.emotionAssets,
    },
  ]),
);

const storyPresentation = {
  "lunch-mixup-cyrus-v1": {
    title: "拿错了老板的午饭",
    synopsis: "在 Cyrus 走进办公室之前说明午餐拿错，并处理后续问题。",
  },
};

let npcLibrary = demoNpcLibrary.map((npc) => ({ ...npc }));
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
let appMode = "connecting";
let apiReady = false;
let liveSession = null;
let pendingTurn = null;
let submittingTurn = false;
let userSelectedNpc = false;
let apiConnecting = false;
let conversationModalTrigger = null;
let conversationSessionId = null;
let optimisticConversationEntries = [];

const emotionAliases = {
  focused: "neutral",
  impatient: "angry",
  confused: "surprised",
  frustrated: "angry",
  concerned: "nervous",
  reserved: "neutral",
};

function normalizeEmotion(emotionId) {
  const normalized = emotionAliases[emotionId] || emotionId;
  return ["neutral", "happy", "sad", "angry", "nervous", "surprised"].includes(normalized)
    ? normalized
    : "neutral";
}

function setConnectionState(state, _label, { retryable = false } = {}) {
  appMode = state;
  $("apiRetryBtn").hidden = !retryable;
  document.querySelector(".experience").classList.toggle("live-mode", state === "live");
  $("introModeHint").textContent =
    state === "live"
      ? "真实剧情模式 · 你的表达将推动后端状态机"
      : state === "connecting"
        ? "正在检查真实剧情服务…"
        : "离线演示模式 · 可直接选择好 / 中 / 差表达";
}

function getStoredPlaythroughId() {
  try {
    return localStorage.getItem(PLAYTHROUGH_STORAGE_KEY);
  } catch {
    return null;
  }
}

function storePlaythroughId(sessionId) {
  try {
    if (sessionId) localStorage.setItem(PLAYTHROUGH_STORAGE_KEY, sessionId);
  } catch {
    // The story remains playable even when browser storage is unavailable.
  }
}

function clearStoredPlaythrough() {
  try {
    localStorage.removeItem(PLAYTHROUGH_STORAGE_KEY);
  } catch {
    // Ignore browsers that block local storage.
  }
}

async function apiRequest(path, options = {}) {
  const controller = new AbortController();
  const { timeoutMs = API_TIMEOUT_MS, headers = {}, ...fetchOptions } = options;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...fetchOptions,
      headers: {
        Accept: "application/json",
        ...(fetchOptions.body ? { "Content-Type": "application/json" } : {}),
        ...headers,
      },
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(payload.error || `请求失败（${response.status}）`);
      error.status = response.status;
      error.code = payload.code || "HTTP_ERROR";
      error.retryable = payload.retryable ?? response.status >= 500;
      throw error;
    }
    return payload;
  } catch (error) {
    if (error.name === "AbortError") {
      const timeoutError = new Error("剧情服务响应超时，请稍后重试。");
      timeoutError.code = "REQUEST_TIMEOUT";
      timeoutError.retryable = true;
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

function responseList(payload, key) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.[key])) return payload[key];
  if (Array.isArray(payload?.data?.[key])) return payload.data[key];
  return [];
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function firstNonEmptyString(...values) {
  return values.find((value) => typeof value === "string" && value.trim())?.trim();
}

function assertSupportedApiProtocol(protocolVersion) {
  if (!protocolVersion) return;
  const major = String(protocolVersion).split(".")[0];
  if (major === SUPPORTED_API_PROTOCOL_MAJOR) return;
  const error = new Error(`暂不支持后端 API 协议 ${protocolVersion}`);
  error.code = "UNSUPPORTED_API_PROTOCOL";
  error.retryable = false;
  throw error;
}

function normalizeApiNpc(apiNpc, story, presentationKey) {
  const presentation = npcPresentation[presentationKey];
  const profile = apiNpc.profile || apiNpc;
  const apiStatus = apiNpc.status === "active" ? "available" : apiNpc.status || "available";
  const hasPublishedStory = Boolean(story && !["draft", "archived"].includes(story.status));
  const canStartStory = apiStatus === "available" && hasPublishedStory;
  const localizedStory = storyPresentation[story?.id] || {};
  const episode =
    story?.episode ||
    story?.presentation?.episode ||
    (hasPublishedStory ? presentation.episode.replace("LINGOSTORY · ", "") : "专属剧情 · 待公布");
  const level = story?.level || story?.presentation?.level || presentation.level.split(" · ")[0];
  const estimatedMinutes =
    story?.estimatedMinutes ?? story?.presentation?.estimatedMinutes ?? 3;
  const storyTitle = firstNonEmptyString(
    story?.titleZh,
    story?.localization?.title,
    story?.presentation?.zhCN?.title,
    localizedStory.title,
    story?.title,
  );
  const storyDescription = firstNonEmptyString(
    story?.synopsisZh,
    story?.localization?.synopsis,
    story?.presentation?.zhCN?.synopsis,
    localizedStory.synopsis,
    story?.synopsis,
  );
  return {
    id: apiNpc.id || profile.npcId || presentationKey,
    source: "api",
    availability: canStartStory
      ? "available"
      : apiStatus === "disabled"
        ? "disabled"
        : "comingSoon",
    name: apiNpc.displayName || profile.displayName || presentationKey,
    role: presentation.role || profile.role,
    storyId: canStartStory ? story.id : null,
    estimatedMinutes,
    episode: episode.startsWith("LINGOSTORY") ? episode : `LINGOSTORY · ${episode}`,
    storyTitle: storyTitle || "故事正在筹备中",
    storyDescription:
      storyDescription ||
      (hasPublishedStory
        ? `开口推动剧情！在 ${estimatedMinutes} 分钟的自然对话中完成这次沟通挑战。`
        : `${apiNpc.displayName || profile.displayName || presentationKey} 的专属故事正在编排，确定后即可开放。`),
    level: canStartStory ? `${level} · 真实剧情` : "故事待定",
    accent: presentation.accent,
    selectImage: presentation.selectImage,
    emotionAssets: presentation.emotionAssets,
    supportedEmotions: Array.isArray(apiNpc.supportedEmotions)
      ? [...new Set(apiNpc.supportedEmotions.map(normalizeEmotion))]
      : Object.keys(presentation.emotionAssets),
  };
}

function buildApiNpcLibrary(npcPayload, storyPayload) {
  const apiNpcs = responseList(npcPayload, "npcs");
  const stories = responseList(storyPayload, "stories");
  return apiNpcs.flatMap((apiNpc) => {
    const profile = apiNpc.profile || apiNpc;
    const apiId = apiNpc.id || profile.npcId;
    const displayName = apiNpc.displayName || profile.displayName || "";
    const presentationKey = Object.keys(npcPresentation).find(
      (key) => key === String(apiId).toLowerCase() || key === displayName.toLowerCase(),
    );
    if (!presentationKey) return [];
    const matchingStories = stories.filter(
      (item) => {
        if (item.npcId) return item.npcId === apiId;
        const legacyNpcName = String(item.npc || "").toLowerCase();
        return legacyNpcName === displayName.toLowerCase() || legacyNpcName === presentationKey;
      },
    );
    const publishedStories = matchingStories
      .filter((item) => item.status === "published" || !item.status)
      .sort(
        (left, right) =>
          (Date.parse(right.createdAt || "") || 0) -
          (Date.parse(left.createdAt || "") || 0),
      );
    // Product decision: expose exactly one story per NPC, preferring the newest published one.
    const story = publishedStories[0] || matchingStories[0];
    return [normalizeApiNpc(apiNpc, story, presentationKey)];
  });
}

function latestSessionEvent(session, predicate) {
  return [...(session.events || [])].reverse().find(predicate);
}

function conversationEntry(event, npcName) {
  const localizedText = event.presentation?.zhCN?.text;
  const localizedStageText = event.presentation?.zhCN?.stageText;
  if (event.type === "user_utterance" && event.text) {
    return { kind: "user", speaker: "你", text: event.text };
  }
  if (event.type === "npc_utterance" && event.text) {
    return {
      kind: "npc",
      speaker: npcName,
      text: event.text,
      translation: localizedText && localizedText !== event.text ? localizedText : "",
    };
  }
  if (event.type === "npc_action") {
    const text = localizedStageText || event.stageText;
    return text ? { kind: "action", speaker: "动作", text } : null;
  }
  if (event.type === "session_started") {
    const text = localizedText || event.text;
    return text ? { kind: "system", speaker: "旁白", text } : null;
  }
  if (event.type === "hint_shown") {
    const text = localizedText || event.text;
    return text ? { kind: "system", speaker: "提示", text } : null;
  }
  return null;
}

function populateConversationList(list, count, entries) {
  list.replaceChildren();
  entries.forEach((entry) => {
    const item = document.createElement("li");
    item.className = `conversation-item is-${entry.kind}`;
    const speaker = document.createElement("span");
    speaker.className = "conversation-speaker";
    speaker.textContent = entry.speaker;
    const copy = document.createElement("div");
    const text = document.createElement("p");
    text.className = "conversation-text";
    text.textContent = entry.text;
    copy.append(text);
    if (entry.translation) {
      const translation = document.createElement("p");
      translation.className = "conversation-translation";
      translation.textContent = entry.translation;
      copy.append(translation);
    }
    item.append(speaker, copy);
    list.append(item);
  });
  count.textContent = `${entries.length} 条`;
}

function conversationSignature(entry) {
  return [entry.kind, entry.speaker, entry.text, entry.translation || ""].join("\u0000");
}

function conversationEndsWith(entries, tail) {
  if (!tail.length || entries.length < tail.length) return false;
  return tail.every(
    (entry, index) =>
      conversationSignature(entry) ===
      conversationSignature(entries[entries.length - tail.length + index]),
  );
}

function currentTurnConversationEntries(npcReply, userText, npcName) {
  const entries = [];
  if (userText) entries.push({ kind: "user", speaker: "你", text: userText });
  if (npcReply?.utterance) {
    entries.push({
      kind: "npc",
      speaker: npcName,
      text: npcReply.utterance,
      translation: npcReply.translationZh || "",
    });
  }
  if (npcReply?.stageText) {
    entries.push({ kind: "action", speaker: "动作", text: npcReply.stageText });
  }
  return entries;
}

function currentTurnIsInServerHistory(serverEntries, currentTurnEntries) {
  const serverDialogue = serverEntries.filter(
    (entry) => entry.kind === "user" || entry.kind === "npc",
  );
  const currentDialogue = currentTurnEntries.filter(
    (entry) => entry.kind === "user" || entry.kind === "npc",
  );
  return conversationEndsWith(serverDialogue, currentDialogue);
}

function renderConversation(session, npcReply = null, userText = "") {
  const sessionId = session.sessionId || session.id;
  if (conversationSessionId !== sessionId) {
    conversationSessionId = sessionId;
    optimisticConversationEntries = [];
  }

  const serverEntries = (session.events || [])
    .map((event) => conversationEntry(event, session.activeNpc?.displayName || activeNpc.name))
    .filter(Boolean);
  const currentTurnEntries = currentTurnConversationEntries(
    npcReply,
    userText,
    session.activeNpc?.displayName || session.activeNpc?.name || activeNpc.name,
  );
  if (
    currentTurnEntries.length &&
    !currentTurnIsInServerHistory(serverEntries, currentTurnEntries)
  ) {
    optimisticConversationEntries.push(...currentTurnEntries);
  }
  const entries = [...serverEntries, ...optimisticConversationEntries];
  populateConversationList($("conversationList"), $("conversationCount"), entries);
  populateConversationList(
    $("endingConversationList"),
    $("endingConversationCount"),
    entries,
  );
  $("conversationPanel").disabled = entries.length === 0;
  $("endingConversationPanel").classList.toggle(
    "hidden",
    entries.length === 0 || session.phase !== "ended",
  );
  if (entries.length === 0) closeConversationModal({ restoreFocus: false });
}

function openConversationModal() {
  if ($("conversationPanel").disabled) return;
  conversationModalTrigger = document.activeElement;
  $("conversationModal").classList.remove("hidden");
  $("conversationPanel").setAttribute("aria-expanded", "true");
  document.body.classList.add("conversation-modal-open");
  $("closeConversationModal").focus();
}

function closeConversationModal({ restoreFocus = true } = {}) {
  $("conversationModal").classList.add("hidden");
  $("conversationPanel").setAttribute("aria-expanded", "false");
  document.body.classList.remove("conversation-modal-open");
  if (restoreFocus && conversationModalTrigger instanceof HTMLElement) {
    conversationModalTrigger.focus();
  }
  conversationModalTrigger = null;
}

function setTurnBusy(busy) {
  submittingTurn = busy;
  $("turnInput").disabled = busy;
  $("sendTurnBtn").disabled = busy;
  $("sendTurnBtn").textContent = busy ? "剧情推进中…" : "发送 →";
  $("transcriptBox").classList.toggle("processing", busy);
}

function localizedApiError(error) {
  const messages = {
    NPC_NOT_FOUND: "这个角色不存在或已被移除。",
    STORY_NOT_FOUND: "这个故事不存在或已被移除。",
    STORY_NOT_PUBLISHED: "这个故事暂时不可开始。",
    PLAYTHROUGH_NOT_FOUND: "没有找到上一次剧情记录，请重新开始。",
    PLAYTHROUGH_ENDED: "这段剧情已经结束。",
    INVALID_TURN: "这句话暂时无法提交，请检查后重试。",
    TURN_PROCESSING_FAILED: "这一轮处理失败了，请稍后重试。",
    MODEL_UNAVAILABLE: "AI 剧情服务暂时不可用，请稍后重试。",
    RATE_LIMITED: "请求有点频繁，请稍后再试。",
    INTERNAL_ERROR: "剧情服务暂时出了点问题，请稍后重试。",
    REQUEST_TIMEOUT: "剧情服务响应超时，请稍后重试。",
  };
  return messages[error?.code] || error?.message || "这一轮暂时没有发送成功。";
}

function showTurnError(error) {
  $("turnErrorText").textContent = localizedApiError(error);
  $("turnError").classList.remove("hidden");
  $("retryTurnBtn").disabled = error?.retryable === false;
}

function hideTurnError() {
  $("turnError").classList.add("hidden");
  $("retryTurnBtn").disabled = false;
}

function renderLiveSession(session, npcReply = null, userText = "") {
  if (!session) return;
  liveSession = session;
  storePlaythroughId(session.sessionId || session.id);

  const sessionNpcId = session.activeNpc?.id;
  const sessionNpc = npcLibrary.find((npc) => npc.id === sessionNpcId);
  if (sessionNpc && sessionNpc !== activeNpc) {
    activeNpc = sessionNpc;
    applyActiveNpc();
  }

  renderConversation(session, npcReply, userText);

  if (session.phase === "ended") {
    showLiveEnding(session);
    return;
  }

  const progress = session.progress;
  const localizedSession = session.presentation?.zhCN;
  const currentHint = localizedSession?.currentHint || session.currentHint;
  const hint = typeof currentHint === "string" ? currentHint : currentHint?.text;
  const stageLabel = progress?.current
    ? `剧情阶段 ${progress.current}${progress.total ? `/${progress.total}` : ""}`
    : "当前剧情";
  const latestNpcUtterance = latestSessionEvent(
    session,
    (event) => event.type === "npc_utterance" && Boolean(event.text),
  );
  const latestNpcAction = latestSessionEvent(
    session,
    (event) => event.type === "npc_action" && Boolean(event.stageText),
  );
  const latestUserEvent = latestSessionEvent(
    session,
    (event) => event.type === "user_utterance" && Boolean(event.text),
  );
  const replyText = npcReply?.utterance || latestNpcUtterance?.text;
  const replyStageText =
    latestNpcAction?.presentation?.zhCN?.stageText ||
    npcReply?.stageText ||
    latestNpcAction?.stageText;
  const replyEmotion =
    npcReply?.emotionId ||
    latestNpcUtterance?.emotionId ||
    latestNpcAction?.emotionId ||
    session.activeNpc?.emotionId;
  const replyTranslation =
    npcReply?.translationZh || latestNpcUtterance?.presentation?.zhCN?.text || "";

  $("roundLabel").textContent = `${stageLabel} · 沟通目标`;
  $("roundCount").textContent = progress?.total
    ? `${progress.current ?? 1} / ${progress.total}`
    : `${session.remainingTurns ?? "动态"} 回合`;
  $("progressFill").style.width = progress?.percent == null ? "0%" : `${clampScore(progress.percent)}%`;
  $("taskTitle").textContent =
    localizedSession?.currentGoal || session.currentGoal || "继续自然地推动剧情";
  $("taskHint").textContent = hint || "表达你的真实意图，系统会在故事结束后集中复盘。";
  $("sceneLabel").textContent = `真实剧情 · ${stageLabel}`;
  $("speakerName").textContent = replyText ? activeNpc.name : "旁白";
  $("subtitle").textContent =
    replyText ||
    localizedSession?.opening ||
    session.opening ||
    "轮到你了。用自己的方式推动剧情。";
  $("translation").textContent = replyTranslation;
  $("translation").classList.toggle("hidden", !replyTranslation);
  $("transcript").textContent = userText || latestUserEvent?.text || "输入你的英文表达，它会出现在这里…";
  $("crisisBadge").textContent = replyStageText || "剧情正在变化";
  $("crisisBadge").classList.toggle("visible", Boolean(replyStageText));
  $("timerValue").textContent = "∞";
  $("timer").style.setProperty("--progress", "1");
  $("timer").querySelector("span").textContent = "自由说";
  $("voiceStatus").textContent = "文本回合已接入 · 语音将在 P2 开放";
  $("turnForm").classList.remove("hidden");
  $("keyboardTip").classList.add("hidden");
  hideTurnError();
  setCharacter(normalizeEmotion(replyEmotion));
}

function controllerFeedback(controller) {
  if (!controller) return "文本回合已接入 · 语音将在 P2 开放";
  if (controller.outcome === "success") return "表达有效，剧情已进入下一阶段";
  if (controller.outcome === "partial") return "对方理解了一部分，可以继续补充";
  if (controller.outcome === "failure") return "这次还没有推动目标，试着说得更明确";
  return "表达已提交，剧情正在继续";
}

function showLiveEnding(session) {
  clearInterval(timerId);
  liveSession = session;
  $("progressFill").style.width = "100%";
  $("roundLabel").textContent = "END · 剧情完成";
  $("roundCount").textContent = "已保存";
  $("turnForm").classList.add("hidden");
  $("turnError").classList.add("hidden");

  const endingCopy = {
    good: {
      stamp: "危机解除",
      title: "你顺利完成了这次沟通",
      description: `${activeNpc.name} 接受了你的处理方式，真实剧情已保存。`,
      color: "#dff0c0",
      mood: "happy",
    },
    bad: {
      stamp: "惊险收尾",
      title: "故事结束了，但还有提升空间",
      description: "后端状态机已经给出结局；学习评分将在下一里程碑接入。",
      color: "#ffd9e5",
      mood: "angry",
    },
    mixed: {
      stamp: "普通结局",
      title: "你完成了这段真实对话",
      description: "本轮分支和结局均来自后端，稍后可继续补充学习复盘。",
      color: "#fff0a9",
      mood: "neutral",
    },
  };
  const copy = endingCopy[session.ending] || endingCopy.mixed;
  $("endingStamp").textContent = copy.stamp;
  $("endingStamp").style.background = copy.color;
  $("endingTitle").textContent = copy.title;
  $("endingDesc").textContent = copy.description;
  $("endingOverlay").querySelector(".report-kicker").textContent = "STORY COMPLETE · 剧情结果";
  $("reviewSuggestion").textContent = "剧情数据已保存；逐句评分、折线图和带练将在 P1 学习复盘接口接入后开放。";
  $("retryBtn").textContent = "重新体验故事";
  setCharacter(normalizeEmotion(session.activeNpc?.emotionId || copy.mood));
  $("liveReviewNotice").classList.remove("hidden");
  $("endingOverlay").querySelector(".ending-card").classList.add("story-only");
  document.querySelector(".experience").classList.add("review-mode");
  $("endingOverlay").classList.remove("hidden");
}

function createClientTurnId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `turn_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

async function submitLiveTurn(text, existingTurn = null) {
  const normalizedText = String(text || "").trim();
  const sessionId = liveSession?.sessionId || liveSession?.id;
  if (!sessionId || !normalizedText || submittingTurn) return;

  const request = existingTurn || { clientTurnId: createClientTurnId(), text: normalizedText };
  pendingTurn = request;
  hideTurnError();
  setTurnBusy(true);
  $("transcript").textContent = normalizedText;
  $("voiceStatus").textContent = "AI 正在理解你的意思并推进剧情…";

  try {
    const payload = await apiRequest(`/api/playthroughs/${encodeURIComponent(sessionId)}/turn`, {
      method: "POST",
      body: JSON.stringify(request),
      timeoutMs: 45000,
    });
    pendingTurn = null;
    $("turnInput").value = "";
    renderLiveSession(payload.session || payload, payload.npc || null, normalizedText);
    $("voiceStatus").textContent = controllerFeedback(payload.controller);
  } catch (error) {
    showTurnError(error);
    $("voiceStatus").textContent = "发送未成功，剧情没有继续";
  } finally {
    setTurnBusy(false);
  }
}

async function startLiveStory() {
  hideTurnError();
  $("startBtn").disabled = true;
  $("startBtn").textContent = "正在创建剧情…";
  try {
    const payload = await apiRequest(`/api/stories/${encodeURIComponent(activeNpc.storyId)}/playthroughs`, {
      method: "POST",
      body: JSON.stringify({}),
    });
    const session = payload.session || payload;
    $("introOverlay").classList.add("hidden");
    renderLiveSession(session);
    $("turnInput").focus();
  } catch (error) {
    $("introModeHint").textContent = `暂时无法开始：${localizedApiError(error)}`;
  } finally {
    $("startBtn").disabled = false;
    $("startBtn").innerHTML = '开始挑战 <span>→</span>';
  }
}

async function restorePlaythrough() {
  const sessionId = getStoredPlaythroughId();
  if (!sessionId) return false;
  try {
    const payload = await apiRequest(`/api/playthroughs/${encodeURIComponent(sessionId)}`);
    const session = payload.session || payload;
    const sessionNpc = npcLibrary.find((npc) => npc.id === session.activeNpc?.id);
    if (sessionNpc) activeNpc = sessionNpc;
    applyActiveNpc();
    document.querySelector(".experience").classList.remove("library-mode");
    $("npcLibraryOverlay").classList.add("hidden");
    $("introOverlay").classList.add("hidden");
    renderLiveSession(session);
    return true;
  } catch (error) {
    if (error.status === 404 || error.code === "PLAYTHROUGH_NOT_FOUND") {
      clearStoredPlaythrough();
    }
    return false;
  }
}

async function initializeData({ force = false } = {}) {
  if (apiConnecting) return;
  if (window.location.protocol === "file:") {
    setConnectionState("demo", "离线演示");
    const requestedDemoNpc = npcLibrary.find(
      (npc) =>
        npc.id === REQUESTED_NPC_ID &&
        npc.availability === "available" &&
        npc.storyId,
    );
    if (requestedDemoNpc) {
      activeNpc = requestedDemoNpc;
      clearStoredPlaythrough();
      applyActiveNpc();
      resetStory();
    }
    return;
  }

  apiConnecting = true;
  setConnectionState("connecting", "正在连接剧情服务");
  try {
    const health = await apiRequest("/api/health", { timeoutMs: API_DISCOVERY_TIMEOUT_MS });
    if (health.ok === false) throw new Error("剧情服务尚未就绪");
    assertSupportedApiProtocol(health.protocolVersion);
    const [npcPayload, storyPayload] = await Promise.all([
      apiRequest("/api/npcs", { timeoutMs: API_DISCOVERY_TIMEOUT_MS }),
      apiRequest("/api/stories", { timeoutMs: API_DISCOVERY_TIMEOUT_MS }),
    ]);
    const apiLibrary = buildApiNpcLibrary(npcPayload, storyPayload);
    const defaultApiNpc = apiLibrary.find(
      (npc) => npc.availability === "available" && npc.storyId,
    );
    const requestedApiNpc = apiLibrary.find(
      (npc) =>
        npc.id === REQUESTED_NPC_ID &&
        npc.availability === "available" &&
        npc.storyId,
    );
    if (!defaultApiNpc) throw new Error("后端暂未提供可体验的公开剧情");
    if (userSelectedNpc && !force) {
      setConnectionState("demo", "本轮离线演示");
      return;
    }

    npcLibrary = apiLibrary;
    activeNpc = requestedApiNpc || defaultApiNpc;
    apiReady = true;
    renderNpcLibrary();
    applyActiveNpc();
    setConnectionState("live", "真实 API");
    if (requestedApiNpc) {
      clearStoredPlaythrough();
      resetStory();
    } else {
      await restorePlaythrough();
    }
  } catch (error) {
    apiReady = false;
    npcLibrary = demoNpcLibrary.map((npc) => ({ ...npc }));
    activeNpc =
      npcLibrary.find(
        (npc) =>
          npc.id === REQUESTED_NPC_ID &&
          npc.availability === "available" &&
          npc.storyId,
      ) || npcLibrary[0];
    renderNpcLibrary();
    applyActiveNpc();
    const incompatibleProtocol = error.code === "UNSUPPORTED_API_PROTOCOL";
    setConnectionState(
      "demo",
      incompatibleProtocol ? "API 协议不兼容 · 离线演示" : "AI 服务不可用 · 离线演示",
      { retryable: error.retryable !== false },
    );
    $("introModeHint").title = error.message;
    if (activeNpc.id === REQUESTED_NPC_ID) {
      clearStoredPlaythrough();
      resetStory();
    }
  } finally {
    apiConnecting = false;
  }
}

function renderNpcLibrary() {
  const grid = $("npcGrid");
  grid.replaceChildren();
  $("npcCount").textContent = String(npcLibrary.length);
  const playableCount = npcLibrary.filter(
    (npc) => npc.availability === "available" && npc.storyId,
  ).length;
  $("npcCountLabel").textContent = `位角色 · ${playableCount} 段可体验`;

  npcLibrary.forEach((npc) => {
    const isPlayable = npc.availability === "available" && Boolean(npc.storyId);
    const detailHref = `./npc.html?id=${encodeURIComponent(npc.id)}`;
    const card = document.createElement("article");
    card.className = `npc-card${isPlayable ? "" : " is-coming-soon"}`;
    card.dataset.npcId = npc.id;
    card.style.setProperty("--npc-accent", npc.accent || "#ffd95e");
    card.innerHTML = `
      <div class="npc-portrait">
        <span class="npc-availability">${
          isPlayable ? (npc.source === "api" ? "可体验" : "演示可用") : "故事筹备中"
        }</span>
        <img src="${escapeHtml(npc.selectImage)}" alt="${escapeHtml(npc.name)} 的角色选择立绘" />
      </div>
      <div class="npc-card-body">
        <span class="npc-role">${escapeHtml(npc.role)}</span>
        <h2>${escapeHtml(npc.name)}</h2>
        ${isPlayable ? `<span class="npc-story-level">${escapeHtml(npc.level)}</span>` : ""}
        <span class="npc-story-label">${
          isPlayable
            ? `专属剧情 · ${escapeHtml(npc.episode.replace("LINGOSTORY · ", ""))}`
            : "专属剧情 · 待公布"
        }</span>
        <p class="npc-story-title">${escapeHtml(npc.storyTitle)}</p>
        <div class="npc-card-actions">
          <a class="npc-details" href="${escapeHtml(detailHref)}">查看角色档案 <span>→</span></a>
          <button
            class="npc-enter"
            type="button"
            ${isPlayable ? `data-select-npc="${escapeHtml(npc.id)}"` : "disabled"}
          >
            ${isPlayable ? `选择 ${escapeHtml(npc.name)}，进入剧情 →` : "专属故事筹备中"}
          </button>
        </div>
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
  $("estimatedMinutes").textContent = `约 ${activeNpc.estimatedMinutes || 3} 分钟`;
  $("interactionModeLabel").textContent =
    activeNpc.source === "api" ? "文本互动" : "语音模拟";
  $("character").alt = `${activeNpc.name} 的中性情绪立绘`;
  setCharacter("neutral");
}

function setCharacter(mood) {
  const character = $("character");
  const safeMood = activeNpc.emotionAssets?.[mood] ? mood : "neutral";
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
  $("timer").querySelector("span").textContent = "秒";
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
  const xStep = plotWidth / Math.max(1, reviewEntries.length - 1);
  const x = (index) => padding.left + xStep * index;
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
  $("endingOverlay").querySelector(".ending-card").classList.remove("story-only");
  $("endingOverlay").querySelector(".report-kicker").textContent = "STORY COMPLETE · 学习复盘";
  $("liveReviewNotice").classList.add("hidden");
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
  secondsLeft = 8;
  listening = false;
  reviewEntries = [];
  coachStep = -1;
  focusReviewIndex = 0;
  liveSession = null;
  conversationSessionId = null;
  optimisticConversationEntries = [];
  pendingTurn = null;
  submittingTurn = false;
  $("endingOverlay").classList.add("hidden");
  $("endingOverlay").querySelector(".ending-card").classList.remove("story-only");
  $("liveReviewNotice").classList.add("hidden");
  closeConversationModal({ restoreFocus: false });
  $("conversationPanel").disabled = true;
  $("conversationList").replaceChildren();
  $("conversationCount").textContent = "0 条";
  $("endingConversationPanel").classList.add("hidden");
  $("endingConversationPanel").removeAttribute("open");
  $("endingConversationList").replaceChildren();
  $("endingConversationCount").textContent = "0 条";
  $("progressFill").style.width = "0";
  $("roundLabel").textContent = "准备阶段";
  $("roundCount").textContent = appMode === "live" ? "动态剧情" : "0 / 4";
  $("taskTitle").textContent = "先看清发生了什么";
  $("taskHint").textContent = "点击开始挑战，进入第一轮沟通。";
  $("sceneLabel").textContent = "午休 · 12:21";
  $("crisisBadge").textContent = "他快走到门口了";
  $("subtitle").textContent = "你刚坐下就发现——两份午饭拿反了。老板那份，已经被你打开过。";
  $("translation").textContent = `而 ${activeNpc.name} 正走向他的办公室。`;
  $("speakerName").textContent = "旁白";
  $("voiceStatus").textContent =
    appMode === "live" ? "文本回合已接入 · 语音将在 P2 开放" : "点击麦克风，或按住空格说话";
  $("transcript").textContent = "你的表达会出现在这里…";
  $("transcriptBox").classList.remove("processing");
  $("translation").classList.remove("hidden");
  $("turnForm").reset();
  $("turnForm").classList.add("hidden");
  $("turnInput").disabled = false;
  $("sendTurnBtn").disabled = false;
  $("sendTurnBtn").textContent = "发送 →";
  hideTurnError();
  $("keyboardTip").classList.toggle("hidden", appMode === "live");
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
  if (!nextNpc || nextNpc.availability !== "available" || !nextNpc.storyId) return;
  userSelectedNpc = true;
  clearStoredPlaythrough();
  activeNpc = nextNpc;
  applyActiveNpc();
  resetStory();
}

$("startBtn").addEventListener("click", async () => {
  if (apiReady && activeNpc.source === "api") {
    await startLiveStory();
    return;
  }
  $("introOverlay").classList.add("hidden");
  loadRound(0);
});
$("npcGrid").addEventListener("click", (event) => {
  const button = event.target.closest("[data-select-npc]");
  if (button) selectNpc(button.dataset.selectNpc);
});
$("brandHome").addEventListener("click", (event) => {
  event.preventDefault();
  clearStoredPlaythrough();
  showNpcLibrary();
});
$("restartBtn").addEventListener("click", () => {
  clearStoredPlaythrough();
  showNpcLibrary();
});
$("retryBtn").addEventListener("click", () => {
  clearStoredPlaythrough();
  resetStory();
});
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
$("micBtn").addEventListener("click", () => {
  if (appMode === "live") {
    $("turnInput").focus();
    $("voiceStatus").textContent = "P0 先使用文本输入 · 语音将在 P2 接入";
    return;
  }
  if (listening) choosePath("good");
  else simulateListening();
});
$("turnForm").addEventListener("submit", (event) => {
  event.preventDefault();
  submitLiveTurn($("turnInput").value);
});
$("turnInput").addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
    event.preventDefault();
    $("turnForm").requestSubmit();
  }
});
$("retryTurnBtn").addEventListener("click", () => {
  if (pendingTurn) submitLiveTurn(pendingTurn.text, pendingTurn);
});
$("conversationPanel").addEventListener("click", openConversationModal);
$("closeConversationModal").addEventListener("click", () => closeConversationModal());
$("conversationModal").addEventListener("click", (event) => {
  if (event.target === event.currentTarget) closeConversationModal();
});
$("apiRetryBtn").addEventListener("click", () => {
  userSelectedNpc = false;
  initializeData({ force: true });
});
$("soundBtn").addEventListener("click", (event) => {
  event.currentTarget.textContent = event.currentTarget.textContent === "♪" ? "×" : "♪";
});
document.querySelectorAll(".path-btn").forEach((button) => {
  button.addEventListener("click", () => choosePath(button.dataset.path));
});
document.addEventListener("keydown", (event) => {
  if (!$("conversationModal").classList.contains("hidden")) {
    if (event.key === "Escape") closeConversationModal();
    return;
  }
  const editing = event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement;
  if (editing) return;
  if (event.code === "Space") {
    event.preventDefault();
    if (appMode === "live") $("turnInput").focus();
    else if (round >= 0) simulateListening();
  }
  if (appMode !== "live") {
    if (event.key === "1") choosePath("good");
    if (event.key === "2") choosePath("mid");
    if (event.key === "3") choosePath("bad");
  }
});
window.addEventListener("resize", () => {
  if (document.querySelector(".experience").classList.contains("review-mode")) {
    drawScoreTrendChart(focusReviewIndex);
  }
});

renderNpcLibrary();
applyActiveNpc();
showNpcLibrary();
initializeData();
