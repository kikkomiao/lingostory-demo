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

  const expected = targetLanguage === "ja" ? "japanese" : "english";
  const segments = [];
  for (let index = 0; index < markers.length; index += 1) {
    const marker = markers[index];
    const start = (marker.index || 0) + marker[0].length;
    const end = markers[index + 1]?.index ?? normalized.length;
    if (marker[1].toLowerCase() !== expected) continue;
    const text = normalizeText(normalized.slice(start, end));
    if (text) segments.push(text);
  }
  return segments.join(targetLanguage === "ja" ? "" : " ").trim();
}

export const targetLanguageConfig = {
  en: { providerLanguage: "English", displayNameZh: "英文" },
  ja: { providerLanguage: "Japanese", displayNameZh: "日语" },
};
