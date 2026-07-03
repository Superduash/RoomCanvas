# prompt.md — Day 1 Full Application Scaffold

Paste this entire file into your IDE coding agent (Qwen Coder, Gemini, Claude Code, Cline, Kiro) as one prompt. Execute everything below in a single pass. Every file must be complete, real, working code — zero TODOs, zero placeholder functions, zero empty files, zero stub components that render nothing. This is Day 1 of a 13-day plan; the AI inference logic will be replaced with real models on later days, but everything else built today is final, production-shaped code.

---

## 0. What you are building

**InteriorAI** — an app where a user uploads a room photo, picks a design style, and receives 3 AI-redesigned variations of that room with an explanation panel, using this pipeline:

```
Input Room Photo
      ↓
MLSD Structure Detection (extracts wall/window/door lines)
      ↓
CLIP Zero-Shot Room Classification (auto-detects: bedroom/living room/kitchen/office/dining room)
      ↓
Prompt Generator (room type + user-picked style → templated prompt)
      ↓
Batched Diffusion (1 call, 3 variations, different seeds)
      ↓
3 Variations Returned → user picks one → Design Explanation Panel + Generation Summary
```

**Today's job is infrastructure, not AI.** Every AI-facing service (`ClipService`, `MlsdService`, `InferenceService`) must be built as a real, fully-typed interface with a working **mock implementation** that returns deterministic, realistic-shaped fake data. This lets the entire app — upload, progress steps, variation picker, before/after slider, explanation panel, history, regenerate — be run and clicked through today, end to end, with zero GPU and zero external calls. On a later day, only the internals of these service implementations get replaced; no route, schema, or component should need to change.

---

## 1. Tech Stack

```
Frontend:   React (Vite), React Router, Axios, plain CSS modules (no UI kit)
Backend:    Python + FastAPI + Uvicorn
Database:   SQLite via SQLAlchemy ORM
Validation: Pydantic v2 schemas
AI layer:   Fully-typed service interfaces with mock implementations (see Section 5)
Logging:    Python `logging` module, structured, no print statements
```

---

## 2. Full File Structure

Create exactly this structure. Every file listed must be created with complete working content — nothing empty.

```
interior-ai/
├── README.md
├── .gitignore
│
├── backend/
│   ├── requirements.txt
│   ├── .env.example
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                      # FastAPI app, CORS, router mounting, startup/shutdown
│   │   ├── config.py                    # Settings via pydantic-settings, reads .env
│   │   ├── logging_config.py            # Logging setup, one place, imported everywhere
│   │   │
│   │   ├── database/
│   │   │   ├── __init__.py
│   │   │   ├── session.py               # SQLAlchemy engine + session factory + get_db dependency
│   │   │   └── models.py                # ORM models: Generation, Variation
│   │   │
│   │   ├── schemas/
│   │   │   ├── __init__.py
│   │   │   ├── generation.py            # Pydantic: GenerateRequest, GenerateResponse, VariationOut
│   │   │   └── common.py                # HealthResponse, ErrorResponse
│   │   │
│   │   ├── routers/
│   │   │   ├── __init__.py
│   │   │   ├── generate.py              # POST /api/generate
│   │   │   ├── history.py               # GET /api/history, GET /api/history/{id}
│   │   │   └── health.py                # GET /api/health
│   │   │
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── clip_service.py          # ClipService interface + MockClipService
│   │   │   ├── mlsd_service.py          # MlsdService interface + MockMlsdService
│   │   │   ├── inference_service.py     # InferenceService interface + MockInferenceService
│   │   │   ├── prompt_builder.py        # Builds prompt strings from room_type + style
│   │   │   ├── style_templates.py       # Static STYLE_TEMPLATES dict (furniture/palette/budget_tag/reason)
│   │   │   └── generation_orchestrator.py  # Coordinates: mlsd → clip → prompt → inference → save
│   │   │
│   │   ├── repositories/
│   │   │   ├── __init__.py
│   │   │   └── generation_repository.py # DB read/write for Generation + Variation
│   │   │
│   │   └── utils/
│   │       ├── __init__.py
│   │       ├── image_utils.py           # save_upload, load_image, validate_image_file
│   │       └── exceptions.py            # Custom exception classes (InvalidImageError, etc.)
│   │
│   └── storage/
│       ├── uploads/.gitkeep
│       ├── control_images/.gitkeep      # saved MLSD edge maps
│       └── generated/.gitkeep           # saved variation images
│
└── frontend/
    ├── package.json
    ├── vite.config.js
    ├── index.html
    ├── .env.example
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── index.css
        │
        ├── api/
        │   ├── client.js                 # axios instance, base URL from env
        │   └── generationApi.js          # generateDesign(), getHistory(), getGeneration(id)
        │
        ├── context/
        │   └── GenerationContext.jsx     # holds current upload/result state across pages
        │
        ├── hooks/
        │   ├── useGenerate.js            # wraps generationApi with loading/error state
        │   └── useHistory.js
        │
        ├── layouts/
        │   └── MainLayout.jsx            # header + outlet, used by all pages
        │
        ├── pages/
        │   ├── UploadPage.jsx
        │   ├── VariationPicker.jsx
        │   ├── ResultPage.jsx
        │   └── HistoryPage.jsx
        │
        └── components/
            ├── Header.jsx
            ├── StyleSelector.jsx
            ├── ImageDropzone.jsx
            ├── ProgressSteps.jsx
            ├── VariationCard.jsx
            ├── BeforeAfterSlider.jsx
            ├── DesignExplanation.jsx
            ├── GenerationSummary.jsx     # model/room-confidence/style/time card
            ├── LoadingSpinner.jsx
            └── ErrorBanner.jsx
```

