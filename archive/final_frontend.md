# final_frontend.md
### RoomCanvas — Frontend Implementation Specification
**Prepared for:** implementing coding AI (Claude Sonnet 4.6 in Antigravity IDE)
**Source of truth:** `finish_backend.md` + full backend code export (46 files, read in full)
**Scope note:** No existing frontend export was present in the uploaded file — only the backend architecture was included. This spec is therefore a **from-scratch build**, not a KEEP/MODIFY/DELETE audit. Every file below is NEW unless stated otherwise. Build exactly what's specified — no placeholders, no TODOs, no unfinished pages.

---

## 0. Ground Truth: The Real Backend Contract

This is the ONLY backend contract. Do not invent, guess, or "improve" endpoints — implement exactly this.

Base URL: `http://localhost:8000/api` (dev) — read from `VITE_API_BASE_URL` env var, fallback to this.
Static files served at `http://localhost:8000/static/...` — image paths returned by the API (e.g. `storage/uploads/xyz.jpg`) must be prefixed with the static origin, NOT the `/api` origin. Build a `resolveImageUrl(path)` helper (see §5.2).

CORS allows: `GET, POST, DELETE`. Headers allowed: `Content-Type, Authorization, X-Requested-With`.

### Endpoints

| Method | Path | Body | Returns | Notes |
|---|---|---|---|---|
| GET | `/api/health` | — | `{status, providers: {gemini: bool, replicate: bool}}` | Poll on app boot; show a banner if a provider is down. |
| GET | `/api/config` | — | `{max_upload_mb, allowed_types: string[]}` | Fetch once on boot, cache. Drives upload validation. |
| GET | `/api/styles` | — | `[{id, furniture[], palette[], budget_tag, reason_template}]` | Fetch once on boot, cache 1hr. Drives style picker. |
| GET | `/api/providers` | — | `{analysis: {active, configured}, generation: {active, configured}}` | Optional diagnostics only. |
| POST | `/api/analyze` | `multipart/form-data`: `image` (file), `style` (string, style id) | `AnalyzeResponse` (201) | Synchronous — awaits Gemini. Can take 5-20s. ALWAYS returns 201 even on AI failure (graceful fallback with `room_type: "Unknown"` etc — check for this and show a "couldn't fully analyze" notice, not an error page). Only throws 400 on invalid image. |
| POST | `/api/generate` | JSON: `{analysis_id: number}` | `GenerationOut` (201, `status: "pending"`) | Fire-and-poll. Returns immediately with pending row; image generation runs in background. Must poll `GET /api/generation/{id}` until `status` is `"completed"` or `"failed"`. |
| POST | `/api/refine` | JSON: `{generation_id: number, instruction: string}` | `GenerationOut` (201, `status: "pending"`, `parent_generation_id` set) | Same fire-and-poll pattern. `generation_id` must reference a generation whose `status === "completed"` or the backend 400s. |
| GET | `/api/generation/{id}` | — | `GenerationOut` | Canonical single-generation fetch — use this for polling, NOT `/history/{id}` (same data, this is the documented canonical path). |
| GET | `/api/history?limit=50` | — | `GenerationOut[]`, newest first | Powers History page. |
| GET | `/api/history/{id}` | — | `GenerationOut` | Legacy alias of `/generation/{id}` — do not use in new code, only documented for completeness. |
| POST | `/api/history/{id}/select/{variation_id}` | — | `GenerationOut` | Marks which image variation the user picked as "the" result for that generation. Call when user clicks "Save this version" on Results. |
| DELETE | `/api/history/{id}` | — | `{deleted: true}` | Deletes generation + variations + files. Confirm with a dialog first. |

### Full response shape — `GenerationOut` (this is what `/generate`, `/refine`, `/generation/{id}`, `/history` all return)

```typescript
interface Variation {
  id: number;
  generation_id: number;
  image_path: string;       // relative — resolve via resolveImageUrl()
  seed: number;
  created_at: string;       // ISO datetime
}

interface GenerationOut {
  id: number;
  original_image_path: string;          // relative — resolve via resolveImageUrl()
  room_type_detected: string | null;
  room_confidence: number | null;
  style: string;                        // style id, e.g. "scandinavian"
  redesign_prompt: string;              // the prompt used (initial) or the refine instruction (child)
  prompt_version: string | null;
  analysis_json: string | null;         // JSON-encoded AnalyzeResponse-shaped dict — JSON.parse() it
  parent_generation_id: number | null;  // set only on refinements
  provider: string | null;
  provider_version: string | null;
  model_used: string;
  model_version: string | null;
  status: "pending" | "analyzed" | "completed" | "failed" | "failed_analysis";
  error: string | null;
  processing_time_sec: number;
  selected_variation_id: number | null;
  created_at: string;
  variations: Variation[];              // empty while pending; length 1 once completed (backend always writes exactly 1 variation per generation — do NOT build multi-variation-carousel UI, there is only ever one image per generation row)
}
```

### `AnalyzeResponse` (POST /api/analyze return shape)

```typescript
interface AnalyzeResponse {
  analysis_id: number;               // pass this as analysis_id to POST /api/generate
  room_type: string;                 // "Unknown" on fallback
  furniture: { item: string; description: string; estimated_price_range: string }[];
  estimated_dimensions: { width_ft: number; length_ft: number; confidence: "low" | "medium" | "high" };
  layout_notes: string;
  color_palette: { name: string; hex: string }[];
  lighting_suggestions: string;
  estimated_budget_range: string;
  style_explanation: string;
  redesign_prompt: string;
}
```

### Style object (GET /api/styles item)

```typescript
interface StyleOption {
  id: string;                 // "modern_minimalist" | "scandinavian" | "industrial" | "bohemian" | "luxury_contemporary"
  furniture: string[];
  palette: string[];
  budget_tag: "Budget-Friendly" | "Mid-Range" | "Premium";
  reason_template: string;    // contains "{room_type}" placeholder — NOT for display as-is, informational only
}
```
There are exactly 5 styles, hardcoded on the backend. Do not assume more will appear, but do not hardcode them on the frontend either — always render from the fetched list so the UI stays correct if the backend adds a 6th.

### Critical flow facts the UI MUST respect

1. **Analyze is synchronous, Generate/Refine are async (poll-based).** Different loading UX for each: Analysis screen shows a determinate-feeling multi-step progress sequence timed to a realistic ~8-15s window (no fake percentages, per spec — use step labels, not a progress bar tied to fake math). Generate/Refine use actual polling against real status.
2. **Polling contract:** after POST `/generate` or `/refine`, immediately start polling `GET /api/generation/{id}` every 2s. Stop when `status === "completed"` (show result) or `status === "failed"` (show error + retry). Hard timeout at 90s of polling → show a timeout state with a "Keep waiting" / "Cancel" choice (the backend job may still complete late; don't strand the user, don't silently keep polling forever unattended).
3. **Analyze failure is NOT an error.** The backend catches Gemini failures and still returns 201 with a fallback skeleton (`room_type: "Unknown"`, empty arrays, generic prompt). Detect this by checking `room_type === "Unknown"` and show an inline "We couldn't fully analyze this room automatically — you can still generate a design, or adjust the style and try again" notice on the Analysis→Results transition. Do not treat it as a network error.
4. **Refine requires a completed parent.** Disable/hide refinement UI unless the current generation's `status === "completed"`.
5. **Only one image per generation.** `variations` will contain 0 or 1 items. Every "regenerate" or "refine" action creates a NEW generation row (POST again), it does not mutate the existing one. History therefore naturally accumulates a tree: original generation → refinement children (via `parent_generation_id`). Build History to show refinements nested/grouped under their parent, not as flat unrelated rows.
6. **`redesign_prompt` on a refinement row is the raw instruction the user typed** ("make the sofa blue"), not a full scene description — display it as a chip/quote, not as prose analysis.
7. **Image paths are relative POSIX paths from repo root** (e.g. `storage/generated/variant1.png`) — never assume a leading slash or absolute URL.

---

## 1. Design Direction

**Chosen direction: "Studio" — an editorial, architecture-portfolio-grade minimalism, warmed up for a domain about real homes rather than dev tooling.**

Rationale (researched against Linear, Notion, Airbnb, Arc, Apple, Stripe, Framer, Vercel, and current 2026 SaaS design-trend reporting, plus real interior-design software like Houzz Pro / Modsy):

