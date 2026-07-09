'use client'

import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import ActivityModal from '@/components/ActivityModal'
import QuickClockInModal from '@/components/QuickClockInModal'
import BirdRegistryModal from '@/components/BirdRegistryModal'
import LandingPage from '@/components/LandingPage'
import ProfileModal from '@/components/ProfileModal'
import VerifyPhotoModal from '@/components/VerifyPhotoModal'
import ResultsHistoryModal from '@/components/ResultsHistoryModal'
import SpeedCalculatorModal from '@/components/SpeedCalculatorModal'
import TrainingProgramModal from '@/components/TrainingProgramModal'
import PigeonChatModal from '@/components/PigeonChatModal'
import { BirdIcon, LightningIcon, TrainingIcon, TrophyIcon, PlusIcon, CalendarIcon, PillIcon, NotesIcon, CalculatorIcon } from '@/components/icons'
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
  const [isVerifyPhotoOpen, setIsVerifyPhotoOpen] = useState(false)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedEvent, setSelectedEvent] = useState<RaceEvent | null>(null)

  // Day Selection States (for resolving clicks when multiple events occupy the same day)
  const [isSelectionOpen, setIsSelectionOpen] = useState(false)
  const [selectionDate, setSelectionDate] = useState('')
  const [selectionEvents, setSelectionEvents] = useState<RaceEvent[]>([])

  const [isOfflineMode, setIsOfflineMode] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('list')
  const [modalIsClockInOnly, setModalIsClockInOnly] = useState(false)
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false)
  const [isTrainingOpen, setIsTrainingOpen] = useState(false)
  const [isChatOpen, setIsChatOpen] = useState(false)

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

  const navigateToTab = (tabName: 'addEvent' | 'clockIn' | 'camera' | 'history' | 'profile' | 'home' | 'chat') => {
    setIsModalOpen(false)
    setIsSelectionOpen(false)
    setIsClockInOpen(false)
    setIsVerifyPhotoOpen(false)
    setIsHistoryOpen(false)
    setIsProfileOpen(false)
    setIsChatOpen(false)

    if (tabName === 'addEvent') {
      openModal(today)
    } else if (tabName === 'clockIn') {
      setIsClockInOpen(true)
    } else if (tabName === 'camera') {
      setIsVerifyPhotoOpen(true)
    } else if (tabName === 'history') {
      setIsHistoryOpen(true)
    } else if (tabName === 'profile') {
      setIsProfileOpen(true)
    } else if (tabName === 'chat') {
      setIsChatOpen(true)
    }
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
  const loftName = (user.user_metadata?.loft_name as string | undefined) || ''
  const initials = displayName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="dashboard">
      {/* ── Navigation ────────────────────────────────── */}
      <nav className="dashboard-nav">
        <div className="nav-brand">
          <div className="nav-logo" aria-hidden="true" style={{ display: 'flex', alignItems: 'center' }}>
            <img src="/icon.png" alt="FlyMetric" style={{ width: '26px', height: '26px', objectFit: 'contain' }} />
          </div>
          <h1 className="nav-title">
            Fly<span>Metric</span>
            {loftName && (
              <span className="mobile-loft-subtitle" style={{
                display: 'none',
                fontSize: '0.72rem',
                color: 'var(--brand-gold)',
                fontWeight: 700,
                marginLeft: '0.5rem',
                borderLeft: '1px solid rgba(255,255,255,0.15)',
                paddingLeft: '0.5rem',
                textTransform: 'uppercase',
                verticalAlign: 'middle'
              }}>
                {loftName}
              </span>
            )}
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
            id="training-prog-nav"
            className="nav-btn nav-btn-secondary"
            onClick={() => setIsTrainingOpen(true)}
            aria-label="Training Program"
            style={{
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: '#10b981',
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
            <TrainingIcon size={16} /> <span className="nav-btn-text">Training Program</span>
          </button>
          <button
            id="speed-calc-nav"
            className="nav-btn nav-btn-secondary"
            onClick={() => setIsCalculatorOpen(true)}
            aria-label="Speed Calculator"
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
            <CalculatorIcon size={16} /> <span className="nav-btn-text">Speed Calculator</span>
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
            id="verify-photo-nav"
            className="nav-btn nav-btn-secondary"
            onClick={() => setIsVerifyPhotoOpen(true)}
            aria-label="Verify clock-in photo"
            style={{
              background: 'rgba(33, 150, 243, 0.1)',
              border: '1px solid rgba(33, 150, 243, 0.3)',
              color: '#2196F3',
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
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ flexShrink: 0 }}
            >
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
            <span className="nav-btn-text">Verify Photos</span>
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

          {/* ── Camera / Verify Photos icon ── */}
          <button
            id="verify-photo-nav-icon"
            onClick={() => setIsVerifyPhotoOpen(true)}
            aria-label="Verify clock-in photo"
            title="Verify Photos"
            style={{
              background: 'rgba(33, 150, 243, 0.08)',
              border: '1px solid rgba(33, 150, 243, 0.25)',
              borderRadius: '0.5rem',
              color: '#2196F3',
              cursor: 'pointer',
              padding: '0.4rem 0.55rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(33,150,243,0.18)'
              e.currentTarget.style.borderColor = 'rgba(33,150,243,0.5)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(33,150,243,0.08)'
              e.currentTarget.style.borderColor = 'rgba(33,150,243,0.25)'
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
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

        {/* Activities List / Calendar Card */}
        <section className="calendar-card" aria-label="Loft activities and calendar">
          <div className="calendar-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ minWidth: '180px' }}>
              <div className="calendar-card-title" style={{ fontSize: '1.1rem', fontWeight: 800 }}>
                Loft Activities & Flights
              </div>
              <span className="calendar-card-hint">
                {viewMode === 'calendar' ? 'Click date to log or edit events' : 'Grouped chronologically by date'}
              </span>
            </div>

            {/* Toggle view and Add Activity buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              {/* Segmented Control Switcher */}
              <div style={{
                display: 'flex',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--border-default)',
                borderRadius: '0.5rem',
                padding: '2px',
                gap: '2px'
              }}>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  style={{
                    padding: '0.35rem 0.65rem',
                    borderRadius: '0.375rem',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: 'none',
                    background: viewMode === 'list' ? 'var(--brand-gold)' : 'transparent',
                    color: viewMode === 'list' ? '#000' : 'var(--text-secondary)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  📝 List
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('calendar')}
                  style={{
                    padding: '0.35rem 0.65rem',
                    borderRadius: '0.375rem',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: 'none',
                    background: viewMode === 'calendar' ? 'var(--brand-gold)' : 'transparent',
                    color: viewMode === 'calendar' ? '#000' : 'var(--text-secondary)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  📅 Calendar
                </button>
              </div>


              <button
                onClick={() => {
                  setSelectedDate(today)
                  setSelectedEvent(null)
                  setIsModalOpen(true)
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.45rem 0.75rem',
                  background: 'rgba(255, 193, 7, 0.08)',
                  border: '1px solid var(--brand-gold)',
                  borderRadius: '0.375rem',
                  color: 'var(--brand-gold)',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  height: '1.9rem'
                }}
                className="menu-item-hover"
              >
                <PlusIcon size={12} /> Log Activity
              </button>
            </div>
          </div>

          {loading ? (
            <div style={{ padding: '3rem 1.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <div className="loading-spinner" style={{ margin: '0 auto 1rem auto' }} />
              <span>Loading activities...</span>
            </div>
          ) : viewMode === 'calendar' ? (
            /* CALENDAR VIEW MODE */
            <div style={{ padding: '0.5rem' }}>
              <RaceCalendar events={events} loading={loading} onDateClick={openModal} />
            </div>
          ) : events.length === 0 ? (
            /* EMPTY STATE */
            <div style={{ padding: '3rem 1.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📅</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>No Loft Activities Logged</div>
              <p style={{ fontSize: '0.75rem', marginTop: '0.25rem', maxWidth: '280px', margin: '0.25rem auto 1rem auto' }}>
                Create a training flight or official race to start tracking pigeon velocities.
              </p>
              <button
                className="btn-primary"
                onClick={() => {
                  setSelectedDate(today)
                  setSelectedEvent(null)
                  setIsModalOpen(true)
                }}
                style={{ padding: '0.5rem 1rem', fontSize: '0.75rem', height: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
              >
                <PlusIcon size={12} /> Log First Activity
              </button>
            </div>
          ) : (
            /* GROUPED LIST VIEW MODE WITH DATE HEADERS */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '0.5rem' }}>
              {(() => {
                // Group events by date string
                const groupedEvents: Record<string, RaceEvent[]> = {}
                events.forEach((ev) => {
                  const dateStr = ev.date || ''
                  if (!groupedEvents[dateStr]) {
                    groupedEvents[dateStr] = []
                  }
                  groupedEvents[dateStr].push(ev)
                })

                // Get sorted dates (newest first)
                const sortedDates = Object.keys(groupedEvents).sort((a, b) => new Date(b).getTime() - new Date(a).getTime())

                return sortedDates.map((dateStr) => {
                  const dayEvents = groupedEvents[dateStr]
                  const dateObj = new Date(dateStr)
                  
                  // Format nice header: e.g. "Tuesday, July 7, 2026"
                  const formattedHeaderDate = dateObj.toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                  })

                  return (
                    <div key={dateStr} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {/* Section Date Header */}
                      <div style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        color: 'var(--brand-gold)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        padding: '0.4rem 0.25rem',
                        borderLeft: '2px solid var(--brand-gold)',
                        paddingLeft: '0.5rem',
                        marginTop: '0.5rem',
                        marginBottom: '0.2rem',
                        background: 'rgba(255, 193, 7, 0.02)'
                      }}>
                        {formattedHeaderDate}
                      </div>

                      {/* Day Activities */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                        {dayEvents.map((ev) => {
                          const type = ev.extendedProps?.club || 'Race'
                          const location = ev.extendedProps?.location || 'No location configured'
                          
                          return (
                            <div
                              key={ev.id}
                              onClick={() => {
                                setModalIsClockInOnly(true)
                                openModal(ev.date || '', ev)
                              }}
                              style={{
                                background: 'rgba(255,255,255,0.01)',
                                border: '1px solid var(--border-default)',
                                borderRadius: '0.75rem',
                                padding: '0.88rem 1rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '1rem',
                                transition: 'all 0.15s ease'
                              }}
                              className="selection-item-card"
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0, flex: 1 }}>
                                <span style={{
                                  color: type === 'Training' ? '#2196F3' :
                                         type === 'Medication' ? '#4CAF50' :
                                         type === 'Task' ? '#9C27B0' : 'var(--brand-gold)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  width: '2.2rem',
                                  height: '2.2rem',
                                  borderRadius: '0.5rem',
                                  background: type === 'Training' ? 'rgba(33, 150, 243, 0.08)' :
                                              type === 'Medication' ? 'rgba(76, 175, 80, 0.08)' :
                                              type === 'Task' ? 'rgba(156, 39, 176, 0.08)' : 'rgba(255, 193, 7, 0.08)',
                                  border: type === 'Training' ? '1px solid rgba(33, 150, 243, 0.2)' :
                                          type === 'Medication' ? '1px solid rgba(76, 175, 80, 0.2)' :
                                          type === 'Task' ? '1px solid rgba(156, 39, 176, 0.2)' : '1px solid rgba(255, 193, 7, 0.2)',
                                  flexShrink: 0
                                }}>
                                  {type === 'Training' ? <TrainingIcon size={18} /> :
                                   type === 'Medication' ? <PillIcon size={18} /> :
                                   type === 'Task' ? <NotesIcon size={18} /> :
                                   <TrophyIcon size={18} />}
                                </span>
                                
                                <div style={{ minWidth: 0 }}>
                                  <div style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.15rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {ev.title}
                                  </div>
                                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'flex', flexWrap: 'wrap', gap: '0.4rem 0.6rem', alignItems: 'center' }}>
                                    <span style={{ fontWeight: 600, color: 'var(--brand-gold)' }}>{type}</span>
                                    <span style={{ color: 'var(--text-muted)' }}>•</span>
                                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '180px' }}>📍 {location}</span>
                                  </div>
                                </div>
                              </div>
                              
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation() // prevent opening in clockin mode
                                  setModalIsClockInOnly(false)
                                  openModal(ev.date || '', ev)
                                }}
                                style={{
                                  background: 'rgba(255, 255, 255, 0.05)',
                                  border: '1px solid var(--border-default)',
                                  borderRadius: '0.375rem',
                                  padding: '0.35rem 0.5rem',
                                  color: 'var(--text-secondary)',
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.25rem',
                                  transition: 'all 0.15s ease',
                                  flexShrink: 0
                                }}
                                className="menu-item-hover"
                                title="Edit Event Details"
                              >
                                ✏️ Edit
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })
              })()}
            </div>
          )}
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
        isClockInOnly={modalIsClockInOnly}
      />

      {/* ── Profile settings Modal ──────────────────────── */}
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        session={session}
        onProfileUpdated={refreshSession}
        registeredBirds={registeredBirds}
        onBirdsUpdated={fetchBirds}
        events={events}
        onAddEventTrigger={() => navigateToTab('addEvent')}
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

      {/* ── Verify Photo Modal ───────────────────────── */}
      <VerifyPhotoModal
        isOpen={isVerifyPhotoOpen}
        events={events}
        registeredBirds={registeredBirds}
        onClose={() => setIsVerifyPhotoOpen(false)}
        onClockInSaved={fetchEvents}
        authToken={session.access_token}
      />

      {/* ── Pigeon AI Chat Modal ─────────────────────── */}
      <PigeonChatModal
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
      />

      {/* ── Results History Modal ──────────────────────── */}
      <ResultsHistoryModal
        isOpen={isHistoryOpen}
        events={events}
        onClose={() => setIsHistoryOpen(false)}
      />

      {/* ── Quick Speed Calculator Modal ────────────────── */}
      <SpeedCalculatorModal
        isOpen={isCalculatorOpen}
        onClose={() => setIsCalculatorOpen(false)}
      />

      {/* ── Training Program Modal ──────────────────────── */}
      <TrainingProgramModal
        isOpen={isTrainingOpen}
        onClose={() => setIsTrainingOpen(false)}
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
                  padding: '0.75rem',
                  background: 'rgba(255, 193, 7, 0.04)',
                  border: '1px dashed var(--brand-gold)',
                  borderRadius: '0.625rem',
                  color: 'var(--brand-gold)',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  flex: 'none'
                }}
                className="menu-item-hover"
              >
                <PlusIcon size={14} /> Log New Activity
              </button>
            </div>
          </div>
        </div>
      )}

      {/* React Native-style Mobile Bottom Tab Bar */}
      <div className="mobile-tab-bar">
        <button 
          className={`mobile-tab-btn ${(!isModalOpen && !isSelectionOpen && !isClockInOpen && !isVerifyPhotoOpen && !isHistoryOpen && !isProfileOpen && !isChatOpen) ? 'active' : ''}`}
          onClick={() => navigateToTab('home')}
          aria-label="Loft Dashboard Home"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          <span>Home</span>
        </button>
        <button 
          className={`mobile-tab-btn ${isClockInOpen ? 'active' : ''}`}
          onClick={() => navigateToTab('clockIn')}
          aria-label="Quick Clock-in bird"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          <span>Clock-In</span>
        </button>

        {/* CENTER: AI Chat Button */}
        <button 
          className={`mobile-tab-btn mobile-tab-btn-chat ${isChatOpen ? 'active' : ''}`}
          onClick={() => navigateToTab('chat')}
          aria-label="FlyMetric AI Pigeon Chat"
        >
          <div style={{
            width: '46px', height: '46px',
            borderRadius: '50%',
            background: isChatOpen
              ? 'linear-gradient(135deg, #047857, #065f46)'
              : 'linear-gradient(135deg, #10b981, #047857)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: isChatOpen
              ? '0 0 0 3px rgba(16,185,129,0.4), 0 4px 16px rgba(16,185,129,0.4)'
              : '0 0 0 3px rgba(16,185,129,0.25), 0 4px 12px rgba(16,185,129,0.3)',
            fontSize: '1.35rem',
            marginTop: '-18px',
            border: '3px solid #0d1117',
            transition: 'all 0.2s ease',
            flexShrink: 0,
          }}>
            🕊️
          </div>
          <span style={{ marginTop: '2px' }}>AI Chat</span>
        </button>

        <button 
          className={`mobile-tab-btn ${isHistoryOpen ? 'active' : ''}`}
          onClick={() => navigateToTab('history')}
          aria-label="Loft Results History"
        >
          <TrophyIcon size={20} />
          <span>History</span>
        </button>
        <button 
          className={`mobile-tab-btn ${isProfileOpen ? 'active' : ''}`}
          onClick={() => navigateToTab('profile')}
          aria-label="Loft Profile"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          <span>Profile</span>
        </button>
      </div>
    </div>
  )
}
