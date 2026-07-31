const $ = (id) => document.getElementById(id);

const API_BASE_URL = String(window.LINGOSTORY_API_BASE_URL || "").replace(/\/$/, "");
const API_TIMEOUT_MS = 12000;

const fallbackProfiles = {
  cyrus: {
    id: "cyrus",
    displayName: "Cyrus",
    status: "available",
    role: "Senior executive at a large technology company",
    roleZh: "大型科技公司的高级管理者",
    personality:
      "Busy, decisive, observant, fair-minded, and pragmatic. He values accountability without overreacting to honest mistakes and has a restrained sense of humor.",
    relationship:
      "The player's boss and a senior leader with authority over their work. He expects professionalism but evaluates the player fairly.",
    speakingStyle:
      "Concise, calm, and professional. Uses plain English, asks focused questions, and gives clear decisions or next steps.",
    playerRole: "You are an employee speaking with your manager, Cyrus, during the workday.",
    playerRoleZh: "你是一名员工，正在工作时间与经理 Cyrus 沟通。",
    personalityZh:
      "忙碌、果断、观察力强、公平且务实。他重视担当，但不会对诚实的错误反应过度，也有克制的幽默感。",
    relationshipZh:
      "Cyrus 是你的老板和拥有工作管理权的高级领导。他要求专业，但会公平评价你的表现。",
    speakingStyleZh:
      "表达简洁、冷静而专业。他使用清楚直接的英语，提出聚焦的问题，并给出明确决定或下一步。",
    selectImage: "./npc/cyrus/Cyrus_00_grid_select.png",
    accent: "#ffd95e",
    storyTitle: "拿错了老板的午饭",
  },
  kate: {
    id: "kate",
    displayName: "Kate",
    status: "comingSoon",
    role: "Community library assistant who helps visitors find resources and practice everyday English",
    roleZh: "社区图书馆助理，帮助访客查找资料并练习日常英语",
    personality:
      "Warm, observant, practical, and gently humorous. She is patient with mistakes and asks thoughtful questions.",
    relationship:
      "A familiar, supportive library contact who maintains friendly professional boundaries.",
    speakingStyle:
      "Natural, friendly English with short-to-medium sentences and common vocabulary.",
    personalityZh:
      "温暖、细心、务实，带有温和的幽默感。她对错误很有耐心，也会提出经过思考的问题。",
    relationshipZh:
      "Kate 是你熟悉且可靠的图书馆联系人，态度友善，同时保持职业边界。",
    speakingStyleZh: "使用自然友好的英语，常用词汇为主，句子长度较短或适中。",
    selectImage: "./npc/kate/Kate_00_grid_select.png",
    accent: "#f9b2cc",
  },
  mike: {
    id: "mike",
    displayName: "Mike",
    status: "comingSoon",
    role: "Customer support coordinator at a local office-supply company",
    roleZh: "本地办公用品公司的客户支持协调员",
    personality:
      "Approachable, patient, practical, and quietly humorous. Mike listens carefully and asks straightforward questions.",
    relationship:
      "A friendly recurring acquaintance who remains professional and respects personal boundaries.",
    speakingStyle:
      "Natural conversational English with short to medium-length sentences and a warm tone.",
    personalityZh:
      "随和、耐心、务实，带有低调的幽默感。Mike 会认真倾听，并提出直接的问题。",
    relationshipZh:
      "Mike 是你经常接触的友好熟人，保持专业，也尊重个人边界。",
    speakingStyleZh: "使用温暖自然的日常英语，句子长度较短或适中。",
    selectImage: "./npc/mike/Mike_00_grid_select.png",
    accent: "#abd9ff",
  },
  mary: {
    id: "mary",
    displayName: "Mary",
    status: "comingSoon",
    role: "Community library assistant and everyday conversation partner",
    roleZh: "社区图书馆助理，也是你的日常会话伙伴",
    personality:
      "Warm, observant, practical, and gently humorous. Mary listens carefully and admits mistakes.",
    relationship:
      "A familiar, supportive community acquaintance who remains professionally appropriate.",
    speakingStyle:
      "Natural, friendly everyday English with clear sentences and moderate pacing.",
    personalityZh:
      "温暖、细心、务实，带有温和的幽默感。Mary 会认真倾听，也愿意承认错误。",
    relationshipZh:
      "Mary 是你熟悉且支持你的社区联系人，同时保持合适的职业边界。",
    speakingStyleZh: "使用清晰、自然、友好的日常英语，语速适中。",
    selectImage: "./npc/mary/Mary_00_grid_select.png",
    accent: "#d7e8a5",
  },
  cassie: {
    id: "cassie",
    displayName: "Cassie",
    status: "comingSoon",
    role: "Front-desk coordinator at a neighborhood community center",
    roleZh: "社区中心前台协调员",
    personality:
      "Warm, observant, practical, and gently humorous. Cassie listens carefully and treats mistakes with patience.",
    relationship:
      "A familiar community-center contact who remains friendly and professionally appropriate.",
    speakingStyle:
      "Clear conversational English with moderate pacing, common vocabulary, and concise explanations.",
    personalityZh:
      "温暖、细心、务实，带有温和的幽默感。Cassie 会认真倾听，也会耐心对待错误。",
    relationshipZh:
      "Cassie 是你熟悉的社区中心联系人，态度友好，同时保持职业关系。",
    speakingStyleZh:
      "使用清晰的日常英语，语速适中，以常见词汇和简洁解释为主。",
    selectImage: "./npc/cassie/Cassie_00_grid_select.png",
    accent: "#ffc992",
  },
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

function renderProfile(npc, fallback, story, storyDetail) {
  const profile = npc?.profile || npc;
  const id = npc?.id || profile?.npcId || fallback.id;
  const status = npc?.status === "active" ? "available" : npc?.status || fallback.status;
  const displayName = npc?.displayName || profile?.displayName || fallback.displayName;
  const hasStory = Boolean(story && status === "available");
  const localizedPlayerRole =
    storyDetail?.localization?.playerRole ||
    storyDetail?.presentation?.zhCN?.playerRole;
  const localizedNpc = npc?.presentation?.zhCN || profile?.presentation?.zhCN || {};

  $("profileHero").style.setProperty("--profile-accent", fallback.accent);
  $("npcPortrait").src = fallback.selectImage;
  $("npcPortrait").alt = `${displayName} 的角色立绘`;
  $("npcName").textContent = displayName;
  $("npcRoleZh").textContent = localizedNpc.role || fallback.roleZh;
  $("npcRoleEn").textContent = profileValue(npc, "role", fallback);
  $("npcPersonalityZh").textContent = localizedNpc.personality || fallback.personalityZh;
  $("npcPersonalityEn").textContent = profileValue(npc, "personality", fallback);
  $("npcRelationshipZh").textContent = localizedNpc.relationship || fallback.relationshipZh;
  $("npcRelationshipEn").textContent = profileValue(npc, "relationship", fallback);
  $("npcSpeakingStyleZh").textContent = localizedNpc.speakingStyle || fallback.speakingStyleZh;
  $("npcSpeakingStyleEn").textContent = profileValue(npc, "speakingStyle", fallback);
  $("playerRoleZh").textContent =
    localizedPlayerRole ||
    fallback.playerRoleZh ||
    "专属故事确定后，这里会显示你与角色相遇时的身份。";
  $("playerRoleEn").textContent =
    storyDetail?.playerRole ||
    fallback.playerRole ||
    "Your role will appear when this character's story is ready.";

  const badge = $("availabilityBadge");
  badge.dataset.state = status;
  badge.textContent = hasStory
    ? "故事可体验"
    : status === "disabled"
      ? "角色已下线"
      : "专属故事筹备中";

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

  renderProfile(fallback, fallback, null, null);
  if (window.location.protocol === "file:") {
    return;
  }

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
    renderProfile(npc, fallback, story, storyDetail);
  } catch {
    renderProfile(fallback, fallback, null, null);
  }
}

initializeProfile();
