import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dropzone } from '../components/upload/Dropzone';
import { AdvancedOptions } from '../components/upload/AdvancedOptions';
import { Card } from '../components/primitives/Card';
import { Badge } from '../components/primitives/Badge';
import { Skeleton } from '../components/primitives/Skeleton';
import { useConfig, useStyles, useAnalyzeRoom, useActiveProvider, useActiveTextProvider } from '../api/queries';
import { useUIStore } from '../store/uiStore';
import { titleCase } from '../lib/utils';
import { toast } from '../lib/toast';
import { useRequireAuthAction } from '../auth/useRequireAuthAction';
import { toHexColor, needsColorBorder, formatColorName } from '../utils/colorHelpers';
import { ProviderWarning } from '../components/common/ProviderWarning';


export function UploadPage() {
  const navigate = useNavigate();
  const { data: config } = useConfig();
  const { data: styles, isLoading: stylesLoading } = useStyles();
  const { data: activeImageProvider, isLoading: imageProviderLoading } = useActiveProvider();
  const { data: activeTextProvider, isLoading: textProviderLoading } = useActiveTextProvider();

  // Derived state
  const hasImageProvider = activeImageProvider?.is_available ?? false;
  const hasTextProvider = activeTextProvider?.is_available ?? false;
  const providersLoading = imageProviderLoading || textProviderLoading;
  const hasAllProviders = hasImageProvider && hasTextProvider;


  const pendingFile = useUIStore((s) => s.pendingFile);
  const pendingPreviewUrl = useUIStore((s) => s.pendingPreviewUrl);
  const selectedStyleId = useUIStore((s) => s.selectedStyleId);
  const setPendingUpload = useUIStore((s) => s.setPendingUpload);
  const setSelectedStyle = useUIStore((s) => s.setSelectedStyle);
  const clearUpload = useUIStore((s) => s.clearUpload);

  const analyze = useAnalyzeRoom();
  const [customization, setCustomization] = useState<any>({});
  
  const canSubmit = !!pendingFile && !!selectedStyleId && hasAllProviders;
  const selectedStyle = styles?.find((s) => s.id === selectedStyleId);
  const requireAuth = useRequireAuthAction();

  // Define handleSubmit before the event listener so TypeScript sees it
  const handleSubmit = async () => {
    if (!pendingFile || !selectedStyleId) return;
    try {
      const result = await analyze.mutateAsync({ image: pendingFile, style: selectedStyleId });
      clearUpload();
      navigate(`/analysis/${result.analysis_id}`, { state: { analysis: result, customization } });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to analyze room';
      toast.error(msg);
    }
  };

  // Resume pending action after sign in — re-register whenever handleSubmit changes (i.e. file/style changes)
  useEffect(() => {
    const handleResume = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.type === 'analyze') {
        handleSubmit();
      }
    };
    window.addEventListener('roomcanvas:resume-action', handleResume);
    return () => window.removeEventListener('roomcanvas:resume-action', handleResume);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleSubmit]);

  // Revoke object URL on unmount
  useEffect(() => {
    return () => {
      if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
    };
  }, [pendingPreviewUrl]);

  const handleFileAccepted = (file: File) => {
    if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
    const url = URL.createObjectURL(file);
    setPendingUpload(file, url);
  };

  const handleRemove = () => {
    if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
    setPendingUpload(null, null);
  };

  const handleAnalyzeClick = () => {
    requireAuth(
      () => handleSubmit(),
      { type: 'analyze', payload: { file: pendingFile, style: selectedStyleId } }
    );
  };

  const budgetVariant = (tag: string) => {
    const t = tag.toLowerCase();
    if (t.includes('budget')) return 'success';
    if (t.includes('premium')) return 'accent';
    return 'info';
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 py-8 sm:py-12 md:py-20 page-enter">
      <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
        <p className="text-xs font-semibold uppercase tracking-widest text-accent mb-3">Start a new project</p>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-text-primary mb-4" style={{ lineHeight: 1.1 }}>
          Design your room
        </h1>
        <p className="text-base sm:text-lg text-text-secondary leading-relaxed px-4 sm:px-0">
          Upload a photo of your space and choose an aesthetic direction. Our AI will analyze the room and generate a complete redesign.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8 lg:gap-12 xl:gap-16 items-start">
        
        {/* Left Col: Styles */}
        <section aria-labelledby="style-heading" className="order-2 lg:order-1">
          <div className="flex items-center gap-3 mb-4 sm:mb-6">
            <div className="flex items-center justify-center h-8 w-8 rounded-full bg-surface-alt border border-border text-sm font-semibold text-text-primary">1</div>
            <h2 id="style-heading" className="text-base sm:text-lg font-semibold text-text-primary">
              Select an aesthetic
            </h2>
          </div>
          
          {stylesLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-[140px] rounded-2xl" />
              ))}
            </div>
          ) : (
            <div
              role="radiogroup"
              aria-label="Design style"
              className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4"
            >
              {styles?.map((style) => (
                <Card
                  key={style.id}
                  interactive
                  selected={selectedStyleId === style.id}
                  onClick={() => setSelectedStyle(style.id)}
                  role="radio"
                  aria-checked={selectedStyleId === style.id}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedStyle(style.id);
                    }
                  }}
                  className="p-5 sm:p-6 flex flex-col gap-3 sm:gap-4 h-full group active:scale-[0.98] transition-transform touch-manipulation"
                >
                  <div className="flex items-start justify-between gap-4 w-full">
                    <h3 className="text-base sm:text-lg font-semibold text-text-primary leading-snug break-words">
                      {titleCase(style.id)}
                    </h3>
                    <Badge variant={budgetVariant(style.budget_tag) as any} dot className="flex-shrink-0 mt-0.5">
                      {style.budget_tag}
                    </Badge>
                  </div>
                  
                  <div className="flex-1 overflow-hidden">
                    <p className="text-sm text-text-secondary leading-relaxed">
                      {style.furniture.slice(0, 2).join(', ')}.
                    </p>
                  </div>

                  <div className="flex items-center text-sm font-medium text-text-tertiary group-hover:text-accent transition-colors pt-2 mt-auto border-t border-border border-opacity-50">
                    <span className="mr-1">Select style</span>
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Right Col: Upload & Submit */}
        <section aria-labelledby="upload-heading" className="order-1 lg:order-2 lg:sticky lg:top-24">
          <div className="flex items-center gap-3 mb-4 sm:mb-6">
            <div className="flex items-center justify-center h-8 w-8 rounded-full bg-surface-alt border border-border text-sm font-semibold text-text-primary">2</div>
            <h2 id="upload-heading" className="text-base sm:text-lg font-semibold text-text-primary">
              Upload photo
            </h2>
          </div>

          <AnimatePresence mode="popLayout">
            {selectedStyle && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: 'auto', marginBottom: 20 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-surface rounded-2xl border border-accent/20 ring-1 ring-accent/10 p-4 sm:p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-text-primary">
                      {titleCase(selectedStyle.id)}
                    </span>
                    <Badge variant="outline" className="text-[10px] uppercase tracking-wider py-0.5">Palette</Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {selectedStyle.palette.map((color, i) => {
                      const hexColor = toHexColor(color);
                      const hasBorder = needsColorBorder(hexColor);
                      return (
                        <div
                          key={i}
                          className={`h-9 w-9 rounded-lg shadow-sm transition-transform hover:scale-110 ${
                            hasBorder ? 'border border-border/40' : ''
                          }`}
                          style={{ backgroundColor: hexColor }}
                          title={formatColorName(color)}
                          aria-label={`${formatColorName(color)} color swatch`}
                          role="img"
                        />
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          <div className="bg-surface rounded-2xl border border-border p-4 sm:p-5 shadow-sm mb-5 sm:mb-6">
            <Dropzone
              onFileAccepted={handleFileAccepted}
              maxSizeMB={config?.max_upload_mb ?? 10}
              allowedTypes={config?.allowed_types ?? ['image/jpeg', 'image/png', 'image/webp']}
              previewUrl={pendingPreviewUrl ?? undefined}
              onRemove={handleRemove}
            />
          </div>

          <div className="mb-5">
            <AdvancedOptions value={customization} onChange={setCustomization} />
          </div>

          <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-border">
            {!providersLoading && !hasAllProviders && (
              <ProviderWarning className="mb-2" />
            )}
            
            <button
              onClick={handleAnalyzeClick}
              disabled={!canSubmit || providersLoading}
              className="w-full flex justify-center items-center h-[52px] bg-accent text-white text-[15px] font-medium rounded-xl hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
            >
              {analyze.isPending || providersLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>{providersLoading ? 'Checking setup...' : 'Analyzing Room...'}</span>
                </div>
              ) : (
                'Generate Design'
              )}
            </button>

            {!providersLoading && hasAllProviders && (
              <p className="text-center text-[11px] text-text-tertiary">
                Using: {activeTextProvider?.provider_name} & {activeImageProvider?.provider_name}
              </p>
            )}

            <AnimatePresence>
              {!canSubmit && !analyze.isPending && hasAllProviders && (
                <motion.p 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-sm text-text-tertiary text-center px-4" 
                  aria-live="polite"
                >
                  {!selectedStyleId && !pendingFile
                    ? 'Select a style and upload a photo.'
                    : !selectedStyleId
                    ? 'Select a design style to continue.'
                    : 'Upload a room photo to continue.'}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </section>
      </div>
    </div>
  );
}
