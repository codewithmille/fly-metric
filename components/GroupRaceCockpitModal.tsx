'use client'

import { useState } from 'react'

interface GroupRaceCockpitModalProps {
  isOpen: boolean
  race: any
  currentUserId: string
  onClose: () => void
  onClockInBird: (race: any) => void
  onRaceUpdated?: (updatedRace: any) => void
}

export default function GroupRaceCockpitModal({
  isOpen,
  race,
  currentUserId,
  onClose,
  onClockInBird,
  onRaceUpdated,
}: GroupRaceCockpitModalProps) {
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'lofts' | 'control'>('leaderboard')
  const [copied, setCopied] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  if (!isOpen || !race) return null

  const isOrganizer = race.userId === currentUserId

  // Parse enrolled lofts and arrivals
  let lofts: any[] = []
  try {
    lofts = JSON.parse(race.extendedProps?.loftEntries || race.loftEntries || '[]')
  } catch {
    lofts = []
  }

  let arrivals: any[] = []
  try {
    arrivals = JSON.parse(race.extendedProps?.groupArrivals || race.groupArrivals || '[]')
  } catch {
    arrivals = []
  }

  // Calculate total basketted birds
  const totalBasketted = lofts.reduce((acc, curr) => acc + (curr.birdRings?.length || 0), 0)

  const copyJoinCode = () => {
    if (!race.extendedProps?.joinCode && !race.joinCode) return
    const code = race.extendedProps?.joinCode || race.joinCode
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleUpdateRaceStatus = async (newStatus: string) => {
    setUpdatingStatus(true)
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('supabase.auth.token') : null
      const authHeader = token ? `Bearer ${token}` : ''

      const res = await fetch('/api/race-events', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(authHeader ? { Authorization: authHeader } : {}),
        },
        body: JSON.stringify({
          id: race.id,
          raceStatus: newStatus,
        }),
      })

      const data = await res.json()
      if (res.ok && data.data) {
        if (onRaceUpdated) onRaceUpdated(data.data)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setUpdatingStatus(false)
    }
  }

  const currentStatus = race.extendedProps?.raceStatus || race.raceStatus || 'basketing'

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
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="modal-container"
        style={{
          width: '100%',
          maxWidth: '680px',
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
        {/* Master Header */}
        <div
          style={{
            padding: '1rem 1.25rem',
            background: 'linear-gradient(135deg, #111827 0%, #1e1b4b 60%, #0f172a 100%)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
            <span
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '0.65rem',
                background: 'rgba(255, 193, 7, 0.15)',
                border: '1px solid rgba(255, 193, 7, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.3rem',
                flexShrink: 0,
              }}
            >
              🌐
            </span>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {race.title}
                </h3>
                <span
                  style={{
                    fontSize: '0.62rem',
                    fontWeight: 800,
                    padding: '0.1rem 0.45rem',
                    borderRadius: '9999px',
                    background:
                      currentStatus === 'released'
                        ? 'rgba(56, 189, 248, 0.18)'
                        : currentStatus === 'completed'
                        ? 'rgba(74, 222, 128, 0.18)'
                        : 'rgba(255, 193, 7, 0.18)',
                    border:
                      currentStatus === 'released'
                        ? '1px solid rgba(56, 189, 248, 0.4)'
                        : currentStatus === 'completed'
                        ? '1px solid rgba(74, 222, 128, 0.4)'
                        : '1px solid rgba(255, 193, 7, 0.4)',
                    color:
                      currentStatus === 'released'
                        ? '#38bdf8'
                        : currentStatus === 'completed'
                        ? '#4ade80'
                        : '#FFC107',
                    textTransform: 'uppercase',
                  }}
                >
                  {currentStatus}
                </span>
              </div>
              <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.7rem', color: '#94a3b8' }}>
                📍 {race.extendedProps?.location || race.location} • 📏 {race.extendedProps?.distance || race.distance} km • ⏰ Rel: {race.extendedProps?.releaseTime || race.releaseTime || '06:00'}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
            {/* Join Code Pill Button */}
            {(race.extendedProps?.joinCode || race.joinCode) && (
              <button
                type="button"
                onClick={copyJoinCode}
                title="Click to copy Join Code"
                style={{
                  background: 'rgba(255, 193, 7, 0.12)',
                  border: '1px solid rgba(255, 193, 7, 0.35)',
                  borderRadius: '0.5rem',
                  padding: '0.3rem 0.65rem',
                  color: '#FFC107',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  fontFamily: 'monospace',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                }}
              >
                <span>{copied ? '✓ Copied' : `🔑 ${race.extendedProps?.joinCode || race.joinCode}`}</span>
              </button>
            )}

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
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Cockpit Navigation Tabs */}
        <div
          style={{
            display: 'flex',
            gap: '0.45rem',
            padding: '0.5rem 1.15rem 0.35rem',
            background: 'rgba(15, 23, 42, 0.75)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            flexShrink: 0,
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('leaderboard')}
            style={{
              flex: 1,
              height: '36px',
              borderRadius: '0.55rem',
              border: activeTab === 'leaderboard' ? '1px solid rgba(255, 193, 7, 0.5)' : '1px solid rgba(255, 255, 255, 0.08)',
              background: activeTab === 'leaderboard' ? 'rgba(255, 193, 7, 0.16)' : 'rgba(255, 255, 255, 0.03)',
              color: activeTab === 'leaderboard' ? '#FFC107' : '#94a3b8',
              fontWeight: 800,
              fontSize: '0.76rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.35rem',
            }}
          >
            <span>🏆</span>
            <span>Leaderboard ({arrivals.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('lofts')}
            style={{
              flex: 1,
              height: '36px',
              borderRadius: '0.55rem',
              border: activeTab === 'lofts' ? '1px solid rgba(56, 189, 248, 0.5)' : '1px solid rgba(255, 255, 255, 0.08)',
              background: activeTab === 'lofts' ? 'rgba(56, 189, 248, 0.16)' : 'rgba(255, 255, 255, 0.03)',
              color: activeTab === 'lofts' ? '#38bdf8' : '#94a3b8',
              fontWeight: 800,
              fontSize: '0.76rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.35rem',
            }}
          >
            <span>🏠</span>
            <span>Lofts ({lofts.length})</span>
          </button>

          {isOrganizer && (
            <button
              type="button"
              onClick={() => setActiveTab('control')}
              style={{
                flex: 1,
                height: '36px',
                borderRadius: '0.55rem',
                border: activeTab === 'control' ? '1px solid rgba(192, 132, 252, 0.5)' : '1px solid rgba(255, 255, 255, 0.08)',
                background: activeTab === 'control' ? 'rgba(192, 132, 252, 0.16)' : 'rgba(255, 255, 255, 0.03)',
                color: activeTab === 'control' ? '#c084fc' : '#94a3b8',
                fontWeight: 800,
                fontSize: '0.76rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.35rem',
              }}
            >
              <span>⚙️</span>
              <span>Race Control</span>
            </button>
          )}
        </div>

        {/* Body Content */}
        <div style={{ padding: '1rem 1.15rem', overflowY: 'auto', flex: 1, maxHeight: '68vh' }}>
          {/* TAB 1: LIVE MULTI-LOFT LEADERBOARD */}
          {activeTab === 'leaderboard' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>
                  Showing {arrivals.length} verified clock-in arrivals across {lofts.length} lofts
                </span>
                <button
                  type="button"
                  onClick={() => onClockInBird(race)}
                  style={{
                    padding: '0.35rem 0.85rem',
                    borderRadius: '0.5rem',
                    background: '#FFC107',
                    color: '#000',
                    border: 'none',
                    fontWeight: 800,
                    fontSize: '0.72rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                  }}
                >
                  <span>⚡ Clock-In Bird</span>
                </button>
              </div>

              {arrivals.length === 0 ? (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '3rem 1rem',
                    color: '#94a3b8',
                    background: 'rgba(255,255,255,0.02)',
                    borderRadius: '0.75rem',
                    border: '1px dashed rgba(255,255,255,0.1)',
                  }}
                >
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📭</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#f8fafc' }}>
                    No Arrivals Clocked In Yet
                  </div>
                  <p style={{ fontSize: '0.74rem', marginTop: '0.25rem', maxWidth: '320px', margin: '0.25rem auto 1rem auto', color: '#94a3b8' }}>
                    As soon as birds are clocked via RFID scanner or manual entry by any participant, arrivals will appear on this live leaderboard.
                  </p>
                  <button
                    type="button"
                    onClick={() => onClockInBird(race)}
                    style={{
                      padding: '0.45rem 1rem',
                      borderRadius: '0.5rem',
                      background: 'rgba(255, 193, 7, 0.15)',
                      border: '1px solid rgba(255, 193, 7, 0.4)',
                      color: '#FFC107',
                      fontWeight: 800,
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                    }}
                  >
                    + Record First Arrival
                  </button>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.74rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', textAlign: 'left' }}>
                        <th style={{ padding: '0.45rem 0.3rem', color: '#94a3b8', width: '3.2rem' }}>Rank</th>
                        <th style={{ padding: '0.45rem 0.3rem', color: '#94a3b8' }}>Bird Ring & Loft</th>
                        <th style={{ padding: '0.45rem 0.3rem', color: '#94a3b8' }}>Clock Time</th>
                        <th style={{ padding: '0.45rem 0.3rem', color: '#94a3b8', textAlign: 'right' }}>Velocity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {arrivals.map((arrival: any, idx: number) => (
                        <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                          <td
                            style={{
                              padding: '0.55rem 0.3rem',
                              fontWeight: 800,
                              color: idx === 0 ? '#FFC107' : idx === 1 ? '#cbd5e1' : idx === 2 ? '#f59e0b' : '#94a3b8',
                            }}
                          >
                            {idx === 0 ? '🥇 1st' : idx === 1 ? '🥈 2nd' : idx === 2 ? '🥉 3rd' : `#${idx + 1}`}
                          </td>
                          <td style={{ padding: '0.55rem 0.3rem' }}>
                            <div style={{ fontWeight: 800, color: '#f8fafc', fontFamily: 'monospace' }}>
                              {arrival.ringNo}
                            </div>
                            <div style={{ fontSize: '0.66rem', color: '#38bdf8' }}>
                              🏠 {arrival.loftName || 'Participant Loft'} • {arrival.fancierName}
                            </div>
                          </td>
                          <td style={{ padding: '0.55rem 0.3rem', color: '#cbd5e1', fontFamily: 'monospace' }}>
                            {arrival.clockInTime}
                          </td>
                          <td style={{ padding: '0.55rem 0.3rem', textAlign: 'right' }}>
                            <div style={{ fontWeight: 900, color: '#FFC107', fontFamily: 'monospace', fontSize: '0.78rem' }}>
                              {arrival.speed.toLocaleString()} m/m
                            </div>
                            <div style={{ fontSize: '0.64rem', color: '#38bdf8', fontFamily: 'monospace', fontWeight: 600 }}>
                              ⚡ {arrival.kph || (arrival.speed * 0.06).toFixed(1)} km/h
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ENROLLED LOFTS */}
          {activeTab === 'lofts' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>
                  Total: {lofts.length} lofts enrolled • {totalBasketted} birds basketted
                </span>
                <span style={{ fontSize: '0.68rem', fontFamily: 'monospace', color: '#FFC107' }}>
                  Open Unlimited Entry
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {lofts.map((l: any, idx: number) => (
                  <div
                    key={idx}
                    style={{
                      background: 'rgba(15, 23, 42, 0.65)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '0.65rem',
                      padding: '0.75rem 0.95rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.4rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <strong style={{ color: '#fff', fontSize: '0.86rem' }}>{l.loftName}</strong>
                        {l.isOrganizer && (
                          <span style={{ fontSize: '0.6rem', padding: '0.05rem 0.35rem', borderRadius: '4px', background: 'rgba(255,193,7,0.15)', color: '#FFC107', fontWeight: 800 }}>
                            ORGANIZER
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: '0.7rem', color: '#38bdf8', fontFamily: 'monospace', fontWeight: 700 }}>
                        📏 {l.loftDistance || race.distance} km
                      </span>
                    </div>

                    <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                      Fancier: {l.fancierName || l.fancierEmail} • Basketted: {l.birdRings?.length || 0} birds
                    </div>

                    {/* Bird Rings List */}
                    {l.birdRings && l.birdRings.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginTop: '0.2rem' }}>
                        {l.birdRings.map((ring: string, bIdx: number) => (
                          <span
                            key={bIdx}
                            style={{
                              padding: '0.15rem 0.4rem',
                              borderRadius: '4px',
                              background: 'rgba(255, 255, 255, 0.04)',
                              border: '1px solid rgba(255, 255, 255, 0.08)',
                              fontSize: '0.64rem',
                              fontFamily: 'monospace',
                              color: '#cbd5e1',
                            }}
                          >
                            {ring}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: ADMIN RACE CONTROL */}
          {activeTab === 'control' && isOrganizer && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div
                style={{
                  padding: '0.85rem',
                  background: 'rgba(192, 132, 252, 0.08)',
                  border: '1px solid rgba(192, 132, 252, 0.25)',
                  borderRadius: '0.65rem',
                }}
              >
                <h4 style={{ margin: '0 0 0.25rem 0', color: '#c084fc', fontSize: '0.85rem', fontWeight: 800 }}>
                  Race Director / Admin Controls
                </h4>
                <p style={{ margin: 0, fontSize: '0.72rem', color: '#cbd5e1' }}>
                  As the organizer, you can advance the race status to lock basketing or mark official race completion.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.65rem', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '0.5rem' }}>
                  <div>
                    <strong style={{ color: '#fff', fontSize: '0.78rem' }}>1. Basketing Phase</strong>
                    <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Open for fanciers to join with code and basket birds</div>
                  </div>
                  <button
                    type="button"
                    disabled={updatingStatus || currentStatus === 'basketing'}
                    onClick={() => handleUpdateRaceStatus('basketing')}
                    style={{
                      padding: '0.35rem 0.75rem',
                      borderRadius: '0.45rem',
                      background: currentStatus === 'basketing' ? 'rgba(255, 193, 7, 0.3)' : 'rgba(255, 255, 255, 0.06)',
                      border: currentStatus === 'basketing' ? '1px solid #FFC107' : '1px solid rgba(255, 255, 255, 0.1)',
                      color: currentStatus === 'basketing' ? '#FFC107' : '#94a3b8',
                      fontWeight: 800,
                      fontSize: '0.7rem',
                      cursor: currentStatus === 'basketing' ? 'default' : 'pointer',
                    }}
                  >
                    {currentStatus === 'basketing' ? 'Active' : 'Set Basketing'}
                  </button>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.65rem', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '0.5rem' }}>
                  <div>
                    <strong style={{ color: '#fff', fontSize: '0.78rem' }}>2. Released Phase</strong>
                    <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Close basketing; birds released and arrival clock-in live</div>
                  </div>
                  <button
                    type="button"
                    disabled={updatingStatus || currentStatus === 'released'}
                    onClick={() => handleUpdateRaceStatus('released')}
                    style={{
                      padding: '0.35rem 0.75rem',
                      borderRadius: '0.45rem',
                      background: currentStatus === 'released' ? 'rgba(56, 189, 248, 0.3)' : 'rgba(255, 255, 255, 0.06)',
                      border: currentStatus === 'released' ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.1)',
                      color: currentStatus === 'released' ? '#38bdf8' : '#94a3b8',
                      fontWeight: 800,
                      fontSize: '0.7rem',
                      cursor: currentStatus === 'released' ? 'default' : 'pointer',
                    }}
                  >
                    {currentStatus === 'released' ? 'Active' : 'Mark Released'}
                  </button>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.65rem', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '0.5rem' }}>
                  <div>
                    <strong style={{ color: '#fff', fontSize: '0.78rem' }}>3. Official / Completed</strong>
                    <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Cut-off reached; finalize leaderboard and lock standings</div>
                  </div>
                  <button
                    type="button"
                    disabled={updatingStatus || currentStatus === 'completed'}
                    onClick={() => handleUpdateRaceStatus('completed')}
                    style={{
                      padding: '0.35rem 0.75rem',
                      borderRadius: '0.45rem',
                      background: currentStatus === 'completed' ? 'rgba(74, 222, 128, 0.3)' : 'rgba(255, 255, 255, 0.06)',
                      border: currentStatus === 'completed' ? '1px solid #4ade80' : '1px solid rgba(255, 255, 255, 0.1)',
                      color: currentStatus === 'completed' ? '#4ade80' : '#94a3b8',
                      fontWeight: 800,
                      fontSize: '0.7rem',
                      cursor: currentStatus === 'completed' ? 'default' : 'pointer',
                    }}
                  >
                    {currentStatus === 'completed' ? 'Finalized' : 'Finalize Race'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
