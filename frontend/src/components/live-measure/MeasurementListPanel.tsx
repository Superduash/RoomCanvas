import { Trash2 } from 'lucide-react';
import { UseArMeasurementsReturn } from '../../hooks/useArMeasurements';
import { motion, AnimatePresence } from 'framer-motion';

interface MeasurementListPanelProps {
  measurementsState: UseArMeasurementsReturn;
}

export function MeasurementListPanel({ measurementsState }: MeasurementListPanelProps) {
  const { measurements, removeMeasurement, clearMeasurements } = measurementsState;

  return (
    <div className="absolute top-[env(safe-area-inset-top,80px)] mt-16 left-4 right-4 z-20 pointer-events-none flex flex-col items-end">
      <AnimatePresence>
        {measurements.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="bg-surface-raised/80 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.12)] rounded-2xl overflow-hidden pointer-events-auto min-w-[220px] max-w-sm w-full"
          >
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/50 bg-surface/30">
              <span className="text-[11px] font-bold text-text-secondary uppercase tracking-widest">Measurements</span>
              {measurements.length > 1 && (
                <button 
                  onClick={clearMeasurements}
                  className="text-[11px] font-semibold text-danger hover:text-danger-subtle transition-colors px-2 py-1 rounded active:scale-95"
                >
                  Clear All
                </button>
              )}
            </div>
            <div className="max-h-[300px] overflow-y-auto overscroll-contain">
              <AnimatePresence initial={false}>
                {measurements.map((m) => (
                  <motion.div 
                    key={m.id}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="flex items-center justify-between px-4 py-3.5 border-b border-border/30 last:border-0 hover:bg-surface-alt/40 transition-colors">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-text-primary tabular-nums tracking-tight">{m.distanceCm}</span>
                      </div>
                      <button
                        onClick={() => {
                          if (typeof window !== 'undefined' && navigator.vibrate) {
                            navigator.vibrate(30);
                          }
                          removeMeasurement(m.id);
                        }}
                        className="text-text-tertiary hover:text-danger p-2 -mr-2 rounded-full hover:bg-danger/10 transition-colors active:scale-90"
                        aria-label="Delete measurement"
                      >
                        <Trash2 size={16} strokeWidth={2.5} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
