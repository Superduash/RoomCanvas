import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  confirmPasswordReset,
  verifyPasswordResetCode,
  updateProfile,
  setPersistence,
  type User,
} from 'firebase/auth';
import {
  firebaseAuth, googleProvider, browserLocalPersistence, browserSessionPersistence,
} from '../lib/firebase';
import { api } from '../api/client';

export interface UserProfile {
  id: number;
  email: string;
  display_name: string | null;
  photo_url: string | null;
  created_at: string;
}

interface AuthContextValue {
  user: User | null | undefined; // undefined = not resolved, null = signed out
  profile: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signUpWithEmail: (args: any) => Promise<User>;
  signInWithEmail: (args: any) => Promise<User>;
  signInWithGoogle: (remember?: boolean) => Promise<User | null>;
  sendReset: (email: string) => Promise<void>;
  confirmReset: (oobCode: string, newPassword: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const POPUP_FALLBACK_CODES = new Set([
  'auth/popup-blocked',
  'auth/popup-closed-by-user',
  'auth/cancelled-popup-request',
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
    'auth/network-request-failed': 'Network error. Check your connection and try again.',
    'auth/expired-action-code': 'This reset link has expired. Request a new one.',
    'auth/invalid-action-code': 'This reset link is invalid or has already been used.',
  };
  return map[err?.code] || 'Something went wrong. Please try again.';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const syncBackendUser = useCallback(async () => {
    try {
      const data = await api.post<UserProfile>('/auth/sync', {});
      setProfile(data);
    } catch {
      // Non-fatal
    }
  }, []);

  useEffect(() => {
    getRedirectResult(firebaseAuth).catch(() => {});

    const unsubscribe = onAuthStateChanged(firebaseAuth, (fbUser) => {
      setUser(fbUser);
      if (fbUser) syncBackendUser();
      else setProfile(null);
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
      return cred.user;
    } catch (err: any) {
      throw new Error(friendlyError(err));
    }
  }, []);

  const signInWithEmail = useCallback(async ({ email, password, remember }: any) => {
    try {
      await withPersistence(remember);
      const cred = await signInWithEmailAndPassword(firebaseAuth, email, password);
      return cred.user;
    } catch (err: any) {
      throw new Error(friendlyError(err));
    }
  }, []);

  const signInWithGoogle = useCallback(async (remember = true) => {
    await withPersistence(remember);
    try {
      const cred = await signInWithPopup(firebaseAuth, googleProvider);
      return cred.user;
    } catch (err: any) {
      if (POPUP_FALLBACK_CODES.has(err?.code)) {
        await signInWithRedirect(firebaseAuth, googleProvider);
        return null;
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
      await verifyPasswordResetCode(firebaseAuth, oobCode);
      await confirmPasswordReset(firebaseAuth, oobCode, newPassword);
    } catch (err: any) {
      throw new Error(friendlyError(err));
    }
  }, []);

  const signOut = useCallback(() => firebaseSignOut(firebaseAuth), []);

  const value = {
    user,
    profile,
    isAuthenticated: !!user,
    isLoading: user === undefined,
    signUpWithEmail,
    signInWithEmail,
    signInWithGoogle,
    sendReset,
    confirmReset,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
