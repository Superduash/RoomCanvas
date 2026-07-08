# RoomCanvas — Architecture & Implementation Roadmap (v2)
**Prepared:** July 2026 · **Target hardware:** Free Google Colab T4 (16GB VRAM) · **Budget:** $0

> **Revision note:** v1 of this doc proposed a 6-model pipeline (Florence-2, Depth Anything 3, SAM2, an LLM furniture planner, FLUX.2 Klein, refine pass). That was overengineered for a solo build on a free T4 — too many independent failure points to debug. v2 below is the corrected, lean recommendation: **two AI models**, with a documented escalation path to add the others back only if testing proves you need them.

---

## 1. Why the current pipeline fails

Your notebook runs **SD1.5 (Realistic Vision V6.0) + MultiControlNet (MLSD + MiDaS depth)**. This is *structure-conditioned text-to-image*, not *image editing*. That distinction explains every symptom:

| Symptom | Root cause |
|---|---|
| Missing TV, desk, furniture | SD1.5's UNet + CLIP text encoder has weak compositional binding — long furniture lists lose low-salience nouns to dominant ones. |
| Floating / misplaced furniture | MLSD only encodes wall/window lines. MiDaS depth on an **empty** room is a near-flat gradient — there's nothing to anchor object placement to. |
| Everything crammed into one shot | The model isn't editing your photo, it's repainting a new image constrained only by edge/depth maps, with no explicit cap on item count or placement. |
| Poor prompt following | SD1.5 is simply the weakest language-following image model still in common use in 2026. |

**Fix: replace the model class, not just the checkpoint.** Move from *structure-conditioned generation* to *instruction-based editing*, where the model is trained to take your exact photo and apply only the requested change.

---

## 2. Core model choice: FLUX.2 [klein] 4B

| Model | VRAM | T4 fit | Editing-native | License | Verdict |
|---|---|---|---|---|---|
| SD1.5 + ControlNet (current) | ~5GB | Yes | No | Open | ❌ Replace |
| SDXL + ControlNet + IP-Adapter | ~9–11GB | Yes | No | Open | Better, still not editing-native — skip, not worth the extra complexity over klein |
| FLUX.1 Kontext [dev] | ~9–12GB (NF4/FP8) | Yes, tight | Yes | Non-commercial | Fallback only |
| **FLUX.2 [klein] 4B** | **~8–13GB (FP8/bf16)** | **Yes, comfortable** | **Yes — unified gen+edit, same pipeline class** | **Apache 2.0** | ✅ **Primary** |

**Validated before committing (per your ask):**
- **Runs on a free T4:** `Flux2KleinPipeline` in fp16/bf16 is documented as working on T4, "slightly higher latency than A100" — no exotic hardware needed.
- **Edit mode is mature in Diffusers, not experimental:** `Flux2KleinPipeline` is one pipeline class — pass no `image=` and you get text-to-image, pass `image=` and it switches to edit mode. This has been standard, documented usage since shortly after the Jan 15, 2026 release; by mid-2026 it's used routinely in community fine-tuning guides. Still: **pin your diffusers commit/version** and run one validation session before building the rest of the notebook around it.

```python
import torch
from diffusers import Flux2KleinPipeline

pipe = Flux2KleinPipeline.from_pretrained(
    "black-forest-labs/FLUX.2-klein-4B",
    torch_dtype=torch.bfloat16,
).to("cuda")
pipe.enable_model_cpu_offload()  # headroom safety net on a 16GB T4

image = pipe(
    prompt=EDIT_PROMPT,
    image=empty_room_photo,      # presence of this arg = edit mode
    guidance_scale=1.0,
    num_inference_steps=24,
    generator=torch.Generator(device="cuda").manual_seed(seed),
).images[0]
```

---

## 3. Full v2 architecture

```
User uploads empty-room photo
+ selects style (Modern / Scandinavian / Industrial / Luxury / ...)
+ selects room type (Living Room / Bedroom / Office / ...)   ← UI dropdown, NOT a classifier model
        │
        ▼
Depth Anything V2/V3 (small variant, <1GB, ~1s)
  → cheap geometry/scale anchor; empty rooms have almost no texture
    for the edit model to infer floor-plane and scale from on its own
        │
        ▼
Prompt compiler (pure code, not a model)
  → looks up a static per-style furniture template:
    e.g. STYLE_TEMPLATES["scandinavian"]["living_room"] = [
        "light-oak 3-seat sofa with linen cushions, against the right wall",
        "round wood coffee table in front of the sofa",
        "slim walnut TV console with mounted TV, wall opposite the window",
        "jute area rug under the coffee table",
        "black arc floor lamp beside the sofa",
        "one large potted fig plant in the far corner",
    ]
  → compiles into one instruction with an explicit preservation clause:
    "Add {items} to this empty {room_type}, {style} style.
     Keep the walls, floor, window, and camera perspective unchanged.
     Photorealistic lighting consistent with the existing window light.
     Correct scale and perspective. No additional clutter beyond what is listed."
        │
        ▼
FLUX.2 Klein 4B — edit mode, 3 calls
  → vary seed AND swap 1–2 items from a small per-style alternate pool
    per call, so the 3 outputs are genuinely different layouts,
    not near-duplicates of the same composition
        │
        ▼
User picks favorite → optional single low-strength (0.15–0.25) refine
pass on just that one image, same model, for shadow/lighting coherence
        │
        ▼
Return 3 images + metadata via your existing /infer contract
```

**Two AI models total: Depth Anything (optional, cheap) + FLUX.2 Klein.** Everything else from v1 (Florence-2, CLIP, SAM2, LLM planner) is cut from the default path.

