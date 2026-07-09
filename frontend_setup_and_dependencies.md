# frontend_setup_and_dependencies.md
### RoomCanvas — Companion Setup Spec
**Pairs with:** `final_frontend.md`. This file was not in the original prompt — it covers exact package installs and setup pieces the main spec referenced but didn't fully pin down, plus a few things missing from it entirely. Hand both files to the implementing AI together.

---

## 1. Icon & Emoji Policy — explicit rule

**No emoji, anywhere, in any shipped UI.** Not in copy, not in empty states, not in toasts, not in placeholder text, not in commit-style flourishes. Emoji read as generic-AI-product filler and directly contradict the "no AI slop" direction in §1 of the main spec. Every icon in the product is a **Lucide React** glyph — full stop, no exceptions, no mixing in a second icon set for "just one thing."

- Install: `lucide-react` (already listed in the main spec's tech stack — this section just makes the rule unambiguous).
- Usage rule: icons are always sized in even increments (14 / 16 / 18 / 20 / 24px), `stroke-width={1.75}` as the app-wide default (Lucide's default of `2` reads slightly heavy against Inter's weight — set this once via a thin wrapper, not per-instance):

```tsx
// src/components/primitives/Icon.tsx
import { type LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

interface IconProps {
  icon: LucideIcon;
  size?: 14 | 16 | 18 | 20 | 24 | 32 | 48;
  className?: string;
  'aria-hidden'?: boolean;
}

export function Icon({ icon: LucideIconComp, size = 18, className, ...rest }: IconProps) {
  return <LucideIconComp size={size} strokeWidth={1.75} className={cn('text-current', className)} {...rest} />;
}
```

Every other component imports `Icon` and passes a Lucide component in, rather than importing raw Lucide icons ad hoc across the codebase — one place to change stroke weight or add a default `aria-hidden` later.

---

## 2. Exact Package Install Commands

Run in `frontend/` after `npm create vite@latest . -- --template react-ts`.

```bash
# Core framework (already scaffolded by Vite — listed for completeness)
# react, react-dom, typescript, vite, @vitejs/plugin-react

# Routing
npm install react-router-dom@^6.28.0

# Server state
npm install @tanstack/react-query@^5.62.0
npm install -D @tanstack/react-query-devtools@^5.62.0

# Client UI state
npm install zustand@^5.0.2

# Styling
npm install -D tailwindcss@^3.4.17 postcss@^8.4.49 autoprefixer@^10.4.20
npx tailwindcss init -p

# Motion
npm install framer-motion@^11.15.0

# Upload
npm install react-dropzone@^14.3.5

# Validation
npm install zod@^3.24.1

# Toasts
npm install react-hot-toast@^2.4.1

# Command palette
npm install cmdk@^1.0.4

# Icons
npm install lucide-react@^0.468.0

# Class utilities
npm install clsx@^2.1.1 tailwind-merge@^2.5.5

# Fonts (self-hosted — see §3, avoids a render-blocking Google Fonts request)
npm install @fontsource/inter@^5.1.0 @fontsource/instrument-serif@^5.1.0

# Linting / formatting
npm install -D eslint@^9.17.0 @typescript-eslint/eslint-plugin@^8.18.0 @typescript-eslint/parser@^8.18.0 eslint-plugin-react-hooks@^5.1.0 eslint-plugin-react-refresh@^0.4.16 prettier@^3.4.2 eslint-config-prettier@^9.1.0

# Path aliases
npm install -D vite-tsconfig-paths@^5.1.4
```

Do not additionally install: any pre-built component kit (shadcn/ui, MUI, Chakra, Ant Design, Mantine). The main spec's primitives (§4) are hand-built specifically so every visual decision traces back to the token system rather than a third-party kit's opinions — pulling in a component library here would silently reintroduce generic "AI SaaS" defaults the whole design direction exists to avoid.

---

## 3. Font Loading — self-hosted, not Google Fonts CDN

The main spec names Inter (sans) and Instrument Serif (headlines). Load them via `@fontsource` (installed above) rather than a `<link>` to `fonts.googleapis.com`, for two concrete reasons: it removes a third-party render-blocking request (directly helps the LCP/performance goals in the main spec's §12), and it means the app has zero external network dependency for its own typography at runtime.

`src/main.tsx` (top of file, before any component import):

```tsx
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/instrument-serif/400.css';
import './styles/tokens.css';
import './styles/globals.css';
```

Only load the weights actually used (400/500/600/700 for Inter covers body/medium/semibold/bold across the whole spec; Instrument Serif is used at 400 only, for headlines). Do not blanket-import every weight — each is a separate file and unused weights are pure waste.

---

## 4. `vite.config.ts` — path aliases + build tuning

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  build: {
    target: 'es2020',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          query: ['@tanstack/react-query'],
          motion: ['framer-motion'],
        },
      },
    },
  },
  server: {
    port: 3000,
  },
});
```

Manual chunking here matters concretely: Framer Motion and TanStack Query are the two heaviest deps (flagged in the main spec's §12) — splitting them into their own chunks means a route that doesn't need animation-heavy interaction (unlikely here, but the pattern is still correct practice) doesn't block on that chunk, and browser caching survives app-code changes without invalidating vendor code.

`tsconfig.json` path alias (paired with `vite-tsconfig-paths` above) so imports can read `@/components/...` instead of `../../../components/...`:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] }
  }
}
```

