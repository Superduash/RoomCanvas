# FIX_AND_OPTIMIZE.md — RoomCanvas Inference Notebook: Bug Fixes + Safe Optimization Pass

**Target agent:** Claude (Sonnet/Opus 4.6) inside an IDE with notebook-editing tools.
**Target file:** `inference_server.ipynb` (current version — 25 sections, FLUX.2 klein 4B edit-mode architecture already in place).
**Reference file (do NOT port wholesale):** `flux2klein4b_tutorial.ipynb` (Pruna optimization tutorial). Read §0 before touching anything — it explains exactly what to take from it and what to reject, with reasons. Do not skip that reasoning and "just implement what the tutorial does."

This is a fix-and-optimize pass on an already-working notebook, not a rewrite. Every change below is either (a) fixing a real bug, or (b) a specific, justified optimization. Do not add anything not listed here. Do not leave `TODO`s. Every cell must run top-to-bottom with no exceptions in a fresh Colab T4 runtime.

---

## 0. Verdict on the attached Pruna tutorial — read this first

The tutorial demonstrates three techniques stacked together: FORA caching, TorchAO FP8 quantization, and `torch.compile`. Do not adopt the stack as-is.

| Technique | Verdict | Reason |
|---|---|---|
| TorchAO FP8 quantization | ❌ **Do not implement.** | Requires compute capability ≥8.9 (H100/Ada-class). T4 is compute capability 7.5. This will not run correctly on the target hardware — it's not a matter of it being slower, it's not supported at all. |
| FORA (Pruna caching) | ❌ **Do not implement in this pass.** | The tutorial only demonstrates it on text-to-image generation, not edit mode (`image=` calls), which is 100% of what this notebook does. Behavior under edit mode is unverified. It also requires adopting the `pruna` package and `deepcopy`-ing the pipeline (`smash(model=copy.deepcopy(pipe), ...)`), which conflicts with the defensive loading/offload logic already in Section 7. Note it for the escalation path (§8) only — do not wire it in now. |
| `torch.compile` | ✅ **Implement, natively, without Pruna.** | `torch.compile` is a core PyTorch feature, works on T4 (compute capability 7.5 is supported since PyTorch 2.0), and needs no new dependency. Implement it directly against `pipe.transformer`, guarded with a try/except fallback so a compile failure never breaks the notebook. |

Also note: the tutorial's `gen_kwargs` use `guidance_scale=4.0, num_inference_steps=50` against `FLUX.2-klein-**base**-4B` — the *undistilled* checkpoint. Our `MODEL_ID` is `FLUX.2-klein-4B` (no `-base-`), the *distilled* variant, whose reference settings are `guidance_scale=1.0, num_inference_steps=4`. Do not copy the tutorial's generation parameters — they're for a different checkpoint. This distinction is also the root of Bug #3 below.

---

## 1. Bug fixes (do these first, in order)

### Bug 1 — `refine_variation()` is dead code; no `/refine` endpoint exists
The function is fully implemented in Section 13 but nothing calls it. Add a new endpoint.

**Section 18 (`/infer` endpoint area) — add a new cell/endpoint after it:**
```python
class _RefineCache:
    """Tiny in-memory cache so /refine can look up the original image + prompt
    from a prior /infer call without the client re-uploading the base image."""
    def __init__(self, max_entries=50):
        self.store = {}
        self.max_entries = max_entries

    def put(self, request_id, image, style, room_type, prompt, seed):
        if len(self.store) >= self.max_entries:
            self.store.pop(next(iter(self.store)))  # drop oldest
        self.store[request_id] = {
            "image": image, "style": style, "room_type": room_type,
            "prompt": prompt, "seed": seed,
        }

    def get(self, request_id):
        return self.store.get(request_id)


refine_cache = _RefineCache()
```
Update `/infer` to generate a `request_id` (uuid4) and, for each variation, cache the **rendered** image (not the original room photo — refine operates on the already-furnished output) keyed by `f"{request_id}:{seed}"`. Include `request_id` in the JSON response.

