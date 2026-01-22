"use client";

import { useState } from "react";

import { getCookie } from "../lib/client-cookies";
import { useUiLang } from "../ui-lang-context";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

const TEXT = {
  ru: {
    title: "Чтение для повторения",
    tagline: "Короткий связный текст с вашими недавними словами.",
    home: "На главную",
    targetLabel: "Сколько слов покрыть",
    daysLabel: "За сколько дней",
    action: "Собрать текст",
    regenerate: "Еще вариант",
    highlightOn: "Подсветить слова",
    highlightOff: "Убрать подсветку",
    loading: "Собираем...",
    empty: "Пока нет текста.",
    coverage: "Покрытие",
    words: "слов",
    length: "Длина",
    source: "Источник",
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
    highlightOn: "Highlight words",
    highlightOff: "Hide highlights",
    loading: "Building...",
    empty: "No text yet.",
    coverage: "Coverage",
    words: "words",
    length: "Length",
    source: "Source",
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

  const coveragePct =
    reading && reading.target_words ? Math.round((reading.coverage || 0) * 100) : 0;
  const coverageLabel =
    reading && reading.target_words ? `${reading.hits}/${reading.target_words}` : "";
  const lengthLabel =
    reading && reading.word_count ? `${reading.word_count} ${t.words}` : "";
  const sourceLabel =
    reading && (reading.source_title || reading.corpus_name)
      ? reading.source_title || reading.corpus_name
      : "";
  const requestedLabel =
    reading && reading.target_words_requested
      ? `${reading.target_words_requested} ${t.words}`
      : "";
  const highlightTokens = new Set(
    (reading?.highlight_tokens || []).map((item) => String(item).toLowerCase())
  );
  const highlightLabel = highlightOn ? t.highlightOff : t.highlightOn;
  const hasReading = Boolean(reading && reading.text);

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
          <button type="button" onClick={() => loadReading(0, true)} disabled={loading}>
            {loading ? t.loading : t.action}
          </button>
          <button
            type="button"
            className="button-secondary"
            onClick={() => loadReading(variant + 1, true)}
            disabled={loading || !hasReading}
          >
            {t.regenerate}
          </button>
          <button
            type="button"
            className="button-secondary"
            onClick={() => setHighlightOn((prev) => !prev)}
            disabled={!hasReading}
          >
            {highlightLabel}
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
                  {t.source}: {sourceLabel}
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
