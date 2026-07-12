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
  const afterImgRef = useRef<HTMLImageElement>(null);

  const [percent, setPercent] = useState(50);
  const percentRef = useRef(50);
  const isDragging = useRef(false);
  const rafId = useRef<number | null>(null);
  const hasPlayedReveal = useRef(false);

  const [isRevealing, setIsRevealing] = useState(false);
  const [afterLoaded, setAfterLoaded] = useState(false);
  const prefersReducedMotion = useRef(
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  // Premium easing functions for smooth, cinematic motion
  function easeInOutQuart(t: number): number {
    return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;
  }

  function easeOutQuart(t: number): number {
    return 1 - Math.pow(1 - t, 4);
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

    // Stop any ongoing animation immediately when user interacts
    if (rafId.current !== null) {
      cancelAnimationFrame(rafId.current);
      rafId.current = null;
    }
    setIsRevealing(false);

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
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    let newPercent = percentRef.current;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      newPercent = Math.max(0, newPercent - 2); // Smaller increments for finer control
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      newPercent = Math.min(100, newPercent + 2);
    } else {
      return;
    }

    // Stop any ongoing animation
    if (rafId.current !== null) {
      cancelAnimationFrame(rafId.current);
      rafId.current = null;
    }
    setIsRevealing(false);

    updateDOM(newPercent);
    setPercent(newPercent);
  };

  // Premium one-time reveal animation
  const runRevealAnimation = useCallback(() => {
    if (prefersReducedMotion.current) {
      updateDOM(50);
      setPercent(50);
      setIsRevealing(false);
      hasPlayedReveal.current = true;
      return;
    }

    setIsRevealing(true);

    // One-time reveal: smooth wipe from right to left, then settle at center
    const START = 100;         // Start with slider on right (Original fully visible)
    const REVEAL_END = 0;      // Wipe all the way to left (Redesigned fully visible)
    const FINAL = 50;          // Settle at center for comparison

    const WIPE_DURATION = 1600;    // Slow, premium wipe from right to left (2.0s)
    const SETTLE_DURATION = 800;  // Smooth settle to center (1.0s)
    const PAUSE_AT_END = 300;      // Brief pause at full reveal before settling

    const TOTAL_MS = WIPE_DURATION + PAUSE_AT_END + SETTLE_DURATION;

    let startTime: number | null = null;
    updateDOM(START);

    function step(now: number) {
      if (startTime === null) startTime = now;
      const elapsed = now - startTime;

      if (elapsed < WIPE_DURATION) {
        // Phase 1: Smooth wipe from left (0) to right (100) to reveal redesigned image
        const t = elapsed / WIPE_DURATION;
        const eased = easeInOutQuart(t);
        const current = START + (REVEAL_END - START) * eased;
        updateDOM(current);
        rafId.current = requestAnimationFrame(step);
      } else if (elapsed < WIPE_DURATION + PAUSE_AT_END) {
        // Phase 2: Brief pause at full reveal
        updateDOM(REVEAL_END);
        rafId.current = requestAnimationFrame(step);
      } else if (elapsed < TOTAL_MS) {
        // Phase 3: Settle back to center (50/50)
        const t = (elapsed - WIPE_DURATION - PAUSE_AT_END) / SETTLE_DURATION;
        const eased = easeOutQuart(t);
        const current = REVEAL_END + (FINAL - REVEAL_END) * eased;
        updateDOM(current);
        rafId.current = requestAnimationFrame(step);
      } else {
        // Complete: settle at center permanently
        updateDOM(FINAL);
        setPercent(FINAL);
        setIsRevealing(false);
        hasPlayedReveal.current = true;
        rafId.current = null;
      }
    }

    rafId.current = requestAnimationFrame(step);
  }, [updateDOM]);

  // Trigger reveal animation when image loads or when a new image is set
  useEffect(() => {
    if (afterLoaded) {
      // Reset the reveal flag when a new image loads
      hasPlayedReveal.current = false;

      if (!prefersReducedMotion.current) {
        runRevealAnimation();
      } else {
        // For reduced motion, just set to center immediately
        updateDOM(50);
        setPercent(50);
        setIsRevealing(false);
        hasPlayedReveal.current = true;
      }
    }

    return () => {
      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current);
        rafId.current = null;
      }
    };
  }, [afterLoaded, runRevealAnimation, updateDOM]);

  // Reset afterLoaded when the image source changes (new generation)
  useEffect(() => {
    setAfterLoaded(false);
    hasPlayedReveal.current = false;
    setIsRevealing(false);
    
    // Check if the image is already fully loaded from browser cache
    if (afterImgRef.current?.complete) {
      setAfterLoaded(true);
    }
  }, [afterSrc]);

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
        ref={afterImgRef}
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
          className="rounded-full bg-black/75 backdrop-blur-md border border-white/10 px-3.5 py-2 text-xs font-semibold tracking-wide uppercase text-white shadow-md will-change-auto"
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
          className="rounded-full bg-black/75 backdrop-blur-md border border-white/10 px-3.5 py-2 text-xs font-semibold tracking-wide uppercase text-white shadow-md will-change-auto"
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
