# RoomCanvas — Polish 7 · Account / Profile / Onboarding / DB Flow Audit

> **Context:** Demo is tomorrow. This is a full trace of every account, profile, onboarding, and DB-adjacent flow, end to end. Everything below is a confirmed bug found by reading the actual current code — not speculation. Ordered by demo risk, most dangerous first.

The good news: the async DB migration, Supabase Storage migration, and onboarding state machine from earlier passes are all in place and working. What's left are **wiring gaps** — flows where two pieces of correct code don't actually talk to each other.

---

## 🔴 P0 — Fix before the demo (all confirmed, all small diffs)

### 1. Onboarding redirect loses the user's place — the "slight redirect issue" you asked about

**This is the big one.** `SetupProfilePage.tsx` already correctly reads `location.state?.from?.pathname` to send the user back where they came from after onboarding (`handleComplete` and `handleSkip` both do this). But `RequireAuth.tsx` — the thing that actually sends users to `/setup` — never passes that state:

```tsx
// frontend/src/auth/RequireAuth.tsx — CURRENT (bug)
if (profile && !profile.profile_completed && location.pathname !== '/setup') {
  return <Navigate to="/setup" replace />;   // ← no state passed!
}
```

Compare to the line right above it, which does it correctly for the sign-in case:
```tsx
if (!isAuthenticated) {
  return <Navigate to="/signin" state={{ from: location }} replace />;  // ✅ correct pattern
}
```

**Effect:** Any new user who signs up mid-task — e.g. they just finished generating their first design and land on `/results/:projectId` — gets bounced to onboarding, and SetupProfilePage has nowhere to send them back to, so it falls back to `/upload` or `/`. Their finished design is orphaned from their perspective; they have to go dig through History to find it. This is exactly the kind of jarring redirect you flagged.

**Fix — one line:**
```tsx
if (profile && !profile.profile_completed && location.pathname !== '/setup') {
  return <Navigate to="/setup" state={{ from: location }} replace />;
}
```
That's it. `SetupProfilePage` already handles the rest correctly.

---

### 2. "Delete Account" doesn't delete the account

`SecuritySection.tsx`'s delete handler:
```tsx
const handleDeleteAccount = async () => {
  ...
  await withReauth(async () => {
    await deleteAccount();   // ← this is the ONLY call made
  });
};
```

`deleteAccount()` in `AuthProvider.tsx` calls **only** Firebase's client-side `deleteUser(firebaseAuth.currentUser)`. It never calls the backend. The backend already has a correct `DELETE /auth/me` endpoint (`routers/auth.py`) — it's just never invoked from anywhere in the frontend.

