import { motion, AnimatePresence } from 'framer-motion';
import { Check, Circle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useMediaQuery } from '../../hooks/useMediaQuery';

interface AnalysisStepperProps {
  steps: string[];
  currentIndex: number;
}

export function AnalysisStepper({ steps, currentIndex }: AnalysisStepperProps) {
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const isDesktop = useMediaQuery('(min-width: 768px)');

  if (isDesktop) {
    return (
      <div className="flex items-center justify-center gap-0">
        {steps.map((step, i) => {
          const isDone = i < currentIndex;
          const isActive = i === currentIndex;
          return (
            <div key={step} className="flex items-center">
              <div className="flex flex-col items-center gap-2 w-28">
                <AnimatePresence mode="wait">
                  {isDone ? (
                    <motion.div
                      key="done"
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="flex items-center justify-center h-8 w-8 rounded-full bg-accent"
                    >
                      <Check className="h-4 w-4 text-white" />
                    </motion.div>
                  ) : isActive ? (
                    <motion.div
                      key="active"
                      className="flex items-center justify-center h-8 w-8 rounded-full bg-accent-subtle"
                    >
                      <motion.div
                        className="h-3 w-3 rounded-full bg-accent"
                        animate={prefersReducedMotion ? {} : { scale: [1, 1.15, 1] }}
                        transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
                      />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="pending"
                      className="flex items-center justify-center h-8 w-8 rounded-full border-2 border-border"
                    >
                      <Circle className="h-3 w-3 text-text-tertiary" />
                    </motion.div>
                  )}
                </AnimatePresence>
                <p className={cn(
                  'text-xs text-center font-medium leading-tight transition-colors duration-base',
                  isDone ? 'text-success' : isActive ? 'text-text-primary' : 'text-text-tertiary'
                )}>
                  {step}
                </p>
              </div>
              {i < steps.length - 1 && (
                <div className={cn(
                  'h-0.5 w-8 mx-1 transition-colors duration-slow',
                  i < currentIndex ? 'bg-accent' : 'bg-border'
                )} />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // Mobile: vertical stepper
  return (
    <ol className="flex flex-col gap-3" aria-label="Analysis progress">
      {steps.map((step, i) => {
        const isDone = i < currentIndex;
        const isActive = i === currentIndex;
        return (
          <li key={step} className="flex items-center gap-3">
            <AnimatePresence mode="wait">
              {isDone ? (
                <motion.div
                  key="done"
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="flex-shrink-0 flex items-center justify-center h-7 w-7 rounded-full bg-accent"
                >
                  <Check className="h-3.5 w-3.5 text-white" />
                </motion.div>
              ) : isActive ? (
                <div className="flex-shrink-0 flex items-center justify-center h-7 w-7 rounded-full bg-accent-subtle">
                  <motion.div
                    className="h-2.5 w-2.5 rounded-full bg-accent"
                    animate={prefersReducedMotion ? {} : { scale: [1, 1.15, 1] }}
                    transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
                  />
                </div>
              ) : (
                <div className="flex-shrink-0 flex items-center justify-center h-7 w-7 rounded-full border-2 border-border">
                  <div className="h-2 w-2 rounded-full bg-border" />
                </div>
              )}
            </AnimatePresence>
            <span className={cn(
              'text-sm font-medium transition-colors duration-base',
              isDone ? 'text-success' : isActive ? 'text-text-primary' : 'text-text-tertiary'
            )}>
              {step}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
