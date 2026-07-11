# Phase4.md
### RoomCanvas — Accounts, Authentication & Gated Access
Separate from Phase1-3.md by design — this is a new subsystem, not a polish pass. Implement in full; every piece needed to go from zero to working Google Sign-In with gated Library/History access is here.

---

## 1. The Decision: Firebase Authentication (identity only) + your existing Postgres (all app data)

You asked "mongodb whatever... or firebase?" — here's the concrete recommendation and why, so it's a decision, not a guess:

**Use Firebase Authentication for identity (Google Sign-In) only. Do NOT use Firestore or MongoDB as a second database.** Add one `users` table to the Postgres database you already have (from the earlier deployment plan) and a `user_id` foreign key on `projects`/`generations`. Reasoning:

- Firebase Auth is genuinely the fastest, most reliable path to "Sign up with Google" — it handles the entire OAuth dance, token issuance, and refresh for you. Building this by hand with raw Google OAuth in 4 days is unnecessary risk for zero benefit; Firebase Auth is free at this scale and exactly what it's for.
- But Firebase Auth is an **identity provider**, not a database — it doesn't need to store your app's data. Your `generations`/`projects` tables already live in Postgres with real relational structure (this was the exact reasoning for choosing Postgres over MongoDB last time — same reasoning applies again). Running Firestore *and* Postgres *and* maybe MongoDB would mean three data stores for one app with 4 days left — that's the opposite of "most optimal."
- The integration pattern is simple and well-trodden: frontend signs in with Firebase, gets an ID token (a signed JWT), sends it to your backend on every request via `Authorization: Bearer <token>`, backend verifies it with the Firebase Admin SDK (no network call needed per-request — verification is local, cryptographic, fast), and maps the verified Firebase UID to a row in your own `users` table. Your backend never talks to Firebase's database at all — only to its auth verification.

This is the single best-value setup available to you right now: real Google Sign-In, zero custom OAuth code, one database, no new infrastructure to deploy or pay for.

---

## 2. Database Changes (Postgres — same DB as everything else)

```python
# app/database/models.py — new model
class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    firebase_uid: Mapped[str] = mapped_column(String, unique=True, nullable=False, index=True)
    email: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    display_name: Mapped[str | None] = mapped_column(String, nullable=True)
    photo_url: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    last_login_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    projects: Mapped[list["Project"]] = relationship(back_populates="owner", cascade="all, delete-orphan")
```

```python
# app/database/models.py — add to the existing Project model (or Generation, if "project" isn't yet its own table — adapt to whichever is the actual parent row per Phase 1's audit)
class Project(Base):
    # ...existing columns...
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    owner: Mapped["User"] = relationship(back_populates="projects")
```

**Migration**: use Alembic if it's already in the project (check `requirements.txt`); if not, for a 4-day timeline it's acceptable to add the column via a one-time manual migration script rather than standing up Alembic from scratch under time pressure:
```sql
-- scripts/migrate_add_users.sql — run once against the real DB before deploying this phase
ALTER TABLE projects ADD COLUMN user_id INTEGER REFERENCES users(id);
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    firebase_uid VARCHAR UNIQUE NOT NULL,
    email VARCHAR UNIQUE NOT NULL,
    display_name VARCHAR,
    photo_url VARCHAR,
    created_at TIMESTAMP DEFAULT NOW(),
    last_login_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_users_firebase_uid ON users(firebase_uid);
CREATE INDEX idx_projects_user_id ON projects(user_id);
```
Existing projects created before this phase ships have no `user_id` — either backfill them to a single "legacy/demo" user row so old data isn't orphaned, or accept they become inaccessible (acceptable for a pre-launch demo app; state which you're doing, don't leave it ambiguous).

---

## 3. Firebase Project Setup (do this first, it's 10 minutes, everything else depends on it)

1. Go to the Firebase console, create a new project (or reuse one if you already have one for this app).
2. Authentication → Sign-in method → enable **Google**.
3. Authentication → Settings → Authorized domains → add your Vercel domain (`localhost` is already there by default for dev).
4. Project settings → General → add a Web App → copy the config object (`apiKey`, `authDomain`, `projectId`, etc.) — this goes in the frontend env vars.
5. Project settings → Service accounts → Generate new private key → download the JSON. This is a **backend-only secret**, never expose it to the frontend. It goes in the backend env vars (§5).

---

## 4. Frontend Implementation

### 4.1 — Install and configure

```bash
npm install firebase
```

```typescript
// src/lib/firebase.ts
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, type User } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
const googleProvider = new GoogleAuthProvider();

export async function signInWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function signOutUser() {
  await signOut(auth);
}

export function subscribeToAuthChanges(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}
```

`.env.example` addition (`frontend/.env.example`):
```bash
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```
(All of these are safe to expose client-side — Firebase's web API key is not a secret, it identifies the project, not a credential; access control is enforced server-side by the Admin SDK verification in §5, not by hiding this config.)

### 4.2 — Auth state as a real, narrow addition to existing state architecture

This is server-derived-adjacent state (it comes from Firebase, not your own API) but it's genuinely global and long-lived, so a small dedicated context is the right shape — not a new Zustand slice (auth has its own subscription lifecycle via `onAuthStateChanged` that doesn't fit the store's existing pattern) and not TanStack Query (there's no polling/fetching involved, just a listener).

