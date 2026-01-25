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
      community: "Сообщество",
      support: "Поддержка",
      server: "О сервере",
      tech: "Тех-настройки",
      github: "GitHub",
      telegram: "Telegram",
      email: "Email"
    },
    groups: {
      recallio: "Recallio",
      links: "Ссылки"
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
      community: "Community",
      support: "Support",
      server: "Server info",
      tech: "Tech settings",
      github: "GitHub",
      telegram: "Telegram",
      email: "Email"
    },
    groups: {
      recallio: "Recallio",
      links: "Links"
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
          <div className="footer-group">
            <div className="footer-group-title">{t.links.support}</div>
            <div className="footer-group-links">
              <a href="/support">{t.links.support}</a>
              <a href="/server">{t.links.server}</a>
              <a href="/tech">{t.links.tech}</a>
            </div>
          </div>
          <div className="footer-group">
            <div className="footer-group-title">{t.groups.recallio}</div>
            <div className="footer-group-links">
              <a href="/custom-words">{t.links.customWords}</a>
              <a href="/known-words">{t.links.knownWords}</a>
              <a href="/community">{t.links.community}</a>
            </div>
          </div>
          <div className="footer-group">
            <div className="footer-group-title">{t.groups.links}</div>
            <div className="footer-group-links">
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
