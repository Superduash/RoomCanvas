import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { AuthLayout } from '../components/auth/AuthLayout';
import { Button } from '../components/primitives/Button';
import { toast } from '../lib/toast';
import { MailCheck } from 'lucide-react';

export function ForgotPasswordPage() {
  const { sendReset } = useAuth();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSubmitting(true);
    try {
      await sendReset(email);
      setDone(true);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <AuthLayout panelTitle="Check your inbox." panelSubtitle="We've sent you a secure link to reset your password.">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mb-6">
            <MailCheck size={32} className="text-accent" />
          </div>
          <h2 className="text-3xl font-semibold text-text-primary tracking-tight mb-3">Check your email</h2>
          <p className="text-[15px] text-text-secondary mb-8">We sent a password reset link to <strong className="text-text-primary font-semibold">{email}</strong>.</p>
          <Button variant="outline" className="w-full mb-4" onClick={() => setDone(false)}>Try another email</Button>
          <Link to="/signin" className="text-[14px] text-accent font-semibold hover:underline">Return to sign in</Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout panelTitle="Reset your password." panelSubtitle="Enter the email associated with your account and we'll send you a link to reset your password.">
      <div className="flex flex-col mb-8">
        <h2 className="text-3xl font-semibold text-text-primary tracking-tight mb-2">Forgot password?</h2>
        <p className="text-[15px] text-text-secondary">No worries, we'll send you reset instructions.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
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

        <div className="flex flex-col gap-4">
          <Button type="submit" size="lg" className="w-full" loading={submitting}>Reset password</Button>
          <Link to="/signin" className="text-[14px] text-text-secondary font-medium text-center hover:text-text-primary transition-colors">
            Back to sign in
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}

export default ForgotPasswordPage;
