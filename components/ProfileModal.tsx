'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { Session } from '@supabase/supabase-js'
import LoftMapPreview from '@/components/LoftMapPreview'
import type { RaceEvent } from '@/app/api/race-events/route'
import {
  BirdIcon,
  PlusIcon,
  TagIcon,
  NotesIcon,
  NameIcon,
  DnaIcon,
  TrashIcon,
  SettingsIcon,
  CalendarIcon,
  MapPinIcon,
  TrophyIcon,
  AntennaIcon,
  CameraIcon,
  VideoIcon,
  DownloadIcon,
  EditIcon,
  TimerIcon,
  LightningIcon,
  AlertTriangleIcon,
} from '@/components/icons'
import { getBirdAge } from '@/lib/birdAge'
import { saveBird, deleteBird, saveEvent, generateLocalId, resetLoftRecords } from '@/lib/apiClient'
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
  onEventsUpdated?: () => void
  onAddEventTrigger?: () => void
  onOpenRegistryTrigger?: () => void
  isPageMode?: boolean
}

export default function ProfileModal({
  isOpen,
  onClose,
  session,
  onProfileUpdated,
  registeredBirds,
  onBirdsUpdated,
  events,
  onEventsUpdated,
  onAddEventTrigger,
  onOpenRegistryTrigger,
  isPageMode = false,
}: ProfileModalProps) {
  const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false)
  const [isResetModalOpen, setIsResetModalOpen] = useState(false)
  const [resetEvents, setResetEvents] = useState(false)
  const [resetBirds, setResetBirds] = useState(false)
  const [resetClockIns, setResetClockIns] = useState(false)
  const [confirmResetChecked, setConfirmResetChecked] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [resetSuccessMsg, setResetSuccessMsg] = useState('')
  const [resetErrorMsg, setResetErrorMsg] = useState('')

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

  // Edit Bird States (Full Modal + Inline Edit Mode)
  const [editingBird, setEditingBird] = useState<LoftBird | null>(null)
  const [editRingNo, setEditRingNo] = useState('')
  const [editColor, setEditColor] = useState('')
  const [editName, setEditName] = useState('')
  const [editGender, setEditGender] = useState('Unknown')
  const [editBirthdate, setEditBirthdate] = useState('')
  const [editStrain, setEditStrain] = useState('')
  const [editStatus, setEditStatus] = useState('Active')
  const [editNotes, setEditNotes] = useState('')
  const [editSire, setEditSire] = useState('')
  const [editDam, setEditDam] = useState('')
  const [editRfidTag, setEditRfidTag] = useState('')
  const [editError, setEditError] = useState('')
  const [editSaving, setEditSaving] = useState(false)
  const [editSuccess, setEditSuccess] = useState(false)
  const [scanNotice, setScanNotice] = useState<string | null>(null)

  const [isInlineEditMode, setIsInlineEditMode] = useState(false)
  const [inlineDrafts, setInlineDrafts] = useState<Record<string, { ringNo: string; color: string; name: string; gender: string }>>({})
  const [savingInlineId, setSavingInlineId] = useState<string | null>(null)
  const [savingAllInline, setSavingAllInline] = useState(false)

  useRfidScanner({
    enabled: isOpen && !!editingBird,
    onScan: (scannedTag) => {
      const raw = scannedTag.trim()
      if (!raw || !editingBird) return
      setEditRfidTag(raw)
      setScanNotice(`RFID Tag ${raw} linked to ${editingBird.ringNo}.`)
      setTimeout(() => setScanNotice(null), 4000)
    }
  })

  useEffect(() => {
    if (!isOpen) {
      setSelectedHistoryBird(null)
      setEditingBird(null)
      setIsInlineEditMode(false)
      setIsSettingsModalOpen(false)
      setIsSettingsMenuOpen(false)
    }
  }, [isOpen])

  useEffect(() => {
    if (editingBird) {
      setEditRingNo(editingBird.ringNo || '')
      setEditColor(editingBird.color || '')
      setEditName(editingBird.name || '')
      setEditGender(editingBird.gender || 'Unknown')
      setEditBirthdate(editingBird.birthdate || '')
      setEditStrain(editingBird.strain || '')
      setEditStatus(editingBird.status || 'Active')
      setEditNotes(editingBird.notes || '')
      setEditSire(editingBird.sire || '')
      setEditDam(editingBird.dam || '')
      setEditRfidTag(editingBird.rfidTag || '')
      setEditError('')
      setEditSuccess(false)
    }
  }, [editingBird])

  useEffect(() => {
    if (isInlineEditMode) {
      const nextDrafts: Record<string, { ringNo: string; color: string; name: string; gender: string }> = {}
      registeredBirds.forEach((b) => {
        nextDrafts[b.id] = {
          ringNo: b.ringNo || '',
          color: b.color || '',
          name: b.name || '',
          gender: b.gender || 'Unknown',
        }
      })
      setInlineDrafts(nextDrafts)
    }
  }, [isInlineEditMode, registeredBirds])

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

      // 1. Seed 10 Birds with authentic hatch dates & ages
      const birdsToSeed = [
        { ringNo: 'PH-2026-88001', color: 'Blue Bar', name: 'Sky King', gender: 'Cock', birthdate: '2026-10-06' },
        { ringNo: 'PH-2026-88002', color: 'Red Checker', name: 'Wind Racer', gender: 'Hen', birthdate: '2026-10-27' },
        { ringNo: 'PH-2026-88003', color: 'Silver Grizzle', name: 'Silver Arrow', gender: 'Cock', birthdate: '2026-11-15' },
        { ringNo: 'PH-2026-88004', color: 'Pencil', name: 'Gold Wing', gender: 'Cock', birthdate: '2026-08-20' },
        { ringNo: 'PH-2026-88005', color: 'Dark Cheq', name: 'Dark Shadow', gender: 'Hen', birthdate: '2026-05-10' },
        { ringNo: 'PH-2026-88006', color: 'Black', name: 'Storm Bringer', gender: 'Cock', birthdate: '2026-02-14' },
        { ringNo: 'PH-2026-88007', color: 'Blue Bar Pied', name: 'Lightning Jet', gender: 'Hen', birthdate: '2025-08-10' },
        { ringNo: 'PH-2026-88008', color: 'Pure White', name: 'White Cloud', gender: 'Hen', birthdate: '2025-03-01' },
        { ringNo: 'PH-2026-88009', color: 'Red Bar', name: 'Sonic Speed', gender: 'Cock', birthdate: '2024-11-15' },
        { ringNo: 'PH-2026-88010', color: 'Mealy', name: 'Alpha Leader', gender: 'Cock', birthdate: '2026-11-01' },
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
          ctx.fillText('VERIFIED FLYMETRIC CLOCK-IN', 25, 224)
          
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
      if (editingBird?.id === id) setEditingBird(null)
      if (selectedHistoryBird?.id === id) setSelectedHistoryBird(null)
      onBirdsUpdated()
    } catch (e: any) {
      alert(e.message || 'Error deleting bird')
    }
  }

  const handleUpdateBird = async (e: React.FormEvent) => {
    e.preventDefault()
    setEditError('')
    setEditSuccess(false)
    if (!editingBird) return

    if (!editRingNo.trim()) {
      setEditError('Ring Number is required.')
      return
    }

    const finalEditColor = editColor.trim() || 'Blue Bar'
    setEditSaving(true)

    try {
      const res = await saveBird(
        session?.access_token,
        {
          id: editingBird.id,
          ringNo: editRingNo.trim().toUpperCase(),
          color: finalEditColor,
          name: editName.trim() || null,
          gender: editGender,
          birthdate: editBirthdate || null,
          strain: editStrain.trim() || null,
          status: editStatus,
          notes: editNotes.trim() || null,
          sire: editSire.trim().toUpperCase() || null,
          dam: editDam.trim().toUpperCase() || null,
          rfidTag: editRfidTag.trim() || null,
        },
        true
      )

      if (!res.success) {
        throw new Error('Failed to update bird')
      }

      setEditSuccess(true)
      onBirdsUpdated()
      if (res.data) {
        setEditingBird(res.data)
        if (selectedHistoryBird?.id === editingBird.id) {
          setSelectedHistoryBird(res.data)
        }
      }

      setTimeout(() => {
        setEditSuccess(false)
        setEditingBird(null)
      }, 900)
    } catch (err: any) {
      setEditError(err.message || 'An error occurred.')
    } finally {
      setEditSaving(false)
    }
  }

  const handleInlineFieldChange = (birdId: string, field: 'ringNo' | 'color' | 'name' | 'gender', value: string) => {
    setInlineDrafts((prev) => ({
      ...prev,
      [birdId]: {
        ...(prev[birdId] || { ringNo: '', color: '', name: '', gender: 'Unknown' }),
        [field]: value,
      },
    }))
  }

  const handleSaveInlineRow = async (bird: LoftBird) => {
    const draft = inlineDrafts[bird.id]
    if (!draft) return
    if (!draft.ringNo.trim()) {
      alert('Ring Number cannot be empty.')
      return
    }

    setSavingInlineId(bird.id)
    try {
      const res = await saveBird(
        session?.access_token,
        {
          ...bird,
          id: bird.id,
          ringNo: draft.ringNo.trim().toUpperCase(),
          color: draft.color.trim() || 'Blue Bar',
          name: draft.name.trim() || null,
          gender: draft.gender || 'Unknown',
        },
        true
      )
      if (!res.success) throw new Error('Failed to update bird')
      onBirdsUpdated()
    } catch (err: any) {
      alert(err.message || 'Error saving bird changes')
    } finally {
      setSavingInlineId(null)
    }
  }

  const handleSaveAllInline = async () => {
    setSavingAllInline(true)
    try {
      for (const bird of registeredBirds) {
        const draft = inlineDrafts[bird.id]
        if (!draft) continue
        const changed =
          draft.ringNo.trim().toUpperCase() !== (bird.ringNo || '').toUpperCase() ||
          (draft.color.trim() || 'Blue Bar') !== (bird.color || '') ||
          (draft.name.trim() || null) !== (bird.name || null) ||
          (draft.gender || 'Unknown') !== (bird.gender || 'Unknown')

        if (changed && draft.ringNo.trim()) {
          await saveBird(
            session?.access_token,
            {
              ...bird,
              id: bird.id,
              ringNo: draft.ringNo.trim().toUpperCase(),
              color: draft.color.trim() || 'Blue Bar',
              name: draft.name.trim() || null,
              gender: draft.gender || 'Unknown',
            },
            true
          )
        }
      }
      onBirdsUpdated()
      setIsInlineEditMode(false)
    } catch (err: any) {
      alert(err.message || 'Error saving changes')
    } finally {
      setSavingAllInline(false)
    }
  }

  const handleExecuteReset = async () => {
    if (!resetEvents && !resetBirds && !resetClockIns) {
      setResetErrorMsg('Pumili ng kahit isang uri ng record na nais i-reset.')
      return
    }
    if (!confirmResetChecked) {
      setResetErrorMsg('Pakilagyan ng check ang confirmation box bago magpatuloy.')
      return
    }

    setResetting(true)
    setResetErrorMsg('')
    setResetSuccessMsg('')

    try {
      const res = await resetLoftRecords(session?.access_token, {
        resetEvents,
        resetBirds,
        resetClockIns,
      })

      if (!res.success) {
        throw new Error(res.message || 'Nabigong i-reset ang mga records.')
      }

      if (resetBirds) {
        onBirdsUpdated?.()
      }
      if (resetEvents || resetClockIns) {
        onEventsUpdated?.()
      }

      setResetSuccessMsg('Matagumpay na na-reset ang mga napiling records!')
      setTimeout(() => {
        setResetting(false)
        setResetSuccessMsg('')
        setIsResetModalOpen(false)
        setResetEvents(false)
        setResetBirds(false)
        setResetClockIns(false)
        setConfirmResetChecked(false)
      }, 1400)
    } catch (err: any) {
      setResetErrorMsg(err.message || 'Nabigong i-reset ang mga records.')
      setResetting(false)
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

  const profileMainView = (
    <>
      <div
        className={isPageMode ? "w-full max-w-7xl mx-auto rounded-xl bg-[#0c121e] border border-white/10 shadow-[0_4px_24px_rgba(0,0,0,0.3)] overflow-hidden" : "modal-container"}
      ref={modalRef}
      tabIndex={-1}
      role={isPageMode ? "region" : "dialog"}
      aria-modal={isPageMode ? undefined : "true"}
      style={isPageMode ? undefined : {
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
            className="h-7 sm:h-8 px-2.5 sm:px-3 rounded-full bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/35 text-amber-400 text-xs font-bold inline-flex items-center gap-1.5 backdrop-blur-md transition-all"
            title="Edit Loft Name & GPS"
          >
            <EditIcon size={12} /> <span className="hidden xs:inline">Edit</span> Loft
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

          {!isPageMode && (
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
                backdropFilter: 'blur(8px)',
                lineHeight: 1,
              }}
              aria-label="Close"
              title="Close Profile"
            >
              ✕
            </button>
          )}
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
                <MapPinIcon size={12} className="shrink-0 text-slate-400" />
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
          {/* Loft Telemetry Statistics */}
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
              {/* Card 1: Clock-In Rate */}
              <div
                className="bg-slate-900/80 border border-white/10 rounded-2xl p-3.5 sm:p-5 flex flex-col items-center justify-center text-center shadow-lg hover:border-emerald-500/30 transition-all"
              >
                <div
                  className="font-mono text-xl sm:text-2xl font-black text-emerald-400 leading-tight"
                >
                  {clockInRate}%
                </div>
                <div className="text-[11px] sm:text-xs font-bold text-slate-200 mt-1.5 truncate w-full">
                  Clock-In Rate
                </div>
                <div className="text-[9px] sm:text-[11px] text-slate-400 mt-0.5 truncate w-full">
                  {totalClocked}/{totalExpected || 0} clocked
                </div>
              </div>

              {/* Card 2: Avg Pigeons / Season */}
              <div
                className="bg-slate-900/80 border border-white/10 rounded-2xl p-3.5 sm:p-5 flex flex-col items-center justify-center text-center shadow-lg hover:border-amber-400/30 transition-all"
              >
                <div
                  className="font-mono text-xl sm:text-2xl font-black text-amber-400 leading-tight"
                >
                  +{avgPigeons}
                </div>
                <div className="text-[11px] sm:text-xs font-bold text-slate-200 mt-1.5 truncate w-full">
                  Avg Birds/Season
                </div>
                <div className="text-[9px] sm:text-[11px] text-slate-400 mt-0.5 truncate w-full">
                  Across {seasonsCount} {seasonsCount === 1 ? 'season' : 'seasons'}
                </div>
              </div>

              {/* Card 3: Total Seasons & Flights */}
              <div
                className="bg-slate-900/80 border border-white/10 rounded-2xl p-3.5 sm:p-5 flex flex-col items-center justify-center text-center shadow-lg hover:border-purple-400/30 transition-all"
              >
                <div
                  className="font-mono text-xl sm:text-2xl font-black text-purple-400 leading-tight"
                >
                  +{seasonsCount}
                </div>
                <div className="text-[11px] sm:text-xs font-bold text-slate-200 mt-1.5 truncate w-full">
                  Total Seasons
                </div>
                <div className="text-[9px] sm:text-[11px] text-slate-400 mt-0.5 truncate w-full">
                  {flightEvents.length} {flightEvents.length === 1 ? 'flight' : 'flights'}
                </div>
              </div>

              {/* Card 4: Total Pigeons Registered */}
              <div
                className="bg-slate-900/80 border border-white/10 rounded-2xl p-3.5 sm:p-5 flex flex-col items-center justify-center text-center shadow-lg hover:border-sky-400/30 transition-all"
              >
                <div
                  className="font-mono text-xl sm:text-2xl font-black text-sky-400 leading-tight"
                >
                  +{registeredBirds.length}
                </div>
                <div className="text-[11px] sm:text-xs font-bold text-slate-200 mt-1.5 truncate w-full">
                  Total Pigeons
                </div>
                <div className="text-[9px] sm:text-[11px] text-slate-400 mt-0.5 truncate w-full">
                  {cocksCount} Cocks • {hensCount} Hens
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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
                    <button
                      type="button"
                      onClick={() => setEditingBird(selectedHistoryBird)}
                      style={{
                        padding: '0.25rem 0.65rem',
                        borderRadius: '9999px',
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        background: 'rgba(56, 189, 248, 0.14)',
                        border: '1px solid rgba(56, 189, 248, 0.35)',
                        color: '#38bdf8',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                      }}
                      title="Edit Bird Profile"
                    >
                      <NotesIcon size={11} /> Edit
                    </button>
                  </div>
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
                            <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <CalendarIcon size={11} className="text-slate-400" />
                              <span>{row.date}</span>
                            </span>
                            <span
                              style={{
                                fontSize: '0.65rem',
                                fontWeight: 700,
                                padding: '0.1rem 0.45rem',
                                borderRadius: '9999px',
                                background: row.type === 'Training' ? 'rgba(56, 189, 248, 0.14)' : 'rgba(245, 158, 11, 0.14)',
                                color: row.type === 'Training' ? '#38bdf8' : '#f59e0b',
                              }}
                            >
                              {row.type}
                            </span>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                              <strong style={{ fontSize: '0.82rem', color: 'var(--text-primary)' }}>{row.title}</strong>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.15rem', display: 'flex', alignItems: 'center', gap: '0.25rem', fontFamily: 'monospace' }}>
                                <MapPinIcon size={10} className="text-slate-500 inline shrink-0" />
                                <span>{row.location}</span>
                                <span>•</span>
                                <span>{row.distance} km</span>
                              </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <strong style={{ fontSize: '0.85rem', color: '#f59e0b', display: 'block', fontFamily: 'monospace' }}>
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
                                    padding: '0.1rem 0.35rem',
                                    fontSize: '0.62rem',
                                    cursor: 'pointer',
                                    fontWeight: 700,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.2rem',
                                  }}
                                >
                                  <CameraIcon size={10} />
                                  <span>Photo</span>
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
                                    padding: '0.1rem 0.35rem',
                                    fontSize: '0.62rem',
                                    cursor: 'pointer',
                                    fontWeight: 700,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.2rem',
                                  }}
                                >
                                  <VideoIcon size={10} />
                                  <span>Video</span>
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
                  <div className="flex items-center justify-between sm:justify-start gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-sky-400 shadow-[0_0_8px_#38bdf8]" />
                      <h4 className="text-sm sm:text-base font-extrabold text-white m-0">
                        Loft Pigeons ({filteredBirds.length})
                      </h4>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
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

                      {filteredBirds.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setIsInlineEditMode((prev) => !prev)}
                          className={`inline-flex items-center gap-1 py-1 px-2.5 rounded-full text-xs font-bold transition-all cursor-pointer border ${
                            isInlineEditMode
                              ? 'bg-sky-400/25 border-sky-400/50 text-sky-300 shadow-[0_0_10px_rgba(56,189,248,0.2)]'
                              : 'bg-sky-400/10 hover:bg-sky-400/20 border-sky-400/30 text-sky-400'
                          }`}
                          title={isInlineEditMode ? 'Exit Edit Mode' : 'Toggle inline Edit Mode'}
                        >
                          <NotesIcon size={11} />
                          <span>{isInlineEditMode ? 'Exit Edit Mode' : 'Edit Mode'}</span>
                        </button>
                      )}

                      {isInlineEditMode && (
                        <button
                          type="button"
                          disabled={savingAllInline}
                          onClick={handleSaveAllInline}
                          className="inline-flex items-center gap-1 py-1 px-2.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/45 rounded-full text-emerald-300 text-xs font-extrabold transition-all cursor-pointer"
                          title="Save all modified pigeons"
                        >
                          <span>{savingAllInline ? 'Saving…' : '✓ Save All'}</span>
                        </button>
                      )}
                    </div>
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
                      {filteredBirds.map((b) => {
                        const draft = inlineDrafts[b.id] || {
                          ringNo: b.ringNo || '',
                          color: b.color || '',
                          name: b.name || '',
                          gender: b.gender || 'Unknown',
                        }
                        return (
                          <div
                            key={b.id}
                            className="p-3 rounded-xl bg-slate-900/80 border border-white/10 flex flex-col gap-2.5 hover:border-amber-400/30 transition-all"
                          >
                            {isInlineEditMode ? (
                              <div className="flex flex-col gap-2">
                                <div className="grid grid-cols-2 gap-1.5">
                                  <input
                                    type="text"
                                    value={draft.ringNo}
                                    onChange={(e) => handleInlineFieldChange(b.id, 'ringNo', e.target.value)}
                                    placeholder="Ring No"
                                    className="px-2 py-1 rounded-lg bg-slate-950/90 border border-amber-400/35 text-amber-400 font-mono font-bold text-xs outline-none"
                                  />
                                  <input
                                    type="text"
                                    value={draft.color}
                                    onChange={(e) => handleInlineFieldChange(b.id, 'color', e.target.value)}
                                    placeholder="Color"
                                    className="px-2 py-1 rounded-lg bg-slate-950/90 border border-white/15 text-slate-200 text-xs outline-none"
                                  />
                                </div>
                                <div className="grid grid-cols-2 gap-1.5">
                                  <input
                                    type="text"
                                    value={draft.name}
                                    onChange={(e) => handleInlineFieldChange(b.id, 'name', e.target.value)}
                                    placeholder="Name / Alias"
                                    className="px-2 py-1 rounded-lg bg-slate-950/90 border border-white/15 text-slate-200 text-xs outline-none"
                                  />
                                  <select
                                    value={draft.gender}
                                    onChange={(e) => handleInlineFieldChange(b.id, 'gender', e.target.value)}
                                    className="px-2 py-1 rounded-lg bg-slate-950/90 border border-white/15 text-slate-200 text-xs outline-none"
                                  >
                                    <option value="Cock">Cock</option>
                                    <option value="Hen">Hen</option>
                                    <option value="Unknown">Unknown</option>
                                  </select>
                                </div>
                                <div className="flex items-center justify-end gap-1.5 pt-1">
                                  <button
                                    type="button"
                                    disabled={savingInlineId === b.id}
                                    onClick={() => handleSaveInlineRow(b)}
                                    className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[11px] font-bold"
                                  >
                                    {savingInlineId === b.id ? 'Saving…' : '✓ Save'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingBird(b)}
                                    className="px-2.5 py-1 rounded-lg bg-sky-500/15 border border-sky-400/35 text-sky-300 text-[11px] font-bold"
                                  >
                                    Full Profile
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between gap-2.5">
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
                                        <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-amber-400/15 text-amber-300 border border-amber-400/30 shrink-0 inline-flex items-center gap-1">
                                          <AntennaIcon size={9} />
                                          <span>{b.rfidTag}</span>
                                        </span>
                                      )}
                                      {(() => {
                                        const age = getBirdAge(b.birthdate, b.ringNo)
                                        if (!age) return null
                                        return (
                                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-400/15 text-amber-300 border border-amber-400/30 shrink-0 font-bold">
                                            {age.formatted}
                                          </span>
                                        )
                                      })()}
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
                                    onClick={() => setEditingBird(b)}
                                    className="w-7 h-7 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 border border-sky-400/30 text-sky-400 flex items-center justify-center text-xs"
                                    title="Edit Bird"
                                  >
                                    <NotesIcon size={12} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setSelectedHistoryBird(b)}
                                    className="w-7 h-7 rounded-lg bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/25 text-amber-400 flex items-center justify-center text-xs"
                                    title="View History"
                                  >
                                    <TimerIcon size={12} />
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
                            )}
                          </div>
                        )
                      })}
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
                          <th style={{ padding: '0.6rem 0.75rem', color: '#94a3b8', fontWeight: 700, fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Age
                          </th>
                          <th style={{ padding: '0.6rem 0.85rem', color: '#94a3b8', fontWeight: 700, fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'right' }}>
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredBirds.map((b) => {
                          const draft = inlineDrafts[b.id] || {
                            ringNo: b.ringNo || '',
                            color: b.color || '',
                            name: b.name || '',
                            gender: b.gender || 'Unknown',
                          }
                          return (
                            <tr
                              key={b.id}
                              style={{
                                borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                                transition: 'background 0.15s ease',
                                background: isInlineEditMode ? 'rgba(56, 189, 248, 0.03)' : 'transparent',
                              }}
                            >
                              <td style={{ padding: '0.55rem 0.85rem', fontWeight: 700 }}>
                                {isInlineEditMode ? (
                                  <input
                                    type="text"
                                    value={draft.ringNo}
                                    onChange={(e) => handleInlineFieldChange(b.id, 'ringNo', e.target.value)}
                                    placeholder="Ring No"
                                    style={{
                                      width: '100%',
                                      maxWidth: '145px',
                                      padding: '0.28rem 0.5rem',
                                      borderRadius: '6px',
                                      background: '#090d16',
                                      border: '1px solid rgba(255, 193, 7, 0.4)',
                                      color: '#FFC107',
                                      fontFamily: 'monospace',
                                      fontWeight: 800,
                                      fontSize: '0.74rem',
                                    }}
                                  />
                                ) : (
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
                                )}
                              </td>
                              <td style={{ padding: '0.55rem 0.75rem', color: '#cbd5e1', fontWeight: 500 }}>
                                {isInlineEditMode ? (
                                  <input
                                    type="text"
                                    value={draft.color}
                                    onChange={(e) => handleInlineFieldChange(b.id, 'color', e.target.value)}
                                    placeholder="Color"
                                    style={{
                                      width: '100%',
                                      maxWidth: '120px',
                                      padding: '0.28rem 0.5rem',
                                      borderRadius: '6px',
                                      background: '#090d16',
                                      border: '1px solid rgba(255, 255, 255, 0.16)',
                                      color: '#e2e8f0',
                                      fontSize: '0.73rem',
                                    }}
                                  />
                                ) : (
                                  b.color
                                )}
                              </td>
                              <td style={{ padding: '0.55rem 0.75rem', color: '#e2e8f0', fontWeight: 600 }}>
                                {isInlineEditMode ? (
                                  <input
                                    type="text"
                                    value={draft.name}
                                    onChange={(e) => handleInlineFieldChange(b.id, 'name', e.target.value)}
                                    placeholder="Name / Alias"
                                    style={{
                                      width: '100%',
                                      maxWidth: '130px',
                                      padding: '0.28rem 0.5rem',
                                      borderRadius: '6px',
                                      background: '#090d16',
                                      border: '1px solid rgba(255, 255, 255, 0.16)',
                                      color: '#fff',
                                      fontSize: '0.73rem',
                                      fontWeight: 600,
                                    }}
                                  />
                                ) : (
                                  b.name || '—'
                                )}
                              </td>
                              <td style={{ padding: '0.55rem 0.75rem' }}>
                                {isInlineEditMode ? (
                                  <select
                                    value={draft.gender}
                                    onChange={(e) => handleInlineFieldChange(b.id, 'gender', e.target.value)}
                                    style={{
                                      padding: '0.26rem 0.45rem',
                                      borderRadius: '6px',
                                      background: '#090d16',
                                      border: '1px solid rgba(255, 255, 255, 0.16)',
                                      color: '#e2e8f0',
                                      fontSize: '0.72rem',
                                      fontWeight: 700,
                                    }}
                                  >
                                    <option value="Cock">Cock</option>
                                    <option value="Hen">Hen</option>
                                    <option value="Unknown">Unknown</option>
                                  </select>
                                ) : (
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
                                )}
                              </td>
                              <td style={{ padding: '0.55rem 0.75rem', whiteSpace: 'nowrap' }}>
                                {(() => {
                                  const age = getBirdAge(b.birthdate, b.ringNo)
                                  if (!age) return <span style={{ color: '#64748b' }}>—</span>
                                  return (
                                    <div>
                                      <span style={{ color: '#f59e0b', fontWeight: 700, fontSize: '0.73rem' }}>{age.formatted}</span>
                                      {b.birthdate ? (
                                        <span style={{ display: 'block', fontSize: '0.62rem', color: '#64748b', fontFamily: 'monospace' }}>
                                          Hatch: {b.birthdate}
                                        </span>
                                      ) : age.isEstimated ? (
                                        <span style={{ display: 'block', fontSize: '0.62rem', color: '#64748b', fontFamily: 'monospace' }}>
                                          Est. hatch year
                                        </span>
                                      ) : null}
                                    </div>
                                  )
                                })()}
                              </td>
                              <td style={{ padding: '0.55rem 0.85rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem' }}>
                                  {isInlineEditMode && (
                                    <button
                                      type="button"
                                      disabled={savingInlineId === b.id}
                                      onClick={() => handleSaveInlineRow(b)}
                                      style={{
                                        background: 'rgba(16, 185, 129, 0.16)',
                                        border: '1px solid rgba(16, 185, 129, 0.4)',
                                        borderRadius: '6px',
                                        color: '#34d399',
                                        height: '1.65rem',
                                        padding: '0 0.5rem',
                                        fontSize: '0.66rem',
                                        fontWeight: 800,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        whiteSpace: 'nowrap',
                                      }}
                                      title="Save Row"
                                    >
                                      {savingInlineId === b.id ? '…' : '✓ Save'}
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => setEditingBird(b)}
                                    style={{
                                      background: 'rgba(56, 189, 248, 0.12)',
                                      border: '1px solid rgba(56, 189, 248, 0.32)',
                                      borderRadius: '6px',
                                      color: '#38bdf8',
                                      width: '1.65rem',
                                      height: '1.65rem',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                    }}
                                    title="Edit Bird Profile"
                                  >
                                    <NotesIcon size={12} />
                                  </button>
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
                          )
                        })}
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

              <button
                type="button"
                onClick={() => {
                  setIsSettingsMenuOpen(false)
                  setIsResetModalOpen(true)
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  width: '100%',
                  padding: '0.88rem 1rem',
                  background: 'rgba(239, 68, 68, 0.06)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  borderRadius: '0.5rem',
                  color: '#f87171',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                className="menu-item-hover"
              >
                <span style={{ color: '#ef4444', fontSize: '1.1rem', display: 'flex', alignItems: 'center' }}>
                  <TrashIcon size={18} />
                </span>
                <div>
                  <div style={{ fontWeight: 700, color: '#f87171' }}>Reset Records & Data</div>
                  <div style={{ fontSize: '0.68rem', color: 'rgba(248, 113, 113, 0.75)', marginTop: '0.15rem' }}>
                    Selectively clear races, pigeon registry, or clock-in results
                  </div>
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
                  <span style={{ color: '#f59e0b', fontSize: '1.1rem', display: 'flex', alignItems: 'center' }}>
                    <LightningIcon size={18} />
                  </span>
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
                style={{ fontSize: '0.8rem', padding: '0.4rem 0.88rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <DownloadIcon size={14} />
                <span>Download {selectedMedia.type === 'photo' ? 'Photo' : 'Video'}</span>
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
                    <MapPinIcon size={12} />
                    <span>{fetchingGps ? 'Fetching GPS…' : 'Use Current Device GPS'}</span>
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
                    <AlertTriangleIcon size={14} className="shrink-0" />
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

                {/* Danger Zone: Reset Records */}
                <div style={{ borderTop: '1px solid rgba(239, 68, 68, 0.25)', marginTop: '0.8rem', paddingTop: '0.8rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.6rem' }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <span style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#f87171' }}>
                        Reset Loft Records & Data
                      </span>
                      <span style={{ display: 'block', fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
                        Pumili at burahin ang mga karera, rehistradong ibon, o clock-in arrivals.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsSettingsModalOpen(false)
                        setIsResetModalOpen(true)
                      }}
                      style={{
                        padding: '0.4rem 0.75rem',
                        fontSize: '0.74rem',
                        fontWeight: 800,
                        borderRadius: '0.5rem',
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.35)',
                        color: '#f87171',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        flexShrink: 0
                      }}
                    >
                      <TrashIcon size={13} />
                      <span>Reset Options</span>
                    </button>
                  </div>
                </div>

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

      {/* ── Sub-modal for Resetting Loft Records ── */}
      {isResetModalOpen && (
        <div 
          className="modal-backdrop modal-floating" 
          style={{ zIndex: 12000 }}
          onClick={(e) => { if (e.target === e.currentTarget && !resetting) setIsResetModalOpen(false) }}
        >
          <div 
            className="modal-container" 
            style={{ maxWidth: '440px', padding: 0, borderRadius: '1rem', overflow: 'hidden' }}
          >
            {/* Header */}
            <div className="modal-header" style={{ background: 'linear-gradient(135deg, #b91c1c, #7f1d1d)', padding: '0.9rem 1.2rem' }}>
              <div className="modal-header-left">
                <span style={{ color: '#fff', display: 'flex', alignItems: 'center' }}>
                  <TrashIcon size={18} />
                </span>
                <div>
                  <h2 className="modal-title" style={{ color: '#fff', fontSize: '1rem', fontWeight: 800, margin: 0 }}>
                    Reset Loft Records
                  </h2>
                  <p style={{ margin: 0, fontSize: '0.68rem', color: 'rgba(255,255,255,0.8)' }}>
                    Pumili ng mga data na nais i-clear o burahin
                  </p>
                </div>
              </div>
              <button 
                type="button"
                className="modal-close-btn" 
                disabled={resetting}
                style={{ color: '#fff', background: 'rgba(255,255,255,0.15)', position: 'static', margin: 0 }} 
                onClick={() => setIsResetModalOpen(false)}
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="modal-body" style={{ padding: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              
              <div style={{ fontSize: '0.78rem', color: '#cbd5e1', fontWeight: 600 }}>
                Pumili ng mga records na nais i-reset:
              </div>

              {/* Option 1: Flight Events & Races */}
              <label 
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                  padding: '0.75rem 0.85rem',
                  borderRadius: '0.65rem',
                  background: resetEvents ? 'rgba(239, 68, 68, 0.12)' : 'rgba(255,255,255,0.03)',
                  border: resetEvents ? '1px solid rgba(239, 68, 68, 0.45)' : '1px solid rgba(255,255,255,0.08)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <input 
                  type="checkbox"
                  checked={resetEvents}
                  onChange={(e) => {
                    setResetEvents(e.target.checked)
                    if (e.target.checked) setResetClockIns(false)
                  }}
                  style={{ marginTop: '0.2rem', accentColor: '#ef4444', width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                    <span style={{ fontWeight: 800, fontSize: '0.82rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <TrophyIcon size={13} />
                      <span>Flight Events & Races</span>
                    </span>
                    <span style={{ fontSize: '0.68rem', fontWeight: 800, padding: '0.15rem 0.45rem', borderRadius: '9999px', background: 'rgba(239,68,68,0.2)', color: '#f87171' }}>
                      {events.length} {events.length === 1 ? 'record' : 'records'}
                    </span>
                  </div>
                  <p style={{ margin: '0.2rem 0 0', fontSize: '0.7rem', color: '#94a3b8', lineHeight: '1.35' }}>
                    Burahin ang lahat ng scheduled races, training tosses, at flight calendar history.
                  </p>
                </div>
              </label>

              {/* Option 2: Clocked Arrivals Only */}
              <label 
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                  padding: '0.75rem 0.85rem',
                  borderRadius: '0.65rem',
                  background: resetClockIns ? 'rgba(245, 158, 11, 0.12)' : 'rgba(255,255,255,0.03)',
                  border: resetClockIns ? '1px solid rgba(245, 158, 11, 0.45)' : '1px solid rgba(255,255,255,0.08)',
                  cursor: resetEvents ? 'not-allowed' : 'pointer',
                  opacity: resetEvents ? 0.45 : 1,
                  transition: 'all 0.15s ease'
                }}
              >
                <input 
                  type="checkbox"
                  disabled={resetEvents}
                  checked={resetClockIns}
                  onChange={(e) => setResetClockIns(e.target.checked)}
                  style={{ marginTop: '0.2rem', accentColor: '#f59e0b', width: '16px', height: '16px', cursor: resetEvents ? 'not-allowed' : 'pointer' }}
                />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                    <span style={{ fontWeight: 800, fontSize: '0.82rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <CalendarIcon size={13} />
                      <span>Clocked Arrivals Only</span>
                    </span>
                    <span style={{ fontSize: '0.68rem', fontWeight: 800, padding: '0.15rem 0.45rem', borderRadius: '9999px', background: 'rgba(245,158,11,0.2)', color: '#fbbf24' }}>
                      {totalClocked} clocked
                    </span>
                  </div>
                  <p style={{ margin: '0.2rem 0 0', fontSize: '0.7rem', color: '#94a3b8', lineHeight: '1.35' }}>
                    Mananatili ang mga karera at ibon, pero buburahin ang lahat ng clocked arrival times, speed calculations, at leaderboards.
                  </p>
                </div>
              </label>

              {/* Option 3: Loft Pigeon Registry */}
              <label 
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                  padding: '0.75rem 0.85rem',
                  borderRadius: '0.65rem',
                  background: resetBirds ? 'rgba(239, 68, 68, 0.12)' : 'rgba(255,255,255,0.03)',
                  border: resetBirds ? '1px solid rgba(239, 68, 68, 0.45)' : '1px solid rgba(255,255,255,0.08)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <input 
                  type="checkbox"
                  checked={resetBirds}
                  onChange={(e) => setResetBirds(e.target.checked)}
                  style={{ marginTop: '0.2rem', accentColor: '#ef4444', width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                    <span style={{ fontWeight: 800, fontSize: '0.82rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <BirdIcon size={13} />
                      <span>Loft Pigeon Registry</span>
                    </span>
                    <span style={{ fontSize: '0.68rem', fontWeight: 800, padding: '0.15rem 0.45rem', borderRadius: '9999px', background: 'rgba(239,68,68,0.2)', color: '#f87171' }}>
                      {registeredBirds.length} {registeredBirds.length === 1 ? 'bird' : 'birds'}
                    </span>
                  </div>
                  <p style={{ margin: '0.2rem 0 0', fontSize: '0.7rem', color: '#94a3b8', lineHeight: '1.35' }}>
                    Burahin ang lahat ng rehistradong ibon, ring numbers, kulay, lahi, at 125kHz RFID tag pairings.
                  </p>
                </div>
              </label>

              {/* Quick Select / Deselect */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    setResetEvents(true)
                    setResetBirds(true)
                    setResetClockIns(false)
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#f87171',
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  Select All (Full Reset)
                </button>
                <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.68rem' }}>•</span>
                <button
                  type="button"
                  onClick={() => {
                    setResetEvents(false)
                    setResetBirds(false)
                    setResetClockIns(false)
                    setConfirmResetChecked(false)
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  Clear Selection
                </button>
              </div>

              {/* Warning Notice & Confirmation Checkbox */}
              <div 
                style={{
                  background: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  borderRadius: '0.5rem',
                  padding: '0.65rem 0.75rem',
                  marginTop: '0.2rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#f87171', fontSize: '0.72rem', fontWeight: 800 }}>
                  <AlertTriangleIcon size={14} className="shrink-0" />
                  <span>Babala: Hindi na mababawi ang mga mabuburang data.</span>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.45rem', cursor: 'pointer' }}>
                  <input 
                    type="checkbox"
                    checked={confirmResetChecked}
                    onChange={(e) => setConfirmResetChecked(e.target.checked)}
                    style={{ accentColor: '#ef4444', width: '15px', height: '15px', cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '0.72rem', color: '#fca5a5', fontWeight: 700 }}>
                    Kumpirmado, nais kong i-reset ang napiling records.
                  </span>
                </label>
              </div>

              {/* Error / Success Feedback */}
              {resetErrorMsg && (
                <div style={{ color: '#f87171', fontSize: '0.72rem', fontWeight: 700, padding: '0.3rem 0', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <AlertTriangleIcon size={13} className="shrink-0" />
                  <span>{resetErrorMsg}</span>
                </div>
              )}
              {resetSuccessMsg && (
                <div style={{ color: '#34d399', fontSize: '0.72rem', fontWeight: 700, padding: '0.3rem 0' }}>
                  ✓ {resetSuccessMsg}
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.4rem' }}>
                <button
                  type="button"
                  disabled={resetting}
                  onClick={() => setIsResetModalOpen(false)}
                  style={{
                    flex: 1,
                    height: '2.4rem',
                    borderRadius: '0.5rem',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    color: '#cbd5e1',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={resetting || (!resetEvents && !resetBirds && !resetClockIns) || !confirmResetChecked}
                  onClick={handleExecuteReset}
                  style={{
                    flex: 1.4,
                    height: '2.4rem',
                    borderRadius: '0.5rem',
                    background: (!resetEvents && !resetBirds && !resetClockIns) || !confirmResetChecked 
                      ? 'rgba(239, 68, 68, 0.25)' 
                      : 'linear-gradient(135deg, #ef4444, #b91c1c)',
                    border: 'none',
                    color: '#fff',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    cursor: (!resetEvents && !resetBirds && !resetClockIns) || !confirmResetChecked || resetting ? 'not-allowed' : 'pointer',
                    opacity: (!resetEvents && !resetBirds && !resetClockIns) || !confirmResetChecked ? 0.6 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.35rem',
                    boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
                  }}
                >
                  <TrashIcon size={14} />
                  <span>{resetting ? 'Resetting Records...' : 'Reset Selected Records'}</span>
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ── Sub-modal for Editing Individual Bird Profile ── */}
      {editingBird && (
        <div
          className="modal-backdrop modal-floating"
          style={{ zIndex: 12500 }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !editSaving) setEditingBird(null)
          }}
        >
          <div className="modal-container" style={{ maxWidth: '480px', padding: 0 }}>
            <div
              className="modal-header"
              style={{
                background: 'linear-gradient(135deg, #2196F3, #1976D2)',
                padding: '0.9rem 1.2rem',
              }}
            >
              <div className="modal-header-left">
                <span style={{ color: '#fff', display: 'flex', alignItems: 'center' }}>
                  <BirdIcon size={18} />
                </span>
                <div>
                  <h2 className="modal-title" style={{ color: '#fff', fontSize: '1rem', fontWeight: 800, margin: 0 }}>
                    Edit Pigeon: {editingBird.ringNo}
                  </h2>
                  <p style={{ margin: 0, fontSize: '0.68rem', color: 'rgba(255,255,255,0.8)' }}>
                    Update ring number, color, alias, gender, RFID tag &amp; pedigree
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                style={{ color: '#fff', background: 'rgba(255,255,255,0.15)', position: 'static', margin: 0 }}
                onClick={() => setEditingBird(null)}
              >
                ✕
              </button>
            </div>

            <div
              className="modal-body modal-scroll-body"
              style={{
                padding: '1.25rem',
                maxHeight: '74dvh',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
              }}
            >
              {scanNotice && (
                <div
                  style={{
                    padding: '0.55rem 0.75rem',
                    borderRadius: '0.5rem',
                    border: '1px solid rgba(76, 175, 80, 0.4)',
                    background: 'rgba(76, 175, 80, 0.12)',
                    color: '#81C784',
                    fontSize: '0.74rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                  }}
                >
                  <AntennaIcon size={14} className="shrink-0" />
                  <span>{scanNotice}</span>
                </div>
              )}

              <form
                onSubmit={handleUpdateBird}
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-default)',
                  borderRadius: '0.75rem',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                }}
              >
                <div className="form-row">
                  <div className="form-group">
                    <label
                      htmlFor="profile-edit-ring"
                      className="form-label"
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.3rem', fontSize: '0.7rem' }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <TagIcon size={12} /> Ring Number <span style={{ color: '#f87171', fontWeight: 800 }}>*</span>
                      </span>
                      <span style={{ fontSize: '0.62rem', color: '#f87171', fontWeight: 700 }}>Required</span>
                    </label>
                    <input
                      id="profile-edit-ring"
                      type="text"
                      className="form-input"
                      value={editRingNo}
                      onChange={(e) => setEditRingNo(e.target.value)}
                      style={{ height: '2.2rem', fontSize: '0.8rem' }}
                    />
                  </div>
                  <div className="form-group">
                    <label
                      htmlFor="profile-edit-color"
                      className="form-label"
                      style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.7rem' }}
                    >
                      <NotesIcon size={12} /> Color
                    </label>
                    <input
                      id="profile-edit-color"
                      type="text"
                      className="form-input"
                      value={editColor}
                      onChange={(e) => setEditColor(e.target.value)}
                      style={{ height: '2.2rem', fontSize: '0.8rem' }}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label
                      htmlFor="profile-edit-name"
                      className="form-label"
                      style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.7rem' }}
                    >
                      <NameIcon size={12} /> Name / Alias
                    </label>
                    <input
                      id="profile-edit-name"
                      type="text"
                      className="form-input"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      style={{ height: '2.2rem', fontSize: '0.8rem' }}
                    />
                  </div>
                  <div className="form-group">
                    <label
                      htmlFor="profile-edit-gender"
                      className="form-label"
                      style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.7rem' }}
                    >
                      <DnaIcon size={12} /> Gender
                    </label>
                    <select
                      id="profile-edit-gender"
                      className="form-input"
                      value={editGender}
                      onChange={(e) => setEditGender(e.target.value)}
                      style={{
                        height: '2.2rem',
                        fontSize: '0.8rem',
                        background: 'var(--bg-card)',
                        color: 'var(--text-primary)',
                      }}
                    >
                      <option value="Cock">Cock (Male)</option>
                      <option value="Hen">Hen (Female)</option>
                      <option value="Unknown">Unknown</option>
                    </select>
                  </div>
                </div>

                {/* 125kHz RFID Snap Ring Tag */}
                <div
                  style={{
                    background: 'rgba(255, 193, 7, 0.05)',
                    border: '1px solid rgba(255, 193, 7, 0.25)',
                    borderRadius: '0.5rem',
                    padding: '0.65rem 0.75rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.35rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label
                      htmlFor="profile-edit-rfid"
                      className="form-label"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        fontSize: '0.72rem',
                        color: '#f59e0b',
                        fontWeight: 700,
                        margin: 0,
                      }}
                    >
                      <AntennaIcon size={12} />
                      <span>125kHz RFID Snap Ring Tag</span>
                    </label>
                    <span
                      style={{
                        fontSize: '0.62rem',
                        background: 'rgba(255,193,7,0.15)',
                        color: '#FFC107',
                        padding: '0.1rem 0.35rem',
                        borderRadius: '3px',
                        fontWeight: 600,
                      }}
                    >
                      USB Scanner Ready
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                    <input
                      id="profile-edit-rfid"
                      type="text"
                      placeholder="Tap blue ring on USB reader (or type tag ID)"
                      className="form-input"
                      value={editRfidTag}
                      onChange={(e) => setEditRfidTag(e.target.value)}
                      style={{ height: '2.2rem', fontSize: '0.8rem', flex: 1, fontFamily: 'monospace' }}
                    />
                    {editRfidTag && (
                      <button
                        type="button"
                        onClick={() => setEditRfidTag('')}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#ef4444',
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                          padding: '0.2rem',
                        }}
                        title="Clear tag"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                {/* Pedigree & Advanced details */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                    borderTop: '1px solid var(--border-default)',
                    paddingTop: '0.75rem',
                    marginTop: '0.2rem',
                  }}
                >
                  <div className="form-row">
                    <div className="form-group">
                      <label
                        htmlFor="profile-edit-birthdate"
                        className="form-label"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.7rem' }}
                      >
                        <CalendarIcon size={12} /> Hatch Date
                      </label>
                      <input
                        id="profile-edit-birthdate"
                        type="date"
                        className="form-input"
                        value={editBirthdate}
                        onChange={(e) => setEditBirthdate(e.target.value)}
                        style={{ height: '2.2rem', fontSize: '0.8rem', colorScheme: 'dark' }}
                      />
                      {editBirthdate && (() => {
                        const previewAge = getBirdAge(editBirthdate, editRingNo)
                        if (!previewAge) return null
                        return (
                          <div style={{ marginTop: '0.35rem', fontSize: '0.68rem', color: '#f59e0b', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(245, 158, 11, 0.1)', padding: '0.25rem 0.5rem', borderRadius: '4px', border: '1px solid rgba(245, 158, 11, 0.25)' }}>
                            <span>Calculated Age: {previewAge.formatted}</span>
                            <span style={{ color: '#94a3b8' }}>({previewAge.totalDays} days)</span>
                          </div>
                        )
                      })()}
                    </div>
                    <div className="form-group">
                      <label
                        htmlFor="profile-edit-strain"
                        className="form-label"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.7rem' }}
                      >
                        <DnaIcon size={12} /> Strain / Breed
                      </label>
                      <input
                        id="profile-edit-strain"
                        type="text"
                        placeholder="e.g. Janssen / Arden"
                        className="form-input"
                        value={editStrain}
                        onChange={(e) => setEditStrain(e.target.value)}
                        style={{ height: '2.2rem', fontSize: '0.8rem' }}
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label
                        htmlFor="profile-edit-sire"
                        className="form-label"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.7rem' }}
                      >
                        Sire (Father Ring)
                      </label>
                      <input
                        id="profile-edit-sire"
                        type="text"
                        placeholder="e.g. PH-2024-5020"
                        className="form-input"
                        value={editSire}
                        onChange={(e) => setEditSire(e.target.value)}
                        style={{ height: '2.2rem', fontSize: '0.8rem' }}
                      />
                    </div>
                    <div className="form-group">
                      <label
                        htmlFor="profile-edit-dam"
                        className="form-label"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.7rem' }}
                      >
                        Dam (Mother Ring)
                      </label>
                      <input
                        id="profile-edit-dam"
                        type="text"
                        placeholder="e.g. PH-2024-3011"
                        className="form-input"
                        value={editDam}
                        onChange={(e) => setEditDam(e.target.value)}
                        style={{ height: '2.2rem', fontSize: '0.8rem' }}
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label
                        htmlFor="profile-edit-status"
                        className="form-label"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.7rem' }}
                      >
                        Loft Status
                      </label>
                      <select
                        id="profile-edit-status"
                        className="form-input"
                        value={editStatus}
                        onChange={(e) => setEditStatus(e.target.value)}
                        style={{
                          height: '2.2rem',
                          fontSize: '0.8rem',
                          background: 'var(--bg-card)',
                          color: 'var(--text-primary)',
                        }}
                      >
                        <option value="Active">Active Racer</option>
                        <option value="Breeding">Breeder</option>
                        <option value="Retired">Retired</option>
                        <option value="Lost">Lost</option>
                        <option value="Sold">Sold</option>
                        <option value="Deceased">Deceased</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label
                      htmlFor="profile-edit-notes"
                      className="form-label"
                      style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.7rem' }}
                    >
                      <NotesIcon size={12} /> Notes &amp; Lineage Details
                    </label>
                    <textarea
                      id="profile-edit-notes"
                      placeholder="Pedigree details, achievements, temperament..."
                      className="form-input"
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      style={{ height: '3.5rem', resize: 'vertical', fontSize: '0.8rem', padding: '0.4rem 0.5rem' }}
                    />
                  </div>
                </div>

                {editError && (
                  <div className="form-error" style={{ fontSize: '0.75rem', marginTop: '0.2rem' }}>
                    {editError}
                  </div>
                )}
                {editSuccess && (
                  <div
                    style={{
                      background: 'rgba(63, 185, 80, 0.1)',
                      border: '1px solid rgba(63, 185, 80, 0.3)',
                      borderRadius: '0.5rem',
                      padding: '0.4rem',
                      color: 'var(--color-success)',
                      textAlign: 'center',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      marginTop: '0.2rem',
                    }}
                  >
                    Changes saved successfully!
                  </div>
                )}

                <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.4rem' }}>
                  <button
                    type="button"
                    onClick={() => setEditingBird(null)}
                    style={{
                      flex: 1,
                      height: '2.3rem',
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      color: '#cbd5e1',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      borderRadius: '0.5rem',
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={editSaving}
                    className="btn-primary"
                    style={{
                      flex: 1.5,
                      height: '2.3rem',
                      background: '#2196F3',
                      color: '#fff',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      border: 'none',
                      borderRadius: '0.5rem',
                      cursor: 'pointer',
                    }}
                  >
                    {editSaving ? 'Saving Changes...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  )

  if (isPageMode) {
    return (
      <div className="w-full">
        {profileMainView}
      </div>
    )
  }

  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      {profileMainView}
    </div>
  )
}
