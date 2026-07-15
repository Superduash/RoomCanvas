import { useState, useEffect } from 'react';
import { useUserKeys, useSaveUserKey, useDeleteUserKey } from '../../api/queries';
import { toast } from '../../lib/toast';
import { getFriendlyApiError } from '../../utils/errors';
import { Loader2, Key, Trash2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Select, SelectItem } from '../primitives/Select';
import { Button } from '../primitives/Button';
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
  const [providerForms, setProviderForms] = useState<Record<string, { apiKey: string; textModel: string; imageModel: string }>>({
    gemini: { apiKey: '', textModel: '', imageModel: '' },
    replicate: { apiKey: '', textModel: '', imageModel: '' },
    groq: { apiKey: '', textModel: '', imageModel: '' },
  });

  // Providers & their models (fetched dynamically from backend)
  type ModelDef = { id: string; label: string; badge: string };
  const [supportedModels, setSupportedModels] = useState<Record<string, { text: ModelDef[], image: ModelDef[] }>>({});
  const [modelsLoading, setModelsLoading] = useState(true);

  useEffect(() => {
    const fetchModels = async () => {
      try {
        const res = await api.get('/config/models') as any;
        const data = res.data;
        setSupportedModels(data);
        
        // Initialize default forms for providers if empty
        setProviderForms(prev => {
          const next = { ...prev };
          if (data.gemini) {
            if (!next.gemini.textModel && data.gemini.text.length > 0) next.gemini.textModel = data.gemini.text[0].id;
            if (!next.gemini.imageModel && data.gemini.image.length > 0) next.gemini.imageModel = data.gemini.image[0].id;
          }
          if (data.replicate) {
            if (!next.replicate.imageModel && data.replicate.image.length > 0) next.replicate.imageModel = data.replicate.image[0].id;
          }
          if (data.groq) {
            if (!next.groq.textModel && data.groq.text.length > 0) next.groq.textModel = data.groq.text[0].id;
          }
          return next;
        });
      } catch (err) {
        console.error('Failed to fetch supported models:', err);
      } finally {
        setModelsLoading(false);
      }
    };
    fetchModels();
  }, []);

  const providers: Record<string, {
    name: string;
    textModels?: ModelDef[];
    imageModels?: ModelDef[];
    desc: string;
  }> = {
    gemini: {
      name: 'Gemini',
      textModels: supportedModels.gemini?.text || [],
      imageModels: supportedModels.gemini?.image || [],
      desc: 'Supports both text analysis and image generation.',
    },
    replicate: {
      name: 'Replicate',
      imageModels: supportedModels.replicate?.image || [],
      desc: 'Supports advanced diffusion models for image generation.',
    },
    groq: {
      name: 'Groq',
      textModels: supportedModels.groq?.text || [],
      desc: 'All Groq models are available on the free tier. Paid plans only increase rate limits.',
    },
  };

  useEffect(() => {
    if (keys) {
      setProviderForms(prev => {
        const next = { ...prev };
        keys.forEach(k => {
          if (next[k.provider]) {
            if (k.preferred_text_model) {
              next[k.provider].textModel = k.preferred_text_model;
            }
            if (k.preferred_image_model) {
              next[k.provider].imageModel = k.preferred_image_model;
            }
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
    const configured = isConfigured(prov);
    
    if (!form.apiKey && !configured) {
      toast.error('API key is required for first-time setup');
      return;
    }
    
    try {
      await saveKey.mutateAsync({
        provider: prov,
        api_key: form.apiKey || undefined,
        preferred_text_model: form.textModel || undefined,
        preferred_image_model: form.imageModel || undefined,
      } as any);
      toast.success(form.apiKey ? `${prov} API key saved successfully!` : `${prov} settings updated successfully!`);
      // Clear the input box after save so it doesn't just sit there in plaintext
      if (form.apiKey) {
        setProviderForms(prev => ({
          ...prev,
          [prov]: { ...prev[prov], apiKey: '' }
        }));
      }
    } catch (err: any) {
      toast.error(getFriendlyApiError(err, 'Failed to save settings. Make sure your API key is valid.'));
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
  const configuredTextModel = (prov: string) => keys?.find(k => k.provider === prov)?.preferred_text_model;
  const configuredImageModel = (prov: string) => keys?.find(k => k.provider === prov)?.preferred_image_model;

  if (keysLoading || !profile || modelsLoading) {
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
        
        <div className="flex flex-col sm:flex-row flex-wrap gap-6">
          <div className="flex flex-col gap-2 flex-1 min-w-[200px]">
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
          
          <div className="flex flex-col gap-2 flex-1 min-w-[200px]">
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
          const hasText = !!config.textModels;
          const hasImage = !!config.imageModels;
          
          const isButtonDisabled = !providerForms[prov].apiKey && (!configured || (
            (hasText && providerForms[prov].textModel === configuredTextModel(prov)) &&
            (hasImage && providerForms[prov].imageModel === configuredImageModel(prov))
          )) || saveKey.isPending;
          
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
              
              <div className="flex flex-col md:flex-row flex-wrap gap-3 items-end">
                <div className="flex flex-col gap-1.5 flex-1 min-w-[200px]">
                  <label className="text-[11px] font-medium text-text-secondary uppercase tracking-wide truncate">
                    {configured ? 'Overwrite API Key' : 'API Key'}
                  </label>
                  <input 
                    type="password"
                    placeholder={`Enter ${config.name} API Key...`}
                    className="w-full h-11 px-3 py-2 bg-background border border-border rounded-lg text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
                    value={providerForms[prov].apiKey}
                    onChange={(e) => setProviderForms(prev => ({...prev, [prov]: { ...prev[prov], apiKey: e.target.value }}))}
                  />
                </div>
                
                {hasText && (
                  <div className="flex flex-col gap-1.5 flex-1 min-w-[200px]">
                    <label className="text-[11px] font-medium text-text-secondary uppercase tracking-wide truncate">
                      Text Model
                    </label>
                    <Select 
                      value={providerForms[prov].textModel}
                      onValueChange={(val) => setProviderForms(prev => ({...prev, [prov]: { ...prev[prov], textModel: val }}))}
                    >
                      {config.textModels?.map(m => (
                        <SelectItem key={m.id} value={m.id}>
                          <div className="flex items-center justify-between w-full min-w-0 gap-2 pr-6">
                            <span className="truncate">{m.label} {configuredTextModel(prov) === m.id ? '(Saved)' : ''}</span>
                            <span className={`flex-shrink-0 px-1.5 py-0.5 text-[9px] uppercase font-bold tracking-wider rounded ${
                              m.badge.includes('Free') ? 'bg-[#E6F4EA] text-[#137333] dark:bg-green-900/30 dark:text-green-400' :
                              (m.badge.includes('Recommended') || m.badge.includes('Default')) ? 'bg-accent/10 text-accent' :
                              'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                            }`}>{m.badge}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </Select>
                  </div>
                )}
                
                {hasImage && (
                  <div className="flex flex-col gap-1.5 flex-1 min-w-[200px]">
                    <label className="text-[11px] font-medium text-text-secondary uppercase tracking-wide truncate">
                      Image Model
                    </label>
                    <Select 
                      value={providerForms[prov].imageModel}
                      onValueChange={(val) => setProviderForms(prev => ({...prev, [prov]: { ...prev[prov], imageModel: val }}))}
                    >
                      {config.imageModels?.map(m => (
                        <SelectItem key={m.id} value={m.id}>
                          <div className="flex items-center justify-between w-full min-w-0 gap-2 pr-6">
                            <span className="truncate">{m.label} {configuredImageModel(prov) === m.id ? '(Saved)' : ''}</span>
                            <span className={`flex-shrink-0 px-1.5 py-0.5 text-[9px] uppercase font-bold tracking-wider rounded ${
                              m.badge.includes('Free') ? 'bg-[#E6F4EA] text-[#137333] dark:bg-green-900/30 dark:text-green-400' :
                              (m.badge.includes('Recommended') || m.badge.includes('Default')) ? 'bg-accent/10 text-accent' :
                              'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                            }`}>{m.badge}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </Select>
                  </div>
                )}
                
                <div className="w-full md:w-auto min-w-[100px] flex-none">
                  <Button
                    type="button"
                    variant="primary"
                    disabled={isButtonDisabled}
                    onClick={() => handleSaveKey(prov)}
                    className="w-full h-11"
                  >
                    {saveKey.isPending && saveKey.variables?.provider === prov ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
