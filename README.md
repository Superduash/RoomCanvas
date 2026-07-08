# RoomCanvas AI

**RoomCanvas AI** is an intelligent interior space redesign application. Upload a photo of any room, choose a design aesthetic, and receive three AI-generated variations — complete with a colour palette, furniture recommendations, and a design rationale.

---

## Pipeline Overview

```
Room Photo
   ↓
Prompt Builder
(auto-formats room type + user-selected style → templated prompt)
   ↓
AI Service
(orchestrates the generation workflow via unified provider interface)
   ↓
Replicate Provider (or any future provider)
(Batched Inference: 1 call · 3 seeds · 3 design variations)
   ↓
User selects a variation → Design Explanation Panel + Generation Summary
```

---

## Tech Stack

| Layer     | Technology                                    |
|-----------|-----------------------------------------------|
| Frontend  | React 18 + Vite + Vanilla CSS                 |
| Backend   | Python 3.12 · FastAPI · SQLAlchemy 2 · SQLite |
| AI        | Replicate API (Model: adirik/interior-design) |

---

## API Reference

| Method | Path | Description |
|--------|------|-------------|
| `GET`  | `/api/health` | Server status + AI mode |
| `POST` | `/api/generate` | Run pipeline → 3 variations |
| `GET`  | `/api/history` | List all past generations |
| `GET`  | `/api/history/{id}` | Single generation detail |
| `POST` | `/api/history/{id}/select/{var_id}` | Lock a variation choice |

Full interactive docs: **http://localhost:8000/docs**

---

## Local Development

### Prerequisites

- Python 3.12+
- Node.js 18+
- Replicate API Token (`REPLICATE_API_TOKEN`)

### Backend & AI

```bash
# Create + activate virtual environment (at project root)
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # macOS / Linux

pip install -r backend/requirements.txt
pip install replicate

# Copy environment config
copy backend\.env.example backend\.env         # Windows
# cp backend/.env.example backend/.env         # macOS / Linux

# Make sure to add your REPLICATE_API_TOKEN to backend/.env!

# Start the API server (port 8000)
# Ensure the root folder is in the Python path so the ai module is found
set PYTHONPATH=.
uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000
```

### Frontend

```bash
cd frontend

npm install

# Start the Vite dev server (port 3000)
npm run dev
```

Open **http://localhost:3000** in your browser.

---

## Design Styles

| Key | Style | Budget Tier |
|-----|-------|-------------|
| `modern_minimalist` | Modern Minimalist | Mid-Range |
| `scandinavian` | Scandinavian | Budget-Friendly |
| `industrial` | Industrial | Mid-Range |
| `bohemian` | Bohemian | Budget-Friendly |
| `luxury_contemporary` | Luxury Contemporary | Premium |

---

## Provider Architecture

We use a modular `Provider` pattern for all AI models. Changing models or providers (e.g., to OpenAI or local Stable Diffusion) is as easy as modifying the `ACTIVE_PROVIDER` in `ai/config.py` and implementing `BaseAIProvider`.

---

## Project Structure

```
RoomCanvas AI/
├── ai/
│   ├── config.py                  # AI parameters and model selection
│   ├── service.py                 # Main entry point for the backend
│   ├── storage.py                 # File download and saving handlers
│   ├── formatter.py
│   ├── providers/
│   │   ├── base_provider.py       # Abstract Base Provider
│   │   ├── registry.py            # Provider factory
│   │   └── replicate_provider.py  # Replicate implementation
│   ├── prompts/
│   │   ├── builder.py
│   │   ├── negative.py
│   │   └── system.py
│   ├── services/
│   │   └── orchestrator.py        # Pipeline workflow coordinator
│   ├── styles/
│   │   └── templates.py
│   └── image/
│       ├── preprocess.py
│       └── postprocess.py
├── backend/
│   ├── app/
│   │   ├── config.py              # App settings
│   │   ├── main.py                # FastAPI app
│   │   ├── database/
│   │   ├── repositories/
│   │   ├── routers/
│   │   ├── schemas/
│   │   └── utils/
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   └── package.json
├── docs/
│   └── plan.md
├── scripts/
│   └── export.py
└── README.md
```

---

## License

Private — all rights reserved.
