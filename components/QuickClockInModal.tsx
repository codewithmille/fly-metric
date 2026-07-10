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
    (e) => e.extendedProps.club === 'Race' || e.extendedProps.club === 'Training'
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
      const distanceKm = event.extendedProps.distance
      const releaseTime = event.extendedProps.releaseTime || '06:00'
      
      const [rH, rM] = releaseTime.split(':').map(Number)
      const [cH, cM] = clockInTime.split(':').map(Number)
      const releaseMinutes = rH * 60 + rM
      const clockInMinutes = cH * 60 + cM

      if (clockInMinutes <= releaseMinutes) {
        throw new Error('Clock-in time must be after release time (' + releaseTime + ').')
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
        style={{ maxWidth: '480px' }}
      >
        {/* Header */}
        <div className="modal-header" style={{ background: 'linear-gradient(135deg, var(--brand-gold), #FF8F00)' }}>
          <div className="modal-header-left">
            <span className="modal-pigeon-icon" style={{ display: 'flex', alignItems: 'center', color: '#fff' }}>
              <BirdIcon size={24} />
            </span>
            <div>
              <h2 id="quick-title" className="modal-title" style={{ color: '#fff' }}>Quick Clock-in</h2>
              <p className="modal-subtitle" style={{ color: 'rgba(255,255,255,0.75)' }}>Add a bird arrival to a scheduled event</p>
            </div>
          </div>
          <button className="modal-close-btn clockin-close-btn" style={{ color: '#fff', background: 'rgba(255,255,255,0.15)' }} onClick={onClose} aria-label="Close modal">✕</button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {flightEvents.length === 0 ? (
            <div style={{
              padding: '2rem 1.5rem',
              textAlign: 'center',
              background: 'var(--bg-surface)',
              borderRadius: '0.75rem',
              border: '1px dashed var(--border-default)',
              color: 'var(--text-secondary)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem', color: 'var(--text-secondary)' }}>
                <CalendarIcon size={36} />
              </div>
              <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>No Scheduled Events</h3>
              <p style={{ fontSize: '0.78rem' }}>Please add a Race or Training event on the calendar first before clocking in birds.</p>
            </div>
          ) : (
            <>
              {/* Event Select Dropdown */}
              <div className="form-group">
                <label htmlFor="event-select" className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <TrophyIcon size={14} /> Select Scheduled Event
                </label>
                <select
                  id="event-select"
                  className="form-input"
                  value={selectedEventId}
                  onChange={(e) => setSelectedEventId(e.target.value)}
                  style={{
                    background: 'var(--bg-surface)',
                    color: 'var(--text-primary)',
                    cursor: 'pointer'
                  }}
                >
                  {flightEvents.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.extendedProps.club === 'Training' ? 'Toss' : 'Race'} - {e.title} ({new Date(e.date).toLocaleDateString()})
                    </option>
                  ))}
                </select>
              </div>

              {/* Ring Number Select Dropdown */}
              <div className="form-group">
                <label htmlFor="ring-no" className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <TagIcon size={14} /> Select Registered Bird
                </label>
                {registeredBirds.length === 0 ? (
                  <div style={{
                    fontSize: '0.78rem',
                    color: 'var(--brand-gold)',
                    background: 'rgba(255, 193, 7, 0.05)',
                    border: '1px solid rgba(255, 193, 7, 0.2)',
                    borderRadius: '0.5rem',
                    padding: '0.6rem 0.8rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.2rem'
                  }}>
                    <span>No registered birds found.</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Please register birds in the Loft Registry first.</span>
                  </div>
                ) : (
                  <select
                    id="ring-no"
                    className="form-input"
                    value={ringNo}
                    onChange={(e) => setRingNo(e.target.value)}
                    style={{
                      background: 'var(--bg-surface)',
                      color: 'var(--text-primary)',
                      cursor: 'pointer'
                    }}
                  >
                    {registeredBirds.map((b) => (
                      <option key={b.id} value={b.ringNo}>
                        {b.ringNo} ({b.color})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Arrival Time */}
              <div className="form-group">
                <label htmlFor="arrival-time" className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <TimerIcon size={14} /> Arrival Clock-in Time
                </label>
                <input
                  id="arrival-time"
                  type="time"
                  className="form-input"
                  value={clockInTime}
                  onChange={(e) => setClockInTime(e.target.value)}
                />
              </div>

              {/* Errors */}
              {error && <div className="form-error">{error}</div>}

              {/* Success */}
              {success && (
                <div style={{
                  background: 'rgba(63, 185, 80, 0.1)',
                  border: '1px solid rgba(63, 185, 80, 0.3)',
                  borderRadius: '0.5rem',
                  padding: '0.75rem',
                  color: 'var(--color-success)',
                  textAlign: 'center',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  marginTop: '0.5rem'
                }}>
                  Bird Clocked In Successfully!
                </div>
              )}

              {/* Actions */}
              <div className="modal-actions" style={{ marginTop: '1rem' }}>
                <button className="btn-secondary" onClick={onClose}>Cancel</button>
                <button
                  className="btn-primary"
                  onClick={handleClockIn}
                  disabled={saving || success}
                  style={{
                    background: success ? 'var(--color-success)' : 'var(--brand-gold)',
                    color: '#fff',
                    opacity: saving ? 0.7 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem'
                  }}
                >
                  {saving ? (
                    <>
                      <div className="loading-spinner" style={{ width: '1rem', height: '1rem', borderWidth: '2px' }} />
                      Clocking...
                    </>
                  ) : success ? (
                    'Clocked!'
                  ) : (
                    <>
                      <PlusIcon size={16} /> Clock-in Bird
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
