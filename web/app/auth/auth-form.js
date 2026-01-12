"use client";

import { useState } from "react";

import { setCookie } from "../lib/client-cookies";
import { useUiLang } from "../ui-lang-context";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

const TEXT = {
  ru: {
    titleLogin: "Вход",
    titleRegister: "Регистрация",
    subtitleLogin: "Войдите, чтобы продолжить обучение.",
    subtitleRegister: "Создайте аккаунт, чтобы начать обучение.",
    email: "Email",
    password: "Пароль",
    login: "Войти",
    register: "Создать аккаунт",
    loading: "Подождите...",
    switchToRegister: "Создать аккаунт",
    switchToLogin: "У меня уже есть аккаунт",
    forgot: "Забыли пароль?"
  },
  en: {
    titleLogin: "Login",
    titleRegister: "Register",
    subtitleLogin: "Sign in to continue learning.",
    subtitleRegister: "Create an account to start learning.",
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

export default function AuthForm({ mode = "login" }) {
  const formMode = mode === "register" ? "register" : "login";
  const isLogin = formMode === "login";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { lang, setLang } = useUiLang();
  const uiLang = lang || "ru";
  const t = TEXT[uiLang] || TEXT.ru;
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const payload = { email, password, interface_lang: uiLang };
      const path = isLogin ? "/auth/login" : "/auth/register";
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

      if (isLogin) {
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

  const switchHref = isLogin ? "/auth/register" : "/auth/login";
  const switchLabel = isLogin ? t.switchToRegister : t.switchToLogin;
  const title = isLogin ? t.titleLogin : t.titleRegister;
  const subtitle = isLogin ? t.subtitleLogin : t.subtitleRegister;

  return (
    <main className="auth-page">
      <section className="panel auth-panel">
        <h1>{title}</h1>
        <p>{subtitle}</p>

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
            {loading ? t.loading : isLogin ? t.login : t.register}
          </button>
        </form>

        {error ? <p className="error">{error}</p> : null}

        {isLogin ? (
          <div className="section">
            <a href="/auth/forgot">{t.forgot}</a>
          </div>
        ) : null}

        <button
          type="button"
          className="button-secondary auth-switch"
          onClick={() => (window.location.href = switchHref)}
        >
          {switchLabel}
        </button>
      </section>
    </main>
  );
}
