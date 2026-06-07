import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from '@/context/AuthContext'
import { AppProvider } from '@/context/AppContext'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { useNotifications } from '@/hooks/useNotifications'
import { DueChequesPrompt } from '@/components/DueChequesPrompt'

function NotificationManager() {
  useNotifications()

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    if (!('periodicSync' in ServiceWorkerRegistration.prototype)) return
    if (Notification.permission !== 'granted') return

    navigator.serviceWorker.ready.then(reg => {
      reg.periodicSync.register('check-alerts', { minInterval: 24 * 60 * 60 * 1000 }).catch(() => {})
    })
  }, [])

  return null
}

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
  return <>{children}<NotificationManager /></>
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