Add the new endpoint:
```python
import uuid

@app.post("/refine")
async def refine(request_id: str = Form(...), seed: int = Form(...)):
    cache_key = f"{request_id}:{seed}"
    entry = refine_cache.get(cache_key)
    if entry is None:
        raise HTTPException(
            status_code=404,
            detail="No cached variation found for this request_id/seed. It may have expired.",
        )
    try:
        with INFERENCE_LOCK:  # see Bug 6
            refined = refine_variation(
                entry["image"], entry["style"], entry["room_type"],
                entry["prompt"], entry["seed"],
            )
    except torch.cuda.OutOfMemoryError:
        torch.cuda.empty_cache()
        raise HTTPException(status_code=503, detail="GPU out of memory during refine.")
    except Exception as e:
        logger.error(f"/refine failed: {e}")
        raise HTTPException(status_code=500, detail=f"Refine failed: {e}")

    return JSONResponse({
        "request_id": request_id,
        "seed": seed,
        "image_b64": pil_to_b64(refined),
    })
```
Update Section 21's live test to call `/refine` on one variation from a prior `/infer` response and assert it returns a valid, non-identical image compared to the un-refined version.

### Bug 2 — Distilled-model detection doesn't actually change generation parameters
Section 7 currently only *prints* a recommendation when it detects a distilled checkpoint. Fix it to actually override the globals:
```python
if _has_distilled_hint:
    NUM_INFERENCE_STEPS = 4
    GUIDANCE_SCALE = 1.0
    print()
    print('✅ Detected DISTILLED checkpoint (guidance_embeds=True).')
    print(f'   Auto-set NUM_INFERENCE_STEPS={NUM_INFERENCE_STEPS}, GUIDANCE_SCALE={GUIDANCE_SCALE}')
else:
    print()
    print('ℹ️  Could not confirm distilled flag -- keeping configured defaults '
          f'(NUM_INFERENCE_STEPS={NUM_INFERENCE_STEPS}, GUIDANCE_SCALE={GUIDANCE_SCALE}).')
    print('   If this is actually the base/undistilled checkpoint, consider '
          'NUM_INFERENCE_STEPS=28-50, GUIDANCE_SCALE=3.5-4.0 per the model card.')
```
This is the single biggest performance fix available: running the distilled checkpoint at 24 steps instead of its calibrated 4-step regime is roughly 6x more render time than necessary for equal or better quality (distilled models are trained specifically for the low-step regime; more steps is not "more quality," it can be *worse*). Update the Section 5 comment that currently says `# overridden if model card reports distilled=True` to confirm it now actually is overridden, not just documented as intended.

### Bug 3 — OOM fallback in Section 7 retries an identical call
```python
try:
    pipe = _load_pipeline(MODEL_ID, torch.bfloat16)
    pipe = pipe.to('cuda')
except torch.cuda.OutOfMemoryError:
    print('⚠️  Direct CUDA placement OOM -- falling back to CPU offload.')
    pipe = _load_pipeline(MODEL_ID, torch.bfloat16)
```
The except branch re-runs the exact same `.from_pretrained()` + no `.to('cuda')` call — it doesn't actually change strategy. Fix:
```python
try:
    pipe = _load_pipeline(MODEL_ID, torch.bfloat16)
    pipe = pipe.to('cuda')
    _needs_offload = False
except torch.cuda.OutOfMemoryError:
    print('⚠️  Direct CUDA placement OOM -- reloading with low_cpu_mem_usage + offload.')
    torch.cuda.empty_cache()
    pipe = _load_pipeline(MODEL_ID, torch.bfloat16)  # do not call .to('cuda') here
    _needs_offload = True
```
Then make the offload decision conditional rather than unconditional (this also matters for Optimization 2 below, since `torch.compile` and `enable_model_cpu_offload()` interact poorly together — offload re-dispatches modules across devices between steps, which fights compiled/static graphs):
```python
if _needs_offload:
    pipe.enable_model_cpu_offload()
    print('✅ CPU offload enabled (VRAM safety net, load-time OOM occurred).')
else:
    # Try cheaper VRAM-saving options first; only fall back to full offload if still tight.
    if hasattr(pipe, 'enable_attention_slicing'):
        pipe.enable_attention_slicing()
    if hasattr(pipe, 'vae') and hasattr(pipe.vae, 'enable_slicing'):
        pipe.vae.enable_slicing()
    print('✅ Attention/VAE slicing enabled (lighter-weight than full offload).')
    print('   Full CPU offload was NOT enabled -- pipeline stays fully on GPU for speed '
         '(re-run this cell and it will fall back automatically if that turns out to OOM).')
```
Wrap the *first* render call after this (the mandatory validation call, already present) in the same OOM handling: if the validation call itself OOMs, catch it, call `pipe.enable_model_cpu_offload()` as a last resort, and retry the validation call once before giving up.