### Escalation path — add complexity only when data proves you need it

Run your golden test set (see §5) first. Add back a component **only** if it's solving an observed failure, not preemptively:

| Observed failure | Add |
|---|---|
| Room-type guesses are wrong often enough to matter (rare if the user already selects room type in the UI) | Florence-2-base captioning, as a fallback when the user doesn't specify |
| Furniture still drifts off the floor plane or through walls despite the preservation clause | SAM2-generated floor/wall mask, passed as a region hint |
| Static per-style templates feel repetitive across many rooms/styles | Swap the static dict for a lightweight LLM call (Haiku 4.5) that varies item selection — this is the only place an LLM planner earns its keep, and only after the static version is proven insufficient |

This keeps the *default* pipeline at two models while giving you a tested, specific reason to add each one back if — and only if — it turns out to be necessary.

---

## 4. Why Diffusers, not ComfyUI

Same conclusion as before, independent of the model-count question: you're serving a fixed pipeline behind a product API, not authoring/iterating visually. A Diffusers-based FastAPI server keeps the prompt-compiler → render → refine chain in code you control, with no second heavyweight process competing for T4 VRAM. Prototype in ComfyUI locally first if you want faster visual iteration on the furniture templates before freezing them into code — that's the one place it helps here.

---

## 5. Expected performance on a T4

| Stage | Model | VRAM | Time |
|---|---|---|---|
| Geometry anchor | Depth Anything (small) | ~1GB | ~1s |
| Render ×3 | FLUX.2 klein 4B, 24 steps, edit mode | ~8–13GB | ~15–25s total |
| Refine (1 image) | Same model, low-strength | shared | ~3–5s |
| **Total** | | **~9–14GB peak** | **~20–30s** |

Comfortable margin inside a 16GB T4 and your 20–40s budget.

---

## 6. Implementation roadmap

**M1 — Environment & model loading (Day 1)**
- Dependencies: latest `diffusers` (git install, for `Flux2KleinPipeline`), `transformers`, `accelerate`, `safetensors`. Pin the diffusers commit you validate against.
- Load FLUX.2 klein 4B (bf16 or FP8) + Depth Anything (small). Confirm combined VRAM under Colab's variable T4 allocation with `torch.cuda.memory_allocated()` checks.
- **Validation session (do this first, before writing anything else):** run one text-to-image call and one edit-mode call (`image=`) on a sample room photo, confirm both work and time them.

**M2 — Prompt compiler (Day 1–2)**
- Define `STYLE_TEMPLATES[style][room_type]` dicts for your supported styles (modern_minimalist, scandinavian, industrial, bohemian, luxury_contemporary) × room types, each a capped list (6–8 items) with wall/zone anchors written in, matching the format in §3.
- Small alternate-item pool per style/room for the 3-variation swap logic.
- Compiler function: template → single edit instruction string with the explicit preservation clause.

**M3 — Render + refine (Day 2–3)**
- `generate_variations(image, style, room_type)`: depth pass → 3× compiled-prompt + seed/item-swap → FLUX.2 klein edit calls → refine pass on request. Mirror your current function signature so the FastAPI layer barely changes.

**M4 — API & server (Day 3)**
- Keep the existing `/infer` contract — this is a drop-in replacement of `generate_variations()` internals; frontend and backend contracts don't need to change.
- Add a Cloudflare Tunnel fallback cell alongside ngrok (ngrok's free-tier URL rotates every session; Cloudflare's quick tunnels are free and more stable for a demo day).

**M5 — Testing (Day 3–4)**
- Golden set: 5–8 real empty-room photos across window placements and room types, run through all 5 styles.
- Score each output for: geometry preserved (walls/window unmoved), furniture count matches the template, no floating objects, style adherence.
- This is the data that tells you whether to walk the escalation path in §3 — don't add Florence-2/SAM2/LLM-planner without a specific failure this test set surfaces.

**M6 — Deployment polish (Day 4–5)**
- Document the Colab session-restart runbook (T4 sessions disconnect ~90 min idle / 12h max).
- Optional backup: mirror the same server to a Hugging Face Space with ZeroGPU (free, more stable public URL) in case Colab isn't available on demo day.

### Frontend changes
- Add a room-type dropdown alongside the existing style selector (replaces the need for a classifier model entirely).
- Optionally surface the compiled furniture list per variation as an editable checklist before rendering, letting users add/remove items like "TV" or "desk" explicitly — solves the original complaint at the UX layer too, not just the model layer.

### Risks
- FLUX.2 klein is a Jan 2026 model; Diffusers support is real but still young — run M1's validation session before committing further, and keep FLUX.1 Kontext-dev (NF4) as a tested manual fallback if klein's integration proves unstable on your exact Colab image.
- Colab T4 availability isn't guaranteed at peak times — have the HF Space fallback ready ahead of demo day, not scrambled together on it.
- Static templates can feel repetitive at scale — that's the trigger for the LLM-planner escalation step in §3, not a reason to build it up front.

---

## 7. Bottom line

Two models, not six: **Depth Anything (optional, cheap geometry anchor) + FLUX.2 Klein 4B (edit mode) as the entire render path**, driven by static per-style furniture templates instead of a model-based planner. Validate klein's T4 + edit-mode behavior in one session before building the rest. Add Florence-2, SAM2, or an LLM planner back only if your golden test set gives you a specific, observed reason to.

# PROMPT.md — RoomCanvas Inference Notebook Rewrite

