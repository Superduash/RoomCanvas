import { Outlet } from 'react-router-dom';
import { TopNav } from './TopNav';
import { Footer } from './Footer';
import { CommandPalette } from '../command/CommandPalette';
import { ScrollToTop } from '../../router/ScrollToTop';

export function AppShell() {
  return (
    <div className="min-h-screen flex flex-col bg-bg">
      {/* Skip to main content */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2.5 focus:text-sm focus:font-medium focus:text-white focus:shadow-lg"
      >
        Skip to main content
      </a>

      <ScrollToTop />
      <TopNav />

      <main id="main-content" className="flex-1 flex flex-col" tabIndex={-1}>
        <Outlet />
      </main>

      <Footer />
      <CommandPalette />
    </div>
  );
}
