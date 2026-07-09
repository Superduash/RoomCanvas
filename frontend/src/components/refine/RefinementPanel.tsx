import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { Button } from '../primitives/Button';
import { Textarea } from '../primitives/Input';
import { useRefineDesign } from '../../api/queries';
import { useUIStore } from '../../store/uiStore';
import { toast } from '../../lib/toast';

const SUGGESTION_CHIPS = [
  'Change the wall color to sage green',
  'Replace the sofa with a leather one',
  'Add more indoor plants',
  'Make the lighting warmer',
];

interface RefinementPanelProps {
  generationId: number;
  disabled: boolean;
}

export function RefinementPanel({ generationId, disabled }: RefinementPanelProps) {
  const navigate = useNavigate();
  const refinementDraft = useUIStore((s) => s.refinementDraft);
  const setRefinementDraft = useUIStore((s) => s.setRefinementDraft);
  const [chipConfirm, setChipConfirm] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refine = useRefineDesign();

  const handleChipClick = (chip: string) => {
    if (refinementDraft.trim() && refinementDraft.trim() !== chip) {
      setChipConfirm(chip);
    } else {
      setRefinementDraft(chip);
    }
  };

  const handleSubmit = async () => {
    if (!refinementDraft.trim()) return;
    setError(null);
    try {
      const result = await refine.mutateAsync({ generation_id: generationId, instruction: refinementDraft });
      setRefinementDraft('');
      navigate(`/results/${result.id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to refine design';
      setError(msg);
      toast.error(msg);
    }
  };

  return (
    <div className={`rounded-xl border border-border bg-surface p-5 shadow-sm ${disabled ? 'opacity-60 pointer-events-none' : ''}`}>
      <div className="flex flex-col gap-1 mb-4">
        <h3 className="text-sm font-semibold text-text-primary">Iterate with AI</h3>
        <p className="text-xs text-text-secondary leading-relaxed">
          {disabled 
            ? 'Wait for the current generation to finish.' 
            : 'Keep the room structure, but change the details. What would you like to tweak?'}
        </p>
      </div>

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

      {/* Suggestion chips */}
      <div className="flex flex-wrap gap-2 mt-3" role="list" aria-label="Refinement suggestions">
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

      {/* Chip replace confirm */}
      {chipConfirm && (
        <div className="mt-4 rounded-lg bg-warning-subtle border border-warning/20 p-3 text-xs text-warning flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
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

      <Button
        variant="primary"
        size="md"
        className="mt-5 w-full justify-center shadow-md"
        disabled={disabled || !refinementDraft.trim()}
        loading={refine.isPending}
        icon={!refine.isPending ? <Sparkles className="h-4 w-4" /> : undefined}
        onClick={handleSubmit}
      >
        {refine.isPending ? 'Generating Edit...' : 'Apply Changes'}
      </Button>
    </div>
  );
}
