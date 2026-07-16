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
                background: '#ffffff',
                color: '#1a1a1a',
                border: '1px solid #e5e7eb',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: '500',
                boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
                padding: '10px 14px',
                maxWidth: '380px',
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
