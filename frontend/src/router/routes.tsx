import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { Skeleton } from '../components/primitives/Skeleton';
import { RequireAuth } from '../auth/RequireAuth';

// Route-level code splitting
const LandingPage   = lazy(() => import('../pages/LandingPage').then(m => ({ default: m.LandingPage })));
const UploadPage    = lazy(() => import('../pages/UploadPage').then(m => ({ default: m.UploadPage })));
const AnalysisPage  = lazy(() => import('../pages/AnalysisPage').then(m => ({ default: m.AnalysisPage })));
const ResultsPage   = lazy(() => import('../pages/ResultsPage').then(m => ({ default: m.ResultsPage })));
const HistoryPage   = lazy(() => import('../pages/HistoryPage').then(m => ({ default: m.HistoryPage })));
const NotFoundPage  = lazy(() => import('../pages/NotFoundPage').then(m => ({ default: m.NotFoundPage })));

// Auth pages
const SignUpPage         = lazy(() => import('../pages/SignUpPage'));
const SignInPage         = lazy(() => import('../pages/SignInPage'));
const ForgotPasswordPage = lazy(() => import('../pages/ForgotPasswordPage'));
const ResetPasswordPage  = lazy(() => import('../pages/ResetPasswordPage'));

function PageLoader() {
  return (
    <div className="flex flex-col gap-3 mx-auto max-w-content px-5 py-16">
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-4 w-64" />
      <Skeleton className="h-64 w-full rounded-xl mt-4" />
    </div>
  );
}

export const router = createBrowserRouter([
  {
    path: '/signup',
    element: (
      <Suspense fallback={<PageLoader />}>
        <SignUpPage />
      </Suspense>
    ),
  },
  {
    path: '/signin',
    element: (
      <Suspense fallback={<PageLoader />}>
        <SignInPage />
      </Suspense>
    ),
  },
  {
    path: '/forgot-password',
    element: (
      <Suspense fallback={<PageLoader />}>
        <ForgotPasswordPage />
      </Suspense>
    ),
  },
  {
    path: '/reset-password',
    element: (
      <Suspense fallback={<PageLoader />}>
        <ResetPasswordPage />
      </Suspense>
    ),
  },
  {
    path: '/',
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
            <RequireAuth>
              <UploadPage />
            </RequireAuth>
          </Suspense>
        ),
      },
      {
        path: 'analysis/:analysisId',
        element: (
          <Suspense fallback={<PageLoader />}>
            <RequireAuth>
              <AnalysisPage />
            </RequireAuth>
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
