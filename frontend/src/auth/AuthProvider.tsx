import { createContext, useContext, useEffect, useState, useRef, useCallback, type ReactNode } from 'react';
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  getRedirectResult,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  confirmPasswordReset,
  updateProfile,
  setPersistence,
  sendEmailVerification,
  updatePassword,
  verifyBeforeUpdateEmail,
  deleteUser,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  EmailAuthProvider,
  type User,
} from 'firebase/auth';
import {
  firebaseAuth, googleProvider, browserLocalPersistence, browserSessionPersistence,
} from '../lib/firebase';
import { api } from '../api/client';
import { useAuthModalStore } from './authModalStore';

import { type User as ApiUser } from '../api/types';

/** The six discrete states the application can be in. */
export type AuthState =
  | 'initializing'    // Firebase SDK not yet resolved
  | 'guest'           // Not signed in
  | 'syncing'         // Firebase OK, waiting for backend to confirm
  | 'onboarding'      // Backend confirmed, profile_completed === false
  | 'authenticated';  // Fully authenticated + onboarding complete

interface AuthContextValue {
  user: User | null | undefined; // undefined = not resolved, null = signed out
  profile: ApiUser | null;
  setProfile: (profile: ApiUser) => void;
  authState: AuthState;
  isAuthenticated: boolean;
  isLoading: boolean;   // true while Firebase is initializing
  isSyncing: boolean;   // true while backend sync is in flight
  signUpWithEmail: (args: any) => Promise<User>;
  signInWithEmail: (args: any) => Promise<User>;
  signInWithGoogle: (remember?: boolean) => Promise<User | null>;
  sendReset: (email: string) => Promise<void>;
  confirmReset: (oobCode: string, newPassword: string) => Promise<void>;
  sendVerification: () => Promise<void>;
  updateUserPassword: (password: string) => Promise<void>;
  updateUserEmail: (email: string) => Promise<void>;
  deleteAccount: () => Promise<void>;
  reauthenticate: (password?: string) => Promise<void>;
  signOut: () => Promise<void>;
  syncError: string | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const POPUP_FALLBACK_CODES = new Set([
  'auth/popup-blocked',
  'auth/web-storage-unsupported',
  'auth/operation-not-supported-in-this-environment',
]);

function friendlyError(err: any) {
  const map: Record<string, string> = {
    'auth/email-already-in-use': 'An account with this email already exists.',
    'auth/invalid-email': 'That email address looks invalid.',
    'auth/weak-password': 'Please choose a stronger password.',
    'auth/user-not-found': 'No account found with that email.',
    'auth/wrong-password': 'Incorrect email or password.',
    'auth/invalid-credential': 'Incorrect email or password.',
    'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
    'auth/network-request-failed': 'Network unavailable. Check your connection and try again.',
    'auth/expired-action-code': 'This link has expired. Please request a new one.',
    'auth/invalid-action-code': 'This link is invalid or has already been used.',
    'auth/unauthorized-domain': 'This domain isn\u2019t authorized for sign-in yet. Please contact support.',
    'auth/popup-closed-by-user': 'Google sign-in was cancelled.',
    'auth/account-exists-with-different-credential': 'An account already exists with this email using a different sign-in method.',
    'auth/user-disabled': 'This account has been disabled. Contact support if this seems wrong.',
    'auth/requires-recent-login': 'For your security, please sign in again to complete this action.',
    'auth/credential-already-in-use': 'This credential is already associated with a different account.',
  };

  if (err?.code === 'auth/requires-recent-login') {
    window.dispatchEvent(new CustomEvent('roomcanvas:reauth-required'));
  }

  return map[err?.code] || err?.message || 'Something went wrong. Please try again.';
}

/** Parse backend error HTTP responses into user-friendly messages. */
function parseSyncError(err: any): string {
  const status = err?.status ?? err?.response?.status ?? 0;
  const detail: string = err?.message ?? err?.response?.data?.detail ?? '';

  if (status === 503) {
    return 'Auth service not configured on server. Contact support.';
  }
  if (status === 401) {
    if (detail.includes('expired')) return 'Session expired. Please sign in again.';
    if (detail.includes('invalid')) return 'Invalid session token. Please sign in again.';
    return `Backend rejected the session: ${detail || 'Unauthorized'}`;
  }
  if (status === 500) {
    if (detail.includes('Database')) return 'Database error. Please try again.';
    return `Server error: ${detail || 'Internal Server Error'}`;
  }
  if (status === 0) {
    return 'Network error. Could not reach the server.';
  }
  return detail || 'Backend sync failed. Please try again.';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [profile, setProfile] = useState<ApiUser | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  // Guard against concurrent syncs for the same Firebase user
  const syncingUidRef = useRef<string | null>(null);

  const syncBackendUser = useCallback(async (fbUser: User) => {
    // Avoid duplicate concurrent syncs for the same user
    if (syncingUidRef.current === fbUser.uid) return;
    syncingUidRef.current = fbUser.uid;
    setIsSyncing(true);
    setSyncError(null);

    const delays = [0, 800, 2000];
    let attempts = 0;

    while (attempts < 3) {
      try {
        // Force refresh on first attempt to avoid race conditions right after sign-up
        await fbUser.getIdToken(attempts === 0);
        const data = await api.post<ApiUser>('/auth/sync', {});
        setProfile(data);
        setSyncError(null);
        setIsSyncing(false);
        syncingUidRef.current = null;
        return; // Success
      } catch (err: any) {
        attempts++;
        const isAuthError = err?.status === 401 || err?.status === 403;

        if (isAuthError && attempts < 3) {
          try { await fbUser.getIdToken(true); } catch (_) { /* ignore */ }
        }

        if (attempts >= 3) {
          const msg = parseSyncError(err);
          setSyncError(msg);
          setIsSyncing(false);
          syncingUidRef.current = null;
          return;
        }

        await new Promise(resolve => setTimeout(resolve, delays[attempts]));
      }
    }
  }, []);

  useEffect(() => {
    // Handle any redirect-based auth result (noop for popup flow)
    getRedirectResult(firebaseAuth).catch(() => {});

    const unsubscribe = onAuthStateChanged(firebaseAuth, (fbUser) => {
      setUser(fbUser);
      if (fbUser) {
        syncBackendUser(fbUser);

        // Resume any pending action (e.g. triggered from AuthModal)
        const pending = useAuthModalStore.getState().consumePendingAction();
        if (pending) {
          useAuthModalStore.getState().close();
          window.dispatchEvent(new CustomEvent('roomcanvas:resume-action', { detail: pending }));
        }
      } else {
        setProfile(null);
        setIsSyncing(false);
        setSyncError(null);
        syncingUidRef.current = null;
      }
    });
    return unsubscribe;
  }, [syncBackendUser]);

  const withPersistence = async (remember: boolean) => {
    await setPersistence(firebaseAuth, remember ? browserLocalPersistence : browserSessionPersistence);
  };

  const signUpWithEmail = useCallback(async ({ name, email, password, remember }: any) => {
    try {
      await withPersistence(remember);
      const cred = await createUserWithEmailAndPassword(firebaseAuth, email, password);
      if (name) await updateProfile(cred.user, { displayName: name });

      try {
        await sendEmailVerification(cred.user, {
          url: `${window.location.origin}/auth/action`
        });
      } catch (e) {
        console.error('Failed to send verification email on signup', e);
      }

      // onAuthStateChanged will fire and trigger syncBackendUser automatically.
      // Do NOT navigate here — AppShell handles routing once profile loads.
      return cred.user;
    } catch (err: any) {
      throw new Error(friendlyError(err));
    }
  }, []);

  const signInWithEmail = useCallback(async ({ email, password, remember }: any) => {
    try {
      await withPersistence(remember);
      const cred = await signInWithEmailAndPassword(firebaseAuth, email, password);
      // onAuthStateChanged will fire and trigger syncBackendUser automatically.
      // Do NOT navigate here — AppShell handles routing once profile loads.
      return cred.user;
    } catch (err: any) {
      throw new Error(friendlyError(err));
    }
  }, []);

  const signInWithGoogle = useCallback(async (remember = true) => {
    await withPersistence(remember);
    try {
      const cred = await signInWithPopup(firebaseAuth, googleProvider);
      // onAuthStateChanged will fire and trigger syncBackendUser automatically.
      // Do NOT navigate here — AppShell handles routing once profile loads.
      return cred.user;
    } catch (err: any) {
      if (POPUP_FALLBACK_CODES.has(err?.code)) {
        throw new Error('Popup blocked. Please allow popups for this site to sign in with Google.');
      }
      throw new Error(friendlyError(err));
    }
  }, []);

  const sendReset = useCallback(async (email: string) => {
    try {
      await sendPasswordResetEmail(firebaseAuth, email);
    } catch (err: any) {
      throw new Error(friendlyError(err));
    }
  }, []);

  const confirmReset = useCallback(async (oobCode: string, newPassword: string) => {
    try {
      await confirmPasswordReset(firebaseAuth, oobCode, newPassword);
    } catch (err: any) {
      throw new Error(friendlyError(err));
    }
  }, []);

  const sendVerification = useCallback(async () => {
    if (!firebaseAuth.currentUser) throw new Error('Not authenticated');
    try {
      await sendEmailVerification(firebaseAuth.currentUser, {
        url: `${window.location.origin}/auth/action`
      });
    } catch (err: any) {
      throw new Error(friendlyError(err));
    }
  }, []);

  const updateUserPassword = useCallback(async (password: string) => {
    if (!firebaseAuth.currentUser) throw new Error('Not authenticated');
    try {
      await updatePassword(firebaseAuth.currentUser, password);
    } catch (err: any) {
      throw new Error(friendlyError(err));
    }
  }, []);

  const updateUserEmail = useCallback(async (email: string) => {
    if (!firebaseAuth.currentUser) throw new Error('Not authenticated');
    try {
      await verifyBeforeUpdateEmail(firebaseAuth.currentUser, email, {
        url: `${window.location.origin}/auth/action`
      });
    } catch (err: any) {
      throw new Error(friendlyError(err));
    }
  }, []);

  const deleteAccount = useCallback(async () => {
    if (!firebaseAuth.currentUser) throw new Error('Not authenticated');
    try {
      await deleteUser(firebaseAuth.currentUser);
      setProfile(null);
      setUser(null);
    } catch (err: any) {
      throw new Error(friendlyError(err));
    }
  }, []);

  const reauthenticate = useCallback(async (password?: string) => {
    if (!firebaseAuth.currentUser) throw new Error('Not authenticated');
    try {
      if (password) {
        const cred = EmailAuthProvider.credential(firebaseAuth.currentUser.email!, password);
        await reauthenticateWithCredential(firebaseAuth.currentUser, cred);
      } else {
        await reauthenticateWithPopup(firebaseAuth.currentUser, googleProvider);
      }
    } catch (err: any) {
      throw new Error(friendlyError(err));
    }
  }, []);

  const signOut = useCallback(() => firebaseSignOut(firebaseAuth), []);

  // Derive the semantic auth state
  const isLoading = user === undefined;
  const isAuthenticated = !!user;

  const authState: AuthState =
    isLoading ? 'initializing' :
    !isAuthenticated ? 'guest' :
    isSyncing ? 'syncing' :
    (profile && !profile.profile_completed) ? 'onboarding' :
    'authenticated';

  const value: AuthContextValue = {
    user,
    profile,
    setProfile,
    authState,
    isAuthenticated,
    isLoading,
    isSyncing,
    signUpWithEmail,
    signInWithEmail,
    signInWithGoogle,
    sendReset,
    confirmReset,
    sendVerification,
    updateUserPassword,
    updateUserEmail,
    deleteAccount,
    reauthenticate,
    signOut,
    syncError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