- **Calm design over data density.** The dominant 2026 SaaS pattern — visible across Linear, Notion, and Calendly — is removing everything that doesn't serve the immediate task: generous whitespace used as a functional tool rather than decoration, and progressive disclosure (show the minimum needed for the next decision, reveal the rest on demand) rather than front-loading complexity. RoomCanvas has exactly one job per screen (upload a photo, review an analysis, compare two images, write a refinement) — this maps directly onto that pattern, not onto a dashboard-density aesthetic.
- **One color, owned deliberately.** Current-generation SaaS brands increasingly claim a single signature hue rather than a rainbow of semantic colors used decoratively (Linear owns purple, Raycast owns red-orange). RoomCanvas owns **clay/terracotta** — the one color used with intent (primary actions, active states, brand moments), while the rest of the interface stays disciplined neutral. This is also the one choice that visually separates RoomCanvas from the sea of indigo/violet "AI product" templates the brief explicitly wants to avoid.
- **Image-first, not chrome-first.** Interior design is a visual domain — the UI's job is to get out of the way of photography. This rules out glassmorphism, gradients, or "AI demo" clichés (glowing orbs, neon, purple-to-blue blobs) which read as generic AI-product aesthetic, exactly what the brief prohibits.
- **Personality without noise.** Even restrained 2026 products increasingly put character into low-stakes moments — empty states, success confirmations — rather than the chrome itself (Notion's empty states, Slack's playful notifications). RoomCanvas does this narrowly: warm, specific copy in empty/success states (§14), zero personality anywhere in the working interface (uploading, analyzing, comparing) where clarity matters more than delight.
- **A command palette is now a baseline expectation, not a power-user luxury**, once a product crosses roughly 10 discoverable actions (Linear's Cmd+K is the reference implementation). RoomCanvas crosses that line once you count New Design, Upload, History, Search History, View Latest Design, and per-generation actions — so a lightweight command palette is included (§9.6) as a genuine usability win for returning users, not a gimmick.
- Airbnb and Houzz prove image-forward layouts with generous whitespace and soft, warm neutrals (not stark black/white) feel human and "real estate/interior" rather than "SaaS dashboard."
- Apple/Framer inform the motion language: fast (120–320ms), purposeful, physically-plausible easing, never decorative.

**Palette:** warm neutral base (off-white/warm charcoal, not pure #FFF/#000) + one owned accent (terracotta-adjacent clay, echoing interior-design mood boards, deliberately not tech-blue/violet). No gradients except a single, extremely subtle radial vignette permitted only on the Landing hero background.

**Typography:** one grotesk sans for UI (Inter), one refined serif for hero/marketing headlines only (Instrument Serif or similar) to differentiate "brand moments" from "product UI" the way Airbnb/premium studios do. Product screens (upload, analysis, results, history) use sans exclusively — serif is landing-page only. Headline sizes on Landing should be genuinely confident (`--text-5xl`/64px+) — 2026 marketing-page convention has moved toward larger, more assertive display type than a few years ago; product-screen type stays restrained (`--text-base`–`--text-2xl`) since that's a workspace, not a pitch.

**No dark mode requirement was specified — build light theme only, but architect color tokens as CSS variables so dark mode is a pure token swap later (do not hardcode hex anywhere outside tokens.css).** Light-first is also a deliberate differentiator here, not a gap: nearly every referenced 2026 SaaS benchmark (Linear, Vercel, Stripe's app shell) defaults to dark, technical-audience chrome — RoomCanvas's light, warm, editorial register is what signals "this is for your home," not "this is a dev tool."

---

## 2. Tech Stack

- **React 18 + TypeScript + Vite** — fast HMR, no framework lock-in Antigravity/Gemini needs to fight.
- **React Router v6.4+** (data router / `createBrowserRouter`) — for the linear + branching flow described in §7.
- **TanStack Query v5** — owns ALL server state (analyze/generate/refine/history/config/styles/health). This is the single biggest architecture decision: it gives us polling (`refetchInterval`), caching, retry, and mutation state (loading/error/success) for free, which directly satisfies "no unnecessary global state" and "handle loading/timeouts/network errors/success" without hand-rolled reducers.
- **Zustand** — owns only true client-only UI state that must persist across route changes within a session: the in-progress upload (file + preview before it's submitted), the currently-active generation id being viewed, and refinement-panel draft text. Nothing server-derived ever lives in Zustand — if TanStack Query can own it, it owns it. This directly satisfies §14 "avoid prop drilling, avoid duplicate state."
- **Tailwind CSS v3** — utility classes generated from the design tokens in §4, not ad hoc values.
- **Framer Motion** — page transitions, comparison slider drag, stepper animations, micro-interactions.
- **react-dropzone** — upload drag & drop, keyboard-accessible file picking.
- **zod** — runtime validation of API responses at the query layer boundary (cheap insurance against backend drift; parse-don't-trust).
- **react-hot-toast** (or equivalent) — non-blocking success/error notifications for background completions (e.g. "Your refined design is ready" while user has navigated to History).
- **cmdk** — the same headless command-menu primitive Linear/Vercel/Raycast-style products are built on; powers the `Cmd+K` palette in §9.6. Chosen specifically because it's headless (no imposed visual style to fight, unlike a pre-styled component kit) and it's the de facto standard, not a novel dependency to justify.

Do not add: Redux, MobX, styled-components/Emotion (Tailwind covers styling), Next.js (no SSR need — this is a client SPA talking to a separate FastAPI backend), GraphQL client (backend is REST).

---

## 3. Project Structure

```
frontend/
├── index.html
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── .env.example                  # VITE_API_BASE_URL=http://localhost:8000
├── src/
│   ├── main.tsx
│   ├── App.tsx                   # router provider + QueryClientProvider + Toaster mount
│   ├── styles/
│   │   ├── tokens.css            # CSS custom properties — §4
│   │   └── globals.css           # Tailwind directives + base resets
│   ├── router/
│   │   └── routes.tsx            # createBrowserRouter tree — §7
│   ├── api/
│   │   ├── client.ts             # fetch wrapper, resolveImageUrl — §5.1/5.2
│   │   ├── types.ts              # all TS interfaces from §0
│   │   ├── schemas.ts            # zod schemas mirroring types.ts
│   │   └── queries.ts            # all useQuery/useMutation hooks — §5.3
│   ├── store/
│   │   └── uiStore.ts            # Zustand — §6
│   ├── hooks/
│   │   ├── usePollGeneration.ts  # polling logic — §5.4
│   │   ├── useMediaQuery.ts      # breakpoint hook for responsive JS decisions
│   │   └── useCommandPalette.ts  # Cmd+K open state + registered actions — §9.6
│   ├── components/
│   │   ├── primitives/           # Button, Input, Select, Chip, Badge, Card, Dialog, Drawer, Tooltip, Skeleton — full code in §4.5
│   │   ├── layout/                # AppShell, TopNav, Footer, PageContainer
│   │   ├── command/                # CommandPalette — §9.6
│   │   ├── upload/                 # Dropzone, ImagePreview, UploadProgress
│   │   ├── analysis/               # AnalysisStepper
│   │   ├── results/                 # CompareSlider, RecommendationPanel, FurnitureList, PaletteSwatches, DimensionCard, BudgetCard
│   │   ├── refine/                    # RefinementPanel, SuggestionChips
│   │   └── history/                    # HistoryCard, HistoryTree, EmptyHistory
│   ├── pages/
│   │   ├── LandingPage.tsx
│   │   ├── UploadPage.tsx
│   │   ├── AnalysisPage.tsx
│   │   ├── ResultsPage.tsx
│   │   ├── HistoryPage.tsx
│   │   └── NotFoundPage.tsx
│   └── lib/
│       └── utils.ts              # cn() classnames helper, formatters
```

---

## 4. Design System

### 4.1 Tokens — `src/styles/tokens.css`

```css
:root {
  /* ── Color: neutrals (warm, not pure black/white) ── */
  --color-bg: #FAF8F5;
  --color-surface: #FFFFFF;
  --color-surface-raised: #FFFFFF;
  --color-border: #E8E3DB;
  --color-border-strong: #D8D1C4;
  --color-text-primary: #262220;
  --color-text-secondary: #6B645C;
  --color-text-tertiary: #9C948A;
  --color-text-inverse: #FAF8F5;

  /* ── Color: accent (clay/terracotta, muted — not saturated) ── */
  --color-accent: #B5573B;
  --color-accent-hover: #9E4A31;
  --color-accent-subtle: #F3E3DC;
  --color-accent-text-on: #FFFFFF;

  /* ── Color: semantic ── */
  --color-success: #3F7D58;
  --color-success-subtle: #E4F0E8;
  --color-warning: #A9791E;
  --color-warning-subtle: #FAF0DA;
  --color-danger: #B23A3A;
  --color-danger-subtle: #F7E4E2;
  --color-info: #3B6EA5;
  --color-info-subtle: #E2ECF5;

  /* ── Spacing scale (8px base grid, with a 4px half-step) ── */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 24px;
  --space-6: 32px;
  --space-7: 48px;
  --space-8: 64px;
  --space-9: 96px;
  --space-10: 128px;

  /* ── Radius scale ── */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;
  --radius-xl: 24px;
  --radius-full: 999px;

  /* ── Typography ── */
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-serif: 'Instrument Serif', Georgia, serif;

  --text-xs: 12px;
  --text-sm: 14px;
  --text-base: 16px;
  --text-lg: 18px;
  --text-xl: 22px;
  --text-2xl: 28px;
  --text-3xl: 36px;
  --text-4xl: 48px;
  --text-5xl: 64px;

  --leading-tight: 1.2;
  --leading-normal: 1.5;
  --leading-relaxed: 1.7;

  /* ── Shadow / elevation ── */
  --shadow-xs: 0 1px 2px rgba(38, 34, 32, 0.04);
  --shadow-sm: 0 2px 8px rgba(38, 34, 32, 0.06);
  --shadow-md: 0 8px 24px rgba(38, 34, 32, 0.08);
  --shadow-lg: 0 16px 48px rgba(38, 34, 32, 0.12);
  --shadow-focus: 0 0 0 3px rgba(181, 87, 59, 0.35);

  /* ── Motion ── */
  --ease-standard: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-decelerate: cubic-bezier(0, 0, 0.2, 1);
  --ease-accelerate: cubic-bezier(0.4, 0, 1, 1);
  --duration-fast: 120ms;
  --duration-base: 200ms;
  --duration-slow: 320ms;

  /* ── Layout ── */
  --content-max-width: 1280px;
  --nav-height: 64px;
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

### 4.2 `tailwind.config.ts` — map tokens into Tailwind so utilities stay disciplined

```typescript
import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--color-bg)',
        surface: 'var(--color-surface)',
        border: { DEFAULT: 'var(--color-border)', strong: 'var(--color-border-strong)' },
        text: {
          primary: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          tertiary: 'var(--color-text-tertiary)',
          inverse: 'var(--color-text-inverse)',
        },
        accent: {
          DEFAULT: 'var(--color-accent)',
          hover: 'var(--color-accent-hover)',
          subtle: 'var(--color-accent-subtle)',
        },
        success: { DEFAULT: 'var(--color-success)', subtle: 'var(--color-success-subtle)' },
        warning: { DEFAULT: 'var(--color-warning)', subtle: 'var(--color-warning-subtle)' },
        danger: { DEFAULT: 'var(--color-danger)', subtle: 'var(--color-danger-subtle)' },
        info: { DEFAULT: 'var(--color-info)', subtle: 'var(--color-info-subtle)' },
      },
      fontFamily: {
        sans: ['var(--font-sans)'],
        serif: ['var(--font-serif)'],
      },
      borderRadius: {
        sm: 'var(--radius-sm)', md: 'var(--radius-md)',
        lg: 'var(--radius-lg)', xl: 'var(--radius-xl)', full: 'var(--radius-full)',
      },
      boxShadow: {
        xs: 'var(--shadow-xs)', sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)', lg: 'var(--shadow-lg)',
        focus: 'var(--shadow-focus)',
      },
      spacing: {
        1: 'var(--space-1)', 2: 'var(--space-2)', 3: 'var(--space-3)',
        4: 'var(--space-4)', 5: 'var(--space-5)', 6: 'var(--space-6)',
        7: 'var(--space-7)', 8: 'var(--space-8)', 9: 'var(--space-9)', 10: 'var(--space-10)',
      },
      maxWidth: { content: 'var(--content-max-width)' },
      transitionTimingFunction: {
        standard: 'var(--ease-standard)',
        decelerate: 'var(--ease-decelerate)',
        accelerate: 'var(--ease-accelerate)',
      },
      transitionDuration: {
        fast: '120ms', base: '200ms', slow: '320ms',
      },
      screens: {
        xs: '375px', sm: '640px', md: '768px', lg: '1024px', xl: '1280px', '2xl': '1536px',
      },
    },
  },
  plugins: [],
} satisfies Config;
```

### 4.3 `Button` — full implementation (`src/components/primitives/Button.tsx`)

The one primitive used more than any other in the app — specified as real, complete code rather than left to interpretation, since inconsistent buttons are the fastest way to make a "calm minimalist" UI look accidental instead of deliberate.

```tsx
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'destructive';
type Size = 'sm' | 'md' | 'lg' | 'icon';

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onDrag' | 'onDragStart' | 'onDragEnd'> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: React.ReactNode;
}

