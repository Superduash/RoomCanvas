import { useState } from 'react';
import { Settings2, RefreshCw } from 'lucide-react';
import { Button } from '../primitives/Button';
import { cn } from '../../lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import { useStyles } from '../../api/queries';
import { formatStyleName } from '../../utils/formatters';
import type { CustomizationOptions } from '../../api/types';

interface CustomizationPanelProps {
  onCustomize: (options: CustomizationOptions) => void;
  disabled?: boolean;
  defaultDimensions?: { width_ft: number; length_ft: number };
  initialOptions?: CustomizationOptions;
}

const FURNITURE_OPTIONS = ["Sofa", "Bookshelf", "Dining table", "TV unit", "Plants", "Rug", "Accent chair"];
const AVOID_OPTIONS = ["Dark colors", "Glass surfaces", "Open shelving"];
const BUDGET_TIERS = ['Budget-Friendly', 'Mid-Range', 'Premium'] as const;
const LIGHTING_PREFERENCES = ['Warm', 'Cool', 'Natural daylight'] as const;

export function CustomizationPanel({ onCustomize, disabled, defaultDimensions, initialOptions }: CustomizationPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { data: styles } = useStyles();

  const [mustHaveFurniture, setMustHaveFurniture] = useState<string[]>(initialOptions?.must_have_furniture ?? []);
  const [avoid, setAvoid] = useState<string[]>(initialOptions?.avoid ?? []);
  const [budgetTier, setBudgetTier] = useState<typeof BUDGET_TIERS[number] | ''>(initialOptions?.budget_tier ?? '');
  const [lightingPreference, setLightingPreference] = useState<typeof LIGHTING_PREFERENCES[number] | ''>(initialOptions?.lighting_preference ?? '');
  const [colorPreference, setColorPreference] = useState(initialOptions?.color_preference ?? '');
  const [styleOverride, setStyleOverride] = useState(initialOptions?.style_override ?? '');
  const [width, setWidth] = useState<string>(initialOptions?.room_width_ft ? String(initialOptions.room_width_ft) : defaultDimensions?.width_ft ? String(defaultDimensions.width_ft) : '');
  const [length, setLength] = useState<string>(initialOptions?.room_length_ft ? String(initialOptions.room_length_ft) : defaultDimensions?.length_ft ? String(defaultDimensions.length_ft) : '');

  const handleToggleMustHave = (item: string) => {
    setMustHaveFurniture(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]);
  };

  const handleToggleAvoid = (item: string) => {
    setAvoid(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]);
  };

  const handleReset = () => {
    setMustHaveFurniture([]);
    setAvoid([]);
    setBudgetTier('');
    setLightingPreference('');
    setColorPreference('');
    setStyleOverride('');
    setWidth(defaultDimensions?.width_ft ? String(defaultDimensions.width_ft) : '');
    setLength(defaultDimensions?.length_ft ? String(defaultDimensions.length_ft) : '');
  };

  const handleApply = () => {
    const opts: CustomizationOptions = {};
    if (mustHaveFurniture.length > 0) opts.must_have_furniture = mustHaveFurniture;
    if (avoid.length > 0) opts.avoid = avoid;
    if (budgetTier) opts.budget_tier = budgetTier as any;
    if (lightingPreference) opts.lighting_preference = lightingPreference as any;
    if (colorPreference.trim()) opts.color_preference = colorPreference.trim();
    if (styleOverride) opts.style_override = styleOverride;
    if (width && !isNaN(Number(width))) opts.room_width_ft = Number(width);
    if (length && !isNaN(Number(length))) opts.room_length_ft = Number(length);
    
    onCustomize(opts);
  };

  return (
    <div className="w-full">
      <AnimatePresence mode="wait">
        {!isOpen ? (
          <motion.div
            key="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <Button variant="outline" size="sm" onClick={() => setIsOpen(true)} disabled={disabled} icon={<Settings2 className="h-4 w-4" />} className="w-full justify-center">
              Customize Options
            </Button>
          </motion.div>
        ) : (
          <motion.div
            key="panel"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="rounded-xl border border-border bg-surface-alt p-5 shadow-sm space-y-6"
          >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-primary">Advanced Customization</h3>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={handleReset}>Reset</Button>
          <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>Cancel</Button>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-xs font-medium text-text-secondary mb-2 block">Style</label>
          <div className="flex flex-wrap gap-2">
            {styles?.map(s => (
              <button
                key={s.id}
                onClick={() => setStyleOverride(prev => prev === s.id ? '' : s.id)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-medium transition-colors border',
                  styleOverride === s.id
                    ? 'bg-accent text-white border-accent'
                    : 'bg-surface text-text-secondary border-border hover:border-accent-subtle'
                )}
              >
                {formatStyleName(s.id)}
              </button>
            ))}
          </div>
          <p className="text-xs text-text-tertiary mt-1.5">Leave unselected to keep the current style.</p>
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
                  mustHaveFurniture.includes(opt)
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
                  avoid.includes(opt)
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
                onClick={() => setBudgetTier(prev => prev === tier ? '' : tier)}
                className={cn(
                  'flex-1 px-2 py-1.5 text-xs font-semibold transition-all rounded-md',
                  budgetTier === tier
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
                onClick={() => setLightingPreference(prev => prev === pref ? '' : pref)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-medium transition-colors border',
                  lightingPreference === pref
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
            placeholder="e.g. warm earth tones, navy and brass"
            value={colorPreference}
            onChange={e => setColorPreference(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-text-secondary mb-2 block">Actual Dimensions (ft)</label>
          <div className="flex gap-3">
            <input
              type="number"
              placeholder="Width"
              value={width}
              onChange={e => setWidth(e.target.value)}
              className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
            />
            <span className="text-text-tertiary self-center">x</span>
            <input
              type="number"
              placeholder="Length"
              value={length}
              onChange={e => setLength(e.target.value)}
              className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
            />
          </div>
        </div>
      </div>

      <Button
        variant="primary"
        className="w-full justify-center mt-2"
        onClick={handleApply}
        disabled={disabled}
        icon={<RefreshCw className="h-4 w-4" />}
      >
        Regenerate with Options
      </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