---

## 5. Things the main spec didn't cover — filled in here

### 5.1 Error Boundary

The main spec has per-screen error states (§14 of `final_frontend.md`) but no top-level crash guard. Add one so a genuinely unexpected render error never shows a blank white screen:

```tsx
// src/components/ErrorBoundary.tsx
import { Component, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from './primitives/Button';

interface Props { children: ReactNode }
interface State { hasError: boolean }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    // eslint-disable-next-line no-console
    console.error('Unhandled render error:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
          <AlertTriangle size={40} strokeWidth={1.75} className="text-danger" aria-hidden="true" />
          <h1 className="text-xl font-semibold text-text-primary">Something went wrong</h1>
          <p className="max-w-sm text-sm text-text-secondary">
            An unexpected error occurred. Your saved designs are safe — reloading should fix this.
          </p>
          <Button onClick={() => window.location.assign('/')}>Back to RoomCanvas</Button>
        </div>
      );
    }
    return this.props.children;
  }
}
```

Wrap the whole router tree with it in `App.tsx`, outside the `QueryClientProvider` (so a query-client init failure is also caught).

### 5.2 Scroll restoration on route change

Not covered in the main spec — without it, navigating Upload → Analysis → Results retains whatever scroll position the previous page ended at, which reads as broken on a content-heavy page like Results.

```tsx
// src/router/ScrollToTop.tsx
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname]);
  return null;
}
```

Mount once inside the router tree, above `<Outlet />`.

### 5.3 SEO / meta tags + favicon

`index.html` — the main spec never specified this file's actual contents:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>RoomCanvas — AI Interior Design Assistant</title>
    <meta name="description" content="Upload a photo of your room and get an AI-generated redesign with real furniture, dimension, and budget recommendations." />
    <meta property="og:title" content="RoomCanvas" />
    <meta property="og:description" content="See your room, redesigned." />
    <meta property="og:type" content="website" />
    <meta name="theme-color" content="#FAF8F5" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`favicon.svg`: a simple mark built from the same line-art shape language as the Landing hero illustration (main spec §8.1) — a minimal room outline in `--color-accent` on transparent background. Do not ship the default Vite logo or a placeholder favicon; a missing/generic favicon undercuts "premium" instantly in a browser tab.

### 5.4 Image format & responsive delivery for AI-generated results

The main spec covers `loading="lazy"`/`eager` and `object-cover`, but not format. Backend-generated images arrive as whatever Replicate/Kontext Pro returns (typically PNG/JPEG) at a fixed resolution — there's no server-side resizing pipeline to request variants from, so:

