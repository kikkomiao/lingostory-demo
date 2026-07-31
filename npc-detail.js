const $ = (id) => document.getElementById(id);

const API_BASE_URL = String(window.LINGOSTORY_API_BASE_URL || "").replace(/\/$/, "");
const API_TIMEOUT_MS = 12000;

const fallbackProfiles = {
  cyrus: {
    id: "cyrus",
    displayName: "Cyrus",
    status: "available",
    role: "Senior executive at a large technology company",
    personality:
      "Busy, decisive, observant, fair-minded, and pragmatic. He values accountability without overreacting to honest mistakes and has a restrained sense of humor.",
    relationship:
      "The player's boss and a senior leader with authority over their work. He expects professionalism but evaluates the player fairly.",
    speakingStyle:
      "Concise, calm, and professional. Uses plain English, asks focused questions, and gives clear decisions or next steps.",
    playerRole: "You are an employee speaking with your manager, Cyrus, during the workday.",
    selectImage: "./npc/cyrus/Cyrus_00_grid_select.png",
    accent: "#ffd95e",
    storyTitle: "拿错了老板的午饭",
  },
  kate: {
    id: "kate",
    displayName: "Kate",
    status: "comingSoon",
    role: "Community library assistant who helps visitors find resources and practice everyday English",
    personality:
      "Warm, observant, practical, and gently humorous. She is patient with mistakes and asks thoughtful questions.",
    relationship:
      "A familiar, supportive library contact who maintains friendly professional boundaries.",
    speakingStyle:
      "Natural, friendly English with short-to-medium sentences and common vocabulary.",
    selectImage: "./npc/kate/Kate_00_grid_select.png",
    accent: "#f9b2cc",
  },
  mike: {
    id: "mike",
    displayName: "Mike",
    status: "comingSoon",
    role: "Customer support coordinator at a local office-supply company",
    personality:
      "Approachable, patient, practical, and quietly humorous. Mike listens carefully and asks straightforward questions.",
    relationship:
      "A friendly recurring acquaintance who remains professional and respects personal boundaries.",
    speakingStyle:
      "Natural conversational English with short to medium-length sentences and a warm tone.",
    selectImage: "./npc/mike/Mike_00_grid_select.png",
    accent: "#abd9ff",
  },
  mary: {
    id: "mary",
    displayName: "Mary",
    status: "comingSoon",
    role: "Community library assistant and everyday conversation partner",
    personality:
      "Warm, observant, practical, and gently humorous. Mary listens carefully and admits mistakes.",
    relationship:
      "A familiar, supportive community acquaintance who remains professionally appropriate.",
    speakingStyle:
      "Natural, friendly everyday English with clear sentences and moderate pacing.",
    selectImage: "./npc/mary/Mary_00_grid_select.png",
    accent: "#d7e8a5",
  },
  cassie: {
    id: "cassie",
    displayName: "Cassie",
    status: "comingSoon",
    role: "Front-desk coordinator at a neighborhood community center",
    personality:
      "Warm, observant, practical, and gently humorous. Cassie listens carefully and treats mistakes with patience.",
    relationship:
      "A familiar community-center contact who remains friendly and professionally appropriate.",
    speakingStyle:
      "Clear conversational English with moderate pacing, common vocabulary, and concise explanations.",
    selectImage: "./npc/cassie/Cassie_00_grid_select.png",
    accent: "#ffc992",
  },
};

const emotionLabels = {
  neutral: "中性",
  happy: "开心",
  sad: "难过",
  angry: "生气",
  nervous: "紧张",
  surprised: "惊讶",
};

function responseList(payload, key) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.[key])) return payload[key];
  if (Array.isArray(payload?.data?.[key])) return payload.data[key];
  return [];
}

async function apiRequest(path, timeoutMs = API_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || `请求失败（${response.status}）`);
    return payload;
  } finally {
    clearTimeout(timeoutId);
  }
}

function setConnectionState(state, label) {
  const status = $("detailConnectionStatus");
  status.dataset.state = state;
  status.querySelector("span").textContent = label;
}

function latestPublishedStory(stories, npcId) {
  return stories
    .filter(
      (story) =>
        story.npcId === npcId && (story.status === "published" || !story.status),
    )
    .sort(
      (left, right) =>
        (Date.parse(right.createdAt || "") || 0) -
        (Date.parse(left.createdAt || "") || 0),
    )[0];
}

