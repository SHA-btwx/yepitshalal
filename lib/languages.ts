/**
 * The languages somebody can ask us for.
 *
 * A list rather than a free-text box, for the same reason the city field has
 * suggestions: "farsi", "Persian" and "persian" are one language and have to
 * end up as one row to be worth counting. Anything not here can still be
 * typed, and lands as free text to be read rather than tallied.
 *
 * Names and endonyms come from ICU (Intl.DisplayNames) rather than being
 * hand-written, so the spelling of a language in its own script is the
 * standard one and not my guess at it. Each is shown both ways, because a
 * reader scanning for their own language is looking for its shape, not for
 * the English word for it.
 */

export interface LanguageOption {
  /** BCP 47 code, stored so the counts group cleanly. */
  code: string;
  /** English name, e.g. "Persian". */
  name: string;
  /** The language's own name for itself, e.g. "فارسی". */
  endonym: string;
}

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: "af", name: "Afrikaans", endonym: "Afrikaans" },
  { code: "sq", name: "Albanian", endonym: "Shqip" },
  { code: "am", name: "Amharic", endonym: "አማርኛ" },
  { code: "ar", name: "Arabic", endonym: "العربية" },
  { code: "as", name: "Assamese", endonym: "অসমীয়া" },
  { code: "az", name: "Azerbaijani", endonym: "Azərbaycan" },
  { code: "bm", name: "Bambara", endonym: "Bamanakan" },
  { code: "bn", name: "Bangla", endonym: "বাংলা" },
  { code: "bs", name: "Bosnian", endonym: "Bosanski" },
  { code: "bg", name: "Bulgarian", endonym: "Български" },
  { code: "my", name: "Burmese", endonym: "မြန်မာ" },
  { code: "ckb", name: "Central Kurdish", endonym: "کوردیی ناوەندی" },
  { code: "zh", name: "Chinese", endonym: "中文" },
  { code: "cs", name: "Czech", endonym: "Čeština" },
  { code: "da", name: "Danish", endonym: "Dansk" },
  { code: "dv", name: "Divehi", endonym: "Divehi" },
  { code: "nl", name: "Dutch", endonym: "Nederlands" },
  { code: "tl", name: "Filipino", endonym: "Filipino" },
  { code: "fi", name: "Finnish", endonym: "Suomi" },
  { code: "fr", name: "French", endonym: "Français" },
  { code: "ff", name: "Fula", endonym: "Pulaar" },
  { code: "lg", name: "Ganda", endonym: "Luganda" },
  { code: "de", name: "German", endonym: "Deutsch" },
  { code: "el", name: "Greek", endonym: "Ελληνικά" },
  { code: "gu", name: "Gujarati", endonym: "ગુજરાતી" },
  { code: "ha", name: "Hausa", endonym: "Hausa" },
  { code: "he", name: "Hebrew", endonym: "עברית" },
  { code: "hi", name: "Hindi", endonym: "हिन्दी" },
  { code: "ig", name: "Igbo", endonym: "Igbo" },
  { code: "id", name: "Indonesian", endonym: "Indonesia" },
  { code: "it", name: "Italian", endonym: "Italiano" },
  { code: "ja", name: "Japanese", endonym: "日本語" },
  { code: "kn", name: "Kannada", endonym: "ಕನ್ನಡ" },
  { code: "kk", name: "Kazakh", endonym: "Қазақ тілі" },
  { code: "km", name: "Khmer", endonym: "ខ្មែរ" },
  { code: "rw", name: "Kinyarwanda", endonym: "Ikinyarwanda" },
  { code: "ko", name: "Korean", endonym: "한국어" },
  { code: "ku", name: "Kurdish", endonym: "Kurdî (kurmancî)" },
  { code: "ky", name: "Kyrgyz", endonym: "Кыргызча" },
  { code: "lo", name: "Lao", endonym: "ລາວ" },
  { code: "mk", name: "Macedonian", endonym: "Македонски" },
  { code: "mg", name: "Malagasy", endonym: "Malagasy" },
  { code: "ms", name: "Malay", endonym: "Melayu" },
  { code: "ml", name: "Malayalam", endonym: "മലയാളം" },
  { code: "mr", name: "Marathi", endonym: "मराठी" },
  { code: "ne", name: "Nepali", endonym: "नेपाली" },
  { code: "no", name: "Norwegian", endonym: "Norsk" },
  { code: "ny", name: "Nyanja", endonym: "Nyanja" },
  { code: "or", name: "Odia", endonym: "ଓଡ଼ିଆ" },
  { code: "ps", name: "Pashto", endonym: "پښتو" },
  { code: "fa", name: "Persian", endonym: "فارسی" },
  { code: "pl", name: "Polish", endonym: "Polski" },
  { code: "pt", name: "Portuguese", endonym: "Português" },
  { code: "pa", name: "Punjabi", endonym: "ਪੰਜਾਬੀ" },
  { code: "ro", name: "Romanian", endonym: "Română" },
  { code: "ru", name: "Russian", endonym: "Русский" },
  { code: "sr", name: "Serbian", endonym: "Српски" },
  { code: "sn", name: "Shona", endonym: "ChiShona" },
  { code: "sd", name: "Sindhi", endonym: "سنڌي" },
  { code: "si", name: "Sinhala", endonym: "සිංහල" },
  { code: "so", name: "Somali", endonym: "Soomaali" },
  { code: "es", name: "Spanish", endonym: "Español" },
  { code: "sw", name: "Swahili", endonym: "Kiswahili" },
  { code: "sv", name: "Swedish", endonym: "Svenska" },
  { code: "tg", name: "Tajik", endonym: "Тоҷикӣ" },
  { code: "ta", name: "Tamil", endonym: "தமிழ்" },
  { code: "te", name: "Telugu", endonym: "తెలుగు" },
  { code: "th", name: "Thai", endonym: "ไทย" },
  { code: "ti", name: "Tigrinya", endonym: "ትግርኛ" },
  { code: "tr", name: "Turkish", endonym: "Türkçe" },
  { code: "tk", name: "Turkmen", endonym: "Türkmen dili" },
  { code: "uk", name: "Ukrainian", endonym: "Українська" },
  { code: "ur", name: "Urdu", endonym: "اردو" },
  { code: "uz", name: "Uzbek", endonym: "O‘zbek" },
  { code: "vi", name: "Vietnamese", endonym: "Tiếng Việt" },
  { code: "wo", name: "Wolof", endonym: "Wolof" },
  { code: "xh", name: "Xhosa", endonym: "IsiXhosa" },
  { code: "yo", name: "Yoruba", endonym: "Èdè Yorùbá" },
  { code: "zu", name: "Zulu", endonym: "IsiZulu" },
];

/** Matches what somebody typed against the list, on either name. */
export function matchLanguage(query: string): LanguageOption | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  return (
    LANGUAGE_OPTIONS.find((l) => l.name.toLowerCase() === q || l.endonym.toLowerCase() === q) ?? null
  );
}

/** The options worth offering for a partial query, best matches first. */
export function searchLanguages(query: string, limit = 6): LanguageOption[] {
  const q = query.trim().toLowerCase();
  if (q.length < 1) return [];
  const starts: LanguageOption[] = [];
  const contains: LanguageOption[] = [];
  for (const l of LANGUAGE_OPTIONS) {
    const name = l.name.toLowerCase();
    const endonym = l.endonym.toLowerCase();
    if (name.startsWith(q) || endonym.startsWith(q)) starts.push(l);
    else if (name.includes(q) || endonym.includes(q)) contains.push(l);
  }
  return [...starts, ...contains].slice(0, limit);
}
