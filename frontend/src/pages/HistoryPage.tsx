import { useMemo, useState, useDeferredValue } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertTriangle, RefreshCw, Search, LayoutGrid, Trash2 } from 'lucide-react';
import { useHistory } from '../api/queries';
import { type GenerationOut } from '../api/types';
import { HistoryCard, HistoryCardSkeleton, EmptyHistory } from '../components/history/HistoryCard';
import { Button } from '../components/primitives/Button';
import { Dialog } from '../components/primitives/Dialog';
import { useDeleteAllHistory } from '../api/queries';
import { toast } from '../lib/toast';

type SortOrder = 'newest' | 'oldest';

export function HistoryPage() {
  const { data, isLoading, isError, refetch } = useHistory(50);
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get('search') || '';
  const deferredSearch = useDeferredValue(search); // smooths filtering on large libraries without adding input lag
  const [sort, setSort] = useState<SortOrder>('newest');
  const [clearOpen, setClearOpen] = useState(false);
  const deleteAll = useDeleteAllHistory();

  // Build tree: group refinements under their root parent
  const { roots, refinementMap } = useMemo(() => {
    if (!data) return { roots: [], refinementMap: new Map<number, GenerationOut[]>() };

    const map = new Map<number, GenerationOut[]>();
    const rootList: GenerationOut[] = [];

    for (const g of data) {
      if (g.parent_generation_id === null) {
        rootList.push(g);
      } else {
        const existing = map.get(g.parent_generation_id) ?? [];
        existing.push(g);
        map.set(g.parent_generation_id, existing);
      }
    }

    return { roots: rootList, refinementMap: map };
  }, [data]);

  // Search now matches a root's own fields OR any of its refinements' instructions —
  // a match on a child surfaces the parent card, since that's the unit the UI navigates to.
  const filtered = useMemo(() => {
    let list = roots;
    const q = deferredSearch.trim().toLowerCase();

    if (q) {
      list = list.filter((g) => {
        const ownMatch =
          g.room_type_detected?.toLowerCase().includes(q) ||
          g.redesign_prompt?.toLowerCase().includes(q) ||
          g.style?.toLowerCase().includes(q);
        if (ownMatch) return true;

        const children = refinementMap.get(g.id) ?? [];
        return children.some((c) => c.redesign_prompt?.toLowerCase().includes(q));
      });
    }

    return [...list].sort((a, b) => {
      const diff = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      return sort === 'newest' ? diff : -diff;
    });
  }, [roots, refinementMap, deferredSearch, sort]);

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
                {roots.length} project{roots.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        </div>

        {/* Toolbar */}
        {!isLoading && !isError && data && data.length > 0 && (
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary pointer-events-none" />
              <input
                type="search"
                placeholder="Search projects..."
                value={search}
                onChange={(e) =>
                  setSearchParams(e.target.value ? { search: e.target.value } : {}, { replace: true })
                }
                className="h-10 rounded-lg border border-border bg-surface pl-9 pr-4 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent transition-all duration-fast w-64 shadow-sm"
                aria-label="Search designs"
              />
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
      {!isLoading && !isError && roots.length === 0 && (
        <EmptyHistory />
      )}

      {/* No search results */}
      {!isLoading && !isError && roots.length > 0 && filtered.length === 0 && (
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
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          role="list"
          aria-label="Design history"
        >
          {filtered.map((g) => (
            <div key={g.id} role="listitem">
              <HistoryCard
                generation={g}
                refinements={refinementMap.get(g.id) ?? []}
              />
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
        <div className="flex gap-3 justify-end mt-4">
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
                toast.error(`Failed to clear library: ${msg}`);
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
