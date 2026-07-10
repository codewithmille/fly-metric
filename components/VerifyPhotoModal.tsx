'use client'

import { useState, useEffect, useRef } from 'react'
import type { RaceEvent } from '@/app/api/race-events/route'
import { BirdIcon } from '@/components/icons'
import { saveEvent } from '@/lib/apiClient'

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
}

interface VerifyPhotoModalProps {
  isOpen: boolean
  events: RaceEvent[]
  registeredBirds: LoftBird[]
  onClose: () => void
  onClockInSaved: () => void
  authToken?: string
}

interface BirdRecord {
  ringNo: string
  clockInTime: string
  speed: number
}

// Camera Icon SVG
const CameraIcon = ({ size = 20, ...props }: { size?: number; [key: string]: any }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
)

// Rotate Camera Icon SVG
const RotateIcon = ({ size = 18, ...props }: { size?: number; [key: string]: any }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
  </svg>
)

export default function VerifyPhotoModal({
  isOpen,
  events,
  registeredBirds,
  onClose,
  onClockInSaved,
  authToken,
}: VerifyPhotoModalProps) {
  // Modes: 'photo' or 'video'
  const [mode, setMode] = useState<'photo' | 'video'>('photo')
  
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [activeDeviceIdx, setActiveDeviceIdx] = useState(0)
  const [hasCameraAccess, setHasCameraAccess] = useState<boolean | null>(null)
  
  const [locationText, setLocationText] = useState('Detecting GPS location…')
  const [coordinatesText, setCoordinatesText] = useState('')
  
  const [currentTime, setCurrentTime] = useState<Date>(new Date())
  
  // Captured states
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null)
  const [capturedVideo, setCapturedVideo] = useState<string | null>(null)
  const [capturedVideoBase64, setCapturedVideoBase64] = useState<string | null>(null)
  const [capturedTime, setCapturedTime] = useState<Date | null>(null)
  const [capturedLocation, setCapturedLocation] = useState<string>('')
  
  // Video Recording States
  const [isRecording, setIsRecording] = useState(false)
  const [recordingDuration, setRecordingDuration] = useState(0)

  // Form selection states
  const [selectedEventId, setSelectedEventId] = useState('')
  const [ringNo, setRingNo] = useState('')
  
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)

  // Refs for camera and canvas loop
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const modalRef = useRef<HTMLDivElement>(null)
  const animationFrameIdRef = useRef<number | null>(null)
  
  // Media Recorder Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordedChunksRef = useRef<Blob[]>([])
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Filter available races and trainings
  const flightEvents = events.filter(
    (e) => e.extendedProps.club === 'Race' || e.extendedProps.club === 'Training'
  )

  // Format Helper: Time (09:52:12 pm)
  const formatTime = (date: Date) => {
    let hours = date.getHours()
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')
    const ampm = hours >= 12 ? 'pm' : 'am'
    hours = hours % 12
    hours = hours ? hours : 12
    const hoursStr = String(hours).padStart(2, '0')
    return `${hoursStr}:${minutes}:${seconds} ${ampm}`
  }

  // Format Helper: Date (Mon, Jul 06, 2026)
  const formatDate = (date: Date) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return `${days[date.getDay()]}, ${months[date.getMonth()]} ${String(date.getDate()).padStart(2, '0')}, ${date.getFullYear()}`
  }

  // 1. Initial Setup
  useEffect(() => {
    if (isOpen) {
      if (flightEvents.length > 0) {
        setSelectedEventId(flightEvents[0].id)
      } else {
        setSelectedEventId('')
      }
      
      if (registeredBirds.length > 0) {
        setRingNo(registeredBirds[0].ringNo)
      } else {
        setRingNo('')
      }

      setCapturedPhoto(null)
      setCapturedVideo(null)
      setCapturedVideoBase64(null)
      setCapturedTime(null)
      setIsRecording(false)
      setRecordingDuration(0)
      setError('')
      setSuccess(false)
      
      // Request GPS
      if (typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            const { latitude, longitude } = pos.coords
            setCoordinatesText(`${latitude.toFixed(6)}°N, ${longitude.toFixed(6)}°E`)
            
            try {
              const res = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
              )
              if (res.ok) {
                const data = await res.json()
                const addr = data.address
                const parts = []
                if (addr.village || addr.neighbourhood || addr.suburb) {
                  parts.push(addr.village || addr.neighbourhood || addr.suburb)
                }
                if (addr.city || addr.town || addr.municipality) {
                  parts.push(addr.city || addr.town || addr.municipality)
                }
                if (addr.state || addr.region) {
                  parts.push(addr.state || addr.region)
                }
                if (parts.length > 0) {
                  setLocationText(parts.join(', '))
                  return
                }
              }
            } catch (e) {
              console.error('OSM Nominatim failed', e)
            }
            setLocationText(`${latitude.toFixed(4)}°N, ${longitude.toFixed(4)}°E`)
          },
          (err) => {
            console.error('GPS error', err)
            setLocationText('GPS Location Unavailable')
          },
          { enableHighAccuracy: true, timeout: 10000 }
        )
      } else {
        setLocationText('GPS Not Supported')
      }

      // List Cameras
      navigator.mediaDevices.enumerateDevices().then((deviceInfos) => {
        const videoDevices = deviceInfos.filter((d) => d.kind === 'videoinput')
        setDevices(videoDevices)
      }).catch((e) => console.error('Enumerate cameras failed', e))
      
      modalRef.current?.focus()
    }
  }, [isOpen, registeredBirds])

  // 2. Real-time Clock Timer
  useEffect(() => {
    if (isOpen && !capturedPhoto && !capturedVideo) {
      const timer = setInterval(() => {
        setCurrentTime(new Date())
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [isOpen, capturedPhoto, capturedVideo])

  // 3. Camera Stream Management
  useEffect(() => {
    if (isOpen && !capturedPhoto && !capturedVideo) {
      startCamera()
    } else {
      stopCamera()
    }

    return () => {
      stopCamera()
    }
  }, [isOpen, capturedPhoto, capturedVideo, activeDeviceIdx, devices])

  const startCamera = async () => {
    stopCamera()
    setError('')
    setHasCameraAccess(null)

    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setHasCameraAccess(false)
      setError('Camera access is not supported by your browser or connection. Please ensure you are using HTTPS and a modern browser like Safari or Chrome.')
      return
    }

    try {
      let videoConstraint: any = { facingMode: 'environment' }
      
      // Only use exact deviceId if we have a valid, non-empty deviceId
      if (devices.length > 0 && devices[activeDeviceIdx]?.deviceId) {
        videoConstraint = { deviceId: { exact: devices[activeDeviceIdx].deviceId } }
      }

      const constraints: MediaStreamConstraints = {
        video: videoConstraint,
        audio: true // Request audio for video recording
      }
      
      let stream: MediaStream
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints)
      } catch (audioErr) {
        // Fallback if mic is blocked or not available
        console.warn('Microphone access failed, falling back to video only:', audioErr)
        
        let fallbackVideoConstraint: any = { facingMode: 'environment' }
        if (devices.length > 0 && devices[activeDeviceIdx]?.deviceId) {
          fallbackVideoConstraint = { deviceId: { exact: devices[activeDeviceIdx].deviceId } }
        }
        
        stream = await navigator.mediaDevices.getUserMedia({
          video: fallbackVideoConstraint
        })
      }

      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
      setHasCameraAccess(true)
    } catch (err: any) {
      console.error('Camera access error:', err)
      setHasCameraAccess(false)
      setError('Could not access your camera. Please ensure permissions are granted and that you are using a secure connection (HTTPS).')
    }
  }

  const stopCamera = () => {
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current)
      animationFrameIdRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }

  const handleSwitchCamera = () => {
    if (devices.length > 1) {
      setActiveDeviceIdx((prev) => (prev + 1) % devices.length)
    }
  }

  // 4. Live Canvas Drawing Loop (Runs while camera is playing)
  useEffect(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!isOpen || !hasCameraAccess || !video || !canvas || capturedPhoto || capturedVideo) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let active = true

    const drawLoop = () => {
      if (!active) return

      if (video.readyState >= video.HAVE_CURRENT_DATA) {
        // Maintain canvas aspect ratio and clamp width to 640px for compression & recording speed
        let targetWidth = video.videoWidth || 640
        let targetHeight = video.videoHeight || 480
        if (targetWidth > 640) {
          targetHeight = Math.round((640 / targetWidth) * targetHeight)
          targetWidth = 640
        }

        if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
          canvas.width = targetWidth
          canvas.height = targetHeight
        }

        // Draw camera frame
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

        // Draw the Watermark Overlay directly onto the frame!
        const now = new Date()
        const timeStr = formatTime(now)
        const dateStr = formatDate(now)
        drawOverlay(ctx, canvas.width, canvas.height, timeStr, dateStr, locationText, coordinatesText)
      }

      animationFrameIdRef.current = requestAnimationFrame(drawLoop)
    }

    animationFrameIdRef.current = requestAnimationFrame(drawLoop)

    return () => {
      active = false
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current)
      }
    }
  }, [isOpen, hasCameraAccess, capturedPhoto, capturedVideo, locationText, coordinatesText])

  // Watermark Drawing Helper
  const drawOverlay = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    timeStr: string,
    dateStr: string,
    locationText: string,
    coordinatesText: string
  ) => {
    const baseScale = width / 640
    // Make the entire watermark ~45% larger
    const scale = baseScale * 1.45
    
    // Calculate crop margins dynamically based on display client dimensions to keep text visible
    let cropLeft = 0
    let cropBottom = 0
    let visibleWidth = width
    let visibleHeight = height

    if (ctx.canvas && ctx.canvas.clientWidth && ctx.canvas.clientHeight) {
      const displayRatio = ctx.canvas.clientWidth / ctx.canvas.clientHeight
      const canvasRatio = width / height
      
      if (displayRatio < canvasRatio) {
        // Display is narrower than canvas (cropped on sides)
        visibleWidth = height * displayRatio
        cropLeft = (width - visibleWidth) / 2
      } else {
        // Display is wider than canvas (cropped on top/bottom)
        visibleHeight = width / displayRatio
        cropBottom = (height - visibleHeight) / 2
      }
    }

    const marginX = cropLeft + 20 * baseScale
    
    // Position watermark from the visible bottom
    const boxHeight = 84 * scale
    const startY = (height - cropBottom) - boxHeight - 10 * baseScale
    const badgeHeight = 24 * scale
    const badgeY = startY

    // Measure texts
    ctx.font = `bold ${Math.round(11 * scale)}px sans-serif`
    const labelWidth = ctx.measureText('CLOCK IN').width + 12 * scale
    const timeWidth = ctx.measureText(timeStr).width + 12 * scale

    // Yellow tag
    ctx.fillStyle = '#FFC107'
    ctx.beginPath()
    if (ctx.roundRect) {
      ctx.roundRect(marginX, badgeY, labelWidth, badgeHeight, [4 * scale, 0, 0, 4 * scale])
    } else {
      ctx.rect(marginX, badgeY, labelWidth, badgeHeight)
    }
    ctx.fill()

    // CLOCK IN Text
    ctx.fillStyle = '#000000'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('CLOCK IN', marginX + labelWidth / 2, badgeY + badgeHeight / 2)

    // Dark grey time block
    ctx.fillStyle = '#1e293b'
    ctx.beginPath()
    if (ctx.roundRect) {
      ctx.roundRect(marginX + labelWidth, badgeY, timeWidth, badgeHeight, [0, 4 * scale, 4 * scale, 0])
    } else {
      ctx.rect(marginX + labelWidth, badgeY, timeWidth, badgeHeight)
    }
    ctx.fill()

    // Time Text
    ctx.fillStyle = '#FFC107'
    ctx.fillText(timeStr, marginX + labelWidth + timeWidth / 2, badgeY + badgeHeight / 2)

    // Details vertical gold border + text
    const detailsY = badgeY + badgeHeight + 8 * scale
    const textX = marginX + 10 * scale
    
    // Allow text to occupy up to the visible boundary width minus margin
    const maxTextWidth = visibleWidth - (marginX - cropLeft) - 30 * baseScale

    // We draw texts dynamically and track Y position
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'

    // Shadows
    ctx.shadowColor = 'rgba(0, 0, 0, 0.95)'
    ctx.shadowBlur = 4 * scale
    ctx.shadowOffsetX = 1 * scale
    ctx.shadowOffsetY = 1 * scale

    let currentY = detailsY

    // 1. Date Text
    ctx.fillStyle = '#ffffff'
    ctx.font = `bold ${Math.round(12.5 * scale)}px sans-serif`
    ctx.fillText(dateStr, textX, currentY, maxTextWidth)
    currentY += 16 * scale

    // 2. Location Text
    ctx.fillStyle = '#ffffff'
    ctx.font = `${Math.round(10 * scale)}px sans-serif`
    ctx.fillText(locationText, textX, currentY, maxTextWidth)
    currentY += 15 * scale

    // 3. Coordinates Text
    if (coordinatesText) {
      ctx.fillStyle = '#ffffff'
      ctx.font = `${Math.round(9.5 * scale)}px sans-serif`
      ctx.fillText(coordinatesText, textX, currentY, maxTextWidth)
      currentY += 15 * scale
    }

    // 4. Verified Seal
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
    ctx.font = `italic ${Math.round(8.5 * scale)}px sans-serif`
    ctx.fillText('✓ Verified time by FlyMetric Camera', textX, currentY, maxTextWidth)

    // Reset shadows
    ctx.shadowColor = 'transparent'
    ctx.shadowBlur = 0
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = 0

    // Draw vertical gold line beside details
    const verticalLineHeight = (currentY - detailsY) + 10 * scale
    ctx.strokeStyle = '#FFC107'
    ctx.lineWidth = 3 * scale
    ctx.beginPath()
    ctx.moveTo(marginX + 1.5 * scale, detailsY)
    ctx.lineTo(marginX + 1.5 * scale, detailsY + verticalLineHeight)
    ctx.stroke()
  }

  // 5. Action: Snap Photo
  const handleSnapPhoto = () => {
    const canvas = canvasRef.current
    if (!canvas || !hasCameraAccess) return

    const snapTime = new Date()
    const locStr = coordinatesText ? `${locationText} (${coordinatesText})` : locationText

    // Compress to compact base64 JPG from the live rendering canvas!
    const dataUrl = canvas.toDataURL('image/jpeg', 0.7)
    setCapturedPhoto(dataUrl)
    setCapturedTime(snapTime)
    setCapturedLocation(locStr)
    stopCamera()
  }

  // 6. Action: Start/Stop Video Recording
  const handleToggleRecording = () => {
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }

  const startRecording = () => {
    const canvas = canvasRef.current
    const stream = streamRef.current
    if (!canvas || !stream) return

    recordedChunksRef.current = []

    // Capture the canvas stream at 24 FPS with the overlay already drawn onto it!
    const recordStream = canvas.captureStream(24)

    // Combine audio tracks from native camera mic stream
    const audioTracks = stream.getAudioTracks()
    if (audioTracks.length > 0) {
      recordStream.addTrack(audioTracks[0].clone())
    }

    // Determine codec compatibility
    let options = { mimeType: 'video/webm;codecs=vp8,opus' }
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
      options = { mimeType: 'video/webm' }
    }
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
      options = { mimeType: 'video/mp4' }
    }
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
      options = { mimeType: '' }
    }

    try {
      const recorder = new MediaRecorder(recordStream, options)
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data)
        }
      }

      const snapTime = new Date()
      const locStr = coordinatesText ? `${locationText} (${coordinatesText})` : locationText

      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: recorder.mimeType || 'video/webm' })
        const url = URL.createObjectURL(blob)
        setCapturedVideo(url)
        setCapturedTime(snapTime)
        setCapturedLocation(locStr)

        // Convert to compact base64 for offline saving in localStorage
        const reader = new FileReader()
        reader.onloadend = () => {
          setCapturedVideoBase64(reader.result as string)
        }
        reader.readAsDataURL(blob)
      }

      recorder.start()
      setIsRecording(true)
      setRecordingDuration(0)
      setError('')

      // 15 seconds recording limit
      let elapsed = 0
      recordingTimerRef.current = setInterval(() => {
        elapsed += 1
        setRecordingDuration(elapsed)
        if (elapsed >= 15) {
          stopRecording()
        }
      }, 1000)

    } catch (err: any) {
      console.error('Recording initialization failed:', err)
      setError('Video recording is not supported on this device/browser.')
    }
  }

  const stopRecording = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current)
      recordingTimerRef.current = null
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    setIsRecording(false)
    stopCamera()
  }

  // 7. Action: Verify & Clock-In Submit
  const handleVerifyClockIn = async () => {
    setError('')
    setSuccess(false)

    if (mode === 'photo' && !capturedPhoto) {
      setError('Please take a verification photo first.')
      return
    }
    if (mode === 'video' && !capturedVideoBase64) {
      setError('Please record a verification video first.')
      return
    }

    if (!selectedEventId) {
      setError('Please select a race or training event first.')
      return
    }

    if (!ringNo) {
      setError('Please select a bird ring number.')
      return
    }

    const event = events.find((e) => e.id === selectedEventId)
    if (!event) {
      setError('Selected event not found.')
      return
    }

    setSaving(true)

    try {
      const distanceKm = event.extendedProps.distance
      const releaseTime = event.extendedProps.releaseTime || '06:00'
      const checkTime = capturedTime || new Date()
      
      const snapHourStr = String(checkTime.getHours()).padStart(2, '0')
      const snapMinStr = String(checkTime.getMinutes()).padStart(2, '0')
      const clockInTimeStr = `${snapHourStr}:${snapMinStr}`

      const [rH, rM] = releaseTime.split(':').map(Number)
      const releaseMinutes = rH * 60 + rM
      const clockInMinutes = checkTime.getHours() * 60 + checkTime.getMinutes()

      if (clockInMinutes <= releaseMinutes) {
        throw new Error(`Capture time (${clockInTimeStr}) must be after release time (${releaseTime}).`)
      }

      const flyingTotalMins = clockInMinutes - releaseMinutes
      const distanceMeters = distanceKm * 1000
      const calculatedSpeed = Math.round(distanceMeters / flyingTotalMins)

      // Save to localStorage
      if (typeof window !== 'undefined') {
        const keyPrefix = mode === 'photo' ? 'verify_photo' : 'verify_video'
        const dataPayload = mode === 'photo' ? capturedPhoto : capturedVideoBase64
        
        if (dataPayload) {
          localStorage.setItem(`${keyPrefix}_${event.id}_${ringNo.toUpperCase()}`, dataPayload)
        }

        // Auto-download file directly to device storage
        try {
          const link = document.createElement('a')
          link.href = dataPayload || ''
          const ringTag = ringNo ? `-${ringNo.toUpperCase()}` : ''
          const ext = mode === 'photo' ? 'jpg' : 'webm'
          link.download = `verified-clockin${ringTag}-${clockInTimeStr.replace(/:/g, '-')}.${ext}`
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
        } catch (dlErr) {
          console.warn('Auto-download to device failed:', dlErr)
        }
      }

      // Append to clocked birds list
      let birdsList: BirdRecord[] = []
      try {
        birdsList = JSON.parse(event.extendedProps.birds || '[]')
      } catch (e) {
        birdsList = []
      }

      if (birdsList.some((b) => b.ringNo.toUpperCase() === ringNo.toUpperCase())) {
        throw new Error(`Bird "${ringNo}" is already clocked in for this event.`)
      }

      const newBird: BirdRecord = {
        ringNo: ringNo.toUpperCase(),
        clockInTime: clockInTimeStr,
        speed: calculatedSpeed,
      }
      birdsList.push(newBird)

      // Update event metrics
      const totalBirds = birdsList.length
      const speeds = birdsList.map((b) => b.speed)
      const maxSpeed = Math.max(...speeds)
      const avgSpeed = Math.round(speeds.reduce((sum, s) => sum + s, 0) / totalBirds)
      const fastestBird = birdsList.reduce((fastest, current) => 
        current.speed > fastest.speed ? current : fastest
      , birdsList[0])
      
      const winnerRing = event.extendedProps.club === 'Training' ? 'N/A' : fastestBird.ringNo

      const res = await saveEvent(authToken, {
        id: event.id,
        title: event.title,
        date: event.date,
        totalBirds,
        maxSpeed,
        avgSpeed,
        location: event.extendedProps.location,
        club: event.extendedProps.club,
        distance: distanceKm,
        winner: winnerRing,
        releaseTime,
        clockInTime: clockInTimeStr,
        birds: JSON.stringify(birdsList),
      }, true)

      if (!res.success) {
        throw new Error('Failed to update event clock-in details.')
      }

      setSuccess(true)
      onClockInSaved()

      setTimeout(() => {
        setSuccess(false)
        onClose()
      }, 1200)

    } catch (err: any) {
      setError(err.message || 'An error occurred.')
    } finally {
      setSaving(false)
    }
  }

  // 8. Action: Manual download trigger
  const handleManualDownload = () => {
    const payload = mode === 'photo' ? capturedPhoto : capturedVideoBase64
    if (!payload) return
    const link = document.createElement('a')
    link.href = payload
    const ringTag = ringNo ? `-${ringNo.toUpperCase()}` : ''
    const ext = mode === 'photo' ? 'jpg' : 'webm'
    link.download = `verified-clockin${ringTag}.${ext}`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleRetake = () => {
    setCapturedPhoto(null)
    setCapturedVideo(null)
    setCapturedVideoBase64(null)
    setCapturedTime(null)
    setIsRecording(false)
    setRecordingDuration(0)
    setError('')
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
        style={{ maxWidth: '480px', borderRadius: '1rem', overflow: 'hidden' }}
      >
        {/* Header */}
        <div className="modal-header" style={{ background: 'linear-gradient(135deg, #FFC107, #FF8F00)', padding: '0.9rem 1.2rem' }}>
          <div className="modal-header-left">
            <span style={{ color: '#000', display: 'flex', alignItems: 'center' }}>
              <CameraIcon size={22} />
            </span>
            <div>
              <h2 className="modal-title" style={{ color: '#000', fontSize: '1.05rem', fontWeight: 800 }}>
                Verified Camera Clock-In
              </h2>
              <p className="modal-subtitle" style={{ color: 'rgba(0,0,0,0.65)' }}>
                Stamp time & GPS onto verification logs
              </p>
            </div>
          </div>
          <button className="modal-close-btn camera-close-btn" style={{ color: '#000', background: 'rgba(0,0,0,0.08)' }} onClick={onClose} aria-label="Close modal">✕</button>
        </div>

        {/* Modal Body */}
        <div className="modal-body" style={{ padding: '1.2rem' }}>
          
          {/* CAMERA MODE SELECTOR TABS (Only shown before capture) */}
          {!capturedPhoto && !capturedVideo && (
            <div style={{
              display: 'flex',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-default)',
              borderRadius: '0.5rem',
              padding: '2px',
              marginBottom: '0.75rem'
            }}>
              <button
                type="button"
                onClick={() => setMode('photo')}
                style={{
                  flex: 1,
                  padding: '0.4rem',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  borderRadius: '0.375rem',
                  border: 'none',
                  background: mode === 'photo' ? 'var(--brand-gold)' : 'transparent',
                  color: mode === 'photo' ? '#000' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                📷 Photo
              </button>
              <button
                type="button"
                onClick={() => setMode('video')}
                style={{
                  flex: 1,
                  padding: '0.4rem',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  borderRadius: '0.375rem',
                  border: 'none',
                  background: mode === 'video' ? 'var(--brand-gold)' : 'transparent',
                  color: mode === 'video' ? '#000' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                📹 Video (max 15s)
              </button>
            </div>
          )}

          {/* VIEWPORT AREA */}
          <div style={{
            position: 'relative',
            width: '100%',
            aspectRatio: '3/4',
            background: '#000',
            borderRadius: '0.75rem',
            overflow: 'hidden',
            marginBottom: '1rem',
            boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {/* Hidden native video element (acts as stream source) */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{ display: 'none' }}
            />

            {!capturedPhoto && !capturedVideo ? (
              <>
                {/* Live Canvas Viewport (Draws camera + overlay) */}
                <canvas
                  ref={canvasRef}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />

                {/* Rotating/Loading indicator */}
                {hasCameraAccess === null && (
                  <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                    <div className="loading-spinner" style={{ borderColor: 'var(--brand-gold) transparent' }} />
                    <span style={{ color: '#fff', fontSize: '0.75rem', opacity: 0.7 }}>Starting camera…</span>
                  </div>
                )}

                {/* Live Recording Pulsing Dot Overlay */}
                {isRecording && (
                  <div style={{
                    position: 'absolute',
                    top: '12px',
                    left: '12px',
                    backgroundColor: 'rgba(239, 68, 68, 0.85)',
                    color: '#fff',
                    padding: '0.35rem 0.65rem',
                    borderRadius: '0.5rem',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                    animation: 'fm-pulse 1s infinite'
                  }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#fff', display: 'inline-block' }}></span>
                    REC {recordingDuration.toString().padStart(2, '0')}s / 15s
                  </div>
                )}

              </>
            ) : (
              /* PREVIEW PORT */
              <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                {mode === 'photo' && capturedPhoto ? (
                  <img
                    src={capturedPhoto}
                    alt="Captured clock-in verification"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  capturedVideo && (
                    <video
                      src={capturedVideo}
                      controls
                      autoPlay
                      loop
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  )
                )}
                <button
                  type="button"
                  onClick={handleRetake}
                  style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    background: 'rgba(0,0,0,0.78)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    color: '#fff',
                    borderRadius: '0.5rem',
                    padding: '0.4rem 0.75rem',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.4)'
                  }}
                >
                  ↩ Retake
                </button>
              </div>
            )}
          </div>

          {/* VIEWPORT CONTROLS BAR (Below viewport) */}
          {!capturedPhoto && !capturedVideo && hasCameraAccess && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.6rem 1rem',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-default)',
              borderRadius: '0.75rem',
              marginBottom: '1rem',
            }}>
              {/* Switch Camera Button on the Left */}
              <div style={{ width: '40px', display: 'flex', justifyContent: 'center' }}>
                {devices.length > 1 && !isRecording && (
                  <button
                    type="button"
                    onClick={handleSwitchCamera}
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid var(--border-default)',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.15s'
                    }}
                    title="Switch Camera"
                  >
                    <RotateIcon size={16} />
                  </button>
                )}
              </div>

              {/* Capture/Record Button in the Center */}
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                {mode === 'photo' ? (
                  <button
                    type="button"
                    onClick={handleSnapPhoto}
                    style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '50%',
                      background: '#fff',
                      border: '4px solid rgba(0,0,0,0.15)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                      transition: 'all 0.15s'
                    }}
                    onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.92)'}
                    onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    title="Capture Photo"
                  >
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '2px solid #000' }} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleToggleRecording}
                    style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '50%',
                      background: isRecording ? '#ef4444' : '#fff',
                      border: '4px solid rgba(0,0,0,0.15)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                      transition: 'all 0.15s'
                    }}
                    title={isRecording ? "Stop Recording" : "Start Recording"}
                  >
                    {isRecording ? (
                      <div style={{ width: '18px', height: '18px', background: '#fff', borderRadius: '3px' }} />
                    ) : (
                      <div style={{ width: '38px', height: '38px', borderRadius: '50%', border: '2px solid #000', backgroundColor: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ width: '14px', height: '14px', borderRadius: '50%', backgroundColor: '#fff' }} />
                      </div>
                    )}
                  </button>
                )}
              </div>

              {/* Spacer on the right to balance the layout */}
              <div style={{ width: '40px' }} />
            </div>
          )}

          {/* VERIFICATION FORM PANEL */}
          {(capturedPhoto || capturedVideoBase64) && (
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-default)',
              borderRadius: '0.75rem',
              padding: '0.9rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}>
              <h3 style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--brand-gold)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                ✍️ Verify & Record Arrival
              </h3>

              {/* Event selector */}
              <div className="form-group" style={{ margin: 0 }}>
                <label htmlFor="verify-event" className="form-label" style={{ fontSize: '0.7rem' }}>
                  Select Race / Training Event
                </label>
                {flightEvents.length === 0 ? (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    No active events scheduled on the calendar.
                  </div>
                ) : (
                  <select
                    id="verify-event"
                    className="form-input"
                    value={selectedEventId}
                    onChange={(e) => setSelectedEventId(e.target.value)}
                    style={{ fontSize: '0.8rem', padding: '0.4rem 0.6rem', height: '2.2rem' }}
                  >
                    {flightEvents.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.title} ({e.date})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Bird Ring selector */}
              <div className="form-group" style={{ margin: 0 }}>
                <label htmlFor="verify-bird" className="form-label" style={{ fontSize: '0.7rem' }}>
                  Select Clocking Bird
                </label>
                {registeredBirds.length === 0 ? (
                  <div style={{ fontSize: '0.75rem', color: 'var(--brand-gold)' }}>
                    Register birds in your Loft Registry first!
                  </div>
                ) : (
                  <select
                    id="verify-bird"
                    className="form-input"
                    value={ringNo}
                    onChange={(e) => setRingNo(e.target.value)}
                    style={{ fontSize: '0.8rem', padding: '0.4rem 0.6rem', height: '2.2rem' }}
                  >
                    {registeredBirds.map((b) => (
                      <option key={b.id} value={b.ringNo}>
                        {b.ringNo} ({b.color}) {b.name ? `- ${b.name}` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                <button
                  type="button"
                  className="nav-btn nav-btn-secondary"
                  onClick={handleManualDownload}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.3rem',
                    fontSize: '0.78rem',
                    padding: '0.5rem',
                    height: '2.4rem',
                    borderColor: 'rgba(255,255,255,0.15)'
                  }}
                >
                  📥 Save file
                </button>
                
                <button
                  type="button"
                  className="nav-btn nav-btn-primary"
                  onClick={handleVerifyClockIn}
                  disabled={saving || flightEvents.length === 0 || registeredBirds.length === 0}
                  style={{
                    flex: 1.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.3rem',
                    fontSize: '0.78rem',
                    padding: '0.5rem',
                    height: '2.4rem',
                    fontWeight: 700
                  }}
                >
                  {saving ? 'Clocking…' : '✓ Verify & Clock-In'}
                </button>
              </div>
            </div>
          )}

          {/* Form error info */}
          {error && (
            <div className="form-error" style={{ marginTop: '0.75rem', textAlign: 'center' }}>
              {error}
            </div>
          )}

          {/* Success Info */}
          {success && (
            <div style={{
              marginTop: '0.75rem',
              padding: '0.6rem',
              textAlign: 'center',
              backgroundColor: 'rgba(76, 175, 80, 0.12)',
              border: '1px solid rgba(76, 175, 80, 0.3)',
              borderRadius: '0.5rem',
              color: '#4CAF50',
              fontWeight: 700,
              fontSize: '0.82rem'
            }}>
              ✓ Verified {mode === 'photo' ? 'Photo' : 'Video'} Captured & Clocked In!
            </div>
          )}

        </div>
      </div>
      
      {/* Dynamic Keyframes for Pulsing Record Button */}
      <style>{`
        @keyframes fm-pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.04); opacity: 0.85; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
