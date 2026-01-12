# Recallio

Recallio — сервис для изучения иностранных слов без перегруза. Основа: карточки + тест на вспоминание, повторы по расписанию и видимый прогресс на графике дисциплины. Слова собраны по сферам (корпусам), можно добавлять свои и отслеживать слабые места.

## Зачем
- меньше перегруза и хаоса
- больше закрепления за счёт активного вспоминания
- понятный прогресс: статистика + график

## Ключевые функции
- карточки и тест на вспоминание
- повторы и напоминания (email/telegram)
- слабые слова и мои слова
- тематические сферы (корпуса) и лимиты слов
- график дисциплины с периодами (7/14/30 дней и всё время)
- сообщество: публичный профиль, друзья, общий чат, челленджи
- репорты и поддержка, админ‑редактор слов/переводов
- админка: пользователи, аудит, рассылка уведомлений

## Как это работает
1. Выбираешь язык, сферы и лимиты.
2. Учишь карточки и проходишь тест на вспоминание.
3. Повторяешь вовремя и видишь рост словаря.

## Стек
- Backend: FastAPI, SQLAlchemy (async), Alembic, asyncpg
- БД: PostgreSQL
- Очереди/фоновые задачи: Redis
- Frontend: Next.js (App Router)
- Инфра: Docker Compose, Nginx (на проде)

## Структура проекта
```
english_web/
  api/            # FastAPI API
  web/            # Next.js UI
  infra/          # Docker Compose (Postgres/Redis)
  scripts/        # Скрипты импорта и демо
  .env.example    # Пример настроек
```

## Быстрый старт (локально)
1) Скопируй настройки:
```
cp .env.example .env
```
Заполни `DATABASE_URL`, `ADMIN_EMAILS`, `NEXT_PUBLIC_API_BASE` и прочее.

2) Подними Postgres + Redis:
```
docker compose -f infra/docker-compose.yml up -d
```

3) Установи зависимости API:
```
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r api/requirements.txt
pip install python-multipart
```

4) Применяй миграции:
```
cd api
alembic upgrade head
```

5) Импорт словарей (опционально):
```
python scripts/import_sqlite.py
```

6) Запусти API:
```
uvicorn app.main:app --reload
```

7) Запусти фронт:
```
cd web
npm install
npm run dev
```

Открой: http://localhost:3000

## Переменные окружения (важные)
- `DATABASE_URL` — подключение к Postgres
- `NEXT_PUBLIC_API_BASE` — адрес API для фронта
- `APP_BASE_URL` — адрес фронта
- `ADMIN_EMAILS` — email админов (через запятую)
- `SMTP_*`, `TELEGRAM_BOT_TOKEN` — уведомления
- `MEDIA_DIR`, `MEDIA_URL` — аватары

## Уведомления и фоновые задачи
Фоновый воркер:
```
python scripts/run_jobs.py --loop
```

## Админка
Добавь свой email в `ADMIN_EMAILS`, чтобы видеть админ‑разделы и инструменты модерации.

## Продакшн (кратко)
- Build фронта: `npm run build`
- Запуск API через systemd
- Nginx проксирует `/api` на FastAPI и отдаёт `/media`

---
Проект развивается, цель — сделать обучение слов максимально простым, полезным и честным.
