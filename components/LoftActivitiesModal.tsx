'use client'

import { useState, useEffect, useRef } from 'react'
import type { RaceEvent } from '@/app/api/race-events/route'
import RaceCalendar from '@/components/RaceCalendar'
import {
  BirdIcon,
  TrophyIcon,
  CalendarIcon,
  TrainingIcon,
  PillIcon,
  NotesIcon,
  PlusIcon,
} from '@/components/icons'

interface BirdRecord {
  ringNo: string
  clockInTime: string
  speed: number
}

interface LoftActivitiesModalProps {
  isOpen: boolean
  events: RaceEvent[]
  loading?: boolean
  initialTab?: 'activities' | 'results'
  today: string
  onClose: () => void
  onDateClick: (dateStr: string, eventToEdit?: RaceEvent | null) => void
  onLogActivity: () => void
  onEditActivity: (dateStr: string, event: RaceEvent) => void
}

export default function LoftActivitiesModal({
  isOpen,
  events,
  loading = false,
  initialTab = 'activities',
  today,
  onClose,
  onDateClick,
  onLogActivity,
  onEditActivity,
}: LoftActivitiesModalProps) {
  const [activeTab, setActiveTab] = useState<'activities' | 'results'>(initialTab)
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null)

  // Media Lightbox states for Results
  const [selectedMedia, setSelectedMedia] = useState<{ type: 'photo' | 'video'; url: string } | null>(null)
  const [localPhotos, setLocalPhotos] = useState<Record<string, Record<string, string>>>({})
  const [localVideos, setLocalVideos] = useState<Record<string, Record<string, string>>>({})

  const modalRef = useRef<HTMLDivElement>(null)

  // Sync initial tab when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab)
      modalRef.current?.focus()
    }
  }, [isOpen, initialTab])

  // Filter and sort events that have clocked birds for Results Tab
  const completedEvents = events
    .filter((e) => {
      const type = e.extendedProps?.club
      if (type !== 'Race' && type !== 'Training') return false
      try {
        const birds = JSON.parse(e.extendedProps?.birds || '[]')
        return Array.isArray(birds) && birds.length > 0
      } catch (err) {
        return false
      }
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  // Load verification media from localStorage when modal opens
  useEffect(() => {
    if (isOpen && completedEvents.length > 0) {
      const photos: Record<string, Record<string, string>> = {}
      const videos: Record<string, Record<string, string>> = {}

      completedEvents.forEach((ev) => {
        photos[ev.id] = {}
        videos[ev.id] = {}

        try {
          const birds: BirdRecord[] = JSON.parse(ev.extendedProps?.birds || '[]')
          birds.forEach((b) => {
            const ring = b.ringNo.toUpperCase()
            const photoKey = `verify_photo_${ev.id}_${ring}`
            const storedPhoto = localStorage.getItem(photoKey)
            if (storedPhoto) {
              photos[ev.id][ring] = storedPhoto
            }

            const videoKey = `verify_video_${ev.id}_${ring}`
            const storedVideo = localStorage.getItem(videoKey)
            if (storedVideo) {
              videos[ev.id][ring] = storedVideo
            }
          })
        } catch (err) {
          console.error(err)
        }
      })

      setLocalPhotos(photos)
      setLocalVideos(videos)

      // Auto-expand latest event if none expanded
      if (completedEvents.length > 0 && !expandedEventId) {
        setExpandedEventId(completedEvents[0].id)
      }
    } else {
      setLocalPhotos({})
      setLocalVideos({})
    }
  }, [isOpen, events])

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const toggleExpandEvent = (eventId: string) => {
    setExpandedEventId((prev) => (prev === eventId ? null : eventId))
  }

  if (!isOpen) return null

  // Group events by date string for the Activities list
  const groupedEvents: Record<string, RaceEvent[]> = {}
  events.forEach((ev) => {
    const dateStr = ev.date || ''
    if (!groupedEvents[dateStr]) {
      groupedEvents[dateStr] = []
    }
    groupedEvents[dateStr].push(ev)
  })
  const sortedDates = Object.keys(groupedEvents).sort((a, b) => new Date(b).getTime() - new Date(a).getTime())

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="modal-container"
        ref={modalRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        style={{
          maxWidth: '640px',
          padding: 0,
          background: '#0d121d',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 28px 64px rgba(0, 0, 0, 0.75)',
        }}
      >
        {/* ── Modern Modal Header ── */}
        <div
          style={{
            position: 'relative',
            padding: '1rem 1.25rem',
            background: 'linear-gradient(135deg, #111827 0%, #1e1b4b 60%, #0f172a 100%)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
            <span
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'rgba(255, 193, 7, 0.12)',
                border: '1px solid rgba(255, 193, 7, 0.28)',
                color: '#FFC107',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {activeTab === 'activities' ? <CalendarIcon size={20} /> : <TrophyIcon size={20} />}
            </span>
            <div style={{ minWidth: 0 }}>
              <h2
                style={{
                  color: '#fff',
                  fontSize: '1.05rem',
                  fontWeight: 800,
                  margin: 0,
                  lineHeight: 1.2,
                  letterSpacing: '-0.01em',
                }}
              >
                {activeTab === 'activities' ? 'Loft Activities & Flights' : 'Race & Training History'}
              </h2>
              <p
                style={{
                  color: '#94a3b8',
                  fontSize: '0.72rem',
                  margin: '0.15rem 0 0 0',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {activeTab === 'activities'
                  ? 'Manage scheduled flights, training calendar & events'
                  : 'View completed loft results & clock-in verification logs'}
              </p>
            </div>
          </div>

          <button
            className="modal-close-btn"
            style={{
              color: '#94a3b8',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              width: '30px',
              height: '30px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
            }}
            onClick={onClose}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* ── Segmented Main Tabs Switcher (Activities vs Clocked Results) ── */}
        <div
          style={{
            padding: '0.65rem 1.25rem',
            background: 'rgba(15, 23, 42, 0.7)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              display: 'flex',
              width: '100%',
              maxWidth: '420px',
              background: 'rgba(2, 6, 23, 0.8)',
              padding: '0.25rem',
              borderRadius: '0.75rem',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              gap: '0.35rem',
            }}
          >
            <button
              type="button"
              onClick={() => setActiveTab('activities')}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.45rem',
                padding: '0.45rem 0.6rem',
                borderRadius: '0.55rem',
                fontSize: '0.76rem',
                fontWeight: 800,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                border: 'none',
                background: activeTab === 'activities' ? '#FFC107' : 'transparent',
                color: activeTab === 'activities' ? '#000' : '#94a3b8',
                boxShadow: activeTab === 'activities' ? '0 2px 8px rgba(255, 193, 7, 0.3)' : 'none',
              }}
            >
              <CalendarIcon size={14} />
              <span>Activities & Flights</span>
              <span
                style={{
                  fontSize: '0.65rem',
                  padding: '0.08rem 0.35rem',
                  borderRadius: '9999px',
                  fontWeight: 800,
                  fontFamily: 'monospace',
                  background: activeTab === 'activities' ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.08)',
                  color: activeTab === 'activities' ? '#000' : '#cbd5e1',
                }}
              >
                {events.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('results')}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.45rem',
                padding: '0.45rem 0.6rem',
                borderRadius: '0.55rem',
                fontSize: '0.76rem',
                fontWeight: 800,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                border: 'none',
                background: activeTab === 'results' ? '#FFC107' : 'transparent',
                color: activeTab === 'results' ? '#000' : '#94a3b8',
                boxShadow: activeTab === 'results' ? '0 2px 8px rgba(255, 193, 7, 0.3)' : 'none',
              }}
            >
              <TrophyIcon size={14} />
              <span>Clocked Results</span>
              <span
                style={{
                  fontSize: '0.65rem',
                  padding: '0.08rem 0.35rem',
                  borderRadius: '9999px',
                  fontWeight: 800,
                  fontFamily: 'monospace',
                  background: activeTab === 'results' ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.08)',
                  color: activeTab === 'results' ? '#000' : '#cbd5e1',
                }}
              >
                {completedEvents.length}
              </span>
            </button>
          </div>
        </div>

        {/* ── Scrollable Body ── */}
        <div
          className="modal-body modal-scroll-body"
          style={{
            padding: '1.15rem 1.25rem',
            overflowY: 'auto',
            maxHeight: '74vh',
            paddingBottom: 'calc(6.5rem + env(safe-area-inset-bottom, 0px))',
          }}
        >
          {/* TAB 1: ACTIVITIES & FLIGHTS */}
          {activeTab === 'activities' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              {/* Secondary Sub-Toolbar: List / Calendar + Log Activity */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.6rem',
                  flexWrap: 'wrap',
                }}
              >
                {/* List / Calendar Switcher */}
                <div
                  style={{
                    display: 'flex',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '0.5rem',
                    padding: '0.2rem',
                    gap: '0.25rem',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    style={{
                      padding: '0.28rem 0.75rem',
                      borderRadius: '0.35rem',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      border: 'none',
                      cursor: 'pointer',
                      background: viewMode === 'list' ? 'rgba(255, 193, 7, 0.18)' : 'transparent',
                      color: viewMode === 'list' ? '#FFC107' : '#94a3b8',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    📝 List View
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('calendar')}
                    style={{
                      padding: '0.28rem 0.75rem',
                      borderRadius: '0.35rem',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      border: 'none',
                      cursor: 'pointer',
                      background: viewMode === 'calendar' ? 'rgba(255, 193, 7, 0.18)' : 'transparent',
                      color: viewMode === 'calendar' ? '#FFC107' : '#94a3b8',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    📅 Calendar View
                  </button>
                </div>

                {/* + Log Activity Button */}
                <button
                  type="button"
                  onClick={onLogActivity}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.38rem 0.85rem',
                    background: 'rgba(255, 193, 7, 0.12)',
                    border: '1px solid rgba(255, 193, 7, 0.35)',
                    borderRadius: '0.5rem',
                    color: '#FFC107',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <PlusIcon size={13} />
                  <span>Log Activity</span>
                </button>
              </div>

              {/* View Content */}
              {loading ? (
                <div
                  style={{
                    padding: '3rem 1.5rem',
                    textAlign: 'center',
                    color: '#94a3b8',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.75rem',
                  }}
                >
                  <img
                    src="/icon.png"
                    alt="Loading"
                    style={{ width: '52px', height: '52px', objectFit: 'contain', animation: 'pulse 1.5s ease-in-out infinite' }}
                  />
                  <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Loading loft activities…</span>
                </div>
              ) : viewMode === 'calendar' ? (
                <div style={{ background: 'rgba(15, 23, 42, 0.4)', borderRadius: '1rem', padding: '0.5rem', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <RaceCalendar events={events} loading={loading} onDateClick={onDateClick} />
                </div>
              ) : events.length === 0 ? (
                <div
                  style={{
                    padding: '3rem 1.5rem',
                    textAlign: 'center',
                    color: '#94a3b8',
                    background: 'rgba(255,255,255,0.02)',
                    borderRadius: '1rem',
                    border: '1px dashed rgba(255,255,255,0.1)',
                  }}
                >
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📅</div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#f8fafc' }}>No Loft Activities Logged</div>
                  <p style={{ fontSize: '0.75rem', marginTop: '0.35rem', maxWidth: '300px', margin: '0.35rem auto 1.1rem auto', color: '#94a3b8' }}>
                    Create a scheduled training flight or official race event to track clock-in velocities.
                  </p>
                  <button
                    type="button"
                    onClick={onLogActivity}
                    style={{
                      padding: '0.5rem 1rem',
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      background: '#FFC107',
                      color: '#000',
                      borderRadius: '0.5rem',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                    }}
                  >
                    <PlusIcon size={13} /> Log First Activity
                  </button>
                </div>
              ) : (
                /* Grouped list of activities */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                  {sortedDates.map((dateStr) => {
                    const dayEvents = groupedEvents[dateStr]
                    const dateObj = new Date(dateStr)
                    const formattedHeaderDate = dateObj.toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })

                    return (
                      <div key={dateStr} style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                        {/* Section Date Header */}
                        <div
                          style={{
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            color: '#FFC107',
                            textTransform: 'uppercase',
                            letterSpacing: '0.06em',
                            padding: '0.35rem 0.5rem',
                            borderLeft: '2px solid #FFC107',
                            background: 'rgba(255, 193, 7, 0.03)',
                            borderRadius: '0 4px 4px 0',
                          }}
                        >
                          {formattedHeaderDate}
                        </div>

                        {/* Activities Cards */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {dayEvents.map((ev) => {
                            const type = ev.extendedProps?.club || 'Race'
                            const location = ev.extendedProps?.location || 'No location configured'
                            const distance = ev.extendedProps?.distance

                            return (
                              <div
                                key={ev.id}
                                onClick={() => onDateClick(ev.date || '', ev)}
                                style={{
                                  background: 'rgba(15, 23, 42, 0.6)',
                                  border: '1px solid rgba(255, 255, 255, 0.08)',
                                  borderRadius: '0.75rem',
                                  padding: '0.75rem 0.95rem',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  gap: '0.85rem',
                                  transition: 'all 0.15s ease',
                                }}
                                className="hover:border-amber-400/40"
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', minWidth: 0, flex: 1 }}>
                                  <span
                                    style={{
                                      width: '2.2rem',
                                      height: '2.2rem',
                                      borderRadius: '0.5rem',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      flexShrink: 0,
                                      background:
                                        type === 'Training'
                                          ? 'rgba(33, 150, 243, 0.1)'
                                          : type === 'Medication'
                                          ? 'rgba(76, 175, 80, 0.1)'
                                          : type === 'Task'
                                          ? 'rgba(156, 39, 176, 0.1)'
                                          : 'rgba(255, 193, 7, 0.1)',
                                      border:
                                        type === 'Training'
                                          ? '1px solid rgba(33, 150, 243, 0.25)'
                                          : type === 'Medication'
                                          ? '1px solid rgba(76, 175, 80, 0.25)'
                                          : type === 'Task'
                                          ? '1px solid rgba(156, 39, 176, 0.25)'
                                          : '1px solid rgba(255, 193, 7, 0.25)',
                                      color:
                                        type === 'Training'
                                          ? '#38bdf8'
                                          : type === 'Medication'
                                          ? '#4ade80'
                                          : type === 'Task'
                                          ? '#c084fc'
                                          : '#FFC107',
                                    }}
                                  >
                                    {type === 'Training' ? (
                                      <TrainingIcon size={16} />
                                    ) : type === 'Medication' ? (
                                      <PillIcon size={16} />
                                    ) : type === 'Task' ? (
                                      <NotesIcon size={16} />
                                    ) : (
                                      <TrophyIcon size={16} />
                                    )}
                                  </span>

                                  <div style={{ minWidth: 0 }}>
                                    <div
                                      style={{
                                        fontSize: '0.85rem',
                                        fontWeight: 800,
                                        color: '#f8fafc',
                                        marginBottom: '0.15rem',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                      }}
                                    >
                                      {ev.title}
                                    </div>
                                    <div
                                      style={{
                                        fontSize: '0.7rem',
                                        color: '#94a3b8',
                                        display: 'flex',
                                        flexWrap: 'wrap',
                                        gap: '0.35rem 0.5rem',
                                        alignItems: 'center',
                                      }}
                                    >
                                      <span style={{ fontWeight: 700, color: '#FFC107' }}>{type}</span>
                                      <span>•</span>
                                      <span
                                        style={{
                                          whiteSpace: 'nowrap',
                                          overflow: 'hidden',
                                          textOverflow: 'ellipsis',
                                          maxWidth: '180px',
                                        }}
                                      >
                                        📍 {location}
                                      </span>
                                      {distance && distance > 0 && (
                                        <>
                                          <span>•</span>
                                          <span style={{ fontFamily: 'monospace' }}>📏 {distance} km</span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    onEditActivity(ev.date || '', ev)
                                  }}
                                  style={{
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    borderRadius: '0.4rem',
                                    padding: '0.35rem 0.55rem',
                                    color: '#cbd5e1',
                                    fontSize: '0.7rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.25rem',
                                    flexShrink: 0,
                                  }}
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
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CLOCKED RESULTS */}
          {activeTab === 'results' && (
            <div>
              {completedEvents.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#94a3b8' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📭</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#f8fafc' }}>No Clocked Results Found</div>
                  <p style={{ fontSize: '0.75rem', marginTop: '0.25rem', maxWidth: '300px', margin: '0.25rem auto', color: '#94a3b8' }}>
                    Completed events will appear here once you clock-in birds via the RFID reader, camera, or quick clock-in panel.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {completedEvents.map((ev) => {
                    const isExpanded = expandedEventId === ev.id
                    const type = ev.extendedProps?.club || 'Race'
                    const distance = ev.extendedProps?.distance || 0
                    const winnerRing = ev.extendedProps?.winner || 'N/A'
                    const maxSpeed = ev.extendedProps?.maxSpeed || 0

                    let birds: BirdRecord[] = []
                    try {
                      birds = JSON.parse(ev.extendedProps?.birds || '[]')
                      birds.sort((a, b) => b.speed - a.speed)
                    } catch (err) {
                      birds = []
                    }

                    return (
                      <div
                        key={ev.id}
                        style={{
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: '0.75rem',
                          background: 'rgba(15, 23, 42, 0.65)',
                          overflow: 'hidden',
                          transition: 'border-color 0.15s ease',
                        }}
                      >
                        {/* Collapsible Card Header */}
                        <div
                          onClick={() => toggleExpandEvent(ev.id)}
                          style={{
                            padding: '0.75rem 1rem',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.4rem',
                            background: isExpanded ? 'rgba(255,255,255,0.02)' : 'transparent',
                            userSelect: 'none',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span
                              style={{
                                fontSize: '0.68rem',
                                color: '#94a3b8',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                              }}
                            >
                              <CalendarIcon size={12} /> {ev.date}
                            </span>
                            <span
                              style={{
                                fontSize: '0.68rem',
                                fontWeight: 800,
                                padding: '0.15rem 0.45rem',
                                borderRadius: '4px',
                                background: type === 'Training' ? 'rgba(33, 150, 243, 0.15)' : 'rgba(255, 193, 7, 0.15)',
                                color: type === 'Training' ? '#38bdf8' : '#FFC107',
                                border:
                                  type === 'Training'
                                    ? '1px solid rgba(33, 150, 243, 0.3)'
                                    : '1px solid rgba(255, 193, 7, 0.3)',
                              }}
                            >
                              {type}
                            </span>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                              <h3 style={{ fontSize: '0.92rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
                                {ev.title}
                              </h3>
                              <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.1rem' }}>
                                📍 {ev.extendedProps?.location || 'No location'} · 📏 {distance} km
                              </div>
                            </div>
                            <span style={{ fontSize: '0.75rem', color: '#94a3b8', paddingLeft: '0.5rem' }}>
                              {isExpanded ? '▼' : '▶'}
                            </span>
                          </div>

                          {/* Top Performance Box */}
                          {birds.length > 0 && (
                            <div
                              style={{
                                marginTop: '0.25rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.4rem',
                                background: 'rgba(255,193,7,0.06)',
                                border: '1px solid rgba(255,193,7,0.12)',
                                borderRadius: '0.4rem',
                                padding: '0.35rem 0.55rem',
                                fontSize: '0.7rem',
                              }}
                            >
                              <span style={{ color: '#FFC107', fontWeight: 700 }}>🏆 Winner:</span>
                              <strong style={{ color: '#fff', fontFamily: 'monospace' }}>{winnerRing}</strong>
                              <span style={{ color: '#94a3b8', marginLeft: 'auto', fontFamily: 'monospace' }}>
                                ⚡ {maxSpeed.toLocaleString()} m/min
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Collapsible Card Body (Birds List Table) */}
                        {isExpanded && (
                          <div
                            style={{
                              padding: '0 1rem 1rem 1rem',
                              borderTop: '1px solid rgba(255,255,255,0.06)',
                              background: 'rgba(0,0,0,0.15)',
                            }}
                          >
                            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '0.5rem', fontSize: '0.72rem' }}>
                              <thead>
                                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', textAlign: 'left' }}>
                                  <th style={{ padding: '0.4rem 0.25rem', color: '#94a3b8', width: '2rem' }}>Rank</th>
                                  <th style={{ padding: '0.4rem 0.25rem', color: '#94a3b8' }}>Bird Ring No.</th>
                                  <th style={{ padding: '0.4rem 0.25rem', color: '#94a3b8' }}>Arrival</th>
                                  <th style={{ padding: '0.4rem 0.25rem', color: '#94a3b8', textAlign: 'right' }}>Velocity</th>
                                </tr>
                              </thead>
                              <tbody>
                                {birds.map((bird, idx) => {
                                  const ring = bird.ringNo.toUpperCase()
                                  const photo = localPhotos[ev.id]?.[ring]
                                  const video = localVideos[ev.id]?.[ring]

                                  return (
                                    <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                      <td
                                        style={{
                                          padding: '0.5rem 0.25rem',
                                          fontWeight: 800,
                                          color: idx === 0 ? '#FFC107' : '#94a3b8',
                                        }}
                                      >
                                        #{idx + 1}
                                      </td>
                                      <td style={{ padding: '0.5rem 0.25rem', fontWeight: 700, color: '#f8fafc' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                          <span style={{ fontFamily: 'monospace' }}>{bird.ringNo}</span>
                                          {/* Media attachments */}
                                          <div style={{ display: 'flex', gap: '0.3rem' }}>
                                            {photo && (
                                              <button
                                                type="button"
                                                onClick={() => setSelectedMedia({ type: 'photo', url: photo })}
                                                style={{
                                                  background: 'rgba(33, 150, 243, 0.12)',
                                                  border: '1px solid rgba(33, 150, 243, 0.25)',
                                                  borderRadius: '3px',
                                                  color: '#38bdf8',
                                                  padding: '0.05rem 0.3rem',
                                                  fontSize: '0.58rem',
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
                                                  background: 'rgba(76, 175, 80, 0.12)',
                                                  border: '1px solid rgba(76, 175, 80, 0.25)',
                                                  borderRadius: '3px',
                                                  color: '#4ade80',
                                                  padding: '0.05rem 0.3rem',
                                                  fontSize: '0.58rem',
                                                  cursor: 'pointer',
                                                  fontWeight: 700,
                                                }}
                                              >
                                                📹 Video
                                              </button>
                                            )}
                                          </div>
                                        </div>
                                      </td>
                                      <td style={{ padding: '0.5rem 0.25rem', color: '#cbd5e1', fontFamily: 'monospace' }}>
                                        {bird.clockInTime}
                                      </td>
                                      <td
                                        style={{
                                          padding: '0.5rem 0.25rem',
                                          fontWeight: 800,
                                          color: '#FFC107',
                                          textAlign: 'right',
                                          fontFamily: 'monospace',
                                        }}
                                      >
                                        {bird.speed.toLocaleString()} m/min
                                      </td>
                                    </tr>
                                  )
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Lightbox for verification media */}
      {selectedMedia && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10500,
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            cursor: 'zoom-out',
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
              gap: '1rem',
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
                  boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
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
                  boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
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
