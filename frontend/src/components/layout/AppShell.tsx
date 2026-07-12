import { Outlet, useLocation, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../../auth/AuthProvider';
import { TopNav } from './TopNav';
import { Footer } from './Footer';
import { CommandPalette } from '../command/CommandPalette';
import { ShortcutSheet } from '../command/ShortcutSheet';
import { ScrollToTop } from '../../router/ScrollToTop';
import { AuthModal } from '../auth/AuthModal';
import { VerificationBanner } from '../auth/VerificationBanner';

function useScrollProgress() {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const update = () => {
      const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
      setProgress(scrollHeight > clientHeight ? scrollTop / (scrollHeight - clientHeight) : 0);
    };
    window.addEventListener('scroll', update, { passive: true });
    update();
    return () => window.removeEventListener('scroll', update);
  }, []);
  return progress;
}

export function AppShell() {
  const location = useLocation();
  const scrollProgress = useScrollProgress();
  const { isLoading, isSyncing, isAuthenticated, profile } = useAuth();

  // Block ALL rendering while Firebase is initializing or backend is syncing.
  // This is the single source of truth that prevents flickering and premature routing.
  if (isLoading || isSyncing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <Loader2 size={32} className="animate-spin text-accent" />
      </div>
    );
  }

  // Authenticated users who haven't completed onboarding always go to /setup.
  // Preserve the original "from" location so onboarding can redirect back to it.
  if (isAuthenticated && profile && !profile.profile_completed && location.pathname !== '/setup') {
    console.log('[AppShell] Redirecting to onboarding:', { profile_completed: profile.profile_completed, pathname: location.pathname });
    return <Navigate to="/setup" state={{ from: location }} replace />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-bg">
      {/* Scroll Progress Indicator */}
      <div
        className="fixed top-0 left-0 h-[2px] bg-accent z-[100] transition-all duration-75 ease-out origin-left"
        style={{ width: `${scrollProgress * 100}%` }}
        aria-hidden="true"
      />

      {/* Skip to main content */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2.5 focus:text-sm focus:font-medium focus:text-white focus:shadow-lg"
      >
        Skip to main content
      </a>

      <ScrollToTop />
      <TopNav />
      <VerificationBanner />

      <main id="main-content" className="flex-1 flex flex-col relative" tabIndex={-1}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="flex-1 flex flex-col w-full"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      <Footer />
      <CommandPalette />
      <ShortcutSheet />
      <AuthModal />
    </div>
  );
}
