import { useState } from 'react';
import { useAuth } from '../../auth/AuthProvider';
import { AlertCircle, X, Loader2 } from 'lucide-react';
import { toast } from '../../lib/toast';

export function VerificationBanner() {
  const { user, sendVerification } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  // Only show if logged in, email is NOT verified, and banner is not dismissed
  if (!user || user.emailVerified || dismissed) {
    return null;
  }

  const handleResend = async () => {
    if (sending || sent) return;
    setSending(true);
    try {
      await sendVerification();
      setSent(true);
      toast.success('Verification email sent! Please check your inbox.');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-accent/10 border-b border-accent/20 px-4 py-3 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-content flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-accent flex-shrink-0" aria-hidden="true" />
          <p className="text-[14px] font-medium text-accent">
            Please verify your email address to fully secure your account.
          </p>
        </div>
        <div className="flex items-center gap-4 flex-shrink-0">
          <button
            onClick={handleResend}
            disabled={sending || sent}
            className="text-[13px] font-bold text-accent hover:text-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 focus-visible:outline-none focus-visible:shadow-focus rounded-md px-2 py-1"
          >
            {sending ? <Loader2 size={14} className="animate-spin" /> : null}
            {sent ? 'Email Sent' : 'Resend Email'}
          </button>
          <button
            type="button"
            className="p-1 text-accent/70 hover:text-accent transition-colors hover:bg-accent/10 rounded-md focus-visible:outline-none focus-visible:shadow-focus"
            onClick={() => setDismissed(true)}
            aria-label="Dismiss verification banner"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
