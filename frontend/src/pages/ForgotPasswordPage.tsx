import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { AuthLayout } from '../components/auth/AuthLayout';
import { Button } from '../components/primitives/Button';
import { toast } from '../lib/toast';
import styles from './AuthForm.module.css';
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
        <div className={styles.confirmBox}>
          <MailCheck size={48} className="text-accent" />
          <h2 className={styles.title}>Check your email</h2>
          <p className={styles.subtitle}>We sent a password reset link to <strong>{email}</strong>.</p>
          <Button variant="outline" className="w-full" onClick={() => setDone(false)}>Try another email</Button>
          <Link to="/signin" className={styles.link} style={{ alignSelf: 'center', marginTop: '16px' }}>Return to sign in</Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout panelTitle="Reset your password." panelSubtitle="Enter the email associated with your account and we'll send you a link to reset your password.">
      <h2 className={styles.title}>Forgot password?</h2>
      <p className={styles.subtitle}>No worries, we'll send you reset instructions.</p>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.field}>
          <label htmlFor="email" className={styles.label}>Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className={styles.input}
          />
        </div>

        <Button type="submit" size="lg" className="w-full" loading={submitting}>Reset password</Button>
        <Link to="/signin" className={styles.link} style={{ textAlign: 'center', marginTop: '8px' }}>Back to sign in</Link>
      </form>
    </AuthLayout>
  );
}

export default ForgotPasswordPage;
