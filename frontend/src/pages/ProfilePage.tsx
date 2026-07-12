import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { api } from '../api/client';
import { type User } from '../api/types';
import { useUserStats } from '../api/queries';
import { Button } from '../components/primitives/Button';
import { Input, Textarea } from '../components/primitives/Input';
import { ImageCropModal } from '../components/profile-setup/ImageCropModal';
import { useDropzone } from 'react-dropzone';
import { toast } from '../lib/toast';
import { Upload, Loader2, Check, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';

function InitialsAvatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const sizes = { sm: 'h-8 w-8 text-xs', md: 'h-16 w-16 text-lg', lg: 'h-24 w-24 text-2xl' };
  return (
    <div className={cn(
      'rounded-full flex items-center justify-center font-bold text-white select-none flex-shrink-0',
      'bg-gradient-to-br from-accent to-accent-hover',
      sizes[size]
    )}>
      {initials || '?'}
    </div>
  );
}

export function ProfilePage() {
  const { profile, setProfile } = useAuth();
  const { data: stats } = useUserStats(!!profile);
  
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  
  const [loading, setLoading] = useState(false);
  
  // Avatar state
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);

  // Username validation
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const [usernameError, setUsernameError] = useState('');

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
      setUsername(profile.username || '');
      setBio(profile.bio || '');
      setAvatarPreview(profile.photo_url || null);
    }
  }, [profile]);

  useEffect(() => {
    if (!username || username === profile?.username) {
      setUsernameStatus('idle');
      return;
    }
    const usernameRegex = /^[a-z0-9_.]{3,30}$/;
    if (!usernameRegex.test(username)) {
      setUsernameStatus('invalid');
      setUsernameError('3-30 chars, lowercase, numbers, _, .');
      return;
    }

    setUsernameStatus('checking');
    const timer = setTimeout(async () => {
      try {
        const data = await api.get<{available: boolean}>(`/auth/check-username?username=${encodeURIComponent(username)}`);
        if (data.available) {
          setUsernameStatus('available');
          setUsernameError('');
        } else {
          setUsernameStatus('taken');
          setUsernameError('Username taken');
        }
      } catch (err) {
        setUsernameStatus('idle');
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [username, profile]);

  const handleSave = async () => {
    if (usernameStatus === 'taken' || usernameStatus === 'invalid' || usernameStatus === 'checking') {
      toast.error('Please fix username errors before saving.');
      return;
    }

    setLoading(true);
    try {
      const updatedUser = await api.patch<User>('/auth/me', {
        display_name: displayName,
        username,
        bio,
      });
      setProfile(updatedUser);
      toast.success('Profile updated successfully.');
    } catch (err: any) {
      if (err.status === 409) {
        setUsernameStatus('taken');
        setUsernameError('That username was just taken. Try another.');
        toast.error('Username unavailable — please pick another.');
      } else {
        toast.error(err.message || 'Failed to update profile.');
      }
    } finally {
      setLoading(false);
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    const file = acceptedFiles[0];
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImageToCrop(reader.result as string);
      setCropModalOpen(true);
    };
    reader.readAsDataURL(file);
  }, []);

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] },
    maxFiles: 1,
  });

  const handleCropComplete = async (croppedBlob: Blob) => {
    setCropModalOpen(false);
    const optimisticUrl = URL.createObjectURL(croppedBlob);
    setAvatarPreview(optimisticUrl);

    try {
      const formData = new FormData();
      formData.append('image', croppedBlob, 'avatar.jpg');
      const updatedUser = await api.postForm<User>('/auth/avatar', formData);
      setProfile(updatedUser);
      setAvatarPreview(updatedUser.photo_url);
      toast.success('Photo updated successfully');
    } catch (err: any) {
      setAvatarPreview(profile?.photo_url || null);
      toast.error(err.message || 'Failed to upload photo.');
    }
  };

  const hasChanges = 
    displayName !== (profile?.display_name || '') || 
    username !== (profile?.username || '') || 
    bio !== (profile?.bio || '');

  if (!profile) return null;

  return (
    <div className="mx-auto max-w-[800px] px-6 py-12 page-enter">
      <div className="mb-10">
        <h1 className="text-3xl font-semibold text-text-primary tracking-tight mb-2">Profile</h1>
        <p className="text-[15px] text-text-secondary">Manage your public information and avatar.</p>
      </div>
      
      <div className="flex flex-col gap-10">
        
        {/* Section 1: Avatar */}
        <section className="flex flex-col md:flex-row gap-8 items-start border-b border-border pb-10">
          <div className="w-full md:w-1/3">
            <h3 className="text-[15px] font-semibold text-text-primary mb-1">Avatar</h3>
            <p className="text-sm text-text-secondary">This image will be shown on your designs.</p>
          </div>
          <div className="w-full md:w-2/3 flex items-center gap-6">
             <div className="relative group rounded-full overflow-hidden w-24 h-24 border border-border">
               {avatarPreview ? (
                 <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
               ) : (
                 <InitialsAvatar name={displayName || username || 'U'} size="lg" />
               )}
               <div 
                 {...getRootProps()}
                 className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer"
               >
                 <input {...getInputProps()} />
                 <Upload className="w-5 h-5 text-white mb-1" />
                 <span className="text-[11px] font-medium text-white">Change</span>
               </div>
             </div>
             
             <div className="flex flex-col gap-3">
               <Button variant="secondary">
                 <div {...getRootProps()} className="flex items-center">
                   <input {...getInputProps()} />
                   Upload new photo
                 </div>
               </Button>
               {avatarPreview && (
                  <button 
                    onClick={async () => {
                      try {
                        const updatedUser = await api.patch<User>('/auth/me', { photo_url: null });
                        setProfile(updatedUser);
                        setAvatarPreview(null);
                        toast.success('Photo removed');
                      } catch (err: any) {
                        toast.error(err.message || 'Failed to remove photo.');
                      }
                    }} 
                    className="text-sm font-medium text-text-secondary hover:text-danger text-left w-fit transition-colors"
                  >
                    Remove photo
                  </button>
                )}
             </div>
          </div>
        </section>

        {/* Section 2: Personal Info */}
        <section className="flex flex-col md:flex-row gap-8 items-start border-b border-border pb-10">
          <div className="w-full md:w-1/3">
            <h3 className="text-[15px] font-semibold text-text-primary mb-1">Personal Info</h3>
            <p className="text-sm text-text-secondary">Update your name and short bio.</p>
          </div>
          <div className="w-full md:w-2/3 flex flex-col gap-6">
            
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-text-primary flex justify-between">
                <span>Display Name</span>
                <span className="text-xs text-text-tertiary">{displayName.length}/60</span>
              </label>
              <Input
                value={displayName}
                onChange={e => setDisplayName(e.target.value.slice(0, 60))}
                placeholder="Your full name"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-text-primary">Username</label>
              <Input
                value={username}
                onChange={e => setUsername(e.target.value.toLowerCase())}
                placeholder="username"
                leftIcon="@"
                className={(usernameStatus === 'invalid' || usernameStatus === 'taken') ? 'border-danger focus:border-danger' : ''}
                rightElement={
                  <div className="flex items-center">
                    {usernameStatus === 'checking' && <Loader2 size={18} className="animate-spin text-text-secondary" />}
                    {usernameStatus === 'available' && <Check size={18} className="text-success" />}
                    {(usernameStatus === 'taken' || usernameStatus === 'invalid') && <AlertCircle size={18} className="text-danger" />}
                  </div>
                }
              />
              {(usernameStatus === 'taken' || usernameStatus === 'invalid') && (
                <p className="text-xs text-danger font-medium mt-1">{usernameError}</p>
              )}
            </div>

            <Textarea
              label="Bio"
              value={bio}
              onChange={e => setBio(e.target.value)}
              rows={4}
              maxLength={280}
              placeholder="Interior design enthusiast..."
            />

            <div className="flex justify-end mt-2">
               <Button onClick={handleSave} loading={loading} disabled={!hasChanges || bio.length > 280 || usernameStatus === 'checking'}>
                 Save Changes
               </Button>
            </div>
          </div>
        </section>

        {/* Section 3 & 4: Read-only Stats */}
        <section className="flex flex-col md:flex-row gap-8 items-start pb-10">
          <div className="w-full md:w-1/3">
            <h3 className="text-[15px] font-semibold text-text-primary mb-1">Account Info</h3>
            <p className="text-sm text-text-secondary">Summary of your account activity.</p>
          </div>
          <div className="w-full md:w-2/3">
             <div className="bg-surface border border-border rounded-xl p-6 shadow-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8">
                  <div>
                    <h4 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-2">Email</h4>
                    <p className="text-sm text-text-primary font-medium">{profile.email}</p>
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-2">Member Since</h4>
                    <p className="text-sm text-text-primary font-medium">
                      {stats?.member_since ? format(new Date(stats.member_since), 'MMMM yyyy') : '...'}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-2">Total Designs</h4>
                    <p className="text-sm text-text-primary font-medium">{stats?.total_designs ?? '...'}</p>
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-2">Favorite Style</h4>
                    <p className="text-sm text-text-primary font-medium capitalize">{stats?.favorite_style ?? 'None yet'}</p>
                  </div>
                </div>
             </div>
          </div>
        </section>

      </div>

      {imageToCrop && (
        <ImageCropModal
          isOpen={cropModalOpen}
          imageSrc={imageToCrop}
          onClose={() => setCropModalOpen(false)}
          onCropComplete={handleCropComplete}
        />
      )}
    </div>
  );
}
