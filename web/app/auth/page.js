"use client";

import { useRef, useState } from "react";

import { setCookie } from "../lib/client-cookies";
import { useUiLang } from "../ui-lang-context";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

const TEXT = {
  ru: {
    titleLogin: "\u0412\u0445\u043e\u0434",
    titleRegister: "\u0420\u0435\u0433\u0438\u0441\u0442\u0440\u0430\u0446\u0438\u044f",
    subtitle: "\u0412\u043e\u0439\u0434\u0438\u0442\u0435, \u0447\u0442\u043e\u0431\u044b \u043d\u0430\u0447\u0430\u0442\u044c \u043e\u0431\u0443\u0447\u0435\u043d\u0438\u0435.",
    subtitleRegister:
      "\u0421\u043e\u0437\u0434\u0430\u0439\u0442\u0435 \u0430\u043a\u043a\u0430\u0443\u043d\u0442, \u0447\u0442\u043e\u0431\u044b \u043d\u0430\u0447\u0430\u0442\u044c \u043e\u0431\u0443\u0447\u0435\u043d\u0438\u0435.",
    heroTitle:
      "\u0421\u0435\u0440\u0432\u0438\u0441 \u0434\u043b\u044f \u0443\u043c\u043d\u043e\u0433\u043e \u0438\u0437\u0443\u0447\u0435\u043d\u0438\u044f \u0441\u043b\u043e\u0432",
    heroSubtitle:
      "Recallio \u043f\u043e\u043c\u043e\u0433\u0430\u0435\u0442 \u0443\u0447\u0438\u0442\u044c \u0438 \u043f\u043e\u0432\u0442\u043e\u0440\u044f\u0442\u044c \u0441\u043b\u043e\u0432\u0430 \u0431\u0435\u0437 \u043f\u0435\u0440\u0435\u0433\u0440\u0443\u0437\u0430 \u0438 \u0445\u0430\u043e\u0441\u0430.",
    heroWhy:
      "\u0417\u0430\u0447\u0435\u043c: \u043f\u0440\u0435\u0432\u0440\u0430\u0449\u0430\u0435\u043c \u0447\u0442\u0435\u043d\u0438\u0435 \u0438 \u0438\u043d\u0442\u0435\u0440\u0435\u0441\u044b \u0432 \u0441\u0442\u0430\u0431\u0438\u043b\u044c\u043d\u044b\u0439 \u0440\u043e\u0441\u0442 \u0441\u043b\u043e\u0432\u0430\u0440\u044f.",
    heroBenefitTitle: "\u0427\u0435\u043c \u043f\u043e\u043b\u0435\u0437\u043d\u043e",
    heroBenefits: [
      "\u0423\u043c\u043d\u044b\u0435 \u0438\u043d\u0442\u0435\u0440\u0432\u0430\u043b\u044b \u043f\u043e\u0432\u0442\u043e\u0440\u0435\u043d\u0438\u0439 \u0438 \u043a\u0430\u0440\u0442\u043e\u0447\u043a\u0438 \u0431\u0435\u0437 \u043b\u0438\u0448\u043d\u0435\u0433\u043e \u0441\u0442\u0440\u0435\u0441\u0441\u0430.",
      "\u0421\u0444\u0435\u0440\u044b \u0437\u043d\u0430\u043d\u0438\u0439 + \u043c\u043e\u0438 \u0441\u043b\u043e\u0432\u0430: \u0438\u0437\u0443\u0447\u0430\u0435\u0448\u044c \u0442\u043e\u043b\u044c\u043a\u043e \u043d\u0443\u0436\u043d\u043e\u0435.",
      "\u041f\u0440\u043e\u0433\u0440\u0435\u0441\u0441 \u0438 \u0441\u043b\u0430\u0431\u044b\u0435 \u0441\u043b\u043e\u0432\u0430 \u0432\u0441\u0435\u0433\u0434\u0430 \u043f\u043e\u0434 \u0440\u0443\u043a\u043e\u0439."
    ],
    heroAuthor: "\u0410\u0432\u0442\u043e\u0440 \u043f\u0440\u043e\u0435\u043a\u0442\u0430: Kleget",
    heroCtaRegister: "\u0421\u043e\u0437\u0434\u0430\u0442\u044c \u0430\u043a\u043a\u0430\u0443\u043d\u0442",
    heroCtaLogin: "\u0412\u043e\u0439\u0442\u0438 \u0432 \u0430\u043a\u043a\u0430\u0443\u043d\u0442",
    email: "Email",
    password: "\u041f\u0430\u0440\u043e\u043b\u044c",
    login: "\u0412\u043e\u0439\u0442\u0438",
    register: "\u0421\u043e\u0437\u0434\u0430\u0442\u044c \u0430\u043a\u043a\u0430\u0443\u043d\u0442",
    loading: "\u041f\u043e\u0434\u043e\u0436\u0434\u0438\u0442\u0435...",
    switchToRegister: "\u0421\u043e\u0437\u0434\u0430\u0442\u044c \u0430\u043a\u043a\u0430\u0443\u043d\u0442",
    switchToLogin:
      "\u0423 \u043c\u0435\u043d\u044f \u0443\u0436\u0435 \u0435\u0441\u0442\u044c \u0430\u043a\u043a\u0430\u0443\u043d\u0442",
    forgot: "\u0417\u0430\u0431\u044b\u043b\u0438 \u043f\u0430\u0440\u043e\u043b\u044c?"
  },
  en: {
    titleLogin: "Login",
    titleRegister: "Register",
    subtitle: "Sign in to continue learning.",
    subtitleRegister: "Create an account to start learning.",
    heroTitle: "A smart way to learn words",
    heroSubtitle: "Recallio helps you learn and review words without overload or chaos.",
    heroWhy: "Why: we turn reading and interests into steady vocabulary growth.",
    heroBenefitTitle: "Why it helps",
    heroBenefits: [
      "Smart review intervals and calm study flow.",
      "Domain word sets + your own words for focused learning.",
      "Progress tracking and weak-word insights."
    ],
    heroAuthor: "Created by: Kleget",
    heroCtaRegister: "Create account",
    heroCtaLogin: "Sign in",
    email: "Email",
    password: "Password",
    login: "Login",
    register: "Create account",
    loading: "Please wait...",
    switchToRegister: "Create account",
    switchToLogin: "I already have an account",
    forgot: "Forgot password?"
  }
};

