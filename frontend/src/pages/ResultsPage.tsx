import { useEffect, useMemo, useState } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download, Check, RefreshCw, Share2, ChevronLeft, AlertTriangle, Layers, Clock, Sparkles,
  SplitSquareHorizontal, Image as ImageIcon, ArrowLeftRight, Plus
} from 'lucide-react';
import React, { Suspense } from 'react';
import { AnalysisStepper } from '../components/analysis/AnalysisStepper';
import { CompareSliderSkeleton } from '../components/results/CompareSlider';
const CompareSlider = React.lazy(() => import('../components/results/CompareSlider').then(m => ({ default: m.CompareSlider })));
const RefinementPanel = React.lazy(() => import('../components/refine/RefinementPanel').then(m => ({ default: m.RefinementPanel })));
const CustomizationPanel = React.lazy(() => import('../components/refine/CustomizationPanel').then(m => ({ default: m.CustomizationPanel })));
import {
  FurnitureList, DimensionCard, PaletteSwatches, BudgetCard, TextBlock, DesignRationale
} from '../components/results/RecommendationPanel';
import { MeasurementOverlay } from '../components/measurement/MeasurementOverlay';
import { Button } from '../components/primitives/Button';
import { Badge } from '../components/primitives/Badge';
import { Skeleton, SkeletonText } from '../components/primitives/Skeleton';
import { useProjectTimeline, useGenerateDesign, useSelectVariation } from '../api/queries';
import { useUIStore } from '../store/uiStore';
import { resolveImageUrl } from '../api/client';
import { formatRelativeTime } from '../lib/utils';
import type { AnalyzeResponse } from '../api/types';
import { toast } from '../lib/toast';
import { formatStyleName } from '../utils/formatters';

type ViewMode = 'compare' | 'side-by-side' | 'generated';