**Target agent:** Claude (Sonnet/Opus 4.6) inside an IDE with notebook-editing tools (Antigravity or equivalent).
**Target file:** `inference_server.ipynb` (existing, 25 sections / 54 cells).
**Mode:** Full rewrite in place. Preserve the notebook's section-based structure and the `/infer` FastAPI contract shape (with one additive schema change noted below). Do not create a second notebook — edit this one.

Read this entire file before touching any code. Follow the section plan exactly. Do not leave `TODO`, placeholder, or "implement later" comments anywhere in the final notebook — every cell must run standalone, top to bottom, in a fresh Colab T4 runtime with no manual intervention beyond pasting an ngrok token.

---

## 0. Non-negotiable constraints

- **Hardware:** Free Google Colab T4 (16GB VRAM, ~12–13GB reliably usable after Colab/driver overhead). Every model load and inference call must have a VRAM budget comment and must not exceed it in the worst case (3 variations + refine pass loaded concurrently).
- **Cost:** $0. No paid APIs anywhere in the default path.
- **Reliability over cleverness.** Prefer defensive, try/except-guarded code with clear error messages over code that assumes a specific library version's API surface. `diffusers` is moving fast around FLUX.2 — do not hard-code an API shape without a fallback (see §3).
- **Two AI models only in the default render path:** Depth Anything (small) and FLUX.2 [klein] 4B. Do not add Florence-2, CLIP, SAM2, or an LLM planner to the default path. (Escalation path for these is documented in §9 for future reference only — do not implement them now.)
- **No ControlNet, no MLSD, no MiDaS, no SD1.5/Realistic Vision, no separate VAE, no CLIP room classifier.** All of this is being removed, not adapted.

---

## 1. Section-by-section plan

Legend: 🗑 DELETE ENTIRELY · 🔁 REPLACE CONTENT (keep section slot) · ✅ KEEP (light edits only) · ➕ NEW SECTION

| # | Current title | Action | Notes |
|---|---|---|---|
| 1 | Title / overview markdown | 🔁 | Rewrite to describe the new architecture (§2 below). Remove all references to Realistic Vision, MLSD, MiDaS, DPM++ 2M Karras. |
| 2 | Environment & GPU Check | ✅ | No changes needed. |
| 3 | Dependency Installation | 🔁 | New package list — see §3. |
| 4 | Imports | 🔁 | Drop controlnet-aux, MLSD/Midas detector imports, CLIP imports. Add Depth Anything + FLUX2 imports. |
| 5 | Configuration | 🔁 | New config block — model IDs, image size (must be multiple of 16 for FLUX.2), steps, guidance, seeds. See §3. |
| 6 | Model Download & Weight Caching (Google Drive) | 🗑 | Not needed — HF Hub's local disk cache on `/root/.cache/huggingface` is sufficient for a single Colab session and removes a failure point (Drive mount prompts, auth flakiness). |
| 7 | Model Loading & Pipeline Init | 🔁 | Load FLUX.2 klein 4B with defensive fallback logic. See §3 for exact code. |
| 7b | Scheduler Swap (DPM++ 2M Karras) | 🗑 | klein is a step-distilled model with its own reference scheduler config baked into the pipeline. Do not override it. |
| 8 | Memory Optimization & Prompt Truncation | 🔁 | Replace with FLUX-appropriate memory management: `enable_model_cpu_offload()`, VRAM guard helper, no prompt-truncation logic needed (klein's text encoder handles longer prompts natively — verify empirically in §7's validation cell and cap at a sane length like 400 tokens defensively). |
| 9 | Helpers: Image Preprocessing & Letterbox | 🔁 | Keep a resize helper but simplify — FLUX.2 requires height/width as multiples of 16, not a fixed ControlNet resolution. Round input image dimensions to the nearest multiple of 16, preserve aspect ratio, cap max side at 1024. |
| 10 | Room Classification (CLIP) | 🗑 | Replaced by a required `room_type` field on the `/infer` request (user-selected in the frontend dropdown). |
| 10b | CLIP Accuracy Measurement | 🗑 | No longer applicable. |
| 11 | Structure Extraction (MLSD) | 🗑 | Not used by the new architecture. |
| 11b | Depth Extraction (MiDaS) | 🔁 | Replace with Depth Anything V2/V3 (small checkpoint). See §4. |
| 12 | Prompt Builder | 🔁 | Replace with the `STYLE_TEMPLATES` dict + `compile_edit_prompt()` function. See §5 — this is the most important section, implement in full. |
| 13 | Core Inference Function | 🔁 | Replace with `generate_variations()` built on FLUX.2 klein edit mode. See §6 — implement in full. |
| 14 | Metadata & Timing Assembly | 🔁 | Update fields: remove `controlnet_conditioning_scale`, `room_confidence`; add `depth_time_sec`, `render_time_sec`, `model_id`, `diffusers_version`. |
| 15 | Visualization (Sanity-Check Plot) | 🔁 | Replace synthetic gradient test with an actual end-to-end call on a real or generated placeholder room image, plotting the 3 output variations side by side. This cell must fail loudly (assert) if any variation is `None` or identical to another (hash-compare) — that's the automated check that "3 genuinely different layouts" is actually happening. |
| 16 | FastAPI App Definition | ✅ | Light edits — update app title/description string only. |
| 17 | Health Check Endpoint | 🔁 | Update returned model info (klein model id, depth model id, no more CLIP/ControlNet mentions). |
| 18 | Main `/infer` Endpoint | 🔁 | **Schema change:** add required `room_type: str` form field alongside existing `style` and image upload. See §7. |
| 19 | Server Startup (Background) | ✅ | No changes needed. |
| 20 | Ngrok Tunnel Setup | 🔁 | Keep ngrok as primary, **add a Cloudflare quick-tunnel fallback cell** (➕, new cell after this section) that runs if `NGROK_AUTH_TOKEN` is empty or ngrok raises. |
| 21 | Live Test Cell | 🔁 | Update to POST `style` + `room_type` + image, and to assert the response contains 3 distinct, valid base64 images. |
| 22 | Performance Diagnostics | 🔁 | Update expected VRAM budget line to ~9–14GB peak (not the old dual-ControlNet figure). |
| 23 | Outputs, Export & Download | 🔁 | Update `model_info.txt` content to describe the new stack (klein + depth anything, no ControlNet/CLIP/VAE lines). |
| 24 | Cleanup | 🔁 | Update `del` statement — delete `pipe`, `depth_model` (not `controlnet_mlsd`, `controlnet_depth`, `vae`, `clip_model`, `mlsd_detector`, `midas_detector`, which no longer exist). |
| 25 | Troubleshooting | 🔁 | Rewrite table for the new stack's actual failure modes — see §8. |

