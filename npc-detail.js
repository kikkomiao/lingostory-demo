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
    displayName: "結衣",
    status: "available",
    role: "Airline staff member assisting passengers at the airport",
    roleZh: "在机场协助旅客的航司工作人员",
    personality:
      "Calm, attentive, practical, and reassuring. She stays courteous under pressure and asks focused questions when an answer is unclear.",
    relationship:
      "The airline staff member assisting you at the airport check-in counter.",
    speakingStyle:
      "Natural, courteous Japanese at approximately JLPT N4-N3 level, using concise service language.",
    playerRole: "You are a passenger flying from Tokyo to Shanghai.",
    playerRoleZh: "你是一名准备从东京飞往上海的旅客。",
    personalityZh:
      "冷静、细心、务实且让人安心。遇到没有听清的回答时，她会礼貌地聚焦追问。",
    relationshipZh:
      "結衣是在机场值机柜台协助你办理手续的航司工作人员。",
    speakingStyleZh: "使用自然、礼貌、简洁的日语服务表达，难度约为 JLPT N4–N3。",
    selectImage: "./npc/kate/Kate_00_grid_select.png",
    accent: "#cfe6ff",
    storyTitle: "日本机场值机",
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
    accent: "#f2a05f",
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
    accent: "#d89a6a",
  },
  cassie: {
    id: "cassie",
    displayName: "Cassie",
    status: "available",
    role: "Customer Experience Project Coordinator",
    roleZh: "客户体验项目协调员",
    personality:
      "Warm, articulate, practical, and ambitious. Cassie values collaboration, but under performance pressure she can avoid uncomfortable accountability.",
    relationship:
      "Cassie is your peer and project collaborator on a customer-retention proposal.",
    speakingStyle:
      "Clear conversational English with moderate pacing, common vocabulary, and concise explanations.",
    playerRole: "You are Cassie's peer and collaborator on a customer-retention proposal.",
    playerRoleZh: "你是 Cassie 的同级同事，与她共同参与一项客户留存方案。",
    personalityZh:
      "友善、善于表达、务实且有进取心。Cassie 重视合作，但在绩效压力下可能回避难堪的责任。",
    relationshipZh:
      "Cassie 是你的同级同事，也是这项客户留存方案的项目协作者。",
    speakingStyleZh:
      "使用清晰的日常英语，语速适中，以常见词汇和简洁解释为主。",
    selectImage: "./npc/cassie/Cassie_00_grid_select.png",
    accent: "#f6b1ca",
    storyTitle: "这个想法是谁的？",
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
