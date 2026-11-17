'use client'

import { useState } from 'react'
import { PlusIcon, TrophyIcon, RocketIcon, MapPinIcon, GlobeIcon, NotesIcon } from '@/components/icons'
import LoftMapPreview from '@/components/LoftMapPreview'

interface CreateGroupRaceModalProps {
  isOpen: boolean
  today: string
  onClose: () => void
  onSuccess: (race: any) => void
}

const POPULAR_RELEASE_POINTS = [
  { name: 'Aparri, Cagayan', km: 520, lat: 18.3562, lng: 121.6417 },
  { name: 'Tuguegarao, Cagayan', km: 410, lat: 17.6132, lng: 121.7270 },
  { name: 'Ilagan, Isabela', km: 340, lat: 17.1481, lng: 121.8872 },
  { name: 'Laoag, Ilocos Norte', km: 440, lat: 18.1960, lng: 120.5927 },
  { name: 'Vigan, Ilocos Sur', km: 380, lat: 17.5747, lng: 120.3869 },
  { name: 'Dagupan, Pangasinan', km: 180, lat: 16.0433, lng: 120.3333 },
  { name: 'Tarlac City', km: 120, lat: 15.4802, lng: 120.5979 },
  { name: 'Lucena, Quezon', km: 140, lat: 13.9374, lng: 121.6172 },
  { name: 'Naga, Bicol', km: 290, lat: 13.6218, lng: 123.1948 },
  { name: 'Matnog, Sorsogon', km: 530, lat: 12.5847, lng: 124.0853 },
  { name: 'Allen, Samar', km: 570, lat: 12.5000, lng: 124.2833 },
]

