import React from 'react'
import { STYLE_TEMPLATES, STYLE_KEYS } from '../constants/styleTemplates'

const StyleSelector = ({ selectedStyle, onChange }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <label style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)' }}>
        Choose a design aesthetic:
      </label>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '0.875rem',
      }}>
        {STYLE_KEYS.map((key) => {
          const style = STYLE_TEMPLATES[key]
          const isSelected = selectedStyle === key
          return (
            <div
              key={key}
              onClick={() => onChange(key)}
              role="radio"
              aria-checked={isSelected}
              tabIndex={0}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onChange(key)}
              style={{
                backgroundColor: isSelected ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
                border: '2px solid',
                borderColor: isSelected ? 'var(--accent)' : 'var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '1.1rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.3rem',
                boxShadow: isSelected ? '0 0 16px rgba(99, 102, 241, 0.25)' : 'none',
                transform: isSelected ? 'translateY(-2px)' : 'none',
                outline: 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.3rem' }}>{style.emoji}</span>
                <h4 style={{ fontSize: '0.9rem', margin: 0, fontWeight: 700 }}>
                  {style.label}
                </h4>
              </div>
              <p style={{
                fontSize: '0.75rem',
                color: isSelected ? 'var(--text-secondary)' : 'var(--text-muted)',
                margin: 0,
                lineHeight: 1.35,
              }}>
                {style.description}
              </p>
              <span style={{
                marginTop: '0.25rem',
                display: 'inline-block',
                fontSize: '0.65rem',
                fontWeight: 700,
                padding: '0.15rem 0.45rem',
                borderRadius: 'var(--radius-full)',
                backgroundColor: isSelected ? 'var(--accent-light)' : 'transparent',
                color: isSelected ? 'var(--accent)' : 'var(--text-muted)',
                border: '1px solid',
                borderColor: isSelected ? 'rgba(99,102,241,0.3)' : 'var(--border)',
                alignSelf: 'flex-start',
              }}>
                {style.budget_tag}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default StyleSelector
