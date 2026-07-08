# finish_backend.md
### RoomCanvas — Backend Completion Specification
**Prepared for:** implementing coding AI (Gemini)
**Source of truth:** full repository export (`code_export.txt`), 77 files, read in full
**Deadline:** 6 days
**Status:** This document is the only artifact this pass produces. No code was written.

---

## 0. Executive Summary

The exported repository is **two backends layered on top of each other**, plus a frontend that only talks to the newer one.

1. An **abandoned Day-1 architecture** described in `README.md` and `docs/plan.md`: MLSD structure detection → CLIP room classification → Stable Diffusion/ControlNet, running on Colab. **None of this code exists in the repo.** `clip_service.py`, `mlsd_service.py`, `generation_orchestrator.py`, `prompt_builder.py`, `backend/app/services/style_templates.py` — all referenced by the README, none present. This is 100% stale documentation.
2. A **live but incomplete architecture**: a top-level `ai/` package that calls Replicate's `adirik/interior-design` model directly (no ControlNet, no CLIP, no MLSD — the README's own pipeline diagram is fiction at this point), driven by 5 hardcoded style templates, no room analysis, no refinement capability, no cloud storage, no tests.
3. A **dead third implementation**: `backend/app/services/inference_service.py` (`InferenceService` ABC + `MockInferenceService`) is never imported by anything — it was superseded by `ai/providers/base_provider.py` (`BaseAIProvider`) but never deleted. A near-duplicate, `replicate_inference_service.py`, sits at the repo root, also never imported, also never deleted, and its own docstring admits it was supposed to be moved into `backend/app/services/` and never was.

The current app **cannot do the two things the assignment actually requires**: (a) analyze a room and generate real recommendations (today it just repeats 1 of 5 static templates — no vision model ever looks at the image for that purpose), and (b) iteratively refine a design ("make the sofa blue") — there is no refinement endpoint, no chained-image concept, and no support for it anywhere in the data model.

**Step 2 below replaces the AI architecture**: Gemini 2.5/3 Flash for analysis (free, multimodal, JSON-mode, 1,500 req/day) + `black-forest-labs/flux-kontext-pro` on Replicate for generation and refinement (the only model in reach that does image+instruction editing rather than text-to-image-from-scratch, and the only one that supports true multi-turn refinement on the same image). This also **replaces** the "3 variations per generate call" pattern — that pattern exists only because `adirik/interior-design` was cheap enough to call 3x; Kontext Pro is not, and 3x calls per request would burn the free Replicate quota in a handful of demos. The new pattern is 1 generation + unlimited cheap regenerate/refine calls, which is both more capable (real refinement) and cheaper in aggregate.

---

## 1. STEP 1 — Repository Audit

### 1.1 File-by-file disposition

Legend: **KEEP** (no change) · **MODIFY** (edit in place) · **MOVE** (relocate, content mostly unchanged) · **MERGE** (combine with another file) · **DELETE** (remove entirely)

