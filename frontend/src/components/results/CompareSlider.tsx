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
  enableAutoplay?: boolean; // Enable continuous autoplay loop (for hero section)
}

export function CompareSlider({
  beforeSrc,
  afterSrc,
  beforeLabel = 'Original',
  afterLabel = 'Redesigned',
  className,
  enableAutoplay = false,
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
  const isAutoplayPaused = useRef(false);
  const autoplayTimeoutId = useRef<number | null>(null);
  const rafId = useRef<number | null>(null);

  const [isRevealing, setIsRevealing] = useState(true);
  const [afterLoaded, setAfterLoaded] = useState(false);
  const prefersReducedMotion = useRef(
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  // Premium easing functions for smooth, cinematic motion
  function easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function easeOutQuart(t: number): number {
    return 1 - Math.pow(1 - t, 4);
  }

  function easeInOutQuart(t: number): number {
    return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;
  }

  const updateDOM = useCallback((p: number) => {
    percentRef.current = p;
    
    if (beforeWrapperRef.current) {
      beforeWrapperRef.current.style.clipPath = `inset(0 ${100 - p}% 0 0)`;
    }
    if (sliderLineRef.current) {
      sliderLineRef.current.style.left = `${p}%`;
    }
    // Smooth fade transitions for labels with wider thresholds
    if (beforeLabelRef.current) {
      const opacity = p < 10 ? 0 : p < 20 ? (p - 10) / 10 : 1;
      beforeLabelRef.current.style.opacity = String(opacity);
    }
    if (afterLabelRef.current) {
      const opacity = p > 90 ? 0 : p > 80 ? (90 - p) / 10 : 1;
      afterLabelRef.current.style.opacity = String(opacity);
    }
  }, []);

  const handlePointerMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const newPercent = (x / rect.width) * 100;
    
    // Throttle rendering via requestAnimationFrame for buttery smooth manual dragging
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
    isAutoplayPaused.current = true; // Immediately stop autoplay when user drags
    
    // Clear any scheduled autoplay resume
    if (autoplayTimeoutId.current !== null) {
      window.clearTimeout(autoplayTimeoutId.current);
      autoplayTimeoutId.current = null;
    }
    
    if (handleRef.current) {
      handleRef.current.style.transform = 'translate(-50%, -50%) scale(1.15)';
      handleRef.current.style.boxShadow = '0 12px 40px rgba(0,0,0,0.3)';
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
    
    // Resume autoplay after 3 seconds of inactivity
    if (autoplayTimeoutId.current !== null) {
      window.clearTimeout(autoplayTimeoutId.current);
    }
    autoplayTimeoutId.current = window.setTimeout(() => {
      isAutoplayPaused.current = false;
      startAutoplay();
    }, 3000);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    let newPercent = percentRef.current;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      newPercent = Math.max(0, newPercent - 2); // Smaller increments for finer control
      isAutoplayPaused.current = true;
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      newPercent = Math.min(100, newPercent + 2);
      isAutoplayPaused.current = true;
    } else {
      return;
    }
    updateDOM(newPercent);
    setPercent(newPercent);
  };

  // Premium reveal animation with cinematic timing
  const runRevealAnimation = useCallback(() => {
    if (prefersReducedMotion.current) {
      updateDOM(50);
      setPercent(50);
      setIsRevealing(false);
      return;
    }

    // Cinematic reveal: slow, elegant transformation
    const START = 100;         // Start fully showing "after" image
    const LEFT_EDGE = 0;       // Sweep to fully show "before" image
    const END = 50;            // Settle at centered comparison
    
    // Slower, more deliberate timing for premium feel
    const SWEEP_MS = 1800;     // Slow sweep from right to left
    const PAUSE_AT_LEFT = 900; // Pause at left edge to appreciate "before"
    const RETURN_MS = 1400;    // Smooth return to center
    const PAUSE_AT_END = 600;  // Brief pause at center before enabling interaction
    
    const TOTAL_MS = SWEEP_MS + PAUSE_AT_LEFT + RETURN_MS + PAUSE_AT_END;
    
    const startTime = performance.now();
    updateDOM(START);

    function step(now: number) {
      const elapsed = now - startTime;
      
      if (elapsed < SWEEP_MS) {
        // Phase 1: Elegant sweep from right (100) to left (0)
        const t = elapsed / SWEEP_MS;
        const eased = easeInOutQuart(t); // Smooth acceleration and deceleration
        const current = START + (LEFT_EDGE - START) * eased;
        updateDOM(current);
        rafId.current = requestAnimationFrame(step);
      } else if (elapsed < SWEEP_MS + PAUSE_AT_LEFT) {
        // Phase 2: Hold at left edge to let users appreciate the "before" state
        updateDOM(LEFT_EDGE);
        rafId.current = requestAnimationFrame(step);
      } else if (elapsed < SWEEP_MS + PAUSE_AT_LEFT + RETURN_MS) {
        // Phase 3: Graceful return from left (0) to center (50)
        const t = (elapsed - SWEEP_MS - PAUSE_AT_LEFT) / RETURN_MS;
        const eased = easeOutQuart(t); // Decelerate smoothly into final position
        const current = LEFT_EDGE + (END - LEFT_EDGE) * eased;
        updateDOM(current);
        rafId.current = requestAnimationFrame(step);
      } else if (elapsed < TOTAL_MS) {
        // Phase 4: Brief pause at center position
        updateDOM(END);
        rafId.current = requestAnimationFrame(step);
      } else {
        // Complete: settle at center and enable interaction
        updateDOM(END);
        setPercent(END);
        setIsRevealing(false);
        rafId.current = null;
      }
    }
    
    rafId.current = requestAnimationFrame(step);
  }, [updateDOM]);

  // Continuous autoplay loop for hero section
  const startAutoplay = useCallback(() => {
    if (prefersReducedMotion.current || isAutoplayPaused.current || isDragging.current) {
      return;
    }

    // Smooth, continuous back-and-forth motion
    const CYCLE_MS = 6000;     // Full cycle duration (left -> right -> left)
    const PAUSE_AT_EDGES = 800; // Pause at each edge to appreciate both states
    
    const MOVE_TO_LEFT = CYCLE_MS * 0.35;
    const PAUSE_LEFT = MOVE_TO_LEFT + PAUSE_AT_EDGES;
    const MOVE_TO_RIGHT = PAUSE_LEFT + CYCLE_MS * 0.35;
    const PAUSE_RIGHT = MOVE_TO_RIGHT + PAUSE_AT_EDGES;
    
    const startTime = performance.now();
    const initialPercent = percentRef.current;

    function autoplayStep(now: number) {
      if (isAutoplayPaused.current || isDragging.current) {
        rafId.current = null;
        return;
      }

      const elapsed = (now - startTime) % CYCLE_MS;
      
      if (elapsed < MOVE_TO_LEFT) {
        // Move from current position to left edge (0)
        const t = elapsed / MOVE_TO_LEFT;
        const eased = easeInOutCubic(t);
        const current = initialPercent + (0 - initialPercent) * eased;
        updateDOM(current);
      } else if (elapsed < PAUSE_LEFT) {
        // Pause at left edge
        updateDOM(0);
      } else if (elapsed < MOVE_TO_RIGHT) {
        // Move from left (0) to right edge (100)
        const t = (elapsed - PAUSE_LEFT) / (MOVE_TO_RIGHT - PAUSE_LEFT);
        const eased = easeInOutCubic(t);
        const current = 0 + (100 - 0) * eased;
        updateDOM(current);
      } else if (elapsed < PAUSE_RIGHT) {
        // Pause at right edge
        updateDOM(100);
      } else {
        // Move from right (100) back to left (0)
        const t = (elapsed - PAUSE_RIGHT) / (CYCLE_MS - PAUSE_RIGHT);
        const eased = easeInOutCubic(t);
        const current = 100 + (0 - 100) * eased;
        updateDOM(current);
      }
      
      rafId.current = requestAnimationFrame(autoplayStep);
    }
    
    rafId.current = requestAnimationFrame(autoplayStep);
  }, [updateDOM]);

  useEffect(() => {
    if (afterLoaded && !prefersReducedMotion.current) {
      runRevealAnimation();
    } else if (afterLoaded && prefersReducedMotion.current) {
      // For reduced motion, just set to center immediately
      updateDOM(50);
      setPercent(50);
      setIsRevealing(false);
    }
    
    return () => {
      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current);
      }
      if (autoplayTimeoutId.current !== null) {
        window.clearTimeout(autoplayTimeoutId.current);
      }
    };
  }, [afterLoaded, runRevealAnimation, updateDOM]);

  // Start autoplay loop after reveal animation completes (only if enabled)
  useEffect(() => {
    if (!isRevealing && !prefersReducedMotion.current && enableAutoplay) {
      // Small delay before starting continuous autoplay
      const startDelay = setTimeout(() => {
        startAutoplay();
      }, 1500);
      
      return () => {
        clearTimeout(startDelay);
        if (rafId.current !== null) {
          cancelAnimationFrame(rafId.current);
        }
      };
    }
  }, [isRevealing, startAutoplay, enableAutoplay]);

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
      style={{ 
        touchAction: 'none', 
        cursor: isRevealing ? 'default' : 'ew-resize',
        willChange: 'auto' 
      }}
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
        className="absolute top-0 bottom-0 w-[2px] bg-white/95 shadow-[0_0_20px_rgba(0,0,0,0.4)] pointer-events-none z-10 transition-opacity duration-300"
        style={{ 
          left: '50%', 
          transform: 'translateX(-50%)', 
          willChange: 'left',
          opacity: isRevealing ? 0.3 : 1 
        }}
      >
        {/* Elegant handle with premium feel */}
        <div 
          ref={handleRef}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-11 w-11 sm:h-14 sm:w-14 rounded-full bg-white shadow-[0_6px_20px_rgba(0,0,0,0.15)] flex items-center justify-center border-2 border-white/20 will-change-transform"
          style={{ 
            opacity: isRevealing ? 0 : 1, 
            transition: 'opacity 400ms cubic-bezier(0.16, 1, 0.3, 1), transform 220ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 220ms cubic-bezier(0.16, 1, 0.3, 1)',
            transitionDelay: isRevealing ? '0ms' : '200ms'
          }}
        >
          <ChevronsLeftRight className="h-5 w-5 sm:h-7 sm:w-7 text-text-secondary" strokeWidth={2.5} />
        </div>
      </div>

      {/* Invisible larger hit area around the handle for better touch usability */}
      <div 
        className="absolute top-0 bottom-0 w-16 -ml-8 pointer-events-none z-20"
        style={{ left: `${percent}%` }}
      />

      {/* Labels with smooth fade transitions */}
      <div className="absolute top-4 left-4 pointer-events-none z-20">
        <span
          ref={beforeLabelRef}
          className="rounded-full bg-surface/95 backdrop-blur-md border border-border/60 px-3.5 py-2 text-xs font-semibold tracking-wide uppercase text-text-primary shadow-sm will-change-auto"
          style={{ 
            transition: 'opacity 400ms cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          {beforeLabel}
        </span>
      </div>
      <div className="absolute top-4 right-4 pointer-events-none z-20">
        <span
          ref={afterLabelRef}
          className="rounded-full bg-surface/95 backdrop-blur-md border border-border/60 px-3.5 py-2 text-xs font-semibold tracking-wide uppercase text-text-primary shadow-sm will-change-auto"
          style={{ 
            transition: 'opacity 400ms cubic-bezier(0.16, 1, 0.3, 1)'
          }}
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
