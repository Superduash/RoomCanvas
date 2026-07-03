import React from 'react'
import { STYLE_TEMPLATES, formatLabel } from '../constants/styleTemplates'

/**
 * GenerationSummary — a compact metadata panel showing pipeline parameters
 * for a completed generation: model, room type, style, timing, and confidence.
 */
const GenerationSummary = ({
  modelUsed = '',
  roomType = '',
  confidence = 0,
  style = '',
  generationTimeSec = 0,
}) => {
  const styleInfo = STYLE_TEMPLATES[style]
  const confidencePct = Math.round((confidence || 0) * 100)
  const confColor = confidencePct >= 75 ? 'var(--success)' : confidencePct >= 50 ? 'var(--warning)' : 'var(--error)'

  const isMock = modelUsed?.toLowerCase().includes('mock')

  const rows = [
    {
      label: 'AI Model',
      value: (
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <code style={{ fontSize: '0.78rem', color: 'var(--accent)' }}>{modelUsed || '—'}</code>
          <span style={{
            fontSize: '0.62rem', fontWeight: 700, padding: '0.1rem 0.4rem',
            borderRadius: 'var(--radius-full)', textTransform: 'uppercase', letterSpacing: '0.04em',
            background: isMock ? 'var(--warning-bg)' : 'var(--success-bg)',
            color: isMock ? 'var(--warning)' : 'var(--success)',
            border: `1px solid ${isMock ? 'var(--warning-border)' : 'var(--success-border)'}`,
          }}>
            {isMock ? 'mock' : 'real'}
          </span>
        </span>
      ),
    },
    {
      label: 'Space Type',
      value: (
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{formatLabel(roomType) || '—'}</span>
          <span style={{ fontSize: '0.75rem', color: confColor, fontWeight: 700 }}>
            {confidencePct}% confidence
          </span>
        </span>
      ),
    },
    {
      label: 'Style',
      value: styleInfo
        ? `${styleInfo.emoji} ${styleInfo.label}`
        : formatLabel(style) || '—',
    },
    {
      label: 'Inference Time',
      value: generationTimeSec ? `${generationTimeSec.toFixed(2)}s` : '—',
    },
  ]

  return (
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
      <h3 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
        <span>📋</span> Generation Parameters
      </h3>

      <hr className="divider" />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.9rem 0.5rem' }}>
        {rows.map(({ label, value }) => (
          <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {label}
            </span>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-primary)', fontWeight: 600 }}>
              {value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default GenerationSummary
