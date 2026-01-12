"use client";

import { useUiLang } from "../ui-lang-context";

const TEXT = {
  ru: {
    title: "Recallio — сервис для устойчивого роста словаря",
    subtitle:
      "Изучай иностранные слова по сферам: карточки, тесты на вспоминание, повторы и видимый прогресс.",
    why: "Зачем: меньше перегруза, больше закрепления и понятный рост словаря.",
    stepsTitle: "Как это работает",
    steps: [
      "Выбираешь язык, сферы и лимиты.",
      "Учишь карточки и проходишь тест на вспоминание.",
      "Повторяешь вовремя и видишь рост на графике."
    ],
    benefitsTitle: "Почему это работает",
    benefits: [
      {
        title: "Активное вспоминание",
        desc: "Память закрепляется лучше, когда ты сам пытаешься вспомнить перевод."
      },
      {
        title: "Короткие сессии",
        desc: "10–15 минут в день дают стабильный прогресс без выгорания."
      },
      {
        title: "Сферы и цели",
        desc: "Учишь то, что нужно именно тебе — по теме и с понятным лимитом."
      },
      {
        title: "Видимый прогресс",
        desc: "График и статистика показывают дисциплину и рост словаря."
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
        desc: "Даже 10–15 минут в день дают стабильный рост."
      },
      {
        title: "Тем, кто читает и смотрит контент",
        desc: "Удобно закреплять слова из книг, видео и курсов."
      }
    ],
    developer: "Разработчик: Kleget",
    ctaRegister: "Начать бесплатно",
    ctaLogin: "Войти в аккаунт",
    ctaNote: "Все основные функции доступны бесплатно."
  },
  en: {
    title: "Recallio — steady vocabulary growth",
    subtitle:
      "Learn words by domain with flashcards, recall tests, timely reviews, and visible progress.",
    why: "Why: less overload, stronger recall, and clear progress.",
    stepsTitle: "How it works",
    steps: [
      "Pick language, domains, and limits.",
      "Learn with cards and pass a recall test.",
      "Review on time and track growth."
    ],
    benefitsTitle: "Why it works",
    benefits: [
      {
        title: "Active recall",
        desc: "Memory gets stronger when you try to recall, not just read."
      },
      {
        title: "Short sessions",
        desc: "10–15 minutes a day is enough for consistent progress."
      },
      {
        title: "Domains and goals",
        desc: "Learn what you really need with clear limits."
      },
      {
        title: "Visible progress",
        desc: "Charts and stats keep motivation real."
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
        desc: "10–15 minutes a day gives steady growth."
      },
      {
        title: "Readers and viewers",
        desc: "Capture words from books, videos, and courses."
      }
    ],
    developer: "Developer: Kleget",
    ctaRegister: "Start for free",
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
          <div className="landing-hero-card">
            <h3>{t.stepsTitle}</h3>
            <ol className="landing-steps">
              {t.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-title">{t.benefitsTitle}</div>
        <div className="feature-grid">
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
        <div className="feature-grid">
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
        <div className="feature-grid">
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
