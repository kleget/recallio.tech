"use client";

import { useUiLang } from "../ui-lang-context";

const TEXT = {
  ru: {
    title: "\u0421\u0435\u0440\u0432\u0438\u0441 \u0434\u043b\u044f \u0440\u043e\u0441\u0442\u0430 \u0441\u043b\u043e\u0432\u0430\u0440\u044f \u0438 \u0434\u0438\u0441\u0446\u0438\u043f\u043b\u0438\u043d\u044b",
    subtitle:
      "Recallio \u2014 \u043b\u0438\u0447\u043d\u044b\u0439 \u043f\u043e\u043c\u043e\u0449\u043d\u0438\u043a \u043f\u043e \u0438\u0437\u0443\u0447\u0435\u043d\u0438\u044e \u0438\u043d\u043e\u0441\u0442\u0440\u0430\u043d\u043d\u044b\u0445 \u0441\u043b\u043e\u0432. \u0421\u043e\u0431\u0438\u0440\u0430\u0435\u043c \u043b\u0435\u043a\u0441\u0438\u043a\u0443 \u043f\u043e \u0441\u0444\u0435\u0440\u0430\u043c, \u043f\u043e\u043a\u0430\u0437\u044b\u0432\u0430\u0435\u043c \u043a\u0430\u0440\u0442\u043e\u0447\u043a\u0438, \u0442\u0435\u0441\u0442\u0438\u0440\u0443\u0435\u043c \u0437\u0430\u043f\u043e\u043c\u0438\u043d\u0430\u043d\u0438\u0435 \u0438 \u043d\u0430\u043f\u043e\u043c\u0438\u043d\u0430\u0435\u043c \u043e \u043f\u043e\u0432\u0442\u043e\u0440\u0435\u043d\u0438\u044f\u0445.",
    why:
      "\u0417\u0430\u0447\u0435\u043c: \u0443\u0447\u0438\u0448\u044c \u043c\u0435\u043d\u044c\u0448\u0435, \u0437\u0430\u043f\u043e\u043c\u0438\u043d\u0430\u0435\u0448\u044c \u043b\u0443\u0447\u0448\u0435 \u0438 \u0432\u0438\u0434\u0438\u0448\u044c \u0440\u0435\u0430\u043b\u044c\u043d\u044b\u0439 \u043f\u0440\u043e\u0433\u0440\u0435\u0441\u0441.",
    stepsTitle: "\u041a\u0430\u043a \u044d\u0442\u043e \u0440\u0430\u0431\u043e\u0442\u0430\u0435\u0442",
    steps: [
      "\u0412\u044b\u0431\u0438\u0440\u0430\u0435\u0448\u044c \u0441\u0444\u0435\u0440\u044b \u0438 \u043a\u043e\u043b\u0438\u0447\u0435\u0441\u0442\u0432\u043e \u0441\u043b\u043e\u0432.",
      "\u041f\u0440\u043e\u0445\u043e\u0434\u0438\u0448\u044c \u043a\u0430\u0440\u0442\u043e\u0447\u043a\u0438 \u0438 \u043a\u043e\u0440\u043e\u0442\u043a\u0438\u0439 \u0442\u0435\u0441\u0442.",
      "\u0421\u0435\u0440\u0432\u0438\u0441 \u0432\u043e\u0432\u0440\u0435\u043c\u044f \u043d\u0430\u043f\u043e\u043c\u0438\u043d\u0430\u0435\u0442 \u043e \u043f\u043e\u0432\u0442\u043e\u0440\u0435\u043d\u0438\u0438."
    ],
    featuresTitle: "\u0427\u0442\u043e \u0432\u043d\u0443\u0442\u0440\u0438",
    features: [
      {
        title: "\u041a\u0430\u0440\u0442\u043e\u0447\u043a\u0438 \u0438 \u0442\u0435\u0441\u0442\u044b",
        desc: "\u0421\u043d\u0430\u0447\u0430\u043b\u0430 \u0443\u0447\u0438\u0448\u044c \u043a\u0430\u0440\u0442\u043e\u0447\u043a\u0438, \u043f\u043e\u0442\u043e\u043c \u0432\u0441\u043f\u043e\u043c\u0438\u043d\u0430\u0435\u0448\u044c \u043f\u0435\u0440\u0435\u0432\u043e\u0434."
      },
      {
        title: "\u041f\u043e\u0432\u0442\u043e\u0440\u0435\u043d\u0438\u044f \u043f\u043e \u0438\u043d\u0442\u0435\u0440\u0432\u0430\u043b\u0430\u043c",
        desc: "\u041d\u0435 \u043f\u0435\u0440\u0435\u0433\u0440\u0443\u0436\u0430\u0435\u0448\u044c \u043f\u0430\u043c\u044f\u0442\u044c, \u043f\u043e\u0432\u0442\u043e\u0440\u044f\u0435\u0448\u044c \u0432\u043e\u0432\u0440\u0435\u043c\u044f."
      },
      {
        title: "\u041c\u043e\u0438 \u0441\u043b\u043e\u0432\u0430 \u0438 \u0441\u043b\u0430\u0431\u044b\u0435 \u043c\u0435\u0441\u0442\u0430",
        desc: "\u0414\u043e\u0431\u0430\u0432\u043b\u044f\u0435\u0448\u044c \u0441\u0432\u043e\u0438 \u0441\u043b\u043e\u0432\u0430 \u0438 \u0432\u0438\u0434\u0438\u0448\u044c, \u0447\u0442\u043e \u0445\u0440\u043e\u043c\u0430\u0435\u0442."
      },
      {
        title: "\u041f\u0440\u043e\u0433\u0440\u0435\u0441\u0441 \u0438 \u0434\u0438\u0441\u0446\u0438\u043f\u043b\u0438\u043d\u0430",
        desc: "\u0413\u0440\u0430\u0444\u0438\u043a \u0438 \u0441\u0442\u0430\u0442\u0438\u0441\u0442\u0438\u043a\u0430 \u043c\u043e\u0442\u0438\u0432\u0438\u0440\u0443\u044e\u0442 \u043f\u0440\u043e\u0434\u043e\u043b\u0436\u0430\u0442\u044c."
      }
    ],
    audienceTitle: "\u041a\u043e\u043c\u0443 \u043f\u043e\u0434\u0445\u043e\u0434\u0438\u0442",
    audience: [
      {
        title: "\u0421\u0442\u0443\u0434\u0435\u043d\u0442\u0430\u043c \u0438 \u0441\u043f\u0435\u0446\u0438\u0430\u043b\u0438\u0441\u0442\u0430\u043c",
        desc: "\u0421\u0444\u0435\u0440\u044b \u0437\u043d\u0430\u043d\u0438\u0439 \u043f\u043e\u043c\u043e\u0433\u0430\u044e\u0442 \u0431\u044b\u0441\u0442\u0440\u043e \u043d\u0430\u0431\u0440\u0430\u0442\u044c \u043f\u0440\u043e\u0444\u0435\u0441\u0441\u0438\u043e\u043d\u0430\u043b\u044c\u043d\u0443\u044e \u043b\u0435\u043a\u0441\u0438\u043a\u0443."
      },
      {
        title: "\u0421\u0430\u043c\u043e\u043e\u0431\u0443\u0447\u0435\u043d\u0438\u044e",
        desc: "\u0414\u0430\u0436\u0435 10 \u043c\u0438\u043d\u0443\u0442 \u0432 \u0434\u0435\u043d\u044c \u0434\u0430\u044e\u0442 \u0437\u0430\u043c\u0435\u0442\u043d\u044b\u0439 \u0440\u043e\u0441\u0442."
      },
      {
        title: "\u0422\u0435\u043c, \u043a\u0442\u043e \u0447\u0438\u0442\u0430\u0435\u0442 \u0438 \u0441\u043c\u043e\u0442\u0440\u0438\u0442 \u043a\u043e\u043d\u0442\u0435\u043d\u0442",
        desc: "\u041b\u0435\u0433\u043a\u043e \u0437\u0430\u043a\u0440\u0435\u043f\u043b\u044f\u0442\u044c \u0441\u043b\u043e\u0432\u0430 \u0438\u0437 \u043a\u043d\u0438\u0433 \u0438 \u0432\u0438\u0434\u0435\u043e."
      }
    ],
    developer: "\u0420\u0430\u0437\u0440\u0430\u0431\u043e\u0442\u0447\u0438\u043a: Kleget",
    ctaRegister: "\u0421\u043e\u0437\u0434\u0430\u0442\u044c \u0430\u043a\u043a\u0430\u0443\u043d\u0442",
    ctaLogin: "\u0412\u043e\u0439\u0442\u0438 \u0432 \u0430\u043a\u043a\u0430\u0443\u043d\u0442"
  },
  en: {
    title: "A service for vocabulary growth and discipline",
    subtitle:
      "Recallio is a personal assistant for learning words. We organize vocabulary by domain, show flashcards, test recall, and remind you when it is time to review.",
    why: "Why: learn less, remember more, and see real progress.",
    stepsTitle: "How it works",
    steps: [
      "Pick domains and a word limit.",
      "Go through cards and a short recall test.",
      "Get timely reminders for reviews."
    ],
    featuresTitle: "What you get",
    features: [
      {
        title: "Cards + recall tests",
        desc: "Learn first, then prove you remember."
      },
      {
        title: "Spaced reviews",
        desc: "Repeat at the right time without overload."
      },
      {
        title: "Your words + weak spots",
        desc: "Add your own words and track what is hard."
      },
      {
        title: "Progress & discipline",
        desc: "Charts keep motivation visible."
      }
    ],
    audienceTitle: "Who it is for",
    audience: [
      {
        title: "Students and professionals",
        desc: "Domain sets help you build subject vocabulary fast."
      },
      {
        title: "Self-learners",
        desc: "Even 10 minutes a day gives steady growth."
      },
      {
        title: "Readers and viewers",
        desc: "Keep words from books and media."
      }
    ],
    developer: "Developer: Kleget",
    ctaRegister: "Create account",
    ctaLogin: "Sign in"
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
