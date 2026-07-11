import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { AuthLayout } from '../components/auth/AuthLayout';
import { SocialAuthButton } from '../components/auth/SocialAuthButton';
import { PasswordField } from '../components/auth/PasswordField';
import { Button } from '../components/primitives/Button';
import { toast } from '../lib/toast';
import styles from './AuthForm.module.css';

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
      <h2 className={styles.title}>Sign in</h2>
      <p className={styles.subtitle}>
        Don't have an account? <Link to="/signup" className={styles.link}>Sign up</Link>
      </p>

      <SocialAuthButton loading={googleLoading} onClick={handleGoogle} />

      <div className={styles.divider}><span>or continue with email</span></div>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.field}>
          <label htmlFor="email" className={styles.label}>Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            className={styles.input}
          />
        </div>

        <PasswordField value={password} onChange={setPassword} autoComplete="current-password" />

        <div className={styles.rowBetween}>
          <label className={styles.checkboxRow}>
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
            <span>Remember me</span>
          </label>
          <Link to="/forgot-password" className={styles.link}>Forgot password?</Link>
        </div>

        <Button type="submit" size="lg" className="w-full" loading={submitting}>Sign in</Button>
      </form>
    </AuthLayout>
  );
}

export default SignInPage;