| File | Disposition | Reason |
|---|---|---|
| `.gitignore` | KEEP | Already excludes storage, env files, temp scripts correctly. |
| `README.md` | MODIFY | Describes a pipeline (MLSD/CLIP/ControlNet/SD) that does not exist in this repo, references files (`clip_service.py`, `mlsd_service.py`, `backend/app/services/style_templates.py`, `generation_orchestrator.py`) that were never created. Must be rewritten to document the actual (new) Gemini + Kontext-Pro architecture, actual endpoints, actual folder structure. Misleading docs are worse than no docs for a 6-day deadline. |
| `replicate_inference_service.py` (repo root) | **DELETE** | Dead file. Never imported anywhere (`generate.py` imports `ai.service.AIService`, not this). Its own docstring says "drop this file in `backend/app/services/`" — it never was. Fully superseded by the new `gemini_provider.py`/`replicate_provider.py` design below. Duplicate logic of `ai/providers/replicate_provider.py` with a slightly different, now-obsolete interface (`control_image_path` param that the target model never used). |
| `.vscode/settings.json` | KEEP | Harmless local dev config. |
| `ai/config.py` | MERGE → `backend/app/config.py` | Two separate Settings/config systems (`Settings` in `backend/app/config.py`, `AISettings` here) is a real inconsistency: two `.env` loaders, two sources of truth for `REPLICATE_API_TOKEN`. Also contains dead entries: `MODELS["fast"] = "lucataco/sandbox:fast"` and `MODELS["edit"] = "lucataco/sandbox:edit"` are placeholder model IDs that were never real Replicate models and are never selectable (`ACTIVE_MODEL` always resolves to `"quality"`). Merge all AI provider config into the single `backend/app/config.py` (see §3). |
| `ai/formatter.py` | DELETE | `format_variations()` is an identity function (`return variations`). Zero-value abstraction; inline where used or remove. |
| `ai/service.py` | MERGE → `backend/app/services/analysis_service.py` + `generation_service.py` | `AIService.generate_design()` is a thin pass-through to the orchestrator. Under the new design there is no single "AIService" — analysis and generation are separate concerns/endpoints (§3, §4). |
| `ai/storage.py` | MOVE → `backend/app/services/storage_service.py` | `download_and_save()` is legitimate, reusable logic — just misplaced at the repo root instead of inside `app/`. Becomes the seed of the new `StorageService` (§8). |
| `ai/__init__.py` | DELETE | Empty; folder itself is being removed (its contents redistributed into `backend/app/`, see below). |
| `ai/image/postprocess.py` | DELETE | No-op placeholder (`return image`), never called from anywhere with a real transform. Zero placeholder implementations is a hard requirement — either implement it (nothing in this spec requires postprocessing) or delete it. Deleting. |
| `ai/image/preprocess.py` | MOVE → `backend/app/utils/image_utils.py` (function `resize_for_upload`) | Currently also a no-op, but *unlike* postprocess this one has a real job to do: Replicate/Gemini both have image-size limits, so basic downscaling before upload is genuinely needed. Implemented for real in the target spec (§8), merged into the existing `image_utils.py` rather than kept as a separate near-empty file. |
| `ai/image/__init__.py` | DELETE | Folder removed. |
| `ai/prompts/builder.py` | REPLACE → `backend/app/ai/prompt_builder.py` | Current `build_prompt()` only builds a static style-template string for the old adirik model. Entirely replaced by the deterministic, versioned prompt system in §5 (Gemini analysis prompt + Kontext generation prompt + Kontext refinement prompt). |
| `ai/prompts/negative.py` | MERGE → `backend/app/ai/prompt_builder.py` | Negative prompt is still useful conceptually but Kontext Pro does not use `negative_prompt` the way SD-style models do (it's instruction-based editing). Its content becomes a "things to avoid" clause folded into the generation prompt template, not a separate API parameter. |
| `ai/prompts/system.py` | MERGE → `backend/app/ai/prompt_builder.py` | Same treatment — folded into the versioned template, not a standalone concatenation function (the spec explicitly bans "concatenate random strings throughout the codebase"; centralizing into one templated builder fixes this). |
| `ai/prompts/__init__.py` | DELETE | Folder removed. |
| `ai/providers/base_provider.py` | MOVE → `backend/app/ai/providers/base_provider.py` | Correct abstraction, keep the interface shape, update the method signature (drop the unused `control_image_path` param — the new models don't need a separate control image). |
| `ai/providers/registry.py` | MOVE → `backend/app/ai/providers/provider_registry.py` | Correct pattern (factory function keyed by config). Extend to register both `gemini` (analysis) and `replicate` (generation) providers — today it only knows one provider type for one purpose. |
| `ai/providers/replicate_provider.py` | MODIFY + MOVE → `backend/app/ai/providers/replicate_provider.py` | Swap model from `adirik/interior-design` (3-seed batch, no instruction editing, no refinement) to `black-forest-labs/flux-kontext-pro` (image+instruction editing, supports the refinement flow). Drop the `SEEDS = [42, 123, 777]` batch-of-3 pattern — one call per generate/refine request (see §2 for why). Add an explicit `client.run(..., timeout=...)` and a bounded retry (today there is none — a hung Replicate call hangs the request indefinitely). |
| `ai/providers/__init__.py` | DELETE | Folder removed (contents moved into `backend/app/ai/providers/`). |
| `ai/services/orchestrator.py` | SPLIT → `backend/app/services/generation_service.py` + `refinement_service.py` | `GenerationOrchestrator.run()` currently does five jobs in one method (load image, build prompt, call provider, format, persist). Split per single-responsibility: `GenerationService.create(...)` (first redesign) and `RefinementService.refine(...)` (edit an existing generation) — see §3 for exact responsibilities. The `try/except`-per-stage pattern in this file is good and should be preserved in the split versions. |
| `ai/services/__init__.py` | DELETE | Folder removed. |
| `ai/styles/templates.py` | KEEP content, MOVE → `backend/app/ai/prompts/style_hints.py` | The 5 style definitions (furniture, palette, budget tag, reason template) are good creative content — but they're no longer the *only* source of recommendations (Gemini generates dynamic ones per Step 2). Repurposed as **style-hint context fed into the Gemini analysis prompt** (so "Bohemian" still means something consistent), not as the final recommendation output. Also fixes the duplication problem below. |
| `ai/styles/__init__.py` | DELETE | Folder removed. |
| `backend/.env.example` | MODIFY | Add `GEMINI_API_KEY`, remove/replace `AI_MODE=mock` (dead — nothing reads it to select a real mock path anymore, see next row), add `ACTIVE_GENERATION_PROVIDER`, `ACTIVE_ANALYSIS_PROVIDER`. |
| `backend/requirements.txt` | MODIFY | Add `replicate`, `google-genai` (or current official Gemini SDK package), `tenacity` (retry), `httpx` (already a transitive FastAPI dep, but pin for the async provider calls). Currently missing `replicate` entirely even though 3 files in the repo import it — this repo would not even `pip install` and run today. |
| `backend/app/config.py` | MODIFY | Absorb `ai/config.py` (merge, see above). Remove `AI_MODE` (dead: `routers/generate.py` never branches on it — it always calls the real `ai.service.AIService`, so `health.py` reporting `AI_MODE` from settings is actively misleading, always says "mock" while doing real paid API calls). Add `GEMINI_API_KEY`, `REPLICATE_API_TOKEN`, `REPLICATE_TIMEOUT_SECONDS`, `GEMINI_TIMEOUT_SECONDS`. |
| `backend/app/logging_config.py` | KEEP | Solid: proper root handler reset, DEBUG/INFO switch, silences noisy uvicorn loggers. No changes needed. |
| `backend/app/main.py` | MODIFY | Add router includes for the new `/api/analyze`, `/api/refine`, `/api/generation/{id}`, `/api/styles`, `/api/providers`, `/api/config` endpoints (§6). Add a startup validation step that fails fast if `GEMINI_API_KEY`/`REPLICATE_API_TOKEN` are missing (today a missing `REPLICATE_API_TOKEN` is only discovered on the first real request, mid-demo). |
| `backend/app/__init__.py` | KEEP | — |
| `backend/app/database/models.py` | MODIFY | Extend `Generation` with new columns (analysis JSON, status, error, processing_time, provider/model actually used, parent_generation_id for refinement chains). Full diff in §7. `Variation` model: keep table (harmless), but it is no longer populated with 3 rows per generation under the new 1-image flow — see §7 for the exact backward-compatible handling. |
| `backend/app/database/session.py` | KEEP | Correct SQLAlchemy 2.0 pattern, correct SQLite `check_same_thread` handling, clean `get_db()` generator. No changes. |
| `backend/app/database/__init__.py` | KEEP | — |
| `backend/app/repositories/generation_repository.py` | MODIFY | Add `update_status()`, `set_error()`, `get_children()` (for refinement chains), `delete()` (for the new `DELETE /api/history/{id}` endpoint — does not exist today). Keep all 5 existing methods as-is; they're correctly written (explicit `select()`, proper `commit()`/`refresh()`, good logging, FK-ownership check in `set_selected_variation`). |
| `backend/app/repositories/__init__.py` | KEEP | — |
| `backend/app/routers/generate.py` | REPLACE | Current file wires `ai.service.AIService` (a module that no longer exists after this migration) into a single `/generate` endpoint that does upload+analyze+generate in one shot with no separate analysis step and no way to refine. Replaced by 3 leaner routers: `analyze.py`, `generate.py` (new body), `refine.py` (§6). |
| `backend/app/routers/health.py` | MODIFY | Remove the misleading `AI_MODE` field (see config.py note). Add real provider-availability checks (can we reach Gemini/Replicate right now, or at least: are the keys present) — this becomes the basis for the new `GET /api/providers` endpoint too. |
| `backend/app/routers/history.py` | MODIFY | Add `DELETE /api/history/{id}` (cleans up DB row + associated files via `StorageService`). Keep `GET /history` and `GET /history/{id}` as-is — correctly written, proper 404 handling, proper logging. `POST /history/{id}/select/{variation_id}` — **KEEP**, still valid once `Variation` rows exist (regenerate produces a new "variation" of the same generation; see §7). |
| `backend/app/routers/__init__.py` | KEEP | — |
| `backend/app/schemas/common.py` | MODIFY | `HealthResponse` loses `ai_mode`, gains `providers: dict[str, bool]`. |
| `backend/app/schemas/generation.py` | MODIFY | Add `AnalyzeResponse`, `GenerateRequest`/`GenerateResponse` (new shape), `RefineRequest`/`RefineResponse`, extend `GenerationOut` with the new DB columns from §7. |
| `backend/app/schemas/__init__.py` | KEEP | — |
| `backend/app/services/inference_service.py` | **DELETE** | Confirmed dead code: `InferenceService` ABC + `MockInferenceService` are never imported by `routers/generate.py` (which uses `ai.service.AIService` instead) or by anything else in the repo. Fully superseded by `ai/providers/base_provider.py`. Zero live references. Remove entirely rather than "preserve for compatibility" — nothing depends on it. |
| `backend/app/services/__init__.py` | KEEP | Becomes the home of the new service modules (§3). |
| `backend/app/utils/exceptions.py` | MODIFY | Add `AnalysisServiceError`, `RefinementServiceError`, `ProviderUnavailableError` (all subclass `InteriorAIError`, same pattern as existing 3 — keep the pattern, extend the taxonomy). |
| `backend/app/utils/image_utils.py` | MODIFY | Absorb `ai/image/preprocess.py`'s job for real (resize before sending to providers — currently a no-op). `validate_image_file()` currently trusts the client-supplied `Content-Type` header only — add a real check: open the file with Pillow and call `.verify()` so a renamed non-image file is actually rejected, not just files with a spoofed header. |
| `backend/app/utils/__init__.py` | KEEP | — |
| `docs/plan.md` | MODIFY | Add a short "Status" banner at the top stating this is the **original Day-1–13 plan, superseded by `finish_backend.md`** — keep it for historical context (it has genuinely useful reasoning, e.g. why a specific ₹ budget figure was rejected) but stop it from being read as current. |
| `frontend/.env.example` | KEEP | Correct, matches `VITE_API_BASE` usage in `client.js`. |
| `frontend/index.html` | KEEP | Not reviewed for backend audit scope; no backend dependency. |
| `frontend/package-lock.json`, `package.json`, `vite.config.js` | KEEP | Frontend tooling, out of backend scope. |
| `frontend/src/App.jsx` | MODIFY (frontend, noted for completeness) | Routes assume a `variations` picker step producing 3 images per generation. Under the new 1-image-per-generate flow this route's purpose changes to "regenerate/compare", not "pick 1 of 3 from a single batch call." Not this document's primary scope (backend-only), flagged so the frontend owner isn't surprised. |
| `frontend/src/index.css`, `main.jsx` | KEEP | No backend coupling. |
| `frontend/src/api/client.js` | KEEP | `resolveImageUrl()` correctly strips local path prefixes to map onto the `/static` mount — **this breaks** once `StorageService` starts returning real cloud URLs (§8) instead of local paths. Flagging for the frontend owner; backend should return full absolute URLs post-migration so this normalization function becomes unnecessary rather than patched further. |
| `frontend/src/api/generationApi.js` | MODIFY (frontend) | Needs new `analyzeRoom()`, `refineDesign()` functions matching the new endpoints. `generateDesign(imageFile, style)` signature changes — `style` becomes optional/replaced by the Gemini-derived `redesign_prompt` (§2). |
| `frontend/src/components/*.jsx` (9 files) | Not in backend scope | Reviewed for contract awareness only: `VariationCard.jsx`, `BeforeAfterSlider.jsx`, `DesignExplanation.jsx` will need field-name updates once `GenerationOut` schema changes (§7), but no backend action required here. |
| `frontend/src/constants/styleTemplates.js` | **Duplication flag, frontend-owned fix** | This file is a byte-for-byte content duplicate of the old `ai/styles/templates.py` (same 5 styles, same furniture/palette/reason strings), and its own header comment says "keep in sync with `backend/app/services/style_templates.py`" — a path that **has never existed** in this repo. This is exactly the "duplicated utilities" pattern the audit was asked to flag. Backend fix: expose the style hints via the new `GET /api/styles` endpoint (§6) so the frontend can fetch them instead of hardcoding a second copy that silently drifts. |
| `frontend/src/context/GenerationContext.jsx`, `hooks/*.js`, `layouts/*.jsx`, `pages/*.jsx` | Not in backend scope | No action required by this spec; flagged only if the new response schemas (§7) rename fields they currently read. |

### 1.2 Cross-cutting problems found (not tied to one file)

- **Two parallel AI stacks.** `ai/` (top-level) and `backend/app/services/inference_service.py` implement the same abstraction twice, with only one ever actually wired to a router. This is the single biggest source of confusion in the repo and is fully resolved by the consolidation in §1.1/§3.
- **`try/except ImportError` scattered across 4 files** (`ai/service.py`, `ai/providers/replicate_provider.py`, `ai/services/orchestrator.py`) to handle "am I running as `ai.x` or `backend.ai.x`?" — a symptom of the `ai/` package living outside `backend/` while importing `backend/app/*` modules. Resolved structurally once everything lives under `backend/app/` (§3) — there is only one valid import root and these try/except blocks are deleted entirely, not preserved.
- **README/plan.md describe an architecture that was never built.** MLSD, CLIP, ControlNet, Colab tunnel — none of it exists in code. This isn't a "missing feature," it's stale documentation actively describing the wrong system. Fixed in §1.1 (README rewrite).
- **No tests anywhere in the repository.** Zero `test_*.py` files, no `pytest` in `requirements.txt`. Full plan in §12.
- **No real content-based image validation.** `validate_image_file()` trusts the `Content-Type` header from the client, which is trivially spoofable. Fixed in §9.
- **No timeout/retry on the outbound Replicate call.** `client.run(...)` has no `timeout=` kwarg; a stalled Replicate request would hang the FastAPI worker indefinitely. Fixed in §4/§10.
- **`health.py` reports a config value (`AI_MODE`) that no code path actually branches on** — the app always calls the real provider, so this field has been lying since whenever the mock path was retired. Fixed in §1.1.
- **No refinement / iteration support at any layer** — not in the DB schema, not in the API, not in the AI provider interface. This is the single largest functional gap relative to the assignment brief ("iterative refinements").
- **No structured room analysis** — the "AI-powered Interior Design Assistant" currently never asks an AI to look at the room and produce recommendations; it looks up 1 of 5 hardcoded templates by the *style the user already picked*. The image is only ever used as generation input, never as analysis input. This is the second-largest functional gap.

---

## 2. STEP 2 — Final Architecture Decision

**Decision: Gemini 2.5/3 Flash (analysis) + `black-forest-labs/flux-kontext-pro` on Replicate (generation + refinement).**

This confirms the user's preferred direction and is chosen over alternatives for these reasons:

1. **Kontext Pro is the only model in reach that does image+instruction editing.** The models available in the free/cheap tier that are text-to-image-only (Imagen 4, FLUX 1.1 Pro, FLUX Dev, Ideogram v3 Turbo, and the previously-used `adirik/interior-design` which — despite its name — takes a fixed prompt/seed batch, not a natural-language edit instruction) cannot take an existing generated image plus a follow-up instruction like "make the sofa blue" and edit only that. Kontext Pro is built specifically to read an existing photo plus an instruction and modify it in place, which is exactly both required flows: (a) redesign the uploaded room, (b) refine the same image with a new instruction.
2. **Gemini for analysis, not Replicate, because it's free and it's the right tool for structured text/JSON.** Gemini 2.5/3 Flash's free tier (1,500 requests/day, multimodal input, native JSON mode) covers the entire "analyze the room and generate recommendations" surface (room type, furniture list, sizes, palette, budget, layout notes, lighting, and the `redesign_prompt` string handed to Kontext) without spending any of the limited Replicate credit on a step that doesn't need image generation at all.
3. **Drop the "3 variations per call" batching pattern.** It was a reasonable pattern for the old, cheap `adirik/interior-design` model, but Kontext Pro billing is per-call and per-image; issuing 3 calls on every `/generate` (as the current `SEEDS = [42, 123, 777]` loop does) triples cost for a feature (3 alternate seeds of the *same* prompt) that is strictly less useful than real refinement. The new pattern: **one generation per `/generate` call**, with cheap, cheap-to-retry `/refine` calls doing the iteration a person actually wants ("make it warmer," "different sofa," "brighter lighting"). A `POST /api/generate` with the same input can still be called again for a fresh alternate take (regenerate), the user just isn't charged 3x by default.
4. **Provider abstraction stays and gets used for real.** The existing `BaseAIProvider`/registry pattern in `ai/providers/` was structurally correct — it's kept, just extended to register a `GeminiProvider` (analysis) alongside `ReplicateProvider` (generation/refinement), and moved under `backend/app/ai/providers/` so there's exactly one import root (§3).
5. **What was rejected and why:** running Gemini for image generation too (Gemini has some image-out capability) was considered and rejected — Kontext Pro's specific design for structure-preserving instruction edits is more reliable for "keep the walls/windows fixed, change the furniture" than a general-purpose model, and splitting analysis/generation across two providers costs nothing extra (Gemini's free tier is not the bottleneck; Replicate's paid tier is, and this design minimizes Replicate calls, not Gemini calls).

---

## 3. STEP 3 — Backend Architecture

Final layout (only layers that are actually used are kept — no speculative `middleware/` or `configuration/` folder since `config.py`/CORS-in-`main.py` already cover that ground adequately for this project's size):

```
backend/
├── requirements.txt
├── .env.example
└── app/
    ├── __init__.py
    ├── main.py                         # MODIFY — new routers, startup validation
    ├── config.py                       # MODIFY — absorbs ai/config.py
    ├── logging_config.py               # KEEP
    │
    ├── ai/                             # NEW package (replaces top-level ai/)
    │   ├── __init__.py
    │   ├── prompt_builder.py           # REPLACES ai/prompts/builder.py + negative.py + system.py
    │   ├── prompts/
    │   │   ├── __init__.py
    │   │   ├── style_hints.py          # MOVED from ai/styles/templates.py (context, not final output)
    │   │   └── schemas.py              # NEW — Gemini JSON-mode response schema (Pydantic + JSON schema dict)
    │   └── providers/
    │       ├── __init__.py
    │       ├── base_provider.py        # MOVED from ai/providers/base_provider.py
    │       ├── gemini_provider.py      # NEW — analysis
    │       ├── replicate_provider.py   # MOVED + MODIFIED (flux-kontext-pro, not adirik)
    │       └── provider_registry.py    # MOVED from ai/providers/registry.py, extended
    │
    ├── api/
    │   └── routers/
    │       ├── __init__.py
    │       ├── health.py                # MODIFY
    │       ├── analyze.py               # NEW
    │       ├── generate.py              # REPLACE
    │       ├── refine.py                # NEW
    │       ├── history.py               # MODIFY
    │       ├── styles.py                # NEW
    │       ├── providers.py             # NEW
    │       └── config.py                # NEW
    │
    ├── schemas/
    │   ├── __init__.py
    │   ├── common.py                    # MODIFY
    │   └── generation.py                # MODIFY
    │
    ├── models/
    │   └── (unused — SQLAlchemy ORM models stay in database/models.py, matching current convention;
    │          no separate models/ layer introduced, avoids a redundant folder for a project this size)
    │
    ├── repositories/
    │   ├── __init__.py
    │   └── generation_repository.py     # MODIFY
    │
    ├── services/
    │   ├── __init__.py
    │   ├── analysis_service.py          # NEW — calls GeminiProvider, builds AnalyzeResponse
    │   ├── generation_service.py        # NEW — calls ReplicateProvider for first redesign
    │   ├── refinement_service.py        # NEW — calls ReplicateProvider for edits on an existing image
    │   └── storage_service.py           # MOVED from ai/storage.py, extended (§8)
    │
    ├── database/
    │   ├── __init__.py
    │   ├── models.py                    # MODIFY (§7)
    │   └── session.py                   # KEEP
    │
    ├── utils/
    │   ├── __init__.py
    │   ├── exceptions.py                # MODIFY
    │   └── image_utils.py               # MODIFY
    │
    └── storage/                          # runtime data dir, unchanged (uploads/, control_images/, generated/)
```

**Removed entirely:** top-level `ai/` package, `backend/app/services/inference_service.py`, root `replicate_inference_service.py`. Nothing keeps the old import paths — this is a clean cut, not a shim layer, because the deadline doesn't afford maintaining two parallel systems.

---

## 4. STEP 4 — AI Pipeline

### 4.1 Provider abstraction

```python
# backend/app/ai/providers/base_provider.py
from abc import ABC, abstractmethod

class AnalysisProvider(ABC):
    @abstractmethod
    async def analyze_room(self, image_bytes: bytes, mime_type: str) -> dict:
        """Returns the structured analysis dict matching schemas.AnalysisResult."""

class GenerationProvider(ABC):
    @abstractmethod
    async def generate(self, image_bytes: bytes, mime_type: str, prompt: str) -> str:
        """Returns a URL (or local path, post-StorageService) to the generated image."""

    @abstractmethod
    async def refine(self, image_bytes: bytes, mime_type: str, instruction: str) -> str:
        """Same contract as generate(), but source image is a prior generation, not the original upload."""
```

Two separate interfaces (not one `BaseAIProvider` doing both, as the old code had) because analysis and generation are genuinely different capabilities that may be swapped independently — e.g. someone could later swap in a different vision model for analysis while keeping Kontext Pro for generation.

### 4.2 `gemini_provider.py` (NEW)

- Input: raw image bytes + mime type.
- Calls Gemini with `response_mime_type="application/json"` and the schema from `ai/prompts/schemas.py` (Step 5) — do not rely on prompt-only JSON discipline; use the SDK's native structured-output mode so parsing never has to guess at model formatting.
- Output fields (all required, see §5.2 for the exact schema): `room_type`, `detected_style`, `furniture` (list of `{item, description, estimated_price_range}`), `estimated_dimensions` (`{width_ft, length_ft, confidence}`), `layout_notes`, `color_palette` (list of hex codes + names), `lighting_suggestions`, `estimated_budget_range`, `style_explanation`, `redesign_prompt` (the exact string handed to `generate()`).
- Timeout: 20s (Gemini Flash typical latency is 2–5s for this payload; 20s gives headroom without letting one slow call block the request indefinitely).
- Retries: 1 retry on transient 5xx/timeout via `tenacity`, no retry on 4xx (bad request = won't succeed on retry).
- Errors surface as `AnalysisServiceError`.

### 4.3 `replicate_provider.py` (MODIFIED)

- Model: `black-forest-labs/flux-kontext-pro`.
- `generate(image_bytes, mime_type, prompt)`: single `client.run()` call, `input={"input_image": <base64 or file>, "prompt": prompt}`. No seed batching, no `negative_prompt` param (Kontext Pro doesn't take one — its precision comes from being specific in the positive instruction, per its own docs; this is why the old `ai/prompts/negative.py` content is folded into the *positive* generation prompt template as an explicit "keep unchanged: ..." clause instead, see §5.3).
- `refine(image_bytes, mime_type, instruction)`: identical call shape, source image is the previous generation's file, not the original upload — this is what makes multi-turn refinement work, and it's the one behavior the old provider had zero support for.
- `timeout=45` seconds passed to `client.run()` (missing entirely today — this is a genuine reliability fix, not a style change).
- Retry: 1 retry on transient failure via `tenacity`, matching the analysis provider's policy for consistency.
- Errors surface as `InferenceServiceError` (existing exception class, reused).

### 4.4 `provider_registry.py` (MOVED + EXTENDED)

```python
def get_analysis_provider() -> AnalysisProvider:
    if settings.ACTIVE_ANALYSIS_PROVIDER == "gemini":
        return GeminiProvider()
    raise ProviderUnavailableError(f"Unknown analysis provider: {settings.ACTIVE_ANALYSIS_PROVIDER}")

def get_generation_provider() -> GenerationProvider:
    if settings.ACTIVE_GENERATION_PROVIDER == "replicate":
        return ReplicateProvider()
    raise ProviderUnavailableError(f"Unknown generation provider: {settings.ACTIVE_GENERATION_PROVIDER}")
```

This is what makes "support future providers" real rather than aspirational: adding a third provider means writing one new class implementing `AnalysisProvider` or `GenerationProvider` and adding one `elif` — no business-logic code (`analysis_service.py`, `generation_service.py`) changes.

---

## 5. STEP 5 — Prompt Engineering

All prompt text lives in exactly one place per stage — `backend/app/ai/prompt_builder.py` plus `backend/app/ai/prompts/style_hints.py` for the reference data. Nothing constructs a prompt by string-concatenating fragments scattered across files (the old repo's actual failure mode: negative/system/builder split across 3 files that all had to agree implicitly).

### 5.1 Versioning

Every prompt template is a module-level constant with a version suffix, e.g. `ANALYSIS_PROMPT_V1`. Bumping logic that changes model behavior requires bumping to `_V2` and updating a single `CURRENT_ANALYSIS_PROMPT_VERSION` pointer — old generations already in the DB keep their `prompt_version` value (new DB column, §7) so past results remain explainable even after prompt tuning.

### 5.2 Analysis prompt (Gemini) — JSON schema

```python
ANALYSIS_RESPONSE_SCHEMA = {
    "type": "object",
    "required": ["room_type", "furniture", "estimated_dimensions", "layout_notes",
                 "color_palette", "lighting_suggestions", "estimated_budget_range",
                 "style_explanation", "redesign_prompt"],
    "properties": {
        "room_type": {"type": "string"},
        "furniture": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["item", "description", "estimated_price_range"],
                "properties": {
                    "item": {"type": "string"},
                    "description": {"type": "string"},
                    "estimated_price_range": {"type": "string"}
                }
            }
        },
        "estimated_dimensions": {
            "type": "object",
            "required": ["width_ft", "length_ft", "confidence"],
            "properties": {
                "width_ft": {"type": "number"},
                "length_ft": {"type": "number"},
                "confidence": {"type": "string", "enum": ["low", "medium", "high"]}
            }
        },
        "layout_notes": {"type": "string"},
        "color_palette": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["name", "hex"],
                "properties": {"name": {"type": "string"}, "hex": {"type": "string"}}
            }
        },
        "lighting_suggestions": {"type": "string"},
        "estimated_budget_range": {"type": "string"},
        "style_explanation": {"type": "string"},
        "redesign_prompt": {"type": "string"}
    }
}
```

Sanitization/validation: parse the Gemini response through a matching Pydantic model (`schemas.AnalysisResult`) before it ever reaches `analysis_service.py`'s caller — a schema-validation failure raises `AnalysisServiceError` rather than propagating a malformed dict further into the system. This is the "prompt validation" requirement satisfied structurally rather than by a second LLM call.

### 5.3 Generation prompt template (fed to Kontext Pro's `prompt` field)

`redesign_prompt` comes directly from Gemini's own analysis output (Gemini is explicitly asked, as part of the JSON schema above, to author the exact instruction string for the image model — it has full context on what it just observed, so it writes a better instruction than a second, disconnected template could). `prompt_builder.py` wraps that string with one deterministic, non-negotiable clause appended every time:

```
{gemini_redesign_prompt}
Keep the room's structural layout unchanged — walls, windows, doors, and camera
perspective must match the original photo exactly. Only change furniture, decor,
colors, and lighting.
```

This is the direct replacement for the old model-level `negative_prompt` — Kontext Pro responds to positive, specific instructions about what to preserve rather than a bag of negative keywords, so the "preserve structure" behavior the old negative prompt tried to achieve (`"extra walls, missing windows"`) is expressed positively instead, per the model's documented best practice of being explicit about what should stay the same.

### 5.4 Refinement prompt template

```
{user_instruction}
Apply this change only. Keep everything else in the image exactly as it is —
same furniture placement, same room structure, same lighting style, same camera
angle — unless the instruction explicitly says otherwise.
```

`user_instruction` is the free-text the user types (e.g. "make the sofa blue"), sanitized (§5.5) but otherwise passed through directly — this is deliberately less templated than the generation prompt because the whole point of refinement is following the user's specific, arbitrary request.

### 5.5 Sanitization

Both `redesign_prompt` construction and refinement `user_instruction` pass through a shared `sanitize_prompt(text: str) -> str` in `prompt_builder.py`: strip control characters, cap length at 2,000 characters (Kontext Pro prompt limit headroom), collapse excess whitespace. No other filtering — this is a creative tool, not a content-moderation surface beyond what Replicate's own model-side safety already enforces.

---

## 6. STEP 6 — API Design

| Endpoint | Purpose | Request | Response | Status codes | Auth | Rate limit |
|---|---|---|---|---|---|---|
| `POST /api/analyze` | Upload a room photo, get structured recommendations + the prompt that will drive generation | `multipart/form-data`: `image` (file) | `AnalyzeResponse` (analysis fields from §5.2 + `analysis_id`) | 201 created · 400 invalid image · 500 analysis failed | None (solo-user demo scope; see §9 note) | None (Gemini free tier is the natural limiter) |
| `POST /api/generate` | Turn an analysis into a redesigned image | JSON: `{analysis_id: int}` **or** `multipart`: `image` + `redesign_prompt` (supports skipping `/analyze` for power users/tests) | `GenerationOut` (§7) | 201 · 400 · 404 analysis not found · 500 generation failed | None | None (Replicate cost is the natural limiter — see §10 for a soft per-session cap) |
| `POST /api/refine` | Edit an existing generation with a new instruction | JSON: `{generation_id: int, instruction: str}` | `GenerationOut` (new row, `parent_generation_id` set) | 201 · 400 · 404 parent not found · 500 refinement failed | None | None |
| `GET /api/generation/{id}` | Fetch one generation (initial or refined) by id | — | `GenerationOut` | 200 · 404 | None | None |
| `GET /api/history` | List past generations, most recent first | Query: `limit` (default 50) | `list[GenerationOut]` | 200 | None | None |
| `DELETE /api/history/{id}` | Delete a generation and its associated files | — | `{"deleted": true}` | 200 · 404 | None | None |
| `GET /api/styles` | Style hint reference data (replaces the frontend's hardcoded duplicate, §1.1) | — | `list[StyleHint]` | 200 | None | None |
| `GET /api/health` | Liveness + provider key presence | — | `HealthResponse` | 200 | None | None |
| `GET /api/providers` | Which analysis/generation providers are active and whether their keys are configured | — | `{"analysis": {...}, "generation": {...}}` | 200 | None | None |
| `GET /api/config` | Non-secret runtime config the frontend needs (max upload size, allowed mime types) | — | `{"max_upload_mb": int, "allowed_types": list[str]}` | 200 | None | None |

**`select variation` endpoint from the old repo** (`POST /history/{id}/select/{variation_id}`) is **kept as-is** — still valid, since regenerating (`/generate` called again with the same analysis) or refining both still produce `Variation` rows scoped to a `Generation`, and "which one did the user actually keep" is still a meaningful thing to record (§7).

Every endpoint above: request validated via Pydantic schema (auto via FastAPI), errors go through the existing `InteriorAIError` → `app_exception_handler` pattern (kept unchanged — it's correctly written), every request/response logged at INFO with method+path+status per the existing `logging_config.py` convention (kept unchanged).

---

## 7. STEP 7 — Database

### 7.1 `generations` table — column diff

| Column | Change | Reason |
|---|---|---|
| `id`, `original_image_path`, `style`, `created_at` | KEEP | Unchanged. |
| `control_image_path` | **DELETE** | Was for the old ControlNet ~~pipeline~~ that never existed; Kontext Pro needs no separate control image. |
| `room_type_detected`, `room_confidence` | KEEP, repurposed | Now genuinely populated from Gemini's `room_type` output (previously always hardcoded to the literal string `"room"` with `confidence=1.0` — dead weight masquerading as real data). |
| `prompt_used` | KEEP, renamed → `redesign_prompt` | Same purpose, clearer name once it's Gemini-authored rather than template-concatenated. |
| `prompt_version` | **NEW** | Tracks which `ANALYSIS_PROMPT_V*`/generation template version produced this row (§5.1). |
| `analysis_json` | **NEW** (`Text`/`JSON` column) | Full structured Gemini output (§5.2) — furniture list, dimensions, palette, budget, lighting, explanation. This is the actual "recommendations" feature; it did not exist before. |
| `parent_generation_id` | **NEW**, nullable FK → `generations.id` | Set when a row is the output of a `/refine` call on a prior generation; null for original `/generate` calls. This is what makes refinement chains queryable (`get_children()` in the repository, §3). |
| `provider` | **NEW** | `"gemini"` for the analysis leg is tracked on the `analyses` concept implicitly via `analysis_json`; `provider` here records the *generation* provider actually used (`"replicate"`), matching the "support future providers" requirement — lets you audit which backend produced a given image if providers are swapped later. |
| `model_used` | KEEP | Now stores `"flux-kontext-pro"` instead of `"adirik/interior-design"`. |
| `status` | **NEW**, enum-like string (`pending`/`completed`/`failed`) | Required by the spec's "status" field; also lets `/refine` show a row immediately as `pending` while the Replicate call is in flight, rather than only appearing once fully done. |
| `error` | **NEW**, nullable | Populated on `status="failed"` so failures are visible in `/history` instead of silently missing. |
| `processing_time_sec` | RENAMED from `generation_time_sec` | Same data, clearer that it can represent either a generate or refine call. |
| `estimated_dimensions`, `layout_notes`, `color_palette`, `estimated_budget_range` | Covered by `analysis_json` | Not broken into separate columns — they're inherently nested/list-shaped (palette is a list of hex+name pairs) and are only ever read as a unit by the frontend, so a single JSON column is the right level of normalization here; breaking them into 4+ extra columns would be over-normalizing data that's never queried/filtered on individually. |
| `selected_variation_id` | KEEP | Unchanged, still points at a `Variation` row. |

### 7.2 `variations` table

**KEEP the table, change its population semantics.** Previously: 3 rows inserted per `/generate` call (one per seed). Now: 1 row inserted per successful `/generate` or `/refine` call (the single image produced), still scoped to its `generation_id`. This keeps `POST /history/{id}/select/{variation_id}` meaningful (a generation may accumulate several variation rows over time — one from the original generate, more from each refine attempt against it if the user tries a few different instructions on the same base — and "select" marks which one the user actually wants to keep) without inventing a new table for a concept ("a generated image belonging to a generation") that already exists.

### 7.3 Migration approach

Additive-only (new nullable columns, new FK, one column rename handled via `ALTER TABLE ... RENAME COLUMN`, one column drop). See exact ordered steps in §13. Backward compatible in the sense that existing rows remain valid — `analysis_json` is nullable so pre-migration rows just show it as empty in `/history` rather than breaking.

---

## 8. STEP 8 — Storage

```
Original upload (multipart file)
   ↓
StorageService.save_upload()      → backend/storage/uploads/{uuid}.{ext}   (unchanged location/logic from image_utils.save_upload, moved into StorageService for cohesion)
   ↓
resize_for_upload() (image_utils) → downscaled copy if >2048px on the long edge, before any provider call
   ↓
Replicate input (base64/file, in-memory — never written to a second temp file)
   ↓
Generated output (Replicate returns a URL)
   ↓
StorageService.download_and_save() → backend/storage/generated/{uuid}_gen.png   (existing logic from ai/storage.py, moved)
   ↓
DB row (generations/variations tables store the local path)
   ↓
history (served via the existing /static mount in main.py — unchanged)
   ↓
cleanup: StorageService.delete_generation_files(generation_id) — NEW, called by DELETE /api/history/{id}
```

**Cloud storage:** out of scope for the 6-day deadline — local disk + the existing `/static` StaticFiles mount is sufficient for a demo-scale app and matches what's already working. Documented here explicitly as a deliberate scope cut (not an oversight) so it isn't silently assumed later: if this ships beyond a demo, swap `StorageService`'s save/download methods to write to S3/GCS instead of local disk — the interface (`save_upload`, `download_and_save`, `delete_generation_files`) doesn't change, so this is a contained future change, not a rewrite.

**Cleanup strategy:** `DELETE /api/history/{id}` removes both the DB rows (cascade already correctly configured via `cascade="all, delete-orphan"` on `Generation.variations`, kept as-is) and the on-disk files (new code, since nothing currently deletes files — today storage grows unbounded). No scheduled/background cleanup job — out of scope for 6 days; explicit deletion via the new endpoint is the only cleanup path, which is sufficient for a demo-scale app.

---

## 9. STEP 9 — Security

| Requirement | Current state | Fix |
|---|---|---|
| Environment variables | Already used (`.env` via `pydantic-settings`) | Consolidate to one `.env` loader (§1.1, `ai/config.py` merge) instead of two independently-loading Settings classes. |
| API key management | `REPLICATE_API_TOKEN` read from env, never logged | Add `GEMINI_API_KEY` the same way. Add a startup check (§3, `main.py`) that fails fast with a clear message if either key is missing, instead of failing on the first real request. Never include key values in log lines (already true, keep it that way). |
| Request validation | FastAPI/Pydantic auto-validates shapes | Unchanged, already correct. |
| File validation | Content-Type header trusted, size checked | ADD: `Image.open(file).verify()` via Pillow as a second check in `validate_image_file()` — rejects files with a spoofed image `Content-Type` header that aren't actually valid images. |
| Image validation | Same as above | Same fix. |
| Size limits | `MAX_UPLOAD_SIZE_MB` enforced, validated `>0` via Pydantic validator | KEEP, already correct. |
| Mime validation | Allow-list of 3 types (`jpeg`/`png`/`webp`) | KEEP the allow-list, add the Pillow-verify step above so the allow-list can't be bypassed by a spoofed header. |
| CORS | `allow_methods=["*"]`, `allow_headers=["*"]`, origins from `.env` | Tighten to `allow_methods=["GET","POST","DELETE"]` (only methods actually used) and an explicit header list, since `"*"` is broader than this API needs. Origins list stays env-driven (already correct pattern). |
| Logging | Structured, INFO/DEBUG split, no secrets logged | KEEP. |
| Error handling | Global `InteriorAIError` handler + catch-all 500 handler | KEEP, both are correctly written. Extend the exception taxonomy per §1.1 (`AnalysisServiceError` etc.), same pattern. |
| Timeouts | **Missing on the Replicate call today** | ADD (§4.3): 45s for generation/refinement, 20s for analysis. |
| Retry strategy | **Missing entirely today** (per-seed try/except just skips, no actual retry) | ADD via `tenacity`: 1 retry on transient errors for both providers (§4.2/4.3). |
| Provider keys never exposed | KEEP | Already true — keys never appear in any response schema. Verify `GET /api/providers` returns only booleans (`configured: true/false`), never the key values themselves. |
| Authentication | **None on any endpoint** | Explicitly out of scope for this 6-day, solo-project deadline — documented as an accepted risk in §14, not silently skipped. |

---

## 10. STEP 10 — Performance

- **Async I/O**: convert the provider calls to `async def` (`httpx.AsyncClient` for Gemini if the SDK doesn't already support async; Replicate's Python client supports async via `replicate.Client(...).async_run` in recent versions — verify against the pinned version in `requirements.txt` and use it) so a `/generate` request doesn't block the single-worker event loop for the full ~10–20s Kontext Pro latency.
- **Connection pooling**: reuse one `httpx.AsyncClient`/`replicate.Client` instance per provider (module-level singleton, not re-instantiated per request) — today `ReplicateProvider.__init__` creates a fresh `replicate.Client` on every dependency injection, which is wasteful but not broken; fix by constructing providers once at app startup and injecting the singleton via FastAPI `Depends`.
- **Provider retries**: covered in §9/§4 — bounded (1 retry), not unbounded.
- **Response caching**: not applicable — every request is a unique image + unique prompt, nothing cacheable.
- **Streaming uploads**: current `save_upload()` already reads in 8KB chunks (`while chunk := upload_file.file.read(8192)`) — correct, KEEP as-is.
- **Memory usage / temp files**: `resize_for_upload()` (§8) operates on the in-memory PIL image before it's ever sent to a provider, avoiding an extra temp-file round trip.
- **Soft per-session cost guard**: given Replicate's limited free credit (explicitly called out by the user's own research), add a simple in-memory or DB-backed counter of generate/refine calls in the last hour and return 429 past a configurable threshold (`MAX_GENERATIONS_PER_HOUR`, default generous e.g. 30) — cheap insurance against an accidental infinite-loop frontend bug burning the whole demo budget, not a real rate-limiter/auth system.

---

## 11. STEP 11 — Observability

- **Structured logging**: KEEP the existing format (`%(asctime)s [%(levelname)s] %(name)s:%(lineno)d - %(message)s`) — already good. Add one log line per provider call recording provider name, model, elapsed time, success/failure — this is the "provider timing" requirement, implemented as structured log lines rather than a separate metrics system (right-sized for 6 days; a full metrics stack like Prometheus is out of scope).
- **API timing**: add a lightweight `main.py` middleware that logs `method path status elapsed_ms` for every request — one small addition, no new dependency needed (plain `time.perf_counter()` around `call_next`).
- **Error reporting**: already centralized through the two exception handlers in `main.py` — KEEP, no separate error-reporting service (e.g. Sentry) added; out of scope for 6 days, noted as a reasonable future addition in §14.
- **Health checks**: `GET /api/health` (existing, modified per §6) — liveness. `GET /api/providers` (new) — doubles as a readiness check for the two external dependencies.
- **Provider availability checks**: `GET /api/providers` reports whether `GEMINI_API_KEY`/`REPLICATE_API_TOKEN` are present (not a live ping on every health check call — that would burn quota just from monitoring; presence-of-key is the right-weight check here).
- **Startup validation**: `main.py` lifespan function fails fast (existing pattern, `sys.exit(1)` on DB init failure — KEEP that pattern) and now also does so if required env vars are missing, per §9.

---

## 12. STEP 12 — Testing Plan

Currently: **zero tests exist.** Add `pytest`, `pytest-asyncio`, `httpx` (for `TestClient`) to `requirements.txt`. Structure:

```
backend/tests/
├── conftest.py                  # test DB (SQLite in-memory), FastAPI TestClient fixture, mock provider fixtures
├── unit/
│   ├── test_prompt_builder.py       # sanitize_prompt(), template construction determinism (same input → same output)
│   ├── test_image_utils.py          # validate_image_file() accepts valid, rejects spoofed content-type, rejects oversized
│   └── test_generation_repository.py # CRUD + FK ownership check in set_selected_variation (existing logic, needs coverage)
├── integration/
│   ├── test_analyze_endpoint.py     # POST /api/analyze with mocked GeminiProvider → correct schema shape
│   ├── test_generate_endpoint.py    # POST /api/generate with mocked ReplicateProvider → correct GenerationOut, DB row created
│   ├── test_refine_endpoint.py      # POST /api/refine → parent_generation_id set correctly, new Variation row
│   ├── test_history_endpoints.py    # list/get/delete, including delete removing files via StorageService
│   └── test_health_and_providers.py # /api/health, /api/providers report correctly when keys present/absent
├── provider/
│   ├── test_gemini_provider.py      # schema validation of parsed response, timeout behavior (mocked)
│   └── test_replicate_provider.py   # timeout param passed correctly, retry triggers once then raises (mocked)
└── failure/
    ├── test_provider_timeout.py     # simulated hang → request fails within configured timeout, not indefinitely
    ├── test_invalid_image.py        # non-image file with spoofed image/png header → 400, not a 500 crash
    ├── test_oversized_image.py      # file > MAX_UPLOAD_SIZE_MB → 400
    └── test_provider_failure.py     # simulated Gemini/Replicate 5xx → clean AnalysisServiceError/InferenceServiceError, not an uncaught exception
```

All provider tests mock `GeminiProvider`/`ReplicateProvider` at the interface level (`AnalysisProvider`/`GenerationProvider` ABCs) — no real API calls in the test suite, so tests are free, fast, and don't burn the limited Replicate quota.

---

## 13. STEP 13 — Migration Plan

Every step leaves the backend in a runnable state. No big-bang rewrite.

1. **Add dependencies.** Update `requirements.txt` (`replicate`, Gemini SDK, `tenacity`, `pytest`+friends). App still runs exactly as before (imports just aren't used yet).
2. **Consolidate config.** Merge `ai/config.py` into `backend/app/config.py`. Update the 3 files that imported `ai.config.ai_settings` to import from `app.config.settings` instead. App still runs unchanged (old providers still work, just reading config from the merged location).
3. **Create the new `backend/app/ai/` package** (providers, prompts, prompt_builder) alongside the old `ai/` package — don't delete `ai/` yet. Implement `GeminiProvider`, rewrite `ReplicateProvider` for Kontext Pro, extend `provider_registry.py`. Nothing wired to a router yet — app still runs on the old path.
4. **Add the new DB columns** (additive migration per §7.1/7.3 — `ALTER TABLE` adds, one rename, `control_image_path` dropped last in step 8 below, not now). App still runs — old code paths don't reference the new columns, new columns just sit there nullable.
5. **Build `analysis_service.py`, `generation_service.py`, `refinement_service.py`** in `backend/app/services/`, wired to the new `backend/app/ai/` providers. Not yet exposed via routers — testable in isolation (unit tests from §12 can run against these now).
6. **Add the new routers** (`analyze.py`, new `generate.py` body, `refine.py`, `styles.py`, `providers.py`, `config.py`) and wire them into `main.py`. **This is the cutover point** — the old `/api/generate` behavior (old `ai.service.AIService`) is replaced in the same PR/commit as the new routers land, since keeping both live simultaneously would mean two endpoints doing conflicting things with the same DB table.
7. **Delete the old stack**: top-level `ai/` package, `backend/app/services/inference_service.py`, root `replicate_inference_service.py`. App runs entirely on the new path now.
8. **Drop `control_image_path` column**, rename `prompt_used`→`redesign_prompt`, `generation_time_sec`→`processing_time_sec` (the two renames deferred to their own step so any code still referencing the old names surfaces as an import/attribute error immediately, not silently at runtime).
9. **Add `StorageService.delete_generation_files()` + `DELETE /api/history/{id}`.**
10. **Add observability middleware** (request timing, §11) and the startup env-var validation (§9/§11).
11. **Write the test suite** (§12) — last, once the surface area it's testing is final, so tests aren't rewritten twice.
12. **Rewrite `README.md`** to describe the actual shipped system (this document's §2–§8), removing the stale MLSD/CLIP/Colab description.

---

## 14. STEP 14 — Definition of Done

- [ ] `pip install -r requirements.txt` succeeds with no missing packages (fixes the current gap where `replicate` isn't even listed despite being imported by 3 files).
- [ ] `GET /api/health` returns 200 and does not report a misleading `ai_mode` field.
- [ ] `GET /api/providers` correctly reports `configured: false` for a provider when its API key env var is unset, without crashing the app.
- [ ] `POST /api/analyze` with a real room photo returns a fully-populated `AnalyzeResponse` matching the schema in §5.2 — no field silently empty due to a Gemini JSON-mode parsing failure.
- [ ] `POST /api/generate` produces one image, persists one `Generation` row and one `Variation` row, and the image is reachable via the existing `/static` mount.
- [ ] `POST /api/refine` against an existing generation produces a new row with `parent_generation_id` correctly set, and the resulting image reflects only the requested change.
- [ ] `GET /api/history` and `GET /api/generation/{id}` return the new schema fields (`analysis_json`, `status`, `parent_generation_id`, etc.) correctly serialized.
- [ ] `DELETE /api/history/{id}` removes both the DB row and its on-disk files.
- [ ] `GET /api/styles` returns the 5 style hints — and the frontend's duplicated `constants/styleTemplates.js` is no longer the only source of this data (frontend follow-up, flagged not fixed by this backend spec).
- [ ] A spoofed-header non-image upload is rejected with 400, not a downstream 500.
- [ ] A simulated Replicate hang is cut off at the configured timeout rather than hanging the request indefinitely.
- [ ] `pytest` runs and passes for every file listed in §12.
- [ ] `README.md` accurately describes the shipped architecture — no reference to MLSD, CLIP, ControlNet, or Colab remains unless explicitly marked as historical/superseded.
- [ ] No file in the repository is dead/unreferenced (`ai/`, `inference_service.py`, root `replicate_inference_service.py` all removed; confirm via `grep -r` for old import paths returning zero matches).
- [ ] Zero TODOs, zero placeholder function bodies (`ai/image/postprocess.py`-style no-ops) remain anywhere in `backend/`.
- [ ] `.env.example` lists every environment variable the app actually reads, and only those.
- [ ] Two consecutive full runs (analyze → generate → refine → history → delete) complete without manual intervention — the same "rehearse it twice" bar the original `docs/plan.md` correctly set for the old architecture.