---

## 2. New Section 1 (title cell) content requirements

Rewrite the top markdown cell to state:
- Architecture: Depth Anything (small) → FLUX.2 [klein] 4B (edit mode) → optional refine pass.
- Purpose/endpoint description unchanged (`POST /infer`, room image + style + room_type in, 3 variations + metadata out).
- A one-line note that this replaces the prior SD1.5 + MultiControlNet approach because it produced floating/missing furniture and poor prompt adherence — instruction-based editing models solve this at the architecture level, not via conditioning-map tuning.

---

## 3. Section 3, 5, 7 — Dependencies, Config, Model Loading

### Section 3 — Dependencies
```python
import subprocess, sys

packages = [
    'git+https://github.com/huggingface/diffusers.git',  # Flux2KleinPipeline requires latest
    'transformers>=4.46.0',
    'accelerate>=1.0.1',
    'safetensors>=0.4.5',
    'fastapi==0.115.2',
    'uvicorn==0.34.0',
    'pyngrok==7.2.0',
    'python-multipart==0.0.18',
    'nest-asyncio==1.6.0',
]

result = subprocess.run(
    [sys.executable, '-m', 'pip', 'install', '-q', '-U'] + packages,
    capture_output=True, text=True
)
if result.returncode != 0:
    print(result.stderr[-3000:])
    raise RuntimeError('pip install failed -- see stderr above.')
print('Installation complete.')

import diffusers
print(f'diffusers version: {diffusers.__version__}')
```
Do not pin diffusers to a fixed version number — `Flux2KleinPipeline` is new enough that pinning risks pinning to a version *before* edit-mode support landed. Installing from the `main` branch is intentional here. Print the resolved version so it's visible in every run's logs for debugging.

### Section 5 — Configuration
```python
MODEL_ID = "black-forest-labs/FLUX.2-klein-4B"
DEPTH_MODEL_ID = "depth-anything/Depth-Anything-V2-Small-hf"  # verify exact repo id at runtime; see §4 fallback

IMG_MAX_SIDE = 1024          # FLUX.2 supports up to 4MP; cap for T4 speed/VRAM budget
IMG_DIM_MULTIPLE = 16        # FLUX.2 requires height/width as multiples of 16

NUM_INFERENCE_STEPS = 24     # klein reference is 4 steps for the *distilled* checkpoint;
                              # verify which variant black-forest-labs/FLUX.2-klein-4B resolves to
                              # in Section 7's validation cell and adjust this constant accordingly
                              # (4 for distilled, ~20-28 for base/undistilled quality mode)
GUIDANCE_SCALE = 1.0          # BFL reference default for the distilled model; do not assume this
                              # is correct without checking the model card loaded at runtime
NUM_VARIATIONS = 3
REFINE_STRENGTH = 0.2

SEEDS = [42, 123, 777]

ROOM_TYPES = ["living_room", "bedroom", "home_office"]
STYLES = ["modern_minimalist", "scandinavian", "industrial", "bohemian", "luxury_contemporary"]

NGROK_AUTH_TOKEN = ""  # user pastes their free token here
```
**Agent action required:** confirm `black-forest-labs/FLUX.2-klein-4B` is the distilled or base checkpoint by reading the model card metadata after `from_pretrained` in Section 7, and set `NUM_INFERENCE_STEPS`/`GUIDANCE_SCALE` accordingly with a runtime print statement, not a hard-coded assumption. If the loaded pipeline exposes `pipe.transformer.config` or similar with an `is_distilled` flag (as documented for the Flux2 base pipeline class), use it to branch the defaults automatically instead of relying on the hard-coded constants above.

