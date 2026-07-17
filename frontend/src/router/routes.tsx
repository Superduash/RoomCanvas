import { lazy, Suspense } from 'react';
import { createBrowserRouter, useRouteError } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { Skeleton } from '../components/primitives/Skeleton';
import { RequireAuth } from '../auth/RequireAuth';
import { AlertTriangle } from 'lucide-react';
import { Button } from '../components/primitives/Button';

// Route-level code splitting
const LandingPage   = lazy(() => import('../pages/LandingPage').then(m => ({ default: m.LandingPage })));
const UploadPage    = lazy(() => import('../pages/UploadPage').then(m => ({ default: m.UploadPage })));
const AnalysisPage  = lazy(() => import('../pages/AnalysisPage').then(m => ({ default: m.AnalysisPage })));
const ResultsPage   = lazy(() => import('../pages/ResultsPage').then(m => ({ default: m.ResultsPage })));
const HistoryPage   = lazy(() => import('../pages/HistoryPage').then(m => ({ default: m.HistoryPage })));
const ProfilePage   = lazy(() => import('../pages/ProfilePage').then(m => ({ default: m.ProfilePage })));
const SettingsPage  = lazy(() => import('../pages/SettingsPage').then(m => ({ default: m.SettingsPage })));
const NotFoundPage  = lazy(() => import('../pages/NotFoundPage').then(m => ({ default: m.NotFoundPage })));
const LiveMeasurePage = lazy(() => import('../pages/LiveMeasurePage').then(m => ({ default: m.LiveMeasurePage })));
// Static pages
const AboutPage     = lazy(() => import('../pages/AboutPage'));
const TermsPage     = lazy(() => import('../pages/TermsPage'));
const PrivacyPage   = lazy(() => import('../pages/PrivacyPage'));
const ContactPage   = lazy(() => import('../pages/ContactPage'));

// Auth pages
const SignUpPage         = lazy(() => import('../pages/SignUpPage'));
const SignInPage         = lazy(() => import('../pages/SignInPage'));
const ForgotPasswordPage = lazy(() => import('../pages/ForgotPasswordPage'));
const ResetPasswordPage  = lazy(() => import('../pages/ResetPasswordPage'));
const AuthActionPage     = lazy(() => import('../pages/AuthActionPage'));
const SetupProfilePage   = lazy(() => import('../pages/SetupProfilePage'));

function PageLoader() {
  return (
    <div className="flex flex-col gap-3 mx-auto max-w-content px-5 py-16">
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-4 w-64" />
      <Skeleton className="h-64 w-full rounded-xl mt-4" />
    </div>
  );
}

function RouterErrorBoundary() {
  const error = useRouteError();
  
  const errorMessage = error instanceof Error ? error.message.toLowerCase() : '';
  const isChunkError = 
    errorMessage.includes('failed to fetch dynamically imported module') || 
    errorMessage.includes('importing a module script failed') ||
    (error instanceof TypeError && errorMessage.includes('fetch'));

  if (isChunkError) {
    const isReloaded = sessionStorage.getItem('chunk_reload');
    if (!isReloaded) {
      sessionStorage.setItem('chunk_reload', 'true');
      window.location.reload();
      return <PageLoader />;
    }
  }
  
  // Otherwise, clear reload flag and show standard error UI
  sessionStorage.removeItem('chunk_reload');
  
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center bg-bg">
      <AlertTriangle size={40} strokeWidth={1.75} className="text-danger" aria-hidden="true" />
      <h1 className="text-xl font-semibold text-text-primary">App Update Available</h1>
      <p className="max-w-sm text-sm text-text-secondary">
        We just pushed a new update to RoomCanvas. Please refresh the page to continue.
      </p>
      <Button onClick={async () => {
        if ('serviceWorker' in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          await Promise.all(registrations.map(r => r.unregister()));
        }
        if ('caches' in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map(k => caches.delete(k)));
        }
        window.location.href = '/';
      }}>
        Refresh Page
      </Button>
    </div>
  );
}

