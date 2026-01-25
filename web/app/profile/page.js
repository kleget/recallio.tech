"use client";

import { useEffect, useState } from "react";

import { deleteCookie, getCookie } from "../lib/client-cookies";
import { useUiLang } from "../ui-lang-context";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

const resolveAvatarUrl = (value) => {
  if (!value) {
    return "";
  }
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }
  return `${API_BASE}${value}`;
};

const TEXT = {
  ru: {
    title: "ÃÅ¸Ã‘â‚¬ÃÂ¾Ã‘â€žÃÂ¸ÃÂ»Ã‘Å’",
    tagline: "ÃÂ¢ÃÂ²ÃÂ¾ÃÂ¸ ÃÂ´ÃÂ°ÃÂ½ÃÂ½Ã‘â€¹ÃÂµ ÃÂ¸ ÃÂ½ÃÂ°Ã‘ÂÃ‘â€šÃ‘â‚¬ÃÂ¾ÃÂ¹ÃÂºÃÂ¸ ÃÂ°ÃÂºÃÂºÃÂ°Ã‘Æ’ÃÂ½Ã‘â€šÃÂ°.",
    loading: "Ãâ€”ÃÂ°ÃÂ³Ã‘â‚¬Ã‘Æ’ÃÂ·ÃÂºÃÂ°...",
    error: "ÃÂÃÂµ Ã‘Æ’ÃÂ´ÃÂ°ÃÂ»ÃÂ¾Ã‘ÂÃ‘Å’ ÃÂ·ÃÂ°ÃÂ³Ã‘â‚¬Ã‘Æ’ÃÂ·ÃÂ¸Ã‘â€šÃ‘Å’ ÃÂ¿Ã‘â‚¬ÃÂ¾Ã‘â€žÃÂ¸ÃÂ»Ã‘Å’",
    email: "Email",
    interfaceSection: "ÃËœÃÂ½Ã‘â€šÃÂµÃ‘â‚¬Ã‘â€žÃÂµÃÂ¹Ã‘Â",
    interfaceLang: "ÃÂ¯ÃÂ·Ã‘â€¹ÃÂº ÃÂ¸ÃÂ½Ã‘â€šÃÂµÃ‘â‚¬Ã‘â€žÃÂµÃÂ¹Ã‘ÂÃÂ°",
    theme: "ÃÂ¢ÃÂµÃÂ¼ÃÂ°",
    themeHint: "ÃÅ¸ÃÂµÃ‘â‚¬ÃÂµÃÂºÃÂ»Ã‘Å½Ã‘â€¡ÃÂ°ÃÂµÃ‘â€šÃ‘ÂÃ‘Â ÃÂ² ÃÂ²ÃÂµÃ‘â‚¬Ã‘â€¦ÃÂ½ÃÂµÃÂ¹ ÃÂ¿ÃÂ°ÃÂ½ÃÂµÃÂ»ÃÂ¸.",
    nativeLang: "ÃÅ“ÃÂ¾ÃÂ¹ Ã‘ÂÃÂ·Ã‘â€¹ÃÂº",
    targetLang: "ÃËœÃÂ·Ã‘Æ’Ã‘â€¡ÃÂ°ÃÂµÃÂ¼Ã‘â€¹ÃÂ¹ Ã‘ÂÃÂ·Ã‘â€¹ÃÂº",
    onboarding: "ÃÂÃÂ°Ã‘ÂÃ‘â€šÃ‘â‚¬ÃÂ¾ÃÂ¹ÃÂºÃÂ° ÃÂ¾ÃÂ±Ã‘Æ’Ã‘â€¡ÃÂµÃÂ½ÃÂ¸Ã‘Â",
    onboardingReady: "Ãâ€œÃÂ¾Ã‘â€šÃÂ¾ÃÂ²ÃÂ¾",
    onboardingPending: "ÃÂÃÂµ ÃÂ·ÃÂ°ÃÂ²ÃÂµÃ‘â‚¬Ã‘Ë†ÃÂµÃÂ½ÃÂ¾",
    save: "ÃÂ¡ÃÂ¾Ã‘â€¦Ã‘â‚¬ÃÂ°ÃÂ½ÃÂ¸Ã‘â€šÃ‘Å’",
    saving: "ÃÂ¡ÃÂ¾Ã‘â€¦Ã‘â‚¬ÃÂ°ÃÂ½ÃÂµÃÂ½ÃÂ¸ÃÂµ...",
    saved: "ÃÂ¡ÃÂ¾Ã‘â€¦Ã‘â‚¬ÃÂ°ÃÂ½ÃÂµÃÂ½ÃÂ¾",
    saveError: "ÃÂÃÂµ Ã‘Æ’ÃÂ´ÃÂ°ÃÂ»ÃÂ¾Ã‘ÂÃ‘Å’ Ã‘ÂÃÂ¾Ã‘â€¦Ã‘â‚¬ÃÂ°ÃÂ½ÃÂ¸Ã‘â€šÃ‘Å’ ÃÂ½ÃÂ°Ã‘ÂÃ‘â€šÃ‘â‚¬ÃÂ¾ÃÂ¹ÃÂºÃÂ¸",
    sections: {
      learning: "ÃÅ¾ÃÂ±Ã‘Æ’Ã‘â€¡ÃÂµÃÂ½ÃÂ¸ÃÂµ",
      tech: "ÃÂ¢ÃÂµÃ‘â€¦-ÃÂ½ÃÂ°Ã‘ÂÃ‘â€šÃ‘â‚¬ÃÂ¾ÃÂ¹ÃÂºÃÂ¸",
      help: "ÃÅ¸ÃÂ¾ÃÂ¼ÃÂ¾Ã‘â€°Ã‘Å’"
    },
    wordsSection: "ÃÂ¡ÃÂ»ÃÂ¾ÃÂ²ÃÂ°",
    wordsLearnTitle: "ÃÅ“ÃÂ¾ÃÂ¸ Ã‘ÂÃÂ»ÃÂ¾ÃÂ²ÃÂ° ÃÂ´ÃÂ»Ã‘Â ÃÂ¸ÃÂ·Ã‘Æ’Ã‘â€¡ÃÂµÃÂ½ÃÂ¸Ã‘Â",
    wordsLearnDesc:
      "Ãâ€ÃÂ¾ÃÂ±ÃÂ°ÃÂ²ÃÂ»Ã‘ÂÃÂ¹ Ã‘ÂÃÂ»ÃÂ¾ÃÂ²ÃÂ°, ÃÂºÃÂ¾Ã‘â€šÃÂ¾Ã‘â‚¬Ã‘â€¹ÃÂµ Ã‘â€¦ÃÂ¾Ã‘â€¡ÃÂµÃ‘Ë†Ã‘Å’ ÃÂ²Ã‘â€¹Ã‘Æ’Ã‘â€¡ÃÂ¸Ã‘â€šÃ‘Å’. ÃÅ¾ÃÂ½ÃÂ¸ ÃÂ¿ÃÂ¾ÃÂ¿ÃÂ°ÃÂ´ÃÂ°Ã‘Å½Ã‘â€š ÃÂ² ÃÂ¾ÃÂ±Ã‘Æ’Ã‘â€¡ÃÂµÃÂ½ÃÂ¸ÃÂµ ÃÂ¸ ÃÂ¿ÃÂ¾ÃÂ²Ã‘â€šÃÂ¾Ã‘â‚¬ÃÂµÃÂ½ÃÂ¸ÃÂµ.",
    wordsLearnAction: "ÃÅ¾Ã‘â€šÃÂºÃ‘â‚¬Ã‘â€¹Ã‘â€šÃ‘Å’ ÃÂ¼ÃÂ¾ÃÂ¸ Ã‘ÂÃÂ»ÃÂ¾ÃÂ²ÃÂ°",
    learningHint: "Ãâ€™Ã‘â€¹ÃÂ±ÃÂ¾Ã‘â‚¬ Ã‘ÂÃ‘â€žÃÂµÃ‘â‚¬, Ã‘ÂÃÂ·Ã‘â€¹ÃÂºÃÂ¾ÃÂ² ÃÂ¸ ÃÂ»ÃÂ¸ÃÂ¼ÃÂ¸Ã‘â€šÃÂ¾ÃÂ² ÃÂ´ÃÂ¾Ã‘ÂÃ‘â€šÃ‘Æ’ÃÂ¿ÃÂµÃÂ½ ÃÂ² ÃÂ½ÃÂ°Ã‘ÂÃ‘â€šÃ‘â‚¬ÃÂ¾ÃÂ¹ÃÂºÃÂµ ÃÂ¾ÃÂ±Ã‘Æ’Ã‘â€¡ÃÂµÃÂ½ÃÂ¸Ã‘Â.",
    techHint: "ÃÂ£ÃÂ²ÃÂµÃÂ´ÃÂ¾ÃÂ¼ÃÂ»ÃÂµÃÂ½ÃÂ¸Ã‘Â, ÃÂ¾Ã‘â€¡ÃÂµÃ‘â‚¬ÃÂµÃÂ´Ã‘Å’ ÃÂ¸ Ã‘â€žÃÂ¾ÃÂ½ÃÂ¾ÃÂ²Ã‘â€¹ÃÂµ ÃÂ·ÃÂ°ÃÂ´ÃÂ°Ã‘â€¡ÃÂ¸.",
    helpHint: "Ãâ€ÃÂ¾ÃÂ±Ã‘â‚¬ÃÂ¾ ÃÂ¿ÃÂ¾ÃÂ¶ÃÂ°ÃÂ»ÃÂ¾ÃÂ²ÃÂ°Ã‘â€šÃ‘Å’ ÃÂ¸ ÃÂ±Ã‘â€¹Ã‘ÂÃ‘â€šÃ‘â‚¬Ã‘â€¹ÃÂ¹ Ã‘â€šÃ‘Æ’Ã‘â‚¬ ÃÂ¿ÃÂ¾ Recallio.",
    support: {
      title: "ÃÅ¸ÃÂ¾ÃÂ´ÃÂ´ÃÂµÃ‘â‚¬ÃÂ¶ÃÂºÃÂ°",
      hint: "Ãâ€¢Ã‘ÂÃÂ»ÃÂ¸ ÃÂ½Ã‘Æ’ÃÂ¶ÃÂ½ÃÂ° ÃÂ¿ÃÂ¾ÃÂ¼ÃÂ¾Ã‘â€°Ã‘Å’ ÃÂ¸ÃÂ»ÃÂ¸ ÃÂµÃ‘ÂÃ‘â€šÃ‘Å’ ÃÂ²ÃÂ¾ÃÂ¿Ã‘â‚¬ÃÂ¾Ã‘Â, ÃÂ½ÃÂ°ÃÂ¿ÃÂ¸Ã‘Ë†ÃÂ¸ ÃÂ² ÃÂ¿ÃÂ¾ÃÂ´ÃÂ´ÃÂµÃ‘â‚¬ÃÂ¶ÃÂºÃ‘Æ’.",
      action: "ÃÂÃÂ°ÃÂ¿ÃÂ¸Ã‘ÂÃÂ°Ã‘â€šÃ‘Å’ ÃÂ² ÃÂ¿ÃÂ¾ÃÂ´ÃÂ´ÃÂµÃ‘â‚¬ÃÂ¶ÃÂºÃ‘Æ’"
    },
    actions: {
      logout: "Ãâ€™Ã‘â€¹ÃÂ¹Ã‘â€šÃÂ¸",
      onboarding: "ÃÅ¾Ã‘â€šÃÂºÃ‘â‚¬Ã‘â€¹Ã‘â€šÃ‘Å’ ÃÂ½ÃÂ°Ã‘ÂÃ‘â€šÃ‘â‚¬ÃÂ¾ÃÂ¹ÃÂºÃ‘Æ’ ÃÂ¾ÃÂ±Ã‘Æ’Ã‘â€¡ÃÂµÃÂ½ÃÂ¸Ã‘Â",
      tech: "ÃÅ¾Ã‘â€šÃÂºÃ‘â‚¬Ã‘â€¹Ã‘â€šÃ‘Å’ Ã‘â€šÃÂµÃ‘â€¦-ÃÂ½ÃÂ°Ã‘ÂÃ‘â€šÃ‘â‚¬ÃÂ¾ÃÂ¹ÃÂºÃÂ¸",
      help: "ÃÅ¾Ã‘â€šÃÂºÃ‘â‚¬Ã‘â€¹Ã‘â€šÃ‘Å’ ÃÂ¸ÃÂ½Ã‘ÂÃ‘â€šÃ‘â‚¬Ã‘Æ’ÃÂºÃ‘â€ ÃÂ¸Ã‘Å½"
    },
    danger: {
      title: "ÃÂ£ÃÂ´ÃÂ°ÃÂ»ÃÂµÃÂ½ÃÂ¸ÃÂµ ÃÂ°ÃÂºÃÂºÃÂ°Ã‘Æ’ÃÂ½Ã‘â€šÃÂ°",
      subtitle: "ÃÅ¸ÃÂ¾ÃÂ´Ã‘â€šÃÂ²ÃÂµÃ‘â‚¬ÃÂ´ÃÂ¸Ã‘â€šÃÂµ Ã‘Æ’ÃÂ´ÃÂ°ÃÂ»ÃÂµÃÂ½ÃÂ¸ÃÂµ ÃÂ°ÃÂºÃÂºÃÂ°Ã‘Æ’ÃÂ½Ã‘â€šÃÂ°.",
      warning:
        "ÃÂ­Ã‘â€šÃÂ¾ ÃÂ´ÃÂµÃÂ¹Ã‘ÂÃ‘â€šÃÂ²ÃÂ¸ÃÂµ ÃÂ½ÃÂµÃÂ¾ÃÂ±Ã‘â‚¬ÃÂ°Ã‘â€šÃÂ¸ÃÂ¼ÃÂ¾: ÃÂ±Ã‘Æ’ÃÂ´Ã‘Æ’Ã‘â€š Ã‘Æ’ÃÂ´ÃÂ°ÃÂ»ÃÂµÃÂ½Ã‘â€¹ ÃÂ½ÃÂ°Ã‘ÂÃ‘â€šÃ‘â‚¬ÃÂ¾ÃÂ¹ÃÂºÃÂ¸, ÃÂ¿Ã‘â‚¬ÃÂ¾ÃÂ³Ã‘â‚¬ÃÂµÃ‘ÂÃ‘Â, Ã‘ÂÃÂ»ÃÂ¾ÃÂ²ÃÂ° ÃÂ¸ ÃÂ¸Ã‘ÂÃ‘â€šÃÂ¾Ã‘â‚¬ÃÂ¸Ã‘Â.",
      confirm: "Ãâ€ÃÂ°, ÃÂ´ÃÂµÃÂ¹Ã‘ÂÃ‘â€šÃÂ²ÃÂ¸Ã‘â€šÃÂµÃÂ»Ã‘Å’ÃÂ½ÃÂ¾ Ã‘Æ’ÃÂ´ÃÂ°ÃÂ»ÃÂ¸Ã‘â€šÃ‘Å’ ÃÂ°ÃÂºÃÂºÃÂ°Ã‘Æ’ÃÂ½Ã‘â€š",
      confirmError: "ÃÅ¸ÃÂ¾ÃÂ´Ã‘â€šÃÂ²ÃÂµÃ‘â‚¬ÃÂ´ÃÂ¸Ã‘â€šÃÂµ Ã‘Æ’ÃÂ´ÃÂ°ÃÂ»ÃÂµÃÂ½ÃÂ¸ÃÂµ ÃÂ°ÃÂºÃÂºÃÂ°Ã‘Æ’ÃÂ½Ã‘â€šÃÂ°.",
      cancel: "ÃÅ¾Ã‘â€šÃÂ¼ÃÂµÃÂ½ÃÂ°",
      start: "ÃÂ£ÃÂ´ÃÂ°ÃÂ»ÃÂ¸Ã‘â€šÃ‘Å’ ÃÂ°ÃÂºÃÂºÃÂ°Ã‘Æ’ÃÂ½Ã‘â€š",
      delete: "ÃÂ£ÃÂ´ÃÂ°ÃÂ»ÃÂ¸Ã‘â€šÃ‘Å’ ÃÂ°ÃÂºÃÂºÃÂ°Ã‘Æ’ÃÂ½Ã‘â€š",
      deleting: "ÃÂ£ÃÂ´ÃÂ°ÃÂ»ÃÂµÃÂ½ÃÂ¸ÃÂµ...",
      error: "ÃÂÃÂµ Ã‘Æ’ÃÂ´ÃÂ°ÃÂ»ÃÂ¾Ã‘ÂÃ‘Å’ Ã‘Æ’ÃÂ´ÃÂ°ÃÂ»ÃÂ¸Ã‘â€šÃ‘Å’ ÃÂ°ÃÂºÃÂºÃÂ°Ã‘Æ’ÃÂ½Ã‘â€š"
    },
    themeLight: "ÃÂ¡ÃÂ²ÃÂµÃ‘â€šÃÂ»ÃÂ°Ã‘Â",
    themeDark: "ÃÂ¢ÃÂµÃÂ¼ÃÂ½ÃÂ°Ã‘Â",
    langRu: "ÃÂ Ã‘Æ’Ã‘ÂÃ‘ÂÃÂºÃÂ¸ÃÂ¹",
    langEn: "English"
  },
  en: {
    title: "Profile",
    tagline: "Your details and account settings.",
    loading: "Loading...",
    error: "Failed to load profile",
    email: "Email",
    interfaceSection: "Interface",
    interfaceLang: "Interface language",
    theme: "Theme",
    themeHint: "Toggle in the top bar.",
    nativeLang: "Native language",
    targetLang: "Learning",
    onboarding: "Learning setup",
    onboardingReady: "Complete",
    onboardingPending: "Incomplete",
    save: "Save",
    saving: "Saving...",
    saved: "Saved",
    saveError: "Failed to save settings",
    sections: {
      learning: "Learning",
      tech: "Tech settings",
      help: "Help"
    },
    wordsSection: "Words",
    wordsLearnTitle: "My words to learn",
    wordsLearnDesc:
      "Add words you want to learn. They appear in learning and review.",
    wordsLearnAction: "Open my words",
    learningHint: "Pick corpora, languages, and limits in learning setup.",
    techHint: "Notifications, outbox, and background jobs.",
    helpHint: "Welcome guide and quick tour of Recallio.",
    support: {
      title: "Support",
      hint: "Need help or have a question? Send a support request.",
      action: "Contact support"
    },
    actions: {
      logout: "Log out",
      onboarding: "Open learning setup",
      tech: "Open tech settings",
      help: "Open help"
    },
    danger: {
      title: "Delete account",
      subtitle: "Confirm account deletion.",
      warning:
        "This action is irreversible: settings, progress, words, and history will be deleted.",
      confirm: "Yes, delete my account",
      confirmError: "Please confirm account deletion.",
      cancel: "Cancel",
      start: "Delete account",
      delete: "Delete account",
      deleting: "Deleting...",
      error: "Failed to delete account"
    },
    themeLight: "Light",
    themeDark: "Dark",
    langRu: "Russian",
    langEn: "English"
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

async function postForm(path, formData, token) {
  const headers = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers,
    body: formData
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

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const { lang } = useUiLang();
  const uiLang = lang || "ru";

  const t = TEXT[uiLang] || TEXT.ru;
  const avatarText = t.avatar || {
    title: uiLang === "en" ? "Avatar" : "\u0410\u0432\u0430\u0442\u0430\u0440",
    upload: uiLang === "en" ? "Upload" : "\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c",
    uploading: uiLang === "en" ? "Uploading..." : "\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430...",
    hint: uiLang === "en" ? "Formats: PNG, JPG, WebP." : "\u0424\u043e\u0440\u043c\u0430\u0442\u044b: PNG, JPG, WebP.",
    error: uiLang === "en" ? "Failed to upload avatar" : "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c \u0430\u0432\u0430\u0442\u0430\u0440"
  };

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

  const logout = () => {
    deleteCookie("token");
    deleteCookie("is_admin");
    window.location.href = "/auth";
  };

  const openDelete = () => {
    setConfirmOpen(true);
    setConfirmDelete(false);
    setDeleteError("");
  };

  const cancelDelete = () => {
    setConfirmOpen(false);
    setConfirmDelete(false);
    setDeleteError("");
  };

  const deleteAccount = async () => {
    setDeleteError("");
    if (!confirmDelete) {
      setDeleteError(t.danger.confirmError);
      return;
    }
    const token = getCookie("token");
    if (!token) {
      window.location.href = "/auth";
      return;
    }
    setDeleting(true);
    try {
      await deleteJson("/profile", token);
      deleteCookie("token");
      deleteCookie("is_admin");
      window.location.href = "/auth";
    } catch (err) {
      setDeleteError(err.message || t.danger.error);
    } finally {
      setDeleting(false);
    }
  };

  const uploadAvatar = async (file) => {
    setAvatarError("");
    const token = getCookie("token");
    if (!token) {
      window.location.href = "/auth";
      return;
    }
    setAvatarUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const data = await postForm("/profile/avatar", formData, token);
      setProfile((prev) => (prev ? { ...prev, avatar_url: data.avatar_url } : prev));
    } catch (err) {
      setAvatarError(err.message || avatarText.error);
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    uploadAvatar(file);
    event.target.value = "";
  };

  const goOnboarding = () => {
    window.location.href = "/onboarding";
  };

  const goTech = () => {
    window.location.href = "/tech";
  };

  const goSupport = () => {
    window.location.href = "/support";
  };

  const langLabel = (value) => {
    if (value === "ru") {
      return t.langRu;
    }
    if (value === "en") {
      return t.langEn;
    }
    return "-";
  };

  const initials = profile?.email ? profile.email.slice(0, 1).toUpperCase() : "?";
  const onboardingReady = Boolean(profile?.onboarding_done);
  return (
    <main>
      <div className="page-header">
        <div className="page-hero-main">
          <h1 className="page-title">{t.title}</h1>
          <p className="page-tagline">{t.tagline}</p>
        </div>
      </div>

      {loading ? <p className="muted">{t.loading}</p> : null}
      {error ? <p className="error">{error}</p> : null}

      {profile ? (
        <>
          <div className="section-grid">
            <div className="section-stack">
              <div className="panel profile-hero">
                <label className="profile-avatar profile-avatar-upload">
                  {profile.avatar_url ? (
                    <img src={resolveAvatarUrl(profile.avatar_url)} alt="Avatar" />
                  ) : (
                    initials
                  )}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleAvatarChange}
                    disabled={avatarUploading}
                  />
                  <span className="profile-avatar-overlay">{avatarText.upload}</span>
                </label>
                <div className="profile-details">
                  <div className="profile-name">{profile.email}</div>
                  <div className="profile-meta">{t.email}</div>
                  <span className={`status-pill ${onboardingReady ? "ok" : "warn"}`}>
                    {t.onboarding}: {onboardingReady ? t.onboardingReady : t.onboardingPending}
                  </span>
                  {avatarUploading ? <span className="muted">{avatarText.uploading}</span> : null}
                  {avatarError ? <span className="error">{avatarError}</span> : null}
                </div>
              </div>

              <div className="panel profile-learning">
                <div className="panel-title">{t.sections.learning}</div>
                <div className="profile-learning-row">
                  <div className="profile-learning-pair">
                    <div className="profile-learning-item">
                      <span className="profile-learning-label">{t.nativeLang}</span>
                      <span className="profile-learning-value">{langLabel(profile.native_lang)}</span>
                    </div>
                    <span className="profile-learning-arrow">Ã¢â€ â€™</span>
                    <div className="profile-learning-item">
                      <span className="profile-learning-label">{t.targetLang}</span>
                      <span className="profile-learning-value">{langLabel(profile.target_lang)}</span>
                    </div>
                  </div>
                  <div className="profile-learning-actions">
                    <button type="button" className="button-secondary" onClick={goOnboarding}>
                      {t.actions.onboarding}
                    </button>
                  </div>
                </div>
                <p className="muted profile-learning-hint">{t.learningHint}</p>
              </div>
            </div>

            <div className="section-stack">
              <div className="panel">
                <div className="panel-title">{t.sections.tech}</div>
                <p className="muted">{t.techHint}</p>
                <div className="actions">
                  <button type="button" className="button-secondary" onClick={goTech}>
                    {t.actions.tech}
                  </button>
                </div>
              </div>

              <div className="panel">
                <div className="panel-title">{t.support.title}</div>
                <p className="muted">{t.support.hint}</p>
                <div className="actions">
                  <button type="button" className="button-secondary" onClick={goSupport}>
                    {t.support.action}
                  </button>
                </div>
              </div>

              <div className="panel">
                <div className="panel-title">{t.danger.title}</div>
                <div className="actions">
                  <button type="button" className="button-secondary" onClick={logout}>
                    {t.actions.logout}
                  </button>
                  <button type="button" className="button-danger" onClick={openDelete}>
                    {t.danger.start}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}

      {confirmOpen ? (
        <div className="modal-overlay" onClick={cancelDelete}>
          <div className="modal-card delete-modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <div className="modal-title">{t.danger.title}</div>
                <div className="modal-sub">{t.danger.subtitle}</div>
              </div>
              <button type="button" className="button-secondary" onClick={cancelDelete}>
                {t.danger.cancel}
              </button>
            </div>
            <div className="modal-body">
              <p className="error">{t.danger.warning}</p>
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={confirmDelete}
                  onChange={(event) => setConfirmDelete(event.target.checked)}
                />
                {t.danger.confirm}
              </label>
              {deleteError ? <p className="error">{deleteError}</p> : null}
            </div>
            <div className="modal-footer">
              <button type="button" className="button-secondary" onClick={cancelDelete}>
                {t.danger.cancel}
              </button>
              <button
                type="button"
                className="button-danger"
                onClick={deleteAccount}
                disabled={!confirmDelete || deleting}
              >
                {deleting ? t.danger.deleting : t.danger.delete}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
