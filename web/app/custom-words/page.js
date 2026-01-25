"use client";

import { useEffect, useState } from "react";

import { getCookie } from "../lib/client-cookies";
import { useUiLang } from "../ui-lang-context";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";
const MAX_CUSTOM_WORDS_PAGE = 200;

const TEXT = {
  ru: {
    title: "Мои слова",
    tagline: "Личный список слов, которые ты хочешь выучить.",
    hint: "Эти слова попадут в обучение и повторение. Если слово и перевод перепутаны, мы автоматически поменяем их местами.",
    loading: "Загрузка...",
    error: "Не удалось загрузить список",
    saveError: "Не удалось добавить слово",
    saved: "Слово добавлено",
    add: "Добавить",
    adding: "Добавление...",
    wordLabel: "Слово (родной язык)",
    translationLabel: "Перевод (изучаемый язык)",
    wordPlaceholder: "например: dog",
    translationPlaceholder: "например: собака",
    listTitle: "Добавленные слова",
    empty: "Пока нет своих слов.",
    listShown: "Показано {shown} из {total}",
    perPage: "На странице",
    loadMore: "Показать ещё",
    loadAll: "Показать все",
    loadingMore: "Загрузка...",
    direction: "Направление",
    home: "На главную",
    edit: "Редактировать",
    delete: "Удалить",
    cancel: "Отмена",
    save: "Сохранить",
    saving: "Сохранение...",
    deleteConfirm: "Удалить это слово?",
    know: "Знаю",
    knowing: "Отмечаем...",
    listHint: "Можно редактировать перевод и удалять слова.",
    importTitle: "Импорт слов для изучения",
    importHint: "Формат: слово - перевод, одна пара на строку. Эти слова попадут в обучение.",
    importExampleTitle: "Пример",
    importExample: "dog - собака\nclock - часы\nwarm - тепло\nокно - window\nмышь - mouse",
    importAction: "Импортировать",
    importing: "Импорт...",
    importResult: "Результат импорта",
    stats: {
      totalLines: "Всего строк",
      parsedLines: "Распознано",
      invalidLines: "Ошибка формата",
      inserted: "Добавлено",
      updated: "Обновлено",
      skipped: "Без изменений"
    },
    langRu: "Русский",
    langEn: "English"
  },
  en: {
    title: "My words",
    tagline: "A personal list of words you want to learn.",
    hint: "These words appear in learning and review. If word and translation are swapped, we will auto-fix them.",
    loading: "Loading...",
    error: "Failed to load list",
    saveError: "Failed to add word",
    saved: "Word added",
    add: "Add",
    adding: "Adding...",
    wordLabel: "Word (native language)",
    translationLabel: "Translation (learning language)",
    wordPlaceholder: "e.g. dog",
    translationPlaceholder: "e.g. собака",
    listTitle: "Added words",
    empty: "No custom words yet.",
    listShown: "Showing {shown} of {total}",
    perPage: "Per page",
    loadMore: "Load more",
    loadAll: "Load all",
    loadingMore: "Loading...",
    direction: "Direction",
    home: "Home",
    edit: "Edit",
    delete: "Delete",
    cancel: "Cancel",
    save: "Save",
    saving: "Saving...",
    deleteConfirm: "Delete this word?",
    know: "Know",
    knowing: "Marking...",
    listHint: "You can edit word and translation.",
    importTitle: "Import words to learn",
    importHint: "Format: word - translation, one per line. These words will be learned.",
    importExampleTitle: "Example",
    importExample: "dog - собака\nclock - часы\nwarm - тепло\nокно - window\nмышь - mouse",
    importAction: "Import",
    importing: "Importing...",
    importResult: "Import result",
    stats: {
      totalLines: "Total lines",
      parsedLines: "Parsed",
      invalidLines: "Invalid",
      inserted: "Inserted",
      updated: "Updated",
      skipped: "Unchanged"
    },
    langRu: "Russian",
    langEn: "English"
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

async function putJson(path, payload, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const response = await fetch(`${API_BASE}${path}`, {
    method: "PUT",
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

async function deleteJson(path, token) {
  const headers = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const response = await fetch(`${API_BASE}${path}`, {
    method: "DELETE",
    headers
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

export default function CustomWordsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editSaving, setEditSaving] = useState(false);
  const [error, setError] = useState("");
  const [loadMoreError, setLoadMoreError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [editError, setEditError] = useState("");
  const [status, setStatus] = useState("");
  const [items, setItems] = useState([]);
  const [totalCount, setTotalCount] = useState(null);
  const [pageSize, setPageSize] = useState(100);
  const [loadingMore, setLoadingMore] = useState(false);
  const [markingId, setMarkingId] = useState(null);
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({ word: "", translation: "" });
  const [editForm, setEditForm] = useState({ word: "", translation: "" });
  const [importText, setImportText] = useState("");
  const [importResult, setImportResult] = useState(null);
  const [importError, setImportError] = useState("");
  const [importing, setImporting] = useState(false);
  const { lang, setLang } = useUiLang();
  const uiLang = lang || "ru";
  const t = TEXT[uiLang] || TEXT.ru;
  const locale = uiLang === "en" ? "en-US" : "ru-RU";

  const loadData = async () => {
    setLoading(true);
    setError("");
    setLoadMoreError("");
    const token = getCookie("token");
    if (!token) {
      window.location.href = "/auth";
      return;
    }
    try {
      const effectivePageSize = Math.min(pageSize, MAX_CUSTOM_WORDS_PAGE);
      const [me, words, count] = await Promise.all([
        getJson("/auth/me", token),
        getJson(`/custom-words?limit=${effectivePageSize}&offset=0`, token),
        getJson("/custom-words/count", token)
      ]);
      if (me?.interface_lang) {
        setLang(me.interface_lang === "en" ? "en" : "ru");
      }
      setProfile(me);
      setItems(Array.isArray(words) ? words : []);
      setTotalCount(typeof count?.total === "number" ? count.total : null);
    } catch (err) {
      const message = err.message || t.error;
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

  useEffect(() => {
    loadData();
  }, [pageSize]);

  useEffect(() => {
    setSaveError("");
    setStatus("");
  }, [form.word, form.translation]);

  useEffect(() => {
    setEditError("");
  }, [editForm.word, editForm.translation, editingId]);

  useEffect(() => {
    setImportError("");
  }, [importText]);

  const addWord = async (event) => {
    event.preventDefault();
    setSaveError("");
    setStatus("");
    const token = getCookie("token");
    if (!token) {
      window.location.href = "/auth";
      return;
    }
    const payload = {
      word: form.word.trim(),
      translation: form.translation.trim()
    };
    if (!payload.word || !payload.translation) {
      setSaveError(t.saveError);
      return;
    }
    setSaving(true);
    try {
      await postJson("/custom-words", payload, token);
      setForm({ word: "", translation: "" });
      setStatus(t.saved);
      await loadData();
    } catch (err) {
      setSaveError(err.message || t.saveError);
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (item) => {
    setEditingId(item.word_id);
    setEditForm({ word: item.word, translation: item.translation });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ word: "", translation: "" });
  };

  const saveEdit = async () => {
    setEditError("");
    const token = getCookie("token");
    if (!token) {
      window.location.href = "/auth";
      return;
    }
    const payload = {
      word: editForm.word.trim(),
      translation: editForm.translation.trim()
    };
    if (!payload.word || !payload.translation) {
      setEditError(t.saveError);
      return;
    }
    setEditSaving(true);
    try {
      await putJson(`/custom-words/${editingId}`, payload, token);
      await loadData();
      cancelEdit();
    } catch (err) {
      setEditError(err.message || t.saveError);
    } finally {
      setEditSaving(false);
    }
  };

  const removeWord = async (wordId) => {
    setSaveError("");
    setStatus("");
    const token = getCookie("token");
    if (!token) {
      window.location.href = "/auth";
      return;
    }
    if (!window.confirm(t.deleteConfirm)) {
      return;
    }
    try {
      await deleteJson(`/custom-words/${wordId}`, token);
      if (editingId === wordId) {
        cancelEdit();
      }
      await loadData();
    } catch (err) {
      setSaveError(err.message || t.saveError);
    }
  };

  const markKnown = async (wordId) => {
    setSaveError("");
    setStatus("");
    const token = getCookie("token");
    if (!token) {
      window.location.href = "/auth";
      return;
    }
    setMarkingId(wordId);
    try {
      await postJson(`/custom-words/${wordId}/known`, {}, token);
      setItems((prev) => prev.filter((item) => item.word_id !== wordId));
      setTotalCount((prev) => (typeof prev === "number" ? Math.max(0, prev - 1) : prev));
      if (editingId === wordId) {
        cancelEdit();
      }
    } catch (err) {
      setSaveError(err.message || t.saveError);
    } finally {
      setMarkingId(null);
    }
  };

  const importList = async () => {
    setImportError("");
    setImportResult(null);
    const token = getCookie("token");
    if (!token) {
      window.location.href = "/auth";
      return;
    }
    if (!importText.trim()) {
      return;
    }
    setImporting(true);
    try {
      const data = await postJson("/custom-words/import", { text: importText }, token);
      setImportResult(data);
      await loadData();
    } catch (err) {
      setImportError(err.message || t.saveError);
    } finally {
      setImporting(false);
    }
  };

  const loadMore = async (loadAll = false) => {
    if (loadingMore) {
      return;
    }
    setLoadMoreError("");
    const token = getCookie("token");
    if (!token) {
      window.location.href = "/auth";
      return;
    }
    if (totalCount === null) {
      return;
    }
    const remaining = totalCount - items.length;
    if (remaining <= 0) {
      return;
    }
    setLoadingMore(true);
    try {
      if (!loadAll) {
        const limit = Math.min(pageSize, remaining, MAX_CUSTOM_WORDS_PAGE);
        const data = await getJson(`/custom-words?limit=${limit}&offset=${items.length}`, token);
        if (Array.isArray(data) && data.length) {
          setItems((prev) => [...prev, ...data]);
        }
        return;
      }

      const collected = [];
      const startOffset = items.length;
      let loaded = 0;
      while (loaded < remaining) {
        const limit = Math.min(MAX_CUSTOM_WORDS_PAGE, remaining - loaded);
        const data = await getJson(
          `/custom-words?limit=${limit}&offset=${startOffset + loaded}`,
          token
        );
        if (!Array.isArray(data) || data.length === 0) {
          break;
        }
        collected.push(...data);
        loaded += data.length;
        if (data.length < limit) {
          break;
        }
      }
      if (collected.length) {
        setItems((prev) => [...prev, ...collected]);
      }
    } catch (err) {
      setLoadMoreError(err.message || t.error);
    } finally {
      setLoadingMore(false);
    }
  };

  const goHome = () => {
    window.location.href = "/";
  };

  const langLabel = (value) => {
    if (value === "en") {
      return t.langEn;
    }
    if (value === "ru") {
      return t.langRu;
    }
    return value || "-";
  };

  const direction = profile
    ? `${langLabel(profile.native_lang)} \u2192 ${langLabel(profile.target_lang)}`
    : "-";
  const listTitle = totalCount !== null ? `${t.listTitle} (${totalCount})` : t.listTitle;
  const hasMore = totalCount !== null && items.length < totalCount;
  const shownText =
    totalCount !== null
      ? t.listShown.replace("{shown}", String(items.length)).replace("{total}", String(totalCount))
      : "";

  const importStats = importResult
    ? [
        { label: t.stats.totalLines, value: importResult.total_lines },
        { label: t.stats.parsedLines, value: importResult.parsed_lines },
        { label: t.stats.invalidLines, value: importResult.invalid_lines },
        { label: t.stats.inserted, value: importResult.inserted },
        { label: t.stats.updated, value: importResult.updated },
        { label: t.stats.skipped, value: importResult.skipped }
      ]
    : [];

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
        </div>
      </div>

      {loading ? <p className="muted">{t.loading}</p> : null}
      {error ? <p className="error">{error}</p> : null}

      {!loading && !error ? (
        <>
          <div className="section-grid">
            <div className="panel">
              <div className="panel-title">{t.title}</div>
              <p className="muted">{t.hint}</p>
              <div className="custom-inline muted">
                <span>{t.direction}:</span>
                <strong>{direction}</strong>
              </div>
              <form className="custom-form" onSubmit={addWord}>
                <div className="custom-form-row">
                  <div>
                    <label>{t.wordLabel}</label>
                    <input
                      type="text"
                      value={form.word}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, word: event.target.value }))
                      }
                      placeholder={t.wordPlaceholder}
                    />
                  </div>
                  <div>
                    <label>{t.translationLabel}</label>
                    <input
                      type="text"
                      value={form.translation}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, translation: event.target.value }))
                      }
                      placeholder={t.translationPlaceholder}
                    />
                  </div>
                </div>
                <div className="actions">
                  <button type="submit" disabled={saving}>
                    {saving ? t.adding : t.add}
                  </button>
                  {status ? <span className="success">{status}</span> : null}
                  {saveError ? <span className="error">{saveError}</span> : null}
                </div>
              </form>
            </div>

            <div className="panel">
              <div className="panel-title">{t.importTitle}</div>
              <p className="muted">{t.importHint}</p>
              <div className="import-sample">
                <div className="import-sample-title">{t.importExampleTitle}</div>
                <pre>{t.importExample}</pre>
              </div>
              <textarea
                value={importText}
                onChange={(event) => setImportText(event.target.value)}
                placeholder={t.importExample}
              />
              <div className="actions">
                <button
                  type="button"
                  onClick={importList}
                  disabled={importing || !importText.trim()}
                >
                  {importing ? t.importing : t.importAction}
                </button>
                {importError ? <span className="error">{importError}</span> : null}
              </div>
              {importStats.length ? (
                <>
                  <div className="panel-title">{t.importResult}</div>
                  <div className="import-grid">
                    {importStats.map((item) => (
                      <div key={item.label} className="import-card">
                        <div className="import-title">{item.label}</div>
                        <div className="import-value">{item.value}</div>
                      </div>
                    ))}
                  </div>
                </>
              ) : null}
            </div>
          </div>

          <div className="panel">
            <div className="custom-list-header">
              <div>
                <div className="panel-title">{listTitle}</div>
                {shownText ? <div className="custom-list-meta muted">{shownText}</div> : null}
              </div>
              <div className="custom-list-controls">
                <label className="custom-list-select">
                  <span className="muted">{t.perPage}</span>
                  <select
                    value={pageSize}
                    onChange={(event) => setPageSize(Number(event.target.value))}
                  >
                    {[50, 100, 200].map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
            <p className="muted">{t.listHint}</p>
            {items.length === 0 ? <p className="muted">{t.empty}</p> : null}
            {items.length ? (
              <div className="custom-list">
                {items.map((item) => (
                  <div
                    key={item.word_id}
                    className={`custom-card${editingId === item.word_id ? " is-editing" : ""}`}
                  >
                    {editingId === item.word_id ? (
                      <div className="custom-edit">
                        <div className="custom-form-row">
                          <div>
                            <label>{t.wordLabel}</label>
                            <input
                              type="text"
                              value={editForm.word}
                              onChange={(event) =>
                                setEditForm((prev) => ({
                                  ...prev,
                                  word: event.target.value
                                }))
                              }
                              placeholder={t.wordPlaceholder}
                            />
                          </div>
                          <div>
                            <label>{t.translationLabel}</label>
                            <input
                              type="text"
                              value={editForm.translation}
                              onChange={(event) =>
                                setEditForm((prev) => ({
                                  ...prev,
                                  translation: event.target.value
                                }))
                              }
                              placeholder={t.translationPlaceholder}
                            />
                          </div>
                        </div>
                        <div className="custom-actions">
                          <button type="button" onClick={saveEdit} disabled={editSaving}>
                            {editSaving ? t.saving : t.save}
                          </button>
                          <button type="button" className="button-secondary" onClick={cancelEdit}>
                            {t.cancel}
                          </button>
                          {editError ? <span className="error">{editError}</span> : null}
                        </div>
                      </div>
                    ) : (
                      <div className="custom-row">
                        <div className="custom-text">
                          <div className="custom-word">{item.word}</div>
                          <div className="custom-translation">{item.translation}</div>
                          <div className="custom-meta">
                            {formatDate(item.created_at, locale)}
                          </div>
                        </div>
                        <div className="custom-actions">
                          <button type="button" className="button-secondary" onClick={() => startEdit(item)}>
                            {t.edit}
                          </button>
                          <button
                            type="button"
                            className="button-secondary"
                            onClick={() => markKnown(item.word_id)}
                            disabled={markingId === item.word_id}
                          >
                            {markingId === item.word_id ? t.knowing : t.know}
                          </button>
                          <button type="button" className="button-secondary" onClick={() => removeWord(item.word_id)}>
                            {t.delete}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : null}
            {hasMore ? (
              <div className="custom-list-footer">
                <button type="button" onClick={() => loadMore(false)} disabled={loadingMore}>
                  {loadingMore ? t.loadingMore : t.loadMore}
                </button>
                <button
                  type="button"
                  className="button-secondary"
                  onClick={() => loadMore(true)}
                  disabled={loadingMore}
                >
                  {t.loadAll}
                </button>
                {loadMoreError ? <span className="error">{loadMoreError}</span> : null}
              </div>
            ) : null}
          </div>
        </>
      ) : null}
    </main>
  );
}
