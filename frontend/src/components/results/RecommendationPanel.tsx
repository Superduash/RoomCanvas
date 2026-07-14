import { useState } from 'react';
import { type FurnitureItem, type ColorSwatch } from '../../api/types';
import { Badge } from '../primitives/Badge';
import { Dialog } from '../primitives/Dialog';
import { Ruler, Palette, TrendingUp, Grid3x3, CheckCircle2, Sparkles, AlertTriangle, Maximize2 } from 'lucide-react';
import { toast } from '../../lib/toast';
import { needsColorBorder } from '../../utils/colorHelpers';


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
                {item.purchase_status === 'keep_existing' && (
                  <Badge variant="success" className="text-[9px] px-1.5 py-0">
                    Already have this
                  </Badge>
                )}
                {item.purchase_status === 'optional_upgrade' && (
                  <Badge variant="warning" className="text-[9px] px-1.5 py-0">
                    Optional
                  </Badge>
                )}
                {item.purchase_status === 'new_purchase' && (
                  <Badge variant="info" className="text-[9px] px-1.5 py-0">
                    New Purchase
                  </Badge>
                )}
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
                ${item.price_min}–${item.price_max}
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
          Color Palette
        </h4>
      </div>
      <div className="flex flex-wrap items-center gap-2.5">
        {swatches.map((s, i) => (
          <button
            key={i} 
            onClick={() => copyHex(s.hex)}
            className="group relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 rounded-lg"
            title={`${s.name} • ${s.hex}\nClick to copy`}
            aria-label={`${s.name} color swatch, hex code ${s.hex}. Click to copy.`}
          >
            <div
              className={`h-11 w-11 rounded-lg shadow-sm group-hover:scale-110 group-active:scale-95 transition-transform duration-200 ease-out ${
                needsColorBorder(s.hex) ? 'border border-border/40' : ''
              }`}
              style={{ backgroundColor: s.hex }}
              role="img"
              aria-hidden="true"
            />
            {/* Tooltip on hover - minimal, elegant */}
            <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-text-primary text-bg text-[10px] font-medium rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-md z-10">
              {s.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

interface BudgetCardProps {
  summary: {
    required_purchase_total: { min: number; max: number };
    optional_upgrade_total: { min: number; max: number };
    grand_total: { min: number; max: number };
    items_to_buy_count: number;
    items_kept_count: number;
  };
  items: FurnitureItem[];
}

export function BudgetCard({ summary, items }: BudgetCardProps) {
  const [showDetails, setShowDetails] = useState(false);

  const requiredItems = items.filter(i => i.purchase_status === 'new_purchase');
  const optionalItems = items.filter(i => i.purchase_status === 'optional_upgrade');
  const existingItems = items.filter(i => i.purchase_status === 'keep_existing');

  return (
    <>
    <div className="rounded-xl border border-accent/20 bg-accent-subtle p-5 relative group">
      <button 
        onClick={() => setShowDetails(true)}
        className="absolute top-4 right-4 p-1.5 text-accent/60 hover:text-accent bg-surface/50 hover:bg-surface rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        title="View Itemized Details"
        aria-label="View itemized budget details"
      >
        <Maximize2 className="h-4 w-4" />
      </button>
      <div className="flex items-center gap-2 mb-2 pr-8">
        <TrendingUp className="h-4 w-4 text-accent" aria-hidden="true" />
        <h4 className="text-xs font-semibold uppercase tracking-widest text-accent">
          Estimated Budget
        </h4>
      </div>
      <p className="text-2xl font-semibold tracking-tight text-accent-hover mb-2">
        ${summary.grand_total.min}–${summary.grand_total.max}
      </p>
      
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm font-medium text-accent/80 mb-4">
        <span>Required: ${summary.required_purchase_total.min}–${summary.required_purchase_total.max}</span>
        <span>•</span>
        <span>Optional: ${summary.optional_upgrade_total.min}–${summary.optional_upgrade_total.max}</span>
      </div>
      
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

    <Dialog 
      open={showDetails} 
      onClose={() => setShowDetails(false)} 
      title="Itemized Budget Breakdown"
    >
      <BudgetSection 
        title="Required Purchases" 
        items={requiredItems} 
        total={summary.required_purchase_total} 
        badgeType="info" 
        badgeLabel="New Purchase"
      />
      <BudgetSection 
        title="Optional Upgrades" 
        items={optionalItems} 
        total={summary.optional_upgrade_total} 
        badgeType="warning" 
        badgeLabel="Optional"
      />
      <BudgetSection 
        title="Already Have" 
        items={existingItems} 
        total={{min: 0, max: 0}} 
        badgeType="success" 
        badgeLabel="Have it"
      />
      
      <div className="pt-4 border-t border-border flex justify-between items-center mt-2 sticky bottom-0 bg-surface">
        <span className="font-semibold text-text-primary text-[15px]">Grand Total</span>
        <span className="text-xl font-bold tracking-tight text-accent-hover">${summary.grand_total.min}–${summary.grand_total.max}</span>
      </div>
    </Dialog>
    </>
  );
}

function BudgetSection({ title, items, total, badgeType, badgeLabel }: any) {
  const [isOpen, setIsOpen] = useState(true);

  if (!items.length) return null;
  return (
    <div className="mb-8 last:mb-2">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between mb-4 border-b border-border/50 pb-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-sm"
        aria-expanded={isOpen}
      >
        <h4 className="text-[13px] font-semibold text-text-primary">{title}</h4>
        <div className="flex items-center gap-3">
          {total.max > 0 && <span className="text-sm font-medium text-text-secondary">${total.min}–${total.max}</span>}
          <div className={`text-text-tertiary transition-transform duration-200 ${isOpen ? '' : 'rotate-180'}`}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
      </button>
      {isOpen && (
        <ul className="space-y-4">
          {items.map((item: FurnitureItem, i: number) => (
            <li key={i} className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-[13px] font-semibold text-text-primary truncate">{item.item}</p>
                  <Badge variant={badgeType} className="text-[9px] px-1.5 py-0 shrink-0">
                    {badgeLabel}
                  </Badge>
                </div>
                <p className="text-[11px] text-text-secondary line-clamp-2 leading-relaxed">{item.description}</p>
              </div>
              <div className="shrink-0 mt-0.5">
                 <span className="text-[12px] font-medium text-text-primary whitespace-nowrap">
                   ${item.price_min}–${item.price_max}
                 </span>
              </div>
            </li>
          ))}
        </ul>
      )}
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
