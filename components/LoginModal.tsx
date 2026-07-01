'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { BirdIcon } from '@/components/icons'

export default function LoginModal() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleGoogleLogin = async () => {
    try {
      setLoading(true)
      setError(null)
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      })
      if (error) throw error
    } catch (err: any) {
      setError(err.message || 'Failed to sign in. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0a0c14 0%, #0d1117 40%, #111827 100%)',
      overflow: 'hidden',
    }}>
      {/* Animated background orbs */}
      <div style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}>
        <div style={{
          position: 'absolute',
          top: '-20%',
          left: '-10%',
          width: '600px',
          height: '600px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,193,7,0.06) 0%, transparent 70%)',
          animation: 'orbFloat 8s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute',
          bottom: '-15%',
          right: '-5%',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(33,150,243,0.05) 0%, transparent 70%)',
          animation: 'orbFloat 10s ease-in-out infinite reverse',
        }} />
        <div style={{
          position: 'absolute',
          top: '30%',
          right: '20%',
          width: '300px',
          height: '300px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,193,7,0.04) 0%, transparent 70%)',
          animation: 'orbFloat 12s ease-in-out infinite',
        }} />
      </div>

      {/* Login Card */}
      <div style={{
        position: 'relative',
        width: '100%',
        maxWidth: '420px',
        margin: '1rem',
        background: 'rgba(17, 24, 39, 0.85)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: '1px solid rgba(255, 193, 7, 0.15)',
        borderRadius: '1.5rem',
        padding: '2.5rem 2rem',
        boxShadow: '0 25px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03) inset',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0',
        animation: 'loginCardIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}>

        {/* Logo */}
        <div style={{
          width: '72px',
          height: '72px',
          borderRadius: '1.25rem',
          background: 'linear-gradient(135deg, rgba(255,193,7,0.15) 0%, rgba(255,143,0,0.1) 100%)',
          border: '1px solid rgba(255,193,7,0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#FFC107',
          marginBottom: '1.25rem',
          boxShadow: '0 4px 20px rgba(255,193,7,0.1)',
        }}>
          <BirdIcon size={36} />
        </div>

        {/* Brand */}
        <h1 style={{
          margin: 0,
          fontSize: '2rem',
          fontWeight: 800,
          color: '#fff',
          letterSpacing: '-0.03em',
          lineHeight: 1.1,
          marginBottom: '0.35rem',
        }}>
          Fly<span style={{ color: '#FFC107' }}>Metric</span>
        </h1>

        <p style={{
          margin: 0,
          fontSize: '0.82rem',
          color: 'rgba(255,255,255,0.45)',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          fontWeight: 600,
          marginBottom: '2rem',
        }}>
          Pigeon Racing Dashboard
        </p>

        {/* Divider */}
        <div style={{
          width: '100%',
          height: '1px',
          background: 'linear-gradient(90deg, transparent, rgba(255,193,7,0.2), transparent)',
          marginBottom: '2rem',
        }} />

        {/* Welcome text */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <p style={{
            margin: '0 0 0.5rem',
            fontSize: '1.05rem',
            fontWeight: 700,
            color: 'rgba(255,255,255,0.9)',
          }}>
            Welcome back, fancier
          </p>
          <p style={{
            margin: 0,
            fontSize: '0.82rem',
            color: 'rgba(255,255,255,0.4)',
            lineHeight: 1.5,
          }}>
            Sign in to manage your loft, track races,<br/>and clock in your birds.
          </p>
        </div>

        {/* Google Sign-in Button */}
        <button
          id="google-signin-btn"
          onClick={handleGoogleLogin}
          disabled={loading}
          style={{
            width: '100%',
            padding: '0.85rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
            background: loading ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '0.875rem',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
            color: 'rgba(255,255,255,0.9)',
            fontSize: '0.92rem',
            fontWeight: 600,
            letterSpacing: '0.01em',
            position: 'relative',
            overflow: 'hidden',
          }}
          onMouseEnter={(e) => {
            if (!loading) {
              e.currentTarget.style.background = 'rgba(255,255,255,0.11)'
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.22)'
              e.currentTarget.style.transform = 'translateY(-1px)'
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.3)'
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.07)'
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = 'none'
          }}
        >
          {loading ? (
            <>
              <div style={{
                width: '20px',
                height: '20px',
                border: '2px solid rgba(255,255,255,0.2)',
                borderTopColor: '#FFC107',
                borderRadius: '50%',
                animation: 'spin 0.7s linear infinite',
                flexShrink: 0,
              }} />
              Redirecting to Google…
            </>
          ) : (
            <>
              {/* Official Google logo SVG */}
              <svg width="20" height="20" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                <path fill="none" d="M0 0h48v48H0z"/>
              </svg>
              Continue with Google
            </>
          )}
        </button>

        {/* Error message */}
        {error && (
          <div style={{
            marginTop: '1rem',
            padding: '0.75rem 1rem',
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.25)',
            borderRadius: '0.625rem',
            color: '#f87171',
            fontSize: '0.8rem',
            width: '100%',
            textAlign: 'center',
          }}>
            {error}
          </div>
        )}

        {/* Footer note */}
        <p style={{
          marginTop: '1.75rem',
          fontSize: '0.72rem',
          color: 'rgba(255,255,255,0.25)',
          textAlign: 'center',
          lineHeight: 1.6,
        }}>
          Your loft data is private and tied to your Google account.
        </p>
      </div>

      <style>{`
        @keyframes orbFloat {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-30px) scale(1.05); }
        }
        @keyframes loginCardIn {
          0% { opacity: 0; transform: scale(0.92) translateY(20px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
