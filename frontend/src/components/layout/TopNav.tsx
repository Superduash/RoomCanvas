import { useState, useRef, useEffect } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Menu, Plus, History, X, Sun, Moon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import { Button } from '../primitives/Button';
import { useAuth } from '../../auth/AuthProvider';
import { useUserKeys } from '../../api/queries';
import { useTheme } from '../../hooks/useTheme';
import { GlobalSearch } from './GlobalSearch';
import { Skeleton } from '../primitives/Skeleton';
import FocusTrap from 'focus-trap-react';
import { useClickOutside } from '../../hooks/useClickOutside';
import { toast } from '../../lib/toast';

export function TopNav() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  const { user, profile, signOut, isLoading, syncError } = useAuth();
  const { data: keys, isLoading: keysLoading } = useUserKeys();
  const { activeTheme: theme, toggleTheme } = useTheme();

  const getMissingConfig = () => {
    if (!profile) return null;
    const activeText = profile.active_text_provider;
    const activeImage = profile.active_image_provider;

    const SettingsLink = () => (
      <Link
        to="/settings#api-keys"
        className="ml-2 inline-flex items-center h-5 px-2 text-[11px] font-semibold rounded bg-orange-700 text-white hover:bg-orange-800 transition-colors"
      >
        Set up →
      </Link>
    );

    if (!activeText && !activeImage) {
      return (
        <span className="flex items-center justify-center gap-1">
          ⚠️ Add your API keys and select analysis + generation providers to start designing.
          <SettingsLink />
        </span>
      );
    }

    if (!activeText) {
      return (
        <span className="flex items-center justify-center gap-1">
          No analysis provider selected — add an API key and pick one to continue.
          <SettingsLink />
        </span>
      );
    }

    if (!activeImage) {
      return (
        <span className="flex items-center justify-center gap-1">
          No generation provider selected — add an API key and pick one to continue.
          <SettingsLink />
        </span>
      );
    }

    if (keys && !keysLoading) {
      const hasTextKey = keys.some(k => k.provider === activeText);
      const hasImageKey = keys.some(k => k.provider === activeImage);

      if (!hasTextKey || !hasImageKey) {
        return (
          <span className="flex items-center justify-center gap-1">
            Missing API key for your selected provider.
            <SettingsLink />
          </span>
        );
      }
    }

    return null;
  };

  const missingConfigMessage = getMissingConfig();

  const avatarMenuRef = useRef<HTMLDivElement>(null);
  useClickOutside(avatarMenuRef as React.RefObject<HTMLElement>, () => setAvatarMenuOpen(false));

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'text-[13px] font-medium transition-all duration-fast px-3 h-8 flex items-center rounded-md cursor-pointer select-none relative',
      isActive
        ? 'text-text-primary bg-surface-alt shadow-xs after:absolute after:bottom-0 after:left-3 after:right-3 after:h-[2px] after:rounded-full after:bg-accent'
        : 'text-text-secondary hover:text-text-primary hover:bg-surface-alt/60'
    );


  return (
    <>
      {/* Provider status banner */}
      {missingConfigMessage && (
        <div className="bg-orange-100 dark:bg-orange-950/40 border-b border-orange-200 dark:border-orange-900/50 px-4 py-1.5 text-center text-xs text-orange-800 dark:text-orange-300 font-medium w-full">
          {missingConfigMessage}
        </div>
      )}
      
      {syncError && (
        <div className="bg-warning-subtle border-b border-warning/20 px-4 py-2 text-center text-xs text-warning font-medium">
          {syncError}
        </div>
      )}

      {/* Main nav */}
      <header className="sticky top-0 z-30 bg-surface-raised/75 backdrop-blur-[16px] border-b border-black/5 dark:border-white/5 h-12 sm:h-14 w-full transition-colors duration-base select-none">
        <div className="mx-auto max-w-content h-full flex items-center justify-between px-3 sm:px-4 md:px-6 gap-3 sm:gap-4">
          
          {/* Left: Logo & Nav */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Logo */}
            <Link
              to="/"
              className="flex items-center gap-2 group focus-visible:outline-none focus-visible:shadow-focus rounded-lg py-1 pr-1.5 cursor-pointer select-none"
              aria-label="RoomCanvas home"
            >
              <div className="transition-transform duration-base group-hover:rotate-[-4deg]">
                <RoomCanvasLogoMark size={22} />
              </div>
              <span className="text-[13px] sm:text-sm font-semibold text-text-primary tracking-tight mt-px hidden xs:inline">
                RoomCanvas
              </span>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-0.5 ml-2 sm:ml-4" aria-label="Main navigation">
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
          <div className="hidden md:flex items-center justify-end gap-1.5 shrink-0 ml-auto">
            {isLoading ? (
              <div className="flex items-center gap-2 mr-2">
                <Skeleton className="h-8 w-16 rounded-md" />
                <Skeleton className="h-8 w-24 rounded-md" />
              </div>
            ) : user ? (
              <div className="relative flex items-center gap-1.5" ref={avatarMenuRef}>
                <button 
                  onClick={() => setAvatarMenuOpen(!avatarMenuOpen)}
                  className="flex items-center gap-1.5 focus-visible:outline-none focus-visible:shadow-focus rounded-full pl-0.5 pr-2.5 py-0.5 hover:bg-surface-alt border border-transparent hover:border-border transition-all duration-[180ms] h-8 cursor-pointer select-none"
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
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95, originX: 1, originY: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.15, ease: "easeOut" }}
                      className="absolute right-0 top-full mt-1.5 w-48 bg-surface border border-border rounded-lg shadow-lg z-[100] overflow-hidden"
                    >
                      <div className="p-1 flex flex-col">
                        <Link to="/profile" onClick={() => setAvatarMenuOpen(false)} className="w-full text-left px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-alt rounded-md transition-colors duration-base">
                          Profile
                        </Link>
                        <Link to="/settings" onClick={() => setAvatarMenuOpen(false)} className="w-full text-left px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-alt rounded-md transition-colors duration-base">
                          Settings
                        </Link>
                        <button 
                          onClick={async () => { 
                            setAvatarMenuOpen(false); 
                            await signOut();
                            toast.success('Signed out');
                          }}
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
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-1.5">
                <Link to="/signin">
                  <Button variant="ghost" size="sm">Log in</Button>
                </Link>
                <Link to="/signup">
                  <Button variant="secondary" size="sm">Sign up free</Button>
                </Link>
              </div>
            )}
            
            <button
              onClick={toggleTheme}
              title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
              aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
              className="h-8 w-8 flex items-center justify-center rounded-lg text-text-primary hover:bg-surface-alt transition-colors duration-[180ms] focus-visible:outline-none focus-visible:shadow-focus cursor-pointer select-none ml-0.5"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={theme}
                  initial={{ opacity: 0, rotate: -45, scale: 0.8 }}
                  animate={{ opacity: 1, rotate: 0, scale: 1 }}
                  exit={{ opacity: 0, rotate: 45, scale: 0.8 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center justify-center"
                >
                  {theme === 'light' ? (
                    <Moon className="h-[18px] w-[18px]" strokeWidth={2} />
                  ) : (
                    <Sun className="h-[18px] w-[18px]" strokeWidth={2} />
                  )}
                </motion.div>
              </AnimatePresence>
            </button>
            
            <Link to="/upload">
              <Button size="sm" variant="primary" icon={<Plus className="h-3.5 w-3.5" />}>
                New Design
              </Button>
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden h-9 w-9 flex items-center justify-center rounded-md text-text-secondary hover:text-text-primary hover:bg-surface-alt transition-colors duration-[180ms] focus-visible:outline-none focus-visible:shadow-focus ml-auto cursor-pointer select-none touch-manipulation active:scale-95"
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
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMobileOpen(false)}
              aria-hidden="true"
            />
            <FocusTrap active={mobileOpen}>
              <motion.div
                className="fixed right-0 top-0 z-50 h-dvh w-[280px] bg-surface border-l border-border shadow-xl md:hidden flex flex-col"
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'tween', duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                role="dialog"
                aria-modal="true"
                aria-label="Navigation menu"
              >
                {/* Header */}
                <div className="flex items-center justify-between px-3 py-2.5 border-b border-border shrink-0">
                  <Link
                    to="/"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2"
                  >
                    <RoomCanvasLogoMark size={24} />
                    <span className="text-sm font-semibold text-text-primary tracking-tight">RoomCanvas</span>
                  </Link>
                  <button
                    onClick={() => setMobileOpen(false)}
                    className="h-8 w-8 flex items-center justify-center rounded-lg text-text-secondary hover:bg-surface-alt transition-colors duration-base touch-manipulation active:scale-95"
                    aria-label="Close menu"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Nav links */}
                <nav className="flex flex-col gap-0.5 p-2.5 flex-1 overflow-y-auto" aria-label="Mobile navigation">
                  <MobileNavLink to="/" label="Home" onClick={() => setMobileOpen(false)} />
                  <MobileNavLink to="/upload" label="New Design" icon={<Plus className="h-[18px] w-[18px]" />} onClick={() => setMobileOpen(false)} />
                  <MobileNavLink to="/history" label="Library" icon={<History className="h-[18px] w-[18px]" />} onClick={() => setMobileOpen(false)} />
                  {user && (
                    <>
                      <MobileNavLink to="/profile" label="Profile" onClick={() => setMobileOpen(false)} />
                      <MobileNavLink to="/settings" label="Settings" onClick={() => setMobileOpen(false)} />
                      <div className="mt-2 px-1.5">
                        <GlobalSearch isMobile onNavigate={() => setMobileOpen(false)} />
                      </div>
                    </>
                  )}
                </nav>

                {/* CTA */}
                <div className="p-2.5 border-t border-border flex flex-col gap-2 shrink-0">
                  <button
                    onClick={toggleTheme}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-base text-text-secondary hover:bg-surface-alt hover:text-text-primary touch-manipulation active:scale-[0.98]"
                  >
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.div
                        key={theme}
                        initial={{ opacity: 0, rotate: -45, scale: 0.8 }}
                        animate={{ opacity: 1, rotate: 0, scale: 1 }}
                        exit={{ opacity: 0, rotate: 45, scale: 0.8 }}
                        transition={{ duration: 0.2 }}
                        className="flex-shrink-0"
                      >
                        {theme === 'light' ? (
                          <Moon className="h-[18px] w-[18px]" />
                        ) : (
                          <Sun className="h-[18px] w-[18px]" />
                        )}
                      </motion.div>
                    </AnimatePresence>
                    {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
                  </button>
                  
                  {isLoading ? (
                    <div className="flex flex-col gap-2 p-1">
                      <Skeleton className="h-10 w-full rounded-md" />
                      <Skeleton className="h-10 w-full rounded-md" />
                    </div>
                  ) : user ? (
                    <Button size="md" variant="secondary" className="w-full touch-manipulation active:scale-[0.98]" onClick={async () => { 
                      setMobileOpen(false); 
                      await signOut();
                      toast.success('Signed out');
                    }}>
                      Sign Out
                    </Button>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      <Link to="/signin" onClick={() => setMobileOpen(false)} className="block">
                        <Button size="md" variant="secondary" className="w-full touch-manipulation active:scale-[0.98]">Log in</Button>
                      </Link>
                      <Link to="/signup" onClick={() => setMobileOpen(false)} className="block">
                        <Button size="md" variant="primary" className="w-full touch-manipulation active:scale-[0.98]">Sign up free</Button>
                      </Link>
                    </div>
                  )}
                </div>
              </motion.div>
            </FocusTrap>
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
          'flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium transition-all duration-base touch-manipulation active:scale-[0.98]',
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