const variantClasses: Record<Variant, string> = {
  primary: 'bg-accent text-white hover:bg-accent-hover disabled:hover:bg-accent',
  secondary: 'bg-surface border border-border-strong text-text-primary hover:bg-bg disabled:hover:bg-surface',
  ghost: 'bg-transparent text-text-secondary hover:bg-black/[0.04] disabled:hover:bg-transparent',
  destructive: 'bg-transparent text-danger border border-danger/30 hover:bg-danger-subtle disabled:hover:bg-transparent',
};

const sizeClasses: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2',
  icon: 'h-10 w-10 p-0 justify-center rounded-full',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps & HTMLMotionProps<'button'>>(
  ({ variant = 'primary', size = 'md', loading, icon, disabled, className, children, ...props }, ref) => {
    const isDisabled = disabled || loading;
    return (
      <motion.button
        ref={ref}
        type="button"
        whileTap={isDisabled ? undefined : { scale: 0.98 }}
        transition={{ duration: 0.12, ease: [0.4, 0, 0.2, 1] }}
        aria-disabled={isDisabled}
        disabled={isDisabled}
        className={cn(
          'inline-flex items-center rounded-md font-medium transition-colors duration-100',
          'focus-visible:outline-none focus-visible:shadow-focus',
          'disabled:opacity-40 disabled:cursor-not-allowed',
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          icon
        )}
        {size !== 'icon' && children}
      </motion.button>
    );
  }
);
Button.displayName = 'Button';
```

`src/lib/utils.ts` companion (referenced above and throughout every component):

```ts
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function titleCase(id: string): string {
  return id.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
```

(Add `clsx` and `tailwind-merge` to §2's dependency list — both are near-zero-weight and this is the accepted standard pattern for Tailwind projects, avoiding the alternative of hand-rolled conditional class string concatenation scattered across every component.)

### 4.3.1 `Card` — full implementation (`src/components/primitives/Card.tsx`)

The second most-reused primitive (style picker, history rows, recommendation panels all build on it):

```tsx
import { type HTMLAttributes, forwardRef } from 'react';
import { cn } from '../../lib/utils';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
  selected?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ interactive, selected, className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-lg border bg-surface p-5 shadow-xs transition-all duration-200',
        selected ? 'border-accent ring-1 ring-accent' : 'border-border',
        interactive && 'cursor-pointer hover:shadow-md hover:-translate-y-0.5 focus-visible:outline-none focus-visible:shadow-focus',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
);
Card.displayName = 'Card';
```

### 4.4 Button hierarchy (usage guide — which `variant`/`size` to reach for)

- **Primary** — used once per screen for the single most important action (Generate, Upload & Analyze, Save Design).
- **Secondary** — parallel/alternative actions (Regenerate, Try Another Style).
- **Ghost** — tertiary/navigational actions (Back, Cancel, nav links).
- **Destructive** — delete actions only, always behind a confirm `Dialog`.
- **`size="icon"`** — 40×40px hit target minimum (bump the touch-breakpoint hit area to 44×44 via a wrapping `min-h-11 min-w-11` on `<768px` where the visual icon stays 40×40 but the tap target grows), `rounded-full`.

### 4.5 Core states (apply uniformly across every interactive component)

| State | Treatment |
|---|---|
| Hover | Background/border shift only, no layout shift, `duration-fast` |
| Focus (keyboard) | `shadow-focus` ring, never suppressed |
| Active/pressed | `scale-[0.98]` via Framer Motion `whileTap`, `duration-fast` |
| Disabled | 40% opacity, no hover/active response, `aria-disabled="true"` |
| Loading | Replace label with inline spinner (16px) + keep button width fixed (prevents layout jump) — never show a full-button skeleton for buttons |
| Empty | Centered icon (from Lucide, 48px, `text-text-tertiary`) + one-line message + one primary CTA where applicable |
| Error | `border-danger`, `bg-danger-subtle` for inline field errors; full-panel errors get an icon + message + Retry button |
| Success | Brief `bg-success-subtle` flash (400ms) on the affected element, or a toast for background-completed actions |
| Skeleton | Use for anything server-fetched with unknown timing: pulsing `bg-border` blocks matching the real content's exact dimensions, never generic full-page spinners for list/grid content |

Icon set: **Lucide React** exclusively (matches the calm, line-based aesthetic; avoid filled/emoji icons).

---

## 5. API Layer

### 5.1 `src/api/client.ts`

```typescript
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';
const API_PREFIX = `${API_BASE}/api`;

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = `Request failed with status ${res.status}`;
    try {
      const body = await res.json();
      if (body?.detail) detail = body.detail;
    } catch {
      /* body wasn't JSON — keep default message */
    }
    throw new ApiError(detail, res.status);
  }
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string): Promise<T> =>
    fetch(`${API_PREFIX}${path}`, { method: 'GET' }).then((r) => handleResponse<T>(r)),

  post: <T>(path: string, body: unknown): Promise<T> =>
    fetch(`${API_PREFIX}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then((r) => handleResponse<T>(r)),

  postForm: <T>(path: string, formData: FormData): Promise<T> =>
    fetch(`${API_PREFIX}${path}`, { method: 'POST', body: formData }).then((r) => handleResponse<T>(r)),

  del: <T>(path: string): Promise<T> =>
    fetch(`${API_PREFIX}${path}`, { method: 'DELETE' }).then((r) => handleResponse<T>(r)),
};
```

### 5.2 `resolveImageUrl` — image paths are relative, static origin differs from `/api`

```typescript
// src/api/client.ts (continued)
export function resolveImageUrl(relativePath: string | null | undefined): string {
  if (!relativePath) return '';
  // Backend mounts /static over the parent of UPLOAD_DIR/GENERATED_DIR (i.e. "storage/").
  // Stored paths look like "storage/uploads/xyz.jpg" or "storage/generated/variant1.png".
  // Strip a leading "storage/" if present, since /static already points at that root.
  const cleaned = relativePath.replace(/^storage[\\/]/, '').replace(/\\/g, '/');
  return `${API_BASE}/static/${cleaned}`;
}
```

### 5.3 `src/api/types.ts`

```typescript
export interface Variation {
  id: number;
  generation_id: number;
  image_path: string;
  seed: number;
  created_at: string;
}

export type GenerationStatus = 'pending' | 'analyzed' | 'completed' | 'failed' | 'failed_analysis';

export interface GenerationOut {
  id: number;
  original_image_path: string;
  room_type_detected: string | null;
  room_confidence: number | null;
  style: string;
  redesign_prompt: string;
  prompt_version: string | null;
  analysis_json: string | null;
  parent_generation_id: number | null;
  provider: string | null;
  provider_version: string | null;
  model_used: string;
  model_version: string | null;
  status: GenerationStatus;
  error: string | null;
  processing_time_sec: number;
  selected_variation_id: number | null;
  created_at: string;
  variations: Variation[];
}

export interface FurnitureItem {
  item: string;
  description: string;
  estimated_price_range: string;
}

export interface ColorSwatch {
  name: string;
  hex: string;
}

export interface AnalyzeResponse {
  analysis_id: number;
  room_type: string;
  furniture: FurnitureItem[];
  estimated_dimensions: { width_ft: number; length_ft: number; confidence: 'low' | 'medium' | 'high' };
  layout_notes: string;
  color_palette: ColorSwatch[];
  lighting_suggestions: string;
  estimated_budget_range: string;
  style_explanation: string;
  redesign_prompt: string;
}

export interface StyleOption {
  id: string;
  furniture: string[];
  palette: string[];
  budget_tag: 'Budget-Friendly' | 'Mid-Range' | 'Premium';
  reason_template: string;
}

export interface AppConfig {
  max_upload_mb: number;
  allowed_types: string[];
}

export interface HealthStatus {
  status: string;
  providers: { gemini: boolean; replicate: boolean };
}
```

### 5.4 `src/api/queries.ts` — every hook a page needs, no more, no less

```typescript
import { useQuery, useMutation, useQueryClient, UseQueryResult } from '@tanstack/react-query';
import { api } from './client';
import type { AnalyzeResponse, AppConfig, GenerationOut, HealthStatus, StyleOption } from './types';

// ── Boot-time static data ──────────────────────────────────────────────
export function useConfig() {
  return useQuery({ queryKey: ['config'], queryFn: () => api.get<AppConfig>('/config'), staleTime: Infinity });
}

export function useStyles() {
  return useQuery({ queryKey: ['styles'], queryFn: () => api.get<StyleOption[]>('/styles'), staleTime: 60 * 60 * 1000 });
}

export function useHealth() {
  return useQuery({
    queryKey: ['health'],
    queryFn: () => api.get<HealthStatus>('/health'),
    refetchInterval: 30_000,
    retry: false,
  });
}

// ── Analyze (synchronous mutation) ─────────────────────────────────────
export function useAnalyzeRoom() {
  return useMutation({
    mutationFn: ({ image, style }: { image: File; style: string }) => {
      const formData = new FormData();
      formData.append('image', image);
      formData.append('style', style);
      return api.postForm<AnalyzeResponse>('/analyze', formData);
    },
  });
}

// ── Generate (async — returns pending row immediately) ─────────────────
export function useGenerateDesign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (analysis_id: number) => api.post<GenerationOut>('/generate', { analysis_id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['history'] }),
  });
}

// ── Refine (async — returns pending child row immediately) ─────────────
export function useRefineDesign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ generation_id, instruction }: { generation_id: number; instruction: string }) =>
      api.post<GenerationOut>('/refine', { generation_id, instruction }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['history'] }),
  });
}

// ── Single generation fetch — used directly AND by the polling hook ────
export function useGeneration(id: number | null, opts?: { poll?: boolean }): UseQueryResult<GenerationOut> {
  return useQuery({
    queryKey: ['generation', id],
    queryFn: () => api.get<GenerationOut>(`/generation/${id}`),
    enabled: id !== null,
    refetchInterval: (query) => {
      if (!opts?.poll) return false;
      const status = query.state.data?.status;
      if (status === 'completed' || status === 'failed') return false;
      return 2000;
    },
  });
}

// ── History ──────────────────────────────────────────────────────────
export function useHistory(limit = 50) {
  return useQuery({ queryKey: ['history', limit], queryFn: () => api.get<GenerationOut[]>(`/history?limit=${limit}`) });
}

export function useSelectVariation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ generationId, variationId }: { generationId: number; variationId: number }) =>
      api.post<GenerationOut>(`/history/${generationId}/select/${variationId}`, {}),
    onSuccess: (data) => {
      qc.setQueryData(['generation', data.id], data);
      qc.invalidateQueries({ queryKey: ['history'] });
    },
  });
}

export function useDeleteGeneration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.del<{ deleted: boolean }>(`/history/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['history'] }),
  });
}
```

### 5.5 `src/hooks/usePollGeneration.ts` — the timeout-safe wrapper every async screen uses

```typescript
import { useEffect, useRef, useState } from 'react';
import { useGeneration } from '../api/queries';

