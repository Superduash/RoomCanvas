import React from 'react'

const STEPS = [
  {
    key: 'structure',
    label: 'Extracting Structural Lines',
    description: 'Running MLSD boundary extraction on room walls/windows.'
  },
  {
    key: 'classification',
    label: 'Classifying Space Type',
    description: 'Running CLIP zero-shot classification to detect bedroom/living room/etc.'
  },
  {
    key: 'generation',
    label: 'Generating Design Variations',
    description: 'Running batched diffusion model to construct 3 style options.'
  }
]

const ProgressSteps = ({ currentStep }) => {
  const getStepIndex = (step) => {
    switch (step) {
      case 'structure': return 0
      case 'classification': return 1
      case 'generation': return 2
      case 'done': return 3
      default: return -1
    }
  }

  const activeIndex = getStepIndex(currentStep)

  return (
    <div style={{
      width: '100%',
      maxWidth: '460px',
      margin: '2rem auto',
      backgroundColor: 'var(--bg-secondary)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      padding: '1.75rem',
      boxShadow: 'var(--shadow-lg)'
    }}>
      <h3 style={{ fontSize: '1.05rem', fontWeight: 700, textAlign: 'center', marginBottom: '1.5rem' }}>
        Processing Space Redesign
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {STEPS.map((step, index) => {
          const isCompleted = index < activeIndex
          const isActive = index === activeIndex
          
          return (
            <div 
              key={step.key} 
              style={{
                display: 'flex',
                gap: '1rem',
                opacity: isCompleted || isActive ? 1 : 0.35,
                transition: 'opacity 0.25s ease'
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  backgroundColor: isCompleted ? 'var(--success)' : isActive ? 'var(--accent)' : 'var(--bg-primary)',
                  border: '2px solid',
                  borderColor: isCompleted ? 'var(--success)' : isActive ? 'var(--accent)' : 'var(--border)',
                  color: isCompleted || isActive ? '#ffffff' : 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.85rem',
                  fontWeight: 'bold',
                  boxShadow: isActive ? '0 0 12px var(--accent-glow)' : 'none'
                }}>
                  {isCompleted ? '✓' : (isActive ? (
                    <span 
                      className="spinner" 
                      style={{ width: '12px', height: '12px', borderWidth: '1.5px', margin: 0 }}
                    />
                  ) : index + 1)}
                </div>
                {index < STEPS.length - 1 && (
                  <div style={{
                    width: '2px',
                    flexGrow: 1,
                    minHeight: '20px',
                    backgroundColor: isCompleted ? 'var(--success)' : 'var(--border)',
                    margin: '4px 0'
                  }} />
                )}
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', paddingBottom: '0.5rem' }}>
                <h4 style={{
                  fontSize: '0.9rem',
                  fontWeight: 650,
                  color: isActive ? 'var(--accent)' : 'var(--text-primary)'
                }}>
                  {step.label}
                </h4>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                  {step.description}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default ProgressSteps
