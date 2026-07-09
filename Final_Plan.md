# Final_Plan.md — RoomCanvas
### Updated after reading the real repo (Backend.txt + Frontend.txt)
### Demo: TODAY | Full polish window: next 5 days

---

## Status snapshot (from actual code, not assumptions)

**Backend — FastAPI, genuinely ~80% as you said.** Confirmed real and working:
- Two-stage AI pipeline already built correctly: Gemini (`gemini_provider.py`) for structured room analysis, `black-forest-labs/flux-kontext-pro` on Replicate (`replicate_provider.py`) for generation + refinement — this matches the best-practice architecture, already implemented, not a plan.
- SQLite + SQLAlchemy, background-task generation (`BackgroundTasks`), retry logic (`tenacity`), in-memory caching layer, full CRUD history (`GET/DELETE /api/history`), `/api/styles`, `/api/config`, `/api/providers`, `/api/health`. This is solid engineering — don't rebuild any of it.
- A `finish_backend.md` already exists in the repo documenting the earlier dead-code cleanup (old `ai/` package, root-level dead services) — that audit is already done, don't redo it.

**Frontend — React/Vite, well-styled, but NOT wired to this backend yet.** This is the actual reason nothing works end-to-end right now, and it's not a vague "polish more" problem — it's three specific, fixable bugs.

---

## 🔴 The blocker — read this before touching UI polish

1. **`generateDesign()` in `api/generationApi.js` calls the wrong endpoint with the wrong shape.** It POSTs `image` + `style` as multipart form data to `/generate`. But your real backend's `/generate` route (`routers/generate.py`) expects a JSON body `{ analysis_id: number }` — that `analysis_id` only exists after a separate call to `/analyze` (which takes the multipart image+style and returns it). **There is currently no call to `/analyze` anywhere in the frontend.** Right now, clicking "Generate" will 422 against your real backend.
2. **No polling for background-task completion.** `/generate` and `/refine` both return status `"pending"` immediately and finish the real work in a background task. The frontend needs to poll `GET /api/history/{id}` until `status` becomes `"completed"` (or `"failed"`) before showing the result. Today it just renders whatever came back from the first response.
3. **The UI still assumes the old "3 variations per generate" model** ("Upload... receive **3 AI-generated variations**" copy in `UploadPage.jsx`, a `VariationPicker` page/route). Your `finish_backend.md` explicitly retired that pattern — Kontext Pro is one generation + cheap unlimited refinement, not 3 parallel variations. The `VariationPicker` step is no longer meaningful; `ResultPage.jsx` (which reads `generation.variations[0]`) will actually work fine once #1 and #2 are fixed, so the fastest path is to skip straight to it.
4. **No refinement UI or API call exists at all** in the frontend (`refineDesign()` isn't defined anywhere). This is your differentiator feature — worth adding today, but only after the core flow works.

**None of this is a backend problem.** Don't touch the backend today except to run it.

---

## TODAY — exact fix order, in priority

1. **Add `analyzeRoom()` to `generationApi.js`** — POST multipart `image` + `style` to `/analyze`, returns `AnalyzeResponse` with `analysis_id`.
2. **Fix `generateDesign()`** — POST JSON `{ analysis_id }` to `/generate`. Remove the old multipart version.
3. **Add a small poll helper** — after calling `/generate`, poll `GET /api/history/{id}` every ~2s until `status !== "pending"`. Reuse the same helper for `/refine`.
4. **Update `useGenerate` / `UploadPage`** to run the sequence: `analyzeRoom()` → `generateDesign(analysis_id)` → poll → navigate straight to `/result/:id`. Drop the `/variations` hop from this flow for now — don't delete `VariationPicker.jsx`, just stop routing to it, since it will conflict with the "1 image + refine" model until it's repurposed later.
5. **Update `UploadPage` copy** — remove "3 AI-generated variations," it no longer describes what the app does; replace with "your AI-redesigned room" or similar.
6. **Smoke test the real flow once**, end to end, with one real photo. This is your first and only real Replicate spend for the fix — verify before you touch anything else.
7. **If time remains: wire refinement.** Add `refineDesign()` to `generationApi.js` (POST JSON `{ generation_id, instruction }` to `/refine`), a simple text input + button on `ResultPage`, same polling helper. If time is tight, this is the first thing to cut — the demo works without it, just with less of a "wow."
8. **Whatever time is left: visual polish only** — loading state during the poll (you already have `LoadingSpinner`/`ProgressSteps`, just point them at the real async wait instead of the fake `setTimeout` steps currently in `UploadPage`), error banner wired to real 4xx/5xx messages, mobile spacing check.

Do the fix in this order — steps 1–6 are what makes the demo real instead of scripted. Everything after is genuinely optional today.

---

## Next 5 days — 10x polish pass

**Day 2:**
- Replace the fake `setTimeout` progress steps in `UploadPage` with real state derived from the poll (pending → analyzing → generating → done) — same visual, honest data.
- Finish refinement UI if not done today; add it to `ResultPage` properly with its own loading state.
- Retire or repurpose `VariationPicker.jsx` — either delete it, or turn it into a "refinement history" view showing the `parent_generation_id` chain (original → refine 1 → refine 2), which is a much better fit for the current backend model than "pick 1 of 3."

**Day 3:**
- PWA manifest + service worker; add native camera capture (`<input type="file" accept="image/*" capture="environment">`) — simplest path to "take a live photo," no custom camera UI needed.

**Day 4:**
- Rate-limit `/analyze`, `/generate`, `/refine` server-side (protects your Replicate balance from accidental loops).
- Tidy `finish_backend.md`'s remaining recommendations you haven't yet applied — check it against the current tree and close out anything still pending.

**Day 5:**
- Before/after slider polish (component already exists — `BeforeAfterSlider.jsx`), animations, empty/error states, accessibility pass, iOS Safari check on the camera input specifically.

**Day 6:**
- Full QA pass, record a backup demo video, freeze the code, rehearse.

---

## Risks

- **Replicate credits**: only spend real calls once the wiring fix is confirmed correct (step 6 above) — don't debug against the live API.
- **Background-task polling forgotten**: if you skip step 3 today, the demo will show a stale "pending" state or a blank result — this is the single most likely on-stage failure mode, test it explicitly.
- **`VariationPicker` left in the nav**: if a user (or you, live) clicks into it today, it'll show a broken/empty picker for a concept the backend no longer supports — safest to just remove it from routing before the demo, not just stop linking to it.
