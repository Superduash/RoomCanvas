import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { ImagePlus, X, AlertTriangle } from 'lucide-react';
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
    noClick: true,
    noKeyboard: false,
  });

  // Enhanced native mobile picker handler
  const handleMobilePickerOpen = useCallback(async () => {
    // Try File System Access API first (for better PWA experience)
    if ('showOpenFilePicker' in window) {
      try {
        const [fileHandle] = await (window as any).showOpenFilePicker({
          types: [
            {
              description: 'Images',
              accept: {
                'image/*': ['.png', '.jpg', '.jpeg', '.webp']
              }
            }
          ],
          multiple: false,
        });
        const file = await fileHandle.getFile();
        
        // Validate file
        if (file.size > maxSizeBytes) {
          setCustomError(`File is too large — max ${maxSizeMB}MB`);
          return;
        }
        if (!allowedTypes.includes(file.type)) {
          const fmts = allowedTypes.map(mimeToExtensions).join(', ');
          setCustomError(`Unsupported format — use ${fmts}`);
          return;
        }
        
        setCustomError('');
        onFileAccepted(file);
        return;
      } catch (err: any) {
        // User cancelled or API not supported, fall through to regular input
        if (err.name !== 'AbortError') {
          console.warn('File System Access API failed:', err);
        }
      }
    }
    
    // Fallback: use react-dropzone's open method which triggers the file input
    open();
  }, [open, maxSizeBytes, maxSizeMB, allowedTypes, onFileAccepted]);

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
          
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/40 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-200" />
          
          <div className="absolute top-3 right-3 flex gap-2 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-200 focus-within:opacity-100">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleMobilePickerOpen}
              className="bg-surface/95 backdrop-blur-sm shadow-lg touch-manipulation active:scale-95"
            >
              <ImagePlus className="h-4 w-4 mr-1.5" strokeWidth={2} />
              Replace
            </Button>
            {onRemove && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onRemove}
                className="bg-surface/95 backdrop-blur-sm shadow-lg hover:bg-danger hover:text-white touch-manipulation active:scale-95"
                aria-label="Remove image"
              >
                <X className="h-4 w-4" strokeWidth={2} />
              </Button>
            )}
          </div>
        </div>
        {errorMessage && (
          <p className="text-sm text-danger flex items-center gap-2 p-3 rounded-lg bg-danger-subtle border border-danger/20" role="alert">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" aria-hidden="true" strokeWidth={2} />
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
          'min-h-[240px] sm:min-h-[280px] py-6 sm:py-8 px-4 sm:px-6 transition-all duration-200',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2',
          isDragActive
            ? 'border-accent bg-accent-subtle scale-[1.01] shadow-sm'
            : errorMessage
            ? 'border-danger bg-danger-subtle'
            : 'border-border-strong bg-surface hover:border-accent/40 hover:bg-accent/[0.02]'
        )}
      >
        <input {...getInputProps()} capture="environment" />

        <div className="flex flex-col items-center gap-3 sm:gap-4 text-center max-w-sm">
          <div>
            <p className="text-sm sm:text-base font-semibold text-text-primary mb-1 sm:mb-1.5">
              {isDragActive ? 'Drop your photo here' : 'Add a room photo'}
            </p>
            <p className="text-xs sm:text-sm text-text-secondary mb-0.5 sm:mb-1">
              Drag & drop or tap to choose
            </p>
            <p className="text-[11px] sm:text-xs text-text-tertiary font-mono">
              {allowedTypes.map(mimeToExtensions).join(', ')} • Max {maxSizeMB}MB
            </p>
          </div>

          <Button 
            variant="primary" 
            size="lg" 
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              open();
            }}
            icon={<ImagePlus className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={2} />}
            className="mt-1 sm:mt-2 shadow-md touch-manipulation active:scale-95 transition-transform h-12 sm:h-14 px-6 sm:px-8 text-sm sm:text-base"
          >
            Add Photo
          </Button>
        </div>
      </div>

      {errorMessage && (
        <p className="text-xs sm:text-sm text-danger flex items-center gap-2 p-2.5 sm:p-3 rounded-lg bg-danger-subtle border border-danger/20" role="alert">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" aria-hidden="true" strokeWidth={2} />
          {errorMessage}
        </p>
      )}
    </div>
  );
}
