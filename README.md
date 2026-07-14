# RoomCanvas — Interactive Interior Redesign Web Application Using Multimodal Analysis and Diffusion-Based Image Synthesis

RoomCanvas is a full-stack, AI-powered web application that allows users to upload photos of interior spaces and generate photorealistic redesigns. By combining state-of-the-art vision-language models (for spatial analysis) and advanced diffusion models (for image synthesis), RoomCanvas intelligently restyles rooms while strictly preserving their original architectural geometry, camera perspective, and lighting constraints.

---

## 🌟 Key Highlights & Features

### Core Capabilities
* **Multimodal Room Analysis:** Analyzes uploaded photos to detect room type, map architectural features (walls, windows, doors, ceiling height), identify existing furniture, and estimate space occupancy.
* **Structure-Preserving Image Synthesis:** Generates high-quality redesigns using diffusion models, ensuring the original room layout and camera angle remain completely intact.
* **Iterative Refinement:** Allows users to refine generated designs by providing targeted text instructions (e.g., "remove the coffee table", "change the sofa to green velvet").
* **Smart Measurement System:** Includes an interactive calibration tool to estimate real-world distances between points in the room using known reference objects (e.g., standard doors).
* **Project & Timeline Management:** Groups generations into projects. Users can view their history, compare before/after results using an interactive slider, and branch off variations.

### Technical Features
* **Bring Your Own Key (BYOK):** Users can supply their own API keys (Gemini, Replicate, Groq) via secure server-side Fernet-encrypted storage to bypass platform limits.
* **Real-time SSE Updates:** Uses Server-Sent Events (SSE) for zero-latency UI updates during background image generation, with automatic failover polling.
* **Provider Fallback Chain:** Implements a robust registry pattern to seamlessly failover between AI providers (e.g., if the primary LLM is rate-limited).
* **Progressive Web App (PWA):** Fully installable on mobile and desktop devices with offline caching for static assets.

---

## 🏗️ System Architecture

RoomCanvas operates on a decoupled client-server architecture:

1. **Client (React/Vite):** Manages local state (Zustand), server state (TanStack Query), and complex animations (Framer Motion). It securely uploads images directly or proxies them through the backend.
2. **API (FastAPI):** Serves as the orchestration layer. It handles authentication verification, database transactions, background task scheduling, and secure communication with AI providers.
3. **Data Layer:** Uses asynchronous SQLAlchemy with a relational database (SQLite for local, PostgreSQL for production) to track users, projects, generations, and variations.
4. **Storage:** Relies on Supabase Storage for persistent image hosting (both original uploads and generated variations).
5. **Cache:** Utilizes Redis (Upstash) for API rate limiting and aggressive caching of history/project timelines.

---

## 🧠 AI Pipeline

The redesign process is a two-step orchestrated pipeline:

### 1. Prompt Pipeline (Analysis)
* **Providers:** Gemini (Vision) or Groq (Text fallback).
* **Process:** The model receives the raw image and a strict JSON schema. It returns a structured breakdown of the room's architecture, existing furniture (classified as keep/replace), lighting direction, and spatial occupancy.
* **Output:** A deterministic JSON payload used to construct the final layout-locking prompt.

### 2. Generation Pipeline (Synthesis)
* **Providers:** Replicate (Flux Kontext Pro / specialized architectural diffusion models).
* **Process:** The backend merges the user's stylistic choices, advanced customizations (budget, color, constraints), and the structured analysis data into a complex prompt.
* **Constraint Locking:** The prompt explicitly forbids the diffusion model from altering walls, windows, doors, or camera angles, enforcing verbs like "change" instead of "transform".
* **Execution:** Runs as a FastAPI `BackgroundTask`. The UI streams the status via SSE until the webhook or polling confirms the image is ready.

---

## 💻 Technology Stack

### Frontend
* **Framework:** React 18, Vite, TypeScript
* **Styling:** Tailwind CSS, Radix UI primitives, Framer Motion
* **State Management:** Zustand (UI state), TanStack Query (Server state)
* **Routing:** React Router v6
* **Network:** Fetch API, `@microsoft/fetch-event-source` (for SSE)

