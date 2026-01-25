"use client";

import { useUiLang } from "./ui-lang-context";

const TEXT = {
  ru: {
    title: "Recallio",
    description:
      "Изучение слов без перегруза: карточки, тесты и повторения по уму.",
    tagline: "Небольшие ежедневные сессии, которые дают стабильный прогресс.",
    navigation: "Навигация",
    contactsTitle: "Контакты",
    nav: {
      home: "Главная",
      learn: "Учить",
      review: "Повторять",
      reading: "Читать",
      reviewPlan: "План повторений",
      profile: "Профиль"
    },
    developer: "Разработчик: Kleget",
    support: "Поддержка",
    reports: "Репорты",
    server: "О сервере",
    github: "GitHub",
    telegram: "Telegram",
    email: "Email",
    vk: "VK",
    rights: "Все права защищены"
  },
  en: {
    title: "Recallio",
    description:
      "Learn words without overload: cards, recall tests, and smart reviews.",
    tagline: "Short daily sessions that keep your progress steady.",
    navigation: "Navigation",
    contactsTitle: "Contacts",
    nav: {
      home: "Home",
      learn: "Learn",
      review: "Review",
      reading: "Read",
      reviewPlan: "Review plan",
      profile: "Profile"
    },
    developer: "Developer: Kleget",
    support: "Support",
    reports: "Reports",
    server: "Server info",
    github: "GitHub",
    telegram: "Telegram",
    email: "Email",
    vk: "VK",
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
          <p className="footer-meta">{t.developer}</p>
        </div>
        <div className="footer-columns">
          <div className="footer-col">
            <div className="footer-links-title">{t.navigation}</div>
            <div className="footer-link-list">
              <a href="/">{t.nav.home}</a>
              <a href="/learn">{t.nav.learn}</a>
              <a href="/review">{t.nav.review}</a>
              <a href="/reading">{t.nav.reading}</a>
              <a href="/review-plan">{t.nav.reviewPlan}</a>
              <a href="/profile">{t.nav.profile}</a>
            </div>
          </div>
          <div className="footer-col">
            <div className="footer-links-title">{t.contactsTitle}</div>
            <div className="footer-link-list">
              <a href="/support">{t.support}</a>
              <a href="/reports">{t.reports}</a>
              <a href="/server">{t.server}</a>
              <a href="https://github.com/kleget/recallio.tech" target="_blank" rel="noopener noreferrer">
                {t.github}
              </a>
              <a href="https://t.me/kleget" target="_blank" rel="noopener noreferrer">
                {t.telegram}
              </a>
              <a href="mailto:kleget_dev@mail.ru">{t.email}</a>
              <a href="https://vk.com/kleget" target="_blank" rel="noopener noreferrer">
                {t.vk}
              </a>
            </div>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <div className="footer-rights">
          © {year} {t.title}. {t.rights}.
        </div>
      </div>
    </footer>
  );
}
