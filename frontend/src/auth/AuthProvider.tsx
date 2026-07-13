import { createContext, useContext, useEffect, useState, useRef, useCallback, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  onIdTokenChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  confirmPasswordReset,
  updateProfile,
  setPersistence,
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
import { useTheme } from '../hooks/useTheme';
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

const getCachedProfile = (): ApiUser | null => {
  try {
    const cached = localStorage.getItem('roomcanvas-profile-cache');
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
};

/**
 * Clear all browser session state including localStorage, sessionStorage, 
 * caches, and IndexedDB
 */
async function clearBrowserSessionState() {
  try {
    localStorage.clear();
  } catch {}

  try {
    sessionStorage.clear();
  } catch {}

  try {
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
    }
  } catch {}

  await clearIndexedDbStorage();
}

/**
 * Clear all IndexedDB databases (Firebase persistence, etc.)
 */
async function clearIndexedDbStorage() {
  if (!('indexedDB' in window)) return;

  try {
    const databases = await window.indexedDB.databases();
    await Promise.all(
      databases.map((db) => {
        if (db.name) {
          return new Promise<void>((resolve) => {
            const deleteRequest = window.indexedDB.deleteDatabase(db.name!);
            deleteRequest.onsuccess = () => resolve();
            deleteRequest.onerror = () => resolve(); // Resolve even on error
            deleteRequest.onblocked = () => resolve();
          });
        }
        return Promise.resolve();
      })
    );
  } catch (err) {
    // Fallback: try to delete common Firebase database names
    const commonDbNames = [
      'firebaseLocalStorageDb',
      'firebaseLocalStorage',
      'firebase-auth',
      'firebase-installations-database',
    ];

    await Promise.all(
      commonDbNames.map((dbName) => {
        return new Promise<void>((resolve) => {
          try {
            const deleteRequest = window.indexedDB.deleteDatabase(dbName);
            deleteRequest.onsuccess = () => resolve();
            deleteRequest.onerror = () => resolve();
            deleteRequest.onblocked = () => resolve();
          } catch {
            resolve();
          }
        });
      })
    );
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { setTheme } = useTheme();
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [profile, setProfileState] = useState<ApiUser | null>(getCachedProfile);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  
  const lastTokenRef = useRef<string | null>(null);
  const activeSyncPromiseRef = useRef<Promise<void> | null>(null);

  const setProfile = useCallback((p: ApiUser | null) => {
    setProfileState(p);
    if (p) localStorage.setItem('roomcanvas-profile-cache', JSON.stringify(p));
    else localStorage.removeItem('roomcanvas-profile-cache');
  }, []);

  const syncBackendUser = useCallback((fbUser: User) => {
    if (activeSyncPromiseRef.current) return activeSyncPromiseRef.current;

    const promise = (async () => {
      setIsSyncing(true);
      setSyncError(null);
      let attempts = 0;

      while (attempts < 3) {
        try {
          const data = await api.post<ApiUser>('/auth/sync', { 
            display_name: fbUser.displayName ?? undefined 
          });
          setProfile(data);
          if (data.theme_preference) {
            setTheme(data.theme_preference as any);
          }
          setSyncError(null);
          return;
        } catch (err: any) {
          attempts++;
          const status = err?.status ?? err?.response?.status ?? 0;

          if (status === 0) {
            setSyncError('Network offline. Working from cache.');
            return;
          }

          if (status === 401 || status === 403) {
            if (attempts === 1) {
              continue;
            } else if (attempts === 2) {
              try { 
                const newToken = await fbUser.getIdToken(true);
                lastTokenRef.current = newToken;
              } catch (_) {}
              continue;
            } else {
              await firebaseSignOut(firebaseAuth);
              setUser(null);
              setProfile(null);
              lastTokenRef.current = null;
              return;
            }
          }

          if (attempts >= 3) {
            setSyncError(parseSyncError(err));
            return;
          }

          await new Promise(resolve => setTimeout(resolve, 800));
        }
      }
    })().finally(() => {
      setIsSyncing(false);
      activeSyncPromiseRef.current = null;
    });

    activeSyncPromiseRef.current = promise;
    return promise;
  }, [setProfile, setTheme]);

  useEffect(() => {
    getRedirectResult(firebaseAuth).catch(() => {});

    const unsubscribe = onIdTokenChanged(firebaseAuth, async (fbUser) => {
      setUser(fbUser);
      if (fbUser) {
        try {
          const token = await fbUser.getIdToken();
          if (token === lastTokenRef.current) return;
          lastTokenRef.current = token;
          syncBackendUser(fbUser);
        } catch (err) {}

        const pending = useAuthModalStore.getState().consumePendingAction();
        if (pending) {
          useAuthModalStore.getState().close();
          window.dispatchEvent(new CustomEvent('roomcanvas:resume-action', { detail: pending }));
        }
      } else {
        setProfile(null);
        setIsSyncing(false);
        setSyncError(null);
        lastTokenRef.current = null;
        activeSyncPromiseRef.current = null;
      }
    });
    return unsubscribe;
  }, [syncBackendUser]);

  useEffect(() => {
    const handleOnline = () => {
      if (user && syncError) syncBackendUser(user);
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [user, syncError, syncBackendUser]);

  // Reload user on window focus to sync email verification status
  useEffect(() => {
    const onFocus = () => firebaseAuth.currentUser?.reload().then(() => {
      setUser(firebaseAuth.currentUser);  // triggers VerificationBanner re-check
    });
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  const withPersistence = async (remember: boolean) => {
    await setPersistence(firebaseAuth, remember ? browserLocalPersistence : browserSessionPersistence);
  };

  const signUpWithEmail = useCallback(async ({ name, email, password, remember }: any) => {
    try {
      await withPersistence(remember);
      const cred = await createUserWithEmailAndPassword(firebaseAuth, email, password);
      if (name) await updateProfile(cred.user, { displayName: name });

      // TEMPORARILY DISABLED — Firebase project isn't actually delivering
      // verification emails right now. Re-enable once email sending is fixed
      // (check Firebase Console → Authentication → Templates → sender config,
      // and that you're not hitting the free-tier daily email quota).
      //
      // try {
      //   await sendEmailVerification(cred.user, {
      //     url: `${window.location.origin}/auth/action`
      //   });
      // } catch (e) {
      //   console.error('Failed to send verification email on signup', e);
      // }

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
      // If popup is blocked or closed, fall back to redirect flow
      if (err?.code === 'auth/popup-blocked' || err?.code === 'auth/popup-closed-by-user') {
        await signInWithRedirect(firebaseAuth, googleProvider);
        // User will be redirected away; result comes back via getRedirectResult on mount
        return null;
      }
      
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
    // TEMPORARILY DISABLED — see note in signUpWithEmail above.
    return;
    // if (!firebaseAuth.currentUser) throw new Error('Not authenticated');
    // try {
    //   await sendEmailVerification(firebaseAuth.currentUser, {
    //     url: `${window.location.origin}/auth/action`
    //   });
    // } catch (err: any) {
    //   throw new Error(friendlyError(err));
    // }
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
    const currentUser = firebaseAuth.currentUser;
    if (!currentUser) throw new Error('Not authenticated');

    // 1. Delete backend user and all related data
    try {
      await api.del('/auth/me');
    } catch (err: any) {
      // If user doesn't exist in backend (404), continue with Firebase cleanup
      if (err?.status !== 404) {
        throw new Error(friendlyError(err));
      }
    }

    // 2. Delete Firebase Authentication user
    try {
      await deleteUser(currentUser);
    } catch (err: any) {
      // If user not found in Firebase, continue with cleanup
      if (err?.code !== 'auth/user-not-found') {
        throw new Error(friendlyError(err));
      }
    }

    // 3. Sign out from Firebase
    try {
      await firebaseSignOut(firebaseAuth);
    } catch {}

    // 4. Clear all query caches
    queryClient.clear();
    
    // 5. Clear all local state
    setProfile(null);
    setUser(null);
    setSyncError(null);
    lastTokenRef.current = null;
    activeSyncPromiseRef.current = null;

    // 6. Clear all browser storage (localStorage, sessionStorage, IndexedDB, caches)
    await clearBrowserSessionState();
    
    // Account successfully deleted - caller should handle navigation
  }, [queryClient, setProfile]);

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

  const signOut = useCallback(async () => {
    await firebaseSignOut(firebaseAuth);
    queryClient.clear();   // wipe every cached query — next sign-in starts clean
    setProfile(null);
    setUser(null);
    setSyncError(null);
    lastTokenRef.current = null;
    activeSyncPromiseRef.current = null;
  }, [queryClient]);

  // Derive the semantic auth state
  const isLoading = user === undefined;
  const isAuthenticated = !!user;

  const authState: AuthState =
    isLoading ? 'initializing' :
    !isAuthenticated ? 'guest' :
    (isSyncing && !profile) ? 'syncing' :
    (profile && !profile.profile_completed) ? 'onboarding' :
    (profile) ? 'authenticated' : 'syncing';

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