const TIMEOUT_MS = 90_000;

export function usePollGeneration(id: number | null) {
  const query = useGeneration(id, { poll: true });
  const [timedOut, setTimedOut] = useState(false);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (id === null) return;
    startRef.current = Date.now();
    setTimedOut(false);
  }, [id]);

  useEffect(() => {
    if (!query.data || query.data.status === 'completed' || query.data.status === 'failed') return;
    const interval = setInterval(() => {
      if (startRef.current && Date.now() - startRef.current > TIMEOUT_MS) setTimedOut(true);
    }, 1000);
    return () => clearInterval(interval);
  }, [query.data]);

  return {
    generation: query.data,
    isLoading: query.isLoading,
    isPending: query.data?.status === 'pending',
    isCompleted: query.data?.status === 'completed',
    isFailed: query.data?.status === 'failed',
    timedOut,
    resetTimeout: () => { startRef.current = Date.now(); setTimedOut(false); },
  };
}
```

---

## 6. State Management — `src/store/uiStore.ts`

**Rule: if it comes from the server, it lives in TanStack Query, never in Zustand.** Zustand holds exactly three things — nothing else belongs here:

```typescript
import { create } from 'zustand';

interface UIState {
  // Upload flow (pre-submission, client-only)
  pendingFile: File | null;
  pendingPreviewUrl: string | null;
  selectedStyleId: string | null;
  setPendingUpload: (file: File | null, previewUrl: string | null) => void;
  setSelectedStyle: (styleId: string | null) => void;
  clearUpload: () => void;

  // The generation currently being viewed on the Results page
  activeGenerationId: number | null;
  setActiveGenerationId: (id: number | null) => void;

