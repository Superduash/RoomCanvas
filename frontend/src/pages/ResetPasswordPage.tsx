import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { AuthLayout } from '../components/auth/AuthLayout';
import { PasswordField } from '../components/auth/PasswordField';
import { Button } from '../components/primitives/Button';
import { toast } from '../lib/toast';
import { getFriendlyApiError } from '../utils/errors';
import { CheckCircle2 } from 'lucide-react';
import { usePasswordStrength } from '../hooks/usePasswordStrength';

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const oobCode = params.get('oobCode');
  const navigate = useNavigate();
  const { confirmReset } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const strength = usePasswordStrength(password);

  if (!oobCode) {
    return (
      <AuthLayout panelTitle="Invalid link." panelSubtitle="This password reset link is invalid or missing.">
        <div className="flex flex-col mb-8">
          <h2 className="text-2xl font-semibold text-text-primary tracking-tight mb-2">Invalid Reset Link</h2>
          <p className="text-[14px] text-text-secondary leading-relaxed">This link appears to be broken or has already been used.</p>
        </div>
        <Button variant="primary" size="lg" className="w-full h-11 text-[15px]" onClick={() => navigate('/forgot-password')}>Request a new link</Button>
      </AuthLayout>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!strength.isAcceptable) {
      toast.error('Please choose a stronger password.');
      return;
    }
    if (password !== confirm) {
      toast.error('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      await confirmReset(oobCode, password);
      setDone(true);
      setTimeout(() => navigate('/signin'), 3000);
    } catch (err: any) {
      toast.error(getFriendlyApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <AuthLayout panelTitle="All set." panelSubtitle="Your password has been successfully updated.">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mb-6">
            <CheckCircle2 size={32} className="text-success" />
          </div>
          <h2 className="text-2xl font-semibold text-text-primary tracking-tight mb-3">Password Updated</h2>
          <p className="text-[14px] text-text-secondary mb-8">You will be redirected to sign in shortly.</p>
          <Button variant="primary" size="lg" className="w-full h-11 text-[15px]" onClick={() => navigate('/signin')}>Continue to sign in</Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout panelTitle="Choose a new password." panelSubtitle="Make sure it's at least 8 characters long and contains a mix of letters and numbers.">
      <div className="flex flex-col mb-8">
        <h2 className="text-2xl font-semibold text-text-primary tracking-tight mb-2">Set new password</h2>
        <p className="text-[14px] text-text-secondary leading-relaxed">Enter your new password below.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-2 relative">
        <PasswordField 
          id="new-password" 
          value={password} 
          onChange={setPassword} 
          showStrength 
          placeholder="Create a new secure password" 
        />
        <PasswordField 
          id="confirm-password" 
          label="Confirm new password" 
          value={confirm} 
          onChange={setConfirm} 
          placeholder="Re-enter your password" 
        />

        <Button type="submit" size="lg" className="w-full h-11 text-[15px] mt-2" loading={submitting}>Save password</Button>
      </form>
    </AuthLayout>
  );
}

export default ResetPasswordPage;
