import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { AuthLayout } from '../components/auth/AuthLayout';
import { PasswordField } from '../components/auth/PasswordField';
import { Button } from '../components/primitives/Button';
import { toast } from '../lib/toast';
import { usePasswordStrength } from '../hooks/usePasswordStrength';
import styles from './AuthForm.module.css';

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
        <h2 className={styles.title}>Invalid Reset Link</h2>
        <p className={styles.subtitle}>This link appears to be broken or has already been used.</p>
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
      <h2 className={styles.title}>Set new password</h2>
      <p className={styles.subtitle}>Enter your new password below.</p>

      <form onSubmit={handleSubmit} className={styles.form}>
        <PasswordField value={password} onChange={setPassword} showStrength id="new-password" />
        <PasswordField value={confirm} onChange={setConfirm} label="Confirm new password" id="confirm-password" />

        <Button type="submit" size="lg" className="w-full" loading={submitting}>Save password</Button>
      </form>
    </AuthLayout>
  );
}

export default ResetPasswordPage;
