import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { AuthLayout } from '../components/auth/AuthLayout';
import { SocialAuthButton } from '../components/auth/SocialAuthButton';
import { PasswordField } from '../components/auth/PasswordField';
import { Button } from '../components/primitives/Button';
import { toast } from '../lib/toast';
import { usePasswordStrength } from '../hooks/usePasswordStrength';
import styles from './AuthForm.module.css';

export function SignUpPage() {
  const navigate = useNavigate();
  const { signUpWithEmail, signInWithGoogle } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const strength = usePasswordStrength(password);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Please enter your name.';
    if (!/^\\S+@\\S+\\.\\S+$/.test(email)) e.email = 'Enter a valid email address.';
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
      toast.success('Welcome to RoomCanvas!');
      navigate('/upload');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    try {
      const user = await signInWithGoogle(true);
      if (user) { toast.success('Welcome to RoomCanvas!'); navigate('/upload'); }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <AuthLayout
      panelTitle="Design smarter, not from scratch."
      panelSubtitle="Create a free account to save your redesigns, refine them anytime, and pick up where you left off."
    >
      <h2 className={styles.title}>Create your account</h2>
      <p className={styles.subtitle}>
        Already have one? <Link to="/signin" className={styles.link}>Sign in</Link>
      </p>

      <SocialAuthButton loading={googleLoading} onClick={handleGoogle} />

      <div className={styles.divider}><span>or continue with email</span></div>

      <form onSubmit={handleSubmit} className={styles.form} noValidate>
        <div className={styles.field}>
          <label htmlFor="name" className={styles.label}>Full name</label>
          <input id="name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" className={styles.input} required />
          {errors.name && <p className={styles.error}>{errors.name}</p>}
        </div>

        <div className={styles.field}>
          <label htmlFor="email" className={styles.label}>Email</label>
          <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" className={styles.input} required />
          {errors.email && <p className={styles.error}>{errors.email}</p>}
        </div>

        <PasswordField value={password} onChange={setPassword} showStrength id="new-password" />
        {errors.password && <p className={styles.error}>{errors.password}</p>}

        <PasswordField value={confirm} onChange={setConfirm} label="Confirm password" id="confirm-password" />
        {errors.confirm && <p className={styles.error}>{errors.confirm}</p>}

        <label className={styles.checkboxRow}>
          <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
          <span>I agree to the <Link to="/terms" className={styles.link}>Terms of Service</Link> and <Link to="/privacy" className={styles.link}>Privacy Policy</Link>.</span>
        </label>
        {errors.agreed && <p className={styles.error}>{errors.agreed}</p>}

        <Button type="submit" size="lg" className="w-full" loading={submitting}>Create account</Button>
      </form>
    </AuthLayout>
  );
}

export default SignUpPage;