  // Refinement panel draft text (survives if user navigates away and back within session)
  refinementDraft: string;
  setRefinementDraft: (text: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  pendingFile: null,
  pendingPreviewUrl: null,
  selectedStyleId: null,
  setPendingUpload: (file, previewUrl) => set({ pendingFile: file, pendingPreviewUrl: previewUrl }),
  setSelectedStyle: (styleId) => set({ selectedStyleId: styleId }),
  clearUpload: () => set({ pendingFile: null, pendingPreviewUrl: null, selectedStyleId: null }),

  activeGenerationId: null,
  setActiveGenerationId: (id) => set({ activeGenerationId: id }),

  refinementDraft: '',
  setRefinementDraft: (text) => set({ refinementDraft: text }),
}));
```

Why this split satisfies §14 exactly: no analysis/generation/history data is ever duplicated into Zustand — every page reads it fresh (with caching) from TanStack Query via `useGeneration(id)`, so there is exactly one source of truth per server entity, and no manual sync code is ever needed between "the store" and "the API."

---

## 7. Routing & Navigation Map

```
/                        LandingPage      — public, no state required
/upload                  UploadPage       — start of the core flow
/analysis/:analysisId    AnalysisPage     — shown immediately after POST /analyze resolves;
                                             analysisId is the AnalyzeResponse.analysis_id.
                                             This page's job: trigger POST /generate, then
                                             redirect to /results/:id once the row exists.
/results/:generationId   ResultsPage      — the workspace: image compare, recommendations,
                                             refine panel. generationId is a GenerationOut.id
                                             (works for both original generations AND refinements).
