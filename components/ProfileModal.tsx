'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { Session } from '@supabase/supabase-js'
import LoftMapPreview from '@/components/LoftMapPreview'
import type { RaceEvent } from '@/app/api/race-events/route'
import { BirdIcon, PlusIcon, TagIcon, NotesIcon, NameIcon, DnaIcon, TrashIcon, SettingsIcon } from '@/components/icons'
import { saveBird, deleteBird, saveEvent, generateLocalId } from '@/lib/apiClient'

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
  createdAt?: string
}

interface BirdRecord {
  ringNo: string
  clockInTime: string
  speed: number
}

interface ProfileModalProps {
  isOpen: boolean
  onClose: () => void
  session: Session | null
  onProfileUpdated?: () => void
  registeredBirds: LoftBird[]
  onBirdsUpdated: () => void
  events: RaceEvent[]
  onAddEventTrigger?: () => void
  onOpenRegistryTrigger?: () => void
}

export default function ProfileModal({
  isOpen,
  onClose,
  session,
  onProfileUpdated,
  registeredBirds,
  onBirdsUpdated,
  events,
  onAddEventTrigger,
  onOpenRegistryTrigger,
}: ProfileModalProps) {
  const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false)

  // Profile Form States
  const [displayName, setDisplayName] = useState('')
  const [loftName, setLoftName] = useState('')
  const [locationText, setLocationText] = useState('')
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  
  const [registrySearch, setRegistrySearch] = useState('')

  // Control States
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [seeding, setSeeding] = useState(false)
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)

  const [fetchingGps, setFetchingGps] = useState(false)
  const modalRef = useRef<HTMLDivElement>(null)
  const wasOpenRef = useRef(false)
  // Individual Bird History States
  const [selectedHistoryBird, setSelectedHistoryBird] = useState<LoftBird | null>(null)
  const [selectedMedia, setSelectedMedia] = useState<{ type: 'photo' | 'video'; url: string } | null>(null)
  const [localPhotos, setLocalPhotos] = useState<Record<string, Record<string, string>>>({})
  const [localVideos, setLocalVideos] = useState<Record<string, Record<string, string>>>({})

  useEffect(() => {
    if (!isOpen) {
      setSelectedHistoryBird(null)
      setIsSettingsModalOpen(false)
      setIsSettingsMenuOpen(false)
    }
  }, [isOpen])

  // Load verification media for selected history bird
  useEffect(() => {
    if (selectedHistoryBird && isOpen) {
      const photos: Record<string, string> = {}
      const videos: Record<string, string> = {}
      const ring = selectedHistoryBird.ringNo.toUpperCase()

      flightEvents.forEach((ev) => {
        const photoKey = `verify_photo_${ev.id}_${ring}`
        const storedPhoto = localStorage.getItem(photoKey)
        if (storedPhoto) {
          photos[ev.id] = storedPhoto
        }

        const videoKey = `verify_video_${ev.id}_${ring}`
        const storedVideo = localStorage.getItem(videoKey)
        if (storedVideo) {
          videos[ev.id] = storedVideo
        }
      })

      setLocalPhotos(prev => ({ ...prev, [selectedHistoryBird.id]: photos }))
      setLocalVideos(prev => ({ ...prev, [selectedHistoryBird.id]: videos }))
    }
  }, [selectedHistoryBird, isOpen])

  // Load profile values on open
  useEffect(() => {
    if (isOpen && !wasOpenRef.current && session?.user) {
      const metadata = session.user.user_metadata || {}
      setDisplayName(metadata.full_name || session.user.email?.split('@')[0] || 'Fancier')
      setLoftName(metadata.loft_name || '')
      setLocationText(metadata.loft_location_text || '')
      setLatitude(metadata.loft_latitude?.toString() || '')
      setLongitude(metadata.loft_longitude?.toString() || '')
      setSuccess(false)
      setError(null)
      modalRef.current?.focus()
    }
    wasOpenRef.current = isOpen
  }, [isOpen, session])

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  // ── STATS CALCULATION ───────────────────────────────────────
  const flightEvents = events.filter(e => e.extendedProps?.club === 'Race' || e.extendedProps?.club === 'Training')
  
  // Clock-in Rate Calculation
  const totalExpected = flightEvents.reduce((sum, e) => sum + (e.extendedProps?.totalBirds || 0), 0)
  const totalClocked = flightEvents.reduce((sum, e) => {
    try {
      const list = JSON.parse(e.extendedProps?.birds || '[]')
      return sum + (Array.isArray(list) ? list.length : 0)
    } catch { return sum }
  }, 0)
  const clockInRate = totalExpected > 0 ? Math.round((totalClocked / totalExpected) * 100) : 0

  // Unique seasons (years)
  const years = Array.from(new Set(flightEvents.map(e => new Date(e.date).getFullYear()).filter(Boolean)))
  const seasonsCount = Math.max(years.length, registeredBirds.length > 0 || flightEvents.length > 0 ? 1 : 0)

  // Avg Pigeons per Season (uses active loft count or total entries per season so it never falsely shows 0 when birds exist)
  const avgPigeons = seasonsCount > 0
    ? Math.max(registeredBirds.length, Math.round(totalExpected / seasonsCount))
    : registeredBirds.length

  const cocksCount = registeredBirds.filter(b => b.gender?.toLowerCase() === 'cock').length
  const hensCount = registeredBirds.filter(b => b.gender?.toLowerCase() === 'hen').length

  // ── ACTIONS ────────────────────────────────────────────────
  const handleUseDeviceGps = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.')
      return
    }

    setFetchingGps(true)
    setError(null)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toFixed(6))
        setLongitude(position.coords.longitude.toFixed(6))
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

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(false)

    if (!displayName.trim()) {
      setError('Display name is required.')
      setSaving(false)
      return
    }

    const latNum = parseFloat(latitude)
    const lngNum = parseFloat(longitude)

    if (latitude && (isNaN(latNum) || latNum < -90 || latNum > 90)) {
      setError('Please enter a valid Latitude (-90 to 90 degrees).')
      setSaving(false)
      return
    }

    if (longitude && (isNaN(lngNum) || lngNum < -180 || lngNum > 180)) {
      setError('Please enter a valid Longitude (-180 to 180 degrees).')
      setSaving(false)
      return
    }

    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: displayName.trim(),
          loft_name: loftName.trim() || undefined,
          loft_location_text: locationText.trim() || undefined,
          loft_latitude: latitude ? latNum : null,
          loft_longitude: longitude ? lngNum : null,
        }
      })

      if (error) throw error

      setSuccess(true)
      onProfileUpdated?.()
      setTimeout(() => {
        setSuccess(false)
        setIsSettingsModalOpen(false)
      }, 1200)
    } catch (err: any) {
      setError(err.message || 'Failed to update profile settings.')
    } finally {
      setSaving(false)
    }
  }

  const handleSeedDemoData = async () => {
    if (!confirm('This will seed 10 demo birds, 8 completed race/training activities (from June to July 2026), and generate matching watermarked verification images in localStorage. Proceed?')) return
    
    setSeeding(true)
    try {
      // Clear offline sync queue of duplicate birds to clear any stuck errors
      if (typeof window !== 'undefined') {
        const queueKey = 'flymetric_sync_queue'
        const queueRaw = localStorage.getItem(queueKey)
        if (queueRaw) {
          try {
            const queue = JSON.parse(queueRaw)
            const filteredQueue = queue.filter((item: any) => {
              if (item.endpoint === 'birds' && item.action === 'POST' && item.body) {
                const ring = item.body.ringNo
                return !['PH-2026-88001', 'PH-2026-88002', 'PH-2026-88003', 'PH-2026-88004', 'PH-2026-88005', 'PH-2026-88006', 'PH-2026-88007', 'PH-2026-88008', 'PH-2026-88009', 'PH-2026-88010'].includes(ring)
              }
              return true
            })
            localStorage.setItem(queueKey, JSON.stringify(filteredQueue))
          } catch (err) {
            console.error(err)
          }
        }
      }

      // 1. Seed 10 Birds
      const birdsToSeed = [
        { ringNo: 'PH-2026-88001', color: 'Blue Bar', name: 'Sky King', gender: 'Cock' },
        { ringNo: 'PH-2026-88002', color: 'Red Checker', name: 'Wind Racer', gender: 'Hen' },
        { ringNo: 'PH-2026-88003', color: 'Silver Grizzle', name: 'Silver Arrow', gender: 'Cock' },
        { ringNo: 'PH-2026-88004', color: 'Pencil', name: 'Gold Wing', gender: 'Cock' },
        { ringNo: 'PH-2026-88005', color: 'Dark Cheq', name: 'Dark Shadow', gender: 'Hen' },
        { ringNo: 'PH-2026-88006', color: 'Black', name: 'Storm Bringer', gender: 'Cock' },
        { ringNo: 'PH-2026-88007', color: 'Blue Bar Pied', name: 'Lightning Jet', gender: 'Hen' },
        { ringNo: 'PH-2026-88008', color: 'Pure White', name: 'White Cloud', gender: 'Hen' },
        { ringNo: 'PH-2026-88009', color: 'Red Bar', name: 'Sonic Speed', gender: 'Cock' },
        { ringNo: 'PH-2026-88010', color: 'Mealy', name: 'Alpha Leader', gender: 'Cock' },
      ]

      for (const bird of birdsToSeed) {
        const alreadyExists = registeredBirds.some(b => b.ringNo.toUpperCase() === bird.ringNo.toUpperCase())
        if (!alreadyExists) {
          await saveBird(session?.access_token, bird, false)
        }
      }

      // 2. Watermark Image Generator helper
      const createWatermarkUrl = (ring: string, speedStr: string, dateStr: string, eventTitle: string) => {
        if (typeof window === 'undefined') return ''
        const canvas = document.createElement('canvas')
        canvas.width = 400
        canvas.height = 300
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.fillStyle = '#0b0f19'
          ctx.fillRect(0, 0, 400, 300)
          
          ctx.strokeStyle = 'rgba(255,255,255,0.03)'
          ctx.lineWidth = 2
          for (let i = 0; i < 400; i += 40) {
            ctx.beginPath()
            ctx.moveTo(i, 0)
            ctx.lineTo(i, 300)
            ctx.stroke()
          }
          for (let j = 0; j < 300; j += 40) {
            ctx.beginPath()
            ctx.moveTo(0, j)
            ctx.lineTo(400, j)
            ctx.stroke()
          }
          
          ctx.strokeStyle = 'rgba(255, 193, 7, 0.2)'
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.arc(200, 150, 40, 0, 2 * Math.PI)
          ctx.stroke()
          
          ctx.fillStyle = 'rgba(0, 0, 0, 0.85)'
          ctx.fillRect(10, 205, 380, 85)
          ctx.strokeStyle = 'rgba(255, 193, 7, 0.4)'
          ctx.strokeRect(10, 205, 380, 85)
          
          ctx.fillStyle = '#FFC107'
          ctx.font = 'bold 11px sans-serif'
          ctx.fillText('🛡️ VERIFIED FLYMETRIC CLOCK-IN', 25, 224)
          
          ctx.fillStyle = '#fff'
          ctx.font = '10px monospace'
          ctx.fillText(`RING NO: ${ring}`, 25, 242)
          ctx.fillText(`VELOCITY: ${speedStr} m/min`, 25, 256)
          ctx.fillText(`EVENT: ${eventTitle.toUpperCase()}`, 25, 270)
          ctx.fillStyle = '#888'
          ctx.fillText(`DATE: ${dateStr} · LAT: 16.0356°N · LNG: 120.3342°E`, 25, 284)
        }
        return canvas.toDataURL('image/jpeg')
      }

      // 3. Seed 8 completed events spanning June to July 2026
      const eventsToSeed = [
        {
          id: generateLocalId(),
          title: 'Tarlac Training 1',
          date: '2026-06-10',
          extendedProps: {
            totalBirds: 5,
            maxSpeed: 1250,
            avgSpeed: 1147,
            location: 'Tarlac Release Station',
            club: 'Training',
            distance: 90,
            winner: 'PH-2026-88001',
            releaseTime: '06:00:00',
            clockInTime: '07:25:40',
            birds: JSON.stringify([
              { ringNo: 'PH-2026-88001', clockInTime: '07:12:00', speed: 1250 },
              { ringNo: 'PH-2026-88002', clockInTime: '07:15:30', speed: 1192 },
              { ringNo: 'PH-2026-88003', clockInTime: '07:18:15', speed: 1150 },
              { ringNo: 'PH-2026-88005', clockInTime: '07:22:00', speed: 1097 },
              { ringNo: 'PH-2026-88006', clockInTime: '07:25:40', speed: 1050 }
            ])
          }
        },
        {
          id: generateLocalId(),
          title: 'Tarlac Training 2',
          date: '2026-06-14',
          extendedProps: {
            totalBirds: 5,
            maxSpeed: 1272,
            avgSpeed: 1185,
            location: 'Tarlac Release Station',
            club: 'Training',
            distance: 90,
            winner: 'PH-2026-88002',
            releaseTime: '06:00:00',
            clockInTime: '07:25:00',
            birds: JSON.stringify([
              { ringNo: 'PH-2026-88002', clockInTime: '07:10:45', speed: 1272 },
              { ringNo: 'PH-2026-88001', clockInTime: '07:11:30', speed: 1258 },
              { ringNo: 'PH-2026-88004', clockInTime: '07:14:00', speed: 1216 },
              { ringNo: 'PH-2026-88007', clockInTime: '07:20:10', speed: 1122 },
              { ringNo: 'PH-2026-88008', clockInTime: '07:25:00', speed: 1058 }
            ])
          }
        },
        {
          id: generateLocalId(),
          title: 'Dagupan Race 1',
          date: '2026-06-20',
          extendedProps: {
            totalBirds: 6,
            maxSpeed: 1284,
            avgSpeed: 1198,
            location: 'Dagupan Beach Release',
            club: 'Race',
            distance: 180,
            winner: 'PH-2026-88004',
            releaseTime: '06:15:00',
            clockInTime: '08:58:00',
            birds: JSON.stringify([
              { ringNo: 'PH-2026-88004', clockInTime: '08:35:10', speed: 1284 },
              { ringNo: 'PH-2026-88001', clockInTime: '08:38:00', speed: 1258 },
              { ringNo: 'PH-2026-88002', clockInTime: '08:41:30', speed: 1228 },
              { ringNo: 'PH-2026-88005', clockInTime: '08:48:40', speed: 1171 },
              { ringNo: 'PH-2026-88003', clockInTime: '08:52:15', speed: 1144 },
              { ringNo: 'PH-2026-88009', clockInTime: '08:58:00', speed: 1104 }
            ])
          }
        },
        {
          id: generateLocalId(),
          title: 'Dagupan Training',
          date: '2026-06-24',
          extendedProps: {
            totalBirds: 4,
            maxSpeed: 1301,
            avgSpeed: 1237,
            location: 'Dagupan Beach Release',
            club: 'Training',
            distance: 180,
            winner: 'PH-2026-88001',
            releaseTime: '06:30:00',
            clockInTime: '09:05:30',
            birds: JSON.stringify([
              { ringNo: 'PH-2026-88001', clockInTime: '08:48:15', speed: 1301 },
              { ringNo: 'PH-2026-88006', clockInTime: '08:52:00', speed: 1267 },
              { ringNo: 'PH-2026-88003', clockInTime: '08:56:45', speed: 1226 },
              { ringNo: 'PH-2026-88007', clockInTime: '09:05:30', speed: 1157 }
            ])
          }
        },
        {
          id: generateLocalId(),
          title: 'Vigan Club Race 1',
          date: '2026-06-28',
          extendedProps: {
            totalBirds: 6,
            maxSpeed: 1238,
            avgSpeed: 1164,
            location: 'Vigan Historic Plaza',
            club: 'Race',
            distance: 320,
            winner: 'PH-2026-88002',
            releaseTime: '06:00:00',
            clockInTime: '10:55:30',
            birds: JSON.stringify([
              { ringNo: 'PH-2026-88002', clockInTime: '10:18:20', speed: 1238 },
              { ringNo: 'PH-2026-88001', clockInTime: '10:22:45', speed: 1217 },
              { ringNo: 'PH-2026-88003', clockInTime: '10:30:10', speed: 1184 },
              { ringNo: 'PH-2026-88005', clockInTime: '10:39:15', speed: 1145 },
              { ringNo: 'PH-2026-88006', clockInTime: '10:45:00', speed: 1122 },
              { ringNo: 'PH-2026-88010', clockInTime: '10:55:30', speed: 1082 }
            ])
          }
        },
        {
          id: generateLocalId(),
          title: 'Vigan Training',
          date: '2026-07-02',
          extendedProps: {
            totalBirds: 4,
            maxSpeed: 1270,
            avgSpeed: 1215,
            location: 'Vigan Historic Plaza',
            club: 'Training',
            distance: 320,
            winner: 'PH-2026-88001',
            releaseTime: '06:00:00',
            clockInTime: '10:38:00',
            birds: JSON.stringify([
              { ringNo: 'PH-2026-88001', clockInTime: '10:12:00', speed: 1270 },
              { ringNo: 'PH-2026-88004', clockInTime: '10:15:30', speed: 1252 },
              { ringNo: 'PH-2026-88007', clockInTime: '10:28:45', speed: 1190 },
              { ringNo: 'PH-2026-88008', clockInTime: '10:38:00', speed: 1151 }
            ])
          }
        },
        {
          id: generateLocalId(),
          title: 'Laoag Derby',
          date: '2026-07-05',
          extendedProps: {
            totalBirds: 7,
            maxSpeed: 1290,
            avgSpeed: 1193,
            location: 'Laoag City Hall release',
            club: 'Race',
            distance: 400,
            winner: 'PH-2026-88001',
            releaseTime: '05:45:00',
            clockInTime: '11:58:30',
            birds: JSON.stringify([
              { ringNo: 'PH-2026-88001', clockInTime: '10:55:00', speed: 1290 },
              { ringNo: 'PH-2026-88002', clockInTime: '10:59:15', speed: 1272 },
              { ringNo: 'PH-2026-88004', clockInTime: '11:05:45', speed: 1247 },
              { ringNo: 'PH-2026-88003', clockInTime: '11:18:30', speed: 1199 },
              { ringNo: 'PH-2026-88006', clockInTime: '11:29:10', speed: 1162 },
              { ringNo: 'PH-2026-88009', clockInTime: '11:45:00', speed: 1111 },
              { ringNo: 'PH-2026-88007', clockInTime: '11:58:30', speed: 1071 }
            ])
          }
        },
        {
          id: generateLocalId(),
          title: 'Aparri Grand Classic',
          date: '2026-07-07',
          extendedProps: {
            totalBirds: 8,
            maxSpeed: 1339,
            avgSpeed: 1255,
            location: 'Aparri Port release',
            club: 'Race',
            distance: 520,
            winner: 'PH-2026-88003',
            releaseTime: '05:30:00',
            clockInTime: '13:10:00',
            birds: JSON.stringify([
              { ringNo: 'PH-2026-88003', clockInTime: '11:58:10', speed: 1339 },
              { ringNo: 'PH-2026-88001', clockInTime: '12:02:15', speed: 1325 },
              { ringNo: 'PH-2026-88002', clockInTime: '12:08:30', speed: 1305 },
              { ringNo: 'PH-2026-88004', clockInTime: '12:15:00', speed: 1284 },
              { ringNo: 'PH-2026-88005', clockInTime: '12:22:45', speed: 1260 },
              { ringNo: 'PH-2026-88006', clockInTime: '12:35:00', speed: 1223 },
              { ringNo: 'PH-2026-88008', clockInTime: '12:52:15', speed: 1176 },
              { ringNo: 'PH-2026-88010', clockInTime: '13:10:00', speed: 1130 }
            ])
          }
        }
      ]

      for (const ev of eventsToSeed) {
        const eventExists = events.some(e => e.title.toUpperCase() === ev.title.toUpperCase() && e.date === ev.date)
        if (!eventExists) {
          await saveEvent(session?.access_token, ev, false)
          
          // Generate and save verification watermark photos/videos for each entry
          const parsedBirds: any[] = JSON.parse(ev.extendedProps.birds)
          parsedBirds.forEach((b) => {
            const photoUrl = createWatermarkUrl(b.ringNo, b.speed.toLocaleString(), ev.date, ev.title)
            localStorage.setItem(`verify_photo_${ev.id}_${b.ringNo.toUpperCase()}`, photoUrl)
            localStorage.setItem(`verify_video_${ev.id}_${b.ringNo.toUpperCase()}`, photoUrl)
          })
        }
      }

      // 4. Update Loft Settings default mock coordinates
      if (session?.user) {
        await supabase.auth.updateUser({
          data: {
            loft_name: 'Bermudez Loft',
            loft_location_text: 'Pangasinan, Philippines',
            loft_latitude: 16.0356,
            loft_longitude: 120.3342
          }
        })
      }

      alert('Successfully seeded 10 pigeons, 8 activities (races and trainings), generated custom verification watermarks, and configured coordinates!')
      onProfileUpdated?.()
      onBirdsUpdated()
    } catch (e: any) {
      alert(e.message || 'Error seeding expanded demo data')
    } finally {
      setSeeding(false)
    }
  }


  const handleDeleteBird = async (id: string) => {
    if (!confirm('Are you sure you want to remove this bird from your loft registry?')) return

    try {
      const res = await deleteBird(session?.access_token, id)
      if (!res.success) {
        throw new Error('Failed to delete bird')
      }
      onBirdsUpdated()
    } catch (e: any) {
      alert(e.message || 'Error deleting bird')
    }
  }

  const getBirdHistory = (targetRing: string) => {
    const history: Array<{
      eventId: string
      date: string
      title: string
      type: 'Race' | 'Training'
      location: string
      distance: number
      clockInTime: string
      speed: number
      rank: number
      totalClocked: number
    }> = []

    flightEvents.forEach((ev) => {
      try {
        const birdsList: BirdRecord[] = JSON.parse(ev.extendedProps?.birds || '[]')
        birdsList.sort((a, b) => b.speed - a.speed)
        
        const idx = birdsList.findIndex(b => b.ringNo.toUpperCase() === targetRing.toUpperCase())
        if (idx !== -1) {
          const matchedBird = birdsList[idx]
          history.push({
            eventId: ev.id,
            date: ev.date,
            title: ev.title,
            type: (ev.extendedProps?.club as 'Race' | 'Training') || 'Race',
            location: ev.extendedProps?.location || 'No location',
            distance: ev.extendedProps?.distance || 0,
            clockInTime: matchedBird.clockInTime,
            speed: matchedBird.speed,
            rank: idx + 1,
            totalClocked: birdsList.length
          })
        }
      } catch (err) {
        console.error(err)
      }
    })

    return history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }

  // Filter Loft Birds based on search
  const filteredBirds = registeredBirds.filter((b) => {
    const query = registrySearch.toLowerCase()
    return (
      b.ringNo.toLowerCase().includes(query) ||
      b.color.toLowerCase().includes(query) ||
      (b.name && b.name.toLowerCase().includes(query))
    )
  })

  if (!isOpen || !session?.user) return null

  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div
        className="modal-container"
        ref={modalRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        style={{
          maxWidth: '610px',
          padding: 0,
          background: '#0d121d',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 28px 64px rgba(0, 0, 0, 0.7)',
        }}
      >
        {/* ── Pro Telemetry Banner Area ── */}
        <div
          style={{
            position: 'relative',
            height: '118px',
            background: 'linear-gradient(135deg, #0f172a 0%, #111827 50%, #1e1b4b 100%)',
            overflow: 'hidden',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          {/* Subtle Grid + Radial Gold & Emerald Glow */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage:
                'radial-gradient(circle at 82% 22%, rgba(255, 193, 7, 0.25) 0%, transparent 55%), radial-gradient(circle at 18% 80%, rgba(16, 185, 129, 0.18) 0%, transparent 50%)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              opacity: 0.12,
              backgroundSize: '24px 24px',
              backgroundImage:
                'linear-gradient(to right, rgba(255,255,255,0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.12) 1px, transparent 1px)',
            }}
          />

          {/* Top Left Verified Loft Badge (hidden on mobile to give room) */}
          <div
            className="hidden sm:inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full bg-emerald-500/15 border border-emerald-500/35 text-emerald-400 text-[10px] font-extrabold uppercase tracking-wider backdrop-blur-md absolute top-3.5 left-4.5"
          >
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }} />
            FlyMetric Loft Profile
          </div>

          {/* Quick Edit Profile Pill + Settings Gear + Close Button */}
          <div
            className="absolute top-2.5 sm:top-3 right-2.5 sm:right-3 flex items-center gap-1.5 z-20"
          >
            <button
              type="button"
              onClick={() => setIsSettingsModalOpen(true)}
              className="h-7 sm:h-8 px-2.5 sm:px-3 rounded-full bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/35 text-amber-400 text-xs font-bold inline-flex items-center gap-1 backdrop-blur-md transition-all"
              title="Edit Loft Name & GPS"
            >
              ✏️ <span className="hidden xs:inline">Edit</span> Loft
            </button>

            <button
              type="button"
              className="profile-settings-btn"
              onClick={() => setIsSettingsMenuOpen(true)}
              style={{
                position: 'static',
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                background: 'rgba(15, 23, 42, 0.65)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#fff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backdropFilter: 'blur(8px)',
              }}
              aria-label="Settings"
              title="Loft Options"
            >
              <SettingsIcon size={16} />
            </button>

            <button
              onClick={onClose}
              className="profile-close-btn"
              style={{
                position: 'static',
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                background: 'rgba(15, 23, 42, 0.65)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#fff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.95rem',
                fontWeight: 'bold',
                backdropFilter: 'blur(8px)',
              }}
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>

        {/* ── Profile Identity Header Overlay ── */}
        <div
          className="px-3.5 sm:px-6 pb-3.5 sm:pb-5 pt-0 relative border-b border-white/10"
          style={{
            background: 'linear-gradient(180deg, rgba(22, 27, 38, 0.95) 0%, rgba(13, 18, 29, 0.95) 100%)',
          }}
        >
          {/* Overlapping Avatar with Glowing Ring */}
          <div
            className="absolute left-3.5 sm:left-6 -top-9 sm:-top-12 w-18 h-18 sm:w-23 sm:h-23 rounded-full p-0.5 sm:p-1"
            style={{
              background: 'linear-gradient(135deg, #FFC107, #10b981)',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)',
              zIndex: 10,
            }}
          >
            <div
              style={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                overflow: 'hidden',
                border: '2.5px solid #0d121d',
                backgroundColor: '#161b22',
              }}
            >
              <img
                src={session.user.user_metadata?.avatar_url || '/icon.png'}
                alt="Loft Avatar"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => {
                  e.currentTarget.src = '/icon.png'
                }}
              />
            </div>
            {/* Online Indicator Dot */}
            <span
              style={{
                position: 'absolute',
                bottom: '3px',
                right: '3px',
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: '#10b981',
                border: '2px solid #0d121d',
                boxShadow: '0 0 8px #10b981',
              }}
              title="Active Loft"
            />
          </div>

          {/* Fancier & Loft Info aligned next to Avatar */}
          <div
            className="ml-21 sm:ml-27 pt-2 sm:pt-3 flex flex-wrap items-start justify-between gap-1.5 sm:gap-2"
          >
            <div className="min-w-0 flex-1">
              <h2
                className="text-sm sm:text-lg font-black text-white uppercase tracking-tight m-0 leading-tight truncate"
              >
                {displayName || 'Loft Fancier'}
              </h2>
              <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5 flex-wrap">
                <h3
                  className="text-xs sm:text-sm font-bold text-amber-400 uppercase tracking-wide m-0 truncate"
                >
                  {loftName || 'My Racing Loft'}
                </h3>
                <span
                  className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-sky-400/15 border border-sky-400/30 text-sky-400 shrink-0"
                >
                  {registeredBirds.length} Birds
                </span>
              </div>

              {/* Clickable Location / GPS Trigger */}
              <button
                type="button"
                onClick={() => setIsSettingsModalOpen(true)}
                className="mt-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full py-0.5 sm:py-1 px-2 sm:px-2.5 text-[11px] sm:text-xs text-slate-300 inline-flex items-center gap-1 max-w-full truncate transition-all"
                title="Click to configure Loft GPS location"
              >
                <span className="shrink-0">📍</span>
                <span className="truncate">{locationText || 'Set GPS'}</span>
                {latitude && longitude && (
                  <span className="text-emerald-400 font-bold text-[9px] sm:text-[10px] shrink-0">
                    ({Number(latitude).toFixed(2)}°, {Number(longitude).toFixed(2)}°)
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ── Modal Scrollable Body ── */}
        <div className="modal-scroll-body" style={{ overflowY: 'auto', padding: '1rem 1rem calc(6.5rem + env(safe-area-inset-bottom, 0px)) 1rem' }}>
          {/* 📊 2nd-Image Style Loft Telemetry Statistics */}
          <div style={{ marginBottom: '1.25rem' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '0.65rem',
              }}
            >
              <h3
                style={{
                  fontSize: '0.85rem',
                  fontWeight: 800,
                  color: '#fff',
                  margin: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                }}
              >
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: '#FFC107',
                    boxShadow: '0 0 8px #FFC107',
                  }}
                />
                Loft Telemetry & Statistics
              </h3>
              <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.45)', fontWeight: 600 }}>
                Live Overview
              </span>
            </div>

            {/* 2x2 Sleek Analytics Cards */}
            <div
              className="grid grid-cols-2 gap-2 sm:gap-3.5"
            >
              {/* Card 1: Clock-In Rate with Radial Progress Ring */}
              <div
                className="bg-slate-900/80 border border-white/10 rounded-2xl p-2.5 sm:p-4 flex flex-col sm:flex-row items-center sm:justify-start gap-2 sm:gap-3.5 shadow-lg"
              >
                <div
                  className="radial-progress font-mono font-extrabold shrink-0 text-emerald-400 [--size:2.4rem] sm:[--size:3.1rem] [--thickness:3px] sm:[--thickness:4px] text-[9px] sm:text-xs"
                  style={{ '--value': clockInRate } as React.CSSProperties}
                  role="progressbar"
                >
                  {clockInRate}%
                </div>
                <div className="text-center sm:text-left min-w-0">
                  <div
                    className="font-mono text-sm sm:text-2xl font-black text-emerald-400 leading-tight"
                  >
                    {clockInRate}%
                  </div>
                  <div className="text-[10px] sm:text-xs font-bold text-slate-200 mt-0.5 truncate">
                    Clock-In Rate
                  </div>
                  <div className="text-[9px] sm:text-[11px] text-slate-400 mt-0.5 truncate">
                    {totalClocked}/{totalExpected || 0} clocked
                  </div>
                </div>
              </div>

              {/* Card 2: Avg Pigeons / Season */}
              <div
                className="bg-slate-900/80 border border-white/10 rounded-2xl p-2.5 sm:p-4 flex flex-col sm:flex-row items-center sm:justify-start gap-2 sm:gap-3.5 shadow-lg"
              >
                <div
                  className="w-9 h-9 sm:w-12 sm:h-12 rounded-full bg-amber-400/15 border border-amber-400/35 text-amber-400 flex items-center justify-center text-xs sm:text-base shrink-0 shadow-md"
                >
                  ✈️
                </div>
                <div className="text-center sm:text-left min-w-0">
                  <div
                    className="font-mono text-sm sm:text-2xl font-black text-amber-400 leading-tight"
                  >
                    +{avgPigeons}
                  </div>
                  <div className="text-[10px] sm:text-xs font-bold text-slate-200 mt-0.5 truncate">
                    Avg Birds/Season
                  </div>
                  <div className="text-[9px] sm:text-[11px] text-slate-400 mt-0.5 truncate">
                    Across {seasonsCount} {seasonsCount === 1 ? 'season' : 'seasons'}
                  </div>
                </div>
              </div>

              {/* Card 3: Total Seasons & Flights */}
              <div
                className="bg-slate-900/80 border border-white/10 rounded-2xl p-2.5 sm:p-4 flex flex-col sm:flex-row items-center sm:justify-start gap-2 sm:gap-3.5 shadow-lg"
              >
                <div
                  className="w-9 h-9 sm:w-12 sm:h-12 rounded-full bg-purple-400/15 border border-purple-400/35 text-purple-400 flex items-center justify-center text-xs sm:text-base shrink-0 shadow-md"
                >
                  🚩
                </div>
                <div className="text-center sm:text-left min-w-0">
                  <div
                    className="font-mono text-sm sm:text-2xl font-black text-purple-400 leading-tight"
                  >
                    +{seasonsCount}
                  </div>
                  <div className="text-[10px] sm:text-xs font-bold text-slate-200 mt-0.5 truncate">
                    Total Seasons
                  </div>
                  <div className="text-[9px] sm:text-[11px] text-slate-400 mt-0.5 truncate">
                    {flightEvents.length} {flightEvents.length === 1 ? 'flight' : 'flights'}
                  </div>
                </div>
              </div>

              {/* Card 4: Total Pigeons Registered */}
              <div
                className="bg-slate-900/80 border border-white/10 rounded-2xl p-2.5 sm:p-4 flex flex-col sm:flex-row items-center sm:justify-start gap-2 sm:gap-3.5 shadow-lg"
              >
                <div
                  className="w-9 h-9 sm:w-12 sm:h-12 rounded-full bg-sky-400/15 border border-sky-400/35 text-sky-400 flex items-center justify-center text-xs sm:text-base shrink-0 shadow-md"
                >
                  <BirdIcon size={16} />
                </div>
                <div className="text-center sm:text-left min-w-0">
                  <div
                    className="font-mono text-sm sm:text-2xl font-black text-sky-400 leading-tight"
                  >
                    +{registeredBirds.length}
                  </div>
                  <div className="text-[10px] sm:text-xs font-bold text-slate-200 mt-0.5 truncate">
                    Total Pigeons
                  </div>
                  <div className="text-[9px] sm:text-[11px] text-slate-400 mt-0.5 truncate">
                    {cocksCount} Cocks • {hensCount} Hens
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Main Birds Registry Section ── */}
          <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '1.25rem' }}>
            {selectedHistoryBird ? (
              /* INDIVIDUAL BIRD PERFORMANCE HISTORY */
              <div>
                {/* Back button */}
                <button
                  type="button"
                  onClick={() => setSelectedHistoryBird(null)}
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '0.5rem',
                    color: 'var(--text-primary)',
                    padding: '0.4rem 0.85rem',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    marginBottom: '0.9rem',
                  }}
                >
                  ← Back to Loft Pigeons
                </button>

                {/* Header card for the bird */}
                <div
                  style={{
                    background: 'rgba(22, 27, 38, 0.95)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '0.85rem',
                    padding: '1rem 1.15rem',
                    marginBottom: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.85rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                    <div
                      style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '0.75rem',
                        background: 'rgba(255, 193, 7, 0.12)',
                        border: '1px solid rgba(255, 193, 7, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <img src="/icon.png" alt={selectedHistoryBird.ringNo} style={{ width: '30px', height: '30px', objectFit: 'contain' }} />
                    </div>
                    <div>
                      <strong style={{ fontSize: '1.05rem', color: 'var(--brand-gold)', fontFamily: 'monospace' }}>
                        {selectedHistoryBird.ringNo}
                      </strong>
                      <div style={{ fontSize: '0.76rem', color: '#cbd5e1', marginTop: '0.15rem' }}>
                        {selectedHistoryBird.name ? `${selectedHistoryBird.name} • ` : ''}
                        {selectedHistoryBird.color}
                      </div>
                    </div>
                  </div>
                  <span
                    style={{
                      padding: '0.2rem 0.55rem',
                      borderRadius: '9999px',
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      background:
                        selectedHistoryBird.gender === 'Hen'
                          ? 'rgba(236, 72, 153, 0.15)'
                          : selectedHistoryBird.gender === 'Cock'
                          ? 'rgba(56, 189, 248, 0.15)'
                          : 'rgba(255,255,255,0.06)',
                      border:
                        selectedHistoryBird.gender === 'Hen'
                          ? '1px solid rgba(236, 72, 153, 0.35)'
                          : selectedHistoryBird.gender === 'Cock'
                          ? '1px solid rgba(56, 189, 248, 0.35)'
                          : '1px solid rgba(255,255,255,0.1)',
                      color:
                        selectedHistoryBird.gender === 'Hen'
                          ? '#f472b6'
                          : selectedHistoryBird.gender === 'Cock'
                          ? '#38bdf8'
                          : 'var(--text-muted)',
                    }}
                  >
                    {selectedHistoryBird.gender || 'Unsexed'}
                  </span>
                </div>

                {/* Timeline section */}
                <h4 style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fff', marginBottom: '0.6rem' }}>
                  Flight Performance Logs ({getBirdHistory(selectedHistoryBird.ringNo).length})
                </h4>

                {getBirdHistory(selectedHistoryBird.ringNo).length === 0 ? (
                  <div
                    style={{
                      padding: '2rem 1rem',
                      textAlign: 'center',
                      color: 'var(--text-secondary)',
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px dashed rgba(255,255,255,0.12)',
                      borderRadius: '0.75rem',
                      fontSize: '0.75rem',
                    }}
                  >
                    This bird hasn&apos;t clocked in any activities yet.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    {getBirdHistory(selectedHistoryBird.ringNo).map((row, idx) => {
                      const photo = localPhotos[selectedHistoryBird.id]?.[row.eventId]
                      const video = localVideos[selectedHistoryBird.id]?.[row.eventId]

                      return (
                        <div
                          key={idx}
                          style={{
                            background: 'rgba(22, 27, 38, 0.85)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            borderRadius: '0.75rem',
                            padding: '0.85rem 1rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.35rem',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', fontWeight: 700 }}>
                              📅 {row.date}
                            </span>
                            <span
                              style={{
                                fontSize: '0.65rem',
                                fontWeight: 700,
                                padding: '0.1rem 0.45rem',
                                borderRadius: '9999px',
                                background: row.type === 'Training' ? 'rgba(56, 189, 248, 0.14)' : 'rgba(255, 193, 7, 0.14)',
                                color: row.type === 'Training' ? '#38bdf8' : 'var(--brand-gold)',
                              }}
                            >
                              {row.type}
                            </span>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                              <strong style={{ fontSize: '0.82rem', color: 'var(--text-primary)' }}>{row.title}</strong>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
                                📍 {row.location} · 📏 {row.distance} km
                              </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <strong style={{ fontSize: '0.85rem', color: 'var(--brand-gold)', display: 'block', fontFamily: 'monospace' }}>
                                {row.speed.toLocaleString()} m/min
                              </strong>
                              <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                                Rank #{row.rank} of {row.totalClocked}
                              </span>
                            </div>
                          </div>

                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              marginTop: '0.2rem',
                              paddingTop: '0.35rem',
                              borderTop: '1px solid rgba(255,255,255,0.05)',
                            }}
                          >
                            <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
                              Clocked: <strong>{row.clockInTime}</strong>
                            </span>

                            <div style={{ display: 'flex', gap: '0.35rem' }}>
                              {photo && (
                                <button
                                  type="button"
                                  onClick={() => setSelectedMedia({ type: 'photo', url: photo })}
                                  style={{
                                    background: 'rgba(56, 189, 248, 0.1)',
                                    border: '1px solid rgba(56, 189, 248, 0.25)',
                                    borderRadius: '4px',
                                    color: '#38bdf8',
                                    padding: '0.15rem 0.45rem',
                                    fontSize: '0.62rem',
                                    cursor: 'pointer',
                                    fontWeight: 700,
                                  }}
                                >
                                  📷 Photo
                                </button>
                              )}
                              {video && (
                                <button
                                  type="button"
                                  onClick={() => setSelectedMedia({ type: 'video', url: video })}
                                  style={{
                                    background: 'rgba(16, 185, 129, 0.1)',
                                    border: '1px solid rgba(16, 185, 129, 0.25)',
                                    borderRadius: '4px',
                                    color: '#10b981',
                                    padding: '0.15rem 0.45rem',
                                    fontSize: '0.62rem',
                                    cursor: 'pointer',
                                    fontWeight: 700,
                                  }}
                                >
                                  📹 Video
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            ) : (
              /* MAIN BIRD REGISTRY LIST */
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3.5">
                  <div className="flex items-center justify-between sm:justify-start gap-2.5">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-sky-400 shadow-[0_0_8px_#38bdf8]" />
                      <h4 className="text-sm sm:text-base font-extrabold text-white m-0">
                        Loft Pigeons ({filteredBirds.length})
                      </h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (onOpenRegistryTrigger) {
                          onOpenRegistryTrigger()
                        }
                      }}
                      className="inline-flex items-center gap-1 py-1 px-2.5 bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/35 rounded-full text-amber-400 text-xs font-bold transition-all cursor-pointer"
                    >
                      <PlusIcon size={11} /> Add Bird
                    </button>
                  </div>

                  {/* Sleek Search Input */}
                  <div className="w-full sm:w-52">
                    <input
                      type="text"
                      placeholder="Search ring, name, color..."
                      value={registrySearch}
                      onChange={(e) => setRegistrySearch(e.target.value)}
                      className="w-full py-1.5 px-3 bg-slate-900/80 border border-white/10 rounded-full text-xs text-slate-200 placeholder:text-slate-500 outline-none focus:border-amber-400/50"
                    />
                  </div>
                </div>

                {filteredBirds.length === 0 ? (
                  <div
                    style={{
                      padding: '2rem 1.5rem',
                      textAlign: 'center',
                      color: 'var(--text-secondary)',
                      fontSize: '0.76rem',
                      background: 'rgba(22, 27, 38, 0.5)',
                      border: '1px dashed rgba(255, 255, 255, 0.1)',
                      borderRadius: '0.85rem',
                    }}
                  >
                    No matching pigeons found in your loft registry.
                  </div>
                ) : (
                  <>
                    {/* Mobile Pigeon Card List (sm:hidden) */}
                    <div className="sm:hidden flex flex-col gap-2 mb-3">
                      {filteredBirds.map((b) => (
                        <div
                          key={b.id}
                          className="p-3 rounded-xl bg-slate-900/80 border border-white/10 flex items-center justify-between gap-2.5 hover:border-amber-400/30 transition-all"
                        >
                          <div
                            onClick={() => setSelectedHistoryBird(b)}
                            className="flex items-center gap-2.5 min-w-0 cursor-pointer flex-1"
                          >
                            <div className="w-9 h-9 rounded-lg bg-amber-400/10 border border-amber-400/25 flex items-center justify-center shrink-0">
                              <img src="/icon.png" alt="" className="w-5 h-5 object-contain" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-mono font-extrabold text-amber-400 text-xs tracking-tight">
                                  {b.ringNo}
                                </span>
                                {b.rfidTag && (
                                  <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-amber-400/15 text-amber-300 border border-amber-400/30 shrink-0">
                                    📡 {b.rfidTag}
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400 truncate mt-0.5">
                                {b.name ? <span className="text-slate-200 font-semibold">{b.name} • </span> : ''}
                                {b.color}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <span
                              className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full ${
                                b.gender === 'Hen'
                                  ? 'bg-pink-500/15 text-pink-400 border border-pink-500/30'
                                  : b.gender === 'Cock'
                                  ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
                                  : 'bg-white/5 text-slate-400 border border-white/10'
                              }`}
                            >
                              {b.gender || '—'}
                            </span>
                            <button
                              type="button"
                              onClick={() => setSelectedHistoryBird(b)}
                              className="w-7 h-7 rounded-lg bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/25 text-amber-400 flex items-center justify-center text-xs"
                              title="View History"
                            >
                              ⏱️
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteBird(b.id)}
                              className="w-7 h-7 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/25 text-red-400 flex items-center justify-center text-xs"
                              title="Delete Bird"
                            >
                              <TrashIcon size={12} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Desktop Pigeon Table (hidden sm:block) */}
                    <div
                      className="hidden sm:block overflow-x-auto bg-slate-900/75 border border-white/10 rounded-2xl"
                    >
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.74rem', textAlign: 'left' }}>
                      <thead>
                        <tr
                          style={{
                            background: 'rgba(255, 255, 255, 0.03)',
                            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                          }}
                        >
                          <th style={{ padding: '0.6rem 0.85rem', color: '#94a3b8', fontWeight: 700, fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Ring Number
                          </th>
                          <th style={{ padding: '0.6rem 0.75rem', color: '#94a3b8', fontWeight: 700, fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Color
                          </th>
                          <th style={{ padding: '0.6rem 0.75rem', color: '#94a3b8', fontWeight: 700, fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Name / Alias
                          </th>
                          <th style={{ padding: '0.6rem 0.75rem', color: '#94a3b8', fontWeight: 700, fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Gender
                          </th>
                          <th style={{ padding: '0.6rem 0.85rem', color: '#94a3b8', fontWeight: 700, fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'right' }}>
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredBirds.map((b) => (
                          <tr
                            key={b.id}
                            style={{
                              borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                              transition: 'background 0.15s ease',
                            }}
                          >
                            <td style={{ padding: '0.55rem 0.85rem', fontWeight: 700 }}>
                              <button
                                type="button"
                                onClick={() => setSelectedHistoryBird(b)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#FFC107',
                                  fontWeight: 800,
                                  cursor: 'pointer',
                                  padding: 0,
                                  textAlign: 'left',
                                  fontSize: '0.76rem',
                                  fontFamily: 'monospace',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.45rem',
                                }}
                                title="View Bird Performance History"
                              >
                                <span
                                  style={{
                                    width: '24px',
                                    height: '24px',
                                    borderRadius: '6px',
                                    background: 'rgba(255, 193, 7, 0.1)',
                                    border: '1px solid rgba(255, 193, 7, 0.25)',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                  }}
                                >
                                  <img src="/icon.png" alt="" style={{ width: '16px', height: '16px', objectFit: 'contain' }} />
                                </span>
                                <span style={{ textDecoration: 'underline', textUnderlineOffset: '3px' }}>{b.ringNo}</span>
                              </button>
                            </td>
                            <td style={{ padding: '0.55rem 0.75rem', color: '#cbd5e1', fontWeight: 500 }}>{b.color}</td>
                            <td style={{ padding: '0.55rem 0.75rem', color: '#e2e8f0', fontWeight: 600 }}>{b.name || '—'}</td>
                            <td style={{ padding: '0.55rem 0.75rem' }}>
                              <span
                                style={{
                                  padding: '0.16rem 0.5rem',
                                  borderRadius: '9999px',
                                  fontSize: '0.66rem',
                                  fontWeight: 800,
                                  background:
                                    b.gender === 'Hen'
                                      ? 'rgba(236, 72, 153, 0.14)'
                                      : b.gender === 'Cock'
                                      ? 'rgba(56, 189, 248, 0.14)'
                                      : 'rgba(255,255,255,0.06)',
                                  border:
                                    b.gender === 'Hen'
                                      ? '1px solid rgba(236, 72, 153, 0.3)'
                                      : b.gender === 'Cock'
                                      ? '1px solid rgba(56, 189, 248, 0.3)'
                                      : '1px solid rgba(255,255,255,0.1)',
                                  color:
                                    b.gender === 'Hen' ? '#f472b6' : b.gender === 'Cock' ? '#38bdf8' : 'var(--text-muted)',
                                }}
                              >
                                {b.gender || '—'}
                              </span>
                            </td>
                            <td style={{ padding: '0.55rem 0.85rem' }}>
                              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem' }}>
                                <button
                                  type="button"
                                  onClick={() => setSelectedHistoryBird(b)}
                                  style={{
                                    background: 'rgba(255, 193, 7, 0.1)',
                                    border: '1px solid rgba(255, 193, 7, 0.28)',
                                    borderRadius: '6px',
                                    color: 'var(--brand-gold)',
                                    width: '1.65rem',
                                    height: '1.65rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                  title="View Performance History"
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="12"
                                    height="12"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <circle cx="12" cy="12" r="10" />
                                    <polyline points="12 6 12 12 16 14" />
                                  </svg>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteBird(b.id)}
                                  style={{
                                    background: 'rgba(239, 68, 68, 0.1)',
                                    border: '1px solid rgba(239, 68, 68, 0.28)',
                                    borderRadius: '6px',
                                    color: '#f87171',
                                    width: '1.65rem',
                                    height: '1.65rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                  title="Delete Bird"
                                >
                                  <TrashIcon size={12} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}
          </div>
        </div>
      </div>

      {/* Settings Menu Sub-modal */}
      {isSettingsMenuOpen && (
        <div 
          className="modal-backdrop modal-floating" 
          style={{ zIndex: 10500 }}
          onClick={(e) => { if (e.target === e.currentTarget) setIsSettingsMenuOpen(false) }}
        >
          <div 
            className="modal-container" 
            style={{ maxWidth: '360px', padding: 0 }}
          >
            <div className="modal-header" style={{ background: 'linear-gradient(135deg, #334155, #1e293b)', padding: '0.9rem 1.2rem' }}>
              <div className="modal-header-left">
                <span style={{ color: '#fff', display: 'flex', alignItems: 'center' }}>
                  <SettingsIcon size={18} />
                </span>
                <h2 className="modal-title" style={{ color: '#fff', fontSize: '1.05rem', fontWeight: 800 }}>
                  Loft Options
                </h2>
              </div>
              <button 
                type="button"
                className="modal-close-btn" 
                style={{ color: '#fff', background: 'rgba(255,255,255,0.15)', position: 'static', margin: 0 }} 
                onClick={() => setIsSettingsMenuOpen(false)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body" style={{ padding: '1.25rem', gap: '0.88rem' }}>
              
              <button
                type="button"
                onClick={() => {
                  setIsSettingsMenuOpen(false)
                  if (onAddEventTrigger) {
                    onAddEventTrigger()
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  width: '100%',
                  padding: '0.88rem 1rem',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid var(--border-default)',
                  borderRadius: '0.5rem',
                  color: 'var(--text-primary)',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                className="menu-item-hover"
              >
                <span style={{ color: '#E91E63', fontSize: '1.1rem', display: 'flex', alignItems: 'center' }}>
                  <PlusIcon size={18} />
                </span>
                <div>
                  <div style={{ fontWeight: 700 }}>Log New Activity / Event</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>Create a training flight or official club race</div>
                </div>
              </button>


              <button
                type="button"
                onClick={() => {
                  setIsSettingsMenuOpen(false)
                  if (onOpenRegistryTrigger) {
                    onOpenRegistryTrigger()
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  width: '100%',
                  padding: '0.88rem 1rem',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid var(--border-default)',
                  borderRadius: '0.5rem',
                  color: 'var(--text-primary)',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                className="menu-item-hover"
              >
                <span style={{ color: '#2196F3', fontSize: '1.1rem', display: 'flex', alignItems: 'center' }}>
                  <BirdIcon size={18} />
                </span>
                <div>
                  <div style={{ fontWeight: 700 }}>Loft Bird Registry</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>View bird list, detailed profiles, strain & lineage</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsSettingsMenuOpen(false)
                  setIsSettingsModalOpen(true)
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  width: '100%',
                  padding: '0.88rem 1rem',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid var(--border-default)',
                  borderRadius: '0.5rem',
                  color: 'var(--text-primary)',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                className="menu-item-hover"
              >
                <span style={{ color: '#FFC107', fontSize: '1.1rem', display: 'flex', alignItems: 'center' }}>
                  <SettingsIcon size={18} />
                </span>
                <div>
                  <div style={{ fontWeight: 700 }}>Loft & Profile Settings</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>Modify fancier display name, coordinates, map pin</div>
                </div>
              </button>

              {process.env.NODE_ENV === 'development' && (
                <button
                  type="button"
                  onClick={() => {
                    setIsSettingsMenuOpen(false)
                    handleSeedDemoData()
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    width: '100%',
                    padding: '0.88rem 1rem',
                    background: 'rgba(255, 193, 7, 0.03)',
                    border: '1px dashed rgba(255, 193, 7, 0.25)',
                    borderRadius: '0.5rem',
                    color: 'var(--brand-gold)',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  disabled={seeding}
                >
                  <span style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center' }}>⚡</span>
                  <div>
                    <div style={{ fontWeight: 700 }}>{seeding ? 'Seeding...' : 'Seed Demo Data'}</div>
                    <div style={{ fontSize: '0.68rem', color: 'rgba(255, 193, 7, 0.7)', marginTop: '0.15rem' }}>[DEV MODE] Populate mock pigeons & flights</div>
                  </div>
                </button>
              )}

            </div>
          </div>
        </div>
      )}
      {/* Lightbox for verification media */}
      {selectedMedia && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            backgroundColor: 'rgba(0, 0, 0, 0.88)',
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

      {/* Sub-modal for editing profile/loft settings */}
      {isSettingsModalOpen && (
        <div 
          className="modal-backdrop modal-floating" 
          style={{ zIndex: 11000 }}
          onClick={(e) => { if (e.target === e.currentTarget) setIsSettingsModalOpen(false) }}
        >
          <div 
            className="modal-container" 
            style={{ maxWidth: '480px', padding: 0 }}
          >
            <div className="modal-header" style={{ background: 'linear-gradient(135deg, #FFC107, #FF8F00)', padding: '0.9rem 1.2rem' }}>
              <div className="modal-header-left">
                <span style={{ color: '#000', display: 'flex', alignItems: 'center' }}>
                  <PlusIcon size={18} />
                </span>
                <h2 className="modal-title" style={{ color: '#000', fontSize: '1rem', fontWeight: 800 }}>
                  Edit Loft Settings
                </h2>
              </div>
              <button 
                type="button"
                className="modal-close-btn" 
                style={{ color: '#000', background: 'rgba(0,0,0,0.08)' }} 
                onClick={() => setIsSettingsModalOpen(false)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body" style={{ padding: '1.2rem' }}>
              <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '0.88rem' }}>
                
                {/* Fancier Display Name */}
                <div className="form-group">
                  <label htmlFor="modal-fancier-name" className="form-label" style={{ fontSize: '0.75rem' }}>Fancier Display Name</label>
                  <input
                    id="modal-fancier-name"
                    type="text"
                    className="form-input"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. John Carry"
                    required
                  />
                </div>

                {/* Loft Name */}
                <div className="form-group">
                  <label htmlFor="modal-loft-name" className="form-label" style={{ fontSize: '0.75rem' }}>Loft Name</label>
                  <input
                    id="modal-loft-name"
                    type="text"
                    className="form-input"
                    value={loftName}
                    onChange={(e) => setLoftName(e.target.value)}
                    placeholder="e.g. Bermudez Loft"
                  />
                </div>

                {/* Loft Location Text */}
                <div className="form-group">
                  <label htmlFor="modal-loft-location-text" className="form-label" style={{ fontSize: '0.75rem' }}>Loft Location Description</label>
                  <input
                    id="modal-loft-location-text"
                    type="text"
                    className="form-input"
                    value={locationText}
                    onChange={(e) => setLocationText(e.target.value)}
                    placeholder="e.g. Pili, Camarines Sur, Philippines"
                  />
                </div>

                {/* GPS Coordinates Group */}
                <div style={{ borderTop: '1px solid var(--border-default)', marginTop: '0.4rem', paddingTop: '0.8rem' }}>
                  <span style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.2rem' }}>Loft GPS Location</span>
                  <span style={{ display: 'block', fontSize: '0.68rem', color: 'var(--text-secondary)', marginBottom: '0.6rem', lineHeight: '1.4' }}>
                    Used to calculate precise flight distances.
                  </span>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="modal-loft-lat" className="form-label" style={{ fontSize: '0.72rem' }}>Latitude (°N/S)</label>
                      <input
                        id="modal-loft-lat"
                        type="number"
                        step="any"
                        className="form-input"
                        value={latitude}
                        onChange={(e) => setLatitude(e.target.value)}
                        placeholder="e.g. 14.5995"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="modal-loft-lng" className="form-label" style={{ fontSize: '0.72rem' }}>Longitude (°E/W)</label>
                      <input
                        id="modal-loft-lng"
                        type="number"
                        step="any"
                        className="form-input"
                        value={longitude}
                        onChange={(e) => setLongitude(e.target.value)}
                        placeholder="e.g. 120.9842"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    className="nav-btn nav-btn-secondary"
                    disabled={fetchingGps}
                    onClick={handleUseDeviceGps}
                    style={{
                      marginTop: '0.6rem',
                      width: '100%',
                      padding: '0.4rem',
                      fontSize: '0.72rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.3rem',
                      borderColor: 'rgba(255, 193, 7, 0.3)',
                      color: 'var(--brand-gold)',
                      background: 'rgba(255, 193, 7, 0.05)',
                      height: '2rem'
                    }}
                  >
                    🛰️ {fetchingGps ? 'Fetching GPS…' : 'Use Current Device GPS'}
                  </button>

                  {/* Map Preview */}
                  {(latitude || longitude) && (
                    <div style={{ marginTop: '0.75rem' }}>
                      <LoftMapPreview
                        loftLat={latitude !== '' ? parseFloat(latitude) : null}
                        loftLng={longitude !== '' ? parseFloat(longitude) : null}
                        height="140px"
                        clickHint="Tap map to set loft location"
                        onMapClick={(lat, lng) => {
                          setLatitude(lat.toFixed(6))
                          setLongitude(lng.toFixed(6))
                        }}
                      />
                    </div>
                  )}
                </div>

                {error && (
                  <div className="form-error" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem', fontSize: '0.75rem' }}>
                    <span>⚠️</span>
                    <span>{error}</span>
                  </div>
                )}

                {success && (
                  <div style={{ 
                    padding: '0.5rem 0.75rem', 
                    background: 'rgba(63, 185, 80, 0.1)', 
                    border: '1px solid rgba(63, 185, 80, 0.3)', 
                    borderRadius: '0.5rem', 
                    fontSize: '0.78rem', 
                    color: 'var(--color-success)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.4rem',
                    marginTop: '0.2rem'
                  }}>
                    <span>✓</span>
                    <span>Settings saved successfully!</span>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.8rem' }}>
                  <button
                    type="button"
                    className="nav-btn nav-btn-secondary"
                    onClick={() => setIsSettingsModalOpen(false)}
                    style={{ flex: 1, padding: '0.5rem', height: '2.3rem', fontSize: '0.8rem' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="nav-btn nav-btn-primary"
                    disabled={saving}
                    style={{ flex: 1, padding: '0.5rem', height: '2.3rem', background: 'var(--brand-gold)', color: '#000', fontWeight: 'bold', fontSize: '0.8rem' }}
                  >
                    {saving ? 'Saving…' : 'Save Settings'}
                  </button>
                </div>

              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
