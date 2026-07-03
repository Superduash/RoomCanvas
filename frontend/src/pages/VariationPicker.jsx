import React, { useContext, useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { GenerationContext } from '../context/GenerationContext'
import { selectVariation as apiSelectVariation } from '../api/generationApi'
import VariationCard from '../components/VariationCard'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorBanner from '../components/ErrorBanner'

const VariationPicker = () => {
  const navigate = useNavigate()
  const { currentResult } = useContext(GenerationContext)
  // All hooks MUST be called before any early return (React Rules of Hooks)
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState(null)

  // Now it's safe to perform the early redirect guard
  if (!currentResult) {
    return <Navigate to="/" replace />
  }

  const {
    id: generationId,
    room_type_detected,
    room_confidence,
    style,
    variations = []
  } = currentResult

  const handleCardClick = async (variationId) => {
    setSubmitting(true)
    setErrorMsg(null)
    try {
      await apiSelectVariation(generationId, variationId)
      navigate(`/result/${generationId}`)
    } catch (err) {
      setErrorMsg(err.message || 'Could not select variation. Please try again.')
      setSubmitting(false)
    }
  }

  const cleanLabel = (text) => {
    if (!text) return 'Space'
    return text.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
  }

  const styleLabel = cleanLabel(style)

  return (
    <div className="container animate-fade">
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem' }}>
          Choose Your Design
        </h2>
        <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', margin: 0 }}>
          Detected: <strong style={{ color: 'var(--accent)' }}>{cleanLabel(room_type_detected)}</strong>
          {' '}&mdash; Style: <strong style={{ color: 'var(--accent)' }}>{styleLabel}</strong>
          {' '}with <strong style={{ color: 'var(--success)' }}>{Math.round((room_confidence || 0) * 100)}%</strong> confidence.
        </p>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
          Each variation was generated with a different seed &mdash; pick the one that feels right.
        </p>
      </div>

      {submitting ? (
        <LoadingSpinner message="Locking in your design choice…" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {errorMsg && <ErrorBanner message={errorMsg} />}

          <div className="grid-3">
            {variations.map((variation, index) => (
              <VariationCard
                key={variation.id}
                imageUrl={variation.image_path}
                seed={variation.seed}
                label={`Option ${index + 1}`}
                onClick={() => handleCardClick(variation.id)}
                selected={false}
              />
            ))}
          </div>

          <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Click any card above to select it and view the full result page.
          </p>
        </div>
      )}
    </div>
  )
}

export default VariationPicker
