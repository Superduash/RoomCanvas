import { useCallback, useState, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Replace, AlertTriangle, ImageIcon } from 'lucide-react';
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
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const onDrop = useCallback(
    (accepted: File[]) => {
      setCustomError('');
      if (accepted[0]) onFileAccepted(accepted[0]);
    },
    [onFileAccepted]
  );

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept: acceptObj,
    maxSize: maxSizeBytes,
    multiple: false,
  });

  const handleCameraChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomError('');
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > maxSizeBytes) {
      setCustomError(`File is too large — max ${maxSizeMB}MB`);
      return;
    }
    
    // Optional chaining in case type is somehow missing, though rare
    if (file.type && !allowedTypes.includes(file.type)) {
      const fmts = allowedTypes.map(mimeToExtensions).join(', ');
      setCustomError(`Unsupported format — use ${fmts}`);
      return;
    }

    onFileAccepted(file);
    // Reset input so taking another photo works if they remove and retake
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

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
      <div className="relative aspect-[4/3] rounded-xl overflow-hidden border border-border shadow-sm group bg-surface-alt">
        <img
          src={previewUrl}
          alt="Room preview"
          className="w-full h-full object-cover transition-transform duration-slow group-hover:scale-[1.02]"
          fetchPriority="high"
          decoding="async"
        />
        {/* Subtle gradient overlay on hover for better button contrast */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-base pointer-events-none" />
        
        {/* Overlay controls */}
        <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-base focus-within:opacity-100">
          <div {...getRootProps()}>
            <input {...getInputProps()} />
            <button
              type="button"
              className="flex items-center gap-2 rounded-lg bg-surface/95 backdrop-blur-sm border border-border/50 px-3 py-2 text-sm font-medium text-text-primary shadow-sm hover:bg-surface transition-all duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <Replace className="h-4 w-4 text-text-secondary" />
              Replace
            </button>
          </div>
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="flex items-center justify-center h-9 w-9 rounded-lg bg-surface/95 backdrop-blur-sm border border-border/50 shadow-sm hover:bg-danger hover:border-danger hover:text-white text-text-secondary transition-all duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger"
              aria-label="Remove image"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        {...getRootProps()}
        className={cn(
          'relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed',
          'h-64 md:h-[320px] transition-all duration-base cursor-pointer',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2',
          isDragActive
            ? 'border-accent bg-accent-subtle scale-[1.01] shadow-sm'
            : errorMessage
            ? 'border-danger bg-danger-subtle'
            : 'border-border-strong bg-surface hover:border-accent/40 hover:bg-accent/[0.02]'
        )}
      >
        {/* The standard dropzone file picker (without capture) */}
        <input {...getInputProps()} />

        {/* The hidden native camera input */}
        <input 
          type="file" 
          accept="image/*" 
          capture="environment" 
          ref={cameraInputRef} 
          className="hidden" 
          onChange={handleCameraChange} 
        />

        <div className="flex flex-col items-center gap-4 text-center px-6">
          <div className={cn(
            'flex items-center justify-center h-16 w-16 rounded-full shadow-sm transition-all duration-base',
            isDragActive 
              ? 'bg-accent text-white scale-110' 
              : 'bg-surface-alt text-text-secondary border border-border'
          )}>
            {isDragActive ? (
              <Upload className="h-7 w-7" />
            ) : (
              <ImageIcon className="h-7 w-7" />
            )}
          </div>
          <div>
            <p className="text-base font-semibold text-text-primary mb-1">
              {isDragActive ? 'Drop your photo here' : 'Drag & drop your photo'}
            </p>
            <p className="text-sm text-text-secondary mb-1">
              or use the options below
            </p>
            <p className="text-xs text-text-tertiary font-mono">
              {allowedTypes.map(mimeToExtensions).join(', ')} up to {maxSizeMB}MB
            </p>
          </div>
          <div className="flex gap-3 mt-2 z-10">
            <Button variant="secondary" size="md" type="button" className="pointer-events-none">
              Browse files
            </Button>
            <Button 
              variant="primary" 
              size="md" 
              type="button" 
              onClick={(e) => {
                e.stopPropagation(); // Prevent the dropzone file picker from opening
                cameraInputRef.current?.click();
              }}
            >
              Take Photo
            </Button>
          </div>
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
