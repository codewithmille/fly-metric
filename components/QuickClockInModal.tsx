'use client'

import { useState, useEffect, useRef } from 'react'
import type { RaceEvent } from '@/app/api/race-events/route'
import { BirdIcon, TrophyIcon, TagIcon, TimerIcon, PlusIcon, CalendarIcon } from '@/components/icons'
import { saveEvent } from '@/lib/apiClient'

interface LoftBird {
  id: string
  ringNo: string
  color: string
  name: string | null
  gender: string | null
  birthdate?: string | null
  strain?: string | null
  status?: string | null
  notes?: string | null
  sire?: string | null
  dam?: string | null
}

interface QuickClockInModalProps {
  isOpen: boolean
  events: RaceEvent[]
  registeredBirds: LoftBird[]
  onClose: () => void
  onClockInSaved: () => void
  authToken?: string
}

interface BirdRecord {
  ringNo: string
  clockInTime: string
  speed: number
}

export default function QuickClockInModal({
  isOpen,
  events,
  registeredBirds,
  onClose,
  onClockInSaved,
  authToken,
}: QuickClockInModalProps) {
  const [selectedEventId, setSelectedEventId] = useState('')
  const [ringNo, setRingNo] = useState('')
  const [clockInTime, setClockInTime] = useState('')
  
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)

  const modalRef = useRef<HTMLDivElement>(null)

  // Filter available races and trainings
  const flightEvents = events.filter(
    (e) => e.extendedProps?.club === 'Race' || e.extendedProps?.club === 'Training'
  )

  // Default selection to first event, and time to current local time
  useEffect(() => {
    if (isOpen) {
      if (flightEvents.length > 0) {
        setSelectedEventId(flightEvents[0].id)
      } else {
        setSelectedEventId('')
      }
      
      // Default selection to first registered bird
      if (registeredBirds.length > 0) {
        setRingNo(registeredBirds[0].ringNo)
      } else {
        setRingNo('')
      }
      
      // Set default time to current local time
      const now = new Date()
      const hrs = String(now.getHours()).padStart(2, '0')
      const mins = String(now.getMinutes()).padStart(2, '0')
      setClockInTime(`${hrs}:${mins}`)
      
      setError('')
      setSuccess(false)
      modalRef.current?.focus()
    }
  }, [isOpen, registeredBirds])

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  if (!isOpen) return null

  const selectedEvent = flightEvents.find((e) => e.id === selectedEventId)
  const selectedBird = registeredBirds.find((b) => b.ringNo.toUpperCase() === ringNo.trim().toUpperCase())

  // Parse existing clocked birds for selected event
  const clockedBirds: BirdRecord[] = (() => {
    if (!selectedEvent) return []
    try {
      const list = JSON.parse(selectedEvent.extendedProps?.birds || '[]')
      return Array.isArray(list) ? [...list].sort((a, b) => b.speed - a.speed) : []
    } catch {
      return []
    }
  })()

  // Real-time speed projection calculation
  const speedProjection = (() => {
    if (!selectedEvent || !clockInTime) return null
    const distanceKm = Number(selectedEvent.extendedProps?.distance) || 0
    const releaseTime = selectedEvent.extendedProps?.releaseTime || '06:00'
    const [rH, rM] = releaseTime.split(':').map(Number)
    const [cH, cM] = clockInTime.split(':').map(Number)
    if (isNaN(rH) || isNaN(rM) || isNaN(cH) || isNaN(cM)) return null

    const releaseMinutes = rH * 60 + rM
    const clockInMinutes = cH * 60 + cM
    const flyingMinutes = clockInMinutes - releaseMinutes

    if (flyingMinutes <= 0 || distanceKm <= 0) return null

    const distanceMeters = distanceKm * 1000
    const speed = Math.round(distanceMeters / flyingMinutes)
    const hrs = Math.floor(flyingMinutes / 60)
    const mins = flyingMinutes % 60
    const durationStr = hrs > 0 ? `${hrs}h ${mins}m` : `${mins} mins`

    return {
      flyingMinutes,
      durationStr,
      speed,
      distanceKm,
      releaseTime,
    }
  })()

  const setTimeToNow = () => {
    const now = new Date()
    const hrs = String(now.getHours()).padStart(2, '0')
    const mins = String(now.getMinutes()).padStart(2, '0')
    setClockInTime(`${hrs}:${mins}`)
  }

  const adjustTimeMinutes = (delta: number) => {
    const [h, m] = (clockInTime || '06:00').split(':').map(Number)
    if (isNaN(h) || isNaN(m)) return
    const total = (h * 60 + m + delta + 1440) % 1440
    const newH = String(Math.floor(total / 60)).padStart(2, '0')
    const newM = String(total % 60).padStart(2, '0')
    setClockInTime(`${newH}:${newM}`)
  }

  const handleClockIn = async () => {
    setError('')
    setSuccess(false)

    if (!selectedEventId) {
      setError('Please select a race or training event first.')
      return
    }

    if (!ringNo.trim()) {
      setError('Please enter a bird Ring Number.')
      return
    }

    if (!clockInTime) {
      setError('Please select a clock-in arrival time.')
      return
    }

    const event = events.find((e) => e.id === selectedEventId)
    if (!event) {
      setError('Selected event not found.')
      return
    }

    setSaving(true)

    try {
      // Calculate speed
      const distanceKm = event.extendedProps.distance || 0
      const releaseTime = event.extendedProps.releaseTime || '06:00'
      
      const [rH, rM] = releaseTime.split(':').map(Number)
      const [cH, cM] = clockInTime.split(':').map(Number)
      const releaseMinutes = rH * 60 + rM
      const clockInMinutes = cH * 60 + cM

      if (clockInMinutes <= releaseMinutes) {
        throw new Error(`Clock-in time must be after release time (${releaseTime}).`)
      }

      const flyingTotalMins = clockInMinutes - releaseMinutes
      const distanceMeters = distanceKm * 1000
      const calculatedSpeed = Math.round(distanceMeters / flyingTotalMins)

      // Read existing clocked birds
      let birdsList: BirdRecord[] = []
      try {
        birdsList = JSON.parse(event.extendedProps.birds || '[]')
      } catch (e) {
        birdsList = []
      }

      // Check if ring number is already clocked
      if (birdsList.some((b) => b.ringNo.toUpperCase() === ringNo.trim().toUpperCase())) {
        throw new Error(`Bird with Ring No. "${ringNo.trim().toUpperCase()}" is already clocked in for this event.`)
      }

      // Append new bird
      const newBird: BirdRecord = {
        ringNo: ringNo.trim().toUpperCase(),
        clockInTime,
        speed: calculatedSpeed,
      }
      birdsList.push(newBird)

      // Recalculate stats
      const totalBirds = birdsList.length
      const speeds = birdsList.map((b) => b.speed)
      const maxSpeed = Math.max(...speeds)
      const avgSpeed = Math.round(speeds.reduce((sum, s) => sum + s, 0) / totalBirds)
      
      // Find winner ring number (fastest speed)
      const fastestBird = birdsList.reduce((fastest, current) => 
        current.speed > fastest.speed ? current : fastest
      , birdsList[0])
      
      const winnerRing = event.extendedProps.club === 'Training' ? 'N/A' : fastestBird.ringNo

      // Update the event in local database (syncs to Supabase when online)
      const res = await saveEvent(authToken, {
        id: event.id,
        title: event.title,
        date: event.date,
        totalBirds,
        maxSpeed,
        avgSpeed,
        location: event.extendedProps.location,
        club: event.extendedProps.club,
        distance: distanceKm,
        winner: winnerRing,
        releaseTime,
        clockInTime, // Set latest clocked bird arrival time
        birds: JSON.stringify(birdsList),
      }, true)

      if (!res.success) {
        throw new Error('Failed to clock in bird')
      }

      setSuccess(true)
      onClockInSaved()

      setTimeout(() => {
        setSuccess(false)
        onClose()
      }, 1000)

    } catch (err: any) {
      setError(err.message || 'An error occurred during clock-in.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div
        className="modal-container"
        ref={modalRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-title"
        style={{
          maxWidth: '520px',
          background: '#0d121d',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: '0 32px 72px rgba(0, 0, 0, 0.75)',
        }}
      >
        {/* ── Modern Telemetry Header ── */}
        <div
          className="modal-header"
          style={{
            background: 'linear-gradient(135deg, #111827 0%, #1f293d 100%)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '1.15rem 1.35rem',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Subtle gold glow */}
          <div
            style={{
              position: 'absolute',
              top: '-20px',
              right: '20px',
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255, 193, 7, 0.25) 0%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />

          <div className="modal-header-left" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', zIndex: 1 }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '0.75rem',
                background: 'rgba(255, 193, 7, 0.12)',
                border: '1px solid rgba(255, 193, 7, 0.35)',
                boxShadow: '0 4px 14px rgba(255, 193, 7, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <img src="/icon.png" alt="Clock-in" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <h2 id="quick-title" className="modal-title" style={{ color: '#fff', fontSize: '1.12rem', fontWeight: 900 }}>
                  Quick Clock-in
                </h2>
                {selectedEvent && (
                  <span
                    style={{
                      fontSize: '0.65rem',
                      fontWeight: 800,
                      padding: '0.12rem 0.5rem',
                      borderRadius: '9999px',
                      background: selectedEvent.extendedProps?.club === 'Training' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 193, 7, 0.15)',
                      border: selectedEvent.extendedProps?.club === 'Training' ? '1px solid rgba(56, 189, 248, 0.35)' : '1px solid rgba(255, 193, 7, 0.35)',
                      color: selectedEvent.extendedProps?.club === 'Training' ? '#38bdf8' : '#FFC107',
                    }}
                  >
                    {selectedEvent.extendedProps?.club === 'Training' ? 'Toss' : 'Race'}
                  </span>
                )}
              </div>
              <p className="modal-subtitle" style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.74rem', marginTop: '0.1rem' }}>
                Live Arrival Clocking & Velocity Telemetry
              </p>
            </div>
          </div>

          <button
            className="modal-close-btn clockin-close-btn"
            style={{
              color: '#fff',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.15)',
              zIndex: 2,
            }}
            onClick={onClose}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* ── Modal Body ── */}
        <div className="modal-body" style={{ padding: '1.25rem 1.35rem', gap: '1rem', overflowY: 'auto' }}>
          {flightEvents.length === 0 ? (
            <div
              style={{
                padding: '2.5rem 1.5rem',
                textAlign: 'center',
                background: 'rgba(22, 27, 38, 0.75)',
                borderRadius: '0.85rem',
                border: '1px dashed rgba(255, 255, 255, 0.12)',
                color: 'var(--text-secondary)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem', color: '#FFC107' }}>
                <CalendarIcon size={38} />
              </div>
              <h3 style={{ fontSize: '0.98rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                No Scheduled Flight Events
              </h3>
              <p style={{ fontSize: '0.78rem', maxWidth: '320px', margin: '0 auto' }}>
                Please create a Race or Training event on your calendar first before recording pigeon arrival clock-ins.
              </p>
            </div>
          ) : (
            <>
              {/* Event Select Dropdown */}
              <div className="form-group">
                <label htmlFor="event-select" className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 700, fontSize: '0.78rem', color: '#cbd5e1' }}>
                  <TrophyIcon size={14} /> Select Scheduled Flight Event
                </label>
                <select
                  id="event-select"
                  className="form-input"
                  value={selectedEventId}
                  onChange={(e) => setSelectedEventId(e.target.value)}
                  style={{
                    background: 'rgba(15, 23, 42, 0.85)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '0.65rem',
                    color: '#fff',
                    padding: '0.6rem 0.85rem',
                    fontSize: '0.84rem',
                    cursor: 'pointer',
                  }}
                >
                  {flightEvents.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.extendedProps?.club === 'Training' ? 'Toss' : 'Race'}: {e.title} ({new Date(e.date).toLocaleDateString()}) · {e.extendedProps?.distance || 0} km
                    </option>
                  ))}
                </select>

                {/* Event Station Quick Info Pill */}
                {selectedEvent && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.6rem',
                      flexWrap: 'wrap',
                      fontSize: '0.7rem',
                      color: 'rgba(255,255,255,0.6)',
                      background: 'rgba(255,255,255,0.03)',
                      padding: '0.35rem 0.65rem',
                      borderRadius: '0.5rem',
                      border: '1px solid rgba(255,255,255,0.06)',
                      marginTop: '0.35rem',
                    }}
                  >
                    <span>📍 {selectedEvent.extendedProps?.location || 'Release Station'}</span>
                    <span>•</span>
                    <span style={{ color: '#FFC107', fontWeight: 700 }}>📏 {selectedEvent.extendedProps?.distance || 0} km</span>
                    <span>•</span>
                    <span style={{ color: '#38bdf8' }}>⏱️ Release: {selectedEvent.extendedProps?.releaseTime || '06:00'}</span>
                  </div>
                )}
              </div>

              {/* Ring Number Select Dropdown */}
              <div className="form-group">
                <label htmlFor="ring-no" className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 700, fontSize: '0.78rem', color: '#cbd5e1' }}>
                  <TagIcon size={14} /> Select Registered Bird
                </label>
                {registeredBirds.length === 0 ? (
                  <div
                    style={{
                      fontSize: '0.78rem',
                      color: 'var(--brand-gold)',
                      background: 'rgba(255, 193, 7, 0.08)',
                      border: '1px solid rgba(255, 193, 7, 0.25)',
                      borderRadius: '0.65rem',
                      padding: '0.75rem 0.9rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.25rem',
                    }}
                  >
                    <span style={{ fontWeight: 700 }}>No registered birds found in your loft.</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                      Please add birds to your Loft Registry before clocking in arrivals.
                    </span>
                  </div>
                ) : (
                  <>
                    <select
                      id="ring-no"
                      className="form-input"
                      value={ringNo}
                      onChange={(e) => setRingNo(e.target.value)}
                      style={{
                        background: 'rgba(15, 23, 42, 0.85)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        borderRadius: '0.65rem',
                        color: '#fff',
                        padding: '0.6rem 0.85rem',
                        fontSize: '0.84rem',
                        cursor: 'pointer',
                      }}
                    >
                      {registeredBirds.map((b) => (
                        <option key={b.id} value={b.ringNo}>
                          {b.ringNo} {b.name ? `(${b.name})` : ''} · {b.color} · {b.gender || 'Racer'}
                        </option>
                      ))}
                    </select>

                    {/* Selected Bird Card */}
                    {selectedBird && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          background: 'rgba(22, 27, 38, 0.85)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: '0.65rem',
                          padding: '0.5rem 0.75rem',
                          marginTop: '0.35rem',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <div
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '6px',
                              background: 'rgba(255, 193, 7, 0.1)',
                              border: '1px solid rgba(255, 193, 7, 0.25)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <img src="/icon.png" alt="" style={{ width: '18px', height: '18px', objectFit: 'contain' }} />
                          </div>
                          <div>
                            <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--brand-gold)', fontFamily: 'monospace' }}>
                              {selectedBird.ringNo}
                            </div>
                            <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                              {selectedBird.name ? `${selectedBird.name} • ` : ''}{selectedBird.color}
                            </div>
                          </div>
                        </div>

                        <span
                          style={{
                            fontSize: '0.65rem',
                            fontWeight: 800,
                            padding: '0.15rem 0.5rem',
                            borderRadius: '9999px',
                            background: selectedBird.gender === 'Hen' ? 'rgba(236, 72, 153, 0.15)' : 'rgba(56, 189, 248, 0.15)',
                            border: selectedBird.gender === 'Hen' ? '1px solid rgba(236, 72, 153, 0.35)' : '1px solid rgba(56, 189, 248, 0.35)',
                            color: selectedBird.gender === 'Hen' ? '#f472b6' : '#38bdf8',
                          }}
                        >
                          {selectedBird.gender || 'Racer'}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Arrival Time + Quick Time Buttons */}
              <div className="form-group">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <label htmlFor="arrival-time" className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 700, fontSize: '0.78rem', color: '#cbd5e1', margin: 0 }}>
                    <TimerIcon size={14} /> Arrival Clock-in Time
                  </label>
                  {/* Quick Time Helpers */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <button
                      type="button"
                      onClick={setTimeToNow}
                      style={{
                        padding: '0.15rem 0.45rem',
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        borderRadius: '0.35rem',
                        background: 'rgba(255, 193, 7, 0.12)',
                        border: '1px solid rgba(255, 193, 7, 0.3)',
                        color: 'var(--brand-gold)',
                        cursor: 'pointer',
                      }}
                      title="Set to Current Clock Time"
                    >
                      🕒 Now
                    </button>
                    <button
                      type="button"
                      onClick={() => adjustTimeMinutes(-1)}
                      style={{
                        padding: '0.15rem 0.4rem',
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        borderRadius: '0.35rem',
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        color: '#cbd5e1',
                        cursor: 'pointer',
                      }}
                      title="Minus 1 minute"
                    >
                      -1m
                    </button>
                    <button
                      type="button"
                      onClick={() => adjustTimeMinutes(1)}
                      style={{
                        padding: '0.15rem 0.4rem',
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        borderRadius: '0.35rem',
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        color: '#cbd5e1',
                        cursor: 'pointer',
                      }}
                      title="Plus 1 minute"
                    >
                      +1m
                    </button>
                  </div>
                </div>

                <input
                  id="arrival-time"
                  type="time"
                  className="form-input"
                  value={clockInTime}
                  onChange={(e) => setClockInTime(e.target.value)}
                  style={{
                    background: 'rgba(15, 23, 42, 0.85)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '0.65rem',
                    color: '#fff',
                    padding: '0.6rem 0.85rem',
                    fontSize: '0.9rem',
                    fontFamily: 'monospace',
                  }}
                />
              </div>

              {/* ── Live Velocity Telemetry Box ── */}
              {speedProjection ? (
                <div
                  style={{
                    background: 'linear-gradient(135deg, rgba(22, 27, 38, 0.95) 0%, rgba(13, 18, 29, 0.95) 100%)',
                    border: '1px solid rgba(255, 193, 7, 0.3)',
                    borderRadius: '0.85rem',
                    padding: '0.85rem 1rem',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.45rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }} />
                      <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#e2e8f0', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Live Velocity Telemetry
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: '0.65rem',
                        fontWeight: 800,
                        padding: '0.1rem 0.45rem',
                        borderRadius: '9999px',
                        background: 'rgba(16, 185, 129, 0.15)',
                        border: '1px solid rgba(16, 185, 129, 0.35)',
                        color: '#34d399',
                      }}
                    >
                      Duration: {speedProjection.durationStr}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: '0.15rem' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.45rem' }}>
                      <span className="font-mono text-2xl font-black text-amber-400 tracking-tight" style={{ color: 'var(--brand-gold)' }}>
                        +{speedProjection.speed.toLocaleString()}
                      </span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>
                        m/min
                      </span>
                    </div>

                    <div style={{ textAlign: 'right', fontSize: '0.72rem', color: '#94a3b8' }}>
                      <span>From {speedProjection.releaseTime}</span> → <span style={{ color: '#fff', fontWeight: 700 }}>{clockInTime}</span>
                    </div>
                  </div>

                  {clockedBirds.length > 0 && speedProjection.speed > (clockedBirds[0]?.speed || 0) && (
                    <div
                      style={{
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        color: '#34d399',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        paddingTop: '0.35rem',
                        borderTop: '1px solid rgba(255,255,255,0.06)',
                      }}
                    >
                      <span>🚀</span>
                      <span>This speed will claim the <strong>#1 Leaderboard Rank</strong> for this event!</span>
                    </div>
                  )}
                </div>
              ) : selectedEvent && clockInTime ? (
                <div
                  style={{
                    background: 'rgba(239, 68, 68, 0.08)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    borderRadius: '0.65rem',
                    padding: '0.6rem 0.85rem',
                    fontSize: '0.72rem',
                    color: '#f87171',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                  }}
                >
                  <span>⚠️</span>
                  <span>Arrival time must be after the release time ({selectedEvent.extendedProps?.releaseTime || '06:00'}).</span>
                </div>
              ) : null}

              {/* Errors */}
              {error && <div className="form-error" style={{ fontSize: '0.78rem' }}>{error}</div>}

              {/* Success */}
              {success && (
                <div
                  style={{
                    background: 'rgba(16, 185, 129, 0.12)',
                    border: '1px solid rgba(16, 185, 129, 0.35)',
                    borderRadius: '0.65rem',
                    padding: '0.75rem',
                    color: '#34d399',
                    textAlign: 'center',
                    fontSize: '0.85rem',
                    fontWeight: 800,
                  }}
                >
                  ✓ Bird Clocked In Successfully!
                </div>
              )}

              {/* Actions */}
              <div className="modal-actions" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.65rem', marginTop: '0.25rem' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={onClose}
                  style={{
                    borderRadius: '0.65rem',
                    padding: '0.65rem 1rem',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleClockIn}
                  disabled={saving || success}
                  style={{
                    background: success
                      ? 'linear-gradient(135deg, #10b981, #059669)'
                      : 'linear-gradient(135deg, #FFC107, #FF8F00)',
                    color: '#000',
                    fontWeight: 900,
                    borderRadius: '0.65rem',
                    padding: '0.65rem 1rem',
                    fontSize: '0.85rem',
                    opacity: saving ? 0.75 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.45rem',
                    boxShadow: '0 4px 16px rgba(255, 193, 7, 0.25)',
                    cursor: saving ? 'not-allowed' : 'pointer',
                  }}
                >
                  {saving ? (
                    <>
                      <div className="loading-spinner" style={{ width: '1rem', height: '1rem', borderWidth: '2px' }} />
                      Recording Speed...
                    </>
                  ) : success ? (
                    '✓ Clocked In!'
                  ) : (
                    <>
                      <PlusIcon size={16} /> Record Arrival
                    </>
                  )}
                </button>
              </div>

              {/* ── Event Arrivals & Leaderboard ── */}
              <div
                style={{
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                  paddingTop: '0.9rem',
                  marginTop: '0.35rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <span style={{ fontSize: '0.8rem' }}>🏆</span>
                    <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#e2e8f0' }}>
                      Event Arrivals ({clockedBirds.length})
                    </span>
                  </div>
                  <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                    Unit: m/min
                  </span>
                </div>

                {clockedBirds.length === 0 ? (
                  <div
                    style={{
                      padding: '1.25rem 1rem',
                      textAlign: 'center',
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px dashed rgba(255, 255, 255, 0.08)',
                      borderRadius: '0.65rem',
                      color: '#94a3b8',
                      fontSize: '0.72rem',
                    }}
                  >
                    No birds clocked in yet for this event. Clock in your first arrival above!
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', maxHeight: '180px', overflowY: 'auto' }}>
                    {clockedBirds.map((b, idx) => {
                      const birdInfo = registeredBirds.find((r) => r.ringNo.toUpperCase() === b.ringNo.toUpperCase())
                      const isTop = idx === 0
                      return (
                        <div
                          key={b.ringNo}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: isTop ? 'rgba(255, 193, 7, 0.07)' : 'rgba(22, 27, 38, 0.75)',
                            border: isTop ? '1px solid rgba(255, 193, 7, 0.3)' : '1px solid rgba(255, 255, 255, 0.06)',
                            borderRadius: '0.55rem',
                            padding: '0.45rem 0.65rem',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', minWidth: 0 }}>
                            <span
                              style={{
                                width: '20px',
                                height: '20px',
                                borderRadius: '50%',
                                background: idx === 0 ? '#FFC107' : idx === 1 ? '#94a3b8' : idx === 2 ? '#b45309' : 'rgba(255,255,255,0.1)',
                                color: idx === 0 ? '#000' : '#fff',
                                fontSize: '0.65rem',
                                fontWeight: 900,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                              }}
                            >
                              {idx + 1}
                            </span>
                            <div className="min-w-0">
                              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#fff', fontFamily: 'monospace' }}>
                                {b.ringNo} {birdInfo?.name ? <span style={{ fontWeight: 500, color: '#cbd5e1' }}>({birdInfo.name})</span> : ''}
                              </div>
                              <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
                                Clocked: {b.clockInTime} {birdInfo?.color ? `• ${birdInfo.color}` : ''}
                              </div>
                            </div>
                          </div>

                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{ fontSize: '0.78rem', fontWeight: 900, color: isTop ? '#FFC107' : '#38bdf8', fontFamily: 'monospace' }}>
                              +{b.speed.toLocaleString()}
                            </div>
                            <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.45)' }}>m/min</div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