- Do not attempt `srcset`/responsive-image generation for AI-generated results — there's only one size available per generation; requesting variants that don't exist would 404.
- DO apply `srcset`-free but still-disciplined sizing: wrap every result image in a fixed-`aspect-ratio` container (already specified in the main spec) and let CSS handle the display size — this avoids layout shift without needing multiple source files.
- For any genuinely static asset the frontend ships itself (the Landing hero illustration, the favicon, any decorative SVG), use SVG exclusively — zero raster marketing imagery, which keeps the whole app's own asset weight close to zero regardless of device.

### 5.5 ESLint + Prettier config

`.eslintrc.cjs`:

```js
module.exports = {
  root: true,
  env: { browser: true, es2022: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
    'prettier',
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': 'warn',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'no-console': ['warn', { allow: ['warn', 'error'] }],
  },
};
```

`.prettierrc`:

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "es5",
  "printWidth": 100,
  "tabWidth": 2
}
```

The `no-console` rule (warn, not error, and allowing `warn`/`error`) is the actual enforcement mechanism behind the main spec's Definition of Done line "no `console.log` debug statements left in" — without a lint rule that claim is just a hope.

### 5.6 `.env.example` — complete, not just the one var

The main spec mentions `VITE_API_BASE_URL` inline but never gave the actual file:

```bash
# frontend/.env.example
# Copy to .env.local for local development — Vite auto-loads .env.local, gitignored by default.
VITE_API_BASE_URL=http://localhost:8000
```

### 5.7 Reduced-bundle safety net: bundle analysis

Add one dev script so bundle-size regressions (e.g. accidentally importing all of `lucide-react` instead of named icons) are visible before shipping, directly enforcing the main spec's §12 performance goals:

```bash
npm install -D rollup-plugin-visualizer
```

`package.json` script: `"build:analyze": "vite build && vite-bundle-visualizer"` (or wire `rollup-plugin-visualizer` into `vite.config.ts`'s plugins array behind an `process.env.ANALYZE` flag). Run once after the initial build to confirm no accidental full-library imports crept in — this is a one-time sanity check, not a CI requirement, so it doesn't add ongoing process overhead.

---

## 6. Full `package.json` (reference — final dependency list)

```json
{
  "name": "roomcanvas-frontend",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "lint": "eslint . --ext ts,tsx",
    "format": "prettier --write ."
  },
  "dependencies": {
    "@fontsource/inter": "^5.1.0",
    "@fontsource/instrument-serif": "^5.1.0",
    "@tanstack/react-query": "^5.62.0",
    "clsx": "^2.1.1",
    "cmdk": "^1.0.4",
    "framer-motion": "^11.15.0",
    "lucide-react": "^0.468.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-dropzone": "^14.3.5",
    "react-hot-toast": "^2.4.1",
    "react-router-dom": "^6.28.0",
    "tailwind-merge": "^2.5.5",
    "zod": "^3.24.1",
    "zustand": "^5.0.2"
  },
  "devDependencies": {
    "@tanstack/react-query-devtools": "^5.62.0",
    "@typescript-eslint/eslint-plugin": "^8.18.0",
    "@typescript-eslint/parser": "^8.18.0",
    "@vitejs/plugin-react": "^4.3.4",
    "autoprefixer": "^10.4.20",
    "eslint": "^9.17.0",
    "eslint-config-prettier": "^9.1.0",
    "eslint-plugin-react-hooks": "^5.1.0",
    "eslint-plugin-react-refresh": "^0.4.16",
    "postcss": "^8.4.49",
    "prettier": "^3.4.2",
    "tailwindcss": "^3.4.17",
    "typescript": "^5.7.2",
    "vite": "^6.0.5",
    "vite-tsconfig-paths": "^5.1.4"
  }
}
```

This is a complete, install-and-run dependency set — the implementing AI should not need to add anything beyond this list to build every page/component specified in `final_frontend.md`.
