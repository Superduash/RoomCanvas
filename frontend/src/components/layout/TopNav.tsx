import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Menu, Plus, History, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import { Button } from '../primitives/Button';
import { useHealth } from '../../api/queries';

export function TopNav() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: health } = useHealth();

  const hasProviderDown = health && (!health.providers.gemini || !health.providers.replicate);

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'text-sm font-medium transition-colors duration-fast relative py-1',
      isActive
        ? 'text-text-primary after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:rounded-full after:bg-accent'
        : 'text-text-secondary hover:text-text-primary'
    );

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
        className="sticky top-0 z-30 bg-surface/95 backdrop-blur-md border-b border-border"
        style={{ height: 'var(--nav-height)' }}
      >
        <div className="mx-auto max-w-content h-full flex items-center justify-between px-6">

          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-2.5 group focus-visible:outline-none focus-visible:shadow-focus rounded-md"
            aria-label="RoomCanvas home"
          >
            <RoomCanvasLogoMark />
            <span className="text-[15px] font-semibold text-text-primary tracking-tight group-hover:text-accent transition-colors duration-fast">
              RoomCanvas
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
            <NavLink to="/upload" className={navLinkClass} end={false}>
              <span className="px-3 py-1.5 block">New Design</span>
            </NavLink>
            <NavLink to="/history" className={navLinkClass}>
              <span className="px-3 py-1.5 block">History</span>
            </NavLink>
          </nav>

          {/* Desktop actions */}
          <div className="hidden md:flex items-center gap-2">
            <span className="text-xs text-text-tertiary border border-border rounded-md px-2 py-1 font-mono hidden lg:block select-none">
              ⌘K
            </span>
            <Link to="/upload">
              <Button size="sm" variant="primary" icon={<Plus className="h-3.5 w-3.5" />}>
                New Design
              </Button>
            </Link>
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
                  <RoomCanvasLogoMark size={24} />
                  <span className="text-sm font-semibold text-text-primary">RoomCanvas</span>
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
                <MobileNavLink to="/history" label="History" icon={<History className="h-4 w-4" />} onClick={() => setMobileOpen(false)} />
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

/* ── Logo mark — using the official logo asset ── */
export function RoomCanvasLogoMark({ size = 28 }: { size?: number }) {
  return (
    <img
      src="/logo.png"
      alt="RoomCanvas Logo"
      width={size}
      height={size}
      className="object-contain"
    />
  );
}
