import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Menu, Plus, History, X, Settings, Sun, Moon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import { Button } from '../primitives/Button';
import { useAuth } from '../../auth/AuthProvider';
import { useHealth } from '../../api/queries';
import { useTheme } from '../../hooks/useTheme';
import { GlobalSearch } from './GlobalSearch';
import { Skeleton } from '../primitives/Skeleton';

export function TopNav() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const { user, profile, signOut, isLoading, syncError } = useAuth();
  const { data: health } = useHealth();
  const { theme, toggleTheme } = useTheme();

  const hasProviderDown = health && (!health.providers.gemini || !health.providers.replicate);

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'text-[13px] font-medium transition-colors duration-fast px-3 py-1.5 rounded-md',
      isActive
        ? 'text-text-primary bg-surface-alt'
        : 'text-text-secondary hover:text-text-primary hover:bg-surface-alt/50'
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
      
      {syncError && (
        <div className="bg-warning-subtle border-b border-warning/20 px-4 py-2 text-center text-xs text-warning font-medium">
          {syncError}
        </div>
      )}

      {/* Main nav */}
      <header className="sticky top-0 z-30 bg-surface/80 backdrop-blur-xl border-b border-border h-14 w-full">
        <div className="mx-auto max-w-content h-full flex items-center justify-between px-4 md:px-6 gap-4">
          
          {/* Left: Logo & Nav */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Logo */}
            <Link
              to="/"
              className="flex items-center gap-2.5 group focus-visible:outline-none focus-visible:shadow-focus rounded-lg py-1.5 pr-2"
              aria-label="RoomCanvas home"
            >
              <RoomCanvasLogoMark size={24} />
              <span className="text-[14px] font-semibold text-text-primary tracking-tight group-hover:text-accent transition-colors duration-base">
                RoomCanvas
              </span>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-1 ml-4" aria-label="Main navigation">
              <NavLink to="/" className={navLinkClass} end={true}>
                Home
              </NavLink>
              <NavLink to="/history" className={navLinkClass}>
                Library
              </NavLink>
            </nav>
          </div>

          {/* Center Search */}
          {user && (
            <div className="hidden lg:flex flex-1 justify-center max-w-[400px]">
              <GlobalSearch />
            </div>
          )}

          {/* Right: Desktop actions */}
          <div className="hidden md:flex items-center justify-end gap-2 shrink-0 ml-auto">
            {isLoading ? (
              <div className="flex items-center gap-2 mr-2">
                <Skeleton className="h-8 w-16 rounded-md" />
                <Skeleton className="h-8 w-24 rounded-md" />
              </div>
            ) : user ? (
              <div className="relative flex items-center gap-2">
                <button 
                  onClick={() => setAvatarMenuOpen(!avatarMenuOpen)}
                  className="flex items-center gap-2 focus-visible:outline-none focus-visible:shadow-focus rounded-full pl-1 pr-3 py-1 hover:bg-surface-alt border border-transparent hover:border-border transition-all duration-base h-8"
                >
                  <img 
                    src={profile?.photo_url || user.photoURL || 'https://www.gravatar.com/avatar/?d=mp'} 
                    alt="Profile" 
                    className="h-6 w-6 rounded-full shadow-xs" 
                    referrerPolicy="no-referrer" 
                  />
                  <span className="text-[13px] font-medium text-text-primary max-w-[100px] truncate">
                    {profile?.display_name || user.email?.split('@')[0]}
                  </span>
                </button>
                <AnimatePresence>
                  {avatarMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setAvatarMenuOpen(false)} />
                      <motion.div 
                        initial={{ opacity: 0, y: -5, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -5, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 top-full mt-1.5 w-48 bg-surface border border-border rounded-lg shadow-lg z-50 overflow-hidden"
                      >
                        <div className="p-1 flex flex-col">
                          <Link to="/profile" onClick={() => setAvatarMenuOpen(false)} className="w-full text-left px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-alt rounded-md transition-colors duration-base">
                            Profile
                          </Link>
                          <Link to="/settings" onClick={() => setAvatarMenuOpen(false)} className="w-full text-left px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-alt rounded-md transition-colors duration-base">
                            Settings
                          </Link>
                          <button 
                            onClick={() => { setAvatarMenuOpen(false); signOut(); }}
                            className="w-full text-left px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-alt rounded-md transition-colors duration-base"
                          >
                            Sign Out
                          </button>
                        </div>
                        <div className="border-t border-border px-4 py-2 bg-surface-alt/50">
                          <p className="text-xs text-text-tertiary truncate" title={user.email || ''}>
                            {user.email}
                          </p>
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
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
            
            <Button 
              size="sm" 
              variant="ghost" 
              className="w-8 p-0 text-text-secondary" 
              onClick={toggleTheme}
              title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
              aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
              icon={
                <motion.div
                  initial={false}
                  animate={{ rotate: theme === 'dark' ? 180 : 0 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                >
                  {theme === 'light' ? (
                    <Moon className="h-4 w-4" />
                  ) : (
                    <Sun className="h-4 w-4" />
                  )}
                </motion.div>
              }
            />
            
            <Link to="/upload">
              <Button size="sm" variant="primary" icon={<Plus className="h-3.5 w-3.5" />}>
                New Design
              </Button>
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden h-8 w-8 flex items-center justify-center rounded-md text-text-secondary hover:text-text-primary hover:bg-surface-alt transition-colors duration-base focus-visible:outline-none focus-visible:shadow-focus ml-auto"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation menu"
            aria-expanded={mobileOpen}
          >
            <Menu className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Mobile overlay menu */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
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
                {user && (
                  <div className="mt-3 px-2">
                    <GlobalSearch isMobile onNavigate={() => setMobileOpen(false)} />
                  </div>
                )}
              </nav>

              {/* CTA */}
              <div className="p-3 border-t border-border flex flex-col gap-2">
                <button
                  onClick={toggleTheme}
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-base text-text-secondary hover:bg-surface-alt hover:text-text-primary"
                >
                  <motion.div
                    initial={false}
                    animate={{ rotate: theme === 'dark' ? 180 : 0 }}
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    className="flex-shrink-0"
                  >
                    {theme === 'light' ? (
                      <Moon className="h-[18px] w-[18px]" />
                    ) : (
                      <Sun className="h-[18px] w-[18px]" />
                    )}
                  </motion.div>
                  {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
                </button>
                
                {isLoading ? (
                  <div className="flex flex-col gap-2 p-1">
                    <Skeleton className="h-10 w-full rounded-md" />
                    <Skeleton className="h-10 w-full rounded-md" />
                  </div>
                ) : user ? (
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
                <Link to="/upload" onClick={() => setMobileOpen(false)} className="block mt-1">
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
