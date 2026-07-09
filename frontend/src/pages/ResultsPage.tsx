import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download, Check, RefreshCw, Share2, ChevronLeft, AlertTriangle, Layers
} from 'lucide-react';
import { CompareSlider, CompareSliderSkeleton } from '../components/results/CompareSlider';
import { RefinementPanel } from '../components/refine/RefinementPanel';
import {
  FurnitureList, DimensionCard, PaletteSwatches, BudgetCard, TextBlock
} from '../components/results/RecommendationPanel';
import { Button } from '../components/primitives/Button';
import { Badge } from '../components/primitives/Badge';
import { Skeleton, SkeletonText } from '../components/primitives/Skeleton';
import { useGeneration, useGenerateDesign, useSelectVariation } from '../api/queries';
import { useUIStore } from '../store/uiStore';
import { resolveImageUrl } from '../api/client';
import { titleCase } from '../lib/utils';
import type { AnalyzeResponse } from '../api/types';
import toast from 'react-hot-toast';

type ViewMode = 'compare' | 'side-by-side' | 'generated';

export function ResultsPage() {
  const { generationId } = useParams<{ generationId: string }>();
  const navigate = useNavigate();
  const id = generationId ? parseInt(generationId, 10) : null;

  const setActiveGenerationId = useUIStore((s) => s.setActiveGenerationId);
  const [viewMode, setViewMode] = useState<ViewMode>('compare');
  const [downloadDone, setDownloadDone] = useState(false);

  // Determine if we should poll (page loaded on a still-pending generation)
  const initialQuery = useGeneration(id, { poll: false });
  const shouldPoll = initialQuery.data?.status === 'pending' || initialQuery.data?.status === 'analyzed';
  const { data: generation, isLoading, isError } = useGeneration(id, { poll: shouldPoll });

  const generateDesign = useGenerateDesign();
  const selectVariation = useSelectVariation();

  useEffect(() => {
    if (id) setActiveGenerationId(id);
    return () => setActiveGenerationId(null);
  }, [id, setActiveGenerationId]);

  // Parse analysis JSON once
  const analysisData = useMemo<AnalyzeResponse | null>(() => {
    if (!generation?.analysis_json) return null;
    try {
      return JSON.parse(generation.analysis_json) as AnalyzeResponse;
    } catch {
      return null;
    }
  }, [generation?.id, generation?.analysis_json]);

  if (isLoading) {
    return <ResultsSkeleton />;
  }

  if (isError || !generation) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center page-enter">
        <div className="h-16 w-16 rounded-2xl bg-surface-alt border border-border flex items-center justify-center mb-6 shadow-sm">
          <AlertTriangle className="h-7 w-7 text-text-tertiary" />
        </div>
        <h1 className="text-xl font-semibold text-text-primary mb-2">Couldn't load this design</h1>
        <p className="text-base text-text-secondary mb-8">This design might have been deleted or never completed.</p>
        <Link to="/history"><Button variant="primary" size="lg">Back to History</Button></Link>
      </div>
    );
  }

  const variation = generation.variations[0];
  const originalSrc = resolveImageUrl(generation.original_image_path);
  const generatedSrc = variation ? resolveImageUrl(variation.image_path) : '';
  const isCompleted = generation.status === 'completed';
  const isFailed = generation.status === 'failed' || generation.status === 'failed_analysis';
  const isRefinement = generation.parent_generation_id !== null;
  const alreadySaved = generation.selected_variation_id !== null && variation
    ? generation.selected_variation_id === variation.id
    : false;

  const handleDownload = async () => {
    const url = generatedSrc || originalSrc;
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `roomcanvas-${generation.id}.png`;
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
    // Extract analysis_id from the stored analysis_json
    const analysisId: number | null = (() => {
      if (!generation.analysis_json) return null;
      try {
        const parsed = JSON.parse(generation.analysis_json) as { analysis_id?: number };
        return parsed.analysis_id ?? null;
      } catch {
        return null;
      }
    })();

    if (!analysisId) {
      toast.error('Cannot regenerate — original analysis data not found.');
      return;
    }
    try {
      const result = await generateDesign.mutateAsync(analysisId);
      toast.success('New version started — navigating to results.');
      navigate(`/results/${result.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to regenerate');
    }
  };

  const handleSave = async () => {
    if (!variation) return;
    try {
      await selectVariation.mutateAsync({ generationId: generation.id, variationId: variation.id });
      toast.success('Design saved!');
    } catch {
      toast.error('Failed to save design');
    }
  };

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-10 page-enter">
      {/* Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <Link to="/history">
            <Button variant="ghost" size="sm" icon={<ChevronLeft className="h-4 w-4" />} className="px-2">
              History
            </Button>
          </Link>
          {isRefinement && (
            <>
              <span className="text-text-tertiary">/</span>
              <Link to={`/results/${generation.parent_generation_id}`}>
                <Button variant="ghost" size="sm" className="text-text-secondary px-2 hover:text-accent">
                  Original design
                </Button>
              </Link>
            </>
          )}
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
      {isFailed && (
        <div className="rounded-xl border border-danger bg-danger-subtle p-6 mb-8 flex items-start gap-3 shadow-sm">
          <AlertTriangle className="h-5 w-5 text-danger flex-shrink-0 mt-0.5" />
          <div>
            <h2 className="text-base font-semibold text-danger mb-1">Generation failed</h2>
            <p className="text-sm text-danger/80">{generation.error ?? 'An unexpected error occurred.'}</p>
            <div className="flex gap-2 mt-4">
              <Button size="sm" variant="destructive" onClick={handleGenerateAgain} icon={<RefreshCw className="h-4 w-4" />}>
                Try Again
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] xl:grid-cols-[1fr_420px] gap-10">
        
        {/* Left: Image workspace */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                {generation.status === 'pending' || generation.status === 'analyzed' ? (
                  <Badge variant="info" dot>Generating</Badge>
                ) : isCompleted ? null : (
                  <Badge variant="danger" dot>Failed</Badge>
                )}
                {isRefinement && (
                  <Badge variant="accent" dot>Refinement</Badge>
                )}
                <Badge variant="outline">{titleCase(generation.style)}</Badge>
              </div>
              <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-text-primary">
                {generation.room_type_detected ?? 'Your Space'}
              </h1>
            </div>

            {/* View mode toggle */}
            {isCompleted && (
              <div className="flex rounded-lg border border-border bg-surface p-1 shadow-xs w-fit" role="group" aria-label="View mode">
                {(['compare', 'side-by-side', 'generated'] as ViewMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={`px-3 py-1.5 text-xs font-semibold transition-all duration-fast rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                      viewMode === mode ? 'bg-surface-alt text-text-primary shadow-sm border border-border/50' : 'text-text-secondary hover:text-text-primary hover:bg-black/[0.02] border border-transparent'
                    }`}
                    aria-pressed={viewMode === mode}
                  >
                    {mode === 'compare' ? 'Compare' : mode === 'side-by-side' ? 'Side by side' : 'Final Only'}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Image display */}
          <div className="bg-surface rounded-2xl border border-border shadow-sm p-2">
            {!isCompleted && !isFailed ? (
              <CompareSliderSkeleton />
            ) : isCompleted && variation ? (
              <>
                {viewMode === 'compare' && (
                  <div className="rounded-xl overflow-hidden">
                    <CompareSlider
                      beforeSrc={originalSrc}
                      afterSrc={generatedSrc}
                    />
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
                <p className="text-sm text-text-primary leading-relaxed text-lg italic">&ldquo;{generation.redesign_prompt}&rdquo;</p>
              </div>
            )}
            
            <RefinementPanel
              generationId={generation.id}
              disabled={!isCompleted}
            />
          </div>

          <div className="border-t border-border" />

          {/* AI Analysis Recommendations */}
          {analysisData && (
            <div>
              <h2 className="text-lg font-semibold text-text-primary mb-5">AI Analysis</h2>
              <div className="space-y-6">
                <DimensionCard
                  width={analysisData.estimated_dimensions.width_ft}
                  length={analysisData.estimated_dimensions.length_ft}
                  confidence={analysisData.estimated_dimensions.confidence}
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
                {analysisData.style_explanation && (
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
