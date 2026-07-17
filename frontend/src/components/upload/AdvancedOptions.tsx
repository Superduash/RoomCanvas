import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '../primitives/Button';
import { cn } from '../../lib/utils';
import type { CustomizationOptions } from '../../api/types';

const FURNITURE_OPTIONS = ["Sofa", "Bookshelf", "Dining table", "TV unit", "Plants", "Rug", "Accent chair"];
const AVOID_OPTIONS = ["Dark colors", "Glass surfaces", "Open shelving"];
const BUDGET_TIERS = ['Budget-Friendly', 'Mid-Range', 'Premium'] as const;
const LIGHTING_PREFERENCES = ['Warm', 'Cool', 'Natural daylight'] as const;

export function AdvancedOptions({ value, onChange }: { value: CustomizationOptions, onChange: (val: CustomizationOptions) => void }) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleToggleMustHave = (item: string) => {
    const current = value.must_have_furniture || [];
    const updated = current.includes(item) ? current.filter(i => i !== item) : [...current, item];
    onChange({ ...value, must_have_furniture: updated });
  };

  const handleToggleAvoid = (item: string) => {
    const current = value.avoid || [];
    const updated = current.includes(item) ? current.filter(i => i !== item) : [...current, item];
    onChange({ ...value, avoid: updated });
  };

  const handleReset = () => {
    onChange({});
  };

  return (
    <div className="w-full">
      <button
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex items-center justify-between w-full text-sm font-medium text-text-secondary hover:text-text-primary transition-colors focus:outline-none py-2 px-1"
      >
        <span>Advanced Customization</span>
        {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      <AnimatePresence>
        {showAdvanced && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden mt-2 bg-surface border border-border rounded-xl p-4 shadow-sm"
          >
            <div className="space-y-4 pb-2">
              <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-text-tertiary">Select options to customize your design.</span>
                  <Button variant="ghost" size="xs" onClick={handleReset}>Reset Options</Button>
              </div>

              <div>
                <label className="text-xs font-medium text-text-secondary mb-2 block">Must Have Furniture</label>
                <div className="flex flex-wrap gap-2">
                  {FURNITURE_OPTIONS.map(opt => (
                    <button
                      key={opt}
                      onClick={() => handleToggleMustHave(opt)}
                      className={cn(
                        'px-3 py-1.5 rounded-full text-xs font-medium transition-colors border',
                        (value.must_have_furniture || []).includes(opt)
                          ? 'bg-accent text-white border-accent'
                          : 'bg-surface text-text-secondary border-border hover:border-accent-subtle'
                      )}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-text-secondary mb-2 block">Avoid Elements</label>
                <div className="flex flex-wrap gap-2">
                  {AVOID_OPTIONS.map(opt => (
                    <button
                      key={opt}
                      onClick={() => handleToggleAvoid(opt)}
                      className={cn(
                        'px-3 py-1.5 rounded-full text-xs font-medium transition-colors border',
                        (value.avoid || []).includes(opt)
                          ? 'bg-danger text-white border-danger'
                          : 'bg-surface text-text-secondary border-border hover:border-danger-subtle'
                      )}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-text-secondary mb-2 block">Budget Tier</label>
                <div className="flex rounded-lg border border-border bg-surface p-1 shadow-xs w-full">
                  {BUDGET_TIERS.map(tier => (
                    <button
                      key={tier}
                      onClick={() => onChange({ ...value, budget_tier: value.budget_tier === tier ? undefined : tier as any })}
                      className={cn(
                        'flex-1 px-2 py-1.5 text-xs font-semibold transition-all rounded-md',
                        value.budget_tier === tier
                          ? 'bg-surface-alt text-text-primary shadow-sm border border-border/50'
                          : 'text-text-secondary hover:text-text-primary hover:bg-black/[0.02] border border-transparent'
                      )}
                    >
                      {tier}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-text-secondary mb-2 block">Lighting Preference</label>
                <div className="flex flex-wrap gap-2">
                  {LIGHTING_PREFERENCES.map(pref => (
                    <button
                      key={pref}
                      onClick={() => onChange({ ...value, lighting_preference: value.lighting_preference === pref ? undefined : pref as any })}
                      className={cn(
                        'px-3 py-1.5 rounded-full text-xs font-medium transition-colors border',
                        value.lighting_preference === pref
                          ? 'bg-accent-subtle text-accent border-accent/20'
                          : 'bg-surface text-text-secondary border-border hover:border-accent/10'
                      )}
                    >
                      {pref}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-text-secondary mb-2 block">Color Preference</label>
                <input
                  type="text"
                  placeholder="e.g. warm earth tones"
                  value={value.color_preference || ''}
                  onChange={e => onChange({ ...value, color_preference: e.target.value })}
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
                />
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
