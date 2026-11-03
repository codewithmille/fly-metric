'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import type { RaceEvent } from '@/app/api/race-events/route'
import { BirdIcon, TrophyIcon, TimerIcon, LightningIcon, CalendarIcon } from '@/components/icons'
import { playElectronicChime, speakPigeonArrival } from '@/hooks/useRfidScanner'

function LiveClock() {
  const [currentTimeStr, setCurrentTimeStr] = useState('')

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setCurrentTimeStr(now.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    }
    updateTime()
    const timer = setInterval(updateTime, 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div
      style={{
        fontFamily: 'monospace',
        fontSize: '1.05rem',
        fontWeight: 900,
        color: '#FFC107',
        background: 'rgba(0, 0, 0, 0.55)',
        border: '1px solid rgba(255, 193, 7, 0.3)',
        padding: '0.35rem 0.75rem',
        borderRadius: '8px',
        letterSpacing: '0.05em',
      }}
    >
      {currentTimeStr || '00:00:00'}
    </div>
  )
}

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

interface BirdRecord {
  ringNo: string
  clockInTime: string
  speed: number
}

interface ElectronicPadModalProps {
  isOpen: boolean
  events: RaceEvent[]
  registeredBirds: LoftBird[]
  onClose: () => void
  onManualClockIn: (ringNo: string, arrivalTime: string, eventId: string) => Promise<any>
  onOpenRegistry?: () => void
  onOpenNewActivity?: () => void
  initialEventId?: string | null
  onSelectEventId?: (eventId: string) => void
}

