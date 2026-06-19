import { createContext, useContext, useEffect, useState } from 'react'
import {
  GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged
} from 'firebase/auth'
import { auth } from '@/services/firebase'

const AuthContext = createContext(null)

const ALLOWED_EMAIL = import.meta.env.VITE_ALLOWED_EMAIL || null
const CALENDAR_TOKEN_KEY = 'gcal_token'

function saveCalendarToken(token) {
  // Google OAuth tokens last 1 hour — store with 55 min expiry to be safe
  const expiresAt = Date.now() + 55 * 60 * 1000
  localStorage.setItem(CALENDAR_TOKEN_KEY, JSON.stringify({ token, expiresAt }))
}

function loadCalendarToken() {
  try {
    const stored = JSON.parse(localStorage.getItem(CALENDAR_TOKEN_KEY) || 'null')
    if (!stored) return null
    if (Date.now() > stored.expiresAt) {
      localStorage.removeItem(CALENDAR_TOKEN_KEY)
      return null
    }
    return stored.token
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [calendarToken, setCalendarToken] = useState(() => loadCalendarToken())

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser && ALLOWED_EMAIL && firebaseUser.email !== ALLOWED_EMAIL) {
        signOut(auth)
        setUser(null)
        setError('Unauthorized email. This app is for personal use only.')
      } else {
        setUser(firebaseUser)
        setError(null)
      }
      setLoading(false)
    })
    return unsub
  }, [])

  const signInWithGoogle = async () => {
    setError(null)
    try {
      const provider = new GoogleAuthProvider()
      provider.addScope('https://www.googleapis.com/auth/calendar.events')
      const result = await signInWithPopup(auth, provider)
      const credential = GoogleAuthProvider.credentialFromResult(result)
      if (credential?.accessToken) {
        saveCalendarToken(credential.accessToken)
        setCalendarToken(credential.accessToken)
      }
    } catch (err) {
      setError(err.message)
    }
  }

  // Called from Settings when the token has expired or Calendar was not
  // authorised during the original sign-in.
  const connectGoogleCalendar = async () => {
    try {
      const provider = new GoogleAuthProvider()
      provider.addScope('https://www.googleapis.com/auth/calendar.events')
      provider.setCustomParameters({ prompt: 'consent' })
      const result = await signInWithPopup(auth, provider)
      const credential = GoogleAuthProvider.credentialFromResult(result)
      if (credential?.accessToken) {
        saveCalendarToken(credential.accessToken)
        setCalendarToken(credential.accessToken)
        return true
      }
      return false
    } catch {
      return false
    }
  }

  const logout = () => {
    localStorage.removeItem(CALENDAR_TOKEN_KEY)
    setCalendarToken(null)
    signOut(auth)
  }

  return (
    <AuthContext.Provider value={{
      user, loading, error,
      signInWithGoogle, logout,
      calendarToken, connectGoogleCalendar,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
