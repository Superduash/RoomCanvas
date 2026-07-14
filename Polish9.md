# Polish9.md — RoomCanvas AI: Demo-Critical Fix Pack

Read this whole file before touching code. The 5 problems below are **not independent** — problem #2 and #3 share the exact same root cause in one file. Fix that first; it collapses two "major problems" into one 10-minute change.

Priority order for tomorrow's demo:
1. **#3 + #2 together** (same bug — `isRefinement` flag) — highest visible impact, he already saw it break live.
2. **#4** (cluttered/portrait room generation) — he explicitly said this is what he wants to test tomorrow.
3. **#5** (measurement accuracy) — he explicitly said this is the second thing he's eager to see.
4. **#1** (stuck loading screen) — annoying but has a workaround (History page) today; fix reduces demo risk.
5. **#6** (cleanup + build check) — do last, after functional fixes are verified.

---

## ISSUE 2 + 3 (FIX TOGETHER): Prompting creates new projects AND ignores the current image

### Root cause — confirmed in code

`frontend/src/pages/ResultsPage.tsx` line 10634:
```ts
const isRefinement = activeGeneration.parent_generation_id !== null;
```

This flag is passed into `DesignEditorPanel` (line 10961) and controls which API call "Apply Changes" makes:

`frontend/src/components/refine/DesignEditorPanel.tsx` (`handleSubmit`):
```ts
if (isRefinement) {
  result = await refine.mutateAsync({ generation_id: generationId, instruction, customization });
} else {
  result = await generate.mutateAsync({ analysisId: generationId, forceNew: true, instruction, customization });
}
```

**The bug:** the very first design you generate is a root row (`parent_generation_id = null`), so `isRefinement = false`. That means the **first time you ever type a prompt** ("remove the sofas and replace it with a blue one"), the app does NOT call `/api/refine`. It calls `/api/generate?force_new=true` instead.

