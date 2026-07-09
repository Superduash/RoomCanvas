import { memo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Trash2, ImagePlus, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { type GenerationOut } from '../../api/types';
import { resolveImageUrl } from '../../api/client';
import { useDeleteGeneration } from '../../api/queries';
import { useUIStore } from '../../store/uiStore';
import { Badge } from '../primitives/Badge';
import { Button } from '../primitives/Button';
import { Dialog } from '../primitives/Dialog';
import { Skeleton } from '../primitives/Skeleton';
import { formatRelativeTime, titleCase } from '../../lib/utils';
import toast from 'react-hot-toast';

interface HistoryCardProps {
  generation: GenerationOut;
  refinements?: GenerationOut[];
}

export const HistoryCard = memo(function HistoryCard({ generation: g, refinements = [] }: HistoryCardProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [refinementsOpen, setRefinementsOpen] = useState(false);
  const deleteGen = useDeleteGeneration();
  const setRefinementDraft = useUIStore((s) => s.setRefinementDraft);

  const thumbnail = g.variations[0]?.image_path
    ? resolveImageUrl(g.variations[0].image_path)
    : resolveImageUrl(g.original_image_path);

  const handleDelete = async () => {
    try {
      await deleteGen.mutateAsync(g.id);
      setDeleteOpen(false);
      toast.success('Design deleted');
    } catch {
      toast.error('Failed to delete design');
    }
  };

  const statusBadge = () => {
    switch (g.status) {
      case 'pending':
      case 'analyzed':
        return <Badge variant="info" dot>Processing</Badge>;
      case 'failed':
      case 'failed_analysis':
        return <Badge variant="danger" dot>Failed</Badge>;
      default:
        return null;
    }
  };

  return (
    <>
      <div className="flex flex-col h-full rounded-2xl border border-border bg-surface shadow-sm overflow-hidden group hover:border-accent/40 transition-all duration-base">
        {/* Thumbnail Hero */}
        <Link to={`/results/${g.id}`} className="block relative aspect-[4/3] w-full overflow-hidden bg-surface-alt">
          <img
            src={thumbnail}
            alt={`${g.room_type_detected ?? 'Room'} design`}
            className="h-full w-full object-cover transition-transform duration-slow group-hover:scale-105"
            loading="lazy"
            decoding="async"
          />
          {/* Gradient Overlay for badges */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
          
          <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
             <Badge variant="outline" className="bg-surface/90 backdrop-blur-sm border-none shadow-xs text-text-primary">
               {titleCase(g.style)}
             </Badge>
             {statusBadge()}
          </div>
          
          <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end">
            <span className="text-white text-xs font-medium drop-shadow-md">
               {formatRelativeTime(g.created_at)}
            </span>
          </div>
        </Link>

        {/* Card Body */}
        <div className="flex flex-col flex-1 p-4">
          <h3 className="text-base font-semibold text-text-primary truncate mb-1">
            {g.room_type_detected ?? 'Untitled Space'}
          </h3>
          
          <p className="text-xs text-text-secondary line-clamp-2 mb-4 leading-relaxed h-8">
            {g.status === 'completed' && refinements.length === 0 
              ? 'Original generation based on uploaded photo.' 
              : g.status === 'completed' && refinements.length > 0
              ? 'Base design with iterative refinements.'
              : 'Processing generation task.'}
          </p>

          <div className="mt-auto flex items-center justify-between gap-2 pt-3 border-t border-border">
             {refinements.length > 0 ? (
                <button
                  className="flex items-center gap-1.5 text-xs font-medium text-accent hover:text-accent-hover transition-colors"
                  onClick={() => setRefinementsOpen(!refinementsOpen)}
                >
                  <ImagePlus className="h-3.5 w-3.5" />
                  <span>{refinements.length} edit{refinements.length !== 1 ? 's' : ''}</span>
                  {refinementsOpen ? <ChevronUp className="h-3.5 w-3.5 ml-0.5" /> : <ChevronDown className="h-3.5 w-3.5 ml-0.5" />}
                </button>
             ) : (
                <span className="text-xs text-text-tertiary">No refinements yet</span>
             )}

            <div className="flex gap-1.5">
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-text-tertiary hover:text-danger hover:bg-danger-subtle"
                onClick={() => setDeleteOpen(true)}
                title="Delete project"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Refinements Drawer */}
        <AnimatePresence>
          {refinementsOpen && refinements.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="overflow-hidden bg-surface-alt border-t border-border"
            >
              <div className="flex flex-col divide-y divide-border/50 max-h-48 overflow-y-auto">
                {refinements.map((r) => (
                  <div key={r.id} className="flex flex-col gap-2 px-4 py-3 hover:bg-surface transition-colors">
                    <div className="flex items-center justify-between">
                       <p className="text-[11px] text-text-tertiary">{formatRelativeTime(r.created_at)}</p>
                       <div className="flex gap-1">
                          <Link to={`/results/${r.id}`}>
                            <Button variant="ghost" size="xs" className="h-6 px-2 text-[10px]">
                              View
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="xs"
                            className="h-6 px-2 text-[10px]"
                            title="Reuse this prompt"
                            onClick={() => setRefinementDraft(r.redesign_prompt)}
                          >
                            Reuse Prompt
                          </Button>
                       </div>
                    </div>
                    <p className="text-xs font-medium text-text-primary line-clamp-2 italic">
                      &ldquo;{r.redesign_prompt}&rdquo;
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Delete confirm dialog */}
      <Dialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete this project?"
        description="This will permanently delete the design, all its iterative refinements, and generated images. This action cannot be undone."
      >
        <div className="flex gap-3 justify-end mt-4">
          <Button variant="secondary" onClick={() => setDeleteOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            loading={deleteGen.isPending}
            onClick={handleDelete}
            icon={<Trash2 className="h-4 w-4" />}
          >
            Delete Project
          </Button>
        </div>
      </Dialog>
    </>
  );
});

export function HistoryCardSkeleton() {
  return (
    <div className="flex flex-col h-full rounded-2xl border border-border bg-surface p-0 overflow-hidden">
      <Skeleton className="w-full aspect-[4/3] rounded-none" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
        <div className="flex justify-between items-center pt-3 mt-2 border-t border-border">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-6 w-6 rounded-md" />
        </div>
      </div>
    </div>
  );
}

export function EmptyHistory() {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
      {/* Modern architectural empty state */}
      <div className="mb-8 relative flex items-center justify-center" aria-hidden="true">
        <div className="absolute inset-0 bg-accent/5 rounded-full blur-2xl scale-150" />
        <div className="relative h-32 w-48 border border-dashed border-border-strong rounded-2xl flex items-center justify-center bg-surface">
           <ImagePlus className="h-8 w-8 text-text-tertiary" />
        </div>
      </div>
      <h2 className="text-2xl font-semibold tracking-tight text-text-primary mb-3">
        Your library is empty
      </h2>
      <p className="text-base text-text-secondary max-w-sm mb-8 leading-relaxed">
        Upload a photo and generate your first AI redesign to see it appear here.
      </p>
      <Link to="/upload">
        <Button variant="primary" size="lg">
          Create First Design
        </Button>
      </Link>
    </div>
  );
}
