import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
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

interface AuthContextValue {
  user: User | null | undefined; // undefined = not resolved, null = signed out
  profile: ApiUser | null;
  setProfile: (profile: ApiUser) => void;
  isAuthenticated: boolean;
  isLoading: boolean;
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
    // We emit an event so a re-auth modal can be triggered globally if needed,
    // though forms should catch this and show their own inline re-auth.
    window.dispatchEvent(new CustomEvent('roomcanvas:reauth-required'));
  }
  
  return map[err?.code] || err?.message || 'Something went wrong. Please try again.';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [profile, setProfile] = useState<ApiUser | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const syncBackendUser = useCallback(async (fbUser: User) => {
    let attempts = 0;
    const delays = [0, 800, 2000];
    
    // Attempt the sync with exponential backoff
    while (attempts < 3) {
      try {
        // Force refresh the token on the very first attempt to avoid race conditions on signup
        if (attempts === 0) {
          await fbUser.getIdToken(true);
        }
        
        const data = await api.post<ApiUser>('/auth/sync', {});
        setProfile(data);
        setSyncError(null);
        return; // Success, exit loop
      } catch (err: any) {
        attempts++;
        const isAuthError = err?.response?.status === 401 || err?.response?.status === 403;
        
        // If 401/403, force token refresh for the next attempt
        if (isAuthError && attempts < 3) {
          try { await fbUser.getIdToken(true); } catch (e) {}
        }
        
        if (attempts >= 3) {
          setSyncError('Your account signed in, but the backend rejected the session. Please check backend logs.');
          break;
        }
        
        // Wait before next attempt
        await new Promise(resolve => setTimeout(resolve, delays[attempts]));
      }
    }
  }, []);

  useEffect(() => {
    getRedirectResult(firebaseAuth).catch(() => {});

    const unsubscribe = onAuthStateChanged(firebaseAuth, (fbUser) => {
      setUser(fbUser);
      if (fbUser) {
        syncBackendUser(fbUser);
        
        // Handle pending auth action
        const pending = useAuthModalStore.getState().consumePendingAction();
        if (pending) {
          useAuthModalStore.getState().close();
          window.dispatchEvent(new CustomEvent('roomcanvas:resume-action', { detail: pending }));
        }
      } else {
        setProfile(null);
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
      // Firebase v9+ recommended method
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

  const value = {
    user,
    profile,
    setProfile,
    isAuthenticated: !!user,
    isLoading: user === undefined,
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
