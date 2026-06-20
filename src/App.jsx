import { lazy, Suspense, useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query'
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

// ── Refresh data when app comes back to foreground ────────────────────────────
// Handles the case where data is updated on another device (e.g. laptop)
// and the mobile app is showing stale cached data.
function VisibilityRefresh() {
  const qc = useQueryClient()
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        qc.invalidateQueries()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [qc])
  return null
}

// ── PWA update banner ─────────────────────────────────────────────────────────
// On iOS, waiting SWs can't be activated programmatically via postMessage.
// The only reliable update path is close + reopen, so we tell the user that.
function UpdateBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    const showIfWaiting = (reg) => {
      if (reg.waiting && navigator.serviceWorker.controller) setVisible(true)
    }

    navigator.serviceWorker.ready.then(reg => {
      showIfWaiting(reg)
      reg.addEventListener('updatefound', () => {
        const sw = reg.installing
        if (!sw) return
        sw.addEventListener('statechange', () => {
          if (sw.state === 'installed') showIfWaiting(reg)
        })
      })
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') reg.update().catch(() => {})
      })
    })
  }, [])

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
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px', margin: '2px 0 0' }}>Close and reopen the app to update</p>
      </div>
      <button
        onClick={() => setVisible(false)}
        style={{ color: 'rgba(255,255,255,0.85)', fontSize: '13px', fontWeight: 600, background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '8px', cursor: 'pointer', padding: '6px 14px', flexShrink: 0 }}>
        Dismiss
      </button>
    </div>
  )
}

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

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppProvider>
          <BrowserRouter>
            <VisibilityRefresh />
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
