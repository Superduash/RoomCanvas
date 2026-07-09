import { type FurnitureItem, type ColorSwatch } from '../../api/types';
import { Badge } from '../primitives/Badge';
import { Ruler, Palette, TrendingUp, Grid3x3, CheckCircle2 } from 'lucide-react';


interface FurnitureListProps {
  items: FurnitureItem[];
}

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
            <div className="min-w-0">
              <p className="text-sm font-semibold text-text-primary mb-0.5 group-hover:text-accent transition-colors duration-fast">{item.item}</p>
              <p className="text-xs text-text-secondary leading-relaxed">{item.description}</p>
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
}

const confidenceVariant = {
  low: 'warning',
  medium: 'info',
  high: 'success',
} as const;

export function DimensionCard({ width, length, confidence }: DimensionCardProps) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
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
        <Badge variant={confidenceVariant[confidence]} className="mb-1" dot>
          {confidence} accuracy
        </Badge>
      </div>
    </div>
  );
}

interface PaletteSwatchesProps {
  swatches: ColorSwatch[];
}

export function PaletteSwatches({ swatches }: PaletteSwatchesProps) {
  if (!swatches.length) return null;
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
          <div key={i} className="flex flex-col items-center gap-2 p-2 rounded-lg hover:bg-surface-alt transition-colors duration-fast">
            <div
              className="h-10 w-full rounded-md border border-border shadow-xs"
              style={{ backgroundColor: s.hex }}
              role="img"
              aria-label={`${s.name} — ${s.hex}`}
            />
            <div className="text-center">
              <p className="text-[11px] font-semibold text-text-primary line-clamp-2 leading-tight w-full px-1">{s.name}</p>
              <p className="text-[10px] text-text-tertiary font-mono tracking-wider">{s.hex}</p>
            </div>
          </div>
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
      <p className="text-2xl font-semibold tracking-tight text-accent-hover">{range}</p>
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
