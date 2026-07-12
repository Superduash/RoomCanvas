import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { AuthLayout } from '../components/auth/AuthLayout';
import { SocialAuthButton } from '../components/auth/SocialAuthButton';
import { Button } from '../components/primitives/Button';
import { Input } from '../components/primitives/Input';
import { toast } from '../lib/toast';
import { PasswordField } from '../components/auth/PasswordField';

export function SignInPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signInWithEmail, signInWithGoogle } = useAuth();
  
  const from = location.state?.from?.pathname || '/upload';

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
      <div className="flex flex-col mb-6">
        <h2 className="text-2xl font-semibold text-text-primary tracking-tight mb-1.5">Sign in</h2>
        <p className="text-[14px] text-text-secondary">
          Don't have an account? <Link to="/signup" className="text-accent font-semibold hover:underline">Sign up</Link>
        </p>
      </div>

      <SocialAuthButton loading={googleLoading} onClick={handleGoogle} />

      <div className="flex items-center gap-4 my-6">
        <div className="flex-1 h-px bg-border-strong/50"></div>
        <span className="text-[12px] text-text-tertiary font-semibold uppercase tracking-wider">or continue with email</span>
        <div className="flex-1 h-px bg-border-strong/50"></div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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

        <div className="flex items-center justify-between mt-1 mb-2">
          <label className="flex items-center gap-2.5 cursor-pointer select-none group">
            <input 
              type="checkbox" 
              checked={remember} 
              onChange={(e) => setRemember(e.target.checked)} 
              className="w-4 h-4 rounded border-border text-accent focus:ring-2 focus:ring-accent/30 focus:ring-offset-0 cursor-pointer transition-colors"
            />
            <span className="text-[14px] text-text-secondary font-medium group-hover:text-text-primary transition-colors">Remember me</span>
          </label>
          <Link to="/forgot-password" className="text-[14px] text-text-secondary font-medium hover:text-accent transition-colors">Forgot password?</Link>
        </div>

        <Button type="submit" size="lg" className="w-full h-11 text-[15px]" loading={submitting}>Sign in</Button>
      </form>
    </AuthLayout>
  );
}

export default SignInPage;