### Section 7 — Model loading (defensive)
```python
import torch, time

print("Loading FLUX.2 klein pipeline...")
t0 = time.time()

# Defensive class resolution -- prefer the dedicated pipeline class, fall back to the
# generic auto-pipeline if the installed diffusers version doesn't expose it under that name.
try:
    from diffusers import Flux2KleinPipeline as _PipeCls
    _pipe_cls_name = "Flux2KleinPipeline"
except ImportError:
    from diffusers import DiffusionPipeline as _PipeCls
    _pipe_cls_name = "DiffusionPipeline (fallback)"
print(f"Using pipeline class: {_pipe_cls_name}")

# Defensive kwarg resolution -- some diffusers versions use `dtype=`, others `torch_dtype=`.
def _load_pipeline(model_id, dtype):
    try:
        return _PipeCls.from_pretrained(model_id, dtype=dtype)
    except TypeError:
        return _PipeCls.from_pretrained(model_id, torch_dtype=dtype)

pipe = _load_pipeline(MODEL_ID, torch.bfloat16)

# Defensive device placement -- try device_map first (newer diffusers), fall back to .to("cuda"),
# and fall back further to CPU offload if a straight .to("cuda") OOMs on load.
try:
    pipe = _load_pipeline(MODEL_ID, torch.bfloat16)  # some builds accept device_map at from_pretrained
    if hasattr(pipe, "to"):
        pipe = pipe.to("cuda")
except torch.cuda.OutOfMemoryError:
    print("Direct CUDA placement OOM'd -- falling back to CPU offload.")
    pipe.enable_model_cpu_offload()

if hasattr(pipe, "enable_model_cpu_offload") and not getattr(pipe, "_cpu_offload_enabled", False):
    # Always enable offload proactively on a 16GB T4 -- it costs some latency but is the
    # single biggest lever against OOM crashes across a full 3-variation + refine run.
    pipe.enable_model_cpu_offload()

vram_gb = torch.cuda.memory_allocated() / 1024**3
print(f"✅ FLUX.2 klein loaded in {time.time()-t0:.1f}s | VRAM allocated: {vram_gb:.2f} GB")

# Runtime capability check -- confirm edit mode actually works before building anything on top of it.
from diffusers.utils import load_image
_test_img = load_image(
    "https://huggingface.co/datasets/huggingface/documentation-images/resolve/main/diffusers/cat.png"
)
_test_out = pipe(
    image=_test_img,
    prompt="Turn this cat into a dog",
    num_inference_steps=4,
    guidance_scale=1.0,
).images[0]
assert _test_out is not None and _test_out.size[0] > 0, "Edit-mode validation call failed."
print("✅ Edit mode validated: pipe(image=..., prompt=...) works on this diffusers build.")
```
This validation call is mandatory, not optional — it is exactly the "one validation session before committing" step from the architecture doc, encoded as an automated notebook cell instead of manual testing. If it fails, the cell must raise with a clear message instructing the user to check the diffusers version, not silently continue.

---

## 4. Section 11b — Depth Anything

```python
print("Loading Depth Anything (small)...")
try:
    from transformers import pipeline as hf_pipeline
    depth_estimator = hf_pipeline(
        task="depth-estimation",
        model=DEPTH_MODEL_ID,
        device=0,  # T4
    )
except Exception as e:
    raise RuntimeError(
        f"Failed to load depth model '{DEPTH_MODEL_ID}'. "
        f"Verify the exact HF repo id for the small Depth Anything V2/V3 checkpoint "
        f"and update DEPTH_MODEL_ID in Section 5. Original error: {e}"
    )

def get_depth_map(image: "PIL.Image.Image"):
    """Returns a PIL depth map image, used only as an internal geometry sanity check
    (not passed into FLUX.2 as a conditioning input -- klein takes the raw photo directly).
    Logged/attached to metadata for debugging, and reserved for the SAM2 escalation path
    if testing later shows furniture scale/placement issues."""
    result = depth_estimator(image)
    return result["depth"]
```
**Agent action required:** verify `DEPTH_MODEL_ID` resolves on the Hub at runtime (the transformers `depth-estimation` pipeline with a Depth Anything V2 small checkpoint is the safe, well-trodden path — do not attempt to hand-load Depth Anything 3's research repo API, it's heavier tooling than this task needs). If the configured repo id 404s, catch it and raise with the exact fix instruction shown above rather than crashing with a raw traceback.

Depth output is **not wired into the FLUX.2 prompt or pipeline call** in this v1 — it is computed and attached to the response metadata for debugging/logging only. This matches the architecture decision to keep FLUX.2's own image-conditioning as the sole geometry-preservation mechanism, with depth reserved as an escalation tool.

---

## 5. Section 12 — Style templates + prompt compiler (implement in full)

