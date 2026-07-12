import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { api } from '../api/client';
import { type User } from '../api/types';
import { Button } from '../components/primitives/Button';
import { Toggle } from '../components/primitives/Toggle';
import { Select, SelectItem } from '../components/primitives/Select';
import { SecuritySection } from '../components/settings/SecuritySection';
import { Input } from '../components/primitives/Input';
import { toast } from '../lib/toast';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { getAuth, deleteUser as firebaseDeleteUser } from 'firebase/auth';

export function SettingsPage() {
  const { profile, setProfile, logout } = useAuth();
  
  const [theme, setTheme] = useState('system');
  const [notifications, setNotifications] = useState(true);
  const [budget, setBudget] = useState('mid-range');
  const [lighting, setLighting] = useState('natural');
  
  const [loading, setLoading] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (profile) {
      setTheme(profile.theme_preference || 'system');
      setNotifications(profile.email_notifications);
      // We don't have default preferences in User model yet, but mock state for UI
    }
  }, [profile]);

  const handleSave = async (updates: Partial<User>) => {
    setLoading(true);
    try {
      const updatedUser = await api.patch<User>('/auth/me/settings', updates);
      setProfile(updatedUser);
      
      if (updates.theme_preference) {
         if (updates.theme_preference === 'dark') document.documentElement.classList.add('dark');
         else if (updates.theme_preference === 'light') document.documentElement.classList.remove('dark');
         else {
           if (window.matchMedia('(prefers-color-scheme: dark)').matches) document.documentElement.classList.add('dark');
           else document.documentElement.classList.remove('dark');
         }
      }
      
      toast.success('Settings updated.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update settings.');
      // Revert optimism
      if (profile) {
        setTheme(profile.theme_preference || 'system');
        setNotifications(profile.email_notifications);
      }
    } finally {
      setLoading(false);
    }
  };

  const updateTheme = (t: string) => {
     setTheme(t);
     handleSave({ theme_preference: t });
  };
  
  const updateNotifications = (val: boolean) => {
     setNotifications(val);
     handleSave({ email_notifications: val });
  };

  const handleDeleteAccount = async () => {
    if (deleteInput !== 'DELETE') return;
    setIsDeleting(true);
    try {
      await api.delete('/auth/me'); // Delete backend data first
      const auth = getAuth();
      if (auth.currentUser) {
         await firebaseDeleteUser(auth.currentUser); // Delete firebase user
      }
      toast.success('Account deleted.');
      logout();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete account.');
      setIsDeleting(false);
    }
  };

  if (!profile) return null;

  return (
    <div className="mx-auto max-w-[800px] px-6 py-12 page-enter">
      <div className="mb-10">
        <h1 className="text-3xl font-semibold tracking-tight text-text-primary mb-2">Settings</h1>
        <p className="text-[15px] text-text-secondary">Customize your RoomCanvas experience.</p>
      </div>
      
      <div className="flex flex-col gap-10">
        
        {/* Section 1: Appearance */}
        <section className="flex flex-col md:flex-row gap-8 items-start border-b border-border pb-10">
          <div className="w-full md:w-1/3">
            <h3 className="text-[15px] font-semibold text-text-primary mb-1">Appearance</h3>
            <p className="text-sm text-text-secondary">Changes apply immediately.</p>
          </div>
          <div className="w-full md:w-2/3">
             <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Light */}
                <button 
                  onClick={() => updateTheme('light')}
                  className={cn("relative flex flex-col items-center gap-3 p-4 rounded-xl border transition-all text-left w-full", theme === 'light' ? 'border-accent bg-accent/5 ring-1 ring-accent/20' : 'border-border bg-surface hover:border-border-strong')}
                >
                   <div className="w-full h-20 rounded-md bg-[#F8F6F3] border border-[#E8E3DC] flex flex-col gap-1.5 p-2.5 overflow-hidden shadow-sm">
                     <div className="w-full h-2.5 rounded-sm bg-[#E8E3DC]" />
                     <div className="w-2/3 h-2.5 rounded-sm bg-[#B76E4D]/20" />
                   </div>
                   <span className="text-sm font-medium text-text-primary w-full text-center">Light</span>
                </button>

                {/* Dark */}
                <button 
                  onClick={() => updateTheme('dark')}
                  className={cn("relative flex flex-col items-center gap-3 p-4 rounded-xl border transition-all text-left w-full", theme === 'dark' ? 'border-accent bg-accent/5 ring-1 ring-accent/20' : 'border-border bg-surface hover:border-border-strong')}
                >
                   <div className="w-full h-20 rounded-md bg-[#0E0C0A] border border-[#252018] flex flex-col gap-1.5 p-2.5 overflow-hidden shadow-sm">
                     <div className="w-full h-2.5 rounded-sm bg-[#252018]" />
                     <div className="w-2/3 h-2.5 rounded-sm bg-[#C87E5C]/20" />
                   </div>
                   <span className="text-sm font-medium text-text-primary w-full text-center">Dark</span>
                </button>

                {/* System */}
                <button 
                  onClick={() => updateTheme('system')}
                  className={cn("relative flex flex-col items-center gap-3 p-4 rounded-xl border transition-all text-left w-full", theme === 'system' ? 'border-accent bg-accent/5 ring-1 ring-accent/20' : 'border-border bg-surface hover:border-border-strong')}
                >
                   <div className="w-full h-20 rounded-md flex overflow-hidden border border-border shadow-sm">
                      <div className="flex-1 bg-[#F8F6F3] p-2 flex flex-col gap-1.5 border-r border-[#E8E3DC]">
                         <div className="w-full h-1.5 rounded-sm bg-[#E8E3DC]" />
                      </div>
                      <div className="flex-1 bg-[#0E0C0A] p-2 flex flex-col gap-1.5">
                         <div className="w-full h-1.5 rounded-sm bg-[#252018]" />
                      </div>
                   </div>
                   <span className="text-sm font-medium text-text-primary w-full text-center">System default</span>
                </button>
             </div>
          </div>
        </section>

        {/* Section 2: Notifications */}
        <section className="flex flex-col md:flex-row gap-8 items-start border-b border-border pb-10">
          <div className="w-full md:w-1/3">
            <h3 className="text-[15px] font-semibold text-text-primary mb-1">Notifications</h3>
            <p className="text-sm text-text-secondary">Manage how we contact you.</p>
          </div>
          <div className="w-full md:w-2/3">
             <div className="p-5 rounded-xl border border-border bg-surface">
               <Toggle
                 checked={notifications}
                 onChange={updateNotifications}
                 label="Email notifications"
                 description="Receive updates on feature releases and generated designs."
               />
             </div>
          </div>
        </section>

        {/* Section 3: AI Generation Defaults */}
        <section className="flex flex-col md:flex-row gap-8 items-start border-b border-border pb-10">
          <div className="w-full md:w-1/3">
            <h3 className="text-[15px] font-semibold text-text-primary mb-1">AI Defaults</h3>
            <p className="text-sm text-text-secondary mb-2">These are pre-filled on every new design.</p>
          </div>
          <div className="w-full md:w-2/3">
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select value={budget} onValueChange={setBudget} label="Default Budget Tier">
                   <SelectItem value="budget">Budget-Friendly</SelectItem>
                   <SelectItem value="mid-range">Mid-Range</SelectItem>
                   <SelectItem value="premium">Premium / Luxury</SelectItem>
                </Select>
                <Select value={lighting} onValueChange={setLighting} label="Default Lighting">
                   <SelectItem value="warm">Warm & Cozy</SelectItem>
                   <SelectItem value="cool">Cool & Modern</SelectItem>
                   <SelectItem value="natural">Natural Daylight</SelectItem>
                </Select>
             </div>
          </div>
        </section>

        {/* Section 4: Security */}
        <section className="flex flex-col md:flex-row gap-8 items-start border-b border-border pb-10">
          <div className="w-full md:w-1/3">
            <h3 className="text-[15px] font-semibold text-text-primary mb-1">Security & Access</h3>
            <p className="text-sm text-text-secondary">Manage your password and connected accounts.</p>
          </div>
          <div className="w-full md:w-2/3">
             <SecuritySection />
          </div>
        </section>

      </div>



    </div>
  );
}
