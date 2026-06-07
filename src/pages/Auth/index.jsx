import { useAuth } from '@/context/AuthContext'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { LogoMark } from '@/components/shared/LogoMark'

export default function AuthPage() {
  const { signInWithGoogle, loading, error } = useAuth()

  return (
    <div
      className="min-h-dvh flex flex-col items-center justify-center px-6"
      style={{ background: 'linear-gradient(160deg, #09090B 0%, #0C0C18 100%)' }}
    >
      <div className="w-full max-w-xs flex flex-col items-center gap-8">

        {/* App icon */}
        <div className="flex flex-col items-center gap-5">
          <div style={{ filter: 'drop-shadow(0 20px 40px rgba(0, 98, 255, 0.35)) drop-shadow(0 8px 16px rgba(124, 58, 237, 0.25))' }}>
            <LogoMark size={88} />
          </div>
          <div className="text-center">
            <h1 className="text-[28px] font-bold text-white tracking-tight">Dirham</h1>
            <p className="text-[14px] text-[#96969E] mt-2 leading-relaxed max-w-[240px]">
              Track budgets, EMIs, properties, and your complete financial picture.
            </p>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div
            className="w-full px-4 py-3 rounded-[var(--radius-lg)] text-sm text-center"
            style={{
              background: 'rgba(248, 113, 113, 0.10)',
              border: '1px solid rgba(248, 113, 113, 0.25)',
              color: '#F87171',
            }}
          >
            {error}
          </div>
        )}

        {/* Sign-in button */}
        <button
          onClick={signInWithGoogle}
          disabled={loading}
          className="w-full h-[52px] rounded-[var(--radius-xl)] flex items-center justify-center gap-3 font-semibold text-[15px] transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: '#FFFFFF',
            color: '#0C0C14',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          }}
        >
          {loading ? (
            <LoadingSpinner size={20} />
          ) : (
            <>
              <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </>
          )}
        </button>

        <p className="text-[#66666A] text-[11px] text-center">
          Personal use only · Your data is private and secure
        </p>
      </div>
    </div>
  )
}
