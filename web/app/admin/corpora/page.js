"use client";

import { useEffect, useMemo, useState } from "react";

import { getCookie, setCookie } from "../../lib/client-cookies";
import { useUiLang } from "../../ui-lang-context";
import AdminNav from "../admin-nav";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";
const DEFAULT_LIMIT = 50;

const TEXT = {
  ru: {
    title: "\u0421\u0444\u0435\u0440\u044b \u0438 \u0441\u043b\u043e\u0432\u0430",
    tagline: "\u041f\u0440\u043e\u0441\u043c\u043e\u0442\u0440 \u0438 \u043f\u0440\u0430\u0432\u043a\u0430 \u0441\u043b\u043e\u0432 \u043f\u043e \u0441\u0444\u0435\u0440\u0430\u043c.",
    loading: "\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430...",
    error: "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c \u0434\u0430\u043d\u043d\u044b\u0435.",
    forbidden: "\u041d\u0435\u0442 \u0434\u043e\u0441\u0442\u0443\u043f\u0430.",
    refresh: "\u041e\u0431\u043d\u043e\u0432\u0438\u0442\u044c",
    empty: "\u0421\u043b\u043e\u0432\u0430 \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d\u044b.",
    filters: {
      corpus: "\u0421\u0444\u0435\u0440\u0430",
      source: "\u042f\u0437\u044b\u043a \u0441\u043b\u043e\u0432",
      target: "\u042f\u0437\u044b\u043a \u043f\u0435\u0440\u0435\u0432\u043e\u0434\u0430",
      query: "\u041f\u043e\u0438\u0441\u043a \u043f\u043e \u0441\u043b\u043e\u0432\u0443 \u0438\u043b\u0438 \u043f\u0435\u0440\u0435\u0432\u043e\u0434\u0443",
      search: "\u041d\u0430\u0439\u0442\u0438",
      reset: "\u0421\u0431\u0440\u043e\u0441\u0438\u0442\u044c",
      sort: "\u0421\u043e\u0440\u0442\u0438\u0440\u043e\u0432\u043a\u0430",
      order: "\u041f\u043e\u0440\u044f\u0434\u043e\u043a",
      limit: "\u041d\u0430 \u0441\u0442\u0440\u0430\u043d\u0438\u0446\u0435"
    },
    langRu: "\u0420\u0443\u0441\u0441\u043a\u0438\u0439",
    langEn: "English",
    langAll: "\u0412\u0441\u0435",
    sort: {
      rank: "\u041f\u043e \u0440\u0430\u043d\u0433\u0443",
      count: "\u041f\u043e \u0447\u0430\u0441\u0442\u043e\u0442\u0435",
      lemma: "\u041f\u043e \u0441\u043b\u043e\u0432\u0443"
    },
    order: {
      asc: "\u041f\u043e \u0432\u043e\u0437\u0440\u0430\u0441\u0442\u0430\u043d\u0438\u044e",
      desc: "\u041f\u043e \u0443\u0431\u044b\u0432\u0430\u043d\u0438\u044e"
    },
    word: {
      title: "\u0421\u043b\u043e\u0432\u043e",
      translations: "\u041f\u0435\u0440\u0435\u0432\u043e\u0434\u044b",
      count: "\u0427\u0430\u0441\u0442\u043e\u0442\u0430",
      rank: "\u0420\u0430\u043d\u0433",
      save: "\u0421\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c \u0441\u043b\u043e\u0432\u043e",
      delete: "\u0423\u0434\u0430\u043b\u0438\u0442\u044c \u0441\u043b\u043e\u0432\u043e",
      confirmDelete: "\u0423\u0434\u0430\u043b\u0438\u0442\u044c \u0441\u043b\u043e\u0432\u043e \u0438 \u0432\u0441\u0435 \u0435\u0433\u043e \u043f\u0435\u0440\u0435\u0432\u043e\u0434\u044b?",
      saveTranslation: "\u0421\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c \u0442\u0435\u0440\u043c\u0438\u043d",
      deleteTranslation: "\u0423\u0434\u0430\u043b\u0438\u0442\u044c \u0442\u0435\u0440\u043c\u0438\u043d",
      confirmDeleteTranslation: "\u0423\u0434\u0430\u043b\u0438\u0442\u044c \u044d\u0442\u043e\u0442 \u0442\u0435\u0440\u043c\u0438\u043d?",
      noTranslations: "\u041d\u0435\u0442 \u043f\u0435\u0440\u0435\u0432\u043e\u0434\u043e\u0432",
      addTranslation: "\u0414\u043e\u0431\u0430\u0432\u0438\u0442\u044c \u043f\u0435\u0440\u0435\u0432\u043e\u0434",
      addValue: "\u0414\u043e\u0431\u0430\u0432\u0438\u0442\u044c \u0437\u043d\u0430\u0447\u0435\u043d\u0438\u0435",
      removeValue: "\u0423\u0431\u0440\u0430\u0442\u044c",
      removeDraft: "\u0423\u0431\u0440\u0430\u0442\u044c",
      wordPlaceholder: "\u041d\u043e\u0432\u043e\u0435 \u0437\u043d\u0430\u0447\u0435\u043d\u0438\u0435 \u0441\u043b\u043e\u0432\u0430",
      translationPlaceholder: "\u041d\u043e\u0432\u044b\u0439 \u0442\u0435\u0440\u043c\u0438\u043d",
      setPrimary: "\u0421\u0434\u0435\u043b\u0430\u0442\u044c \u043e\u0441\u043d\u043e\u0432\u043d\u044b\u043c",
      primary: "\u041e\u0441\u043d\u043e\u0432\u043d\u043e\u0435"
    },
    paging: {
      prev: "\u041d\u0430\u0437\u0430\u0434",
      next: "\u0412\u043f\u0435\u0440\u0435\u0434",
      showing: "\u041f\u043e\u043a\u0430\u0437\u0430\u043d\u043e"
    }
  },
  en: {
    title: "Corpora & words",
    tagline: "Browse and edit words by corpus.",
    loading: "Loading...",
    error: "Failed to load data.",
    forbidden: "Access denied.",
    refresh: "Refresh",
    empty: "No words found.",
    filters: {
      corpus: "Corpus",
      source: "Word language",
      target: "Translation language",
      query: "Search by word or translation",
      search: "Search",
      reset: "Reset",
      sort: "Sort",
      order: "Order",
      limit: "Per page"
    },
    langRu: "Russian",
    langEn: "English",
    langAll: "All",
    sort: {
      rank: "By rank",
      count: "By frequency",
      lemma: "By word"
    },
    order: {
      asc: "Ascending",
      desc: "Descending"
    },
    word: {
      title: "Word",
      translations: "Translations",
      count: "Count",
      rank: "Rank",
      save: "Save word",
      delete: "Delete word",
      confirmDelete: "Delete the word and all its translations?",
      saveTranslation: "Save term",
      deleteTranslation: "Delete term",
      confirmDeleteTranslation: "Delete this term?",
      noTranslations: "No translations",
      addTranslation: "Add translation",
      addValue: "Add value",
      removeValue: "Remove",
      removeDraft: "Remove",
      wordPlaceholder: "Word value",
      translationPlaceholder: "New term",
      setPrimary: "Set primary",
      primary: "Primary"
    },
    paging: {
      prev: "Previous",
      next: "Next",
      showing: "Showing"
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

export default function AdminCorporaPage() {
  const { lang } = useUiLang();
  const uiLang = lang === "en" ? "en" : "ru";
  const t = TEXT[uiLang] || TEXT.ru;

  const [corpora, setCorpora] = useState([]);
  const [selectedCorpus, setSelectedCorpus] = useState("");
  const [words, setWords] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingWords, setLoadingWords] = useState(false);
  const [error, setError] = useState("");
  const [queryInput, setQueryInput] = useState("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("rank");
  const [order, setOrder] = useState("asc");
  const [limit, setLimit] = useState(DEFAULT_LIMIT);
  const [page, setPage] = useState(0);
  const [sourceLang, setSourceLang] = useState("ru");
  const [targetLang, setTargetLang] = useState("all");
  const [savingTermId, setSavingTermId] = useState(null);
  const [deletingTermId, setDeletingTermId] = useState(null);
  const [termValueMap, setTermValueMap] = useState({});
  const [draftTermMap, setDraftTermMap] = useState({});

  const loadCorpora = async (token) => {
    const me = await getJson("/auth/me", token);
    if (!me.is_admin) {
      setError(t.forbidden);
      return;
    }
    setCookie("is_admin", me.is_admin ? "1" : "0");
    const params = new URLSearchParams();
    if (sourceLang) {
      params.set("source_lang", sourceLang);
    }
    const data = await getJson(`/admin/content/corpora?${params.toString()}`, token);
    const list = Array.isArray(data) ? data : [];
    setCorpora(list);
    if (list.length) {
      const existing = list.find((item) => String(item.id) === String(selectedCorpus));
      if (!existing) {
        setSelectedCorpus(String(list[0].id));
      }
    } else if (selectedCorpus) {
      setSelectedCorpus("");
    }
  };

  const loadWords = async (token, corpusId, nextPage = page) => {
    if (!corpusId) {
      setWords([]);
      setTotal(0);
      return;
    }
    setLoadingWords(true);
    try {
      const offset = nextPage * limit;
      const params = new URLSearchParams({
        limit: String(limit),
        offset: String(offset),
        sort,
        order,
        source_lang: sourceLang
      });
      if (targetLang && targetLang !== "all") {
        params.set("target_lang", targetLang);
      }
      if (query) {
        params.set("query", query);
      }
      const data = await getJson(`/admin/content/corpora/${corpusId}/words?${params}`, token);
      setWords(Array.isArray(data?.items) ? data.items : []);
      setTotal(Number.isFinite(data?.total) ? data.total : 0);
    } finally {
      setLoadingWords(false);
    }
  };

  useEffect(() => {
    const token = getCookie("token");
    if (!token) {
      window.location.href = "/auth";
      return;
    }
    loadCorpora(token)
      .catch((err) => {
        const message = err.message || t.error;
        if (message.includes("token") || message.includes("User not found")) {
          window.location.href = "/auth";
          return;
        }
        setError(message);
      })
      .finally(() => setLoading(false));
  }, [sourceLang]);

  useEffect(() => {
    const token = getCookie("token");
    if (!token || !selectedCorpus) {
      return;
    }
    setError("");
    loadWords(token, selectedCorpus, page).catch((err) => {
      setError(err.message || t.error);
    });
  }, [selectedCorpus, query, sort, order, limit, page, sourceLang, targetLang]);

  const langLabel = (code) => {
    if (code === "all") {
      return t.langAll;
    }
    return code === "en" ? t.langEn : t.langRu;
  };
  const langBadge = (code) => (code ? String(code).toUpperCase() : "");

  const corpusOptions = useMemo(
    () =>
      corpora.map((item) => (
        <option key={item.id} value={item.id}>
          {item.name} ({sourceLang.toUpperCase()} {"\u2192"}{" "}
          {(targetLang === "all" ? "ALL" : targetLang).toUpperCase()})
        </option>
      )),
    [corpora, sourceLang, targetLang]
  );

  const totalPages = Math.max(Math.ceil(total / limit), 1);

  const handleSearch = () => {
    setPage(0);
    setQuery(queryInput.trim());
  };

  const handleReset = () => {
    setQueryInput("");
    setQuery("");
    setPage(0);
  };

  const refresh = async () => {
    setError("");
    const token = getCookie("token");
    if (!token) {
      window.location.href = "/auth";
      return;
    }
    try {
      await loadWords(token, selectedCorpus, page);
    } catch (err) {
      setError(err.message || t.error);
    }
  };

  const getDraftTerms = (entryId) => draftTermMap[entryId] || [];

  const addDraftTerm = (entryId, lang) => {
    const resolvedLang = lang || (sourceLang === "ru" ? "en" : "ru");
    setDraftTermMap((prev) => {
      const current = prev[entryId] || [];
      const nextItem = {
        id: `${entryId}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        value: "",
        lang: resolvedLang
      };
      return { ...prev, [entryId]: [...current, nextItem] };
    });
  };

  const updateDraftTerm = (entryId, localId, patch) => {
    setDraftTermMap((prev) => {
      const current = prev[entryId] || [];
      const next = current.map((item) => (item.id === localId ? { ...item, ...patch } : item));
      return { ...prev, [entryId]: next };
    });
  };

  const removeDraftTerm = (entryId, localId) => {
    setDraftTermMap((prev) => {
      const current = prev[entryId] || [];
      const next = current.filter((item) => item.id !== localId);
      if (!next.length) {
        const copy = { ...prev };
        delete copy[entryId];
        return copy;
      }
      return { ...prev, [entryId]: next };
    });
  };

  const saveTerm = async (entryId, term) => {
    const token = getCookie("token");
    if (!token) {
      window.location.href = "/auth";
      return;
    }
    const value = (termValueMap[term.id] ?? term.lemma ?? "").trim();
    if (!value) {
      setError(t.error);
      return;
    }
    setSavingTermId(term.id);
    try {
      const data = await patchJson(
        `/admin/content/entries/${entryId}/terms/${term.id}`,
        { lemma: value },
        token
      );
      setTermValueMap((prev) => ({ ...prev, [term.id]: data.lemma }));
      setWords((prev) =>
        prev.map((entry) => {
          if (entry.entry_id !== entryId) {
            return entry;
          }
          const nextTerms = (entry.terms || []).map((item) => {
            if (item.id === term.id) {
              return { ...item, ...data };
            }
            if (data.is_primary && item.lang === data.lang) {
              return { ...item, is_primary: false };
            }
            return item;
          });
          return { ...entry, terms: nextTerms };
        })
      );
    } catch (err) {
      setError(err.message || t.error);
    } finally {
      setSavingTermId(null);
    }
  };

  const setPrimaryTerm = async (entryId, term) => {
    const token = getCookie("token");
    if (!token) {
      window.location.href = "/auth";
      return;
    }
    setSavingTermId(term.id);
    try {
      const data = await patchJson(
        `/admin/content/entries/${entryId}/terms/${term.id}`,
        { is_primary: true },
        token
      );
      setWords((prev) =>
        prev.map((entry) => {
          if (entry.entry_id !== entryId) {
            return entry;
          }
          const nextTerms = (entry.terms || []).map((item) => {
            if (item.lang === data.lang) {
              return { ...item, is_primary: item.id === data.id };
            }
            return item;
          });
          return { ...entry, terms: nextTerms };
        })
      );
    } catch (err) {
      setError(err.message || t.error);
    } finally {
      setSavingTermId(null);
    }
  };

  const deleteTerm = async (entryId, term) => {
    if (!window.confirm(t.word.confirmDeleteTranslation)) {
      return;
    }
    const token = getCookie("token");
    if (!token) {
      window.location.href = "/auth";
      return;
    }
    setDeletingTermId(term.id);
    try {
      await deleteJson(`/admin/content/entries/${entryId}/terms/${term.id}`, token);
      await loadWords(token, selectedCorpus, page);
    } catch (err) {
      setError(err.message || t.error);
    } finally {
      setDeletingTermId(null);
    }
  };

  const saveDraftTerm = async (entryId, draft) => {
    const token = getCookie("token");
    if (!token) {
      window.location.href = "/auth";
      return;
    }
    const value = String(draft.value || "").trim();
    if (!value) {
      setError(t.error);
      return;
    }
    const lang =
      draft.lang || (targetLang !== "all" ? targetLang : sourceLang === "ru" ? "en" : "ru");
    setSavingTermId(draft.id);
    try {
      const data = await postJson(
        `/admin/content/entries/${entryId}/terms`,
        {
          lemma: value,
          lang
        },
        token
      );
      setWords((prev) =>
        prev.map((entry) => {
          if (entry.entry_id !== entryId) {
            return entry;
          }
          const nextTerms = [...(entry.terms || []), data].map((item) => {
            if (data.is_primary && item.lang === data.lang) {
              return { ...item, is_primary: item.id === data.id };
            }
            return item;
          });
          return { ...entry, terms: nextTerms };
        })
      );
      removeDraftTerm(entryId, draft.id);
    } catch (err) {
      setError(err.message || t.error);
    } finally {
      setSavingTermId(null);
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
          <button type="button" className="button-secondary" onClick={refresh}>
            {t.refresh}
          </button>
        </div>
      </div>
      <AdminNav />

      {loading ? <p className="muted">{t.loading}</p> : null}
      {error ? <p className="error">{error}</p> : null}

      {!loading ? (
        <div className="panel">
          <div className="admin-toolbar">
            <div className="admin-field admin-field-corpus">
              <label>{t.filters.corpus}</label>
              <select
                value={selectedCorpus}
                onChange={(event) => {
                  setSelectedCorpus(event.target.value);
                  setPage(0);
                }}
              >
                {corpusOptions}
              </select>
            </div>
            <div className="admin-field">
              <label>{t.filters.source}</label>
              <select
                value={sourceLang}
                onChange={(event) => {
                  const value = event.target.value === "en" ? "en" : "ru";
                  setSourceLang(value);
                  if (targetLang !== "all" && value === targetLang) {
                    setTargetLang("all");
                  }
                  setPage(0);
                }}
              >
                <option value="ru">{langLabel("ru")}</option>
                <option value="en">{langLabel("en")}</option>
              </select>
            </div>
            <div className="admin-field">
              <label>{t.filters.target}</label>
              <select
                value={targetLang}
                onChange={(event) => {
                  const raw = event.target.value;
                  const value = raw === "all" ? "all" : raw === "en" ? "en" : "ru";
                  setTargetLang(value);
                  setPage(0);
                }}
              >
                <option value="all">{langLabel("all")}</option>
                <option value="ru">{langLabel("ru")}</option>
                <option value="en">{langLabel("en")}</option>
              </select>
            </div>
            <div className="admin-field admin-field-wide">
              <label>{t.filters.query}</label>
              <input
                value={queryInput}
                onChange={(event) => setQueryInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    handleSearch();
                  }
                }}
              />
            </div>
            <div className="admin-field">
              <label>{t.filters.sort}</label>
              <select
                value={sort}
                onChange={(event) => {
                  const nextSort = event.target.value;
                  setSort(nextSort);
                  setPage(0);
                  if (nextSort === "count") {
                    setOrder("desc");
                  } else if (nextSort === "rank") {
                    setOrder("asc");
                  }
                }}
              >
                <option value="rank">{t.sort.rank}</option>
                <option value="count">{t.sort.count}</option>
                <option value="lemma">{t.sort.lemma}</option>
              </select>
            </div>
            <div className="admin-field">
              <label>{t.filters.order}</label>
              <select
                value={order}
                onChange={(event) => {
                  setOrder(event.target.value);
                  setPage(0);
                }}
              >
                <option value="asc">{t.order.asc}</option>
                <option value="desc">{t.order.desc}</option>
              </select>
            </div>
            <div className="admin-field">
              <label>{t.filters.limit}</label>
              <select
                value={limit}
                onChange={(event) => {
                  setLimit(Number(event.target.value));
                  setPage(0);
                }}
              >
                {[20, 50, 100, 150].map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
            <div className="admin-actions">
              <button type="button" onClick={handleSearch}>
                {t.filters.search}
              </button>
              <button type="button" className="button-secondary" onClick={handleReset}>
                {t.filters.reset}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {!loading ? (
        <div className="panel">
          {loadingWords ? <p className="muted">{t.loading}</p> : null}
          {!loadingWords && !words.length ? <p className="muted">{t.empty}</p> : null}
          <div className="admin-word-list">
            {words.map((entry) => {
              const terms = entry.terms || [];
              const sourceTerms = terms.filter((item) => item.lang === sourceLang);
              const translationTerms = terms.filter(
                (item) => item.lang !== sourceLang && (targetLang === "all" || item.lang === targetLang)
              );
              const draftTerms = getDraftTerms(entry.entry_id);
              const sourceDrafts = draftTerms.filter((item) => item.lang === sourceLang);
              const translationDrafts = draftTerms.filter(
                (item) => item.lang !== sourceLang && (targetLang === "all" || item.lang === targetLang)
              );
              const hasTranslations = translationTerms.length + translationDrafts.length > 0;

              return (
                <div key={entry.entry_id} className="admin-word-card">
                  <div className="admin-word-header">
                    <div className="admin-word-meta">
                      <span>
                        {t.word.count}: {entry.count}
                      </span>
                      {entry.rank !== null && entry.rank !== undefined ? (
                        <span>
                          {t.word.rank}: {entry.rank}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="admin-word-edit">
                    <div className="admin-word-edit-header">
                      <span>
                        {t.word.title} ({langLabel(sourceLang)})
                      </span>
                      <button
                        type="button"
                        className="button-secondary admin-inline-button"
                        onClick={() => addDraftTerm(entry.entry_id, sourceLang)}
                      >
                        {t.word.addValue}
                      </button>
                    </div>
                    <div className="admin-translation-list">
                      {sourceTerms.map((term) => (
                        <div key={term.id} className="admin-translation-row">
                          <span className="translation-lang">{langBadge(term.lang)}</span>
                          <input
                            value={termValueMap[term.id] ?? term.lemma}
                            placeholder={t.word.wordPlaceholder}
                            onChange={(event) =>
                              setTermValueMap((prev) => ({
                                ...prev,
                                [term.id]: event.target.value
                              }))
                            }
                          />
                          <button
                            type="button"
                            onClick={() => saveTerm(entry.entry_id, term)}
                            disabled={savingTermId === term.id}
                          >
                            {t.word.saveTranslation}
                          </button>
                          <button
                            type="button"
                            className="button-danger"
                            onClick={() => deleteTerm(entry.entry_id, term)}
                            disabled={deletingTermId === term.id}
                          >
                            {t.word.deleteTranslation}
                          </button>
                          {term.is_primary ? (
                            <span className="admin-primary-badge">{t.word.primary}</span>
                          ) : (
                            <button
                              type="button"
                              className="button-secondary admin-inline-button"
                              onClick={() => setPrimaryTerm(entry.entry_id, term)}
                            >
                              {t.word.setPrimary}
                            </button>
                          )}
                        </div>
                      ))}
                      {sourceDrafts.map((draft) => (
                        <div key={draft.id} className="admin-translation-row">
                          <span className="translation-lang">{langBadge(sourceLang)}</span>
                          <input
                            value={draft.value}
                            placeholder={t.word.wordPlaceholder}
                            onChange={(event) =>
                              updateDraftTerm(entry.entry_id, draft.id, { value: event.target.value })
                            }
                          />
                          <button
                            type="button"
                            onClick={() => saveDraftTerm(entry.entry_id, draft)}
                            disabled={savingTermId === draft.id}
                          >
                            {t.word.saveTranslation}
                          </button>
                          <button
                            type="button"
                            className="button-secondary"
                            onClick={() => removeDraftTerm(entry.entry_id, draft.id)}
                          >
                            {t.word.removeDraft}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="admin-word-edit">
                    <div className="admin-word-edit-header">
                      <span>
                        {t.word.translations} ({targetLang === "all" ? t.langAll : langLabel(targetLang)})
                      </span>
                      <button
                        type="button"
                        className="button-secondary admin-inline-button"
                        onClick={() =>
                          addDraftTerm(
                            entry.entry_id,
                            targetLang === "all" ? null : targetLang
                          )
                        }
                      >
                        {t.word.addTranslation}
                      </button>
                    </div>
                    {hasTranslations ? (
                      <div className="admin-translation-list">
                        {translationTerms.map((term) => (
                          <div key={term.id} className="admin-translation-row">
                            <span className="translation-lang">{langBadge(term.lang)}</span>
                            <input
                              value={termValueMap[term.id] ?? term.lemma}
                              placeholder={t.word.translationPlaceholder}
                              onChange={(event) =>
                                setTermValueMap((prev) => ({
                                  ...prev,
                                  [term.id]: event.target.value
                                }))
                              }
                            />
                            <button
                              type="button"
                              onClick={() => saveTerm(entry.entry_id, term)}
                              disabled={savingTermId === term.id}
                            >
                              {t.word.saveTranslation}
                            </button>
                            <button
                              type="button"
                              className="button-danger"
                              onClick={() => deleteTerm(entry.entry_id, term)}
                              disabled={deletingTermId === term.id}
                            >
                              {t.word.deleteTranslation}
                            </button>
                            {term.is_primary ? (
                              <span className="admin-primary-badge">{t.word.primary}</span>
                            ) : (
                              <button
                                type="button"
                                className="button-secondary admin-inline-button"
                                onClick={() => setPrimaryTerm(entry.entry_id, term)}
                              >
                                {t.word.setPrimary}
                              </button>
                            )}
                          </div>
                        ))}
                        {translationDrafts.map((draft) => (
                          <div key={draft.id} className="admin-translation-row">
                            {targetLang === "all" ? (
                              <select
                                className="translation-lang-select"
                                value={draft.lang}
                                onChange={(event) =>
                                  updateDraftTerm(entry.entry_id, draft.id, {
                                    lang: event.target.value
                                  })
                                }
                              >
                                <option value="ru">{langBadge("ru")}</option>
                                <option value="en">{langBadge("en")}</option>
                              </select>
                            ) : (
                              <span className="translation-lang">{langBadge(draft.lang)}</span>
                            )}
                            <input
                              value={draft.value}
                              placeholder={t.word.translationPlaceholder}
                              onChange={(event) =>
                                updateDraftTerm(entry.entry_id, draft.id, { value: event.target.value })
                              }
                            />
                            <button
                              type="button"
                              onClick={() => saveDraftTerm(entry.entry_id, draft)}
                              disabled={savingTermId === draft.id}
                            >
                              {t.word.saveTranslation}
                            </button>
                            <button
                              type="button"
                              className="button-secondary"
                              onClick={() => removeDraftTerm(entry.entry_id, draft.id)}
                            >
                              {t.word.removeDraft}
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="muted">{t.word.noTranslations}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {total > 0 ? (
            <div className="admin-pagination">
              <span>
                {t.paging.showing} {words.length} / {total}
              </span>
              <div className="admin-pagination-actions">
                <button
                  type="button"
                  className="button-secondary"
                  onClick={() => setPage((prev) => Math.max(prev - 1, 0))}
                  disabled={page === 0}
                >
                  {t.paging.prev}
                </button>
                <button
                  type="button"
                  className="button-secondary"
                  onClick={() => setPage((prev) => Math.min(prev + 1, totalPages - 1))}
                  disabled={page >= totalPages - 1}
                >
                  {t.paging.next}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </main>
  );
}
