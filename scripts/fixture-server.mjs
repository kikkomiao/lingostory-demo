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
  ["kate", "Kate", "comingSoon", "Community library assistant who helps visitors find resources and practice everyday English"],
  ["cyrus", "Cyrus", "available", "Senior executive at a large technology company"],
];

function createSession() {
  return {
    id: "fixture-session",
    sessionId: "fixture-session",
    storyId: "lunch-mixup-cyrus-v1",
    storyTitle: "The Lunch Mix-Up",
    playerRole: "You are an employee.",
    opening: "You discover the lunch mix-up as Cyrus walks toward the office.",
    targetLanguage: "en",
    activeNpc: { id: "cyrus", displayName: "Cyrus", emotionId: "neutral" },
    currentBeatId: "intercept",
    currentGoal: "Get Cyrus's attention before he reaches the lunch.",
    currentHint: { level: 1, text: "Ask Cyrus to stop before explaining." },
    presentation: {
      zhCN: {
        opening: "你发现两份午饭拿反了，而 Cyrus 正走向办公室。",
        currentGoal: "在 Cyrus 进门前叫住他。",
        currentHint: { level: 1, text: "先明确请 Cyrus 停一下，再解释发生了什么。" },
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
  if (turnNumber !== 1) return;
  session.currentBeatId = "explain_mixup";
  session.currentGoal = "Explain what happened.";
  session.currentHint = { level: 1, text: "Mention the two lunch boxes." };
  session.presentation.zhCN.currentGoal = "解释两份午饭为什么拿错了。";
  session.presentation.zhCN.currentHint = { level: 1, text: "说明两份午饭拿反了。" };
  session.remainingTurns = 2;
  session.progress = { current: 2, total: 6, percent: 33 };
}

function appendTurn(userText, npc, turnNumber) {
  const createdAt = new Date().toISOString();
  session.events.push(
    {
      id: `evt-user-${turnNumber}`,
      type: "user_utterance",
      actor: "user",
      text: userText,
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
        profile: { npcId: id, displayName, role },
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
      id: "cyrus",
      utterance: copy.utterance,
      stageText: copy.stageText,
      emotionId: copy.emotionId,
    };
    appendTurn(userText, copy, turnNumber);
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
      ".png": "image/png",
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
