import { useState, useEffect } from 'react';
import { useAuth } from '../../auth/AuthProvider';
import { Button } from '../primitives/Button';
import { Input } from '../primitives/Input';
import { PasswordField } from '../auth/PasswordField';
import { toast } from '../../lib/toast';
import { getFriendlyApiError } from '../../utils/errors';
import { AlertTriangle } from 'lucide-react';
import { usePasswordStrength } from '../../hooks/usePasswordStrength';

export function SecuritySection() {
  const { user, updateUserPassword, updateUserEmail, deleteAccount, reauthenticate } = useAuth();
  
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Delete confirmation modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

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

  const withReauth = async (action: () => Promise<void>): Promise<boolean> => {
    try {
      await action();
      return true;
    } catch (err: any) {
      const errorMessage = err?.message || String(err);
      
      // Check if reauth is required
      if (errorMessage.includes('sign in again') || 
          errorMessage.includes('recent-login') ||
          errorMessage.includes('requires-recent-login')) {
        setPendingAction(() => action);
        setReauthOpen(true);
        return false;
      } else {
        // For other errors, show toast and re-throw
        toast.error(getFriendlyApiError(err));
        throw err;
      }
    }
  };

  const handleReauthenticate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsReauthenticating(true);
    
    try {
      // Reauthenticate with password or Google popup
      await reauthenticate(reauthPassword || undefined);
      
      // Close reauth modal
      setReauthOpen(false);
      setReauthPassword('');
      
      // Execute the pending action if any
      if (pendingAction) {
        try {
          await pendingAction();
          setPendingAction(null);
        } catch (err: any) {
          toast.error(getFriendlyApiError(err));
          setPendingAction(null);
        }
      }
    } catch (err: any) {
      toast.error(getFriendlyApiError(err, 'Reauthentication failed'));
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
    if (isDeleting || deleteConfirmText !== 'DELETE') return;
    
    setIsDeleting(true);
    
    try {
      const completed = await withReauth(async () => {
        // Delete the account (backend + Firebase + all state)
        await deleteAccount();
      });
      
      // If reauth is required, withReauth returns false and will call this again after reauth
      if (!completed) {
        setIsDeleting(false);
        return;
      }
      
      // Show success message briefly
      toast.success('Account deleted successfully');
      
      // Close modal
      setDeleteModalOpen(false);
      setDeleteConfirmText('');
      
      // Small delay to let the toast show
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Force navigate to landing page with full reload to clear ALL state
      window.location.href = '/';
    } catch (err: any) {
      // Error already handled by withReauth
      setIsDeleting(false);
      // Don't show duplicate error toast - withReauth already shows it
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
        <Button variant="destructive" onClick={() => setDeleteModalOpen(true)}>
          Delete Account
        </Button>
      </div>

      {/* Delete Account Confirmation Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface w-full max-w-md rounded-2xl shadow-xl border border-danger/30 p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-danger/10 flex items-center justify-center">
                <AlertTriangle size={20} className="text-danger" />
              </div>
              <h3 className="text-xl font-semibold text-text-primary tracking-tight">Delete Account</h3>
            </div>
            <p className="text-sm text-text-secondary mb-4">
              This action <strong>cannot be undone</strong>. This will permanently delete your account, all your designs, and remove all associated data from our servers.
            </p>
            <p className="text-sm text-text-secondary mb-4">
              Please type <strong className="text-danger">DELETE</strong> to confirm.
            </p>
            <Input 
              value={deleteConfirmText} 
              onChange={(e) => setDeleteConfirmText(e.target.value)} 
              placeholder="Type DELETE to confirm"
              className="mb-6"
            />
            <div className="flex justify-end gap-3">
              <Button type="button" variant="ghost" onClick={() => {
                setDeleteModalOpen(false);
                setDeleteConfirmText('');
              }}>
                Cancel
              </Button>
              <Button 
                type="button" 
                variant="destructive" 
                onClick={handleDeleteAccount}
                loading={isDeleting}
                disabled={deleteConfirmText !== 'DELETE' || isDeleting}
              >
                Delete My Account
              </Button>
            </div>
          </div>
        </div>
      )}

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
