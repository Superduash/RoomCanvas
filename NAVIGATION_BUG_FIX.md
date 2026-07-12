# Critical Navigation Bug Fix

## 🔴 Issue: Sign In/Sign Up Pages Don't Navigate After Success

### Symptoms
- User signs in/signs up successfully
- Toast notification appears
- Page just sits there on `/signin` or `/signup`
- Nothing happens - no navigation to the app

### Root Cause
SignInPage and SignUpPage had their `navigate()` calls **removed** with a comment saying:
> "AppShell will redirect once backend sync finishes"

**This was wrong because:**
1. `/signin` and `/signup` are **top-level routes**, siblings to AppShell - not children
2. AppShell's `<Outlet/>` **never renders** while you're on these public pages
3. RequireAuth only protects routes that **explicitly wrap themselves** in it
4. There was nothing listening to redirect from these public pages after auth success

### The Fix

**✅ Added navigation back to both SignInPage and SignUpPage:**

#### SignInPage.tsx Changes:
```tsx
import { useNavigate, useLocation } from 'react-router-dom';

export function SignInPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/upload';

  const handleSubmit = async (ev: React.FormEvent) => {
    // ...
    try {
      await signInWithEmail({ email, password, remember });
      toast.success('Welcome back!');
      navigate(from, { replace: true });  // ← RESTORED
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleGoogle = async () => {
    // ...
    try {
      const result = await signInWithGoogle(remember);
      if (result) {
        toast.success('Welcome back!');
        navigate(from, { replace: true });  // ← RESTORED
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };
}
```

#### SignUpPage.tsx Changes:
```tsx
import { useNavigate } from 'react-router-dom';

export function SignUpPage() {
  const navigate = useNavigate();

  const handleSubmit = async (ev: React.FormEvent) => {
    // ...
    try {
      await signUpWithEmail({ name, email, password, remember: true });
      toast.success('Account created! Welcome to RoomCanvas.');
      navigate('/upload', { replace: true });  // ← RESTORED
    } catch (err: any) {
      // ...
    }
  };

  const handleGoogle = async () => {
    // ...
    try {
      const result = await signInWithGoogle(true);
      if (result) {
        toast.success('Welcome to RoomCanvas!');
        navigate('/upload', { replace: true });  // ← RESTORED
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };
}
```

### Why Sign-Up Navigates to `/upload` Not `/setup`

New accounts always have `profile_completed: false`, so:
1. User signs up → navigates to `/upload`
2. `/upload` is wrapped in `<RequireAuth>`
3. RequireAuth (fixed per polish7 #1) detects `profile_completed: false`
4. Redirects to `/setup` with proper `state={{ from: location }}` preservation
5. User completes onboarding → returns to `/upload`

**This is simpler than:**
- Directly navigating to `/setup` from sign-up
- Trying to detect if it's a new user vs returning user
- Managing state through multiple redirect layers

### Flow Diagram

**Before (Broken):**
```
SignUp → Auth Success → Toast → 💀 STUCK on /signup
```

**After (Fixed):**
```
SignUp → Auth Success → Toast → Navigate to /upload → RequireAuth catches it → 
  → If new user: Redirect to /setup → Complete profile → Return to /upload
  → If existing user: Pass through to /upload
```

### Files Changed
1. ✅ `frontend/src/pages/SignInPage.tsx` - Added navigate() calls
2. ✅ `frontend/src/pages/SignUpPage.tsx` - Added navigate() calls

### Testing
- [x] Sign in with existing account → lands on `/upload` or original destination
- [x] Sign up with new account → lands on `/upload` → redirected to `/setup`
- [x] Complete onboarding → returns to original destination
- [x] Sign in with Google → same behavior as email
- [x] Sign up with Google → same behavior as email

---

## Related Fixes

This works in conjunction with:
- **Polish7 #1**: RequireAuth now passes `state={{ from: location }}` to `/setup` redirect
- **Polish7 #8**: RequireAuth now uses `authState` machine instead of manual logic
- **AppShell**: Properly catches authenticated users with `profile_completed: false` and redirects to `/setup`

All pieces now work together correctly! 🎉
