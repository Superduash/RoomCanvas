# RoomCanvas — Polish 6 · /godmode Production Overhaul

> **Scope:** No limits. Total polish pass. Every page, component, backend route, and DB model is fair game. Goal: make RoomCanvas the most attractive, fluid, and useful interior AI tool on the web — feels like Linear meets Apple meets Airbnb.

---

## 0 · Quick-read map

| § | Area | Files touched |
|---|---|---|
| 1 | Viewport / default scale fix | `index.html`, `globals.css` |
| 2 | Design system overhaul | `tokens.css`, `globals.css`, `tailwind.config.ts` |
| 3 | Landing page revamp | `LandingPage.tsx` |
| 4 | TopNav & GlobalSearch | `TopNav.tsx`, `GlobalSearch.tsx` |
| 5 | Upload page | `UploadPage.tsx`, `Dropzone.tsx` |
| 6 | Onboarding — full new flow | `SetupProfilePage.tsx`, new `OnboardingPage.tsx`, `routes.tsx` |
| 7 | Profile page rebuild | `ProfilePage.tsx` |
| 8 | Settings page rebuild | `SettingsPage.tsx` |
| 9 | History page | `HistoryPage.tsx`, `HistoryCard.tsx` |
| 10 | Results page | `ResultsPage.tsx`, `RecommendationPanel.tsx` |
| 11 | Auth pages & modal | `AuthLayout.tsx`, `SignInPage.tsx`, `SignUpPage.tsx`, `AuthModal.tsx` |
| 12 | Primitives upgrade | `Button.tsx`, `Input.tsx`, `Card.tsx`, `Badge.tsx`, `Dialog.tsx`, new `Select.tsx`, new `Toggle.tsx` |
| 13 | Footer expansion | `Footer.tsx` |
| 14 | AppShell & layout | `AppShell.tsx`, new `PageHeader.tsx` |
| 15 | Motion & animation system | `globals.css`, per-component |
| 16 | Backend overhaul | `models.py`, `auth.py`, `generate.py`, `prompt_builder.py`, `main.py` |
| 17 | Accessibility & QoL | everywhere |
| 18 | Performance | `vite.config.ts`, `queries.ts`, bundle |
| 19 | New features to add | streak, stats, keyboard nav, share |
| 20 | Execution order | — |

---

## 1 · Viewport & Default Scale Fix

The `index.html` `<meta name="viewport">` is correct (`initial-scale=1.0`) but the **body font-size of `16px`** combined with the **15px base text token** creates a mismatch that browsers resolve differently, making the app look slightly too large on 1366×768 laptop screens (most common global display), too small on 4K displays, and inconsistently zoomed on mobile.

### 1.1 `frontend/index.html`

```html
<!-- REPLACE the existing viewport meta -->
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />

<!-- ADD — prevents iOS auto-zoom on input focus (11px minimum) -->
<!-- Already handled: Input.tsx uses text-[15px] which is ≥16px on most browsers.
     If you need to target iOS specifically, add font-size:16px to inputs (not needed
     if you keep Input.tsx's text-[15px] — iOS rounds up). -->

<!-- ADD — prevents text size adjustment on rotation -->
<meta name="mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />

<!-- REPLACE og:image with a real 1200×630 image -->
<meta property="og:image" content="/branding/og-image.png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />

<!-- ADD twitter card -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="RoomCanvas — AI Interior Design" />
<meta name="twitter:description" content="Upload a photo. Get a photorealistic redesign in 90 seconds." />
<meta name="twitter:image" content="/branding/og-image.png" />
```

### 1.2 `frontend/src/styles/globals.css` — fix the font-size mismatch

```css
html {
  font-size: 15px;           /* Match --text-base token exactly */
  /* REMOVE: font-size: 16px — this was the scaling mismatch */
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
  scroll-behavior: smooth;
  /* Fix iOS safe areas for devices with notch/home indicator */
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}

body {
  /* ADD — prevents iOS rubber-band overscroll from showing body bg */
  overscroll-behavior: none;
}

/* ADD — fix Firefox backdrop-filter flicker (discovered in prev audit) */
.backdrop-blur-app,
[class*="backdrop-blur"] {
  -webkit-backface-visibility: hidden;
  backface-visibility: hidden;
  transform: translateZ(0);
  will-change: backdrop-filter;
}

/* ADD — content width should use clamp, not a fixed max */
/* Replace any hardcoded max-w-content with: */
.max-w-content {
  max-width: min(1280px, 100% - 2rem);
}

/* FIX — default zoom on 1366×768: the TopNav at 56px + page padding
   causes noticeable layout at some breakpoints */
@media (min-width: 1024px) and (max-width: 1366px) {
  html { font-size: 14.5px; }
}
@media (min-width: 1920px) {
  html { font-size: 16px; }
}
```

### 1.3 `frontend/tailwind.config.ts` — add safe-area utilities

```ts
extend: {
  padding: {
    'safe-top':    'env(safe-area-inset-top)',
    'safe-bottom': 'env(safe-area-inset-bottom)',
    'safe-left':   'env(safe-area-inset-left)',
    'safe-right':  'env(safe-area-inset-right)',
  },
  height: {
    'screen-safe': 'calc(100vh - env(safe-area-inset-bottom))',
    'screen-dvh':  '100dvh',
  },
}
```

---

## 2 · Design System Overhaul

### 2.1 `frontend/src/styles/tokens.css` — complete rewrite

The existing tokens are solid but have gaps: no dark-mode shadow system, no glow tokens for interactive states, no motion scale, no surface-glass token, and no z-index scale. Add them all:

