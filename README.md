# RoomCanvas AI Backend

**RoomCanvas AI** is an intelligent interior space redesign application. It implements a robust, two-stage AI pipeline:
1. **Gemini 2.5/3 Flash** for deep multimodal room analysis (detects room types, furniture items, color palettes, dimensions, budget estimates, and generates a tailored design prompt).
2. **`black-forest-labs/flux-kontext-pro` on Replicate** for structure-preserving generation and iterative refinement (e.g. "make the sofa blue").

---

## AI Redesign Pipeline Overview

```
[ Upload Room Photo ]
         │
         ▼
 POST /api/analyze (Gemini 2.5 Flash)
 ├── Analyzes room structure, furniture, colors, and layout
 └── Generates a tailored redesign_prompt matching the style
         │
         ▼
 POST /api/generate (Flux-Kontext-Pro Background Task)
 ├── Schedules the redesign task in the background
 └── Returns "pending" status with generation ID immediately
         │
         ▼
 [ Poll GET /api/history/{id} ]
 └── Wait until status becomes "completed" (or "failed")
         │
         ▼
 POST /api/refine (Iterative Refinement - Flux-Kontext-Pro Task)
 ├── Submits a change instruction (e.g. "make the sofa blue")
 ├── Schedules background task to edit previous generation in-place
 └── Poll GET /api/history/{id} for the updated image
```

---

## Tech Stack

| Layer    | Technology |
|----------|------------|
| API Core | Python 3.12 · FastAPI · Uvicorn |
| Database | SQLite · SQLAlchemy 2.0 · WAL mode |
| Analysis | Google Gemini (SDK: `google-genai`) |
| Redesign | Replicate API (Model: `black-forest-labs/flux-kontext-pro`) |

---

## API Reference

### Core AI Pipeline
* **`POST /api/analyze`**: Upload a room photo and get structured recommendations + the redesign prompt.
  * **Payload**: `multipart/form-data` with `image` (file) and `style` (form field).
  * **Response**: `AnalyzeResponse` containing structured metadata and `analysis_id`.
* **`POST /api/generate`**: Turn an analysis into a redesigned image via a background task.
  * **Payload**: JSON `{ "analysis_id": <int> }`.
  * **Response**: `GenerationOut` with `status: "pending"`.
* **`POST /api/refine`**: Edit an existing generation in-place with a natural language instruction.
  * **Payload**: JSON `{ "generation_id": <int>, "instruction": <str> }`.
  * **Response**: `GenerationOut` (new child generation row, `status: "pending"`).

### History & Selections
* **`GET /api/history`**: List past generations, ordered newest first.
* **`GET /api/history/{id}`** or **`GET /api/generation/{id}`**: Fetch details of a single generation.
* **`POST /api/history/{id}/select/{variation_id}`**: Register which design variation was chosen/saved.
* **`DELETE /api/history/{id}`**: Delete a generation, its variations, and clean up their image files from disk.

### Metadata & Configuration
* **`GET /api/styles`**: Retrieve list of supported style templates and hints.
* **`GET /api/providers`**: Check active status and configuration state of Gemini and Replicate.
* **`GET /api/config`**: Fetch runtime configurations (allowed file types, max upload size).
* **`GET /api/health`**: Basic server health check.

---

## Project Structure

```
backend/
├── app/
│   ├── ai/
│   │   ├── prompts/
│   │   │   ├── schemas.py              # Gemini JSON schemas
│   │   │   └── style_hints.py          # Style definitions / templates
│   │   ├── providers/
│   │   │   ├── base_provider.py        # Abstract AI interfaces
│   │   │   ├── gemini_provider.py      # Google GenAI integration
│   │   │   ├── replicate_provider.py   # Flux-Kontext-Pro integration
│   │   │   └── provider_registry.py    # Provider factory registry
│   │   └── prompt_builder.py           # Sanitization and prompt wrapping
│   ├── database/
│   │   ├── models.py                   # SQLAlchemy ORM schemas
│   │   └── session.py                  # Request & Background SQLite session managers
│   ├── repositories/
│   │   └── generation_repository.py     # Database CRUD operations
│   ├── routers/
│   │   └── (health, analyze, generate, refine, history, styles, providers, config).py
│   ├── schemas/
│   │   ├── common.py                   # Health schemas
│   │   └── generation.py               # Pydantic schemas (Request / Response validation)
│   ├── services/
│   │   ├── analysis_service.py         # Room analysis orchestration
│   │   ├── generation_service.py       # Async generation coordinator
│   │   ├── refinement_service.py       # Async refinement coordinator
│   │   └── storage_service.py          # Image upload, download, and file cleanup
│   ├── utils/
│   │   ├── exceptions.py               # Custom application exceptions
│   │   ├── image_utils.py              # Pillow verification & resizing utilities
│   │   └── request_id.py               # Request tracing middleware helper
│   ├── config.py                       # App settings loader (Pydantic Settings)
│   ├── logging_config.py               # Structured log formatting (UTF-8)
│   └── main.py                         # FastAPI startup & lifecycle management
├── tests/
│   ├── integration/                    # Endpoint & workflow integration tests
│   ├── unit/                           # Repository, image validation, & prompt builder tests
│   └── conftest.py                     # Pytest DB, client, and provider stubs
├── requirements.txt                    # Project package dependencies
└── .env.example                        # Template environment configuration file
```

---

## Local Development Setup

### Prerequisites
- Python 3.12+
- Gemini API Key
- Replicate API Token

### Firebase Admin Setup

#### Local Development
1. Download Firebase Admin SDK JSON from your Firebase Console.
2. Place it inside:
   `backend/credentials/firebase-admin.json`
3. Ensure the folder remains ignored by Git (already configured in `.gitignore`).

#### Production (Render)
1. Open Render Dashboard.
2. Go to Environment Variables.
3. Create:
   `FIREBASE_SERVICE_ACCOUNT_JSON`
4. Paste the ENTIRE Firebase Admin JSON file contents as the value.
5. Remove any dependency on a physical credentials file in your Render build/start commands.

### Setup
1. **Initialize and Activate Virtual Environment**:
   ```bash
   cd backend
   python -m venv venv
   venv\Scripts\activate      # On Windows
   # source venv/bin/activate # On macOS/Linux
   ```

2. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure Environment Variables**:
   Copy `.env.example` to `.env` and fill in your real API credentials:
   ```bash
   copy .env.example .env
   ```

4. **Start the FastAPI Development Server**:
   ```bash
   python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
   ```
   Interactive API docs will be available at **http://127.0.0.1:8000/docs**.

5. **Run the Test Suite**:
   Verify everything is fully functional by running:
   ```bash
   python -m pytest
   ```

---

## License

Private — all rights reserved.
