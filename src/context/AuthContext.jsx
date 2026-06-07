import { createContext, useContext, useEffect, useState } from 'react'
import {
  GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged
} from 'firebase/auth'
import { auth } from '@/services/firebase'

const AuthContext = createContext(null)

const ALLOWED_EMAIL = import.meta.env.VITE_ALLOWED_EMAIL || null

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

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
      await signInWithPopup(auth, provider)
    } catch (err) {
      setError(err.message)
    }
  }

  const logout = () => signOut(auth)

  return (
    <AuthContext.Provider value={{ user, loading, error, signInWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