```css
/* ── Full tokens.css replacement ─────────────────────────── */

/* ╔══════════════════════════════════════════════════════════╗
   ║  LIGHT MODE  (warm architectural neutrals)               ║
   ╚══════════════════════════════════════════════════════════╝ */
:root {
  /* Surfaces — layered warmth */
  --color-bg:              #F8F6F3;   /* page background */
  --color-surface:         #F2EEE9;   /* cards, panels */
  --color-surface-alt:     #E8E3DC;   /* secondary panels, chips */
  --color-surface-raised:  #FFFFFF;   /* inputs, modals, dropdowns */
  --color-surface-glass:   rgba(248, 246, 243, 0.82); /* frosted overlays */
  --color-surface-overlay: rgba(0, 0, 0, 0.48);       /* modal backdrops */

  /* Borders */
  --color-border:          rgba(0,0,0,0.07);
  --color-border-strong:   rgba(0,0,0,0.14);
  --color-border-focus:    var(--color-accent);

  /* Text */
  --color-text-primary:    #1A1714;
  --color-text-secondary:  #4A4540;
  --color-text-tertiary:   #8C8480;
  --color-text-disabled:   #BBBBBB;
  --color-text-inverse:    #FFFFFF;
  --color-text-on-accent:  #FFFFFF;

  /* Brand — terracotta */
  --color-accent:          #B76E4D;
  --color-accent-hover:    #A05E3F;
  --color-accent-active:   #8E5037;
  --color-accent-subtle:   #F3E8E2;
  --color-accent-muted:    rgba(183, 110, 77, 0.12);
  --color-accent-glow:     rgba(183, 110, 77, 0.25);

  /* Semantic */
  --color-success:         #2E7D52;
  --color-success-subtle:  #E8F5EE;
  --color-success-glow:    rgba(46, 125, 82, 0.2);
  --color-warning:         #B87D1A;
  --color-warning-subtle:  #FEF6E4;
  --color-danger:          #C0392B;
  --color-danger-subtle:   #FDECEB;
  --color-danger-glow:     rgba(192, 57, 43, 0.2);
  --color-info:            #1A5FA8;
  --color-info-subtle:     #E1EDF8;

  /* ── Spacing — 4px grid ── */
  --space-px:   1px;
  --space-0:    0px;
  --space-1:    4px;
  --space-2:    8px;
  --space-3:    12px;
  --space-4:    16px;
  --space-5:    20px;
  --space-6:    24px;
  --space-7:    32px;
  --space-8:    40px;
  --space-9:    48px;
  --space-10:   64px;
  --space-11:   80px;
  --space-12:   96px;
  --space-13:  128px;

  /* ── Radius ── */
  --radius-xs:   4px;
  --radius-sm:   8px;
  --radius-md:   12px;
  --radius-lg:   16px;
  --radius-xl:   20px;
  --radius-2xl:  24px;
  --radius-3xl:  32px;
  --radius-full: 9999px;

  /* ── Typography ── */
  --font-sans:   'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-mono:   'JetBrains Mono', 'Fira Code', ui-monospace, 'Cascadia Code', monospace;

  --text-2xs:  11px;
  --text-xs:   12px;
  --text-sm:   13px;
  --text-base: 15px;
  --text-md:   16px;
  --text-lg:   18px;
  --text-xl:   20px;
  --text-2xl:  24px;
  --text-3xl:  30px;
  --text-4xl:  36px;
  --text-5xl:  48px;
  --text-6xl:  60px;
  --text-hero: 72px;

  --leading-none:    1;
  --leading-tight:   1.2;
  --leading-snug:    1.35;
  --leading-normal:  1.55;
  --leading-relaxed: 1.7;
  --leading-loose:   2;

  --tracking-tightest: -0.05em;
  --tracking-tighter:  -0.03em;
  --tracking-tight:    -0.02em;
  --tracking-normal:    0;
  --tracking-wide:      0.04em;
  --tracking-wider:     0.08em;
  --tracking-widest:    0.14em;

  /* ── Shadows ── */
  --shadow-xs:     0 1px 2px rgba(0,0,0,0.03), 0 0 0 1px rgba(0,0,0,0.03);
  --shadow-sm:     0 2px 6px -1px rgba(0,0,0,0.05), 0 1px 3px -1px rgba(0,0,0,0.04);
  --shadow-md:     0 6px 20px -4px rgba(0,0,0,0.06), 0 2px 8px -2px rgba(0,0,0,0.04);
  --shadow-lg:     0 16px 40px -8px rgba(0,0,0,0.07), 0 6px 16px -4px rgba(0,0,0,0.05);
  --shadow-xl:     0 24px 56px -12px rgba(0,0,0,0.09), 0 10px 24px -6px rgba(0,0,0,0.06);
  --shadow-2xl:    0 40px 80px -20px rgba(0,0,0,0.12), 0 16px 40px -8px rgba(0,0,0,0.08);
  --shadow-inner:  inset 0 1px 3px rgba(0,0,0,0.06);
  --shadow-focus:           0 0 0 3px var(--color-accent-glow), 0 0 0 1px var(--color-accent);
  --shadow-focus-danger:    0 0 0 3px var(--color-danger-glow), 0 0 0 1px var(--color-danger);
  --shadow-focus-success:   0 0 0 3px var(--color-success-glow), 0 0 0 1px var(--color-success);

  /* ── Z-index scale ── */
  --z-below:   -1;
  --z-base:     0;
  --z-raised:  10;
  --z-dropdown: 100;
  --z-sticky:   200;
  --z-overlay:  300;
  --z-modal:    400;
  --z-toast:    500;
  --z-tooltip:  600;

  /* ── Motion ── */
  --duration-instant: 80ms;
  --duration-fast:   120ms;
  --duration-base:   180ms;
  --duration-slow:   250ms;
  --duration-slower: 350ms;
  --duration-page:   400ms;

  --ease-out:      cubic-bezier(0.22, 1, 0.36, 1);
  --ease-in:       cubic-bezier(0.64, 0, 0.78, 0);
  --ease-in-out:   cubic-bezier(0.45, 0, 0.55, 1);
  --ease-bounce:   cubic-bezier(0.34, 1.56, 0.64, 1);
  --ease-spring:   cubic-bezier(0.175, 0.885, 0.32, 1.275);

  /* ── Sizes ── */
  --nav-height:    56px;
  --sidebar-width: 280px;
  --content-max:   1280px;
  --prose-max:     720px;
  --form-max:      480px;
}

/* ╔══════════════════════════════════════════════════════════╗
   ║  DARK MODE  (intentionally dark, not just inverted)      ║
   ╚══════════════════════════════════════════════════════════╝ */
[data-theme="dark"] {
  /* Surfaces — rich dark with subtle warmth, not pure black */
  --color-bg:              #0E0C0A;
  --color-surface:         #161310;
  --color-surface-alt:     #1E1A17;
  --color-surface-raised:  #252018;
  --color-surface-glass:   rgba(14, 12, 10, 0.82);
  --color-surface-overlay: rgba(0, 0, 0, 0.72);

  --color-border:          rgba(255,255,255,0.07);
  --color-border-strong:   rgba(255,255,255,0.13);

  --color-text-primary:    #F0EDE9;
  --color-text-secondary:  #A89F96;
  --color-text-tertiary:   #6B6560;
  --color-text-disabled:   #3D3B38;
  --color-text-inverse:    #1A1714;

  --color-accent:          #C87E5C;  /* slightly brighter for dark bg contrast */
  --color-accent-hover:    #D98E6B;
  --color-accent-active:   #B86E4C;
  --color-accent-subtle:   rgba(200, 126, 92, 0.14);
  --color-accent-muted:    rgba(200, 126, 92, 0.10);
  --color-accent-glow:     rgba(200, 126, 92, 0.30);

  --color-success:         #4CA371;
  --color-success-subtle:  rgba(76, 163, 113, 0.12);
  --color-success-glow:    rgba(76, 163, 113, 0.25);
  --color-warning:         #D4943E;
  --color-warning-subtle:  rgba(212, 148, 62, 0.12);
  --color-danger:          #E05C4E;
  --color-danger-subtle:   rgba(224, 92, 78, 0.12);
  --color-danger-glow:     rgba(224, 92, 78, 0.25);
  --color-info:            #5B9BD5;
  --color-info-subtle:     rgba(91, 155, 213, 0.12);

  /* Dark mode shadows need to be darker */
  --shadow-xs:     0 1px 2px rgba(0,0,0,0.2), 0 0 0 1px rgba(255,255,255,0.04);
  --shadow-sm:     0 2px 6px -1px rgba(0,0,0,0.3), 0 1px 3px -1px rgba(0,0,0,0.2);
  --shadow-md:     0 6px 20px -4px rgba(0,0,0,0.4), 0 2px 8px -2px rgba(0,0,0,0.25);
  --shadow-lg:     0 16px 40px -8px rgba(0,0,0,0.5), 0 6px 16px -4px rgba(0,0,0,0.3);
  --shadow-xl:     0 24px 56px -12px rgba(0,0,0,0.6), 0 10px 24px -6px rgba(0,0,0,0.4);
  --shadow-inner:  inset 0 1px 3px rgba(0,0,0,0.4);
}
```

### 2.2 New primitive: `frontend/src/components/primitives/Select.tsx`

Raw `<select>` elements are used throughout `ProfilePage` and `SettingsPage`. They use system OS styling which breaks theming. Create a proper component:

```tsx
// Select.tsx — custom styled select using Radix UI Select
// Uses: @radix-ui/react-select (add to package.json)
import * as RadixSelect from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

interface SelectProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  hint?: string;
  error?: string;
  disabled?: boolean;
  children: React.ReactNode;
}

export function Select({ value, onValueChange, placeholder, label, hint, error, disabled, children }: SelectProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm font-medium text-text-primary">{label}</label>}
      <RadixSelect.Root value={value} onValueChange={onValueChange} disabled={disabled}>
        <RadixSelect.Trigger className={cn(
          'flex h-11 w-full items-center justify-between rounded-xl border bg-surface-raised px-4',
          'text-[15px] text-text-primary shadow-xs cursor-pointer',
          'transition-all duration-base ease-out',
          'focus:outline-none focus:border-accent focus:shadow-focus',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'hover:border-border-strong',
          error ? 'border-danger' : 'border-border',
          '[&[data-placeholder]]:text-text-tertiary/60',
        )}>
          <RadixSelect.Value placeholder={placeholder} />
          <RadixSelect.Icon>
            <ChevronDown className="h-4 w-4 text-text-tertiary" />
          </RadixSelect.Icon>
        </RadixSelect.Trigger>
        <RadixSelect.Portal>
          <RadixSelect.Content className={cn(
            'z-[var(--z-dropdown)] overflow-hidden rounded-xl border border-border',
            'bg-surface-raised shadow-lg',
            'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
            'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
          )}>
            <RadixSelect.Viewport className="p-1.5">
              {children}
            </RadixSelect.Viewport>
          </RadixSelect.Content>
        </RadixSelect.Portal>
      </RadixSelect.Root>
      {hint && !error && <p className="text-xs text-text-tertiary">{hint}</p>}
      {error && <p className="text-xs text-danger flex items-center gap-1">{error}</p>}
    </div>
  );
}

export function SelectItem({ value, children }: { value: string; children: React.ReactNode }) {
  return (
    <RadixSelect.Item value={value} className={cn(
      'relative flex cursor-pointer select-none items-center rounded-lg px-4 py-2.5',
      'text-sm text-text-primary outline-none',
      'data-[highlighted]:bg-surface-alt data-[highlighted]:text-text-primary',
      'data-[state=checked]:text-accent data-[state=checked]:font-medium',
    )}>
      <RadixSelect.ItemText>{children}</RadixSelect.ItemText>
      <RadixSelect.ItemIndicator className="absolute right-3">
        <Check className="h-4 w-4" />
      </RadixSelect.ItemIndicator>
    </RadixSelect.Item>
  );
}
```

### 2.3 New primitive: `frontend/src/components/primitives/Toggle.tsx`

```tsx
// Toggle.tsx — used in Settings for boolean preferences
import { cn } from '../../lib/utils';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}

export function Toggle({ checked, onChange, label, description, disabled }: ToggleProps) {
  return (
    <label className="flex items-center justify-between gap-4 cursor-pointer group">
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-medium text-text-primary group-hover:text-text-primary transition-colors">
          {label}
        </span>
        {description && (
          <span className="text-xs text-text-tertiary">{description}</span>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent',
          'transition-colors duration-base ease-out',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          checked ? 'bg-accent' : 'bg-surface-alt border border-border-strong',
        )}
      >
        <span className={cn(
          'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm',
          'transition-transform duration-[180ms] ease-[cubic-bezier(0.22,1,0.36,1)]',
          checked ? 'translate-x-5' : 'translate-x-0',
        )} />
      </button>
    </label>
  );
}
```

### 2.4 New primitive: `frontend/src/components/primitives/Tooltip.tsx`

```tsx
// Tooltip.tsx — wraps Radix UI Tooltip
// package: @radix-ui/react-tooltip (likely already installed via shadcn deps)
import * as RadixTooltip from '@radix-ui/react-tooltip';
import { cn } from '../../lib/utils';

export function TooltipProvider({ children }: { children: React.ReactNode }) {
  return <RadixTooltip.Provider delayDuration={400}>{children}</RadixTooltip.Provider>;
}

export function Tooltip({ content, children, side = 'top' }: {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
}) {
  return (
    <RadixTooltip.Root>
      <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
      <RadixTooltip.Portal>
        <RadixTooltip.Content
          side={side}
          sideOffset={6}
          className={cn(
            'z-[var(--z-tooltip)] rounded-lg bg-text-primary px-3 py-1.5',
            'text-xs font-medium text-text-inverse shadow-lg',
            'select-none',
            'data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 data-[state=delayed-open]:zoom-in-95',
            'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
          )}
        >
          {content}
          <RadixTooltip.Arrow className="fill-text-primary" />
        </RadixTooltip.Content>
      </RadixTooltip.Portal>
    </RadixTooltip.Root>
  );
}
```

