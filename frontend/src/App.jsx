import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom'
import MainLayout from './layouts/MainLayout'
import UploadPage from './pages/UploadPage'
import VariationPicker from './pages/VariationPicker'
import ResultPage from './pages/ResultPage'
import HistoryPage from './pages/HistoryPage'
import { GenerationProvider } from './context/GenerationContext'

/** Inline 404 fallback — no separate file needed for such a simple view. */
const NotFound = () => (
  <div className="container animate-fade" style={{ textAlign: 'center', maxWidth: '520px', paddingTop: '5rem' }}>
    <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🔍</div>
    <h2 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '0.5rem' }}>Page Not Found</h2>
    <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
      The page you're looking for doesn't exist or has been moved.
    </p>
    <Link to="/" className="btn btn-primary">← Back to Home</Link>
  </div>
)

function App() {
  return (
    <BrowserRouter>
      <GenerationProvider>
        <Routes>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<UploadPage />} />
            <Route path="variations" element={<VariationPicker />} />
            <Route path="result/:generationId" element={<ResultPage />} />
            <Route path="history" element={<HistoryPage />} />
            {/* Catch-all — shows a proper 404 instead of silently redirecting */}
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </GenerationProvider>
    </BrowserRouter>
  )
}

export default App
