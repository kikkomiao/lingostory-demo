import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";

const root = new URL("../", import.meta.url).pathname;
const emotions = ["neutral", "happy", "sad", "angry", "nervous", "surprised"];
const profiles = [
  ["cassie", "Cassie", "comingSoon", "Front-desk coordinator at a neighborhood community center"],
  ["mary", "Mary", "comingSoon", "Community library assistant and everyday conversation partner"],
  ["mike", "Mike", "comingSoon", "Customer support coordinator at a local office-supply company"],
  ["kate", "Kate", "available", "Japanese-speaking cabin crew member"],
  ["cyrus", "Cyrus", "available", "Senior executive at a large technology company"],
];

function createSession({ japanese = false } = {}) {
  return {
    id: "fixture-session",
    sessionId: "fixture-session",
    storyId: japanese ? "japan-airport-checkin-kate-ja-v1" : "lunch-mixup-cyrus-v1",
    storyTitle: japanese ? "日本の空港でチェックイン" : "The Lunch Mix-Up",
    playerRole: japanese ? "あなたは東京から上海へ向かう旅客です。" : "You are an employee.",
    opening: japanese
      ? "東京の空港で、Kate が予約名を確認します。"
      : "You discover the lunch mix-up as Cyrus walks toward the office.",
    targetLanguage: japanese ? "ja" : "en",
    activeNpc: {
      id: japanese ? "kate" : "cyrus",
      displayName: japanese ? "Kate" : "Cyrus",
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
    currentBeatId: japanese ? "confirm_name" : "intercept",
    currentGoal: japanese ? "予約の名前を Kate に伝える。" : "Get Cyrus's attention before he reaches the lunch.",
    currentHint: { level: 1, text: japanese ? "自分の名前を短く伝えてください。" : "Ask Cyrus to stop before explaining." },
    presentation: {
      zhCN: {
        opening: japanese
          ? "你来到东京机场的值机柜台，Kate 请你说出预订姓名。"
          : "你发现两份午饭拿反了，而 Cyrus 正走向办公室。",
        currentGoal: japanese ? "告诉 Kate 你的预订姓名。" : "在 Cyrus 进门前叫住他。",
        currentHint: {
          level: 1,
          text: japanese ? "简短说出自己的姓名。" : "先明确请 Cyrus 停一下，再解释发生了什么。",
        },
      },
    },
    remainingTurns: 1,
    progress: { current: 1, total: 6, percent: 0 },
    phase: "active",
    events: [],
  };
}

let session = createSession();
const turnResponses = new Map();
let reviewStatus = "not_started";

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
      stageText: "Kate confirms the check-in information.",
      stageTextZh: "Kate 确认值机信息并继续下一项。",
      emotionId: turnNumber === 1 ? "neutral" : "happy",
    };
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
          id: "japan-airport-checkin-kate-ja-v1",
          title: "日本の空港でチェックイン",
          titleZh: "日本机场值机",
          synopsis: "東京から上海へ出発する前に、簡単な質問に答えます。",
          synopsisZh: "从东京飞往上海前，用简单日语回答 Kate 的值机问题并拿到登机牌。",
          npc: "Kate",
          npcId: "kate",
          status: "published",
          level: "JLPT N4–N3",
          estimatedMinutes: 4,
          targetLanguage: "ja",
          createdAt: "2026-08-01T00:00:00.000Z",
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
    url.pathname === "/api/stories/japan-airport-checkin-kate-ja-v1/playthroughs" &&
    request.method === "POST"
  ) {
    session = createSession({ japanese: true });
    turnResponses.clear();
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
