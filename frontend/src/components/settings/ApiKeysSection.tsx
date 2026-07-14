import { useState } from 'react';
import { useUserKeys, useSaveUserKey, useDeleteUserKey } from '../../api/queries';
import { toast } from '../../lib/toast';
import { getFriendlyApiError } from '../../utils/errors';
import { Loader2, Key, Trash2, CheckCircle2 } from 'lucide-react';
import { Select, SelectItem } from '../primitives/Select';

export function ApiKeysSection() {
  const { data: keys, isLoading } = useUserKeys();
  const saveKey = useSaveUserKey();
  const deleteKey = useDeleteUserKey();

  const [provider, setProvider] = useState('groq');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('llama-3.2-90b-vision-preview');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey) {
      toast.error('API key is required');
      return;
    }
    
    try {
      await saveKey.mutateAsync({
        provider,
        api_key: apiKey,
        preferred_model: model,
      });
      toast.success(`${provider} API key saved successfully!`);
      setApiKey('');
    } catch (err: any) {
      toast.error(getFriendlyApiError(err, 'Failed to save API key. Make sure it is valid.'));
    }
  };

  const handleDelete = async (prov: string) => {
    if (!confirm(`Are you sure you want to delete your ${prov} API key?`)) return;
    try {
      await deleteKey.mutateAsync(prov);
      toast.success(`${prov} key removed.`);
    } catch (err: any) {
      toast.error(getFriendlyApiError(err, 'Failed to delete key.'));
    }
  };

  if (isLoading) {
    return (
      <div className="p-5 border border-border rounded-xl bg-surface flex justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-text-secondary" />
      </div>
    );
  }

  const configuredProviders = keys || [];

  return (
    <div className="flex flex-col gap-6">
      {/* List Configured Keys */}
      {configuredProviders.length > 0 && (
        <div className="flex flex-col gap-3">
          <h4 className="text-sm font-medium text-text-primary">Configured Keys</h4>
          <div className="flex flex-col gap-2">
            {configuredProviders.map(k => (
              <div key={k.provider} className="flex items-center justify-between p-3 rounded-lg border border-border bg-surface">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-accent/10 text-accent">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium capitalize text-text-primary">{k.provider}</p>
                    <p className="text-xs text-text-secondary">Model: {k.preferred_model || 'Default'}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(k.provider)}
                  className="p-2 text-text-secondary hover:text-red-500 transition-colors rounded-md hover:bg-red-50 dark:hover:bg-red-950/30"
                  disabled={deleteKey.isPending}
                >
                  {deleteKey.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add New Key Form */}
      <form onSubmit={handleSave} className="flex flex-col gap-4 p-5 rounded-xl border border-border bg-surface">
        <h4 className="text-sm font-medium text-text-primary flex items-center gap-2">
          <Key className="w-4 h-4 text-text-secondary" />
          Add Custom API Key
        </h4>
        <p className="text-xs text-text-secondary mb-2">
          Override platform keys with your own. <strong>Gemini</strong> and <strong>Replicate</strong> power image generation. <strong>Groq</strong> powers room analysis (text).
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select 
            value={provider} 
            onValueChange={(val) => {
              setProvider(val);
              if (val === 'groq') setModel('llama-3.2-90b-vision-preview');
              else if (val === 'gemini') setModel('gemini-2.5-flash');
              else if (val === 'replicate') setModel('black-forest-labs/flux-kontext-pro');
            }} 
            label="Provider"
          >
            <SelectItem value="groq">Groq (Text)</SelectItem>
            <SelectItem value="gemini">Gemini (Text & Image)</SelectItem>
            <SelectItem value="replicate">Replicate (Image)</SelectItem>
          </Select>

          {provider === 'groq' && (
            <Select value={model} onValueChange={setModel} label="Preferred Model">
              <SelectItem value="llama-3.2-90b-vision-preview">Llama 3.2 90B Vision</SelectItem>
              <SelectItem value="llama-3.3-70b-versatile">Llama 3.3 70B Versatile</SelectItem>
              <SelectItem value="llama3-70b-8192">Llama 3 70B</SelectItem>
              <SelectItem value="mixtral-8x7b-32768">Mixtral 8x7B</SelectItem>
            </Select>
          )}
          {provider === 'gemini' && (
            <Select value={model} onValueChange={setModel} label="Preferred Model">
              <SelectItem value="gemini-2.5-flash">Gemini 2.5 Flash</SelectItem>
              <SelectItem value="gemini-2.5-flash-lite">Gemini 2.5 Flash Lite</SelectItem>
              <SelectItem value="gemini-2.0-flash">Gemini 2.0 Flash</SelectItem>
            </Select>
          )}
          {provider === 'replicate' && (
             <Select value={model} onValueChange={setModel} label="Preferred Model">
                <SelectItem value="black-forest-labs/flux-kontext-pro">Flux Kontext Pro</SelectItem>
             </Select>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-text-secondary">API Key</label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={`Enter your ${provider} API key...`}
            className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>

        <div className="flex justify-end mt-2">
          <button
            type="submit"
            disabled={saveKey.isPending || !apiKey}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-accent rounded-lg hover:bg-accent/90 disabled:opacity-50 transition-colors"
          >
            {saveKey.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Key'}
          </button>
        </div>
      </form>
    </div>
  );
}