---

## 3. Database Schema — Exact Specification

`backend/app/database/models.py` — SQLAlchemy models:

**`Generation` table**
```
id                  INTEGER PRIMARY KEY AUTOINCREMENT
original_image_path TEXT NOT NULL
control_image_path  TEXT               # saved MLSD edge map, nullable until AI wired up
room_type_detected  TEXT               # e.g. "bedroom"
room_confidence     REAL               # 0.0–1.0
style               TEXT NOT NULL      # user-selected style key
prompt_used         TEXT NOT NULL
model_used          TEXT NOT NULL      # e.g. "mock" today, "sd1.5+controlnet-mlsd" later
generation_time_sec REAL               # wall-clock time of the inference call
selected_variation_id INTEGER          # FK to Variation.id, nullable until user picks one
created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

**`Variation` table**
```
id              INTEGER PRIMARY KEY AUTOINCREMENT
generation_id   INTEGER NOT NULL, FOREIGN KEY -> Generation.id
image_path      TEXT NOT NULL
seed            INTEGER NOT NULL
created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

Use SQLAlchemy 2.0-style typed models (`Mapped[...]`, `mapped_column(...)`). Add a `relationship()` from `Generation` to its `Variation` list with `cascade="all, delete-orphan"`. Create tables on startup via `Base.metadata.create_all(bind=engine)` in `main.py`'s startup event — no Alembic migration system today, that's a later-day concern.

---

## 4. Backend — Exact Specifications

### `app/config.py`
`pydantic-settings` `BaseSettings` subclass reading from `.env`:
```
APP_NAME: str = "InteriorAI"
DEBUG: bool = False
DATABASE_URL: str = "sqlite:///./storage/interior_ai.db"
UPLOAD_DIR: str = "./storage/uploads"
CONTROL_IMAGE_DIR: str = "./storage/control_images"
GENERATED_DIR: str = "./storage/generated"
ALLOWED_ORIGINS: str = "*"
MAX_UPLOAD_SIZE_MB: int = 10
```
Export a singleton `settings = Settings()`.

### `app/logging_config.py`
Configure root logger once: timestamp, level, module name, message. No `print()` calls anywhere in the entire backend — every service and router uses `logging.getLogger(__name__)`.

### `app/utils/exceptions.py`
Custom exceptions: `InvalidImageError`, `GenerationNotFoundError`, `InferenceServiceError`. Each carries a message and is caught by a FastAPI exception handler in `main.py`, translated into a proper `ErrorResponse` schema with an appropriate HTTP status code (400/404/500) — never let an unhandled exception leak a raw stack trace to the client.

### `app/utils/image_utils.py`
- `validate_image_file(upload_file) -> None` — checks content-type is one of `image/jpeg, image/png, image/webp`, checks size against `settings.MAX_UPLOAD_SIZE_MB`, raises `InvalidImageError` otherwise.
- `save_upload(upload_file, directory: str) -> str` — generates a UUID-based filename preserving extension, saves the file with `werkzeug`-style safe handling (use `pathlib`), returns the relative path.
- `load_image(path: str) -> PIL.Image.Image`.

### Services — Section 5 covers these in detail (this is the most important part of the file structure).

### `app/repositories/generation_repository.py`
Repository pattern, takes a `Session` in its constructor:
- `create_generation(data: dict) -> Generation`
- `add_variations(generation_id: int, variations: list[dict]) -> list[Variation]`
- `get_by_id(generation_id: int) -> Generation | None`
- `list_all(limit: int = 50) -> list[Generation]`
- `set_selected_variation(generation_id: int, variation_id: int) -> Generation`

