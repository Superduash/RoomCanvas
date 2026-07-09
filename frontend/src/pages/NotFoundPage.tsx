import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';
import { Button } from '../components/primitives/Button';

export function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-5 text-center">
      {/* Large 404 */}
      <p className="text-8xl font-semibold text-border mb-4" aria-hidden="true">404</p>
      <h1 className="text-2xl font-semibold text-text-primary mb-2">
        This page doesn't exist
      </h1>
      <p className="text-sm text-text-secondary mb-8 max-w-xs">
        The URL you visited couldn't be found. It may have been moved or deleted.
      </p>
      <div className="flex gap-3">
        <Link to="/">
          <Button variant="primary" icon={<Home className="h-4 w-4" />}>
            Back to RoomCanvas
          </Button>
        </Link>
        <Link to="/history">
          <Button variant="secondary" icon={<ArrowLeft className="h-4 w-4" />}>
            View History
          </Button>
        </Link>
      </div>
    </div>
  );
}
