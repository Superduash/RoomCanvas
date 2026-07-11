import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Menu, Plus, History, X, Search, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import { Button } from '../primitives/Button';
import { useAuth } from '../../auth/AuthProvider';
import { useHealth } from '../../api/queries';

export function TopNav() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const { data: health } = useHealth();

  const hasProviderDown = health && (!health.providers.gemini || !health.providers.replicate);

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'text-[13px] font-medium transition-all duration-base relative px-0.5',
      isActive
        ? 'text-text-primary after:absolute after:bottom-[-4px] after:left-0 after:right-0 after:h-[2px] after:rounded-full after:bg-accent after:transition-all after:duration-base'
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
        className="sticky top-0 z-30 bg-surface/97 backdrop-blur-md border-b border-border shadow-xs h-14 md:h-16"
      >
        <div className="mx-auto max-w-content h-full flex items-center justify-between px-4 md:px-6">
          
          {/* Left: Logo & Nav */}
          <div className="flex items-center gap-6 md:gap-8 shrink-0">
            {/* Logo */}
            <Link
              to="/"
              className="flex items-center gap-2.5 group focus-visible:outline-none focus-visible:shadow-focus rounded-lg -ml-1 pl-1 pr-2 py-1.5 -my-1.5"
              aria-label="RoomCanvas home"
            >
              <RoomCanvasLogoMark size={28} />
              <span className="text-[15px] font-semibold text-text-primary tracking-[-0.01em] group-hover:text-accent transition-colors duration-base">
                RoomCanvas
              </span>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-6 lg:gap-7" aria-label="Main navigation">
              <NavLink to="/" className={navLinkClass} end={true}>
                Home
              </NavLink>
              <NavLink to="/upload" className={navLinkClass} end={false}>
                New Design
              </NavLink>
              <NavLink to="/history" className={navLinkClass}>
                Library
              </NavLink>
            </nav>
          </div>

          {/* Center Search */}
          <div className="hidden lg:flex flex-1 justify-center px-6 xl:px-8 max-w-[480px]">
            <form 
              onSubmit={handleSearch}
              className="relative w-full"
            >
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary pointer-events-none" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search designs..."
                className="w-full h-9 rounded-lg border border-border bg-surface-alt/60 pl-9 pr-3.5 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-border-strong focus:bg-surface focus:shadow-xs transition-all duration-base"
                aria-label="Search library"
              />
            </form>
          </div>

          {/* Right: Desktop actions */}
          <div className="hidden md:flex items-center justify-end gap-2 shrink-0">
            {user ? (
              <div className="relative group">
                <button className="flex items-center gap-2 focus-visible:outline-none focus-visible:shadow-focus rounded-lg px-2 py-1.5 hover:bg-surface-alt transition-colors duration-base">
                  <img 
                    src={profile?.photo_url || user.photoURL || 'https://www.gravatar.com/avatar/?d=mp'} 
                    alt="Profile" 
                    className="h-7 w-7 rounded-full border border-border/60 shadow-xs" 
                    referrerPolicy="no-referrer" 
                  />
                  <span className="text-sm font-medium text-text-primary max-w-[120px] truncate">{profile?.display_name || user.email?.split('@')[0]}</span>
                </button>
                <div className="absolute right-0 top-full mt-1.5 w-44 bg-surface border border-border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-base z-50">
                  <div className="p-1">
                    <button 
                      onClick={() => signOut()}
                      className="w-full text-left px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-alt rounded-md transition-colors duration-base"
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/signin">
                  <Button variant="ghost" size="sm">Log in</Button>
                </Link>
                <Link to="/signup">
                  <Button variant="secondary" size="sm">Sign up free</Button>
                </Link>
              </div>
            )}
            <div className="w-px h-6 bg-border mx-1" aria-hidden="true" />
            <Link to="/upload">
              <Button size="md" variant="primary" icon={<Plus className="h-4 w-4" />}>
                New Design
              </Button>
            </Link>
            <Button size="icon" variant="ghost" className="text-text-secondary" title="Settings (Coming soon)">
              <Settings className="h-[18px] w-[18px]" />
            </Button>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden h-9 w-9 flex items-center justify-center rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-alt transition-colors duration-base focus-visible:outline-none focus-visible:shadow-focus ml-auto"
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
              transition={{ type: 'tween', duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              role="dialog"
              aria-label="Navigation menu"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3.5 border-b border-border">
                <Link
                  to="/"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2.5"
                >
                  <RoomCanvasLogoMark size={26} />
                  <span className="text-sm font-semibold text-text-primary tracking-[-0.01em]">RoomCanvas</span>
                </Link>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="h-8 w-8 flex items-center justify-center rounded-lg text-text-secondary hover:bg-surface-alt transition-colors duration-base"
                  aria-label="Close menu"
                >
                  <X className="h-[18px] w-[18px]" />
                </button>
              </div>

              {/* Nav links */}
              <nav className="flex flex-col gap-0.5 p-3 flex-1" aria-label="Mobile navigation">
                <MobileNavLink to="/" label="Home" onClick={() => setMobileOpen(false)} />
                <MobileNavLink to="/upload" label="New Design" icon={<Plus className="h-[18px] w-[18px]" />} onClick={() => setMobileOpen(false)} />
                <MobileNavLink to="/history" label="Library" icon={<History className="h-[18px] w-[18px]" />} onClick={() => setMobileOpen(false)} />
                <div className="mt-3 px-2">
                  <form onSubmit={(e) => { handleSearch(e); setMobileOpen(false); }} className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary pointer-events-none" />
                    <input
                      type="search"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search designs..."
                      className="w-full h-9 rounded-lg border border-border bg-surface-alt/60 pl-9 pr-3 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-border-strong focus:bg-surface transition-all duration-base"
                    />
                  </form>
                </div>
              </nav>

              {/* CTA */}
              <div className="p-3 border-t border-border flex flex-col gap-2">
                {user ? (
                  <Button size="md" variant="secondary" className="w-full" onClick={() => { setMobileOpen(false); signOut(); }}>
                    Sign Out
                  </Button>
                ) : (
                  <div className="flex flex-col gap-2">
                    <Link to="/signin" onClick={() => setMobileOpen(false)} className="block">
                      <Button size="md" variant="secondary" className="w-full">Log in</Button>
                    </Link>
                    <Link to="/signup" onClick={() => setMobileOpen(false)} className="block">
                      <Button size="md" variant="primary" className="w-full">Sign up free</Button>
                    </Link>
                  </div>
                )}
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
          'flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-base',
          isActive
            ? 'bg-accent-subtle text-accent shadow-xs'
            : 'text-text-secondary hover:bg-surface-alt hover:text-text-primary'
        )
      }
    >
      {icon && <span aria-hidden="true" className="flex-shrink-0">{icon}</span>}
      {label}
    </NavLink>
  );
}

/* ── Logo mark — using dedicated UI assets ── */
export function RoomCanvasLogoMark({ size = 28 }: { size?: number }) {
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
