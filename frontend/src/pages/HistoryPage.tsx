import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertTriangle, RefreshCw, Search, LayoutGrid, Trash2, List as ListIcon, Filter } from 'lucide-react';
import { useHistory } from '../api/queries';
import { HistoryCard, HistoryCardSkeleton, EmptyHistory } from '../components/history/HistoryCard';
import { Button } from '../components/primitives/Button';
import { Dialog } from '../components/primitives/Dialog';
import { useDeleteAllHistory } from '../api/queries';
import { toast } from '../lib/toast';
import { getFriendlyApiError } from '../utils/errors';
import { cn } from '../lib/utils';
import { useDebounce } from '../hooks/useDebounce';

type SortOrder = 'newest' | 'oldest';

export function HistoryPage() {
  const { data, isLoading, isError, refetch } = useHistory(50);
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get('search') || '';
  const deferredSearch = useDebounce(search, 300); // smooths filtering on large libraries without adding input lag
  const [sort, setSort] = useState<SortOrder>('newest');
  const [layout, setLayout] = useState<'grid' | 'list'>('grid');
  const [filterType, setFilterType] = useState<string>('all');
  const [clearOpen, setClearOpen] = useState(false);
  const deleteAll = useDeleteAllHistory();

  // Search matches project details or latest generation prompt
  const filtered = useMemo(() => {
    let list = data ?? [];
    const q = deferredSearch.trim().toLowerCase();

    // Text search
    if (q) {
      list = list.filter((p) => {
        return (
          p.room_type_detected?.toLowerCase().includes(q) ||
          p.latest_generation.redesign_prompt?.toLowerCase().includes(q) ||
          p.style?.toLowerCase().includes(q)
        );
      });
    }
    
    // Status / Style filters
    if (filterType === 'completed') {
      list = list.filter(p => p.latest_generation.status === 'completed');
    } else if (filterType === 'pending') {
      list = list.filter(p => ['pending', 'analyzed'].includes(p.latest_generation.status));
    } else if (filterType !== 'all') {
      // It's a specific style
      list = list.filter(p => p.style === filterType);
    }

    return [...list].sort((a, b) => {
      const diff = new Date(b.last_updated_at).getTime() - new Date(a.last_updated_at).getTime();
      return sort === 'newest' ? diff : -diff;
    });
  }, [data, deferredSearch, sort, filterType]);

  // Extract unique styles for filter chips
  const styles = useMemo(() => {
    if (!data) return [];
    const set = new Set(data.map(p => p.style).filter(Boolean));
    return Array.from(set) as string[];
  }, [data]);

  return (
    <div className="mx-auto w-full max-w-[1400px] px-6 py-12 page-enter">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 mb-10 pb-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-surface-alt border border-border">
            <LayoutGrid className="h-5 w-5 text-text-secondary" />
          </div>
          <div>
            <h1 className="text-3xl font-semibold text-text-primary tracking-tight">Your Library</h1>
            {data && (
              <p className="text-sm text-text-secondary mt-1">
                {data.length} project{data.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        </div>

        {/* Toolbar */}
        {!isLoading && !isError && data && data.length > 0 && (
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary pointer-events-none" />
              <input
                type="search"
                placeholder="Search projects..."
                value={search}
                onChange={(e) =>
                  setSearchParams(e.target.value ? { search: e.target.value } : {}, { replace: true })
                }
                className="h-10 rounded-lg border border-border bg-surface pl-9 pr-4 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent transition-all duration-fast w-full sm:w-64 shadow-sm"
                aria-label="Search designs"
              />
            </div>
            
            <div className="flex items-center gap-2 border border-border rounded-lg bg-surface p-1 shadow-sm h-10">
              <button
                onClick={() => setLayout('grid')}
                className={cn("p-1.5 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent", layout === 'grid' ? "bg-surface-alt text-text-primary shadow-xs" : "text-text-tertiary hover:text-text-primary hover:bg-surface-alt")}
                aria-label="Grid view"
                aria-pressed={layout === 'grid'}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setLayout('list')}
                className={cn("p-1.5 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent", layout === 'list' ? "bg-surface-alt text-text-primary shadow-xs" : "text-text-tertiary hover:text-text-primary hover:bg-surface-alt")}
                aria-label="List view"
                aria-pressed={layout === 'list'}
              >
                <ListIcon className="h-4 w-4" />
              </button>
            </div>

            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortOrder)}
              className="h-10 rounded-lg border border-border bg-surface px-4 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent transition-all duration-fast shadow-sm appearance-none pr-8 cursor-pointer"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23757069' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundPosition: 'right 12px center', backgroundRepeat: 'no-repeat', backgroundSize: '16px' }}
              aria-label="Sort order"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
            <Button
              variant="secondary"
              size="md"
              icon={<Trash2 className="h-4 w-4 text-text-tertiary group-hover:text-danger transition-colors" />}
              onClick={() => setClearOpen(true)}
              className="group border-border"
              title="Clear all history"
            >
              Clear All
            </Button>
          </div>
        )}
      </div>
      
      {/* Filters Row */}
      {!isLoading && !isError && data && data.length > 0 && (
        <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2 hide-scrollbar">
          <Filter className="h-4 w-4 text-text-tertiary shrink-0 mr-1" />
          <button 
            onClick={() => setFilterType('all')}
            className={cn("shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent border", filterType === 'all' ? "bg-text-primary text-surface border-transparent" : "bg-surface text-text-secondary border-border hover:border-border-strong")}
          >
            All
          </button>
          <button 
            onClick={() => setFilterType('completed')}
            className={cn("shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent border", filterType === 'completed' ? "bg-text-primary text-surface border-transparent" : "bg-surface text-text-secondary border-border hover:border-border-strong")}
          >
            Completed
          </button>
          <button 
            onClick={() => setFilterType('pending')}
            className={cn("shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent border", filterType === 'pending' ? "bg-text-primary text-surface border-transparent" : "bg-surface text-text-secondary border-border hover:border-border-strong")}
          >
            Pending
          </button>
          {styles.length > 0 && <div className="h-4 w-px bg-border mx-1 shrink-0" />}
          {styles.map(s => (
            <button 
              key={s}
              onClick={() => setFilterType(s)}
              className={cn("shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent border", filterType === s ? "bg-text-primary text-surface border-transparent" : "bg-surface text-text-secondary border-border hover:border-border-strong")}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" aria-busy="true" aria-label="Loading designs">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <HistoryCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="h-16 w-16 rounded-2xl bg-surface-alt border border-border flex items-center justify-center mb-6 shadow-sm">
            <AlertTriangle className="h-7 w-7 text-text-tertiary" />
          </div>
          <h2 className="text-xl font-semibold text-text-primary mb-2">Failed to load library</h2>
          <p className="text-base text-text-secondary mb-8">Check your connection and try again.</p>
          <Button
            variant="secondary"
            size="lg"
            icon={<RefreshCw className="h-4 w-4" />}
            onClick={() => refetch()}
          >
            Retry Loading
          </Button>
        </div>
      )}

      {/* Empty */}
      {!isLoading && !isError && data?.length === 0 && (
        <EmptyHistory />
      )}

      {/* No search results */}
      {!isLoading && !isError && data && data.length > 0 && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-surface-alt rounded-2xl border border-border border-dashed">
          <p className="text-base text-text-secondary mb-4">No designs match &ldquo;{search}&rdquo;</p>
          <Button variant="outline" size="md" onClick={() => setSearchParams({})}>
            Clear Search Filters
          </Button>
        </div>
      )}

      {/* List / Grid */}
      {!isLoading && !isError && filtered.length > 0 && (
        <div
          className={cn(
            layout === 'grid' 
              ? "columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6"
              : "flex flex-col gap-4 max-w-4xl mx-auto"
          )}
          role="list"
          aria-label="Design history"
        >
          {filtered.map((p) => (
            <div key={p.id} role="listitem">
              <HistoryCard project={p} viewMode={layout} />
            </div>
          ))}
        </div>
      )}

      {/* Clear All Confirm Dialog */}
      <Dialog
        open={clearOpen}
        onClose={() => setClearOpen(false)}
        title="Clear entire library?"
        description="This will permanently delete all your projects, refinements, and images. This action cannot be undone."
      >
        <div className="flex flex-wrap gap-3 justify-end mt-4">
          <Button variant="secondary" onClick={() => setClearOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            loading={deleteAll.isPending}
            onClick={async () => {
              try {
                await deleteAll.mutateAsync();
                setClearOpen(false);
                toast.success('Library cleared successfully');
              } catch (err) {
                const msg = err instanceof Error ? err.message : 'Unknown error';
                toast.error(getFriendlyApiError(err, `Failed to clear library: ${msg}`));
              }
            }}
            icon={<Trash2 className="h-4 w-4" />}
          >
            Clear Library
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