export function ResultsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const id = projectId ? parseInt(projectId, 10) : null;
  const versionParam = searchParams.get('v');
  const requestedVersionId = versionParam ? parseInt(versionParam, 10) : null;

  const setActiveGenerationId = useUIStore((s) => s.setActiveGenerationId);
  const lastCustomizationMap = useUIStore((s) => s.lastCustomization);
  const [viewMode, setViewMode] = useState<ViewMode>('compare');
  const [downloadDone, setDownloadDone] = useState(false);
  const [showMeasurement, setShowMeasurement] = useState(false);

  // Fetch the entire project timeline
  const { data: projectDetails, isLoading, isError } = useProjectTimeline(id);

  // Determine the active generation based on URL param or default to latest
  const activeGeneration = useMemo(() => {
    if (!projectDetails) return null;
    if (requestedVersionId) {
      const found = projectDetails.timeline.find(g => g.id === requestedVersionId);
      if (found) return found;
    }
    return projectDetails.project.latest_generation;
  }, [projectDetails, requestedVersionId]);

  // Sync to store for other components (like RefinementPanel which needs the specific generation ID)
  useEffect(() => {
    if (activeGeneration) setActiveGenerationId(activeGeneration.id);
    return () => setActiveGenerationId(null);
  }, [activeGeneration, setActiveGenerationId]);

  const generateDesign = useGenerateDesign();
  const selectVariation = useSelectVariation();

  // Parse analysis JSON once for the active generation
  const analysisData = useMemo<AnalyzeResponse | null>(() => {
    if (!activeGeneration?.analysis_json) return null;
    try {
      return JSON.parse(activeGeneration.analysis_json) as AnalyzeResponse;
    } catch {
      return null;
    }
  }, [activeGeneration?.id, activeGeneration?.analysis_json]);

  if (isLoading) {
    return <ResultsSkeleton />;
  }

  if (isError || !projectDetails || !activeGeneration) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center page-enter">
        <div className="h-16 w-16 rounded-2xl bg-surface-alt border border-border flex items-center justify-center mb-6 shadow-sm">
          <AlertTriangle className="h-7 w-7 text-text-tertiary" />
        </div>
        <h1 className="text-xl font-semibold text-text-primary mb-2">Couldn't load this project</h1>
        <p className="text-base text-text-secondary mb-8">This project might have been deleted or never completed.</p>
        <Link to="/history"><Button variant="primary" size="lg">Back to History</Button></Link>
      </div>
    );
  }

  const project = projectDetails.project;
  const timeline = projectDetails.timeline;
  const variation = activeGeneration.variations[0];
  
  // The original image for the compare slider is ALWAYS the root project's image
  const originalSrc = resolveImageUrl(project.original_image_path);
  const generatedSrc = variation ? resolveImageUrl(variation.image_path) : '';
  
  const isCompleted = activeGeneration.status === 'completed';
  const isFailed = activeGeneration.status === 'failed' || activeGeneration.status === 'failed_analysis';
  const isRefinement = activeGeneration.parent_generation_id !== null;
  
  const alreadySaved = activeGeneration.selected_variation_id !== null && variation
    ? activeGeneration.selected_variation_id === variation.id
    : false;

  const handleDownload = async () => {
    const url = generatedSrc || originalSrc;
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `roomcanvas-${activeGeneration.id}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
      setDownloadDone(true);
      setTimeout(() => setDownloadDone(false), 1200);
    } catch {
      toast.error('Download failed — try right-clicking the image and saving.');
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'My RoomCanvas Design', url: window.location.href });
      } catch {
        // User cancelled or share not available
      }
    } else {
      await navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard');
    }
  };

  const handleGenerateAgain = async () => {
    try {
      const result = await generateDesign.mutateAsync({ analysisId: activeGeneration.id, forceNew: true });
      toast.success('New version started.');
      setSearchParams({ v: result.id.toString() });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to regenerate');
    }
  };

  const handleCustomize = async (options: import('../api/types').CustomizationOptions) => {
    try {
      const result = await generateDesign.mutateAsync({ analysisId: activeGeneration.id, forceNew: true, customization: options });
      useUIStore.getState().setLastCustomization(project.id, options);
      toast.success('New customized version started.');
      setSearchParams({ v: result.id.toString() });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to regenerate with options');
    }
  };

  const handleSave = async () => {
    if (!variation) return;
    try {
      await selectVariation.mutateAsync({ generationId: activeGeneration.id, variationId: variation.id });
      toast.success('Design saved!');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`Failed to save design: ${msg}`);
    }
  };

  return (
    <div className="mx-auto max-w-[1600px] px-6 py-10 page-enter">
      {/* Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <Link to="/history">
            <Button variant="ghost" size="sm" icon={<ChevronLeft className="h-4 w-4" />} className="px-2">
              History
            </Button>
          </Link>
          <span className="text-text-tertiary">/</span>
          <span className="text-sm font-medium text-text-primary">
            {project.room_type_detected ?? 'Project'}
          </span>
        </div>
        
        {/* Action row */}
        <div className="flex items-center gap-2">
          {isCompleted && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleDownload}
              icon={
                <AnimatePresence mode="wait">
                  {downloadDone
                    ? <motion.span key="check" initial={{ scale: 0 }} animate={{ scale: 1 }}><Check className="h-4 w-4 text-success" /></motion.span>
                    : <motion.span key="dl"><Download className="h-4 w-4" /></motion.span>
                  }
                </AnimatePresence>
              }
            >
              Download
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={handleShare} icon={<Share2 className="h-4 w-4" />}>
            Share
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setShowMeasurement(true)} icon={<Layers className="h-4 w-4" />}>
            Measure Room
          </Button>
          {!isRefinement && isCompleted && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleGenerateAgain}
              loading={generateDesign.isPending}
              icon={<RefreshCw className="h-4 w-4" />}
            >
              Regenerate
            </Button>
          )}
          {isCompleted && variation && (
            <Button
              variant={alreadySaved ? 'secondary' : 'primary'}
              size="sm"
              onClick={handleSave}
              disabled={alreadySaved}
              loading={selectVariation.isPending}
              icon={alreadySaved ? <Check className="h-4 w-4" /> : undefined}
            >
              {alreadySaved ? 'Saved' : 'Save version'}
            </Button>
          )}
        </div>
      </div>

      {/* Failed state */}
      {showMeasurement && originalSrc && (
        <MeasurementOverlay 
          imageUrl={originalSrc} 
          imageId={activeGeneration.id} 
          onClose={() => setShowMeasurement(false)} 
        />
      )}

      {isFailed && (
        <div className="rounded-xl border border-danger bg-danger-subtle p-6 mb-8 flex items-start gap-3 shadow-sm">
          <AlertTriangle className="h-5 w-5 text-danger flex-shrink-0 mt-0.5" />
          <div>
            <h2 className="text-base font-semibold text-danger mb-1">Generation failed</h2>
            <p className="text-sm text-danger/80">{activeGeneration.error ?? 'An unexpected error occurred.'}</p>
            <div className="flex gap-2 mt-4">
              <Button size="sm" variant="destructive" onClick={handleGenerateAgain} icon={<RefreshCw className="h-4 w-4" />}>
                Try Again
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[65fr_35fr] gap-10 lg:gap-12 items-start">
        
        {/* Left: Image workspace & Timeline */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                {activeGeneration.status === 'pending' || activeGeneration.status === 'analyzed' ? (
                  <Badge variant="info" dot>Generating</Badge>
                ) : isCompleted ? null : (
                  <Badge variant="danger" dot>Failed</Badge>
                )}
                {isRefinement && (
                  <Badge variant="accent" dot>Refinement</Badge>
                )}
                <Badge variant="outline">{formatStyleName(activeGeneration.style)}</Badge>
              </div>
              <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-text-primary">
                {activeGeneration.room_type_detected ?? 'Your Space'}
              </h1>
            </div>

            {/* View mode toggle */}
            {isCompleted && (
              <div className="flex rounded-lg border border-border bg-surface p-1 shadow-xs w-fit" role="group" aria-label="View mode">
                <button
                  onClick={() => setViewMode('compare')}
                  className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold transition-all duration-fast rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                    viewMode === 'compare' ? 'bg-surface-alt text-text-primary shadow-sm border border-border/50' : 'text-text-secondary hover:text-text-primary hover:bg-black/[0.02] border border-transparent'
                  }`}
                  aria-pressed={viewMode === 'compare'}
                >
                  <SplitSquareHorizontal className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Compare</span>
                </button>
                <button
                  onClick={() => setViewMode('side-by-side')}
                  className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold transition-all duration-fast rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                    viewMode === 'side-by-side' ? 'bg-surface-alt text-text-primary shadow-sm border border-border/50' : 'text-text-secondary hover:text-text-primary hover:bg-black/[0.02] border border-transparent'
                  }`}
                  aria-pressed={viewMode === 'side-by-side'}
                >
                  <ArrowLeftRight className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Side by Side</span>
                </button>
                <button
                  onClick={() => setViewMode('generated')}
                  className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold transition-all duration-fast rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                    viewMode === 'generated' ? 'bg-surface-alt text-text-primary shadow-sm border border-border/50' : 'text-text-secondary hover:text-text-primary hover:bg-black/[0.02] border border-transparent'
                  }`}
                  aria-pressed={viewMode === 'generated'}
                >
                  <ImageIcon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Final Only</span>
                </button>
              </div>
            )}
          </div>

          {/* Image display */}
          <div className="bg-surface rounded-2xl border border-border shadow-sm p-2">
            {!isCompleted && !isFailed ? (
              <RegeneratingState isCompleted={isCompleted} isFailed={isFailed} />
            ) : isCompleted && variation ? (
              <>
                {viewMode === 'compare' && (
                  <div className="rounded-xl overflow-hidden">
                    <Suspense fallback={<CompareSliderSkeleton />}>
                      <CompareSlider
                        key={generatedSrc}
                        beforeSrc={originalSrc}
                        afterSrc={generatedSrc}
                      />
                    </Suspense>
                  </div>
                )}
                {viewMode === 'side-by-side' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-xl overflow-hidden relative">
                      <span className="absolute top-3 left-3 bg-surface/90 backdrop-blur-md px-3 py-1.5 text-xs font-semibold tracking-wide uppercase rounded-full shadow-sm">Original</span>
                      <img src={originalSrc} alt="Original room" className="w-full aspect-[4/3] object-cover" fetchPriority="high" decoding="async" />
                    </div>
                    <div className="rounded-xl overflow-hidden relative">
                      <span className="absolute top-3 right-3 bg-surface/90 backdrop-blur-md px-3 py-1.5 text-xs font-semibold tracking-wide uppercase rounded-full shadow-sm">Redesigned</span>
                      <img src={generatedSrc} alt="Redesigned room" className="w-full aspect-[4/3] object-cover" loading="eager" fetchPriority="high" decoding="async" />
                    </div>
                  </div>
                )}
                {viewMode === 'generated' && (
                  <div className="rounded-xl overflow-hidden">
                    <img src={generatedSrc} alt="Redesigned room" className="w-full aspect-[4/3] sm:aspect-[16/10] lg:aspect-[16/9] object-cover" loading="eager" fetchPriority="high" decoding="async" />
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-xl overflow-hidden relative">
                <span className="absolute top-3 left-3 bg-surface/90 backdrop-blur-md px-3 py-1.5 text-xs font-semibold tracking-wide uppercase rounded-full shadow-sm text-text-primary">Original</span>
                <img src={originalSrc} alt="Original room" className="w-full aspect-[4/3] sm:aspect-[16/10] lg:aspect-[16/9] object-cover" fetchPriority="high" decoding="async" />
              </div>
            )}
          </div>
          
          {/* Timeline UI */}
          {timeline.length > 1 && (
            <div className="bg-surface rounded-2xl border border-border shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="h-4 w-4 text-text-secondary" />
                <h3 className="text-sm font-semibold text-text-primary">Version History</h3>
              </div>
              
              <div className="flex overflow-x-auto gap-3 pb-2 snap-x hide-scrollbar">
                {timeline.map((g, index) => {
                  const isActive = g.id === activeGeneration.id;
                  const thumb = g.variations[0]?.image_path ? resolveImageUrl(g.variations[0].image_path) : originalSrc;
                  const isRoot = g.parent_generation_id === null;
                  
                  return (
                    <button
                      key={g.id}
                      onClick={() => setSearchParams({ v: g.id.toString() })}
                      className={`relative flex-shrink-0 w-32 rounded-xl overflow-hidden snap-start transition-all duration-200 border-2 text-left ${
                        isActive ? 'border-accent shadow-md scale-[1.02]' : 'border-transparent hover:border-border-strong opacity-80 hover:opacity-100'
                      }`}
                    >
                      <div className="aspect-[4/3] w-full">
                        <img src={thumb} className="w-full h-full object-cover" alt="Version thumbnail" />
                      </div>
                      <div className={`p-2 ${isActive ? 'bg-accent/5' : 'bg-surface-alt'}`}>
                        <div className="text-[10px] font-medium text-text-tertiary mb-0.5 uppercase tracking-wide">
                          {isRoot ? 'Original Base' : `Refinement ${timeline.length - index - (timeline.some(x => x.parent_generation_id === null) ? 1 : 0)}`}
                        </div>
                        <div className="text-xs font-medium text-text-primary truncate">
                          {g.status === 'pending' || g.status === 'analyzed' ? 'Generating...' : formatRelativeTime(g.created_at)}
                        </div>
                      </div>
                      
                      {isActive && (
                        <div className="absolute top-1 right-1 bg-accent rounded-full p-0.5">
                          <Check className="h-2 w-2 text-white" strokeWidth={4} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right: Panel */}
        <div className="space-y-6 lg:border-l lg:border-border lg:pl-10">
          
          {/* Refinement Panel */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Layers className="h-5 w-5 text-accent" />
              <h2 className="text-lg font-semibold text-text-primary">Refine Design</h2>
            </div>
            
            {/* Context for what was generated */}
            {isRefinement && (
              <div className="mb-4 rounded-xl border border-accent/20 bg-accent-subtle p-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-accent mb-2">Current Edit</p>
                <p className="text-sm text-text-primary leading-relaxed text-lg italic">&ldquo;{activeGeneration.redesign_prompt}&rdquo;</p>
              </div>
            )}
            
            <Suspense fallback={<Skeleton className="h-40 w-full rounded-xl" />}>
              <RefinementPanel
                generationId={activeGeneration.id}
                disabled={!isCompleted}
              />
            </Suspense>
            
            <div className="mt-4">
              <Suspense fallback={<Skeleton className="h-10 w-full rounded-xl" />}>
                <CustomizationPanel
                  onCustomize={handleCustomize}
                  disabled={!isCompleted}
                  defaultDimensions={analysisData?.estimated_dimensions}
                  initialOptions={lastCustomizationMap[project.id]}
                />
              </Suspense>
            </div>
          </div>

          <div className="border-t border-border" />

          {/* AI Analysis Recommendations */}
          {analysisData && (
            <div>
              <div className="flex items-center gap-2 mb-5">
                <Sparkles className="h-5 w-5 text-accent" />
                <h2 className="text-lg font-semibold text-text-primary">AI Analysis</h2>
              </div>
              <div className="space-y-6">
                {analysisData.design_rationale && (
                  <DesignRationale
                    overview={analysisData.design_rationale.overview}
                    observations={analysisData.design_rationale.observations}
                    watchOut={analysisData.design_rationale.watch_out}
                  />
                )}
                
                <DimensionCard
                  width={analysisData.estimated_dimensions.width_ft}
                  length={analysisData.estimated_dimensions.length_ft}
                  confidence={analysisData.estimated_dimensions.confidence}
                  onMeasureClick={() => setShowMeasurement(true)}
                />
                <BudgetCard range={analysisData.estimated_budget_range} />
                <PaletteSwatches swatches={analysisData.color_palette} />
                <FurnitureList items={analysisData.furniture} />
                
                {analysisData.lighting_suggestions && (
                  <TextBlock label="Lighting Strategy" content={analysisData.lighting_suggestions} />
                )}
                {analysisData.layout_notes && (
                  <TextBlock label="Spatial Layout" content={analysisData.layout_notes} />
                )}
                {!analysisData.design_rationale && analysisData.style_explanation && (
                  <blockquote className="border-l-2 border-accent pl-4 text-sm text-text-secondary italic leading-relaxed py-1">
                    {analysisData.style_explanation}
                  </blockquote>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ResultsSkeleton() {
  return (
    <div className="mx-auto max-w-[1400px] px-6 py-10">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] xl:grid-cols-[1fr_420px] gap-10">
        <div className="space-y-6">
          <div className="flex flex-col gap-3 mb-8">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-10 w-64" />
          </div>
          <Skeleton className="w-full aspect-[4/3] sm:aspect-[16/10] lg:aspect-[16/9] rounded-2xl" />
        </div>
        <div className="space-y-8 lg:border-l lg:border-border lg:pl-10">
          <div className="space-y-4">
            <Skeleton className="h-8 w-40" />
            <SkeletonText lines={3} />
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
          <div className="border-t border-border" />
          <div className="space-y-6">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

const REGEN_STEPS = [
  'Applying your changes...',
  'Adjusting layout...',
  'Rendering materials and lighting...',
  'Finalizing your design...',
];

function RegeneratingState({ isCompleted, isFailed }: { isCompleted: boolean; isFailed: boolean }) {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (isCompleted || isFailed) {
      setCurrentStep(REGEN_STEPS.length - 1);
      return;
    }
    const interval = setInterval(() => {
      setCurrentStep(prev => prev < REGEN_STEPS.length - 1 ? prev + 1 : prev);
    }, 2500);
    return () => clearInterval(interval);
  }, [isCompleted, isFailed]);

  return (
    <div className="w-full aspect-[4/3] sm:aspect-[16/10] lg:aspect-[16/9] flex flex-col items-center justify-center bg-surface-alt rounded-xl border border-border p-6 shadow-inner">
      <div className="max-w-md w-full">
        <AnalysisStepper steps={REGEN_STEPS} currentIndex={currentStep} />
      </div>
    </div>
  );
}
