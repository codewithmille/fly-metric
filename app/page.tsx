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
    <div className="calendar-loading" style={{ padding: '4rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.85rem' }}>
      <img src="/icon.png" alt="Loading" style={{ width: '56px', height: '56px', objectFit: 'contain', animation: 'pulse 1.5s ease-in-out infinite' }} />
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
  birthdate?: string | null
  strain?: string | null
  status?: string | null
  notes?: string | null
  sire?: string | null
  dam?: string | null
  rfidTag?: string | null
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
        justifyContent: 'center', background: 'radial-gradient(circle at 50% 42%, #111c24 0%, #090d16 70%)',
        flexDirection: 'column', gap: '1.1rem'
      }}>
        <img
          src="/icon.png"
          alt="FlyMetric"
          style={{
            width: '96px',
            height: '96px',
            objectFit: 'contain',
            filter: 'drop-shadow(0 6px 20px rgba(34,197,94,0.3))',
            animation: 'pulse 1.6s ease-in-out infinite'
          }}
        />
        <div className="loading-spinner" />
        <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.82rem', fontWeight: 600, letterSpacing: '0.04em' }}>
          Loading FlyMetric…
        </span>
      </div>
    )
  }

  if (!session) {
    return <LandingPage />
  }

  // ── Stats & Visual Telemetry (2nd-Image Style Analytics) ──
  const today = new Date().toISOString().split('T')[0]
  const flightEvents = events.filter(e => e.extendedProps?.club === 'Race' || e.extendedProps?.club === 'Training')
  const totalBirds = flightEvents.reduce((sum, e) => sum + (e.extendedProps?.totalBirds || 0), 0)
  const maxSpeed = flightEvents.reduce((max, e) => Math.max(max, e.extendedProps?.maxSpeed || 0), 0)
  const totalTrainings = events.filter(e => e.extendedProps?.club === 'Training').length
  const totalRaces = events.filter(e => !e.extendedProps?.club || e.extendedProps?.club === 'Race').length
  const totalMedications = events.filter(e => e.extendedProps?.club === 'Medication').length
  const totalTasks = events.filter(e => e.extendedProps?.club === 'Task').length
  const totalAllEvents = Math.max(1, totalRaces + totalTrainings + totalMedications + totalTasks)

  const racePct = Math.round((totalRaces / totalAllEvents) * 100)
  const trainingPct = Math.round((totalTrainings / totalAllEvents) * 100)
  const medPct = Math.round((totalMedications / totalAllEvents) * 100)
  const taskPct = Math.max(0, 100 - racePct - trainingPct - medPct)

  // Donut SVG circumferences (r = 54 => C ≈ 339.29)
  const donutC = 2 * Math.PI * 54
  const segRace = (racePct / 100) * donutC
  const segTrain = (trainingPct / 100) * donutC
  const segMed = (medPct / 100) * donutC
  const segTask = (taskPct / 100) * donutC

  // Active birds vs total registered radial percentages
  const activeBirdsCount = registeredBirds.filter(b => !b.status || b.status.toLowerCase() === 'active').length
  const activeRegistryPct = registeredBirds.length > 0 ? Math.round((activeBirdsCount / registeredBirds.length) * 100) : 100
  const clockedEventsCount = flightEvents.filter(e => (e.extendedProps?.maxSpeed || 0) > 0 || (e.extendedProps?.totalBirds || 0) > 0).length
  const flightCompletionPct = flightEvents.length > 0 ? Math.round((clockedEventsCount / flightEvents.length) * 100) : 0

  // Top 3 Leaderboard Pigeons
  const leaderboardBirds = (() => {
    const map = new Map<string, { ringNo: string; maxSpeed: number; flights: number; name?: string | null; color?: string }>()
    flightEvents.forEach((ev) => {
      try {
        const list: Array<{ ringNo: string; speed?: number }> = JSON.parse(ev.extendedProps?.birds || '[]')
        if (Array.isArray(list)) {
          list.forEach((item) => {
            if (!item.ringNo) return
            const key = item.ringNo.toUpperCase()
            const spd = Number(item.speed) || 0
            const prev = map.get(key)
            const reg = registeredBirds.find(r => r.ringNo.toUpperCase() === key)
            if (!prev) {
              map.set(key, { ringNo: item.ringNo, maxSpeed: spd, flights: 1, name: reg?.name, color: reg?.color })
            } else {
              prev.flights += 1
              if (spd > prev.maxSpeed) prev.maxSpeed = spd
            }
          })
        }
      } catch {
        // ignore
      }
    })
    const sorted = Array.from(map.values()).sort((a, b) => b.maxSpeed - a.maxSpeed || b.flights - a.flights)
    if (sorted.length > 0) return sorted.slice(0, 3)
    // Fallback to registered birds if no clocked flights yet
    return registeredBirds.slice(0, 3).map((b) => ({
      ringNo: b.ringNo,
      maxSpeed: 0,
      flights: 0,
      name: b.name,
      color: b.color,
    }))
  })()

  // 6-Bar chart data (recent flight events or activity counts)
  const barChartItems = (() => {
    const recent = [...flightEvents].slice(0, 6).reverse()
    if (recent.length >= 3) {
      // Use a consistent metric per bar (prefer distance km or bird count if speeds are 0)
      const rawValues = recent.map((e, idx) => {
        const spd = Number(e.extendedProps?.maxSpeed) || 0
        const dist = Number(e.extendedProps?.distance) || 0
        const birds = Number(e.extendedProps?.totalBirds) || 0
        if (spd > 0) return spd
        if (dist > 0) return dist
        if (birds > 0) return birds * 25
        // Visually balanced stepped height for scheduled races without telemetry yet
        return [55, 75, 100, 68, 48, 62][idx % 6]
      })
      const peak = Math.max(1, ...rawValues)
      const peakIdx = rawValues.indexOf(peak)
      return recent.map((e, idx) => {
        const val = rawValues[idx]
        return {
          label: e.title.replace(/^Race:\s*/i, '').slice(0, 7),
          value: val,
          heightPct: Math.max(32, Math.round((val / peak) * 100)),
          active: idx === peakIdx,
        }
      })
    }
    const fallbackVals = [
      { label: 'Races', value: Math.max(1, totalRaces) },
      { label: 'Tosses', value: Math.max(1, totalTrainings) },
      { label: 'Birds', value: Math.max(1, totalBirds) },
      { label: 'Loft', value: Math.max(1, registeredBirds.length) },
      { label: 'Meds', value: Math.max(1, totalMedications) },
      { label: 'Tasks', value: Math.max(1, totalTasks) },
    ]
    const peak = Math.max(1, ...fallbackVals.map(v => v.value))
    const peakIdx = fallbackVals.findIndex(v => v.value === peak)
    return fallbackVals.map((v, i) => ({
      ...v,
      heightPct: Math.max(32, Math.round((v.value / peak) * 100)),
      active: i === (peakIdx >= 0 ? peakIdx : 0),
    }))
  })()

  const STATS = [
    {
      icon: <BirdIcon size={20} />,
      iconClass: 'stat-icon-gold',
      value: totalBirds.toLocaleString(),
      prefix: '+',
      label: 'Total Birds Flown',
      badge: 'Flown',
      valueColor: '#FFC107',
      ringBg: 'rgba(255, 193, 7, 0.14)',
      ringBorder: 'rgba(255, 193, 7, 0.35)',
    },
    {
      icon: <LightningIcon size={20} />,
      iconClass: 'stat-icon-blue',
      value: maxSpeed > 0 ? maxSpeed.toLocaleString() : '0',
      prefix: '',
      label: 'Max Speed (m/min)',
      badge: 'Velocity',
      valueColor: '#38bdf8',
      ringBg: 'rgba(56, 189, 248, 0.14)',
      ringBorder: 'rgba(56, 189, 248, 0.35)',
    },
    {
      icon: <TrainingIcon size={20} />,
      iconClass: 'stat-icon-green',
      value: totalTrainings.toLocaleString(),
      prefix: '+',
      label: 'Training Tosses',
      badge: 'Tosses',
      valueColor: '#10b981',
      ringBg: 'rgba(16, 185, 129, 0.14)',
      ringBorder: 'rgba(16, 185, 129, 0.35)',
    },
    {
      icon: <TrophyIcon size={20} />,
      iconClass: 'stat-icon-purple',
      value: totalRaces.toLocaleString(),
      prefix: '+',
      label: 'Races Competed',
      badge: 'Season',
      valueColor: '#c084fc',
      ringBg: 'rgba(192, 132, 252, 0.14)',
      ringBorder: 'rgba(192, 132, 252, 0.35)',
    },
  ]

  const user: User = session.user
  const avatarUrl = user.user_metadata?.avatar_url as string | undefined
  const displayName = (user.user_metadata?.full_name as string | undefined) || user.email || 'Fancier'
  const loftName = (user.user_metadata?.loft_name as string | undefined) || ''
  const initials = displayName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div data-theme="dark" className="dashboard bg-base-100 text-base-content">
      {/* ── Navigation ────────────────────────────────── */}
      <nav className="dashboard-nav border-b border-white/10 bg-base-200/80 backdrop-blur-xl">
        <div className="nav-brand">
          <div className="nav-logo" aria-hidden="true" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', boxShadow: '0 0 14px rgba(16, 185, 129, 0.2)' }}>
            <img src="/icon.png" alt="FlyMetric" style={{ width: '30px', height: '30px', objectFit: 'contain' }} />
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
          <span className="nav-badge hidden md:inline-flex">MY LOFT</span>
          {isOfflineMode ? (
            <span className="nav-badge hidden md:inline-flex" style={{ backgroundColor: 'rgba(255, 143, 0, 0.15)', border: '1px solid rgba(255, 143, 0, 0.3)', color: '#FF8F00', alignItems: 'center', gap: '0.35rem', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600 }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#FF8F00', display: 'inline-block' }}></span>
              Offline
            </span>
          ) : (
            <span className="nav-badge hidden md:inline-flex" style={{ backgroundColor: 'rgba(76, 175, 80, 0.15)', border: '1px solid rgba(76, 175, 80, 0.3)', color: '#4CAF50', alignItems: 'center', gap: '0.35rem', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600 }}>
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

        {/* ── 2nd-Image Style Loft Telemetry & Stats Dashboard ── */}
        <section
          aria-label="Loft statistics"
          className="flex flex-col gap-3.5 sm:gap-5 mb-5 sm:mb-7 w-full min-w-0"
        >
          {/* Top Row: 4 Sleek Circular-Badge Stat Cards */}
          <div
            className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5 lg:gap-4.5 w-full min-w-0"
          >
            {STATS.map((s) => (
              <div
                key={s.label}
                className="group rounded-2xl bg-base-200/85 border border-white/10 hover:border-primary/50 shadow-xl transition-all duration-200 hover:-translate-y-0.5 p-3 sm:p-3.5 lg:p-4.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3 min-w-0"
              >
                {/* On Mobile: Top row is Icon + Badge. On Desktop: Icon on left */}
                <div className="flex items-center justify-between w-full sm:w-auto sm:justify-start gap-2.5 sm:gap-3 min-w-0">
                  <div
                    className="transition-transform duration-200 group-hover:scale-105 shrink-0"
                    style={{
                      width: '2.5rem',
                      height: '2.5rem',
                      borderRadius: '9999px',
                      background: s.ringBg,
                      border: `1px solid ${s.ringBorder}`,
                      color: s.valueColor,
                      boxShadow: `0 4px 14px ${s.ringBg}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {s.icon}
                  </div>
                  {/* Badge shown on top-right on mobile */}
                  <span
                    className="sm:hidden shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{
                      background: s.ringBg,
                      border: `1px solid ${s.ringBorder}`,
                      color: s.valueColor,
                    }}
                  >
                    {s.badge}
                  </span>
                  {/* Desktop text next to icon */}
                  <div className="min-w-0 hidden sm:block">
                    <div
                      className="font-mono font-extrabold tracking-tight truncate text-xl lg:text-2xl"
                      style={{
                        color: s.valueColor,
                        lineHeight: 1.15,
                      }}
                    >
                      {s.prefix}{s.value}
                    </div>
                    <div
                      className="font-medium text-base-content/60 truncate text-xs mt-0.5"
                    >
                      {s.label}
                    </div>
                  </div>
                </div>

                {/* Mobile text below icon */}
                <div className="sm:hidden min-w-0 w-full mt-0.5">
                  <div
                    className="font-mono font-extrabold tracking-tight truncate text-lg"
                    style={{ color: s.valueColor, lineHeight: 1.15 }}
                  >
                    {s.prefix}{s.value}
                  </div>
                  <div
                    className="font-medium text-base-content/60 truncate text-[11px] mt-0.5"
                  >
                    {s.label}
                  </div>
                </div>

                {/* Desktop badge on far right */}
                <span
                  className="hidden sm:inline-flex shrink-0 text-[11px] font-bold px-2.5 py-0.5 rounded-full"
                  style={{
                    background: s.ringBg,
                    border: `1px solid ${s.ringBorder}`,
                    color: s.valueColor,
                  }}
                >
                  {s.badge}
                </span>
              </div>
            ))}
          </div>

          {/* Second Row: 3-Column Visual Telemetry Cards */}
          <div
            className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-4.5 w-full min-w-0"
          >
            {/* Card 1: Multi-Segment Donut Ring Chart */}
            <div
              className="lg:col-span-4 rounded-2xl bg-base-200/85 border border-white/10 shadow-xl flex flex-col justify-between p-4 sm:p-5 lg:p-6 min-w-0 gap-3 sm:gap-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-info shadow-[0_0_8px_#38bdf8]" />
                  <span className="text-sm font-extrabold text-base-content">Loft Activity Mix</span>
                </div>
                <span className="text-[11px] font-semibold text-base-content/50">Unit: Events</span>
              </div>

              {/* Multi-Color SVG Donut Gauge */}
              <div className="relative mx-auto flex h-40 w-40 sm:h-44 sm:w-44 items-center justify-center my-1">
                <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90 transform">
                  {/* Track */}
                  <circle
                    cx="70"
                    cy="70"
                    r="54"
                    fill="transparent"
                    stroke="rgba(255,255,255,0.06)"
                    strokeWidth="12"
                  />
                  {/* Segment 1: Races (Amber #FFC107) */}
                  <circle
                    cx="70"
                    cy="70"
                    r="54"
                    fill="transparent"
                    stroke="#FFC107"
                    strokeWidth="12"
                    strokeLinecap="round"
                    strokeDasharray={`${segRace} ${donutC}`}
                    strokeDashoffset={0}
                  />
                  {/* Segment 2: Training (Emerald #10b981) */}
                  {segTrain > 0 && (
                    <circle
                      cx="70"
                      cy="70"
                      r="54"
                      fill="transparent"
                      stroke="#10b981"
                      strokeWidth="12"
                      strokeLinecap="round"
                      strokeDasharray={`${segTrain} ${donutC}`}
                      strokeDashoffset={-segRace}
                    />
                  )}
                  {/* Segment 3: Medical (Blue #38bdf8) */}
                  {segMed > 0 && (
                    <circle
                      cx="70"
                      cy="70"
                      r="54"
                      fill="transparent"
                      stroke="#38bdf8"
                      strokeWidth="12"
                      strokeLinecap="round"
                      strokeDasharray={`${segMed} ${donutC}`}
                      strokeDashoffset={-(segRace + segTrain)}
                    />
                  )}
                  {/* Segment 4: Tasks (Purple #c084fc) */}
                  {segTask > 0 && (
                    <circle
                      cx="70"
                      cy="70"
                      r="54"
                      fill="transparent"
                      stroke="#c084fc"
                      strokeWidth="12"
                      strokeLinecap="round"
                      strokeDasharray={`${segTask} ${donutC}`}
                      strokeDashoffset={-(segRace + segTrain + segMed)}
                    />
                  )}
                </svg>

                {/* Center Readout */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-400">
                    ↑ {racePct}% Race
                  </span>
                  <span className="font-mono text-2xl font-black text-base-content tracking-tight leading-tight">
                    +{events.length}
                  </span>
                  <span className="text-[11px] text-base-content/50 font-medium">
                    Total Logs
                  </span>
                </div>
              </div>

              {/* 4-Category Legend with Percentages */}
              <div
                className="grid grid-cols-4 border-t border-white/5 text-center gap-1 sm:gap-2 pt-3"
              >
                <div>
                  <div className="flex items-center justify-center gap-1 text-[10px] text-base-content/60">
                    <span className="h-2 w-2 rounded-xs bg-[#FFC107]" />
                    <span>Races</span>
                  </div>
                  <div className="font-mono text-xs font-bold text-base-content mt-0.5">{racePct}%</div>
                </div>
                <div>
                  <div className="flex items-center justify-center gap-1 text-[10px] text-base-content/60">
                    <span className="h-2 w-2 rounded-xs bg-[#10b981]" />
                    <span>Tosses</span>
                  </div>
                  <div className="font-mono text-xs font-bold text-base-content mt-0.5">{trainingPct}%</div>
                </div>
                <div>
                  <div className="flex items-center justify-center gap-1 text-[10px] text-base-content/60">
                    <span className="h-2 w-2 rounded-xs bg-[#38bdf8]" />
                    <span>Medical</span>
                  </div>
                  <div className="font-mono text-xs font-bold text-base-content mt-0.5">{medPct}%</div>
                </div>
                <div>
                  <div className="flex items-center justify-center gap-1 text-[10px] text-base-content/60">
                    <span className="h-2 w-2 rounded-xs bg-[#c084fc]" />
                    <span>Tasks</span>
                  </div>
                  <div className="font-mono text-xs font-bold text-base-content mt-0.5">{taskPct}%</div>
                </div>
              </div>
            </div>

            {/* Card 2: Active Telemetry Bar Chart + Dual Radial Progress Rings */}
            <div
              className="lg:col-span-4 rounded-2xl bg-base-200/85 border border-white/10 shadow-xl flex flex-col justify-between p-4 sm:p-5 lg:p-6 min-w-0 gap-3 sm:gap-4"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-primary shadow-[0_0_8px_#FFC107]" />
                    <span className="text-sm font-extrabold text-base-content">Active Loft Telemetry</span>
                  </div>
                  <span className="badge badge-ghost badge-xs border-white/10">Season</span>
                </div>

                {/* 3 Summary Columns */}
                <div className="grid grid-cols-3 text-left gap-2 sm:gap-3 mb-3.5">
                  <div>
                    <div className="font-mono text-base font-extrabold text-base-content">
                      {events.length}
                    </div>
                    <div className="text-[11px] text-base-content/50">Total Events</div>
                  </div>
                  <div>
                    <div className="font-mono text-base font-extrabold text-info">
                      +{registeredBirds.length}
                    </div>
                    <div className="text-[11px] text-base-content/50">Loft Birds</div>
                  </div>
                  <div>
                    <div className="font-mono text-base font-extrabold text-emerald-400">
                      {activeBirdsCount}
                    </div>
                    <div className="text-[11px] text-base-content/50">Active Flyers</div>
                  </div>
                </div>

                {/* 6-Bar Vertical Chart */}
                <div
                  className="flex items-end justify-between border-b border-white/5 h-24 gap-2 pt-1 pb-2 px-0.5"
                >
                  {barChartItems.map((bar, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center h-full justify-end gap-1.5 min-w-0">
                      <div className="w-full flex items-end justify-center h-16">
                        <div
                          className="w-full max-w-[20px] rounded-t-md transition-all duration-300"
                          style={{
                            height: `${bar.heightPct}%`,
                            background: bar.active
                              ? 'linear-gradient(180deg, #38bdf8 0%, #0284c7 100%)'
                              : 'rgba(56, 189, 248, 0.24)',
                            boxShadow: bar.active ? '0 0 14px rgba(56, 189, 248, 0.45)' : 'none',
                          }}
                          title={`${bar.label}: ${bar.value}`}
                        />
                      </div>
                      <span
                        className={`text-[9px] font-semibold truncate max-w-full rounded px-1 ${
                          bar.active ? 'bg-primary text-primary-content font-extrabold' : 'text-base-content/55'
                        }`}
                      >
                        {bar.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom Dual Radial Progress Rings */}
              <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
                <div
                  onClick={() => setIsRegistryOpen(true)}
                  className="cursor-pointer rounded-xl bg-base-100/75 border border-white/5 hover:border-info/40 flex items-center p-2 sm:p-2.5 gap-2 min-w-0 transition-all"
                >
                  <div
                    className="radial-progress text-info text-[9px] sm:text-[10px] font-mono font-bold shrink-0"
                    style={{ '--value': activeRegistryPct, '--size': '2.6rem', '--thickness': '3.5px' } as React.CSSProperties}
                    role="progressbar"
                  >
                    {activeRegistryPct}%
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-base-content truncate">Loft Ready</div>
                    <div className="text-[10px] text-base-content/50 truncate mt-0.5">
                      {registeredBirds.length} Registered
                    </div>
                  </div>
                </div>

                <div
                  onClick={() => setIsHistoryOpen(true)}
                  className="cursor-pointer rounded-xl bg-base-100/75 border border-white/5 hover:border-emerald-500/40 flex items-center p-2 sm:p-2.5 gap-2 min-w-0 transition-all"
                >
                  <div
                    className="radial-progress text-emerald-400 text-[9px] sm:text-[10px] font-mono font-bold shrink-0"
                    style={{ '--value': flightCompletionPct, '--size': '2.6rem', '--thickness': '3.5px' } as React.CSSProperties}
                    role="progressbar"
                  >
                    {flightCompletionPct}%
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-base-content truncate">Clocked</div>
                    <div className="text-[10px] text-base-content/50 truncate mt-0.5">
                      {clockedEventsCount} Flights
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 3: Top Performers Leaderboard */}
            <div
              className="lg:col-span-4 rounded-2xl bg-base-200/85 border border-white/10 shadow-xl flex flex-col justify-between p-4 sm:p-5 lg:p-6 min-w-0 gap-3 sm:gap-4"
            >
              <div>
                <div className="flex items-center justify-between mb-3.5">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#10b981]" />
                    <span className="text-sm font-extrabold text-base-content">Loft Leaderboard</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsHistoryOpen(true)}
                    className="text-xs font-semibold text-base-content/50 hover:text-primary transition-colors cursor-pointer bg-transparent border-none"
                  >
                    More &gt;
                  </button>
                </div>

                {leaderboardBirds.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                    {leaderboardBirds.map((bird, idx) => {
                      const rankColors = [
                        { badge: 'bg-rose-500 text-white', speed: 'text-rose-400' },
                        { badge: 'bg-amber-400 text-black', speed: 'text-amber-400' },
                        { badge: 'bg-sky-400 text-black', speed: 'text-sky-400' },
                      ][idx] || { badge: 'bg-base-300 text-white', speed: 'text-base-content' }

                      return (
                        <div
                          key={bird.ringNo}
                          onClick={() => setIsRegistryOpen(true)}
                          className="cursor-pointer flex items-center justify-between rounded-xl bg-base-100/75 border border-white/5 hover:border-white/15 transition-all"
                          style={{ padding: '0.7rem 0.9rem', gap: '0.75rem' }}
                        >
                          <div className="flex items-center min-w-0" style={{ gap: '0.75rem' }}>
                            <div className="relative shrink-0">
                              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-base-200 border border-white/10">
                                <img src="/icon.png" alt={bird.ringNo} className="h-7 w-7 object-contain" />
                              </div>
                              <span
                                className={`absolute -top-1.5 -left-1.5 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-black shadow ${rankColors.badge}`}
                              >
                                {idx + 1}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-extrabold text-base-content truncate">
                                {bird.name ? `${bird.name} (${bird.ringNo})` : bird.ringNo}
                              </div>
                              <div className="text-[10px] text-base-content/50 truncate" style={{ marginTop: '0.15rem' }}>
                                {bird.color || 'Registered Racer'} • Total of {bird.flights} {bird.flights === 1 ? 'flight' : 'flights'}
                              </div>
                            </div>
                          </div>

                          <div className={`font-mono text-xs font-extrabold shrink-0 ${rankColors.speed}`}>
                            {bird.maxSpeed > 0 ? `+${bird.maxSpeed.toFixed(1)}` : 'Active'}
                          </div>
                        </div>
                      )
                    })}

                    {/* If fewer than 3 birds exist, show subtle open rank slots so the card stays balanced */}
                    {leaderboardBirds.length < 3 &&
                      Array.from({ length: 3 - leaderboardBirds.length }).map((_, emptyIdx) => {
                        const slotNum = leaderboardBirds.length + emptyIdx + 1
                        return (
                          <div
                            key={`open-slot-${slotNum}`}
                            onClick={() => setIsRegistryOpen(true)}
                            className="cursor-pointer flex items-center justify-between rounded-xl bg-base-100/35 border border-dashed border-white/10 hover:border-primary/40 transition-all"
                            style={{ padding: '0.65rem 0.9rem', gap: '0.75rem' }}
                          >
                            <div className="flex items-center min-w-0" style={{ gap: '0.75rem' }}>
                              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-base-200/60 border border-white/5 text-[11px] font-black text-base-content/40">
                                #{slotNum}
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-semibold text-base-content/50 truncate">
                                  Open Leaderboard Slot
                                </div>
                                <div className="text-[10px] text-base-content/35 truncate">
                                  Click to register or clock another racer
                                </div>
                              </div>
                            </div>
                            <span className="text-[10px] font-bold text-primary/70">+ Add</span>
                          </div>
                        )
                      })}
                  </div>
                ) : (
                  <div
                    className="flex flex-col items-center justify-center text-center rounded-xl bg-base-100/50 border border-dashed border-white/10"
                    style={{ padding: '1.75rem 1rem' }}
                  >
                    <img src="/icon.png" alt="No birds" className="h-10 w-10 object-contain opacity-60 mb-2" />
                    <div className="text-xs font-bold text-base-content/80">No Pigeons Ranked Yet</div>
                    <p className="text-[11px] text-base-content/50 mt-0.5 mb-3">
                      Register birds or clock a race to populate your speed leaderboard.
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsRegistryOpen(true)}
                      className="btn btn-primary btn-xs font-bold"
                    >
                      + Register Birds
                    </button>
                  </div>
                )}
              </div>

              <div
                className="border-t border-white/5 flex items-center justify-between text-[11px] text-base-content/50"
                style={{ paddingTop: '0.85rem' }}
              >
                <span>Top Velocity Unit</span>
                <span className="font-mono font-bold text-primary">meters / min (m/min)</span>
              </div>
            </div>
          </div>
        </section>

        {/* Activities List / Calendar Card */}
        <section className="calendar-card bg-base-200/70 border border-white/10 shadow-xl" aria-label="Loft activities and calendar">
          <div className="calendar-card-header border-b border-white/10" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
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
              {/* daisyUI Segmented Control Switcher */}
              <div role="tablist" className="tabs tabs-box tabs-xs bg-base-100/80 border border-white/10 p-1 gap-1">
                <button
                  type="button"
                  role="tab"
                  onClick={() => setViewMode('list')}
                  className={`tab font-bold px-3 ${viewMode === 'list' ? 'tab-active !bg-primary !text-primary-content' : 'text-base-content/70'}`}
                >
                  📝 List
                </button>
                <button
                  type="button"
                  role="tab"
                  onClick={() => setViewMode('calendar')}
                  className={`tab font-bold px-3 ${viewMode === 'calendar' ? 'tab-active !bg-primary !text-primary-content' : 'text-base-content/70'}`}
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
            <div style={{ padding: '3rem 1.5rem', textAlign: 'center', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
              <img src="/icon.png" alt="Loading" style={{ width: '56px', height: '56px', objectFit: 'contain', animation: 'pulse 1.5s ease-in-out infinite' }} />
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
        onOpenRegistryTrigger={() => {
          setIsProfileOpen(false) // Close the profile modal so user doesn't have stacked modals
          setIsRegistryOpen(true)
        }}
      />

      {/* ── Bird Registry Modal ─────────────────────────── */}
      <BirdRegistryModal
        isOpen={isRegistryOpen}
        onClose={() => setIsRegistryOpen(false)}
        onBirdsUpdated={fetchBirds}
        authToken={session?.access_token}
        events={events}
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
        registeredBirds={registeredBirds}
        events={events}
        loftName={loftName}
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
              ? 'linear-gradient(135deg, #064e3b, #022c22)'
              : 'linear-gradient(135deg, #111c24, #090d16)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: isChatOpen
              ? '0 0 0 3px rgba(16,185,129,0.5), 0 4px 16px rgba(16,185,129,0.4)'
              : '0 0 0 2px rgba(16,185,129,0.35), 0 4px 12px rgba(16,185,129,0.25)',
            marginTop: '-18px',
            border: '2px solid rgba(16,185,129,0.4)',
            transition: 'all 0.2s ease',
            flexShrink: 0,
          }}>
            <img src="/icon.png" alt="FlyMetric AI" style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
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
