"use client";

import { useEffect, useMemo, useState } from "react";

import { getCookie } from "../../lib/client-cookies";
import { useUiLang } from "../../ui-lang-context";
import AdminNav from "../admin-nav";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

const TEXT = {
  ru: {
    title: "Слова",
    tagline: "Поиск и правка слов во всей базе.",
    loading: "Загрузка...",
    search: "Поиск по слову",
    language: "Язык",
    all: "Все",
    onlyOrphan: "Только осиротевшие",
    refresh: "Обновить",
    total: "Всего",
    shown: "Показано",
    columns: {
      word: "Слово",
      lang: "Язык",
      sources: "Источник",
      actions: "Действия"
    },
    sources: {
      corpus: "Корпус",
      custom: "Мои слова",
      review: "Повторы",
      orphan: "Осиротевшее"
    },
    save: "Сохранить",
    saved: "Сохранено",
    error: "Ошибка",
    forbidden: "Нет доступа."
  },
  en: {
    title: "Words",
    tagline: "Search and edit words across the database.",
    loading: "Loading...",
    search: "Search word",
    language: "Language",
    all: "All",
    onlyOrphan: "Orphans only",
    refresh: "Refresh",
    total: "Total",
    shown: "Shown",
    columns: {
      word: "Word",
      lang: "Lang",
      sources: "Source",
      actions: "Actions"
    },
    sources: {
      corpus: "Corpus",
      custom: "My words",
      review: "Review",
      orphan: "Orphaned"
    },
    save: "Save",
    saved: "Saved",
    error: "Error",
    forbidden: "Access denied."
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

async function patchJson(path, payload, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const response = await fetch(`${API_BASE}${path}`, {
    method: "PATCH",
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

function buildSourceLabels(item, t) {
  const labels = [];
  if (item.in_corpus) {
    labels.push(t.sources.corpus);
  }
  if (item.in_custom) {
    labels.push(t.sources.custom);
  }
  if (item.in_user_words) {
    labels.push(t.sources.review);
  }
  if (!item.in_corpus && !item.in_custom && item.in_user_words) {
    labels.push(t.sources.orphan);
  }
  return labels;
}

export default function AdminWordsPage() {
  const { lang } = useUiLang();
  const uiLang = lang === "en" ? "en" : "ru";
  const t = TEXT[uiLang] || TEXT.ru;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState("");
  const [langFilter, setLangFilter] = useState("");
  const [orphanOnly, setOrphanOnly] = useState(false);

  const loadWords = async () => {
    const token = getCookie("token");
    if (!token) {
      window.location.href = "/auth";
      return;
    }
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (query.trim()) {
        params.set("query", query.trim());
      }
      if (langFilter) {
        params.set("lang", langFilter);
      }
      if (orphanOnly) {
        params.set("orphan_only", "true");
      }
      const data = await getJson(`/admin/content/words?${params.toString()}`, token);
      setItems(Array.isArray(data?.items) ? data.items : []);
      setTotal(Number.isFinite(data?.total) ? data.total : 0);
    } catch (err) {
      const message = err.message || t.error;
      if (message.includes("Forbidden")) {
        setError(t.forbidden);
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWords();
  }, []);

  const rows = useMemo(
    () =>
      items.map((item) => ({
        ...item,
        labelSources: buildSourceLabels(item, t).join(", ")
      })),
    [items, t]
  );

  const handleSave = async (itemId, value) => {
    const token = getCookie("token");
    if (!token) {
      window.location.href = "/auth";
      return;
    }
    try {
      const updated = await patchJson(`/admin/content/words/${itemId}`, { lemma: value }, token);
      setItems((prev) =>
        prev.map((item) =>
          item.id === itemId ? { ...item, lemma: updated.lemma, id: updated.id } : item
        )
      );
    } catch (err) {
      setError(err.message || t.error);
    }
  };

  return (
    <main>
      <div className="page-header">
        <div className="page-hero-main">
          <h1 className="page-title">{t.title}</h1>
          <p className="page-tagline">{t.tagline}</p>
        </div>
        <div className="page-header-actions">
          <button type="button" className="button-secondary" onClick={loadWords}>
            {t.refresh}
          </button>
        </div>
      </div>

      <AdminNav />

      <div className="panel">
        <div className="profile-grid profile-grid-top">
          <div className="profile-cell">
            <label>{t.search}</label>
            <input value={query} onChange={(event) => setQuery(event.target.value)} />
          </div>
          <div className="profile-cell">
            <label>{t.language}</label>
            <select value={langFilter} onChange={(event) => setLangFilter(event.target.value)}>
              <option value="">{t.all}</option>
              <option value="ru">RU</option>
              <option value="en">EN</option>
            </select>
          </div>
          <div className="profile-cell">
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={orphanOnly}
                onChange={(event) => setOrphanOnly(event.target.checked)}
              />
              {t.onlyOrphan}
            </label>
          </div>
          <div className="profile-actions full">
            <button type="button" onClick={loadWords}>
              {t.refresh}
            </button>
            <div className="muted">
              {t.total}: {total} · {t.shown}: {items.length}
            </div>
          </div>
        </div>
      </div>

      {loading ? <p className="muted">{t.loading}</p> : null}
      {error ? <p className="error">{error}</p> : null}

      {!loading && !error ? (
        <div className="panel">
          <div className="schedule-table-wrap">
            <table className="schedule-table">
              <thead>
                <tr>
                  <th>{t.columns.word}</th>
                  <th>{t.columns.lang}</th>
                  <th>{t.columns.sources}</th>
                  <th>{t.columns.actions}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((item) => (
                  <WordRow key={item.id} item={item} onSave={handleSave} t={t} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function WordRow({ item, onSave, t }) {
  const [value, setValue] = useState(item.lemma);
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setValue(item.lemma);
  }, [item.lemma]);

  const handleSave = async () => {
    const cleaned = value.trim();
    if (!cleaned || cleaned === item.lemma) {
      return;
    }
    setSaving(true);
    setStatus("");
    try {
      await onSave(item.id, cleaned);
      setStatus(t.saved);
    } catch (err) {
      setStatus(err.message || t.error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <tr>
      <td data-label={t.columns.word}>
        <input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className="table-input"
        />
      </td>
      <td data-label={t.columns.lang}>{item.lang}</td>
      <td data-label={t.columns.sources} className="schedule-translation">
        {item.labelSources || "-"}
      </td>
      <td data-label={t.columns.actions}>
        <button
          type="button"
          className="button-secondary"
          onClick={handleSave}
          disabled={saving}
        >
          {t.save}
        </button>
        {status ? <span className="muted">{status}</span> : null}
      </td>
    </tr>
  );
}