### Backend
* **Framework:** FastAPI, Python 3.12, Uvicorn/Gunicorn
* **Database:** SQLAlchemy 2.0 (Async), SQLite (Dev) / PostgreSQL (Prod)
* **Authentication:** Firebase Admin SDK (JWT verification)
* **Storage:** Supabase Storage (boto3 / REST)
* **Caching & Rate Limiting:** Redis (Upstash)
* **Cryptography:** Fernet (for BYOK encryption)

---

## 📂 Project Structure

```text
RoomCanvasAI/
├── backend/                  # FastAPI Application
│   ├── app/
│   │   ├── ai/               # AI Provider integrations & Prompt builders
│   │   ├── auth/             # Firebase auth & dependencies
│   │   ├── cache/            # Redis cache invalidation logic
│   │   ├── database/         # SQLAlchemy models & session
│   │   ├── measurement/      # Image calibration & vanishing point math
│   │   ├── middleware/       # Rate limiting & request tracking
│   │   ├── repositories/     # Data Access Objects (DAOs)
│   │   ├── routers/          # API endpoint controllers
│   │   └── services/         # Core business logic (Generation, Storage)
│   ├── requirements.txt
│   └── .env.example
├── frontend/                 # React Application
│   ├── src/
│   │   ├── api/              # API client and React Query hooks
│   │   ├── components/       # Reusable UI components
│   │   ├── hooks/            # Custom React hooks
│   │   ├── pages/            # Route-level components
│   │   ├── store/            # Zustand stores
│   │   └── styles/           # Tailwind base & utilities
│   ├── vite.config.ts
│   └── package.json
└── render.yaml               # Deployment configuration
```

---

## 🚀 Installation & Setup

### Prerequisites
* Node.js 20+
* Python 3.12+
* Supabase Account (for Storage)
* Firebase Project (for Authentication)
* API Keys (Gemini, Replicate, Upstash Redis)

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/RoomCanvasAI.git
cd RoomCanvasAI
```

### 2. Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Frontend Setup
```bash
cd ../frontend
npm install
```

---

## ⚙️ Environment Variables

Create a `.env` file in the `backend/` directory. Use `.env.example` as a reference.

```env
# Application
APP_NAME="RoomCanvas AI"
DEBUG=true

# Database (Use SQLite for local)
DATABASE_URL=sqlite:///./storage/interior_ai.db

# Security & CORS
ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
FERNET_SECRET_KEY=your_generated_fernet_key # Generate via python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"

# AI Providers
ACTIVE_ANALYSIS_PROVIDER=gemini
ACTIVE_GENERATION_PROVIDER=replicate
GEMINI_API_KEY=your_gemini_api_key
REPLICATE_API_TOKEN=your_replicate_token

# Redis Cache (Upstash)
UPSTASH_REDIS_URL=your_upstash_redis_url
UPSTASH_REDIS_TOKEN=your_upstash_redis_token

# Supabase Storage
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
SUPABASE_BUCKET=roomcanvas

# Firebase Auth
FIREBASE_SERVICE_ACCOUNT_JSON={"type": "service_account", ...}
```

---

## 🏃 Running Locally

You can use the provided batch script on Windows to start both servers, or run them manually.

**Start Backend (Terminal 1):**
```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

**Start Frontend (Terminal 2):**
```bash
cd frontend
npm run dev
```

The frontend will be available at `http://localhost:5173` and the backend API docs at `http://localhost:8000/docs`.

---

## ☁️ Deployment

### Backend (Render)
RoomCanvas is configured for deployment on [Render](https://render.com) using the included `render.yaml` blueprint.
1. Connect your repository to Render.
2. Select **New** > **Blueprint**.
3. Render will automatically provision the Python web service based on `render.yaml`.
4. Add your secrets (API keys, Supabase credentials, Firebase JSON) in the Render dashboard.

### Frontend (Vercel / Netlify)
1. Connect the `frontend/` directory to Vercel or Netlify.
2. Set the build command to `npm run build` and output directory to `dist`.
3. Set the environment variable `VITE_API_URL` to your deployed Render backend URL (e.g., `https://roomcanvas-backend.onrender.com`).

---

## 🔮 Future Improvements
* **3D Mesh Extraction:** Integrating depth-map analysis to export basic 3D floor plans.
* **E-Commerce Integration:** Matching generated furniture to real-world products via reverse image search.
* **Multi-Angle Consistency:** Generating consistent room designs across different camera angles of the same space.

---

## 📄 License

This project is proprietary. All rights reserved.
