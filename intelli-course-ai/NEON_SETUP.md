# Neon Serverless PostgreSQL Setup

---

## Step 1 — Create a Neon account and project

1. Go to [https://console.neon.tech](https://console.neon.tech) and sign up (free tier available)
2. Click **"New Project"**, name it `intellicourse`, choose a region
3. Click **"Create Project"**

---

## Step 2 — Get your connection string

Neon gives you **two URL formats**. Either works — pick whichever Neon shows you.

### Format A — SNI endpoint (`pg.neon.tech`)

```
psql -h pg.neon.tech -U neondb_owner@<project-name> -d neondb
```

For the app `.env`, URL-encode the `@` in the username as `%40`:

```
DATABASE_URL=postgresql+asyncpg://neondb_owner%40<project-name>:<password>@pg.neon.tech/neondb
```

**Example:**
```
DATABASE_URL=postgresql+asyncpg://neondb_owner%40intellicourse-abc123:MyPass123@pg.neon.tech/neondb
```

### Format B — Per-endpoint URL

```
DATABASE_URL=postgresql+asyncpg://neondb_owner:<password>@ep-cool-name-123456.us-east-2.aws.neon.tech/neondb
```

> **SSL is added automatically.** The backend detects `neon.tech` in the URL and sets `ssl=require` via asyncpg — do **not** append `?sslmode=require` yourself.

---

## Step 3 — Configure your .env

```bash
# From intelli-course-ai/
cp .env.example .env
```

Edit `.env`:

```env
# Paste your DATABASE_URL here (either Format A or B from above)
DATABASE_URL=postgresql+asyncpg://neondb_owner%40intellicourse-abc123:MyPass123@pg.neon.tech/neondb

# Point at the Coursera dataset
COURSES_DATA_PATH=../data/coursea_data.csv
```

---

## Step 4 — Initialize the database and seed courses

```bash
cd backend
pip install -r requirements.txt

# Seed with full 891-course Coursera dataset
python scripts/init_db.py --csv ../data/coursea_data.csv

# OR seed with built-in 30-course sample
python scripts/init_db.py
```

Expected output:
```
Connecting to: postgresql+asyncpg://neondb_owner%40intellicourse...
Connected: database=neondb
Tables created (or already exist).
Ingesting courses from: ../data/coursea_data.csv
Ingested 891 courses.
Done! Your database is ready.
```

---

## Step 5 — Start the app

```bash
# Terminal 1 — backend
cd backend
uvicorn app.main:app --reload --port 8000

# Terminal 2 — frontend
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Troubleshooting

| Error | Fix |
|-------|-----|
| `SCRAM authentication requires SSL` | Make sure URL contains `pg.neon.tech` or `neon.tech` so the backend adds SSL automatically |
| `password authentication failed` | Re-copy the password from Neon console exactly |
| `could not translate host name "pg.neon.tech"` | Check your internet connection / DNS |
| `endpoint is disabled` | Neon auto-suspends; it wakes on next connection (~1 second) |
| `invalid username` when using pg.neon.tech | URL-encode the `@` in username: `user%40project` not `user@project` |

---

## psql quick test

```bash
psql -h pg.neon.tech -U neondb_owner@<project-name> -d neondb
# Enter your password when prompted
# Then run: \dt   — should show the 'courses' table after seeding
```
