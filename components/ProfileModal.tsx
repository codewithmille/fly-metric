'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Session } from '@supabase/supabase-js'

interface ProfileModalProps {
  isOpen: boolean
  onClose: () => void
  session: Session | null
  onProfileUpdated?: () => void
}

export default function ProfileModal({ isOpen, onClose, session, onProfileUpdated }: ProfileModalProps) {
  const [displayName, setDisplayName] = useState('')
  const [loftName, setLoftName] = useState('')
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && session?.user) {
      const metadata = session.user.user_metadata || {}
      setDisplayName(metadata.full_name || session.user.email?.split('@')[0] || 'Fancier')
      setLoftName(metadata.loft_name || '')
      setLatitude(metadata.loft_latitude?.toString() || '')
      setLongitude(metadata.loft_longitude?.toString() || '')
      setSuccess(false)
      setError(null)
    }
  }, [isOpen, session])

  const [fetchingGps, setFetchingGps] = useState(false)

  const handleUseDeviceGps = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.')
      return
    }

    setFetchingGps(true)
    setError(null)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toFixed(6))
        setLongitude(position.coords.longitude.toFixed(6))
        setFetchingGps(false)
      },
      (err) => {
        console.error('Error fetching GPS location:', err)
        setError('Failed to retrieve location. Please check browser permissions.')
        setFetchingGps(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(false)

    if (!displayName.trim()) {
      setError('Display name is required.')
      setSaving(false)
      return
    }

    const latNum = parseFloat(latitude)
    const lngNum = parseFloat(longitude)

    if (latitude && (isNaN(latNum) || latNum < -90 || latNum > 90)) {
      setError('Please enter a valid Latitude (-90 to 90 degrees).')
      setSaving(false)
      return
    }

    if (longitude && (isNaN(lngNum) || lngNum < -180 || lngNum > 180)) {
      setError('Please enter a valid Longitude (-180 to 180 degrees).')
      setSaving(false)
      return
    }

    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: displayName.trim(),
          loft_name: loftName.trim() || undefined,
          loft_latitude: latitude ? latNum : null,
          loft_longitude: longitude ? lngNum : null,
        }
      })

      if (error) throw error

      setSuccess(true)
      onProfileUpdated?.()
      
      setTimeout(() => {
        setSuccess(false)
        onClose()
      }, 1500)
    } catch (err: any) {
      setError(err.message || 'Failed to update profile settings.')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen || !session?.user) return null
  const user = session.user

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
        <div className="modal-header">
          <div className="modal-header-left">
            <span className="modal-pigeon-icon">👤</span>
            <div>
              <h2 className="modal-title" style={{ color: '#000' }}>Fancier Profile</h2>
              <p className="modal-subtitle" style={{ color: 'rgba(0,0,0,0.6)' }}>Configure loft and coordinate settings</p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">&times;</button>
        </div>

        <form onSubmit={handleSave}>
          <div className="modal-body">
            
            {/* Account Info (Read-only email) */}
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '0.15rem', 
              padding: '0.75rem 1rem', 
              background: 'var(--bg-input)', 
              borderRadius: '0.625rem', 
              border: '1px solid var(--border-default)',
              marginBottom: '0.5rem'
            }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Google Account Email</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{user.email}</span>
            </div>

            {/* Fancier Display Name */}
            <div className="form-group">
              <label htmlFor="fancier-name" className="form-label">Fancier Display Name</label>
              <input
                id="fancier-name"
                type="text"
                className="form-input"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. John Doe"
                required
              />
            </div>

            {/* Loft Name */}
            <div className="form-group">
              <label htmlFor="loft-name" className="form-label">Loft Name</label>
              <input
                id="loft-name"
                type="text"
                className="form-input"
                value={loftName}
                onChange={(e) => setLoftName(e.target.value)}
                placeholder="e.g. Blue Sky Loft"
              />
            </div>

            {/* GPS Coordinates Group */}
            <div style={{ borderTop: '1px solid var(--border-default)', marginTop: '0.5rem', paddingTop: '1rem' }}>
              <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Loft GPS Location</span>
              <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', lineHeight: '1.4' }}>
                Enter decimal coordinates. Used to calculate precise flight distances from race release points.
              </span>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="loft-lat" className="form-label">Latitude (°N/S)</label>
                  <input
                    id="loft-lat"
                    type="number"
                    step="any"
                    className="form-input"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    placeholder="e.g. 14.5995"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="loft-lng" className="form-label">Longitude (°E/W)</label>
                  <input
                    id="loft-lng"
                    type="number"
                    step="any"
                    className="form-input"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    placeholder="e.g. 120.9842"
                  />
                </div>
              </div>

              <button
                type="button"
                className="nav-btn nav-btn-secondary"
                disabled={fetchingGps}
                onClick={handleUseDeviceGps}
                style={{
                  marginTop: '0.75rem',
                  width: '100%',
                  padding: '0.4rem',
                  fontSize: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.3rem',
                  borderColor: 'rgba(255, 193, 7, 0.3)',
                  color: 'var(--brand-gold)',
                  background: 'rgba(255, 193, 7, 0.05)',
                  height: '2.2rem'
                }}
              >
                🛰️ {fetchingGps ? 'Fetching GPS…' : 'Use Current Device GPS'}
              </button>
            </div>

            {error && (
              <div className="form-error" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div style={{ 
                padding: '0.6rem 0.875rem', 
                background: 'rgba(63, 185, 80, 0.1)', 
                border: '1px solid rgba(63, 185, 80, 0.3)', 
                borderRadius: '0.5rem', 
                fontSize: '0.82rem', 
                color: 'var(--color-success)', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem',
                marginTop: '0.5rem'
              }}>
                <span>✓</span>
                <span>Settings saved successfully!</span>
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
              <button
                type="button"
                className="nav-btn nav-btn-secondary"
                onClick={onClose}
                style={{ flex: 1, padding: '0.625rem', height: '2.5rem' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="nav-btn nav-btn-primary"
                disabled={saving}
                style={{ flex: 1, padding: '0.625rem', height: '2.5rem', background: 'var(--brand-gold)', color: '#000', fontWeight: 'bold' }}
              >
                {saving ? 'Saving…' : 'Save Settings'}
              </button>
            </div>

          </div>
        </form>
      </div>
    </div>
  )
}
