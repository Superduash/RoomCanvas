import React from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useHistory } from '../hooks/useHistory'
import { resolveImageUrl } from '../api/client'
import { STYLE_TEMPLATES, formatLabel } from '../constants/styleTemplates'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorBanner from '../components/ErrorBanner'

const SkeletonCard = () => (
  <div style={{
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    overflow: 'hidden',
  }}>
    <div className="skeleton" style={{ width: '100%', paddingBottom: '66.6%' }} />
    <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <div className="skeleton" style={{ height: '14px', width: '60%' }} />
      <div className="skeleton" style={{ height: '12px', width: '40%' }} />
    </div>
  </div>
)

const HistoryPage = () => {
  const navigate = useNavigate()
  const { historyList = [], isLoading, error, refresh } = useHistory()

  if (isLoading) {
    return (
      <div className="container animate-fade">
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0 }}>Design History</h2>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0' }}>
            Your previous AI-generated interior redesigns.
          </p>
        </div>
        <div className="grid-3">
          {[1, 2, 3, 4, 5, 6].map(n => <SkeletonCard key={n} />)}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container animate-fade" style={{ maxWidth: '600px' }}>
        <ErrorBanner message={error.message || 'Failed to load design history.'} />
        <button className="btn btn-secondary" onClick={refresh} style={{ marginTop: '1rem' }}>
          ↺ Retry
        </button>
      </div>
    )
  }

  return (
    <div className="container animate-fade">
      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0 }}>Design History</h2>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0' }}>
            {historyList.length > 0
              ? `${historyList.length} project${historyList.length !== 1 ? 's' : ''} — click any card to view the full result.`
              : 'No projects yet.'}
          </p>
        </div>
        {historyList.length > 0 && (
          <Link to="/" className="btn btn-primary btn-sm">
            + New Design
          </Link>
        )}
      </div>

      {/* Empty state */}
      {historyList.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '5rem 2rem',
          border: '1px dashed var(--border)',
          borderRadius: 'var(--radius-xl)',
          maxWidth: '520px',
          margin: '2rem auto',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem',
        }}>
          <div style={{
            width: '60px', height: '60px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--accent-light)',
            border: '1px solid rgba(99,102,241,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.8rem',
          }}>
            🏠
          </div>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 0.4rem' }}>No designs yet</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0, maxWidth: '280px' }}>
              Upload a photo of your space to generate your first AI interior redesign.
            </p>
          </div>
          <Link to="/" className="btn btn-primary" style={{ marginTop: '0.5rem' }}>
            ✦ Generate Your First Design
          </Link>
        </div>
      ) : (
        /* Grid of history cards */
        <div className="grid-3">
          {historyList.map((item) => {
            const selectedVar =
              item.variations.find(v => v.id === item.selected_variation_id) ||
              item.variations[0]
            const displayImg = selectedVar?.image_path || item.original_image_path
            const styleInfo = STYLE_TEMPLATES[item.style]
            const hasVariations = item.variations.length > 0

            return (
              <div
                key={item.id}
                id={`history-card-${item.id}`}
                role="button"
                tabIndex={0}
                aria-label={`View ${formatLabel(item.room_type_detected)} design`}
                onClick={() => navigate(`/result/${item.id}`)}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && navigate(`/result/${item.id}`)}
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-lg)',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex', flexDirection: 'column',
                  outline: 'none',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-4px)'
                  e.currentTarget.style.borderColor = 'var(--border-focus)'
                  e.currentTarget.style.boxShadow = 'var(--shadow-md)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'none'
                  e.currentTarget.style.borderColor = 'var(--border)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                {/* Thumbnail */}
                <div style={{ position: 'relative', width: '100%', paddingBottom: '66.6%', overflow: 'hidden', backgroundColor: 'var(--bg-primary)' }}>
                  <img
                    src={resolveImageUrl(displayImg)}
                    alt={`${formatLabel(item.style)} redesign`}
                    loading="lazy"
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                  />

                  {/* Style badge */}
                  <div style={{
                    position: 'absolute', top: '8px', left: '8px',
                    background: 'var(--accent)',
                    color: '#fff',
                    fontSize: '0.62rem', fontWeight: 700,
                    padding: '0.18rem 0.5rem',
                    borderRadius: 'var(--radius-sm)',
                    letterSpacing: '0.03em',
                  }}>
                    {styleInfo?.emoji} {styleInfo?.label || formatLabel(item.style)}
                  </div>

                  {/* Variation count badge */}
                  {hasVariations && (
                    <div style={{
                      position: 'absolute', top: '8px', right: '8px',
                      background: 'rgba(8,11,17,0.8)',
                      backdropFilter: 'blur(4px)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-muted)',
                      fontSize: '0.62rem', fontWeight: 600,
                      padding: '0.18rem 0.5rem',
                      borderRadius: 'var(--radius-sm)',
                    }}>
                      {item.variations.length} vars
                    </div>
                  )}
                </div>

                {/* Card footer */}
                <div style={{ padding: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1 }}>
                  <h4 style={{ fontSize: '0.88rem', fontWeight: 700, margin: 0 }}>
                    {formatLabel(item.room_type_detected) || 'Unknown Space'}
                  </h4>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      {new Date(item.created_at).toLocaleDateString(undefined, {
                        year: 'numeric', month: 'short', day: 'numeric',
                      })}
                    </span>
                    {item.selected_variation_id && (
                      <span style={{ fontSize: '0.65rem', color: 'var(--success)', fontWeight: 700 }}>
                        ✓ Picked
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default HistoryPage