export const router = createBrowserRouter([
  {
    path: '/signup',
    errorElement: <RouterErrorBoundary />,
    element: (
      <Suspense fallback={<PageLoader />}>
        <SignUpPage />
      </Suspense>
    ),
  },
  {
    path: '/signin',
    errorElement: <RouterErrorBoundary />,
    element: (
      <Suspense fallback={<PageLoader />}>
        <SignInPage />
      </Suspense>
    ),
  },
  {
    path: '/forgot-password',
    errorElement: <RouterErrorBoundary />,
    element: (
      <Suspense fallback={<PageLoader />}>
        <ForgotPasswordPage />
      </Suspense>
    ),
  },
  {
    path: '/reset-password',
    errorElement: <RouterErrorBoundary />,
    element: (
      <Suspense fallback={<PageLoader />}>
        <ResetPasswordPage />
      </Suspense>
    ),
  },
  {
    path: '/auth/action',
    errorElement: <RouterErrorBoundary />,
    element: (
      <Suspense fallback={<PageLoader />}>
        <AuthActionPage />
      </Suspense>
    ),
  },
  {
    path: '/setup',
    errorElement: <RouterErrorBoundary />,
    element: (
      <RequireAuth>
        <Suspense fallback={<PageLoader />}>
          <SetupProfilePage />
        </Suspense>
      </RequireAuth>
    ),
  },
  {
    path: '/',
    errorElement: <RouterErrorBoundary />,
    element: <AppShell />,
    children: [
      {
        index: true,
        element: (
          <Suspense fallback={<PageLoader />}>
            <LandingPage />
          </Suspense>
        ),
      },
      {
        path: 'upload',
        element: (
          <Suspense fallback={<PageLoader />}>
            <UploadPage />
          </Suspense>
        ),
      },
      {
        path: 'analysis',
        element: (
          <Suspense fallback={<PageLoader />}>
            <AnalysisPage />
          </Suspense>
        ),
      },
      {
        path: 'results/:projectId',
        element: (
          <Suspense fallback={<PageLoader />}>
            <RequireAuth>
              <ResultsPage />
            </RequireAuth>
          </Suspense>
        ),
      },
      {
        path: 'history',
        element: (
          <Suspense fallback={<PageLoader />}>
            <RequireAuth>
              <HistoryPage />
            </RequireAuth>
          </Suspense>
        ),
      },
      {
        path: 'profile',
        element: (
          <Suspense fallback={<PageLoader />}>
            <RequireAuth>
              <ProfilePage />
            </RequireAuth>
          </Suspense>
        ),
      },
      {
        path: 'settings',
        element: (
          <Suspense fallback={<PageLoader />}>
            <RequireAuth>
              <SettingsPage />
            </RequireAuth>
          </Suspense>
        ),
      },
      {
        path: 'about',
        element: (
          <Suspense fallback={<PageLoader />}>
            <AboutPage />
          </Suspense>
        ),
      },
      {
        path: 'terms',
        element: (
          <Suspense fallback={<PageLoader />}>
            <TermsPage />
          </Suspense>
        ),
      },
      {
        path: 'privacy',
        element: (
          <Suspense fallback={<PageLoader />}>
            <PrivacyPage />
          </Suspense>
        ),
      },
      {
        path: 'contact',
        element: (
          <Suspense fallback={<PageLoader />}>
            <ContactPage />
          </Suspense>
        ),
      },
      {
        path: 'measure-live',
        element: (
          <Suspense fallback={<PageLoader />}>
            <RequireAuth>
              <LiveMeasurePage />
            </RequireAuth>
          </Suspense>
        ),
      },
      {
        path: '*',
        element: (
          <Suspense fallback={<PageLoader />}>
            <NotFoundPage />
          </Suspense>
        ),
      },
    ],
  },
]);