### 2.5 `frontend/src/styles/globals.css` — add animation keyframes

```css
/* ── Page transitions ──────────────────────────────────────── */
@keyframes page-fade-up {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes page-fade-down {
  from { opacity: 0; transform: translateY(-8px); }
  to   { opacity: 1; transform: translateY(0); }
}

.page-enter {
  animation: page-fade-up var(--duration-page) var(--ease-out) both;
}
.page-enter-fast {
  animation: page-fade-up var(--duration-slow) var(--ease-out) both;
}

/* ── Skeleton ──────────────────────────────────────────────── */
@keyframes skeleton-shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
.skeleton-pulse {
  background: linear-gradient(
    90deg,
    var(--color-border) 25%,
    var(--color-surface-alt) 50%,
    var(--color-border) 75%
  );
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.6s ease-in-out infinite;
}

/* ── Glow pulse for AI generation ─────────────────────────── */
@keyframes glow-pulse {
  0%, 100% { box-shadow: 0 0 0 0 var(--color-accent-glow); }
  50%       { box-shadow: 0 0 0 8px transparent; }
}
.animate-glow-pulse {
  animation: glow-pulse 2s ease-in-out infinite;
}

/* ── Float for hero elements ───────────────────────────────── */
@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50%       { transform: translateY(-8px); }
}
.animate-float {
  animation: float 6s ease-in-out infinite;
}

/* ── Gradient shift for hero bg ────────────────────────────── */
@keyframes gradient-shift {
  0%, 100% { background-position: 0% 50%; }
  50%       { background-position: 100% 50%; }
}

/* ── Count up for stats ────────────────────────────────────── */
@keyframes count-up {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ── Typing cursor ─────────────────────────────────────────── */
@keyframes blink {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0; }
}

/* ── Radix UI animation utilities (used by Select, Tooltip) ── */
@layer utilities {
  .animate-in  { animation-duration: var(--duration-base); animation-fill-mode: both; }
  .animate-out { animation-duration: var(--duration-fast);  animation-fill-mode: both; }
  .fade-in-0   { animation-name: fade-in;   }
  .fade-out-0  { animation-name: fade-out;  }
  .zoom-in-95  { animation-name: zoom-in;   }
  .zoom-out-95 { animation-name: zoom-out;  }
}
@keyframes fade-in  { from { opacity: 0; } to { opacity: 1; } }
@keyframes fade-out { from { opacity: 1; } to { opacity: 0; } }
@keyframes zoom-in  { from { transform: scale(0.95); } to { transform: scale(1); } }
@keyframes zoom-out { from { transform: scale(1);    } to { transform: scale(0.95); } }
```

---

## 3 · Landing Page — Full Visual Revamp

**Current state:** Solid structure but the hero feels static, the steps section is text-heavy without visual rhythm, and there are no social-proof elements or visual depth.

**Target:** Vercel/Linear-quality hero with animated gradient background, a live CompareSlider demo, a 3-step visual workflow, feature cards with icon glow, testimonial strip, and a persistent bottom CTA.

### 3.1 Hero section — `LandingPage.tsx`

```tsx
// Hero section replacement — bold, breathable, animated

// Background: subtle animated radial gradient
// "See your room, redesigned." — large tracking-tight headline
// Sub: "Upload a photo. Gemini analyzes it. Flux generates a photorealistic redesign. Done in 90 seconds."
// Two CTAs: primary "Design my room →" (links /upload), secondary "See examples" (smooth scrolls to demo)
// Trust strip below CTAs: "No credit card · Free to try · 90-second results"
// CompareSlider demo below the fold — animated entrance on scroll into view (use Framer Motion whileInView)

function HeroSection() {
  return (
    <section className="relative overflow-hidden min-h-[85vh] flex items-center justify-center">
      {/* Animated bg — radial gradient orbs, GPU-accelerated with transform */}
      <div className="absolute inset-0 -z-10 pointer-events-none" aria-hidden>
        <div className="absolute top-[-20%] left-[10%] w-[600px] h-[600px] rounded-full
                        bg-[radial-gradient(circle,var(--color-accent-muted),transparent_70%)]
                        animate-float opacity-60" />
        <div className="absolute bottom-[-10%] right-[5%] w-[500px] h-[500px] rounded-full
                        bg-[radial-gradient(circle,rgba(91,155,213,0.08),transparent_70%)]
                        animate-float [animation-delay:3s]" />
      </div>

      <div className="mx-auto max-w-content px-5 py-24 text-center flex flex-col items-center gap-8">
        {/* Eyebrow */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full
                           bg-accent-subtle border border-accent/20 text-accent text-xs font-semibold
                           tracking-wide uppercase">
            <Sparkles className="h-3 w-3" />
            Powered by Gemini + Flux Kontext
          </span>
        </motion.div>

        {/* Headline — giant, tight tracking */}
        <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
          className="text-[clamp(2.4rem,6vw,5rem)] font-bold tracking-[-0.04em] leading-[1.08]
                     text-text-primary text-balance max-w-3xl">
          See your room,<br />
          <span className="text-accent">redesigned.</span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.16 }}
          className="text-lg text-text-secondary max-w-lg leading-relaxed text-pretty">
          Upload any room photo. AI analyzes the space and generates a photorealistic
          redesign — in under 90 seconds.
        </motion.p>

        {/* CTAs */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.24 }}
          className="flex flex-col sm:flex-row items-center gap-3">
          <Button size="lg" asChild>
            <Link to="/upload">Design my room <ArrowRight className="h-4 w-4 ml-1" /></Link>
          </Button>
          <Button variant="ghost" size="lg" onClick={() => document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' })}>
            See examples
          </Button>
        </motion.div>

        {/* Trust signals */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex flex-wrap justify-center items-center gap-x-6 gap-y-2">
          {['Free to try', 'No credit card', '90-second results', '10+ design styles'].map(t => (
            <span key={t} className="text-xs text-text-tertiary flex items-center gap-1.5">
              <span className="h-1 w-1 rounded-full bg-accent/60" />
              {t}
            </span>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
```

### 3.2 Demo section (scroll-triggered)

```tsx
// CompareSlider demo with "Before / After" overlay labels, scroll-triggered animation
// Use originalroom.png / redesignedroom.png from public/
// whileInView={{ opacity: 1, y: 0 }} initial={{ opacity: 0, y: 24 }} viewport={{ once: true, margin: '-80px' }}
```

### 3.3 How-it-works section

Replace the current step list with a **horizontal timeline with connecting lines** on desktop, **vertical accordion** on mobile. Each step has: colored step number, icon on a warm-colored disc, label, description. Step connectors are `border-t-2 border-dashed border-border` lines on desktop.

### 3.4 Features section

Current: 3 plain cards. Replace with a **bento grid** (2-column on desktop, stacked on mobile):
- Large card (col-span-2): "Deep Room Analysis" — animated checklist of what gets detected (furniture, palette, dimensions, lighting, style tags). Items animate in with staggered slide-in.
- Medium card: "90-Second Generation" — animated progress bar mock.
- Medium card: "Iterative Refinement" — shows before/after chat-style refinement prompt → result snippet.
- Small card: "10+ Design Styles" — mini style swatches grid (6 colored circles with style names).
- Small card: "For Every Budget" — budget tier icons.

### 3.5 Social proof strip

```tsx
// Thin strip between features and FAQ:
// "Trusted by architects, designers, and homeowners"
// + 3 compact testimonials (name, role, quote snippet) in a horizontal scroll on mobile, 3-col on desktop
// These can be placeholder/fictional for now — mark them [REPLACE WITH REAL TESTIMONIALS]
```

### 3.6 Stats bar

```tsx
const STATS = [
  { value: '10+', label: 'Design Styles' },
  { value: '<90s', label: 'Average Generation' },
  { value: '10MB', label: 'Max Upload Size' },
  { value: '∞', label: 'Refinements' },
];
// Displayed as 4 columns with large bold values and small labels
// Animate with count-up on scroll-into-view
```

### 3.7 CTA footer banner (before site footer)

```tsx
// Full-width CTA section, warm gradient bg (accent-subtle to bg), no border
// "Ready to reimagine your space?" + large button "Start designing — it's free"
// Small text below: "Takes less than 2 minutes"
```

---

## 4 · TopNav & GlobalSearch Fixes

### 4.1 `TopNav.tsx` — comprehensive fix

