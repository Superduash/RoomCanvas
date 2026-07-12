import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { ImagePlus, X, AlertTriangle, Image as ImageIcon } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../primitives/Button';

interface DropzoneProps {
  onFileAccepted: (file: File) => void;
  maxSizeMB: number;
  allowedTypes: string[];
  previewUrl?: string | null;
  onRemove?: () => void;
}

function mimeToExtensions(mime: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'JPEG',
    'image/jpg': 'JPG',
    'image/png': 'PNG',
    'image/webp': 'WEBP',
  };
  return map[mime] ?? mime.split('/')[1]?.toUpperCase() ?? mime;
}

export function Dropzone({ onFileAccepted, maxSizeMB, allowedTypes, previewUrl, onRemove }: DropzoneProps) {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  const acceptObj = allowedTypes.reduce<Record<string, string[]>>((acc, mime) => {
    acc[mime] = [];
    return acc;
  }, {});

  const [customError, setCustomError] = useState('');

  const onDrop = useCallback(
    (accepted: File[]) => {
      setCustomError('');
      if (accepted[0]) onFileAccepted(accepted[0]);
    },
    [onFileAccepted]
  );

  const { getRootProps, getInputProps, isDragActive, fileRejections, open } = useDropzone({
    onDrop,
    accept: acceptObj,
    maxSize: maxSizeBytes,
    multiple: false,
    noClick: true, // We'll handle clicks manually
    noKeyboard: false,
  });

  const rejectionReason = fileRejections[0]?.errors[0];
  let errorMessage = customError;
  if (!errorMessage && rejectionReason) {
    if (rejectionReason.code === 'file-too-large') {
      errorMessage = `File is too large — max ${maxSizeMB}MB`;
    } else if (rejectionReason.code === 'file-invalid-type') {
      const fmts = allowedTypes.map(mimeToExtensions).join(', ');
      errorMessage = `Unsupported format — use ${fmts}`;
    } else {
      errorMessage = rejectionReason.message;
    }
  }

  if (previewUrl) {
    return (
      <div className="flex flex-col gap-3">
        <div className="relative aspect-[4/3] rounded-xl overflow-hidden border border-border shadow-sm group bg-surface-alt">
          <img
            src={previewUrl}
            alt="Room preview"
            className="w-full h-full object-cover"
            fetchPriority="high"
            decoding="async"
          />
          
          {/* Mobile: show controls always, Desktop: show on hover */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/40 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-200" />
          
          <div className="absolute top-3 right-3 flex gap-2 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-200 focus-within:opacity-100">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={open}
              className="bg-surface/95 backdrop-blur-sm shadow-lg"
            >
              <ImagePlus className="h-4 w-4 mr-1.5" />
              Replace
            </Button>
            {onRemove && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onRemove}
                className="bg-surface/95 backdrop-blur-sm shadow-lg hover:bg-danger hover:text-white"
                aria-label="Remove image"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        {errorMessage && (
          <p className="text-sm text-danger flex items-center gap-2 p-3 rounded-lg bg-danger-subtle border border-danger/20" role="alert">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
            {errorMessage}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        {...getRootProps()}
        className={cn(
          'relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed',
          'min-h-[280px] py-8 px-6 transition-all duration-200',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2',
          isDragActive
            ? 'border-accent bg-accent-subtle scale-[1.01] shadow-sm'
            : errorMessage
            ? 'border-danger bg-danger-subtle'
            : 'border-border-strong bg-surface hover:border-accent/40 hover:bg-accent/[0.02]'
        )}
      >
        <input {...getInputProps()} />

        <div className="flex flex-col items-center gap-4 text-center max-w-sm">
          <div className={cn(
            'flex items-center justify-center h-16 w-16 rounded-full shadow-sm transition-all duration-200',
            isDragActive 
              ? 'bg-accent text-white scale-110' 
              : 'bg-surface-alt text-text-secondary border border-border'
          )}>
            {isDragActive ? (
              <ImagePlus className="h-7 w-7" />
            ) : (
              <ImageIcon className="h-7 w-7" />
            )}
          </div>
          
          <div>
            <p className="text-base font-semibold text-text-primary mb-1.5">
              {isDragActive ? 'Drop your photo here' : 'Add a room photo'}
            </p>
            <p className="text-sm text-text-secondary mb-1">
              Drag & drop or tap to choose
            </p>
            <p className="text-xs text-text-tertiary font-mono">
              {allowedTypes.map(mimeToExtensions).join(', ')} • Max {maxSizeMB}MB
            </p>
          </div>

          {/* Single button that opens native picker (Camera/Gallery/Files) */}
          <Button 
            variant="primary" 
            size="lg" 
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              open();
            }}
            className="mt-2 shadow-md active:scale-95 transition-transform touch-manipulation"
          >
            <ImagePlus className="h-5 w-5 mr-2" />
            Add Photo
          </Button>
        </div>
      </div>

      {errorMessage && (
        <p className="text-sm text-danger flex items-center gap-2 p-3 rounded-lg bg-danger-subtle border border-danger/20" role="alert">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
          {errorMessage}
        </p>
      )}
    </div>
  );
}