```python
# STYLE_TEMPLATES[style][room_type] = {
#     "items": [...],        # base furniture list used in every render
#     "alt_pool": [...],     # optional items swapped in/out across the 3 variations
# }
STYLE_TEMPLATES = {
    "modern_minimalist": {
        "living_room": {
            "items": [
                "low-profile grey linen sofa against the main wall",
                "matte black metal coffee table",
                "slim wall-mounted TV console with a mounted flatscreen TV opposite the seating",
                "large neutral-tone area rug centered under the coffee table",
                "single minimalist floor lamp beside the sofa",
            ],
            "alt_pool": [
                "one abstract framed wall art piece",
                "small potted snake plant in a concrete planter",
                "a single accent armchair angled toward the sofa",
            ],
        },
        "bedroom": {
            "items": [
                "low platform bed with a grey upholstered headboard against the back wall",
                "two matching minimalist nightstands with slim brass lamps",
                "a simple wood dresser against the side wall",
                "a neutral wool area rug under the bed",
            ],
            "alt_pool": [
                "a floor-length mirror in the corner",
                "sheer white curtains framing the window",
                "a small reading chair by the window",
            ],
        },
        "home_office": {
            "items": [
                "a white minimalist desk against the wall facing the window",
                "an ergonomic black mesh office chair",
                "a wall-mounted monitor arm with a single monitor",
                "an open wood shelving unit for books",
            ],
            "alt_pool": [
                "a small potted plant on the desk corner",
                "a slim floor lamp beside the desk",
                "a neutral rug under the desk area",
            ],
        },
    },
    "scandinavian": {
        "living_room": {
            "items": [
                "light-oak 3-seat sofa with linen cushions against the right wall",
                "round light-wood coffee table in front of the sofa",
                "slim walnut TV console with a mounted TV on the wall opposite the window",
                "jute area rug under the coffee table",
                "black arc floor lamp beside the sofa",
            ],
            "alt_pool": [
                "one large potted fig plant in the far corner",
                "a woven wall hanging above the sofa",
                "a pair of light-wood accent chairs",
            ],
        },
        "bedroom": {
            "items": [
                "light-oak bed frame with white linen bedding against the back wall",
                "two light-wood nightstands with woven-shade lamps",
                "a cream wool area rug under the bed",
                "a simple light-wood wardrobe against the side wall",
            ],
            "alt_pool": [
                "a small potted plant on a nightstand",
                "linen curtains framing the window",
                "a woven pouf at the foot of the bed",
            ],
        },
        "home_office": {
            "items": [
                "a light-oak desk against the wall facing the window",
                "a light fabric-upholstered office chair",
                "open light-wood shelving with books and a plant",
                "a cream area rug under the desk",
            ],
            "alt_pool": [
                "a woven pendant light above the desk",
                "a small potted plant on the desk",
                "a linen-shade desk lamp",
            ],
        },
    },
    "industrial": {
        "living_room": {
            "items": [
                "brown leather sofa against the main wall",
                "reclaimed-wood and black-metal coffee table",
                "black metal-framed TV console with mounted TV opposite the seating",
                "a dark patterned area rug under the coffee table",
                "an exposed-bulb floor lamp beside the sofa",
            ],
            "alt_pool": [
                "a metal-framed wall shelf with books",
                "a large potted plant in a metal planter",
                "black metal wall art with an urban theme",
            ],
        },
        "bedroom": {
            "items": [
                "black metal-frame bed with dark linen bedding against the back wall",
                "reclaimed-wood nightstands with exposed-bulb lamps",
                "a dark area rug under the bed",
                "a black metal clothing rack against the side wall",
            ],
            "alt_pool": [
                "a vintage leather bench at the foot of the bed",
                "exposed-bulb string lights along the wall",
                "a small potted plant on a nightstand",
            ],
        },
        "home_office": {
            "items": [
                "a reclaimed-wood desk on black metal legs against the wall facing the window",
                "a black leather and metal office chair",
                "black metal pipe shelving with books",
                "a dark rug under the desk",
            ],
            "alt_pool": [
                "an exposed-bulb desk lamp",
                "a metal wall organizer above the desk",
                "a small potted plant on the desk",
            ],
        },
    },
    "bohemian": {
        "living_room": {
            "items": [
                "a rattan-framed sofa with colorful patterned cushions against the main wall",
                "a low carved-wood coffee table",
                "a woven-textile-draped TV console with mounted TV opposite the seating",
                "a layered patterned area rug under the coffee table",
                "a woven rattan floor lamp beside the sofa",
            ],
            "alt_pool": [
                "several potted plants clustered in one corner",
                "a macrame wall hanging",
                "floor cushions near the coffee table",
            ],
        },
        "bedroom": {
            "items": [
                "a rattan headboard bed with layered patterned textiles against the back wall",
                "mismatched carved-wood nightstands with patterned-shade lamps",
                "a patterned area rug layered under the bed",
                "a woven basket storage unit against the side wall",
            ],
            "alt_pool": [
                "a hanging rattan chair in the corner",
                "a macrame wall hanging above the bed",
                "a potted plant on a nightstand",
            ],
        },
        "home_office": {
            "items": [
                "a carved-wood desk against the wall facing the window",
                "a rattan-back office chair with a patterned cushion",
                "open rattan shelving with books and plants",
                "a patterned rug under the desk",
            ],
            "alt_pool": [
                "a woven pendant light above the desk",
                "a small cluster of potted plants on the desk",
                "a patterned throw on the chair",
            ],
        },
    },
    "luxury_contemporary": {
        "living_room": {
            "items": [
                "a tufted velvet sofa in a jewel tone against the main wall",
                "a marble and gold-accent coffee table",
                "a gold-framed TV console with mounted TV opposite the seating",
                "a plush high-pile area rug under the coffee table",
                "a sculptural gold floor lamp beside the sofa",
            ],
            "alt_pool": [
                "a large statement mirror on the side wall",
                "a crystal-accent pendant light",
                "a pair of velvet accent chairs",
            ],
        },
        "bedroom": {
            "items": [
                "an upholstered velvet bed with a tall tufted headboard against the back wall",
                "matching marble-top nightstands with crystal-accent lamps",
                "a plush area rug under the bed",
                "a mirrored dresser against the side wall",
            ],
            "alt_pool": [
                "a velvet bench at the foot of the bed",
                "floor-length drapery framing the window",
                "a chandelier-style ceiling light",
            ],
        },
        "home_office": {
            "items": [
                "a marble-top desk with gold legs against the wall facing the window",
                "a tufted velvet office chair",
                "gold-accent open shelving with books",
                "a plush rug under the desk",
            ],
            "alt_pool": [
                "a crystal-accent desk lamp",
                "a statement mirror on the side wall",
                "a small gold-accent plant stand",
            ],
        },
    },
}

STYLE_LABELS = {
    "modern_minimalist": "modern minimalist",
    "scandinavian": "Scandinavian",
    "industrial": "industrial",
    "bohemian": "bohemian",
    "luxury_contemporary": "luxury contemporary",
}


def compile_edit_prompt(style: str, room_type: str, variation_index: int, rng: "random.Random") -> str:
    """Builds one FLUX.2 edit instruction for a given style/room/variation.
    Varies the alt_pool selection per variation_index so the 3 outputs are genuinely
    different layouts, not near-duplicates on the same composition."""
    if style not in STYLE_TEMPLATES:
        raise ValueError(f"Unknown style '{style}'. Valid: {list(STYLE_TEMPLATES.keys())}")
    if room_type not in STYLE_TEMPLATES[style]:
        raise ValueError(f"Unknown room_type '{room_type}' for style '{style}'. "
                          f"Valid: {list(STYLE_TEMPLATES[style].keys())}")

    template = STYLE_TEMPLATES[style][room_type]
    items = list(template["items"])
    alt_pool = list(template["alt_pool"])

    # Deterministic-but-varied alt-item selection per variation, seeded by variation_index
    # so re-running the same seed reproduces the same layout.
    rng.shuffle(alt_pool)
    n_alts = 2 if len(alt_pool) >= 2 else len(alt_pool)
    items += alt_pool[:n_alts]

    style_label = STYLE_LABELS[style]
    room_label = room_type.replace("_", " ")
    item_list = ", ".join(items)

    prompt = (
        f"Add {style_label}-style furniture to this empty {room_label}: {item_list}. "
        f"Keep the walls, floor, ceiling, window, and camera perspective exactly unchanged. "
        f"Photorealistic lighting consistent with the existing light source in the photo. "
        f"Correct scale, correct perspective, natural shadows. "
        f"Do not add any furniture beyond what is listed above."
    )
    return prompt
```
This section must include the full dict for **all 5 styles × all 3 room types** exactly as above (or an agent-improved equivalent of comparable completeness) — do not ship a partial template dict with only 1–2 styles filled in. If the frontend can request a room_type not in `ROOM_TYPES`, `compile_edit_prompt` must raise a clear `ValueError`, and the FastAPI layer (Section 18) must catch it and return a 400, not a 500.

