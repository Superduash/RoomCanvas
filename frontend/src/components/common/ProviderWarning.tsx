import { AlertTriangle, Key } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../primitives/Button';

interface ProviderWarningProps {
  className?: string;
}

export function ProviderWarning({ className }: ProviderWarningProps) {
  return (
    <div className={`flex flex-col items-start w-full rounded-xl bg-warning-subtle border border-warning/20 p-4 shadow-sm ${className || ''}`}>
      <div className="flex items-start gap-3 w-full">
        <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-warning mb-1">No image generation provider is available.</p>
          <p className="text-sm text-warning/90 leading-relaxed mb-4">
            Please add a Gemini or Replicate API key in Settings → API Keys before generating designs.
          </p>
          <Link to="/settings">
            <Button variant="secondary" size="sm" icon={<Key className="h-4 w-4" />} className="bg-white hover:bg-surface border-warning/30 text-text-primary">
              Open API Key Settings
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
