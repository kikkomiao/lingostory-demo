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
    targetLanguage: "ja",
    role: "Airline staff member assisting passengers at the airport",
    roleZh: "在机场协助旅客的航司工作人员",
    roleJa: "空港で旅客のチェックインをサポートする航空会社スタッフ",
    personality:
      "Calm, attentive, practical, and reassuring. She stays courteous under pressure and asks focused questions when an answer is unclear.",
    personalityJa:
      "冷静で気配りがあり、実務的で安心感のある人です。答えがはっきりしないときも、丁寧に要点を絞って確認します。",
    relationship:
      "The airline staff member assisting you at the airport check-in counter.",
    relationshipJa:
      "結衣は空港のチェックインカウンターであなたの手続きをサポートする航空会社スタッフです。",
    speakingStyle:
      "Natural, courteous Japanese at approximately JLPT N4-N3 level, using concise service language.",
    speakingStyleJa:
      "JLPT N4〜N3程度の、自然で丁寧かつ簡潔な日本語の接客表現を使います。",
    playerRole: "You are a passenger flying from Tokyo to Shanghai.",
    playerRoleZh: "你是一名准备从东京飞往上海的旅客。",
    playerRoleJa: "あなたは東京から上海へ向かう旅客です。",
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
    status: "available",
    role: "Station staff member at Tin Hau MTR station in Hong Kong",
    roleZh: "香港天后港铁站的车站工作人员",
    personality:
      "Approachable, patient, practical, and quietly humorous. Mike listens carefully and asks straightforward questions.",
    relationship:
      "The station staff member helping you travel from Tin Hau to Central.",
    speakingStyle:
      "Short, clear Traditional Chinese sentences in controlled natural Cantonese.",
    personalityZh:
      "随和、耐心、务实，带有低调的幽默感。Mike 会认真倾听，并提出直接的问题。",
    relationshipZh: "Mike 正在协助你确认从天后站前往中环的固定路线。",
    speakingStyleZh: "使用繁体中文、短句和常见词语，以自然但受控的香港粤语沟通。",
    selectImage: "./npc/mike/Mike_00_grid_select.png",
    accent: "#f2a05f",
    storyTitle: "在港铁站问路",
  },
  mary: {
    id: "mary",
    displayName: "Mary",
    status: "available",
    role: "Barista at a friendly neighborhood café",
    roleZh: "友好社区咖啡店的咖啡师",
    personality:
      "Warm, patient, observant, and practical. Mary keeps first-time customers comfortable and never rushes a language learner.",
    relationship:
      "Mary is the barista serving you while you order one drink at the café counter.",
    speakingStyle:
      "Short, natural, friendly everyday English with clear café vocabulary and moderate pacing.",
    personalityZh:
      "温暖、耐心、细心且务实。Mary 会让第一次点单的顾客感到轻松，也不会催促语言学习者。",
    relationshipZh:
      "Mary 是正在为你点单的咖啡师，你是在吧台购买一杯饮品的顾客。",
    speakingStyleZh: "使用简短、自然、友好的日常英语，咖啡店词汇清楚，语速适中。",
    selectImage: "./npc/mary/Mary_00_grid_select.png",
    accent: "#d89a6a",
    storyTitle: "在街角咖啡店点单",
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
  const isJapanese =
    (storyDetail?.targetLanguage || story?.targetLanguage || fallback.targetLanguage) === "ja";
  const secondaryCopy = isJapanese
    ? {
        role: fallback.roleJa,
        personality: fallback.personalityJa,
        relationship: storyDetail?.npc?.relationship || fallback.relationshipJa,
        speakingStyle: storyDetail?.npc?.speakingStyle || fallback.speakingStyleJa,
        playerRole: storyDetail?.playerRole || fallback.playerRoleJa,
      }
    : {
        role: profileValue(npc, "role", fallback),
        personality: profileValue(npc, "personality", fallback),
        relationship: profileValue(npc, "relationship", fallback),
        speakingStyle: profileValue(npc, "speakingStyle", fallback),
        playerRole:
          storyDetail?.playerRole ||
          fallback.playerRole ||
          "Your role will appear when this character's story is ready.",
      };
  const secondaryElements = [
    $("npcRoleEn"),
    $("npcPersonalityEn"),
    $("npcRelationshipEn"),
    $("npcSpeakingStyleEn"),
    $("playerRoleEn"),
  ];
  secondaryElements.forEach((element) => element.setAttribute("lang", isJapanese ? "ja" : "en"));

  $("profileHero").style.setProperty("--profile-accent", fallback.accent);
  $("npcPortrait").src = fallback.selectImage;
  $("npcPortrait").alt = `${displayName} 的角色立绘`;
  $("npcName").textContent = displayName;
  $("npcRoleZh").textContent = localizedNpc.role || fallback.roleZh;
  $("npcRoleEn").textContent = secondaryCopy.role;
  $("npcPersonalityZh").textContent = localizedNpc.personality || fallback.personalityZh;
  $("npcPersonalityEn").textContent = secondaryCopy.personality;
  $("npcRelationshipZh").textContent = localizedNpc.relationship || fallback.relationshipZh;
  $("npcRelationshipEn").textContent = secondaryCopy.relationship;
  $("npcSpeakingStyleZh").textContent = localizedNpc.speakingStyle || fallback.speakingStyleZh;
  $("npcSpeakingStyleEn").textContent = secondaryCopy.speakingStyle;
  $("playerRoleZh").textContent =
    localizedPlayerRole ||
    fallback.playerRoleZh ||
    "专属故事确定后，这里会显示你与角色相遇时的身份。";
  $("playerRoleEn").textContent = secondaryCopy.playerRole;

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
