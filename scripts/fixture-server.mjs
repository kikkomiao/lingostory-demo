import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";

const root = new URL("../", import.meta.url).pathname;
const emotions = ["neutral", "happy", "sad", "angry", "nervous", "surprised"];
const profiles = [
  ["cassie", "Cassie", "available", "Customer Experience Project Coordinator"],
  ["mary", "Mary", "comingSoon", "Community library assistant and everyday conversation partner"],
  ["mike", "Mike", "comingSoon", "Customer support coordinator at a local office-supply company"],
  ["kate", "結衣", "available", "Airline staff member assisting passengers at the airport"],
  ["cyrus", "Cyrus", "available", "Senior executive at a large technology company"],
];

function createSession({ story = "cyrus" } = {}) {
  const japanese = story === "yui";
  const cassie = story === "cassie";
  return {
    id: "fixture-session",
    sessionId: "fixture-session",
    storyId: japanese
      ? "japan-airport-checkin-yui-ja-v2"
      : cassie
        ? "whose-idea-cassie-en-v1"
        : "lunch-mixup-cyrus-v1",
    storyTitle: japanese ? "日本の空港でチェックイン" : cassie ? "Whose Idea Was It?" : "The Lunch Mix-Up",
    playerRole: japanese
      ? "あなたは東京から上海へ向かう旅客です。"
      : cassie
        ? "You are Cassie's peer and collaborator."
        : "You are an employee.",
    opening: japanese
      ? "東京の空港で、結衣が予約名を確認します。"
      : cassie
        ? "The meeting has ended. Cassie asks you not to correct the public record yet."
        : "You discover the lunch mix-up as Cyrus walks toward the office.",
    targetLanguage: japanese ? "ja" : "en",
    activeNpc: {
      id: japanese ? "kate" : cassie ? "cassie" : "cyrus",
      displayName: japanese ? "結衣" : cassie ? "Cassie" : "Cyrus",
      emotionId: "neutral",
      voiceProfile: japanese
        ? {
            provider: "qwen3-tts",
            model: "Qwen3-TTS-12Hz-1.7B-CustomVoice",
            voiceId: "ono_anna",
            language: "Japanese",
          }
        : {
            provider: "qwen3-tts",
            model: "Qwen3-TTS-12Hz-1.7B-CustomVoice",
            voiceId: "ryan",
            language: "English",
          },
    },
    currentBeatId: japanese ? "confirm_name" : cassie ? "respond_request" : "intercept",
    currentGoal: japanese
      ? "予約の名前を結衣に伝える。"
      : cassie
        ? "Respond to Cassie's request without giving up your claim."
        : "Get Cyrus's attention before he reaches the lunch.",
    currentHint: {
      level: 1,
      text: japanese
        ? "自分の名前を短く伝えてください。"
        : cassie
          ? "Acknowledge her concern and say the record still needs correcting."
          : "Ask Cyrus to stop before explaining.",
    },
    presentation: {
      zhCN: {
        opening: japanese
          ? "你来到东京机场的值机柜台，結衣请你说出预订姓名。"
          : cassie
            ? "会议刚结束，Cassie 希望你暂时不要纠正公开记录。"
            : "你发现两份午饭拿反了，而 Cyrus 正走向办公室。",
        currentGoal: japanese
          ? "告诉結衣你的预订姓名。"
          : cassie
            ? "回应 Cassie，但不要放弃对原创贡献的主张。"
            : "在 Cyrus 进门前叫住他。",
        currentHint: {
          level: 1,
          text: japanese
            ? "简短说出自己的姓名。"
            : cassie
              ? "先回应她的压力，再明确正式记录仍需纠正。"
              : "先明确请 Cyrus 停一下，再解释发生了什么。",
        },
      },
    },
    remainingTurns: cassie ? 6 : 1,
    progress: { current: 1, total: 6, percent: 0 },
    phase: "active",
    events: [],
  };
}