/history                 HistoryPage      — full history, search/sort/delete
*                        NotFoundPage     — real 404, with a "Back to RoomCanvas" primary CTA
```

Navigation rules (Step 5 compliance):
- Every page has a persistent top nav: logo (→ `/`), "New Design" (→ `/upload`), "History" (→ `/history`).
- `/analysis/:id` is a **transient, non-bookmarkable-feeling** screen — no back button in the nav during analysis (prevent users from navigating away mid-analysis and losing the row; the row is already saved server-side by the time this page renders, so refreshing is actually safe, but back-navigation during the brief POST /generate call should show a confirm dialog: "Leave before your design finishes? You can find it in History.").
- `/results/:id` has three exits, all real: "Generate Again" (re-POST `/generate` with the same `analysis_id` — only shown on original, non-refined generations, since `analysis_id` = the original generation's own id from Results' perspective... see §8.4 for exact wiring), "Refine" (opens inline panel, stays on page, POSTs `/refine`, then this same page re-points `activeGenerationId` at the new child id), "Back to History".
- No orphan pages: every component reachable from the flow diagram in the brief (Landing → Upload → Analysis → Results → Refine → History → Download/Share) is a real route or a real in-page state, not a stub.
- 404 page is real (not a blank screen) and accessible via any invalid URL — required per "no dead ends."

---

## 8. Page Specifications

### 8.1 Landing Page (`/`)

Sections, in order (per Step 7): **Hero → Features (3-up) → How It Works (4-step) → Examples (before/after gallery) → FAQ (accordion) → CTA → Footer.**

- **Hero:** Serif headline (e.g. "See your room, redesigned" — do not literally reuse a competitor's tagline), one-sentence sans subhead, single primary CTA button "Start Your Design" → `/upload`. Background: one subtle radial gradient permitted here only (`--color-accent-subtle` at 8% opacity, radial from top-right, no animation). A static before/after image pair (real Lucide-free photography placeholders are NOT to be literal `<img src="placeholder.jpg">` — since no real photography exists yet, use a tasteful abstract line-art SVG room illustration built with plain shapes, not a broken image tag; do not ship a broken `<img>`).
- **Features (3-up grid, `md:grid-cols-3`):** "AI Room Analysis," "Instant Redesign," "Iterative Refinement" — icon (Lucide) + 1-line title + 1-sentence description each. No fluff copy — concrete, e.g. "Upload a photo and get real furniture, dimension, and budget recommendations in seconds," not "Unlock the power of AI."
- **How It Works (4 steps, numbered, horizontal on desktop / vertical stack on mobile):** Upload → Analyze → Generate → Refine. Each step links its label to the corresponding flow entry point where sensible (step 1 "Upload" links to `/upload`).
- **Examples:** static CompareSlider components (reuse the §9.3 component) showing 2–3 example before/afters — but since there is no seed content, wire this section to pull the 3 most recent COMPLETED entries from `GET /api/history?limit=3` if any exist server-side; if history is empty, hide the Examples section entirely rather than showing fake/placeholder images (no fake buttons/fake content — an empty state here means "don't render the section," not "render broken images").
- **FAQ:** accordion, 4-6 real questions (upload formats, how long generation takes, is my data saved, can I refine multiple times) — keyboard accessible (`<button aria-expanded>` per item, not `<div onClick>`).
- **CTA band:** repeat of primary CTA before footer.
- **Footer:** logo, nav links (Upload, History), no fake social icons unless they link somewhere real — omit social icons entirely rather than adding dead links.

### 8.2 Upload Page (`/upload`)

Layout: centered single-column, max-width `640px`, generous vertical rhythm.

1. **Style selector first** (chip/card grid rendered from `useStyles()`, one selectable at a time, `role="radiogroup"`) — user picks style before or after uploading, either order valid, but Generate/Analyze button stays disabled until BOTH an image and a style are chosen. Each style card shows: id formatted as Title Case, budget_tag as a small `Badge`, and 2-3 of its `palette` colors as small swatches (purely decorative preview, not a promise of exact output).
2. **Dropzone** (`react-dropzone`, wired to `useConfig()` for `allowed_types`/`max_upload_mb`):
   - States: idle (dashed border, icon, "Drag & drop or click to browse," camera-capture button on touch devices via `capture="environment"` input attribute), drag-active (accent border + subtle scale), uploaded (image preview fills the zone, with a small "Replace" ghost button and a "Remove" icon button overlaid top-right), invalid (red border + inline error text: wrong format / too large, using the exact `max_upload_mb` and `allowed_types` from config — never a hardcoded "10MB").
   - Validation happens client-side BEFORE calling `/analyze` (fail fast) — check `file.type` against `allowed_types` and `file.size` against `max_upload_mb * 1024 * 1024`.
   - On valid drop: `setPendingUpload(file, URL.createObjectURL(file))` in the store; revoke the previous object URL on replace/unmount to avoid leaks.
3. **Primary CTA:** "Analyze My Room" — disabled until `pendingFile && selectedStyleId`. On click: call `useAnalyzeRoom().mutate({ image, style })`. Button enters loading state (spinner, "Analyzing…" — this specific button covers only the network round-trip; the real staged progress UI happens on the next page). On success, `navigate(`/analysis/${data.analysis_id}`)` and pass the full `AnalyzeResponse` via router state (`navigate(path, { state: { analysis: data } })`) so AnalysisPage doesn't need a redundant fetch — POST /analyze has no GET equivalent for re-fetching analysis by id, so this router-state handoff is required, not optional. Guard AnalysisPage for the case where `state` is missing (direct URL visit / refresh) — see §8.3.

### 8.3 Analysis Page (`/analysis/:analysisId`)

This page has two jobs in sequence: (a) show a tasteful staged-progress experience while (b) it actually calls `POST /api/generate` in the background and waits for the row to exist.

- Read `AnalyzeResponse` from `location.state.analysis`. **If missing** (direct link/refresh — analysis has no GET-by-id endpoint), show a friendly redirect state: "This analysis session has expired — let's start again," with a CTA back to `/upload`. Do not attempt to fabricate data.
- **Staged progress UI** (Step 9 compliance — no fake percentages): a vertical or horizontal stepper with these labels, auto-advancing on a fixed cadence tuned to *feel* right (~1.5–2.5s per step, NOT tied to real progress since there is none to measure until the POST resolves):
  1. "Analyzing room…" (shown immediately)
  2. "Estimating layout…"
  3. "Finding furniture…"
  4. "Calculating dimensions…"
  5. "Creating recommendations…"
  6. "Preparing your design…"
  - Each step: a Lucide icon that morphs (via Framer Motion `AnimatePresence`) to a checkmark once "passed." Current step gets a subtle pulsing dot, not a percentage.
  - Underneath: 2-3 real facts pulled from the actual `AnalyzeResponse` already in hand (room_type, furniture count, budget range) fade in progressively alongside steps 3-5 — this makes the wait feel informative rather than fake, since the data genuinely already exists (analysis already completed synchronously before this page even rendered).
- **In parallel**, on mount, call `useGenerateDesign().mutate(analysis.analysis_id)`. This returns a `GenerationOut` with `status: "pending"` almost immediately — do NOT navigate yet. Feed its `id` into `usePollGeneration(id)`.
- Once the stepper has visually completed its full sequence AND `usePollGeneration` reports `isCompleted`, navigate to `/results/:id`. If the stepper finishes before polling completes, keep the last step ("Preparing your design…") gently looping/breathing until polling catches up — never show a dead end or blank frame.
- If `useGenerateDesign` mutation itself errors (network failure on the POST, not a background failure), or if `usePollGeneration` reports `isFailed`, show a full-panel error: icon, "We hit a snag generating your design," the actual `generation.error` message if present, and two buttons: "Try Again" (re-POST) and "Back to Upload."
- If `timedOut` from the polling hook fires, show: "This is taking longer than usual" with "Keep Waiting" (calls `resetTimeout()`) and "Go to History" (the row will complete server-side regardless; History will show it once done — this is the correct honest behavior, not a fabricated cancel).
- If `analysis.room_type === "Unknown"` (fallback path, §0.3), show a small dismissible inline notice above the stepper: "We couldn't fully analyze this room automatically, but we'll still generate your design" — informational tone, not alarming.

### 8.4 Results Page (`/results/:generationId`) — the most important page

Fetch via `useGeneration(generationId, { poll: shouldPoll })` where `shouldPoll` is true only if status is `pending` on mount (covers the case where a user navigates here directly on a still-processing refinement, e.g. from History). Set `activeGenerationId` in the store on mount for the refine panel to reference.

**Layout: two-column workspace on `lg+` (60/40 split), single-column stack on mobile.**

**Left column — the image workspace:**
- **CompareSlider** (§9.3) showing `original_image_path` vs `variations[0].image_path`. If `variations` is empty (still pending — only reachable via direct-link edge case above), show a skeleton matching the slider's exact aspect ratio with the staged-progress micro-copy, not a blank box.
- Below the slider: a segmented control to toggle slider / side-by-side / generated-only view (pure client UI state, `useState` local to this component — does not need global state).
- Action row directly under the image: **Download** (real `<a download>` on `resolveImageUrl(variations[0].image_path)`, or fetch-as-blob if cross-origin download attribute is unreliable — verify and use the blob approach for reliability), **Generate Again** (only rendered when `parent_generation_id === null`, i.e. this is an original, not a refinement — re-runs `useGenerateDesign` against... note: regenerating an ORIGINAL requires an `analysis_id`, which for an original generation IS this generation's own `id` per the backend's `prepare_generation` logic reading `repository.get_by_id(analysis_id)` against the `generations` table directly — so "Generate Again" on an original calls `useGenerateDesign().mutate(generation.id)` and then navigates to the resulting new generation's `/results/:id`; this creates a fresh sibling generation, it does not overwrite the current one, so keep the user's current view intact and toast "New version created" with a link), **Share** (Web Share API `navigator.share()` where available, falling back to "Copy Link" using `window.location.href` — never a fake share button with no handler).

**Right column — the workspace panel, tabs or stacked sections:**
1. **Summary header:** room_type_detected, style (Title Cased), a "Save this version" primary button that calls `useSelectVariation({ generationId, variationId: variations[0].id })` (disabled once already selected — check `selected_variation_id === variations[0].id`, show "Saved" with a checkmark instead).
2. **Recommendations** (parse `analysis_json` via `JSON.parse` when present — note: `analysis_json` is only populated on the ORIGINAL generation, refinements copy it forward from parent per `prepare_refinement`, so it is always available for display, good):
   - `FurnitureList` — each item: name, description, price range chip.
   - `DimensionCard` — width × length, with the `confidence` value shown as a small badge (low/medium/high mapped to warning/info/success colors).
   - `PaletteSwatches` — render each `{name, hex}` as a swatch + label, `aria-label` includes the hex for screen readers.
   - Lighting suggestions, layout notes — plain text blocks.
   - `BudgetCard` — `estimated_budget_range` as a large stat.
   - `style_explanation` — a short pull-quote style block.
   - If this generation is a refinement (`parent_generation_id !== null`), `analysis_json` reflects the ORIGINAL room's analysis, not this specific edit — label this section "From your original analysis" so it's not misread as re-analyzing the refined image.
3. **Refinement panel** — embed `RefinementPanel` (§9.5) inline here, always visible but its submit button disabled unless `status === 'completed'`.
4. **This design's history** — if `parent_generation_id` exists, show a small breadcrumb-like chip linking back to `/results/:parent_generation_id` ("Refined from original design →"). If this generation itself has been refined further, that's discoverable from History, not duplicated here.

### 8.5 History Page (`/history`)

- Fetch via `useHistory(50)`.
- **Toolbar:** search input (client-side filter on `room_type_detected` + `redesign_prompt` + `style`, debounced 250ms, `useState` local), sort select (Newest/Oldest — client-side sort on `created_at`, no backend sort param exists so don't fabricate one), matching Step 12.
- **Grouping:** group flat list into trees by `parent_generation_id` — render each root generation as a `HistoryCard`, with any refinements nested as a compact sub-row list beneath it (collapsed by default if >2, "Show N more refinements" expander). This directly reflects the real relational shape in §0's "critical flow facts" point 5.
- **HistoryCard:** thumbnail (`original_image_path`, or `variations[0].image_path` for the generated view — show generated if completed, else original with a "processing" badge), room_type_detected, style badge, relative timestamp (`created_at`), status badge (pending=info spinner icon, completed=none needed, failed=danger).
  - Actions per card: **View** (→ `/results/:id`), **Reuse Prompt** (only on refinement rows — pre-fills `refinementDraft` in the store and navigates to `/results/:parent_generation_id`, opening the refine panel focused), **Regenerate** (root rows only — same "Generate Again" semantics as §8.4), **Download**, **Delete** (opens a confirm `Dialog`, then `useDeleteGeneration().mutate(id)`).
- **Empty state:** a real illustrated moment, not a generic "no data" placeholder — a line-art SVG of an empty, sunlit room (built from plain shapes, consistent with the Landing hero treatment in §8.1, no stock imagery), headline "Your studio is empty — for now," one supporting line ("Every design you create will live here, ready to revisit and refine."), primary CTA "Start Your First Design" → `/upload`. This is the one place in the product where the copy is allowed a little warmth (per §1's "personality without noise" principle) — everywhere else in the working interface stays plainly functional. Checked via `data.length === 0` after loading resolves, never a permanently-visible placeholder.
- **Loading state:** 4-6 `HistoryCard` skeletons matching real card dimensions exactly.
- **Error state:** if `useHistory` errors (network down), full-panel retry block, not a blank page.

---

## 9. Key Component Specifications

### 9.1 `Dropzone` (upload/Dropzone.tsx) — behavior spec

Props: `onFileAccepted(file: File)`, `maxSizeMB: number`, `allowedTypes: string[]`, `previewUrl?: string`, `onRemove?()`, `onReplace?()`.
Uses `useDropzone` from `react-dropzone` with `accept` mapped from `allowedTypes`, `maxSize: maxSizeMB * 1024 * 1024`, `multiple: false`. Must be keyboard-operable (react-dropzone's root props already include `tabIndex`/`role="button"`/keydown handling — do not override them). Rejected files surface `fileRejections` reasons mapped to human copy ("File is too large — max {maxSizeMB}MB" / "Unsupported format — use JPEG, PNG, or WEBP"), not the raw react-dropzone error codes.

### 9.2 `AnalysisStepper` (analysis/AnalysisStepper.tsx) — behavior spec

Props: `steps: string[]`, `currentIndex: number`. Purely presentational + Framer Motion transitions; the auto-advance timer itself lives in `AnalysisPage` (a `useEffect` with `setInterval`, cleared on unmount/navigation — do not leak timers). Renders a vertical list on mobile, horizontal connected-line stepper on `md+`. Each item: icon (pending=empty circle outline, active=pulsing filled dot via `animate={{ scale: [1, 1.15, 1] }} transition={{ repeat: Infinity, duration: 1.2 }}`, done=Lucide `Check` in a filled accent circle).

### 9.3 `CompareSlider` (results/CompareSlider.tsx) — full behavior spec (complex enough to specify precisely)

Props: `beforeSrc: string`, `afterSrc: string`, `beforeLabel?: string`, `afterLabel?: string`.

- Structure: outer `relative` container with fixed aspect-ratio (`aspect-[4/3]` — real photos won't always match but this keeps layout stable; `object-cover` on both images). "After" image is full-width, absolutely positioned. "Before" image sits in a wrapper with `clip-path: inset(0 ${100 - position}% 0 0)` where `position` is 0-100 state.
- Draggable handle: a vertical line + circular grip in the middle, positioned at `left: ${position}%`. Drag via Framer Motion `useMotionValue` + `onPan`, OR a plain `<input type="range">` visually styled to overlay the image and drive `position` — **use the range input approach**, it gets keyboard accessibility (arrow keys), touch support, and screen-reader semantics for free, which a custom pointer-drag implementation would have to hand-roll to meet WCAG 2.2 — this is a case where the "boring" native element is the correct premium choice, not a compromise.
- `<input type="range" min={0} max={100} value={position} aria-label="Comparison slider: drag to reveal before and after" className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-10" />` layered over the visual handle, with the visual handle's position bound to the same `position` state (controlled, not the input's native rendering — input stays invisible/full-bleed for hit area, visual grip is a separate absolutely-positioned div that reads the same `position` value).
- Labels: small pill badges bottom-left ("Before") and bottom-right ("After"), fade based on which side is more visible.
- Respect `prefers-reduced-motion`: default position transitions use CSS, already covered globally in tokens.css.

