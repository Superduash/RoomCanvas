import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useAuthModalStore } from '../../auth/authModalStore';
import { useAuth } from '../../auth/AuthProvider';
import { SocialAuthButton } from './SocialAuthButton';
import { PasswordField } from './PasswordField';
import { Button } from '../primitives/Button';
import { toast } from '../../lib/toast';

export function AuthModal() {
  const { isOpen, close } = useAuthModalStore();
  const { signInWithEmail, signInWithGoogle, signUpWithEmail } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);

  // Prevent background scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    try {
      if (mode === 'signin') {
        await signInWithEmail({ email, password, remember });
      } else {
        await signUpWithEmail({ name, email, password, remember });
      }
      // Close modal — AppShell will redirect to the correct page after backend sync
      close();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    try {
      await signInWithGoogle(remember);
      // Close modal — AppShell will redirect to the correct page after backend sync
      close();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <div 
          className="fixed inset-0 z-[9999]" 
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            paddingTop: 'max(1rem, env(safe-area-inset-top))',
            paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
            paddingLeft: 'max(1rem, env(safe-area-inset-left))',
            paddingRight: 'max(1rem, env(safe-area-inset-right))',
          }}
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={close}
            aria-hidden="true"
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full bg-surface border border-border shadow-2xl rounded-2xl"
            style={{
              maxWidth: '28rem',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-modal-title"
          >
            <div className="sticky top-0 right-0 z-10 flex justify-end p-4 bg-gradient-to-b from-surface to-transparent pointer-events-none">
              <button
                onClick={close}
                className="pointer-events-auto p-2 text-text-tertiary hover:text-text-primary rounded-full hover:bg-surface-alt/80 backdrop-blur-sm transition-colors touch-manipulation active:scale-95"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" strokeWidth={2} />
              </button>
            </div>

            <div className="px-6 pb-8 -mt-12">
              <div className="mb-6">
                <h2 id="auth-modal-title" className="text-2xl font-semibold text-text-primary tracking-tight mb-2">
                  {mode === 'signin' ? 'Sign in' : 'Create an account'}
                </h2>
                <p className="text-sm text-text-secondary">
                  {mode === 'signin' ? (
                    <>
                      Don't have an account?{' '}
                      <button onClick={() => setMode('signup')} className="text-accent font-semibold hover:underline touch-manipulation">
                        Sign up
                      </button>
                    </>
                  ) : (
                    <>
                      Already have an account?{' '}
                      <button onClick={() => setMode('signin')} className="text-accent font-semibold hover:underline touch-manipulation">
                        Sign in
                      </button>
                    </>
                  )}
                </p>
              </div>

              <SocialAuthButton loading={loading} onClick={handleGoogle} />

              <div className="flex items-center gap-4 my-6">
                <div className="flex-1 h-px bg-border"></div>
                <span className="text-[13px] text-text-tertiary font-medium">or email</span>
                <div className="flex-1 h-px bg-border"></div>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {mode === 'signup' && (
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="modal-name" className="text-[13px] font-semibold text-text-primary">Name</label>
                    <input
                      id="modal-name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="w-full px-3.5 py-2.5 border border-border rounded-lg bg-surface text-[15px] text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-all shadow-sm"
                      autoComplete="name"
                    />
                  </div>
                )}
                
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="modal-email" className="text-[13px] font-semibold text-text-primary">Email</label>
                  <input
                    id="modal-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 border border-border rounded-lg bg-surface text-[15px] text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-all shadow-sm"
                    autoComplete="email"
                  />
                </div>

                <PasswordField 
                  value={password} 
                  onChange={setPassword} 
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                />
                
                {mode === 'signin' && (
                  <div className="flex items-center justify-between mt-1 mb-2">
                    <label className="flex items-center gap-2 cursor-pointer select-none touch-manipulation">
                      <input 
                        type="checkbox" 
                        checked={remember} 
                        onChange={(e) => setRemember(e.target.checked)} 
                        className="w-4 h-4 rounded border-border text-accent focus:ring-accent focus:ring-offset-surface cursor-pointer"
                      />
                      <span className="text-[14px] text-text-secondary font-medium">Remember me</span>
                    </label>
                    <button 
                      type="button"
                      onClick={() => {
                        close();
                        window.location.href = '/forgot-password';
                      }}
                      className="text-[14px] text-accent font-semibold hover:underline touch-manipulation"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}

                <Button 
                  type="submit" 
                  size="lg" 
                  className="w-full mt-2 touch-manipulation active:scale-[0.98]" 
                  loading={loading}
                  disabled={loading}
                >
                  {mode === 'signin' ? 'Sign in' : 'Create account'}
                </Button>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}