All routers and services depend on this repository, never touch the DB session directly — this is the clean-architecture boundary the plan calls for.

### `app/services/generation_orchestrator.py`
This is the coordinator that wires everything together, matching the pipeline diagram exactly:
```python
class GenerationOrchestrator:
    def __init__(self, mlsd_service, clip_service, inference_service, repository):
        ...

    def run(self, image_path: str, style: str) -> Generation:
        """
        1. Load image
        2. mlsd_service.extract_structure(image) -> saves control image, returns path
        3. clip_service.classify_room(image) -> (room_type, confidence)
        4. prompt_builder.build(room_type, style) -> (prompt, negative_prompt)
        5. inference_service.generate_variations(image, control_image_path, prompt, negative_prompt, n=3)
           -> list of (image_path, seed), plus generation_time_sec, plus model_used
        6. repository.create_generation(...) + repository.add_variations(...)
        7. Return the full Generation with its variations loaded
        """
```
Full docstring, full type hints, full try/except around each stage logging which stage failed.

### Routers

| Method | Path | Behavior |
|---|---|---|
| POST | `/api/generate` | multipart: `image` (file), `style` (form field) → validates image → calls `GenerationOrchestrator.run()` → returns `GenerateResponse` (generation id, room_type, confidence, model_used, generation_time_sec, list of 3 variations with id+url) |
| GET | `/api/history` | → list of past `Generation` summaries, most recent first |
| GET | `/api/history/{generation_id}` | → full detail of one generation including all variations; `404` if not found |
| POST | `/api/history/{generation_id}/select/{variation_id}` | marks which variation the user picked, returns updated generation |
| GET | `/api/health` | → `{status: "ok", ai_mode: "mock"}` — `ai_mode` reads from a small module-level flag so later days can flip it to `"real"` without touching this route |

Every route uses FastAPI's `Depends()` for DB session and service injection — no global service instances constructed inside route functions. Every route wrapped by the global exception handlers from Section on `exceptions.py`; no bare `except Exception` swallowing errors silently.

### `app/main.py`
- Creates FastAPI app with title/description from `settings`.
- Adds CORS middleware using `settings.ALLOWED_ORIGINS.split(",")`.
- Registers all three routers under `/api` prefix.
- `@app.on_event("startup")`: create DB tables, ensure `storage/uploads`, `storage/control_images`, `storage/generated` directories exist, log a clear startup banner including `ai_mode`.
- Registers exception handlers for the custom exceptions.
- Serves `storage/` as static files at `/static` so the frontend can load images directly (`StaticFiles` mount).
- Runs with `uvicorn.run(..., host="0.0.0.0", port=int(os.environ.get("PORT", 8000)))` when run directly.

### `backend/requirements.txt`
Pin: `fastapi`, `uvicorn[standard]`, `sqlalchemy`, `pydantic`, `pydantic-settings`, `python-multipart`, `pillow`, `python-dotenv`.

### `backend/.env.example`
```
DEBUG=true
DATABASE_URL=sqlite:///./storage/interior_ai.db
ALLOWED_ORIGINS=*
MAX_UPLOAD_SIZE_MB=10
```

---

## 5. AI Service Layer — The Core of Today's Work

Each service is defined as an **abstract interface** (Python `Protocol` or `ABC`) plus a **complete mock implementation**. The mock implementations must produce realistic, varied, non-trivial output — not `return None` or a single hardcoded value repeated forever. This is what lets the whole app be demoed today.

### `app/services/mlsd_service.py`
```python
class MlsdService(ABC):
    @abstractmethod
    def extract_structure(self, image: Image.Image, save_dir: str) -> str:
        """Extract structural line map from a room image. Returns the saved file path."""

class MockMlsdService(MlsdService):
    """
    Mock implementation: applies a real, simple edge-detection filter
    (PIL's ImageFilter.FIND_EDGES) to the input image and saves it.
    This is NOT the real MLSD model, but it produces a genuinely
    structure-derived image today, not a fake placeholder — a later day
    swaps this class body for a real MLSD model call with zero interface change.
    """
    def extract_structure(self, image: Image.Image, save_dir: str) -> str:
        ...
```
Use PIL's built-in edge-detection filter for the mock — this is real, deterministic, visually meaningful output derived from the actual uploaded image, which is a genuinely useful placeholder rather than a fake one.

