import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '../primitives/Button';
import { Textarea } from '../primitives/Input';
import { cn } from '../../lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import { useStyles, useRefineDesign, useGenerateDesign } from '../../api/queries';
import { formatStyleName } from '../../utils/formatters';
import type { CustomizationOptions } from '../../api/types';
import { useUIStore } from '../../store/uiStore';
import { toast } from '../../lib/toast';
import { getFriendlyApiError } from '../../utils/errors';

const SUGGESTION_CHIPS = [
  'Change the wall color to sage green',
  'Replace the sofa with a leather one',
  'Add more indoor plants',
  'Make the lighting warmer',
];

const FURNITURE_OPTIONS = ["Sofa", "Bookshelf", "Dining table", "TV unit", "Plants", "Rug", "Accent chair"];
const AVOID_OPTIONS = ["Dark colors", "Glass surfaces", "Open shelving"];
const BUDGET_TIERS = ['Budget-Friendly', 'Mid-Range', 'Premium'] as const;
const LIGHTING_PREFERENCES = ['Warm', 'Cool', 'Natural daylight'] as const;

interface DesignEditorPanelProps {
  generationId: number;
  projectId: number;
  disabled?: boolean;
  defaultDimensions?: { width_ft: number; length_ft: number };
  initialOptions?: CustomizationOptions;
  isRefinement?: boolean;
}

export function DesignEditorPanel({ generationId, projectId, disabled, defaultDimensions, initialOptions, isRefinement }: DesignEditorPanelProps) {
  const navigate = useNavigate();
  const refinementDraft = useUIStore((s) => s.refinementDraft);
  const setRefinementDraft = useUIStore((s) => s.setRefinementDraft);
  const { data: styles } = useStyles();
  
  const refine = useRefineDesign();
  const generate = useGenerateDesign();
  const isPending = refine.isPending || generate.isPending;

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [chipConfirm, setChipConfirm] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  const handleResetOptions = () => {
    setMustHaveFurniture([]);
    setAvoid([]);
    setBudgetTier('');
    setLightingPreference('');
    setColorPreference('');
    setStyleOverride('');
    setWidth(defaultDimensions?.width_ft ? String(defaultDimensions.width_ft) : '');
    setLength(defaultDimensions?.length_ft ? String(defaultDimensions.length_ft) : '');
  };

  const handleChipClick = (chip: string) => {
    if (refinementDraft.trim() && refinementDraft.trim() !== chip) {
      setChipConfirm(chip);
    } else {
      setRefinementDraft(chip);
    }
  };

  const handleSubmit = async () => {
    setError(null);

    const opts: CustomizationOptions = {};
    if (mustHaveFurniture.length > 0) opts.must_have_furniture = mustHaveFurniture;
    if (avoid.length > 0) opts.avoid = avoid;
    if (budgetTier) opts.budget_tier = budgetTier as any;
    if (lightingPreference) opts.lighting_preference = lightingPreference as any;
    if (colorPreference.trim()) opts.color_preference = colorPreference.trim();
    if (styleOverride) opts.style_override = styleOverride;
    if (width && !isNaN(Number(width))) opts.room_width_ft = Number(width);
    if (length && !isNaN(Number(length))) opts.room_length_ft = Number(length);

    const hasOptions = Object.keys(opts).length > 0;
    const hasInstruction = refinementDraft.trim().length > 0;

    if (!hasInstruction && !hasOptions) {
        toast.error("Please enter an instruction or select customization options.");
        return;
    }

    try {
      let result;
      // If we are refining an already completed generation
      if (isRefinement) {
        result = await refine.mutateAsync({
          generation_id: generationId,
          instruction: hasInstruction ? refinementDraft : undefined,
          customization: hasOptions ? opts : undefined
        });
      } else {
        result = await generate.mutateAsync({
          analysisId: generationId,
          forceNew: true,
          instruction: hasInstruction ? refinementDraft : undefined,
          customization: hasOptions ? opts : undefined
        });
      }
      
      useUIStore.getState().setLastCustomization(projectId, opts);
      setRefinementDraft('');
      toast.success('Applying your changes...');
      navigate(`/results/${projectId}?v=${result.id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to apply changes';
      setError(msg);
      toast.error(getFriendlyApiError(err, msg));
    }
  };

  return (
    <div className={cn("rounded-xl border border-border bg-surface p-5 shadow-sm space-y-5", disabled && "opacity-60 pointer-events-none")}>
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-semibold text-text-primary">Edit Design</h3>
        <p className="text-xs text-text-secondary leading-relaxed">
          {disabled 
            ? 'Wait for the current generation to finish.' 
            : 'Keep the room structure, but change the details. Use text instructions or select options.'}
        </p>
      </div>

      <div className="space-y-3">
        <Textarea
          id="refinement-instruction"
          placeholder="e.g. 'Make the walls a warm sage green' or 'Add a modern rug'"
          value={refinementDraft}
          onChange={(e) => setRefinementDraft(e.target.value)}
          className="min-h-[100px] w-full text-sm resize-none"
          disabled={disabled}
          aria-label="Refinement instruction"
          error={error ?? undefined}
        />

        <div className="flex flex-wrap gap-2" role="list" aria-label="Refinement suggestions">
          {SUGGESTION_CHIPS.map((chip) => (
            <button
              key={chip}
              type="button"
              role="listitem"
              disabled={disabled}
              onClick={() => handleChipClick(chip)}
              className="rounded-full border border-border bg-surface-alt px-3 py-1.5 text-xs font-medium text-text-secondary hover:border-accent-subtle hover:bg-accent-subtle hover:text-accent transition-all duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {chip}
            </button>
          ))}
        </div>

        {chipConfirm && (
          <div className="mt-2 rounded-lg bg-warning-subtle border border-warning/20 p-3 text-xs text-warning flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
            <span className="font-medium">Replace current text with &ldquo;{chipConfirm}&rdquo;?</span>
            <div className="flex gap-2 flex-shrink-0 self-end sm:self-auto">
              <Button size="xs" variant="secondary" onClick={() => setChipConfirm(null)}>
                Keep
              </Button>
              <Button size="xs" variant="primary" onClick={() => { setRefinementDraft(chipConfirm); setChipConfirm(null); }}>
                Replace
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-border pt-4">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center justify-between w-full text-sm font-medium text-text-secondary hover:text-text-primary transition-colors focus:outline-none"
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
              className="overflow-hidden mt-4"
            >
              <div className="space-y-4 pb-2">
                <div className="flex items-center justify-between">
                    <span className="text-xs text-text-tertiary">Select options to override the base generation.</span>
                    <Button variant="ghost" size="xs" onClick={handleResetOptions}>Reset Options</Button>
                </div>
                
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

              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Button
        variant="primary"
        size="md"
        className="mt-2 w-full justify-center shadow-md"
        disabled={disabled}
        loading={isPending}
        icon={!isPending ? <Sparkles className="h-4 w-4" /> : undefined}
        onClick={handleSubmit}
      >
        {isPending ? 'Applying Changes...' : 'Apply Changes'}
      </Button>
    </div>
  );
}
