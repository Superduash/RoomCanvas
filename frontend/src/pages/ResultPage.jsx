import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getGeneration } from '../api/generationApi'
import { STYLE_TEMPLATES, formatLabel } from '../constants/styleTemplates'
import BeforeAfterSlider from '../components/BeforeAfterSlider'
import DesignExplanation from '../components/DesignExplanation'
import GenerationSummary from '../components/GenerationSummary'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorBanner from '../components/ErrorBanner'

const ResultPage = () => {
  const { generationId } = useParams()
  const [generation, setGeneration] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    const fetchDesignData = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await getGeneration(generationId)
        if (!cancelled) setGeneration(data)
      } catch (err) {
        if (!cancelled) setError(err.message || 'Could not fetch redesign details.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchDesignData()
    return () => { cancelled = true }
  }, [generationId])

  if (loading) {
    return (
      <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <LoadingSpinner message="Loading your design workspace…" />
      </div>
    )
  }

  if (error || !generation) {
    return (
      <div className="container animate-fade" style={{ maxWidth: '600px', textAlign: 'center' }}>
        <ErrorBanner message={error || 'Generation not found.'} />
        <Link to="/" className="btn btn-secondary" style={{ marginTop: '1.5rem', display: 'inline-flex' }}>
          ← Back to Home
        </Link>
      </div>
    )
  }

  // Prefer the explicitly selected variation, else fallback to first
  const selectedVar =
    generation.variations.find(v => v.id === generation.selected_variation_id) ||
    generation.variations[0]

  const styleTemplate =
    STYLE_TEMPLATES[generation.style] || STYLE_TEMPLATES.modern_minimalist

  const formattedRoomName = (generation.room_type_detected || 'room')
    .replace(/_/g, ' ')

  const reasonText = styleTemplate.reason_template.replace('{room_type}', formattedRoomName)

  return (
    <div className="container animate-fade">
      {/* Page Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '2rem',
        gap: '1rem',
        flexWrap: 'wrap',
      }}>
        <div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0 }}>Design Workspace</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.25rem 0 0' }}>
            {formatLabel(generation.room_type_detected)} &middot; {styleTemplate.label} &middot; ID #{generation.id}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link to="/variations" className="btn btn-secondary">
            ↩ Change Variation
          </Link>
          <Link to="/" className="btn btn-primary">
            ✨ New Design
          </Link>
        </div>
      </div>

      <div className="grid-2">
        {/* Left column: slider + summary */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {selectedVar ? (
            <BeforeAfterSlider
              originalImage={generation.original_image_path}
              variationImage={selectedVar.image_path}
            />
          ) : (
            <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem' }}>
              <p style={{ color: 'var(--text-muted)' }}>No variation selected yet.</p>
            </div>
          )}

          <GenerationSummary
            modelUsed={generation.model_used}
            roomType={generation.room_type_detected}
            confidence={generation.room_confidence}
            style={generation.style}
            generationTimeSec={generation.generation_time_sec}
          />
        </div>

        {/* Right column: design explanation */}
        <DesignExplanation
          furniture={styleTemplate.furniture}
          palette={styleTemplate.palette}
          budgetTag={styleTemplate.budget_tag}
          reason={reasonText}
        />
      </div>
    </div>
  )
}

export default ResultPage
