'use client'

import { useState, useEffect, useRef } from 'react'
import type { RaceEvent } from '@/app/api/race-events/route'
import { BirdIcon, PlusIcon, TagIcon, TimerIcon, NotesIcon, RulerIcon, TrashIcon, PillIcon, CalendarIcon, TrophyIcon, TrainingIcon, LightningIcon } from '@/components/icons'
import { saveEvent } from '@/lib/apiClient'
import type { Session } from '@supabase/supabase-js'
import LoftMapPreview from '@/components/LoftMapPreview'
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

interface ActivityModalProps {
  isOpen: boolean
  selectedDate: string
  onClose: () => void
  onRaceSaved?: () => void
  eventToEdit?: RaceEvent | null
  registeredBirds: LoftBird[]
  authToken?: string
  session?: Session | null
  isClockInOnly?: boolean
  onOpenRegistry?: () => void
}

interface BirdRecord {
  ringNo: string
  clockInTime: string
  speed: number
  photo?: string
}

type ActivityType = 'race' | 'training' | 'medication' | 'task'

export default function ActivityModal({
  isOpen,
  selectedDate,
  onClose,
  onRaceSaved,
  eventToEdit,
  registeredBirds,
  authToken,
  session,
  isClockInOnly = false,
  onOpenRegistry,
}: ActivityModalProps) {
  const [activityType, setActivityType] = useState<ActivityType>('race')
  const [raceDate, setRaceDate] = useState(selectedDate)
  
  // Race / Training inputs
  const [distanceKmStr, setDistanceKmStr] = useState('90')
  const [releaseTime, setReleaseTime] = useState('06:00')
  const [clockInTime, setClockInTime] = useState('09:30')

  // Coordinates for release point distance calculation
  const [releaseLat, setReleaseLat] = useState('')
  const [releaseLng, setReleaseLng] = useState('')
  const [fetchingGps, setFetchingGps] = useState(false)
  
  // Multi-bird states
  const [birdsList, setBirdsList] = useState<BirdRecord[]>([])
  const [newRing, setNewRing] = useState('')
  const [newTime, setNewTime] = useState('09:30')

  // Custom metadata for saving
  const [title, setTitle] = useState('')
  const [totalBirds, setTotalBirds] = useState('1')
  const [notes, setNotes] = useState('')
  const [winner, setWinner] = useState('TBD')

  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [selectedMedia, setSelectedMedia] = useState<{ type: 'photo' | 'video'; url: string } | null>(null)
  const [localPhotos, setLocalPhotos] = useState<Record<string, string>>({})
  const [localVideos, setLocalVideos] = useState<Record<string, string>>({})

  // Velocity Forecast States
  const [showForecast, setShowForecast] = useState(true)
  const [forecastTargetTime, setForecastTargetTime] = useState('07:30')
  const [clockInOnly, setClockInOnly] = useState(false)
  const [rfidFlash, setRfidFlash] = useState<{ status: 'success' | 'warning'; message: string } | null>(null)

  // Participating birds (Kasali sa Laro) & RFID Target states
  const [participatingRings, setParticipatingRings] = useState<string[]>([])
  const [isRfidTarget, setIsRfidTarget] = useState<boolean>(true)
  const [entriesExpanded, setEntriesExpanded] = useState<boolean>(true)
  const [isEntriesModalOpen, setIsEntriesModalOpen] = useState(false)

  useEffect(() => {
    if (releaseTime) {
      const [h, m] = releaseTime.split(':').map(Number)
      if (!isNaN(h) && !isNaN(m)) {
        const targetMins = (h * 60 + m + 90) % (24 * 60) // release + 90 mins
        const th = Math.floor(targetMins / 60)
        const tm = targetMins % 60
        setForecastTargetTime(`${String(th).padStart(2, '0')}:${String(tm).padStart(2, '0')}`)
      }
    }
  }, [releaseTime])

  const calculateForecastSpeed = (targetTime: string): string => {
    const dist = parseFloat(distanceKmStr)
    if (isNaN(dist) || dist <= 0 || !releaseTime || !targetTime) return 'N/A'
    
    const [rH, rM] = releaseTime.split(':').map(Number)
    const [tH, tM] = targetTime.split(':').map(Number)
    if (isNaN(rH) || isNaN(rM) || isNaN(tH) || isNaN(tM)) return 'N/A'
    
    let releaseMins = rH * 60 + rM
    let targetMins = tH * 60 + tM
    
    if (targetMins <= releaseMins) {
      targetMins += 24 * 60
    }
    
    const flyingMins = targetMins - releaseMins
    if (flyingMins <= 0) return 'N/A'
    
    const speed = Math.round((dist * 1000) / flyingMins)
    if (speed > 1600) return 'N/A'
    return `${speed.toLocaleString()} m/min`
  }

  const getFlightTelemetry = (clockTime: string, speedMpm: number) => {
    const kph = (speedMpm * 0.06).toFixed(1)
    if (!releaseTime || !clockTime) {
      return { kph: `${kph} km/h`, duration: '' }
    }

    const [rH = 0, rM = 0, rS = 0] = releaseTime.split(':').map(Number)
    const [cH = 0, cM = 0, cS = 0] = clockTime.split(':').map(Number)

    let relSeconds = rH * 3600 + rM * 60 + (rS || 0)
    let arrSeconds = cH * 3600 + cM * 60 + (cS || 0)

    if (arrSeconds < relSeconds) {
      arrSeconds += 24 * 3600
    }

    const totalSecs = arrSeconds - relSeconds
    const hours = Math.floor(totalSecs / 3600)
    const mins = Math.floor((totalSecs % 3600) / 60)
    const secs = totalSecs % 60

    let duration = ''
    if (hours > 0) {
      duration = secs > 0 ? `${hours}h ${mins}m ${secs}s` : `${hours}h ${mins}m`
    } else if (mins > 0) {
      duration = secs > 0 ? `${mins}m ${secs}s` : `${mins}m`
    } else {
      duration = `${secs}s`
    }

    return {
      kph: `${kph} km/h`,
      duration,
    }
  }

  const generateForecastGrid = () => {
    const dist = parseFloat(distanceKmStr)
    if (isNaN(dist) || dist <= 0 || !releaseTime || !clockInTime) return []
    
    const [rH, rM] = releaseTime.split(':').map(Number)
    const [cH, cM] = clockInTime.split(':').map(Number)
    if (isNaN(rH) || isNaN(rM) || isNaN(cH) || isNaN(cM)) return []
    
    let releaseMins = rH * 60 + rM
    let cutoffMins = cH * 60 + cM
    
    if (cutoffMins <= releaseMins) {
      cutoffMins += 24 * 60
    }
    
    const totalSpan = cutoffMins - releaseMins
    if (totalSpan <= 0) return []
    
    let step = 5
    if (totalSpan > 360) {
      step = 15
    } else if (totalSpan > 120) {
      step = 10
    }
    
    const grid = []
    for (let mins = releaseMins + step; mins <= cutoffMins; mins += step) {
      const currentMins = mins % (24 * 60)
      const hh = Math.floor(currentMins / 60)
      const mm = currentMins % 60
      const timeStr = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
      
      const displayHour = hh % 12 || 12
      const ampm = hh >= 12 ? 'PM' : 'AM'
      const timeLabel = `${String(displayHour).padStart(2, '0')}:${String(mm).padStart(2, '0')} ${ampm}`
      
      const flyingMins = mins - releaseMins
      const speed = Math.round((dist * 1000) / flyingMins)
      
      if (speed <= 1600) {
        grid.push({
          time: timeStr,
          timeLabel,
          flyingTime: flyingMins,
          speed
        })
      }
    }
    
    return grid
  }

  // Load verification photos and videos from localStorage
  useEffect(() => {
    if (isOpen && eventToEdit && birdsList.length > 0) {
      const photos: Record<string, string> = {}
      const videos: Record<string, string> = {}
      
      birdsList.forEach((b) => {
        const ring = b.ringNo.toUpperCase()
        
        // Photos
        const photoKey = `verify_photo_${eventToEdit.id}_${ring}`
        const storedPhoto = localStorage.getItem(photoKey)
        if (storedPhoto) {
          photos[ring] = storedPhoto
        }

        // Videos
        const videoKey = `verify_video_${eventToEdit.id}_${ring}`
        const storedVideo = localStorage.getItem(videoKey)
        if (storedVideo) {
          videos[ring] = storedVideo
        }
      })
      
      setLocalPhotos(photos)
      setLocalVideos(videos)
    } else {
      setLocalPhotos({})
      setLocalVideos({})
    }
  }, [isOpen, eventToEdit, birdsList])

  const modalRef = useRef<HTMLDivElement>(null)
  const wasOpenRef = useRef(false)

  // Sync date when parent passes a new selectedDate or eventToEdit
  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      setClockInOnly(eventToEdit ? true : !!isClockInOnly)
      setIsEntriesModalOpen(false)
      setReleaseLat('')
      setReleaseLng('')
      if (eventToEdit) {
        setRaceDate(eventToEdit.date)
        setTitle(eventToEdit.title)
        
        const type = eventToEdit.extendedProps.club === 'Training' ? 'training' :
                     eventToEdit.extendedProps.club === 'Medication' ? 'medication' :
                     eventToEdit.extendedProps.club === 'Task' ? 'task' : 'race'
        setActivityType(type)
        
        setDistanceKmStr(eventToEdit.extendedProps.distance ? eventToEdit.extendedProps.distance.toString() : '90')
        setReleaseTime(eventToEdit.extendedProps.releaseTime || '06:00')
        setClockInTime(eventToEdit.extendedProps.clockInTime || '09:30')
        setTotalBirds(eventToEdit.extendedProps.totalBirds ? eventToEdit.extendedProps.totalBirds.toString() : '0')
        setWinner(eventToEdit.extendedProps.winner || 'TBD')
        setNotes(eventToEdit.extendedProps.location || '')

        // Load birds list
        try {
          const parsed = JSON.parse(eventToEdit.extendedProps.birds || '[]')
          setBirdsList(parsed)
        } catch (e) {
          setBirdsList([])
        }

        // Load participating birds (Kasali sa Laro)
        try {
          const enrolled = JSON.parse(eventToEdit.extendedProps?.participatingBirds || '[]')
          if (Array.isArray(enrolled) && enrolled.length > 0) {
            setParticipatingRings(enrolled.map((r: string) => r.toUpperCase()))
          } else {
            // Default to all registered birds
            setParticipatingRings(registeredBirds.map(b => b.ringNo.toUpperCase()))
          }
        } catch {
          setParticipatingRings(registeredBirds.map(b => b.ringNo.toUpperCase()))
        }
        setIsRfidTarget(eventToEdit.extendedProps?.isRfidActive !== false)
      } else {
        setRaceDate(selectedDate)
        setActivityType('race')
        setDistanceKmStr('90')
        setReleaseTime('06:00')
        setClockInTime('09:30')
        setTotalBirds(registeredBirds.length.toString())
        setWinner('TBD')
        setNotes('')
        setTitle(`🏆 90km Race`)
        setBirdsList([])
        setParticipatingRings(registeredBirds.map(b => b.ringNo.toUpperCase()))
        setIsRfidTarget(true)
      }
      
      // Default selection to first registered bird
      if (registeredBirds.length > 0) {
        setNewRing(registeredBirds[0].ringNo)
      } else {
        setNewRing('')
      }
      
      // Default newTime to match clockInTime
      setNewTime(eventToEdit?.extendedProps?.clockInTime || '09:30')
      setSaveSuccess(false)
      setError('')
    }
    wasOpenRef.current = isOpen
  }, [isOpen, selectedDate, eventToEdit, registeredBirds, isClockInOnly])

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  // Trap focus inside modal
  useEffect(() => {
    if (isOpen) modalRef.current?.focus()
  }, [isOpen])

  // Set default values when activity type changes (only when creating a new event)
  useEffect(() => {
    if (!eventToEdit && isOpen) {
      setError('')
      setSaveSuccess(false)
      if (activityType === 'race') {
        setTitle(`${distanceKmStr}km Race`)
      } else if (activityType === 'training') {
        setTitle(`${distanceKmStr}km Toss`)
      } else if (activityType === 'medication') {
        setTitle('Diet & Vitamins')
      } else {
        setTitle('Loft Cleaning')
      }
    }
  }, [activityType, distanceKmStr, eventToEdit, isOpen])

  // 125kHz Proximity RFID Scanner Hook
  useRfidScanner({
    enabled: isOpen && !!eventToEdit && (activityType === 'race' || activityType === 'training'),
    onScan: (scannedTag) => {
      const cleanTag = scannedTag.trim().toLowerCase()
      const matched = registeredBirds.find(
        (b) =>
          (b.rfidTag && b.rfidTag.toLowerCase() === cleanTag) ||
          b.ringNo.toLowerCase() === cleanTag
      )

      const targetRing = matched ? matched.ringNo : scannedTag.trim()

      // CHECK: Is this bird participating (kasali sa laro)?
      if (participatingRings.length > 0 && !participatingRings.includes(targetRing.toUpperCase())) {
        setRfidFlash({
          status: 'warning',
          message: `⚠️ Hindi kasali sa laro: Si ${targetRing} ay wala sa entry list ng flight na ito!`,
        })
        setTimeout(() => setRfidFlash(null), 5000)
        return
      }

      // CHECK: Is this bird already clocked?
      const already = birdsList.find((b) => b.ringNo.toUpperCase() === targetRing.toUpperCase())
      if (already) {
        setRfidFlash({
          status: 'warning',
          message: `ℹ️ NAKA-CLOCK NA: Si ${targetRing} ay naitala na kaninang ${already.clockInTime} (+${already.speed.toLocaleString()} m/min)! Hindi na kailangan i-tap ulit.`,
        })
        setTimeout(() => setRfidFlash(null), 5000)
        return
      }

      setNewRing(targetRing)

      const now = new Date()
      const hrs = String(now.getHours()).padStart(2, '0')
      const mins = String(now.getMinutes()).padStart(2, '0')
      const currTime = `${hrs}:${mins}`
      setNewTime(currTime)

      if (matched) {
        setRfidFlash({
          status: 'success',
          message: `📡 Scanned RFID: ${matched.ringNo}${matched.name ? ` (${matched.name})` : ''} at ${currTime}!`,
        })
      } else {
        setRfidFlash({
          status: 'warning',
          message: `📡 Scanned RFID tag ${scannedTag}. (Tip: Register in Loft Registry to link)`,
        })
      }
      setTimeout(() => setRfidFlash(null), 4000)
    },
  })

  const handleAddBird = (overrideRing?: string, overrideTime?: string) => {
    setError('')
    const targetRing = (overrideRing || newRing).trim()
    const targetTime = overrideTime || newTime
    if (!targetRing) {
      setError('Please enter a bird Ring Number.')
      return
    }

    const ring = targetRing.toUpperCase()
    if (participatingRings.length > 0 && !participatingRings.includes(ring)) {
      setError(`Bird "${ring}" is not in this flight's entry list (Hindi kasali sa laro).`)
      return
    }

    const existing = birdsList.find((b) => b.ringNo.toUpperCase() === ring)
    if (existing) {
      setError(`ℹ️ Ang ibon na "${ring}" ay naka-clock na kaninang ${existing.clockInTime} (+${existing.speed.toLocaleString()} m/min). Hindi na kailangan i-add ulit.`)
      return
    }

    // Calculate speed for this specific bird
    const distanceKm = parseFloat(distanceKmStr)
    if (isNaN(distanceKm) || distanceKm <= 0) {
      setError('Please enter a valid distance first.')
      return
    }

    const [rH, rM] = releaseTime.split(':').map(Number)
    const [cH, cM] = targetTime.split(':').map(Number)
    const releaseMinutes = rH * 60 + rM
    const clockInMinutes = cH * 60 + cM

    if (clockInMinutes <= releaseMinutes) {
      setError('Arrival time must be after release time (' + releaseTime + ').')
      return
    }

    const flyingTotalMins = clockInMinutes - releaseMinutes
    const distanceMeters = distanceKm * 1000
    const speed = Math.round(distanceMeters / flyingTotalMins)

    const newBird: BirdRecord = {
      ringNo: ring,
      clockInTime: targetTime,
      speed,
    }

    setBirdsList([...birdsList, newBird])
    setNewRing(registeredBirds.length > 0 ? registeredBirds[0].ringNo : '')
  }

  const handleRemoveBird = (ringToRemove: string) => {
    if (eventToEdit) {
      localStorage.removeItem(`verify_photo_${eventToEdit.id}_${ringToRemove.toUpperCase()}`)
      localStorage.removeItem(`verify_video_${eventToEdit.id}_${ringToRemove.toUpperCase()}`)
    }
    setBirdsList(birdsList.filter((b) => b.ringNo.toUpperCase() !== ringToRemove.toUpperCase()))
  }

  const handleUseDeviceGpsForRelease = () => {
    setError('')
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.')
      return
    }

    setFetchingGps(true)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setReleaseLat(position.coords.latitude.toFixed(6))
        setReleaseLng(position.coords.longitude.toFixed(6))
        setFetchingGps(false)
      },
      (err) => {
        console.error('Error fetching GPS location:', err)
        setError('Failed to retrieve location. Please check browser permissions.')
        setFetchingGps(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const calculateDistanceFromGps = () => {
    setError('')
    const loftLat = session?.user?.user_metadata?.loft_latitude
    const loftLng = session?.user?.user_metadata?.loft_longitude

    if (loftLat === undefined || loftLng === undefined || loftLat === null || loftLng === null) {
      setError('Loft coordinates are not configured in your profile. Click your avatar to configure them.')
      return
    }

    const relLat = parseFloat(releaseLat)
    const relLng = parseFloat(releaseLng)

    if (isNaN(relLat) || relLat < -90 || relLat > 90) {
      setError('Please enter a valid Release Latitude (-90 to 90 degrees).')
      return
    }

    if (isNaN(relLng) || relLng < -180 || relLng > 180) {
      setError('Please enter a valid Release Longitude (-180 to 180 degrees).')
      return
    }

    // Haversine distance formula
    const R = 6371 // Earth radius in km
    const dLat = (relLat - loftLat) * Math.PI / 180
    const dLon = (relLng - loftLng) * Math.PI / 180
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(loftLat * Math.PI / 180) * Math.cos(relLat * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    const d = R * c

    setDistanceKmStr(d.toFixed(2))
  }

  const saveActivity = async () => {
    setError('')
    setSaving(true)
    setSaveSuccess(false)

    // Set colors & metadata by type
    let color = '#FFC107'
    let border = '#FF8F00'
    let dbClub = 'Race'
    let dbLocation = 'Race Release Point'
    let dbDistance = parseFloat(distanceKmStr) || 0
    
    // Dynamic stats to compute
    let dbWinner = 'TBD'
    let dbBirds = 0
    let maxSpeed = 0
    let avgSpeed = 0

    if (activityType === 'race' || activityType === 'training') {
      dbBirds = birdsList.length
      if (birdsList.length > 0) {
        const speeds = birdsList.map((b) => b.speed)
        maxSpeed = Math.max(...speeds)
        avgSpeed = Math.round(speeds.reduce((sum, s) => sum + s, 0) / birdsList.length)
        
        // Find fastest bird
        const fastestBird = birdsList.reduce((fastest, current) => 
          current.speed > fastest.speed ? current : fastest
        , birdsList[0])
        
        dbWinner = activityType === 'training' ? 'N/A' : fastestBird.ringNo
      } else {
        dbWinner = activityType === 'training' ? 'N/A' : 'TBD'
      }
    }

    if (activityType === 'training') {
      color = '#2196F3'
      border = '#0d47a1'
      dbClub = 'Training'
      dbLocation = notes || 'Training Toss'
    } else if (activityType === 'medication') {
      color = '#4CAF50'
      border = '#1b5e20'
      dbClub = 'Medication'
      dbLocation = notes || 'Medication/Feed Logged'
      dbWinner = 'N/A'
      dbBirds = 0
      dbDistance = 0
    } else if (activityType === 'task') {
      color = '#9C27B0'
      border = '#4a148c'
      dbClub = 'Task'
      dbLocation = notes || 'Loft Task Logged'
      dbWinner = 'N/A'
      dbBirds = 0
      dbDistance = 0
    }

    try {
      const isEdit = !!eventToEdit
      const finalTotalBirds = participatingRings.length > 0 ? participatingRings.length : dbBirds
      const res = await saveEvent(authToken, {
        id: eventToEdit?.id,
        title: title || 'New Activity',
        date: raceDate,
        totalBirds: finalTotalBirds,
        maxSpeed: maxSpeed,
        avgSpeed: avgSpeed,
        location: dbLocation,
        club: dbClub,
        distance: dbDistance,
        winner: dbWinner,
        releaseTime: (activityType === 'race' || activityType === 'training') ? releaseTime : undefined,
        clockInTime: (activityType === 'race' || activityType === 'training') ? clockInTime : undefined,
        birds: (activityType === 'race' || activityType === 'training') ? JSON.stringify(birdsList) : '[]',
        participatingBirds: (activityType === 'race' || activityType === 'training') ? JSON.stringify(participatingRings) : '[]',
        isRfidActive: isRfidTarget,
      }, isEdit)

      if (isRfidTarget && (res.data?.id || eventToEdit?.id)) {
        localStorage.setItem('flymetric_active_rfid_event_id', res.data?.id || eventToEdit?.id || '')
      }

      if (!res.success) {
        throw new Error('Failed to save activity')
      }

      setSaveSuccess(true)
      onRaceSaved?.()
      
      // Auto close modal
      setTimeout(() => {
        setSaveSuccess(false)
        onClose()
      }, 1200)

    } catch (err: any) {
      setError(err.message || 'An error occurred while saving.')
    } finally {
      setSaving(false)
    }
  }

  const reset = () => {
    setError('')
    setReleaseTime('06:00')
    setClockInTime('09:30')
    setDistanceKmStr('90')
    setSaveSuccess(false)
    setTotalBirds('0')
    setNotes('')
    setWinner('TBD')
    setBirdsList([])
    setNewRing('')
  }

  // Real-time speed calculation preview
  let speedPreviewMeters = 0
  let speedPreviewKmh = 0
  let flyingHours = 0
  let flyingMins = 0

  if (activityType === 'race' || activityType === 'training') {
    const distanceKm = parseFloat(distanceKmStr)
    if (!isNaN(distanceKm) && distanceKm > 0 && releaseTime && clockInTime) {
      const [rH, rM] = releaseTime.split(':').map(Number)
      const [cH, cM] = clockInTime.split(':').map(Number)
      if (!isNaN(rH) && !isNaN(cH)) {
        const releaseMinutes = rH * 60 + rM
        const clockInMinutes = cH * 60 + cM
        if (clockInMinutes > releaseMinutes) {
          const flyingTotalMins = clockInMinutes - releaseMinutes
          const distanceMeters = distanceKm * 1000
          speedPreviewMeters = Math.round(distanceMeters / flyingTotalMins)
          speedPreviewKmh = Math.round((distanceKm / flyingTotalMins) * 60 * 100) / 100
          flyingHours = Math.floor(flyingTotalMins / 60)
          flyingMins = flyingTotalMins % 60
        }
      }
    }
  }

  if (!isOpen) return null

  const sortedBirdsList = [...birdsList].sort((a, b) => b.speed - a.speed)

  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div
        className="modal-container"
        ref={modalRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        style={{
          maxWidth: '540px',
          width: '100%',
          maxHeight: '92dvh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          borderRadius: '1.25rem',
          boxSizing: 'border-box',
          position: 'relative'
        }}
      >
        {/* Header styling adapts to activity type */}
        <div className="modal-header" style={{
          background: (clockInOnly || eventToEdit)
            ? 'linear-gradient(135deg, rgba(255, 193, 7, 0.16) 0%, rgba(13, 21, 39, 0.98) 100%)'
            : activityType === 'race' ? 'linear-gradient(135deg, #FFC107, #FF8F00)' :
              activityType === 'training' ? 'linear-gradient(135deg, #2196F3, #1565C0)' :
              activityType === 'medication' ? 'linear-gradient(135deg, #4CAF50, #2E7D32)' :
              'linear-gradient(135deg, #9C27B0, #6A1B9A)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.45rem',
          width: '100%',
          boxSizing: 'border-box',
          padding: '0.9rem 1.15rem',
          borderTopLeftRadius: '1.25rem',
          borderTopRightRadius: '1.25rem',
          borderBottom: '1px solid rgba(255, 193, 7, 0.2)',
          flexShrink: 0,
        }}>
          {/* Top Row: Title + Entries + Close */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.6rem', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0, flex: 1 }}>
              <span style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: (clockInOnly || eventToEdit) ? 'rgba(255, 193, 7, 0.15)' : 'rgba(255,255,255,0.2)',
                border: (clockInOnly || eventToEdit) ? '1px solid rgba(255, 193, 7, 0.35)' : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: (clockInOnly || eventToEdit) ? 'var(--brand-gold)' : '#fff',
                flexShrink: 0
              }}>
                {activityType === 'training' ? <TrainingIcon size={20} /> :
                 activityType === 'medication' ? <PillIcon size={20} /> :
                 activityType === 'task' ? <NotesIcon size={20} /> :
                 <TrophyIcon size={20} />}
              </span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <h2 id="modal-title" style={{ color: '#fff', margin: 0, fontSize: '1.15rem', fontWeight: 800, lineHeight: 1.25, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {eventToEdit ? (title || 'Race Cockpit') : 'Add Activity'}
                </h2>
                {!eventToEdit && (
                  <p className="modal-subtitle" style={{ color: 'rgba(255,255,255,0.85)', margin: 0, fontSize: '0.7rem' }}>
                    Schedule a new activity on the calendar
                  </p>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
              {eventToEdit && (activityType === 'race' || activityType === 'training') && (
                <button
                  type="button"
                  onClick={() => setIsEntriesModalOpen(true)}
                  style={{
                    background: 'rgba(255, 193, 7, 0.15)',
                    border: '1px solid rgba(255, 193, 7, 0.4)',
                    color: 'var(--brand-gold)',
                    borderRadius: '9999px',
                    padding: '0.28rem 0.65rem',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    transition: 'all 0.15s ease',
                  }}
                  title="View & Edit Race Entries"
                >
                  <span>🕊️</span>
                  <span>Entries ({participatingRings.length}/{registeredBirds.length})</span>
                </button>
              )}
              <button
                className="modal-close-btn"
                style={{
                  color: '#fff',
                  background: 'rgba(255,255,255,0.15)',
                  position: 'static',
                  margin: 0,
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: 'none',
                  cursor: 'pointer',
                  flexShrink: 0
                }}
                onClick={onClose}
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Sub-bar for existing race / training: Telemetry & Actions */}
          {eventToEdit && (activityType === 'race' || activityType === 'training') && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.4rem',
              paddingTop: '0.35rem',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              fontSize: '0.72rem',
              color: 'var(--text-secondary)',
              flexWrap: 'wrap',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                  <span>📅</span> {raceDate}
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                  <span>📏</span> {distanceKmStr} km
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                  <span>⏰</span> Rel: {releaseTime}
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                  <span>⏱️</span> Cut: {clockInTime}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginLeft: 'auto' }}>
                <button
                  type="button"
                  onClick={() => setClockInOnly(!clockInOnly)}
                  style={{
                    background: clockInOnly ? 'rgba(255, 255, 255, 0.06)' : 'rgba(255, 193, 7, 0.2)',
                    border: clockInOnly ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid rgba(255, 193, 7, 0.5)',
                    color: clockInOnly ? 'var(--text-secondary)' : 'var(--brand-gold)',
                    borderRadius: '9999px',
                    padding: '0.15rem 0.55rem',
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                  }}
                  title={clockInOnly ? "Edit Date, Distance, or Release time" : "Switch back to Live Cockpit"}
                >
                  <span>{clockInOnly ? '✏️ Edit Info' : '🏆 Cockpit'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsRfidTarget(!isRfidTarget)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    fontSize: '0.66rem',
                    fontWeight: 800,
                    padding: '0.15rem 0.55rem',
                    borderRadius: '9999px',
                    cursor: 'pointer',
                    background: isRfidTarget ? 'rgba(16, 185, 129, 0.18)' : 'rgba(255, 255, 255, 0.05)',
                    border: isRfidTarget ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(255, 255, 255, 0.12)',
                    color: isRfidTarget ? '#34d399' : 'var(--text-muted)'
                  }}
                  title="Toggle RFID antenna target lock"
                >
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: isRfidTarget ? '#34d399' : '#6b7280' }} />
                  <span>{isRfidTarget ? 'RFID LOCKED' : 'RFID OFF'}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Tab Selection */}
        {!clockInOnly && (
          <div style={{
            display: 'flex',
            borderBottom: '1px solid var(--border-default)',
            background: 'var(--bg-surface)',
            flexShrink: 0,
          }}>
            {(['race', 'training', 'medication', 'task'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setActivityType(type)}
                style={{
                  flex: 1,
                  padding: '0.75rem 0.5rem',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  background: activityType === type ? 'var(--bg-card)' : 'transparent',
                  color: activityType === type ? (
                    type === 'race' ? 'var(--brand-gold)' :
                    type === 'training' ? '#2196F3' :
                    type === 'medication' ? '#4CAF50' : '#9C27B0'
                  ) : 'var(--text-secondary)',
                  border: 'none',
                  borderBottom: activityType === type ? `2px solid ${
                    type === 'race' ? 'var(--brand-gold)' :
                    type === 'training' ? '#2196F3' :
                    type === 'medication' ? '#4CAF50' : '#9C27B0'
                  }` : 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}>
                  {type === 'race' ? <TrophyIcon size={14} /> :
                   type === 'training' ? <TrainingIcon size={14} /> :
                   type === 'medication' ? <PillIcon size={14} /> : <NotesIcon size={14} />}
                  <span>
                    {type === 'race' ? 'Race' :
                     type === 'training' ? 'Training' :
                     type === 'medication' ? 'Diet' : 'Task'}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Body */}
        <div
          className="modal-body"
          style={{
            padding: '1rem 1.15rem',
            paddingBottom: 'calc(env(safe-area-inset-bottom) + 5.5rem)',
            gap: '0.65rem',
            overflowY: 'auto',
            flex: 1,
          }}
        >
          {clockInOnly && rfidFlash && (
            <div style={{
              padding: '0.45rem 0.75rem',
              borderRadius: '0.5rem',
              fontSize: '0.75rem',
              fontWeight: 700,
              background: rfidFlash.status === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
              border: rfidFlash.status === 'success' ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(245, 158, 11, 0.4)',
              color: rfidFlash.status === 'success' ? '#34d399' : '#fbbf24',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              marginBottom: '0.2rem',
            }}>
              <span>{rfidFlash.message}</span>
            </div>
          )}

          {!clockInOnly && (
            <>
              {/* Activity Title */}
              <div className="form-group">
                <label htmlFor="activity-title" className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <NotesIcon size={14} /> Activity Title
                </label>
                <input
                  id="activity-title"
                  type="text"
                  className="form-input"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              {/* Date Row */}
              <div className="form-group">
                <label htmlFor="race-date" className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <CalendarIcon size={14} /> Date
                </label>
                <input
                  id="race-date"
                  type="date"
                  className="form-input"
                  value={raceDate}
                  onChange={(e) => setRaceDate(e.target.value)}
                />
              </div>

              {/* CONDITIONAL RENDER: RACE OR TRAINING TIME & SPEED */}
              {(activityType === 'race' || activityType === 'training') && (
                <>
                  {/* Time Row */}
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="release-time" className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <PlusIcon size={14} style={{ transform: 'rotate(45deg)' }} /> Release Time
                      </label>
                      <input
                        id="release-time"
                        type="time"
                        className="form-input"
                        value={releaseTime}
                        onChange={(e) => setReleaseTime(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="clock-in-time" className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <TimerIcon size={14} /> Cut-off Time
                      </label>
                      <input
                        id="clock-in-time"
                        type="time"
                        className="form-input"
                        value={clockInTime}
                        onChange={(e) => setClockInTime(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Distance Input */}
                  <div className="form-group">
                    <label htmlFor="distance-km" className="form-label">📏 Distance</label>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <input
                        id="distance-km"
                        type="number"
                        step="any"
                        min="0"
                        placeholder="e.g. 90"
                        className="form-input"
                        value={distanceKmStr}
                        onChange={(e) => setDistanceKmStr(e.target.value)}
                        style={{ paddingRight: '3rem' }}
                      />
                      <span style={{
                        position: 'absolute',
                        right: '1rem',
                        color: 'var(--text-secondary)',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        pointerEvents: 'none'
                      }}>
                        km
                      </span>
                    </div>
                  </div>

                  {/* Release Point GPS coordinates (Optional calculator) */}
                  <div style={{ borderTop: '1px solid var(--border-muted)', marginTop: '0.75rem', paddingTop: '0.75rem' }}>
                    <span style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>🛰️ Release GPS (Distance Calculator)</span>
                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="rel-lat" className="form-label" style={{ fontSize: '0.72rem' }}>Release Lat</label>
                        <input
                          id="rel-lat"
                          type="number"
                          step="any"
                          className="form-input"
                          value={releaseLat}
                          onChange={(e) => setReleaseLat(e.target.value)}
                          placeholder="e.g. 15.2104"
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="rel-lng" className="form-label" style={{ fontSize: '0.72rem' }}>Release Lng</label>
                        <input
                          id="rel-lng"
                          type="number"
                          step="any"
                          className="form-input"
                          value={releaseLng}
                          onChange={(e) => setReleaseLng(e.target.value)}
                          placeholder="e.g. 120.5732"
                        />
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.6rem' }}>
                      <button
                        type="button"
                        className="nav-btn nav-btn-secondary"
                        disabled={fetchingGps}
                        onClick={handleUseDeviceGpsForRelease}
                        style={{
                          flex: 1,
                          padding: '0.4rem',
                          fontSize: '0.75rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.3rem',
                          borderColor: 'rgba(33, 150, 243, 0.3)',
                          color: '#2196F3',
                          background: 'rgba(33, 150, 243, 0.05)',
                          height: '2.2rem'
                        }}
                      >
                        📍 {fetchingGps ? 'Locating…' : 'Use Current GPS'}
                      </button>

                      <button
                        type="button"
                        className="nav-btn nav-btn-secondary"
                        onClick={calculateDistanceFromGps}
                        style={{
                          flex: 1.25,
                          padding: '0.4rem',
                          fontSize: '0.75rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.3rem',
                          borderColor: 'rgba(255, 193, 7, 0.3)',
                          color: 'var(--brand-gold)',
                          background: 'rgba(255, 193, 7, 0.05)',
                          height: '2.2rem'
                        }}
                      >
                        🌐 Calculate Distance
                      </button>
                    </div>

                    {/* Map Preview */}
                    <div style={{ marginTop: '0.75rem' }}>
                      <LoftMapPreview
                        loftLat={session?.user?.user_metadata?.loft_latitude != null ? parseFloat(session.user.user_metadata.loft_latitude) : null}
                        loftLng={session?.user?.user_metadata?.loft_longitude != null ? parseFloat(session.user.user_metadata.loft_longitude) : null}
                        releaseLat={releaseLat !== '' ? parseFloat(releaseLat) : null}
                        releaseLng={releaseLng !== '' ? parseFloat(releaseLng) : null}
                        height="180px"
                        clickHint="Tap map to set release point"
                        onMapClick={(lat, lng) => {
                          setReleaseLat(lat.toFixed(6))
                          setReleaseLng(lng.toFixed(6))
                        }}
                      />
                    </div>
                  </div>

                  {/* Velocity Arrival Forecast */}
                  {distanceKmStr && releaseTime && (
                    <div style={{
                      marginTop: '0.88rem',
                      background: 'rgba(255, 255, 255, 0.01)',
                      border: '1px solid var(--border-default)',
                      borderRadius: '0.6rem',
                      padding: '0.75rem',
                    }}>
                      {/* Header */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        userSelect: 'none'
                      }} onClick={() => setShowForecast(!showForecast)}>
                        <span style={{
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          color: 'var(--brand-gold)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem'
                        }}>
                          📈 Velocity Arrival Forecast
                        </span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                          {showForecast ? '▼ Collapse' : '▶ Expand'}
                        </span>
                      </div>

                      {showForecast && (
                        <div style={{ marginTop: '0.6rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                          {/* Dynamic Calculator input */}
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            backgroundColor: 'rgba(255, 255, 255, 0.02)',
                            padding: '0.4rem 0.6rem',
                            borderRadius: '0.4rem',
                            border: '1px solid rgba(255, 255, 255, 0.05)'
                          }}>
                            <div style={{ flex: 1 }}>
                              <label htmlFor="forecast-time" style={{ display: 'block', fontSize: '0.65rem', color: 'var(--text-secondary)', marginBottom: '0.15rem' }}>
                                Target Arrival Time
                              </label>
                              <input
                                id="forecast-time"
                                type="time"
                                value={forecastTargetTime}
                                onChange={(e) => setForecastTargetTime(e.target.value)}
                                style={{
                                  width: '100%',
                                  background: 'transparent',
                                  border: 'none',
                                  color: '#fff',
                                  fontSize: '0.8rem',
                                  outline: 'none',
                                  padding: 0
                                }}
                              />
                            </div>
                            <div style={{ textAlign: 'right', paddingLeft: '0.5rem', borderLeft: '1px solid rgba(255,255,255,0.08)' }}>
                              <span style={{ display: 'block', fontSize: '0.62rem', color: 'var(--text-secondary)' }}>Forecast Speed</span>
                              <strong style={{ fontSize: '0.92rem', color: 'var(--brand-gold)' }}>
                                {calculateForecastSpeed(forecastTargetTime)}
                              </strong>
                            </div>
                          </div>

                          {/* Increments table */}
                          <div style={{ maxHeight: '160px', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '0.4rem' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.72rem', textAlign: 'left' }}>
                              <thead>
                                <tr style={{ background: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                                  <th style={{ padding: '0.35rem 0.5rem', color: 'var(--text-secondary)' }}>Arrival Time</th>
                                  <th style={{ padding: '0.35rem 0.5rem', color: 'var(--text-secondary)' }}>Flying Time</th>
                                  <th style={{ padding: '0.35rem 0.5rem', textAlign: 'right', color: 'var(--text-secondary)' }}>Speed</th>
                                </tr>
                              </thead>
                              <tbody>
                                {generateForecastGrid().map((row, idx) => (
                                  <tr
                                    key={idx}
                                    style={{
                                      borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
                                      background: row.time === forecastTargetTime ? 'rgba(255, 193, 7, 0.06)' : 'transparent'
                                    }}
                                  >
                                    <td style={{ padding: '0.35rem 0.5rem', fontWeight: 600 }}>
                                      {row.timeLabel}
                                    </td>
                                    <td style={{ padding: '0.35rem 0.5rem', color: 'var(--text-secondary)' }}>
                                      {row.flyingTime} mins
                                    </td>
                                    <td style={{ padding: '0.35rem 0.5rem', textAlign: 'right', fontWeight: 700, color: 'var(--brand-gold)' }}>
                                      {row.speed.toLocaleString()} m/min
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* ── Participating Birds Bar (When editing event details) ── */}
          {!clockInOnly && (activityType === 'race' || activityType === 'training') && (
            <div style={{
              background: 'rgba(255, 193, 7, 0.06)',
              border: '1px solid rgba(255, 193, 7, 0.25)',
              borderRadius: '0.75rem',
              padding: '0.65rem 0.85rem',
              marginTop: '0.4rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.5rem',
              flexWrap: 'wrap'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.1rem' }}>🕊️</span>
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#fff' }}>
                    Kasali sa Laro (Entries)
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--brand-gold)' }}>
                    {participatingRings.length} of {registeredBirds.length} birds enrolled
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEntriesModalOpen(true)}
                style={{
                  background: 'rgba(255, 193, 7, 0.15)',
                  border: '1px solid rgba(255, 193, 7, 0.4)',
                  color: 'var(--brand-gold)',
                  borderRadius: '9999px',
                  padding: '0.28rem 0.8rem',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                }}
              >
                <span>Piliin ang mga Ibon</span>
                <span>➔</span>
              </button>
            </div>
          )}

          {/* Bird Clocking Cockpit (Only when viewing/clocking an existing Race or Training event) */}
          {eventToEdit && (activityType === 'race' || activityType === 'training') && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.55rem',
              marginTop: '0.2rem',
            }}>
              {/* Leaderboard Section Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ color: 'var(--brand-gold)' }}>🏆</span>
                  <span style={{ fontSize: '0.86rem', fontWeight: 800, color: '#fff' }}>
                    Clocked Arrivals ({birdsList.length})
                  </span>
                </div>
                <span style={{
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  padding: '0.15rem 0.5rem',
                  borderRadius: '9999px',
                  background: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  color: '#34d399',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem'
                }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34d399' }} />
                  125kHz RFID Ready
                </span>
              </div>
              
              {rfidFlash && (
                <div style={{ padding: '0.45rem 0.75rem', borderRadius: '0.5rem', fontSize: '0.75rem', fontWeight: 700, background: rfidFlash.status === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)', border: rfidFlash.status === 'success' ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(245, 158, 11, 0.4)', color: rfidFlash.status === 'success' ? '#34d399' : '#fbbf24', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span>{rfidFlash.message}</span>
                </div>
              )}

              {/* Quick Clock-in Card */}
              <div style={{
                background: 'rgba(15, 23, 42, 0.75)',
                padding: '0.65rem 0.75rem',
                borderRadius: '0.85rem',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.45rem',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.05rem' }}>
                  <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <span style={{ color: 'var(--brand-gold)' }}>⚡</span> Manual Clock-In
                  </span>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                    {birdsList.length} of {participatingRings.length || registeredBirds.length} clocked
                  </span>
                </div>

                {/* Pigeon Selector (Full Width) */}
                {registeredBirds.length === 0 ? (
                  <input
                    id="bird-ring"
                    type="text"
                    className="form-input"
                    placeholder="Ring No. (e.g. PH-2026-88001)"
                    value={newRing}
                    onChange={(e) => setNewRing(e.target.value)}
                    style={{ height: '2.3rem', padding: '0.3rem 0.65rem', fontSize: '0.8rem', width: '100%', margin: 0 }}
                  />
                ) : (
                  <select
                    id="bird-ring"
                    className="form-input"
                    value={newRing}
                    onChange={(e) => setNewRing(e.target.value)}
                    style={{
                      height: '2.3rem',
                      padding: '0.3rem 0.65rem',
                      fontSize: '0.78rem',
                      background: 'var(--bg-surface)',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      width: '100%',
                      margin: 0,
                    }}
                  >
                    {registeredBirds.map((b) => {
                      const isEnrolled = participatingRings.length === 0 || participatingRings.includes(b.ringNo.toUpperCase())
                      const isAlreadyClocked = birdsList.some((cb) => cb.ringNo.toUpperCase() === b.ringNo.toUpperCase())
                      return (
                        <option key={b.id} value={b.ringNo} disabled={isAlreadyClocked}>
                          {b.ringNo} {b.name ? `"${b.name}"` : ''} ({b.color || 'Racer'}) {isAlreadyClocked ? '✓ CLOCKED' : isEnrolled ? '• KASALI' : '— DI KASALI'}
                        </option>
                      )
                    })}
                  </select>
                )}

                {/* Arrival Time + Clock Button Row */}
                <div style={{ display: 'flex', gap: '0.45rem', alignItems: 'center' }}>
                  <div style={{ width: '115px', flexShrink: 0 }}>
                    <input
                      id="bird-time"
                      type="time"
                      step="1"
                      className="form-input"
                      value={newTime}
                      onChange={(e) => setNewTime(e.target.value)}
                      style={{
                        height: '2.3rem',
                        padding: '0.3rem 0.45rem',
                        fontSize: '0.84rem',
                        fontWeight: 700,
                        fontFamily: 'monospace',
                        textAlign: 'center',
                        width: '100%',
                        margin: 0,
                      }}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAddBird()}
                    style={{
                      flex: 1,
                      height: '2.3rem',
                      padding: '0 0.9rem',
                      borderRadius: '0.5rem',
                      border: 'none',
                      background: activityType === 'training'
                        ? 'linear-gradient(135deg, #3b82f6, #1d4ed8)'
                        : 'linear-gradient(135deg, #FFC107, #FF9800)',
                      color: '#000',
                      fontWeight: 800,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem',
                      whiteSpace: 'nowrap',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                    }}
                  >
                    <PlusIcon size={15} />
                    <span>Clock In Arrival</span>
                  </button>
                </div>
              </div>

              {/* Leaderboard Table */}
              {birdsList.length === 0 ? (
                <div style={{
                  padding: '1.25rem 1rem',
                  textAlign: 'center',
                  background: 'var(--bg-surface)',
                  borderRadius: '0.65rem',
                  border: '1px dashed var(--border-default)',
                  fontSize: '0.76rem',
                  color: 'var(--text-secondary)'
                }}>
                  🕊️ Walang ibon na naka-clock in pa. Piliin ang ibon sa itaas at i-click ang Clock, o itapat sa 125kHz RFID pad!
                </div>
              ) : (
                <div style={{
                  maxHeight: '270px',
                  overflowY: 'auto',
                  border: '1px solid var(--border-default)',
                  borderRadius: '0.65rem',
                  background: 'var(--bg-card)',
                  boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.3)',
                }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.74rem', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}>
                        <th style={{ padding: '0.45rem 0.35rem', fontWeight: 800, width: '2.4rem', textAlign: 'center', fontSize: '0.66rem', textTransform: 'uppercase' }}>Rank</th>
                        <th style={{ padding: '0.45rem 0.5rem', fontWeight: 800, fontSize: '0.66rem', textTransform: 'uppercase' }}>Pigeon</th>
                        <th style={{ padding: '0.45rem 0.5rem', fontWeight: 800, fontSize: '0.66rem', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Arrival / Flight</th>
                        <th style={{ padding: '0.45rem 0.5rem', fontWeight: 800, fontSize: '0.66rem', textTransform: 'uppercase', textAlign: 'right', whiteSpace: 'nowrap' }}>Speed / KPH</th>
                        <th style={{ padding: '0.45rem 0.35rem', width: '2.2rem', textAlign: 'center' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedBirdsList.map((bird, idx) => {
                        const matchedBird = registeredBirds.find((rb) => rb.ringNo.toUpperCase() === bird.ringNo.toUpperCase())
                        const isGold = idx === 0
                        const isSilver = idx === 1
                        const isBronze = idx === 2
                        const telemetry = getFlightTelemetry(bird.clockInTime, bird.speed)

                        return (
                          <tr
                            key={bird.ringNo}
                            style={{
                              borderBottom: idx < sortedBirdsList.length - 1 ? '1px solid var(--border-default)' : 'none',
                              background: isGold ? 'rgba(255, 193, 7, 0.05)' :
                                          isSilver ? 'rgba(203, 213, 225, 0.03)' :
                                          isBronze ? 'rgba(217, 119, 6, 0.03)' : 'transparent',
                            }}
                          >
                            {/* Rank Badge */}
                            <td style={{ padding: '0.5rem 0.35rem', textAlign: 'center', verticalAlign: 'middle' }}>
                              {isGold ? (
                                <span style={{ fontSize: '0.68rem', fontWeight: 900, padding: '0.18rem 0.42rem', borderRadius: '9999px', background: 'rgba(255, 193, 7, 0.25)', color: 'var(--brand-gold)', border: '1px solid rgba(255, 193, 7, 0.6)' }}>
                                  1st
                                </span>
                              ) : isSilver ? (
                                <span style={{ fontSize: '0.68rem', fontWeight: 900, padding: '0.18rem 0.42rem', borderRadius: '9999px', background: 'rgba(203, 213, 225, 0.2)', color: '#e2e8f0', border: '1px solid rgba(203, 213, 225, 0.45)' }}>
                                  2nd
                                </span>
                              ) : isBronze ? (
                                <span style={{ fontSize: '0.68rem', fontWeight: 900, padding: '0.18rem 0.42rem', borderRadius: '9999px', background: 'rgba(217, 119, 6, 0.2)', color: '#f59e0b', border: '1px solid rgba(217, 119, 6, 0.45)' }}>
                                  3rd
                                </span>
                              ) : (
                                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'monospace', fontWeight: 700 }}>#{idx + 1}</span>
                              )}
                            </td>

                            {/* Ring & Details */}
                            <td style={{ padding: '0.5rem 0.5rem', verticalAlign: 'middle' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.12rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                                  <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '0.78rem', color: isGold ? 'var(--brand-gold)' : '#fff', letterSpacing: '-0.02em' }}>
                                    {bird.ringNo}
                                  </span>
                                  {localPhotos[bird.ringNo.toUpperCase()] && (
                                    <button
                                      type="button"
                                      onClick={() => setSelectedMedia({ type: 'photo', url: localPhotos[bird.ringNo.toUpperCase()] })}
                                      style={{
                                        background: 'rgba(33, 150, 243, 0.15)',
                                        border: '1px solid rgba(33, 150, 243, 0.4)',
                                        borderRadius: '4px',
                                        color: '#60a5fa',
                                        padding: '0.05rem 0.35rem',
                                        fontSize: '0.62rem',
                                        cursor: 'pointer',
                                        fontWeight: 800,
                                      }}
                                      title="View Verification Photo"
                                    >
                                      📷
                                    </button>
                                  )}
                                  {localVideos[bird.ringNo.toUpperCase()] && (
                                    <button
                                      type="button"
                                      onClick={() => setSelectedMedia({ type: 'video', url: localVideos[bird.ringNo.toUpperCase()] })}
                                      style={{
                                        background: 'rgba(76, 175, 80, 0.15)',
                                        border: '1px solid rgba(76, 175, 80, 0.4)',
                                        borderRadius: '4px',
                                        color: '#4ade80',
                                        padding: '0.05rem 0.35rem',
                                        fontSize: '0.62rem',
                                        cursor: 'pointer',
                                        fontWeight: 800,
                                      }}
                                      title="View Verification Video"
                                    >
                                      📹
                                    </button>
                                  )}
                                </div>
                                {matchedBird && (
                                  <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', lineHeight: 1.2 }}>
                                    {matchedBird.name ? `${matchedBird.name} • ` : ''}{matchedBird.color || 'Racer'}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Arrival Time & Duration */}
                            <td style={{ padding: '0.5rem 0.5rem', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                                <span style={{ color: '#fff', fontFamily: 'monospace', fontSize: '0.78rem', fontWeight: 800 }}>
                                  {bird.clockInTime}
                                </span>
                                {telemetry.duration && (
                                  <span style={{ fontSize: '0.66rem', color: '#60a5fa', fontFamily: 'monospace', fontWeight: 700, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                                    <span>⏱️</span>
                                    <span>{telemetry.duration}</span>
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Speed & KPH */}
                            <td style={{ padding: '0.5rem 0.5rem', textAlign: 'right', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.15rem' }}>
                                <span style={{ fontWeight: 900, fontSize: '0.82rem', color: isGold ? 'var(--brand-gold)' : '#34d399', fontFamily: 'monospace' }}>
                                  {bird.speed.toLocaleString()} <span style={{ fontSize: '0.62rem', opacity: 0.8, fontFamily: 'sans-serif' }}>m/m</span>
                                </span>
                                <span style={{ fontSize: '0.66rem', color: 'var(--brand-gold)', fontWeight: 800, whiteSpace: 'nowrap' }}>
                                  ⚡ {telemetry.kph}
                                </span>
                              </div>
                            </td>

                            {/* Delete */}
                            <td style={{ padding: '0.5rem 0.35rem', textAlign: 'center', verticalAlign: 'middle' }}>
                              <button
                                type="button"
                                onClick={() => handleRemoveBird(bird.ringNo)}
                                style={{
                                  width: '26px',
                                  height: '26px',
                                  borderRadius: '0.45rem',
                                  background: 'rgba(239, 68, 68, 0.1)',
                                  border: '1px solid rgba(239, 68, 68, 0.25)',
                                  color: '#f87171',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  transition: 'all 0.15s ease',
                                }}
                                title="Remove clocked bird"
                              >
                                <TrashIcon size={13} />
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* CONDITIONAL RENDER: TRAINING, MEDICATION, NOTE DESCRIPTION */}
          {activityType !== 'race' && (
            <div className="form-group">
              <label htmlFor="notes" className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <NotesIcon size={14} /> Description / Notes
              </label>
              <textarea
                id="notes"
                className="form-input"
                rows={3}
                placeholder={
                  activityType === 'training' ? 'e.g. Release conditions, weather, loft arrivals...' :
                  activityType === 'medication' ? 'e.g. Deworming, vaccination booster, vitamins dosage...' :
                  'e.g. Cleared loft dust, scraped floor, sanitized boxes...'
                }
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                style={{ resize: 'vertical', fontFamily: 'inherit' }}
              />
            </div>
          )}

          {/* Error */}
          {error && <div className="form-error">{error}</div>}



          {/* Save Status */}
          {saveSuccess && (
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
              {eventToEdit ? 'Updated Successfully in Database!' : 'Saved Successfully to Database!'}
            </div>
          )}

          {/* Actions */}
          <div className="modal-actions" style={{ marginTop: '0.75rem' }}>
            <button className="btn-secondary" onClick={reset}>Reset</button>
            <button 
              className="btn-primary" 
              onClick={saveActivity} 
              disabled={saving || saveSuccess}
              style={{
                background: saveSuccess ? 'var(--color-success)' : (
                  activityType === 'training' ? '#2196F3' :
                  activityType === 'medication' ? '#4CAF50' :
                  activityType === 'task' ? '#9C27B0' : undefined
                ),
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
                  {eventToEdit ? 'Updating...' : 'Saving...'}
                </>
              ) : saveSuccess ? (
                eventToEdit ? 'Updated!' : 'Saved!'
              ) : activityType === 'race' ? (
                <>
                  <TrophyIcon size={16} />
                  <span>{eventToEdit ? 'Update Race' : 'Save Race'}</span>
                </>
              ) : activityType === 'training' ? (
                <>
                  <TrainingIcon size={16} />
                  <span>{eventToEdit ? 'Update Training' : 'Save Training'}</span>
                </>
              ) : (
                <>
                  <PlusIcon size={16} />
                  <span>{eventToEdit ? 'Update Event' : 'Save Event'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Floating Sub-Modal for Kasali sa Laro (Entries) */}
      {isEntriesModalOpen && (
        <div
          className="modal-backdrop modal-floating"
          style={{ zIndex: 11000 }}
          onClick={(e) => { if (e.target === e.currentTarget) setIsEntriesModalOpen(false) }}
        >
          <div
            className="modal-container"
            style={{
              maxWidth: '440px',
              width: '100%',
              background: '#0d1527',
              border: '1px solid rgba(255, 193, 7, 0.4)',
              borderRadius: '1.25rem',
              padding: '1.15rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.85)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <span style={{ fontSize: '1.25rem' }}>🕊️</span>
                <div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#fff' }}>
                    Kasali sa Laro (Entries)
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                    Piliin ang mga ibon na makikipag-karera sa flight na ito
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEntriesModalOpen(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: 'none',
                  color: '#fff',
                  borderRadius: '50%',
                  width: '28px',
                  height: '28px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                }}
                aria-label="Close entries popup"
              >
                ✕
              </button>
            </div>

            {/* Quick Select & Counter */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.75rem', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '0.5rem', border: '1px solid var(--border-default)' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--brand-gold)' }}>
                {participatingRings.length} of {registeredBirds.length} birds enrolled
              </span>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <button
                  type="button"
                  onClick={() => setParticipatingRings(registeredBirds.map(b => b.ringNo.toUpperCase()))}
                  style={{ fontSize: '0.68rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: '0.35rem', background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#fff', cursor: 'pointer' }}
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={() => setParticipatingRings([])}
                  style={{ fontSize: '0.68rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: '0.35rem', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', cursor: 'pointer' }}
                >
                  Clear All
                </button>
              </div>
            </div>

            {/* RFID Active Target Toggle */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.75rem', background: isRfidTarget ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255, 255, 255, 0.02)', borderRadius: '0.5rem', border: isRfidTarget ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--border-default)' }}>
              <label htmlFor="rfid-target-toggle-sheet" style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', cursor: 'pointer', color: isRfidTarget ? '#34d399' : 'rgba(255, 255, 255, 0.7)', fontSize: '0.74rem', fontWeight: 700 }}>
                <input
                  id="rfid-target-toggle-sheet"
                  type="checkbox"
                  checked={isRfidTarget}
                  onChange={(e) => setIsRfidTarget(e.target.checked)}
                  style={{ cursor: 'pointer', accentColor: '#10b981' }}
                />
                <span>📡 125kHz RFID Sensor Target Flight</span>
              </label>
              <span style={{ fontSize: '0.65rem', fontWeight: 800, padding: '0.15rem 0.45rem', borderRadius: '9999px', background: isRfidTarget ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.08)', color: isRfidTarget ? '#34d399' : 'var(--text-muted)' }}>
                {isRfidTarget ? 'TARGET LOCKED' : 'OFF'}
              </span>
            </div>

            {/* Bird Chips Grid */}
            <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexWrap: 'wrap', gap: '0.4rem', padding: '0.2rem 0' }}>
              {registeredBirds.length === 0 ? (
                <div style={{ padding: '1rem', textAlign: 'center', width: '100%', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Walang rehistradong ibon sa loft. Mag-rehistro muna sa Loft Registry!
                </div>
              ) : (
                registeredBirds.map((bird) => {
                  const isSelected = participatingRings.includes(bird.ringNo.toUpperCase())
                  return (
                    <button
                      key={bird.id}
                      type="button"
                      onClick={() => {
                        const upper = bird.ringNo.toUpperCase()
                        setParticipatingRings((prev) =>
                          prev.includes(upper) ? prev.filter((r) => r !== upper) : [...prev, upper]
                        )
                      }}
                      style={{
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        padding: '0.35rem 0.65rem',
                        borderRadius: '9999px',
                        cursor: 'pointer',
                        border: isSelected ? '1px solid rgba(16, 185, 129, 0.8)' : '1px solid rgba(255, 255, 255, 0.12)',
                        background: isSelected ? 'rgba(16, 185, 129, 0.22)' : 'rgba(255, 255, 255, 0.03)',
                        color: isSelected ? '#34d399' : '#cbd5e1',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        transition: 'all 0.12s ease',
                        fontFamily: 'monospace',
                      }}
                    >
                      <span>{isSelected ? '✓' : '+'}</span>
                      <span>{bird.ringNo}</span>
                      <span style={{ fontSize: '0.62rem', opacity: 0.7, fontFamily: 'sans-serif' }}>
                        ({bird.color || 'Racer'})
                      </span>
                    </button>
                  )
                })
              )}
            </div>

            {/* Sheet Done button */}
            <button
              type="button"
              onClick={() => setIsEntriesModalOpen(false)}
              style={{
                width: '100%',
                padding: '0.65rem',
                borderRadius: '0.6rem',
                background: 'var(--brand-gold)',
                color: '#000',
                fontWeight: 800,
                fontSize: '0.82rem',
                border: 'none',
                cursor: 'pointer',
                marginTop: '0.2rem',
              }}
            >
              Tapos Na / Done ({participatingRings.length} Selected)
            </button>
          </div>
        </div>
      )}

      {/* Lightbox for verification media */}
      {selectedMedia && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            cursor: 'zoom-out'
          }}
          onClick={() => setSelectedMedia(null)}
        >
          <div 
            style={{
              position: 'relative',
              maxWidth: '90%',
              maxHeight: '90%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1rem'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {selectedMedia.type === 'photo' ? (
              <img 
                src={selectedMedia.url} 
                alt="Verification watermark photo"
                style={{
                  maxWidth: '100%',
                  maxHeight: '80vh',
                  objectFit: 'contain',
                  borderRadius: '0.5rem',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
                }}
              />
            ) : (
              <video 
                src={selectedMedia.url} 
                controls 
                autoPlay 
                loop
                style={{
                  maxWidth: '100%',
                  maxHeight: '80vh',
                  borderRadius: '0.5rem',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
                }}
              />
            )}
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                className="nav-btn nav-btn-primary"
                onClick={() => {
                  const link = document.createElement('a')
                  link.href = selectedMedia.url
                  const ext = selectedMedia.type === 'photo' ? 'jpg' : 'webm'
                  link.download = `verified-clockin-media.${ext}`
                  document.body.appendChild(link)
                  link.click()
                  document.body.removeChild(link)
                }}
                style={{ fontSize: '0.8rem', padding: '0.4rem 0.88rem', fontWeight: 700 }}
              >
                📥 Download {selectedMedia.type === 'photo' ? 'Photo' : 'Video'}
              </button>
              <button
                type="button"
                className="nav-btn nav-btn-secondary"
                onClick={() => setSelectedMedia(null)}
                style={{ fontSize: '0.8rem', padding: '0.4rem 0.88rem', color: '#fff', borderColor: 'rgba(255,255,255,0.3)' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
