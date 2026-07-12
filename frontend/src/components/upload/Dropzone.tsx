import { useCallback, useState, useRef, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { ImagePlus, X, AlertTriangle, Camera, FolderOpen } from 'lucide-react';
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

// Platform detection
function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  
  // Check user agent
  const ua = navigator.userAgent.toLowerCase();
  const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua);
  
  // Check touch support
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  
  // Check screen size as secondary indicator
  const isSmallScreen = window.innerWidth <= 768;
  
  return isMobileUA || (hasTouch && isSmallScreen);
}

export function Dropzone({ onFileAccepted, maxSizeMB, allowedTypes, previewUrl, onRemove }: DropzoneProps) {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  const [isMobile, setIsMobile] = useState(false);
  const [customError, setCustomError] = useState('');
  
  // Separate refs for camera and file inputs
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Detect platform on mount
  useEffect(() => {
    setIsMobile(isMobileDevice());
  }, []);

  const acceptObj = allowedTypes.reduce<Record<string, string[]>>((acc, mime) => {
    acc[mime] = [];
    return acc;
  }, {});

  const validateAndAcceptFile = useCallback((file: File) => {
    setCustomError('');
    
    // Validate size
    if (file.size > maxSizeBytes) {
      setCustomError(`File is too large — max ${maxSizeMB}MB`);
      return;
    }
    
    // Validate type
    if (!allowedTypes.includes(file.type)) {
      const fmts = allowedTypes.map(mimeToExtensions).join(', ');
      setCustomError(`Unsupported format — use ${fmts}`);
      return;
    }
    
    onFileAccepted(file);
  }, [maxSizeBytes, maxSizeMB, allowedTypes, onFileAccepted]);

  const onDrop = useCallback(
    (accepted: File[]) => {
      if (accepted[0]) validateAndAcceptFile(accepted[0]);
    },
    [validateAndAcceptFile]
  );

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept: acceptObj,
    maxSize: maxSizeBytes,
    multiple: false,
    noClick: true,
    noKeyboard: false,
    disabled: isMobile, // Disable dropzone on mobile
  });

  // Handle camera capture
  const handleCameraClick = useCallback(() => {
    cameraInputRef.current?.click();
  }, []);

  // Handle file browse
  const handleBrowseClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Handle file selection from inputs
  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      validateAndAcceptFile(file);
    }
    // Reset input so same file can be selected again
    e.target.value = '';
  }, [validateAndAcceptFile]);

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
              onClick={handleBrowseClick}
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
      {/* Hidden file inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept={allowedTypes.join(',')}
        capture="environment"
        onChange={handleFileInputChange}
        className="hidden"
        aria-label="Capture photo with camera"
      />
      <input
        ref={fileInputRef}
        type="file"
        accept={allowedTypes.join(',')}
        onChange={handleFileInputChange}
        className="hidden"
        aria-label="Choose file from device"
      />

      <div
        {...(isMobile ? {} : getRootProps())}
        className={cn(
          'relative flex flex-col items-center justify-center rounded-xl transition-all duration-200',
          isMobile ? 'border border-border bg-surface py-8 px-4' : 'border-2 border-dashed',
          !isMobile && 'min-h-[240px] sm:min-h-[280px] py-6 sm:py-8 px-4 sm:px-6',
          !isMobile && 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2',
          !isMobile && isDragActive && 'border-accent bg-accent-subtle scale-[1.01] shadow-sm',
          !isMobile && !isDragActive && errorMessage && 'border-danger bg-danger-subtle',
          !isMobile && !isDragActive && !errorMessage && 'border-border-strong bg-surface hover:border-accent/40 hover:bg-accent/[0.02]'
        )}
      >
        {!isMobile && <input {...getInputProps()} />}

        <div className="flex flex-col items-center gap-4 text-center max-w-sm w-full">
          <div>
            <p className="text-sm sm:text-base font-semibold text-text-primary mb-1 sm:mb-1.5">
              {!isMobile && isDragActive ? 'Drop your photo here' : 'Add a room photo'}
            </p>
            {!isMobile && (
              <p className="text-xs sm:text-sm text-text-secondary mb-0.5 sm:mb-1">
                Drag & drop or click to browse
              </p>
            )}
            <p className="text-[11px] sm:text-xs text-text-tertiary font-mono">
              {allowedTypes.map(mimeToExtensions).join(', ')} • Max {maxSizeMB}MB
            </p>
          </div>

          {/* Platform-specific buttons */}
          {isMobile ? (
            // Mobile: Two buttons (Camera + Browse)
            <div className="flex flex-col gap-3 w-full">
              <Button 
                variant="primary" 
                size="lg" 
                type="button"
                onClick={handleCameraClick}
                icon={<Camera className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={2} />}
                className="w-full shadow-md touch-manipulation active:scale-95 transition-transform h-12 sm:h-14 text-sm sm:text-base"
              >
                Take Photo
              </Button>
              <Button 
                variant="secondary" 
                size="lg" 
                type="button"
                onClick={handleBrowseClick}
                icon={<FolderOpen className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={2} />}
                className="w-full shadow-sm touch-manipulation active:scale-95 transition-transform h-12 sm:h-14 text-sm sm:text-base"
              >
                Browse Files
              </Button>
            </div>
          ) : (
            // Desktop: Single browse button
            <Button 
              variant="primary" 
              size="lg" 
              type="button"
              onClick={handleBrowseClick}
              icon={<FolderOpen className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={2} />}
              className="mt-1 sm:mt-2 shadow-md hover:shadow-lg transition-all h-12 px-6 text-sm sm:text-base"
            >
              Browse Files
            </Button>
          )}
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
