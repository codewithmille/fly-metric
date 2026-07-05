'use client'

import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import ActivityModal from '@/components/ActivityModal'
import QuickClockInModal from '@/components/QuickClockInModal'
import BirdRegistryModal from '@/components/BirdRegistryModal'
import LandingPage from '@/components/LandingPage'
import ProfileModal from '@/components/ProfileModal'
import { BirdIcon, LightningIcon, TrainingIcon, TrophyIcon, PlusIcon, CalendarIcon, PillIcon, NotesIcon } from '@/components/icons'
import type { RaceEvent } from '@/app/api/race-events/route'
import { supabase } from '@/lib/supabase'
import type { Session, User } from '@supabase/supabase-js'
import { getEvents, getBirds, syncOfflineQueue, isOnline } from '@/lib/apiClient'

// RaceCalendar must be loaded client-side only (FullCalendar dependency)
const RaceCalendar = dynamic(() => import('@/components/RaceCalendar'), {
  ssr: false,
  loading: () => (
    <div className="calendar-loading" style={{ padding: '5rem' }}>
      <div className="loading-spinner" />
      <span>Initialising activity calendar…</span>
    </div>
  ),
})

interface LoftBird {
  id: string
  ringNo: string
  color: string
  name: string | null
  gender: string | null
}

