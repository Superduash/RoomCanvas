import { type FurnitureItem, type ColorSwatch } from '../../api/types';
import { Badge } from '../primitives/Badge';
import { Ruler, Palette, TrendingUp, Grid3x3, CheckCircle2, Sparkles, AlertTriangle } from 'lucide-react';


interface FurnitureListProps {
  items: FurnitureItem[];
}

const confidenceBadgeMap = {
  High: 'success',
  Medium: 'info',
  Low: 'warning'
} as const;

export function FurnitureList({ items }: FurnitureListProps) {
  if (!items.length) return null;
  return (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Grid3x3 className="h-4 w-4 text-text-tertiary" aria-hidden="true" />
        <h4 className="text-xs font-semibold uppercase tracking-widest text-text-secondary">
          Mapped Elements
        </h4>
      </div>
      <ul className="space-y-4">
        {items.map((item, i) => (
          <li key={i} className="flex items-start justify-between gap-4 group">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <p className="text-sm font-semibold text-text-primary group-hover:text-accent transition-colors duration-fast">{item.item}</p>
                {item.confidence && (
                  <Badge variant={confidenceBadgeMap[item.confidence] || 'info'} className="text-[9px] px-1.5 py-0">
                    {item.confidence} Conf.
                  </Badge>
                )}
              </div>
              <p className="text-xs text-text-secondary leading-relaxed">{item.description}</p>
              {item.dimensions && (
                <p className="text-[11px] text-text-tertiary mt-1 font-mono tracking-wide">{item.dimensions}</p>
              )}
            </div>
            <div className="flex-shrink-0 mt-0.5">
              <Badge variant="outline" className="text-[10px] uppercase tracking-wider px-2 py-0.5">
                {item.estimated_price_range}
              </Badge>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface DimensionCardProps {
  width: number;
  length: number;
  confidence: 'low' | 'medium' | 'high';
  onMeasureClick?: () => void;
}

const confidenceVariant = {
  low: 'warning',
  medium: 'info',
  high: 'success',
} as const;

export function DimensionCard({ width, length, confidence, onMeasureClick }: DimensionCardProps) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-sm flex flex-col sm:flex-row gap-5 items-center justify-between">
      <div className="flex-1 w-full">
        <div className="flex items-center gap-2 mb-3">
          <Ruler className="h-4 w-4 text-text-tertiary" aria-hidden="true" />
          <h4 className="text-xs font-semibold uppercase tracking-widest text-text-secondary">
            Estimated Dimensions
          </h4>
        </div>
        <div className="flex items-end justify-between">
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-semibold tracking-tight text-text-primary">
              {width}′
            </span>
            <span className="text-xl text-text-tertiary px-1 font-light">×</span>
            <span className="text-3xl font-semibold tracking-tight text-text-primary">
              {length}′
            </span>
          </div>
          <Badge variant={confidenceVariant[confidence]} className="mb-1 hidden sm:inline-flex" dot>
            {confidence} accuracy
          </Badge>
        </div>
        {onMeasureClick && (
          <button
            onClick={onMeasureClick}
            className="mt-3 text-sm font-medium text-accent hover:text-accent-hover transition-colors flex items-center gap-1.5 focus-visible:outline-none focus-visible:underline"
          >
            <Ruler className="h-3.5 w-3.5" /> Measure precisely
          </button>
        )}
      </div>
      
      {/* ASCII-like SVG Floorplan */}
      <div className="flex-shrink-0 relative w-32 h-24 bg-surface-alt border border-border-strong rounded-lg flex items-center justify-center">
        <svg width="80%" height="80%" viewBox="0 0 100 80" className="opacity-60 text-text-tertiary" preserveAspectRatio="xMidYMid meet">
          <rect x="10" y="10" width="80" height="60" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="4 2" />
          <text x="50" y="7" fontSize="10" fill="currentColor" textAnchor="middle" fontWeight="bold">{width}′</text>
          <text x="5" y="40" fontSize="10" fill="currentColor" textAnchor="middle" transform="rotate(-90 5,40)" fontWeight="bold">{length}′</text>
        </svg>
      </div>
    </div>
  );
}

import { toast } from '../../lib/toast';

interface PaletteSwatchesProps {
  swatches: ColorSwatch[];
}

export function PaletteSwatches({ swatches }: PaletteSwatchesProps) {
  if (!swatches.length) return null;

  const copyHex = (hex: string) => {
    navigator.clipboard.writeText(hex);
    toast.success(`Copied ${hex}`);
  };

  return (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Palette className="h-4 w-4 text-text-tertiary" aria-hidden="true" />
        <h4 className="text-xs font-semibold uppercase tracking-widest text-text-secondary">
          Color Extraction
        </h4>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4 gap-3">
        {swatches.map((s, i) => (
          <button
            key={i} 
            onClick={() => copyHex(s.hex)}
            className="flex flex-col items-center gap-2 p-2 rounded-lg hover:bg-surface-alt transition-colors duration-fast group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            title="Click to copy hex"
          >
            <div
              className="h-10 w-full rounded-md border border-border shadow-xs group-hover:scale-105 transition-transform duration-base"
              style={{ backgroundColor: s.hex }}
              role="img"
              aria-label={`${s.name} — ${s.hex}`}
            />
            <div className="text-center">
              <p className="text-[11px] font-semibold text-text-primary line-clamp-2 leading-tight w-full px-1 group-hover:text-accent transition-colors">{s.name}</p>
              <p className="text-[10px] text-text-tertiary font-mono tracking-wider">{s.hex}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

interface BudgetCardProps {
  range: string;
}

export function BudgetCard({ range }: BudgetCardProps) {
  return (
    <div className="rounded-xl border border-accent/20 bg-accent-subtle p-5">
      <div className="flex items-center gap-2 mb-2">
        <TrendingUp className="h-4 w-4 text-accent" aria-hidden="true" />
        <h4 className="text-xs font-semibold uppercase tracking-widest text-accent">
          Estimated Budget
        </h4>
      </div>
      <p className="text-2xl font-semibold tracking-tight text-accent-hover mb-4">{range}</p>
      
      {/* 40/20/25/15 distribution */}
      <div className="flex flex-col gap-2">
        <div className="flex h-2 w-full rounded-full overflow-hidden bg-surface">
          <div className="bg-accent h-full" style={{ width: '40%' }} title="Furniture: 40%" />
          <div className="bg-accent/80 h-full" style={{ width: '25%' }} title="Soft Furnishings: 25%" />
          <div className="bg-accent/60 h-full" style={{ width: '20%' }} title="Lighting: 20%" />
          <div className="bg-accent/40 h-full" style={{ width: '15%' }} title="Accessories: 15%" />
        </div>
        <div className="flex justify-between text-[10px] font-medium text-accent/80 px-1">
          <span>Furn. 40%</span>
          <span>Soft 25%</span>
          <span>Light 20%</span>
          <span>Acc. 15%</span>
        </div>
      </div>
    </div>
  );
}

interface TextBlockProps {
  label: string;
  content: string;
  icon?: React.ReactNode;
}

export function TextBlock({ label, content, icon }: TextBlockProps) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        {icon ? <span className="text-text-tertiary">{icon}</span> : <CheckCircle2 className="h-4 w-4 text-text-tertiary" />}
        <h4 className="text-xs font-semibold uppercase tracking-widest text-text-secondary">{label}</h4>
      </div>
      <p className="text-sm text-text-primary leading-relaxed">{content}</p>
    </div>
  );
}

interface DesignRationaleProps {
  overview: string;
  observations: string[];
  watchOut?: string;
}

export function DesignRationale({ overview, observations, watchOut }: DesignRationaleProps) {
  return (
    <div className="rounded-xl border border-accent/30 bg-surface p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="h-4 w-4 text-accent" aria-hidden="true" />
        <h4 className="text-xs font-semibold uppercase tracking-widest text-text-secondary">
          Design Rationale
        </h4>
      </div>
      
      <p className="text-sm text-text-primary leading-relaxed mb-4">
        {overview}
      </p>

      {observations.length > 0 && (
        <div className="mb-4">
          <h5 className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider mb-2">Key Observations</h5>
          <ul className="space-y-2">
            {observations.map((obs, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-text-secondary leading-relaxed">
                <div className="w-1.5 h-1.5 rounded-full bg-accent/60 mt-1.5 shrink-0" />
                {obs}
              </li>
            ))}
          </ul>
        </div>
      )}

      {watchOut && (
        <div className="mt-4 p-3 rounded-lg bg-warning-subtle border border-warning/30 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
          <div>
            <h5 className="text-[11px] font-semibold text-warning uppercase tracking-wider mb-1">Watch Out</h5>
            <p className="text-xs text-warning/90 leading-relaxed">{watchOut}</p>
          </div>
        </div>
      )}
    </div>
  );
}
