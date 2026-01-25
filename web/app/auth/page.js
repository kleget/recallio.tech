"use client";

import { useUiLang } from "../ui-lang-context";

const TEXT = {
  ru: {
    title: "Recallio — тематические слова без перегруза",
    phrase: "Умный словарь по сферам с регулярными повторениями.",
    subtitle:
      "Сферы для биологов, математиков, айтишников и других. Карточки, тесты на вспоминание и прогресс за 10-15 минут в день.",
    why: "Зачем: учишь только нужное по своей сфере и тратишь минимум времени.",
    stepsTitle: "Как это работает",
    steps: [
      "Выбираешь язык, сферы и лимиты.",
      "Учишь карточки и проходишь тест на вспоминание.",
      "Повторяешь вовремя и видишь рост на графике."
    ],
    focusTitle: "Сферы и темп",
    focusPoints: [
      "Сферы: биология, математика, IT, экономика и другие.",
      "Темп: 10-15 минут в день.",
      "Лимиты: учишь ровно столько, сколько нужно."
    ],
    benefitsTitle: "Почему это работает",
    benefits: [
      {
        title: "Активное вспоминание",
        desc: "Память закрепляется лучше, когда ты сам пытаешься вспомнить перевод."
      },
      {
        title: "Тематические сферы",
        desc: "Учишь лексику по своей области, а не все подряд."
      },
      {
        title: "Малый ежедневный темп",
        desc: "10-15 минут в день дают стабильный рост без выгорания."
      },
      {
        title: "Лимиты под цель",
        desc: "Задаешь нужное количество слов для каждой сферы."
      },
      {
        title: "Видимый прогресс",
        desc: "График и статистика показывают дисциплину и рост словаря."
      },
      {
        title: "Фокус на слабом",
        desc: "Сервис выделяет слова, где ты чаще ошибаешься."
      }
    ],
    featuresTitle: "Что внутри",
    features: [
      {
        title: "Карточки + тест на вспоминание",
        desc: "Сначала учишь, затем проверяешь себя — так формируется долгосрочная память."
      },
      {
        title: "Повторы и напоминания",
        desc: "Сервис подсказывает, когда повторять, чтобы не забывать."
      },
      {
        title: "Слабые слова",
        desc: "Список слов, где ты чаще всего ошибаешься."
      },
      {
        title: "Мои слова",
        desc: "Добавляй личные слова и учи именно их."
      },
      {
        title: "Сообщество",
        desc: "Публичный профиль, друзья, общий чат и челленджи."
      },
      {
        title: "Репорты и поддержка",
        desc: "Можно сообщить об ошибках в словарях — админ быстро исправит."
      }
    ],
    audienceTitle: "Кому подходит",
    audience: [
      {
        title: "Студентам и специалистам",
        desc: "Тематические сферы помогают быстро набрать профессиональную лексику."
      },
      {
        title: "Самообучению",
        desc: "Даже 10-15 минут в день дают стабильный рост."
      },
      {
        title: "Тем, кто читает и смотрит контент",
        desc: "Удобно закреплять слова из книг, видео и курсов."
      }
    ],
    developer: "Разработчик: Kleget",
    ctaRegister: "Зарегистрироваться",
    ctaLogin: "Войти",
    ctaNote: "Все основные функции доступны бесплатно."
  },
  en: {
    title: "Recallio — themed words without overload",
    phrase: "Domain-focused vocabulary with smart reviews.",
    subtitle:
      "Domains for biologists, engineers, IT and more. Flashcards, recall tests, and progress in 10-15 minutes a day.",
    why: "Why: learn only what you need for your domain and spend minimal time.",
    stepsTitle: "How it works",
    steps: [
      "Pick language, domains, and limits.",
      "Learn with cards and pass a recall test.",
      "Review on time and track growth."
    ],
    focusTitle: "Domains and pace",
    focusPoints: [
      "Domains: biology, math, IT, economics, and more.",
      "Pace: 10-15 minutes a day.",
      "Limits: learn exactly how much you need."
    ],
    benefitsTitle: "Why it works",
    benefits: [
      {
        title: "Active recall",
        desc: "Memory gets stronger when you try to recall, not just read."
      },
      {
        title: "Themed domains",
        desc: "Learn vocabulary by your field instead of random lists."
      },
      {
        title: "Small daily pace",
        desc: "10-15 minutes a day is enough for consistent growth."
      },
      {
        title: "Limits by goal",
        desc: "Set the right amount of words for each domain."
      },
      {
        title: "Visible progress",
        desc: "Charts and stats keep motivation real."
      },
      {
        title: "Focus on weak words",
        desc: "The service highlights words where you often make mistakes."
      }
    ],
    featuresTitle: "What you get",
    features: [
      {
        title: "Flashcards + recall test",
        desc: "Learn first, then check yourself to lock it in."
      },
      {
        title: "Reviews and reminders",
        desc: "Timely reviews help you not forget."
      },
      {
        title: "Weak words",
        desc: "See the words where you make the most mistakes."
      },
      {
        title: "My words",
        desc: "Add your own words and learn exactly what matters."
      },
      {
        title: "Community",
        desc: "Public profile, friends, global chat, and challenges."
      },
      {
        title: "Reports & support",
        desc: "Report dictionary issues — admin fixes them."
      }
    ],
    audienceTitle: "Who it is for",
    audience: [
      {
        title: "Students and professionals",
        desc: "Domain sets help you build professional vocabulary fast."
      },
      {
        title: "Self-learners",
        desc: "10-15 minutes a day gives steady growth."
      },
      {
        title: "Readers and viewers",
        desc: "Capture words from books, videos, and courses."
      }
    ],
    developer: "Developer: Kleget",
    ctaRegister: "Sign up",
    ctaLogin: "Sign in",
    ctaNote: "All core features are available for free."
  }
};