let session = createSession();
const turnResponses = new Map();
let reviewStatus = "not_started";
const historyReviewResult = {
  summaryZh: "表达清楚，解决方案具体，语气还可以更自然。",
  confidence: "high",
  limitationsZh: ["fixture 数据仅用于检查历史页呈现。"],
  dimensions: [
    ["comprehensibility", 4, "关键信息明确，对方能够理解。"],
    ["grammar_control", 3, "句子结构基本稳定。"],
    ["vocabulary_use", 3, "词汇能够支持任务完成。"],
    ["naturalness", 2, "少量表达带有直译感。"],
    ["coherence_concision", 3, "信息顺序清楚。"],
    ["pragmatic_appropriacy", 3, "语气符合职场场景。"],
  ].map(([id, level, rationaleZh]) => ({ id, level, rationaleZh, evidenceEventIds: ["history-user-1"] })),
  strengths: [{ titleZh: "行动说得很具体", explanationZh: "你让对方清楚知道下一步会发生什么。", evidenceEventIds: ["history-user-1"] }],
  priorities: [{ category: "naturalness", severity: "awkward_but_clear", titleZh: "减少直译感", explanationZh: "意思清楚，但可以使用更常见的口语搭配。", practiceTipZh: "练习用 by mistake 说明无意失误。", evidenceEventIds: ["history-user-1"] }],
  examples: [{ eventId: "history-user-1", original: "I take your lunch by mistake.", minimalCorrection: "I took your lunch by mistake.", naturalAlternative: "I’m afraid I picked up your lunch by mistake.", explanationZh: "时态正确，并用缓和语气说明无意拿错。" }],
  nextPracticeGoalZh: "失误后立即补充解决动作",
};

const historyItems = [
  {
    playthroughId: "history-1",
    storyId: "lunch-mixup-cyrus-v1",
    storyTitle: "The Lunch Mix-Up",
    storyTitleZh: "拿错了老板的午饭",
    npcId: "cyrus",
    npcName: "Cyrus",
    targetLanguage: "en",
    ending: "good",
    endingId: "resolved",
    endingPresentation: { stamp: "危机解除", title: "你顺利完成了沟通", description: "Cyrus 接受了解释和解决方案。" },
    turnCount: 3,
    startedAt: "2026-08-01T02:00:00.000Z",
    completedAt: "2026-08-01T02:06:00.000Z",
    reviewStatus: "completed",
  },
  {
    playthroughId: "history-2",
    storyId: "whose-idea-cassie-en-v1",
    storyTitle: "Whose Idea Was It?",
    storyTitleZh: "这个想法是谁的？",
    npcId: "cassie",
    npcName: "Cassie",
    targetLanguage: "en",
    ending: "mixed",
    endingId: "shared_record",
    endingPresentation: { stamp: "记录已更新", title: "贡献终于被写清", description: "公开说明已经修改，正式分工仍需继续确认。" },
    turnCount: 5,
    startedAt: "2026-07-31T12:00:00.000Z",
    completedAt: "2026-07-31T12:08:00.000Z",
    reviewStatus: "pending",
  },
];

function json(response, status, body) {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
}