---

## 6. Section 13 — `generate_variations()` (implement in full)

```python
import random, time
from PIL import Image

def _round_to_multiple(x: int, multiple: int) -> int:
    return max(multiple, (x // multiple) * multiple)

def _prepare_image(image: Image.Image, max_side: int, multiple: int) -> Image.Image:
    w, h = image.size
    scale = min(max_side / max(w, h), 1.0) if max(w, h) > max_side else 1.0
    new_w = _round_to_multiple(int(w * scale), multiple)
    new_h = _round_to_multiple(int(h * scale), multiple)
    return image.convert("RGB").resize((new_w, new_h), Image.LANCZOS)


def generate_variations(image: Image.Image, style: str, room_type: str) -> dict:
    """Core inference entrypoint. Mirrors the previous function's return shape so the
    FastAPI layer and frontend contract require minimal changes."""
    overall_start = time.time()

    prep_image = _prepare_image(image, IMG_MAX_SIDE, IMG_DIM_MULTIPLE)

    # Depth pass -- metadata/debugging only, not fed into the FLUX.2 call (see Section 11b).
    depth_start = time.time()
    try:
        depth_map = get_depth_map(prep_image)
    except Exception as e:
        depth_map = None
        print(f"⚠️  Depth pass failed non-fatally: {e}")
    depth_time = time.time() - depth_start

    variations = []
    render_start = time.time()
    for i, seed in enumerate(SEEDS[:NUM_VARIATIONS]):
        rng = random.Random(seed)
        prompt = compile_edit_prompt(style, room_type, i, rng)

        gen = torch.Generator(device="cuda").manual_seed(seed)
        out_image = pipe(
            image=prep_image,
            prompt=prompt,
            num_inference_steps=NUM_INFERENCE_STEPS,
            guidance_scale=GUIDANCE_SCALE,
            generator=gen,
        ).images[0]

        variations.append({
            "seed": seed,
            "prompt": prompt,
            "image": out_image,
        })
    render_time = time.time() - render_start

    # Sanity check: outputs must not be identical to each other (guards against a
    # misconfigured pipeline silently ignoring the seed/prompt differences).
    hashes = [hash(v["image"].tobytes()) for v in variations]
    if len(set(hashes)) < len(hashes):
        print("⚠️  WARNING: two or more variations produced identical output images. "
              "Check that `generator` and per-variation prompts are actually varying.")

    total_time = time.time() - overall_start
    return {
        "style": style,
        "room_type": room_type,
        "variations": variations,
        "depth_time_sec": round(depth_time, 2),
        "render_time_sec": round(render_time, 2),
        "total_time_sec": round(total_time, 2),
        "model_id": MODEL_ID,
        "diffusers_version": diffusers.__version__,
    }


def refine_variation(image: Image.Image, style: str, room_type: str, base_prompt: str, seed: int) -> Image.Image:
    """Optional single low-strength refine pass on the user's chosen output, for
    shadow/lighting coherence. Only called on-demand, not for all 3 variations."""
    gen = torch.Generator(device="cuda").manual_seed(seed + 1)
    refine_prompt = (
        f"{base_prompt} Subtly harmonize lighting, shadows, and color grading between "
        f"the added furniture and the original room photo. Do not change furniture placement or style."
    )
    result = pipe(
        image=image,
        prompt=refine_prompt,
        num_inference_steps=max(8, int(NUM_INFERENCE_STEPS * REFINE_STRENGTH)),
        guidance_scale=GUIDANCE_SCALE,
        generator=gen,
    ).images[0]
    return result
```
**Agent action required:** if the installed `Flux2KleinPipeline.__call__` signature does not accept a `strength`-style low-strength-edit parameter the way an img2img SDXL pipeline would, verify empirically what "low-strength refine" should actually look like for this pipeline class (it may simply be a second edit call with a more conservative instruction, as coded above, rather than a numeric strength parameter — confirm which is correct by inspecting `inspect.signature(pipe.__call__)` at runtime and adjust `refine_variation` accordingly). Do not ship a call with a `strength=` kwarg unless you've confirmed the pipeline accepts it.

---

## 7. Section 18 — `/infer` endpoint schema change

