import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Menu, Plus, History, X, Search, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import { Button } from '../primitives/Button';
import { useHealth } from '../../api/queries';

export function TopNav() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const { data: health } = useHealth();

  const hasProviderDown = health && (!health.providers.gemini || !health.providers.replicate);

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'text-sm font-medium transition-colors duration-fast relative py-1',
      isActive
        ? 'text-text-primary after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:rounded-full after:bg-accent'
        : 'text-text-secondary hover:text-text-primary'
    );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/history?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  return (
    <>
      {/* Provider status banner */}
      {hasProviderDown && (
        <div className="bg-warning-subtle border-b border-warning/20 px-4 py-2 text-center text-xs text-warning font-medium">
          {!health.providers.gemini && !health.providers.replicate
            ? 'AI services are currently unavailable — some features may not work.'
            : !health.providers.gemini
            ? 'Room analysis is temporarily unavailable.'
            : 'Image generation is temporarily unavailable.'}
        </div>
      )}

      {/* Main nav */}
      <header
        className="sticky top-0 z-30 bg-surface/95 backdrop-blur-md border-b border-border h-[60px] md:h-[var(--nav-height)]"
      >
        <div className="mx-auto max-w-content h-full flex items-center justify-between px-6">

          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-2 group focus-visible:outline-none focus-visible:shadow-focus rounded-md"
            aria-label="RoomCanvas home"
          >
            <div className="-translate-y-[1px]">
              <RoomCanvasLogoMark size={32} />
            </div>
            <span className="text-[15px] font-semibold text-text-primary tracking-tight group-hover:text-accent transition-colors duration-fast">
              RoomCanvas
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1 ml-6 mr-auto" aria-label="Main navigation">
            <NavLink to="/" className={navLinkClass} end={true}>
              <span className="px-3 py-1.5 block">Home</span>
            </NavLink>
            <NavLink to="/upload" className={navLinkClass} end={false}>
              <span className="px-3 py-1.5 block">New Design</span>
            </NavLink>
            <NavLink to="/history" className={navLinkClass}>
              <span className="px-3 py-1.5 block">Library</span>
            </NavLink>
          </nav>

          {/* Center Search */}
          <form 
            onSubmit={handleSearch}
            className="hidden lg:flex items-center relative mr-6 flex-1 max-w-sm"
          >
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search designs..."
              className="w-full h-9 rounded-lg border border-border bg-surface-alt pl-9 pr-4 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent focus:bg-surface transition-all duration-fast shadow-sm"
              aria-label="Search library"
            />
          </form>

          {/* Desktop actions */}
          <div className="hidden md:flex items-center gap-3">
            <Link to="/upload">
              <Button size="sm" variant="primary" icon={<Plus className="h-3.5 w-3.5" />}>
                New Design
              </Button>
            </Link>
            <Button size="icon" variant="ghost" className="text-text-secondary" title="Settings (Coming soon)">
              <Settings className="h-4 w-4" />
            </Button>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden h-9 w-9 flex items-center justify-center rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-alt transition-colors duration-fast focus-visible:outline-none focus-visible:shadow-focus"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation menu"
            aria-expanded={mobileOpen}
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Mobile overlay menu */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMobileOpen(false)}
              aria-hidden="true"
            />
            <motion.div
              className="fixed right-0 top-0 z-50 h-dvh w-72 bg-surface border-l border-border shadow-xl md:hidden flex flex-col"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.25, ease: [0, 0, 0.2, 1] }}
              role="dialog"
              aria-label="Navigation menu"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <Link
                  to="/"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2"
                >
                  <div className="-translate-y-[1px]">
                    <RoomCanvasLogoMark size={32} />
                  </div>
                  <span className="text-sm font-semibold text-text-primary tracking-tight">RoomCanvas</span>
                </Link>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="h-8 w-8 flex items-center justify-center rounded-lg text-text-secondary hover:bg-surface-alt transition-colors duration-fast"
                  aria-label="Close menu"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Nav links */}
              <nav className="flex flex-col gap-1 p-4 flex-1" aria-label="Mobile navigation">
                <MobileNavLink to="/" label="Home" onClick={() => setMobileOpen(false)} />
                <MobileNavLink to="/upload" label="New Design" icon={<Plus className="h-4 w-4" />} onClick={() => setMobileOpen(false)} />
                <MobileNavLink to="/history" label="Library" icon={<History className="h-4 w-4" />} onClick={() => setMobileOpen(false)} />
                <div className="mt-4 px-3">
                  <form onSubmit={(e) => { handleSearch(e); setMobileOpen(false); }} className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary pointer-events-none" />
                    <input
                      type="search"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search designs..."
                      className="w-full h-10 rounded-lg border border-border bg-surface-alt pl-9 pr-4 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                  </form>
                </div>
              </nav>

              {/* CTA */}
              <div className="p-4 border-t border-border">
                <Link to="/upload" onClick={() => setMobileOpen(false)} className="block">
                  <Button size="md" variant="primary" className="w-full" icon={<Plus className="h-4 w-4" />}>
                    Start New Design
                  </Button>
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function MobileNavLink({ to, label, icon, onClick }: { to: string; label: string; icon?: React.ReactNode; onClick: () => void }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-fast',
          isActive
            ? 'bg-accent-subtle text-accent'
            : 'text-text-secondary hover:bg-surface-alt hover:text-text-primary'
        )
      }
    >
      {icon && <span aria-hidden="true">{icon}</span>}
      {label}
    </NavLink>
  );
}

/* ── Logo mark — using dedicated UI assets ── */
export function RoomCanvasLogoMark({ size = 32 }: { size?: number }) {
  return (
    <img
      src="/branding/logo.svg"
      alt="RoomCanvas Logo"
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className="object-contain flex-shrink-0"
    />
  );
}
