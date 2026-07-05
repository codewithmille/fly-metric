'use client'

import { useState, useEffect, useRef } from 'react'
import type { RaceEvent } from '@/app/api/race-events/route'
import { BirdIcon, PlusIcon, TagIcon, TimerIcon, NotesIcon, RulerIcon, TrashIcon, PillIcon, CalendarIcon, TrophyIcon, TrainingIcon, LightningIcon } from '@/components/icons'
import { saveEvent } from '@/lib/apiClient'
import type { Session } from '@supabase/supabase-js'

interface LoftBird {
  id: string
  ringNo: string
  color: string
  name: string | null
  gender: string | null
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
}

interface BirdRecord {
  ringNo: string
  clockInTime: string
  speed: number
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

  const modalRef = useRef<HTMLDivElement>(null)

  // Sync date when parent passes a new selectedDate or eventToEdit
  useEffect(() => {
    if (isOpen) {
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
      } else {
        setRaceDate(selectedDate)
        setActivityType('race')
        setDistanceKmStr('90')
        setReleaseTime('06:00')
        setClockInTime('09:30')
        setTotalBirds('0')
        setWinner('TBD')
        setNotes('')
        setTitle(`🏆 90km Race`)
        setBirdsList([])
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
  }, [isOpen, selectedDate, eventToEdit, registeredBirds])

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

  const handleAddBird = () => {
    setError('')
    if (!newRing.trim()) {
      setError('Please enter a bird Ring Number.')
      return
    }

    const ring = newRing.trim().toUpperCase()
    if (birdsList.some((b) => b.ringNo.toUpperCase() === ring)) {
      setError(`Bird with Ring No. "${ring}" is already in the list.`)
      return
    }

    // Calculate speed for this specific bird
    const distanceKm = parseFloat(distanceKmStr)
    if (isNaN(distanceKm) || distanceKm <= 0) {
      setError('Please enter a valid distance first.')
      return
    }

    const [rH, rM] = releaseTime.split(':').map(Number)
    const [cH, cM] = newTime.split(':').map(Number)
    const releaseMinutes = rH * 60 + rM
    const clockInMinutes = cH * 60 + cM

    if (clockInMinutes <= releaseMinutes) {
      setError('Arrival time must be after release time (' + releaseTime + ').')
      return
    }

    const flyingTotalMins = clockInMinutes - releaseMinutes
    const distanceYards = distanceKm * 1093.613
    const speed = Math.round(distanceYards / flyingTotalMins)

    const newBird: BirdRecord = {
      ringNo: ring,
      clockInTime: newTime,
      speed,
    }

    setBirdsList([...birdsList, newBird])
    setNewRing(registeredBirds.length > 0 ? registeredBirds[0].ringNo : '')
  }

  const handleRemoveBird = (idx: number) => {
    setBirdsList(birdsList.filter((_, i) => i !== idx))
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
      const res = await saveEvent(authToken, {
        id: eventToEdit?.id,
        title: title || 'New Activity',
        date: raceDate,
        totalBirds: dbBirds,
        maxSpeed: maxSpeed,
        avgSpeed: avgSpeed,
        location: dbLocation,
        club: dbClub,
        distance: dbDistance,
        winner: dbWinner,
        releaseTime: (activityType === 'race' || activityType === 'training') ? releaseTime : undefined,
        clockInTime: (activityType === 'race' || activityType === 'training') ? clockInTime : undefined,
        birds: (activityType === 'race' || activityType === 'training') ? JSON.stringify(birdsList) : '[]',
      }, isEdit)

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
  let speedPreviewYards = 0
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
          const distanceYards = distanceKm * 1093.613
          speedPreviewYards = Math.round(distanceYards / flyingTotalMins)
          speedPreviewKmh = Math.round((distanceKm / flyingTotalMins) * 60 * 100) / 100
          flyingHours = Math.floor(flyingTotalMins / 60)
          flyingMins = flyingTotalMins % 60
        }
      }
    }
  }

  if (!isOpen) return null

  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div
        className="modal-container"
        ref={modalRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        style={{ maxWidth: '540px' }}
      >
        {/* Header styling adapts to activity type */}
        <div className="modal-header" style={{
          background: activityType === 'race' ? 'linear-gradient(135deg, #FFC107, #FF8F00)' :
                      activityType === 'training' ? 'linear-gradient(135deg, #2196F3, #1565C0)' :
                      activityType === 'medication' ? 'linear-gradient(135deg, #4CAF50, #2E7D32)' :
                      'linear-gradient(135deg, #9C27B0, #6A1B9A)'
        }}>
          <div className="modal-header-left">
            <span className="modal-pigeon-icon" style={{ display: 'flex', alignItems: 'center', color: '#fff' }}>
              {activityType === 'race' ? <TrophyIcon size={24} /> :
               activityType === 'training' ? <TrainingIcon size={24} /> :
               activityType === 'medication' ? <PillIcon size={24} /> : <NotesIcon size={24} />}
            </span>
            <div>
              <h2 id="modal-title" className="modal-title" style={{ color: '#fff' }}>
                {eventToEdit ? 'Activity Details' : 'Add Activity'}
              </h2>
              <p className="modal-subtitle" style={{ color: 'rgba(255,255,255,0.75)' }}>
                {eventToEdit ? 'Calculate speed and update records' : 'Schedule a new activity on the calendar'}
              </p>
            </div>
          </div>
          <button className="modal-close-btn" style={{ color: '#fff', background: 'rgba(255,255,255,0.15)' }} onClick={onClose} aria-label="Close modal">✕</button>
        </div>

        {/* Tab Selection */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid var(--border-default)',
          background: 'var(--bg-surface)'
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

        {/* Body */}
        <div className="modal-body">

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
                    fontSize: '0.88rem',
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
              </div>
            </>
          )}

          {/* Bird Clocking List Manager (Only when editing an existing Race or Training event) */}
          {eventToEdit && (activityType === 'race' || activityType === 'training') && (
            <div style={{ marginTop: '1.25rem', borderTop: '1px solid var(--border-default)', paddingTop: '1rem' }}>
              <h3 style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <BirdIcon size={16} /> Clocked Birds ({birdsList.length})
              </h3>
              
              {/* Add Bird Inputs */}
              <div className="add-bird-row">
                <div className="form-group add-bird-group">
                  <label htmlFor="bird-ring" className="form-label" style={{ fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <TagIcon size={12} /> Select Bird
                  </label>
                  {registeredBirds.length === 0 ? (
                    <div style={{
                      fontSize: '0.7rem',
                      color: 'var(--brand-gold)',
                      background: 'rgba(255, 193, 7, 0.05)',
                      border: '1px solid rgba(255, 193, 7, 0.2)',
                      borderRadius: '0.5rem',
                      padding: '0.3rem 0.5rem',
                      height: '2.2rem',
                      display: 'flex',
                      alignItems: 'center',
                      lineHeight: '1.1'
                    }}>
                      Register birds first!
                    </div>
                  ) : (
                    <select
                      id="bird-ring"
                      className="form-input"
                      value={newRing}
                      onChange={(e) => setNewRing(e.target.value)}
                      style={{
                        height: '2.2rem',
                        padding: '0.3rem 0.6rem',
                        fontSize: '0.8rem',
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
                <div className="form-group add-bird-group">
                  <label htmlFor="bird-time" className="form-label" style={{ fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <TimerIcon size={12} /> Arrival Time
                  </label>
                  <input
                    id="bird-time"
                    type="time"
                    className="form-input"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    style={{ height: '2.2rem', padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddBird}
                  className="add-bird-btn"
                  style={{
                    background: activityType === 'training' ? '#2196F3' : 'var(--brand-gold)',
                    color: activityType === 'training' ? '#fff' : '#000',
                  }}
                >
                  <PlusIcon size={14} /> Add
                </button>
              </div>

              {/* Bird List Table */}
              {birdsList.length === 0 ? (
                <div style={{
                  padding: '1rem',
                  textAlign: 'center',
                  background: 'var(--bg-surface)',
                  borderRadius: '0.5rem',
                  border: '1px dashed var(--border-default)',
                  fontSize: '0.78rem',
                  color: 'var(--text-secondary)'
                }}>
                  No birds clocked in yet. Add a bird above!
                </div>
              ) : (
                <div style={{
                  maxHeight: '140px',
                  overflowY: 'auto',
                  border: '1px solid var(--border-default)',
                  borderRadius: '0.5rem',
                  background: 'var(--bg-card)'
                }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}>
                        <th style={{ padding: '0.4rem 0.6rem', fontWeight: 700 }}>Ring No.</th>
                        <th style={{ padding: '0.4rem 0.6rem', fontWeight: 700 }}>Arrival</th>
                        <th style={{ padding: '0.4rem 0.6rem', fontWeight: 700, textAlign: 'right' }}>Speed</th>
                        <th style={{ padding: '0.4rem 0.6rem', fontWeight: 700, textAlign: 'center', width: '2.5rem' }}>Del</th>
                      </tr>
                    </thead>
                    <tbody>
                      {birdsList.map((bird, idx) => (
                        <tr key={idx} style={{ borderBottom: idx < birdsList.length - 1 ? '1px solid var(--border-default)' : 'none' }}>
                          <td style={{ padding: '0.4rem 0.6rem', fontWeight: 700, color: 'var(--text-primary)' }}>{bird.ringNo}</td>
                          <td style={{ padding: '0.4rem 0.6rem', color: 'var(--text-secondary)' }}>{bird.clockInTime}</td>
                          <td style={{ padding: '0.4rem 0.6rem', fontWeight: 700, color: 'var(--brand-gold)', textAlign: 'right' }}>{bird.speed.toLocaleString()} ypm</td>
                          <td style={{ padding: '0.4rem 0.6rem', textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => handleRemoveBird(idx)}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--color-error)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: 0,
                                width: '100%'
                              }}
                              title="Delete bird"
                            >
                              <TrashIcon size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
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

          {/* Real-time speed calculation preview block */}
          {eventToEdit && speedPreviewYards > 0 && (
            <div style={{
              background: 'rgba(255, 193, 7, 0.04)',
              border: '1px solid rgba(255, 193, 7, 0.2)',
              borderRadius: '0.875rem',
              padding: '0.875rem 1.125rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              marginTop: '0.5rem',
              marginBottom: '0.5rem'
            }}>
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <LightningIcon size={12} /> Calculated Speed
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', marginTop: '0.2rem' }}>
                  <span style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--brand-gold)' }}>
                    {speedPreviewYards.toLocaleString()}
                  </span>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                    yards / min
                  </span>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {speedPreviewKmh} km/h
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
                  Flying Time: {flyingHours}h {flyingMins}m
                </div>
              </div>
            </div>
          )}

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
    </div>
  )
}
