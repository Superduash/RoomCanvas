import { AlertTriangle, Key } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../primitives/Button';

interface ProviderWarningProps {
  className?: string;
}

export function ProviderWarning({ className }: ProviderWarningProps) {
  return (
    <div
      className={[
        'flex flex-col items-start w-full rounded-xl p-4 shadow-sm',
        // Light: soft amber — Dark: warm dark amber
        'bg-amber-50 border border-amber-300 text-amber-900',
        'dark:bg-amber-950/40 dark:border-amber-700/60 dark:text-amber-200',
        className || '',
      ].join(' ')}
    >
      <div className="flex items-start gap-3 w-full">
        <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5 text-amber-500 dark:text-amber-400" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold mb-1">
            No image generation provider is available.
          </p>
          <p className="text-sm leading-relaxed mb-4 opacity-90">
            Please add a Gemini or Replicate API key in Settings → API Keys before generating designs.
          </p>
          <Link to="/settings">
            <Button
              variant="secondary"
              size="sm"
              icon={<Key className="h-4 w-4" />}
              className="bg-white hover:bg-amber-50 border-amber-300 text-amber-900 dark:bg-amber-900/30 dark:hover:bg-amber-900/50 dark:border-amber-700/60 dark:text-amber-200"
            >
              Open API Key Settings
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
