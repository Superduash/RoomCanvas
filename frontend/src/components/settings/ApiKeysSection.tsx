import { useState, useEffect } from 'react';
import { useUserKeys, useSaveUserKey, useDeleteUserKey } from '../../api/queries';
import { toast } from '../../lib/toast';
import { getFriendlyApiError } from '../../utils/errors';
import { Loader2, Key, Trash2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Select, SelectItem } from '../primitives/Select';
import { useAuth } from '../../auth/AuthProvider';
import { api } from '../../api/client';
import type { User } from '../../api/types';

export function ApiKeysSection() {
  const { profile, setProfile } = useAuth();
  const { data: keys, isLoading: keysLoading } = useUserKeys();
  const saveKey = useSaveUserKey();
  const deleteKey = useDeleteUserKey();

  const [savingSettings, setSavingSettings] = useState(false);

  // Component state for forms
  const [providerForms, setProviderForms] = useState<Record<string, { apiKey: string; model: string }>>({
    gemini: { apiKey: '', model: 'gemini-1.5-flash' },
    replicate: { apiKey: '', model: 'black-forest-labs/flux-schnell' },
    groq: { apiKey: '', model: 'llama3-70b-8192' },
  });

  // Providers & their models
  const providers = {
    gemini: {
      name: 'Gemini',
      models: [
        { id: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash (Fast)' },
        { id: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro (Quality)' },
        { id: 'gemini-3.1-flash-image', label: 'Gemini 3.1 Flash Image' },
      ],
      desc: 'Supports both text analysis and image generation.',
    },
    replicate: {
      name: 'Replicate',
      models: [
        { id: 'black-forest-labs/flux-schnell', label: 'Flux Schnell (Fast)' },
        { id: 'black-forest-labs/flux-pro', label: 'Flux Pro (High Quality)' },
        { id: 'stability-ai/sdxl', label: 'SDXL' },
      ],
      desc: 'Supports advanced diffusion models for image generation.',
    },
    groq: {
      name: 'Groq',
      models: [
        { id: 'llama3-70b-8192', label: 'Llama 3 70B' },
        { id: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B' },
        { id: 'gemma-7b-it', label: 'Gemma 7B' },
      ],
      desc: 'Ultra-fast LPU inference for text analysis.',
    },
  };

  useEffect(() => {
    if (keys) {
      setProviderForms(prev => {
        const next = { ...prev };
        keys.forEach(k => {
          if (next[k.provider] && k.preferred_model) {
            next[k.provider].model = k.preferred_model;
          }
        });
        return next;
      });
    }
  }, [keys]);

  const handleUpdateActiveProvider = async (type: 'text' | 'image', val: string) => {
    setSavingSettings(true);
    try {
      const updates = type === 'text' 
        ? { active_text_provider: val }
        : { active_image_provider: val };
        
      const updatedUser = await api.patch<User>('/auth/me/settings', updates);
      setProfile(updatedUser);
      toast.success(`Active ${type} provider updated.`);
    } catch (err) {
      toast.error(getFriendlyApiError(err, 'Failed to update active provider.'));
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSaveKey = async (prov: string) => {
    const form = providerForms[prov];
    if (!form.apiKey) {
      toast.error('API key is required');
      return;
    }
    
    try {
      await saveKey.mutateAsync({
        provider: prov,
        api_key: form.apiKey,
        preferred_model: form.model,
      });
      toast.success(`${prov} API key saved successfully!`);
      // Clear the input box after save so it doesn't just sit there in plaintext
      setProviderForms(prev => ({
        ...prev,
        [prov]: { ...prev[prov], apiKey: '' }
      }));
    } catch (err: any) {
      toast.error(getFriendlyApiError(err, 'Failed to save API key. Make sure it is valid.'));
    }
  };

  const handleDeleteKey = async (prov: string) => {
    if (!confirm(`Are you sure you want to delete your ${prov} API key?`)) return;
    try {
      await deleteKey.mutateAsync(prov);
      toast.success(`${prov} key removed.`);
    } catch (err: any) {
      toast.error(getFriendlyApiError(err, 'Failed to delete key.'));
    }
  };

  const isConfigured = (prov: string) => keys?.some(k => k.provider === prov);
  const configuredModel = (prov: string) => keys?.find(k => k.provider === prov)?.preferred_model;

  if (keysLoading || !profile) {
    return (
      <div className="p-5 border border-border rounded-xl bg-surface flex justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-text-secondary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      
      {/* Global Active Selection */}
      <div className="flex flex-col gap-5 p-5 rounded-xl border border-border bg-surface">
        <h4 className="text-sm font-semibold text-text-primary flex items-center gap-2">
          <Key className="w-4 h-4 text-accent" />
          Active Providers (BYOK Mode)
        </h4>
        <p className="text-xs text-text-secondary mb-2">
          RoomCanvas relies entirely on your personal API keys. You must configure and select which provider to use for Analysis (Text) and Generation (Image).
        </p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-text-primary">Active Analysis Provider (Text)</label>
            <Select 
              value={profile.active_text_provider || ''} 
              onValueChange={(val) => handleUpdateActiveProvider('text', val)}
              disabled={savingSettings}
            >
              <SelectItem value="">Select a provider...</SelectItem>
              <SelectItem value="groq">Groq (Recommended)</SelectItem>
              <SelectItem value="gemini">Gemini</SelectItem>
            </Select>
            {!profile.active_text_provider && <span className="text-[11px] text-red-500 flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> Required for redesign</span>}
          </div>
          
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-text-primary">Active Generation Provider (Image)</label>
            <Select 
              value={profile.active_image_provider || ''} 
              onValueChange={(val) => handleUpdateActiveProvider('image', val)}
              disabled={savingSettings}
            >
              <SelectItem value="">Select a provider...</SelectItem>
              <SelectItem value="replicate">Replicate</SelectItem>
              <SelectItem value="gemini">Gemini (Recommended)</SelectItem>
            </Select>
            {!profile.active_image_provider && <span className="text-[11px] text-red-500 flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> Required for redesign</span>}
          </div>
        </div>
      </div>

      {/* Per-Provider Configurations */}
      <div className="flex flex-col gap-4">
        <h4 className="text-sm font-medium text-text-primary">Provider Keys & Models</h4>
        
        {Object.entries(providers).map(([prov, config]) => {
          const configured = isConfigured(prov);
          
          return (
            <div key={prov} className={`p-4 rounded-xl border transition-colors ${configured ? 'border-border bg-surface' : 'border-dashed border-border-strong bg-transparent'}`}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h5 className="text-sm font-semibold capitalize text-text-primary">{config.name}</h5>
                    {configured && (
                      <span className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider text-green-600 bg-green-50 px-2 py-0.5 rounded-full dark:bg-green-900/30 dark:text-green-400">
                        <CheckCircle2 className="w-3 h-3" /> Configured
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-text-secondary mt-1">{config.desc}</p>
                </div>
                
                {configured && (
                  <button
                    type="button"
                    onClick={() => handleDeleteKey(prov)}
                    disabled={deleteKey.isPending}
                    className="p-1.5 text-text-tertiary hover:text-red-500 hover:bg-red-50 rounded-md transition-colors dark:hover:bg-red-900/30"
                    title={`Delete ${config.name} Key`}
                  >
                    {deleteKey.isPending && deleteKey.variables === prov ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </button>
                )}
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                <div className="sm:col-span-5 flex flex-col gap-1.5">
                  <label className="text-[11px] font-medium text-text-secondary uppercase tracking-wide">
                    {configured ? 'Overwrite API Key' : 'API Key'}
                  </label>
                  <input 
                    type="password"
                    placeholder={`Enter ${config.name} API Key...`}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
                    value={providerForms[prov].apiKey}
                    onChange={(e) => setProviderForms(prev => ({...prev, [prov]: { ...prev[prov], apiKey: e.target.value }}))}
                  />
                </div>
                
                <div className="sm:col-span-5 flex flex-col gap-1.5">
                  <label className="text-[11px] font-medium text-text-secondary uppercase tracking-wide">
                    Preferred Model
                  </label>
                  <Select 
                    value={providerForms[prov].model}
                    onValueChange={(val) => setProviderForms(prev => ({...prev, [prov]: { ...prev[prov], model: val }}))}
                  >
                    {config.models.map(m => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.label} {configuredModel(prov) === m.id ? '(Saved)' : ''}
                      </SelectItem>
                    ))}
                  </Select>
                </div>
                
                <div className="sm:col-span-2">
                  <button
                    type="button"
                    disabled={!providerForms[prov].apiKey && (!configured || providerForms[prov].model === configuredModel(prov)) || saveKey.isPending}
                    onClick={() => handleSaveKey(prov)}
                    className="w-full h-[38px] px-3 bg-text-primary text-background text-sm font-medium rounded-lg hover:bg-text-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                  >
                    {saveKey.isPending && saveKey.variables?.provider === prov ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
