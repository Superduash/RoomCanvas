import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { AuthLayout } from '../components/auth/AuthLayout';
import { SocialAuthButton } from '../components/auth/SocialAuthButton';
import { Button } from '../components/primitives/Button';
import { Input } from '../components/primitives/Input';
import { toast } from '../lib/toast';
import { PasswordField } from '../components/auth/PasswordField';

export function SignInPage() {
  const location = useLocation();
  const { signInWithEmail, signInWithGoogle } = useAuth();
  // We don't navigate manually — AppShell will redirect to the right place
  // once the backend sync finishes and the auth state is resolved.

  const [email, setEmail] = useState(location.state?.email || '');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!email || !password) return;
    setSubmitting(true);
    try {
      await signInWithEmail({ email, password, remember });
      toast.success('Welcome back!');
      // AppShell will route to the correct page once backend sync finishes
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    try {
      const result = await signInWithGoogle(remember);
      // If result is null, we're in redirect flow - page will navigate away
      if (result) {
        toast.success('Welcome back!');
      }
      // AppShell will route to the correct page once backend sync finishes
    } catch (err: any) {
      toast.error(err.message);
      setGoogleLoading(false);
    }
    // Don't setGoogleLoading(false) if redirect happened - page is navigating away
  };

  return (
    <AuthLayout
      panelTitle="Welcome back."
      panelSubtitle="Pick up where you left off. Access your saved designs and continue refining."
    >
      <div className="flex flex-col mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl font-semibold text-text-primary tracking-tight mb-1">Sign in</h2>
        <p className="text-sm text-text-secondary">
          Don't have an account? <Link to="/signup" className="text-accent font-semibold hover:underline">Sign up</Link>
        </p>
      </div>

      <SocialAuthButton loading={googleLoading} onClick={handleGoogle} />

      <div className="flex items-center gap-3 my-5">
        <div className="flex-1 h-px bg-border-strong/50"></div>
        <span className="text-[11px] text-text-tertiary font-semibold uppercase tracking-wider">or email</span>
        <div className="flex-1 h-px bg-border-strong/50"></div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        <Input
          id="email"
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          placeholder="name@example.com"
          required
        />

        <PasswordField 
          value={password} 
          onChange={setPassword} 
          autoComplete="current-password" 
          placeholder="Enter your password" 
        />

        <div className="flex items-center justify-between mt-0.5 mb-1">
          <label className="flex items-center gap-2 cursor-pointer select-none group touch-manipulation">
            <input 
              type="checkbox" 
              checked={remember} 
              onChange={(e) => setRemember(e.target.checked)} 
              className="w-4 h-4 rounded border-border text-accent focus:ring-2 focus:ring-accent/30 focus:ring-offset-0 cursor-pointer transition-colors"
            />
            <span className="text-sm text-text-secondary font-medium group-hover:text-text-primary transition-colors">Remember me</span>
          </label>
          <Link to="/forgot-password" className="text-sm text-text-secondary font-medium hover:text-accent transition-colors touch-manipulation">Forgot password?</Link>
        </div>

        <Button type="submit" size="lg" className="w-full h-11 text-[15px] mt-1 touch-manipulation active:scale-[0.98]" loading={submitting}>Sign in</Button>
      </form>
    </AuthLayout>
  );
}

export default SignInPage;
