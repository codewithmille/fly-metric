'use client'

import { useState } from 'react'
import { GlobeIcon, TrophyIcon, MapPinIcon, CalendarIcon, TagIcon } from '@/components/icons'

interface JoinGroupRaceModalProps {
  isOpen: boolean
  loftBirds: any[]
  onClose: () => void
  onSuccess: (race: any) => void
}

export default function JoinGroupRaceModal({
  isOpen,
  loftBirds = [],
  onClose,
  onSuccess,
}: JoinGroupRaceModalProps) {
  const [joinCode, setJoinCode] = useState('')
  const [loadingRace, setLoadingRace] = useState(false)
  const [foundRace, setFoundRace] = useState<any | null>(null)
  const [loftName, setLoftName] = useState('My Loft')
  const [fancierName, setFancierName] = useState('')
  const [loftDistance, setLoftDistance] = useState<number | ''>('')
  const [selectedRings, setSelectedRings] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [joinedSuccess, setJoinedSuccess] = useState(false)

  if (!isOpen) return null

  // Lookup race by Join Code
  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanCode = joinCode.trim().toUpperCase()
    if (!cleanCode) {
      setError('Please enter a Join Code')
      return
    }

    setLoadingRace(true)
    setError(null)
    setFoundRace(null)

    try {
      const res = await fetch(`/api/group-races?code=${encodeURIComponent(cleanCode)}`)
      const data = await res.json()

      if (!res.ok || data.error) {
        throw new Error(data.error || 'No group race found with this code')
      }

      setFoundRace(data)
      setLoftDistance(data.distance || '')
      // Pre-select all registered birds by default (open unlimited entry)
      setSelectedRings(loftBirds.map((b) => b.ringNo.toUpperCase()))
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Error finding race')
    } finally {
      setLoadingRace(false)
    }
  }

  // Toggle single bird selection
  const toggleBird = (ring: string) => {
    const normalized = ring.toUpperCase()
    setSelectedRings((prev) =>
      prev.includes(normalized) ? prev.filter((r) => r !== normalized) : [...prev, normalized]
    )
  }

  // Select all birds
  const selectAll = () => {
    setSelectedRings(loftBirds.map((b) => b.ringNo.toUpperCase()))
  }

  // Clear all birds
  const clearAll = () => {
    setSelectedRings([])
  }

  // Submit enrollment
  const handleJoin = async () => {
    if (!foundRace) return
    if (!loftName.trim()) {
      setError('Loft name is required')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('supabase.auth.token') : null
      const authHeader = token ? `Bearer ${token}` : ''

      const res = await fetch(`/api/group-races/${foundRace.id}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authHeader ? { Authorization: authHeader } : {}),
        },
        body: JSON.stringify({
          loftName: loftName.trim(),
          fancierName: fancierName.trim(),
          loftDistance: Number(loftDistance) || foundRace.distance,
          birdRings: selectedRings,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to join group race')
      }

      setJoinedSuccess(true)
      onSuccess(data.data)
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Error joining race')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="modal-backdrop modal-floating"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10500,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose()
      }}
    >
      <div
        className="modal-container"
        style={{
          width: '100%',
          maxWidth: '460px',
          height: 'auto',
          maxHeight: 'calc(100dvh - 3rem)',
          background: '#0d121d',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '1.25rem',
          boxShadow: '0 28px 64px rgba(0, 0, 0, 0.85)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          margin: 'auto',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '0.85rem 1.15rem',
            background: '#0e1420',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <span
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '0.5rem',
                background: 'rgba(56, 189, 248, 0.15)',
                border: '1px solid rgba(56, 189, 248, 0.35)',
                color: '#38bdf8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <GlobeIcon size={16} />
            </span>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 800, color: '#fff' }}>
                {joinedSuccess ? 'Enrolled in Race!' : 'Join Group Activity Race'}
              </h3>
              <p style={{ margin: '0.1rem 0 0 0', fontSize: '0.68rem', color: '#94a3b8' }}>
                {joinedSuccess ? 'Your birds are officially basketted' : 'Enter 6-character Join Code to basket birds'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              color: '#fff',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '50%',
              width: '28px',
              height: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '1rem 1.15rem', overflowY: 'auto' }}>
          {joinedSuccess ? (
            /* Joined Confirmation */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center', textAlign: 'center' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: 'rgba(74, 222, 128, 0.15)',
                  border: '1px solid rgba(74, 222, 128, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2rem',
                  marginTop: '0.5rem',
                }}
              >
                ✓
              </div>

              <div>
                <h4 style={{ margin: '0 0 0.25rem 0', color: '#fff', fontSize: '1.1rem', fontWeight: 900 }}>
                  Successfully Joined {foundRace?.title}
                </h4>
                <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.78rem' }}>
                  {selectedRings.length} {selectedRings.length === 1 ? 'bird' : 'birds'} basketted from loft "{loftName}"
                </p>
              </div>

              <div
                style={{
                  width: '100%',
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '0.75rem',
                  padding: '0.85rem',
                  textAlign: 'left',
                  fontSize: '0.75rem',
                  color: '#cbd5e1',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.35rem',
                }}
              >
                <div><strong>Race Date:</strong> {foundRace?.date} • Rel: {foundRace?.releaseTime || '06:00'}</div>
                <div><strong>Release Point:</strong> {foundRace?.location}</div>
                <div><strong>Calculated Distance:</strong> {loftDistance || foundRace?.distance} km</div>
                <div><strong>Status:</strong> Ready for live RFID / Clock-in Telemetry</div>
              </div>

              <button
                type="button"
                onClick={onClose}
                style={{
                  width: '100%',
                  padding: '0.6rem',
                  borderRadius: '0.5rem',
                  background: '#f59e0b',
                  border: 'none',
                  color: '#090d16',
                  fontWeight: 800,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                }}
              >
                View in Activities & Flights
              </button>
            </div>
          ) : !foundRace ? (
            /* Step 1: Code Lookup Form */
            <form onSubmit={handleLookup} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {error && (
                <div
                  style={{
                    padding: '0.6rem 0.8rem',
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.35)',
                    borderRadius: '0.5rem',
                    color: '#f87171',
                    fontSize: '0.75rem',
                  }}
                >
                  ⚠️ {error}
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, color: '#94a3b8', marginBottom: '0.4rem' }}>
                  ENTER RACE JOIN CODE
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    placeholder="e.g. FLY-782"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    style={{
                      flex: 1,
                      padding: '0.65rem 0.85rem',
                      borderRadius: '0.6rem',
                      background: 'rgba(15, 23, 42, 0.8)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#FFC107',
                      fontSize: '1.05rem',
                      fontWeight: 900,
                      fontFamily: 'monospace',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                    }}
                    autoFocus
                    required
                  />
                  <button
                    type="submit"
                    disabled={loadingRace}
                    style={{
                      padding: '0 1.25rem',
                      borderRadius: '0.6rem',
                      background: '#38bdf8',
                      color: '#000',
                      border: 'none',
                      fontWeight: 900,
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                    }}
                  >
                    {loadingRace ? 'Finding…' : 'Find Race'}
                  </button>
                </div>
                <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.68rem', color: '#64748b' }}>
                  Ask your club organizer or derby host for their 6-character Join Code.
                </p>
              </div>
            </form>
          ) : (
            /* Step 2: Basket Birds & Enroll Form */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {error && (
                <div
                  style={{
                    padding: '0.6rem 0.8rem',
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.35)',
                    borderRadius: '0.5rem',
                    color: '#f87171',
                    fontSize: '0.75rem',
                  }}
                >
                  ⚠️ {error}
                </div>
              )}

              {/* Race Preview Box */}
              <div
                style={{
                  background: 'rgba(56, 189, 248, 0.08)',
                  border: '1px solid rgba(56, 189, 248, 0.25)',
                  borderRadius: '0.65rem',
                  padding: '0.75rem 0.95rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase' }}>
                    Group Race Found
                  </span>
                  <span style={{ fontSize: '0.65rem', fontFamily: 'monospace', color: '#cbd5e1' }}>
                    Code: {foundRace.joinCode}
                  </span>
                </div>
                <h4 style={{ margin: '0.2rem 0', color: '#fff', fontSize: '0.95rem', fontWeight: 800 }}>
                  {foundRace.title}
                </h4>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontFamily: 'monospace' }}>
                  {foundRace.date} • {foundRace.location} • {foundRace.distance} km
                </div>
              </div>

              {/* Fancier / Loft Inputs */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.6rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 800, color: '#94a3b8', marginBottom: '0.25rem' }}>
                    YOUR LOFT NAME *
                  </label>
                  <input
                    type="text"
                    value={loftName}
                    onChange={(e) => setLoftName(e.target.value)}
                    placeholder="e.g. Blue Sky Loft"
                    style={{
                      width: '100%',
                      padding: '0.45rem 0.65rem',
                      borderRadius: '0.45rem',
                      background: 'rgba(15, 23, 42, 0.8)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#fff',
                      fontSize: '0.78rem',
                    }}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 800, color: '#94a3b8', marginBottom: '0.25rem' }}>
                    LOFT DISTANCE (KM)
                  </label>
                  <input
                    type="number"
                    value={loftDistance}
                    onChange={(e) => setLoftDistance(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="e.g. 520"
                    style={{
                      width: '100%',
                      padding: '0.45rem 0.65rem',
                      borderRadius: '0.45rem',
                      background: 'rgba(15, 23, 42, 0.8)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#fff',
                      fontSize: '0.78rem',
                      fontFamily: 'monospace',
                    }}
                  />
                </div>
              </div>

              {/* Bird Selection Header */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#FFC107', textTransform: 'uppercase' }}>
                    Select Participating Birds ({selectedRings.length} of {loftBirds.length})
                  </span>
                  <div style={{ display: 'flex', gap: '0.35rem' }}>
                    <button
                      type="button"
                      onClick={selectAll}
                      style={{
                        padding: '0.15rem 0.45rem',
                        borderRadius: '4px',
                        background: 'rgba(255, 255, 255, 0.08)',
                        color: '#cbd5e1',
                        border: 'none',
                        fontSize: '0.65rem',
                        cursor: 'pointer',
                        fontWeight: 700,
                      }}
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={clearAll}
                      style={{
                        padding: '0.15rem 0.45rem',
                        borderRadius: '4px',
                        background: 'rgba(255, 255, 255, 0.04)',
                        color: '#94a3b8',
                        border: 'none',
                        fontSize: '0.65rem',
                        cursor: 'pointer',
                      }}
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {/* Bird Pills Container (Unlimited Entries) */}
                <div
                  style={{
                    maxHeight: '180px',
                    overflowY: 'auto',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '0.35rem',
                    background: 'rgba(2, 6, 23, 0.6)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '0.6rem',
                    padding: '0.55rem',
                  }}
                >
                  {loftBirds.length === 0 ? (
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                      No birds found in your loft registry. You can still join and add birds later!
                    </span>
                  ) : (
                    loftBirds.map((bird) => {
                      const ring = bird.ringNo.toUpperCase()
                      const selected = selectedRings.includes(ring)

                      return (
                        <button
                          key={ring}
                          type="button"
                          onClick={() => toggleBird(ring)}
                          style={{
                            padding: '0.3rem 0.55rem',
                            borderRadius: '0.45rem',
                            border: selected ? '1px solid rgba(74, 222, 128, 0.5)' : '1px solid rgba(255, 255, 255, 0.08)',
                            background: selected ? 'rgba(74, 222, 128, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                            color: selected ? '#4ade80' : '#94a3b8',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            fontFamily: 'monospace',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <span>{selected ? '✓' : '+'}</span>
                          <span>{ring}</span>
                          {bird.color && <span style={{ opacity: 0.6, fontSize: '0.62rem' }}>({bird.color})</span>}
                        </button>
                      )
                    })
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.4rem' }}>
                <button
                  type="button"
                  onClick={() => setFoundRace(null)}
                  disabled={submitting}
                  style={{
                    flex: 1,
                    padding: '0.6rem',
                    borderRadius: '0.6rem',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#94a3b8',
                    fontWeight: 700,
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                  }}
                >
                  Change Code
                </button>
                <button
                  type="button"
                  onClick={handleJoin}
                  disabled={submitting}
                  style={{
                    flex: 2,
                    padding: '0.6rem',
                    borderRadius: '0.5rem',
                    background: '#22c55e',
                    border: '1px solid rgba(34, 197, 94, 0.4)',
                    color: '#052e16',
                    fontWeight: 800,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.35rem',
                  }}
                >
                  <TagIcon size={14} />
                  <span>{submitting ? 'Enrolling…' : `Basket & Join (${selectedRings.length} Birds)`}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
