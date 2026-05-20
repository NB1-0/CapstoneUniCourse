# IntelliCourse AI 🎓

**AI-powered multimodal university/course discovery and learning path recommendation platform**

A production-quality SaaS platform that helps students search for courses using natural language, analyze skill gaps, generate personalized learning paths, and map courses to career goals.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER BROWSER                             │
│              Next.js 14 Frontend (TypeScript + Tailwind)        │
└──────────────────────────┬──────────────────────────────────────┘
                           │ REST API
┌──────────────────────────▼──────────────────────────────────────┐
│                    FastAPI Backend (Python)                      │
│                                                                  │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │  API Routes  │  │   Agents     │  │      Services          │ │
│  │  /search     │  │ CourseRetrie-│  │  LLMService (GPT-4o)  │ │
│  │  /recommend  │  │ val Agent    │  │  EmbeddingService      │ │
│  │  /learning-  │  │ SkillGap     │  │  SearchService         │ │
│  │  path        │  │ Agent        │  │    (BM25 + Semantic)   │ │
│  │  /skill-gap  │  │ LearningPath │  │  CacheService (Redis)  │ │
│  │  /career-    │  │ Agent        │  └────────────────────────┘ │
│  │  align       │  │ CareerAlign  │                              │
│  │  /ingest     │  │ Agent        │  ┌────────────────────────┐ │
│  │  /courses    │  │ AdvisorAgent │  │      Databases         │ │
│  │  /health     │  └──────────────┘  │  PostgreSQL (users)    │ │
│  └─────────────┘                     │  ChromaDB (vectors)    │ │
│                                      │  Redis (cache)         │ │
│  ┌─────────────────────────────────┐ └────────────────────────┘ │
│  │         Ingestion Pipeline      │                              │
│  │  CSV/JSON → Clean → Embed →     │                              │
│  │  BM25 Index + Vector Index      │                              │
│  └─────────────────────────────────┘                              │
└─────────────────────────────────────────────────────────────────┘
```

### AI Pipeline Flow

```
User Query
  → Intent Detection (GPT-4o / rule-based fallback)
  → Hybrid Search (BM25 × 0.4 + Semantic × 0.6)
  → Cross-encoder Reranking (ms-marco-MiniLM-L-6-v2)
  → Agent Routing (Search / SkillGap / LearningPath / Career)
  → LLM Synthesis (GPT-4o advisor-style response)
  → Redis Cache → Response
```

---

## Project Structure

```
intelli-course-ai/
├── backend/
│   ├── app/
│   │   ├── main.py               # FastAPI app + lifespan
│   │   ├── config.py             # Pydantic Settings
│   │   ├── api/routes/           # 8 route handlers
│   │   ├── agents/               # 5 modular agents
│   │   │   ├── base_agent.py
│   │   │   ├── course_retrieval_agent.py
│   │   │   ├── skill_gap_agent.py
│   │   │   ├── learning_path_agent.py
│   │   │   ├── career_alignment_agent.py
│   │   │   └── advisor_agent.py
│   │   ├── services/             # LLM, Embedding, Search, Cache
│   │   ├── models/               # SQLAlchemy + dataclasses
│   │   ├── schemas/              # Pydantic request/response
│   │   ├── db/                   # PostgreSQL, ChromaDB, Redis
│   │   ├── ingestion/            # CSV/JSON ingestion pipeline
│   │   └── evaluation/           # Quality evaluation scripts
│   ├── tests/                    # pytest test suite
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── app/                      # Next.js App Router pages
│   │   ├── page.tsx              # Landing page
│   │   ├── dashboard/
│   │   ├── finder/               # AI Course Finder (chat UI)
│   │   ├── learning-path/
│   │   ├── skill-gap/
│   │   ├── career/
│   │   ├── saved/
│   │   └── settings/
│   ├── components/               # React components
│   │   ├── ui/                   # shadcn-style primitives
│   │   ├── Sidebar.tsx
│   │   ├── Navbar.tsx
│   │   ├── ChatInput.tsx
│   │   ├── CourseCard.tsx
│   │   ├── RecommendationPanel.tsx
│   │   ├── LearningPathTimeline.tsx
│   │   ├── SkillGapChart.tsx
│   │   ├── CareerMatchCard.tsx
│   │   ├── CourseComparisonTable.tsx
│   │   └── DashboardStats.tsx
│   ├── lib/                      # API client + utilities
│   ├── hooks/                    # Custom React hooks
│   ├── types/                    # TypeScript interfaces
│   └── Dockerfile
├── data/
│   ├── courses.csv               # 30 sample Coursera-style courses
│   └── seed.py                   # API seeding script
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## Quick Start

### Option 1: Mock Mode (No API Keys Required)

The app works fully **without any API keys** in mock mode — using BM25 + cosine similarity over in-memory course data and realistic mock AI responses.

```bash
# 1. Clone and navigate
cd intelli-course-ai

# 2. Start backend (Python 3.11+)
cd backend
pip install -r requirements.txt
# Leave OPENAI_API_KEY empty in .env to use mock mode
uvicorn app.main:app --reload --port 8000

# 3. Start frontend (Node.js 20+)
cd ../frontend
npm install
npm run dev

# 4. Open http://localhost:3000
```

### Option 2: Full Production Mode (with API Key)

