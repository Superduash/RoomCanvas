import React from 'react'

/**
 * Approximate hex values for each palette colour name used across all style templates.
 * This avoids inline hex strings scattered through the component tree.
 */
const COLOR_HEX = {
  'Pure White':          '#F8FAFC',
  'Alabaster White':     '#F2FAFA',
  'Pearl White':         '#FAF5EC',
  'Warm Charcoal':       '#333D4F',
  'Soft Beige':          '#E5D5C5',
  'Matte Black':         '#141415',
  'Pale Ash Oak':        '#D9C8B5',
  'Mist Grey':           '#B6C1CD',
  'Sage Green accents':  '#899981',
  'Raw Iron Black':      '#2E2F32',
  'Brick Red':           '#AB4338',
  'Weathered Grey':      '#838B95',
  'Copper accents':      '#C87D55',
  'Warm Terracotta':     '#D27D66',
  'Mustard Yellow':      '#DFAC46',
  'Olive Green':         '#708264',
  'Burnt Orange':        '#D06037',
  'Champagne Gold':      '#D1B26E',
  'Rich Emerald':        '#0E6251',
  'Deep Obsidian':       '#111622',
}

const BUDGET_STYLE = {
  Premium:          { bg: 'var(--warning-bg)',   color: 'var(--warning)',  border: 'var(--warning-border)' },
  'Mid-Range':      { bg: 'var(--accent-light)', color: 'var(--accent)',   border: 'rgba(99,102,241,0.25)' },
  'Budget-Friendly':{ bg: 'var(--success-bg)',   color: 'var(--success)',  border: 'var(--success-border)' },
}

/**
 * DesignExplanation — shows the design rationale, colour palette swatches,
 * budget tier, and key furniture list for the selected style.
 */
const DesignExplanation = ({ furniture = [], palette = [], budgetTag = '', reason = '' }) => {
  const budget = BUDGET_STYLE[budgetTag] || BUDGET_STYLE['Mid-Range']

  return (
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' }}>

      {/* Design Insight */}
      <div>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>💡</span> Design Rationale
        </h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.65, margin: 0 }}>
          {reason}
        </p>
      </div>

      <hr className="divider" />

      {/* Colour Palette */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h4 style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>
            Colour Palette
          </h4>
          {/* Budget tier badge */}
          <span style={{
            fontSize: '0.65rem', fontWeight: 700,
            padding: '0.18rem 0.55rem',
            borderRadius: 'var(--radius-full)',
            textTransform: 'uppercase', letterSpacing: '0.04em',
            backgroundColor: budget.bg,
            color: budget.color,
            border: `1px solid ${budget.border}`,
          }}>
            {budgetTag}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
          {palette.map((colorName, i) => {
            const hex = COLOR_HEX[colorName] || '#64748b'
            const isLight = ['Pure White', 'Alabaster White', 'Pearl White', 'Soft Beige', 'Pale Ash Oak', 'Mist Grey'].includes(colorName)
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div
                  title={colorName}
                  style={{
                    width: '28px', height: '28px',
                    borderRadius: 'var(--radius-xs)',
                    backgroundColor: hex,
                    border: isLight ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(0,0,0,0.2)',
                    flexShrink: 0,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  }}
                />
                <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                  {colorName}
                </span>
                <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                  {hex}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      <hr className="divider" />

      {/* Key Furniture */}
      <div>
        <h4 style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.65rem' }}>
          Key Furniture &amp; Accents
        </h4>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {furniture.map((piece, i) => (
            <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.55rem', fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              <span style={{ color: 'var(--accent)', marginTop: '0.1rem', flexShrink: 0 }}>▸</span>
              {piece}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export default DesignExplanation
