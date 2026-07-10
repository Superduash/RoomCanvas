# AI Interior Design Generator — v2 Plan (Refined)
### Free-only stack · Solo developer · 39 hours total

**What changed from v1:** model choice is now benchmarked (not pre-locked), room type is auto-detected instead of user-selected, each generation returns 3 style variations via batched inference, and results include a static design-explanation panel. Three ideas from the external review were deliberately trimmed or modified — see "Rejected/Modified Suggestions" at the bottom for the reasoning.

---

## PART 1 — Updated Architecture

```
Input Room Photo
      ↓
MLSD Structure Detection   (extract wall/window/door lines)
      ↓
CLIP Zero-Shot Room Classification   (auto: bedroom / living room / kitchen / office / dining room)
      ↓
Prompt Generator   (room type + user-picked style → templated prompt + negative prompt)
      ↓
Batched Diffusion   (1 call, num_images_per_prompt=3, same control image, different seeds)
      ↓
3 Variations Returned → user picks one → Design Explanation Panel (static per-style template)
```

The user still picks **Style** (Modern Minimalist, Scandinavian, Industrial, Bohemian, Luxury Contemporary) — style is a taste choice, not something that should be auto-detected. **Room type** is now auto-detected — that's a structural fact about the photo, which is exactly what a classifier is reliable at.

### Model selection: benchmark, don't pre-lock

Test on Day 1, same 5 room photos, same prompt, same seed:

| Candidate | Why included | Why NOT FLUX.1 Schnell |
|---|---|---|
| SD1.5 + ControlNet-MLSD | Proven, fast, low VRAM, industry-converged pattern (see v1 plan's citations) | — |
| SDXL + ControlNet-MLSD | Higher native image quality, worth testing since T4 free tier can just about handle it at 768px | — |
| ~~FLUX.1 Schnell + ControlNet~~ | — | **Deliberately excluded.** ControlNet support for Flux is newer and less standardized across the `diffusers` ecosystem than for SD1.5/SDXL. Spending Day 1 debugging pipeline compatibility instead of comparing image quality reintroduces exactly the open-ended research risk this whole plan exists to avoid. If you finish the SD1.5/SDXL comparison with time to spare, trying Flux as a bonus is fine — just never let it block Day 1's actual deliverable. |

**Scoring rubric (fill in Day 1, pick a winner by end of day):**

| Criterion | Weight |
|---|---|
| Layout/structure preservation (walls, windows stay put) | 35% |
| Realism / lack of artifacts | 30% |
| Inference time per image | 20% |
| VRAM headroom on free T4 | 15% |

Lock the winner at the end of Day 1 and never revisit it — re-litigating model choice mid-project is a bigger risk than picking the slightly-worse-but-tested option.

### Batched 3-variation generation

```python
result = pipe(
    prompt=[prompt] * 3,
    negative_prompt=[negative_prompt] * 3,
    image=input_image,
    control_image=control_image,
    strength=0.75,
    guidance_scale=7.5,
    controlnet_conditioning_scale=1.0,
    num_inference_steps=30,
    num_images_per_prompt=3,
    generator=[torch.Generator("cuda").manual_seed(s) for s in [42, 123, 777]],
).images  # returns a list of 3 PIL images
```

On a free T4, this typically costs **~1.4-1.6x** the time of a single image (batching shares the fixed model-load and attention-computation overhead), not 3x — this is what makes "3 variations" affordable within the same reliability budget as v1's single-image plan. Verify this timing yourself on Day 4 and record the actual number for your demo script (don't guess it live).

### Room classification (CLIP zero-shot — no training required)

```python
from transformers import CLIPProcessor, CLIPModel
import torch

clip_model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32").to("cuda")
clip_processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")

ROOM_LABELS = ["a bedroom", "a living room", "a kitchen", "an office", "a dining room"]

def classify_room(image):
    inputs = clip_processor(text=ROOM_LABELS, images=image, return_tensors="pt", padding=True).to("cuda")
    with torch.no_grad():
        outputs = clip_model(**inputs)
    probs = outputs.logits_per_image.softmax(dim=1)[0]
    best_idx = probs.argmax().item()
    return ROOM_LABELS[best_idx].replace("a ", "").replace("an ", ""), float(probs[best_idx])
```

Show the confidence score in the UI ("Detected: Bedroom, 94% confidence") — this is honest and also happens to look more technically credible than a silent black-box guess. If confidence is below ~50%, fall back to showing the room-type dropdown instead of hiding the uncertainty — don't let a low-confidence misclassification silently ship a wrong prompt.

