import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { router } from './router/routes';
import { AuthProvider } from './auth/AuthProvider';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ThemeProvider } from './hooks/useTheme';
import { useEffect } from 'react';
import { api, ApiError } from './api/client';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (failureCount, error) => {
        if (error instanceof ApiError && (error.status === 401 || error.status === 403 || error.status === 404)) {
          return false;
        }
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  useEffect(() => {
    // Fire-and-forget warmup ping to wake up free-tier backend (e.g. Render)
    api.get('/health').catch(() => {});
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <RouterProvider router={router} />
          </AuthProvider>
          <Toaster
            position="top-center"
            containerStyle={{ top: 56 }}
            toastOptions={{
              duration: 5000,
              style: {
                background: 'var(--color-surface-raised, #ffffff)',
                color: 'var(--color-text-primary, #1a1a1a)',
                border: '1px solid var(--color-border-strong, #d4d4d8)',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: '500',
                boxShadow: '0 6px 20px rgba(0,0,0,0.16)',
                padding: '8px 12px',
                maxWidth: '340px',
                whiteSpace: 'nowrap',
              },
              success: {
                iconTheme: { primary: '#16A34A', secondary: '#FFFFFF' },
              },
              error: {
                iconTheme: { primary: '#DC2626', secondary: '#FFFFFF' },
              },
            }}
          />
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
