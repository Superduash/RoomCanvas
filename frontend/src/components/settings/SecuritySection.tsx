import { useState, useEffect } from 'react';
import { useAuth } from '../../auth/AuthProvider';
import { Button } from '../primitives/Button';
import { Input } from '../primitives/Input';
import { PasswordField } from '../auth/PasswordField';
import { toast } from '../../lib/toast';
import { AlertTriangle } from 'lucide-react';
import { usePasswordStrength } from '../../hooks/usePasswordStrength';

export function SecuritySection() {
  const { user, updateUserPassword, updateUserEmail, deleteAccount, reauthenticate } = useAuth();
  
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Reauth modal state
  const [reauthOpen, setReauthOpen] = useState(false);
  const [reauthPassword, setReauthPassword] = useState('');
  const [isReauthenticating, setIsReauthenticating] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => Promise<void>) | null>(null);

  const strength = usePasswordStrength(password);

  // Listen for global reauth requests
  useEffect(() => {
    const handleReauthRequired = () => setReauthOpen(true);
    window.addEventListener('roomcanvas:reauth-required', handleReauthRequired);
    return () => window.removeEventListener('roomcanvas:reauth-required', handleReauthRequired);
  }, []);

  const withReauth = async (action: () => Promise<void>) => {
    try {
      await action();
    } catch (err: any) {
      if (err.message.includes('sign in again') || err.message.includes('recent-login')) {
        setPendingAction(() => action);
        setReauthOpen(true);
      } else {
        toast.error(err.message);
        throw err;
      }
    }
  };

  const handleReauthenticate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsReauthenticating(true);
    try {
      await reauthenticate(reauthPassword || undefined);
      setReauthOpen(false);
      setReauthPassword('');
      if (pendingAction) {
        await pendingAction();
        setPendingAction(null);
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsReauthenticating(false);
    }
  };

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (email === user?.email) return;
    setIsUpdatingEmail(true);
    try {
      await withReauth(async () => {
        await updateUserEmail(email);
        toast.success('Verification email sent to new address. Please verify to complete the change.');
      });
    } catch (err) {
      // Error handled in withReauth
    } finally {
      setIsUpdatingEmail(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!strength.isAcceptable) {
      toast.error('Please choose a stronger password.');
      return;
    }
    setIsUpdatingPassword(true);
    try {
      await withReauth(async () => {
        await updateUserPassword(password);
        toast.success('Password updated successfully.');
        setPassword('');
      });
    } catch (err) {
      // Error handled in withReauth
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('Are you absolutely sure you want to delete your account? This action cannot be undone.')) {
      return;
    }
    setIsDeleting(true);
    try {
      await withReauth(async () => {
        await deleteAccount();
      });
    } catch (err) {
      // Error handled in withReauth
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Update Email */}
      <div className="bg-surface border border-border p-6 rounded-xl shadow-sm">
        <h2 className="text-lg font-semibold text-text-primary mb-1">Email Address</h2>
        <p className="text-sm text-text-secondary mb-4">Change the email address associated with your account.</p>
        <form onSubmit={handleUpdateEmail} className="flex gap-3 items-end">
          <div className="flex-1">
            <Input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              placeholder="Your email address" 
              required 
            />
          </div>
          <Button type="submit" variant="secondary" loading={isUpdatingEmail} disabled={email === user?.email}>
            Update Email
          </Button>
        </form>
      </div>

      {/* Update Password */}
      <div className="bg-surface border border-border p-6 rounded-xl shadow-sm">
        <h2 className="text-lg font-semibold text-text-primary mb-1">Change Password</h2>
        <p className="text-sm text-text-secondary mb-4">Ensure your account is using a long, random password to stay secure.</p>
        <form onSubmit={handleUpdatePassword} className="flex flex-col gap-3 max-w-md">
          <PasswordField 
            id="update-password" 
            value={password} 
            onChange={setPassword} 
            showStrength 
            placeholder="New password" 
          />
          <div className="flex justify-end mt-2">
            <Button type="submit" variant="secondary" loading={isUpdatingPassword} disabled={!password}>
              Update Password
            </Button>
          </div>
        </form>
      </div>

      {/* Danger Zone */}
      <div className="bg-surface border border-danger/20 p-6 rounded-xl shadow-sm">
        <h2 className="text-lg font-semibold text-danger mb-1 flex items-center gap-2">
          <AlertTriangle size={18} /> Danger Zone
        </h2>
        <p className="text-sm text-text-secondary mb-4">Once you delete your account, there is no going back. Please be certain.</p>
        <Button variant="destructive" onClick={handleDeleteAccount} loading={isDeleting}>
          Delete Account
        </Button>
      </div>

      {/* Reauthentication Modal */}
      {reauthOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface w-full max-w-md rounded-2xl shadow-xl border border-border p-6 animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-semibold text-text-primary tracking-tight mb-2">Reauthenticate</h3>
            <p className="text-sm text-text-secondary mb-6">
              For your security, please confirm your identity to continue.
            </p>
            <form onSubmit={handleReauthenticate} className="flex flex-col gap-4">
              <PasswordField 
                id="reauth-password" 
                value={reauthPassword} 
                onChange={setReauthPassword} 
                placeholder="Enter your current password" 
                label="Password"
              />
              <div className="flex justify-end gap-3 mt-4">
                <Button type="button" variant="ghost" onClick={() => setReauthOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" loading={isReauthenticating}>
                  Confirm
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
