import React, { useState, useRef, useCallback } from 'react'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE_MB = 10
const MAX_BYTES = MAX_SIZE_MB * 1024 * 1024

const ImageDropzone = ({ onFileSelected }) => {
  const [dragActive, setDragActive] = useState(false)
  const [preview, setPreview] = useState(null)
  const [validationError, setValidationError] = useState(null)
  const fileInputRef = useRef(null)

  const validateAndProcess = useCallback((file) => {
    setValidationError(null)

    if (!ALLOWED_TYPES.includes(file.type)) {
      setValidationError('Unsupported format. Please upload a PNG, JPG, or WEBP image.')
      return
    }
    if (file.size > MAX_BYTES) {
      setValidationError(`File is too large. Maximum size is ${MAX_SIZE_MB}MB.`)
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => setPreview(reader.result)
    reader.readAsDataURL(file)
    onFileSelected(file)
  }, [onFileSelected])

  const handleDrag = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true)
    else if (e.type === 'dragleave') setDragActive(false)
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    const file = e.dataTransfer.files?.[0]
    if (file) validateAndProcess(file)
  }, [validateAndProcess])

  const handleFileChange = useCallback((e) => {
    const file = e.target.files?.[0]
    if (file) validateAndProcess(file)
  }, [validateAndProcess])

  const handleRemove = useCallback((e) => {
    e.stopPropagation()
    setPreview(null)
    setValidationError(null)
    onFileSelected(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [onFileSelected])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <div
        id="image-dropzone"
        role="button"
        tabIndex={0}
        aria-label="Upload a room photo"
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && fileInputRef.current?.click()}
        style={{
          position: 'relative',
          border: '2px dashed',
          borderColor: dragActive
            ? 'var(--accent)'
            : validationError
            ? 'var(--error)'
            : 'var(--border)',
          backgroundColor: dragActive
            ? 'rgba(99,102,241,0.05)'
            : validationError
            ? 'rgba(239,68,68,0.04)'
            : 'var(--bg-secondary)',
          borderRadius: 'var(--radius-lg)',
          minHeight: '240px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          overflow: 'hidden',
          transition: 'all 0.2s ease',
          outline: 'none',
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_TYPES.join(',')}
          onChange={handleFileChange}
          style={{ display: 'none' }}
          aria-hidden="true"
        />

        {preview ? (
          /* Preview state */
          <div style={{ width: '100%', height: '100%', position: 'relative', minHeight: '240px' }}>
            <img
              src={preview}
              alt="Uploaded room preview"
              style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 'var(--radius-md)', minHeight: '240px' }}
            />
            {/* Overlay on hover */}
            <div style={{
              position: 'absolute', inset: 0,
              background: 'rgba(0,0,0,0)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: 'var(--radius-md)',
              transition: 'background 0.2s',
            }} />
            <button
              id="dropzone-remove-btn"
              onClick={handleRemove}
              aria-label="Remove uploaded image"
              style={{
                position: 'absolute', top: '10px', right: '10px',
                background: 'rgba(239,68,68,0.9)',
                color: '#fff',
                border: 'none',
                borderRadius: '50%',
                width: '28px', height: '28px',
                cursor: 'pointer',
                fontSize: '0.8rem', fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: 'var(--shadow-md)',
                transition: 'background 0.15s',
              }}
            >
              ✕
            </button>
            <div style={{
              position: 'absolute', bottom: '10px', left: '10px',
              background: 'rgba(16,20,32,0.85)',
              backdropFilter: 'blur(6px)',
              border: '1px solid var(--border)',
              color: 'var(--text-secondary)',
              fontSize: '0.7rem', fontWeight: 600,
              padding: '0.2rem 0.55rem',
              borderRadius: 'var(--radius-sm)',
            }}>
              ✓ Image ready
            </div>
          </div>
        ) : (
          /* Empty state */
          <div style={{ textAlign: 'center', padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{
              width: '56px', height: '56px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--accent-light)',
              border: '1px solid rgba(99,102,241,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.6rem',
              marginBottom: '0.25rem',
            }}>
              📸
            </div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>
              {dragActive ? 'Drop your image here' : 'Upload a room photo'}
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0, maxWidth: '260px' }}>
              Drag & drop your photo here, or click to browse files
            </p>
            <span style={{
              fontSize: '0.7rem', color: 'var(--text-muted)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-full)',
              padding: '0.2rem 0.65rem',
              marginTop: '0.25rem',
            }}>
              PNG · JPG · WEBP · Max {MAX_SIZE_MB}MB
            </span>
          </div>
        )}
      </div>

      {/* Client-side validation error */}
      {validationError && (
        <p style={{ fontSize: '0.8rem', color: 'var(--error)', margin: 0, paddingLeft: '0.25rem' }}>
          ⚠ {validationError}
        </p>
      )}
    </div>
  )
}

export default ImageDropzone