```tsx
// src/auth/AuthProvider.tsx
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User } from 'firebase/auth';
import { subscribeToAuthChanges, signInWithGoogle, signOutUser } from '../lib/firebase';

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges((u) => {
      setUser(u);
      setIsLoading(false);
    });
    return unsubscribe;
  }, []);

  const signIn = async () => { await signInWithGoogle(); };
  const signOut = async () => { await signOutUser(); };

  return (
    <AuthContext.Provider value={{ user, isLoading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
```

Mount `<AuthProvider>` in `App.tsx`, wrapping the router — same level as `QueryClientProvider` and the `ErrorBoundary` already there.

### 4.3 — Attach the ID token to every API request

```typescript
// src/api/client.ts — modify the existing api object
import { auth } from '../lib/firebase';

async function getAuthHeader(): Promise<Record<string, string>> {
  const user = auth.currentUser;
  if (!user) return {};
  const token = await user.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

export const api = {
  get: async <T>(path: string): Promise<T> => {
    const headers = await getAuthHeader();
    return fetch(`${API_PREFIX}${path}`, { method: 'GET', headers }).then((r) => handleResponse<T>(r));
  },
  post: async <T>(path: string, body: unknown): Promise<T> => {
    const headers = await getAuthHeader();
    return fetch(`${API_PREFIX}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
    }).then((r) => handleResponse<T>(r));
  },
  postForm: async <T>(path: string, formData: FormData): Promise<T> => {
    const headers = await getAuthHeader();
    return fetch(`${API_PREFIX}${path}`, { method: 'POST', headers, body: formData }).then((r) => handleResponse<T>(r));
  },
  del: async <T>(path: string): Promise<T> => {
    const headers = await getAuthHeader();
    return fetch(`${API_PREFIX}${path}`, { method: 'DELETE', headers }).then((r) => handleResponse<T>(r));
  },
};
```
`user.getIdToken()` automatically returns a cached, valid token and silently refreshes it if it's about to expire — no manual refresh logic needed.

### 4.4 — Gating pages: "Sign in to continue," not a broken/blank page

Build one reusable gate component rather than duplicating sign-in UI on every protected page:

```tsx
// src/auth/RequireAuth.tsx
import { type ReactNode } from 'react';
import { useAuth } from './AuthProvider';
import { Button } from '../components/primitives/Button';
import { LogIn } from 'lucide-react';

const GOOGLE_ICON = (
  <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

export function RequireAuth({ children, message }: { children: ReactNode; message?: string }) {
  const { user, isLoading, signIn } = useAuth();

  if (isLoading) {
    return <div className="flex min-h-[60vh] items-center justify-center" aria-busy="true" />;
  }

  if (!user) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
        <LogIn size={40} strokeWidth={1.75} className="text-text-tertiary" aria-hidden="true" />
        <h2 className="text-xl font-semibold text-text-primary">Sign in to continue</h2>
        <p className="max-w-sm text-sm text-text-secondary">
          {message ?? 'Your designs and history are saved to your account — sign in with Google to view them.'}
        </p>
        <Button variant="primary" icon={GOOGLE_ICON} onClick={() => signIn()}>
          Continue with Google
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}
```

Wrap the protected routes in `router/routes.tsx` — `/history`, `/results/:id`, and the upload→generate flow all require a signed-in user (per your instruction: "library or any other page can show sign in to continue"), while `/` (Landing) stays public so people can see what the product does before committing to sign in:

```tsx
{ path: '/upload', element: <RequireAuth><UploadPage /></RequireAuth> },
{ path: '/analysis/:analysisId', element: <RequireAuth><AnalysisPage /></RequireAuth> },
{ path: '/results/:generationId', element: <RequireAuth><ResultsPage /></RequireAuth> },
{ path: '/history', element: <RequireAuth message="Sign in to view your design history and saved projects."><HistoryPage /></RequireAuth> },
```

### 4.5 — TopNav: sign-in/avatar state, smooth and always accessible

```tsx
// components/layout/TopNav.tsx — addition
const { user, signIn, signOut } = useAuth();

{user ? (
  <div className="flex items-center gap-2">
    <img src={user.photoURL ?? ''} alt="" className="h-8 w-8 rounded-full border border-border" referrerPolicy="no-referrer" />
    <Button variant="ghost" size="sm" onClick={() => signOut()}>Sign Out</Button>
  </div>
) : (
  <Button variant="secondary" size="sm" onClick={() => signIn()}>Sign In</Button>
)}
```
This makes sign-in/sign-out reachable from every page via the persistent nav, not just the gated-page prompt — satisfies "accessible from many pages," and keeps the same `signIn`/`signOut` calls everywhere rather than a separate auth modal component to maintain.

---

## 5. Backend Implementation

### 5.1 — Install and configure Firebase Admin SDK

```bash
pip install firebase-admin
```

```python
# app/auth/firebase_admin_init.py
import firebase_admin
from firebase_admin import credentials
from app.config import settings
import json

def init_firebase_admin():
    if firebase_admin._apps:
        return  # already initialized — avoid double-init on reload
    cred_dict = json.loads(settings.FIREBASE_SERVICE_ACCOUNT_JSON)
    cred = credentials.Certificate(cred_dict)
    firebase_admin.initialize_app(cred)
```
Call `init_firebase_admin()` once in `main.py`'s startup event, alongside the existing `init_providers()` call.

```python
# app/config.py — addition
FIREBASE_SERVICE_ACCOUNT_JSON: str = ""  # the full downloaded service-account JSON, as a single-line string env var
```
`.env.example` (`backend/.env.example`) addition:
```bash
# Paste the full contents of your Firebase service account JSON as one line here.
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"...","private_key":"...","client_email":"..."}
```
On Render, set this as a single environment variable with the whole JSON pasted in — Render supports multi-line env values in its dashboard, so this works directly without extra escaping gymnastics.

### 5.2 — Token verification dependency

```python
# app/auth/dependencies.py
from fastapi import Header, HTTPException, Depends
from firebase_admin import auth as firebase_auth
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.database.models import User
from datetime import datetime