### Design explanation — static templates, not a live LLM call

```python
STYLE_TEMPLATES = {
    "scandinavian": {
        "furniture": ["Platform bed with wooden frame", "Woven wool rug", "Pendant lights", "Minimal open shelving"],
        "palette": ["White", "Light Oak", "Soft Grey", "Sage Green accents"],
        "budget_tag": "Mid-Range",
        "reason_template": "Maximizes natural light and negative space, typical of Scandinavian design principles, while preserving your {room_type}'s existing window placement.",
    },
    "modern_minimalist": { ... },
    "industrial": { ... },
    "bohemian": { ... },
    "luxury_contemporary": { ... },
}
```

This is a deliberate simplification from the external review's "call an LLM after generation" suggestion. With exactly 5 fixed styles, a static lookup produces the identical visual result — a furniture list, a palette, a one-line rationale — with **zero runtime dependency, zero latency, zero chance of an API call failing mid-demo**, and zero chance of the model inventing a plausible-sounding but wrong explanation live in front of reviewers. The `{room_type}` slot is filled from your real CLIP classification output, so it still feels dynamically generated even though the template itself is fixed.

**Budget tag, not a cost estimate.** The original suggestion of a specific rupee figure (₹2.8 Lakh) is dropped. A specific fabricated number is the single most likely thing a sharp reviewer probes — "how did you calculate that?" — and you have no real costing model behind it. A qualitative tag (Budget-Friendly / Mid-Range / Premium) delivers the same "looks like a real product" effect without a claim you can't defend.

---

## PART 2 — Updated Folder Structure

```
interior-ai/
├── README.md
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── UploadPage.jsx        # upload + style dropdown + progress steps
│       │   ├── VariationPicker.jsx   # NEW: 3-thumbnail grid, click to select
│       │   ├── ResultPage.jsx        # before/after slider + explanation panel
│       │   └── HistoryPage.jsx       # + "Regenerate with same seed" button
│       └── components/
│           ├── StyleSelector.jsx
│           ├── ProgressSteps.jsx     # NEW: real pipeline stage indicators
│           ├── DesignExplanation.jsx # NEW: furniture/palette/budget panel
│           └── BeforeAfterSlider.jsx
├── backend/
│   ├── app/
│   │   ├── main.py                  # FastAPI server
│   │   └── database/                # SQLite + SQLAlchemy models
│   └── requirements.txt
├── ai/
│   ├── config.py                    # Replicate config + model choice
│   ├── service.py                   # Connects FastAPI to AI Orchestrator
│   ├── providers/
│   │   ├── base_provider.py         # Abstract provider interface
│   │   └── replicate_provider.py    # Replicate API implementation
│   ├── prompts/
│   │   └── builder.py               # Dynamic templated prompts
│   └── services/
│       └── orchestrator.py          # Coordinates DB saves + generation
└── scripts/
    └── export.py                    # Export tool for LLM analysis
```

---

## PART 3 — Updated 13-Day Plan (39 hours)