export default function CreateGroupRaceModal({
  isOpen,
  today,
  onClose,
  onSuccess,
}: CreateGroupRaceModalProps) {
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(today)
  const [releaseTime, setReleaseTime] = useState('06:00')
  const [location, setLocation] = useState('')
  const [distance, setDistance] = useState<number | ''>(500)
  const [club, setClub] = useState('Club Derby')
  const [organizerLoftName, setOrganizerLoftName] = useState('My Loft')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // GPS & Map release point states
  const [releaseLat, setReleaseLat] = useState<number | null>(null)
  const [releaseLng, setReleaseLng] = useState<number | null>(null)
  const [showMapPicker, setShowMapPicker] = useState(false)
  const [fetchingGps, setFetchingGps] = useState(false)

  // Success view state with join code
  const [createdRace, setCreatedRace] = useState<any | null>(null)
  const [copied, setCopied] = useState(false)

  if (!isOpen) return null

  // Calculate distance from default/loft coordinates
  const calculateDistance = (rLat: number, rLng: number) => {
    let lLat = 14.5995
    let lLng = 120.9842
    try {
      const storedLat = localStorage.getItem('flymetric_loft_lat')
      const storedLng = localStorage.getItem('flymetric_loft_lng')
      if (storedLat && storedLng) {
        lLat = parseFloat(storedLat)
        lLng = parseFloat(storedLng)
      }
    } catch {}

    const R = 6371 // Earth radius in km
    const dLat = ((rLat - lLat) * Math.PI) / 180
    const dLon = ((rLng - lLng) * Math.PI) / 180
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lLat * Math.PI) / 180) *
        Math.cos((rLat * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return Math.round(R * c)
  }

  // Handle GPS button click
  const handleUseDeviceGps = () => {
    setError(null)
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.')
      return
    }
    setFetchingGps(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        setReleaseLat(lat)
        setReleaseLng(lng)
        setLocation(`GPS (${lat.toFixed(4)}, ${lng.toFixed(4)})`)
        const dist = calculateDistance(lat, lng)
        if (dist > 0) setDistance(dist)
        setFetchingGps(false)
      },
      (err) => {
        console.error('GPS error:', err)
        setError('Failed to retrieve location. Please check browser permissions.')
        setFetchingGps(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  // Handle Map Pin Click
  const handleMapClick = (lat: number, lng: number) => {
    setReleaseLat(lat)
    setReleaseLng(lng)
    setLocation(`Map Pin (${lat.toFixed(4)}, ${lng.toFixed(4)})`)
    const dist = calculateDistance(lat, lng)
    if (dist > 0) setDistance(dist)
  }

  // Handle Preset Selection
  const handleSelectPreset = (p: typeof POPULAR_RELEASE_POINTS[0]) => {
    setLocation(p.name)
    setDistance(p.km)
    setReleaseLat(p.lat)
    setReleaseLng(p.lng)
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      setError('Event title is required')
      return
    }
    if (!date) {
      setError('Race date is required')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('supabase.auth.token') : null
      const authHeader = token ? `Bearer ${token}` : ''

      const res = await fetch('/api/group-races', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authHeader ? { Authorization: authHeader } : {}),
        },
        body: JSON.stringify({
          title: title.trim(),
          date,
          releaseTime,
          location: location.trim() || 'Club Release Point',
          club: club.trim() || 'Club Derby',
          distance: Number(distance) || 0,
          organizerLoftName: organizerLoftName.trim() || 'Race Organizer Loft',
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create group race')
      }

      setCreatedRace(data.data)
      onSuccess(data.data)
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Error launching race')
    } finally {
      setSubmitting(false)
    }
  }

  const copyCode = () => {
    if (!createdRace?.joinCode) return
    navigator.clipboard.writeText(createdRace.joinCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

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
        if (e.target === e.currentTarget && !submitting) onClose()
      }}
    >
      <div
        className="modal-container"
        style={{
          width: '100%',
          maxWidth: '460px',
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
        {/* Header */}
        <div
          style={{
            padding: '0.85rem 1.15rem',
            background: '#0e1420',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <span
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '0.5rem',
                background: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid rgba(245, 158, 11, 0.25)',
                color: '#f59e0b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <TrophyIcon size={16} />
            </span>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 800, color: '#fff' }}>
                {createdRace ? 'Group Race Launched!' : 'Create Group Activity Race'}
              </h3>
              <p style={{ margin: '0.1rem 0 0 0', fontSize: '0.68rem', color: '#94a3b8' }}>
                {createdRace ? 'Share this Join Code with other fanciers' : 'Host a club derby or shared training flight'}
              </p>
            </div>
          </div>

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
              flexShrink: 0,
            }}
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '1rem 1.15rem', overflowY: 'auto' }}>
          {createdRace ? (
            /* Created Success View with Shareable Join Code */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center', textAlign: 'center' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: 'rgba(74, 222, 128, 0.15)',
                  border: '1px solid rgba(74, 222, 128, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2rem',
                  marginTop: '0.5rem',
                  color: '#4ade80',
                }}
              >
                <TrophyIcon size={28} />
              </div>

              <div>
                <h4 style={{ margin: '0 0 0.25rem 0', color: '#fff', fontSize: '1.1rem', fontWeight: 900 }}>
                  {createdRace.title}
                </h4>
                <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.78rem', fontFamily: 'monospace' }}>
                  {createdRace.date} • {createdRace.location} • {createdRace.distance} km
                </p>
              </div>

              {/* Join Code Display Card */}
              <div
                style={{
                  width: '100%',
                  background: 'rgba(245, 158, 11, 0.08)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  borderRadius: '0.75rem',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.4rem',
                  alignItems: 'center',
                }}
              >
                <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#f59e0b', fontWeight: 800, fontFamily: 'monospace' }}>
                  Official Join Code
                </span>
                <span
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '2rem',
                    fontWeight: 900,
                    letterSpacing: '0.15em',
                    color: '#fff',
                  }}
                >
                  {createdRace.joinCode}
                </span>
                <p style={{ fontSize: '0.7rem', color: '#cbd5e1', margin: 0 }}>
                  Fanciers can enter this code in <strong>Activities → Join Race</strong> to basket their birds.
                </p>

                <button
                  type="button"
                  onClick={copyCode}
                  style={{
                    marginTop: '0.5rem',
                    padding: '0.45rem 1.25rem',
                    borderRadius: '0.5rem',
                    background: copied ? '#22c55e' : '#f59e0b',
                    color: '#090d16',
                    border: 'none',
                    fontWeight: 800,
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <NotesIcon size={14} />
                  <span>{copied ? 'Copied to Clipboard' : 'Copy Join Code'}</span>
                </button>
              </div>

              <button
                type="button"
                onClick={onClose}
                style={{
                  width: '100%',
                  padding: '0.6rem',
                  borderRadius: '0.6rem',
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                }}
              >
                Done / Back to Activities
              </button>
            </div>
          ) : (
            /* Creation Form */
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {error && (
                <div
                  style={{
                    padding: '0.6rem 0.8rem',
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.35)',
                    borderRadius: '0.5rem',
                    color: '#f87171',
                    fontSize: '0.75rem',
                  }}
                >
                  ⚠️ {error}
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8', marginBottom: '0.3rem' }}>
                  RACE TITLE *
                </label>
                <input
                  type="text"
                  placeholder="e.g. McArthur Club Grand Derby 2026"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    borderRadius: '0.55rem',
                    background: 'rgba(15, 23, 42, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#fff',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                  }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8', marginBottom: '0.3rem' }}>
                    RELEASE DATE *
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.75rem',
                      borderRadius: '0.55rem',
                      background: 'rgba(15, 23, 42, 0.8)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#fff',
                      fontSize: '0.8rem',
                    }}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8', marginBottom: '0.3rem' }}>
                    RELEASE TIME
                  </label>
                  <input
                    type="time"
                    value={releaseTime}
                    onChange={(e) => setReleaseTime(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.75rem',
                      borderRadius: '0.55rem',
                      background: 'rgba(15, 23, 42, 0.8)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#fff',
                      fontSize: '0.8rem',
                    }}
                  />
                </div>
              </div>

              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '0.6rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8', marginBottom: '0.3rem' }}>
                      RELEASE POINT / LOCATION *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Aparri, Cagayan"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.55rem 0.75rem',
                        borderRadius: '0.55rem',
                        background: 'rgba(15, 23, 42, 0.8)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        color: '#fff',
                        fontSize: '0.8rem',
                      }}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8', marginBottom: '0.3rem' }}>
                      DISTANCE (KM)
                    </label>
                    <input
                      type="number"
                      min="1"
                      placeholder="520"
                      value={distance}
                      onChange={(e) => setDistance(e.target.value === '' ? '' : Number(e.target.value))}
                      style={{
                        width: '100%',
                        padding: '0.55rem 0.75rem',
                        borderRadius: '0.55rem',
                        background: 'rgba(15, 23, 42, 0.8)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        color: '#fff',
                        fontSize: '0.8rem',
                        fontFamily: 'monospace',
                      }}
                    />
                  </div>
                </div>

                {/* GPS and Map Selectors Toolbar */}
                <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.35rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={handleUseDeviceGps}
                    disabled={fetchingGps}
                    style={{
                      padding: '0.25rem 0.55rem',
                      borderRadius: '0.45rem',
                      background: 'rgba(56, 189, 248, 0.12)',
                      border: '1px solid rgba(56, 189, 248, 0.35)',
                      color: '#38bdf8',
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                    }}
                  >
                    <MapPinIcon size={12} />
                    <span>{fetchingGps ? 'Getting GPS…' : 'Use Current GPS'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowMapPicker(!showMapPicker)}
                    style={{
                      padding: '0.25rem 0.55rem',
                      borderRadius: '0.45rem',
                      background: showMapPicker ? 'rgba(245, 158, 11, 0.18)' : 'rgba(255, 255, 255, 0.05)',
                      border: showMapPicker ? '1px solid rgba(245, 158, 11, 0.45)' : '1px solid rgba(255, 255, 255, 0.12)',
                      color: showMapPicker ? '#f59e0b' : '#cbd5e1',
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                    }}
                  >
                    <GlobeIcon size={12} />
                    <span>{showMapPicker ? 'Hide Map Picker' : 'Select on Map / Presets'}</span>
                  </button>
                </div>

                {/* Interactive Map & Preset Points Drawer */}
                {showMapPicker && (
                  <div
                    style={{
                      marginTop: '0.5rem',
                      padding: '0.6rem',
                      background: 'rgba(2, 6, 23, 0.7)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '0.75rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem',
                    }}
                  >
                    {/* Quick Presets Carousel / Chips */}
                    <div>
                      <span style={{ display: 'block', fontSize: '0.64rem', fontWeight: 800, color: '#FFC107', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                        Quick Select Top Racing Points
                      </span>
                      <div
                        style={{
                          display: 'flex',
                          gap: '0.3rem',
                          overflowX: 'auto',
                          paddingBottom: '0.25rem',
                        }}
                      >
                        {POPULAR_RELEASE_POINTS.map((p) => {
                          const active = location === p.name

                          return (
                            <button
                              key={p.name}
                              type="button"
                              onClick={() => handleSelectPreset(p)}
                              style={{
                                padding: '0.2rem 0.5rem',
                                borderRadius: '0.4rem',
                                background: active ? 'rgba(255, 193, 7, 0.25)' : 'rgba(255, 255, 255, 0.04)',
                                border: active ? '1px solid #FFC107' : '1px solid rgba(255, 255, 255, 0.08)',
                                color: active ? '#FFC107' : '#cbd5e1',
                                fontSize: '0.65rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {p.name.split(',')[0]} ({p.km}km)
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Interactive Leaflet Map View */}
                    <div style={{ borderRadius: '0.6rem', overflow: 'hidden', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                      <LoftMapPreview
                        height="170px"
                        releaseLat={releaseLat}
                        releaseLng={releaseLng}
                        onMapClick={handleMapClick}
                        clickHint="Tap map to set release pin"
                      />
                    </div>
                    {releaseLat && releaseLng && (
                      <div style={{ fontSize: '0.65rem', color: '#38bdf8', fontFamily: 'monospace', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Lat: {releaseLat.toFixed(4)}°N, Lng: {releaseLng.toFixed(4)}°E</span>
                        <span>Auto-calculated ~{distance} km</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8', marginBottom: '0.3rem' }}>
                    CLUB / DERBY TYPE
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Club Derby"
                    value={club}
                    onChange={(e) => setClub(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.75rem',
                      borderRadius: '0.55rem',
                      background: 'rgba(15, 23, 42, 0.8)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#fff',
                      fontSize: '0.8rem',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8', marginBottom: '0.3rem' }}>
                    YOUR LOFT NAME (ADMIN)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Golden Wings Loft"
                    value={organizerLoftName}
                    onChange={(e) => setOrganizerLoftName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.75rem',
                      borderRadius: '0.55rem',
                      background: 'rgba(15, 23, 42, 0.8)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#fff',
                      fontSize: '0.8rem',
                    }}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={submitting}
                  style={{
                    flex: 1,
                    padding: '0.6rem',
                    borderRadius: '0.6rem',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#94a3b8',
                    fontWeight: 700,
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    flex: 2,
                    padding: '0.6rem 1rem',
                    borderRadius: '0.5rem',
                    background: '#f59e0b',
                    border: '1px solid rgba(245, 158, 11, 0.4)',
                    color: '#090d16',
                    fontWeight: 800,
                    fontSize: '0.82rem',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.45rem',
                    opacity: submitting ? 0.7 : 1,
                    transition: 'all 0.15s ease',
                  }}
                >
                  <RocketIcon size={14} />
                  <span>{submitting ? 'Generating Join Code…' : 'Launch Group Race'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
