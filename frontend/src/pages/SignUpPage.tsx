import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { AuthLayout } from '../components/auth/AuthLayout';
import { SocialAuthButton } from '../components/auth/SocialAuthButton';
import { Button } from '../components/primitives/Button';
import { toast } from '../lib/toast';
import { PasswordField } from '../components/auth/PasswordField';
import { usePasswordStrength } from '../hooks/usePasswordStrength';

export function SignUpPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signUpWithEmail, signInWithGoogle } = useAuth();
  
  const from = location.state?.from?.pathname || '/upload';

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
      const user = await signInWithGoogle(true);
      if (user) { toast.success('Welcome to RoomCanvas!'); navigate(from, { replace: true }); }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <AuthLayout
      panelTitle="Design your first room in minutes."
      panelSubtitle="Join RoomCanvas to start transforming your spaces instantly."
    >
      <div className="flex flex-col mb-2">
        <h2 className="text-xl font-semibold text-text-primary tracking-tight mb-0.5">Sign up</h2>
        <p className="text-[13px] text-text-secondary">
          Already have an account? <Link to="/signin" className="text-accent font-semibold hover:underline">Sign in</Link>
        </p>
      </div>

      <SocialAuthButton loading={googleLoading} onClick={handleGoogle} />

      <div className="flex items-center gap-4 my-3">
        <div className="flex-1 h-px bg-border"></div>
        <span className="text-[12px] text-text-tertiary font-medium uppercase tracking-wider">or email</span>
        <div className="flex-1 h-px bg-border"></div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
        <div className="flex flex-col gap-1">
          <label htmlFor="name" className="text-[13px] font-semibold text-text-primary">Full Name</label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            required
            className="w-full px-3 py-1.5 border border-border rounded-lg bg-surface text-[14px] text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-all shadow-sm"
          />
          {errors.name && <p className="text-[12px] text-danger -mt-0.5">{errors.name}</p>}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="email" className="text-[13px] font-semibold text-text-primary">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            className="w-full px-3 py-1.5 border border-border rounded-lg bg-surface text-[14px] text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-all shadow-sm"
          />
          {errors.email && <p className="text-[12px] text-danger -mt-0.5">{errors.email}</p>}
        </div>

        <PasswordField value={password} onChange={setPassword} showStrength id="new-password" />
        {errors.password && <p className="text-[12px] text-danger -mt-1">{errors.password}</p>}

        <PasswordField value={confirm} onChange={setConfirm} label="Confirm password" id="confirm-password" />
        {errors.confirm && <p className="text-[12px] text-danger -mt-1">{errors.confirm}</p>}

        <label className="flex items-start gap-2 mt-0.5 mb-0.5 cursor-pointer select-none">
          <input 
            type="checkbox" 
            checked={agreed} 
            onChange={(e) => setAgreed(e.target.checked)} 
            className="w-4 h-4 mt-0.5 rounded border-border text-accent focus:ring-accent focus:ring-offset-surface cursor-pointer shrink-0"
          />
          <span className="text-[13px] text-text-secondary leading-snug">
            I agree to the <Link to="/terms" className="text-text-primary hover:underline">Terms of Service</Link> and{' '}
            <Link to="/privacy" className="text-text-primary hover:underline">Privacy Policy</Link>
          </span>
        </label>
        {errors.agreed && <p className="text-[12px] text-danger font-medium -mt-1">{errors.agreed}</p>}

        <Button type="submit" size="md" className="w-full mt-1" loading={submitting}>Create account</Button>
      </form>
    </AuthLayout>
  );
}

export default SignUpPage;
