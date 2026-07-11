import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { api } from '../api/client';
import { type User } from '../api/types';
import { Button } from '../components/primitives/Button';
import { toast } from '../lib/toast';

export function SettingsPage() {
  const { profile, setProfile } = useAuth();
  
  const [theme, setTheme] = useState('system');
  const [notifications, setNotifications] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (profile) {
      setTheme(profile.theme_preference || 'system');
      setNotifications(profile.email_notifications);
    }
  }, [profile]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const updatedUser = await api.patch<User>('/auth/me/settings', {
        theme_preference: theme,
        email_notifications: notifications
      });
      setProfile(updatedUser);
      toast.success('Settings updated successfully.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update settings.');
    } finally {
      setLoading(false);
    }
  };

  if (!profile) return null;

  return (
    <div className="mx-auto max-w-2xl px-6 py-10 page-enter">
      <h1 className="text-2xl font-semibold mb-6">Settings</h1>
      
      <div className="bg-surface border border-border p-6 rounded-xl shadow-sm flex flex-col gap-6">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Theme Preference</label>
          <select 
            value={theme} 
            onChange={(e) => setTheme(e.target.value)} 
            className="w-full bg-surface-alt border border-border rounded-md px-3 py-2 outline-none focus:border-accent"
          >
            <option value="system">System Default</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>
        
        <div className="flex items-center gap-3">
          <input 
            type="checkbox" 
            id="notifs" 
            checked={notifications} 
            onChange={(e) => setNotifications(e.target.checked)} 
            className="w-4 h-4 text-accent border-border rounded focus:ring-accent"
          />
          <label htmlFor="notifs" className="text-sm font-medium text-text-secondary">
            Receive email notifications about new features and updates
          </label>
        </div>
        
        <div className="flex justify-end pt-4 border-t border-border/50">
          <Button variant="primary" onClick={handleSave} loading={loading}>
            Save Settings
          </Button>
        </div>
      </div>
    </div>
  );
}
