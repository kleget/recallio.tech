"use client";

import { useEffect, useState } from "react";

import { getCookie } from "../lib/client-cookies";
import { useUiLang } from "../ui-lang-context";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";
const READ_SECONDS = 30;

const TEXT = {
  ru: {
    title: "ÃÅ¸ÃÂ¾ÃÂ²Ã‘â€šÃÂ¾Ã‘â‚¬ÃÂµÃÂ½ÃÂ¸ÃÂµ",
    tagline: "Ãâ€”ÃÂ°ÃÂºÃ‘â‚¬ÃÂµÃÂ¿ÃÂ»Ã‘ÂÃÂµÃÂ¼ Ã‘ÂÃ‘â€šÃÂ°Ã‘â‚¬Ã‘â€¹ÃÂµ Ã‘ÂÃÂ»ÃÂ¾ÃÂ²ÃÂ° ÃÂ¸ ÃÂ²ÃÂ¾ÃÂ·ÃÂ²Ã‘â‚¬ÃÂ°Ã‘â€°ÃÂ°ÃÂµÃÂ¼Ã‘ÂÃ‘Â ÃÂº Ã‘â€šÃÂµÃ‘ÂÃ‘â€šÃ‘Æ’.",
    home: "ÃÂÃÂ° ÃÂ³ÃÂ»ÃÂ°ÃÂ²ÃÂ½Ã‘Æ’Ã‘Å½",
    loading: "Ãâ€”ÃÂ°ÃÂ³Ã‘â‚¬Ã‘Æ’ÃÂ·ÃÂºÃÂ°...",
    noWords: "ÃÂ¡ÃÂ»ÃÂ¾ÃÂ² ÃÂ´ÃÂ»Ã‘Â ÃÂ¿ÃÂ¾ÃÂ²Ã‘â€šÃÂ¾Ã‘â‚¬ÃÂµÃÂ½ÃÂ¸Ã‘Â ÃÂ½ÃÂµÃ‘â€š.",
    refresh: "ÃÅ¾ÃÂ±ÃÂ½ÃÂ¾ÃÂ²ÃÂ¸Ã‘â€šÃ‘Å’",
    report: "\u0421\u043e\u043e\u0431\u0449\u0438\u0442\u044c \u043e\u0431 \u043e\u0448\u0438\u0431\u043a\u0435",
    seed: "ÃÂ¡ÃÂ¾ÃÂ·ÃÂ´ÃÂ°Ã‘â€šÃ‘Å’ Ã‘â€šÃÂµÃ‘ÂÃ‘â€šÃÂ¾ÃÂ²Ã‘â€¹ÃÂµ ÃÂ´ÃÂ°ÃÂ½ÃÂ½Ã‘â€¹ÃÂµ",
    seeding: "ÃÂ¡ÃÂ¾ÃÂ·ÃÂ´ÃÂ°Ã‘Å½...",
    progress: "ÃÅ¸Ã‘â‚¬ÃÂ¾ÃÂ³Ã‘â‚¬ÃÂµÃ‘ÂÃ‘Â Ã‘ÂÃÂµÃ‘ÂÃ‘ÂÃÂ¸ÃÂ¸",
    tip: "ÃÂ¡ÃÂ¾ÃÂ²ÃÂµÃ‘â€š: ÃÂ¾Ã‘â€šÃÂ²ÃÂµÃ‘â€¡ÃÂ°ÃÂ¹ ÃÂ±ÃÂµÃÂ· ÃÂ¿ÃÂ¾ÃÂ´ÃÂ³ÃÂ»Ã‘ÂÃÂ´Ã‘â€¹ÃÂ²ÃÂ°ÃÂ½ÃÂ¸Ã‘Â, Ã‘â€¡Ã‘â€šÃÂ¾ÃÂ±Ã‘â€¹ ÃÂ·ÃÂ°ÃÂºÃ‘â‚¬ÃÂµÃÂ¿ÃÂ¸Ã‘â€šÃ‘Å’ ÃÂ¸ÃÂ½Ã‘â€šÃÂµÃ‘â‚¬ÃÂ²ÃÂ°ÃÂ».",
    tapCard: "ÃÂÃÂ°ÃÂ¶ÃÂ¼ÃÂ¸ ÃÂ½ÃÂ° ÃÂºÃÂ°Ã‘â‚¬Ã‘â€šÃÂ¾Ã‘â€¡ÃÂºÃ‘Æ’, Ã‘â€¡Ã‘â€šÃÂ¾ÃÂ±Ã‘â€¹ ÃÂ¾Ã‘â€šÃÂºÃ‘â‚¬Ã‘â€¹Ã‘â€šÃ‘Å’ ÃÂ¿ÃÂµÃ‘â‚¬ÃÂµÃÂ²ÃÂ¾ÃÂ´",
    wordLabel: "ÃÂ¡ÃÂ»ÃÂ¾ÃÂ²ÃÂ¾",
    cardProgress: "ÃÅ¡ÃÂ°Ã‘â‚¬Ã‘â€šÃÂ¾Ã‘â€¡ÃÂºÃÂ° {current} ÃÂ¸ÃÂ· {total}",
    prevCard: "ÃÂÃÂ°ÃÂ·ÃÂ°ÃÂ´",
    learnedAt: "Ãâ€™Ã‘â€¹Ã‘Æ’Ã‘â€¡ÃÂµÃÂ½ÃÂ¾",
    reviewAt: "ÃÅ¸ÃÂ¾ÃÂ²Ã‘â€šÃÂ¾Ã‘â‚¬ÃÂ¸Ã‘â€šÃ‘Å’",
    next: "Ãâ€ÃÂ°ÃÂ»Ã‘Å’Ã‘Ë†ÃÂµ",
    wordList: "ÃÂ¡ÃÂ¿ÃÂ¸Ã‘ÂÃÂ¾ÃÂº Ã‘ÂÃÂ»ÃÂ¾ÃÂ²",
    closeList: "Ãâ€”ÃÂ°ÃÂºÃ‘â‚¬Ã‘â€¹Ã‘â€šÃ‘Å’ Ã‘ÂÃÂ¿ÃÂ¸Ã‘ÂÃÂ¾ÃÂº",
    export: {
      title: "ÃÂ­ÃÂºÃ‘ÂÃÂ¿ÃÂ¾Ã‘â‚¬Ã‘â€š ÃÂ² Quizlet",
      action: "ÃÂ­ÃÂºÃ‘ÂÃÂ¿ÃÂ¾Ã‘â‚¬Ã‘â€šÃÂ¸Ã‘â‚¬ÃÂ¾ÃÂ²ÃÂ°Ã‘â€šÃ‘Å’",
      hint: "ÃÂ¤ÃÂ¾Ã‘â‚¬ÃÂ¼ÃÂ°Ã‘â€š: Ã‘ÂÃÂ»ÃÂ¾ÃÂ²ÃÂ¾ TAB ÃÂ¿ÃÂµÃ‘â‚¬ÃÂµÃÂ²ÃÂ¾ÃÂ´. ÃÅ¸ÃÂ¾ÃÂ´Ã‘â€¦ÃÂ¾ÃÂ´ÃÂ¸Ã‘â€š ÃÂ´ÃÂ»Ã‘Â ÃÂ¸ÃÂ¼ÃÂ¿ÃÂ¾Ã‘â‚¬Ã‘â€šÃÂ° ÃÂ² Quizlet.",
      copy: "ÃÂ¡ÃÂºÃÂ¾ÃÂ¿ÃÂ¸Ã‘â‚¬ÃÂ¾ÃÂ²ÃÂ°Ã‘â€šÃ‘Å’",
      download: "ÃÂ¡ÃÂºÃÂ°Ã‘â€¡ÃÂ°Ã‘â€šÃ‘Å’ Ã‘â€žÃÂ°ÃÂ¹ÃÂ»",
      close: "Ãâ€”ÃÂ°ÃÂºÃ‘â‚¬Ã‘â€¹Ã‘â€šÃ‘Å’",
      empty: "ÃÂÃÂµÃ‘â€š Ã‘ÂÃÂ»ÃÂ¾ÃÂ² ÃÂ´ÃÂ»Ã‘Â Ã‘ÂÃÂºÃ‘ÂÃÂ¿ÃÂ¾Ã‘â‚¬Ã‘â€šÃÂ°."
    },
    cardsDone: "ÃÅ¡ÃÂ°Ã‘â‚¬Ã‘â€šÃÂ¾Ã‘â€¡ÃÂºÃÂ¸ ÃÂ¿Ã‘â‚¬ÃÂ¾ÃÂ¹ÃÂ´ÃÂµÃÂ½Ã‘â€¹",
    cardsDoneHint: "ÃÅ“ÃÂ¾ÃÂ¶ÃÂ½ÃÂ¾ ÃÂ¿ÃÂµÃ‘â‚¬ÃÂµÃ‘â€¦ÃÂ¾ÃÂ´ÃÂ¸Ã‘â€šÃ‘Å’ ÃÂº Ã‘â€¡Ã‘â€šÃÂµÃÂ½ÃÂ¸Ã‘Å½ ÃÂ¸ Ã‘â€šÃÂµÃ‘ÂÃ‘â€šÃ‘Æ’.",
    goReading: "ÃÅ¸ÃÂµÃ‘â‚¬ÃÂµÃÂ¹Ã‘â€šÃÂ¸ ÃÂº Ã‘â€¡Ã‘â€šÃÂµÃÂ½ÃÂ¸Ã‘Å½",
    restartCards: "ÃÅ¸Ã‘â‚¬ÃÂ¾ÃÂ¹Ã‘â€šÃÂ¸ ÃÂºÃÂ°Ã‘â‚¬Ã‘â€šÃÂ¾Ã‘â€¡ÃÂºÃÂ¸ ÃÂ·ÃÂ°ÃÂ½ÃÂ¾ÃÂ²ÃÂ¾",
    readingTitle: "ÃÂÃÂµÃÂ±ÃÂ¾ÃÂ»Ã‘Å’Ã‘Ë†ÃÂ¾ÃÂ¹ Ã‘â€šÃÂµÃÂºÃ‘ÂÃ‘â€š",
    readingText:
      "ÃÂÃÂµÃÂ±ÃÂ¾ÃÂ»Ã‘Å’Ã‘Ë†ÃÂ°Ã‘Â ÃÂ¿ÃÂ°Ã‘Æ’ÃÂ·ÃÂ° ÃÂ¿ÃÂ¾ÃÂ¼ÃÂ¾ÃÂ³ÃÂ°ÃÂµÃ‘â€š ÃÂ¿ÃÂµÃ‘â‚¬ÃÂµÃÂ²ÃÂµÃ‘ÂÃ‘â€šÃÂ¸ Ã‘ÂÃÂ»ÃÂ¾ÃÂ²ÃÂ° ÃÂ¸ÃÂ· ÃÂºÃ‘â‚¬ÃÂ°Ã‘â€šÃÂºÃÂ¾ÃÂ²Ã‘â‚¬ÃÂµÃÂ¼ÃÂµÃÂ½ÃÂ½ÃÂ¾ÃÂ¹ ÃÂ¿ÃÂ°ÃÂ¼Ã‘ÂÃ‘â€šÃÂ¸. ÃÅ¸Ã‘â‚¬ÃÂ¾Ã‘â€¡ÃÂ¸Ã‘â€šÃÂ°ÃÂ¹ Ã‘â€šÃÂµÃÂºÃ‘ÂÃ‘â€š, ÃÂ½ÃÂµ ÃÂ²ÃÂ¾ÃÂ·ÃÂ²Ã‘â‚¬ÃÂ°Ã‘â€°ÃÂ°Ã‘ÂÃ‘ÂÃ‘Å’ ÃÂº ÃÂºÃÂ°Ã‘â‚¬Ã‘â€šÃÂ¾Ã‘â€¡ÃÂºÃÂ°ÃÂ¼.",
    timeLeft: "ÃÅ¾Ã‘ÂÃ‘â€šÃÂ°ÃÂ»ÃÂ¾Ã‘ÂÃ‘Å’",
    seconds: "Ã‘ÂÃÂµÃÂº",
    backToCards: "ÃÂÃÂ°ÃÂ·ÃÂ°ÃÂ´ ÃÂº ÃÂºÃÂ°Ã‘â‚¬Ã‘â€šÃÂ¾Ã‘â€¡ÃÂºÃÂ°ÃÂ¼",
    skipText: "ÃÅ¸Ã‘â‚¬ÃÂ¾ÃÂ¿Ã‘Æ’Ã‘ÂÃ‘â€šÃÂ¸Ã‘â€šÃ‘Å’ Ã‘â€šÃÂµÃÂºÃ‘ÂÃ‘â€š",
    testTitle: "ÃÂ¢ÃÂµÃ‘ÂÃ‘â€š",
    testHint: "Ãâ€™ÃÂ²ÃÂµÃÂ´ÃÂ¸ ÃÂ¿ÃÂµÃ‘â‚¬ÃÂµÃÂ²ÃÂ¾ÃÂ´ ÃÂ´ÃÂ»Ã‘Â ÃÂºÃÂ°ÃÂ¶ÃÂ´ÃÂ¾ÃÂ³ÃÂ¾ Ã‘ÂÃÂ»ÃÂ¾ÃÂ²ÃÂ°.",
    qualityHint: "ÃÅ¾Ã‘â€ ÃÂµÃÂ½ÃÂ¸, ÃÂ½ÃÂ°Ã‘ÂÃÂºÃÂ¾ÃÂ»Ã‘Å’ÃÂºÃÂ¾ ÃÂ»ÃÂµÃÂ³ÃÂºÃÂ¾ ÃÂ²Ã‘ÂÃÂ¿ÃÂ¾ÃÂ¼ÃÂ½ÃÂ¸ÃÂ» Ã‘ÂÃÂ»ÃÂ¾ÃÂ²ÃÂ¾ (0 - ÃÂ½ÃÂµ ÃÂ¿ÃÂ¾ÃÂ¼ÃÂ½Ã‘Å½, 5 - ÃÂ»ÃÂµÃÂ³ÃÂºÃÂ¾).",
    qualityLabel: "ÃÅ¾Ã‘â€ ÃÂµÃÂ½ÃÂºÃÂ°",
    translationPlaceholder: "ÃÅ¸ÃÂµÃ‘â‚¬ÃÂµÃÂ²ÃÂ¾ÃÂ´",
    correct: "Ãâ€™ÃÂµÃ‘â‚¬ÃÂ½ÃÂ¾",
    wrong: "ÃÅ¾Ã‘Ë†ÃÂ¸ÃÂ±ÃÂºÃÂ°",
    correctAnswer: "ÃÅ¸Ã‘â‚¬ÃÂ°ÃÂ²ÃÂ¸ÃÂ»Ã‘Å’ÃÂ½Ã‘â€¹ÃÂ¹ ÃÂ¾Ã‘â€šÃÂ²ÃÂµÃ‘â€š: {answer}",
    submit: "ÃÅ¾Ã‘â€šÃÂ¿Ã‘â‚¬ÃÂ°ÃÂ²ÃÂ¸Ã‘â€šÃ‘Å’ ÃÂ¾Ã‘â€šÃÂ²ÃÂµÃ‘â€šÃ‘â€¹",
    refreshList: "ÃÅ¾ÃÂ±ÃÂ½ÃÂ¾ÃÂ²ÃÂ¸Ã‘â€šÃ‘Å’ Ã‘ÂÃÂ¿ÃÂ¸Ã‘ÂÃÂ¾ÃÂº",
    resultSummary: "Ãâ€™ÃÂµÃ‘â‚¬ÃÂ½ÃÂ¾: {correct} / {total}. ÃÅ¾Ã‘Ë†ÃÂ¸ÃÂ±ÃÂ¾ÃÂº: {wrong}",
    loadError: "ÃÂÃÂµ Ã‘Æ’ÃÂ´ÃÂ°ÃÂ»ÃÂ¾Ã‘ÂÃ‘Å’ ÃÂ·ÃÂ°ÃÂ³Ã‘â‚¬Ã‘Æ’ÃÂ·ÃÂ¸Ã‘â€šÃ‘Å’ Ã‘ÂÃÂ»ÃÂ¾ÃÂ²ÃÂ°",
    seedError: "ÃÂÃÂµ Ã‘Æ’ÃÂ´ÃÂ°ÃÂ»ÃÂ¾Ã‘ÂÃ‘Å’ Ã‘ÂÃÂ¾ÃÂ·ÃÂ´ÃÂ°Ã‘â€šÃ‘Å’ Ã‘â€šÃÂµÃ‘ÂÃ‘â€šÃÂ¾ÃÂ²Ã‘â€¹ÃÂµ ÃÂ´ÃÂ°ÃÂ½ÃÂ½Ã‘â€¹ÃÂµ",
    submitError: "ÃÂÃÂµ Ã‘Æ’ÃÂ´ÃÂ°ÃÂ»ÃÂ¾Ã‘ÂÃ‘Å’ ÃÂ¾Ã‘â€šÃÂ¿Ã‘â‚¬ÃÂ°ÃÂ²ÃÂ¸Ã‘â€šÃ‘Å’ ÃÂ¾Ã‘â€šÃÂ²ÃÂµÃ‘â€šÃ‘â€¹"
  },
  en: {
    title: "Review",
    tagline: "Reinforce old words and return to the test.",
    home: "Home",
    loading: "Loading...",
    noWords: "No words to review.",
    refresh: "Refresh",
    report: "Report issue",
    seed: "Seed demo data",
    seeding: "Seeding...",
    progress: "Session progress",
    tip: "Tip: answer without peeking to strengthen the interval.",
    tapCard: "Tap the card to reveal the translation",
    wordLabel: "Word",
    cardProgress: "Card {current} of {total}",
    prevCard: "Previous",
    learnedAt: "Learned",
    reviewAt: "Review",
    next: "Next",
    wordList: "Word list",
    closeList: "Close list",
    export: {
      title: "Export to Quizlet",
      action: "Export",
      hint: "Format: term TAB definition. Suitable for Quizlet import.",
      copy: "Copy",
      download: "Download file",
      close: "Close",
      empty: "No words to export."
    },
    cardsDone: "Cards completed",
    cardsDoneHint: "You can proceed to reading and the test.",
    goReading: "Go to reading",
    restartCards: "Restart cards",
    readingTitle: "Short text",
    readingText:
      "A short pause helps move words from short-term memory. Read the text without returning to the cards.",
    timeLeft: "Time left",
    seconds: "sec",
    backToCards: "Back to cards",
    skipText: "Skip reading",
    testTitle: "Test",
    testHint: "Type the translation for each word.",
    qualityHint: "Rate how easy it was to recall (0 = forgot, 5 = easy).",
    qualityLabel: "Rating",
    translationPlaceholder: "Translation",
    correct: "Correct",
    wrong: "Wrong",
    correctAnswer: "Correct answer: {answer}",
    submit: "Submit answers",
    refreshList: "Refresh list",
    resultSummary: "Correct: {correct} / {total}. Wrong: {wrong}",
    loadError: "Failed to load words",
    seedError: "Failed to create demo data",
    submitError: "Failed to submit answers"
  }
};

