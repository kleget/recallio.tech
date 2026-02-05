"use client";

import { useEffect, useState } from "react";

import { getCookie } from "../lib/client-cookies";
import { useUiLang } from "../ui-lang-context";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

const TEXT = {
  ru: {
    title: "План повторений",
    tagline: "Когда и какие слова будут повторяться.",
    loading: "Загрузка...",
    error: "Не удалось загрузить план повторений",
    empty: "Пока нет слов для повторения.",
    refresh: "Обновить",
    total: "Всего",
    shown: "Показано",
    tableTitle: "Слова по расписанию",
    tableHint: "План повторений с датой следующего показа.",
    columns: {
      date: "Дата",
      word: "Слово",
      translation: "Перевод",
      source: "Источник"
    },
    due: "Надо сегодня",
    sources: {
      custom: "Мои слова",
      corpus: "Корпус: {name}",
      unknown: "Другой источник"
    }
  },
  en: {
    title: "Review plan",
    tagline: "See when each word will be reviewed.",
    loading: "Loading...",
    error: "Failed to load review plan",
    empty: "No words scheduled for review yet.",
    refresh: "Refresh",
    total: "Total",
    shown: "Shown",
    tableTitle: "Scheduled words",
    tableHint: "Next review dates for your words.",
    columns: {
      date: "Date",
      word: "Word",
      translation: "Translation",
      source: "Source"
    },
    due: "Due today",
    sources: {
      custom: "My words",
      corpus: "Corpus: {name}",
      unknown: "Other source"
    }
  }
};

function formatDate(value, locale) {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString(locale);
}

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

function renderSources(sources, t) {
  if (!Array.isArray(sources) || sources.length === 0) {
    return "-";
  }
  const labels = sources.map((source) => {
    if (source.type === "custom") {
      return t.sources.custom;
    }
    if (source.type === "corpus") {
      const name = source.name || "-";
      return t.sources.corpus.replace("{name}", name);
    }
    return t.sources.unknown;
  });
  return labels.join(", ");
}

export default function ReviewPlanPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const { lang } = useUiLang();
  const uiLang = lang === "en" ? "en" : "ru";
  const t = TEXT[uiLang] || TEXT.ru;
  const locale = uiLang === "en" ? "en-US" : "ru-RU";

  const loadPlan = async () => {
    setLoading(true);
    setError("");
    const token = getCookie("token");
    if (!token) {
      window.location.href = "/auth";
      return;
    }
    try {
      const data = await getJson(`/stats/review-plan?ui_lang=${uiLang}`, token);
      const list = Array.isArray(data?.items) ? data.items : [];
      setItems(list);
      setTotal(Number.isFinite(data?.total) ? data.total : list.length);
    } catch (err) {
      setError(err.message || t.error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlan();
  }, []);

  const now = new Date();

  return (
    <main>
      <div className="page-header">
        <div className="page-hero-main">
          <h1 className="page-title">{t.title}</h1>
          <p className="page-tagline">{t.tagline}</p>
        </div>
        <div className="page-header-actions">
          <button type="button" className="button-secondary" onClick={loadPlan}>
            {t.refresh}
          </button>
        </div>
      </div>

      {loading ? <p className="muted">{t.loading}</p> : null}
      {error ? <p className="error">{error}</p> : null}

      {!loading && !error && items.length === 0 ? (
        <div className="panel">
          <p className="muted">{t.empty}</p>
        </div>
      ) : null}

      {!loading && !error && items.length > 0 ? (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-label">{t.total}</div>
              <div className="stat-value">{total}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">{t.shown}</div>
              <div className="stat-value">{items.length}</div>
            </div>
          </div>
          <div className="panel">
            <div className="panel-header">
              <div>
                <div className="panel-title">{t.tableTitle}</div>
                <p className="muted">{t.tableHint}</p>
              </div>
            </div>
            <div className="schedule-table-wrap">
              <table className="schedule-table">
                <thead>
                  <tr>
                    <th>{t.columns.date}</th>
                    <th>{t.columns.word}</th>
                    <th>{t.columns.translation}</th>
                    <th>{t.columns.source}</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const reviewDate = item.next_review_at ? new Date(item.next_review_at) : null;
                    const isDue = reviewDate ? reviewDate <= now : false;
                    return (
                      <tr
                        key={item.word_id}
                        className={isDue ? "schedule-row is-due" : "schedule-row"}
                      >
                        <td data-label={t.columns.date} className="schedule-date">
                          {formatDate(item.next_review_at, locale)}
                          {isDue ? <span className="schedule-due">{t.due}</span> : null}
                        </td>
                        <td data-label={t.columns.word} className="schedule-word">
                          {item.word}
                        </td>
                        <td data-label={t.columns.translation} className="schedule-translation">
                          {item.translations && item.translations.length
                            ? item.translations.join(", ")
                            : "-"}
                        </td>
                        <td data-label={t.columns.source} className="schedule-source">
                          {renderSources(item.sources, t)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </main>
  );
}
