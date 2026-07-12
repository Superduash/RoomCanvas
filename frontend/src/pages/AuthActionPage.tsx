import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { AuthLayout } from '../components/auth/AuthLayout';
import { Button } from '../components/primitives/Button';
import { firebaseAuth } from '../lib/firebase';
import { applyActionCode, checkActionCode } from 'firebase/auth';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

export function AuthActionPage() {
  const [params] = useSearchParams();
  const mode = params.get('mode');
  const oobCode = params.get('oobCode');
  const navigate = useNavigate();
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [successTitle, setSuccessTitle] = useState('Action Successful');
  const [successMessage, setSuccessMessage] = useState('Your request has been processed.');

  useEffect(() => {
    if (!mode || !oobCode) {
      setStatus('error');
      setErrorMessage('Invalid link. Required parameters are missing.');
      return;
    }

    if (mode === 'resetPassword') {
      navigate(`/reset-password?oobCode=${oobCode}`, { replace: true });
      return;
    }

    const handleAction = async () => {
      try {
        if (mode === 'verifyEmail') {
          await applyActionCode(firebaseAuth, oobCode);
          await firebaseAuth.currentUser?.reload();   // Sync the local emailVerified flag
          setSuccessTitle('Email Verified');
          setSuccessMessage('Your email address has been successfully verified. You can now return to your original tab, or sign in here if you opened this link on a new device.');
        } else if (mode === 'recoverEmail') {
          await checkActionCode(firebaseAuth, oobCode);
          await applyActionCode(firebaseAuth, oobCode);
          await firebaseAuth.currentUser?.reload();
          setSuccessTitle('Email Recovered');
          setSuccessMessage('Your account email has been reverted. We recommend changing your password immediately if you did not authorize this change.');
        } else if (mode === 'verifyAndChangeEmail') {
          await applyActionCode(firebaseAuth, oobCode);
          await firebaseAuth.currentUser?.reload();
          setSuccessTitle('Email Updated');
          setSuccessMessage('Your email address has been successfully updated.');
        } else {
          throw new Error('Unsupported action mode.');
        }
        setStatus('success');
      } catch (err: any) {
        setStatus('error');
        if (err?.code === 'auth/expired-action-code') {
          setErrorMessage('This link has expired. Please request a new one.');
        } else if (err?.code === 'auth/invalid-action-code') {
          setErrorMessage('This link is invalid or has already been used.');
        } else {
          setErrorMessage('Something went wrong verifying this link.');
        }
      }
    };

    handleAction();
  }, [mode, oobCode, navigate]);

  if (status === 'loading') {
    return (
      <AuthLayout panelTitle="Just a moment." panelSubtitle="We're verifying your link...">
        <div className="flex flex-col items-center justify-center text-center py-12">
          <Loader2 size={32} className="animate-spin text-accent mb-6" />
          <h2 className="text-xl font-semibold text-text-primary tracking-tight mb-2">Verifying link...</h2>
          <p className="text-[14px] text-text-secondary">Please wait while we process your request.</p>
        </div>
      </AuthLayout>
    );
  }

  if (status === 'error') {
    return (
      <AuthLayout panelTitle="Verification Failed." panelSubtitle="This link is no longer valid.">
        <div className="flex flex-col items-center justify-center text-center py-6">
          <div className="w-16 h-16 rounded-full bg-danger/10 flex items-center justify-center mb-6">
            <XCircle size={32} className="text-danger" />
          </div>
          <h2 className="text-2xl font-semibold text-text-primary tracking-tight mb-3">Verification Failed</h2>
          <p className="text-[14px] text-text-secondary mb-8">{errorMessage}</p>
          <Button variant="primary" size="lg" className="w-full h-11 text-[15px]" onClick={() => navigate('/')}>Return Home</Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout panelTitle="All set." panelSubtitle="Your account has been updated successfully.">
      <div className="flex flex-col items-center justify-center text-center py-6">
        <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mb-6">
          <CheckCircle2 size={32} className="text-success" />
        </div>
        <h2 className="text-2xl font-semibold text-text-primary tracking-tight mb-3">{successTitle}</h2>
        <p className="text-[14px] text-text-secondary mb-8 leading-relaxed">{successMessage}</p>
        <Button variant="primary" size="lg" className="w-full h-11 text-[15px]" onClick={() => navigate('/')}>Return to App</Button>
      </div>
    </AuthLayout>
  );
}

export default AuthActionPage;
