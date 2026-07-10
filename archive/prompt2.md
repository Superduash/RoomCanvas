# prompt2.md
### RoomCanvas — Deployment, Database, AI Quality & Customization Implementation Spec
Implement everything in this file. Work top to bottom; each section is self-contained enough to build in one pass. Report back only a changelog of what was actually built — no restated plan.

---

## 1. Deployment Architecture & Database Plan

**Frontend → Vercel. Backend → Render (Web Service, Python/FastAPI). Database → Render Managed Postgres, not MongoDB.**

This is a deliberate call, not the default — here's why, since you asked for the plan: the backend is already built on SQLAlchemy ORM models (`generation_repository.py`, `models.py`) with real relational structure (`generations` → `variations`, foreign-keyed, cascade-deleted). Postgres is a **connection-string change**, same ORM, same models, same queries — near-zero migration risk with 4 days left. MongoDB would mean rewriting every repository method, redesigning the schema as documents, and losing the FK-cascade delete you already have working — that's a multi-day rewrite for no functional gain here, since your data genuinely is relational (a generation *has* variations, a variation *belongs to* one generation). Use MongoDB when your data is document-shaped and schema-flexible; this data isn't. Recommendation: **Render Postgres free tier**, swap `DATABASE_URL`, done.

```python
# app/config.py — add, alongside existing settings
DATABASE_URL: str = "sqlite:///./roomcanvas.db"  # local dev default stays SQLite, unchanged
```
On Render, set `DATABASE_URL` env var to the Postgres connection string Render provides (starts `postgresql://`). SQLAlchemy's `create_engine(settings.DATABASE_URL)` already reads this dynamically if it isn't hardcoded — audit `database.py`/`db.py` and confirm the engine is built from `settings.DATABASE_URL`, not a literal SQLite path, and add `pool_pre_ping=True` (Render/Postgres free tier drops idle connections — without this you'll get random `OperationalError` after any quiet period):
```python
engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True, pool_size=5, max_overflow=10)
```
Install `psycopg2-binary` in `requirements.txt` for the Postgres driver.

### Upstash Redis — used surgically, not as a cache-everything layer

Budget target: comfortably under 500k commands/month. Use the **Upstash REST client** (`upstash-redis` Python package — HTTP-based, not a persistent TCP connection, which also suits Render's free-tier networking better than a raw `redis-py` TCP client). Two uses only, both genuinely cheap:

**(a) Cache `/config` and `/styles` responses** — these barely ever change. 1 `GET` per cold cache, 1 `SET` on population, TTL 1 hour. At even 10,000 requests/day to these two endpoints, that's ~2 Redis commands per request only on cache miss (once/hour), i.e. ~48 commands/day for this — negligible.
```python
# app/cache/redis_cache.py
from upstash_redis import Redis
from app.config import settings
import json

redis = Redis(url=settings.UPSTASH_REDIS_URL, token=settings.UPSTASH_REDIS_TOKEN)

def cached_json(key: str, ttl_seconds: int, compute_fn):
    cached = redis.get(key)
    if cached:
        return json.loads(cached)
    value = compute_fn()
    redis.set(key, json.dumps(value), ex=ttl_seconds)
    return value
```
Use in `routers/config.py` / `routers/styles.py`: `return cached_json("styles:v1", 3600, lambda: build_styles_payload())`.

**(b) Rate-limit `/analyze`, `/generate`, `/refine`** — this is the actual point: protecting your Replicate spend from an accidental loop or abuse, which matters far more than caching. One `INCR` + one `EXPIRE` (only on first increment) per protected request — 1-2 commands per real user action, and real user actions (uploads/generations) are inherently low-frequency compared to page views.
```python
# app/middleware/rate_limit.py
from fastapi import Request, HTTPException
from app.cache.redis_cache import redis

async def rate_limit(request: Request, key_prefix: str, limit: int, window_seconds: int):
    client_ip = request.client.host
    key = f"ratelimit:{key_prefix}:{client_ip}"
    count = redis.incr(key)
    if count == 1:
        redis.expire(key, window_seconds)
    if count > limit:
        raise HTTPException(status_code=429, detail="Too many requests — please wait a moment before trying again.")
```
Apply as a FastAPI dependency on the three expensive routes: `analyze`: 10/hour per IP, `generate`: 15/hour per IP, `refine`: 20/hour per IP — tune these numbers to your actual demo/interview traffic, not production scale. **Do not** rate-limit `/health`, `/config`, `/styles`, `/history`, or `/generation/{id}` (polling) — those stay DB/memory-only, zero Redis involvement, which is also why the command budget stays so low despite polling happening every 2 seconds.

**Explicitly do NOT**: cache `/history` (changes every request), cache individual `/generation/{id}` polls (defeats the purpose of polling for fresh status, and multiplies commands by poll frequency for no benefit), or use Redis as a session/pub-sub layer (not needed at this scale).

---

## 2. Backend Performance — real bugs found, not just generic advice

**Bug: `storage_service.py`'s `download_and_save()` uses blocking `requests.get()` inside what should be a fully async pipeline.** This blocks the entire event loop for however long the download takes (often 1-3s for a generated image), stalling every other concurrent request on a single-worker Render instance. Fix:
```python
# app/services/storage_service.py
import httpx

@staticmethod
async def download_and_save(image_url: str, save_dir: str = settings.GENERATED_DIR) -> str:
    os.makedirs(save_dir, exist_ok=True)
    filename = f"{uuid.uuid4().hex}_gen.png"
    filepath = os.path.join(save_dir, filename)
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(str(image_url))
        resp.raise_for_status()
        with open(filepath, "wb") as f:
            f.write(resp.content)
    logger.info(f"Downloaded generated image to {filepath}")
    return filepath
```
Update every call site (`generation_service.py`, `refinement_service.py`) to `await` this — it's already inside `async def` background task functions, so this is a pure win with no other code shape change needed.

**N+1 check on `/history`.** Confirm `GenerationRepository.list_recent()` eager-loads `variations` (`selectinload(Generation.variations)` or `joinedload`) rather than lazy-loading each generation's variations on access — with `limit=50` a lazy-load pattern is 51 queries instead of 2. Add `selectinload` if missing:
```python
from sqlalchemy.orm import selectinload

def list_recent(self, limit: int = 50):
    return self.db.query(Generation).options(selectinload(Generation.variations)).order_by(Generation.created_at.desc()).limit(limit).all()
```

**Response compression.** Add `GZipMiddleware` in `main.py` — JSON history payloads and the app's static assets both benefit, essentially free:
```python
from fastapi.middleware.gzip import GZipMiddleware
app.add_middleware(GZipMiddleware, minimum_size=1000)
```

**Image upload size on the way in.** Before saving an uploaded file, downscale anything larger than ~2000px on the long edge before it ever reaches Gemini/Replicate (`Pillow`, in `image_utils.py`) — this cuts Gemini upload payload size, Replicate input size, and disk usage simultaneously, with no visible quality loss at the resolutions these models actually use internally.

**Connection reuse for Gemini/Replicate clients.** Confirm `GeminiProvider`/`ReplicateProvider` are instantiated once at app startup (`init_providers()`, singleton) rather than per-request — re-creating an HTTP client per request throws away connection pooling/keep-alive. If currently constructed per-request, move construction into a startup hook and inject via FastAPI dependency.

---

## 3. Frontend Performance (React/MERN best practice, applied)

- **React Query `staleTime` tuning**: `/config` and `/styles` → `staleTime: Infinity` (they're cached server-side now too, per §1 — no reason to ever refetch mid-session). `/history` → `staleTime: 30_000` so rapid back-and-forth navigation between History and Results doesn't refire a fetch every time.
- **Debounce the History search input** at 250ms (should already be specified — verify it's actually implemented, not just filtering on every keystroke, which re-renders the full list on every character for no benefit).
- **`React.memo` on `HistoryCard`** and any list-rendered component — verify list re-renders don't cascade from unrelated state changes (e.g., typing in search shouldn't re-render cards that didn't change).
- **Route-level code splitting** (`React.lazy`) — verify this is actually wired in the router, not just planned; check bundle output size (`npm run build`) and confirm no single chunk exceeds ~250KB gzipped for the initial route.
- **Image `loading="lazy"`** on History grid thumbnails, `loading="eager"` + `fetchpriority="high"` only on the Results page's primary compare image.
- **Zustand selector discipline** — audit every `useUIStore(...)` call; any that destructure the whole store instead of selecting one field causes unrelated re-renders across every component using the store.

---

## 4. AI Prompt Engineering — grounded in real interior-design principles

The reported bug (unevenly distributed, asymmetric ceiling lights) is a **specificity gap**, not a model limitation — Kontext Pro follows explicit instructions well but has no reason to infer "evenly spaced" unless told. Rebuild the generation prompt template around the seven core interior-design principles (balance, scale/proportion, rhythm, emphasis, contrast, harmony, details) plus the practical rules that actually prevent the specific bug you saw:

```python
# app/ai/prompt_builder.py

DESIGN_PRINCIPLES = """
Apply professional interior design principles:
- Balance: distribute visual weight evenly. If ceiling or wall light fixtures are used,
  space them symmetrically and evenly across the ceiling/wall — never asymmetric or
  unevenly clustered. Mirror furniture placement around a central axis where the room
  layout allows.
- Scale and proportion: furniture must be sized appropriately for the room's real
  dimensions — a coffee table roughly two-thirds the width of the sofa it faces,
  seating that doesn't overwhelm or underfill the floor area.
- Rhythm: repeat 2-3 colors, materials, or shapes across the room (e.g. the same wood
  tone on two different furniture pieces) to create visual flow rather than a
  collection of unrelated objects.
- Emphasis: establish exactly one clear focal point (a feature wall, a statement
  light fixture, or an anchor furniture piece) that the rest of the room supports
  rather than competes with.
- Contrast: pair at least one light surface against one dark surface, and one smooth
  material against one textured material, to avoid a flat, monotonous look.
- Harmony: keep the full palette and material selection coherent with the requested
  style — no clashing colors or mismatched design eras.
- Details: include finishing touches appropriate to the style — hardware finishes,
  trim, small styling objects — not just large furniture.
Follow the 60-30-10 color rule: roughly 60% dominant wall/floor tone, 30% secondary
furniture/textile tone, 10% accent color in small decor items. Keep furniture pulled
slightly away from walls rather than pressed flat against them. If a rug is used, size
it so at least the front legs of major seating rest on it. Hang any wall art so its
visual center sits at roughly average eye level relative to the floor.
"""

QUALITY_SUFFIX = """
Target architectural visualization quality comparable to professional real-estate renders.

Prioritize:
- architectural accuracy
- furniture proportion
- material realism
- lighting realism
- preservation of room geometry
- premium interior styling
- consistency with the requested design language

If a tradeoff exists, always preserve the original room architecture over adding additional decorative elements.
""" + DESIGN_PRINCIPLES

def build_generation_prompt(gemini_redesign_prompt: str) -> str:
    gemini_redesign_prompt = sanitize_prompt(gemini_redesign_prompt)
    return f"""{gemini_redesign_prompt}
Keep the room's structural layout, walls, windows, doors, ceiling height, and camera
angle/perspective exactly as in the original photo. Preserve the original direction
and quality of natural and ambient light — only add or adjust light sources the
redesign explicitly calls for. Only change furniture, decor, surface colors/materials,
and lighting fixtures.
{QUALITY_SUFFIX}"""

def build_refinement_prompt(user_instruction: str) -> str:
    user_instruction = sanitize_prompt(user_instruction)
    return f"""{user_instruction}
Apply this change only. Keep everything else in the image exactly as it is — same
furniture placement, same room structure, same lighting direction, same camera
angle — unless the instruction explicitly says otherwise.
{QUALITY_SUFFIX}"""
```

This directly targets the ceiling-light symmetry bug (explicit "space them symmetrically and evenly" instruction under Balance) while also systematically covering the other six principles instead of relying on the model's default interpretation.

---

## 5. Regenerate Must Produce Real Variants, Not Near-Duplicates

**Root cause confirmed in the current code:** the Replicate call never passes a `seed` parameter at all, and every stored `Variation` row hardcodes `"seed": 0` — there is no actual randomness control, so "Generate Again" sends the identical prompt and gets a near-identical result. Fix both the randomness source and the on-theme variation:

```python
# app/ai/providers/replicate_provider.py
import random

async def generate(self, image_bytes: bytes, mime_type: str, prompt: str) -> tuple[str, int]:
    seed = random.randint(1, 2_147_483_647)
    ...
    output = await client.async_run(
        self.model,
        input={"input_image": file_obj, "prompt": prompt, "seed": seed},
    )
    ...
    return image_url, seed  # return the real seed so it's actually stored, not a hardcoded 0
```
Update call sites in `generation_service.py`/`refinement_service.py` to unpack `(image_url, seed)` and pass the real `seed` into `repo.add_variations(generation.id, [{"image_path": ..., "seed": seed}])` instead of the hardcoded `0`.

**On top of seed randomness, add theme-consistent prompt variation** so "regenerate" explores genuinely different choices within the same style, not just a different random noise pattern on the same described furniture. Add a small per-style pool of interchangeable secondary descriptors and pick a fresh combination on every generate call:

```python
# app/ai/style_hints.py — extend each style entry with variation pools
STYLE_VARIATION_POOLS = {
    "modern_minimalist": {
        "accent_materials": ["brushed brass", "matte black steel", "warm oak"],
        "focal_points": ["a sculptural pendant light", "a large abstract canvas", "a statement bookshelf wall"],
        "textile_moods": ["neutral linen textures", "soft bouclé accents", "subtle geometric-pattern textiles"],
    },
    # ... one entry per style id, 3 options each is enough for meaningful variation
}

def pick_variation_descriptors(style_id: str) -> str:
    pools = STYLE_VARIATION_POOLS.get(style_id, {})
    if not pools:
        return ""
    chosen = {k: random.choice(v) for k, v in pools.items()}
    return f"Incorporate {chosen.get('accent_materials', '')} accents, {chosen.get('focal_points', '')} as the focal point, and {chosen.get('textile_moods', '')}."
```
Splice `pick_variation_descriptors(style_id)` into `build_generation_prompt()` for the "Generate Again" path specifically (not the very first generation, which should follow Gemini's specific analysis-driven prompt as-is) — this is what makes two "Generate Again" outputs on the same style feel like two different designer's takes rather than two renders of the same take.

---

## 6. Expand the Style Catalog — including regional/cultural styles

Current catalog is 5 Western-leaning styles. Extend `style_hints.py`'s style list (each entry needs `id`, `furniture`, `palette`, `budget_tag`, `reason_template` matching the existing shape exactly, so no schema change is needed anywhere else in the app):

```python
ADDITIONAL_STYLES = [
    {
        "id": "indian_contemporary",
        "furniture": ["low-profile teak wood sofa", "brass-inlay coffee table", "hand-block-print cushions", "jali-pattern room divider"],
        "palette": ["#8B4513", "#D4AF37", "#F5F0E6", "#2E5339"],
        "budget_tag": "Mid-Range",
        "reason_template": "A {room_type} that blends contemporary form with traditional Indian craft details — brass accents, block-print textiles, and warm wood tones.",
    },
    {
        "id": "japandi",
        "furniture": ["low platform bed or seating", "natural oak furniture", "paper/rice-weave lighting", "minimal ceramic decor"],
        "palette": ["#E8E2D5", "#4A4238", "#B8A88A", "#1C1C1C"],
        "budget_tag": "Mid-Range",
        "reason_template": "A {room_type} combining Japanese minimalism with Scandinavian warmth — natural materials, low furniture, and quiet, uncluttered lines.",
    },
    {
        "id": "mediterranean",
        "furniture": ["wrought-iron accents", "terracotta planters", "linen upholstered seating", "carved wood console"],
        "palette": ["#F2E9D8", "#3B6E8F", "#C97C4A", "#7A8B69"],
        "budget_tag": "Mid-Range",
        "reason_template": "A sun-washed {room_type} inspired by coastal Mediterranean homes — terracotta, whitewashed textures, and warm blue accents.",
    },
    {
        "id": "traditional_indian_heritage",
        "furniture": ["hand-carved wooden furniture", "jaali screens", "brass lanterns", "rich jewel-tone textiles"],
        "palette": ["#7B1E3A", "#D4AF37", "#1B4332", "#F4E9CD"],
        "budget_tag": "Premium",
        "reason_template": "A {room_type} rooted in traditional Indian heritage design — carved wood, brass detailing, and rich jewel-toned textiles.",
    },
    {
        "id": "coastal",
        "furniture": ["woven rattan chairs", "light driftwood tones", "linen slipcovers", "nautical-inspired accents"],
        "palette": ["#F7F5F0", "#A8C5D6", "#E8DCC8", "#2C3E50"],
        "budget_tag": "Budget-Friendly",
        "reason_template": "A breezy, light-filled {room_type} with coastal textures — rattan, driftwood tones, and soft ocean-inspired color.",
    },
]
```
Append these to the existing `STYLES` list (do not replace) so `GET /api/styles` returns 10 total, frontend requires zero changes since it already renders whatever the endpoint returns (per `final_frontend.md`'s "always render from the fetched list" rule).

---

## 7. Gemini Optimization + Bring Back the Analysis Screen on Regenerate/Refine/Customize

**Token efficiency**: audit `ANALYSIS_PROMPT_V1` for any repeated/redundant instruction blocks and trim them — Gemini structured-output mode (`response_schema`) means you don't need to re-explain the JSON shape in prose *and* enforce it via schema; keep the schema as the source of truth and keep the prose instructions to what actually needs reasoning (room type, furniture, dimensions, style rationale), not formatting rules the schema already guarantees.

**"Favor output quality over latency"**: Favor output quality over latency within the provider's supported limits. Use the highest practical quality settings supported by the configured model, while avoiding unreasonable timeouts or unnecessary retries that reduce reliability. Raise `GEMINI_TIMEOUT_SECONDS` from its current value to **60** (analysis quality matters more than shaving a few seconds off a one-time per-room call), and confirm the retry backoff (`wait_exponential(min=2, max=10)`) doesn't fire on a merely-slow-but-succeeding call — only on actual transient failures (already fixed in the prior audit pass, verify it's still intact).

**Bringing back the analysis/checklist screen for regenerate, refine, and the new customization flow**: reuse the existing `AnalysisStepper` component (already built per `final_frontend.md` §9.2) rather than building a second one. Currently it's likely only shown on the very first upload→analyze→generate path. Show the same staged-progress experience any time a new generation is being created and awaited — regenerate, refine, and customize-and-regenerate all go through the same `usePollGeneration` polling contract, so they should all get the same honest staged UI instead of a bare spinner:
- Step labels for the **first generation**: "Analyzing room… / Estimating layout… / Finding furniture… / Calculating dimensions… / Creating recommendations… / Preparing your design…" (unchanged).
- Step labels for **regenerate/refine/customize** (no re-analysis happening, so don't claim to be analyzing): "Applying your changes… / Adjusting layout… / Rendering materials and lighting… / Finalizing your design…" — same component, different `steps` prop, driven by the same real polling state underneath (not fake timing pretending to re-analyze something that isn't being re-analyzed).

---

## 8. Customization Panel — checkboxes, dimensions, structured prompt generation

New feature: before generating (or when regenerating), let the user specify concrete constraints that get compiled into the Replicate prompt precisely, instead of relying only on free-text refinement.

**Data shape:**
```typescript
// src/api/types.ts — addition
interface CustomizationOptions {
  mustHaveFurniture?: string[];       // checkboxes: ["Sofa", "Bookshelf", "Dining table", "TV unit", "Plants", "Rug", "Accent chair"]
  colorPreference?: string;            // optional free text or a preset swatch pick
  budgetTier?: 'Budget-Friendly' | 'Mid-Range' | 'Premium';  // optional override of the style's default
  lightingPreference?: 'Warm' | 'Cool' | 'Natural daylight';  // optional
  roomDimensions?: { widthFt?: number; lengthFt?: number };  // optional — overrides Gemini's estimate if the user knows the real size
  avoid?: string[];                    // checkboxes: things to explicitly exclude, e.g. ["Dark colors", "Glass surfaces", "Open shelving"]
}
```

**Backend — extend the generate request and build a structured addendum:**
```python
# app/schemas/generation.py
class CustomizationOptions(BaseModel):
    must_have_furniture: list[str] = []
    color_preference: str | None = None
    budget_tier: str | None = None
    lighting_preference: str | None = None
    room_width_ft: float | None = None
    room_length_ft: float | None = None
    avoid: list[str] = []

class GenerateRequest(BaseModel):
    analysis_id: int
    customization: CustomizationOptions | None = None
```
```python
# app/ai/prompt_builder.py
def build_customization_clause(c: "CustomizationOptions") -> str:
    if c is None:
        return ""
    parts = []
    if c.must_have_furniture:
        parts.append(f"The design must include: {', '.join(c.must_have_furniture)}.")
    if c.color_preference:
        parts.append(f"Favor a color palette centered on {c.color_preference}.")
    if c.budget_tier:
        parts.append(f"Select furniture and materials appropriate for a {c.budget_tier.lower()} budget.")
    if c.lighting_preference:
        parts.append(f"Use {c.lighting_preference.lower()} lighting throughout.")
    if c.room_width_ft and c.room_length_ft:
        parts.append(f"The actual room is approximately {c.room_width_ft} by {c.room_length_ft} feet — scale furniture proportionally to this real size.")
    if c.avoid:
        parts.append(f"Avoid the following entirely: {', '.join(c.avoid)}.")
    return " ".join(parts)
```
Splice this into `build_generation_prompt()` as an additional appended clause, after the base redesign prompt and before `QUALITY_SUFFIX` — so it's a real, ordered part of the instruction, not an afterthought.

**Frontend — customization panel** lives on the Results page as an expandable section next to (not replacing) the free-text `RefinementPanel`: checkboxes for `mustHaveFurniture` and `avoid` (both optional, multi-select), a budget-tier segmented control (optional, defaults to the style's own tag), lighting preference chips (optional), and two number inputs for width/length (optional, pre-filled from `analysis_json`'s `estimated_dimensions` if present but editable). "Regenerate with these options" button calls `POST /generate` with `{ analysis_id, customization }` and — per §7 — shows the customize-flavored `AnalysisStepper` while it runs, landing on a **new** generation (sibling, not overwrite), consistent with the existing "Generate Again creates a new row" behavior already specified.

---

## 9. Software Engineering & UI Principles — cross-cutting checklist

- **Backend**: single-responsibility services (`AnalysisService`, `GenerationService`, `RefinementService` each own exactly one pipeline stage), repository pattern already isolates DB access from business logic — keep it that way, don't let routers touch the DB directly. Pydantic schemas are the only validation boundary — no manual `if not x: raise` scattered through services where a schema constraint would do.
- **Frontend**: component boundaries match the primitive/layout/feature split already established in `final_frontend.md` — don't let page components grow into 500-line files; extract as soon as a page needs more than ~3 distinct concerns.
- **Error handling parity**: every new endpoint (customization) follows the exact same error-shape convention as existing ones (`{"detail": "..."}`, correct status codes) — no ad hoc error format for the new feature.
- **Accessibility parity**: the new customization checkboxes/inputs need real `<label>`s and keyboard operability exactly like every other form element in the spec — this is not exempt just because it's new.
- **No regressions**: confirm every fix in this file is additive to the already-audited backend (§0-§8 of `demo_final.md`) — don't reintroduce the blocking-call or retry-scope bugs while implementing these changes.

---

## 10. What Makes This Unique — for your project review

Concrete, defensible differentiators to state in review (all true of what's actually built by this point, not aspirational marketing):
1. **Refinement lineage, not flat history** — every refinement is a real parent-linked generation, so the app can show design evolution (original → "make it brighter" → "add plants"), not just a flat list of unrelated outputs.
2. **Principled AI prompting, not a single generic instruction** — the generation prompt is built from the seven core interior-design principles plus the 60-30-10 rule, explicitly engineered to fix real, observed failure modes (asymmetric lighting) rather than left to the model's defaults.
3. **Genuine regenerate variance** — real per-call seed randomization plus a theme-consistent variation-descriptor pool, so "Generate Again" produces a meaningfully different on-style take instead of a near-duplicate.
4. **User-directed customization compiled into a structured prompt** — checkboxes and real dimensions feed a deterministic prompt-builder function, not just appended free text.
5. **Cost-aware infrastructure choice, explained, not defaulted** — Postgres over MongoDB because the data is genuinely relational; Redis used for exactly two narrow, high-value purposes (config caching + spend-protecting rate limits) instead of a blanket cache-everything approach, staying comfortably inside a free-tier command budget by design.
6. **Regional style representation** — the style catalog isn't limited to Western design vocabulary; Indian, Mediterranean, and Japandi styles are first-class catalog entries with their own real furniture/palette/reasoning, not a single generic "international" bucket.

---

## 11. Days 2–5 — folded into this pass, implement all of it now

- Replace any remaining fake `setTimeout`-driven progress steps with real state derived from `usePollGeneration` (pending → analyzing → generating → done) — same visual stepper, honest underlying data, no timer pretending to track real progress.
- Finish the refinement UI wiring on `ResultsPage` if any piece is incomplete, with its own loading state distinct from the initial-generation loading state (both now route through the same `AnalysisStepper` per §7, just different step labels).
- Retire or repurpose any leftover `VariationPicker`-style component — the current data model produces exactly one image per generation row (confirmed in the backend contract), so "pick 1 of 3" no longer applies. Either delete it, or repurpose it into a "refinement history" view walking the `parent_generation_id` chain (original → refine 1 → refine 2) — the second option is the better fit and reinforces differentiator #1 above.
- PWA manifest + minimal service worker (cache the app shell only, not API responses — API data must always be fresh). Add native camera capture via `<input type="file" accept="image/*" capture="environment">` on the upload dropzone for mobile — no custom camera UI needed, this is the simplest correct path.
- Server-side rate limiting on `/analyze`, `/generate`, `/refine` — implemented in §1 above, confirm it's actually wired as a FastAPI dependency on all three routes, not just written and unused.
- Before/after slider polish: verify drag responsiveness, add the entrance spring animation on first render (per `final_frontend.md` §13), confirm keyboard operability (arrow keys move the slider), and test specifically on iOS Safari — both the slider's touch handling and the camera-capture input above, since iOS Safari is the most common place these two features silently break.
- Full accessibility pass: keyboard walk-through of the entire app including the new customization panel, screen-reader labels on every checkbox/input added in §8, contrast check on any new UI (budget-tier segmented control, lighting chips) against the existing token system — no new colors invented outside `tokens.css`.
- Empty/error states: confirm the customization panel has its own empty/default state (nothing selected = behaves exactly like a plain regenerate, not a broken/empty prompt clause) and that a failed customized-generate shows the same error recovery pattern as every other generation failure already specified.

---

# 12. Production Hardening & Demo Finalization

## AI Pipeline Reliability

* Audit the complete Gemini → Prompt Builder → Replicate pipeline.
* Every intermediate AI output must be schema-validated before being used.
* If Gemini returns malformed or incomplete JSON, automatically repair or regenerate instead of failing.
* Never send invalid prompts to Replicate.
* Retry transient provider failures using exponential backoff.
* Automatically fall back to secondary Gemini models when the primary model is temporarily unavailable.
* Preserve the same API contract regardless of provider failures so the frontend never knows which provider succeeded.

---

## Architectural Preservation

The generated room must preserve:

* camera angle
* perspective
* focal length
* field of view
* room geometry
* wall positions
* ceiling height
* window positions
* window dimensions
* door locations
* natural lighting direction
* architectural details

No hallucinated windows.

No shifted walls.

No warped ceilings.

No stretched furniture.

No distorted proportions.

If the AI cannot confidently preserve architecture, prioritize preserving the architecture over adding decorative details.

---

## Interior Design Intelligence

Instead of only following the requested style, the AI should intelligently evaluate:

* walking space
* circulation paths
* furniture spacing
* conversation areas
* TV viewing distance
* sofa orientation
* coffee table proportion
* rug sizing
* lighting hierarchy
* focal point balance
* visual weight
* storage usability

The AI should behave like a professional interior designer instead of a text-to-image model.

---

## Prompt Self-Verification

Before sending the final prompt to Replicate:

Internally verify that the prompt satisfies:

✓ Architectural preservation

✓ Requested style

✓ Room functionality

✓ Balance

✓ Symmetry where appropriate

✓ Material consistency

✓ Color harmony

✓ Realistic lighting

✓ Furniture proportion

✓ High-end finish quality

Only then send the final prompt.

---

## Automatic Quality Score

After Gemini produces the structured room analysis, compute an internal quality score.

Example:

* Room understanding
* Layout confidence
* Lighting confidence
* Furniture confidence
* Estimated redesign complexity

If confidence is low, automatically strengthen the prompt with additional preservation instructions.

---

## Advanced Generation Settings

Centralize all generation parameters.

Create one configuration module containing:

* inference steps
* guidance scale
* prompt strength
* seed
* safety settings
* timeout
* retries
* preserve geometry flags
* preserve lighting flags

Never scatter these values across the codebase.

---

## Security Hardening

Audit the entire application.

Verify:

* MIME type validation
* file extension validation
* image size validation
* image dimension validation
* path traversal protection
* filename sanitization
* CORS configuration
* environment variables
* API key exposure
* error message leakage
* SQL injection protection
* XSS protection
* request validation
* response validation

The application must be production-ready without exposing secrets or internal implementation details.

---

## Frontend Polish

Perform one final UI polish pass.

Verify:

* identical spacing system everywhere
* consistent border radius
* typography hierarchy
* loading animations
* hover states
* keyboard accessibility
* responsive behavior
* empty states
* skeleton loaders
* dark mode readiness
* reduced motion support
* image loading transitions

Every page should feel visually consistent.

---

## Logging & Monitoring

Implement structured logging.

Every request should include:

* request id
* execution time
* provider used
* retry count
* generation id
* user/session id
* error category

Hide stack traces from users while keeping detailed logs for debugging.

---

## Codebase Audit

Perform a final repository audit.

Remove:

* TODOs
* FIXMEs
* dead code
* commented code
* duplicate utilities
* duplicate prompts
* duplicate styles
* unused assets
* unused imports
* unused dependencies

Run linting, formatting and type checking until zero errors remain.

---

## Final Demonstration Checklist

Before completion verify:

✓ Localhost works.

✓ Render deployment works.

✓ Vercel deployment works.

✓ Mobile works.

✓ Tablet works.

✓ Desktop works.

✓ PWA installs correctly.

✓ Camera capture works.

✓ History works.

✓ Delete works.

✓ Regenerate works.

✓ Refine works.

✓ Customization works.

✓ Polling works.

✓ AI providers work.

✓ Graceful fallback works.

✓ Error recovery works.

✓ No console errors.

✓ No broken images.

✓ No placeholder assets.

✓ No mock data.

✓ No unfinished features.

✓ Every visible UI element performs a real function.

---

# 13. Final Engineering Audit & Excellence Pass

This is the final implementation pass before deployment.

Do not simply add features. Critically evaluate the existing implementation and replace inferior solutions with better engineered ones where appropriate.

## Challenge Existing Decisions

Do not assume the current implementation is optimal.

If a simpler, faster, cleaner, more maintainable, or more scalable solution exists while preserving the same API contract, implement it.

Prefer improving architecture over adding complexity.

---

## AI System Excellence

Audit the complete AI pipeline.

Ensure every generation follows a deterministic reasoning pipeline:

1. Understand room geometry.
2. Detect room function.
3. Detect architectural constraints.
4. Detect natural light direction.
5. Estimate dimensions.
6. Detect existing furniture.
7. Detect traffic flow.
8. Detect focal points.
9. Build an interior design plan.
10. Generate the final redesign prompt.

Never skip reasoning stages.

The generated image should feel intentionally designed—not randomly decorated.

---

## Professional Interior Design Rules

Beyond the existing prompt, enforce additional professional guidelines whenever applicable:

- Equal spacing between repeated ceiling lights.
- Equal spacing between wall sconces.
- Furniture aligned to architectural axes.
- Maintain comfortable walking paths.
- Maintain visual symmetry when appropriate.
- Respect ergonomic spacing.
- Preserve realistic furniture scale.
- Avoid floating or intersecting furniture.
- Keep accessories intentionally grouped.
- Use layered lighting (ambient, task, accent).
- Avoid visual clutter.
- Keep decor proportional to wall size.
- Use premium materials consistently.
- Avoid mixing incompatible design eras.

The final room should resemble work produced by a professional interior designer rather than an AI image generator.

---

## Photorealism Improvements

Maximize realism.

Prioritize:

- physically accurate lighting
- soft natural shadows
- realistic indirect bounce lighting
- consistent reflections
- correct material roughness
- fabric texture
- wood grain
- marble veining
- metal reflections
- believable imperfections
- subtle depth variation
- realistic exposure

Avoid:

- plastic-looking materials
- glowing furniture
- warped geometry
- duplicated objects
- blurry textures
- oversaturated colors
- artificial HDR
- excessive sharpening

---

## Theme Consistency

Each style should define:

- furniture language
- material language
- lighting philosophy
- color philosophy
- decorative philosophy
- architecture compatibility
- accessory language

Two generations using the same style should clearly belong to the same design family while still producing different layouts and furniture selections.

---

## Intelligent Regeneration

"Generate Again" should never simply randomize.

Instead:

- preserve the user's chosen style
- preserve architectural constraints
- preserve room function
- preserve room geometry

while intelligently changing:

- furniture layout
- focal point
- accessories
- lighting fixtures
- artwork
- textures
- secondary materials
- accent colors

Each regeneration should feel like a different professional designer's interpretation of the same brief.

---

## Performance Excellence

Perform one final performance audit.

Remove:

- unnecessary renders
- duplicate API calls
- duplicate polling
- expensive state updates
- unnecessary re-computation
- unnecessary object creation
- unnecessary image decoding
- unnecessary component mounting

Verify every expensive computation is memoized or cached appropriately.

---

## Production Readiness

Verify the application behaves correctly under:

- slow internet
- high latency
- temporary AI provider failure
- temporary database failure
- expired cache
- browser refresh during generation
- page navigation during polling
- duplicate clicks
- accidental repeated uploads

The application must recover gracefully without losing user work.

---

## Deployment Audit

Verify:

- Render configuration
- Vercel configuration
- environment variables
- build commands
- startup commands
- health checks
- CORS
- compression
- static asset caching
- image caching
- security headers

No deployment-specific issues should remain.

---

## Documentation

Generate:

- DEPLOYMENT.md
- ENVIRONMENT_VARIABLES.md
- ARCHITECTURE.md
- AI_PIPELINE.md

Each document should accurately reflect the implemented codebase.

---

## Final Goal

Treat RoomCanvas as a production SaaS product rather than a college project.

Every feature should appear intentional, polished, performant, maintainable, and production-ready.

The final result should demonstrate senior-level software engineering, thoughtful AI integration, and high-quality UX suitable for internship, placement, and technical interviews.
