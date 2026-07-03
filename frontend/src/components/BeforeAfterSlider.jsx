import React, { useState } from 'react'
import { resolveImageUrl } from '../api/client'

const BeforeAfterSlider = ({ originalImage, variationImage }) => {
  const [sliderPos, setSliderPos] = useState(50)

  const handleSlider = (e) => {
    setSliderPos(Number(e.target.value))
  }

  const beforeUrl = resolveImageUrl(originalImage)
  const afterUrl = resolveImageUrl(variationImage)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', width: '100%' }}>
      <div style={{
        position: 'relative',
        width: '100%',
        paddingBottom: '66.6%', // standard 3:2 photos aspect ratio
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-lg)'
      }}>
        {/* UNDERNEATH: Original Design (Before) */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1 }}>
          <img 
            src={beforeUrl} 
            alt="Original room" 
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
          />
          <div style={{
            position: 'absolute',
            bottom: '12px',
            right: '12px',
            backgroundColor: 'rgba(16, 20, 32, 0.8)',
            border: '1px solid var(--border)',
            color: 'var(--text-secondary)',
            fontSize: '0.75rem',
            fontWeight: 600,
            padding: '0.3rem 0.6rem',
            borderRadius: 'var(--radius-sm)'
          }}>
            Before
          </div>
        </div>

        {/* ON TOP: Transformed Design (After) with clip-path */}
        <div style={{ 
          position: 'absolute', 
          top: 0, 
          left: 0, 
          width: '100%', 
          height: '100%', 
          zIndex: 2,
          clipPath: `polygon(0 0, ${sliderPos}% 0, ${sliderPos}% 100%, 0 100%)`
        }}>
          <img 
            src={afterUrl} 
            alt="Redesigned room" 
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
          />
          <div style={{
            position: 'absolute',
            bottom: '12px',
            left: '12px',
            backgroundColor: 'var(--accent)',
            color: '#ffffff',
            fontSize: '0.75rem',
            fontWeight: 600,
            padding: '0.3rem 0.6rem',
            borderRadius: 'var(--radius-sm)',
            boxShadow: '0 2px 8px rgba(99, 102, 241, 0.4)'
          }}>
            After
          </div>
        </div>

        {/* SLIDER DIVIDER LINE & DRAG BUTTON */}
        <div style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: `${sliderPos}%`,
          width: '2px',
          backgroundColor: '#ffffff',
          boxShadow: '0 0 6px rgba(0,0,0,0.5)',
          zIndex: 3,
          pointerEvents: 'none'
        }}>
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            backgroundColor: '#ffffff',
            border: '2px solid var(--accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--shadow-md)'
          }}>
            <span style={{ color: 'var(--accent)', fontSize: '0.9rem', fontWeight: 'bold' }}>↔</span>
          </div>
        </div>

        {/* INVISIBLE RANGE INPUT TO HANDLE INTERACTIVE DRAGGING */}
        <input 
          type="range"
          min="0"
          max="100"
          value={sliderPos}
          onChange={handleSlider}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            opacity: 0,
            zIndex: 4,
            cursor: 'ew-resize',
            margin: 0
          }}
        />
      </div>
      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', margin: 0 }}>
        Slide drag handler horizontally to compare changes
      </p>
    </div>
  )
}

export default BeforeAfterSlider
