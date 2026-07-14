import { memo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Trash2, ImagePlus, MoreVertical, Edit2, Download, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { type Project } from '../../api/types';
import { resolveImageUrl } from '../../api/client';
import { useDeleteProject, useRenameGeneration } from '../../api/queries';
import { Badge } from '../primitives/Badge';
import { Button } from '../primitives/Button';
import { Dialog } from '../primitives/Dialog';
import { Skeleton } from '../primitives/Skeleton';
import { formatRelativeTime, cn } from '../../lib/utils';
import { formatStyleName } from '../../utils/formatters';
import { toast } from '../../lib/toast';
import { getFriendlyApiError } from '../../utils/errors';
import { CompareSlider } from '../results/CompareSlider';

interface HistoryCardProps {
  project: Project;
  viewMode?: 'grid' | 'list';
}

export const HistoryCard = memo(function HistoryCard({ project: p, viewMode = 'grid' }: HistoryCardProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [renameTitle, setRenameTitle] = useState(p.room_type_detected || '');
  const [isHovering, setIsHovering] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const deleteProject = useDeleteProject();
  const renameGen = useRenameGeneration();
  
  const g = p.latest_generation;

  const thumbnail = g.variations[0]?.image_path
    ? resolveImageUrl(g.variations[0].image_path)
    : resolveImageUrl(p.original_image_path);

  const handleDelete = async () => {
    try {
      await deleteProject.mutateAsync(p.id);
      setDeleteOpen(false);
      toast.success('Project deleted');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast.error(getFriendlyApiError(err, `Delete failed: ${msg}`));
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
      toast.error(getFriendlyApiError(err, `Rename failed: ${msg}`));
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
      toast.error(getFriendlyApiError(err, `Download failed: ${msg}. Try right-clicking the image and saving.`));
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

  // Quick preview timer
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    if (isHovering && g.status === 'completed' && p.original_image_path) {
      timeout = setTimeout(() => setShowPreview(true), 600);
    } else {
      setShowPreview(false);
    }
    return () => clearTimeout(timeout);
  }, [isHovering, g.status, p.original_image_path]);

  const originalSrc = resolveImageUrl(p.original_image_path);

  return (
    <>
      <div 
        className={cn(
          "flex rounded-2xl border border-border bg-surface shadow-sm group hover:border-accent/40 transition-all duration-base relative overflow-hidden break-inside-avoid",
          viewMode === 'grid' ? 'flex-col' : 'flex-row h-32 items-center pr-3',
          menuOpen ? "z-50" : "z-10"
        )}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        {/* Thumbnail Hero */}
        <Link 
          to={`/results/${p.id}`} 
          className={cn(
            "block relative overflow-hidden bg-surface-alt",
            viewMode === 'grid' ? 'w-full' : 'w-48 h-full shrink-0'
          )}
        >
          <div className="w-full h-full relative">
            <img
              src={thumbnail}
              alt={`${p.room_type_detected ?? 'Room'} design`}
              className="w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03]"
              loading="lazy"
              decoding="async"
              style={viewMode === 'grid' ? { minHeight: '200px' } : undefined}
              onError={(e) => {
                e.currentTarget.src = "data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300' fill='%23f3f4f6'%3E%3Crect width='400' height='300'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' font-family='sans-serif' font-size='16' fill='%239ca3af'%3EImage Unavailable%3C/text%3E%3C/svg%3E";
              }}
            />
            {/* Quick Preview overlay */}
            <AnimatePresence>
              {showPreview && viewMode === 'grid' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="absolute inset-0 z-20 bg-surface"
                >
                  <CompareSlider beforeSrc={originalSrc} afterSrc={thumbnail} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Gradient Overlay for badges & text */}
          <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none z-30" />
          
          <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 z-30">
             <Badge variant="outline" className="bg-surface/90 backdrop-blur-sm border-none shadow-xs text-text-primary hidden sm:inline-flex">
               {formatStyleName(p.style)}
             </Badge>
             {statusBadge()}
          </div>
          
          {viewMode === 'grid' && (
            <div className="absolute bottom-3 left-4 right-4 flex justify-between items-end z-30">
              <div>
                <h3 className="text-sm font-semibold text-white leading-snug drop-shadow-md mb-0.5 line-clamp-1">
                  {p.room_type_detected ?? 'Untitled Space'}
                </h3>
                <span className="text-white/80 text-[11px] font-medium drop-shadow-md">
                   {formatRelativeTime(p.last_updated_at)}
                </span>
              </div>
            </div>
          )}
        </Link>

        {/* Card Body - Action Row / Details */}
        <div className={cn(
          "flex items-center justify-between bg-surface z-30 flex-1",
          viewMode === 'grid' ? 'p-3' : 'px-5 py-3 h-full'
        )}>
          {viewMode === 'list' ? (
            <div className="flex-1 min-w-0 mr-4">
              <Link to={`/results/${p.id}`} className="block focus-visible:outline-none focus-visible:underline decoration-accent">
                <h3 className="text-base font-semibold text-text-primary mb-1 truncate">
                  {p.room_type_detected ?? 'Untitled Space'}
                </h3>
                <div className="flex items-center gap-2 text-xs text-text-secondary">
                  <span>{formatRelativeTime(p.last_updated_at)}</span>
                  <span>&bull;</span>
                  <span>{formatStyleName(p.style)}</span>
                  <span>&bull;</span>
                  <span>{p.version_count} {p.version_count === 1 ? 'Version' : 'Versions'}</span>
                </div>
              </Link>
            </div>
          ) : (
            <Link to={`/results/${p.id}`} className="flex-1">
              <Button variant="ghost" size="sm" className="w-full justify-start text-text-secondary hover:text-text-primary">
                Open Design
              </Button>
            </Link>
          )}

          {/* Action Menu */}
          <div className="relative">
            <button
              className="flex items-center justify-center h-8 w-8 rounded-full text-text-secondary hover:text-text-primary hover:bg-surface-alt transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              onClick={(e) => {
                e.preventDefault();
                setMenuOpen(!menuOpen);
              }}
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
                    className="absolute right-0 bottom-full mb-1 w-48 bg-surface rounded-lg shadow-xl border border-border z-50 py-1 flex flex-col"
                    role="menu"
                  >
                    <Link
                      to={`/results/${p.id}`}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-text-primary hover:bg-surface-alt transition-colors"
                      role="menuitem"
                    >
                      <Eye className="h-4 w-4 text-text-tertiary" /> View Project
                    </Link>
                    <button
                      className="flex items-center gap-2 px-3 py-2 text-sm text-text-primary hover:bg-surface-alt transition-colors text-left w-full"
                      onClick={() => { setMenuOpen(false); setRenameOpen(true); }}
                      role="menuitem"
                    >
                      <Edit2 className="h-4 w-4 text-text-tertiary" /> Rename
                    </button>
                    {g.variations.length > 0 && (
                      <button
                        className="flex items-center gap-2 px-3 py-2 text-sm text-text-primary hover:bg-surface-alt transition-colors text-left w-full"
                        onClick={handleDownload}
                        role="menuitem"
                      >
                        <Download className="h-4 w-4 text-text-tertiary" /> Download
                      </button>
                    )}
                    <div className="h-px bg-border my-1" />
                    <button
                      className="flex items-center gap-2 px-3 py-2 text-sm text-danger hover:bg-danger-subtle transition-colors text-left w-full"
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

      {/* Delete Project Dialog */}
      <Dialog
        open={deleteOpen}
        onClose={() => !deleteProject.isPending && setDeleteOpen(false)}
        title="Delete Project?"
        description="This will permanently delete this project and all of its refinements. This action cannot be undone."
      >
        <p className="text-text-secondary text-sm mb-6">
          Are you sure you want to delete this project? This will permanently remove the original photo, all generated variations, and refinements.
        </p>
        <div className="flex flex-wrap justify-end gap-3">
          <Button variant="ghost" onClick={() => setDeleteOpen(false)} disabled={deleteProject.isPending}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleteProject.isPending}>
            {deleteProject.isPending ? 'Deleting...' : 'Delete'}
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
          <div className="flex flex-wrap justify-end gap-3">
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
    <div className="flex flex-col rounded-2xl border border-border bg-surface p-0 overflow-hidden break-inside-avoid shadow-sm mb-6">
      <Skeleton className="w-full aspect-square rounded-none" />
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
