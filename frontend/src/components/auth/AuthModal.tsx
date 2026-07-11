import { useState } from 'react';
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
      // On success, the AuthProvider's onAuthStateChanged will detect the user
      // and close the modal/resume action automatically.
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
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
            onClick={close}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-surface border border-border shadow-2xl rounded-2xl p-6 md:p-8"
          >
            <button
              onClick={close}
              className="absolute top-4 right-4 p-2 text-text-tertiary hover:text-text-primary rounded-full hover:bg-surface-alt transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-text-primary tracking-tight mb-2">
                {mode === 'signin' ? 'Sign in' : 'Create an account'}
              </h2>
              <p className="text-sm text-text-secondary">
                {mode === 'signin' ? (
                  <>
                    Don't have an account?{' '}
                    <button onClick={() => setMode('signup')} className="text-accent font-semibold hover:underline">
                      Sign up
                    </button>
                  </>
                ) : (
                  <>
                    Already have an account?{' '}
                    <button onClick={() => setMode('signin')} className="text-accent font-semibold hover:underline">
                      Sign in
                    </button>
                  </>
                )}
              </p>
            </div>

            <SocialAuthButton loading={loading} onClick={handleGoogle} />

            <div className="flex items-center gap-4 my-6">
              <div className="flex-1 h-px bg-border"></div>
              <span className="text-[13px] text-text-tertiary font-medium">or continue with email</span>
              <div className="flex-1 h-px bg-border"></div>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {mode === 'signup' && (
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="name" className="text-[13px] font-semibold text-text-primary">Name</label>
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 border border-border rounded-lg bg-surface text-[15px] text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-all shadow-sm"
                  />
                </div>
              )}
              
              <div className="flex flex-col gap-1.5">
                <label htmlFor="email" className="text-[13px] font-semibold text-text-primary">Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 border border-border rounded-lg bg-surface text-[15px] text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-all shadow-sm"
                />
              </div>

              <PasswordField value={password} onChange={setPassword} />
              
              {mode === 'signin' && (
                <div className="flex items-center justify-between mt-1 mb-2">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={remember} 
                      onChange={(e) => setRemember(e.target.checked)} 
                      className="w-4 h-4 rounded border-border text-accent focus:ring-accent focus:ring-offset-surface cursor-pointer"
                    />
                    <span className="text-[14px] text-text-secondary font-medium">Remember me</span>
                  </label>
                  <a href="/forgot-password" onClick={close} className="text-[14px] text-accent font-semibold hover:underline">Forgot password?</a>
                </div>
              )}

              <Button type="submit" size="lg" className="w-full mt-2" loading={loading}>
                {mode === 'signin' ? 'Sign in' : 'Create account'}
              </Button>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
