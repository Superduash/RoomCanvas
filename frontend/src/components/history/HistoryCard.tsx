import { memo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Trash2, ImagePlus, MoreVertical, Edit2, Download, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { type Project } from '../../api/types';
import { resolveImageUrl } from '../../api/client';
import { useDeleteGeneration, useRenameGeneration } from '../../api/queries';
import { Badge } from '../primitives/Badge';
import { Button } from '../primitives/Button';
import { Dialog } from '../primitives/Dialog';
import { Skeleton } from '../primitives/Skeleton';
import { formatRelativeTime, cn } from '../../lib/utils';
import { formatStyleName } from '../../utils/formatters';
import { toast } from '../../lib/toast';

interface HistoryCardProps {
  project: Project;
}

export const HistoryCard = memo(function HistoryCard({ project: p }: HistoryCardProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [renameTitle, setRenameTitle] = useState(p.room_type_detected || '');
  const deleteGen = useDeleteGeneration();
  const renameGen = useRenameGeneration();
  
  const g = p.latest_generation;

  const thumbnail = g.variations[0]?.image_path
    ? resolveImageUrl(g.variations[0].image_path)
    : resolveImageUrl(p.original_image_path);

  const handleDelete = async () => {
    try {
      await deleteGen.mutateAsync(p.id);
      setDeleteOpen(false);
      toast.success('Project deleted');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`Delete failed: ${msg}`);
    }
  };

  const handleRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameTitle.trim()) return;
    try {
      await renameGen.mutateAsync({ id: p.id, title: renameTitle.trim() });
      setRenameOpen(false);
      toast.success('Project renamed successfully');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`Rename failed: ${msg}`);
    }
  };

  const handleDownload = async () => {
    const path = g.variations[0]?.image_path;
    if (!path) {
      toast.error('No generated image available to download.');
      return;
    }
    const url = resolveImageUrl(path);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `roomcanvas-${g.id}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
      toast.success('Download started');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`Download failed: ${msg}. Try right-clicking the image and saving.`);
    }
    setMenuOpen(false);
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
      <div className={cn(
        "flex flex-col h-full rounded-2xl border border-border bg-surface shadow-sm group hover:border-accent/40 transition-all duration-base relative",
        menuOpen ? "z-50" : "z-10"
      )}>
        {/* Thumbnail Hero */}
        <Link to={`/results/${p.id}`} className="block relative aspect-[4/3] w-full overflow-hidden bg-surface-alt rounded-t-2xl">
          <img
            src={thumbnail}
            alt={`${p.room_type_detected ?? 'Room'} design`}
            className="h-full w-full object-cover transition-transform duration-slow group-hover:scale-105"
            loading="lazy"
            decoding="async"
          />
          {/* Gradient Overlay for badges */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
          
          <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
             <Badge variant="outline" className="bg-surface/90 backdrop-blur-sm border-none shadow-xs text-text-primary">
               {formatStyleName(p.style)}
             </Badge>
             {statusBadge()}
          </div>
          
          <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end">
            <span className="text-white text-xs font-medium drop-shadow-md">
               {formatRelativeTime(p.last_updated_at)}
            </span>
          </div>
        </Link>

        {/* Card Body */}
        <div className="flex flex-col flex-1 p-5">
          <h3 className="text-base font-semibold text-text-primary mb-1.5 leading-snug">
            {p.room_type_detected ?? 'Untitled Space'}
          </h3>
          
          <p className="text-xs text-text-secondary line-clamp-2 mb-4 leading-relaxed h-8">
            {p.version_count === 1 && g.status === 'completed'
              ? 'Original generation based on uploaded photo.' 
              : p.version_count > 1 && g.status === 'completed'
              ? 'Base design with iterative refinements.'
              : 'Processing generation task.'}
          </p>

          <div className="mt-auto flex items-center justify-between gap-2 pt-3 border-t border-border">
             <div className="flex items-center gap-1 text-[11px] font-medium text-text-tertiary">
               <span className="text-accent flex items-center gap-1">✓ Latest</span>
               <span>&bull;</span>
               <span>{p.version_count} {p.version_count === 1 ? 'Version' : 'Versions'}</span>
             </div>

            {/* Action Menu */}
            <div className="relative">
              <button
                className="flex items-center justify-center h-8 w-8 rounded-full text-text-secondary hover:text-text-primary hover:bg-surface-alt transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                onClick={() => setMenuOpen(!menuOpen)}
                aria-label="More actions"
                aria-expanded={menuOpen}
              >
                <MoreVertical className="h-4 w-4" />
              </button>
              
              <AnimatePresence>
                {menuOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setMenuOpen(false)}
                      aria-hidden="true"
                    />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -5 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -5 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-1 w-48 bg-surface rounded-lg shadow-xl border border-border z-50 py-1 flex flex-col"
                      role="menu"
                    >
                      <Link
                        to={`/analysis/${p.id}`}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-text-primary hover:bg-surface-alt transition-colors"
                        role="menuitem"
                      >
                        <Eye className="h-4 w-4 text-text-tertiary" /> View Project
                      </Link>
                      <button
                        className="flex items-center gap-2 px-3 py-2 text-sm text-text-primary hover:bg-surface-alt transition-colors text-left"
                        onClick={() => { setMenuOpen(false); setRenameOpen(true); }}
                        role="menuitem"
                      >
                        <Edit2 className="h-4 w-4 text-text-tertiary" /> Rename
                      </button>
                      {g.variations.length > 0 && (
                        <button
                          className="flex items-center gap-2 px-3 py-2 text-sm text-text-primary hover:bg-surface-alt transition-colors text-left"
                          onClick={handleDownload}
                          role="menuitem"
                        >
                          <Download className="h-4 w-4 text-text-tertiary" /> Download
                        </button>
                      )}
                      <div className="h-px bg-border my-1" />
                      <button
                        className="flex items-center gap-2 px-3 py-2 text-sm text-danger hover:bg-danger-subtle transition-colors text-left"
                        onClick={() => { setMenuOpen(false); setDeleteOpen(true); }}
                        role="menuitem"
                      >
                        <Trash2 className="h-4 w-4" /> Delete Project
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Project Dialog */}
      <Dialog
        open={deleteOpen}
        onClose={() => !deleteGen.isPending && setDeleteOpen(false)}
        title="Delete Project?"
        description="This will permanently delete this project and all of its refinements. This action cannot be undone."
      >
        <p className="text-text-secondary text-sm mb-6">
          Are you sure you want to delete this project? This will permanently remove the original photo, all generated variations, and refinements.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setDeleteOpen(false)} disabled={deleteGen.isPending}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleteGen.isPending}>
            {deleteGen.isPending ? 'Deleting...' : 'Delete'}
          </Button>
        </div>
      </Dialog>

      {/* Rename Project Dialog */}
      <Dialog
        open={renameOpen}
        onClose={() => !renameGen.isPending && setRenameOpen(false)}
        title="Rename Project"
      >
        <form onSubmit={handleRename}>
          <div className="mb-6">
            <label htmlFor={`rename-${g.id}`} className="block text-sm font-medium text-text-secondary mb-2">
              Project Name
            </label>
            <input
              id={`rename-${g.id}`}
              type="text"
              value={renameTitle}
              onChange={(e) => setRenameTitle(e.target.value)}
              className="w-full h-10 rounded-lg border border-border bg-surface-alt px-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
              placeholder="e.g. Modern Living Room"
              autoFocus
              required
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setRenameOpen(false)} disabled={renameGen.isPending}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={renameGen.isPending || !renameTitle.trim()}>
              {renameGen.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}, (prev, next) => {
  return (
    prev.project.id === next.project.id &&
    prev.project.last_updated_at === next.project.last_updated_at
  );
});

export function HistoryCardSkeleton() {
  return (
    <div className="flex flex-col h-full rounded-2xl border border-border bg-surface p-0 overflow-hidden">
      <Skeleton className="w-full aspect-[4/3] rounded-none" />
      <div className="p-5 space-y-3">
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
