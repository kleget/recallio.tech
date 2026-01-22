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
  const { lang } = useUiLang();
  const uiLang = lang === "en" ? "en" : "ru";
  const t = TEXT[uiLang] || TEXT.ru;

  const goHome = () => {
    window.location.href = "/";
  };

  const loadReading = async () => {
    const token = getCookie("token");
    if (!token) {
      window.location.href = "/auth";
      return;
    }
    setError("");
    setLoading(true);
    try {
      const data = await postJson("/reading", { target_words: targetWords, days }, token);
      setReading(data);
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

  return (
    <div className="page">
      <div className="page-header">
        <h1>{t.title}</h1>
        <p className="muted">{t.tagline}</p>
        <button type="button" className="button-secondary" onClick={goHome}>
          {t.home}
        </button>
      </div>

      <div className="panel reading-panel">
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
          <button
            type="button"
            className="button-secondary reading-action"
            onClick={loadReading}
            disabled={loading}
          >
            {loading ? t.loading : t.action}
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
            <div className="reading-text reading-content">{reading.text}</div>
          </>
        ) : (
          <div className="muted reading-empty">{reading?.message || t.empty}</div>
        )}
      </div>
    </div>
  );
}
