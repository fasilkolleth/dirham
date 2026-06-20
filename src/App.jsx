import { lazy, Suspense, useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from '@/context/AuthContext'
import { AppProvider } from '@/context/AppContext'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { DueChequesPrompt } from '@/components/DueChequesPrompt'

const AuthPage = lazy(() => import('@/pages/Auth'))
const DashboardPage = lazy(() => import('@/pages/Dashboard'))
const BudgetPage = lazy(() => import('@/pages/Budget'))
const TrackersPage = lazy(() => import('@/pages/Trackers'))
const PropertiesPage = lazy(() => import('@/pages/Properties'))
const SettingsPage = lazy(() => import('@/pages/Settings'))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <PageLoader />
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>

}

function AppRoutes() {
  const { user, loading } = useAuth()
  if (loading) return <PageLoader />
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <AuthPage />} />
        <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/budget" element={<ProtectedRoute><BudgetPage /></ProtectedRoute>} />
        <Route path="/trackers" element={<ProtectedRoute><TrackersPage /></ProtectedRoute>} />
        <Route path="/properties" element={<ProtectedRoute><PropertiesPage /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {user && <DueChequesPrompt />}
    </Suspense>
  )
}

function UpdateBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    // Reload the page when the new SW takes control
    let reloading = false
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!reloading) { reloading = true; window.location.reload() }
    })

    const checkWaiting = (reg) => {
      if (reg.waiting && navigator.serviceWorker.controller) {
        setVisible(true)
      }
    }

    const watchInstalling = (reg) => {
      const sw = reg.installing
      if (!sw) return
      sw.addEventListener('statechange', () => {
        if (sw.state === 'installed') checkWaiting(reg)
      })
    }

    navigator.serviceWorker.ready.then(reg => {
      checkWaiting(reg)
      reg.addEventListener('updatefound', () => watchInstalling(reg))
      // Re-check for updates each time the app comes to the foreground
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') reg.update().catch(() => {})
      })
    })
  }, [])

  const handleUpdate = () => {
    navigator.serviceWorker.ready.then(reg => {
      // Always read reg.waiting fresh — avoids stale state reference
      if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' })
      else window.location.reload()
    })
  }

  if (!visible) return null

  return (
    <div style={{
      position: 'fixed', bottom: '80px', left: '16px', right: '16px', zIndex: 9999,
      background: 'linear-gradient(135deg, #0062FF 0%, #0EA5E9 100%)',
      borderRadius: '14px', padding: '14px 16px',
      boxShadow: '0 8px 24px rgba(0,98,255,0.35)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
    }}>
      <div>
        <p style={{ color: '#fff', fontWeight: 600, fontSize: '14px', margin: 0 }}>Update available</p>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px', margin: '2px 0 0' }}>Tap to get the latest version</p>
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button onClick={() => setVisible(false)}
          style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer', padding: '6px 10px' }}>
          Later
        </button>
        <button onClick={handleUpdate}
          style={{ background: '#fff', color: '#0062FF', fontSize: '13px', fontWeight: 700, border: 'none', borderRadius: '8px', padding: '6px 14px', cursor: 'pointer' }}>
          Update
        </button>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppProvider>
          <BrowserRouter>
            <UpdateBanner />
            <AppRoutes />
            <Toaster
              position="top-center"
              toastOptions={{
                duration: 2500,
                style: {
                  borderRadius: '12px',
                  background: '#1C1C1E',
                  color: '#FFFFFF',
                  fontSize: '14px',
                  fontWeight: 500,
                },
              }}
            />
          </BrowserRouter>
        </AppProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}