**Result:** Firebase credentials are deleted (user can't sign back in with that identity), but their `User` row, every `Generation`, every `Variation`, and all their images sitting in Supabase Storage are **never deleted** — permanently orphaned. The UI promises "there is no going back... permanently delete" and doesn't deliver that. This also means avatar + generation images silently accumulate in Supabase Storage forever with no owner.

**Fix — order matters.** The backend call needs a valid Firebase ID token, so it must happen **before** the Firebase user is deleted, not after:

```tsx
// AuthProvider.tsx — deleteAccount, corrected order
const deleteAccount = useCallback(async () => {
  if (!firebaseAuth.currentUser) throw new Error('Not authenticated');
  try {
    // 1. Delete backend data FIRST — needs a still-valid token
    await api.del('/auth/me');
    // 2. THEN delete the Firebase credential — invalidates the token
    await deleteUser(firebaseAuth.currentUser);
    setProfile(null);
    setUser(null);
  } catch (err: any) {
    throw new Error(friendlyError(err));
  }
}, []);
```

**Also fix the backend to actually clean up storage**, not just DB rows (DB cascade already works via the ORM `cascade="all, delete-orphan"` on `User.generations` — that part's fine — but it only deletes rows, not the Supabase files):

```python
# backend/app/routers/auth.py
@router.delete("/me", status_code=204)
async def delete_account(
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Collect every file this user owns BEFORE the cascade delete removes the rows
    result = await db.execute(select(Generation).where(Generation.user_id == user.id))
    generations = result.scalars().all()
    files = [user.photo_url] if user.photo_url else []
    for g in generations:
        if g.original_image_path:
            files.append(g.original_image_path)
        for v in getattr(g, "variations", []):
            if v.image_path:
                files.append(v.image_path)

    await db.delete(user)   # cascades Generations + Variations at the DB row level
    await db.commit()

    from app.services.storage_service import StorageService
    def _cleanup():
        for f in files:
            StorageService.delete_file_if_exists(f)
    background_tasks.add_task(_cleanup)

    return Response(status_code=204)
```
(This mirrors the file-cleanup pattern already used correctly in `routers/history.py`'s delete endpoints — just applying it here too.)

**Also swap the native `window.confirm()`** for the app's own `Dialog` — a raw browser confirm() is jarring next to everything else and provides zero "are you REALLY sure" friction for a destructive, unrecoverable action:

```tsx
// Replace window.confirm() with a Dialog requiring the user to type "DELETE"
// (Dialog primitive already exists in components/primitives/Dialog.tsx)
```

---

### 3. Username conflicts crash with a useless error, not a helpful one

`PATCH /auth/me` in `routers/auth.py` sets `user.username = updates.username` directly with no uniqueness check, then hits `await db.commit()`. Since `username` is a DB-level `unique=True` column, a collision throws a raw `IntegrityError`, which the generic handler turns into:

```python
except Exception as exc:
    await db.rollback()
    raise HTTPException(status_code=500, detail="Failed to save profile changes. Please try again.")
```

The user sees a generic 500 toast that gives them no idea *what* went wrong or *what to fix*. This can happen even though both `SetupProfilePage` and `ProfilePage` do a client-side debounced availability check — because there's a real gap between "checked available while typing" and "clicked Save 10 seconds later," during which someone else can claim the same name (classic TOCTOU race). This is very likely to actually happen during a live demo if you create a couple of test accounts back-to-back with similar names.

**Fix — catch it specifically and return a real 409:**
```python
from sqlalchemy.exc import IntegrityError

@router.patch("/me", response_model=UserOut)
async def update_profile(updates: UserUpdate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if updates.display_name is not None:
        user.display_name = updates.display_name
    if updates.username is not None:
        user.username = updates.username
    if updates.bio is not None:
        user.bio = updates.bio
    if updates.photo_url is not None:
        user.photo_url = updates.photo_url
    if updates.theme_preference is not None:
        user.theme_preference = updates.theme_preference
    if updates.profile_completed is not None:
        user.profile_completed = updates.profile_completed
    try:
        await db.commit()
        await db.refresh(user)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=409, detail="That username is already taken. Please choose another.")
    except Exception as exc:
        await db.rollback()
        _log.error(f"Failed to update user profile: {exc}")
        raise HTTPException(status_code=500, detail="Failed to save profile changes. Please try again.")
    return user
```

On the frontend (both `SetupProfilePage.tsx` and `ProfilePage.tsx`), handle 409 specifically so the error lands on the username field instead of a generic toast:
```tsx
catch (err: any) {
  if (err.status === 409) {
    setUsernameStatus('taken');
    setUsernameError('That username was just taken. Try another.');
    toast.error('Username unavailable — please pick another.');
  } else {
    toast.error(err.message || 'Failed to update profile.');
  }
}
```

Also disable the Save/Continue button while `usernameStatus === 'checking'`, not just on `'taken'`/`'invalid'`, so a click can't race the debounce:
```tsx
// ProfilePage.tsx
disabled={!hasChanges || bio.length > 280 || usernameStatus === 'checking'}
```

---

### 4. Signing out doesn't clear cached data — risky for a demo with multiple test accounts

`signOut` in `AuthProvider.tsx`:
```tsx
const signOut = useCallback(() => firebaseSignOut(firebaseAuth), []);
```
This fires-and-forgets the Firebase sign-out and never touches the React Query cache. If you sign out and immediately sign in as a different test account **on the same browser tab** (extremely likely during a live demo where you show "here's a fresh account" vs "here's an existing account"), stale history/stats/profile data from the previous account can flash on screen until each query happens to refetch — because `queryClient` still holds the old user's cached `['history']`, `['user_stats']`, etc. under the same query keys.

**Fix:**
```tsx
// AuthProvider.tsx — needs access to the query client
import { useQueryClient } from '@tanstack/react-query';

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  // ...
  const signOut = useCallback(async () => {
    await firebaseSignOut(firebaseAuth);
    queryClient.clear();   // wipe every cached query — next sign-in starts clean
  }, [queryClient]);
  // ...
}
```
Also wrap the `onClick={() => { setAvatarMenuOpen(false); signOut(); }}` calls in `TopNav.tsx` to actually `await` and show a toast:
```tsx
onClick={async () => {
  setAvatarMenuOpen(false);
  await signOut();
  toast.success('Signed out');
}}
```

---

## 🟠 P1 — Real bugs, lower demo risk, fix if time allows

### 5. Email verification banner doesn't clear itself after verifying

`VerificationBanner.tsx` reads `user.emailVerified` straight off the cached Firebase `currentUser` object. Firebase does **not** automatically refresh that flag on the client after you click a verification link — you have to explicitly call `.reload()`. If someone verifies via a link (especially opened in a new tab, which is the default), the banner keeps nagging "please verify your email" indefinitely until a hard refresh or full re-login.

**Fix in `AuthActionPage.tsx`**, on the `verifyEmail` success path:
```tsx
if (mode === 'verifyEmail') {
  await applyActionCode(firebaseAuth, oobCode);
  await firebaseAuth.currentUser?.reload();   // ← sync the local emailVerified flag
  ...
}
```
This only helps if it's the *same tab/session* though. For the more common case (verify in a new tab, switch back to the original), add a window-focus listener in `AuthProvider` that reloads the current user and re-syncs:
```tsx
useEffect(() => {
  const onFocus = () => firebaseAuth.currentUser?.reload().then(() => {
    setUser(firebaseAuth.currentUser);  // triggers VerificationBanner re-check
  });
  window.addEventListener('focus', onFocus);
  return () => window.removeEventListener('focus', onFocus);
}, []);
```

### 6. Changing your email in Settings never updates the backend record

`_get_or_create_user` in `dependencies.py` only sets `email` when a `User` row is first created — it never updates it for existing users, even though `SecuritySection.tsx`'s "Update Email" flow (via Firebase's `verifyBeforeUpdateEmail`) successfully changes the *Firebase* email once verified. The backend's stored `user.email` becomes permanently stale, so `ProfilePage`'s "Account Info" card and anything else reading `profile.email` will show the old address forever.

**Fix:**
```python
# dependencies.py — _get_or_create_user, in the "existing user" branch
else:
    if email and user.email != email:
        user.email = email   # keep in sync with Firebase after email changes
    user.last_login_at = datetime.now(timezone.utc)
    try:
        await db.commit()
    except Exception as exc:
        ...
```
This self-heals automatically on the very next authenticated request (e.g. the `/auth/sync` ping that already fires on every app load) — no extra endpoint needed.

### 7. New signups can lose their typed name to a race condition

In `signUpWithEmail`:
```tsx
const cred = await createUserWithEmailAndPassword(firebaseAuth, email, password);
if (name) await updateProfile(cred.user, { displayName: name });
```
`onAuthStateChanged` (which triggers `syncBackendUser`) can fire as soon as the account is created — potentially before `updateProfile` has finished — so the ID token used for the first `/auth/sync` call may not carry the typed name yet, and the backend creates the user with `display_name: null`. This mostly self-heals because onboarding step 2 pre-fills from `profile?.display_name` and lets them fix it — but it's cleaner to just not depend on the race at all:

**Fix — pass the name explicitly instead of relying on the Firebase token claim:**
```tsx
// AuthProvider.tsx — syncBackendUser
const data = await api.post<ApiUser>('/auth/sync', { display_name: fbUser.displayName ?? undefined });
```
```python
# routers/auth.py — sync_user
class SyncRequest(BaseModel):
    display_name: str | None = None

@router.post("/sync", response_model=UserOut)
async def sync_user(body: SyncRequest, response: Response, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if body.display_name and not user.display_name:
        user.display_name = body.display_name
    user.last_login_at = datetime.now(timezone.utc)
    ...
```

---

## 🟡 P2 — Redundant / dead code to remove

You specifically asked about this — here's what's actually unused or duplicated, confirmed by grep across both files:

### 8. `authState` state machine is computed but never used anywhere

`AuthProvider.tsx` builds a clean 5-state machine (`initializing | guest | syncing | onboarding | authenticated`) and puts it on context — but a full-file search shows it's referenced exactly once, the line that assigns it into the context value. Nothing reads `authState` anywhere in the app. Meanwhile `RequireAuth.tsx` independently re-derives the *same* logic by hand (`isLoading || isSyncing` / `!isAuthenticated` / `profile && !profile.profile_completed`). Two implementations of one decision is exactly how these state machines quietly drift apart over time.

**Fix — make `RequireAuth` the consumer instead of re-deriving:**
```tsx
export function RequireAuth({ children }: { children: ReactNode }) {
  const { authState } = useAuth();
  const location = useLocation();

  if (authState === 'initializing' || authState === 'syncing') return <PageLoader />;
  if (authState === 'guest') return <Navigate to="/signin" state={{ from: location }} replace />;
  if (authState === 'onboarding' && location.pathname !== '/setup') {
    return <Navigate to="/setup" state={{ from: location }} replace />;
  }
  return <>{children}</>;
}
```
One source of truth, and it also folds in the fix from #1 above.

### 9. `ProfilePage` re-implements a query that already exists

`UploadPage.tsx` correctly uses the shared `useUserStats()` React Query hook (cached, deduped, 60s staleTime). `ProfilePage.tsx` instead does its own raw imperative fetch:
```tsx
useEffect(() => {
  if (profile) {
    ...
    api.get<any>('/auth/me/stats').then(res => setStats(res)).catch(console.error);
  }
}, [profile]);
```
This bypasses the cache entirely — navigating Upload → Profile → Upload triggers a fresh network call every time instead of reusing the already-fetched, still-fresh stats. It also swallows errors with a bare `console.error`, so a failed stats fetch on Profile just shows blank fields with zero user feedback.

**Fix:**
```tsx
// ProfilePage.tsx
import { useUserStats } from '../api/queries';
// ...
const { data: stats } = useUserStats(!!profile);
// delete the local `stats` state + the manual useEffect fetch entirely
```

### 10. `StorageService.delete_generation_files` is dead code — and broken if it were ever called

```python
@staticmethod
def delete_generation_files(generation_id: int, repository: GenerationRepository):
    generation = repository.get_by_id(generation_id)   # ← missing `await`!
    if not generation:
        return
    ...
```
`GenerationRepository.get_by_id` is `async def`. This static method is not `async`, so it never awaits the call — `generation` would be a coroutine object, not a `Generation`, and `generation.original_image_path` would throw `AttributeError`. It's also simply never called: every router that deletes files (`routers/history.py`'s delete, delete-all, and delete-refinement endpoints) reimplements the same file-collection logic inline instead of calling this method.

**Fix: delete the method.** It's dead weight that would break the moment someone tries to actually use it. If you want a shared helper later, extract the pattern that's already correctly duplicated three times in `history.py` into a proper `async def` version and call that from all three places instead.

### 11. `useRequireAuthAction` doesn't account for onboarding

```tsx
export function useRequireAuthAction() {
  const { isAuthenticated } = useAuth();
  ...
  return function requireAuth(action, pendingAction) {
    if (isAuthenticated) { action(); return; }
    ...
  };
}
```
This only checks Firebase auth, not onboarding completion — so a signed-in-but-not-onboarded user can freely trigger `analyze`/`generate` from `/upload` (which isn't behind `RequireAuth`) and only gets interrupted once they hit `/results`. With fix #1 and #8 above in place, that interruption now correctly sends them back to their results afterward, so this is no longer a *broken* flow — but it's still a slightly odd sequence (generate first, get asked to finish your profile, then see results). If you want the smoothest possible demo path, consider nudging onboarding immediately after signup instead of deferring it:

```tsx
// AuthProvider.tsx — after a successful signUpWithEmail/signInWithGoogle for a brand-new user,
// you already know it's new user via the /auth/sync 201 status. Could immediately
// navigate to /setup right there instead of waiting for a route guard to catch it.
```
This is optional polish, not a correctness bug — flagging it so it's a deliberate choice, not an accident.

---

## 🟢 P3 — Small things, mention only

### 12. SSE generation-status endpoint never checks for client disconnect
```python
async def event_generator():
    while True:
        generation = await repo.get_by_id(generation_id)
        ...
        await asyncio.sleep(2)
```
If a user closes the tab mid-generation, this loop keeps polling the DB every 2s server-side until the generation reaches a terminal state — for a stuck/slow job, that's an abandoned connection burning DB queries indefinitely. Low risk for a demo (short-lived), but cheap to fix:
```python
from starlette.requests import Request

async def generation_status_sse(generation_id: int, request: Request, ...):
    async def event_generator():
        while True:
            if await request.is_disconnected():
                break
            ...
```

### 13. Duplicate avatar upload endpoints with different names
`SetupProfilePage.tsx` and `ProfilePage.tsx` both call `POST /auth/avatar` — good, consistent. Just noting this is fine, not a bug, in case it looked suspicious during the audit; no action needed here.

---

## Summary — what to actually do before tomorrow

If you only have time for a subset, do these four (all confirmed, all small, all high-visibility during a demo):

1. **#1** — one-line fix, `state={{ from: location }}` in `RequireAuth`'s onboarding redirect.
2. **#2** — wire the frontend delete-account flow to actually call the backend, in the right order.
3. **#3** — catch `IntegrityError` on username conflicts, return 409 instead of a scary 500.
4. **#4** — `queryClient.clear()` on sign out, so switching between demo accounts doesn't show stale data.

Everything else in this file is real but lower-stakes for a one-day deadline — do them after the demo, in the order listed.
