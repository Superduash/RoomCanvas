import React, { useState, useContext, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { GenerationContext } from '../context/GenerationContext'
import { useGenerate } from '../hooks/useGenerate'
import { STYLE_KEYS, STYLE_TEMPLATES } from '../constants/styleTemplates'
import ImageDropzone from '../components/ImageDropzone'
import StyleSelector from '../components/StyleSelector'
import ProgressSteps from '../components/ProgressSteps'
import ErrorBanner from '../components/ErrorBanner'

const UploadPage = () => {
  const navigate = useNavigate()
  const { currentUpload, setCurrentUpload, resetState } = useContext(GenerationContext)
  const [style, setStyle] = useState(STYLE_KEYS[0]) // default: first key (modern_minimalist)
  const { generate, isLoading, error } = useGenerate()
  const [step, setStep] = useState('structure')

  // Reset context on mount to allow a fresh start
  useEffect(() => {
    resetState()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleFileChange = useCallback((file) => {
    setCurrentUpload(file)
  }, [setCurrentUpload])

  const handleUploadSubmit = async () => {
    if (!currentUpload) return

    // Simulate step progression to give users visual feedback
    setStep('structure')
    const t1 = setTimeout(() => setStep('classification'), 600)
    const t2 = setTimeout(() => setStep('generation'), 1200)

    try {
      await generate(currentUpload, style)
      clearTimeout(t1)
      clearTimeout(t2)
      navigate('/variations')
    } catch {
      clearTimeout(t1)
      clearTimeout(t2)
      // error is already captured by useGenerate hook
    }
  }

  const selectedStyleTemplate = STYLE_TEMPLATES[style]

  return (
    <div className="container animate-fade" style={{ maxWidth: '860px' }}>
      {/* Page Hero */}
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.4rem',
          fontSize: '0.75rem',
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--accent)',
          background: 'var(--accent-light)',
          border: '1px solid rgba(99,102,241,0.2)',
          borderRadius: 'var(--radius-full)',
          padding: '0.3rem 0.85rem',
          marginBottom: '1rem',
        }}>
          <span>✦</span> AI-Powered Interior Design
        </div>
        <h2 style={{ fontSize: '2.25rem', fontWeight: 800, marginBottom: '0.6rem', letterSpacing: '-0.03em' }}>
          Reimagine Your Space
        </h2>
        <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', maxWidth: '480px', margin: '0 auto' }}>
          Upload a room photo, choose a design style, and receive{' '}
          <strong>3 AI-generated variations</strong> in seconds.
        </p>
      </div>

      {isLoading ? (
        <div className="glass-panel" style={{ maxWidth: '480px', margin: '0 auto', padding: '2.5rem' }}>
          <ProgressSteps currentStep={step} />
        </div>
      ) : (
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <ImageDropzone onFileSelected={handleFileChange} />

          <hr className="divider" />

          <StyleSelector selectedStyle={style} onChange={setStyle} />

          {error && (
            <ErrorBanner message={error.message || 'Generation failed. Please check your image and try again.'} />
          )}

          <button
            id="generate-btn"
            className="btn btn-primary btn-lg"
            onClick={handleUploadSubmit}
            disabled={!currentUpload}
            style={{ width: '100%' }}
          >
            {currentUpload
              ? `✦ Generate in ${selectedStyleTemplate?.label || 'Selected'} Style`
              : '📸 Upload a room photo to begin'}
          </button>

          {!currentUpload && (
            <p style={{ textAlign: 'center', fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '-1rem' }}>
              Drag & drop or click the zone above to select your image.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

export default UploadPage