```bash
# 1. Copy environment file
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY

# 2. Start all services with Docker
docker-compose up -d

# 3. Seed the database
cd data && python seed.py

# 4. Open http://localhost:3000
```

### Option 3: Docker Compose (Full Stack)

```bash
cp .env.example .env  # Add OPENAI_API_KEY if desired
docker-compose up --build
# Services: backend:8000, frontend:3000, postgres:5432, redis:6379, chromadb:8001
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENAI_API_KEY` | *(empty)* | Leave empty for mock mode |
| `OPENAI_MODEL` | `gpt-4o` | OpenAI chat model |
| `EMBEDDING_MODEL` | `text-embedding-3-large` | Embedding model |
| `CHROMA_HOST` | `localhost` | ChromaDB host |
| `CHROMA_PORT` | `8001` | ChromaDB port |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection URL |
| `DATABASE_URL` | `postgresql+asyncpg://...` | PostgreSQL URL |
| `TOP_K_RESULTS` | `10` | Max search results |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Backend URL for frontend |

---

## API Documentation

Interactive API docs: **http://localhost:8000/docs**

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check + service status |
| `GET` | `/api/courses` | List courses (paginated, filterable) |
| `POST` | `/api/search` | AI semantic course search |
| `POST` | `/api/recommend` | Personalized course recommendations |
| `POST` | `/api/learning-path` | Generate structured learning path |
| `POST` | `/api/skill-gap` | Analyze skill gap for target role |
| `POST` | `/api/career-align` | Career alignment analysis |
| `POST` | `/api/ingest` | Ingest courses from CSV/JSON |

### Example Requests

```bash
# Search
curl -X POST http://localhost:8000/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "machine learning for beginners", "top_k": 5}'

# Learning Path
curl -X POST http://localhost:8000/api/learning-path \
  -H "Content-Type: application/json" \
  -d '{"goal": "Become a Data Scientist", "current_level": "beginner"}'

# Skill Gap
curl -X POST http://localhost:8000/api/skill-gap \
  -H "Content-Type: application/json" \
  -d '{"target_role": "Machine Learning Engineer", "current_skills": ["Python", "SQL"]}'
```

---

## Dataset Ingestion

### Using the included CSV

```bash
curl -X POST http://localhost:8000/api/ingest \
  -d '{"source": "csv", "file_path": "data/courses.csv"}'
```

### Loading sample data (built-in, no file needed)

```bash
curl -X POST http://localhost:8000/api/ingest -d '{"source": "sample"}'
# OR use the seed script:
python data/seed.py
```

### Adding your own Coursera dataset

Export a CSV with these columns (extras are ignored):
```
course_name, organization, description, skills, difficulty_level, rating, course_url, prerequisites
```

---

## Running Tests

```bash
cd backend
pytest tests/ -v
```

The test suite runs entirely in **mock mode** (no external services needed).

---

## Demo Workflow

1. Open **http://localhost:3000** → landing page
2. Click **"Get Started"** → dashboard
3. Go to **AI Course Finder** → type `"I want to become a data scientist"`
4. View recommendations with relevance scores and "why recommended" explanations
5. Go to **Skill Gap** → enter `Data Scientist` + your current skills
6. See your readiness score and missing skills with course recommendations
7. Go to **Learning Path** → type your goal → get a phased roadmap
8. **Save** courses and compare them side-by-side in **Saved Courses**
9. Go to **Settings** → test backend connection, manage skill profile

---

## Tech Stack Summary

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS, Framer Motion, Recharts |
| UI Components | Custom shadcn-style + Radix UI primitives |
| Backend | FastAPI, Python 3.11, Pydantic v2, async/await |
| AI/LLM | OpenAI GPT-4o (mock fallback included) |
| Embeddings | text-embedding-3-large / BAAI/bge-large-en-v1.5 |
| Reranking | cross-encoder/ms-marco-MiniLM-L-6-v2 |
| Search | BM25 (rank-bm25) + Semantic (ChromaDB) |
| Cache | Redis (with in-memory fallback) |
| Database | PostgreSQL + SQLAlchemy (with in-memory fallback) |
| Vector DB | ChromaDB (with numpy cosine fallback) |
| Containers | Docker + Docker Compose |

---

## Agents

| Agent | Responsibility |
|-------|---------------|
| `CourseRetrievalAgent` | Hybrid search + reranking |
| `SkillGapAgent` | Role-to-skills mapping + gap analysis |
| `LearningPathAgent` | Phased roadmap generation |
| `CareerAlignmentAgent` | Career-to-course alignment scoring |
| `AdvisorAgent` | Intent detection + agent orchestration |

---

## Future Improvements

- [ ] User authentication (OAuth2 / JWT)
- [ ] Neo4j skill prerequisite graph
- [ ] LangGraph multi-agent orchestration
- [ ] DeepEval / RAGAS automated evaluation suite
- [ ] Real-time course availability from Coursera API
- [ ] PDF resume parsing to auto-detect skills
- [ ] Collaborative filtering (user × user similarity)
- [ ] Course completion tracking + certificates
- [ ] Slack / Discord integration for learning reminders
- [ ] Multi-language support

---

## License

MIT License — built for educational and portfolio purposes.

> **Note:** This project runs in **mock mode by default** when no `OPENAI_API_KEY` is provided. All AI features work using deterministic mock responses and BM25 keyword search over the included 30-course dataset.
