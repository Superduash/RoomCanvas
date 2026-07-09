import { Link } from 'react-router-dom';

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-border bg-surface mt-auto">
      <div className="mx-auto max-w-content px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-text-primary">RoomCanvas</span>
          <span className="text-text-tertiary text-xs">·</span>
          <span className="text-xs text-text-tertiary">AI Interior Design</span>
          <span className="text-text-tertiary text-xs">·</span>
          <span className="text-xs text-text-tertiary">&copy; {year}</span>
        </div>
        <nav className="flex items-center gap-6" aria-label="Footer navigation">
          <Link to="/upload" className="text-xs text-text-tertiary hover:text-text-primary transition-colors duration-fast">
            New Design
          </Link>
          <Link to="/history" className="text-xs text-text-tertiary hover:text-text-primary transition-colors duration-fast">
            History
          </Link>
        </nav>
      </div>
    </footer>
  );
}
