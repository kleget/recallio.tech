"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import { getCookie, setCookie } from "./lib/client-cookies";
import { useUiLang } from "./ui-lang-context";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

const TEXT = {
  ru: {
    home: "Главная",
    community: "Сообщество",
    profile: "Профиль",
    admin: "Админка",
    theme: "Тема",
    themeLight: "Светлая",
    themeDark: "Темная",
    langLabel: "Язык"
  },
  en: {
    home: "Home",
    community: "Community",
    profile: "Profile",
    admin: "Admin",
    theme: "Theme",
    themeLight: "Light",
    themeDark: "Dark",
    langLabel: "Language"
  }
};

const NAV_ITEMS = [
  { href: "/", key: "home", icon: "home" },
  { href: "/community", key: "community", icon: "community" },
  { href: "/profile", key: "profile", icon: "profile" },
  { href: "/admin", key: "admin", admin: true, icon: "admin" }
];

const ICONS = {
  home: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M3 10.5L12 3l9 7.5V21a1 1 0 0 1-1 1h-5.5a.5.5 0 0 1-.5-.5V15a1 1 0 0 0-1-1h-2a1 1 0 0 0-1 1v6.5a.5.5 0 0 1-.5.5H4a1 1 0 0 1-1-1z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  ),
  community: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M7.5 13a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7zM16.5 12.5a3 3 0 1 1 0-6 3 3 0 0 1 0 6z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M2.5 20c0-3 3.5-5 7-5s7 2 7 5M14 19.5c.3-1.6 1.8-3 4-3 2.2 0 3.7 1.2 4 3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  ),
  profile: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M4 20c0-3.3 3.3-6 8-6s8 2.7 8 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  ),
  admin: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 3l7 3v6c0 4.1-3 7.7-7 9-4-1.3-7-4.9-7-9V6z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M9 12l2 2 4-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
};

export default function SiteNav({ initialIsAdmin = false }) {
  const pathname = usePathname() || "/";
  const { lang, setLang } = useUiLang();
  const t = TEXT[lang] || TEXT.ru;
  const [isAdmin, setIsAdmin] = useState(
    () => Boolean(initialIsAdmin) || getCookie("is_admin") === "1"
  );
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    const next = getCookie("is_admin") === "1";
    setIsAdmin((prev) => (prev === next ? prev : next));
  }, [pathname]);

  useEffect(() => {
    const stored =
      localStorage.getItem("theme") ||
      getCookie("theme") ||
      document.documentElement.dataset.theme;
    const nextTheme = stored === "dark" ? "dark" : "light";
    setTheme(nextTheme);
  }, []);

  const items = isAdmin ? NAV_ITEMS : NAV_ITEMS.filter((item) => !item.admin);

  const applyTheme = (nextTheme) => {
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    localStorage.setItem("theme", nextTheme);
    setCookie("theme", nextTheme);
  };

  const persistTheme = async (nextTheme) => {
    const token = getCookie("token");
    if (!token) {
      return;
    }
    try {
      await fetch(`${API_BASE}/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ theme: nextTheme })
      });
    } catch (err) {
      console.warn("Theme update failed", err);
    }
  };

  const setThemeChoice = (nextTheme) => {
    if (nextTheme === theme) {
      return;
    }
    applyTheme(nextTheme);
    persistTheme(nextTheme);
  };

  return (
    <>
      <header className="site-nav">
        <div className="site-nav-inner">
          <a className="nav-brand" href="/">
            <img className="brand-logo" src="/brand/Recallio_main.png" alt="Recallio" />
            <img className="brand-mark" src="/brand/R_main.png" alt="Recallio" />
          </a>
          <div className="nav-actions">
            <nav className="nav-links nav-links-top" aria-label="Main">
              {items.map((item) => {
                const isActive =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    className={`nav-link${isActive ? " is-active" : ""}`}
                    aria-current={isActive ? "page" : undefined}
                    aria-label={t[item.key]}
                  >
                    <span className="nav-icon">{ICONS[item.icon]}</span>
                    <span className="nav-text">{t[item.key]}</span>
                  </a>
                );
              })}
            </nav>
            <div className="nav-controls">
              <div className="segmented nav-lang" role="group" aria-label={t.langLabel}>
                <button
                  type="button"
                  className={lang === "ru" ? "is-active" : ""}
                  onClick={() => setLang("ru")}
                >
                  RU
                </button>
                <button
                  type="button"
                  className={lang === "en" ? "is-active" : ""}
                  onClick={() => setLang("en")}
                >
                  EN
                </button>
              </div>
              <div className="segmented nav-theme" role="group" aria-label={t.theme}>
                <button
                  type="button"
                  className={theme === "light" ? "is-active" : ""}
                  onClick={() => setThemeChoice("light")}
                  aria-label={t.themeLight}
                  title={t.themeLight}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      d="M12 7.2a4.8 4.8 0 1 0 0 9.6 4.8 4.8 0 0 0 0-9.6zm0-4.2a1 1 0 0 1 1 1v1.8a1 1 0 1 1-2 0V4a1 1 0 0 1 1-1zm0 16.2a1 1 0 0 1 1 1V22a1 1 0 1 1-2 0v-1.8a1 1 0 0 1 1-1zm-8-7.2a1 1 0 0 1 1-1h1.8a1 1 0 1 1 0 2H5a1 1 0 0 1-1-1zm13.2 0a1 1 0 0 1 1-1H20a1 1 0 1 1 0 2h-1.8a1 1 0 0 1-1-1zM6.4 6.4a1 1 0 0 1 1.4 0l1.3 1.3a1 1 0 1 1-1.4 1.4L6.4 7.8a1 1 0 0 1 0-1.4zm8.9 8.9a1 1 0 0 1 1.4 0l1.3 1.3a1 1 0 1 1-1.4 1.4l-1.3-1.3a1 1 0 0 1 0-1.4zM6.4 17.6a1 1 0 0 1 0-1.4l1.3-1.3a1 1 0 1 1 1.4 1.4l-1.3 1.3a1 1 0 0 1-1.4 0zm8.9-8.9a1 1 0 0 1 0-1.4l1.3-1.3a1 1 0 0 1 1.4 1.4l-1.3 1.3a1 1 0 0 1-1.4 0z"
                      fill="currentColor"
                    />
                  </svg>
                </button>
                <button
                  type="button"
                  className={theme === "dark" ? "is-active" : ""}
                  onClick={() => setThemeChoice("dark")}
                  aria-label={t.themeDark}
                  title={t.themeDark}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      d="M21.2 14.4a8.6 8.6 0 0 1-11.6-11A9.6 9.6 0 1 0 21.2 14.4z"
                      fill="currentColor"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>
      <nav className="nav-links nav-links-mobile" aria-label="Main">
        {items.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <a
              key={item.href}
              href={item.href}
              className={`nav-link${isActive ? " is-active" : ""}`}
              aria-current={isActive ? "page" : undefined}
              aria-label={t[item.key]}
            >
              <span className="nav-icon">{ICONS[item.icon]}</span>
              <span className="nav-text">{t[item.key]}</span>
            </a>
          );
        })}
      </nav>
    </>
  );
}
