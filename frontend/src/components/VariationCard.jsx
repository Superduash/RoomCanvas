import React, { useState } from 'react'
import { resolveImageUrl } from '../api/client'

/**
 * VariationCard — displays a single generated design variation.
 * Props:
 *   imageUrl  — raw path from API response (resolved via resolveImageUrl)
 *   seed      — integer seed used to generate this variation
 *   label     — display label e.g. "Option 1"
 *   onClick   — callback when user selects this card
 *   selected  — whether this variation is currently selected
 */
const VariationCard = ({ imageUrl, seed, label = 'Option', onClick, selected = false }) => {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      id={`variation-card-seed-${seed}`}
      role="button"
      tabIndex={0}
      aria-label={`Select ${label}`}
      aria-pressed={selected}
      onClick={onClick}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onClick?.()}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: 'var(--radius-lg)',
        border: '2px solid',
        borderColor: selected ? 'var(--accent)' : hovered ? 'var(--border-focus)' : 'var(--border)',
        backgroundColor: 'var(--bg-secondary)',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'all 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
        boxShadow: selected
          ? '0 0 0 3px var(--accent-light), var(--shadow-lg)'
          : hovered
          ? 'var(--shadow-md)'
          : 'var(--shadow-sm)',
        transform: selected ? 'translateY(-5px)' : hovered ? 'translateY(-3px)' : 'none',
        outline: 'none',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Image area */}
      <div style={{ position: 'relative', width: '100%', paddingBottom: '75%', overflow: 'hidden', backgroundColor: 'var(--bg-primary)' }}>
        <img
          src={resolveImageUrl(imageUrl)}
          alt={`Room design ${label} — seed ${seed}`}
          loading="lazy"
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            objectFit: 'cover',
            transition: 'transform 0.35s ease',
            transform: hovered ? 'scale(1.04)' : 'scale(1)',
          }}
        />

        {/* Top-left label */}
        <div style={{
          position: 'absolute', top: '10px', left: '10px',
          background: 'rgba(8,11,17,0.8)',
          backdropFilter: 'blur(6px)',
          border: '1px solid var(--border)',
          color: 'var(--text-secondary)',
          fontSize: '0.7rem', fontWeight: 700,
          padding: '0.2rem 0.55rem',
          borderRadius: 'var(--radius-sm)',
          letterSpacing: '0.03em',
        }}>
          {label}
        </div>

        {/* Top-right seed badge */}
        <div style={{
          position: 'absolute', top: '10px', right: '10px',
          background: 'rgba(8,11,17,0.7)',
          backdropFilter: 'blur(4px)',
          border: '1px solid var(--border)',
          color: 'var(--text-muted)',
          fontSize: '0.65rem', fontWeight: 600,
          padding: '0.15rem 0.45rem',
          borderRadius: 'var(--radius-sm)',
        }}>
          S:{seed}
        </div>

        {/* Selected overlay */}
        {selected && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(99,102,241,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{
              width: '42px', height: '42px',
              borderRadius: '50%',
              background: 'var(--accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.3rem',
              boxShadow: '0 0 20px rgba(99,102,241,0.5)',
            }}>
              ✓
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{
        padding: '0.85rem 1rem',
        textAlign: 'center',
        fontSize: '0.85rem',
        fontWeight: 700,
        color: selected ? 'var(--accent)' : hovered ? 'var(--text-primary)' : 'var(--text-secondary)',
        borderTop: '1px solid var(--border)',
        transition: 'color 0.2s',
      }}>
        {selected ? '✓ Selected Design' : 'Choose This Design'}
      </div>
    </div>
  )
}

export default VariationCard
