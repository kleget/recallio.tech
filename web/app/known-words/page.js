"use client";

import { useEffect, useState } from "react";

import { getCookie } from "../lib/client-cookies";
import { useUiLang } from "../ui-lang-context";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

const TEXT = {
  ru: {
    title: "Известные слова",
    tagline: "Импортируй слова, которые уже знаешь, чтобы не учить их заново.",
    loading: "Загрузка...",
    error: "Не удалось загрузить профиль",
    saveError: "Не удалось сохранить",
    known: {
      title: "Известные слова",
      hint:
        "Слова, которые ты уже знаешь. Импорт отмечает их как известные и не предлагает в изучении.",
      disabled: "Сначала нужно пройти настройку обучения.",
      format: "Формат: слово - перевод",
      exampleTitle: "Пример",
      example:
        "dog - собака\nclock - часы\nwarm - тепло\nокно - window\nмышь - mouse",
      import: "Импортировать",
      importing: "Импорт...",
      result: "Результат импорта",
      stats: {
        totalLines: "Всего строк",
        parsedLines: "Распознано",
        invalidLines: "Ошибка формата",
        wordsFound: "Найдено",
        wordsMissing: "Не найдено",
        inserted: "Добавлено",
        skipped: "Пропущено"
      }
    }
  },
  en: {
    title: "Known words",
    tagline: "Import words you already know so they won't show up for learning.",
    loading: "Loading...",
    error: "Failed to load profile",
    saveError: "Failed to save",
    known: {
      title: "Known words",
      hint:
        "Words you already know. Import marks them as known and removes them from learning.",
      disabled: "Complete learning setup first.",
      format: "Format: word - translation",
      exampleTitle: "Example",
      example:
        "dog - собака\nclock - часы\nwarm - тепло\nокно - window\nмышь - mouse",
      import: "Import",
      importing: "Importing...",
      result: "Import result",
      stats: {
        totalLines: "Total lines",
        parsedLines: "Parsed",
        invalidLines: "Invalid",
        wordsFound: "Found",
        wordsMissing: "Missing",
        inserted: "Inserted",
        skipped: "Skipped"
      }
    }
  }
};

async function getJson(path, token) {
  const headers = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const response = await fetch(`${API_BASE}${path}`, { headers });
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

export default function KnownWordsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState(null);
  const [knownText, setKnownText] = useState("");
  const [knownResult, setKnownResult] = useState(null);
  const [knownError, setKnownError] = useState("");
  const [knownImporting, setKnownImporting] = useState(false);
  const { lang } = useUiLang();
  const uiLang = lang || "ru";

  const t = TEXT[uiLang] || TEXT.ru;

  useEffect(() => {
    const token = getCookie("token");
    if (!token) {
      window.location.href = "/auth";
      return;
    }
    getJson("/auth/me", token)
      .then((data) => {
        setProfile(data);
      })
      .catch((err) => {
        const message = err.message || t.error;
        if (message.includes("token") || message.includes("User not found")) {
          window.location.href = "/auth";
          return;
        }
        setError(message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    setKnownError("");
  }, [knownText]);

  const importKnownWords = async () => {
    setKnownError("");
    setKnownResult(null);
    if (!onboardingReady) {
      setKnownError(t.known.disabled);
      return;
    }
    const token = getCookie("token");
    if (!token) {
      window.location.href = "/auth";
      return;
    }
    if (!knownText.trim()) {
      return;
    }
    setKnownImporting(true);
    try {
      const data = await postJson("/onboarding/known-words", { text: knownText }, token);
      setKnownResult(data);
    } catch (err) {
      setKnownError(err.message || t.saveError);
    } finally {
      setKnownImporting(false);
    }
  };

  const onboardingReady = Boolean(profile?.onboarding_done);
  const knownStats = knownResult
    ? [
        { label: t.known.stats.totalLines, value: knownResult.total_lines },
        { label: t.known.stats.parsedLines, value: knownResult.parsed_lines },
        { label: t.known.stats.invalidLines, value: knownResult.invalid_lines },
        { label: t.known.stats.wordsFound, value: knownResult.words_found },
        { label: t.known.stats.wordsMissing, value: knownResult.words_missing },
        { label: t.known.stats.inserted, value: knownResult.inserted },
        { label: t.known.stats.skipped, value: knownResult.skipped_existing }
      ]
    : [];

  return (
    <main>
      <div className="page-header">
        <div>
          <h1>{t.title}</h1>
          <p className="muted">{t.tagline}</p>
        </div>
      </div>

      {loading ? <p className="muted">{t.loading}</p> : null}
      {error ? <p className="error">{error}</p> : null}

      {profile ? (
        <div className="panel">
          <div className="panel-title">{t.known.title}</div>
          <p className="muted">{t.known.hint}</p>
          {!onboardingReady ? <p className="error">{t.known.disabled}</p> : null}
          <div className="import-sample">
            <div className="import-sample-title">{t.known.exampleTitle}</div>
            <pre>{t.known.example}</pre>
            <div className="import-sample-hint">{t.known.format}</div>
          </div>
          <textarea
            value={knownText}
            onChange={(event) => setKnownText(event.target.value)}
            placeholder={t.known.example}
          />
          <div className="actions">
            <button
              type="button"
              onClick={importKnownWords}
              disabled={knownImporting || !knownText.trim() || !onboardingReady}
            >
              {knownImporting ? t.known.importing : t.known.import}
            </button>
            {knownError ? <span className="error">{knownError}</span> : null}
          </div>
          {knownStats.length ? (
            <>
              <div className="panel-title">{t.known.result}</div>
              <div className="import-grid">
                {knownStats.map((item) => (
                  <div key={item.label} className="import-card">
                    <div className="import-title">{item.label}</div>
                    <div className="import-value">{item.value}</div>
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </div>
      ) : null}
    </main>
  );
}