async function readJson(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function turnCopy(turnNumber) {
  if (session.targetLanguage === "ja") {
    return {
      utterance:
        turnNumber === 1
          ? "ありがとうございます。お預けになる荷物はありますか。"
          : "窓側と通路側、どちらがいいですか。",
      stageText: "結衣 confirms the check-in information.",
      stageTextZh: "結衣确认值机信息并继续下一项。",
      emotionId: turnNumber === 1 ? "neutral" : "happy",
    };
  }
  if (session.activeNpc.id === "cassie") {
    const cassieTurns = [
      ["I know this looks unfair. Please let me explain before we change the record.", "Cassie closes the meeting notes and waits for your answer.", "Cassie 合上会议记录，等待你的回应。", "nervous"],
      ["You're right: the core idea came from you. I developed the case and presented it.", "Cassie separates the original idea from the later execution work.", "Cassie 将原创想法与后续执行工作分开说明。", "neutral"],
      ["I was under pressure to show ownership, but that doesn't justify leaving you out.", "Cassie acknowledges the performance pressure without using it as an excuse.", "Cassie 承认绩效压力，但没有把它当成借口。", "sad"],
      ["The proposal auto-submits in ten minutes, and I'm currently the only owner listed.", "A submission reminder appears on the project screen.", "项目屏幕弹出十分钟后自动提交的提醒。", "surprised"],
      ["I can record your authorship and change the owner field. Tell me the arrangement you want.", "Cassie opens the public post and formal ownership fields.", "Cassie 打开公开帖子和正式负责人字段。", "neutral"],
      ["Done. The correction is public and the formal ownership record has changed.", "Cassie sends the correction and submits the updated proposal.", "Cassie 发出更正，并提交修改后的方案。", "happy"],
    ];
    const [utterance, stageText, stageTextZh, emotionId] = cassieTurns[Math.min(turnNumber - 1, cassieTurns.length - 1)];
    return { utterance, stageText, stageTextZh, emotionId };
  }
  if (turnNumber === 1) {
    return {
      utterance: "Okay, I'm stopping. What happened?",
      stageText: "Cyrus stops at the office door.",
      stageTextZh: "Cyrus 在办公室门口停下。",
      emotionId: "surprised",
    };
  }
  return {
    utterance: "I understand part of it. Which lunch box was yours?",
    stageText: "Cyrus looks at the two lunch boxes.",
    stageTextZh: "Cyrus 查看两份午饭盒。",
    emotionId: "nervous",
  };
}

function advanceSession(turnNumber, emotionId) {
  session.activeNpc.emotionId = emotionId;
  if (session.targetLanguage === "ja") {
    if (turnNumber === 1) {
      session.currentBeatId = "confirm_baggage";
      session.currentGoal = "預ける荷物があるか、個数も答える。";
      session.currentHint = { level: 1, text: "荷物の有無と個数を伝えてください。" };
      session.presentation.zhCN.currentGoal = "回答是否有托运行李，并说明数量。";
      session.presentation.zhCN.currentHint = { level: 1, text: "说明有无行李以及数量。" };
      session.remainingTurns = 2;
      session.progress = { current: 2, total: 6, percent: 33 };
    }
    return;
  }

  if (session.activeNpc.id === "cassie") {
    const beats = ["private_reason", "clarify_contributions", "performance_pressure", "deadline_reveal", "negotiate_record", "implement_change"];
    const goals = [
      "Hear Cassie's explanation while protecting your claim.",
      "Confirm who created the idea and who developed the case.",
      "Respond to the performance pressure without losing focus.",
      "React to the ten-minute submission deadline.",
      "Negotiate credit, ownership, and the next presentation.",
      "Require the agreement to be implemented now.",
    ];
    if (turnNumber < 6) {
      session.currentBeatId = beats[turnNumber];
      session.currentGoal = goals[turnNumber];
      session.presentation.zhCN.currentGoal = [
        "先听解释，同时守住原创贡献。",
        "确认原创想法和案例完善分别由谁完成。",
        "回应绩效压力，但不要偏离正式记录。",
        "处理十分钟后的自动提交期限。",
        "谈判署名、负责人和下次汇报安排。",
        "要求立即落实口头协议。",
      ][turnNumber];
      session.remainingTurns = 6 - turnNumber;
      session.progress = { current: turnNumber + 1, total: 6, percent: Math.round((turnNumber / 6) * 100) };
    } else {
      session.currentBeatId = null;
      session.currentGoal = null;
      session.currentHint = null;
      session.presentation.zhCN.currentGoal = null;
      session.presentation.zhCN.currentHint = null;
      session.remainingTurns = 0;
      session.progress = { current: 6, total: 6, percent: 100 };
      session.phase = "ended";
      session.ending = "good";
      session.endingId = "fair_joint_record";
      session.presentation.zhCN.ending = {
        stamp: "贡献已写清",
        title: "共同署名，分工明确",
        description: "更正已经发出。原创与执行贡献分别写清，正式负责人记录也已改为共同负责。",
      };
    }
    return;
  }

  if (turnNumber === 1) {
    session.currentBeatId = "explain_mixup";
    session.currentGoal = "Explain what happened.";
    session.currentHint = { level: 1, text: "Mention the two lunch boxes." };
    session.presentation.zhCN.currentGoal = "解释两份午饭为什么拿错了。";
    session.presentation.zhCN.currentHint = { level: 1, text: "说明两份午饭拿反了。" };
    session.remainingTurns = 2;
    session.progress = { current: 2, total: 3, percent: 33 };
  } else if (turnNumber === 2) {
    session.currentBeatId = "resolve_mixup";
    session.currentGoal = "Offer a concrete solution.";
    session.currentHint = { level: 1, text: "Say what you will do next." };
    session.presentation.zhCN.currentGoal = "提出一个明确的解决方案。";
    session.presentation.zhCN.currentHint = { level: 1, text: "说明你接下来会采取什么行动。" };
    session.remainingTurns = 1;
    session.progress = { current: 3, total: 3, percent: 67 };
  } else {
    session.currentBeatId = null;
    session.currentGoal = null;
    session.currentHint = null;
    session.presentation.zhCN.currentGoal = null;
    session.presentation.zhCN.currentHint = null;
    session.remainingTurns = 0;
    session.progress = { current: 3, total: 3, percent: 100 };
    session.phase = "ended";
    session.ending = "good";
  }
}

function appendTurn(userText, npc, turnNumber, source) {
  const createdAt = new Date().toISOString();
  session.events.push(
    {
      id: `evt-user-${turnNumber}`,
      type: "user_utterance",
      actor: "user",
      text: userText,
      source,
      createdAt,
    },
    {
      id: `evt-npc-${turnNumber}`,
      type: "npc_utterance",
      actor: "npc",
      text: npc.utterance,
      emotionId: npc.emotionId,
      createdAt,
    },
    {
      id: `evt-action-${turnNumber}`,
      type: "npc_action",
      actor: "npc",
      stageText: npc.stageText,
      emotionId: npc.emotionId,
      presentation: { zhCN: { stageText: npc.stageTextZh } },
      createdAt,
    },
  );
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url, "http://127.0.0.1:18892");
  if (url.pathname === "/api/health") {
    return json(response, 200, { ok: true, protocolVersion: "1.2" });
  }
  if (url.pathname === "/api/npcs") {
    return json(response, 200, {
      npcs: profiles.map(([id, displayName, status, role]) => ({
        id,
        displayName,
        status,
        supportedEmotions: emotions,
        profile: {
          npcId: id,
          displayName,
          role,
          voiceProfile:
            id === "kate"
              ? { voiceId: "ono_anna", language: "Japanese" }
              : { voiceId: "ryan", language: "English" },
        },
      })),
    });
  }
  if (url.pathname === "/api/stories") {
    return json(response, 200, {
      stories: [
        {
          id: "lunch-mixup-cyrus-v1",
          title: "The Lunch Mix-Up",
          synopsis: "An English synopsis.",
          synopsisZh: "在 Cyrus 进办公室前处理拿错午饭的危机。",
          npc: "Cyrus",
          npcId: "cyrus",
          status: "published",
          level: "B2-C1",
          estimatedMinutes: 7,
          targetLanguage: "en",
          createdAt: "2026-07-31T00:00:00.000Z",
        },
        {
          id: "japan-airport-checkin-yui-ja-v2",
          title: "日本の空港でチェックイン",
          titleZh: "日本机场值机",
          synopsis: "東京から上海へ出発する前に、簡単な質問に答えます。",
          synopsisZh: "从东京飞往上海前，用简单日语回答結衣的值机问题并拿到登机牌。",
          npc: "結衣",
          npcId: "kate",
          status: "published",
          level: "JLPT N4–N3",
          estimatedMinutes: 4,
          targetLanguage: "ja",
          createdAt: "2026-08-01T00:00:00.000Z",
        },
        {
          id: "whose-idea-cassie-en-v1",
          title: "Whose Idea Was It?",
          titleZh: "这个想法是谁的？",
          synopsis: "Clarify credit and change the formal ownership record before submission.",
          synopsisZh: "在提交前厘清原创与执行贡献，并真正修改署名和负责人记录。",
          npc: "Cassie",
          npcId: "cassie",
          status: "published",
          level: "B1–B2",
          estimatedMinutes: 6,
          targetLanguage: "en",
          createdAt: "2026-08-01T01:00:00.000Z",
        },
      ],
    });
  }
  if (url.pathname === "/api/stories/lunch-mixup-cyrus-v1") {
    return json(response, 200, {
      id: "lunch-mixup-cyrus-v1",
      title: "The Lunch Mix-Up",
      npcId: "cyrus",
      status: "published",
      playerRole: "You are an employee speaking with your manager, Cyrus, during the workday.",
      localization: { playerRole: "你是一名员工，正在工作时间与经理 Cyrus 沟通。" },
    });
  }
  if (url.pathname === "/api/stories/japan-airport-checkin-yui-ja-v2") {
    return json(response, 200, {
      id: "japan-airport-checkin-yui-ja-v2",
      title: "日本の空港でチェックイン",
      npcId: "kate",
      status: "published",
      playerRole: "あなたは東京から上海へ向かう旅客です。",
      localization: { playerRole: "你是一名准备从东京飞往上海的旅客。" },
    });
  }
  if (url.pathname === "/api/stories/whose-idea-cassie-en-v1") {
    return json(response, 200, {
      id: "whose-idea-cassie-en-v1",
      title: "Whose Idea Was It?",
      npcId: "cassie",
      status: "published",
      playerRole: "You are Cassie's peer and collaborator on a customer-retention proposal.",
      localization: { playerRole: "你是 Cassie 的同级同事，与她共同参与一项客户留存方案。" },
    });
  }
  if (url.pathname === "/api/playthroughs/history") {
    return json(response, 200, {
      items: historyItems,
      total: historyItems.length,
      nextCursor: null,
    });
  }
  const historyDetailMatch = url.pathname.match(/^\/api\/playthroughs\/(history-[12])\/history-detail$/);
  if (historyDetailMatch) {
    const item = historyItems.find((entry) => entry.playthroughId === historyDetailMatch[1]);
    const cassie = item.npcId === "cassie";
    const review = item.reviewStatus === "completed"
      ? { playthroughId: item.playthroughId, status: "completed", rubricVersion: "language-review-v2", retryable: false, result: historyReviewResult }
      : { playthroughId: item.playthroughId, status: item.reviewStatus, rubricVersion: "language-review-v2", retryable: false };
    return json(response, 200, {
      playthroughId: item.playthroughId,
      story: {
        id: item.storyId,
        title: item.storyTitle,
        titleZh: item.storyTitleZh,
        synopsisZh: cassie ? "在提交前厘清原创与执行贡献。" : "在 Cyrus 进办公室前处理拿错午饭的危机。",
        targetLanguage: item.targetLanguage,
        npcId: item.npcId,
        npcName: item.npcName,
      },
      ending: { type: item.ending, id: item.endingId, presentation: item.endingPresentation },
      turnCount: item.turnCount,
      startedAt: item.startedAt,
      completedAt: item.completedAt,
      route: [
        { index: 1, beatId: "intercept", goalZh: cassie ? "回应 Cassie，同时守住原创贡献。" : "在 Cyrus 进门前叫住他。", userLines: [{ eventId: "history-user-1", text: cassie ? "The record still needs to show where the idea came from." : "Could you stop for a moment, please?" }] },
        { index: 2, beatId: "solution", goalZh: cassie ? "确认双方贡献并提出记录方案。" : "说明发生了什么并提出解决方案。", userLines: [{ eventId: "history-user-2", text: cassie ? "Let’s list the idea and execution separately." : "I picked up your lunch by mistake. I’ll replace it now." }], decision: { id: "take_responsibility", description: cassie ? "将原创和执行贡献分别写清" : "主动承担并立即补救", evidence: [] } },
      ],
      conversation: [
        { id: "history-start", beatId: "intercept", type: "session_started", actor: "system", text: "Story started", presentation: { zhCN: { text: cassie ? "会议结束后，Cassie 希望你暂时不要更改公开记录。" : "你发现两份午饭拿反了，而 Cyrus 正走向办公室。" } }, createdAt: item.startedAt },
        { id: "history-user-1", beatId: "intercept", type: "user_utterance", actor: "user", text: cassie ? "The record still needs to show where the idea came from." : "Could you stop for a moment, please?", createdAt: item.startedAt },
        { id: "history-npc-1", beatId: "intercept", type: "npc_utterance", actor: "npc", text: cassie ? "You’re right. We should make the contributions explicit." : "Sure. What happened?", createdAt: item.startedAt },
        { id: "history-action-1", beatId: "solution", type: "npc_action", actor: "npc", stageText: cassie ? "Cassie opens the public ownership record." : "Cyrus stops at the office door.", createdAt: item.completedAt },
      ],
      languageReview: review,
    });
  }
  const historyReviewMatch = url.pathname.match(/^\/api\/playthroughs\/(history-[12])\/language-review$/);
  if (historyReviewMatch && request.method === "POST") {
    const item = historyItems.find((entry) => entry.playthroughId === historyReviewMatch[1]);
    item.reviewStatus = "completed";
    return json(response, 202, { playthroughId: item.playthroughId, status: "pending", rubricVersion: "language-review-v2", retryable: false });
  }
  if (
    url.pathname === "/api/stories/lunch-mixup-cyrus-v1/playthroughs" &&
    request.method === "POST"
  ) {
    session = createSession();
    turnResponses.clear();
    reviewStatus = "not_started";
    return json(response, 201, { session });
  }
  if (
    url.pathname === "/api/stories/japan-airport-checkin-yui-ja-v2/playthroughs" &&
    request.method === "POST"
  ) {
    session = createSession({ story: "yui" });
    turnResponses.clear();
    return json(response, 201, { session });
  }
  if (
    url.pathname === "/api/stories/whose-idea-cassie-en-v1/playthroughs" &&
    request.method === "POST"
  ) {
    session = createSession({ story: "cassie" });
    turnResponses.clear();
    reviewStatus = "not_started";
    return json(response, 201, { session });
  }
  if (
    url.pathname === "/api/playthroughs/fixture-session/turn" &&
    request.method === "POST"
  ) {
    const input = await readJson(request);
    const cached = turnResponses.get(input.clientTurnId);
    if (cached) return json(response, 200, cached);

    const userText = String(input.text || "").trim();
    const turnNumber = turnResponses.size + 1;
    const copy = turnCopy(turnNumber);
    const npc = {
      id: session.activeNpc.id,
      name: session.activeNpc.displayName,
      utterance: copy.utterance,
      stageText: copy.stageText,
      emotionId: copy.emotionId,
      voiceProfile: session.activeNpc.voiceProfile,
    };
    appendTurn(userText, copy, turnNumber, input.source || "unknown");
    advanceSession(turnNumber, copy.emotionId);
    const payload = {
      session,
      npc,
      controller: {
        outcome: turnNumber === 1 ? "success" : "partial",
        reason: turnNumber === 1 ? "task_completed" : "meaningful_progress",
      },
      fallbackUsed: false,
    };
    turnResponses.set(input.clientTurnId, payload);
    return json(response, 200, payload);
  }
  if (url.pathname === "/api/playthroughs/fixture-session") {
    return json(response, 200, session);
  }
  if (url.pathname === "/api/playthroughs/fixture-session/language-review") {
    if (session.phase !== "ended") {
      return json(response, 200, {
        playthroughId: session.sessionId,
        status: "unavailable",
        rubricVersion: "language-review-v1",
        retryable: false,
      });
    }
    if (request.method === "POST") reviewStatus = "pending";
    if (reviewStatus === "pending") {
      reviewStatus = "completed";
      return json(response, request.method === "POST" ? 202 : 200, {
        playthroughId: session.sessionId,
        status: "pending",
        rubricVersion: "language-review-v1",
        retryable: false,
      });
    }
    if (reviewStatus === "not_started") {
      return json(response, 200, {
        playthroughId: session.sessionId,
        status: "not_started",
        rubricVersion: "language-review-v1",
        retryable: true,
      });
    }
    return json(response, 200, {
      playthroughId: session.sessionId,
      status: "completed",
      rubricVersion: "language-review-v1",
      retryable: false,
      result: {
        summaryZh: "你能清楚说明问题并给出解决方案，整体沟通有效；下一步可以让语气更自然、收尾更完整。",
        confidence: "high",
        limitationsZh: ["本地 fixture 仅用于检查前端呈现，不代表真实模型评价。"],
        dimensions: [
          ["comprehensibility", 4, "关键信息明确，对方能顺利理解你的意图。"],
          ["grammar_control", 3, "句子结构基本稳定，少量细节仍可调整。"],
          ["vocabulary_use", 3, "词汇足以完成任务，并能描述具体行动。"],
          ["naturalness", 2, "部分表达正确但略显直译，可以换成更常见的说法。"],
          ["coherence_concision", 3, "信息顺序清楚，没有明显绕行。"],
          ["pragmatic_appropriacy", 3, "语气符合职场场景，收尾还可以更周全。"],
        ].map(([id, level, rationaleZh]) => ({ id, level, rationaleZh, evidenceEventIds: ["evt-user-1"] })),
        strengths: [
          {
            titleZh: "解决动作很明确",
            explanationZh: "你不仅说明了问题，也告诉对方接下来会怎么处理。",
            evidenceEventIds: ["evt-user-3"],
          },
        ],
        priorities: [
          {
            category: "naturalness",
            severity: "awkward_but_clear",
            titleZh: "减少逐字翻译感",
            explanationZh: "原句可以理解，但不是这个场景中最常见的表达。",
            practiceTipZh: "先记住一个完整语块，再替换其中的具体信息。",
            evidenceEventIds: ["evt-user-2"],
          },
        ],
        examples: [
          {
            eventId: "evt-user-2",
            original: session.events.find((event) => event.id === "evt-user-2")?.text || "I take the wrong lunch.",
            minimalCorrection: "I took the wrong lunch.",
            naturalAlternative: "I’m afraid I picked up your lunch by mistake.",
            explanationZh: "自然表达会直接说明是无意拿错，并用缓和语气降低冒犯感。",
          },
        ],
        nextPracticeGoalZh: "下次重点练习：说明失误后，紧接着给出具体行动和预计时间。",
      },
    });
  }

  const relative = normalize(url.pathname)
    .replace(/^(\.\.(\/|\\|$))+/, "")
    .replace(/^\/+/, "");
  const filePath = join(root, relative || "index.html");
  try {
    if (!(await stat(filePath)).isFile()) throw new Error("not a file");
    const contentTypes = {
      ".css": "text/css; charset=utf-8",
      ".html": "text/html; charset=utf-8",
      ".js": "text/javascript; charset=utf-8",
      ".mjs": "text/javascript; charset=utf-8",
      ".onnx": "application/octet-stream",
      ".png": "image/png",
      ".wasm": "application/wasm",
    };
    response.writeHead(200, {
      "content-type": contentTypes[extname(filePath)] || "application/octet-stream",
    });
    createReadStream(filePath).pipe(response);
  } catch {
    response.writeHead(404).end("Not found");
  }
});

server.listen(18892, "127.0.0.1");