Look at what that path does in `backend/app/services/generation_service.py` (`prepare_generation`, force_new branch):
- Creates a **brand new Generation row with `parent_generation_id` left unset** → this is why it shows up as a **separate project** in the Library (issue #2).
- `run_generation_task` then downloads `generation.original_image_path` — **the original untouched uploaded photo**, not the image currently on screen.
- The prompt sent to Flux is `build_generation_prompt(generation.redesign_prompt, ...)` — the **entire original Gemini design brief**, with your typed instruction just tacked on as `"Additionally: ..."`.

So "remove the sofas, replace with blue" was applied to the original photo together with the whole original redesign brief — not as a small targeted edit to the design you were looking at. That's why one sofa vanished for no reason and the other didn't change color: the model was doing a near-full re-generation, not an edit.

Then it gets worse: that new row *also* has `parent_generation_id = null` (still force_new), so `isRefinement` is **still false** on the next prompt too. "Add indoor plants" therefore *also* went through `/api/generate?force_new`, *again* starting from the original untouched photo — which is exactly why the deleted sofa came back and no plants appeared. Every prompt after the first was silently discarding all previous edits and starting over from the original photo, while also spawning a new disconnected "project" each time.

The `/api/refine` path (`backend/app/services/refinement_service.py`) is actually implemented correctly — it copies the currently-viewed image, sets `parent_generation_id` properly, and uses a much better prompt (`build_refinement_prompt`, "Apply this change only, keep everything else exactly as it is"). It just never gets called for the first several prompts, because of the flag above.

### The fix

**1. `ResultsPage.tsx` — stop deriving `isRefinement` from `parent_generation_id`.** Any prompt typed against an already-completed design must go through `/api/refine`, whether that design is a root or a child:
```ts
// BEFORE
const isRefinement = activeGeneration.parent_generation_id !== null;

// AFTER
const isRefinement = isCompleted; // any completed generation can be refined from
```
Keep a separate variable for whatever UI still needs to know "is this a root design" (e.g. `const isRootGeneration = activeGeneration.parent_generation_id === null;`) — use that only for cosmetic badges/labels, never to choose the API call.

**2. `backend/app/services/generation_service.py` — fix `force_new` to also chain as a version**, for the cases where force_new IS legitimately used (the plain "Regenerate" button, no text instruction):
```python
new_generation = await self.repository.create_generation({
    "original_image_path": generation.original_image_path,
    "style": effective_style,
    ...
    "parent_generation_id": generation.id if generation.parent_generation_id is None else generation.parent_generation_id,
    # or simply: "parent_generation_id": generation.id,
    ...
})
```
Every generation created from an existing one — refine OR regenerate — must set `parent_generation_id` to the generation it was created from. No exceptions. This is what keeps everything as one project with a version timeline instead of spawning new library entries.

**3. Frontend routing bug (compounding issue) — `DesignEditorPanel.tsx` `handleSubmit`:**
```ts
navigate(`/results/${result.id}`);
```
This is wrong. `result.id` is the new **generation** id, but the route `/results/:projectId` expects the **root project id** and fetches `/api/projects/{project_id}`. Navigating to the child's own id makes `get_project_timeline` treat that child as its own root, hiding the real timeline. Fix:
```ts
navigate(`/results/${projectId}?v=${result.id}`);
```
(`projectId` is already a prop on `DesignEditorPanel` — use it, and set the version via the `?v=` query param, exactly like `ResultsPage.tsx`'s own `handleGenerateAgain` already does correctly at line 10677. Copy that pattern.)

**4. `backend/app/repositories/generation_repository.py` — `list_projects()` must exclude fully-failed projects** (issue #2's "failed projects mustn't show in library"):
```python
for root in roots:
    descendants = await self._get_all_descendants(root.id)
    all_gens = [root] + descendants
    completed_gens = [g for g in all_gens if g.status == "completed"]
    if not completed_gens:
        continue  # <-- ADD THIS: skip projects with zero completed generations entirely
    latest = max(completed_gens, key=lambda g: g.created_at)
    ...
```
Do the exact same `continue`/skip logic in `get_project_timeline` in `history.py` is NOT needed there (that's a single-project detail view, fine to show a failed state) — this skip only belongs in `list_projects()` (the Library list).

**5. Version History UI — already implemented, just verify it still works after the above fixes.** `ResultsPage.tsx` already has a horizontally-scrollable "Version History" strip below the output image (`overflow-x-auto`, `snap-x`, `hide-scrollbar` — around line 10890-10932) and a "Save version" button distinct from "Regenerate" (line 10748-10759, calls `/api/history/{id}/select/{variation_id}`). Do not rebuild this — once #1-4 above are fixed, this UI will start working correctly because `timeline.length` will finally be > 1 for real projects.

### IDE prompt

```
Fix the RoomCanvas prompting/versioning bug described in Polish9.md sections "ISSUE 2+3".

1. frontend/src/pages/ResultsPage.tsx: change `const isRefinement = activeGeneration.parent_generation_id !== null;`
   to `const isRefinement = isCompleted;`. Add a separate `isRootGeneration` variable (old logic) only
   where the UI needs to distinguish root vs child cosmetically (e.g. badges), never for choosing
   refine vs generate.

2. frontend/src/components/refine/DesignEditorPanel.tsx: in handleSubmit, change
   `navigate(`/results/${result.id}`)` to `navigate(`/results/${projectId}?v=${result.id}`)`.

3. backend/app/services/generation_service.py: in prepare_generation's force_new branch, set
   `parent_generation_id` to the source generation's id (or its existing root id) instead of leaving
   it unset, so "Regenerate" also nests as a version instead of creating a new library entry.

4. backend/app/repositories/generation_repository.py: in list_projects(), skip (continue) any root
   whose descendant tree has zero generations with status == "completed" — these must never appear
   in GET /api/history.

5. Do NOT touch the Version History timeline UI or the "Save version" button in ResultsPage.tsx —
   they are already correctly implemented and will start working once 1-4 are fixed.

6. Test: generate a design, prompt "change the wall color to green", confirm it appears as a new
   version under the SAME project (not a new Library card), confirm the previous edit (not the
   original photo) was the base image sent to Replicate. Then prompt again with something else and
   confirm it builds on version 2, not back on the original.
```

---

## ISSUE 4: Cluttered / portrait room photos produce broken results

### Root cause

`backend/app/ai/prompt_builder.py` — `ANALYSIS_PROMPT_V1` and `DESIGN_PRINCIPLES` assume a mostly-empty room being furnished from scratch. There is **no branch of logic anywhere** for "this room already has furniture/objects filling most of the frame" or "this is a portrait photo with little open floor." The model gets the same instructions whether it's looking at an empty living room or a cluttered, furniture-packed bedroom shot in portrait.

`backend/app/ai/providers/replicate_provider.py` — `generate()`/`refine()` never pass an `aspect_ratio` parameter to Replicate at all. `flux-kontext-pro` defaults to `match_input_image` when omitted, which should keep portrait framing, but this is relying on an undocumented default rather than being explicit — risky right before a demo.

### The fix

**1. `backend/app/ai/prompts/schemas.py` / analysis prompt** — have Gemini explicitly classify occupancy so the generation prompt can branch:

Add to `ANALYSIS_PROMPT_V1` in `prompt_builder.py`:
```
Additionally assess and report:
- "space_occupancy": one of "mostly_empty", "partially_furnished", "densely_furnished"
- "open_floor_area_pct": your best estimate of what % of the visible floor is currently unobstructed
```
Add matching fields to `ANALYSIS_RESPONSE_SCHEMA` in `backend/app/ai/prompts/schemas.py` (required string enum + number, same pattern as existing fields like `room_type`).

**2. `build_generation_prompt()` in `prompt_builder.py`** — branch the furniture-placement instructions on that occupancy value:
```python
def build_generation_prompt(gemini_redesign_prompt, analysis_data=None, customization=None, is_regenerate=False, style_id=None, instruction=None):
    ...
    occupancy = (analysis_data or {}).get("space_occupancy", "mostly_empty")
    open_pct = (analysis_data or {}).get("open_floor_area_pct", 100)

    if occupancy == "densely_furnished" or open_pct < 25:
        space_guidance = (
            "This room has very little open floor space and is already densely furnished. "
            "Do NOT add large new furniture (no new sofas, cupboards, wardrobes, dining sets, or beds). "
            "Restyle what already exists in place: update colors, materials, and finishes on the existing "
            "furniture pieces exactly where they currently sit. Where there is genuinely open space "
            "(a corner, a windowsill, a small gap), you may add only small-footprint items — a side table, "
            "a floor lamp, a small plant, an accent chair, wall art, a rug in the open area only. "
            "Never overlap new objects with existing furniture or walkways."
        )
    elif occupancy == "partially_furnished" or open_pct < 60:
        space_guidance = (
            "This room is partially furnished. Keep existing large furniture in its current position "
            "and restyle it rather than replacing it outright unless the instructions say otherwise. "
            "Use the remaining open space for appropriately-scaled additions only."
        )
    else:
        space_guidance = ""  # mostly empty room: existing DESIGN_PRINCIPLES already handle this well

    base_prompt = f"""{COMPOSITION_LOCK}

{gemini_redesign_prompt}

{arch_hints}
{space_guidance}
Change the furniture, decor, and finishes while preserving the room's walls, windows, doors, and camera framing exactly as shown. ..."""
```

**3. `replicate_provider.py`** — explicitly pin the aspect ratio instead of relying on the default, for both `generate()` and `refine()`:
```python
output = await client.async_run(
    self.model,
    input={
        "input_image": file_obj,
        "prompt": prompt,
        "seed": seed,
        "aspect_ratio": "match_input_image",
        "output_format": "png",
    }
)
```

**4. `DESIGN_PRINCIPLES` in `prompt_builder.py`** — the existing symmetry/focal-point rules assume open floor plans. Add one line so they don't fight the new occupancy guidance:
```
If the room is already densely furnished with little open floor space, prioritize restyling existing pieces in place over achieving ideal furniture symmetry — do not force new large pieces into a tight space to satisfy balance/rhythm rules.
```

**5. Test images before the demo**: run one portrait photo of a cluttered room through `/api/analyze` directly and inspect the returned `space_occupancy`/`open_floor_area_pct` values in the response JSON before trusting the generation step — this tells you immediately whether Gemini is classifying correctly, separate from whether Flux is respecting the instruction.

### IDE prompt

```
Implement clutter/portrait-room handling for RoomCanvas per Polish9.md "ISSUE 4".

1. backend/app/ai/prompts/schemas.py: add "space_occupancy" (enum: mostly_empty, partially_furnished,
   densely_furnished) and "open_floor_area_pct" (number 0-100) as required fields to
   ANALYSIS_RESPONSE_SCHEMA.

2. backend/app/ai/prompt_builder.py: add the same two fields to the ANALYSIS_PROMPT_V1 instructions
   asking Gemini to assess them from the photo.

3. backend/app/ai/prompt_builder.py: in build_generation_prompt(), branch furniture-placement
   guidance on analysis_data["space_occupancy"] / open_floor_area_pct as specified in Polish9.md —
   densely_furnished rooms get "restyle in place, no new large furniture" instructions; mostly_empty
   rooms keep existing behavior unchanged.

4. backend/app/ai/providers/replicate_provider.py: add "aspect_ratio": "match_input_image" and
   "output_format": "png" to the input dict in both generate() and refine().

5. Also apply the same space_guidance branch inside build_refinement_prompt() so refine/regen calls
   on cluttered rooms don't try to shove in new sofas either — pass analysis_data through to
   build_refinement_prompt (currently it doesn't receive it; thread it through from
   refinement_service.py's run_refinement_task, which already has parent.analysis_json available).

6. Do not change anything for rooms classified mostly_empty — existing behavior must not regress.
```

---

## ISSUE 5: Measure Room feature is not accurate, especially off-angle

### Root cause — two separate real bugs, confirmed in code

**Bug A — wrong reference dimension is used, regardless of what the user actually taps.**
`backend/app/measurement/calibration.py`:
```python
ref_real_length_cm = max(REFERENCE_OBJECTS[reference_type])
```
For an A4 sheet, `REFERENCE_OBJECTS['a4_paper'] = (21.0, 29.7)`. This code **always** assumes the user tapped the 29.7cm (height) edge — even if they actually tapped the 21.0cm (width) edge, or a diagonal, or anything else. If your two reference taps don't happen to match "the long edge," every measurement that follows is scaled by the wrong number and will be visibly wrong. The code comment literally admits this: *"for simplicity we'll just use the height/longest side... let's assume height for now."*

**Bug B — no perspective/angle correction exists at all.**
`backend/app/measurement/vanishing_point.py`:
```python
def correct_for_perspective(scale_cm_per_pixel, p1, p2):
    """
    Placeholder for Criminisi-style single-view metrology.
    ...
    For now, we return the simple 2D scaled distance.
    """
    from .calibration import measure_target
    return measure_target(scale_cm_per_pixel, p1, p2)
```
This function name implies perspective correction happens — it doesn't. It's a pass-through stub. Any angle between the camera and the reference/target plane (exactly what you're planning to test tomorrow) introduces real error with zero compensation.

### The fix

**1. Fix Bug A properly** — don't guess which edge was tapped. Have the user (or the UI) mark the reference object's full rectangle, not two arbitrary points, so both dimensions are known and cross-checked:

`backend/app/measurement/schemas.py`:
```python
class MeasurementRequest(BaseModel):
    image_id: int
    reference_object_type: Literal['credit_card', 'a4_paper', 'letter_paper', 'standard_door', 'custom']
    reference_points: List[Point2D] = Field(..., min_length=2, max_length=2)
    reference_edge: Literal['width', 'height'] = Field(
        default='height',
        description="Which real-world edge (width or height) the two reference_points correspond to."
    )
    target_points: List[Point2D] = Field(..., min_length=2, max_length=2)
    custom_reference_length_cm: float | None = None
```

`calibration.py`:
```python
def calculate_scale(reference_type, ref_p1, ref_p2, custom_length_cm=None, reference_edge: str = 'height') -> float:
    if reference_type == 'custom':
        if not custom_length_cm:
            raise ValueError("custom_length_cm is required when reference_type is 'custom'")
        ref_real_length_cm = custom_length_cm
    else:
        if reference_type not in REFERENCE_OBJECTS:
            raise ValueError(f"Unknown reference object type: {reference_type}")
        width_cm, height_cm = REFERENCE_OBJECTS[reference_type]
        ref_real_length_cm = width_cm if reference_edge == 'width' else height_cm

    ref_pixel_length = calculate_pixel_distance(ref_p1, ref_p2)
    if ref_pixel_length == 0:
        raise ValueError("Reference points cannot be identical.")
    return ref_real_length_cm / ref_pixel_length
```

Update `measure.py` to pass `request.reference_edge` through, and update `MeasurementOverlay.tsx` to add a simple toggle after the user taps the reference object: **"Did you mark the width or height edge?"** (two buttons, default to whichever is visually closer to the tapped line's real aspect — you can auto-suggest by comparing `abs(dx)` vs `abs(dy)` of the tapped segment against the object's known aspect ratio, but let the user confirm/override).

**2. Fix Bug B — add real angle compensation.** You don't need full Criminisi single-view metrology for tomorrow, but you do need to stop pretending it exists. Minimum viable fix: have the user mark the reference object's rectangle with **4 points** (all four corners) instead of 2. From that you get two independent pixel measurements (top edge and left edge in pixels) against two known real dimensions — this lets you detect and partially correct for skew/rotation instead of relying on a single 2-point tap that has no way to know if the camera was angled:

```python
# vanishing_point.py — replace the stub with real corner-based correction
def correct_for_perspective(ref_corners: list[Point2D], ref_width_cm: float, ref_height_cm: float,
                             target_p1: Point2D, target_p2: Point2D) -> tuple[float, str]:
    """
    ref_corners: 4 points, in order [top-left, top-right, bottom-right, bottom-left] of the
    reference object as tapped by the user.
    Returns (real_distance_cm, confidence).
    """
    top_edge_px = calculate_pixel_distance(ref_corners[0], ref_corners[1])
    left_edge_px = calculate_pixel_distance(ref_corners[0], ref_corners[3])

    scale_from_width = ref_width_cm / top_edge_px
    scale_from_height = ref_height_cm / left_edge_px

    # If the two independently-derived scales disagree a lot, the photo has significant
    # perspective distortion relative to the reference plane — flag lower confidence.
    disagreement = abs(scale_from_width - scale_from_height) / max(scale_from_width, scale_from_height)
    avg_scale = (scale_from_width + scale_from_height) / 2

    target_px = calculate_pixel_distance(target_p1, target_p2)
    real_cm = target_px * avg_scale

    if disagreement < 0.05:
        confidence = "high"
    elif disagreement < 0.15:
        confidence = "medium"
    else:
        confidence = "low"

    return real_cm, confidence
```

Update `measure.py` and `MeasurementOverlay.tsx` to collect 4 reference corner taps instead of 2, and to surface the real (computed) `confidence` value instead of the current hardcoded `"medium"` in `measure.py`:
```python
confidence="medium" # Placeholder: if we had auto-detect, confidence could be derived
```
replace with the value returned from `correct_for_perspective`.

**3. Demo-day practical note**: even with this fix, single-view metrology without a detected vanishing point is inherently approximate once the camera is angled — the corner-averaging approach above meaningfully reduces error for small-to-moderate angles (which is realistic for a handheld phone shot) but won't be lab-grade accurate at steep angles. If asked, be upfront that this is "phone-camera accurate" (~within a few %), not surveying-grade.

### IDE prompt

```
Fix Measure Room accuracy per Polish9.md "ISSUE 5".

1. backend/app/measurement/schemas.py: add `reference_edge: Literal['width','height'] = 'height'` to
   MeasurementRequest. Change reference_points collection to require 4 points (rectangle corners:
   top-left, top-right, bottom-right, bottom-left) instead of 2 — rename to reference_corners,
   List[Point2D] with min_length=4, max_length=4.

2. backend/app/measurement/calibration.py: update calculate_scale to accept width_cm/height_cm
   separately rather than always using max(); it should no longer guess which edge was measured.

3. backend/app/measurement/vanishing_point.py: replace the placeholder correct_for_perspective()
   stub with the corner-based dual-edge scale averaging + disagreement-based confidence scoring
   shown in Polish9.md. It must return both the corrected real_distance_cm and a computed confidence
   ("high"/"medium"/"low"), not a hardcoded value.

4. backend/app/routers/measure.py: update to call the new signatures, pass reference_corners through,
   and use the real computed confidence value instead of the hardcoded "medium" string.

5. frontend/src/components/measurement/MeasurementOverlay.tsx: update the reference-tap UI to collect
   4 corner taps of the reference object (A4 sheet, credit card, etc.) instead of 2 diagonal points,
   with clear on-image labels (TL/TR/BR/BL) guiding the user where to tap next. Send all 4 as
   reference_corners in the API call.

6. Test: photograph an A4 sheet flat, note real height is 29.7cm, tap all 4 corners, then measure
   a known object (e.g. a laptop, known width) and confirm the returned cm is within a few percent
   of the real value, both straight-on and at a mild angle (~20-30 degrees off perpendicular).
```

---

## ISSUE 1: Generation gets stuck on "Generating photorealistic render..." forever

### Root cause — confirmed in code

`backend/app/routers/history.py`, the SSE endpoint:
```python
@router.get("/generation/{generation_id}/status")
async def generation_status_sse(generation_id, request, db: AsyncSession = Depends(get_db), ...):
    repo = GenerationRepository(db, user_id=current_user.id)
    async def event_generator():
        while True:
            if await request.is_disconnected():
                break
            generation = await repo.get_by_id(generation_id)
            ...
            yield {"event": "message", "data": json.dumps(serialized)}
            if generation.status in ("completed", "failed", "failed_analysis"):
                break
            await asyncio.sleep(2)
    return EventSourceResponse(event_generator())
```

The `db: AsyncSession` here is opened **once** when the request starts and reused for the **entire lifetime of the SSE connection** — potentially minutes. The background task that actually finishes the generation (`generation_service.py` `run_generation_task`) opens its **own separate session** and commits the "completed" status there.

This is a well-known SQLAlchemy async gotcha: a long-lived session that never commits/refreshes can keep serving data from its original transaction snapshot / identity map and never observe the other session's commit. That's exactly your symptom: the backend genuinely finished (you saw it in History, which uses a fresh request/session and correctly sees the commit) — but the long-lived SSE loop never noticed, so the frontend never got a "completed" event and stayed stuck.

### The fix

**1. Force a fresh read every poll iteration** — cheapest fix, minimal change, in `history.py`:
```python
async def event_generator():
    while True:
        if await request.is_disconnected():
            break
        db.expire_all()  # <-- ADD THIS: discard cached ORM state before every read
        generation = await repo.get_by_id(generation_id)
        ...
```
`expire_all()` forces SQLAlchemy to re-fetch every column from the database on next access instead of trusting whatever it loaded when the session/transaction first opened.

**2. More robust fix (recommended) — use a fresh session per poll**, matching how the background task itself does it, so there's no shared long-lived transaction at all:
```python
from app.database.session import engine
from sqlalchemy.ext.asyncio import async_sessionmaker

async def event_generator():
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    while True:
        if await request.is_disconnected():
            break
        async with session_factory() as fresh_db:
            fresh_repo = GenerationRepository(fresh_db, user_id=current_user.id)
            generation = await fresh_repo.get_by_id(generation_id)
            if not generation:
                yield {"event": "error", "data": "Not found"}
                break
            serialized = GenerationOut.model_validate(generation).model_dump(mode="json")
            yield {"event": "message", "data": json.dumps(serialized)}
            if generation.status in ("completed", "failed", "failed_analysis"):
                break
        await asyncio.sleep(2)
```
Do this instead of #1 if you have time — it's the actually-correct fix and avoids the whole class of bug, not just this one instance.

**3. Safety net on the frontend** — even after the backend fix, add a fallback so a dropped SSE connection (Render's proxy can silently kill idle streaming connections) can never leave the user stuck again. In `frontend/src/hooks/usePollGeneration.ts`, alongside the SSE subscription, add a low-frequency backup poll via a plain `fetch` to `GET /api/history/{id}` every ~10s that updates the same query cache — if SSE is silently dead, this catches the completed state within 10s instead of never.

**4. Fast redirect once fixed** — once the SSE stream correctly emits the "completed" event, the existing navigate logic in `AnalysisPage.tsx` (`if (stepperDone && isCompleted && generationId) navigate(...)`) will fire immediately. No changes needed there — the stepper animation is capped at 7 steps × 2.5s (~17.5s) and already fast-forwards early if generation completes sooner (see the `isCompleted || isFailed` fast-forward branch), so this alone gets you "as fast as possible" redirect once the underlying status bug is fixed. **Do not** shorten `STEP_DURATION_MS` further as a band-aid — it doesn't address the real bug and makes the cosmetic stepper feel rushed/fake on a demo screen.

**5. Show the Replicate rate-limit error fast, not silently.** This is already correctly wired: `AnalysisPage.tsx`'s `generateError` state renders immediately on mutation rejection, and `getFriendlyApiError` surfaces backend error text. Just confirm after the SSE fix that a 429 from Replicate (see your earlier error) still surfaces within a couple seconds and doesn't get masked by the stuck-loading bug — test this explicitly by triggering 7+ rapid generations in a row before the demo.

### IDE prompt

```
Fix the stuck-forever generation loading screen per Polish9.md "ISSUE 1".

1. backend/app/routers/history.py: in generation_status_sse's event_generator, replace the
   long-lived shared `db` session reuse with a fresh AsyncSession per polling iteration (use
   async_sessionmaker(engine, expire_on_commit=False) inside the loop, as shown in Polish9.md).
   This fixes stale reads where the SSE loop never observes the background task's commit.

2. frontend/src/hooks/usePollGeneration.ts: add a backup poll — a plain fetch to
   GET /api/history/{id} every 10 seconds, running alongside the SSE subscription, that updates
   the same query cache. This is a safety net in case the SSE connection is silently dropped by
   Render's proxy.

3. Do not modify AnalysisPage.tsx's step timing or navigation logic — it already fast-forwards and
   navigates correctly once isCompleted flips true; the bug was purely that isCompleted never
   flipped due to the stale-session issue above.

4. Test: trigger a generation, and while it's running, watch Render logs to confirm the background
   task commits "completed" — then confirm the SSE stream in the browser network tab emits a
   "completed" event within ~2-4 seconds of that commit, and the page navigates immediately after.
```

---

## ISSUE 6: Cleanup + build verification

Run this last, after 1-5 are implemented and manually tested — a cleanup pass before verifying functional fixes risks masking real errors with refactor noise.

### IDE prompt

```
Clean up and verify the RoomCanvas build after applying all fixes in Polish9.md.

1. Search for and remove dead/duplicate code introduced or pre-existing, specifically:
   - backend/app/ai/providers/replicate_provider.py: check __init__ for the duplicated
     `self.model = "black-forest-labs/flux-kontext-pro"` line if present twice.
   - Any unused imports left over from the schema/signature changes in ISSUE 5
     (measurement/schemas.py, calibration.py, vanishing_point.py, routers/measure.py).
   - Any now-unreachable code path in generation_service.py's force_new branch if it was
     restructured for ISSUE 2/3.

2. Run the frontend build and fix every error/warning it surfaces:
   cd frontend && npm run build
   Also run: npm run lint (fix all errors; warnings only if time allows)

3. Run the backend and confirm it boots clean:
   cd backend && python -m py_compile $(find app -name "*.py")
   Then start it and hit GET /api/health to confirm 200.

4. Run the existing backend test suite and fix any regressions caused by the schema changes in
   ISSUE 5 (MeasurementRequest now requires reference_corners + reference_edge instead of the old
   2-point reference_points) — update backend/tests accordingly, don't just skip failing tests:
   cd backend && pytest

5. Report back a summary: files changed, any tests updated, and confirm both builds are green
   before the demo.
```

---

## Quick pre-demo checklist

- [ ] Prompt twice in a row on the same design → confirm both stay as ONE project in Library with a Version History strip, and the second prompt visibly builds on the first (not the original photo).
- [ ] Take a portrait photo of a cluttered/furnished space → confirm no large new furniture gets crammed in, only restyling + small accents.
- [ ] Measure an A4 sheet (all 4 corners) then measure a real object at a slight angle → confirm result is within a few % of a tape measure.
- [ ] Generate a design and don't touch anything until it finishes → confirm it redirects to the output page within a couple seconds of completion, not stuck.
- [ ] Trigger several generations back-to-back to force a Replicate 429 → confirm the error shows fast and clearly, not a stuck screen.
- [ ] `npm run build` and `pytest` both green.