async function postJson(path, payload, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const data = await response.json();
      throw new Error(data.detail || "Request failed");
    }
    const message = await response.text();
    throw new Error(message || "Request failed");
  }
  return response.json();
}

const collectTranslations = (item) => {
  const list = Array.isArray(item?.translations) ? item.translations : [];
  const fallback = item?.translation ? [item.translation] : [];
  const combined = [...list, ...fallback];
  const seen = new Set();
  const result = [];
  combined.forEach((value) => {
    const trimmed = (value || "").trim();
    if (!trimmed) {
      return;
    }
    const key = trimmed.toLowerCase();
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    result.push(trimmed);
  });
  return result;
};

const getTranslationLine = (item) => collectTranslations(item).join(", ");

const getPrimaryTranslation = (item) => collectTranslations(item)[0] || "";

const buildQuizletText = (items) =>
  (items || [])
    .map((item) => `${item.word}\t${getTranslationLine(item)}`)
    .join("\n");

const downloadTextFile = (filename, text) => {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

export default function ReviewPage() {
  const [loading, setLoading] = useState(true);
  const [seedLoading, setSeedLoading] = useState(false);
  const [error, setError] = useState("");
  const [words, setWords] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [showTranslation, setShowTranslation] = useState({});
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [checkMap, setCheckMap] = useState({});
  const [correctMap, setCorrectMap] = useState({});
  const [qualityMap, setQualityMap] = useState({});
  const [phase, setPhase] = useState("cards");
  const [readingLeft, setReadingLeft] = useState(READ_SECONDS);
  const [cardIndex, setCardIndex] = useState(0);
  const [showWordList, setShowWordList] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportError, setExportError] = useState("");
  const [exportPayload, setExportPayload] = useState({
    text: "",
    count: 0,
    filename: ""
  });
  const { lang } = useUiLang();
  const uiLang = lang === "en" ? "en" : "ru";
  const t = TEXT[uiLang] || TEXT.ru;
  const locale = uiLang === "en" ? "en-US" : "ru-RU";

  const formatDate = (value) => {
    if (!value) {
      return "-";
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return date.toLocaleDateString(locale);
  };

  const loadWords = async () => {
    setLoading(true);
    setError("");
    setResult(null);
    const token = getCookie("token");
    if (!token) {
      window.location.href = "/auth";
      return;
    }
    try {
      const data = await postJson("/study/review/start", {}, token);
      setWords(data.words || []);
      setSessionId(data.session_id);
      const initialAnswers = {};
      (data.words || []).forEach((item) => {
        initialAnswers[item.word_id] = "";
      });
      setAnswers(initialAnswers);
      setShowTranslation({});
      setCheckMap({});
      setCorrectMap({});
      setQualityMap({});
      setPhase("cards");
      setReadingLeft(READ_SECONDS);
      setCardIndex(0);
    } catch (err) {
      const message = err.message || t.loadError;
      if (message === "Onboarding required") {
        window.location.href = "/onboarding";
        return;
      }
      if (message.includes("token") || message.includes("User not found")) {
        window.location.href = "/auth";
        return;
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const seedWords = async () => {
    setSeedLoading(true);
    setError("");
    const token = getCookie("token");
    if (!token) {
      window.location.href = "/auth";
      return;
    }
    try {
      await postJson("/study/review/seed?limit=10", {}, token);
      await loadWords();
    } catch (err) {
      setError(err.message || t.seedError);
    } finally {
      setSeedLoading(false);
    }
  };

  useEffect(() => {
    loadWords();
  }, []);

  useEffect(() => {
    if (phase !== "cards") {
      return;
    }
    const handleKey = (event) => {
      if (showWordList) {
        return;
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        advanceCard();
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goPrevCard();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [phase, showWordList, words.length, cardIndex]);

  useEffect(() => {
    if (phase !== "reading") {
      return;
    }
    if (readingLeft <= 0) {
      setPhase("test");
      return;
    }
    const timerId = setTimeout(() => {
      setReadingLeft((prev) => prev - 1);
    }, 1000);
    return () => clearTimeout(timerId);
  }, [phase, readingLeft]);

  const toggleTranslation = (wordId) => {
    setShowTranslation((prev) => ({ ...prev, [wordId]: !prev[wordId] }));
  };

  const updateAnswer = (wordId, value) => {
    setAnswers((prev) => ({ ...prev, [wordId]: value }));
    setCheckMap((prev) => {
      if (!Object.prototype.hasOwnProperty.call(prev, wordId)) {
        return prev;
      }
      const next = { ...prev };
      delete next[wordId];
      return next;
    });
    setCorrectMap((prev) => {
      if (!Object.prototype.hasOwnProperty.call(prev, wordId)) {
        return prev;
      }
      const next = { ...prev };
      delete next[wordId];
      return next;
    });
  };

  const updateQuality = (wordId, value) => {
    setQualityMap((prev) => ({ ...prev, [wordId]: value }));
  };

  const startReading = () => {
    setPhase("reading");
    setReadingLeft(READ_SECONDS);
  };

  const backToCards = () => {
    setPhase("cards");
    setCardIndex(0);
    setShowTranslation({});
  };

  const restartCards = () => {
    setCardIndex(0);
    setShowTranslation({});
  };

  const skipReading = () => {
    setPhase("test");
    setReadingLeft(0);
  };

  const goHome = () => {
    window.location.href = "/";
  };

  const reportIssue = (wordItem) => {
    const params = new URLSearchParams();
    params.set("source", "review");
    if (wordItem?.word) {
      params.set("word", wordItem.word);
    }
    const translation = getPrimaryTranslation(wordItem);
    if (translation) {
      params.set("translation", translation);
    }
    if (wordItem?.word_id) {
      params.set("word_id", String(wordItem.word_id));
    }
    window.location.href = `/reports?${params.toString()}`;
  };

  const advanceCard = () => {
    setCardIndex((prev) => Math.min(prev + 1, words.length));
    setShowTranslation({});
  };

  const goPrevCard = () => {
    setCardIndex((prev) => Math.max(prev - 1, 0));
    setShowTranslation({});
  };

  const openWordList = () => {
    setShowWordList(true);
  };

  const closeWordList = () => {
    setShowWordList(false);
  };

  const jumpToCard = (index) => {
    setCardIndex(index);
    setShowTranslation({});
    setShowWordList(false);
  };

  const openExport = () => {
    const text = buildQuizletText(words);
    setExportPayload({
      text,
      count: words.length,
      filename: "review-words.txt"
    });
    setExportError("");
    setExportOpen(true);
  };

  const closeExport = () => {
    setExportOpen(false);
    setExportError("");
  };

  const copyExport = async () => {
    if (!exportPayload.text) {
      return;
    }
    try {
      await navigator.clipboard.writeText(exportPayload.text);
    } catch (err) {
      setExportError(err.message || "Copy failed");
    }
  };

  const submit = async () => {
    setError("");
    setResult(null);
    const token = getCookie("token");
    if (!token) {
      window.location.href = "/auth";
      return;
    }
    const payload = {
      session_id: sessionId,
      words: words.map((item) => {
        const quality = qualityMap[item.word_id];
        const base = {
          word_id: item.word_id,
          answer: answers[item.word_id] || ""
        };
        if (quality === undefined) {
          return base;
        }
        return { ...base, quality };
      })
    };
    try {
      const data = await postJson("/study/review/submit", payload, token);
      setResult(data);
      const map = {};
      const correctAnswers = {};
      (data.results || []).forEach((item) => {
        map[item.word_id] = item.correct;
        correctAnswers[item.word_id] = item.correct_answers || [];
      });
      setCheckMap(map);
      setCorrectMap(correctAnswers);
      if (data.words_incorrect === 0) {
        setTimeout(() => {
          window.location.href = "/";
        }, 1200);
      }
    } catch (err) {
      setError(err.message || t.submitError);
    }
  };

  const cardsTotal = words.length;
  const cardsDone = Math.min(cardIndex, cardsTotal);
  const progressPercent = cardsTotal > 0 ? Math.round((cardsDone / cardsTotal) * 100) : 0;
  const cardsFinished = cardsTotal > 0 && cardIndex >= cardsTotal;
  const currentCard = cardIndex < cardsTotal ? words[cardIndex] : null;

  return (
    <main>
      <div className="page-header">
        <div className="page-hero-main">
          <h1 className="page-title">{t.title}</h1>
          <p className="page-tagline">{t.tagline}</p>
        </div>
        <div className="page-header-actions">
          <button type="button" className="button-secondary" onClick={goHome}>
            {t.home}
          </button>
          <button type="button" className="button-secondary" onClick={loadWords}>
            {t.refresh}
          </button>
        </div>
      </div>
      {loading ? <p className="muted">{t.loading}</p> : null}
      {error ? <p className="error">{error}</p> : null}

      {!loading && words.length === 0 ? (
        <div className="panel">
          <p className="muted">{t.noWords}</p>
          <div className="actions">
            <button type="button" onClick={loadWords}>
              {t.refresh}
            </button>
            <button
              type="button"
              className="button-secondary"
              onClick={seedWords}
              disabled={seedLoading}
            >
              {seedLoading ? t.seeding : t.seed}
            </button>
          </div>
        </div>
      ) : null}

      {words.length > 0 ? (
        <>
          <div className="study-grid">
            <div className="study-main">
              {phase === "cards" ? (
                <>
                  {!cardsFinished && currentCard ? (
                    <div className="card focus-card">
                      <div
                        className={`flip-card ${
                          showTranslation[currentCard.word_id] ? "is-flipped" : ""
                        }`}
                        onClick={() => toggleTranslation(currentCard.word_id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            toggleTranslation(currentCard.word_id);
                          }
                        }}
                      >
                        <div className="flip-inner">
                          <div className="flip-face flip-front">
                            <div className="card-title">{currentCard.word}</div>
                            <div className="card-sub muted">{t.tapCard}</div>
                          </div>
                          <div className="flip-face flip-back">
                            <div className="card-title">{getTranslationLine(currentCard)}</div>
                            <div className="card-sub muted">
                              {t.wordLabel}: {currentCard.word}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="card-meta">
                        <span className="card-progress">
                          {t.cardProgress
                            .replace("{current}", cardIndex + 1)
                            .replace("{total}", cardsTotal)}
                        </span>
                        <span>
                          {t.learnedAt}: {formatDate(currentCard.learned_at)}
                        </span>
                        <span>
                          {t.reviewAt}: {formatDate(currentCard.next_review_at)}
                        </span>
                      </div>
                      <div className="card-actions">
                        <button
                          type="button"
                          className="button-secondary"
                          onClick={goPrevCard}
                          disabled={cardIndex === 0}
                        >
                          {t.prevCard}
                        </button>
                        <button type="button" onClick={advanceCard}>
                          {t.next}
                        </button>
                        <button
                          type="button"
                          className="button-secondary"
                          onClick={() => reportIssue(currentCard)}
                        >
                          {t.report}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="panel">
                      <div className="panel-title">{t.cardsDone}</div>
                      <p className="muted">{t.cardsDoneHint}</p>
                      <div className="actions">
                        <button type="button" onClick={startReading}>
                          {t.goReading}
                        </button>
                        <button type="button" className="button-secondary" onClick={restartCards}>
                          {t.restartCards}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : null}

              {phase === "reading" ? (
                <div className="panel reading-panel">
                  <div className="panel-title">{t.readingTitle}</div>
                  <p className="reading-text">{t.readingText}</p>
                  <div className="timer">
                    {t.timeLeft}: <span className="timer-value">{readingLeft}</span> {t.seconds}
                  </div>
                  <div className="actions">
                    <button type="button" className="button-secondary" onClick={backToCards}>
                      {t.backToCards}
                    </button>
                    <button type="button" onClick={skipReading}>
                      {t.skipText}
                    </button>
                  </div>
                </div>
              ) : null}

              {phase === "test" ? (
                <div className="panel">
                  <div className="panel-title">{t.testTitle}</div>
                  <p className="muted">{t.testHint}</p>
                  <p className="muted">{t.qualityHint}</p>
                  <div className="input-list">
                    {words.map((item) => (
                      <div
                        key={item.word_id}
                        className={`input-row ${checkMap[item.word_id] === true ? "correct" : ""} ${
                          checkMap[item.word_id] === false ? "wrong" : ""
                        }`}
                      >
                        <div className="input-word">{item.word}</div>
                        <input
                          type="text"
                          value={answers[item.word_id] || ""}
                          onChange={(event) => updateAnswer(item.word_id, event.target.value)}
                          placeholder={t.translationPlaceholder}
                        />
                        {checkMap[item.word_id] === true ? (
                          <span className="input-status correct">{t.correct}</span>
                        ) : null}
                        {checkMap[item.word_id] === false ? (
                          <span className="input-status wrong">{t.wrong}</span>
                        ) : null}
                        {checkMap[item.word_id] === false ? (
                          <div className="input-hint">
                            {t.correctAnswer.replace(
                              "{answer}",
                              correctMap[item.word_id]?.join(", ") || "-"
                            )}
                          </div>
                        ) : null}
                        <div className="quality-row">
                          <span className="quality-label">{t.qualityLabel}</span>
                          <div className="quality-buttons">
                            {[0, 1, 2, 3, 4, 5].map((value) => (
                              <button
                                key={value}
                                type="button"
                                className={`quality-button${
                                  qualityMap[item.word_id] === value ? " is-active" : ""
                                }`}
                                onClick={() => updateQuality(item.word_id, value)}
                              >
                                {value}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="actions">
                    <button type="button" onClick={submit}>
                      {t.submit}
                    </button>
                    <button type="button" className="button-secondary" onClick={backToCards}>
                      {t.backToCards}
                    </button>
                    <button type="button" className="button-secondary" onClick={loadWords}>
                      {t.refreshList}
                    </button>
                  </div>
                  {result ? (
                    <div className="result">
                      {t.resultSummary
                        .replace("{correct}", result.words_correct)
                        .replace("{total}", result.words_total)
                        .replace("{wrong}", result.words_incorrect)}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="study-side">
              <div className="panel progress-panel compact">
                <div className="progress-top">
                  <div className="panel-title">{t.progress}</div>
                  <div className="progress-text">
                    {cardsDone} / {words.length}
                  </div>
                </div>
                <div className="progress-row">
                  <div className="progress-bar">
                    <span
                      style={{
                        width: `${progressPercent}%`
                      }}
                    />
                  </div>
                </div>
                <div className="progress-actions">
                  <button type="button" className="button-secondary" onClick={openWordList}>
                    {t.wordList}
                  </button>
                  <button
                    type="button"
                    className="button-secondary"
                    onClick={openExport}
                    disabled={words.length === 0}
                  >
                    {t.export.action}
                  </button>
                  <p className="muted tip">{t.tip}</p>
                </div>
              </div>
            </div>
          </div>

          {showWordList ? (
            <div className="modal-overlay" onClick={closeWordList}>
              <div className="modal-card word-list-modal" onClick={(event) => event.stopPropagation()}>
                <div className="modal-header">
                  <div>
                    <div className="modal-title">{t.wordList}</div>
                    <div className="modal-sub">
                      {t.cardProgress
                        .replace("{current}", String(cardIndex + 1))
                        .replace("{total}", String(cardsTotal))}
                    </div>
                  </div>
                  <button type="button" className="button-secondary modal-close" onClick={closeWordList}>
                    {t.closeList}
                  </button>
                </div>
                <div className="modal-body">
                  <div className="word-list">
                    {words.map((item, index) => (
                      <button
                        type="button"
                        key={item.word_id}
                        className={`word-list-item${index === cardIndex ? " is-active" : ""}`}
                        onClick={() => jumpToCard(index)}
                      >
                        <span className="word-list-word">{item.word}</span>
                        <span className="word-list-translation muted">{getTranslationLine(item)}</span>
                        <span className="word-list-index muted">
                          {index + 1}/{cardsTotal}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {exportOpen ? (
            <div className="modal-overlay" onClick={closeExport}>
              <div className="modal-card export-modal" onClick={(event) => event.stopPropagation()}>
                <div className="modal-header">
                  <div>
                    <div className="modal-title">{t.export.title}</div>
                    <div className="modal-sub">
                      {exportPayload.count} / {words.length}
                    </div>
                  </div>
                  <button type="button" className="button-secondary modal-close" onClick={closeExport}>
                    {t.export.close}
                  </button>
                </div>
                <div className="modal-body">
                  <p className="muted">{t.export.hint}</p>
                  {exportPayload.text ? (
                    <textarea className="export-textarea" readOnly value={exportPayload.text} />
                  ) : (
                    <p className="muted">{t.export.empty}</p>
                  )}
                  {exportError ? <p className="error">{exportError}</p> : null}
                </div>
                <div className="modal-footer">
                  <button type="button" onClick={copyExport} disabled={!exportPayload.text}>
                    {t.export.copy}
                  </button>
                  <button
                    type="button"
                    className="button-secondary"
                    onClick={() => downloadTextFile(exportPayload.filename, exportPayload.text)}
                    disabled={!exportPayload.text}
                  >
                    {t.export.download}
                  </button>
                </div>
              </div>
            </div>
          ) : null}</>
          ) : null}

          {showWordList ? (
            <div className="modal-overlay" onClick={closeWordList}>
              <div className="modal-card word-list-modal" onClick={(event) => event.stopPropagation()}>
                <div className="modal-header">
                  <div>
                    <div className="modal-title">{t.wordList}</div>
                    <div className="modal-sub">
                      {t.cardProgress
                        .replace("{current}", String(cardIndex + 1))
                        .replace("{total}", String(cardsTotal))}
                    </div>
                  </div>
                  <button type="button" className="button-secondary modal-close" onClick={closeWordList}>
                    {t.closeList}
                  </button>
                </div>
                <div className="modal-body">
                  <div className="word-list">
                    {words.map((item, index) => (
                      <button
                        type="button"
                        key={item.word_id}
                        className={`word-list-item${index === cardIndex ? " is-active" : ""}`}
                        onClick={() => jumpToCard(index)}
                      >
                        <span className="word-list-word">{item.word}</span>
                        <span className="word-list-translation muted">{getTranslationLine(item)}</span>
                        <span className="word-list-index muted">
                          {index + 1}/{cardsTotal}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {exportOpen ? (
            <div className="modal-overlay" onClick={closeExport}>
              <div className="modal-card export-modal" onClick={(event) => event.stopPropagation()}>
                <div className="modal-header">
                  <div>
                    <div className="modal-title">{t.export.title}</div>
                    <div className="modal-sub">
                      {exportPayload.count} / {words.length}
                    </div>
                  </div>
                  <button type="button" className="button-secondary modal-close" onClick={closeExport}>
                    {t.export.close}
                  </button>
                </div>
                <div className="modal-body">
                  <p className="muted">{t.export.hint}</p>
                  {exportPayload.text ? (
                    <textarea className="export-textarea" readOnly value={exportPayload.text} />
                  ) : (
                    <p className="muted">{t.export.empty}</p>
                  )}
                  {exportError ? <p className="error">{exportError}</p> : null}
                </div>
                <div className="modal-footer">
                  <button type="button" onClick={copyExport} disabled={!exportPayload.text}>
                    {t.export.copy}
                  </button>
                  <button
                    type="button"
                    className="button-secondary"
                    onClick={() => downloadTextFile(exportPayload.filename, exportPayload.text)}
                    disabled={!exportPayload.text}
                  >
                    {t.export.download}
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </main>
  );
}
