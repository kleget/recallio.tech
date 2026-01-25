"use client";

import { useEffect } from "react";

import { useUiLang } from "../ui-lang-context";

const TEXT = {
  ru: {
    title: "Настройки перенесены",
    message: "Теперь все настройки находятся в профиле.",
    action: "Перейти в профиль",
    note: "Перенаправляем..."
  },
  en: {
    title: "Settings moved",
    message: "All settings are now available in your profile.",
    action: "Go to profile",
    note: "Redirecting..."
  }
};

export default function SettingsPage() {
  const { lang } = useUiLang();
  const t = TEXT[lang] || TEXT.ru;

  useEffect(() => {
    const timer = setTimeout(() => {
      window.location.href = "/profile";
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <main>
      <div className="page-header">
        <div className="page-hero-main">
          <h1 className="page-title">{t.title}</h1>
          <p className="page-tagline">{t.message}</p>
        </div>
        <div className="page-header-actions">
          <button type="button" onClick={() => (window.location.href = "/profile")}>
            {t.action}
          </button>
        </div>
      </div>
      <div className="panel">
        <div className="panel-title">{t.note}</div>
      </div>
    </main>
  );
}