**Issues found:**
- Avatar dropdown menu has no scroll lock (background can scroll while it's open)
- No smooth enter/exit on the avatar menu beyond basic AnimatePresence
- The mobile drawer doesn't trap focus
- Nav links have no active indicator underline — only background change
- No "Upgrade" / premium CTA slot for future monetization

**Fixes:**

```tsx
// 1. Avatar menu: add useClickOutside hook, animate scale+opacity with origin-top-right,
//    portal it with a backdrop div that catches outside clicks

// 2. Nav link active state: add a 2px bottom border on active items in addition to bg
const navLinkClass = ({ isActive }) => cn(
  'text-[13px] font-medium px-3 h-8 flex items-center rounded-md cursor-pointer select-none',
  'transition-all duration-fast relative',
  isActive
    ? 'text-text-primary bg-surface-alt shadow-xs after:absolute after:bottom-0 after:left-3 after:right-3 after:h-[2px] after:rounded-full after:bg-accent'
    : 'text-text-secondary hover:text-text-primary hover:bg-surface-alt/60'
);

// 3. Logo — add subtle hover animation
// <Link to="/" className="flex items-center gap-2 group">
//   <div className="transition-transform duration-base group-hover:rotate-[-4deg]">
//     <LogoIcon />
//   </div>
//   <span>RoomCanvas</span>
// </Link>

// 4. Add keyboard shortcut hint to search: "⌘K" badge in the search input's right slot

// 5. Mobile drawer: add aria-modal="true", role="dialog", focus trap via focus-trap-react
//    or a manual useEffect that cycles focus through drawer children

// 6. Theme toggle: replace bare Sun/Moon swap with a smooth icon morph animation
//    using AnimatePresence + layoutId="theme-icon"
```

### 4.2 `GlobalSearch.tsx` — fix the blank dropdown bug + enhancements

```tsx
// FIX 1: Never render the dropdown container when there's nothing to show
// The blank white box appears because isOpen=true even with no content.
// Gate: only mount the panel when (query.trim().length > 0 || recentSearches.length > 0 || pages.length > 0)

const shouldShowDropdown = isOpen && (
  query.trim().length > 0 ||
  recentSearches.length > 0
);

// FIX 2: Add a proper empty state for when query has text but no results
{shouldShowDropdown && (
  <Panel>
    {query.trim().length > 0 && results.length === 0 && !isSearching && (
      <div className="py-8 text-center text-sm text-text-tertiary">
        No results for "<strong className="text-text-secondary">{query}</strong>"
      </div>
    )}
    {/* rest of results */}
  </Panel>
)}

// FIX 3: Add keyboard navigation (ArrowUp/ArrowDown/Enter) with activeIndex state
// FIX 4: Add "recent searches" persisted in localStorage (max 5), cleared on X button
// FIX 5: Add search result icons: ImageIcon for designs, FileText for pages, Palette for styles
// FIX 6: Highlight matching query text in results with <mark> tags styled with accent color
// FIX 7: Debounce the search to 200ms instead of immediate on every keystroke
// FIX 8: Add a "Clear" button when query is not empty, instead of just waiting for the user to delete
```

---

## 5 · Upload Page — Enhanced UX

### 5.1 Style picker — visual overhaul

Current: text badges in a horizontal scroll. Replace with an **image-backed grid**:

```tsx
// Each style card:
// - Small preview thumbnail (can be a CSS gradient placeholder matching the style palette,
//   or use a real generated example image stored in public/style-previews/)
// - Style name
// - Hover: slight scale(1.02) + border-accent ring
// - Selected: border-accent, ring-2 ring-accent/25, accent check badge in corner
// Layout: 3 columns on desktop, 2 on mobile, with horizontal scroll on very narrow screens

interface StyleCardProps {
  style: StyleOption;
  selected: boolean;
  onClick: () => void;
}
function StyleCard({ style, selected, onClick }: StyleCardProps) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.15, ease: [0.22,1,0.36,1] }}
      className={cn(
        'relative overflow-hidden rounded-xl border text-left',
        'transition-colors duration-base',
        selected
          ? 'border-accent ring-2 ring-accent/20 bg-accent-subtle'
          : 'border-border bg-surface hover:border-border-strong',
      )}
    >
      {/* Color preview bar from style palette */}
      <div className="h-2 flex">
        {style.palette?.slice(0,4).map((color, i) => (
          <div key={i} className="flex-1" style={{ backgroundColor: color }} />
        ))}
      </div>
      <div className="p-3">
        <p className="text-sm font-semibold text-text-primary">{style.label}</p>
        <p className="text-xs text-text-tertiary mt-0.5 line-clamp-1">{style.description}</p>
      </div>
      {selected && (
        <motion.div
          initial={{ scale: 0 }} animate={{ scale: 1 }}
          className="absolute top-2 right-2 h-5 w-5 rounded-full bg-accent flex items-center justify-center"
        >
          <Check className="h-3 w-3 text-white" />
        </motion.div>
      )}
    </motion.button>
  );
}
```

### 5.2 Dropzone — enhanced states

```tsx
// Add:
// 1. Animated dashed border on drag-active (use CSS animation keyframe "march-ants")
// 2. File size display below preview image (formatted: "2.4 MB")
// 3. Image dimensions display (read with Image() once blob URL created)
// 4. "Replace photo" button overlaid on preview image on hover
// 5. On mobile: show "Take Photo" button prominently (it's already there but needs bigger touch target)
// 6. Accepted formats displayed as colored chips, not plain text

// march-ants animation:
// @keyframes march-ants {
//   to { stroke-dashoffset: -16; }
// }
// .drag-active svg.dashed-border { animation: march-ants 0.5s linear infinite; }
```

### 5.3 Submit button area

```tsx
// When both file + style are selected, the "Analyze Room" button should:
// 1. Show an animated accent glow: animate-glow-pulse class
// 2. Show cost/time estimate: "~90 seconds · Powered by Flux Kontext Pro"
// 3. If user isn't signed in, show a subtle "You'll be asked to sign in" hint below the button
//    (don't gate it — they can still see the result after auth)
```

---

## 6 · Onboarding — Complete Implementation

**Current state:** `SetupProfilePage.tsx` exists as a 3-step form (avatar, username/name/bio, theme). It's not linked from the auth flow in a way users actually see — the `profile_completed` flag on the user object determines whether they get routed there, but the routing logic in `AuthProvider` or `RequireAuth` doesn't enforce it, so users can bypass it entirely.

### 6.1 Route guard

In `RequireAuth.tsx`, add an onboarding check:

```tsx
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, profile, isLoading } = useAuth();
  const location = useLocation();
  
  if (isLoading) return <PageLoader />;
  if (!user) return <Navigate to="/signin" state={{ from: location }} replace />;
  
  // NEW: Route to onboarding if profile isn't set up yet
  // Skip if already on the setup page to avoid infinite redirect
  const isOnSetup = location.pathname.startsWith('/setup');
  if (profile && !profile.profile_completed && !isOnSetup) {
    return <Navigate to="/setup" replace />;
  }
  
  return <>{children}</>;
}
```

### 6.2 `SetupProfilePage.tsx` — complete rebuild

The existing implementation is functional but visually sparse. This is the first impression users get after signing up — it needs to feel like a welcome, not a form.

**Visual design:**
- Full-screen layout, no TopNav/Footer during onboarding (AppShell excluded)
- Left half: large warm illustration/gradient with RoomCanvas logo and welcome copy
- Right half: the step form with smooth slide transitions between steps
- Progress: elegant dots (3 dots) at the bottom of the form area, not a step counter
- Each step slides in from the right, slides out to the left (like a wizard flow)

**Step 1 — Welcome (NEW step, before avatar)**
```
Title: "Welcome to RoomCanvas"
Sub: "Let's set up your space in 30 seconds."
Content: Two buttons:
  - "Set up my profile" → proceeds to avatar step
  - "Skip for now" → marks profile_completed=true with defaults and redirects /upload
```

**Step 2 — Avatar & Name**
```
Title: "How should we know you?"
Avatar dropzone (circular crop, 512×512px output) with camera/upload options
Display name input (required)
"Continue →"
```

**Step 3 — Username**
```
Title: "Claim your username"
Username input with live availability check (debounced 400ms, green/red indicator)
Username suggestions (3 generated from display name, clickable chips)
Bio textarea (optional, max 160 chars with counter)
"Continue →"
```

**Step 4 — Preferences**
```
Title: "Make it yours"
Theme: 3 radio card options (Light / Dark / System) with mini preview mockups
Email notifications toggle
"Let's go! →" → patches profile_completed=true → redirects /upload with confetti burst
```

**Confetti burst on completion:**
```tsx
// Use canvas-confetti (lightweight, tree-shakeable):
// import confetti from 'canvas-confetti';
// confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 },
//            colors: ['#B76E4D', '#F3E8E2', '#D4943E', '#FFFFFF'] });
```

**Step transitions:**

```tsx
// Framer Motion slide transitions between steps
const variants = {
  enter: (dir: number) => ({ x: dir > 0 ? 48 : -48, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit:  (dir: number) => ({ x: dir < 0 ? 48 : -48, opacity: 0 }),
};
// direction state: +1 forward, -1 backward (supports back navigation)
```

**Keyboard support:**
- `Enter` in any field advances to next step
- `Escape` opens "Skip onboarding?" confirmation dialog

### 6.3 Backend: username suggestion endpoint

```python
# GET /api/auth/username-suggest?display_name=Aashwin
# Returns: ["aashwin", "aashwin_23", "aashwin.rc"] (3 suggestions)
# Logic: base + random 2-digit suffix, check uniqueness against DB

@router.get("/username-suggest")
def suggest_usernames(display_name: str, db: Session = Depends(get_db)):
    import random, re
    base = re.sub(r'[^a-z0-9]', '', display_name.lower())[:15] or "user"
    suggestions = []
    attempts = 0
    while len(suggestions) < 3 and attempts < 20:
        candidate = f"{base}_{random.randint(10,99)}" if suggestions else base
        exists = db.query(User).filter(User.username == candidate).first()
        if not exists:
            suggestions.append(candidate)
        attempts += 1
    return {"suggestions": suggestions}
```

### 6.4 Add `onboarding` to routes

```tsx
// In routes.tsx — wrap in a bare layout (no AppShell TopNav/Footer)
{
  path: 'setup',
  element: (
    <Suspense fallback={<div className="min-h-screen bg-bg" />}>
      <SetupProfilePage />
    </Suspense>
  ),
},
// Note: SetupProfilePage renders its own full-screen layout, bypassing AppShell.
// The existing route at /setup-profile is kept for back-compat, redirecting to /setup.
```

---

## 7 · Profile Page — Full Rebuild

Current `ProfilePage.tsx` is 80 lines of raw `<input>` elements with no structure, no avatar display, and no save feedback. Rebuild it as a proper settings panel.

### 7.1 Layout structure

```
[PageHeader: "Profile" + subtitle "Manage your public information"]

Section 1: Avatar
  ├── Circular 96px avatar display (pfp or initials fallback)
  ├── Upload button (opens crop modal, reuses ImageCropModal from setup)
  └── Remove photo (if custom photo exists)

Section 2: Personal Info card
  ├── Display Name (Input primitive, 60 char limit, char counter)
  ├── Username (@username, live availability check on blur)
  └── Bio (Textarea, 280 chars, counter)
  └── [Save changes] button → PATCH /api/auth/me

Section 3: Account Info card (read-only)
  ├── Email (with verification badge if verified)
  ├── Member since date
  └── [Verified by Google] badge if Google-linked

Section 4: Activity summary card (read-only)
  ├── Total designs generated
  ├── Favorite style (most-used from history)
  └── Joined date formatted as "July 2025"
```

### 7.2 Avatar upload flow

```tsx
// Reuse ImageCropModal from components/profile-setup/ImageCropModal.tsx
// After crop: convert canvas to Blob → POST /api/auth/me/photo (multipart/form-data)
// On success: update profile.photo_url in auth context → toast.success("Photo updated")
// Show optimistic preview immediately (don't wait for API response to update UI)
// If API fails: revert preview → toast.error(...)
```

### 7.3 Initials avatar fallback

```tsx
// When photo_url is null, show initials in a warm gradient circle
function InitialsAvatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const sizes = { sm: 'h-8 w-8 text-xs', md: 'h-16 w-16 text-lg', lg: 'h-24 w-24 text-2xl' };
  return (
    <div className={cn(
      'rounded-full flex items-center justify-center font-bold text-white select-none flex-shrink-0',
      'bg-gradient-to-br from-accent to-accent-active',
      sizes[size]
    )}>
      {initials || '?'}
    </div>
  );
}
```

### 7.4 Live username availability

```tsx
// Debounce: 400ms
// Hitting the check endpoint: GET /api/auth/username-available?u=VALUE
// Show spinner while checking, green check + "Available" when clear, red X + "Taken" when not
// Don't check if username === current profile username (no change case)
// On save: only send username if it differs from current value
```

---

## 8 · Settings Page — Full Rebuild

Current `SettingsPage.tsx` uses raw `<select>` and has no visual hierarchy. Rebuild:

```
[PageHeader: "Settings" + subtitle "Customize your RoomCanvas experience"]

Section 1: Appearance
  ├── Theme (3 radio cards: System / Light / Dark, each with mini UI preview)
  └── "Changes apply immediately" hint text

Section 2: Notifications
  └── Email notifications Toggle: "Generation complete · Refinement done"

Section 3: AI Generation defaults (NEW)
  ├── Default budget tier Select (Budget / Mid-Range / Premium)
  ├── Default lighting preference Select (Warm / Cool / Natural)
  └── "These are pre-filled on every new design" hint

Section 4: Security (existing SecuritySection.tsx)
  ├── Change password (for email users)
  ├── Change email
  └── Connected accounts (Google badge if Google-linked)

Section 5: Danger Zone
  └── Delete account → destructive confirm dialog
      "This will permanently delete your account, all designs, and all generated images."
      Requires typing "DELETE" to confirm.
      Calls DELETE /api/auth/me → Firebase deleteUser → local sign out
```

### 8.1 Theme radio cards

```tsx
function ThemeCard({ value, label, preview }: { value: string; label: string; preview: React.ReactNode }) {
  return (
    <label className={cn(
      'relative flex flex-col gap-3 p-4 rounded-xl border cursor-pointer',
      'transition-all duration-base',
      selected === value
        ? 'border-accent bg-accent-subtle ring-2 ring-accent/20'
        : 'border-border bg-surface hover:border-border-strong',
    )}>
      <input type="radio" className="sr-only" value={value} checked={selected === value}
             onChange={() => handleThemeChange(value)} />
      {/* Mini UI preview — small rectangle showing bg/surface colors */}
      <div className="h-16 rounded-lg overflow-hidden border border-border">
        {preview}
      </div>
      <span className="text-sm font-medium text-text-primary">{label}</span>
      {selected === value && (
        <div className="absolute top-3 right-3 h-4 w-4 rounded-full bg-accent flex items-center justify-center">
          <Check className="h-2.5 w-2.5 text-white" />
        </div>
      )}
    </label>
  );
}
```

---

## 9 · History Page — Enhanced

### 9.1 Layout

Replace the minimal card grid with a more visual, photo-forward layout:

```
Header: "My Designs" + count badge + search + sort + "Clear all" (danger, opens confirm)

Layout toggle: Grid (default) | List view
  Grid: 3 columns desktop, 2 tablet, 1 mobile — masonry-style with varying card heights based on aspect ratio
  List: single column, compact rows with thumbnail on left

Filter chips: "All" | "Completed" | "Pending" | By style (auto-generated from data)
```

### 9.2 `HistoryCard.tsx` — rebuild

```tsx
// Card: image fills the top 60% of the card, no letterboxing (object-cover)
// Overlay gradient: bottom 40% has a linear-gradient from transparent to black/60
// Content pinned to bottom of image: style badge, time, room type
// Below image: action row with "Open", "..." menu (Rename, Duplicate, Delete)
// Hover: thumbnail scales to scale(1.03), smooth 300ms ease-out
// Processing state: pulsing skeleton overlay + "Generating..." text
// Failed state: red border, error icon, "Retry" button

// NEW: Quick preview on hover — after 600ms hover, show a mini lightbox/popover
// with the original vs generated comparison (like the existing CompareSlider but mini)
```

### 9.3 Empty state

```tsx
function EmptyHistory() {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-24">
      <div className="h-24 w-24 rounded-2xl bg-surface-alt flex items-center justify-center">
        <ImageIcon className="h-10 w-10 text-text-tertiary" />
      </div>
      <div className="text-center">
        <h3 className="text-xl font-semibold text-text-primary mb-2">No designs yet</h3>
        <p className="text-text-secondary max-w-xs text-sm">
          Upload a room photo and get an AI-generated redesign in under 90 seconds.
        </p>
      </div>
      <Button asChild>
        <Link to="/upload"><Plus className="h-4 w-4 mr-1.5" /> Start designing</Link>
      </Button>
    </div>
  );
}
```

---

## 10 · Results Page — Enhanced

### 10.1 Layout restructure

Current layout: analysis stepper → compare slider → refinement panel. Solid but cramped on smaller screens.

**New layout:**
```
TopNav (sticky)
├── Back button + project breadcrumb
└── Action row: Share | Download | New Design

Main area (2-col on ≥1024px, stacked on mobile):
├── LEFT (60%): Image viewer with view toggle tabs (Compare | Before | After | Side by Side)
│   └── Below viewer: variation thumbnails (if multiple variations)
└── RIGHT (40%): Analysis panel (collapsible sections)
    ├── Room Analysis (furniture list, style, room type, confidence)
    ├── Dimensions (from measurement module, or manual entry)
    ├── Palette (color swatches extracted from original + redesign)
    └── Budget Estimate

Below (full width, collapsible):
└── Refinement / Customization panels
```

### 10.2 View mode tabs

```tsx
// Replace the current dropdown/toggle with icon tabs:
// [SplitSquareHorizontal: Compare] [Image: Generated] [ArrowLeftRight: Side by Side]
// Active tab: accent underline, smooth slide indicator
```

### 10.3 Variation thumbnails strip

```tsx
// Horizontal scrollable strip below the main viewer
// Each thumbnail: small rounded square with border (selected: accent border + ring)
// "+" chip at the end: "Generate variation"
// Clicking a thumbnail animates the main viewer with a crossfade (opacity 0→1)
```

### 10.4 Analysis panel — expand into a real design report

The `RecommendationPanel.tsx` currently renders furniture list, dimensions, palette, and budget. Enhance each:

**Furniture list:** Add estimated real-world sizes (from analysis_json if available). Add color-coded confidence badges (High/Medium/Low).

**Dimensions card:** If the measurement module ran, show measured values with a simple floor plan ASCII sketch (use SVG, not canvas — a basic rectangle with labeled sides). If no measurement: show estimated values from Gemini analysis with a "📏 Measure precisely" button that opens `MeasurementOverlay`.

**Palette swatches:** Show both the original palette and the redesigned palette side by side. Each swatch is clickable → copies hex code to clipboard with a toast "Copied #B76E4D".

**Budget card:** Break down the budget into categories: Furniture (40%), Lighting (20%), Soft furnishings (25%), Accessories (15%). Small bar chart (plain CSS divs, no chart library).

**NEW — AI Design Notes section:**
```
Card title: "Design Rationale"
Content: The `reason_template` from style_hints.py formatted as readable prose
         + 3 specific observations about THIS room from analysis_json
         + 1 "Watch out for" note (structural constraint, narrow doorway, low ceiling, etc.)
This is the "10x more useful" analysis output from prompt5.
```

---

## 11 · Auth Pages & Modal — Polish

### 11.1 `AuthLayout.tsx` — back arrow (already in prompt5, finalize implementation)

```tsx
function BackButton() {
  const navigate = useNavigate();
  const canGoBack = window.history.length > 2 && document.referrer.includes(window.location.host);
  return (
    <button
      type="button"
      onClick={() => canGoBack ? navigate(-1) : navigate('/')}
      className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary
                 transition-colors duration-fast group"
      aria-label="Go back"
    >
      <ArrowLeft className="h-4 w-4 transition-transform duration-fast group-hover:-translate-x-0.5" />
      Back
    </button>
  );
}
```

Left panel of AuthLayout: show a 3-image collage of before/after room examples (CSS grid, softly blurred), with the RoomCanvas tagline overlaid. The right panel contains the form. On mobile: left panel is hidden, just the form.

### 11.2 `SignInPage.tsx` / `SignUpPage.tsx` — micro-polish

```tsx
// 1. Add autofocus to first field (email on signin, name on signup) using autoFocus prop
// 2. Add Enter key to advance between fields (onKeyDown: if Enter and not last field, ref.current.focus() on next)
// 3. SignUp: show password strength meter (already exists in usePasswordStrength) as a row of 4 colored segments
// 4. "Remember me" checkbox: larger hit target (44px), custom styled checkbox using Radix UI Checkbox
// 5. "Forgot password?" link: highlight on hover, positioned inline with password label
// 6. Social auth button (Google): show loading spinner inside button, not separate loading state
// 7. Add "or" divider between social and email sections as a proper styled divider
//    <div className="flex items-center gap-3">
//      <div className="flex-1 h-px bg-border" />
//      <span className="text-xs text-text-tertiary">or</span>
//      <div className="flex-1 h-px bg-border" />
//    </div>
```

### 11.3 `AuthModal.tsx` — enhanced

```tsx
// The modal currently has mode: 'signin' | 'signup' toggle.
// ADD:
// 1. Forgot password mode within the modal (no separate page navigation needed for quick flow)
// 2. Slide animation between modes (not just opacity change)
// 3. After successful sign-in via modal, show a brief "Welcome back!" success state before closing
// 4. Modal backdrop: use Radix UI Dialog.Overlay for proper a11y (inert background)
// 5. Add role="dialog" aria-modal="true" aria-labelledby if not already present
// 6. Dialog close on Escape key (already works if using Radix)
```

---

## 12 · Primitives Upgrades

### 12.1 `Button.tsx` — add `asChild` support + `lg` size

```tsx
// ADD size 'lg':
lg: 'h-12 px-7 text-[15px] font-semibold rounded-xl gap-2',

// ADD asChild prop using Radix UI Slot:
// import { Slot } from '@radix-ui/react-slot';
// if (asChild) return <Slot className={classes} {...props}>{children}</Slot>
// This enables <Button asChild><Link to="/upload">...</Link></Button>
// without needing to manually replicate all Button styling on Link

// ADD icon-only tooltip (when no children):
// Wrap in Tooltip if title prop provided and no children text
```

### 12.2 `Input.tsx` — add textarea variant + char counter

```tsx
// ADD: Textarea component (separate export from same file)
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ error, label, hint, maxLength, className, id, ...props }, ref) => {
    const charCount = (props.value as string)?.length ?? 0;
    return (
      <div className="flex flex-col gap-1.5">
        {(label || maxLength) && (
          <div className="flex items-center justify-between">
            {label && <label className="text-sm font-medium text-text-primary">{label}</label>}
            {maxLength && (
              <span className={cn('text-xs', charCount > maxLength * 0.9 ? 'text-warning' : 'text-text-tertiary')}>
                {charCount}/{maxLength}
              </span>
            )}
          </div>
        )}
        <textarea
          ref={ref}
          maxLength={maxLength}
          className={cn(
            'w-full resize-none rounded-xl border bg-surface-raised px-4 py-3',
            'text-[15px] text-text-primary shadow-xs',
            'placeholder:text-text-tertiary/60',
            'transition-all duration-base ease-out',
            'focus:outline-none focus:border-accent focus:shadow-focus',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            error ? 'border-danger' : 'border-border hover:border-border-strong',
            className,
          )}
          {...props}
        />
        {hint && !error && <p className="text-xs text-text-tertiary">{hint}</p>}
        {error && <p className="text-xs text-danger">{error}</p>}
      </textarea>
    </div>
  );
);
```

### 12.3 `Dialog.tsx` — upgrade with Radix UI Dialog

Current `Dialog.tsx` is a custom modal. Replace internals with `@radix-ui/react-dialog` for proper a11y (aria-modal, focus trap, Escape key), while keeping the visual design:

```tsx
import * as RadixDialog from '@radix-ui/react-dialog';

// All external API stays the same: isOpen, onClose, title, description, children, footer
// Just swap internals to use RadixDialog.Root/Overlay/Content/Title/Description
// This gives: auto-focus management, Escape key, aria-modal, screen-reader announcements
```

### 12.4 New `PageHeader` component

```tsx
// frontend/src/components/layout/PageHeader.tsx
// Used by HistoryPage, ProfilePage, SettingsPage, ResultsPage
interface PageHeaderProps {
  title: string;
  subtitle?: string;
  back?: { label: string; href: string };
  actions?: React.ReactNode;
  badge?: React.ReactNode;
}

export function PageHeader({ title, subtitle, back, actions, badge }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8 pb-6 border-b border-border">
      <div>
        {back && (
          <Link to={back.href}
            className="inline-flex items-center gap-1.5 text-xs text-text-tertiary hover:text-text-primary
                       mb-3 transition-colors group">
            <ChevronLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
            {back.label}
          </Link>
        )}
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">{title}</h1>
          {badge}
        </div>
        {subtitle && <p className="mt-1 text-sm text-text-secondary">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
```

---

## 13 · Footer — Expansion

Replace the 2-link footer with a proper 4-column footer:

```tsx
export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-border bg-surface mt-auto">
      <div className="mx-auto max-w-content px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          {/* Brand column */}
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-3">
              <LogoIcon className="h-6 w-6" />
              <span className="font-bold text-text-primary">RoomCanvas</span>
            </Link>
            <p className="text-xs text-text-tertiary leading-relaxed max-w-[200px]">
              AI-powered interior redesign for architects, designers, and homeowners.
            </p>
          </div>
          
          {/* Product column */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-text-tertiary mb-3">Product</h4>
            <nav className="flex flex-col gap-2">
              <FooterLink to="/upload">Design a Room</FooterLink>
              <FooterLink to="/history">My Designs</FooterLink>
              <FooterLink to="/profile">Profile</FooterLink>
              <FooterLink to="/settings">Settings</FooterLink>
            </nav>
          </div>
          
          {/* Styles column */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-text-tertiary mb-3">Styles</h4>
            <nav className="flex flex-col gap-2">
              {['Modern Minimalist', 'Scandinavian', 'Industrial', 'Bohemian', 'Japandi'].map(s => (
                <FooterLink key={s} to={`/upload?style=${s.toLowerCase().replace(' ','_')}`}>{s}</FooterLink>
              ))}
            </nav>
          </div>
          
          {/* Legal / About column */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-text-tertiary mb-3">More</h4>
            <nav className="flex flex-col gap-2">
              <FooterLink to="/about">About</FooterLink>
              <FooterLink href="mailto:support@roomcanvasai.com">Contact</FooterLink>
            </nav>
          </div>
        </div>
        
        {/* Bottom bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-border">
          <span className="text-xs text-text-tertiary">© {year} RoomCanvas. Built with Gemini + Flux.</span>
          <div className="flex items-center gap-1 text-xs text-text-tertiary">
            <span>Powered by</span>
            <span className="font-semibold text-text-secondary">Flux Kontext Pro</span>
            <span>·</span>
            <span className="font-semibold text-text-secondary">Gemini 1.5</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
```

---

## 14 · AppShell & Layout

### 14.1 `AppShell.tsx` — add scroll progress indicator

```tsx
// Thin 2px accent-colored progress bar at very top of viewport (above nav)
// Tracks document scroll position: 0% at top, 100% at bottom
// Only on pages with long content (LandingPage, HistoryPage)
// Implemented with a sticky div + useScrollProgress hook:

function useScrollProgress() {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const update = () => {
      const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
      setProgress(scrollHeight > clientHeight ? scrollTop / (scrollHeight - clientHeight) : 0);
    };
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);
  return progress;
}
```

### 14.2 Page transitions in AppShell

```tsx
// Wrap <Outlet /> in AnimatePresence with mode="wait"
// Each page component gets its own motion.div wrapper with page-enter animation
// Key: use location.pathname as the key to trigger re-animation on navigation
import { useLocation } from 'react-router-dom';

// In AppShell:
const location = useLocation();
<AnimatePresence mode="wait" initial={false}>
  <motion.div
    key={location.pathname}
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
    className="flex-1 flex flex-col"
  >
    <Outlet />
  </motion.div>
</AnimatePresence>
```

---

## 15 · Motion & Animation System

### Rules applied everywhere:
1. **Only animate `transform` and `opacity`** — never layout properties (width, height, top, left) directly.
2. **Respect `prefers-reduced-motion`**: all Framer Motion variants should check `const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')` and pass empty transition objects when true.
3. **Stagger children** when there are 3+ similar items (style cards, history cards, feature cards). Use Framer Motion `staggerChildren: 0.04`.
4. **GPU-accelerate glass panels**: every `backdrop-blur` element gets `transform: translateZ(0); will-change: backdrop-filter;` (CSS only, no JS).
5. **Duration guidelines**:
   - Micro interactions (button press, toggle): 80–120ms
   - Element state changes (hover, focus): 120–180ms
   - Content entrance (card, modal): 180–250ms
   - Page transitions: 220–350ms
   - Scroll-triggered reveals: 400–500ms

### New animation: Framer Motion `stagger-list` utility

```tsx
// Add to globals or create a shared motion-variants.ts
export const listVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04, delayChildren: 0.05 } },
};
export const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.22, ease: [0.22,1,0.36,1] } },
};

// Usage:
// <motion.ul variants={listVariants} initial="hidden" animate="show">
//   {items.map(item => <motion.li key={item.id} variants={itemVariants}>...</motion.li>)}
// </motion.ul>
```

---

## 16 · Backend Overhaul

### 16.1 Async DB (critical — blocks event loop)

Per prompt5 section 3.1, convert `database/session.py` to async:

```python
# backend/app/database/session.py — full async replacement
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

class Base(DeclarativeBase):
    pass

# Convert DATABASE_URL: sqlite:///... → sqlite+aiosqlite:///...
#                       postgresql://... → postgresql+asyncpg://...
def _make_async_url(url: str) -> str:
    if url.startswith("sqlite:///"):
        return url.replace("sqlite:///", "sqlite+aiosqlite:///", 1)
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+asyncpg://", 1)
    return url

engine = create_async_engine(
    _make_async_url(settings.DATABASE_URL),
    echo=settings.DEBUG,
    pool_pre_ping=True,
    # SQLite-specific: no pool needed
    **({} if "sqlite" in settings.DATABASE_URL else {
        "pool_size": 5,
        "max_overflow": 10,
        "pool_timeout": 30,
    }),
)

AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
```

Then all routers must:
- Change `db: Session` → `db: AsyncSession`
- Change `db.query(User).filter(...)` → `(await db.execute(select(User).where(...))).scalar_one_or_none()`
- Change `db.add(obj); db.commit(); db.refresh(obj)` → `db.add(obj); await db.commit(); await db.refresh(obj)`
- All route functions change to `async def`

### 16.2 Add missing indexes to models

```python
# backend/app/database/models.py — add indexes for common queries

class Generation(Base):
    # ADD: composite index for history queries (user_id + status + created_at)
    __table_args__ = (
        Index('ix_generations_user_status', 'user_id', 'status', 'created_at'),
    )

class User(Base):
    # ADD: index on created_at for admin queries
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False, index=True
    )
```

### 16.3 Add user stats endpoint

```python
# GET /api/auth/me/stats — returns aggregated stats for Profile/Settings display
@router.get("/me/stats")
async def get_user_stats(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    total = await db.scalar(
        select(func.count(Generation.id)).where(Generation.user_id == user.id, Generation.status == 'completed')
    )
    # Most used style
    style_row = await db.execute(
        select(Generation.style, func.count(Generation.style).label('cnt'))
        .where(Generation.user_id == user.id)
        .group_by(Generation.style)
        .order_by(func.count(Generation.style).desc())
        .limit(1)
    )
    top_style = style_row.first()
    return {
        "total_designs": total or 0,
        "favorite_style": top_style[0] if top_style else None,
        "member_since": user.created_at.isoformat(),
    }
```

### 16.4 AI Prompt improvements (`prompt_builder.py`)

**Composition-lock clause (the most important free quality win):**

```python
COMPOSITION_LOCK = """
CRITICAL COMPOSITION RULES:
1. Keep the EXACT same camera angle, framing, and perspective as the original photo.
2. Do NOT reposition, resize, reflect, or rotate the room layout.
3. Preserve all structural elements: walls, windows, doors, ceiling, floor, and their positions.
4. CHANGE only: furniture style, materials, colors, decorations, lighting fixtures, and soft furnishings.
5. Use the verb "change" — not "transform" or "redesign" — to signal precise targeted edits.
"""

def build_generation_prompt(generation, customization=None) -> str:
    arch = _parse_arch_hints(generation.analysis_json)
    
    # Composition lock goes FIRST — highest model attention
    prompt = COMPOSITION_LOCK + "\n\n"
    
    # Then architecture description
    prompt += f"This is a {generation.room_type_detected or 'room'}. {arch}\n\n"
    
    # Style instruction (using "change", not "transform")
    style_template = STYLE_TEMPLATES.get(generation.style, {})
    prompt += f"Change the interior style to {generation.style.replace('_', ' ')}. "
    if style_template.get('furniture'):
        prompt += f"Include: {', '.join(style_template['furniture'][:3])}. "
    if style_template.get('palette'):
        prompt += f"Color palette: {', '.join(style_template['palette'][:3])}. "
    
    # Customization (hard constraints before soft preferences)
    if customization:
        prompt += build_customization_clause(customization)
    
    # Design principles last
    prompt += "\n\n" + DESIGN_PRINCIPLES
    
    return prompt.strip()
```

**Gemini strict JSON schema:**

```python
# In gemini_provider.py — add response_mime_type and response_schema
generation_config = {
    "response_mime_type": "application/json",
    "response_schema": {
        "type": "object",
        "properties": {
            "room_type": {"type": "string"},
            "room_confidence": {"type": "number"},
            "architecture": {
                "type": "object",
                "properties": {
                    "walls": {"type": "array", "items": {"type": "string"}},
                    "windows": {"type": "array", "items": {"type": "string"}},
                    "doors": {"type": "array", "items": {"type": "string"}},
                    "ceiling_height_band": {"type": "string"},
                    "lighting_direction": {"type": "string"},
                    "room_shape": {"type": "string"},
                    "reference_objects": {"type": "array", "items": {"type": "object"}},
                    "structural_constraints": {"type": "array", "items": {"type": "string"}},
                }
            },
            "redesign_prompt": {"type": "string"},
            "design_rationale": {"type": "string"},
            "original_palette": {"type": "array", "items": {"type": "string"}},
            "furniture_detected": {"type": "array", "items": {"type": "object"}},
        },
        "required": ["room_type", "room_confidence", "redesign_prompt"],
    }
}
```

### 16.5 Rate limiter improvements

```python
# backend/app/middleware/rate_limit.py
# ADD: per-user rate limiting (not just per-IP) when authenticated
# ADD: rate limit headers in response (X-RateLimit-Remaining, X-RateLimit-Reset)
# ADD: 429 response body that tells the user how long to wait:
# {"detail": "Rate limit exceeded. Try again in 47 seconds.", "retry_after": 47}
```

### 16.6 Structured logging improvements

```python
# backend/app/logging_config.py
# ADD: request_id middleware (already exists in utils/request_id.py — confirm it's wired into main.py)
# ADD: log generation start, completion, and failure with timing
# ADD: log slow queries (>500ms) at WARNING level using SQLAlchemy event listener
```

### 16.7 Storage: warn about ephemeral filesystem

```python
# backend/app/main.py — add startup warning
if not settings.DEBUG and "render.com" in settings.PUBLIC_BASE_URL:
    logger.warning(
        "Running on Render with local filesystem storage. "
        "Files in storage/ will be LOST on redeploy or instance restart. "
        "Migrate to Cloudflare R2, Backblaze B2, or AWS S3 before production traffic."
    )
```

---

## 17 · Accessibility & QoL

### 17.1 Skip link (already exists, verify wiring)

```tsx
// AppShell.tsx already has the skip link — verify the main content has id="main-content"
// and tabIndex={-1}. Currently correct. No change needed.
```

### 17.2 Focus visible styles

```css
/* globals.css — ensure visible focus on all interactive elements */
:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
  border-radius: var(--radius-xs);
}
/* Remove the outline for mouse users (it's ugly on click) */
:focus:not(:focus-visible) {
  outline: none;
}
```

### 17.3 Loading states audit

Every page that loads async data should show a proper skeleton, not a blank screen:
- `HistoryPage`: HistoryCardSkeleton already exists — confirm it renders during `isLoading`
- `ProfilePage`: show skeleton for avatar + name fields while profile loads
- `SettingsPage`: show skeleton while settings load
- `ResultsPage`: CompareSliderSkeleton exists — verify it shows during generation polling
- `LandingPage`: history-based compare slider should show CompareSliderSkeleton while loading

### 17.4 Error boundary per-route

Each route already has `errorElement` via `RouterErrorBoundary` — verify it shows a useful message and a "Reload" button, not a blank screen.

### 17.5 Toast positioning

Move toasts from `bottom-center` to `bottom-right` on desktop, keeping `bottom-center` on mobile:
```tsx
// App.tsx
<Toaster position="bottom-right" /* ... */ />

// On mobile (<640px), override via media query in CSS:
// .react-hot-toast { @media (max-width: 639px) { bottom: 0 !important; left: 50% !important; transform: translateX(-50%) !important; } }
```

### 17.6 Keyboard navigation for CommandPalette

`CommandPalette.tsx` uses `Cmd+K` (and `Ctrl+K`) — verify:
- Opens on `⌘K` / `Ctrl+K` globally
- Arrow keys navigate results
- Enter selects
- Escape closes
- Results include: pages (Upload, History, Profile, Settings), recent history items, style names

### 17.7 Input autocomplete attributes

```tsx
// SignInPage: email input → autoComplete="email", password → autoComplete="current-password"
// SignUpPage: name → autoComplete="name", email → autoComplete="email",
//             password → autoComplete="new-password", confirm → autoComplete="new-password"
// ProfilePage: display name → autoComplete="name", username → autoComplete="username"
// These matter for password managers and 1Password integration
```

### 17.8 Aria live regions for generation progress

```tsx
// AnalysisStepper: add aria-live="polite" aria-atomic="true" on the step status text
// When generation completes, announce: "Room redesign complete"
// When generation fails, announce: "Generation failed. Please try again."
// This makes the generation flow accessible to screen reader users
<div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
  {status === 'completed' && "Room redesign complete"}
  {status === 'failed' && "Generation failed. Please try again."}
</div>
```

---

## 18 · Performance

### 18.1 `vite.config.ts` — bundle optimizations

```ts
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        'vendor-react':    ['react', 'react-dom', 'react-router-dom'],
        'vendor-query':    ['@tanstack/react-query'],
        'vendor-motion':   ['framer-motion'],
        'vendor-firebase': ['firebase/app', 'firebase/auth'],
        'vendor-radix':    ['@radix-ui/react-dialog', '@radix-ui/react-select', '@radix-ui/react-tooltip'],
        'vendor-icons':    ['lucide-react'],
        'vendor-forms':    ['react-dropzone', 'react-image-crop'],
      },
    },
  },
  // Target modern browsers only (no IE11 polyfills)
  target: ['es2022', 'chrome100', 'firefox100', 'safari15'],
  // Source maps in production for error tracking (optional)
  sourcemap: false,
  // Chunk size warning
  chunkSizeWarningLimit: 600,
},
```

### 18.2 Lazy load heavy components

```tsx
// CompareSlider uses canvas — already lazy in ResultsPage, ensure also lazy in LandingPage
// MeasurementOverlay uses heavy canvas ops — already in Results, keep lazy
// ImageCropModal (react-image-crop) — heavy, only loaded during profile setup / avatar change
// CommandPalette — loaded lazily, only mounts on first Cmd+K press
```

### 18.3 Image optimization

```tsx
// All img tags should use loading="lazy" except above-the-fold images
// LandingPage hero CompareSlider images: loading="eager"
// HistoryCard thumbnails: loading="lazy"
// Avatar: loading="eager" (in TopNav, above fold)

// ADD: srcSet for generated images if you switch to object storage later
// For now: ensure StaticFiles serves with correct Cache-Control headers
```

```python
# backend/app/main.py — add cache headers to StaticFiles
from fastapi.staticfiles import StaticFiles
from starlette.middleware.base import BaseHTTPMiddleware

class StaticCacheMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        if request.url.path.startswith("/static"):
            response.headers["Cache-Control"] = "public, max-age=86400, stale-while-revalidate=604800"
        return response

# Mount AFTER adding the middleware
```

### 18.4 React Query config improvements

```tsx
// queries.ts — tighten staleTime per query type
// Static data (styles, config): staleTime: Infinity (never refetch until page reload)
// Health: staleTime: 15_000 (15s)
// History: staleTime: 30_000, gcTime: 5 * 60_000 (5min)
// Generation status: staleTime: 0 (always fresh while polling)
// Profile: staleTime: 60_000 (1min), updated directly on mutation

// ADD: prefetch history on hover of the History nav link
// <NavLink to="/history" onMouseEnter={() => queryClient.prefetchQuery({ queryKey: ['history'], queryFn: ... })} >
```

### 18.5 Lucide icons — tree-shake properly

```tsx
// Audit all imports — should be named imports, never barrel:
// ✅ import { ArrowRight, Sparkles } from 'lucide-react';
// ❌ import * as Icons from 'lucide-react';
// The Vite config already handles tree-shaking, but importing from the barrel
// can defeat it in some bundler versions. Confirm all usage is named imports.
```

---

## 19 · New Features to Add

### 19.1 Design streak & stats widget (Dashboard upgrade)

On the Upload page top, for logged-in users, show a small welcome banner:

```tsx
function WelcomeBanner({ profile, stats }) {
  return (
    <div className="rounded-2xl bg-surface border border-border p-5 flex items-center justify-between mb-8">
      <div>
        <p className="text-sm text-text-tertiary">Welcome back,</p>
        <p className="text-xl font-bold text-text-primary">{profile.display_name || 'Designer'} 👋</p>
      </div>
      <div className="flex items-center gap-6">
        <Stat value={stats.total_designs} label="Designs" />
        <Stat value={stats.favorite_style} label="Fav style" />
      </div>
    </div>
  );
}
```

### 19.2 Share button on Results page

```tsx
// "Share" button → opens a Share Dialog with options:
// 1. Copy link (copies /results/:id to clipboard)
// 2. Download generated image (existing download feature)
// 3. "Share to..." — uses native Web Share API on mobile:
//    if (navigator.share) { navigator.share({ title: 'My room redesign', url: window.location.href }); }
//    else: show copy link fallback

// The share URL should work for non-authenticated users:
// Results page already renders for logged-in users — for sharing, a public preview
// mode can show just the generated image without the full analysis panel.
// (Backend: make GET /api/project/:id not require auth for reading a completed project)
// OR: just share the image URL directly (simplest)
```

### 19.3 Keyboard shortcut sheet (`?` key)

```tsx
// Pressing '?' (when not in an input) opens a modal showing keyboard shortcuts:
// Cmd+K — Command palette
// N      — New design (/upload)
// H      — History (/history)
// ?      — This dialog
// Escape — Close any open dialog

// Implemented via a global keydown listener in App.tsx or AppShell.tsx
// The modal uses the existing Dialog primitive
```

### 19.4 Print / export report

```tsx
// In ResultsPage, a "Export PDF" button that:
// 1. Opens a print-optimized layout (CSS @media print rules)
// 2. Shows: original + redesigned images side by side, analysis panel, palette, dimensions
// 3. Uses window.print() — no PDF library needed for basic implementation
// @media print { .no-print { display: none; } .print-full-width { width: 100%; } }
```

### 19.5 "Quick regenerate" on History cards

```tsx
// History card → "..." menu → "Regenerate same style"
// This navigates to /results/:id with ?action=regenerate
// ResultsPage reads this param on mount and immediately triggers a new generation
// without user having to click "Generate variation" manually
```

---

## 20 · Execution Order

Work top-to-bottom. Items in bold are blockers for later items.

| Priority | Item | Why first |
|---|---|---|
| **P0** | **Async DB migration** (§16.1) | Blocks all "smooth" goals. Render's free tier is single-threaded. |
| **P0** | **Viewport fix** (§1) | Zero-downtime, fixes the "broken default zoom" on all devices immediately. |
| **P0** | **tokens.css dark mode** (§2.1) | Everything else visually depends on this. |
| **P0** | **CORS + Render env-var verification** | App is broken for production users until this is fixed. |
| P1 | Service worker consolidation (prompt5 §11) | Fixes "styles not loading" |
| P1 | Profile sync retry (prompt5 §1.1) | Fixes the banner error shown in screenshots |
| P1 | GlobalSearch blank-box fix (§4.2) | Visible bug on every page |
| P1 | SetupProfilePage full rebuild (§6) | Onboarding is the first experience for new users |
| P1 | New Select + Toggle primitives (§2.2, §2.3) | Needed by Profile + Settings rebuilds |
| P1 | Profile page rebuild (§7) | Currently non-functional UI |
| P1 | Settings page rebuild (§8) | Currently non-functional UI |
| P2 | Landing page revamp (§3) | Highest-traffic page, biggest visual impression |
| P2 | Toast system + coverage (prompt5 §9) | Small, high-polish payoff |
| P2 | Button asChild + Textarea primitive (§12) | Needed by onboarding + profile forms |
| P2 | TopNav polish (§4.1) | Visible on every page |
| P2 | History page rebuild (§9) | Frequently visited by returning users |
| P2 | Results page enhancements (§10) | Core product value delivery |
| P2 | Gemini strict JSON + composition-lock prompt (§16.4) | Improves output quality immediately |
| P3 | Footer expansion (§13) | Quick win, low risk |
| P3 | PageHeader component (§12.4) | Used across Profile, Settings, History |
| P3 | Page transitions in AppShell (§14.2) | Polish, no functional change |
| P3 | Stagger animations on lists (§15) | Polish |
| P3 | Tooltip primitive (§2.4) | QoL, used on icon buttons throughout |
| P3 | Auth page back arrow (§11.1) | Already spec'd in prompt5, quick fix |
| P3 | Keyboard shortcut sheet (§19.3) | Power-user QoL |
| P3 | Share button (§19.2) | Nice-to-have |
| P4 | Stats widget (§19.1) | Requires stats endpoint first |
| P4 | Print/export (§19.4) | Nice-to-have |
| P4 | Bundle optimizations (§18) | Audit first, then apply targeted fixes |
| P4 | Object storage migration (prompt5 §4) | Before real user traffic |

---

## Appendix A — npm packages to add

```json
{
  "@radix-ui/react-select": "^2.1.x",
  "@radix-ui/react-tooltip": "^1.1.x",
  "@radix-ui/react-slot": "^1.1.x",
  "@radix-ui/react-checkbox": "^1.1.x",
  "@microsoft/fetch-event-source": "^2.0.x",
  "canvas-confetti": "^1.9.x",
  "aiosqlite": "(pip) for async SQLite dev",
  "asyncpg": "(pip) for async Postgres prod",
  "sqlalchemy[asyncio]": "(pip)"
}
```

## Appendix B — pip packages to add

```txt
# requirements.txt additions
aiosqlite>=0.20.0          # async SQLite for local dev
asyncpg>=0.29.0            # async Postgres for Neon production
sqlalchemy[asyncio]>=2.0   # async engine support (already 2.x, just add [asyncio] extra)
```

## Appendix C — files to DELETE (dead code)

```
frontend/src/assets/typescript.svg    # Vite scaffold leftover, not used
frontend/src/assets/vite.svg          # Vite scaffold leftover, not used  
frontend/public/icons.svg             # Confirm nothing imports this (the TopNav logo uses branding/logo.svg)
```

Run `npx depcheck` in `frontend/` after all changes to catch any other unused packages.

---

*Generated from full codebase audit of Backend.txt + Frontend.txt (July 2026). Every fix is grounded in actual code found in those files, not generic advice.*
