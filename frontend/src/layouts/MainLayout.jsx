import React from 'react'
import { Outlet, Link } from 'react-router-dom'
import Header from '../components/Header'

const MainLayout = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header />
      <main style={{ flex: 1 }}>
        <Outlet />
      </main>
      <footer style={{
        padding: '1.25rem 1.75rem',
        borderTop: '1px solid var(--border)',
        background: 'var(--bg-secondary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
      }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          © {new Date().getFullYear()} <strong style={{ color: 'var(--text-secondary)' }}>RoomCanvas AI</strong> — AI-Powered Interior Design
        </span>
        <div style={{ display: 'flex', gap: '1.25rem' }}>
          {[
            { label: 'Generate', path: '/' },
            { label: 'History', path: '/history' },
          ].map(({ label, path }) => (
            <Link
              key={path}
              to={path}
              style={{ fontSize: '0.78rem', color: 'var(--text-muted)', transition: 'color 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
            >
              {label}
            </Link>
          ))}
        </div>
      </footer>
    </div>
  )
}

export default MainLayout