function profileValue(npc, key, fallback) {
  const profile = npc?.profile || npc || {};
  return profile[key] || npc?.[key] || fallback?.[key] || "暂未提供";
}

function renderEmotionChips(emotions) {
  const chips = $("emotionChips");
  chips.replaceChildren();
  [...new Set(emotions || Object.keys(emotionLabels))].forEach((emotion) => {
    if (!emotionLabels[emotion]) return;
    const chip = document.createElement("span");
    chip.textContent = emotionLabels[emotion];
    chips.append(chip);
  });
}

function renderProfile(npc, fallback, story, storyDetail, source) {
  const profile = npc?.profile || npc;
  const id = npc?.id || profile?.npcId || fallback.id;
  const status = npc?.status === "active" ? "available" : npc?.status || fallback.status;
  const displayName = npc?.displayName || profile?.displayName || fallback.displayName;
  const hasStory = Boolean(story && status === "available");
  const localizedPlayerRole =
    storyDetail?.localization?.playerRole ||
    storyDetail?.presentation?.zhCN?.playerRole ||
    storyDetail?.playerRole;

  $("profileHero").style.setProperty("--profile-accent", fallback.accent);
  $("npcPortrait").src = fallback.selectImage;
  $("npcPortrait").alt = `${displayName} 的角色立绘`;
  $("npcName").textContent = displayName;
  $("npcRole").textContent = profileValue(npc, "role", fallback);
  $("npcPersonality").textContent = profileValue(npc, "personality", fallback);
  $("npcRelationship").textContent = profileValue(npc, "relationship", fallback);
  $("npcSpeakingStyle").textContent = profileValue(npc, "speakingStyle", fallback);
  $("playerRole").textContent =
    localizedPlayerRole ||
    fallback.playerRole ||
    "专属故事确定后，这里会显示你与角色相遇时的身份。";
  $("profileSource").textContent =
    source === "api" ? "角色资料已与后端公开配置同步" : "当前展示内置资料 · 后端恢复后会自动同步";

  const badge = $("availabilityBadge");
  badge.dataset.state = status;
  badge.textContent = hasStory
    ? "真实故事可体验"
    : status === "disabled"
      ? "角色已下线"
      : "专属故事筹备中";

  renderEmotionChips(npc?.supportedEmotions);

  const storyAction = $("storyAction");
  storyAction.classList.toggle("hidden", !hasStory);
  storyAction.href = `./index.html?npc=${encodeURIComponent(id)}`;
  storyAction.textContent = story?.title
    ? `进入《${fallback.storyTitle || story.title}》→`
    : "进入专属故事 →";
  document.title = `${displayName} · 角色资料 · LingoStory`;
}

function showNotFound() {
  $("profileContent").classList.add("hidden");
  $("profileNotFound").classList.remove("hidden");
  setConnectionState("demo", "角色不存在");
}

async function initializeProfile() {
  const requestedId = String(new URLSearchParams(window.location.search).get("id") || "cyrus")
    .trim()
    .toLowerCase();
  const fallback = fallbackProfiles[requestedId];
  if (!fallback) {
    showNotFound();
    return;
  }

  renderProfile(fallback, fallback, null, null, "fallback");
  if (window.location.protocol === "file:") {
    setConnectionState("demo", "离线角色资料");
    return;
  }

  setConnectionState("connecting", "正在同步角色资料");
  try {
    const [npcPayload, storyPayload] = await Promise.all([
      apiRequest("/api/npcs"),
      apiRequest("/api/stories"),
    ]);
    const npc = responseList(npcPayload, "npcs").find((item) => item.id === requestedId);
    if (!npc) {
      showNotFound();
      return;
    }
    const story = latestPublishedStory(responseList(storyPayload, "stories"), requestedId);
    let storyDetail = null;
    if (story?.id) {
      storyDetail = await apiRequest(`/api/stories/${encodeURIComponent(story.id)}`).catch(
        () => null,
      );
    }
    renderProfile(npc, fallback, story, storyDetail, "api");
    setConnectionState("live", "后端资料已同步");
  } catch (error) {
    renderProfile(fallback, fallback, null, null, "fallback");
    setConnectionState("demo", "后端不可用 · 内置资料");
    $("profileSource").title = error.message;
  }
}

initializeProfile();
