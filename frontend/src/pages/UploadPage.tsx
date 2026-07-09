import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../components/primitives/Button';
import { Dropzone } from '../components/upload/Dropzone';
import { Card } from '../components/primitives/Card';
import { Badge } from '../components/primitives/Badge';
import { Skeleton } from '../components/primitives/Skeleton';
import { useConfig, useStyles, useAnalyzeRoom } from '../api/queries';
import { useUIStore } from '../store/uiStore';
import { titleCase } from '../lib/utils';
import { toast } from '../lib/toast';

export function UploadPage() {
  const navigate = useNavigate();
  const { data: config } = useConfig();
  const { data: styles, isLoading: stylesLoading } = useStyles();

  const pendingFile = useUIStore((s) => s.pendingFile);
  const pendingPreviewUrl = useUIStore((s) => s.pendingPreviewUrl);
  const selectedStyleId = useUIStore((s) => s.selectedStyleId);
  const setPendingUpload = useUIStore((s) => s.setPendingUpload);
  const setSelectedStyle = useUIStore((s) => s.setSelectedStyle);
  const clearUpload = useUIStore((s) => s.clearUpload);

  const analyze = useAnalyzeRoom();
  const canSubmit = !!pendingFile && !!selectedStyleId;

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

  const handleSubmit = async () => {
    if (!pendingFile || !selectedStyleId) return;
    try {
      const result = await analyze.mutateAsync({ image: pendingFile, style: selectedStyleId });
      clearUpload();
      navigate(`/analysis/${result.analysis_id}`, { state: { analysis: result } });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to analyze room';
      toast.error(msg);
    }
  };

  const budgetVariant = (tag: string) => {
    if (tag === 'Budget-Friendly') return 'success';
    if (tag === 'Premium') return 'accent';
    return 'info';
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-12 md:py-20 page-enter">
      <div className="text-center max-w-2xl mx-auto mb-16">
        <p className="text-xs font-semibold uppercase tracking-widest text-accent mb-3">Start a new project</p>
        <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-text-primary mb-4" style={{ lineHeight: 1.1 }}>
          Design your room
        </h1>
        <p className="text-lg text-text-secondary leading-relaxed">
          Upload a photo of your space and choose an aesthetic direction. Our AI will analyze the room and generate a complete redesign.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-12 lg:gap-16 items-start">
        
        {/* Left Col: Styles */}
        <section aria-labelledby="style-heading" className="order-2 lg:order-1">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center justify-center h-8 w-8 rounded-full bg-surface-alt border border-border text-sm font-semibold text-text-primary">1</div>
            <h2 id="style-heading" className="text-lg font-semibold text-text-primary">
              Select an aesthetic
            </h2>
          </div>
          
          {stylesLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-[140px] rounded-2xl" />
              ))}
            </div>
          ) : (
            <div
              role="radiogroup"
              aria-label="Design style"
              className="grid grid-cols-1 sm:grid-cols-2 gap-4"
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
                  className="p-5 flex flex-col justify-between h-full"
                >
                  <div>
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-base font-semibold text-text-primary">{titleCase(style.id)}</h3>
                      <Badge variant={budgetVariant(style.budget_tag) as any} dot>
                        {style.budget_tag}
                      </Badge>
                    </div>
                    <p className="text-sm text-text-secondary leading-relaxed mb-4 line-clamp-2">
                      {style.furniture.join(', ')}
                    </p>
                  </div>
                  {/* Palette swatches */}
                  <div className="flex items-center gap-1.5 mt-auto pt-2 border-t border-border border-opacity-50">
                    <span className="text-xs text-text-tertiary mr-2 font-medium">Palette:</span>
                    {style.palette.slice(0, 4).map((color, i) => (
                      <div
                        key={i}
                        className="h-5 w-5 rounded-full shadow-xs border border-border/50"
                        style={{ backgroundColor: color.startsWith('#') ? color : undefined }}
                        title={color}
                        aria-hidden="true"
                      />
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Right Col: Upload & Submit */}
        <section aria-labelledby="upload-heading" className="order-1 lg:order-2 sticky top-24">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center justify-center h-8 w-8 rounded-full bg-surface-alt border border-border text-sm font-semibold text-text-primary">2</div>
            <h2 id="upload-heading" className="text-lg font-semibold text-text-primary">
              Upload photo
            </h2>
          </div>
          
          <div className="bg-surface rounded-2xl border border-border p-5 shadow-sm mb-6">
            <Dropzone
              onFileAccepted={handleFileAccepted}
              maxSizeMB={config?.max_upload_mb ?? 10}
              allowedTypes={config?.allowed_types ?? ['image/jpeg', 'image/png', 'image/webp']}
              previewUrl={pendingPreviewUrl ?? undefined}
              onRemove={handleRemove}
            />
          </div>

          <div className="flex flex-col gap-3">
            <Button
              variant="primary"
              size="lg"
              className="w-full justify-center shadow-md py-4 text-base"
              disabled={!canSubmit}
              loading={analyze.isPending}
              iconRight={!analyze.isPending ? <ArrowRight className="h-5 w-5" /> : undefined}
              onClick={handleSubmit}
            >
              {analyze.isPending ? 'Analyzing Room...' : 'Start Redesign'}
            </Button>

            <AnimatePresence>
              {!canSubmit && !analyze.isPending && (
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
