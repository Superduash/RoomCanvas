# RoomCanvas AI

**RoomCanvas AI** is an intelligent interior space redesign application. Upload a photo of any room, choose a design aesthetic, and receive three AI-generated variations — complete with a colour palette, furniture recommendations, and a design rationale.

---

## Pipeline Overview

```
Room Photo
   ↓
MLSD Structure Detection
(extracts wall / window / door lines → ControlNet edge-map)
   ↓
CLIP Zero-Shot Room Classification
(detects: bedroom / living room / kitchen / office / dining room)
   ↓
Prompt Builder
(room type + user-selected style → templated Stable Diffusion prompt)
   ↓
Batched Diffusion Inference
(1 call · 3 seeds · 3 design variations)
   ↓
User selects a variation → Design Explanation Panel + Generation Summary
```

---

## Tech Stack

| Layer     | Technology                                    |
|-----------|-----------------------------------------------|
| Frontend  | React 18 + Vite + Vanilla CSS                 |
| Backend   | Python 3.12 · FastAPI · SQLAlchemy 2 · SQLite |
| AI (Day 4)| ControlNet (MLSD) · CLIP · Stable Diffusion   |

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

### Backend

```bash
cd backend

# Create + activate virtual environment
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # macOS / Linux

pip install -r requirements.txt

# Copy environment config
copy .env.example .env         # Windows
# cp .env.example .env         # macOS / Linux

# Start the API server (port 8000)
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
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

## Connecting Real AI (Day 4)

Open [`backend/app/routers/generate.py`](backend/app/routers/generate.py) and replace the three mock service lines:

```python
# Replace these with real PyTorch implementations:
_mlsd_service: MlsdService = MockMlsdService()
_clip_service: ClipService = MockClipService()
_inference_service: InferenceService = MockInferenceService()
```

The orchestrator, routers, repositories, and all frontend code require **zero changes**.

---

## Project Structure

```
RoomCanvas AI/
├── backend/
│   ├── app/
│   │   ├── config.py                  # Pydantic settings
│   │   ├── main.py                    # FastAPI app + lifespan
│   │   ├── logging_config.py
│   │   ├── database/
│   │   │   ├── models.py              # SQLAlchemy ORM models
│   │   │   └── session.py
│   │   ├── repositories/
│   │   │   └── generation_repository.py
│   │   ├── routers/
│   │   │   ├── health.py
│   │   │   ├── generate.py
│   │   │   └── history.py
│   │   ├── schemas/
│   │   │   ├── common.py
│   │   │   └── generation.py
│   │   ├── services/
│   │   │   ├── clip_service.py        # ABC + MockClipService
│   │   │   ├── inference_service.py   # ABC + MockInferenceService
│   │   │   ├── mlsd_service.py        # ABC + MockMlsdService
│   │   │   ├── generation_orchestrator.py
│   │   │   ├── prompt_builder.py
│   │   │   └── style_templates.py
│   │   └── utils/
│   │       ├── exceptions.py
│   │       └── image_utils.py
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── index.html
│   ├── package.json
│   └── src/
│       ├── api/
│       ├── components/
│       ├── constants/
│       ├── context/
│       ├── hooks/
│       ├── layouts/
│       └── pages/
├── AI_Interior_Design_13Day_Plan_v2.md
└── README.md
```

---

## License

Private — all rights reserved.
