import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { AuthLayout } from '../components/auth/AuthLayout';
import { SocialAuthButton } from '../components/auth/SocialAuthButton';
import { Button } from '../components/primitives/Button';
import { toast } from '../lib/toast';
import { PasswordField } from '../components/auth/PasswordField';

export function SignInPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signInWithEmail, signInWithGoogle } = useAuth();
  
  const from = location.state?.from?.pathname || '/upload';

  const [email, setEmail] = useState('');
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
      navigate(from, { replace: true });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    try {
      const user = await signInWithGoogle(remember);
      if (user) navigate(from, { replace: true });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <AuthLayout
      panelTitle="Welcome back."
      panelSubtitle="Pick up where you left off. Access your saved designs and continue refining."
    >
      <div className="flex flex-col mb-8">
        <h2 className="text-3xl font-semibold text-text-primary tracking-tight mb-2">Sign in</h2>
        <p className="text-[15px] text-text-secondary">
          Don't have an account? <Link to="/signup" className="text-accent font-semibold hover:underline">Sign up</Link>
        </p>
      </div>

      <SocialAuthButton loading={googleLoading} onClick={handleGoogle} />

      <div className="flex items-center gap-4 my-8">
        <div className="flex-1 h-px bg-border"></div>
        <span className="text-[13px] text-text-tertiary font-medium">or continue with email</span>
        <div className="flex-1 h-px bg-border"></div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-[13px] font-semibold text-text-primary">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            className="w-full px-3.5 py-2.5 border border-border rounded-lg bg-surface text-[15px] text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-all shadow-sm"
          />
        </div>

        <PasswordField value={password} onChange={setPassword} autoComplete="current-password" />

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
          <Link to="/forgot-password" className="text-[14px] text-accent font-semibold hover:underline">Forgot password?</Link>
        </div>

        <Button type="submit" size="lg" className="w-full" loading={submitting}>Sign in</Button>
      </form>
    </AuthLayout>
  );
}

export default SignInPage;
