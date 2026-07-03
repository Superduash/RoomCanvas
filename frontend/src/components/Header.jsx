import React, { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'

const NAV_LINKS = [
  { label: 'Generate', path: '/' },
  { label: 'History', path: '/history' },
]

const Header = () => {
  const location = useLocation()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 1.75rem',
        height: '60px',
        background: scrolled
          ? 'rgba(8, 11, 17, 0.92)'
          : 'rgba(8, 11, 17, 0.7)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: `1px solid ${scrolled ? 'var(--border)' : 'transparent'}`,
        transition: 'background 0.3s ease, border-color 0.3s ease',
      }}
    >
      {/* Logo / Brand */}
      <Link
        to="/"
        aria-label="RoomCanvas AI home"
        style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', textDecoration: 'none' }}
      >
        <div style={{
          width: '30px',
          height: '30px',
          borderRadius: 'var(--radius-sm)',
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1rem',
          boxShadow: '0 2px 10px rgba(99,102,241,0.4)',
        }}>
          🏠
        </div>
        <span style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1.1rem',
          fontWeight: 800,
          background: 'linear-gradient(90deg, #818cf8, #6366f1)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          letterSpacing: '-0.02em',
        }}>
          RoomCanvas
        </span>
        <span style={{
          fontSize: '0.6rem',
          fontWeight: 700,
          background: 'var(--accent-light)',
          color: 'var(--accent)',
          border: '1px solid rgba(99,102,241,0.25)',
          borderRadius: 'var(--radius-xs)',
          padding: '0.1rem 0.3rem',
          letterSpacing: '0.06em',
        }}>
          AI
        </span>
      </Link>

      {/* Navigation */}
      <nav aria-label="Main navigation">
        <ul style={{ display: 'flex', gap: '0.25rem', listStyle: 'none' }}>
          {NAV_LINKS.map(({ label, path }) => {
            const isActive = location.pathname === path
            return (
              <li key={path}>
                <Link
                  to={path}
                  style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                    padding: '0.4rem 0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    background: isActive ? 'var(--accent-light)' : 'transparent',
                    border: '1px solid',
                    borderColor: isActive ? 'rgba(99,102,241,0.2)' : 'transparent',
                    transition: 'all var(--transition-fast)',
                    textDecoration: 'none',
                  }}
                >
                  {label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </header>
  )
}

export default Header