### Bug 4 — Cloudflare fallback crashes if `cloudflared` isn't installed
Section 20's fallback calls `subprocess.Popen(['cloudflared', ...])` with no install step and no try/except around the `Popen` call itself. Fix:
```python
if public_url is None:
    print('🌐 Attempting Cloudflare quick tunnel fallback...')
    import subprocess as _sp, re as _re, threading as _thr, shutil as _shutil

    if _shutil.which('cloudflared') is None:
        print('   Installing cloudflared...')
        _sp.run(
            ['wget', '-q',
             'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64',
             '-O', '/usr/local/bin/cloudflared'],
            check=False,
        )
        _sp.run(['chmod', '+x', '/usr/local/bin/cloudflared'], check=False)

    if _shutil.which('cloudflared') is None:
        print('⚠️  cloudflared install failed -- skipping this fallback.')
    else:
        try:
            _cf_output = []
            def _run_cf():
                _proc = _sp.Popen(
                    ['cloudflared', 'tunnel', '--url', 'http://127.0.0.1:8000'],
                    stderr=_sp.PIPE, stdout=_sp.DEVNULL, text=True
                )
                for _line in _proc.stderr:
                    _cf_output.append(_line)
                    if 'trycloudflare.com' in _line:
                        break
            _cf_thread = _thr.Thread(target=_run_cf, daemon=True)
            _cf_thread.start()
            _cf_thread.join(timeout=20)
            for _line in _cf_output:
                _m = _re.search(r'https://[a-zA-Z0-9-]+\.trycloudflare\.com', _line)
                if _m:
                    public_url = _m.group(0)
                    print(f'✅ Cloudflare tunnel: {public_url}')
                    break
        except Exception as _cf_err:
            print(f'⚠️  Cloudflare fallback failed: {_cf_err}')
```

### Bug 5 — No EXIF orientation handling on uploaded photos
Phone photos frequently carry an EXIF orientation tag; PIL does not auto-rotate on `.open()`. Without correction, furniture gets added to a sideways or upside-down room. Fix in `prepare_image` (Section 9):
```python
from PIL import ImageOps

def prepare_image(image, max_side=None, dim_multiple=None):
    if max_side is None:
        max_side = IMG_MAX_SIDE
    if dim_multiple is None:
        dim_multiple = IMG_DIM_MULTIPLE
    image = ImageOps.exif_transpose(image)  # correct phone-camera rotation first
    w, h = image.size
    scale = min(max_side / max(w, h), 1.0)
    new_w = _round_to_multiple(int(w * scale), dim_multiple)
    new_h = _round_to_multiple(int(h * scale), dim_multiple)
    return image.convert('RGB').resize((new_w, new_h), Image.LANCZOS)
```
Add a one-line assertion in the existing Section 9 sanity check confirming `ImageOps.exif_transpose` is being called (e.g., construct a test image with a rotation EXIF tag via `piexif` if available, otherwise just confirm the function doesn't error on an image with no EXIF data at all — most important is that it doesn't crash on images with no `getexif()` data, which is the common failure mode of this fix if implemented carelessly).

### Bug 6 — No concurrency lock around GPU inference
Two simultaneous `/infer` (or `/infer` + `/refine`) requests will both call into `pipe(...)` at once, which is unsafe for a single CUDA context / model instance and can corrupt VRAM state or throw opaque CUDA errors. Add a global lock and serialize all pipeline calls through it:
```python
import threading
INFERENCE_LOCK = threading.Lock()
```
Wrap the `pipe(...)` calls inside `generate_variations()` and `refine_variation()` with `with INFERENCE_LOCK:`. This is a demo server on a single T4 — serializing is the correct trade-off (correctness over throughput); do not attempt a request queue or batching-across-requests here, that's out of scope.

