"""
Initialize the Neon (or local) PostgreSQL database and seed it with courses.

Uses asyncpg directly (no SQLAlchemy / greenlet dependency).

Usage:
  cd intelli-course-ai
  python backend/scripts/init_db.py                           # seeds sample courses
  python backend/scripts/init_db.py --csv data/coursea_data.csv  # seeds full dataset
"""
import asyncio
import argparse
import json
import os
import ssl
import sys
from pathlib import Path
from urllib.parse import urlparse, parse_qs

# Ensure backend is on path
sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
load_dotenv()


def _parse_neon_url(database_url: str) -> dict:
    """Parse DATABASE_URL into asyncpg.connect() kwargs."""
    # Normalise prefix
    url = database_url
    for prefix in ("postgresql+asyncpg://", "postgresql://", "postgres://"):
        if url.startswith(prefix):
            url = "postgresql://" + url[len(prefix):]
            break

    parsed = urlparse(url)
    qs = parse_qs(parsed.query)

    kwargs: dict = {
        "host": parsed.hostname,
        "port": parsed.port or 5432,
        "user": parsed.username,
        "password": parsed.password,
        "database": parsed.path.lstrip("/"),
    }

    sslmode = qs.get("sslmode", [None])[0]
    is_neon = "neon.tech" in (parsed.hostname or "")

    if is_neon or sslmode in ("require", "verify-ca", "verify-full"):
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        kwargs["ssl"] = ctx

    return kwargs


CREATE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS courses (
    id TEXT PRIMARY KEY,
    course_name TEXT NOT NULL,
    organization TEXT NOT NULL,
    description TEXT,
    skills JSONB DEFAULT '[]',
    difficulty_level TEXT,
    rating FLOAT DEFAULT 0.0,
    course_url TEXT DEFAULT '',
    prerequisites JSONB DEFAULT '[]',
    certificate_type TEXT DEFAULT '',
    students_enrolled INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
)
"""


async def main(csv_path: str | None = None):
    import asyncpg

    database_url = os.environ.get("DATABASE_URL", "")
    if not database_url:
        print("ERROR: DATABASE_URL is not set. Create a .env file first.")
        sys.exit(1)

    print(f"Connecting to Neon...")
    kwargs = _parse_neon_url(database_url)
    print(f"  host={kwargs['host']}")
    print(f"  user={kwargs['user']}")
    print(f"  database={kwargs['database']}")

    try:
        conn = await asyncpg.connect(**kwargs)
    except Exception as e:
        print(f"\nERROR: Could not connect — {e}")
        print("Check your DATABASE_URL in .env")
        sys.exit(1)

    # Create table
    await conn.execute(CREATE_TABLE_SQL)
    row = await conn.fetchrow("SELECT current_database(), version()")
    print(f"\nConnected!  database={row[0]}")
    print(f"            {row[1][:60]}")
    print("Tables created (or already exist).\n")

    # Load courses from file or sample
    if csv_path:
        target = Path(csv_path)
        if not target.exists():
            print(f"ERROR: File not found: {csv_path}")
            await conn.close()
            sys.exit(1)
        print(f"Loading courses from: {csv_path}")
        import pandas as pd
        from app.ingestion.ingest import _build_course

        df = pd.read_csv(target, on_bad_lines="skip")
        df = df.loc[:, ~df.columns.str.match(r"^Unnamed")]
        rows = df.to_dict(orient="records")
        courses = []
        for r in rows:
            try:
                courses.append(_build_course(r))
            except Exception as e:
                print(f"  Skipping row: {e}")
    else:
        print("Loading built-in sample data (40 courses)...")
        from app.ingestion.ingest import SAMPLE_COURSES, _build_course
        courses = [_build_course(r) for r in SAMPLE_COURSES]

    # Wipe existing and insert fresh
    await conn.execute("TRUNCATE courses")

    insert_sql = """
        INSERT INTO courses
          (id, course_name, organization, description, skills, difficulty_level,
           rating, course_url, prerequisites, certificate_type, students_enrolled)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
    """
    inserted = 0
    for c in courses:
        try:
            await conn.execute(
                insert_sql,
                c.id, c.course_name, c.organization, c.description,
                json.dumps(c.skills), c.difficulty_level, c.rating,
                c.course_url, json.dumps(c.prerequisites),
                c.certificate_type, c.students_enrolled,
            )
            inserted += 1
        except Exception as e:
            print(f"  Skipping {c.course_name[:40]}: {e}")

    count = await conn.fetchval("SELECT count(*) FROM courses")
    print(f"Inserted {inserted} courses -> {count} total in database.")

    # Show sample
    sample = await conn.fetch(
        "SELECT course_name, organization, difficulty_level, students_enrolled "
        "FROM courses ORDER BY students_enrolled DESC LIMIT 5"
    )
    print("\nTop 5 by enrollment:")
    for r in sample:
        print(f"  {r['course_name'][:42]:42s} | {r['difficulty_level']:12s} | {r['students_enrolled']:>10,}")

    await conn.close()
    print("\nDone! Your Neon database is ready.")
    print("Start the backend:  uvicorn app.main:app --reload --port 8000")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--csv", metavar="PATH", help="Path to coursea_data.csv")
    args = parser.parse_args()
    asyncio.run(main(args.csv))
