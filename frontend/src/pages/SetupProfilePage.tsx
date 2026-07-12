import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../components/primitives/Button';
import { Input } from '../components/primitives/Input';
import { ImageCropModal } from '../components/profile-setup/ImageCropModal';
import { useDropzone } from 'react-dropzone';
import { Upload, Check, Loader2, AlertCircle, ArrowRight } from 'lucide-react';
import { toast } from '../lib/toast';
import { api } from '../api/client';
import confetti from 'canvas-confetti';

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 48 : -48, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit:  (dir: number) => ({ x: dir < 0 ? 48 : -48, opacity: 0 }),
};

export default function SetupProfilePage() {
  const { profile, setProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const totalSteps = 4;

  // Form State
  const [avatarBlob, setAvatarBlob] = useState<Blob | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile?.photo_url || null);
  const [username, setUsername] = useState(profile?.username || '');
  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [themePref, setThemePref] = useState<'system' | 'light' | 'dark'>((profile?.theme_preference as any) || 'system');
  const [emailNotifications, setEmailNotifications] = useState(profile?.email_notifications ?? true);
  
  // Crop Modal State
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);

  // Validation State
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const [usernameError, setUsernameError] = useState('');
  const [usernameSuggestions, setUsernameSuggestions] = useState<string[]>([]);
  
  // Submit State
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Focus trap workaround for keyboard support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && e.target instanceof HTMLInputElement) {
        e.preventDefault();
        handleNextStep();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  });

  // Username suggestions fetcher
  useEffect(() => {
    if (step === 3 && !username && displayName) {
      api.get<{suggestions: string[]}>(`/auth/username-suggest?display_name=${encodeURIComponent(displayName)}`)
        .then(res => {
          if (res.suggestions.length > 0) {
             setUsernameSuggestions(res.suggestions);
          }
        })
        .catch(() => {});
    }
  }, [step, displayName, username]);

  // Validate Username (Debounced)
  useEffect(() => {
    if (!username) {
      setUsernameStatus('idle');
      return;
    }
    const usernameRegex = /^[a-z0-9_.]{3,30}$/;
    if (!usernameRegex.test(username)) {
      setUsernameStatus('invalid');
      if (username.length < 3) setUsernameError('Username must be at least 3 characters.');
      else if (username.length > 30) setUsernameError('Username must be less than 30 characters.');
      else setUsernameError('Only lowercase letters, numbers, underscores, and periods allowed.');
      return;
    }

    setUsernameStatus('checking');
    const timer = setTimeout(async () => {
      try {
        const data = await api.get<{available: boolean}>(`/auth/check-username?username=${encodeURIComponent(username)}`);
        if (data.available || username === profile?.username) {
          setUsernameStatus('available');
          setUsernameError('');
        } else {
          setUsernameStatus('taken');
          setUsernameError('This username is already taken.');
          if (displayName) {
             const res = await api.get<{suggestions: string[]}>(`/auth/username-suggest?display_name=${encodeURIComponent(displayName)}`);
             setUsernameSuggestions(res.suggestions);
          }
        }
      } catch (err) {
        setUsernameStatus('idle');
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [username, displayName, profile]);

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

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] },
    maxFiles: 1,
  });

  const handleCropComplete = (croppedBlob: Blob) => {
    setAvatarBlob(croppedBlob);
    setAvatarPreview(URL.createObjectURL(croppedBlob));
    setCropModalOpen(false);
  };

  const nextStep = () => {
    if (step < totalSteps) {
      setDirection(1);
      setStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handleNextStep = () => {
    if (step === 2 && !displayName.trim()) {
       toast.error('Please enter a display name.');
       return;
    }
    if (step === 3 && usernameStatus !== 'available' && username !== profile?.username) {
      toast.error('Please choose an available username.');
      return;
    }
    nextStep();
  };

  const handleSkip = async () => {
     try {
       setIsSubmitting(true);
       const updatedUser = await api.patch('/auth/me', {
         profile_completed: true
       });
       setProfile(updatedUser as any);
       navigate(location.state?.from?.pathname || '/upload', { replace: true });
     } catch (e: any) {
       toast.error(e.message || 'Failed to skip');
       setIsSubmitting(false);
     }
  };

  const handleComplete = async () => {
    setIsSubmitting(true);
    try {
      let finalPhotoUrl = avatarPreview;
      if (avatarBlob) {
        const formData = new FormData();
        formData.append('image', avatarBlob, 'avatar.jpg');
        const res = await api.postForm<{photo_url: string}>('/auth/avatar', formData);
        finalPhotoUrl = res.photo_url;
      }
      
      const updatedUser = await api.patch('/auth/me', {
        username,
        display_name: displayName,
        bio,
        theme_preference: themePref,
        email_notifications: emailNotifications,
        photo_url: finalPhotoUrl,
        profile_completed: true
      });
      
      setProfile(updatedUser as any);
      
      toast.success('Profile completed! Welcome to RoomCanvas.');
      
      if (themePref === 'dark') document.documentElement.classList.add('dark');
      else if (themePref === 'light') document.documentElement.classList.remove('dark');
      
      confetti({ 
         particleCount: 80, 
         spread: 60, 
         origin: { y: 0.6 },
         colors: ['#B76E4D', '#F3E8E2', '#D4943E', '#FFFFFF'] 
      });

      setTimeout(() => {
        const destination = location.state?.from?.pathname || '/';
        navigate(destination, { replace: true });
      }, 1500);
      
    } catch (err: any) {
      if (err.status === 409) {
        setUsernameStatus('taken');
        setUsernameError('That username was just taken. Try another.');
        toast.error('Username unavailable — please pick another.');
        setDirection(-1);
        setStep(3); // Go back to username step
      } else {
        toast.error(err.message || 'Failed to complete profile.');
      }
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-bg overflow-hidden relative">
      {/* Left side: branding/illustration (hidden on mobile) */}
      <div className="hidden md:flex flex-1 relative bg-surface overflow-hidden items-center justify-center border-r border-border p-12 text-center">
         <div className="absolute top-[-20%] left-[-10%] w-[80%] h-[80%] rounded-full bg-accent/5 blur-[120px] pointer-events-none" />
         <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-warning/5 blur-[100px] pointer-events-none" />
         
         <div className="relative z-10 max-w-md">
            <div className="w-16 h-16 rounded-2xl bg-accent text-white flex items-center justify-center mx-auto shadow-lg mb-8">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-text-primary mb-4">
              RoomCanvas
            </h1>
            <p className="text-lg text-text-secondary text-pretty">
              Your AI interior design assistant. Let's set up your profile so you can start creating.
            </p>
         </div>
      </div>

      {/* Right side: form area */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 md:p-12 h-screen max-h-screen relative bg-bg">
        <div className="w-full max-w-md flex flex-col relative h-[500px]">
          
          <AnimatePresence initial={false} custom={direction} mode="wait">
            
            {/* Step 1: Welcome */}
            {step === 1 && (
              <motion.div
                key="step1"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="absolute inset-0 flex flex-col justify-center gap-6"
              >
                <div>
                  <h2 className="text-3xl font-bold tracking-tight text-text-primary mb-2">Welcome to RoomCanvas</h2>
                  <p className="text-text-secondary text-[15px]">Let's set up your space in 30 seconds.</p>
                </div>
                <div className="flex flex-col gap-3 mt-4">
                   <Button size="lg" onClick={handleNextStep}>
                     Set up my profile <ArrowRight className="h-4 w-4 ml-1" />
                   </Button>
                   <Button size="lg" variant="ghost" onClick={handleSkip}>
                     Skip for now
                   </Button>
                </div>
              </motion.div>
            )}

            {/* Step 2: Avatar & Name */}
            {step === 2 && (
              <motion.div
                key="step2"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="absolute inset-0 flex flex-col"
              >
                <div className="mb-8">
                  <h2 className="text-2xl font-bold tracking-tight text-text-primary mb-1">How should we know you?</h2>
                  <p className="text-sm text-text-secondary">Add a photo and your display name.</p>
                </div>
                
                <div className="flex justify-center mb-8">
                  <div 
                    {...getRootProps()} 
                    className={`relative group w-32 h-32 rounded-full border-2 border-dashed flex flex-col items-center justify-center cursor-pointer overflow-hidden transition-colors ${isDragActive ? 'border-accent bg-accent/10' : 'border-border hover:border-accent/50 bg-surface'}`}
                  >
                    <input {...getInputProps()} />
                    {avatarPreview ? (
                      <>
                        <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="text-white text-xs font-medium">Change</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center text-text-tertiary">
                        <Upload size={24} className="mb-1" />
                        <span className="text-xs font-medium">Upload</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2 mb-8">
                  <label className="text-sm font-medium text-text-primary">Display Name</label>
                  <Input
                    autoFocus
                    placeholder="e.g. Jane Doe"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />
                </div>

                <div className="mt-auto">
                  <Button className="w-full" size="lg" onClick={handleNextStep}>
                    Continue <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 3: Username & Bio */}
            {step === 3 && (
              <motion.div
                key="step3"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="absolute inset-0 flex flex-col"
              >
                <div className="mb-6">
                  <h2 className="text-2xl font-bold tracking-tight text-text-primary mb-1">Claim your username</h2>
                  <p className="text-sm text-text-secondary">This is how others can find you.</p>
                </div>
                
                <div className="relative mb-2">
                  <Input
                    autoFocus
                    placeholder="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase())}
                    className={`pl-8 ${usernameStatus === 'invalid' || usernameStatus === 'taken' ? 'border-danger focus:border-danger focus:ring-danger/20' : ''}`}
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary font-medium">@</span>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
                    {usernameStatus === 'checking' && <Loader2 size={18} className="animate-spin text-text-secondary" />}
                    {usernameStatus === 'available' && <Check size={18} className="text-success" />}
                    {(usernameStatus === 'taken' || usernameStatus === 'invalid') && <AlertCircle size={18} className="text-danger" />}
                  </div>
                </div>

                <div className="h-10 mb-4">
                  {(usernameStatus === 'taken' || usernameStatus === 'invalid') && (
                    <p className="text-xs text-danger font-medium flex items-center gap-1.5 mb-1">
                      {usernameError}
                    </p>
                  )}
                  {usernameSuggestions.length > 0 && usernameStatus !== 'available' && (
                    <div className="flex gap-2 items-center flex-wrap">
                      <span className="text-xs text-text-tertiary">Suggestions:</span>
                      {usernameSuggestions.map(s => (
                        <button 
                          key={s} 
                          onClick={() => setUsername(s)}
                          className="px-2 py-0.5 rounded-full bg-surface border border-border text-xs font-medium text-text-secondary hover:text-accent hover:border-accent/40 transition-colors"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2 mb-6">
                  <label className="text-sm font-medium text-text-primary flex justify-between">
                    <span>Bio (Optional)</span>
                    <span className={`text-xs ${bio.length > 160 ? 'text-danger' : 'text-text-tertiary'}`}>{bio.length}/160</span>
                  </label>
                  <textarea
                    className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/10 transition-all resize-none shadow-sm"
                    placeholder="Interior design enthusiast..."
                    rows={3}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                  />
                </div>

                <div className="mt-auto">
                  <Button className="w-full" size="lg" onClick={handleNextStep} disabled={bio.length > 160 || usernameStatus === 'checking'}>
                    Continue <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 4: Preferences */}
            {step === 4 && (
              <motion.div
                key="step4"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="absolute inset-0 flex flex-col"
              >
                <div className="mb-8">
                  <h2 className="text-2xl font-bold tracking-tight text-text-primary mb-1">Make it yours</h2>
                  <p className="text-sm text-text-secondary">Customize your experience.</p>
                </div>

                <div className="flex flex-col gap-3 mb-8">
                  <label className="text-sm font-medium text-text-primary">Theme</label>
                  <div className="grid grid-cols-3 gap-3">
                    {/* Light */}
                    <button 
                      onClick={() => setThemePref('light')}
                      className={`relative flex flex-col items-center gap-3 p-3 rounded-xl border transition-all ${themePref === 'light' ? 'border-accent bg-accent/5 ring-1 ring-accent/20' : 'border-border bg-surface hover:border-border-strong'}`}
                    >
                       <div className="w-full h-16 rounded-md bg-[#F8F6F3] border border-[#E8E3DC] flex flex-col gap-1.5 p-2 overflow-hidden shadow-sm">
                         <div className="w-full h-2 rounded-sm bg-[#E8E3DC]" />
                         <div className="w-2/3 h-2 rounded-sm bg-[#B76E4D]/20" />
                       </div>
                       <span className="text-xs font-medium">Light</span>
                    </button>

                    {/* Dark */}
                    <button 
                      onClick={() => setThemePref('dark')}
                      className={`relative flex flex-col items-center gap-3 p-3 rounded-xl border transition-all ${themePref === 'dark' ? 'border-accent bg-accent/5 ring-1 ring-accent/20' : 'border-border bg-surface hover:border-border-strong'}`}
                    >
                       <div className="w-full h-16 rounded-md bg-[#0E0C0A] border border-[#252018] flex flex-col gap-1.5 p-2 overflow-hidden shadow-sm">
                         <div className="w-full h-2 rounded-sm bg-[#252018]" />
                         <div className="w-2/3 h-2 rounded-sm bg-[#C87E5C]/20" />
                       </div>
                       <span className="text-xs font-medium">Dark</span>
                    </button>

                    {/* System */}
                    <button 
                      onClick={() => setThemePref('system')}
                      className={`relative flex flex-col items-center gap-3 p-3 rounded-xl border transition-all ${themePref === 'system' ? 'border-accent bg-accent/5 ring-1 ring-accent/20' : 'border-border bg-surface hover:border-border-strong'}`}
                    >
                       <div className="w-full h-16 rounded-md flex overflow-hidden border border-border shadow-sm">
                          <div className="flex-1 bg-[#F8F6F3] p-1.5 flex flex-col gap-1 border-r border-[#E8E3DC]">
                             <div className="w-full h-1.5 rounded-[1px] bg-[#E8E3DC]" />
                          </div>
                          <div className="flex-1 bg-[#0E0C0A] p-1.5 flex flex-col gap-1">
                             <div className="w-full h-1.5 rounded-[1px] bg-[#252018]" />
                          </div>
                       </div>
                       <span className="text-xs font-medium">System</span>
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-3 mb-8">
                   <label className="flex items-center justify-between gap-4 cursor-pointer group p-4 rounded-xl border border-border bg-surface hover:border-border-strong transition-colors">
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-medium text-text-primary">Email Notifications</span>
                      <span className="text-xs text-text-tertiary">Updates about your designs and account.</span>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={emailNotifications}
                      onClick={() => setEmailNotifications(!emailNotifications)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-base ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${emailNotifications ? 'bg-accent' : 'bg-surface-alt border border-border-strong'}`}
                    >
                      <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-[180ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${emailNotifications ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </label>
                </div>

                <div className="mt-auto">
                  <Button className="w-full" size="lg" onClick={handleNextStep} loading={isSubmitting}>
                    Let's go! <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>

          {/* Dots Progress Indicator */}
          {step > 1 && (
            <div className="absolute -bottom-12 left-0 right-0 flex justify-center gap-2">
              {[2, 3, 4].map(s => (
                <div 
                  key={s} 
                  className={`h-2 rounded-full transition-all duration-300 ${s === step ? 'w-6 bg-accent' : s < step ? 'w-2 bg-accent/30' : 'w-2 bg-border-strong'}`} 
                />
              ))}
            </div>
          )}
        </div>
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