---

## 2. Optimizations (apply after all bugs above are fixed)

### Optimization 1 — Correct step count (this *is* Bug 2 above; the biggest win, already covered)
No separate work needed beyond Bug 2 — flagging it again here because it's the highest-impact change in this entire pass. Expect render time to drop substantially once steps go from 24 to the model's actual calibrated 4 (or up to 8, if you find 4 too aggressive after visual inspection in Section 15's sanity check — expose this as a single named constant, not a magic number buried in a call site, which it already is).

### Optimization 2 — `torch.compile` on the transformer, native, guarded
Add after the pipeline is fully loaded and offload/slicing decisions are made in Section 7 (only if `_needs_offload` is `False` — compiling a pipeline under `enable_model_cpu_offload()` is unreliable since modules move between devices between calls):
```python
COMPILE_ENABLED = False
if not _needs_offload and hasattr(pipe, 'transformer'):
    print('Attempting torch.compile on the transformer (T4-safe mode)...')
    try:
        pipe.transformer = torch.compile(
            pipe.transformer, mode='reduce-overhead', fullgraph=False
        )
        COMPILE_ENABLED = True
        print('✅ torch.compile applied. First call after this will be slow (JIT warmup) -- '
              'that cost is absorbed by the mandatory validation call below, not a real request.')
    except Exception as _compile_err:
        print(f'⚠️  torch.compile failed non-fatally: {_compile_err}')
        print('   Continuing without compilation -- this does not block the notebook.')
        COMPILE_ENABLED = False
```
Use `mode='reduce-overhead'`, not `'max-autotune'` — max-autotune's extended kernel search is tuned for and mostly validated on Ampere/Hopper; on T4 it risks long/unstable compile times for uncertain benefit. `fullgraph=False` allows graph breaks instead of hard failures if some op isn't compile-compatible, which matters more than max theoretical speedup here.

Ensure the **existing mandatory validation call already in Section 7 runs after this**, so JIT compilation happens during notebook setup, not during a user's first live request. Print `COMPILE_ENABLED` status in the `/health` endpoint response so it's visible from outside the notebook too.

### Optimization 3 — Batch the 3 variations into one pipeline call, with a loop fallback
Currently `generate_variations()` calls `pipe(...)` three times sequentially. If the installed pipeline class supports list-valued `image=`/`prompt=`/`generator=` arguments (batched forward pass), a single batched call has better GPU utilization on a 4B model at T4-scale than 3 separate calls, especially now that each call is only 4 steps (fixed per-call overhead becomes proportionally larger at low step counts). Implement with a runtime capability probe and graceful fallback — do not assume batching works without checking:
```python
def _supports_batched_call():
    try:
        _sig = inspect.signature(pipe.__call__)
        return 'prompt' in _sig.parameters  # presence alone doesn't guarantee list support;
                                              # the real test is the try/except at call time below
    except Exception:
        return False


def _render_variations_batched(prep_image, prompts, seeds):
    generators = [torch.Generator(device='cuda').manual_seed(s) for s in seeds]
    images = [prep_image] * len(prompts)
    out = pipe(
        image=images,
        prompt=prompts,
        num_inference_steps=NUM_INFERENCE_STEPS,
        guidance_scale=GUIDANCE_SCALE,
        generator=generators,
    ).images
    if len(out) != len(prompts):
        raise ValueError(f'Batched call returned {len(out)} images, expected {len(prompts)}.')
    return out


def _render_variations_loop(prep_image, prompts, seeds):
    out = []
    for prompt, seed in zip(prompts, seeds):
        gen = torch.Generator(device='cuda').manual_seed(seed)
        out.append(pipe(
            image=prep_image, prompt=prompt,
            num_inference_steps=NUM_INFERENCE_STEPS, guidance_scale=GUIDANCE_SCALE,
            generator=gen,
        ).images[0])
    return out
```
In `generate_variations()`, build `prompts = [compile_edit_prompt(style, room_type, i, random.Random(s)) for i, s in enumerate(SEEDS[:NUM_VARIATIONS])]`, then:
```python
try:
    rendered = _render_variations_batched(prep_image, prompts, SEEDS[:NUM_VARIATIONS])
    print('  Rendered via batched call.')
except Exception as _batch_err:
    print(f'  Batched call unavailable/failed ({_batch_err}) -- falling back to per-variation loop.')
    rendered = _render_variations_loop(prep_image, prompts, SEEDS[:NUM_VARIATIONS])
variations = [{'seed': s, 'prompt': p, 'image': img} for s, p, img in zip(SEEDS[:NUM_VARIATIONS], prompts, rendered)]
```
Keep the existing hash-uniqueness sanity check unchanged — it applies identically to either path.

---

## 3. Section 22 (Performance Diagnostics) — update for the new baseline
Add `COMPILE_ENABLED` and the actual `NUM_INFERENCE_STEPS`/`GUIDANCE_SCALE` in effect (post Bug 2 fix) to the printed diagnostics, and update the expected time budget comment — with the step-count fix and batching, expect render time to drop meaningfully below the previous "~15–25s for 3 variations" estimate; do not hard-code a new number without measuring it in the notebook's own Section 21 live test, print the *actual* measured average instead of a guessed constant.

## 4. Section 25 (Troubleshooting) — add these rows
| Symptom | Cause | Fix |
|---|---|---|
| `/refine` returns 404 | `request_id`/`seed` not in cache, or server restarted since the `/infer` call | Re-run `/infer` first; cache is in-memory and does not survive a server restart |
| `torch.compile` warning printed at startup, generation still works | Compile failed non-fatally (Optimization 2) | Expected fallback behavior — not an error, just slower than the compiled path |
| Images render sideways/rotated | Should no longer happen after Bug 5 fix | If it does, confirm `ImageOps.exif_transpose` is actually being called in `prepare_image` |
| Two concurrent requests hang or one fails | Should no longer happen after Bug 6 fix | Confirm `INFERENCE_LOCK` wraps both `generate_variations` and `refine_variation` pipeline calls |
| Cloudflare fallback still fails after install attempt | Colab network restrictions or GitHub release fetch blocked | Fall back to ngrok with a valid token; this is an infra limitation, not a code bug |

---

## 5. Acceptance checklist

- [ ] `/refine` endpoint exists, is wired to `refine_variation()`, and Section 21's live test exercises it end-to-end.
- [ ] Distilled-model detection in Section 7 **actually reassigns** `NUM_INFERENCE_STEPS`/`GUIDANCE_SCALE`, not just prints a suggestion — confirm by printing the values immediately after the branch and comparing to what `generate_variations` actually uses.
- [ ] OOM fallback in Section 7 takes a genuinely different code path on retry (no `.to('cuda')`, offload applied), not an identical re-run.
- [ ] Cloudflare fallback installs the binary if missing and never raises an uncaught `FileNotFoundError`.
- [ ] `prepare_image` calls `ImageOps.exif_transpose` before any resizing.
- [ ] `INFERENCE_LOCK` wraps every `pipe(...)` call reachable from a FastAPI route.
- [ ] `torch.compile` is attempted only when `_needs_offload is False`, wrapped in try/except, and never blocks notebook execution on failure.
- [ ] Batched rendering is attempted first with a working loop fallback; the hash-uniqueness check still passes either way.
- [ ] No reference anywhere in code or markdown to FP8/TorchAO quantization or Pruna/FORA as something actually running — if mentioned at all, it's in an explicit "not used on T4, see escalation notes" comment.
- [ ] Full top-to-bottom run in a clean Colab T4 runtime completes with no exceptions, `/infer` and `/refine` both return valid responses in the live test, and Section 22 prints measured (not guessed) timing.

When done, report: the measured before/after render time from the step-count fix, whether `torch.compile` succeeded or fell back on the test hardware, and whether batched rendering was actually supported by the installed diffusers build or fell back to the loop.
