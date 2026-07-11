# Phase1-3.md
### RoomCanvas — Polish Pass: Audit, Slider Animation, Customization Completeness
For: Antigravity, Claude/Gemini 3.1 Pro (High). This was written after reading the actual current source (`Backend.txt`/`Frontend.txt` in full) — every finding below is grounded in real code, not guesses. Implement all three phases in one pass; do not stop after Phase 1.

---

## PHASE 1 — Full Audit: Confirmed Working vs Real Gaps Found

### Confirmed correctly implemented (verified by reading the actual code — no changes needed)
- Blocking `requests.get()` → async `httpx` fix: applied in `storage_service.py`.
- Retry narrowing to transient exceptions only: applied on both `gemini_provider.py` and `replicate_provider.py`.
- `/api/health` real DNS-probe check, Redis caching on `/config`/`/styles`, rate limiting via `RateLimiter` dependency on `/generate` (confirmed `15, 3600` applied) — all present.
- Regenerate/refine/customize now correctly show a relabeled `AnalysisStepper` (`REGEN_STEPS`: "Applying your changes... / Rendering materials and lighting...") instead of a bare spinner — this was a real ask in the last pass and it's genuinely done.
- The app has grown a `ProjectOut`/`ProjectDetailsOut` concept (a "project" = one uploaded room with a version timeline of generations) — this is a good structural upgrade beyond the original spec; keep it, and make sure Phase 3's customization changes respect this model rather than treating generations as flat/unrelated.
- `resolveImageUrl` used consistently across History, Results, and the compare views — no raw/unresolved paths found.
- Test suite exists (`tests/integration/`, `tests/unit/`) covering analyze/generate/refine/history endpoints and the repository/prompt-builder units — good foundation, extend it for the new customization fields in Phase 3 rather than leaving it to drift out of sync with the schema.

### Real gaps found — fix all of these

1. **`CompareSlider` never remounts/replays its reveal on a new generation.** `ResultsPage.tsx` renders `<CompareSlider beforeSrc={originalSrc} afterSrc={generatedSrc} />` with no `key` prop. When a regenerate/refine/customize completes and the URL's `?v=` param changes to point at a new generation, React reuses the same component instance (only props change) — any mount-time animation logic will not re-fire. This is the direct blocker for Phase 2 below; the fix is in Phase 2.

2. **`CustomizationOptions` supports `color_preference` on the backend schema (`schemas/generation.py`) and it's already spliced into the prompt in `prompt_builder.py`'s customization clause — but the frontend `CustomizationPanel.tsx` never exposes a color-preference input at all.** A fully-wired backend field with no UI is dead functionality from the user's perspective. Fixed in Phase 3.

3. **No way to switch style during customization/regenerate.** Neither `GenerateRequest` nor `CustomizationOptions` (backend `schemas/generation.py`) carries a style override field — style is locked to whatever the original `/analyze` call used, for the lifetime of that project. This is the concrete gap behind "styles maybe missing in customization." Fixed in Phase 3, backend + frontend both.

4. **Customization selections don't persist for "customize again."** `CustomizationPanel` holds all its state in local `useState`, and is not passed the previously-applied `CustomizationOptions` for the current project — so after regenerating with options, reopening the panel starts blank instead of showing (and letting the user edit) what was actually just used. Fixed in Phase 3.

