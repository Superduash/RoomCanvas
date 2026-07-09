import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import { Button } from './Button';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}

export function Dialog({ open, onClose, title, description, children, className }: DialogProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('keydown', handleKey);
      prev?.focus();
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="dialog-title"
          aria-describedby={description ? 'dialog-desc' : undefined}
        >
          <motion.div
            ref={overlayRef}
            className="absolute inset-0 bg-black/30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            className={cn(
              'relative z-10 w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-lg',
              className
            )}
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.2, ease: [0, 0, 0.2, 1] }}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 id="dialog-title" className="text-base font-semibold text-text-primary">
                  {title}
                </h2>
                {description && (
                  <p id="dialog-desc" className="mt-1 text-sm text-text-secondary">
                    {description}
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="ml-2 flex-shrink-0 -mt-1 -mr-1"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
