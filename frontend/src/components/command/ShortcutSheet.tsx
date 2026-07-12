import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog } from '../primitives/Dialog';

export function ShortcutSheet() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input or textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      if (e.key === '?') {
        e.preventDefault();
        setOpen(true);
      } else if (e.key.toLowerCase() === 'n' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        navigate('/upload');
      } else if (e.key.toLowerCase() === 'h' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        navigate('/history');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  const shortcuts = [
    { key: 'Cmd/Ctrl + K', desc: 'Command palette' },
    { key: 'N', desc: 'New design' },
    { key: 'H', desc: 'History' },
    { key: '?', desc: 'Keyboard shortcuts' },
    { key: 'Esc', desc: 'Close dialog' },
  ];

  return (
    <Dialog open={open} onClose={() => setOpen(false)} title="Keyboard Shortcuts">
      <div className="space-y-3">
        {shortcuts.map((s, i) => (
          <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
            <span className="text-sm font-medium text-text-secondary">{s.desc}</span>
            <kbd className="px-2 py-1 bg-surface-alt border border-border rounded text-xs font-mono text-text-primary shadow-xs">
              {s.key}
            </kbd>
          </div>
        ))}
      </div>
    </Dialog>
  );
}
