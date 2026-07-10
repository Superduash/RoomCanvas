import { useEffect, useState } from 'react';
import { Command } from 'cmdk';
import { useNavigate } from 'react-router-dom';
import { Plus, History, Home, Search } from 'lucide-react';
import { useHistory } from '../../api/queries';
import { resolveImageUrl } from '../../api/client';
import { formatStyleName } from '../../utils/formatters';
import './CommandPalette.css';

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { data: history } = useHistory(8);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const go = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="Command Menu"
      className="fixed inset-0 z-50"
      shouldFilter
    >
      <div className="fixed inset-0 bg-black/20" onClick={() => setOpen(false)} aria-hidden="true" />
      <div className="relative mx-auto mt-24 max-w-lg rounded-lg border border-border bg-surface shadow-lg overflow-hidden">
        <div className="flex items-center gap-2 border-b border-border px-4">
          <Search className="h-4 w-4 text-text-tertiary flex-shrink-0" aria-hidden="true" />
          <Command.Input
            placeholder="Search designs, or jump to a page…"
            className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-text-tertiary text-text-primary"
          />
        </div>
        <Command.List className="max-h-80 overflow-y-auto p-2">
          <Command.Empty className="py-6 text-center text-sm text-text-tertiary">
            No results found.
          </Command.Empty>

          <Command.Group heading="Navigate" className="cmd-group">
            <Command.Item onSelect={() => go('/')} className="cmd-item">
              <Home className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
              <span>Home</span>
            </Command.Item>
            <Command.Item onSelect={() => go('/upload')} className="cmd-item">
              <Plus className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
              <span>New Design</span>
            </Command.Item>
            <Command.Item onSelect={() => go('/history')} className="cmd-item">
              <History className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
              <span>History</span>
            </Command.Item>
          </Command.Group>

          {history && history.length > 0 && (
            <Command.Group heading="Recent Designs" className="cmd-group">
              {history.map((g) => (
                <Command.Item
                  key={g.id}
                  onSelect={() => go(`/results/${g.id}`)}
                  className="cmd-item"
                >
                  <img
                    src={resolveImageUrl(g.latest_generation.variations[0]?.image_path ?? g.original_image_path)}
                    alt=""
                    className="h-8 w-8 rounded object-cover flex-shrink-0"
                  />
                  <span className="line-clamp-2">
                    {g.room_type_detected ?? 'Untitled room'} — {formatStyleName(g.style)}
                  </span>
                </Command.Item>
              ))}
            </Command.Group>
          )}
        </Command.List>
        <div className="border-t border-border px-4 py-2 text-xs text-text-tertiary flex justify-between">
          <span>↑↓ navigate · ↵ select</span>
          <span>esc close</span>
        </div>
      </div>
    </Command.Dialog>
  );
}
