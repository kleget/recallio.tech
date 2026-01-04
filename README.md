# English Web

Minimal scaffold for the web app.

## Local Dev
1. Start infra:
   docker compose -f infra/docker-compose.yml up -d
2. API:
   cd api
   python -m venv .venv
   .venv\Scripts\activate
   pip install -r requirements.txt
   uvicorn app.main:app --reload
3. Web:
   cd web
   npm install
   npm run dev

## Migrations
1. Ensure DB is running (docker compose).
2. From api/:
   alembic revision --autogenerate -m "initial"
   alembic upgrade head

## Import from SQLite
1. Ensure DB is running and migrations applied.
2. From repo root:
   api\.venv\Scripts\activate
   python scripts\import_sqlite.py --sqlite-dir E:\Code\english_project\database