### `app/services/clip_service.py`
```python
class ClipService(ABC):
    @abstractmethod
    def classify_room(self, image: Image.Image) -> tuple[str, float]:
        """Returns (room_type, confidence) where room_type is one of the 5 known labels."""

class MockClipService(ClipService):
    """
    Mock implementation: deterministically derives a room_type and confidence
    from a hash of the image bytes, so the SAME image always returns the SAME
    classification during testing (never pure random.random()). Confidence is
    generated in a realistic 0.55–0.97 range, not always exactly 1.0.
    """
```
Room type labels constant: `["bedroom", "living_room", "kitchen", "office", "dining_room"]`.

### `app/services/inference_service.py`
```python
class InferenceService(ABC):
    @abstractmethod
    def generate_variations(
        self,
        original_image: Image.Image,
        control_image_path: str,
        prompt: str,
        negative_prompt: str,
        n: int,
        save_dir: str,
    ) -> tuple[list[dict], float, str]:
        """
        Returns (variations, generation_time_sec, model_used) where each
        variation dict is {"image_path": str, "seed": int}.
        """

class MockInferenceService(InferenceService):
    """
    Mock implementation: generates n variations by applying a distinct,
    deterministic PIL image transform to the original per seed (e.g. slight
    color/contrast/saturation shifts per variation), saves each, and returns
    real elapsed wall-clock time from an actual (short) time.sleep to simulate
    realistic latency (e.g. 1.5s) so the frontend's progress UI has something
    real to show. model_used = "mock-v1".
    """
```
Seeds used: `[42, 123, 777]` — fixed and documented, matching the plan's real seed choice so nothing changes when swapped for real diffusion later.

### `app/services/prompt_builder.py`
```python
def build_prompt(room_type: str, style: str) -> tuple[str, str]:
    """
    Builds (prompt, negative_prompt) from room_type + style using the
    STYLE_TEMPLATES dict. Pure function, fully deterministic, no I/O.
    """
```

### `app/services/style_templates.py`
Full `STYLE_TEMPLATES` dict for all 5 styles (`modern_minimalist`, `scandinavian`, `industrial`, `bohemian`, `luxury_contemporary`), each with real, sensible, non-empty values for `furniture` (list of 4 items), `palette` (list of 3-4 colors), `budget_tag` (one of `"Budget-Friendly" | "Mid-Range" | "Premium"`), and `reason_template` (a string with a `{room_type}` placeholder). Write genuinely sensible content for all 5 — not lorem ipsum, not `"TODO: add furniture"`.

### Service wiring
In `app/routers/generate.py` (or a small `app/dependencies.py`), construct the mock service instances once (module-level singletons) and inject them via FastAPI `Depends()`. Add one clearly-commented block showing exactly which line to change on a later day to swap in a real implementation, e.g.:
```python
# --- Day 1: mock services. On Day 4, replace these two lines: ---
mlsd_service: MlsdService = MockMlsdService()
clip_service: ClipService = MockClipService()
inference_service: InferenceService = MockInferenceService()
# --- with real implementations; no other code in this file changes. ---
```

---

## 6. Frontend — Exact Specifications

### `src/api/client.js`
```javascript
import axios from 'axios';
const API_BASE = import.meta.env.VITE_API_BASE || '/api';
const client = axios.create({ baseURL: API_BASE, timeout: 60000 });
export default client;
```

### `src/api/generationApi.js`
- `generateDesign(imageFile, style) -> Promise` — builds `FormData`, posts to `/generate`.
- `getHistory() -> Promise`
- `getGeneration(id) -> Promise`
- `selectVariation(generationId, variationId) -> Promise`

Every function wrapped in try/catch that rethrows a normalized `{message, status}` error shape so components never have to parse axios error internals directly.

### `src/context/GenerationContext.jsx`
React Context + provider holding: `currentUpload`, `currentResult`, `isGenerating`, `error`, and setter functions. Used so `UploadPage` → `VariationPicker` → `ResultPage` share state without prop drilling.

### `src/hooks/useGenerate.js`
Wraps `generationApi.generateDesign`, exposes `{ generate, isLoading, error, data }`.

### `src/layouts/MainLayout.jsx`
Renders `<Header />` + `<Outlet />`. Used as the root route element in `App.jsx`.

### `src/App.jsx`
React Router setup:
- `/` → `UploadPage`
- `/variations` → `VariationPicker` (redirects to `/` if no current generation in context)
- `/result/:generationId` → `ResultPage`
- `/history` → `HistoryPage`

All wrapped under `MainLayout`.

### Pages

**`UploadPage.jsx`** — `ImageDropzone` + `StyleSelector` (5 styles) + Generate button. On submit: calls `useGenerate`, shows `ProgressSteps` while `isLoading`, on success stores result in context and navigates to `/variations`. On error shows `ErrorBanner`.

