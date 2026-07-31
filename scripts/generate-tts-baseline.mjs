import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import WebSocket from "ws";
import { buildTtsSessionConfig, buildTtsTextInput, TTS_SAMPLE_RATE } from "../voice-tts.js";

const TTS_URL =
  "wss://joiagent.devops.beta.xiaohongshu.com/tts/qwen3cus/v1/audio/speech/stream";
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = resolve(projectRoot, "tts-baseline-output");
const scenarios = [
  {
    id: "everyday",
    English: "Thanks for letting me know. I understand what happened, and we can sort it out together. What would you like to do next?",
    Japanese: "お知らせいただき、ありがとうございます。状況は分かりました。一緒に確認しましょう。次はどうしますか。",
  },
  {
    id: "short-question",
    English: "Could you confirm the name on the booking?",
    Japanese: "予約のお名前を確認していただけますか。",
  },
  {
    id: "information",
    English: "Your appointment is at ten thirty on Friday, August fourteenth. Please arrive fifteen minutes early and bring your photo ID.",
    Japanese: "ご予約は八月十四日、金曜日の十時三十分です。十五分前に到着し、写真付きの身分証明書をお持ちください。",
  },
  {
    id: "long-turn",
    English: "I checked the details you sent earlier. The first option is still available, but the delivery date has changed. If that timing does not work for you, I can check the second option before we make a decision.",
    Japanese: "先ほどいただいた内容を確認しました。最初の選択肢はまだ利用できますが、配送日が変わりました。その日程が難しい場合は、決める前に二つ目の選択肢も確認できます。",
  },
];
const voices = [
  { id: "ryan", language: "English" },
  { id: "aiden", language: "English" },
  { id: "serena", language: "English" },
  { id: "vivian", language: "English" },
  { id: "ono_anna", language: "Japanese" },
];

function wavFromPcm(pcm) {
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(TTS_SAMPLE_RATE, 24);
  header.writeUInt32LE(TTS_SAMPLE_RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

function synthesize(sample) {
  return new Promise((resolvePromise, rejectPromise) => {
    const chunks = [];
    const socket = new WebSocket(TTS_URL);
    const timeout = setTimeout(() => {
      socket.close();
      rejectPromise(new Error(`${sample.voiceId}: TTS timed out`));
    }, 45_000);
    let settled = false;
    const settle = (callback, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      callback(value);
    };
    socket.binaryType = "arraybuffer";
    socket.onopen = () => {
      socket.send(JSON.stringify(buildTtsSessionConfig(
        { voiceId: sample.voiceId, language: sample.language },
        sample.language,
      )));
      socket.send(JSON.stringify(buildTtsTextInput(sample.text)));
      socket.send(JSON.stringify({ type: "input.done" }));
    };
    socket.onmessage = (event) => {
      if (event.data instanceof ArrayBuffer) {
        chunks.push(Buffer.from(event.data));
        return;
      }
      const message = JSON.parse(String(event.data));
      if (message.type === "session.done") {
        socket.close();
        settle(resolvePromise, Buffer.concat(chunks));
      } else if (message.type === "error") {
        socket.close();
        settle(rejectPromise, new Error(message.message || "TTS error"));
      }
    };
    socket.onerror = () => settle(rejectPromise, new Error("TTS WebSocket error"));
  });
}

await mkdir(outputDirectory, { recursive: true });
const results = [];
for (const scenario of scenarios) {
  for (const voice of voices) {
    const sample = {
      scenario: scenario.id,
      voiceId: voice.id,
      language: voice.language,
      text: scenario[voice.language],
    };
    process.stdout.write(`Generating ${scenario.id}/${voice.id}... `);
    const pcm = await synthesize(sample);
    if (!pcm.length) throw new Error(`${voice.id}: TTS returned empty audio`);
    const durationSeconds = pcm.length / 2 / TTS_SAMPLE_RATE;
    const filename = `${scenario.id}-${voice.id}.wav`;
    await writeFile(resolve(outputDirectory, filename), wavFromPcm(pcm));
    results.push({ ...sample, filename, durationSeconds: Number(durationSeconds.toFixed(2)) });
    console.log(`${durationSeconds.toFixed(2)}s`);
  }
}
await writeFile(
  resolve(outputDirectory, "manifest.json"),
  `${JSON.stringify({
    generatedAt: new Date().toISOString(),
    requestPolicy: "minimal-whitelist-verbatim-text",
    sampleRate: TTS_SAMPLE_RATE,
    results,
  }, null, 2)}\n`,
);
console.log(`Saved ${results.length} WAV files to ${outputDirectory}`);
