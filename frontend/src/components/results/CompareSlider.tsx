import { useState, useRef, useEffect } from 'react';
import { Skeleton } from '../primitives/Skeleton';
import { ChevronsLeftRight } from 'lucide-react';
import { cn } from '../../lib/utils';

interface CompareSliderProps {
  beforeSrc: string;
  afterSrc: string;
  beforeLabel?: string;
  afterLabel?: string;
  className?: string;
}

export function CompareSlider({
  beforeSrc,
  afterSrc,
  beforeLabel = 'Original',
  afterLabel = 'Redesigned',
  className,
}: CompareSliderProps) {
  const [position, setPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percent = (x / rect.width) * 100;
    setPosition(percent);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => handleMove(e.clientX);
    const handleTouchMove = (e: TouchEvent) => handleMove(e.touches[0].clientX);
    const handleUp = () => setIsDragging(false);

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchend', handleUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchend', handleUp);
    };
  }, [isDragging]);

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative w-full aspect-[4/3] sm:aspect-[16/10] lg:aspect-[16/9] overflow-hidden bg-surface-alt select-none touch-none',
        className
      )}
      onMouseDown={(e) => {
        setIsDragging(true);
        handleMove(e.clientX);
      }}
      onTouchStart={(e) => {
        setIsDragging(true);
        handleMove(e.touches[0].clientX);
      }}
    >
      {/* After (redesigned) — full width base layer */}
      <img
        src={afterSrc}
        alt={afterLabel}
        className="absolute inset-0 w-full h-full object-cover"
        loading="eager"
        fetchPriority="high"
        decoding="async"
      />

      {/* Before (original) — clipped to left side */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
      >
        <img
          src={beforeSrc}
          alt={beforeLabel}
          className="absolute inset-0 w-full h-full object-cover"
          loading="eager"
          fetchPriority="high"
          decoding="async"
        />
      </div>

      {/* Visual slider line */}
      <div
        className="absolute top-0 bottom-0 w-[2px] bg-white shadow-[0_0_10px_rgba(0,0,0,0.3)] pointer-events-none z-10"
        style={{ left: `${position}%`, transform: 'translateX(-50%)' }}
      >
        {/* Elegant handle */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white shadow-md flex items-center justify-center border border-border transition-transform duration-fast hover:scale-110 active:scale-95">
          <ChevronsLeftRight className="h-5 w-5 text-text-secondary" />
        </div>
      </div>

      {/* Labels */}
      <div className="absolute top-4 left-4 pointer-events-none z-20">
        <span
          className="rounded-full bg-surface/90 backdrop-blur-md border border-border/50 px-3 py-1.5 text-xs font-semibold tracking-wide uppercase text-text-primary shadow-sm transition-opacity duration-base"
          style={{ opacity: position > 15 ? 1 : 0 }}
        >
          {beforeLabel}
        </span>
      </div>
      <div className="absolute top-4 right-4 pointer-events-none z-20">
        <span
          className="rounded-full bg-surface/90 backdrop-blur-md border border-border/50 px-3 py-1.5 text-xs font-semibold tracking-wide uppercase text-text-primary shadow-sm transition-opacity duration-base"
          style={{ opacity: position < 85 ? 1 : 0 }}
        >
          {afterLabel}
        </span>
      </div>
    </div>
  );
}

export function CompareSliderSkeleton() {
  return (
    <div className="w-full aspect-[4/3] sm:aspect-[16/10] lg:aspect-[16/9] overflow-hidden">
      <Skeleton className="w-full h-full rounded-none" />
    </div>
  );
}
