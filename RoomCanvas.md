# RoomCanvas AI — Master Technical Reference Document

**Full title:** RoomCanvas — Interactive Interior Redesign Web Application Using Multimodal Analysis and Diffusion-Based Image Synthesis

**Document purpose:** This is the definitive, exhaustive technical reference for the RoomCanvas AI project, extracted directly from the production codebase (frontend + backend) and the project README. It is written to serve as the single source of truth for producing a full academic/internship project report without needing to re-inspect the source code.

---

## 1. Project Overview

### 1.1 What the project is

RoomCanvas AI is a full-stack, AI-powered web application that allows a user to photograph or upload an image of any interior space — a bedroom, living room, kitchen, or any other room — and receive a photorealistic redesign of that same room in a chosen interior design style. Unlike a purely generative "imagine a room" tool, RoomCanvas is built around **structure preservation**: the output image is not a new, unrelated room — it is *the user's actual room*, with the same walls, windows, doors, camera angle, and architectural geometry, but restyled with new furniture, colors, materials, and decor.

The system is delivered as a responsive, installable Progressive Web Application (PWA) with a React/TypeScript frontend and a Python/FastAPI backend, backed by a two-stage AI pipeline: a vision-language model (Google Gemini, with Groq as an alternate text-analysis provider) performs structured spatial analysis of the uploaded photo, and a diffusion-based image synthesis model (Replicate's `flux-kontext-pro`, a Flux Kontext image-editing model) performs the actual visual redesign.

### 1.2 The real-world problem it solves

Interior redesign is traditionally expensive and slow. Hiring an interior designer, ordering physical mood boards, or manually creating 3D renders in tools like SketchUp or AutoCAD requires specialized skills, software licenses, and days or weeks of turnaround. At the same time, most people struggle to visualize how a room would actually look with different furniture, wall colors, or a different design style, purely from imagination or a text description.

RoomCanvas closes this gap by letting anyone — a homeowner, a renter, a student, or a working architect/designer — take a single photo of an existing room and get an AI-generated, photorealistic visualization of what that same room could look like in a different style, in under two minutes, at effectively zero marginal cost per design (beyond API usage). It also solves the harder, less-obvious problem of **iterative decision-making**: real design decisions are rarely made in one shot. A user might like the overall redesign but want to swap out one piece of furniture, change a color, or add plants — RoomCanvas supports this through targeted natural-language refinement without discarding previous progress or committing to a value first.

Additionally, RoomCanvas addresses a secondary, very concrete pain point for anyone actually planning a renovation: knowing real-world measurements from a photo. The built-in Measure Room feature lets a user calibrate a photo against a known reference object (such as an A4 sheet of paper) and then measure the real-world size of anything else visible in that same photo, entirely from the 2D image, without needing a tape measure or a site visit.

### 1.3 Why it was developed

The project was developed to demonstrate a complete, production-grade, end-to-end application of modern generative AI to a genuinely useful real-world domain — architecture and interior design — while exercising the full breadth of modern full-stack engineering: secure authentication, asynchronous background processing, real-time client updates, resilient third-party API orchestration, structured prompt engineering, responsive/mobile-first UI design, and cloud deployment. It was built to go meaningfully beyond a toy "call an AI API and show the image" demo, incorporating professional concerns such as rate limiting, provider fallback chains, encrypted user-supplied API keys (Bring Your Own Key), caching, and a project/version data model that mirrors how real creative tools (like Figma or Photoshop's history panel) manage iterative work.

### 1.4 Target users

- **Homeowners and renters** who want to visualize redecorating or renovating a space before spending money on furniture or paint.
- **Interior designers and architects** who want a fast way to generate concept visuals for clients directly from a site photo, without manual rendering.
- **Real estate agents / property stagers** who want to show a property's potential in different styles without physically staging it.
- **Students and hobbyists** exploring interior design styles and layouts.

### 1.5 Motivation

The motivation behind RoomCanvas combines a practical product motivation (democratizing access to interior design visualization) with a technical motivation (building a rigorous showcase of applied generative AI engineering — multimodal analysis, prompt engineering for structure-locked image editing, and building the surrounding product infrastructure that makes an AI feature genuinely usable and reliable rather than a fragile demo).

---

## 2. Project Objectives

### 2.1 Short-term objectives
- Allow a user to upload a room photo and receive a stylistically redesigned version of that same room.
- Support a defined set of interior design styles (e.g., Modern Minimalist, Scandinavian, and others defined in the styles catalog).
- Allow the user to refine a generated design with natural-language text instructions.
- Provide user authentication (email/password and Google Sign-In) so designs are tied to an account.
- Provide a history/library view of all past designs.

### 2.2 Long-term objectives
- Support iterative, versioned design workflows, where every refinement is tracked as part of a single project's timeline rather than being a disconnected one-off generation.
- Support a real-world measurement tool so users can extract accurate physical dimensions from their room photos.
- Support "Bring Your Own Key" (BYOK) so the application is not permanently bottlenecked by the platform operator's own AI provider quotas/costs.
- Build toward richer spatial understanding (e.g., 3D extraction, multi-angle consistency — see Future Scope).

### 2.3 Technical objectives
- Demonstrate a clean separation of concerns across a repository, service, and router layered backend architecture.
- Demonstrate asynchronous, non-blocking I/O throughout the backend (async SQLAlchemy, async HTTP clients, background tasks).
- Demonstrate real-time client updates via Server-Sent Events (SSE) rather than naive polling alone.
- Demonstrate resilient handling of third-party AI provider failures (timeouts, rate limits) via retry logic and provider fallback chains.
- Demonstrate secure handling of sensitive data (Firebase-verified authentication, encrypted API key storage, secure image storage).

### 2.4 User objectives
- Get a usable, good-looking redesign quickly, without needing design software or expertise.
- Be able to correct or refine a design instead of starting over from scratch.
- Be able to compare the "before" and "after" easily via an interactive slider.
- Be able to access previous designs at any time via the history/library.
- Be able to take real-world measurements from their own room photos.

### 2.5 Business objectives
- Provide a viable product architecture that could plausibly support a freemium or usage-based commercial model (the BYOK system, rate limiting, and per-provider cost structure are all consistent with a real commercial SaaS product, not just a prototype).
- Keep operating costs controllable via rate limiting, caching, and BYOK, so platform-side AI costs do not scale linearly and uncontrollably with user growth.

---

## 3. Unique Selling Points

1. **True structure preservation, not just style transfer.** The generation pipeline is explicitly engineered (via prompt-level "composition lock" rules) to keep the room's walls, windows, doors, ceiling height, and camera framing identical between the original and redesigned image. Most consumer "AI room redesign" tools either regenerate the whole scene loosely or require expensive depth-map/3D pipelines; RoomCanvas achieves strong structural fidelity purely through carefully engineered prompting on top of an image-editing (not text-to-image) diffusion model.

2. **Occupancy-aware generation.** The system doesn't treat every room the same way. Gemini's analysis stage classifies the room's `space_occupancy` (mostly empty, partially furnished, or densely furnished) and estimates `open_floor_area_pct`. The generation prompt then branches: an already-cluttered, furniture-packed room is restyled *in place* (existing furniture recolored/refinished) rather than having new large furniture crammed into a space that cannot physically hold it, while a mostly empty room is furnished more freely. This is a meaningfully different, more realistic behavior than naive one-size-fits-all diffusion prompting.

3. **True iterative refinement with version history**, not one-shot generation. Every generation is modeled as part of a project tree (`parent_generation_id` self-referencing foreign key), so a user's sequence of prompts ("remove the sofa" → "add plants" → "make the walls blue") is preserved as a browsable, scrollable version timeline under one project, rather than producing disconnected, duplicate library entries.

4. **Bring Your Own Key (BYOK) architecture with a full provider fallback chain.** Users can optionally supply their own Gemini, Replicate, or Groq API keys (encrypted at rest with Fernet symmetric encryption). The backend's provider registry tries, in strict priority order, the user's own key first, then the platform's shared key, across multiple providers — meaning a single missing/rate-limited provider does not necessarily break the app for a user who has their own key configured elsewhere.

5. **Real-time generation feedback via Server-Sent Events**, not naive fixed-interval polling alone — combined with a resilient fallback poll, so a dropped SSE connection cannot leave a user stuck on a loading screen indefinitely.

6. **Built-in single-view photogrammetry (Measure Room).** A genuinely non-trivial computer vision feature — calibrating pixel-to-real-world scale from a known reference object's four tapped corners, and using dual-edge scale comparison to detect and quantify perspective distortion, giving the user a live confidence rating (high/medium/low) on any measurement rather than a black-box number.

7. **Progressive Web App with offline-capable static asset caching**, installable directly to a phone's home screen, with a native camera-capture-friendly upload flow — meaning the tool is realistically usable standing in the room being redesigned, not just at a desktop.

8. **Production-grade resilience engineering**, including automatic retry with exponential backoff for transient AI-provider failures, explicit rate-limit-aware retry (detecting HTTP 429 responses and waiting out the provider's advertised reset window), Redis-backed request rate limiting per user/IP, and graceful analysis fallback if the vision-language provider fails entirely (the app degrades to a manual-refinement flow instead of crashing).

---

## 4. Complete Feature List

### 4.1 Authentication & Account Management
- **Email/password sign-up and sign-in**, via Firebase Authentication, with a "remember me" toggle controlling whether the session persists across browser restarts (`browserLocalPersistence`) or only for the current tab session (`browserSessionPersistence`).
- **Google Sign-In**, using Firebase's `GoogleAuthProvider` with `signInWithPopup`, and an automatic fallback to `signInWithRedirect` if the popup is blocked or closed by the browser (common on strict mobile browsers).
- **Forgot password / reset password flow**, using Firebase's email action link system, with a dedicated `AuthActionPage` to handle the redirected action link.
- **Email verification banner**, which re-checks the user's verification status whenever the browser tab regains focus.
- **Backend user sync**, where after any successful Firebase authentication, the frontend calls `POST /api/auth/sync` to create/update a corresponding row in the backend's own `users` table (keyed by Firebase UID), decoupling the backend's user identity from Firebase's token format.
- **Profile setup flow** (`SetupProfilePage`), allowing the user to set a username, avatar/photo, bio, and complete their profile after first sign-up.
- **Settings page**, including theme preference (light/dark/system), notification preferences, and account management.

### 4.2 Room Upload & Camera Capture
- **Drag-and-drop or file-picker image upload**, built on `react-dropzone`.
- **Native camera capture support**, allowing a user to take a photo directly (particularly relevant on mobile, since the app is installable as a PWA).
- **Image cropping**, via `react-easy-crop`, letting the user adjust framing before submission.
- **Client-side image validation** (file type/size) before upload, with matching server-side validation (`validate_image_file`) as a security backstop.
- **Style selection**, choosing from a catalog of predefined interior design styles (served from `GET /api/styles`), each with a style hint used later in prompt construction.

### 4.3 Multimodal Room Analysis
- Uploading an image and a chosen style triggers `POST /api/analyze`, which sends the image to the active analysis provider (Gemini by default, Groq as an alternate text-oriented provider) along with a strict JSON-schema prompt.
- The analysis extracts: detected room type and confidence, architectural features (implied via layout notes), a furniture inventory with per-item description and estimated price range, an estimated room size (width/length in feet with a confidence rating), a suggested color palette (named colors with hex codes), lighting suggestions, an estimated total redesign budget range, a style-appropriateness explanation, a full natural-language "redesign prompt" describing the intended new look, a `space_occupancy` classification (mostly_empty / partially_furnished / densely_furnished), and an `open_floor_area_pct` numeric estimate of how much of the visible floor is currently unobstructed.
- If the AI provider fails or times out, the backend returns a graceful fallback analysis response so the user flow does not hard-crash — the user can still proceed to a manual refinement path.

### 4.4 AI-Powered Redesign Generation
- `POST /api/generate` triggers the actual image synthesis, running as a FastAPI `BackgroundTask` so the HTTP request returns immediately while generation continues server-side.
- The backend constructs a "composition-locked" prompt combining: the Gemini-authored redesign prompt, architectural preservation instructions, occupancy-aware furniture-placement guidance, and any user customization (style override, budget, specific color preferences, lighting preference, constraints).
- The image generation call goes to Replicate's `flux-kontext-pro` model via the `replicate` Python SDK, with `aspect_ratio` explicitly pinned to `match_input_image` (so portrait photos stay portrait) and `output_format` set to PNG.
- Automatic retry (via `tenacity`) on transient failures — network errors, timeouts, and HTTP 429 rate-limit responses — with exponential backoff that respects the provider's advertised rate-limit reset window.
- On success, the resulting image is downloaded, stored (via Supabase Storage), and recorded as a `Variation` row linked to the parent `Generation`.

### 4.5 Real-Time Generation Progress
- The frontend subscribes to `GET /api/generation/{id}/status`, a Server-Sent Events (SSE) endpoint, using `@microsoft/fetch-event-source`.
- A cosmetic multi-step progress stepper ("Analyzing layout" → ... → "Generating photorealistic render...") animates while the backend genuinely processes the request, and fast-forwards early if the backend finishes before the minimum animation time elapses.
- A backup low-frequency poll runs alongside the SSE stream as a safety net in case the SSE connection is silently dropped by an intermediary proxy.
- On completion, the user is automatically redirected to the results page for that project/version.

### 4.6 Iterative Refinement (Natural-Language Editing)
- From the results page, a user can type a free-text instruction (e.g., "change the sofa to blue," "add indoor plants," "remove the coffee table") into the Design Editor Panel.
- This calls `POST /api/refine`, which builds a targeted refinement prompt instructing the model to apply *only* the requested change and preserve everything else exactly as-is, using the currently displayed image (not the original photo) as the input to the diffusion model.
- Each refinement creates a new child `Generation` row (`parent_generation_id` pointing at the generation it was refined from), so the full edit history of a project is preserved as a linear/branching tree.
- Users can also fully "Regenerate" (re-roll a new variation from the same brief, no text instruction) as a distinct action from targeted refinement.

### 4.7 Version History & Project Management
- Every project (identified by its root `Generation`, the one with no parent) exposes a full version timeline (`GET /api/projects/{id}`), listing every descendant generation in the refinement tree.
- The results page renders this as a horizontally scrollable "Version History" strip beneath the main output image, letting the user jump back to and view any earlier version.
- A distinct "Save version" action lets a user explicitly mark/select a particular variation as the representative one for a generation, separate from simply continuing to prompt further changes.
- The Library/History view (`GET /api/history`) lists projects grouped at the root level — refinements and regenerations never appear as separate, duplicate library entries — and automatically excludes any project whose entire generation tree failed (no successful completed generation anywhere in it), so failed attempts do not clutter the user's library.

### 4.8 Before/After Comparison
- The results page includes an interactive comparison slider (drag handle) showing the original photo on one side and the redesigned image on the other, plus alternate view modes (side-by-side, final-only).

### 4.9 Download & Share
- Users can download the generated design image directly.
- A native share action lets the user share the design via the device's share sheet (mobile) or equivalent.

### 4.10 Measure Room (Single-View Photogrammetry)
- A dedicated overlay tool (`MeasurementOverlay`) lets the user calibrate real-world scale against a known reference object (credit card, A4 paper, US Letter paper, standard door, or a fully custom length) by tapping all four corners of the reference object in the photo.
- The user specifies whether the tapped edge corresponds to the object's width or height dimension.
- The backend computes scale independently from both the reference object's top edge and left edge in pixels, compares the two resulting scale estimates, and reports a computed confidence level (high/medium/low) based on how much they disagree — a proxy for how much perspective distortion is present in the shot.
- The user can then tap any two points elsewhere in the same photo to get a real-world distance measurement in centimeters (or the app's chosen unit), with the confidence score displayed alongside the result.
- The measurement tool supports toggling between measuring on the original photo and the latest generated/redesigned version of the same room.

### 4.11 Bring Your Own Key (BYOK)
- Under Settings, a user can supply their own API keys for Gemini, Replicate, and/or Groq.
- Keys are transmitted over HTTPS and encrypted at rest server-side using Fernet symmetric encryption (`cryptography` library) before being stored in the `user_api_keys` table; only the encrypted ciphertext is persisted.
- The backend's provider registry checks for a user-supplied key first (per provider, per capability) before falling back to the platform's own configured key, providing users a way to bypass platform-level rate limits.

### 4.12 Search
- A global command-palette-style search (`GlobalSearch`, built on `cmdk`) lets a user quickly jump to a specific past project.

### 4.13 Progressive Web App
- Installable to a device's home screen (`vite-plugin-pwa` + Workbox), with a custom manifest (name, icons, theme colors, app shortcuts — e.g., a "New Design" shortcut that deep-links straight to the upload page), and runtime caching of Google Fonts and other static assets for offline resilience of the app shell.

---

## 5. End-to-End User Workflow

1. **Landing page.** An unauthenticated visitor lands on the marketing/landing page describing RoomCanvas's capabilities, with calls-to-action to sign up or sign in.
2. **Sign up / Sign in.** The user authenticates via email/password or "Continue with Google." On first sign-up, Firebase issues an ID token; the frontend calls the backend to sync/create the corresponding user record. New users are guided through a short profile setup step.
3. **Upload page.** The authenticated user uploads or photographs a room, optionally crops it, and selects an interior design style from the style catalog.
4. **Analysis submission.** The frontend calls `POST /api/analyze` with the image and style. The backend validates the image, stores the original upload (Supabase Storage), and sends the image plus a structured prompt to the analysis provider (Gemini). The response includes room type, furniture inventory, dimensions, color palette, budget estimate, occupancy classification, and a generated redesign prompt. This is displayed to the user as an "Analysis" screen summarizing what the AI observed and intends to do.
5. **Generation kickoff.** The user confirms (optionally adjusting customization — budget, specific colors, lighting preference, constraints) and triggers generation. The frontend calls `POST /api/generate`, which creates a `pending` `Generation` row and immediately schedules a background task, returning right away.
6. **Real-time progress.** The frontend opens an SSE connection to `/api/generation/{id}/status` and drives a multi-step animated progress indicator ("Analyzing layout," "Applying style," ..., "Generating photorealistic render...") synchronized with genuine backend progress, with a backup poll as a safety net. Meanwhile, the backend downloads the original image, builds the full composition-locked generation prompt (incorporating occupancy-aware guidance), and calls Replicate's `flux-kontext-pro` model, retrying automatically on transient failures or rate limiting.
7. **Completion & redirect.** Once the backend marks the generation `completed` (and stores the resulting image as a `Variation`), the SSE stream emits the final status, and the frontend automatically navigates the user to the results page for that project.
8. **Results page.** The user sees an interactive before/after comparison slider, the current style badge, and an action row (Download, Share, Measure Room, Regenerate, Save version). Below the image, a scrollable Version History timeline shows every prior generation/refinement in this project.
9. **Refinement loop (optional, repeatable).** The user types a natural-language instruction into the Design Editor Panel and applies it. The frontend shows the same live 4-step progress UI while `POST /api/refine` runs in the background, chaining from the currently displayed image (not the original photo), and on completion updates the results page in place with the new version added to the timeline. The user can repeat this indefinitely, or navigate back to any earlier version in the timeline and branch from there.
10. **Measure Room (optional).** From the results page, the user opens the Measure Room overlay, taps the four corners of a known reference object in either the original or the latest generated photo, confirms which edge (width/height) was tapped, and then taps two points anywhere else in the image to get a real-world distance measurement with a confidence rating.
11. **Save / Download / Share.** The user can explicitly save a particular version, download the final image, or share it via the device's native share functionality.
12. **History / Library.** At any point, the user can revisit `HistoryPage`, which lists all of their projects (grouped, not duplicated, with failed-only projects excluded), each showing its latest completed thumbnail and metadata, and can reopen any project to continue refining or reviewing it.
13. **Settings / Profile.** The user can manage their profile, theme preference, notification settings, and optionally configure their own BYOK API keys for Gemini, Replicate, or Groq.

---

## 6. Complete System Architecture

RoomCanvas is built as a decoupled client-server web application:

### 6.1 High-level architecture layers

1. **Client (React 19 + Vite + TypeScript).** Renders the UI, manages local/UI state (Zustand) and server state (TanStack React Query), handles authentication directly against Firebase Auth on the client, and communicates with the backend over a REST + SSE API.
2. **API layer (FastAPI, Python 3.12).** Verifies authentication (Firebase Admin SDK token verification), exposes REST endpoints organized by domain router, orchestrates calls to AI providers, manages background task scheduling for long-running generation work, and enforces rate limiting.
3. **Service layer.** Encapsulates business logic (e.g., `GenerationService`, `AnalysisService`, `RefinementService`, `KeyService`, `StorageService`), keeping routers thin and logic testable/reusable.
4. **Repository layer.** Encapsulates all direct database access (`GenerationRepository`), keeping SQL/ORM concerns out of the service layer.
5. **Data layer.** Asynchronous SQLAlchemy 2.0 ORM over SQLite (local development) or PostgreSQL (production), storing users, generations, and variations.
6. **Object storage.** Supabase Storage holds all persistent image assets — original uploads and every generated variation — decoupling image persistence from the backend's own (ephemeral, redeploy-wiped) filesystem.
7. **Cache & rate-limit layer.** Redis (hosted on Upstash) is used both for caching (styles catalog, config, project timelines/history) and for a sliding-window request rate limiter applied per authenticated user (or per-IP for unauthenticated requests) on sensitive endpoints.
8. **AI provider layer.** A provider-registry pattern abstracts over multiple interchangeable AI vendors for two capability types — "text/analysis provider" (Gemini or Groq) and "image/generation provider" (Replicate or Gemini's own image capability as a fallback) — resolving, per request, the best available provider given the user's own BYOK keys and the platform's configured keys.

### 6.2 Authentication flow
- The client authenticates directly against Firebase Authentication (email/password or Google OAuth via popup/redirect).
- Firebase issues a signed ID token to the client.
- Every authenticated API request from the frontend attaches this token as a Bearer token in the `Authorization` header.
- The backend's `get_current_user` dependency (in `app/auth/dependencies.py`) verifies this token against Firebase Admin SDK, then looks up (or the client separately syncs) a corresponding row in the backend's own `users` table, giving the rest of the backend a normal integer `user_id` to work with rather than dealing with Firebase UIDs everywhere.
- This means the backend never handles raw passwords; Firebase is the sole authentication authority, and the backend's role is limited to verifying tokens and maintaining its own mirrored user profile data.

### 6.3 API communication
- Standard REST/JSON over HTTPS for all synchronous operations (auth sync, analyze, generate/refine kickoff, history, measurement, styles/config, user API key management).
- Server-Sent Events (SSE, via `sse-starlette`) for real-time generation status streaming, chosen over WebSockets because the communication is strictly one-directional (server → client status pushes) and SSE integrates more simply with standard HTTP infrastructure/proxies.
- CORS is explicitly configured via an allow-list of origins (`ALLOWED_ORIGINS` environment variable), with credentials enabled for authenticated cross-origin requests from the deployed frontend domain.
- Every response includes security headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection`, `Strict-Transport-Security`) and a request-tracking header (`X-Request-ID`) plus a processing-time header (`X-Process-Time`) injected by a global middleware, aiding observability and debugging.

### 6.4 AI providers
- See Section 7 (AI Architecture) for full detail. In summary: Gemini (via `google-genai`) is the primary analysis (vision-language) provider, with Groq as an alternate text-oriented provider; Replicate's `flux-kontext-pro` is the primary image generation/editing provider, with Gemini's own image capability configured as a fallback generation provider.

### 6.5 Storage
- All persistent images (originals and generated variations) are stored in Supabase Storage (an S3-compatible object store built on Postgres + a storage API), accessed via the `supabase` Python SDK. This was a deliberate architectural choice to avoid storing generated images on the backend's own local filesystem, since platforms like Render use ephemeral filesystems that are wiped on every redeploy — without object storage, all previously generated designs would be lost on every backend deployment.

### 6.6 Database
- See Section 12 (Database Design) for full schema detail. In summary: `users`, `generations` (self-referential tree via `parent_generation_id`), `variations` (one-to-many under a generation), and `user_api_keys` (BYOK, one row per user per provider).

### 6.7 Image processing pipeline
1. Client-side crop/validate.
2. Server-side validation (`validate_image_file`) — MIME type and size checks.
3. Upload to Supabase Storage, recording the resulting path.
4. Image bytes passed to the analysis provider for structured multimodal analysis.
5. Image bytes (either the original, for a fresh generation, or the most recent variation's image, for a refinement) passed to the image generation provider along with the constructed prompt.
6. Resulting generated image bytes downloaded from the provider's returned URL and re-uploaded to Supabase Storage as a `Variation`.

### 6.8 Generation pipeline
Implemented in `GenerationService` — see Section 7.3 for full detail on prompt construction. Runs as a FastAPI `BackgroundTask`, using a dedicated, freshly-created async database session per background execution (rather than reusing the request-scoped session), which avoids stale-read issues in long-running background work.

### 6.9 Refinement pipeline
Implemented in `RefinementService` — takes a targeted natural-language instruction, resolves the correct base image (the currently selected/most recent variation of the generation being refined, not the original upload), and creates a new child `Generation` linked via `parent_generation_id` to preserve the version tree.

### 6.10 History & Library
`GenerationRepository.list_projects()` groups all generations by their root ancestor, returning one entry per project (never one entry per individual refinement), each annotated with its latest completed generation, its version count, and its most recent activity timestamp; projects with zero completed generations anywhere in their tree are excluded entirely from this list.

### 6.11 Caching
Redis-backed caching (via `upstash-redis`) is used for: the (rarely changing) styles catalog, application config values (e.g., max upload size), and — most impactfully — completed generation/project data, reducing repeated database round-trips for frequently-viewed history and result pages. Caches are warmed proactively at application startup (in the FastAPI `lifespan` handler) so the very first user requests after a deploy are already fast.

### 6.12 Deployment
See Section 15 (Deployment Architecture) for full detail. In summary: backend on Render (via a `render.yaml` blueprint), frontend on Vercel (or Netlify), Redis on Upstash, object storage on Supabase, authentication on Firebase.

---

## 7. AI Architecture

### 7.1 Multimodal Analysis

The analysis stage is the first AI call in the pipeline, performed by `AnalysisService`, which delegates to whichever `AnalysisProvider` the provider registry resolves (Gemini by default). The provider receives the raw uploaded image bytes plus a strict, schema-constrained prompt (`ANALYSIS_PROMPT_V1` in `prompt_builder.py`) instructing it to return a fully structured JSON object matching `ANALYSIS_RESPONSE_SCHEMA` (defined in `app/ai/prompts/schemas.py`). This schema is enforced at the API call level (using Gemini's structured-output / JSON-schema response mode), not merely requested via prompt wording, which materially increases reliability versus free-form text parsing.

The extracted structured fields include: room type and confidence, a furniture inventory (each item with a description and estimated price range, implicitly informing what should be kept vs. replaced), estimated room dimensions with a confidence rating, a suggested color palette (named colors + hex values), lighting suggestions, an estimated total redesign budget range, a style-fit explanation, a full natural-language redesign prompt intended to drive the generation stage, and — critically for occupancy-aware generation — a `space_occupancy` classification (`mostly_empty` / `partially_furnished` / `densely_furnished`) and a numeric `open_floor_area_pct` estimate.

### 7.2 Prompt Engineering & Prompt Builder

All prompt construction is centralized in `backend/app/ai/prompt_builder.py`, which is the single most important AI-engineering artifact in the codebase. It contains:

- **`ANALYSIS_PROMPT_V1`** — the structured-analysis instruction prompt sent to the vision-language model, including explicit instructions to assess occupancy/open-floor-area alongside the standard design analysis fields.
- **A "composition lock" preamble** — a reusable block of instructions prepended to every generation/refinement prompt, explicitly forbidding the diffusion model from altering the room's walls, windows, doors, ceiling height, or camera framing/angle, and instructing it to use verbs like "change" or "restyle" rather than "transform" or "recreate," which measurably biases the diffusion model toward smaller, structure-preserving edits rather than a full scene reimagining.
- **`build_generation_prompt()`** — combines the Gemini-authored redesign prompt, the composition lock, any architectural hints, occupancy-aware space guidance (branching behavior described below), the user's customization inputs (style override, budget, specific colors, lighting preference, constraints), and — for a "regenerate with instruction" case — the user's typed instruction appended as an explicit "Additionally: ..." clause.
- **`build_refinement_prompt()`** — a more targeted prompt used specifically for the `/api/refine` flow, explicitly instructing the model to apply *only* the requested change and preserve every other visual aspect of the currently displayed image exactly as-is.
- **`DESIGN_PRINCIPLES`** and a quality/photorealism suffix — shared blocks of general interior-design and rendering-quality guidance (symmetry, focal points, realistic lighting) appended to every generation prompt, with an explicit carve-out so these symmetry/placement rules do not override the occupancy guidance when a room is already densely furnished.
- **`style_hints.py`** — per-style descriptive hints (materials, color tendencies, mood) merged into the prompt based on the user's selected design style.

### 7.3 Occupancy-Aware Generation Logic

`build_generation_prompt()` reads the analysis stage's `space_occupancy` and `open_floor_area_pct` values and branches its furniture-placement instructions:

- **`densely_furnished`** (or `open_floor_area_pct < 25`): instructs the model *not* to add large new furniture (no new sofas, wardrobes, dining sets, or beds), and instead to restyle existing furniture pieces in place (recolor/refinish where they already sit), only adding small-footprint items (a side table, a floor lamp, a small plant, wall art, a rug) in genuinely open pockets of space, and never overlapping new objects with existing furniture or walkways.
- **`partially_furnished`** (or `open_floor_area_pct < 60`): keeps existing large furniture in place and prefers restyling it over outright replacement, using only the remaining open space for appropriately-scaled additions.
- **`mostly_empty`**: uses the original, more permissive furniture-placement behavior, since there is enough open floor space to furnish more freely.

### 7.4 Generation (Synthesis)

Performed by `ReplicateProvider.generate()`, calling the `black-forest-labs/flux-kontext-pro` model via the official `replicate` Python SDK's async client. Key parameters passed: the input image bytes, the fully constructed composition-locked prompt, a random seed, `aspect_ratio: "match_input_image"` (explicitly pinned so portrait-orientation photos are not force-cropped or reframed to landscape/square), and `output_format: "png"`. The call is wrapped in a `tenacity` retry decorator that retries on network errors, timeouts, and HTTP 429 rate-limit responses (waiting long enough to respect the provider's own advertised rate-limit reset window before retrying), with `reraise=True` so a genuinely exhausted retry budget still surfaces a clear error rather than silently swallowing failure.

### 7.5 Regeneration

A "Regenerate" action re-runs generation from the same underlying redesign brief (same style, same analysis) to produce a fresh variation with a new random seed, without requiring a new text instruction. This is distinct from "Refine" (see below) and is implemented via the same `/api/generate` endpoint with a `force_new` flag, which creates a new `Generation` row chained via `parent_generation_id` to the generation it was regenerated from (so it appears as a new version within the same project rather than a new, disconnected library entry).

### 7.6 Iterative Editing / Prompt Refinement

Implemented by `RefinementService.run_refinement_task()`. Unlike regeneration, refinement:
1. Resolves the base image from the generation currently being refined (its selected or most recent successful `Variation`), not the original uploaded photo.
2. Calls `ReplicateProvider.refine()`, which sends that image plus a narrowly scoped `build_refinement_prompt(instruction, ...)` prompt to `flux-kontext-pro`, explicitly instructing the model to apply only the requested change.
3. Creates a new child `Generation` row with `parent_generation_id` pointing at the generation it refined, preserving the linear/branching edit history.

### 7.7 Context Preservation & Structure Preservation

Structure preservation is achieved entirely at the prompt-engineering level (the composition-lock instructions described above), combined with using an image-editing diffusion model (`flux-kontext-pro`, which conditions generation on an input image) rather than a pure text-to-image model. Context preservation across a refinement chain is achieved by always sourcing the base image for any new edit from the most recent completed variation in that chain, not the original upload — ensuring each successive edit builds on the actual current state of the design rather than re-deriving from scratch.

### 7.8 Diffusion Pipeline

The underlying image synthesis model is Black Forest Labs' Flux Kontext Pro, accessed as a hosted inference endpoint via Replicate. This is an image-conditioned diffusion transformer model capable of instruction-following edits to an existing image (as opposed to unconditioned text-to-image generation), which is the technical enabler of RoomCanvas's structure-preserving redesign behavior.

### 7.9 Provider Fallback Chain

Implemented in `app/ai/providers/provider_registry.py`, exposing two resolver functions:

- **`get_text_provider()`** (used for analysis): tries, in order — the user's own Groq key, the platform's Groq key, the user's own Gemini key, the platform's Gemini key — raising a clear error only if none are configured.
- **`get_image_provider()`** (used for generation/refinement): tries, in order — the user's own Replicate key, the platform's Replicate key, the user's own Gemini key, the platform's Gemini key.

This means a user with their own Replicate key configured is never blocked by the platform's shared Replicate quota, and the platform itself has a secondary generation provider (Gemini) available if Replicate is unavailable.

### 7.10 Image Editing Pipeline

The refinement flow described in 7.6 constitutes the application's "image editing pipeline" — a targeted, instruction-driven modification of an existing generated image, as distinct from full generation from an original photo.

### 7.11 Customization Pipeline

Users can supply structured customization inputs alongside a style selection or refinement instruction: a style override, a budget constraint, specific color preferences, a lighting preference, and free-form constraints. These are merged into the prompt-construction functions (`build_generation_prompt` / `build_refinement_prompt`) alongside the AI-derived analysis data.

### 7.12 Natural Language Editing

The refinement text box is the primary natural-language interface — free-form English instructions ("remove the coffee table," "make the walls a warmer beige," "add a reading nook in the corner") are passed essentially verbatim (wrapped in the structure-preservation prompt scaffold) to the diffusion model, requiring no structured input from the user.

---

## 8. Frontend Architecture

### 8.1 Framework & Core Libraries
- **React 19** with **TypeScript**, built and served via **Vite 8**.
- **React Router v7** for client-side routing.
- **TanStack React Query v5** for server state (data fetching, caching, background refetching, mutation handling).
- **Zustand** for local/UI state (a single store, `uiStore.ts`, holding UI-level concerns such as the active generation ID, last-used customization per project, and similar transient state).
- **Framer Motion** for animation (page transitions, the multi-step generation progress stepper, micro-interactions).
- **Tailwind CSS** for styling, with `tailwind-merge` and `clsx` for conditional/composable class name construction.
- **Radix UI primitives** (`@radix-ui/react-dialog`, `react-select`, `react-slot`, `react-tooltip`) as accessible, unstyled building blocks underneath the app's custom-styled component library.
- **Firebase JS SDK v12** for direct client-side authentication.
- **`@microsoft/fetch-event-source`** for robust SSE consumption (supports custom headers, unlike the native `EventSource` API, which is required here since generation status requests must carry the Firebase auth Bearer token).
- **`react-dropzone`** for drag-and-drop file upload, **`react-easy-crop`** for image cropping.
- **`cmdk`** for the command-palette-style global search.
- **`canvas-confetti`** for celebratory micro-interactions (e.g., on successful generation).
- **`react-hot-toast`** for toast notifications.
- **`date-fns`** for date formatting/manipulation.
- **`zod`** for runtime schema validation.
- **`focus-trap-react`** for accessible modal/dialog focus management.
- **`lucide-react`** for iconography.
- **`vite-plugin-pwa`** (Workbox under the hood) for PWA/service-worker support.

### 8.2 Folder Structure
```
frontend/src/
├── api/          # API client, React Query hooks, request/response schemas & types
├── components/   # Reusable UI components, organized by domain (refine/, measurement/, layout/, primitives/, auth/, history/, etc.)
├── hooks/        # Custom hooks (usePollGeneration, useDebounce, useMediaQuery, useTheme, usePasswordStrength, useClickOutside)
├── pages/        # Route-level page components (one per route)
├── store/        # Zustand store(s)
└── styles/       # Tailwind base styles and design tokens
```

### 8.3 Routing
Client-side routing via React Router v7, with page-level components including (non-exhaustive): `LandingPage`, `SignInPage`, `SignUpPage`, `ForgotPasswordPage`, `ResetPasswordPage`, `AuthActionPage`, `SetupProfilePage`, `UploadPage`, `AnalysisPage`, `ResultsPage`, `HistoryPage`, `SettingsPage`, `ProfilePage`, `AboutPage`, `ContactPage`, `PrivacyPage`, `TermsPage`, and `NotFoundPage`. Route-level code-splitting is used for heavier components (e.g., `DesignEditorPanel` is lazy-loaded via `React.lazy`).

### 8.4 State Management
- **Server state** (anything that originates from the backend — generations, projects, history, styles, config, user profile) is owned by TanStack React Query, giving the app automatic caching, background revalidation, and request deduplication, with a global default retry policy configured on the `QueryClient` for queries (not mutations, which are not retried by default, an intentional choice to avoid accidentally duplicating side-effecting operations like image generation).
- **UI/local state** (e.g., which generation is "active" in the currently viewed project, the last customization options used) lives in a single Zustand store, chosen for its minimal boilerplate versus Redux and its lack of a Context Provider wrapper requirement.
- **Ephemeral component-local state** (form inputs, modal open/closed, in-progress crop coordinates) uses standard React `useState`/`useRef`.

### 8.5 Hooks
Notable custom hooks:
- **`usePollGeneration`** — orchestrates the real-time generation status experience: opens the SSE connection, tracks completion/failure/timeout state, and (as a resilience measure) runs a periodic backup poll alongside the SSE stream.
- **`useTheme`** — manages light/dark/system theme preference, persisting the user's choice.
- **`useDebounce`** — generic debouncing utility (e.g., for search input).
- **`useMediaQuery`** — responsive breakpoint detection for conditional rendering logic beyond what pure CSS media queries can express.
- **`usePasswordStrength`** — real-time password strength feedback on sign-up.
- **`useClickOutside`** — dismiss-on-outside-click behavior for dropdowns/popovers.

### 8.6 Components
Organized by domain, including (non-exhaustive): authentication components (sign-in/sign-up forms, `VerificationBanner`, social auth buttons), the refinement UI (`DesignEditorPanel`), the measurement overlay (`MeasurementOverlay`), layout components (`TopNav`, `AppShell`, `GlobalSearch`), history/library card components (`HistoryCard`), and a shared primitives library (`Button` and other base UI elements) used consistently across the app to keep visual language uniform.

### 8.7 Responsive Design
The application is built mobile-first-aware, explicitly targeting real phone usage (since the core "photograph a room and see it redesigned" workflow is realistically performed standing in the room, on a phone). Layout containers use responsive Tailwind utility classes (`flex-wrap`, breakpoint-prefixed sizing/spacing) to avoid content overflow or broken multi-line button labels on narrow viewports, and interactive overlays (such as the Measure Room tool) use stacked, wrapping header/control layouts on small screens rather than a single unwrapped horizontal row.

### 8.8 PWA (Progressive Web App)
Configured via `vite-plugin-pwa` with `registerType: 'autoUpdate'`. The manifest defines the app name, theme/background colors, standalone display mode, portrait-primary orientation, a full icon set (including maskable icons for adaptive Android icon theming), and an app shortcut ("New Design") that deep-links directly to the upload flow from a long-press on the installed app icon. Workbox-based service worker caching pre-caches static build assets (JS/CSS/HTML/fonts/images) and applies a cache-first runtime caching strategy for Google Fonts, while explicitly excluding `/api` and `/static` paths from the SPA navigation fallback so API calls are never incorrectly served from the offline app-shell cache.

### 8.9 Theme
Light/dark/system theme support via `useTheme`, with the user's preference persisted to their backend profile (`theme_preference` field on the `User` model) so it is consistent across devices/sessions, not just stored locally.

### 8.10 Authentication (Frontend)
See Section 6.2 for the end-to-end flow. On the frontend specifically: Firebase is initialized once (`firebase.ts`) using `initializeApp` + `initializeAuth` (rather than the simpler `getAuth`) so that persistence behavior can be explicitly controlled (a fallback chain of IndexedDB → local storage → session storage persistence) and so that a `popupRedirectResolver` can be explicitly supplied — required for `signInWithPopup`/`signInWithRedirect` to function correctly when using `initializeAuth` instead of the auto-configured `getAuth`.

### 8.11 Image Upload & Camera
Handled by `UploadPage`, combining `react-dropzone` (drag-and-drop/file picker) with native camera capture support (relevant on mobile, since the installed PWA can access the device camera through the standard file input `capture` mechanism) and `react-easy-crop` for pre-submission framing adjustment.

### 8.12 Library / History (Frontend)
`HistoryPage` renders the grouped project list returned by `GET /api/history`, with each card showing the project's latest completed thumbnail, room type, and style; clicking a card navigates into that project's full results/version-timeline view.

### 8.13 Settings & API Keys (Frontend)
`SettingsPage` exposes theme preference, notification settings, and (under a dedicated section) the BYOK API key management UI, allowing users to add/update/remove their own Gemini, Replicate, and Groq keys, which are sent to `POST /api/user-keys` and never stored or displayed again in plaintext once saved.

---

## 9. Backend Architecture

### 9.1 FastAPI Application Structure
The backend is a FastAPI application (`app/main.py`), using an `asynccontextmanager`-based `lifespan` handler (the modern replacement for the deprecated `@app.on_event` startup/shutdown hooks) to perform startup initialization: validating that critical environment variables are set (Gemini/Replicate/Supabase keys), initializing Firebase Admin, creating database tables if they do not already exist (`Base.metadata.create_all`), warming the styles/config caches, logging a clear startup banner summarizing which subsystems are configured and ready, and launching a background self-ping loop (in production only) to prevent the hosting platform's free-tier instance from idling/sleeping.

### 9.2 Routers
Each domain of functionality is isolated into its own FastAPI `APIRouter`, all mounted under the `/api` prefix:
- **`health.py`** — liveness/health check endpoint.
- **`config.py`** — exposes non-secret runtime configuration (e.g., max upload size) to the frontend.
- **`providers.py`** — exposes which AI providers are currently available/active for the requesting user (accounting for their BYOK configuration).
- **`styles.py`** — serves the interior design style catalog.
- **`analyze.py`** — the room analysis endpoint.
- **`generate.py`** — the generation/regeneration endpoint.
- **`refine.py`** — the targeted refinement endpoint.
- **`history.py`** — project listing, project timeline detail, and the SSE generation-status stream.
- **`auth.py`** — backend user sync endpoint.
- **`measure.py`** — the Measure Room calibration/measurement endpoint.
- **`user_keys.py`** — BYOK API key CRUD endpoints.

### 9.3 Services
Business logic is isolated from routers into dedicated service classes: `AnalysisService`, `GenerationService`, `RefinementService`, `KeyService` (BYOK encryption/decryption), and `StorageService` (Supabase Storage upload/download abstraction).

### 9.4 Repositories
`GenerationRepository` is the sole data-access layer for the `generations`/`variations` tables, encapsulating queries such as `get_by_id`, `create_generation`, `update_status`, `list_projects` (grouped project listing with failed-project exclusion), and `get_project_timeline` (fetching a full generation tree by walking `parent_generation_id` descendants).

### 9.5 Database Models
See Section 12 for full schema detail: `User`, `Generation`, `Variation`, `UserApiKeys`, all defined as SQLAlchemy 2.0 declarative models using the modern `Mapped[]`/`mapped_column()` typed style.

### 9.6 Authentication (Backend)
`app/auth/dependencies.py` provides `get_current_user`, a FastAPI dependency that extracts and verifies the Firebase-issued Bearer token (via `app/auth/firebase_admin_init.py`, which initializes the Firebase Admin SDK from a service account credential — supplied either as a JSON environment variable or a mounted credentials file) and resolves it to the corresponding backend `User` row.

### 9.7 Middleware
- A custom `access_log_middleware` (implemented as a raw ASGI HTTP middleware) generates/propagates a request ID, logs a clean structured access log line per API request, measures and reports request processing time via a response header, and injects the security headers described in Section 6.3.
- **CORS middleware**, restricting cross-origin access to an explicit allow-list of origins.
- **GZip middleware**, compressing responses above a minimum size threshold.
- **`RateLimiter`** (`app/middleware/rate_limit.py`) — a configurable FastAPI dependency factory implementing a Redis-backed sliding-window-style rate limiter, keyed by a hash of the caller's Authorization header when present (falling back to client IP for unauthenticated requests), returning standard `Retry-After`/`X-RateLimit-*` headers and a `429` response with a clear retry time when exceeded. Applied per-route with different limits (e.g., a tighter limit on the expensive `/api/analyze` endpoint).

### 9.8 Caching
`app/cache/redis_cache.py` wraps the Upstash Redis client, exposing cache helpers used for the styles catalog, app config, and generation/project data, with cache warming performed at application startup.

### 9.9 Rate Limiting
See Section 9.7 — implemented as a reusable dependency, applied selectively to the most expensive/abusable endpoints (notably room analysis, which triggers a paid third-party AI call).

### 9.10 Storage
`StorageService` centralizes all interaction with Supabase Storage — uploading original room photos, uploading generated variation images, and resolving public/signed URLs for the frontend to load images from.

### 9.11 Generation Services
`GenerationService` is the core orchestrator for both fresh generation and regeneration, responsible for: resolving the correct source generation, constructing the final prompt (delegating to `prompt_builder.py`), invoking the resolved image provider (via the provider registry) with retry-aware error handling, persisting the resulting `Variation`, and updating the parent `Generation`'s status (`pending` → `completed`/`failed`).

### 9.12 Analysis Services
`AnalysisService` orchestrates the room analysis call: validating/storing the uploaded image, invoking the resolved text/analysis provider with the structured analysis prompt and schema, parsing the structured JSON response, persisting an initial `Generation` row capturing the analysis output (room type, redesign prompt, occupancy classification, etc.), and returning the analysis summary to the frontend.

### 9.13 Background Tasks
Long-running AI generation work is executed via FastAPI's `BackgroundTasks` mechanism rather than blocking the HTTP request/response cycle, with a dedicated, freshly created async database session used inside each background task execution (and inside the SSE status-polling loop) rather than reusing the original request-scoped session — an important correctness detail, since a single long-lived database session/transaction can otherwise fail to observe commits made by a different concurrent session (a well-known async-SQLAlchemy pitfall in long-lived polling/streaming contexts).

### 9.14 Error Handling (Backend)
A custom exception hierarchy (`app/utils/exceptions.py`, including `InteriorAIError` and subclasses such as `InferenceServiceError` and `ProviderUnavailableError`) is caught by global FastAPI exception handlers registered in `main.py`, which format a consistent JSON error envelope (`code`, `message`, `request_id`, `timestamp`) for both expected application errors and any uncaught exception (logged in full server-side via `logger.exception`, but returned to the client as a generic, non-leaky "unexpected server error" message for anything unhandled/500-level).

---

## 10. Complete Tech Stack

### Frontend
- **Language:** TypeScript
- **Framework:** React 19
- **Build tool:** Vite 8
- **Routing:** React Router v7
- **Server state:** TanStack React Query v5
- **Client state:** Zustand
- **Styling:** Tailwind CSS 3, `tailwind-merge`, `clsx`
- **UI primitives:** Radix UI (`react-dialog`, `react-select`, `react-slot`, `react-tooltip`)
- **Animation:** Framer Motion
- **Forms/validation:** Zod
- **Auth SDK:** Firebase JS SDK v12
- **Real-time updates:** `@microsoft/fetch-event-source` (SSE client)
- **File upload:** `react-dropzone`
- **Image cropping:** `react-easy-crop`
- **Command palette / search:** `cmdk`
- **Toasts:** `react-hot-toast`
- **Icons:** `lucide-react`
- **Dates:** `date-fns`
- **Micro-interactions:** `canvas-confetti`
- **Accessibility:** `focus-trap-react`
- **PWA:** `vite-plugin-pwa` (Workbox)
- **Type checking:** TypeScript compiler (`tsc`) as part of the build step

### Backend
- **Language:** Python 3.12
- **Framework:** FastAPI
- **ASGI server:** Uvicorn (development), Gunicorn with Uvicorn workers (production)
- **ORM:** SQLAlchemy 2.0 (async)
- **Data validation:** Pydantic v2, `pydantic-settings` for typed environment configuration
- **Database drivers:** `asyncpg` (PostgreSQL, production), `aiosqlite` (SQLite, local development), `psycopg2-binary` (sync fallback/tooling)
- **AI SDKs:** `google-genai` (Gemini), `replicate` (Replicate/Flux Kontext Pro)
- **Retry logic:** `tenacity`
- **HTTP client:** `httpx`
- **Auth:** `firebase-admin`
- **Object storage SDK:** `supabase`
- **Caching/rate limiting:** `upstash-redis`
- **Encryption:** `cryptography` (Fernet)
- **Real-time streaming:** `sse-starlette`
- **Image processing:** `pillow`
- **Logging:** `loguru`
- **File upload parsing:** `python-multipart`

### AI / ML
- **Vision-language analysis:** Google Gemini (`gemini-2.5-flash` family), via `google-genai`
- **Alternate text provider:** Groq
- **Image generation/editing:** Black Forest Labs Flux Kontext Pro, hosted via Replicate
- **Fallback image provider:** Gemini image generation capability

### Database
- **Development:** SQLite (via `aiosqlite`)
- **Production:** PostgreSQL (via `asyncpg`)

### Storage
- Supabase Storage (S3-compatible object storage)

### Authentication
- Firebase Authentication (client-side identity provider)
- Firebase Admin SDK (server-side token verification)

### Cloud / Deployment
- **Backend hosting:** Render (via `render.yaml` blueprint)
- **Frontend hosting:** Vercel (or Netlify)
- **Cache/rate-limit store:** Upstash Redis (serverless Redis)
- **Object storage:** Supabase
- **Identity provider:** Firebase (Google Cloud)

### Programming Languages
- TypeScript (frontend)
- Python (backend)
- SQL (schema/migrations)

### Developer Tools / Build Tools
- Vite (frontend bundler/dev server)
- PostCSS + Autoprefixer (CSS pipeline)
- TypeScript compiler
- `pip` / `requirements.txt` (Python dependency management)
- `npm` (Node dependency management)
- A custom `export.py` repository utility script (developer tooling only — not part of the shipped application) used to export the tracked repository contents into flattened text dumps for AI-assisted development/review workflows

### Version Control
- Git (with `.gitignore`-aware tooling, as evidenced by `export.py`'s use of `git ls-files`)

---

## 11. Database Design

The application uses four core tables, defined as SQLAlchemy 2.0 declarative models in `backend/app/database/models.py`.

### 11.1 `users`
Stores the backend's mirrored user profile, keyed independently from (but linked to) Firebase's own identity record.

| Column | Type | Notes |
|---|---|---|
| `id` | Integer, PK, autoincrement | Backend-internal user identifier |
| `firebase_uid` | String, unique, indexed | Links to the Firebase Authentication identity |
| `email` | String, unique | |
| `display_name` | String, nullable | |
| `photo_url` | String, nullable | |
| `username` | String, unique, nullable, indexed | User-chosen handle |
| `bio` | String, nullable | |
| `theme_preference` | String, default `"system"` | Persisted UI theme choice |
| `email_notifications` | Boolean (stored as Integer for SQLite compatibility) | |
| `profile_completed` | Boolean (stored as Integer) | Drives whether `SetupProfilePage` is shown |
| `created_at` | DateTime (server default `now()`), indexed | |
| `last_login_at` | DateTime (server default `now()`) | |

**Relationships:** one-to-many with `generations` (cascade delete-orphan — deleting a user removes all of their generations).

### 11.2 `generations`
The central entity of the application — represents a single AI generation attempt (either an initial design or a subsequent refinement/regeneration), and doubles as the "project" node when it has no parent.

| Column | Type | Notes |
|---|---|---|
| `id` | Integer, PK, autoincrement | |
| `user_id` | Integer, FK → `users.id`, nullable, indexed | |
| `original_image_path` | String | Path/key of the source image in object storage |
| `room_type_detected` | String, nullable | From analysis stage |
| `room_confidence` | Float, nullable | |
| `style` | String | Selected/effective design style |
| `redesign_prompt` | String | The AI-authored (or accumulated) redesign brief |
| `prompt_version` | String, nullable | Versioning tag for the prompt template used |
| `analysis_json` | String, nullable | Serialized full analysis payload (room type, furniture, occupancy, etc.) |
| `parent_generation_id` | Integer, FK → `generations.id` (self-referential), nullable | **The key field enabling project/version-tree structure** — `null` marks a root/project generation; non-null marks a refinement or chained regeneration |
| `provider` | String, nullable | Which AI provider actually served this generation |
| `provider_version` | String, nullable | |
| `model_used` | String | e.g., `black-forest-labs/flux-kontext-pro` |
| `model_version` | String, nullable | |
| `status` | String, default `"completed"` | `pending` / `completed` / `failed` / `failed_analysis` |
| `error` | String, nullable | Captured error message on failure |
| `processing_time_sec` | Float | |
| `selected_variation_id` | Integer, FK → `variations.id` (deferred, `use_alter`), nullable | Which variation the user has explicitly marked as the representative one for this generation |
| `created_at` | DateTime (server default `now()`) | |

**Indexes:** a composite index on `(user_id, status, created_at)` to make the common "list my recent generations by status" queries efficient.

**Relationships:** many-to-one with `users` (`owner`); one-to-many with `variations` (cascade delete-orphan); a separate direct relationship to `selected_variation` (using `post_update=True` to correctly handle the circular FK reference between `generations.selected_variation_id` and `variations.generation_id`).

### 11.3 `variations`
Represents one concrete generated image output belonging to a `Generation` (a generation can, in principle, have multiple candidate output variations, and one is designated as "selected").

| Column | Type | Notes |
|---|---|---|
| `id` | Integer, PK, autoincrement | |
| `generation_id` | Integer, FK → `generations.id`, `ondelete="CASCADE"` | |
| `image_path` | String | Path/key of the generated image in object storage |
| `seed` | BigInteger | The diffusion model's random seed used for this output, retained for reproducibility/debugging |
| `created_at` | DateTime (server default `now()`) | |

**Relationships:** many-to-one back to its parent `Generation`.

### 11.4 `user_api_keys` (BYOK)
Stores encrypted, user-supplied third-party API keys.

| Column | Type | Notes |
|---|---|---|
| `id` | Integer, PK, autoincrement | |
| `user_id` | Integer, FK → `users.id`, `ondelete="CASCADE"`, indexed | |
| `provider` | String | `"gemini"` / `"replicate"` / `"groq"` |
| `encrypted_key` | String | Fernet-encrypted ciphertext — the plaintext key is never persisted |
| `preferred_model` | String, nullable | Optional per-provider model override |
| `updated_at` | DateTime (server default + `onupdate` `now()`) | |

### 11.5 Relationships summary
- `users` 1—* `generations`
- `generations` 1—* `variations`
- `generations` 1—1 (optional) `variations` (via `selected_variation_id`, the "currently chosen" output)
- `generations` self-referential tree via `parent_generation_id` (this is what implements "projects with versions" rather than "flat list of unrelated generations")
- `users` 1—* `user_api_keys`

### 11.6 Data flow through the schema
1. A fresh analysis creates a root `Generation` (`parent_generation_id = null`, `status = "pending"`).
2. Successful generation adds a `Variation` row and flips the `Generation`'s status to `"completed"`.
3. A refinement or regenerate-with-instruction action creates a **new** `Generation` row with `parent_generation_id` set to the generation it was derived from, and its own `Variation` once complete.
4. `GenerationRepository.list_projects()` walks this tree to surface only root-level entries (with metadata rolled up from their full descendant set) to the Library/History UI.
5. `GenerationRepository.get_project_timeline()` walks a specific project's full descendant tree to power the results page's Version History strip.

---

## 12. API Overview

All endpoints are mounted under the `/api` prefix. Authentication (a valid Firebase Bearer token, resolved via `get_current_user`) is required on essentially all endpoints that touch user data.

| Endpoint | Method | Purpose | Key Input | Key Output |
|---|---|---|---|---|
| `/api/health` | GET | Liveness/health check | — | Service status |
| `/api/config` | GET | Expose non-secret runtime config | — | e.g., max upload size |
| `/api/providers` | GET | Report which AI providers are available for the current user | — | Availability/provider-name info per capability |
| `/api/styles` | GET | List available interior design styles | — | Style catalog |
| `/api/auth/sync` | POST | Create/update the backend user record from a verified Firebase identity | Firebase-verified identity (via header) | Synced user profile |
| `/api/analyze` | POST | Analyze an uploaded room photo | Image file, style ID | Structured analysis (room type, furniture, occupancy, redesign prompt, etc.) + `analysis_id` |
| `/api/generate` | POST | Generate (or regenerate) a redesigned image | `analysis_id`, optional `force_new`, customization, optional `instruction` | Newly created `Generation` (status `pending`); actual image produced asynchronously |
| `/api/refine` | POST | Apply a targeted natural-language edit to an existing generation | `generation_id`, `instruction`, optional customization | Newly created child `Generation` (status `pending`) |
| `/api/generation/{id}/status` | GET (SSE) | Real-time streaming status updates for a generation in progress | Path: generation ID | Server-Sent Events stream of status updates, terminating on `completed`/`failed` |
| `/api/history` | GET | List the current user's projects (grouped, deduplicated, failed-only projects excluded) | Pagination params | List of project summaries |
| `/api/projects/{id}` | GET | Full version timeline for a single project | Path: project (root generation) ID | Project detail + ordered generation/version timeline |
| `/api/measure` | POST | Perform a calibrated real-world measurement on an image | Reference object type/corners/edge, target points | Real-world distance + confidence rating |
| `/api/user-keys` | GET/POST/DELETE | Manage the current user's BYOK provider API keys | Provider name, API key, optional preferred model | Confirmation / list of configured providers (never raw keys) |

Every response follows a consistent JSON error envelope on failure (`code`, `message`, `request_id`, `timestamp`), and rate-limited endpoints return standard `Retry-After` / `X-RateLimit-*` headers.

---

## 13. Security Features

- **Authentication delegated to Firebase**, a dedicated, audited identity provider — the backend never stores or handles raw passwords.
- **Server-side token verification** on every protected request via the Firebase Admin SDK (`get_current_user` dependency), rather than trusting any client-asserted identity.
- **Encrypted-at-rest BYOK API keys**, using Fernet symmetric encryption (`cryptography` library) with a dedicated `FERNET_SECRET_KEY` secret; only ciphertext is ever persisted to the database, and keys are never re-displayed in plaintext to the client after being saved.
- **Strict input validation** on file uploads (`validate_image_file`), rejecting unsupported MIME types and oversized files server-side, in addition to client-side pre-checks.
- **CORS allow-listing**, restricting which origins may make credentialed cross-origin requests to the API.
- **Security response headers** applied globally via middleware: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection`, and `Strict-Transport-Security` (HSTS).
- **Rate limiting** (Redis-backed, per authenticated user or per-IP) on sensitive/expensive endpoints, mitigating both abuse and runaway third-party AI cost exposure.
- **Session persistence control** on the frontend, letting the user explicitly choose between a persistent ("remember me") session and a session confined to the current browser tab.
- **No secrets shipped to the client** — all third-party AI provider credentials (platform-level Gemini/Replicate/Groq keys, Supabase service role key, Fernet secret) live exclusively in backend environment variables, never exposed to the frontend bundle.
- **Structured, non-leaky error responses** — uncaught server exceptions are logged in full server-side but returned to the client as a generic message, avoiding accidental disclosure of internal stack traces or implementation details.
- **Request ID tracing**, aiding security/incident investigation by making every request traceable end-to-end through logs via a propagated `X-Request-ID` header.

---

## 14. Performance Optimizations

- **Redis caching** of frequently-read, infrequently-changing data (styles catalog, app config) and of history/project data, reducing repeated database load.
- **Cache warming at startup**, ensuring the very first requests after a deployment are not artificially slow while the cache is cold.
- **Asynchronous, non-blocking backend throughout** — async SQLAlchemy, async HTTP calls to AI providers, `asyncio`-based background task execution — allowing the single backend process to serve many concurrent requests without thread-per-request overhead.
- **Background task execution for AI generation**, so the HTTP request/response cycle is never held open for the (often tens-of-seconds) duration of a diffusion model call; the client is instead updated in near-real-time via SSE.
- **Fresh, short-lived database sessions per background task/streaming iteration**, avoiding both connection pool exhaustion and stale-read correctness issues that a single long-lived session could introduce during a multi-second-to-multi-minute streaming/background operation.
- **Lazy-loading of heavier frontend components** (e.g., `React.lazy` for `DesignEditorPanel`), deferring their JS payload until actually needed.
- **GZip response compression** for API responses above a minimum size threshold.
- **SQLAlchemy `selectin` eager loading** configured on the `Generation`↔`Variation`↔`User` relationships, avoiding N+1 query patterns when serializing nested generation/variation data.
- **Retry-with-backoff on AI provider calls**, which — while primarily a reliability feature — also protects overall system throughput by avoiding tight retry loops against an already-rate-limited or degraded upstream provider.
- **PWA static asset caching** (via Workbox), minimizing repeated network fetches of the app shell on return visits.
- **Prompt-level optimization** — the reusable composition-lock and design-principle prompt blocks are defined once and composed, rather than being redundantly re-authored per call site, keeping prompt construction both maintainable and consistent.

---

## 15. Error Handling

### 15.1 Frontend
- Toast-based user feedback (`react-hot-toast`) for action failures (e.g., failed regenerate/refine attempts), using a shared "friendly error" translation layer that converts raw backend/Firebase error codes into human-readable messages rather than surfacing raw exception text.
- A dedicated full-page error/failure state during generation (distinct from the normal progress UI), shown only once the backend has genuinely reported a terminal failure (not merely a slow-but-in-progress request).
- A `handleRetry` flow that fully resets local generation-tracking state before re-attempting, avoiding stale error state bleeding into a subsequent successful attempt.
- A backup polling mechanism alongside the primary SSE connection, specifically to guard against silently dropped SSE connections (e.g., due to intermediary proxy idle-connection timeouts) leaving the user stuck on a loading state indefinitely.

### 15.2 Backend
- A custom exception hierarchy (`InteriorAIError` and subclasses like `InferenceServiceError`, `ProviderUnavailableError`) carrying an explicit HTTP status code and message, caught by a dedicated global exception handler that returns a consistent structured JSON error body.
- A separate catch-all handler for any *uncaught* exception, ensuring the API never leaks a raw Python traceback to the client, while still logging the full exception server-side (`logger.exception`) for debugging.
- Graceful analysis fallback — if the vision-language analysis provider fails or times out, the backend still returns a usable (if less rich) fallback analysis response rather than failing the entire upload flow outright.

### 15.3 AI Providers
- Automatic retry (via `tenacity`) with exponential backoff on transient failures (network errors, timeouts) and on HTTP 429 rate-limit responses specifically, with the retry wait tuned to respect the provider's own advertised rate-limit reset window rather than a generic fixed backoff.
- Errors are wrapped into the application's own `InferenceServiceError` type before propagating, so downstream error handling doesn't need to know provider-specific exception types.

### 15.4 Storage
Upload/download operations against Supabase Storage are wrapped by `StorageService`, centralizing failure handling for object storage operations rather than letting storage-layer exceptions leak into route handlers directly.

### 15.5 Authentication
Firebase Admin token verification failures are surfaced as a clean 401/403-style authentication error rather than a generic 500, and the frontend's `AuthProvider` similarly translates raw Firebase error codes (e.g., `auth/popup-blocked`, `auth/invalid-credential`, `auth/email-already-in-use`) into user-facing messages via a shared `friendlyError` helper.

### 15.6 Fallbacks & Retry Logic Summary
| Failure mode | Handling |
|---|---|
| Analysis provider fails/times out | Graceful fallback analysis response returned |
| Generation provider network error/timeout | Automatic retry with exponential backoff |
| Generation provider HTTP 429 (rate limited) | Automatic retry, backoff tuned to the provider's advertised reset window |
| Google Sign-In popup blocked/closed | Automatic fallback to `signInWithRedirect` |
| SSE connection silently dropped | Backup low-frequency poll catches the missed final status |
| Fully exhausted AI provider retries | Generation marked `failed` with a captured error message; excluded from the user's Library if the whole project tree never produced a completed generation |

---

## 16. Deployment Architecture

### 16.1 Frontend hosting
Deployed as a static build (Vite production build output, `dist/`) to **Vercel** (Netlify is also supported as an equivalent alternative). Build command: `npm run build` (which runs `tsc` type-checking followed by the Vite production build). The frontend is configured via a single environment variable, `VITE_API_URL`, pointing at the deployed backend's base URL.

### 16.2 Backend hosting
Deployed to **Render**, provisioned via an included `render.yaml` blueprint, which Render uses to automatically configure the Python web service (build/start commands, environment variable slots) without manual dashboard configuration. The backend is served in production via Gunicorn with Uvicorn worker processes.

### 16.3 Database hosting
- **Local/development:** SQLite, stored as a local file (`./storage/interior_ai.db`).
- **Production:** PostgreSQL (connection managed via `DATABASE_URL`, using `asyncpg` for the async application connection).

### 16.4 Storage hosting
Supabase Storage, configured via `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and a named `SUPABASE_BUCKET`. This is explicitly required in production — the application startup sequence detects when it is running on Render without Supabase configured and logs an explicit warning that uploaded/generated files will be lost on the next redeploy, since Render's own filesystem is ephemeral.

### 16.5 Environment Variables
Key backend environment variables (see `backend/.env.example`): `APP_NAME`, `APP_VERSION`, `DEBUG`, `DATABASE_URL`, `ALLOWED_ORIGINS`, `MAX_UPLOAD_SIZE_MB`, `ACTIVE_ANALYSIS_PROVIDER`, `ACTIVE_GENERATION_PROVIDER`, `GEMINI_API_KEY`, `REPLICATE_API_TOKEN`, `GEMINI_TIMEOUT_SECONDS`, `REPLICATE_TIMEOUT_SECONDS`, `UPSTASH_REDIS_URL`, `UPSTASH_REDIS_TOKEN`, `FIREBASE_SERVICE_ACCOUNT_JSON` (or `FIREBASE_CREDENTIALS_PATH`), `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_BUCKET`, `FERNET_SECRET_KEY`. Key frontend environment variables: `VITE_API_URL`, plus the six `VITE_FIREBASE_*` client configuration values (API key, auth domain, project ID, storage bucket, messaging sender ID, app ID).

### 16.6 Production Configuration
- `DEBUG=false` in production, which (among other effects) disables the self-ping keep-alive loop's early-return guard, activating a background task that pings the service's own `/api/health` endpoint every 10 minutes to help prevent a free-tier hosting instance from idling down between requests.
- CORS origins in production are restricted to the actual deployed frontend domain(s), not left wildcarded.

### 16.7 CI/CD
No dedicated CI/CD pipeline configuration (e.g., GitHub Actions workflows) was found in the repository; deployment is managed via each hosting platform's native Git-integration auto-deploy (Render and Vercel both natively redeploy on push to the connected branch), rather than a custom pipeline.

---

## 17. Software Requirements

- **Node.js** 20+ (frontend build/dev tooling)
- **Python** 3.12+ (backend runtime)
- **npm** (or an equivalent Node package manager) for frontend dependency management
- **pip** for backend dependency management
- A modern evergreen web browser supporting Service Workers/PWA installation (Chrome, Edge, Safari, Firefox)
- Accounts/credentials for: Firebase (Authentication), Supabase (Storage), Google Gemini API, Replicate API, Upstash (Redis)
- Git, for source control and (optionally) triggering platform auto-deploys

## 18. Hardware Requirements

- **Development machine:** Any machine capable of running Node.js and Python 3.12 (no GPU required locally — all AI inference is offloaded to hosted third-party APIs, not run locally).
- **End-user device:** Any modern smartphone, tablet, or desktop/laptop computer with a camera (for the photo-capture workflow) and a modern web browser; no special hardware requirements, since the application is a standard web app / installable PWA rather than a native application with device-specific dependencies.
- **Server:** A standard cloud compute instance sized for a lightweight async Python web service (the AI-heavy compute itself runs on the third-party providers' infrastructure, not on RoomCanvas's own servers).

## 19. Functional Requirements

- The system shall allow a user to register and authenticate via email/password or Google Sign-In.
- The system shall allow an authenticated user to upload or capture a photo of a room.
- The system shall allow the user to select an interior design style before generation.
- The system shall analyze the uploaded photo and return a structured breakdown of the room.
- The system shall generate a photorealistic, structurally-consistent redesign of the uploaded room in the selected style.
- The system shall provide real-time progress feedback during generation.
- The system shall allow the user to submit natural-language refinement instructions against an existing generation.
- The system shall preserve every refinement as a distinct, browsable version within the same project.
- The system shall allow the user to view, download, and share a generated design.
- The system shall allow the user to view a history/library of their past projects.
- The system shall exclude entirely-failed projects from the user's library.
- The system shall allow the user to calibrate and perform real-world measurements on a room photo.
- The system shall allow the user to optionally configure their own third-party AI provider API keys.
- The system shall enforce rate limits on AI-invoking endpoints.

## 20. Non-Functional Requirements

- **Performance:** Analysis and generation requests should provide user-visible progress feedback within a few seconds of submission, even though the underlying AI call may take tens of seconds.
- **Reliability:** Transient third-party AI provider failures (network errors, timeouts, rate limits) should be automatically retried rather than immediately surfaced as user-facing failures.
- **Availability:** The backend should remain responsive under typical load via async I/O and should avoid idling down on free-tier hosting via a self-ping mechanism.
- **Security:** All user data in transit must be protected via HTTPS; sensitive user-supplied credentials (BYOK API keys) must be encrypted at rest.
- **Usability:** The interface must be fully usable on a mobile phone, including camera capture, since the primary use case involves standing in the room being redesigned.
- **Maintainability:** The backend must maintain a clear separation between routers, services, and repositories to keep business logic testable and routes thin.
- **Scalability:** The rate-limiting and BYOK architecture must allow the platform's own AI provider costs to remain bounded independent of total user growth.
- **Portability:** The application must run against either SQLite (development) or PostgreSQL (production) with no code changes, via SQLAlchemy's database-agnostic ORM layer.

## 21. Input

- A photograph of an interior room (JPEG/PNG/WEBP), either uploaded from a file or captured live via device camera.
- A selected interior design style (from a predefined catalog).
- Optional customization: budget range, specific color preferences, lighting preference, free-form constraints.
- Free-form natural-language refinement instructions (for the iterative editing flow).
- For the Measure Room feature: four tapped corner points of a known reference object, a width/height edge designation, and two arbitrary target points to measure between.
- User account credentials (email/password) or a Google account, for authentication.
- Optionally, user-supplied third-party AI provider API keys (BYOK).

## 22. Output

- A structured room analysis (room type, furniture inventory, dimensions, color palette, lighting suggestions, budget estimate, occupancy classification).
- A photorealistic, structurally-consistent redesigned image of the input room.
- A version history/timeline of all refinements made to a given project.
- A downloadable/shareable final design image.
- A real-world distance measurement (in centimeters or the app's chosen unit) with an associated confidence rating.
- A browsable project library/history for the authenticated user.

## 23. Advantages

- Produces a redesign of the user's *actual* room, not a generic/unrelated example image — directly actionable for real-world decision-making.
- Supports genuine iterative refinement rather than forcing a one-shot, all-or-nothing generation.
- Adapts its generation behavior to the room's actual furnishing density, avoiding physically nonsensical results (e.g., cramming new furniture into an already-full room).
- Includes a genuinely useful, non-AI-dependent utility feature (Measure Room) that adds standalone value beyond image generation.
- Resilient by design — automatic retries, provider fallback chains, and BYOK mean a single provider outage or rate limit does not necessarily block the user.
- Mobile-first and installable, matching the realistic context of use (in the room being redesigned).
- Clear, professional software architecture (layered backend, typed schemas, structured prompt engineering) that would generalize well to a real commercial product.

## 24. Limitations

- Generation quality and structural fidelity are ultimately bounded by the underlying diffusion model's (Flux Kontext Pro's) own capabilities and occasional inconsistency — prompt engineering reduces but cannot fully eliminate unwanted changes (e.g., an edit affecting an object it wasn't asked to touch).
- Single-view measurement (Measure Room) is fundamentally an approximation without true 3D scene reconstruction or a detected vanishing point; accuracy degrades at steep camera angles, even with the dual-edge scale-comparison confidence scoring in place.
- The platform's own AI provider usage is subject to real third-party cost and rate-limit constraints (notably, Replicate imposes a strict low rate limit on accounts without a payment method on file), which can directly affect the demo/user experience if not proactively managed (e.g., ensuring a payment method is configured).
- No native mobile app exists (by design) — the mobile experience relies entirely on PWA installation and browser capability, which varies slightly across mobile browser vendors (e.g., camera capture and popup-based auth behavior differ subtly between iOS Safari, Android Chrome, and in-app WebViews).
- The application currently relies on hosted third-party AI inference exclusively; there is no local/offline AI fallback, so generation and analysis strictly require network connectivity and provider availability.
- No dedicated automated CI/CD pipeline was found in the repository; deployment currently relies on each hosting platform's native auto-deploy-on-push behavior rather than a custom-gated pipeline (e.g., with pre-deploy automated testing).

## 25. Future Scope

- **3D mesh/depth extraction**, integrating depth-map analysis to export a basic 3D floor plan or enable more geometrically accurate measurement without relying purely on single-view photogrammetry approximation.
- **E-commerce integration**, matching generated furniture/decor items to real, purchasable products via reverse image search, turning a visual redesign directly into a shoppable list.
- **Multi-angle consistency**, generating a consistent redesigned room across multiple photographed angles of the same physical space, rather than treating each photo independently.
- **Collaborative/shared projects**, allowing multiple users (e.g., a homeowner and their hired designer) to collaborate on and comment within the same project timeline.
- **Automated CI/CD** with pre-deploy testing gates, rather than relying solely on hosting-platform auto-deploy.
- **Expanded provider fallback**, adding further alternate image-generation providers beyond Replicate/Gemini to increase resilience further.

## 26. Learning Outcomes

This project demonstrates practical, applied competency in:
- Full-stack web application development with a modern React/TypeScript frontend and an async Python/FastAPI backend.
- Multimodal AI integration — structured, schema-constrained prompting of a vision-language model, and instruction-driven image editing via a diffusion model.
- Prompt engineering as a genuine software engineering discipline — composable, reusable prompt-construction functions with explicit constraint-locking logic, rather than ad hoc string concatenation.
- Asynchronous backend architecture, including background task orchestration and real-time client updates via Server-Sent Events.
- Relational database design for self-referential, tree-structured data (the generation/version model).
- Secure handling of user credentials and third-party API keys, including symmetric encryption at rest.
- Resilience engineering against third-party API failures — retries, exponential backoff, rate-limit-aware handling, and provider fallback chains.
- Responsive, mobile-first UI/UX design, including PWA installability and native device capability integration (camera capture).
- Applied computer vision / single-view photogrammetry fundamentals for the Measure Room feature.
- Cloud deployment across a multi-provider stack (Render, Vercel, Supabase, Firebase, Upstash) and the operational considerations of coordinating environment configuration across them.

## 27. Skills Demonstrated

- **Full-stack development:** React 19/TypeScript frontend; FastAPI/Python async backend; REST + SSE API design.
- **AI/ML application engineering:** Multimodal (vision-language) model integration; diffusion-based image editing; structured JSON-schema-constrained AI outputs; prompt engineering for constraint-locked generation; provider abstraction and fallback design.
- **Cloud & DevOps:** Multi-provider cloud deployment (Render, Vercel, Supabase, Upstash, Firebase); environment-variable-driven configuration management; production-vs-development configuration branching.
- **Database engineering:** Relational schema design for self-referential tree data; async ORM usage (SQLAlchemy 2.0); database-agnostic design (SQLite/PostgreSQL portability); query optimization via eager loading and composite indexing.
- **Authentication & security:** Third-party identity provider integration (Firebase); server-side token verification; encryption-at-rest for sensitive user data (Fernet); rate limiting; security response headers.
- **System design:** Layered backend architecture (router/service/repository separation); background task orchestration; real-time update delivery (SSE) with resilient fallback polling; caching strategy design.
- **Computer vision fundamentals:** Reference-object calibration, pixel-to-real-world scale computation, and perspective-distortion-aware confidence estimation for single-view measurement.
- **Frontend engineering craft:** Server/client state separation (React Query vs. Zustand); responsive/mobile-first layout engineering; PWA configuration; accessible UI primitive usage (Radix UI); component-driven architecture.
- **Software engineering discipline:** Structured error handling and consistent API error envelopes; retry/backoff resilience patterns; typed configuration (Pydantic settings); clear separation of concerns across the codebase.

---

## 28. Complete Technology Summary

RoomCanvas AI is a full-stack, cloud-deployed, AI-powered Progressive Web Application. Its frontend is built with **React 19, TypeScript, and Vite**, styled with **Tailwind CSS** and **Radix UI**, animated with **Framer Motion**, and state-managed via **TanStack React Query** (server state) and **Zustand** (UI state), authenticating users through the **Firebase JS SDK**. Its backend is an asynchronous **FastAPI** (Python 3.12) application using **SQLAlchemy 2.0** over **PostgreSQL** (production) or **SQLite** (development), authenticated via the **Firebase Admin SDK**, storing all persistent images in **Supabase Storage**, and using **Upstash Redis** for caching and rate limiting. Its AI pipeline combines **Google Gemini** (multimodal room analysis, with **Groq** as an alternate text provider) and **Replicate's Flux Kontext Pro** diffusion model (structure-preserving image generation and editing, with Gemini's own image capability as a fallback), orchestrated through a custom provider-registry pattern supporting both platform-level and user-supplied ("Bring Your Own Key") credentials, the latter encrypted at rest using **Fernet** symmetric encryption. Real-time generation progress is delivered via **Server-Sent Events**, with resilient retry logic (via **tenacity**) covering both transient network failures and third-party API rate limiting. The application is deployed with the frontend on **Vercel**, the backend on **Render**, and is fully installable as a mobile/desktop **Progressive Web App** via **Workbox**-based service worker caching — engineered end-to-end as a production-grade, resilient, and genuinely useful application of applied generative AI to interior design visualization.

---

*Document generated from direct inspection of the RoomCanvas AI frontend and backend source code and the project README. All architectural, feature, and implementation claims above are grounded in verified code — no functionality has been invented or assumed beyond what is implemented in the repository at the time of writing.*
