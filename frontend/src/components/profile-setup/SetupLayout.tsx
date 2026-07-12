import { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface SetupLayoutProps {
  currentStep: number;
  totalSteps: number;
  title: string;
  subtitle: string;
  children: ReactNode;
}

export function SetupLayout({ currentStep, totalSteps, title, subtitle, children }: SetupLayoutProps) {
  const progressPercent = Math.max(10, (currentStep / totalSteps) * 100);

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-accent/5 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-accent/5 blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-[560px] bg-surface rounded-2xl shadow-xl border border-border overflow-hidden relative z-10 flex flex-col"
      >
        <div className="p-8 sm:p-10 flex-1 flex flex-col">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-8">
              <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center shadow-sm">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--bg)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className="text-[13px] font-medium text-text-secondary">
                  Step {currentStep} of {totalSteps}
                </span>
                <div className="w-32 h-1.5 bg-bg rounded-full overflow-hidden border border-border/50">
                  <motion.div
                    className="h-full bg-accent rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>
              </div>
            </div>
            
            <h1 className="text-3xl font-semibold text-text-primary tracking-tight mb-2">
              {title}
            </h1>
            <p className="text-[15px] text-text-secondary leading-relaxed">
              {subtitle}
            </p>
          </div>

          {/* Content Area */}
          <div className="flex-1 relative">
            {children}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