export default function AuthLandingPage() {
  const { lang } = useUiLang();
  const uiLang = lang || "ru";
  const t = TEXT[uiLang] || TEXT.ru;

  const goLogin = () => {
    window.location.href = "/auth/login";
  };

  const goRegister = () => {
    window.location.href = "/auth/register";
  };

  return (
    <main className="landing-page">
      <section className="landing-hero">
        <div className="landing-hero-grid">
          <div className="landing-hero-text">
            <p className="landing-eyebrow">Recallio</p>
            <p className="landing-phrase">{t.phrase}</p>
            <h1>{t.title}</h1>
            <p className="landing-lead">{t.subtitle}</p>
            <p className="landing-why">{t.why}</p>
            <div className="landing-actions">
              <button type="button" onClick={goRegister}>
                {t.ctaRegister}
              </button>
              <button type="button" className="button-secondary" onClick={goLogin}>
                {t.ctaLogin}
              </button>
            </div>
            <p className="landing-meta">{t.ctaNote}</p>
            <p className="landing-meta">{t.developer}</p>
          </div>
          <div className="landing-hero-side">
            <div className="landing-hero-card">
              <h3>{t.stepsTitle}</h3>
              <ol className="landing-steps">
                {t.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </div>
            <div className="landing-hero-card">
              <h3>{t.focusTitle}</h3>
              <ul className="landing-steps">
                {t.focusPoints.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-title">{t.benefitsTitle}</div>
        <div className="feature-grid grid-3">
          {t.benefits.map((item) => (
            <div className="feature-card" key={item.title}>
              <div className="feature-title">{item.title}</div>
              <p className="feature-desc">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel-title">{t.featuresTitle}</div>
        <div className="feature-grid grid-3">
          {t.features.map((feature) => (
            <div className="feature-card" key={feature.title}>
              <div className="feature-title">{feature.title}</div>
              <p className="feature-desc">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel-title">{t.audienceTitle}</div>
        <div className="feature-grid grid-3">
          {t.audience.map((item) => (
            <div className="feature-card" key={item.title}>
              <div className="feature-title">{item.title}</div>
              <p className="feature-desc">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