export default function ElectronicPadModal({
  isOpen,
  events,
  registeredBirds,
  onClose,
  onManualClockIn,
  onOpenRegistry,
  onOpenNewActivity,
  initialEventId,
  onSelectEventId,
}: ElectronicPadModalProps) {
  // Filter available flight events (Race & Training) - sorted latest race first!
  const flightEvents = useMemo(() => {
    return events
      .filter((e) => e.extendedProps?.club === 'Race' || e.extendedProps?.club === 'Training')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [events])

  const [selectedEventId, setSelectedEventId] = useState<string>('')
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [speechEnabled, setSpeechEnabled] = useState(true)
  const [lastArrival, setLastArrival] = useState<{
    ringNo: string
    name?: string | null
    time: string
    speed: number
    rank: number
  } | null>(null)
  const [testTagInput, setTestTagInput] = useState('')
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'warning' | 'info'; message: string } | null>(null)

  const modalRef = useRef<HTMLDivElement>(null)

  // Focus modal container once on open without stealing focus from form inputs/dropdowns
  useEffect(() => {
    if (isOpen) {
      modalRef.current?.focus()
    }
  }, [isOpen])

  // Default selected event to target, active, today's, or latest event
  useEffect(() => {
    if (isOpen && flightEvents.length > 0) {
      const storedActiveId = typeof window !== 'undefined' ? localStorage.getItem('flymetric_active_rfid_event_id') : null
      const target =
        (initialEventId && flightEvents.find(e => e.id === initialEventId)) ||
        (storedActiveId && flightEvents.find(e => e.id === storedActiveId)) ||
        flightEvents.find(e => e.extendedProps?.isRfidActive === true) ||
        flightEvents.find(e => {
          const todayStr = new Date().toISOString().split('T')[0]
          return e.date === todayStr || (e.date && e.date.startsWith(todayStr))
        }) ||
        flightEvents[0]

      if (target && (!selectedEventId || !flightEvents.some(e => e.id === selectedEventId))) {
        setSelectedEventId(target.id)
      }
    }
  }, [isOpen, initialEventId, flightEvents, selectedEventId])

  // Escape key to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  if (!isOpen) return null

  const selectedEvent = flightEvents.find((e) => e.id === selectedEventId) || flightEvents[0]

  // Parse clocked birds for the active event
  const clockedBirds: BirdRecord[] = (() => {
    if (!selectedEvent) return []
    try {
      const list = JSON.parse(selectedEvent.extendedProps?.birds || '[]')
      return Array.isArray(list) ? [...list].sort((a, b) => b.speed - a.speed) : []
    } catch {
      return []
    }
  })()

  const handleTestSensor = async (tagToTest?: string) => {
    const tag = (tagToTest || testTagInput).trim()
    if (!tag) {
      setActionNotice({ type: 'warning', message: 'Please enter an RFID tag or Ring number to test.' })
      return
    }

    if (!selectedEvent) {
      setActionNotice({ type: 'warning', message: 'No active race event selected.' })
      return
    }

    // Match bird
    const matched = registeredBirds.find(
      (b) =>
        (b.rfidTag && b.rfidTag.toLowerCase() === tag.toLowerCase()) ||
        b.ringNo.toLowerCase() === tag.toLowerCase()
    )

    const now = new Date()
    const hrs = String(now.getHours()).padStart(2, '0')
    const mins = String(now.getMinutes()).padStart(2, '0')
    const timeNow = `${hrs}:${mins}`

    const birdToClock = matched || {
      id: tag,
      ringNo: `PH-${now.getFullYear()}-${tag.slice(-5)}`,
      color: 'Blue Bar',
      name: `Racer ${tag.slice(-4)}`,
      gender: 'Unknown',
      rfidTag: tag,
    }

    try {
      await onManualClockIn(birdToClock.ringNo, timeNow, selectedEvent.id)
      playElectronicChime(true)

      const distanceKm = selectedEvent.extendedProps?.distance || 0
      const releaseTime = selectedEvent.extendedProps?.releaseTime || '06:00'
      const [rH, rM] = releaseTime.split(':').map(Number)
      const [cH, cM] = timeNow.split(':').map(Number)
      const releaseMinutes = rH * 60 + rM
      let clockInMinutes = cH * 60 + cM
      if (clockInMinutes <= releaseMinutes) clockInMinutes += 24 * 60
      const flyingMinutes = clockInMinutes - releaseMinutes
      const calculatedSpeed = flyingMinutes > 0 ? Math.round((distanceKm * 1000) / flyingMinutes) : 0

      setLastArrival({
        ringNo: birdToClock.ringNo,
        name: birdToClock.name,
        time: now.toLocaleTimeString(),
        speed: calculatedSpeed,
        rank: clockedBirds.length + 1,
      })

      if (speechEnabled) {
        speakPigeonArrival(`Pigeon ${birdToClock.ringNo} clocked! Speed: ${calculatedSpeed} meters per minute!`)
      }

      setActionNotice({
        type: 'success',
        message: `🎯 PIGEON CLOCKED! ${birdToClock.ringNo} (${birdToClock.name || birdToClock.color}) at ${timeNow}!`,
      })
      setTimeout(() => setActionNotice(null), 6000)
      setTestTagInput('')
    } catch (err: any) {
      playElectronicChime(false)
      setActionNotice({ type: 'warning', message: err.message || 'Error clocking bird.' })
      setTimeout(() => setActionNotice(null), 5000)
    }
  }

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      style={{ zIndex: 11000, background: 'rgba(5, 9, 17, 0.88)', backdropFilter: 'blur(8px)' }}
    >
      <div
        className="modal-container"
        ref={modalRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        style={{
          maxWidth: '720px',
          padding: 0,
          background: '#090d16',
          border: '1px solid rgba(16, 185, 129, 0.35)',
          boxShadow: '0 0 50px rgba(16, 185, 129, 0.2), 0 32px 72px rgba(0, 0, 0, 0.85)',
          borderRadius: '1.25rem',
          overflow: 'hidden',
        }}
      >
        {/* ── High-Tech Antenna Station Header ── */}
        <div
          style={{
            background: 'linear-gradient(135deg, #064e3b 0%, #022c22 45%, #090d16 100%)',
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid rgba(16, 185, 129, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            {/* Pulsing Radar Icon */}
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '12px',
                background: 'rgba(16, 185, 129, 0.15)',
                border: '2px solid rgba(16, 185, 129, 0.5)',
                boxShadow: '0 0 16px rgba(16, 185, 129, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#34d399',
                flexShrink: 0,
              }}
            >
              <span style={{ fontSize: '1.4rem' }}>📡</span>
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 900, color: '#fff', margin: 0, letterSpacing: '-0.01em' }}>
                  Electronic Trap Station
                </h2>
                <span
                  style={{
                    fontSize: '0.62rem',
                    fontWeight: 800,
                    padding: '0.15rem 0.5rem',
                    borderRadius: '9999px',
                    background: 'rgba(16, 185, 129, 0.25)',
                    border: '1px solid rgba(16, 185, 129, 0.6)',
                    color: '#6ee7b7',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                  }}
                >
                  <span
                    style={{
                      width: '7px',
                      height: '7px',
                      borderRadius: '50%',
                      background: '#34d399',
                      boxShadow: '0 0 8px #34d399',
                      animation: 'pulse 1.4s infinite',
                    }}
                  />
                  ANTENNA 1: ARMED & LIVE
                </span>
              </div>
              <p style={{ fontSize: '0.74rem', color: '#a7f3d0', margin: '0.2rem 0 0 0', opacity: 0.9 }}>
                Hands-Free Mode: Pigeons stepping on the 125kHz pad clock-in automatically with ZERO human clicks!
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {/* Live Clock Display (Isolated from parent to avoid re-rendering modal inputs) */}
            <LiveClock />

            <button
              onClick={onClose}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#fff',
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* ── Station Control Bar (Active Race + Sound / TTS Toggles) ── */}
        <div
          style={{
            padding: '0.85rem 1.5rem',
            background: 'rgba(15, 23, 42, 0.8)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          {/* Active Race Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: '220px', flex: 1 }}>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>
              Clocking Flight:
            </span>
            {flightEvents.length === 0 ? (
              <span style={{ fontSize: '0.76rem', color: '#f87171', fontWeight: 700 }}>
                No active race found!
              </span>
            ) : (
              <select
                value={selectedEventId || selectedEvent?.id || ''}
                onChange={(e) => {
                  const chosenId = e.target.value
                  setSelectedEventId(chosenId)
                  onSelectEventId?.(chosenId)
                  if (typeof window !== 'undefined') {
                    localStorage.setItem('flymetric_active_rfid_event_id', chosenId)
                  }
                }}
                style={{
                  background: '#0d1527',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  color: '#fff',
                  borderRadius: '6px',
                  padding: '0.35rem 0.65rem',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  outline: 'none',
                  flex: 1,
                  maxWidth: '340px',
                }}
              >
                {flightEvents.map((ev, idx) => (
                  <option key={ev.id} value={ev.id}>
                    {idx === 0 ? '🔥 LATEST · ' : ''}🎯 {ev.title} ({ev.date}) · {ev.extendedProps?.distance || 0}km · Release {ev.extendedProps?.releaseTime || '06:00'}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Audio Toggles */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              style={{
                background: soundEnabled ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.05)',
                border: soundEnabled ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(255,255,255,0.1)',
                color: soundEnabled ? '#34d399' : '#94a3b8',
                borderRadius: '6px',
                padding: '0.3rem 0.65rem',
                fontSize: '0.72rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
              }}
            >
              <span>{soundEnabled ? '🔔 Chime ON' : '🔕 Chime OFF'}</span>
            </button>

            <button
              type="button"
              onClick={() => setSpeechEnabled(!speechEnabled)}
              style={{
                background: speechEnabled ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255,255,255,0.05)',
                border: speechEnabled ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid rgba(255,255,255,0.1)',
                color: speechEnabled ? '#38bdf8' : '#94a3b8',
                borderRadius: '6px',
                padding: '0.3rem 0.65rem',
                fontSize: '0.72rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
              }}
            >
              <span>{speechEnabled ? '🗣️ Voice Voice ON' : '🤐 Voice OFF'}</span>
            </button>
          </div>
        </div>

        {/* ── Status Banners / Action Feedback ── */}
        {actionNotice && (
          <div
            style={{
              padding: '0.75rem 1.5rem',
              background:
                actionNotice.type === 'success'
                  ? 'rgba(16, 185, 129, 0.2)'
                  : actionNotice.type === 'warning'
                  ? 'rgba(245, 158, 11, 0.2)'
                  : 'rgba(59, 130, 246, 0.2)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              color:
                actionNotice.type === 'success'
                  ? '#34d399'
                  : actionNotice.type === 'warning'
                  ? '#fbbf24'
                  : '#60a5fa',
              fontSize: '0.82rem',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.5rem',
            }}
          >
            <span>{actionNotice.message}</span>
            <button
              onClick={() => setActionNotice(null)}
              style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '0.85rem' }}
            >
              ✕
            </button>
          </div>
        )}

        {/* ── Body: Live Clocked Leaderboard + Grand Arrival Telemetry ── */}
        <div
          className="modal-body modal-scroll-body"
          style={{
            padding: '1.25rem 1.5rem',
            maxHeight: '62vh',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          {/* Latest Clocked Bird Highlight Card */}
          {lastArrival && (
            <div
              style={{
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(255, 193, 7, 0.12) 100%)',
                border: '2px solid rgba(16, 185, 129, 0.5)',
                borderRadius: '1rem',
                padding: '1rem 1.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.85rem',
                boxShadow: '0 0 24px rgba(16, 185, 129, 0.25)',
                animation: 'pulse 2s infinite',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <span
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    background: '#FFC107',
                    color: '#000',
                    fontWeight: 900,
                    fontSize: '1.1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 0 14px rgba(255, 193, 7, 0.4)',
                  }}
                >
                  #{lastArrival.rank}
                </span>
                <div>
                  <div style={{ fontSize: '0.68rem', color: '#a7f3d0', fontWeight: 800, textTransform: 'uppercase' }}>
                    ⚡ LATEST AUTOMATIC PAD ARRIVAL
                  </div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#fff', fontFamily: 'monospace' }}>
                    {lastArrival.ringNo} {lastArrival.name ? `· "${lastArrival.name}"` : ''}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#cbd5e1', marginTop: '0.1rem' }}>
                    Clocked at {lastArrival.time} · Trap Pad Sensor #1
                  </div>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 700 }}>VELOCITY</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#FFC107', fontFamily: 'monospace' }}>
                  {lastArrival.speed.toLocaleString()} <span style={{ fontSize: '0.8rem' }}>m/min</span>
                </div>
              </div>
            </div>
          )}

          {/* Active Race Status Bar */}
          {selectedEvent && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: '0.65rem',
              }}
            >
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.65rem', padding: '0.65rem 0.85rem' }}>
                <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 700 }}>DISTANCE</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#fff', fontFamily: 'monospace' }}>
                  {selectedEvent.extendedProps?.distance || 0} km
                </div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.65rem', padding: '0.65rem 0.85rem' }}>
                <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 700 }}>RELEASE TIME</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#38bdf8', fontFamily: 'monospace' }}>
                  {selectedEvent.extendedProps?.releaseTime || '06:00'}
                </div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.65rem', padding: '0.65rem 0.85rem' }}>
                <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 700 }}>CLOCKED TODAY</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#4ade80', fontFamily: 'monospace' }}>
                  {clockedBirds.length} Birds
                </div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.65rem', padding: '0.65rem 0.85rem' }}>
                <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 700 }}>TOP SPEED</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#FFC107', fontFamily: 'monospace' }}>
                  {clockedBirds.length > 0 ? `${clockedBirds[0].speed.toLocaleString()} m/m` : 'Waiting...'}
                </div>
              </div>
            </div>
          )}

          {/* Clocked Birds List */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <BirdIcon size={16} /> Live Clocked Arrivals ({clockedBirds.length})
              </h3>
              <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                Sorted by Velocity (Fastest first)
              </span>
            </div>

            {clockedBirds.length === 0 ? (
              <div
                style={{
                  padding: '2.5rem 1.5rem',
                  textAlign: 'center',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '2px dashed rgba(16, 185, 129, 0.25)',
                  borderRadius: '0.85rem',
                  color: '#94a3b8',
                }}
              >
                <div style={{ fontSize: '2.2rem', marginBottom: '0.5rem' }}>📡</div>
                <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#f8fafc' }}>
                  Pad Antenna Armed & Waiting for Arrivals
                </div>
                <p style={{ fontSize: '0.76rem', color: '#94a3b8', maxWidth: '380px', margin: '0.35rem auto 0 auto' }}>
                  Place the 125kHz USB sensor flat on the loft trap landing board. As soon as a pigeon steps on the antenna, it will clock-in and calculate velocity automatically!
                </p>
              </div>
            ) : (
              <div
                style={{
                  borderRadius: '0.85rem',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  background: 'rgba(15, 23, 42, 0.5)',
                  overflow: 'hidden',
                }}
              >
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255, 255, 255, 0.04)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                      <th style={{ padding: '0.55rem 0.85rem', color: '#94a3b8', width: '3rem' }}>Rank</th>
                      <th style={{ padding: '0.55rem 0.85rem', color: '#94a3b8' }}>Pigeon Ring No.</th>
                      <th style={{ padding: '0.55rem 0.85rem', color: '#94a3b8' }}>Arrival Time</th>
                      <th style={{ padding: '0.55rem 0.85rem', color: '#94a3b8', textAlign: 'right' }}>Velocity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clockedBirds.map((b, idx) => {
                      const matched = registeredBirds.find((rb) => rb.ringNo.toUpperCase() === b.ringNo.toUpperCase())
                      const isWinner = idx === 0
                      return (
                        <tr
                          key={b.ringNo}
                          style={{
                            borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                            background: isWinner ? 'rgba(255, 193, 7, 0.06)' : 'transparent',
                          }}
                        >
                          <td style={{ padding: '0.65rem 0.85rem', fontWeight: 900, color: isWinner ? '#FFC107' : '#94a3b8' }}>
                            #{idx + 1}
                          </td>
                          <td style={{ padding: '0.65rem 0.85rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                              <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#fff', fontSize: '0.84rem' }}>
                                {b.ringNo}
                              </span>
                              {matched?.name && (
                                <span style={{ color: '#cbd5e1', fontSize: '0.72rem' }}>
                                  ({matched.name})
                                </span>
                              )}
                              {matched?.rfidTag && (
                                <span style={{ fontSize: '0.6rem', padding: '0.05rem 0.3rem', borderRadius: '3px', background: 'rgba(255,193,7,0.12)', color: '#FFC107', border: '1px solid rgba(255,193,7,0.3)', fontFamily: 'monospace' }}>
                                  📡 {matched.rfidTag}
                                </span>
                              )}
                            </div>
                            {matched?.color && (
                              <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                                {matched.color} {matched.gender ? `· ${matched.gender}` : ''}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '0.65rem 0.85rem', fontFamily: 'monospace', color: '#38bdf8', fontWeight: 700 }}>
                            {b.clockInTime}
                          </td>
                          <td style={{ padding: '0.65rem 0.85rem', fontFamily: 'monospace', color: isWinner ? '#FFC107' : '#4ade80', fontWeight: 900, textAlign: 'right', fontSize: '0.88rem' }}>
                            {b.speed.toLocaleString()} m/min
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* ── Footer: Test Sensor / Manual Simulation Bar ── */}
        <div
          style={{
            padding: '0.85rem 1.5rem',
            background: 'rgba(10, 15, 26, 0.95)',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          {/* Sensor Simulator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flex: 1, minWidth: '260px' }}>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>
              Test Sensor Tap:
            </span>
            <input
              type="text"
              placeholder="Tap sensor with ring or type ID..."
              value={testTagInput}
              onChange={(e) => setTestTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleTestSensor()
              }}
              style={{
                height: '2rem',
                fontSize: '0.76rem',
                background: '#0d1527',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#fff',
                borderRadius: '6px',
                padding: '0.2rem 0.6rem',
                flex: 1,
                maxWidth: '220px',
                fontFamily: 'monospace',
              }}
            />
            <button
              type="button"
              onClick={() => handleTestSensor()}
              style={{
                height: '2rem',
                padding: '0.2rem 0.75rem',
                fontSize: '0.74rem',
                fontWeight: 800,
                background: '#FFC107',
                color: '#000',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              Test Clock
            </button>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {onOpenRegistry && (
              <button
                type="button"
                onClick={onOpenRegistry}
                style={{
                  height: '2rem',
                  padding: '0.2rem 0.75rem',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#cbd5e1',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                Loft Registry
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              style={{
                height: '2rem',
                padding: '0.2rem 1rem',
                fontSize: '0.74rem',
                fontWeight: 700,
                background: '#10b981',
                color: '#000',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