async function postJson(path, payload) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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

export default function AuthPage() {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { lang, setLang } = useUiLang();
  const uiLang = lang || "ru";
  const t = TEXT[uiLang] || TEXT.ru;
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const formRef = useRef(null);

  const selectMode = (nextMode) => {
    setMode(nextMode);
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const payload = { email, password, interface_lang: uiLang };
      const path = mode === "login" ? "/auth/login" : "/auth/register";
      const data = await postJson(path, payload);
      setLang(uiLang);

      if (data.email_verified) {
        setCookie("token", data.access_token);
        const me = await getJson("/auth/me", data.access_token);
        if (typeof me.is_admin === "boolean") {
          setCookie("is_admin", me.is_admin ? "1" : "0");
        }
        if (!me.onboarding_done) {
          window.location.href = "/welcome";
        } else {
          window.location.href = "/";
        }
        return;
      }

      if (mode === "login") {
        await postJson("/auth/request-verify", { email });
      }

      const params = new URLSearchParams();
      if (email) {
        params.set("email", email);
      }
      window.location.href = `/auth/verify?${params.toString()}`;
    } catch (err) {
      setError(err.message || "Auth failed. Check credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-hero">
        <div className="auth-hero-grid">
          <div className="auth-hero-text">
            <p className="auth-eyebrow">Recallio</p>
            <h1>{t.heroTitle}</h1>
            <p className="auth-lead">{t.heroSubtitle}</p>
            <p className="auth-why">{t.heroWhy}</p>
            <div className="auth-actions">
              <button type="button" onClick={() => selectMode("register")}>
                {t.heroCtaRegister}
              </button>
              <button
                type="button"
                className="button-secondary"
                onClick={() => selectMode("login")}
              >
                {t.heroCtaLogin}
              </button>
            </div>
            <p className="auth-meta">{t.heroAuthor}</p>
          </div>
          <div className="auth-hero-card">
            <h3>{t.heroBenefitTitle}</h3>
            <ul>
              {t.heroBenefits.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="auth-form panel" ref={formRef}>
        <h2>{mode === "login" ? t.titleLogin : t.titleRegister}</h2>
        <p>{mode === "login" ? t.subtitle : t.subtitleRegister}</p>

        <form onSubmit={submit}>
        <div>
          <label>{t.email}</label>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>
        <div>
          <label>{t.password}</label>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </div>
        <button type="submit" disabled={loading}>
          {loading ? t.loading : mode === "login" ? t.login : t.register}
        </button>
        </form>

        {error ? <p className="error">{error}</p> : null}

        <div className="section">
          <a href="/auth/forgot">{t.forgot}</a>
        </div>

        <button
          type="button"
          className="button-secondary"
          onClick={() => setMode(mode === "login" ? "register" : "login")}
        >
          {mode === "login" ? t.switchToRegister : t.switchToLogin}
        </button>
      </section>
    </main>
  );
}