5. **UI smoothness recommendations** (not bugs, genuine polish):
   - `CustomizationPanel`'s open/close currently only animates in (`animate-in slide-in-from-top-2 fade-in`) — add a matching exit animation (`animate-out slide-out-to-top-2 fade-out`) so closing doesn't just snap away, wrap the conditional render in `AnimatePresence` if Framer Motion is already a dependency (it is, per the design system), for a consistent enter/exit rather than a CSS-only enter and instant-unmount exit.
   - The must-have/avoid chip buttons use raw Tailwind conditional strings inline (`className={...ternary...}`) rather than the `cn()` utility already established elsewhere in the codebase — harmless functionally, but inconsistent with the rest of the primitive system; normalize to `cn()` for maintainability while touching this file in Phase 3 anyway.
   - Confirm `prefers-reduced-motion` is respected by the new slider-reveal animation in Phase 2 specifically (the existing global CSS rule doesn't reach a JS/rAF-driven animation) — handled explicitly in the Phase 2 code below.

---

## PHASE 2 — Smooth Premium Slider Reveal Animation

**Goal:** the moment a generation finishes (initial generate, regenerate, refine, or customize), the comparison slider should not just appear at a static 50/50 split. It should reveal the redesigned image first (slider fully right, 100% "after" visible), then glide smoothly to the 50/50 center position — a deliberate, premium "ta-da" moment, not an instant snap.

### Fix 1 — force remount on generation change (`ResultsPage.tsx`)

```tsx
// Replace the existing usage — add a key tied to the actual image so a genuinely new
// image always triggers a fresh mount + fresh reveal animation, but switching view
// modes or re-rendering for unrelated reasons does not replay it unnecessarily.
<CompareSlider
  key={generatedSrc}
  beforeSrc={originalSrc}
  afterSrc={generatedSrc}
/>
```

### Fix 2 — the reveal animation itself (`CompareSlider.tsx`)

Add an entrance sequence that runs once on mount, then hands control to the existing drag/keyboard interaction untouched. Uses the same `updateDOM`/`rafId` machinery already in the component — no architectural change, just an animated initial value instead of a static `updateDOM(50)`.

```tsx
// CompareSlider.tsx — add near the top of the component, alongside existing refs/state
const [isRevealing, setIsRevealing] = useState(true);
const [afterLoaded, setAfterLoaded] = useState(false);
const prefersReducedMotion = useRef(
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
);

// Ease-out cubic — fast start, gentle settle. Matches the app's --ease-decelerate token.
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

const runRevealAnimation = useCallback(() => {
  if (prefersReducedMotion.current) {
    updateDOM(50);
    setPercent(50);
    setIsRevealing(false);
    return;
  }

  const START = 100;   // fully "after" visible
  const END = 50;      // settles at center
  const DURATION_MS = 900;
  const startTime = performance.now();

  updateDOM(START);

  function step(now: number) {
    const elapsed = now - startTime;
    const t = Math.min(elapsed / DURATION_MS, 1);
    const eased = easeOutCubic(t);
    const current = START + (END - START) * eased;
    updateDOM(current);
    if (t < 1) {
      rafId.current = requestAnimationFrame(step);
    } else {
      setPercent(END);
      setIsRevealing(false);
      rafId.current = null;
    }
  }
  rafId.current = requestAnimationFrame(step);
}, [updateDOM]);

// Replace the existing plain "updateDOM(50)" mount effect with this:
useEffect(() => {
  if (afterLoaded) {
    runRevealAnimation();
  }
  return () => {
    if (rafId.current !== null) cancelAnimationFrame(rafId.current);
  };
}, [afterLoaded, runRevealAnimation]);
```

Wire `afterLoaded` to the redesigned image's actual load event — this is what makes the reveal feel "real-time" and instant the moment the image is genuinely ready, not on a fixed timer disconnected from actual load state:

```tsx
{/* After (redesigned) — full width base layer */}
<img
  src={afterSrc}
  alt={afterLabel}
  className="absolute inset-0 w-full h-full object-cover pointer-events-none"
  draggable={false}
  loading="eager"
  fetchPriority="high"
  decoding="async"
  onLoad={() => setAfterLoaded(true)}
/>
```

**Disable interaction during the reveal** (dragging mid-animation would fight the rAF loop) and give the handle its own subtle scale-in so it doesn't feel like it teleports into place:

```tsx
<div
  ref={containerRef}
  className={cn(
    'relative w-full aspect-[4/3] sm:aspect-[16/10] lg:aspect-[16/9] overflow-hidden bg-surface-alt select-none touch-none focus:outline-none',
    className
  )}
  tabIndex={0}
  role="slider"
  aria-valuenow={Math.round(percent)}
  aria-valuemin={0}
  aria-valuemax={100}
  aria-label="Image comparison slider"
  onPointerDown={isRevealing ? undefined : onPointerDown}
  onPointerMove={isRevealing ? undefined : onPointerMove}
  onPointerUp={isRevealing ? undefined : onPointerUp}
  onPointerCancel={isRevealing ? undefined : onPointerUp}
  onKeyDown={isRevealing ? undefined : onKeyDown}
  style={{ touchAction: 'none', cursor: isRevealing ? 'default' : undefined }}
>
```
```tsx
{/* Elegant handle — add a mount-in scale so it doesn't just appear at full size mid-glide */}
<div
  ref={handleRef}
  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-white shadow-[0_4px_15px_rgba(0,0,0,0.2)] flex items-center justify-center border border-border/10 transition-transform duration-200 ease-out will-change-transform"
  style={{ opacity: isRevealing ? 0 : 1, transition: 'opacity 300ms ease-out' }}
>
```
The handle fades in only once the glide settles (`isRevealing` flips to `false`), so during the sweep the user's eye is on the image transition itself, not a handle sliding across — then the handle appears exactly where it'll live for interaction, which is the polished detail that sells the "premium" feel.

**Result:** on every completed generation — first generate, regenerate, refine, or customize — the redesigned image reveals fully, then glides to center over ~900ms with an ease-out curve, respects `prefers-reduced-motion` (skips straight to the static 50/50 state), and hands off cleanly to the existing drag/keyboard interaction the moment it settles. No layout shift, no flash of the wrong state — the `key` fix in Fix 1 guarantees this replays every time a genuinely new image loads, not just the very first time.

---

## PHASE 3 — Complete the Customization Feature, Without Breaking Navigation

### 3.1 — Add color preference input (backend already supports it, just wire the UI)

```tsx
// CustomizationPanel.tsx — add state
const [colorPreference, setColorPreference] = useState('');

// add to handleApply, alongside the other optional fields
if (colorPreference.trim()) opts.color_preference = colorPreference.trim();

// add to the JSX, after the "Lighting Preference" block
<div>
  <label className="text-xs font-medium text-text-secondary mb-2 block">Color Preference</label>
  <input
    type="text"
    placeholder="e.g. warm earth tones, navy and brass"
    value={colorPreference}
    onChange={e => setColorPreference(e.target.value)}
    className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
  />
</div>
```

### 3.2 — Add style switching to customization (backend + frontend, this is the real missing feature)

**Backend — `schemas/generation.py`:**
```python
class CustomizationOptions(BaseModel):
    must_have_furniture: list[str] = []
    color_preference: str | None = None
    budget_tier: str | None = None
    lighting_preference: str | None = None
    room_width_ft: float | None = None
    room_length_ft: float | None = None
    avoid: list[str] = []
    style_override: str | None = None   # NEW — one of the ids from GET /api/styles
```

**Backend — `generation_service.py`**, inside `run_generation_task` (or wherever the redesign prompt is currently assembled from the parent generation's `style`): if `customization.style_override` is present and differs from the project's current style, use it in place of the stored style when selecting the style's `reason_template`/variation pool (`pick_variation_descriptors(style_override)` from the earlier randomness fix) and when building the redesign prompt — and **write the new generation row's own `style` column to the override value**, not the original project's style. This is important: it means a project's version timeline can legitimately span styles (start Scandinavian, customize to Japandi) and each generation row still accurately records which style it actually is, which is exactly what `ProjectDetailsOut.timeline` needs to stay honest.

```python
effective_style = customization.style_override if (customization and customization.style_override) else parent_generation.style
```

**Frontend — `CustomizationPanel.tsx`:** fetch styles the same way the upload page does (reuse the existing `useStyles()`-equivalent query hook — check `api/queries.ts` for the hook name already used on the style-selection step of upload and reuse it here verbatim, don't duplicate the fetch) and add a style picker:

```tsx
const { data: styles } = useStyles(); // reuse existing hook — do not refetch/duplicate

const [styleOverride, setStyleOverride] = useState<string>('');

// add to handleApply
if (styleOverride) opts.style_override = styleOverride;

// add to JSX, as the first field in the panel — style is the most consequential choice, put it first
<div>
  <label className="text-xs font-medium text-text-secondary mb-2 block">Style</label>
  <div className="flex flex-wrap gap-2">
    {styles?.map(s => (
      <button
        key={s.id}
        onClick={() => setStyleOverride(prev => prev === s.id ? '' : s.id)}
        className={cn(
          'px-3 py-1.5 rounded-full text-xs font-medium transition-colors border',
          styleOverride === s.id
            ? 'bg-accent text-white border-accent'
            : 'bg-surface text-text-secondary border-border hover:border-accent-subtle'
        )}
      >
        {titleCase(s.id)}
      </button>
    ))}
  </div>
  <p className="text-xs text-text-tertiary mt-1.5">Leave unselected to keep the current style.</p>
</div>
```

### 3.3 — Persist and pre-fill last-used customization ("change options and regenerate")

Add one field to `uiStore.ts` (consistent with the store's existing narrow-scope pattern — this is client-only, per-session UI convenience state, not server data):

```typescript
// store/uiStore.ts — addition
interface UIState {
  // ...existing fields
  lastCustomization: Record<number, CustomizationOptions>; // keyed by project id
  setLastCustomization: (projectId: number, options: CustomizationOptions) => void;
}
```
```typescript
lastCustomization: {},
setLastCustomization: (projectId, options) =>
  set((state) => ({ lastCustomization: { ...state.lastCustomization, [projectId]: options } })),
```

**`ResultsPage.tsx`**, inside `handleCustomize`: save the options that were just applied, and pass the saved options back into `CustomizationPanel` as its initial state so reopening it shows exactly what was last used, fully editable:

```tsx
const handleCustomize = async (options: CustomizationOptions) => {
  try {
    const result = await generateDesign.mutateAsync({ analysisId: activeGeneration.id, forceNew: true, customization: options });
    useUIStore.getState().setLastCustomization(project.id, options);
    toast.success('New customized version started.');
    setSearchParams({ v: result.id.toString() });
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Failed to regenerate with options');
  }
};
```
```tsx
<CustomizationPanel
  onCustomize={handleCustomize}
  disabled={!isCompleted}
  defaultDimensions={project.latest_generation.analysis_json ? JSON.parse(project.latest_generation.analysis_json).estimated_dimensions : undefined}
  initialOptions={useUIStore((s) => s.lastCustomization[project.id])}
/>
```

**`CustomizationPanel.tsx`** — accept `initialOptions` and seed every piece of local state from it instead of always starting blank:

```tsx
interface CustomizationPanelProps {
  onCustomize: (options: CustomizationOptions) => void;
  disabled?: boolean;
  defaultDimensions?: { width_ft: number; length_ft: number };
  initialOptions?: CustomizationOptions;
}

export function CustomizationPanel({ onCustomize, disabled, defaultDimensions, initialOptions }: CustomizationPanelProps) {
  const [mustHaveFurniture, setMustHaveFurniture] = useState<string[]>(initialOptions?.must_have_furniture ?? []);
  const [avoid, setAvoid] = useState<string[]>(initialOptions?.avoid ?? []);
  const [budgetTier, setBudgetTier] = useState(initialOptions?.budget_tier ?? '');
  const [lightingPreference, setLightingPreference] = useState(initialOptions?.lighting_preference ?? '');
  const [colorPreference, setColorPreference] = useState(initialOptions?.color_preference ?? '');
  const [styleOverride, setStyleOverride] = useState(initialOptions?.style_override ?? '');
  const [width, setWidth] = useState(String(initialOptions?.room_width_ft ?? defaultDimensions?.width_ft ?? ''));
  const [length, setLength] = useState(String(initialOptions?.room_length_ft ?? defaultDimensions?.length_ft ?? ''));
  // ...rest unchanged
```

Also add a small **"Reset to defaults"** ghost button next to "Cancel" in the panel header — clears all local state back to empty/`defaultDimensions`, giving the user an explicit way to start clean rather than having to uncheck everything by hand.

### 3.4 — Do not break flow or navigation (explicit checks)

- `handleCustomize`'s navigation (`setSearchParams({ v: result.id.toString() })`) already keeps the user on the same `ResultsPage` route for the same project, just swapping which generation version is displayed — this is correct and must stay exactly this shape; do not change it to a full route navigation (`navigate('/results/...')`), which would cause a jarring full remount of the page shell instead of a smooth in-place version swap.
- Confirm the `key={generatedSrc}` fix from Phase 2 doesn't fight this — a version swap via `searchParams` is exactly the case that *should* replay the reveal animation (a genuinely new image is now showing), so this is the correct, intentional interaction between Phase 2 and Phase 3, not a conflict.
- The style-switch addition must not be selectable/visible anywhere except inside `CustomizationPanel` on the Results page — it should never appear as an option on the initial Upload page's style selector (that step remains simple, one style, per the original flow) — this keeps "pick a style" simple for first-time upload and "everything is customizable" true only once a design already exists to customize, which is the correct place for that complexity to live.
- Every new field (`color_preference`, `style_override`) must round-trip through the exact same `handleApply` → `onCustomize` → `POST /generate` → background task path already in place — no new endpoint, no new request shape beyond the two added fields on the existing `CustomizationOptions` schema.
