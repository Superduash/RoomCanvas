import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { api } from '../api/client';
import { type User } from '../api/types';
import { Button } from '../components/primitives/Button';
import { toast } from '../lib/toast';

export function ProfilePage() {
  const { profile, setProfile } = useAuth();
  
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
      setUsername(profile.username || '');
      setBio(profile.bio || '');
    }
  }, [profile]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const updatedUser = await api.patch<User>('/auth/me', {
        display_name: displayName,
        username: username,
        bio: bio
      });
      setProfile(updatedUser);
      toast.success('Profile updated successfully.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  if (!profile) return null;

  return (
    <div className="mx-auto max-w-2xl px-6 py-10 page-enter">
      <h1 className="text-2xl font-semibold mb-6">Profile</h1>
      
      <div className="bg-surface border border-border p-6 rounded-xl shadow-sm flex flex-col gap-6">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Display Name</label>
          <input 
            type="text" 
            value={displayName} 
            onChange={(e) => setDisplayName(e.target.value)} 
            className="w-full bg-surface-alt border border-border rounded-md px-3 py-2 outline-none focus:border-accent"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Username</label>
          <input 
            type="text" 
            value={username} 
            onChange={(e) => setUsername(e.target.value)} 
            className="w-full bg-surface-alt border border-border rounded-md px-3 py-2 outline-none focus:border-accent"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Bio</label>
          <textarea 
            value={bio} 
            onChange={(e) => setBio(e.target.value)} 
            className="w-full bg-surface-alt border border-border rounded-md px-3 py-2 outline-none focus:border-accent min-h-[100px]"
          />
        </div>

        <div className="flex justify-end">
          <Button variant="primary" onClick={handleSave} loading={loading}>
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}