async def get_current_user(
    authorization: str = Header(None),
    db: Session = Depends(get_db),
) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")
    token = authorization.removeprefix("Bearer ").strip()
    try:
        decoded = firebase_auth.verify_id_token(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired session — please sign in again")

    firebase_uid = decoded["uid"]
    user = db.query(User).filter(User.firebase_uid == firebase_uid).first()
    if user is None:
        user = User(
            firebase_uid=firebase_uid,
            email=decoded.get("email", ""),
            display_name=decoded.get("name"),
            photo_url=decoded.get("picture"),
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        user.last_login_at = datetime.utcnow()
        db.commit()
    return user
```

### 5.3 — Apply to every route that touches user data

```python
# app/routers/generate.py — example of the pattern, apply identically to analyze.py, refine.py, history.py
from app.auth.dependencies import get_current_user
from app.database.models import User

@router.post("", response_model=GenerateResponse, status_code=201, dependencies=[Depends(RateLimiter("generate", 15, 3600))])
async def generate_design(
    request: GenerateRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    repository = GenerationRepository(db)
    service = GenerationService(repository)
    result = service.prepare_generation(request.analysis_id, force_new=request.force_new, user_id=current_user.id)
    ...
```

**Scope every query to the authenticated user** — this is the actual access-control enforcement, not just "requiring a token exists." `history.py`'s list endpoint must filter `WHERE projects.user_id = current_user.id`, and any single-generation fetch (`/generation/{id}`, `/history/{id}`, the DELETE route) must verify the fetched row's `project.user_id == current_user.id` before returning/deleting it — otherwise a signed-in user could view or delete another user's design just by guessing an id:

```python
# generation_repository.py — every lookup-by-id method gains a user_id parameter and filter
def get_by_id_for_user(self, generation_id: int, user_id: int) -> Generation | None:
    return (
        self.db.query(Generation)
        .join(Project)
        .filter(Generation.id == generation_id, Project.user_id == user_id)
        .first()
    )
```
```python
# routers/history.py — use it, and 404 (not 403) on mismatch — don't reveal whether the id exists at all to someone who doesn't own it
generation = repository.get_by_id_for_user(generation_id, current_user.id)
if generation is None:
    raise HTTPException(status_code=404, detail="Generation not found")
```

Endpoints that stay public, unauthenticated, no `get_current_user` dependency: `/health`, `/config`, `/styles` — these carry no user data and gating them would just add friction with zero security benefit.

---

## 6. Flow Summary — confirm this exact sequence works end to end

1. User lands on `/` (public) → clicks "Start Your Design" or "Sign In."
2. `signIn()` opens the Google popup → Firebase returns a `User` object → `AuthProvider`'s listener fires → `user` state populates app-wide instantly, no page reload.
3. User navigates to `/upload` → already signed in, `RequireAuth` renders the real page immediately (no flash of the sign-in prompt).
4. Every API call from this point (`/analyze`, `/generate`, `/refine`, `/history`) automatically carries `Authorization: Bearer <token>` via the `api.ts` change in §4.3 — no per-call code changes needed anywhere else in the app, this was the point of centralizing it in the client.
5. Backend verifies the token, resolves/creates the local `User` row, scopes every DB query to that user's `user_id`.
6. User visits `/history` directly (bookmark/refresh) while *not* signed in → `RequireAuth` shows "Sign in to view your design history and saved projects" with a working Google button, not a blank page or a broken fetch — clicking it signs in and the page immediately re-renders with real content, no separate redirect-and-reload round trip.
7. Sign out from `TopNav` → `user` becomes `null` app-wide → any currently-open protected page immediately falls back to the `RequireAuth` gate rather than continuing to show stale data the user no longer has access to.

That sequence, fully working with no dead ends and no page reloads at any step, is "done" for this phase.