| Day | Hours | Objective | Deliverable | Checkpoint |
|---|---|---|---|---|
| **1** | 3h | Benchmark SD1.5 vs SDXL + ControlNet-MLSD on 5 identical room photos, same prompt/seed. Score against the Part 1 rubric. Lock the winner. | Scored comparison table, model decision locked | You can state in one sentence why you chose your model — not "it seemed fine" |
| **2** | 3h | Single generation working end-to-end with the locked model. Tune `strength`/`guidance_scale`. Wire up CLIP zero-shot classifier, test on 5 photos, verify confidence scores make sense. | One good generation + working room classifier | Classifier gets 4/5 test rooms right |
| **3** | 3h | Build prompt template system (style → prompt string). Build `STYLE_TEMPLATES` dict for all 5 styles (furniture/palette/budget_tag/reason). Test 9 room×style combos with single-image generation first (cheaper to iterate). | Finalized prompt templates + explanation templates | 6+/9 combos demo-worthy |
| **4** | 3h | Integrate Replicate API. Refactor `ai/providers/replicate_provider.py` to handle generation logic using the chosen model. | Working Replicate Provider implementation returning 3 images | Test script returns 3 distinct images in under ~50-60s |
| **5** | 3h | FastAPI backend: `/api/generate` endpoint using the `AIService` orchestrator, SQLite schema with seed/prompt/room_type columns, `/api/history`, `/api/health`. | Full round trip: backend → Replicate API → 3 images + metadata back | Round trip works twice in a row |
| **6** | 3h | `UploadPage.jsx`: upload, style dropdown (no room-type dropdown needed now), `ProgressSteps.jsx` showing real stage names ("Detecting structure...", "Classifying room...", "Generating designs..."). | Upload → real progress → variation results | Progress steps match actual backend timing, not fake delays |
| **7** | 3h | `VariationPicker.jsx` (3-thumbnail grid) → `ResultPage.jsx` with before/after slider + `DesignExplanation.jsx` panel populated from the selected variation's style template. | Full pick-a-variation → see explanation flow | Explanation panel content matches the picked style correctly |
| **8** | 3h | `HistoryPage.jsx` with all past generations + "Regenerate with same seed" (re-calls API passing the stored seed). Full UI polish pass. | Cohesive 4-page app | Full flow: upload → auto-detect → 3 variations → pick → explanation → history → regenerate, zero console errors |
| **9** | 3h | **Reliability day, unchanged from v1.** Retry wrapper for API drops or rate limits. Pre-generate and save 6-8 great before/after/explanation sets as fallback. Document fallback steps. | Tested fallback path | You can simulate "API is down" and the app still shows something coherent |
| **10** | 3h | Deploy backend (Render/Railway free) + frontend (Vercel free). | Live public URL | Fresh generation works from a phone on mobile data |
| **11** | 3h | Full rehearsal run. Fix rough edges. Re-verify timing haven't drifted. | Rehearsed, zero manual intervention | Full demo completes start to finish unaided |
| **12** | 3h | README, demo script, rehearsed answers to reviewer questions (updated set below), backup video of a full successful run. | Submission-ready docs + video | Backup video plays and looks good |
| **13** | 3h | Buffer. Final UI copy polish. | Everything works twice in a row with no changes between runs | — |

---

## PART 4 — Updated Demo Script

1. Upload photo (10s)
2. Pick a style from the dropdown (5s) — narrate: *"Room type isn't selected by me — it's detected automatically by a CLIP zero-shot classifier looking at the photo itself."*
3. Watch real progress steps fire (structure detection → classification → generation) while batched diffusion runs (~40-55s, use your Day 4 measured number, not a guess)
4. Show 3 variations, click one (10s)
5. Show the before/after slider + design explanation panel — narrate: *"Structure preservation comes from ControlNet conditioned on the detected wall and window lines, so layout stays fixed even though the furniture and style are fully regenerated."*
6. Show History, click "Regenerate with same seed" on a past entry to show reproducibility (15s)

**New likely questions this version invites:**

- *"How accurate is the room classifier?"* → Give your real Day 2 test number ("4/5 in my test set, and I show the confidence score so a low-confidence guess is visible rather than hidden").
- *"Is the design explanation generated by an LLM?"* → Be direct: "No — it's a template keyed to the 5 styles I support, populated with the actual detected room type. I chose that over a live LLM call specifically to remove a second network dependency that could fail independently during a demo."
- *"How did you calculate the budget estimate?"* → "It's a qualitative tag, not a computed number — Budget-Friendly/Mid-Range/Premium — I deliberately avoided a specific currency figure since I don't have a real costing model behind it and didn't want to present a number I couldn't defend."

---

## PART 5 — Rejected / Modified Suggestions (and why)

| Suggestion | Decision | Reasoning |
|---|---|---|
| Benchmark SD1.5 + SDXL + FLUX.1 Schnell on Day 1 | **Modified: dropped Flux** | Flux ControlNet support is less mature in `diffusers`; risks turning Day 1 into pipeline-debugging instead of image-quality comparison |
| Auto room-type detection via CLIP | **Accepted as-is** | Zero training cost, high reliability, genuine "wow" — no real downside |
| Return 3 designs via 3 separate generation calls | **Modified: batched into 1 call** | 3 sequential calls ≈ 3x time and 3x failure surface; `num_images_per_prompt=3` gets the same feature at ~1.5x time and one call to retry, not three |
| LLM-generated furniture/palette/cost explanation | **Modified: static per-style templates, no LLM call** | Removes a second live network dependency; with only 5 styles, a lookup table produces an identical visual result with zero runtime risk |
| Specific currency cost estimate (e.g. ₹2.8 Lakh) | **Rejected, replaced with qualitative tag** | A fabricated specific number is the most likely thing a reviewer probes and you'd have no real answer |
| Save seed/prompt/style/timestamp for regeneration | **Accepted as-is** | Trivial DB columns, genuinely useful, zero added risk |
| Fake progress step messages | **Modified: real stage names, not fake delays** | Your pipeline now actually has 3 real stages (MLSD, CLIP, diffusion) — surface the real ones instead of inventing fictional ones, it's both more honest and equally impressive |
