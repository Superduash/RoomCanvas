import React from 'react'

const LoadingSpinner = ({ message = 'Loading...' }) => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '1rem',
      padding: '3rem',
      width: '100%',
      textAlign: 'center'
    }}>
      <div className="spinner" style={{ 
        width: '2.5rem', 
        height: '2.5rem', 
        borderWidth: '3px', 
        color: 'var(--accent)',
        filter: 'drop-shadow(0 0 8px var(--accent-glow))'
      }} />
      <h4 style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', margin: 0, fontWeight: 600 }}>
        {message}
      </h4>
    </div>
  )
}

export default LoadingSpinner
