import { useRef, useEffect, useState, useCallback } from 'react';
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
  const containerRef = useRef<HTMLDivElement>(null);
  const beforeWrapperRef = useRef<HTMLDivElement>(null);
  const sliderLineRef = useRef<HTMLDivElement>(null);
  const beforeLabelRef = useRef<HTMLSpanElement>(null);
  const afterLabelRef = useRef<HTMLSpanElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  
  const [percent, setPercent] = useState(50);
  const percentRef = useRef(50);
  const isDragging = useRef(false);
  const rafId = useRef<number | null>(null);

  const [isRevealing, setIsRevealing] = useState(true);
  const [afterLoaded, setAfterLoaded] = useState(false);
  const prefersReducedMotion = useRef(
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  function easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  function easeInOutQuad(t: number): number {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  const updateDOM = useCallback((p: number) => {
    percentRef.current = p;
    
    if (beforeWrapperRef.current) {
      beforeWrapperRef.current.style.clipPath = `inset(0 ${100 - p}% 0 0)`;
    }
    if (sliderLineRef.current) {
      sliderLineRef.current.style.left = `${p}%`;
    }
    if (beforeLabelRef.current) {
      beforeLabelRef.current.style.opacity = p > 15 ? '1' : '0';
    }
    if (afterLabelRef.current) {
      afterLabelRef.current.style.opacity = p < 85 ? '1' : '0';
    }
  }, []);

  const handlePointerMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const newPercent = (x / rect.width) * 100;
    
    // Throttle rendering via requestAnimationFrame
    if (rafId.current !== null) {
      cancelAnimationFrame(rafId.current);
    }
    
    rafId.current = requestAnimationFrame(() => {
      updateDOM(newPercent);
      setPercent(newPercent);
      rafId.current = null;
    });
  }, [updateDOM]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isDragging.current = true;
    if (handleRef.current) {
      handleRef.current.style.transform = 'translate(-50%, -50%) scale(1.1)';
      handleRef.current.style.boxShadow = '0 8px 30px rgba(0,0,0,0.4)';
    }
    
    // Capture pointer to track dragging even outside the container
    e.currentTarget.setPointerCapture(e.pointerId);
    handlePointerMove(e.clientX);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging.current) return;
    handlePointerMove(e.clientX);
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    isDragging.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
    
    if (handleRef.current) {
      handleRef.current.style.transform = 'translate(-50%, -50%) scale(1)';
      handleRef.current.style.boxShadow = '';
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    let newPercent = percentRef.current;
    if (e.key === 'ArrowLeft') {
      newPercent = Math.max(0, newPercent - 5);
    } else if (e.key === 'ArrowRight') {
      newPercent = Math.min(100, newPercent + 5);
    } else {
      return;
    }
    updateDOM(newPercent);
    setPercent(newPercent);
  };

  const runRevealAnimation = useCallback(() => {
    if (prefersReducedMotion.current) {
      updateDOM(50);
      setPercent(50);
      setIsRevealing(false);
      return;
    }

    const START = 100;
    const LEFT_EDGE = 0;
    const END = 50;
    const SWEEP_MS = 800; // Duration for right -> left
    const RETURN_MS = 600; // Duration for left -> middle
    const TOTAL_MS = SWEEP_MS + RETURN_MS;
    
    const startTime = performance.now();

    updateDOM(START);

    function step(now: number) {
      const elapsed = now - startTime;
      
      if (elapsed < SWEEP_MS) {
        // Phase 1: Sweep from right (100) to left (0)
        const t = elapsed / SWEEP_MS;
        const eased = easeInOutQuad(t);
        const current = START + (LEFT_EDGE - START) * eased;
        updateDOM(current);
        rafId.current = requestAnimationFrame(step);
      } else if (elapsed < TOTAL_MS) {
        // Phase 2: Return from left (0) to middle (50)
        const t = (elapsed - SWEEP_MS) / RETURN_MS;
        const eased = easeOutCubic(t); // using easeOut so it nicely settles in the middle
        const current = LEFT_EDGE + (END - LEFT_EDGE) * eased;
        updateDOM(current);
        rafId.current = requestAnimationFrame(step);
      } else {
        // Done
        updateDOM(END);
        setPercent(END);
        setIsRevealing(false);
        rafId.current = null;
      }
    }
    
    rafId.current = requestAnimationFrame(step);
  }, [updateDOM]);

  useEffect(() => {
    if (afterLoaded) {
      runRevealAnimation();
    }
    return () => {
      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current);
      }
    };
  }, [afterLoaded, runRevealAnimation]);

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative w-full aspect-[4/3] sm:aspect-[16/10] lg:aspect-[16/9] overflow-hidden bg-surface-alt select-none touch-none focus:outline-none',
        className
      )}
      tabIndex={0}
      role="slider"
      aria-valuenow={Math.round(percent)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Image comparison slider"
      onPointerDown={isRevealing ? undefined : onPointerDown}
      onPointerMove={isRevealing ? undefined : onPointerMove}
      onPointerUp={isRevealing ? undefined : onPointerUp}
      onPointerCancel={isRevealing ? undefined : onPointerUp}
      onKeyDown={isRevealing ? undefined : onKeyDown}
      style={{ touchAction: 'none', cursor: isRevealing ? 'default' : undefined }}
    >
      {/* After (redesigned) — full width base layer */}
      <img
        src={afterSrc}
        alt={afterLabel}
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        draggable={false}
        loading="eager"
        fetchPriority="high"
        decoding="async"
        onLoad={() => setAfterLoaded(true)}
      />

      {/* Before (original) — clipped to left side */}
      <div
        ref={beforeWrapperRef}
        className="absolute inset-0 overflow-hidden pointer-events-none"
        style={{ clipPath: 'inset(0 50% 0 0)' }}
      >
        <img
          src={beforeSrc}
          alt={beforeLabel}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          draggable={false}
          loading="eager"
          fetchPriority="high"
          decoding="async"
        />
      </div>

      {/* Visual slider line */}
      <div
        ref={sliderLineRef}
        className="absolute top-0 bottom-0 w-[2px] bg-white/90 shadow-[0_0_15px_rgba(0,0,0,0.5)] pointer-events-none z-10"
        style={{ left: '50%', transform: 'translateX(-50%)', willChange: 'left' }}
      >
        {/* Elegant handle */}
        <div 
          ref={handleRef}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-white shadow-[0_4px_15px_rgba(0,0,0,0.2)] flex items-center justify-center border border-border/10 transition-transform duration-200 ease-out will-change-transform"
          style={{ opacity: isRevealing ? 0 : 1, transition: 'opacity 300ms ease-out' }}
        >
          <ChevronsLeftRight className="h-5 w-5 sm:h-6 sm:w-6 text-text-secondary" />
        </div>
      </div>

      {/* Invisible larger hit area around the handle for better touch usability */}
      <div 
        className="absolute top-0 bottom-0 w-16 -ml-8 pointer-events-none z-20"
        style={{ left: `${percent}%` }}
      />

      {/* Labels */}
      <div className="absolute top-4 left-4 pointer-events-none z-20">
        <span
          ref={beforeLabelRef}
          className="rounded-full bg-surface/90 backdrop-blur-md border border-border/50 px-3 py-1.5 text-xs font-semibold tracking-wide uppercase text-text-primary shadow-sm transition-opacity duration-base"
        >
          {beforeLabel}
        </span>
      </div>
      <div className="absolute top-4 right-4 pointer-events-none z-20">
        <span
          ref={afterLabelRef}
          className="rounded-full bg-surface/90 backdrop-blur-md border border-border/50 px-3 py-1.5 text-xs font-semibold tracking-wide uppercase text-text-primary shadow-sm transition-opacity duration-base"
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
