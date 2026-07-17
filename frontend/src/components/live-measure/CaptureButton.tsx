import { Plus } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useCallback } from 'react';

interface CaptureButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

export function CaptureButton({ onClick, disabled }: CaptureButtonProps) {
  const handleClick = useCallback(() => {
    if (disabled) return;
    
    // Haptic feedback
    if (typeof window !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(40);
    }
    
    onClick();
  }, [disabled, onClick]);

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        handleClick();
      }}
      onPointerDown={(e) => {
        // Only trigger on actual touch/pen to avoid double-firing with mouse clicks
        if (e.pointerType !== 'mouse') {
          e.preventDefault();
          handleClick();
        }
      }}
      disabled={disabled}
      aria-label="Capture Point"
      className={cn(
        "fixed bottom-[env(safe-area-inset-bottom,48px)] left-1/2 -translate-x-1/2 z-30 flex items-center justify-center rounded-full w-[72px] h-[72px] shadow-[0_8px_30px_rgba(0,0,0,0.24)] transition-all mb-8 select-none",
        disabled 
          ? "bg-surface-alt/90 text-text-tertiary cursor-not-allowed border-4 border-surface/50 scale-95 opacity-70" 
          : "bg-surface text-accent hover:bg-surface-alt cursor-pointer border-[6px] border-surface/80 ring-[3px] ring-accent active:scale-90"
      )}
      style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
    >
      <Plus size={36} strokeWidth={2.5} />
    </button>
  );
}