### 9.4 `AppShell` / `TopNav` (layout/) — behavior spec

Sticky top nav, `h-[--nav-height]`, `bg-surface/90 backdrop-blur-sm border-b border-border` (this is the one permitted subtle blur — a functional sticky-nav legibility aid, not decorative glassmorphism, so it does not violate the "no glassmorphism" rule which targets decorative frosted-panel aesthetics). Contains: logo/wordmark (link to `/`), primary nav links (desktop: inline; mobile `<768px`: hamburger → `Drawer` primitive sliding from the right, `Escape` closes it, focus-trapped, `aria-modal="true"`). Include a **Skip to main content** link, visually hidden until focused, as the very first focusable element in `App.tsx` (Step 4 compliance) — `<a href="#main-content" className="sr-only focus:not-sr-only ...">`.

### 9.5 `RefinementPanel` (refine/RefinementPanel.tsx) — behavior spec

Props: `generationId: number`, `disabled: boolean` (true unless parent status is completed).
- A `textarea` (not a chat bubble list — Step 11 explicitly says this should feel like editing, not chatting) bound to `useUIStore().refinementDraft` / `setRefinementDraft`, with 4 example placeholder chips below it (from Step 11's exact examples: "Make the sofa blue," "Replace TV with projector," "Add indoor plants," "Make it brighter") — clicking a chip inserts/replaces the textarea content, doesn't append blindly if there's existing text (confirm-replace via a small inline "Replace draft?" micro-prompt if draft is non-empty and differs).
- Submit button ("Refine Design," primary) calls `useRefineDesign().mutate({ generation_id, instruction: draft })`. On success (`GenerationOut` with new `id`, `status: "pending"`), clear the draft, and navigate the Results page to the new id: `navigate(`/results/${data.id}`, { replace: false })` — `replace: false` so Back still returns to the pre-refinement view, preserving natural history nesting. ResultsPage picks up polling automatically since the new generation's status is `pending`.
- While the parent isn't completed, render the whole panel in a disabled visual state with a one-line explainer: "Refinement will be available once this design finishes generating."

### 9.6 `CommandPalette` (command/CommandPalette.tsx) — full implementation

The premium, returning-user affordance called out in §1: `Cmd+K` (or `Ctrl+K` on Windows/Linux) opens a searchable action list from anywhere in the app. Built on `cmdk` (headless), styled to the same tokens as everything else — this is not a separate visual system.

```tsx
import { useEffect, useState } from 'react';
import { Command } from 'cmdk';
import { useNavigate } from 'react-router-dom';
import { Plus, History, Home, Search } from 'lucide-react';
import { useHistory } from '../../api/queries';
import { resolveImageUrl } from '../../api/client';
import './CommandPalette.css'; // token-driven overrides for cmdk's unstyled defaults — bg-surface, radius-lg, shadow-lg, etc.

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { data: history } = useHistory(8); // recent items only — palette is for quick jumps, not full browsing

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const go = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="Command Menu"
      className="fixed inset-0 z-50"
      shouldFilter
    >
      <div className="fixed inset-0 bg-black/20" onClick={() => setOpen(false)} aria-hidden="true" />
      <div className="relative mx-auto mt-24 max-w-lg rounded-lg border border-border bg-surface shadow-lg overflow-hidden">
        <div className="flex items-center gap-2 border-b border-border px-4">
          <Search className="h-4 w-4 text-text-tertiary" aria-hidden="true" />
          <Command.Input
            placeholder="Search designs, or jump to a page…"
            className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-text-tertiary"
          />
        </div>
        <Command.List className="max-h-80 overflow-y-auto p-2">
          <Command.Empty className="py-6 text-center text-sm text-text-tertiary">
            No results found.
          </Command.Empty>

          <Command.Group heading="Navigate" className="text-xs text-text-tertiary px-2 py-1.5">
            <Command.Item onSelect={() => go('/')} className="flex items-center gap-2 rounded-md px-2 py-2 text-sm aria-selected:bg-accent-subtle cursor-pointer">
              <Home className="h-4 w-4" aria-hidden="true" /> Home
            </Command.Item>
            <Command.Item onSelect={() => go('/upload')} className="flex items-center gap-2 rounded-md px-2 py-2 text-sm aria-selected:bg-accent-subtle cursor-pointer">
              <Plus className="h-4 w-4" aria-hidden="true" /> New Design
            </Command.Item>
            <Command.Item onSelect={() => go('/history')} className="flex items-center gap-2 rounded-md px-2 py-2 text-sm aria-selected:bg-accent-subtle cursor-pointer">
              <History className="h-4 w-4" aria-hidden="true" /> History
            </Command.Item>
          </Command.Group>

          {history && history.length > 0 && (
            <Command.Group heading="Recent Designs" className="text-xs text-text-tertiary px-2 py-1.5">
              {history.map((g) => (
                <Command.Item
                  key={g.id}
                  onSelect={() => go(`/results/${g.id}`)}
                  className="flex items-center gap-3 rounded-md px-2 py-2 text-sm aria-selected:bg-accent-subtle cursor-pointer"
                >
                  <img
                    src={resolveImageUrl(g.variations[0]?.image_path ?? g.original_image_path)}
                    alt=""
                    className="h-8 w-8 rounded object-cover flex-shrink-0"
                  />
                  <span className="truncate">{g.room_type_detected ?? 'Untitled room'} — {g.style}</span>
                </Command.Item>
              ))}
            </Command.Group>
          )}
        </Command.List>
        <div className="border-t border-border px-4 py-2 text-xs text-text-tertiary flex justify-between">
          <span>↑↓ to navigate, ↵ to select</span>
          <span>esc to close</span>
        </div>
      </div>
    </Command.Dialog>
  );
}
```

Mount `<CommandPalette />` once, at the `AppShell` level (§9.4), so it's available from every route. Add a subtle `⌘K` hint badge next to the search affordance in `TopNav` on desktop widths (`hidden md:flex`) so the shortcut is discoverable without needing a tooltip or onboarding tour — this satisfies "every icon must have purpose" by making the shortcut visible where it's actually usable, and simply omitting the hint on touch breakpoints where the keyboard shortcut doesn't apply.

---

## 10. Responsive Design

Breakpoints to validate against exactly (per Step 3): 320, 375, 390, 414, 768, 1024, 1280, 1440, plus 4K (ensure `max-w-content` (1280px) caps line-length/layout growth so nothing stretches unreadably at 4K — center the capped content, let background/surface extend full-bleed).

Rules:
- No fixed pixel widths anywhere except icon/avatar sizes — all layout widths are `%`, `max-w-*`, `flex`, or `grid` with `fr`/`minmax`.
- Results page: two-column (`lg:grid-cols-[3fr_2fr]`) collapses to single column below `lg` (1024px) — image workspace always first in DOM order (source order = visual order, no `order-*` trickery that breaks tab order).
- Upload dropzone: min-height scales down on small screens (`h-64` mobile → `h-96` desktop) rather than reflowing awkwardly.
- Landing "How It Works" 4-step row: `grid-cols-1` below `md`, `grid-cols-4` at `md+`.
- Touch targets: minimum 44×44px on any breakpoint `<768px` (Step 4 + Step 3 overlap) — audit every icon button, chip, and the CompareSlider's range input specifically (range inputs need a taller invisible hit area on touch: `h-12` minimum on mobile even though the visual track is thinner).
- Foldables/landscape tablets: rely on the same fluid grid rules — no special-cased breakpoints needed since nothing here uses viewport-unit-locked absolute layouts. Verify no `100vw` usage that would cause horizontal scroll under a mobile browser's UI chrome (use `100%`/`100dvh` where full-bleed height matters, e.g. the mobile nav Drawer).
- No image cropping regressions: all photographic content (`original_image_path`, `variations[*].image_path`) uses `object-cover` inside fixed-aspect containers, never `object-fill`.

---

## 11. Accessibility (WCAG 2.2 AA)

- **Semantic HTML first:** `<nav>`, `<main id="main-content">`, `<header>`, `<footer>`, `<button>` for actions (never `<div onClick>`), `<a>` for navigation. Headings form a real outline (one `<h1>` per page, no skipped levels).
- **Keyboard:** every interactive element reachable and operable via Tab/Shift+Tab/Enter/Space/Arrow keys/Escape. Style picker uses `role="radiogroup"` + arrow-key navigation between options. Dialogs/Drawers trap focus and restore it to the trigger element on close.
- **Focus visibility:** `:focus-visible` ring (`shadow-focus` token) on every focusable element, never `outline: none` without a replacement.
- **ARIA:** `aria-live="polite"` region for async status changes (analysis stepper advancing, generation completing) so screen reader users get non-intrusive updates without a full page announcement storm. `aria-busy="true"` on containers while their content is loading. Form inputs have associated `<label>`s (visually hidden where the design calls for placeholder-only inputs — never label-less).
- **Contrast:** all text/background pairs in §4.1 meet 4.5:1 (body text) / 3:1 (large text ≥24px or ≥19px bold) — `--color-text-secondary` (#6B645C) on `--color-bg` (#FAF8F5) and `--color-accent` white-text combos must be verified against this at implementation time with a contrast checker; do not introduce a new token pairing without checking.
- **Touch targets:** 44×44px minimum, covered in §10.
- **Reduced motion:** global CSS already handles this (§4.1); additionally, the `AnalysisStepper`'s pulsing-dot animation and `CompareSlider` drag should degrade to instant/no-animation state changes under `prefers-reduced-motion`, checked via a `useMediaQuery('(prefers-reduced-motion: reduce)')` hook where JS-driven (Framer Motion) animations are used, since the CSS blanket rule doesn't reach inline JS-animated transforms.
- **Skip navigation:** covered in §9.4.
- **Tab order:** matches visual/reading order in all breakpoints — verify explicitly on the Results page where a naive two-column-to-stack collapse can silently break this if `order-*` utilities are misused.

---

## 12. Performance

- **Route-level code splitting:** every page in `router/routes.tsx` is `React.lazy()`-loaded with a route-level `Suspense` boundary showing a minimal branded loading bar (not a full spinner takeover) at the `AppShell` level.
- **Image handling:** all displayed room images go through `resolveImageUrl` and are rendered with explicit `width`/`height` or an `aspect-*` wrapper to prevent CLS. Use `loading="lazy"` on any image below the fold (History grid, Landing examples) and `loading="eager"` + `fetchpriority="high"` on the Results page's primary compare image (LCP element).
- **Memoization:** `HistoryCard` list wrapped with `React.memo`; the parsed `analysis_json` on Results is computed once via `useMemo` keyed on the generation id, not re-parsed every render.
- **Re-render control:** Zustand selectors are always narrow (`useUIStore((s) => s.refinementDraft)`, never destructuring the whole store) to avoid cross-component re-render storms.
- **Bundle size:** Framer Motion and react-dropzone are the two heaviest deps — both are justified (real drag/gesture requirements) and both tree-shake acceptably with named imports; no other animation/UI kitchen-sink libraries are added on top.
- **Virtualization:** not required at current scale (History caps at `limit=50` server-side) — explicitly do NOT add a virtualization library, it would be unnecessary complexity per the brief's own "avoid unnecessary complexity" instruction; revisit only if a future limit increase changes this.
- **Polling discipline:** `usePollGeneration` only polls while a generation is actually pending (see `refetchInterval` function in §5.4 returning `false` once settled) — no orphaned intervals running after completion or on unmounted components (React Query handles unmount cleanup automatically).

---

## 13. Motion & Micro-interactions

Principles (Step 17): fast (120-320ms per the duration tokens), purposeful (motion communicates a state change, never decorative), consistent easing (`--ease-standard` for most, `--ease-decelerate` for things entering/expanding, `--ease-accelerate` for things exiting/collapsing).

Concrete interactions:
- Buttons: `whileTap={{ scale: 0.98 }}`, background-color transitions on hover via CSS (`duration-fast`), not Framer (cheaper, no JS needed for simple color shifts).
- Cards (style picker, history): subtle `hover:shadow-md hover:-translate-y-0.5` via CSS transition, `duration-base`.
- Route transitions: simple fade+slight-y `AnimatePresence` wrapper at the router level (`opacity 0→1`, `y: 8px→0`, `duration-base`, `ease-decelerate`) — one consistent transition for every page, not bespoke per-page animations.
- Dropzone drag-active: border color + `scale-[1.01]` on the zone, `duration-fast`.
- Stepper: covered in §9.2.
- CompareSlider: handle drag is 1:1 with pointer (no easing/lag — direct manipulation must feel immediate); the initial reveal on page load animates `position` from 50→50 with a one-time settle bounce (`type: 'spring', stiffness: 300, damping: 24`) purely as an entrance flourish, single-shot, not looping.
- Download button: on click, a brief checkmark swap (icon morphs `Download` → `Check` for 1.2s via `AnimatePresence`) as tactile confirmation, no toast needed for this specific low-stakes action.
- Toast notifications (background refine/generate completing while user is elsewhere): slide-in from top-right (or bottom on mobile), auto-dismiss 5s, manually dismissible, `role="status"`.

---

## 14. Error, Loading, Empty, Success State Matrix

| Screen | Loading | Empty | Error | Success |
|---|---|---|---|---|
| Landing (Examples section) | skeleton compare-slider ×3 while `useHistory(3)` resolves | section hidden entirely | section hidden entirely (treat fetch error same as empty — non-critical section) | n/a |
| Upload | n/a (client-only until submit) | n/a | inline field errors (bad format/size); submit-button error if `/analyze` 400s, shown as a toast + re-enabled button | navigates away on success, no in-page success state needed |
| Analysis | full staged stepper (§8.3) | n/a | full-panel error block, Try Again / Back to Upload | auto-navigates to Results |
| Results | skeleton compare-slider + skeleton panel blocks matching real layout, if landed here mid-pending | n/a (a generation always has at least the original image) | full-panel error if `status === 'failed'`: icon, `generation.error` text, "Try Again" (re-POST refine/generate as applicable) | brief flash + "Saved" state on Save action; checkmark morph on Download |
| History | 4-6 skeleton cards | icon + message + "Start Your First Design" CTA | full-panel retry block | toast on successful delete ("Design deleted"), inline optimistic removal from grid |
| Refinement panel | submit button spinner during POST | n/a | inline error text under textarea if refine POST fails (400 from backend, e.g. parent not completed — shouldn't reach here due to disabled state, but handle defensively) | draft clears, page navigates to new generation |

---

## 15. Definition of Done

**Pages (6/6):** Landing, Upload, Analysis, Results, History, NotFound — all implemented, all reachable, no stubs.

**Core components:** Dropzone, AnalysisStepper, CompareSlider, RefinementPanel, HistoryCard (+ nested refinement rows), AppShell/TopNav, CommandPalette (Cmd+K, wired to real navigation + recent designs, not a static mock), Drawer (mobile nav), Dialog (delete confirm), all primitives in §3 (Button and Card per the full code in §4.3/§4.3.1, plus Input, Select, Chip, Badge, Tooltip, Skeleton built to the same token/variant pattern those two establish).

**API integration (8/8 endpoints wired, zero mocked/hardcoded data):** `/health`, `/config`, `/styles`, `/providers` (optional diagnostic use), `/analyze`, `/generate`, `/refine`, `/generation/{id}`, `/history` (+ `/history/{id}/select/{variation_id}`, `/history/{id}` DELETE) — every one has a corresponding hook in `queries.ts` and is actually called from a page, not dead code.

**State management:** TanStack Query owns 100% of server state; Zustand owns exactly the 3 client-only concerns in §6; zero prop-drilling beyond 2 levels anywhere (verify via component tree review); zero duplicate state (e.g. no local `useState` mirror of a `GenerationOut` field anywhere).

**Responsive:** manually verified at all 9 breakpoints in §10, zero horizontal scroll, zero overflow, zero cropped images.

**Accessibility:** keyboard-only full-flow walkthrough possible (Landing → Upload → Analysis → Results → Refine → History → Delete), screen-reader labels present on every icon-only control, contrast-checked token pairs, skip-link present, reduced-motion respected.

**Loading/Error/Empty/Success:** every row of the §14 matrix implemented — no screen ever shows a blank white flash while data is in flight, no screen ever silently fails.

**Animations:** all listed in §13 implemented, all respect `prefers-reduced-motion`, none exceed 320ms base duration (entrance flourishes like the slider spring excepted, and even that resolves in <600ms).

**Navigation:** zero dead ends, zero orphan pages, every button/icon has a real handler — audit checklist: Landing CTAs (3+), Upload submit, Analysis error/timeout buttons, Results (Download, Generate Again, Share, Save, Refine submit, parent breadcrumb), History (View, Reuse Prompt, Regenerate, Download, Delete ×N cards), TopNav (logo, New Design, History, mobile hamburger), Footer links, 404's CTA.

**Performance:** route splitting in place, images sized/lazy correctly, no unnecessary re-renders on Zustand-connected components, no virtualization added (correctly, per §12).

**No banned patterns anywhere in the codebase:** no glassmorphism (except the one functional nav blur, justified in §9.4), no decorative gradients beyond the single hero vignette, no neon/saturated colors, no glowing effects, no crypto-dashboard visual tropes, no placeholder/lorem-ipsum copy in shipped UI text, no `TODO`/`FIXME` comments, no `console.log` debug statements left in, no unused imports/dead components/duplicate utilities.