```python
from fastapi import UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse
import base64, io

@app.post("/infer")
async def infer(
    file: UploadFile = File(...),
    style: str = Form(...),
    room_type: str = Form(...),
):
    if style not in STYLE_TEMPLATES:
        raise HTTPException(status_code=400, detail=f"Invalid style. Valid: {list(STYLE_TEMPLATES.keys())}")
    if room_type not in ROOM_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid room_type. Valid: {ROOM_TYPES}")

    try:
        contents = await file.read()
        image = Image.open(io.BytesIO(contents))
    except Exception:
        raise HTTPException(status_code=400, detail="Uploaded file is not a valid image.")

    try:
        result = generate_variations(image, style, room_type)
    except torch.cuda.OutOfMemoryError:
        torch.cuda.empty_cache()
        raise HTTPException(status_code=503, detail="GPU ran out of memory. Try again in a moment.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Generation failed: {e}")

    response_variations = []
    for v in result["variations"]:
        buf = io.BytesIO()
        v["image"].save(buf, format="PNG")
        response_variations.append({
            "seed": v["seed"],
            "image_b64": base64.b64encode(buf.getvalue()).decode("utf-8"),
        })

    return JSONResponse({
        "style": result["style"],
        "room_type": result["room_type"],
        "variations": response_variations,
        "depth_time_sec": result["depth_time_sec"],
        "render_time_sec": result["render_time_sec"],
        "total_time_sec": result["total_time_sec"],
        "model_id": result["model_id"],
    })
```
**Contract note (flag this explicitly to the user in your summary when done):** this adds a new **required** `room_type` form field to `/infer` that did not exist before (room type was previously auto-classified). The frontend must add a room-type selector alongside the existing style selector, or requests will now 400. This is an intentional, necessary change from the earlier "no contract change" assumption — call it out clearly rather than silently breaking existing frontend calls.

---

## 8. Section 25 — Troubleshooting table (rewrite)

Must cover at minimum:
- `AttributeError`/`ImportError` on `Flux2KleinPipeline` → diffusers not installed from `main`, re-run Section 3.
- `TypeError: from_pretrained() got an unexpected keyword argument 'dtype'` (or the reverse for `torch_dtype`) → confirms the defensive fallback in Section 7 is doing its job; if it still fails, the installed diffusers version's kwarg has changed again — print `diffusers.__version__` and check the current model card.
- `CUDA OOM` during a `/infer` call → `enable_model_cpu_offload()` should already be active from Section 7; if still OOMing, reduce `IMG_MAX_SIDE` in Section 5.
- `ValueError: Unknown room_type` → frontend/test client isn't sending a value in `ROOM_TYPES`; check Section 5's list matches the frontend dropdown.
- Depth pass warning in logs but generation still completes → expected, depth is non-fatal metadata-only (Section 11b); does not block a response.
- Two variations look identical → the sanity-check hash warning in `generate_variations` fired; check that `SEEDS` are distinct and `compile_edit_prompt`'s alt-pool shuffle is actually seeded per-variation.
- ngrok URL not working → session restarted, or free-tier tunnel expired; re-run Section 20, or use the new Cloudflare fallback cell.

---

## 9. Escalation path (documentation only — do not implement)

Leave a markdown note in Section 12 stating: if the Section 15 golden-test-set run shows recurring specific failures, the fixes are (in order of first resort): (a) wire the depth map into the FLUX.2 call as an explicit hint if furniture scale/placement is wrong, (b) add Florence-2 room captioning as a fallback only when `room_type` is ambiguous, (c) add SAM2 floor/wall masking if geometry drift is observed, (d) replace the static `STYLE_TEMPLATES` alt-pool logic with an LLM call only if template repetition becomes a real user-facing problem. None of these are implemented in this notebook version.

---

## 10. Acceptance checklist — verify all of these before declaring the rewrite done

- [ ] Every old SD1.5/ControlNet/MLSD/MiDaS/CLIP/VAE/DPM++ reference is gone from code *and* markdown cells (search the whole notebook for `controlnet`, `mlsd`, `midas`, `realistic_vision`, `clip`, `sd-vae` and confirm zero remaining hits outside this rewrite's own explanatory notes).
- [ ] Section 3 installs from diffusers `main` and prints the resolved version.
- [ ] Section 7's edit-mode validation call runs and asserts successfully — this is the automated version of the "validate before committing" step and must not be skipped or stubbed out.
- [ ] `STYLE_TEMPLATES` contains all 5 styles × all 3 room types with non-empty `items` and `alt_pool` lists.
- [ ] `compile_edit_prompt` raises `ValueError` (not a silent KeyError) on invalid style/room_type.
- [ ] `generate_variations` returns exactly `NUM_VARIATIONS` distinct images (hash-checked) with per-variation prompts logged.
- [ ] `/infer` requires and validates `style` and `room_type`, returns 400 on invalid values, 503 on OOM, 500 with a real error message on any other failure — never an unhandled traceback to the client.
- [ ] Section 21's live test cell actually exercises the new schema (`room_type` included) and asserts on the response shape.
- [ ] Section 24 cleanup deletes the correct new variable names (`pipe`, `depth_estimator`), not leftover references to deleted objects.
- [ ] Running every cell top-to-bottom once, in order, in a clean runtime, completes with no exceptions and produces 3 visibly different rendered rooms in Section 15's sanity plot.
- [ ] No cell references a variable defined in a section that was deleted.

When done, summarize for the user: what was removed, what was added, the one API contract change (`room_type` now required), and any place where you had to deviate from this spec because the installed diffusers/FLUX.2 API surface didn't match what's assumed above — be explicit about those deviations rather than silently working around them.