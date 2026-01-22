"use client";

import { useState } from "react";

import { getCookie } from "../lib/client-cookies";
import { useUiLang } from "../ui-lang-context";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";
const MAX_SOURCE_TITLE = 48;
const MAX_SOURCE_ITEMS = 3;

const TEXT = {
  ru: {
    title: "Чтение для повторения",
    tagline: "Короткий связный текст с вашими недавними словами.",
    home: "На главную",
    targetLabel: "Сколько слов покрыть",
    daysLabel: "За сколько дней",
    action: "Собрать текст",
    regenerate: "Еще вариант",
    badText: "Плохой текст",
    highlightOn: "Подсветить слова",
    highlightOff: "Убрать подсветку",
    loading: "Собираем...",
    empty: "Пока нет текста.",
    coverage: "Покрытие",
    words: "слов",
    length: "Длина",
    source: "Источник",
    sources: "Источники",
    requested: "Цель",
    error: "Не удалось собрать текст"
  },
  en: {
    title: "Reading practice",
    tagline: "Short coherent text with your recently learned words.",
    home: "Home",
    targetLabel: "Words to include",
    daysLabel: "Days back",
    action: "Build text",
    regenerate: "New variant",
    badText: "Bad text",
    highlightOn: "Highlight words",
    highlightOff: "Hide highlights",
    loading: "Building...",
    empty: "No text yet.",
    coverage: "Coverage",
    words: "words",
    length: "Length",
    source: "Source",
    sources: "Sources",
    requested: "Target",
    error: "Failed to build text"
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

export default function ReadingPage() {
  const [reading, setReading] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [flagging, setFlagging] = useState(false);
  const [targetWords, setTargetWords] = useState(10);
  const [days, setDays] = useState(3);
  const [variant, setVariant] = useState(0);
  const [highlightOn, setHighlightOn] = useState(false);
  const { lang } = useUiLang();
  const uiLang = lang === "en" ? "en" : "ru";
  const t = TEXT[uiLang] || TEXT.ru;

  const goHome = () => {
    window.location.href = "/";
  };

  const loadReading = async (nextVariant = variant, resetHighlight = false) => {
    const token = getCookie("token");
    if (!token) {
      window.location.href = "/auth";
      return;
    }
    setError("");
    setLoading(true);
    try {
      const data = await postJson(
        "/reading",
        { target_words: targetWords, days, variant: nextVariant },
        token
      );
      setReading(data);
      setVariant(nextVariant);
      if (resetHighlight) {
        setHighlightOn(false);
      }
    } catch (err) {
      setError(err.message || t.error);
    } finally {
      setLoading(false);
    }
  };

  const flagReading = async () => {
    if (!reading?.passage_ids?.length) {
      return;
    }
    const token = getCookie("token");
    if (!token) {
      window.location.href = "/auth";
      return;
    }
    setError("");
    setFlagging(true);
    try {
      await postJson("/reading/flag", { passage_ids: reading.passage_ids }, token);
      await loadReading(0, true);
    } catch (err) {
      setError(err.message || t.error);
    } finally {
      setFlagging(false);
    }
  };

  const coveragePct =
    reading && reading.target_words ? Math.round((reading.coverage || 0) * 100) : 0;
  const coverageLabel =
    reading && reading.target_words ? `${reading.hits}/${reading.target_words}` : "";
  const lengthLabel =
    reading && reading.word_count ? `${reading.word_count} ${t.words}` : "";
  const sourceTitles = reading?.source_titles?.length
    ? reading.source_titles
    : reading?.source_title
      ? [reading.source_title]
      : [];
  const corpusTitles = reading?.corpus_names?.length
    ? reading.corpus_names
    : reading?.corpus_name
      ? [reading.corpus_name]
      : [];
  const sourceItems = sourceTitles.length ? sourceTitles : corpusTitles;
  const sourceLabel = sourceItems.length ? formatSources(sourceItems) : "";
  const sourceLabelText = sourceItems.length > 1 ? t.sources || t.source : t.source;
  const requestedLabel =
    reading && reading.target_words_requested
      ? `${reading.target_words_requested} ${t.words}`
      : "";
  const highlightTokens = new Set(
    (reading?.highlight_tokens || []).map((item) => String(item).toLowerCase())
  );
  const highlightLabel = highlightOn ? t.highlightOff : t.highlightOn;
  const badTextLabel = t.badText || "Bad text";
  const hasReading = Boolean(reading && reading.text);
  const canFlag = Boolean(hasReading && reading?.passage_ids?.length);
  const busy = loading || flagging;

  function truncateSource(value) {
    const trimmed = String(value || "").trim();
    if (!trimmed) {
      return "";
    }
    if (trimmed.length <= MAX_SOURCE_TITLE) {
      return trimmed;
    }
    return `${trimmed.slice(0, Math.max(0, MAX_SOURCE_TITLE - 3))}...`;
  }

  function formatSources(items) {
    const list = Array.isArray(items) ? items : items ? [items] : [];
    if (!list.length) {
      return "";
    }
    const limited = list.slice(0, MAX_SOURCE_ITEMS).map(truncateSource).filter(Boolean);
    const extra = list.length - limited.length;
    if (extra > 0) {
      return `${limited.join(" · ")} · +${extra}`;
    }
    return limited.join(" · ");
  }

  const renderHighlightedText = () => {
    if (!reading || !reading.text) {
      return null;
    }
    if (!highlightOn || highlightTokens.size === 0) {
      return reading.text;
    }
    const regex = /(\p{L}+(?:['’]\p{L}+)*)/gu;
    const parts = [];
    let lastIndex = 0;
    for (const match of reading.text.matchAll(regex)) {
      const [word] = match;
      const index = match.index ?? 0;
      if (index > lastIndex) {
        parts.push(reading.text.slice(lastIndex, index));
      }
      const normalized = word.toLowerCase();
      if (highlightTokens.has(normalized)) {
        parts.push(
          <mark key={`${index}-${word}`} className="reading-highlight">
            {word}
          </mark>
        );
      } else {
        parts.push(word);
      }
      lastIndex = index + word.length;
    }
    if (lastIndex < reading.text.length) {
      parts.push(reading.text.slice(lastIndex));
    }
    return parts;
  };

  return (
    <main>
      <div className="page-header">
        <div>
          <h1>{t.title}</h1>
          <p>{t.tagline}</p>
        </div>
        <div className="page-header-actions">
          <button type="button" className="button-secondary" onClick={goHome}>
            {t.home}
          </button>
        </div>
      </div>

      <div className="panel reading-panel reading-home">
        <div className="reading-controls">
          <label className="reading-control">
            <span className="reading-label">{t.targetLabel}</span>
            <input
              type="number"
              min="1"
              max="50"
              value={targetWords}
              onChange={(event) => {
                const next = Number(event.target.value || 1);
                if (Number.isNaN(next)) {
                  return;
                }
                setTargetWords(Math.max(1, Math.min(50, next)));
              }}
            />
          </label>
          <label className="reading-control">
            <span className="reading-label">{t.daysLabel}</span>
            <select value={days} onChange={(event) => setDays(Number(event.target.value))}>
              <option value={3}>3</option>
              <option value={7}>7</option>
              <option value={14}>14</option>
            </select>
          </label>
        </div>
        <div className="reading-actions">
          <button type="button" onClick={() => loadReading(0, true)} disabled={busy}>
            {loading ? t.loading : t.action}
          </button>
          <button
            type="button"
            className="button-secondary"
            onClick={() => loadReading(variant + 1, true)}
            disabled={busy || !hasReading}
          >
            {t.regenerate}
          </button>
          <button
            type="button"
            className="button-secondary"
            onClick={() => setHighlightOn((prev) => !prev)}
            disabled={busy || !hasReading}
          >
            {highlightLabel}
          </button>
          <button
            type="button"
            className="button-danger"
            onClick={flagReading}
            disabled={busy || !canFlag}
          >
            {badTextLabel}
          </button>
        </div>
        {error ? <div className="error">{error}</div> : null}
        {reading && reading.text ? (
          <>
            <div className="reading-meta muted">
              {requestedLabel ? (
                <span>
                  {t.requested}: {requestedLabel}
                </span>
              ) : null}
              {coverageLabel ? (
                <span>
                  {t.coverage}: {coverageLabel} ({coveragePct}%)
                </span>
              ) : null}
              {lengthLabel ? (
                <span>
                  {t.length}: {lengthLabel}
                </span>
              ) : null}
              {sourceLabel ? (
                <span>
                  {sourceLabelText}: {sourceLabel}
                </span>
              ) : null}
            </div>
            <div className="reading-text reading-content">{renderHighlightedText()}</div>
          </>
        ) : (
          <div className="muted reading-empty">{reading?.message || t.empty}</div>
        )}
      </div>
    </main>
  );
}
