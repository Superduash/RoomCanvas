import { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { logger } from '../lib/logger';
import { Button } from './primitives/Button';

interface Props { children: ReactNode }
interface State { hasError: boolean }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    // eslint-disable-next-line no-console
    logger.error('Unhandled render error:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center bg-bg">
          <AlertTriangle size={40} strokeWidth={1.75} className="text-danger" aria-hidden="true" />
          <h1 className="text-xl font-semibold text-text-primary">Something went wrong</h1>
          <p className="max-w-sm text-sm text-text-secondary">
            An unexpected error occurred. Your saved designs are safe — reloading should fix this.
          </p>
          <Button onClick={() => window.location.assign('/')}>Back to RoomCanvas</Button>
        </div>
      );
    }
    return this.props.children;
  }
}
