'use client'

import { useState, useEffect, useRef } from 'react'
import type { RaceEvent } from '@/app/api/race-events/route'
import { BirdIcon, TrophyIcon, TagIcon, TimerIcon, PlusIcon, CalendarIcon } from '@/components/icons'
import { saveEvent } from '@/lib/apiClient'
import { useRfidScanner } from '@/hooks/useRfidScanner'

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
  rfidTag?: string | null
}

interface QuickClockInModalProps {
  isOpen: boolean
  events: RaceEvent[]
  registeredBirds: LoftBird[]
  onClose: () => void
  onClockInSaved: () => void
  authToken?: string
  initialEventId?: string | null
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
  initialEventId,
}: QuickClockInModalProps) {
  const [selectedEventId, setSelectedEventId] = useState('')
  const [ringNo, setRingNo] = useState('')
  const [clockInTime, setClockInTime] = useState('')
  const [activeTab, setActiveTab] = useState<'arrivals' | 'clockin'>('arrivals')
  
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [autoSubmitOnScan, setAutoSubmitOnScan] = useState(true)
  const [rfidFlash, setRfidFlash] = useState<{ status: 'success' | 'warning'; message: string } | null>(null)

  const modalRef = useRef<HTMLDivElement>(null)

  // Filter available races and trainings, sorted latest / newest race first!
  const flightEvents = events
    .filter((e) => e.extendedProps?.club === 'Race' || e.extendedProps?.club === 'Training')
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  // Default selection to target/latest event, and time to current local time
  useEffect(() => {
    if (isOpen) {
      if (flightEvents.length > 0) {
        // Priority 1: initialEventId if passed
        // Priority 2: Stored active RFID event from localStorage
        // Priority 3: Event marked isRfidActive === true
        // Priority 4: Event scheduled for today
        // Priority 5: Latest race (flightEvents[0])
        const storedActiveId = typeof window !== 'undefined' ? localStorage.getItem('flymetric_active_rfid_event_id') : null
        const todayStr = new Date().toISOString().split('T')[0]

        const target =
          (initialEventId && flightEvents.find(e => e.id === initialEventId)) ||
          (storedActiveId && flightEvents.find(e => e.id === storedActiveId)) ||
          flightEvents.find(e => e.extendedProps?.isRfidActive === true) ||
          flightEvents.find(e => e.date === todayStr || (e.date && e.date.startsWith(todayStr))) ||
          flightEvents[0]

        setSelectedEventId(target.id)

        // Find existing clocked birds for this target
        let alreadyClockedRings: string[] = []
        try {
          const list = JSON.parse(target.extendedProps?.birds || '[]')
          if (Array.isArray(list)) alreadyClockedRings = list.map((b: any) => b.ringNo.toUpperCase())
        } catch {}

        let participatingRings: string[] = []
        try {
          const parts = JSON.parse(target.extendedProps?.participatingBirds || '[]')
          if (Array.isArray(parts)) participatingRings = parts.map((r: string) => r.toUpperCase())
        } catch {}

        // Pick default bird that is NOT YET clocked and is participating if filter exists
        const availableBird =
          registeredBirds.find((b) => {
            const isClocked = alreadyClockedRings.includes(b.ringNo.toUpperCase())
            const isKasali = participatingRings.length === 0 || participatingRings.includes(b.ringNo.toUpperCase())
            return !isClocked && isKasali
          }) ||
          registeredBirds.find((b) => !alreadyClockedRings.includes(b.ringNo.toUpperCase())) ||
          registeredBirds[0]

        if (availableBird) {
          setRingNo(availableBird.ringNo)
        } else {
          setRingNo('')
        }

        setActiveTab(alreadyClockedRings.length > 0 ? 'arrivals' : 'clockin')
      } else {
        setSelectedEventId('')
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
  }, [isOpen, registeredBirds, initialEventId])

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const handleClockIn = async (overrideRing?: string, overrideTime?: string, overrideEventId?: string) => {
    const finalEventId = overrideEventId || selectedEventId
    const finalRing = (overrideRing || ringNo).trim()
    const finalTime = overrideTime || clockInTime

    setError('')
    setSuccess(false)

    if (!finalEventId) {
      setError('Please select a race or training event first.')
      return
    }

    if (!finalRing) {
      setError('Please enter a bird Ring Number.')
      return
    }

    if (!finalTime) {
      setError('Please select a clock-in arrival time.')
      return
    }

    const event = events.find((e) => e.id === finalEventId)
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
      const [cH, cM] = finalTime.split(':').map(Number)
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
      const existing = birdsList.find((b) => b.ringNo.toUpperCase() === finalRing.toUpperCase())
      if (existing) {
        throw new Error(`ℹ️ Ang ibon na "${finalRing.toUpperCase()}" ay naka-clock na kaninang ${existing.clockInTime} (+${existing.speed.toLocaleString()} m/min). Hindi na kailangan i-record ulit.`)
      }

      // Append new bird
      const newBird: BirdRecord = {
        ringNo: finalRing.toUpperCase(),
        clockInTime: finalTime,
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
        clockInTime: finalTime,
        birds: JSON.stringify(birdsList),
      }, true)

      if (!res.success) {
        throw new Error('Failed to clock in bird')
      }

      // If this is an active group activity race, sync arrival to master group leaderboard
      if (event.extendedProps?.isGroupRace) {
        fetch(`/api/group-races/${event.id}/clock`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          },
          body: JSON.stringify({
            ringNo: finalRing.toUpperCase(),
            clockInTime: finalTime,
            speed: calculatedSpeed,
            loftName: 'My Loft',
            method: 'Quick Clock-In',
          }),
        }).catch((syncErr) => console.error('Group race live clock sync notice:', syncErr))
      }

      setSuccess(true)
      onClockInSaved()
      setActiveTab('arrivals')

      setTimeout(() => {
        setSuccess(false)
      }, 3000)

    } catch (err: any) {
      setError(err.message || 'An error occurred during clock-in.')
    } finally {
      setSaving(false)
    }
  }

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

  const alreadyClockedRecord = clockedBirds.find(
    (b) => b.ringNo.toUpperCase() === ringNo.trim().toUpperCase()
  )

  // Handle incoming RFID Proximity scans from 125kHz USB Reader
  useRfidScanner({
    enabled: isOpen && flightEvents.length > 0,
    onScan: (scannedTag) => {
      const now = new Date()
      const hrs = String(now.getHours()).padStart(2, '0')
      const mins = String(now.getMinutes()).padStart(2, '0')
      const timeNow = `${hrs}:${mins}`

      const matched = registeredBirds.find((b) => 
        (b.rfidTag && b.rfidTag.toLowerCase() === scannedTag.toLowerCase()) ||
        b.ringNo.toLowerCase() === scannedTag.toLowerCase()
      )

      if (matched) {
        setRingNo(matched.ringNo)
        setClockInTime(timeNow)

        // 1. Participation Check (Kasali sa Laro)
        let enteredRings: string[] = []
        if (selectedEvent?.extendedProps?.participatingBirds) {
          try {
            enteredRings = JSON.parse(selectedEvent.extendedProps.participatingBirds)
          } catch {}
        }
        if (enteredRings.length > 0 && !enteredRings.includes(matched.ringNo.toUpperCase())) {
          setRfidFlash({
            status: 'warning',
            message: `⚠️ HINDI KASALI SA LARO: Si ${matched.ringNo} (${matched.name || matched.color}) ay hindi naka-entry sa "${selectedEvent?.title}".`
          })
          setTimeout(() => setRfidFlash(null), 6000)
          return
        }

        // 2. Already Clocked Check
        const already = clockedBirds.find(b => b.ringNo.toUpperCase() === matched.ringNo.toUpperCase())
        if (already) {
          setRfidFlash({
            status: 'warning',
            message: `ℹ️ NAKA-CLOCK NA: Si ${matched.ringNo} (${matched.name || matched.color}) ay naitala na kaninang ${already.clockInTime} (+${already.speed.toLocaleString()} m/min)! Hindi na ito i-du-duplicate.`
          })
          setTimeout(() => setRfidFlash(null), 6000)
          return
        }

        // 3. Valid new arrival
        setRfidFlash({
          status: 'success',
          message: `📡 RFID Scanned: ${matched.ringNo} (${matched.name || matched.color}) at ${timeNow}`
        })
        setTimeout(() => setRfidFlash(null), 4000)

        if (autoSubmitOnScan && selectedEventId) {
          handleClockIn(matched.ringNo, timeNow, selectedEventId)
        }
      } else {
        setRfidFlash({
          status: 'warning',
          message: `⚠️ Unrecognized RFID "${scannedTag}". Pair this blue ring in Bird Registry first.`
        })
        setTimeout(() => setRfidFlash(null), 5000)
      }
    }
  })

  if (!isOpen) return null

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
    const kph = (speed * 0.06).toFixed(1)
    const hrs = Math.floor(flyingMinutes / 60)
    const mins = flyingMinutes % 60
    const durationStr = hrs > 0 ? `${hrs}h ${mins}m` : `${mins} mins`

    return {
      flyingMinutes,
      durationStr,
      speed,
      kph,
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

  const getBirdFlightDuration = (clockTime: string, releaseTime?: string) => {
    if (!releaseTime || !clockTime) return ''
    const [rH = 0, rM = 0] = releaseTime.split(':').map(Number)
    const [cH = 0, cM = 0] = clockTime.split(':').map(Number)
    let totalMins = (cH * 60 + cM) - (rH * 60 + rM)
    if (totalMins < 0) totalMins += 24 * 60
    const h = Math.floor(totalMins / 60)
    const m = totalMins % 60
    return h > 0 ? `${h}h ${m}m` : `${m}m`
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
          maxWidth: '500px',
          width: '100%',
          maxHeight: '92dvh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          borderRadius: '1.25rem',
          background: '#0d121d',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: '0 32px 72px rgba(0, 0, 0, 0.75)',
          boxSizing: 'border-box',
          position: 'relative',
        }}
      >
        {/* ── Modern Telemetry Header ── */}
        <div
          className="modal-header"
          style={{
            background: 'linear-gradient(135deg, #111827 0%, #1f293d 100%)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '0.8rem 1.15rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
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
              width: '100px',
              height: '100px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255, 193, 7, 0.25) 0%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />

          <div className="modal-header-left" style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', zIndex: 1, minWidth: 0, flex: 1 }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '0.65rem',
                background: 'rgba(255, 193, 7, 0.12)',
                border: '1px solid rgba(255, 193, 7, 0.35)',
                boxShadow: '0 4px 14px rgba(255, 193, 7, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <img src="/icon.png" alt="Clock-in" style={{ width: '22px', height: '22px', objectFit: 'contain' }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <h2 id="quick-title" className="modal-title" style={{ color: '#fff', fontSize: '1.05rem', fontWeight: 900, margin: 0, whiteSpace: 'nowrap' }}>
                  Quick Clock-in
                </h2>
                {selectedEvent && (
                  <span
                    style={{
                      fontSize: '0.62rem',
                      fontWeight: 800,
                      padding: '0.1rem 0.45rem',
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
              <p className="modal-subtitle" style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.7rem', margin: 0 }}>
                Live Arrival Clocking & Velocity Telemetry
              </p>
            </div>
          </div>

          <button
            className="modal-close-btn"
            style={{
              color: '#fff',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.15)',
              zIndex: 2,
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
              position: 'static',
              margin: 0,
            }}
            onClick={onClose}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* ── Segmented Navigation Tabs ── */}
        <div style={{
          display: 'flex',
          gap: '0.4rem',
          padding: '0.5rem 1.15rem 0.35rem',
          background: 'rgba(15, 23, 42, 0.75)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          flexShrink: 0,
        }}>
          <button
            type="button"
            onClick={() => setActiveTab('arrivals')}
            style={{
              flex: 1,
              padding: '0.5rem 0.75rem',
              borderRadius: '0.6rem',
              border: activeTab === 'arrivals' ? '1px solid rgba(255, 193, 7, 0.5)' : '1px solid rgba(255, 255, 255, 0.08)',
              background: activeTab === 'arrivals' ? 'rgba(255, 193, 7, 0.18)' : 'rgba(255, 255, 255, 0.03)',
              color: activeTab === 'arrivals' ? 'var(--brand-gold)' : 'var(--text-secondary)',
              fontWeight: 800,
              fontSize: '0.78rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
              transition: 'all 0.15s ease',
            }}
          >
            <span>🏆</span>
            <span>Event Arrivals ({clockedBirds.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('clockin')}
            style={{
              flex: 1,
              padding: '0.5rem 0.75rem',
              borderRadius: '0.6rem',
              border: activeTab === 'clockin' ? '1px solid rgba(56, 189, 248, 0.5)' : '1px solid rgba(255, 255, 255, 0.08)',
              background: activeTab === 'clockin' ? 'rgba(56, 189, 248, 0.18)' : 'rgba(255, 255, 255, 0.03)',
              color: activeTab === 'clockin' ? '#38bdf8' : 'var(--text-secondary)',
              fontWeight: 800,
              fontSize: '0.78rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
              transition: 'all 0.15s ease',
            }}
          >
            <span>⚡</span>
            <span>Manual Clock-In</span>
          </button>
        </div>

        {/* ── Modal Body ── */}
        <div
          className="modal-body"
          style={{
            padding: '0.85rem 1.15rem',
            paddingBottom: 'calc(env(safe-area-inset-bottom) + 5.5rem)',
            gap: '0.65rem',
            overflowY: 'auto',
            flex: 1,
            boxSizing: 'border-box',
          }}
        >
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
              {/* Event Select Dropdown (Always visible at top) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label htmlFor="event-select" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 700, fontSize: '0.74rem', color: '#cbd5e1' }}>
                    <TrophyIcon size={13} /> Scheduled Flight Event
                  </label>
                  {selectedEvent && (
                    <span style={{ fontSize: '0.68rem', color: 'var(--brand-gold)', fontWeight: 700 }}>
                      📏 {selectedEvent.extendedProps?.distance || 0} km • ⏰ Rel: {selectedEvent.extendedProps?.releaseTime || '06:00'}
                    </span>
                  )}
                </div>
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
                    padding: '0.5rem 0.8rem',
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    width: '100%',
                    margin: 0,
                  }}
                >
                  {flightEvents.map((e, idx) => (
                    <option key={e.id} value={e.id}>
                      {idx === 0 ? '🔥 LATEST · ' : ''}{e.extendedProps?.club === 'Training' ? 'Toss' : 'Race'}: {e.title} ({new Date(e.date).toLocaleDateString()}) · {e.extendedProps?.distance || 0} km
                    </option>
                  ))}
                </select>
              </div>

              {rfidFlash && (
                <div
                  style={{
                    padding: '0.5rem 0.75rem',
                    borderRadius: '0.55rem',
                    border: rfidFlash.status === 'success' ? '1px solid rgba(76, 175, 80, 0.4)' : '1px solid rgba(245, 158, 11, 0.4)',
                    background: rfidFlash.status === 'success' ? 'rgba(76, 175, 80, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                    color: rfidFlash.status === 'success' ? '#81C784' : '#FBBF24',
                    fontSize: '0.74rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                  }}
                >
                  <span>{rfidFlash.message}</span>
                </div>
              )}

              {/* ── TAB 1: EVENT ARRIVALS (ZERO SCROLLING!) ── */}
              {activeTab === 'arrivals' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                  {/* RFID Scanner Status Bar */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.45rem 0.75rem',
                      borderRadius: '0.55rem',
                      border: '1px solid rgba(255, 193, 7, 0.25)',
                      background: 'linear-gradient(135deg, rgba(255, 193, 7, 0.09) 0%, rgba(255, 193, 7, 0.02) 100%)',
                      gap: '0.5rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <span style={{ position: 'relative', display: 'flex', width: '8px', height: '8px' }}>
                        <span style={{ animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite', position: 'absolute', display: 'inline-flex', height: '100%', width: '100%', borderRadius: '50%', background: '#FFC107', opacity: 0.75 }}></span>
                        <span style={{ position: 'relative', display: 'inline-flex', borderRadius: '50%', height: '8px', width: '8px', background: '#FFC107' }}></span>
                      </span>
                      <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#FFC107' }}>
                        📡 125kHz RFID Scanner Active
                      </span>
                    </div>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', fontSize: '0.68rem', color: '#cbd5e1', userSelect: 'none', background: 'rgba(255,255,255,0.05)', padding: '0.2rem 0.5rem', borderRadius: '0.4rem' }}>
                      <input
                        type="checkbox"
                        checked={autoSubmitOnScan}
                        onChange={(e) => setAutoSubmitOnScan(e.target.checked)}
                        style={{ accentColor: '#FFC107', cursor: 'pointer', width: '13px', height: '13px' }}
                      />
                      <span style={{ fontWeight: 600 }}>Auto-Save</span>
                    </label>
                  </div>

                  {/* Arrivals List Header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.1rem 0.2rem' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#e2e8f0' }}>
                      Clocked Arrivals ({clockedBirds.length})
                    </span>
                    <span style={{ fontSize: '0.66rem', color: '#94a3b8' }}>
                      Sorted by Speed (m/min & km/h)
                    </span>
                  </div>

                  {/* Arrivals Cards */}
                  {clockedBirds.length === 0 ? (
                    <div
                      style={{
                        padding: '2rem 1rem',
                        textAlign: 'center',
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px dashed rgba(255, 255, 255, 0.08)',
                        borderRadius: '0.65rem',
                        color: '#94a3b8',
                        fontSize: '0.74rem',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '0.5rem',
                      }}
                    >
                      <span>🕊️ Walang ibon na naka-clock in pa sa larong ito.</span>
                      <button
                        type="button"
                        onClick={() => setActiveTab('clockin')}
                        style={{
                          padding: '0.4rem 0.85rem',
                          borderRadius: '0.45rem',
                          background: 'var(--brand-gold)',
                          color: '#000',
                          fontWeight: 800,
                          fontSize: '0.75rem',
                          border: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        + Clock In First Bird
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', maxHeight: '380px', overflowY: 'auto' }}>
                      {clockedBirds.map((b, idx) => {
                        const birdInfo = registeredBirds.find((r) => r.ringNo.toUpperCase() === b.ringNo.toUpperCase())
                        const isTop = idx === 0
                        const isSecond = idx === 1
                        const isThird = idx === 2
                        const kph = (b.speed * 0.06).toFixed(1)
                        const duration = getBirdFlightDuration(b.clockInTime, selectedEvent?.extendedProps?.releaseTime)

                        return (
                          <div
                            key={b.ringNo}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              background: isTop ? 'rgba(255, 193, 7, 0.08)' : isSecond ? 'rgba(203, 213, 225, 0.04)' : isThird ? 'rgba(217, 119, 6, 0.04)' : 'rgba(22, 27, 38, 0.75)',
                              border: isTop ? '1px solid rgba(255, 193, 7, 0.35)' : isSecond ? '1px solid rgba(203, 213, 225, 0.25)' : isThird ? '1px solid rgba(217, 119, 6, 0.25)' : '1px solid rgba(255, 255, 255, 0.06)',
                              borderRadius: '0.65rem',
                              padding: '0.55rem 0.75rem',
                              gap: '0.5rem',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0, flex: 1 }}>
                              <span
                                style={{
                                  fontSize: '0.68rem',
                                  fontWeight: 900,
                                  padding: '0.15rem 0.42rem',
                                  borderRadius: '9999px',
                                  background: isTop ? 'rgba(255, 193, 7, 0.25)' : isSecond ? 'rgba(203, 213, 225, 0.2)' : isThird ? 'rgba(217, 119, 6, 0.2)' : 'rgba(255,255,255,0.08)',
                                  color: isTop ? 'var(--brand-gold)' : isSecond ? '#e2e8f0' : isThird ? '#f59e0b' : 'var(--text-muted)',
                                  border: isTop ? '1px solid rgba(255, 193, 7, 0.6)' : isSecond ? '1px solid rgba(203, 213, 225, 0.45)' : isThird ? '1px solid rgba(217, 119, 6, 0.45)' : 'none',
                                  flexShrink: 0,
                                }}
                              >
                                {isTop ? '1st' : isSecond ? '2nd' : isThird ? '3rd' : `#${idx + 1}`}
                              </span>
                              <div className="min-w-0" style={{ overflow: 'hidden' }}>
                                <div style={{ fontSize: '0.78rem', fontWeight: 800, color: isTop ? 'var(--brand-gold)' : '#fff', fontFamily: 'monospace', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {b.ringNo} {birdInfo?.name ? <span style={{ fontWeight: 600, color: '#cbd5e1' }}>({birdInfo.name})</span> : ''}
                                </div>
                                <div style={{ fontSize: '0.66rem', color: '#94a3b8', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                  <span>⏰ {b.clockInTime}</span>
                                  {duration && <span style={{ color: '#60a5fa', fontFamily: 'monospace' }}>• ⏱️ {duration}</span>}
                                  {birdInfo?.color && <span>• {birdInfo.color}</span>}
                                </div>
                              </div>
                            </div>

                            <div style={{ textAlign: 'right', flexShrink: 0, whiteSpace: 'nowrap' }}>
                              <div style={{ fontSize: '0.84rem', fontWeight: 900, color: isTop ? '#FFC107' : '#38bdf8', fontFamily: 'monospace' }}>
                                +{b.speed.toLocaleString()} <span style={{ fontSize: '0.62rem', opacity: 0.7, fontFamily: 'sans-serif' }}>m/m</span>
                              </div>
                              <div style={{ fontSize: '0.66rem', color: 'var(--brand-gold)', fontWeight: 700 }}>
                                ⚡ {kph} km/h
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Button to Clock in Another Bird */}
                  <button
                    type="button"
                    onClick={() => setActiveTab('clockin')}
                    style={{
                      width: '100%',
                      padding: '0.65rem',
                      borderRadius: '0.65rem',
                      border: 'none',
                      background: 'linear-gradient(135deg, #FFC107, #FF9800)',
                      color: '#000',
                      fontWeight: 900,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem',
                      boxShadow: '0 4px 14px rgba(255, 193, 7, 0.25)',
                      marginTop: '0.35rem',
                    }}
                  >
                    <PlusIcon size={15} />
                    <span>+ Record Another Bird (Manual)</span>
                  </button>
                </div>
              )}

              {/* ── TAB 2: MANUAL CLOCK-IN FORM ── */}
              {activeTab === 'clockin' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {/* Ring Number Select Dropdown */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label htmlFor="ring-no" className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 700, fontSize: '0.76rem', color: '#cbd5e1', marginBottom: '0.25rem' }}>
                      <TagIcon size={14} /> Select Registered Bird
                    </label>
                    {registeredBirds.length === 0 ? (
                      <div
                        style={{
                          fontSize: '0.76rem',
                          color: 'var(--brand-gold)',
                          background: 'rgba(255, 193, 7, 0.08)',
                          border: '1px solid rgba(255, 193, 7, 0.25)',
                          borderRadius: '0.65rem',
                          padding: '0.65rem 0.85rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.2rem',
                        }}
                      >
                        <span style={{ fontWeight: 700 }}>Walang registered birds sa iyong loft.</span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                          Mag-rehistro muna sa Loft Registry bago mag-clock in ng ibon.
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
                            padding: '0.55rem 0.85rem',
                            fontSize: '0.82rem',
                            cursor: 'pointer',
                            width: '100%',
                            margin: 0,
                          }}
                        >
                          {registeredBirds.map((b) => {
                            const isClocked = clockedBirds.some(c => c.ringNo.toUpperCase() === b.ringNo.toUpperCase())
                            let isKasali = true
                            if (selectedEvent?.extendedProps?.participatingBirds) {
                              try {
                                const parts = JSON.parse(selectedEvent.extendedProps.participatingBirds)
                                if (Array.isArray(parts) && parts.length > 0) {
                                  isKasali = parts.includes(b.ringNo.toUpperCase())
                                }
                              } catch {}
                            }
                            return (
                              <option key={b.id} value={b.ringNo}>
                                {isClocked ? '✓ [CLOCKED] ' : !isKasali ? '⚠️ [DI KASALI] ' : ''}
                                {b.ringNo} {b.name ? `"${b.name}"` : ''} ({b.color || 'Racer'})
                              </option>
                            )
                          })}
                        </select>

                        {/* Selected Bird Micro-Card */}
                        {selectedBird && (
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              background: 'rgba(22, 27, 38, 0.85)',
                              border: '1px solid rgba(255, 255, 255, 0.08)',
                              borderRadius: '0.55rem',
                              padding: '0.45rem 0.7rem',
                              marginTop: '0.3rem',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                              <div
                                style={{
                                  width: '26px',
                                  height: '26px',
                                  borderRadius: '6px',
                                  background: 'rgba(255, 193, 7, 0.1)',
                                  border: '1px solid rgba(255, 193, 7, 0.25)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                <img src="/icon.png" alt="" style={{ width: '16px', height: '16px', objectFit: 'contain' }} />
                              </div>
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                                  <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--brand-gold)', fontFamily: 'monospace' }}>
                                    {selectedBird.ringNo}
                                  </span>
                                  {selectedBird.rfidTag && (
                                    <span style={{
                                      fontSize: '0.62rem',
                                      padding: '0.05rem 0.35rem',
                                      borderRadius: '3px',
                                      background: 'rgba(255,193,7,0.12)',
                                      color: '#FFC107',
                                      border: '1px solid rgba(255,193,7,0.3)',
                                      fontFamily: 'monospace',
                                      fontWeight: 600
                                    }} title={`125kHz RFID: ${selectedBird.rfidTag}`}>
                                      📡 {selectedBird.rfidTag}
                                    </span>
                                  )}
                                </div>
                                <div style={{ fontSize: '0.66rem', color: '#94a3b8' }}>
                                  {selectedBird.name ? `${selectedBird.name} • ` : ''}{selectedBird.color}
                                </div>
                              </div>
                            </div>

                            <span
                              style={{
                                fontSize: '0.65rem',
                                fontWeight: 800,
                                padding: '0.12rem 0.45rem',
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

                        {/* Explanatory card if bird is already clocked */}
                        {alreadyClockedRecord && (
                          <div
                            style={{
                              marginTop: '0.35rem',
                              padding: '0.55rem 0.75rem',
                              borderRadius: '0.55rem',
                              background: 'rgba(56, 189, 248, 0.12)',
                              border: '1px solid rgba(56, 189, 248, 0.35)',
                              color: '#38bdf8',
                              fontSize: '0.72rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.45rem',
                            }}
                          >
                            <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>ℹ️</span>
                            <div style={{ lineHeight: 1.35 }}>
                              <strong style={{ color: '#fff' }}>NAKA-CLOCK NA SI {alreadyClockedRecord.ringNo}:</strong> Naitala kaninang <strong>{alreadyClockedRecord.clockInTime}</strong> (+<strong style={{ color: '#FFC107' }}>{alreadyClockedRecord.speed.toLocaleString()} m/min</strong>). Ligtas na ang tala nito.
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Arrival Time + Quick Time Buttons */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <label htmlFor="arrival-time" className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 700, fontSize: '0.76rem', color: '#cbd5e1', margin: 0 }}>
                        <TimerIcon size={14} /> Arrival Clock-in Time
                      </label>
                      {/* Quick Time Helpers */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <button
                          type="button"
                          onClick={setTimeToNow}
                          style={{
                            padding: '0.18rem 0.5rem',
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            borderRadius: '0.35rem',
                            background: 'rgba(255, 193, 7, 0.15)',
                            border: '1px solid rgba(255, 193, 7, 0.35)',
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
                            padding: '0.18rem 0.4rem',
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
                            padding: '0.18rem 0.4rem',
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
                      step="1"
                      className="form-input"
                      value={clockInTime}
                      onChange={(e) => setClockInTime(e.target.value)}
                      style={{
                        background: 'rgba(15, 23, 42, 0.85)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        borderRadius: '0.65rem',
                        color: '#fff',
                        padding: '0.55rem 0.85rem',
                        fontSize: '0.92rem',
                        fontFamily: 'monospace',
                        fontWeight: 700,
                        textAlign: 'center',
                        width: '100%',
                        margin: 0,
                      }}
                    />
                  </div>

                  {/* ── Live Velocity Telemetry Box ── */}
                  {speedProjection ? (
                    <div
                      style={{
                        background: 'linear-gradient(135deg, rgba(22, 27, 38, 0.95) 0%, rgba(13, 18, 29, 0.95) 100%)',
                        border: '1px solid rgba(255, 193, 7, 0.3)',
                        borderRadius: '0.75rem',
                        padding: '0.75rem 0.95rem',
                        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.4rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }} />
                          <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#e2e8f0', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
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

                      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.45rem', flexWrap: 'wrap' }}>
                          <span className="font-mono text-2xl font-black text-amber-400 tracking-tight" style={{ color: 'var(--brand-gold)', fontSize: '1.6rem', fontWeight: 900 }}>
                            +{speedProjection.speed.toLocaleString()}
                          </span>
                          <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>
                            m/min
                          </span>
                          <span style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--brand-gold)', background: 'rgba(255, 193, 7, 0.14)', padding: '0.12rem 0.45rem', borderRadius: '9999px', border: '1px solid rgba(255, 193, 7, 0.35)' }}>
                            ⚡ {speedProjection.kph} km/h
                          </span>
                        </div>

                        <div style={{ textAlign: 'right', fontSize: '0.7rem', color: '#94a3b8' }}>
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
                            paddingTop: '0.3rem',
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
                        padding: '0.55rem 0.8rem',
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
                  {error && <div className="form-error" style={{ fontSize: '0.76rem' }}>{error}</div>}

                  {/* Success */}
                  {success && (
                    <div
                      style={{
                        background: 'rgba(16, 185, 129, 0.12)',
                        border: '1px solid rgba(16, 185, 129, 0.35)',
                        borderRadius: '0.65rem',
                        padding: '0.65rem',
                        color: '#34d399',
                        textAlign: 'center',
                        fontSize: '0.84rem',
                        fontWeight: 800,
                      }}
                    >
                      ✓ Bird Clocked In Successfully!
                    </div>
                  )}

                  {/* Actions */}
                  <div className="modal-actions" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.65rem', marginTop: '0.15rem' }}>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setActiveTab('arrivals')}
                      style={{
                        borderRadius: '0.65rem',
                        padding: '0.65rem 1rem',
                        fontSize: '0.84rem',
                        fontWeight: 700,
                      }}
                    >
                      View Arrivals
                    </button>
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => handleClockIn()}
                      disabled={saving || success || !!alreadyClockedRecord}
                      style={{
                        background: alreadyClockedRecord
                          ? 'rgba(56, 189, 248, 0.15)'
                          : success
                          ? 'linear-gradient(135deg, #10b981, #059669)'
                          : 'linear-gradient(135deg, #FFC107, #FF8F00)',
                        color: alreadyClockedRecord ? '#38bdf8' : '#000',
                        border: alreadyClockedRecord ? '1px solid rgba(56, 189, 248, 0.4)' : 'none',
                        fontWeight: 900,
                        borderRadius: '0.65rem',
                        padding: '0.65rem 1rem',
                        fontSize: '0.84rem',
                        opacity: saving ? 0.75 : 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.45rem',
                        boxShadow: alreadyClockedRecord ? 'none' : '0 4px 16px rgba(255, 193, 7, 0.25)',
                        cursor: saving || alreadyClockedRecord ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {saving ? (
                        <>
                          <div className="loading-spinner" style={{ width: '1rem', height: '1rem', borderWidth: '2px' }} />
                          Recording Speed...
                        </>
                      ) : success ? (
                        '✓ Clocked In!'
                      ) : alreadyClockedRecord ? (
                        `✓ Naka-clock na (${alreadyClockedRecord.clockInTime})`
                      ) : (
                        <>
                          <PlusIcon size={16} /> Record Arrival
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
