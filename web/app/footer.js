"use client";

import { useUiLang } from "./ui-lang-context";

const TEXT = {
  ru: {
    title: "Recallio",
    description: "Умный словарь по сферам с регулярными повторениями.",
    tagline: "Короткие сессии, видимый прогресс и фокус на нужной лексике.",
    links: {
      learn: "Учить",
      review: "Повторять",
      reading: "Читать",
      reviewPlan: "План повторений",
      customWords: "Мои слова",
      knownWords: "Известные слова",
      weakWords: "Слабые слова",
      community: "Сообщество",
      support: "Поддержка",
      reports: "Репорты",
      server: "О сервере",
      tech: "Тех-настройки",
      github: "GitHub",
      telegram: "Telegram",
      email: "Email"
    },
    developer: "Разработчик: Kleget",
    rights: "Все права защищены"
  },
  en: {
    title: "Recallio",
    description: "Domain-focused vocabulary with smart reviews.",
    tagline: "Short sessions, visible progress, and the right words.",
    links: {
      learn: "Learn",
      review: "Review",
      reading: "Reading",
      reviewPlan: "Review plan",
      customWords: "My words",
      knownWords: "Known words",
      weakWords: "Weak words",
      community: "Community",
      support: "Support",
      reports: "Reports",
      server: "Server info",
      tech: "Tech settings",
      github: "GitHub",
      telegram: "Telegram",
      email: "Email"
    },
    developer: "Developer: Kleget",
    rights: "All rights reserved"
  }
};

export default function Footer() {
  const { lang } = useUiLang();
  const uiLang = lang || "ru";
  const t = TEXT[uiLang] || TEXT.ru;
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="footer-brand">
          <div className="footer-title">{t.title}</div>
          <p className="footer-desc">{t.description}</p>
          <p className="footer-meta">{t.tagline}</p>
        </div>
        <div className="footer-links">
          <a href="/learn">{t.links.learn}</a>
          <a href="/review">{t.links.review}</a>
          <a href="/reading">{t.links.reading}</a>
          <a href="/review-plan">{t.links.reviewPlan}</a>
          <a href="/custom-words">{t.links.customWords}</a>
          <a href="/known-words">{t.links.knownWords}</a>
          <a href="/stats">{t.links.weakWords}</a>
          <a href="/community">{t.links.community}</a>
          <a href="/support">{t.links.support}</a>
          <a href="/reports">{t.links.reports}</a>
          <a href="/server">{t.links.server}</a>
          <a href="/tech">{t.links.tech}</a>
          <a
            href="https://github.com/kleget/recallio.tech"
            target="_blank"
            rel="noopener noreferrer"
          >
            {t.links.github}
          </a>
          <a href="https://t.me/kleget" target="_blank" rel="noopener noreferrer">
            {t.links.telegram}
          </a>
          <a href="mailto:kleget_dev@mail.ru">{t.links.email}</a>
        </div>
      </div>
      <div className="footer-bottom">
        <div className="footer-rights">
          © {year} {t.title}. {t.rights}.
        </div>
        <div className="footer-meta">{t.developer}</div>
      </div>
    </footer>
  );
}
