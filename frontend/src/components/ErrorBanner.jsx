import React from 'react'

const ErrorBanner = ({ message = 'An unexpected error occurred.' }) => {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      padding: '1rem 1.25rem',
      backgroundColor: 'var(--error-bg)',
      border: '1px solid rgba(239, 68, 68, 0.25)',
      borderRadius: 'var(--radius-md)',
      color: 'var(--error)',
      fontSize: '0.85rem',
      fontWeight: 650,
      margin: '1.5rem auto',
      maxWidth: '550px',
      boxShadow: '0 4px 12px rgba(239, 68, 68, 0.1)'
    }}>
      <span style={{ fontSize: '1.25rem' }}>⚠️</span>
      <div style={{ textAlign: 'left', flexGrow: 1 }}>
        {message}
      </div>
    </div>
  )
}

export default ErrorBanner