export default function Home() {
  const [session, setSession] = useState<Session | null>(null)
  const [authLoading, setAuthLoading] = useState(true)

  const [events, setEvents] = useState<RaceEvent[]>([])
  const [registeredBirds, setRegisteredBirds] = useState<LoftBird[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isClockInOpen, setIsClockInOpen] = useState(false)
  const [isRegistryOpen, setIsRegistryOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedEvent, setSelectedEvent] = useState<RaceEvent | null>(null)

  // Day Selection States (for resolving clicks when multiple events occupy the same day)
  const [isSelectionOpen, setIsSelectionOpen] = useState(false)
  const [selectionDate, setSelectionDate] = useState('')
  const [selectionEvents, setSelectionEvents] = useState<RaceEvent[]>([])

  const [isOfflineMode, setIsOfflineMode] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)

  const refreshSession = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    setSession(session)
  }, [])

  // ── Auth & Connection ──────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setAuthLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setAuthLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  // ── Data Fetching ─────────────────────────────────────────
  const fetchEvents = useCallback(async () => {
    if (!session) return
    try {
      setLoading(true)
      const data = await getEvents(session.access_token)
      if (Array.isArray(data)) {
        setEvents(data)
      }
    } catch (err) {
      console.error('Error fetching activities:', err)
    } finally {
      setLoading(false)
    }
  }, [session])

  const fetchBirds = useCallback(async () => {
    if (!session) return
    try {
      const data = await getBirds(session.access_token)
      if (Array.isArray(data)) {
        setRegisteredBirds(data)
      }
    } catch (err) {
      console.error('Error fetching birds:', err)
    }
  }, [session])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsOfflineMode(!navigator.onLine)

      const handleOnline = () => {
        setIsOfflineMode(false)
        if (session?.access_token) {
          syncOfflineQueue(session.access_token).then(() => {
            fetchEvents()
            fetchBirds()
          })
        }
      }

      const handleOffline = () => {
        setIsOfflineMode(true)
      }

      window.addEventListener('online', handleOnline)
      window.addEventListener('offline', handleOffline)

      // Sync immediately on mount if online
      if (navigator.onLine && session?.access_token) {
        syncOfflineQueue(session.access_token).then(() => {
          fetchEvents()
          fetchBirds()
        })
      }

      return () => {
        window.removeEventListener('online', handleOnline)
        window.removeEventListener('offline', handleOffline)
      }
    }
  }, [session, fetchEvents, fetchBirds])

  useEffect(() => {
    if (session) {
      fetchEvents()
      fetchBirds()
    }
  }, [session, fetchEvents, fetchBirds])


  // ── Modal handlers ────────────────────────────────────────
  const openModal = (dateStr: string, eventToEdit?: RaceEvent | null) => {
    if (eventToEdit) {
      setSelectedDate(dateStr)
      setSelectedEvent(eventToEdit)
      setIsModalOpen(true)
      return
    }

    // Find all events on this date
    const dayEvents = events.filter((e) => {
      return e.date === dateStr || (e.date && e.date.startsWith(dateStr))
    })

    if (dayEvents.length === 0) {
      setSelectedDate(dateStr)
      setSelectedEvent(null)
      setIsModalOpen(true)
    } else {
      setSelectionDate(dateStr)
      setSelectionEvents(dayEvents)
      setIsSelectionOpen(true)
    }
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setSelectedEvent(null)
  }

  // ── Show login if not authenticated ───────────────────────
  if (authLoading) {
    return (
      <div style={{
        position: 'fixed', inset: 0, display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: '#0a0c14', flexDirection: 'column', gap: '1rem'
      }}>
        <div className="loading-spinner" />
        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>Loading…</span>
      </div>
    )
  }

  if (!session) {
    return <LandingPage />
  }

  // ── Stats ─────────────────────────────────────────────────
  const today = new Date().toISOString().split('T')[0]
  const flightEvents = events.filter(e => e.extendedProps?.club === 'Race' || e.extendedProps?.club === 'Training')
  const totalBirds = flightEvents.reduce((sum, e) => sum + (e.extendedProps?.totalBirds || 0), 0)
  const maxSpeed = flightEvents.reduce((max, e) => Math.max(max, e.extendedProps?.maxSpeed || 0), 0)
  const totalTrainings = events.filter(e => e.extendedProps?.club === 'Training').length
  const totalRaces = events.filter(e => !e.extendedProps?.club || e.extendedProps?.club === 'Race').length

  const STATS = [
    { icon: <BirdIcon size={22} />, iconClass: 'stat-icon-gold', value: totalBirds.toLocaleString(), label: 'Total Birds Flown' },
    { icon: <LightningIcon size={22} />, iconClass: 'stat-icon-blue', value: maxSpeed > 0 ? maxSpeed.toLocaleString() : '0', label: 'Max Speed (m/min)' },
    { icon: <TrainingIcon size={22} />, iconClass: 'stat-icon-green', value: totalTrainings.toLocaleString(), label: 'Training tosses' },
    { icon: <TrophyIcon size={22} />, iconClass: 'stat-icon-purple', value: totalRaces.toLocaleString(), label: 'Races Competed' },
  ]

  const user: User = session.user
  const avatarUrl = user.user_metadata?.avatar_url as string | undefined
  const displayName = (user.user_metadata?.full_name as string | undefined) || user.email || 'Fancier'
  const initials = displayName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="dashboard">
      {/* ── Navigation ────────────────────────────────── */}
      <nav className="dashboard-nav">
        <div className="nav-brand">
          <div className="nav-logo" aria-hidden="true" style={{ color: 'var(--brand-gold)', display: 'flex', alignItems: 'center' }}>
            <BirdIcon size={26} />
          </div>
          <h1 className="nav-title">
            Fly<span>Metric</span>
          </h1>
          <span className="nav-badge">MY LOFT</span>
          {isOfflineMode ? (
            <span className="nav-badge" style={{ backgroundColor: 'rgba(255, 143, 0, 0.15)', border: '1px solid rgba(255, 143, 0, 0.3)', color: '#FF8F00', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600 }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#FF8F00', display: 'inline-block' }}></span>
              Offline
            </span>
          ) : (
            <span className="nav-badge" style={{ backgroundColor: 'rgba(76, 175, 80, 0.15)', border: '1px solid rgba(76, 175, 80, 0.3)', color: '#4CAF50', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600 }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#4CAF50', display: 'inline-block' }}></span>
              Online
            </span>
          )}
        </div>

        <div className="nav-actions">
          <button
            id="loft-registry-nav"
            className="nav-btn nav-btn-secondary"
            onClick={() => setIsRegistryOpen(true)}
            aria-label="Manage Loft Birds Registry"
            style={{
              background: 'rgba(76, 175, 80, 0.1)',
              border: '1px solid rgba(76, 175, 80, 0.3)',
              color: '#4CAF50',
              fontWeight: 700,
              fontSize: '0.82rem',
              padding: '0.5rem 0.88rem',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              transition: 'all 0.15s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem'
            }}
          >
            <BirdIcon size={16} /> <span className="nav-btn-text">Loft Registry</span>
          </button>
          <button
            id="quick-clockin-nav"
            className="nav-btn nav-btn-secondary"
            onClick={() => setIsClockInOpen(true)}
            aria-label="Quick Clock-in bird"
            style={{
              background: 'rgba(255, 193, 7, 0.1)',
              border: '1px solid rgba(255, 193, 7, 0.3)',
              color: 'var(--brand-gold)',
              fontWeight: 700,
              fontSize: '0.82rem',
              padding: '0.5rem 0.88rem',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              transition: 'all 0.15s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem'
            }}
          >
            <PlusIcon size={16} /> <span className="nav-btn-text">Clock-in Bird</span>
          </button>
          <button
            id="log-new-activity-nav"
            className="nav-btn nav-btn-primary"
            onClick={() => openModal(today)}
            aria-label="Log new activity"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem'
            }}
          >
            <PlusIcon size={16} /> <span className="nav-btn-text">Log Activity</span>
          </button>

          {/* ── User Avatar + Sign out ── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: '0.25rem' }}>
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName}
                title="Edit Loft Profile"
                onClick={() => setIsProfileOpen(true)}
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  border: '2px solid rgba(255,193,7,0.35)',
                  objectFit: 'cover',
                  flexShrink: 0,
                  cursor: 'pointer',
                }}
              />
            ) : (
              <div 
                title="Edit Loft Profile"
                onClick={() => setIsProfileOpen(true)}
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #FFC107, #FF8F00)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  color: '#000',
                  flexShrink: 0,
                  border: '2px solid rgba(255,193,7,0.35)',
                  cursor: 'pointer',
                }}
              >
                {initials}
              </div>
            )}
            <button
              id="signout-btn"
              onClick={handleSignOut}
              title="Sign out"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '0.5rem',
                color: 'rgba(255,255,255,0.5)',
                cursor: 'pointer',
                padding: '0.4rem 0.65rem',
                fontSize: '0.72rem',
                fontWeight: 600,
                transition: 'all 0.15s',
                letterSpacing: '0.02em',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.3rem',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(239,68,68,0.12)'
                e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)'
                e.currentTarget.style.color = '#f87171'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'
                e.currentTarget.style.color = 'rgba(255,255,255,0.5)'
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span className="nav-btn-text">Sign out</span>
            </button>
          </div>
        </div>
      </nav>

      {/* ── Main Content ──────────────────────────────── */}
      <main className="dashboard-content">

        {/* Stats Bar */}
        <section className="stats-bar" aria-label="Loft statistics">
          {STATS.map((s) => (
            <div key={s.label} className="stat-card">
              <div className={`stat-icon ${s.iconClass}`}>{s.icon}</div>
              <div className="stat-info">
                <div className="stat-value">{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            </div>
          ))}
        </section>

        {/* Calendar Card */}
        <section className="calendar-card" aria-label="Loft calendar">
          <div className="calendar-card-header">
            <div className="calendar-card-title">
              📅 Loft Activity Calendar
            </div>
            <span className="calendar-card-hint">
              Hover for details · Click date to log training, races, meds or tasks
            </span>
          </div>

          <RaceCalendar events={events} loading={loading} onDateClick={openModal} />
        </section>

      </main>

      {/* ── Activity Modal ────────────────────────────── */}
      <ActivityModal
        isOpen={isModalOpen}
        selectedDate={selectedDate}
        onClose={closeModal}
        onRaceSaved={fetchEvents}
        eventToEdit={selectedEvent}
        registeredBirds={registeredBirds}
        authToken={session.access_token}
        session={session}
      />

      {/* ── Profile settings Modal ──────────────────────── */}
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        session={session}
        onProfileUpdated={refreshSession}
      />

      {/* ── Quick Clock-in Modal ─────────────────────── */}
      <QuickClockInModal
        isOpen={isClockInOpen}
        events={events}
        registeredBirds={registeredBirds}
        onClose={() => setIsClockInOpen(false)}
        onClockInSaved={fetchEvents}
        authToken={session.access_token}
      />

      {/* ── Bird Registry Modal ──────────────────────── */}
      <BirdRegistryModal
        isOpen={isRegistryOpen}
        onClose={() => setIsRegistryOpen(false)}
        onBirdsUpdated={fetchBirds}
        authToken={session.access_token}
      />

      {/* ── Day Selection Modal ──────────────────────── */}
      {isSelectionOpen && (
        <div className="modal-backdrop" onClick={() => setIsSelectionOpen(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="modal-header" style={{ background: 'linear-gradient(135deg, var(--bg-surface), var(--border-default))', borderBottom: '1px solid var(--border-default)', padding: '0.88rem 1.125rem' }}>
              <div className="modal-header-left">
                <span className="modal-pigeon-icon" style={{ display: 'flex', alignItems: 'center', color: 'var(--brand-gold)' }}>
                  <CalendarIcon size={20} />
                </span>
                <div>
                  <h2 className="modal-title" style={{ color: 'var(--text-primary)', fontSize: '1.05rem', margin: 0 }}>Select Activity</h2>
                  <p className="modal-subtitle" style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.72rem' }}>{selectionDate}</p>
                </div>
              </div>
              <button className="modal-close-btn" onClick={() => setIsSelectionOpen(false)} style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)' }}>×</button>
            </div>
            <div className="modal-body" style={{ padding: '1rem', gap: '0.75rem' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                Existing Activities on this day:
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {selectionEvents.map((ev) => {
                  const type = ev.extendedProps?.club || 'Race'
                  return (
                    <button
                      key={ev.id}
                      onClick={() => {
                        setIsSelectionOpen(false)
                        openModal(selectionDate, ev)
                      }}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '0.75rem 1rem',
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-default)',
                        borderRadius: '0.625rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.75rem',
                        transition: 'all 0.15s ease'
                      }}
                      className="selection-item-card"
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0 }}>
                        <span style={{
                          color: type === 'Training' ? '#2196F3' :
                                 type === 'Medication' ? '#4CAF50' :
                                 type === 'Task' ? '#9C27B0' : 'var(--brand-gold)',
                          display: 'flex',
                          alignItems: 'center',
                          flexShrink: 0
                        }}>
                          {type === 'Training' ? <TrainingIcon size={16} /> :
                           type === 'Medication' ? <PillIcon size={16} /> :
                           type === 'Task' ? <NotesIcon size={16} /> :
                           <TrophyIcon size={16} />}
                        </span>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {ev.title}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {type} · {ev.extendedProps?.location || 'No details'}
                          </div>
                        </div>
                      </div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>&rarr;</span>
                    </button>
                  )
                })}
              </div>

              <div style={{ borderTop: '1px solid var(--border-default)', margin: '0.5rem 0' }} />

              <button
                className="btn-primary"
                onClick={() => {
                  setIsSelectionOpen(false)
                  setSelectedDate(selectionDate)
                  setSelectedEvent(null)
                  setIsModalOpen(true)
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  width: '100%',
                  padding: '0.75rem'
                }}
              >
                <PlusIcon size={16} /> Log New Activity
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
