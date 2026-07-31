const LANGUAGE_NAMES = [
  "English",
  "Chinese",
  "Mandarin",
  "Cantonese",
  "Japanese",
  "Korean",
  "French",
  "German",
  "Spanish",
  "Italian",
  "Portuguese",
  "Russian",
  "Arabic",
  "Hindi",
];

const LANGUAGE_ALTERNATION = LANGUAGE_NAMES.join("|");
const CONTROL_TOKEN = /<\|?[^>]+\|?>/g;
const CJK_CHARACTER = /[\u3040-\u30ff\u3400-\u9fff\uf900-\ufaff]/g;
const HAN_CHARACTER = /[\u3400-\u9fff\uf900-\ufaff]/g;
const KANA_CHARACTER = /[\u3040-\u30ff]/g;
const LATIN_CHARACTER = /[A-Za-zÀ-ÖØ-öø-ÿ]/g;

function normalizeLanguageMarkers(value) {
  return String(value || "")
    .replace(
      new RegExp(`<\\|?language\\|?>\\s*(${LANGUAGE_ALTERNATION})`, "gi"),
      "\n__ASR_LANGUAGE__$1\n",
    )
    .replace(
      new RegExp(
        `(?:^|[\\s|,;])language\\s*[:=]?\\s*(${LANGUAGE_ALTERNATION})`,
        "gi",
      ),
      "\n__ASR_LANGUAGE__$1\n",
    );
}

function normalizeText(value) {
  return String(value || "")
    .replace(CONTROL_TOKEN, " ")
    .replace(/<\/?asr_text>/gi, " ")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.!?;:。！？、])/g, "$1")
    .trim();
}

function plausibleUnlabelled(text, targetLanguage) {
  if (targetLanguage === "ja") return (text.match(KANA_CHARACTER)?.length || 0) > 0;
  if (targetLanguage === "yue") {
    const hanCount = text.match(HAN_CHARACTER)?.length || 0;
    const kanaCount = text.match(KANA_CHARACTER)?.length || 0;
    return hanCount > 0 && kanaCount === 0;
  }
  const latinCount = text.match(LATIN_CHARACTER)?.length || 0;
  const cjkCount = text.match(CJK_CHARACTER)?.length || 0;
  return latinCount > 0 && cjkCount === 0;
}

export function cleanTranscript(value, targetLanguage = "en") {
  const normalized = normalizeLanguageMarkers(value);
  const markerPattern = new RegExp(
    `__ASR_LANGUAGE__(${LANGUAGE_ALTERNATION})`,
    "gi",
  );
  const markers = [...normalized.matchAll(markerPattern)];
  if (!markers.length) {
    const text = normalizeText(normalized);
    return plausibleUnlabelled(text, targetLanguage) ? text : "";
  }

  const expected =
    targetLanguage === "ja"
      ? "japanese"
      : targetLanguage === "yue"
        ? "cantonese"
        : "english";
  const segments = [];
  for (let index = 0; index < markers.length; index += 1) {
    const marker = markers[index];
    const start = (marker.index || 0) + marker[0].length;
    const end = markers[index + 1]?.index ?? normalized.length;
    if (marker[1].toLowerCase() !== expected) continue;
    const text = normalizeText(normalized.slice(start, end));
    if (text) segments.push(text);
  }
  return segments.join(targetLanguage === "en" ? " " : "").trim();
}

export const targetLanguageConfig = {
  en: { providerLanguage: "English", displayNameZh: "英文" },
  ja: { providerLanguage: "Japanese", displayNameZh: "日语" },
  yue: { providerLanguage: "Cantonese", displayNameZh: "粤语" },
};

const MTR_STORY_ID = "hong-kong-mtr-directions-mary-yue-v1";
const MTR_RECOGNITION_CONTEXT = {
  state_destination: {
    context: "香港港鐵問路。遊客身處天后站，想去中環。",
    hotwords: ["香港", "港鐵", "天后", "天后站", "中環", "唔該", "想去"],
  },
  ask_line: {
    context: "遊客由天后站去中環，詢問應該坐邊條港鐵線。",
    hotwords: ["天后", "中環", "港鐵", "港島線", "邊條線", "堅尼地城方向"],
  },
  ask_transfer: {
    context: "遊客確認由天后去中環需唔需要轉車，同埋要坐幾多個站。",
    hotwords: ["天后", "中環", "轉車", "唔需要轉車", "幾多個站", "四個站", "第四個站"],
  },
  repeat_route: {
    context: "遊客複述路線：港島線、堅尼地城方向、唔需要轉車、第四個站到中環。",
    hotwords: ["港島線", "堅尼地城方向", "唔需要轉車", "四個站", "第四個站", "中環", "多謝"],
  },
};

export function cantoneseRecognitionContext(storyId, beatId) {
  if (storyId !== MTR_STORY_ID) return null;
  return MTR_RECOGNITION_CONTEXT[beatId] || null;
}

export function correctCantoneseMtrTranscript(text, storyId, beatId) {
  if (!cantoneseRecognitionContext(storyId, beatId)) return text;
  return String(text || "")
    .replace(/中(?:還|还|換|换)/g, "中環")
    .replace(/港(?:島|岛)(?:先|綫)/g, "港島線")
    .replace(/天候站/g, "天后站")
    .replace(/(?:堅|坚)尼地成/g, "堅尼地城");
}
