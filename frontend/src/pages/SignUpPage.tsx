import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { AuthLayout } from '../components/auth/AuthLayout';
import { SocialAuthButton } from '../components/auth/SocialAuthButton';
import { Button } from '../components/primitives/Button';
import { Input } from '../components/primitives/Input';
import { toast } from '../lib/toast';
import { getFriendlyApiError } from '../utils/errors';
import { PasswordField } from '../components/auth/PasswordField';
import { usePasswordStrength } from '../hooks/usePasswordStrength';

export function SignUpPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signUpWithEmail, signInWithGoogle, profile, isSyncing } = useAuth();
  const from = location.state?.from?.pathname || '/upload';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [awaitingSync, setAwaitingSync] = useState(false);

  const strength = usePasswordStrength(password);

  // Navigate once profile loads after auth
  useEffect(() => {
    if (!awaitingSync || isSyncing || !profile) return;
    navigate(profile.profile_completed ? from : '/setup', { 
      state: { from: { pathname: from } }, 
      replace: true 
    });
  }, [awaitingSync, isSyncing, profile, from, navigate]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Please enter your name.';
    if (!/^\S+@\S+\.\S+$/.test(email)) e.email = 'Enter a valid email address.';
    if (!strength.isAcceptable) e.password = 'Use at least 8 characters, mixing letters, numbers, or symbols.';
    if (confirm !== password) e.confirm = "Passwords don't match.";
    if (!agreed) e.agreed = 'You must accept the Terms to continue.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      await signUpWithEmail({ name, email, password, remember: true });
      toast.success('Account created! Welcome to RoomCanvas.');
      setAwaitingSync(true);
    } catch (err: any) {
      if (err.message === 'An account with this email already exists.') {
        toast.error('Account already exists. Please sign in.');
      } else {
        toast.error(getFriendlyApiError(err));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    try {
      const result = await signInWithGoogle(true);
      // If result is null, we're in redirect flow - page will navigate away
      if (result) {
        toast.success('Welcome to RoomCanvas!');
        setAwaitingSync(true);
      }
    } catch (err: any) {
      toast.error(getFriendlyApiError(err));
      setGoogleLoading(false);
    }
    // Don't setGoogleLoading(false) if redirect happened - page is navigating away
  };

  return (
    <AuthLayout
      panelTitle="Design your first room in minutes."
      panelSubtitle="Join RoomCanvas to start transforming your spaces instantly."
    >
      <div className="flex flex-col mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl font-semibold text-text-primary tracking-tight mb-1">Sign up</h2>
        <p className="text-sm text-text-secondary">
          Already have an account? <Link to="/signin" className="text-accent font-semibold hover:underline">Sign in</Link>
        </p>
      </div>

      <SocialAuthButton loading={googleLoading} onClick={handleGoogle} />

      <div className="flex items-center gap-3 my-5">
        <div className="flex-1 h-px bg-border-strong/50"></div>
        <span className="text-[11px] text-text-tertiary font-semibold uppercase tracking-wider">or email</span>
        <div className="flex-1 h-px bg-border-strong/50"></div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3 relative">
        <Input
          id="name"
          label="Full Name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
          placeholder="John Doe"
          error={errors.name}
          required
        />

        <Input
          id="email"
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          placeholder="name@example.com"
          error={errors.email}
          required
        />

        <PasswordField 
          id="new-password" 
          value={password} 
          onChange={setPassword} 
          showStrength 
          placeholder="8+ characters"
          error={errors.password}
        />

        <PasswordField 
          id="confirm-password" 
          label="Confirm password" 
          value={confirm} 
          onChange={setConfirm} 
          placeholder="Re-enter your password"
          error={errors.confirm}
        />

        <div className="flex flex-col mt-1 mb-2">
          <label htmlFor="terms-agreed" className="flex items-start gap-2 cursor-pointer select-none group touch-manipulation">
            <input 
              id="terms-agreed"
              name="terms-agreed"
              type="checkbox" 
              checked={agreed} 
              onChange={(e) => setAgreed(e.target.checked)} 
              className="w-4 h-4 mt-0.5 rounded border-border text-accent focus:ring-2 focus:ring-accent/30 focus:ring-offset-0 cursor-pointer shrink-0 transition-colors"
            />
            <span className="text-sm text-text-secondary leading-relaxed group-hover:text-text-primary transition-colors">
              I agree to the <Link to="/terms" className="text-text-primary font-medium hover:underline">Terms of Service</Link> and{' '}
              <Link to="/privacy" className="text-text-primary font-medium hover:underline">Privacy Policy</Link>
            </span>
          </label>
          {errors.agreed && <p className="text-xs text-danger mt-1.5 pl-6" role="alert">{errors.agreed}</p>}
        </div>

        <Button type="submit" size="lg" className="w-full h-11 text-[15px] touch-manipulation active:scale-[0.98]" loading={submitting}>Create account</Button>
      </form>
    </AuthLayout>
  );
}

export default SignUpPage;
