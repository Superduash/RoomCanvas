import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { AuthLayout } from '../components/auth/AuthLayout';
import { PasswordField } from '../components/auth/PasswordField';
import { Button } from '../components/primitives/Button';
import { toast } from '../lib/toast';
import { usePasswordStrength } from '../hooks/usePasswordStrength';

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const oobCode = params.get('oobCode');
  const navigate = useNavigate();
  const { confirmReset } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const strength = usePasswordStrength(password);

  if (!oobCode) {
    return (
      <AuthLayout panelTitle="Invalid link." panelSubtitle="This password reset link is invalid or missing.">
        <div className="flex flex-col mb-8">
          <h2 className="text-3xl font-semibold text-text-primary tracking-tight mb-2">Invalid Reset Link</h2>
          <p className="text-[15px] text-text-secondary">This link appears to be broken or has already been used.</p>
        </div>
        <Button variant="primary" className="w-full" onClick={() => navigate('/forgot-password')}>Request a new link</Button>
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
      toast.success('Password updated successfully! You can now sign in.');
      navigate('/signin');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout panelTitle="Choose a new password." panelSubtitle="Make sure it's at least 8 characters long and contains a mix of letters and numbers.">
      <div className="flex flex-col mb-8">
        <h2 className="text-3xl font-semibold text-text-primary tracking-tight mb-2">Set new password</h2>
        <p className="text-[15px] text-text-secondary">Enter your new password below.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <PasswordField value={password} onChange={setPassword} showStrength id="new-password" />
        <PasswordField value={confirm} onChange={setConfirm} label="Confirm new password" id="confirm-password" />

        <Button type="submit" size="lg" className="w-full mt-2" loading={submitting}>Save password</Button>
      </form>
    </AuthLayout>
  );
}

export default ResetPasswordPage;