**`VariationPicker.jsx`** — reads current generation from context, renders 3 `VariationCard`s in a grid, shows the detected room type + confidence at the top, click a card → calls `selectVariation` → navigates to `/result/:generationId`.

**`ResultPage.jsx`** — fetches generation by id (`useParams`), shows `BeforeAfterSlider` (original vs selected variation), `DesignExplanation`, and `GenerationSummary`. Handles loading/error/not-found states distinctly.

**`HistoryPage.jsx`** — fetches `getHistory()` on mount, renders a grid of past generations (thumbnail, room type, style, date), click → navigates to `/result/:id`. Empty state when no history yet.

### Components

- **`Header.jsx`** — app title + nav links (Upload / History).
- **`StyleSelector.jsx`** — controlled dropdown or radio-card grid over the 5 style keys, `onChange(styleKey)`.
- **`ImageDropzone.jsx`** — drag-and-drop + click-to-upload, shows image preview, `accept="image/*"`, calls `onFileSelected(file)`.
- **`ProgressSteps.jsx`** — props: `currentStep` (`'structure' | 'classification' | 'generation' | 'done'`), renders the 3 real stage names with a checkmark/spinner per step — no fake unrelated messages, these must literally correspond to the orchestrator's 3 stages.
- **`VariationCard.jsx`** — props: `imageUrl`, `seed`, `onClick`, `selected` (bool for styling).
- **`BeforeAfterSlider.jsx`** — a real working drag-slider built with plain React state + CSS `clip-path`, no external library.
- **`DesignExplanation.jsx`** — props: `furniture`, `palette`, `budgetTag`, `reason` — renders a clean panel.
- **`GenerationSummary.jsx`** — props: `modelUsed`, `roomType`, `confidence`, `style`, `generationTimeSec` — renders exactly the "Generation Summary" card format (Model / Room / Style / Generation time).
- **`LoadingSpinner.jsx`**, **`ErrorBanner.jsx`** — small reusable, accept a `message` prop.

### `frontend/package.json`
Vite + React scripts (`dev`, `build`, `preview`), dependencies: `react`, `react-dom`, `react-router-dom`, `axios`.

### `frontend/.env.example`
```
VITE_API_BASE=http://localhost:8000/api
```

### Styling
Plain CSS modules per component (e.g. `Header.module.css`) or one clean `index.css` with CSS variables for a consistent palette — no Tailwind, no component library, keep the dependency footprint minimal for Day 1. Must look intentional and clean, not unstyled — reasonable spacing, a coherent color scheme, readable typography. This is infrastructure day, not design-polish day, but "runs and looks like a real app" is still required.

---

## 7. `.gitignore`
Cover: `node_modules/`, `frontend/dist/`, `__pycache__/`, `*.pyc`, `backend/storage/*.db`, `backend/storage/uploads/*`, `backend/storage/control_images/*`, `backend/storage/generated/*` (keep all `.gitkeep`), `.env`, `*.env`, `.DS_Store`.

## 8. Root `README.md`
Real, complete: project description, the pipeline diagram from Section 0, current status (**"Day 1 — full infrastructure scaffold, AI services running in mock mode"**), local dev instructions for both backend (`pip install -r backend/requirements.txt`, `uvicorn app.main:app --reload` from `backend/`) and frontend (`cd frontend && npm install && npm run dev`), the exact line-swap instructions from Section 5 for enabling real AI later, and the API table from Section 4.

---

## 9. Definition of Done

Do not stop until all of the following are true:

- Every file in Section 2's tree exists with complete, working code — zero TODOs, zero empty files, zero stub functions that just `pass` or `return None` unless that is a real, correct implementation (e.g. an `__init__.py` may legitimately be empty).
- `pip install -r backend/requirements.txt && uvicorn app.main:app --reload` (from `backend/`) starts with no errors, and `/api/health` returns `{"status": "ok", "ai_mode": "mock"}`.
- `POST /api/generate` with a real image file and a valid style returns a complete `GenerateResponse` with 3 variations, a detected room type, a confidence score, and a `generation_time_sec` — tested via `curl` or the FastAPI `/docs` page.
- `npm install && npm run dev` (from `frontend/`) runs with zero console errors and zero build warnings.
- `npm run build` succeeds with zero TypeScript/ESLint errors (if ESLint is configured by the Vite template, it must pass clean).
- The full user flow works by clicking through the running app: upload an image → pick a style → see progress steps → see 3 real (mock-generated but visually distinct) variations → pick one → see the result page with before/after slider, explanation panel, and generation summary → visit history → see the entry → click into it again.
- List every file created, in full, as the final output.

Build all of it now, in order, without pausing for confirmation between files.
