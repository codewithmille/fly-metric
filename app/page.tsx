'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import ActivityModal from '@/components/ActivityModal'
import QuickClockInModal from '@/components/QuickClockInModal'
import BirdRegistryModal from '@/components/BirdRegistryModal'
import LandingPage from '@/components/LandingPage'
import ProfileModal from '@/components/ProfileModal'
import VerifyPhotoModal from '@/components/VerifyPhotoModal'
import LoftActivitiesModal from '@/components/LoftActivitiesModal'
import CreateGroupRaceModal from '@/components/CreateGroupRaceModal'
import JoinGroupRaceModal from '@/components/JoinGroupRaceModal'
import GroupRaceCockpitModal from '@/components/GroupRaceCockpitModal'
import SpeedCalculatorModal from '@/components/SpeedCalculatorModal'
import TrainingProgramModal from '@/components/TrainingProgramModal'
import PigeonChatModal from '@/components/PigeonChatModal'
import ElectronicPadModal from '@/components/ElectronicPadModal'
import {
  BirdIcon,
  LightningIcon,
  TrainingIcon,
  TrophyIcon,
  PlusIcon,
  CalendarIcon,
  PillIcon,
  NotesIcon,
  CalculatorIcon,
  AntennaIcon,
  TimerIcon,
  MapPinIcon,
  GlobeIcon,
  EditIcon,
  HomeIcon,
  CameraIcon,
  UserIcon,
} from '@/components/icons'
import type { RaceEvent } from '@/app/api/race-events/route'
import { supabase } from '@/lib/supabase'
import type { Session, User } from '@supabase/supabase-js'
import { getEvents, getBirds, syncOfflineQueue, isOnline, saveEvent, saveBird } from '@/lib/apiClient'
import { useRfidScanner, playElectronicChime, speakPigeonArrival } from '@/hooks/useRfidScanner'

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

  const [events, setEvents] = useState<RaceEvent[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('flymetric_events_cache')
        if (cached) {
          const list = JSON.parse(cached)
          if (Array.isArray(list)) {
            return [...list].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          }
        }
      } catch {}
    }
    return []
  })
  const [registeredBirds, setRegisteredBirds] = useState<LoftBird[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('flymetric_birds_cache')
        if (cached) {
          const list = JSON.parse(cached)
          if (Array.isArray(list)) return list
        }
      } catch {}
    }
    return []
  })
  const [loading, setLoading] = useState(true)
  const [mainTab, setMainTab] = useState<'home' | 'birds' | 'activities' | 'training' | 'profile'>('home')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isClockInOpen, setIsClockInOpen] = useState(false)
  const [isRegistryOpen, setIsRegistryOpen] = useState(false)
  const [isVerifyPhotoOpen, setIsVerifyPhotoOpen] = useState(false)
  const [isActivitiesOpen, setIsActivitiesOpen] = useState(false)
  const [activitiesInitialTab, setActivitiesInitialTab] = useState<'activities' | 'results'>('activities')
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
  const [isPadStationOpen, setIsPadStationOpen] = useState(false)
  const [isCreateGroupRaceOpen, setIsCreateGroupRaceOpen] = useState(false)
  const [isJoinGroupRaceOpen, setIsJoinGroupRaceOpen] = useState(false)
  const [selectedGroupRace, setSelectedGroupRace] = useState<any | null>(null)
  const [activeRfidEventId, setActiveRfidEventId] = useState<string | null>(null)
  const [isTargetDropdownOpen, setIsTargetDropdownOpen] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('flymetric_active_rfid_event_id')
      if (stored) setActiveRfidEventId(stored)
    }
  }, [])
  const [arrivalHud, setArrivalHud] = useState<{
    bird: LoftBird
    speed: number
    time: string
    eventTitle: string
    rank: number
    type: 'success' | 'warning' | 'info'
    message?: string
  } | null>(null)
  const lastScanDebounceRef = useRef<{ [tag: string]: number }>({})

  // Auto-dismiss Grand Arrival HUD after 9 seconds
  useEffect(() => {
    if (arrivalHud) {
      const timer = setTimeout(() => {
        setArrivalHud(null)
      }, 9000)
      return () => clearTimeout(timer)
    }
  }, [arrivalHud])

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
    try {
      setLoading(true)
      const data = await getEvents(session?.access_token)
      if (Array.isArray(data)) {
        const sorted = [...data].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        setEvents(sorted)
      }
    } catch (err) {
      console.error('Error fetching activities:', err)
    } finally {
      setLoading(false)
    }
  }, [session])

  const fetchBirds = useCallback(async () => {
    try {
      const data = await getBirds(session?.access_token)
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
    fetchEvents()
    fetchBirds()
  }, [session, fetchEvents, fetchBirds])

  // ── Global Hands-Free 125kHz RFID Electronic Pad Clocking ──
  const handleGlobalAutoClock = useCallback(async (scannedTag: string) => {
    const rawTag = scannedTag.trim()
    if (!rawTag) return

    const now = Date.now()
    const tagKey = rawTag.toLowerCase()

    // 8-second debounce per bird tag so continuous landing / stepping on pad doesn't spam errors
    if (lastScanDebounceRef.current[tagKey] && now - lastScanDebounceRef.current[tagKey] < 8000) {
      return
    }
    lastScanDebounceRef.current[tagKey] = now

    // 1. Match bird in registered birds (or auto-register if new chip band)
    let matchedBird = registeredBirds.find(
      (b) =>
        (b.rfidTag && b.rfidTag.trim().toLowerCase() === tagKey) ||
        b.ringNo.trim().toLowerCase() === tagKey
    )

    const dateNow = new Date()
    const currentTimeStr = dateNow.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' })
    const hrs = String(dateNow.getHours()).padStart(2, '0')
    const mins = String(dateNow.getMinutes()).padStart(2, '0')
    const time24 = `${hrs}:${mins}`

    // If bird is not yet in registry, auto-enroll into database immediately!
    if (!matchedBird) {
      const autoRing = `PH-${dateNow.getFullYear()}-${rawTag.slice(-5)}`
      try {
        const regRes = await saveBird(session?.access_token, {
          ringNo: autoRing,
          color: 'Blue Bar',
          name: `Racer ${rawTag.slice(-4)}`,
          gender: 'Unknown',
          status: 'Active',
          rfidTag: rawTag,
        }, false)
        if (regRes.success && regRes.data) {
          matchedBird = regRes.data
          setRegisteredBirds((prev) => [...prev, regRes.data])
          fetchBirds()
        }
      } catch (e) {
        console.warn('Auto register bird error:', e)
      }
      if (!matchedBird) {
        matchedBird = { id: rawTag, ringNo: autoRing, color: 'Blue Bar', name: 'Racer', gender: null, rfidTag: rawTag }
      }
    }

    // 2. Select TARGET EVENT for RFID clocking (prevents clocking into wrong or all events!)
    const validFlights = events
      .filter((e) => e.extendedProps?.club === 'Race' || e.extendedProps?.club === 'Training')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    if (validFlights.length === 0) {
      playElectronicChime(false)
      setArrivalHud({
        bird: matchedBird,
        speed: 0,
        time: currentTimeStr,
        eventTitle: 'Loft Trap Station',
        rank: 0,
        type: 'warning',
        message: `⚠️ Walang aktibong Race o Training flight para sa RFID sensor clock-in.`
      })
      return
    }

    const todayStr = dateNow.toISOString().split('T')[0]
    const storedActiveId = typeof window !== 'undefined' ? localStorage.getItem('flymetric_active_rfid_event_id') : null

    // Find the designated active target event
    let targetEvent = validFlights.find((e) => e.id === activeRfidEventId || e.id === storedActiveId)
    if (!targetEvent) {
      targetEvent = validFlights.find((e) => e.extendedProps?.isRfidActive === true)
    }
    if (!targetEvent) {
      targetEvent = validFlights.find((e) => e.date === todayStr || (e.date && e.date.startsWith(todayStr)))
    }
    if (!targetEvent) {
      targetEvent = validFlights[0]
    }

    // ── STRICT PARTICIPATION CHECK (Kasali sa Laro) ──
    // The RFID works ONLY for this event, and ONLY for birds entered in this event!
    let enteredRings: string[] = []
    try {
      enteredRings = JSON.parse(targetEvent.extendedProps?.participatingBirds || '[]')
    } catch {}

    if (enteredRings.length > 0 && !enteredRings.includes(matchedBird.ringNo.toUpperCase())) {
      playElectronicChime(false)
      setArrivalHud({
        bird: matchedBird,
        speed: 0,
        time: currentTimeStr,
        eventTitle: targetEvent.title,
        rank: 0,
        type: 'warning',
        message: `⚠️ HINDI KASALI SA LARO: Si ${matchedBird.ringNo} ay hindi kasali sa "${targetEvent.title}"! Hindi ito iko-clock.`
      })
      return // DO NOT CLOCK IN! NEVER CLOCK IN OTHER EVENTS!
    }

    // 3. Check if bird is already clocked
    let birdsList: Array<{ ringNo: string; clockInTime: string; speed: number }> = []
    try {
      birdsList = JSON.parse(targetEvent.extendedProps?.birds || '[]')
      if (!Array.isArray(birdsList)) birdsList = []
    } catch {
      birdsList = []
    }

    const existingRecord = birdsList.find(
      (b) => b.ringNo.trim().toUpperCase() === matchedBird.ringNo.trim().toUpperCase()
    )

    if (existingRecord) {
      playElectronicChime(false)
      const rankIdx = birdsList.findIndex(b => b.ringNo.trim().toUpperCase() === matchedBird.ringNo.trim().toUpperCase()) + 1
      setArrivalHud({
        bird: matchedBird,
        speed: existingRecord.speed,
        time: existingRecord.clockInTime,
        eventTitle: targetEvent.title,
        rank: rankIdx,
        type: 'info',
        message: `ℹ️ NAKA-CLOCK NA: Si ${matchedBird.ringNo} ay naitala na kaninang ${existingRecord.clockInTime} (+${existingRecord.speed.toLocaleString()} m/min, Rank #${rankIdx}). Hindi na kailangan i-tap ulit.`
      })
      return
    }

    // 4. Calculate flight telemetry & speed
    const distanceKm = targetEvent.extendedProps?.distance || 0
    const releaseTime = targetEvent.extendedProps?.releaseTime || '06:00'
    const [rH, rM] = releaseTime.split(':').map(Number)
    const [cH, cM] = time24.split(':').map(Number)
    const releaseMinutes = (rH || 0) * 60 + (rM || 0)
    let clockInMinutes = (cH || 0) * 60 + (cM || 0)
    if (clockInMinutes <= releaseMinutes) {
      clockInMinutes += 24 * 60
    }
    const flyingMins = Math.max(1, clockInMinutes - releaseMinutes)
    const distanceMeters = distanceKm * 1000
    const calculatedSpeed = distanceMeters > 0 ? Math.round(distanceMeters / flyingMins) : 0

    const newRecord = {
      ringNo: matchedBird.ringNo.trim().toUpperCase(),
      clockInTime: time24,
      speed: calculatedSpeed,
    }

    const updatedBirdsList = [...birdsList, newRecord]
    const speeds = updatedBirdsList.map((b) => b.speed)
    const maxSpeed = Math.max(...speeds)
    const avgSpeed = Math.round(speeds.reduce((sum, s) => sum + s, 0) / updatedBirdsList.length)
    const fastestBird = updatedBirdsList.reduce((f, c) => (c.speed > f.speed ? c : f), updatedBirdsList[0])
    const winnerRing = targetEvent.extendedProps?.club === 'Training' ? 'N/A' : fastestBird.ringNo

    // 5. AUTO-SAVE TO SUPABASE/OFFLINE STORAGE (ZERO HUMAN CLICKS REQUIRED!)
    try {
      const res = await saveEvent(session?.access_token, {
        id: targetEvent.id,
        title: targetEvent.title,
        date: targetEvent.date,
        totalBirds: updatedBirdsList.length,
        maxSpeed,
        avgSpeed,
        location: targetEvent.extendedProps?.location,
        club: targetEvent.extendedProps?.club,
        distance: distanceKm,
        winner: winnerRing,
        releaseTime,
        clockInTime: time24,
        birds: JSON.stringify(updatedBirdsList),
      }, true)

      if (res.success) {
        // Electronic chime & Voice Announcement
        playElectronicChime(true)
        speakPigeonArrival(`Pigeon ${matchedBird.ringNo} clocked! Velocity ${calculatedSpeed} meters per minute!`)
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          navigator.vibrate?.([200, 100, 300])
        }

        setArrivalHud({
          bird: matchedBird,
          speed: calculatedSpeed,
          time: currentTimeStr,
          eventTitle: targetEvent.title,
          rank: updatedBirdsList.length,
          type: 'success',
          message: `OFFICIAL EBDS ARRIVAL RECORDED: Speed: ${calculatedSpeed.toLocaleString()} m/min · Rank #${updatedBirdsList.length}`
        })

        fetchEvents()
      } else {
        playElectronicChime(false)
        setArrivalHud({
          bird: matchedBird,
          speed: 0,
          time: currentTimeStr,
          eventTitle: targetEvent.title,
          rank: 0,
          type: 'warning',
          message: `⚠️ Error saving automatic clock-in to database.`
        })
      }
    } catch (err: any) {
      playElectronicChime(false)
      setArrivalHud({
        bird: matchedBird,
        speed: 0,
        time: currentTimeStr,
        eventTitle: targetEvent.title,
        rank: 0,
        type: 'warning',
        message: err.message || 'Error executing sensor clock-in.'
      })
    }
  }, [events, registeredBirds, session, fetchEvents])

  // Global listener for USB 125kHz RFID proximity readers
  useRfidScanner({
    enabled: !isRegistryOpen,
    onScan: handleGlobalAutoClock,
    playAudioBeep: false,
  })

  // Manual clock-in handler used by ElectronicPadModal simulation/testing
  const handleManualClockIn = useCallback(async (ring: string, time: string, eventId: string) => {
    const targetEvent = events.find(e => e.id === eventId)
    if (!targetEvent) throw new Error('Event not found')
    
    const distanceKm = targetEvent.extendedProps?.distance || 0
    const releaseTime = targetEvent.extendedProps?.releaseTime || '06:00'
    const [rH, rM] = releaseTime.split(':').map(Number)
    const [cH, cM] = time.split(':').map(Number)
    const releaseMinutes = (rH || 0) * 60 + (rM || 0)
    let clockInMinutes = (cH || 0) * 60 + (cM || 0)
    if (clockInMinutes <= releaseMinutes) clockInMinutes += 24 * 60
    const flyingMins = Math.max(1, clockInMinutes - releaseMinutes)
    const calculatedSpeed = distanceKm > 0 ? Math.round((distanceKm * 1000) / flyingMins) : 0

    let birdsList: Array<{ ringNo: string; clockInTime: string; speed: number }> = []
    try {
      birdsList = JSON.parse(targetEvent.extendedProps?.birds || '[]')
      if (!Array.isArray(birdsList)) birdsList = []
    } catch {
      birdsList = []
    }

    if (birdsList.some(b => b.ringNo.toUpperCase() === ring.trim().toUpperCase())) {
      throw new Error(`Bird ${ring} is already clocked in for this event!`)
    }

    const updatedBirds = [...birdsList, { ringNo: ring.trim().toUpperCase(), clockInTime: time, speed: calculatedSpeed }]
    const speeds = updatedBirds.map(b => b.speed)
    const maxSpeed = Math.max(...speeds)
    const avgSpeed = Math.round(speeds.reduce((s, c) => s + c, 0) / updatedBirds.length)
    const fastestBird = updatedBirds.reduce((f, c) => c.speed > f.speed ? c : f, updatedBirds[0])
    const winnerRing = targetEvent.extendedProps?.club === 'Training' ? 'N/A' : fastestBird.ringNo

    const res = await saveEvent(session?.access_token, {
      id: targetEvent.id,
      title: targetEvent.title,
      date: targetEvent.date,
      totalBirds: updatedBirds.length,
      maxSpeed,
      avgSpeed,
      location: targetEvent.extendedProps?.location,
      club: targetEvent.extendedProps?.club,
      distance: distanceKm,
      winner: winnerRing,
      releaseTime,
      clockInTime: time,
      birds: JSON.stringify(updatedBirds),
    }, true)

    if (!res.success) {
      throw new Error('Failed to save clock-in')
    }

    await fetchEvents()
    return res
  }, [events, session, fetchEvents])


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

  const navigateToTab = (tabName: 'addEvent' | 'clockIn' | 'camera' | 'history' | 'activities' | 'profile' | 'home' | 'chat' | 'trap' | 'birds' | 'training') => {
    setIsModalOpen(false)
    setIsSelectionOpen(false)
    setIsClockInOpen(false)
    setIsVerifyPhotoOpen(false)
    setIsChatOpen(false)
    setIsPadStationOpen(false)
    setIsCalculatorOpen(false)

    if (tabName === 'home') {
      setMainTab('home')
    } else if (tabName === 'birds') {
      setMainTab('birds')
    } else if (tabName === 'activities') {
      setActivitiesInitialTab('activities')
      setMainTab('activities')
    } else if (tabName === 'history') {
      setActivitiesInitialTab('results')
      setMainTab('activities')
    } else if (tabName === 'profile') {
      setMainTab('profile')
    } else if (tabName === 'training') {
      setMainTab('training')
    } else if (tabName === 'clockIn') {
      setIsClockInOpen(true)
    } else if (tabName === 'addEvent') {
      openModal(today)
    } else if (tabName === 'trap') {
      setIsPadStationOpen(true)
    } else if (tabName === 'camera') {
      setIsVerifyPhotoOpen(true)
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
  const flightEvents = events
    .filter(e => e.extendedProps?.club === 'Race' || e.extendedProps?.club === 'Training')
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
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
      label: 'Birds Flown',
      fullLabel: 'Total Birds Flown',
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
      label: 'Top Velocity',
      fullLabel: 'Top Velocity (m/min)',
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
      label: 'Road Tosses',
      fullLabel: 'Training Road Tosses',
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
      label: 'Derby Races',
      fullLabel: 'Derby Races Competed',
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
    <div data-theme="dark" className="dashboard bg-base-100 text-base-content selection:bg-amber-500/20 selection:text-amber-400">
      {/* ── Precision Avionics Navigation Bar ────────────────── */}
      <nav className="dashboard-nav border-b border-white/10 bg-[#0c101a]/95 backdrop-blur-xl px-4 sm:px-6 h-16 sticky top-0 z-50">
        <div 
          className="nav-brand flex items-center gap-2.5 sm:gap-3.5 cursor-pointer"
          onClick={() => setMainTab('home')}
        >
          <div
            className="nav-logo flex items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 shadow-sm shadow-amber-500/20"
            style={{ width: '36px', height: '36px' }}
            aria-hidden="true"
          >
            <img src="/icon.png" alt="FlyMetric" style={{ width: '24px', height: '24px', objectFit: 'contain' }} />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h1 className="nav-title font-extrabold text-base sm:text-lg tracking-tight text-white m-0">
                Fly<span className="text-amber-400">Metric</span>
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-extrabold tracking-wider uppercase bg-white/5 border border-white/10 text-slate-300">
                {loftName ? loftName : 'MY LOFT'}
              </span>
              {isOfflineMode ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-amber-500/10 border border-amber-500/30 text-amber-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block animate-pulse" />
                  Offline
                </span>
              ) : (
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                  Live
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Center Primary Tab Navigation (GitHub Underline Style) */}
        <nav className="hidden xl:flex items-center gap-0.5 border-b border-transparent h-full">
          <button
            id="home-nav"
            className={`cockpit-tab-item ${mainTab === 'home' ? 'active' : ''}`}
            onClick={() => setMainTab('home')}
            aria-label="Loft Dashboard Cockpit"
          >
            <HomeIcon size={15} />
            <span>Cockpit</span>
          </button>

          <button
            id="loft-registry-nav"
            className={`cockpit-tab-item ${mainTab === 'birds' ? 'active' : ''}`}
            onClick={() => setMainTab('birds')}
            aria-label="Manage Loft Birds Registry"
          >
            <BirdIcon size={15} />
            <span>Birds</span>
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-full bg-white/10 text-slate-300">
              {registeredBirds.length}
            </span>
          </button>

          <button
            id="activities-nav"
            className={`cockpit-tab-item ${mainTab === 'activities' ? 'active' : ''}`}
            onClick={() => {
              setActivitiesInitialTab('activities')
              setMainTab('activities')
            }}
            aria-label="Loft Activities & Calendar"
          >
            <CalendarIcon size={15} />
            <span>Activities</span>
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-full bg-white/10 text-slate-300">
              {events.length}
            </span>
          </button>

          <button
            id="training-prog-nav"
            className={`cockpit-tab-item ${mainTab === 'training' ? 'active' : ''}`}
            onClick={() => setMainTab('training')}
            aria-label="Training Program"
          >
            <TrainingIcon size={15} />
            <span>Training</span>
          </button>

          <div className="h-4 w-px bg-white/10 mx-1.5" />

          {/* Secondary Tools */}
          <button
            id="trap-antenna-nav"
            className="cockpit-nav-btn !py-1 !px-2.5 !text-xs text-emerald-400 hover:text-emerald-300 hover:border-emerald-500/40"
            onClick={() => setIsPadStationOpen(true)}
            aria-label="Live Trap Station"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <AntennaIcon size={13} />
            <span>Trap Station</span>
          </button>

          <button
            id="speed-calc-nav"
            className="cockpit-nav-btn !py-1 !px-2.5 !text-xs hover:text-amber-400 hover:border-amber-500/40"
            onClick={() => setIsCalculatorOpen(true)}
            aria-label="Speed Calculator"
          >
            <CalculatorIcon size={13} />
            <span>Calc</span>
          </button>

          <button
            id="verify-photo-nav"
            className="cockpit-nav-btn !py-1 !px-2.5 !text-xs hover:text-sky-400 hover:border-sky-500/40"
            onClick={() => setIsVerifyPhotoOpen(true)}
            aria-label="Verify clock-in photo"
          >
            <CameraIcon size={13} />
            <span>Photo Audit</span>
          </button>

          <button
            id="header-ai-chat"
            className="cockpit-nav-btn !py-1 !px-2.5 !text-xs text-purple-300 hover:text-purple-200 hover:border-purple-500/40"
            onClick={() => setIsChatOpen(true)}
            aria-label="Ask FlyMetric AI"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
            <span>Ask AI</span>
          </button>
        </nav>

        {/* Right Action & Profile Toolbar */}
        <div className="nav-actions flex items-center gap-2 sm:gap-2.5">
          {/* Mobile AI Chat quick shortcut */}
          <button
            id="ai-chat-nav-mobile"
            className="xl:hidden p-2 rounded-lg bg-white/5 border border-white/10 text-purple-400 hover:bg-white/10 transition-colors"
            onClick={() => setIsChatOpen(true)}
            aria-label="FlyMetric AI"
            title="Ask AI"
          >
            <span className="text-xs font-black">AI</span>
          </button>

          {/* Mobile Speed Calc quick shortcut */}
          <button
            id="speed-calc-nav-mobile"
            className="xl:hidden p-2 rounded-lg bg-white/5 border border-white/10 text-amber-400 hover:bg-white/10 transition-colors"
            onClick={() => setIsCalculatorOpen(true)}
            aria-label="Speed Calculator"
            title="Speed Calculator"
          >
            <CalculatorIcon size={16} />
          </button>

          {/* Quick Log Activity Button */}
          <button
            id="log-new-activity-nav"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-slate-200 hover:text-white text-xs font-bold transition-all cursor-pointer"
            onClick={() => openModal(today)}
            aria-label="Log new activity"
          >
            <PlusIcon size={13} />
            <span>Log Flight</span>
          </button>

          {/* Primary Action Button: Clock-in Bird */}
          <button
            id="quick-clockin-nav"
            className="cockpit-nav-btn-primary inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all active:scale-95"
            onClick={() => setIsClockInOpen(true)}
            aria-label="Quick Clock-in bird"
          >
            <PlusIcon size={14} />
            <span>Clock-in Bird</span>
          </button>

          {/* User Profile Avatar */}
          <div className="flex items-center gap-2 pl-1 border-l border-white/10">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName}
                title="Edit Loft Profile"
                onClick={() => setMainTab('profile')}
                className={`w-8 h-8 rounded-full border-2 object-cover cursor-pointer transition-all shadow-sm ${mainTab === 'profile' ? 'border-amber-400 ring-2 ring-amber-400/40' : 'border-amber-500/50 hover:border-amber-400'}`}
              />
            ) : (
              <button
                type="button"
                title="Edit Loft Profile"
                onClick={() => setMainTab('profile')}
                className={`w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-xs font-black text-slate-950 border-2 cursor-pointer transition-all shadow-sm ${mainTab === 'profile' ? 'border-white ring-2 ring-amber-400/40' : 'border-amber-500/50 hover:border-amber-300'}`}
              >
                {initials}
              </button>
            )}

            <button
              id="signout-btn"
              onClick={handleSignOut}
              title="Sign out"
              aria-label="Sign out"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer border border-transparent hover:border-rose-500/20"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {/* ── Main Cockpit Working Surface ──────────────── */}
      <main className={`dashboard-content max-w-7xl mx-auto w-full px-3 sm:px-6 py-3 sm:py-6`}>

        {/* ── Grand Electronic Band Arrival HUD Overlay ── */}
        {arrivalHud && (
          <div
            style={{
              position: 'fixed',
              top: '1.25rem',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 99999,
              width: '92%',
              maxWidth: '560px',
              background: arrivalHud.type === 'warning' 
                ? 'linear-gradient(135deg, #3b0707 0%, #1c0606 100%)' 
                : arrivalHud.type === 'info'
                ? 'linear-gradient(135deg, #0c2340 0%, #051020 100%)'
                : 'linear-gradient(135deg, #043825 0%, #031e15 100%)',
              border: `2px solid ${
                arrivalHud.type === 'warning' ? '#ef4444' : arrivalHud.type === 'info' ? '#38bdf8' : '#10b981'
              }`,
              boxShadow: `0 0 35px ${
                arrivalHud.type === 'warning' ? 'rgba(239, 68, 68, 0.4)' : arrivalHud.type === 'info' ? 'rgba(56, 189, 248, 0.4)' : 'rgba(16, 185, 129, 0.5)'
              }, 0 20px 40px rgba(0,0,0,0.85)`,
              borderRadius: '1rem',
              padding: '1rem 1.25rem',
              color: '#fff',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '12px',
                  background: arrivalHud.type === 'warning' ? 'rgba(239, 68, 68, 0.2)' : arrivalHud.type === 'info' ? 'rgba(56, 189, 248, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                  border: `1px solid ${arrivalHud.type === 'warning' ? 'rgba(239, 68, 68, 0.4)' : arrivalHud.type === 'info' ? 'rgba(56, 189, 248, 0.4)' : 'rgba(16, 185, 129, 0.5)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <AntennaIcon size={22} className={arrivalHud.type === 'warning' ? 'text-red-400' : arrivalHud.type === 'info' ? 'text-sky-400' : 'text-emerald-400'} />
                </div>
                <div>
                  <div style={{
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: arrivalHud.type === 'warning' ? '#f87171' : arrivalHud.type === 'info' ? '#7dd3fc' : '#34d399'
                  }}>
                    {arrivalHud.type === 'warning' ? 'SENSOR PAD ALERT' : arrivalHud.type === 'info' ? 'ALREADY RECORDED' : 'HANDS-FREE ARRIVAL CLOCKED!'}
                  </div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--brand-gold)', letterSpacing: '0.02em', lineHeight: 1.15 }}>
                    {arrivalHud.bird.ringNo}
                  </div>
                  {arrivalHud.bird.name && (
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>
                      {arrivalHud.bird.name} {arrivalHud.bird.color ? `· ${arrivalHud.bird.color}` : ''}
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={() => setArrivalHud(null)}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  border: 'none',
                  color: 'rgba(255,255,255,0.6)',
                  borderRadius: '6px',
                  width: '28px',
                  height: '28px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.1rem',
                  fontWeight: 700
                }}
              >
                ×
              </button>
            </div>

            {arrivalHud.type === 'success' && (
              <div style={{
                marginTop: '0.75rem',
                paddingTop: '0.75rem',
                borderTop: '1px solid rgba(255,255,255,0.1)',
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '0.5rem',
                textAlign: 'center',
              }}>
                <div style={{ background: 'rgba(0,0,0,0.35)', padding: '0.45rem', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', fontWeight: 700 }}>Arrival Time</div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#fff' }}>{arrivalHud.time}</div>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.35)', padding: '0.45rem', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', fontWeight: 700 }}>Speed</div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#34d399' }}>{arrivalHud.speed.toLocaleString()} m/m</div>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.35)', padding: '0.45rem', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', fontWeight: 700 }}>Rank</div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--brand-gold)' }}>#{arrivalHud.rank}</div>
                </div>
              </div>
            )}

            {arrivalHud.message && arrivalHud.type !== 'success' && (
              <div style={{ marginTop: '0.5rem', fontSize: '0.78rem', color: 'rgba(255,255,255,0.85)' }}>
                {arrivalHud.message}
              </div>
            )}
          </div>
        )}

        {/* ── Full Page Tab Views Router ── */}
        {mainTab === 'birds' && (
          <BirdRegistryModal
            isOpen={true}
            isPageMode={true}
            onClose={() => setMainTab('home')}
            onBirdsUpdated={fetchBirds}
            authToken={session?.access_token}
            events={events}
          />
        )}

        {mainTab === 'activities' && (
          <LoftActivitiesModal
            isOpen={true}
            isPageMode={true}
            events={events}
            loading={loading}
            initialTab={activitiesInitialTab}
            today={today}
            onClose={() => setMainTab('home')}
            onDateClick={(dateStr, ev) => {
              if (ev?.extendedProps?.isGroupRace) {
                setSelectedGroupRace(ev)
              } else {
                openModal(dateStr, ev)
              }
            }}
            onLogActivity={() => openModal(today)}
            onEditActivity={(dateStr, ev) => openModal(dateStr, ev)}
            onJoinGroupRace={() => setIsJoinGroupRaceOpen(true)}
            onCreateGroupRace={() => setIsCreateGroupRaceOpen(true)}
          />
        )}

        {mainTab === 'profile' && (
          <ProfileModal
            isOpen={true}
            isPageMode={true}
            onClose={() => setMainTab('home')}
            session={session}
            onProfileUpdated={refreshSession}
            registeredBirds={registeredBirds}
            onBirdsUpdated={fetchBirds}
            events={events}
            onEventsUpdated={fetchEvents}
            onAddEventTrigger={() => navigateToTab('addEvent')}
            onOpenRegistryTrigger={() => navigateToTab('birds')}
          />
        )}

        {mainTab === 'training' && (
          <TrainingProgramModal
            isOpen={true}
            isPageMode={true}
            onClose={() => setMainTab('home')}
          />
        )}

        {mainTab === 'home' && (
          <>
            {/* ── 125kHz RFID Trap Transponder Sensor Bar ── */}
        <div className="avionics-transponder mb-5 w-full">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
            {/* Left: Sensor Brand & Status Beacon */}
            <div className="flex items-center gap-3 min-w-0">
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black tracking-wider uppercase text-emerald-400 font-mono">
                    125kHz EBDS Trap Sensor
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300">
                    ARMED
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 truncate mt-0.5">
                  Hands-free arrival clocking for enrolled pigeons on selected flight
                </div>
              </div>
            </div>

            {/* Right: Target Selector & Open Station */}
            <div className="flex items-center gap-2.5 w-full sm:w-auto flex-wrap sm:flex-nowrap">
              {flightEvents.length > 0 && (() => {
                const activeTarget = flightEvents.find(f => f.id === activeRfidEventId) || (flightEvents.find(f => f.extendedProps?.isRfidActive)) || flightEvents[0]
                return (
                  <div className="relative flex-1 sm:flex-initial min-w-[200px]">
                    <button
                      type="button"
                      onClick={() => setIsTargetDropdownOpen(!isTargetDropdownOpen)}
                      className="w-full flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-[#080c14] border border-emerald-500/35 hover:border-emerald-500/60 text-slate-200 text-xs font-semibold cursor-pointer transition-all text-left"
                    >
                      <span className="truncate text-emerald-400 font-bold flex items-center gap-1.5">
                        <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span>{activeTarget?.title}</span>
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono shrink-0">
                        {activeTarget?.date} ▾
                      </span>
                    </button>

                    {isTargetDropdownOpen && (
                      <>
                        <div
                          onClick={() => setIsTargetDropdownOpen(false)}
                          className="fixed inset-0 z-40"
                        />
                        <div className="absolute top-full left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-[#0a0f1b] border border-emerald-500/40 rounded-lg shadow-2xl z-50 py-1 divide-y divide-white/5">
                          {flightEvents.map((ev, idx) => {
                            const isSelected = ev.id === activeTarget?.id
                            return (
                              <div
                                key={ev.id}
                                onClick={() => {
                                  setActiveRfidEventId(ev.id)
                                  if (typeof window !== 'undefined') {
                                    localStorage.setItem('flymetric_active_rfid_event_id', ev.id)
                                  }
                                  setIsTargetDropdownOpen(false)
                                }}
                                className={`px-3 py-2 text-xs cursor-pointer flex items-center justify-between gap-2 transition-colors ${
                                  isSelected ? 'bg-emerald-500/15 text-emerald-400 font-bold' : 'text-slate-300 hover:bg-white/5'
                                }`}
                              >
                                <span className="truncate">{ev.title}</span>
                                <span className="text-[10px] font-mono text-slate-400 shrink-0">{ev.date}</span>
                              </div>
                            )
                          })}
                        </div>
                      </>
                    )}
                  </div>
                )
              })()}

              <button
                type="button"
                onClick={() => setIsPadStationOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/40 hover:bg-emerald-500/25 text-emerald-400 text-xs font-bold transition-all cursor-pointer shrink-0"
              >
                <AntennaIcon size={14} />
                <span>Station HUD</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── Precision Flight Telemetry & Stats Dashboard ── */}
        <section
          aria-label="Loft statistics and telemetry"
          className="flex flex-col gap-3 sm:gap-4 mb-5 sm:mb-7 w-full min-w-0"
        >
          {/* Top Row: 4 Avionics Instrument Readouts */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5 w-full min-w-0">
            {STATS.map((s) => (
              <div
                key={s.label}
                className="cockpit-metric-card group flex flex-col justify-between min-w-0"
              >
                {/* Header line: label + tactical indicator */}
                <div className="flex items-center justify-between gap-1.5 w-full min-w-0">
                  <div className="flex items-center gap-1.5 min-w-0 truncate">
                    <span
                      className="shrink-0 w-2 h-2 rounded-xs"
                      style={{ background: s.valueColor }}
                    />
                    <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400 truncate">
                      <span className="sm:hidden">{s.label}</span>
                      <span className="hidden sm:inline">{s.fullLabel}</span>
                    </span>
                  </div>
                  <span
                    className="hidden sm:inline-flex shrink-0 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border"
                    style={{
                      background: s.ringBg,
                      borderColor: s.ringBorder,
                      color: s.valueColor,
                    }}
                  >
                    {s.badge}
                  </span>
                </div>

                {/* Main telemetry readout */}
                <div className="mt-2.5 mb-1 flex items-baseline gap-1">
                  <span
                    className="font-mono text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums"
                    style={{ color: s.valueColor }}
                  >
                    {s.prefix}{s.value}
                  </span>
                </div>

                {/* Micro-telemetry footer */}
                <div className="text-[10px] text-slate-400/80 truncate flex items-center justify-between pt-1.5 border-t border-white/5">
                  <span className="truncate">
                    {s.label.includes('Speed')
                      ? maxSpeed > 0 ? `≈ ${(maxSpeed * 0.06).toFixed(1)} km/h velocity` : 'No clocked speed yet'
                      : s.label.includes('Flown')
                      ? `${registeredBirds.length} in loft registry`
                      : s.label.includes('Training')
                      ? `${trainingPct}% of logged flights`
                      : `${racePct}% of season derby`}
                  </span>
                  <span className="font-mono text-[9px] text-slate-500 shrink-0">CH-01</span>
                </div>
              </div>
            ))}
          </div>

          {/* Second Row: 3-Column Visual Telemetry Cards */}
          <div
            className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-4 w-full min-w-0"
          >
            {/* Card 1: Multi-Segment Donut Ring Chart */}
            <div
              className="lg:col-span-4 rounded-xl bg-[#0c121e] border border-white/10 shadow-[0_4px_24px_rgba(0,0,0,0.3)] flex flex-col justify-between p-4 sm:p-5 min-w-0 gap-3 sm:gap-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-xs bg-sky-400 shadow-[0_0_8px_#38bdf8]" />
                  <span className="text-xs font-black uppercase tracking-wider text-white">Loft Flight Spectrum</span>
                </div>
                <span className="font-mono text-[10px] font-semibold text-slate-400 bg-white/5 px-2 py-0.5 rounded border border-white/5">
                  {events.length} LOGS
                </span>
              </div>

              {/* Multi-Color SVG Donut Gauge */}
              <div className="relative mx-auto flex h-36 w-36 sm:h-40 sm:w-40 items-center justify-center my-1">
                <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90 transform">
                  {/* Track */}
                  <circle
                    cx="70"
                    cy="70"
                    r="54"
                    fill="transparent"
                    stroke="rgba(255,255,255,0.06)"
                    strokeWidth="11"
                  />
                  {/* Segment 1: Races (Amber #f59e0b) */}
                  <circle
                    cx="70"
                    cy="70"
                    r="54"
                    fill="transparent"
                    stroke="#f59e0b"
                    strokeWidth="11"
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
                      strokeWidth="11"
                      strokeLinecap="round"
                      strokeDasharray={`${segTrain} ${donutC}`}
                      strokeDashoffset={-segRace}
                    />
                  )}
                  {/* Segment 3: Medical (Sky #0ea5e9) */}
                  {segMed > 0 && (
                    <circle
                      cx="70"
                      cy="70"
                      r="54"
                      fill="transparent"
                      stroke="#0ea5e9"
                      strokeWidth="11"
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
                      strokeWidth="11"
                      strokeLinecap="round"
                      strokeDasharray={`${segTask} ${donutC}`}
                      strokeDashoffset={-(segRace + segTrain + segMed)}
                    />
                  )}
                </svg>

                {/* Center Readout */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="font-mono text-2xl sm:text-3xl font-black text-white tracking-tight leading-none">
                    +{events.length}
                  </span>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 mt-1">
                    Flight Logs
                  </span>
                  <span className="inline-flex items-center gap-0.5 text-[9px] font-mono font-bold text-amber-400 mt-0.5">
                    {racePct}% Race
                  </span>
                </div>
              </div>

              {/* 4-Category Legend with Percentages */}
              <div
                className="grid grid-cols-4 border-t border-white/5 text-center gap-1 sm:gap-2 pt-3"
              >
                <div>
                  <div className="flex items-center justify-center gap-1 text-[10px] text-slate-400">
                    <span className="h-1.5 w-1.5 rounded-xs bg-[#f59e0b]" />
                    <span>Races</span>
                  </div>
                  <div className="font-mono text-xs font-bold text-amber-400 mt-0.5">{racePct}%</div>
                </div>
                <div>
                  <div className="flex items-center justify-center gap-1 text-[10px] text-slate-400">
                    <span className="h-1.5 w-1.5 rounded-xs bg-[#10b981]" />
                    <span>Tosses</span>
                  </div>
                  <div className="font-mono text-xs font-bold text-emerald-400 mt-0.5">{trainingPct}%</div>
                </div>
                <div>
                  <div className="flex items-center justify-center gap-1 text-[10px] text-slate-400">
                    <span className="h-1.5 w-1.5 rounded-xs bg-[#0ea5e9]" />
                    <span>Medical</span>
                  </div>
                  <div className="font-mono text-xs font-bold text-sky-400 mt-0.5">{medPct}%</div>
                </div>
                <div>
                  <div className="flex items-center justify-center gap-1 text-[10px] text-slate-400">
                    <span className="h-1.5 w-1.5 rounded-xs bg-[#c084fc]" />
                    <span>Tasks</span>
                  </div>
                  <div className="font-mono text-xs font-bold text-purple-400 mt-0.5">{taskPct}%</div>
                </div>
              </div>
            </div>

            {/* Card 2: Active Telemetry Bar Chart + Dual Radial Progress Rings */}
            <div
              className="lg:col-span-4 rounded-xl bg-[#0c121e] border border-white/10 shadow-[0_4px_24px_rgba(0,0,0,0.3)] flex flex-col justify-between p-4 sm:p-5 min-w-0 gap-3 sm:gap-4"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-xs bg-amber-400 shadow-[0_0_8px_#f59e0b]" />
                    <span className="text-xs font-black uppercase tracking-wider text-white">Active Flight Telemetry</span>
                  </div>
                  <span className="font-mono text-[9px] uppercase tracking-wider text-slate-400 px-2 py-0.5 rounded bg-white/5 border border-white/5">
                    CYCLE 2026
                  </span>
                </div>

                {/* 3 Summary Columns */}
                <div className="grid grid-cols-3 text-left gap-2 sm:gap-3 mb-3.5 bg-white/5 p-2 rounded-lg border border-white/5">
                  <div>
                    <div className="font-mono text-base font-extrabold text-white">
                      {events.length}
                    </div>
                    <div className="text-[10px] uppercase font-bold text-slate-400">Events</div>
                  </div>
                  <div>
                    <div className="font-mono text-base font-extrabold text-sky-400">
                      +{registeredBirds.length}
                    </div>
                    <div className="text-[10px] uppercase font-bold text-slate-400">Loft Birds</div>
                  </div>
                  <div>
                    <div className="font-mono text-base font-extrabold text-emerald-400">
                      {activeBirdsCount}
                    </div>
                    <div className="text-[10px] uppercase font-bold text-slate-400">Flyers</div>
                  </div>
                </div>

                {/* 6-Bar Vertical Chart */}
                <div
                  className="flex items-end justify-between border-b border-white/5 h-20 gap-2 pt-1 pb-2 px-0.5"
                >
                  {barChartItems.map((bar, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center h-full justify-end gap-1.5 min-w-0">
                      <div className="w-full flex items-end justify-center h-14">
                        <div
                          className="w-full max-w-[18px] rounded-t-xs transition-all duration-300"
                          style={{
                            height: `${bar.heightPct}%`,
                            background: bar.active
                              ? 'linear-gradient(180deg, #f59e0b 0%, #d97706 100%)'
                              : 'rgba(255, 255, 255, 0.12)',
                            boxShadow: bar.active ? '0 0 10px rgba(245, 158, 11, 0.4)' : 'none',
                          }}
                          title={`${bar.label}: ${bar.value}`}
                        />
                      </div>
                      <span
                        className={`text-[9px] font-mono font-bold truncate max-w-full rounded px-1 ${
                          bar.active ? 'bg-amber-400 text-slate-950 font-black' : 'text-slate-500'
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
                  className="cursor-pointer rounded-lg bg-white/5 border border-white/5 hover:border-sky-500/40 flex items-center p-2 sm:p-2.5 gap-2 min-w-0 transition-all"
                >
                  <div
                    className="radial-progress text-sky-400 text-[9px] sm:text-[10px] font-mono font-bold shrink-0"
                    style={{ '--value': activeRegistryPct, '--size': '2.5rem', '--thickness': '3px' } as React.CSSProperties}
                    role="progressbar"
                  >
                    {activeRegistryPct}%
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white truncate">Loft Ready</div>
                    <div className="text-[10px] font-mono text-slate-400 truncate mt-0.5">
                      {registeredBirds.length} Birds
                    </div>
                  </div>
                </div>

                <div
                  onClick={() => navigateToTab('history')}
                  className="cursor-pointer rounded-lg bg-white/5 border border-white/5 hover:border-emerald-500/40 flex items-center p-2 sm:p-2.5 gap-2 min-w-0 transition-all"
                >
                  <div
                    className="radial-progress text-emerald-400 text-[9px] sm:text-[10px] font-mono font-bold shrink-0"
                    style={{ '--value': flightCompletionPct, '--size': '2.5rem', '--thickness': '3px' } as React.CSSProperties}
                    role="progressbar"
                  >
                    {flightCompletionPct}%
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white truncate">Clocked</div>
                    <div className="text-[10px] font-mono text-slate-400 truncate mt-0.5">
                      {clockedEventsCount} Flights
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 3: Top Performers Leaderboard */}
            <div
              className="lg:col-span-4 rounded-xl bg-[#0c121e] border border-white/10 shadow-[0_4px_24px_rgba(0,0,0,0.3)] flex flex-col justify-between p-4 sm:p-5 min-w-0 gap-3 sm:gap-4"
            >
              <div>
                <div className="flex items-center justify-between mb-3.5">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-xs bg-emerald-400 shadow-[0_0_8px_#10b981]" />
                    <span className="text-xs font-black uppercase tracking-wider text-white">Top Velocity Podium</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigateToTab('history')}
                    className="text-xs font-mono font-bold text-amber-400 hover:text-amber-300 transition-colors cursor-pointer bg-transparent border-none"
                  >
                    Registry →
                  </button>
                </div>

                {leaderboardBirds.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {leaderboardBirds.map((bird, idx) => {
                      const rankColors = [
                        { badge: 'bg-amber-400 text-slate-950 font-black', speed: 'text-amber-400' },
                        { badge: 'bg-slate-300 text-slate-950 font-black', speed: 'text-sky-300' },
                        { badge: 'bg-amber-700 text-white font-black', speed: 'text-emerald-400' },
                      ][idx] || { badge: 'bg-slate-800 text-slate-300', speed: 'text-slate-300' }

                      return (
                        <div
                          key={bird.ringNo}
                          onClick={() => setIsRegistryOpen(true)}
                          className="cursor-pointer flex items-center justify-between rounded-lg bg-white/5 border border-white/5 hover:border-amber-400/30 transition-all p-2.5 gap-2"
                        >
                          <div className="flex items-center min-w-0 gap-2.5">
                            <div className="relative shrink-0">
                              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-black/40 border border-white/10">
                                <img src="/icon.png" alt={bird.ringNo} className="h-6 w-6 object-contain" />
                              </div>
                              <span
                                className={`absolute -top-1.5 -left-1.5 flex h-4 w-4 items-center justify-center rounded-xs text-[9px] font-mono shadow ${rankColors.badge}`}
                              >
                                #{idx + 1}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-white truncate font-mono">
                                {bird.name ? `${bird.name} (${bird.ringNo})` : bird.ringNo}
                              </div>
                              <div className="text-[10px] text-slate-400 truncate mt-0.5">
                                {bird.color || 'Racer'} • {bird.flights} {bird.flights === 1 ? 'flight' : 'flights'}
                              </div>
                            </div>
                          </div>

                          <div className={`font-mono text-xs font-black shrink-0 ${rankColors.speed}`}>
                            {bird.maxSpeed > 0 ? `${bird.maxSpeed.toFixed(1)} m/m` : 'Active'}
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
                            className="cursor-pointer flex items-center justify-between rounded-lg bg-white/[0.02] border border-dashed border-white/10 hover:border-amber-400/30 transition-all p-2.5 gap-2"
                          >
                            <div className="flex items-center min-w-0 gap-2.5">
                              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 border border-white/5 text-[10px] font-mono font-bold text-slate-500">
                                #{slotNum}
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-semibold text-slate-400 truncate">
                                  Open Podium Slot
                                </div>
                                <div className="text-[10px] text-slate-500 truncate">
                                  Register or clock bird to rank
                                </div>
                              </div>
                            </div>
                            <span className="text-[10px] font-mono font-bold text-amber-400/80">+ Add</span>
                          </div>
                        )
                      })}
                  </div>
                ) : (
                  <div
                    className="flex flex-col items-center justify-center text-center rounded-lg bg-white/[0.02] border border-dashed border-white/10 p-5"
                  >
                    <img src="/icon.png" alt="No birds" className="h-9 w-9 object-contain opacity-50 mb-2" />
                    <div className="text-xs font-bold text-white">No Aviators Ranked Yet</div>
                    <p className="text-[11px] text-slate-400 mt-0.5 mb-3">
                      Register birds or clock a flight to calculate velocity.
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsRegistryOpen(true)}
                      className="cockpit-nav-btn-primary !py-1 !px-2.5 !text-xs"
                    >
                      + Register Birds
                    </button>
                  </div>
                )}
              </div>

              <div
                className="border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-slate-400 pt-2"
              >
                <span>VELOCITY STANDARD</span>
                <span className="font-bold text-amber-400">m/min (meters/min)</span>
              </div>
            </div>
          </div>
        </section>

        {/* Flight Operations Log Preview */}
        <section className="rounded-xl bg-[#0c121e] border border-white/10 shadow-[0_4px_24px_rgba(0,0,0,0.3)] p-4 sm:p-5 w-full min-w-0" aria-label="Loft activities preview">
          <div className="flex items-center justify-between gap-3 mb-3.5 flex-wrap">
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-xs bg-amber-400 shadow-[0_0_8px_#f59e0b]" />
              <h3 className="text-xs font-black uppercase tracking-wider text-white m-0">
                Flight Operations Log
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 border border-white/5 text-slate-400">
                {events.length} ACTIVE
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedDate(today)
                  setSelectedEvent(null)
                  setModalIsClockInOnly(false)
                  setIsModalOpen(true)
                }}
                className="cockpit-nav-btn-primary !py-1 !px-2.5 !text-xs !gap-1 cursor-pointer"
              >
                <PlusIcon size={12} /> Log Activity
              </button>
              <button
                type="button"
                onClick={() => navigateToTab('activities')}
                className="cockpit-nav-btn !py-1 !px-2.5 !text-xs !gap-1.5 cursor-pointer"
              >
                <CalendarIcon size={12} />
                <span>Calendar</span>
              </button>
            </div>
          </div>

          {events.length === 0 ? (
            <div className="py-6 px-4 text-center rounded-lg bg-white/[0.02] border border-dashed border-white/10 text-slate-400 text-xs font-mono">
              No flights or training activities logged in operational buffer.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {/* Show top 3 most recent / upcoming events */}
              {events.slice(0, 3).map((ev) => {
                const type = ev.extendedProps?.club || 'Race'
                const location = ev.extendedProps?.location || 'No location configured'
                const distance = ev.extendedProps?.distance

                return (
                  <div
                    key={ev.id}
                    onClick={() => {
                      setModalIsClockInOnly(true)
                      openModal(ev.date || '', ev)
                    }}
                    className="p-2.5 sm:p-3 rounded-lg bg-white/5 border border-white/5 hover:border-amber-400/30 flex items-center justify-between gap-3 transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <span
                        className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 ${
                          type === 'Training'
                            ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
                            : type === 'Medication'
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : type === 'Task'
                            ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                            : 'bg-amber-400/15 text-amber-400 border border-amber-400/30'
                        }`}
                      >
                        {type === 'Training' ? <TrainingIcon size={15} /> :
                         type === 'Medication' ? <PillIcon size={15} /> :
                         type === 'Task' ? <NotesIcon size={15} /> : <TrophyIcon size={15} />}
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-white truncate">
                          {ev.title}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1.5 truncate mt-0.5">
                          <span className="font-semibold text-amber-400 font-mono text-[10px]">{type.toUpperCase()}</span>
                          <span>•</span>
                          <span className="font-mono text-slate-300">{ev.date}</span>
                          <span>•</span>
                          <span className="truncate flex items-center gap-1">
                            <MapPinIcon size={10} className="text-slate-500 inline shrink-0" />
                            <span>{location}</span>
                          </span>
                          {distance && distance > 0 ? <span className="font-mono text-amber-300">({distance}km)</span> : null}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setModalIsClockInOnly(false)
                        openModal(ev.date || '', ev)
                      }}
                      className="cockpit-nav-btn !py-1 !px-2.5 !text-[11px] shrink-0 cursor-pointer flex items-center gap-1.5"
                    >
                      <EditIcon size={12} />
                      <span>Edit</span>
                    </button>
                  </div>
                )
              })}

              {events.length > 3 && (
                <button
                  type="button"
                  onClick={() => navigateToTab('activities')}
                  className="w-full py-2 mt-1 rounded-lg bg-white/5 hover:bg-amber-400/10 border border-dashed border-white/10 hover:border-amber-400/30 text-xs font-mono font-bold text-slate-400 hover:text-amber-400 transition-all text-center cursor-pointer"
                >
                  View All {events.length} Loft Activities & Schedule →
                </button>
              )}
            </div>
          )}
        </section>
        </>
        )}

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
        onOpenRegistry={() => {
          setIsModalOpen(false)
          navigateToTab('birds')
        }}
      />

      {/* ── Quick Clock-in Modal ─────────────────────── */}
      <QuickClockInModal
        isOpen={isClockInOpen}
        events={events}
        registeredBirds={registeredBirds}
        onClose={() => setIsClockInOpen(false)}
        onClockInSaved={fetchEvents}
        authToken={session.access_token}
        initialEventId={activeRfidEventId || undefined}
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

      {/* ── Admin Create Group Race Modal ───────────────── */}
      <CreateGroupRaceModal
        isOpen={isCreateGroupRaceOpen}
        today={today}
        onClose={() => setIsCreateGroupRaceOpen(false)}
        onSuccess={() => {
          fetchEvents()
        }}
      />

      {/* ── Fancier Join Group Race Modal ────────────────── */}
      <JoinGroupRaceModal
        isOpen={isJoinGroupRaceOpen}
        loftBirds={registeredBirds}
        onClose={() => setIsJoinGroupRaceOpen(false)}
        onSuccess={() => {
          fetchEvents()
        }}
      />

      {/* ── Group Race Cockpit & Leaderboard Modal ──────── */}
      <GroupRaceCockpitModal
        isOpen={!!selectedGroupRace}
        race={selectedGroupRace}
        currentUserId={session?.user?.id || 'local-dev-user-id'}
        onClose={() => setSelectedGroupRace(null)}
        onClockInBird={(race) => {
          setSelectedGroupRace(null)
          setSelectedEvent(race)
          setIsClockInOpen(true)
        }}
        onRaceUpdated={(updated) => {
          setSelectedGroupRace(updated)
          fetchEvents()
        }}
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

      {/* ── Electronic Antenna Sensor Pad Modal ─────────── */}
      <ElectronicPadModal
        isOpen={isPadStationOpen}
        events={events}
        registeredBirds={registeredBirds}
        onClose={() => setIsPadStationOpen(false)}
        onManualClockIn={handleManualClockIn}
        onOpenRegistry={() => {
          setIsPadStationOpen(false)
          setIsRegistryOpen(true)
        }}
        onOpenNewActivity={() => {
          setIsPadStationOpen(false)
          openModal(today)
        }}
        initialEventId={activeRfidEventId || undefined}
        onSelectEventId={(chosenId) => {
          setActiveRfidEventId(chosenId)
          if (typeof window !== 'undefined') {
            localStorage.setItem('flymetric_active_rfid_event_id', chosenId)
          }
        }}
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

      {/* Precision Mobile Bottom Tab Bar */}
      <div className="mobile-tab-bar">
        <button 
          className={`mobile-tab-btn ${mainTab === 'home' && !isClockInOpen ? 'active' : ''}`}
          onClick={() => navigateToTab('home')}
          aria-label="Loft Dashboard Cockpit"
        >
          <HomeIcon size={20} />
          <span>Cockpit</span>
        </button>

        <button 
          className={`mobile-tab-btn ${mainTab === 'birds' && !isClockInOpen ? 'active' : ''}`}
          onClick={() => navigateToTab('birds')}
          aria-label="Loft Birds Registry"
        >
          <BirdIcon size={20} />
          <span>Birds</span>
        </button>

        {/* CENTER: Clock-In (Clean, Aligned, Uniform Height) */}
        <button 
          className={`mobile-tab-btn ${isClockInOpen ? 'active' : ''}`}
          onClick={() => navigateToTab('clockIn')}
          aria-label="Quick Clock-in bird"
        >
          <TimerIcon size={20} />
          <span>Clock-In</span>
        </button>

        <button 
          className={`mobile-tab-btn ${mainTab === 'activities' && !isClockInOpen ? 'active' : ''}`}
          onClick={() => navigateToTab('activities')}
          aria-label="Loft Activities & Flights"
        >
          <CalendarIcon size={20} />
          <span>Activities</span>
        </button>

        <button 
          className={`mobile-tab-btn ${mainTab === 'profile' && !isClockInOpen ? 'active' : ''}`}
          onClick={() => navigateToTab('profile')}
          aria-label="Loft Profile"
        >
          <UserIcon size={20} />
          <span>Profile</span>
        </button>
      </div>
    </div>
  )
}
