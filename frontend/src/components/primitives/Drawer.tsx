import { useEffect } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import { Button } from './Button';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}

export function Drawer({ open, onClose, children, className }: DrawerProps) {
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            className={cn(
              'fixed right-0 top-0 z-50 h-dvh w-72 bg-surface border-l border-border shadow-lg',
              'flex flex-col',
              className
            )}
            role="dialog"
            aria-modal="true"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.25, ease: [0, 0, 0.2, 1] }}
          >
            <div className="flex items-center justify-end p-4 border-b border-border">
              <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close menu">
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
