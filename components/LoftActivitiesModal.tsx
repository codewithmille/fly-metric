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
  GlobeIcon,
  MapPinIcon,
  EditIcon,
  TimerIcon,
  CameraIcon,
  VideoIcon,
  DownloadIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  LightningIcon,
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
  onJoinGroupRace?: () => void
  onCreateGroupRace?: () => void
  isPageMode?: boolean
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
  onJoinGroupRace,
  onCreateGroupRace,
  isPageMode = false,
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

  const modalContent = (
    <>
      <div
        className={isPageMode ? "w-full max-w-7xl mx-auto flex flex-col gap-4" : "modal-container"}
        ref={modalRef}
        tabIndex={-1}
        role={isPageMode ? "region" : "dialog"}
        aria-modal={isPageMode ? undefined : "true"}
        style={isPageMode ? undefined : {
          maxWidth: '640px',
          padding: 0,
          background: '#0d121d',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 28px 64px rgba(0, 0, 0, 0.75)',
        }}
      >
        {/* ── Page Mode Header / Modal Header ── */}
        {isPageMode ? (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-white/10">
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight m-0">Loft Activities</h2>
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400">
                  {events.length} Flights
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 m-0">
                Active schedule, road tosses, club races, and official clocking records
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Modern View Switcher */}
              <div className="inline-flex bg-[#080c14] border border-white/10 rounded-lg p-0.5">
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`px-2.5 py-1 rounded text-xs font-bold transition-all flex items-center gap-1.5 ${
                    viewMode === 'list' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <NotesIcon size={12} />
                  <span>List</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('calendar')}
                  className={`px-2.5 py-1 rounded text-xs font-bold transition-all flex items-center gap-1.5 ${
                    viewMode === 'calendar' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <CalendarIcon size={12} />
                  <span>Calendar</span>
                </button>
              </div>

              {onJoinGroupRace && (
                <button
                  type="button"
                  onClick={onJoinGroupRace}
                  className="cockpit-nav-btn !py-1 !px-2.5 !text-xs !text-sky-400 !border-sky-500/30"
                  title="Join a group race with code"
                >
                  <GlobeIcon size={13} />
                  <span>Join</span>
                </button>
              )}

              {onCreateGroupRace && (
                <button
                  type="button"
                  onClick={onCreateGroupRace}
                  className="cockpit-nav-btn !py-1 !px-2.5 !text-xs !text-purple-400 !border-purple-500/30"
                  title="Host a group race as admin"
                >
                  <TrophyIcon size={13} />
                  <span>Host</span>
                </button>
              )}

              <button
                type="button"
                onClick={onLogActivity}
                className="cockpit-nav-btn-primary !h-[32px] !text-xs !py-0 !px-3 !gap-1.5 shrink-0"
              >
                <PlusIcon size={13} />
                <span>Log Flight</span>
              </button>
            </div>
          </div>
        ) : (
          <div
            style={{
              position: 'relative',
              padding: '0.85rem 1.15rem',
              background: '#0e1420',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.75rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0 }}>
              <span
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '7px',
                  background: 'rgba(245, 158, 11, 0.12)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  color: '#f59e0b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {activeTab === 'activities' ? <CalendarIcon size={16} /> : <TrophyIcon size={16} />}
              </span>
              <div style={{ minWidth: 0 }}>
                <h2
                  style={{
                    color: '#ffffff',
                    fontSize: '0.95rem',
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
                    fontSize: '0.68rem',
                    margin: '0.1rem 0 0 0',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    fontFamily: 'monospace',
                  }}
                >
                  {activeTab === 'activities'
                    ? 'Flight schedule, road tosses & derbies'
                    : 'Clocked velocity results & audit archives'}
                </p>
              </div>
            </div>

            <button
              className="modal-close-btn"
              onClick={onClose}
              aria-label="Close modal"
            >
              ✕
            </button>
          </div>
        )}

        {/* ── Sub-Navigation Tabs (GitHub Underline Style in Page Mode) ── */}
        <div
          className={isPageMode ? "flex items-center gap-1 border-b border-white/10" : "flex gap-1.5 p-2 bg-[#080c14] border-b border-white/10"}
        >
          <button
            type="button"
            onClick={() => setActiveTab('activities')}
            className={isPageMode ? `cockpit-tab-item ${activeTab === 'activities' ? 'active' : ''}` : "flex-1 h-[34px] px-3 rounded-md text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all"}
            style={!isPageMode ? {
              background: activeTab === 'activities' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255, 255, 255, 0.03)',
              color: activeTab === 'activities' ? '#f59e0b' : '#94a3b8',
              border: activeTab === 'activities' ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid transparent',
            } : undefined}
          >
            <CalendarIcon size={14} />
            <span>Activities<span className="hidden sm:inline"> & Flights</span></span>
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-full bg-white/10 text-slate-300">
              {events.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('results')}
            className={isPageMode ? `cockpit-tab-item ${activeTab === 'results' ? 'active' : ''}` : "flex-1 h-[34px] px-3 rounded-md text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all"}
            style={!isPageMode ? {
              background: activeTab === 'results' ? 'rgba(14, 165, 233, 0.15)' : 'rgba(255, 255, 255, 0.03)',
              color: activeTab === 'results' ? '#38bdf8' : '#94a3b8',
              border: activeTab === 'results' ? '1px solid rgba(14, 165, 233, 0.4)' : '1px solid transparent',
            } : undefined}
          >
            <TrophyIcon size={14} />
            <span>Clocked Results</span>
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-full bg-white/10 text-slate-300">
              {completedEvents.length}
            </span>
          </button>
        </div>

        {/* ── Content Body ── */}
        <div
          className={isPageMode ? "w-full" : "modal-body modal-scroll-body"}
          style={isPageMode ? {
            padding: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
          } : {
            padding: '0.85rem 1rem',
            overflowY: 'auto',
            maxHeight: '74vh',
            paddingBottom: 'calc(7rem + env(safe-area-inset-bottom, 0px))',
          }}
        >
          {/* TAB 1: ACTIVITIES & FLIGHTS */}
          {activeTab === 'activities' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {/* Refined Sub-Toolbar: Minimalist View Switcher + Clean Action (Modal only) */}
              {!isPageMode && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.4rem',
                    padding: '0.1rem 0 0.35rem 0',
                    flexWrap: 'nowrap',
                  }}
                >
                  {/* Modern Cockpit View Switcher */}
                  <div
                    style={{
                      display: 'inline-flex',
                      background: '#080c14',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '0.45rem',
                      padding: '2px',
                      gap: '2px',
                      height: '28px',
                      alignItems: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setViewMode('list')}
                      style={{
                        height: '22px',
                        padding: '0 0.45rem',
                        borderRadius: '0.35rem',
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        border: 'none',
                        cursor: 'pointer',
                        background: viewMode === 'list' ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
                        color: viewMode === 'list' ? '#fff' : '#94a3b8',
                        transition: 'all 0.15s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.2rem',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <NotesIcon size={11} />
                      <span>List</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('calendar')}
                      style={{
                        height: '22px',
                        padding: '0 0.45rem',
                        borderRadius: '0.35rem',
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        border: 'none',
                        cursor: 'pointer',
                        background: viewMode === 'calendar' ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
                        color: viewMode === 'calendar' ? '#fff' : '#94a3b8',
                        transition: 'all 0.15s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.2rem',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <CalendarIcon size={11} />
                      <span>Calendar</span>
                    </button>
                  </div>

                  {/* Actions Group — Strictly Single Row (Never Wrap) */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      flexWrap: 'nowrap',
                      flexShrink: 0,
                    }}
                  >
                    {onJoinGroupRace && (
                      <button
                        type="button"
                        onClick={onJoinGroupRace}
                        className="cockpit-nav-btn !py-1 !px-2 !text-[11px] !text-sky-400 !border-sky-500/30"
                        title="Join a group race with code"
                      >
                        <GlobeIcon size={12} />
                        <span>Join</span>
                      </button>
                    )}

                    {onCreateGroupRace && (
                      <button
                        type="button"
                        onClick={onCreateGroupRace}
                        className="cockpit-nav-btn !py-1 !px-2 !text-[11px] !text-purple-400 !border-purple-500/30"
                        title="Host a group race as admin"
                      >
                        <TrophyIcon size={12} />
                        <span>Host</span>
                      </button>
                    )}

                    {/* Modern Action Button */}
                    <button
                      type="button"
                      onClick={onLogActivity}
                      className="cockpit-nav-btn-primary !py-1 !px-2 !text-[11px] !gap-1"
                    >
                      <PlusIcon size={12} />
                      <span>Log</span>
                    </button>
                  </div>
                </div>
              )}

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
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.5rem', color: '#64748b' }}>
                    <CalendarIcon size={32} />
                  </div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#f8fafc' }}>No Loft Activities Logged</div>
                  <p style={{ fontSize: '0.75rem', marginTop: '0.35rem', maxWidth: '300px', margin: '0.35rem auto 1.1rem auto', color: '#94a3b8' }}>
                    Create a scheduled training flight or official race event to track clock-in velocities.
                  </p>
                  <button
                    type="button"
                    onClick={onLogActivity}
                    className="cockpit-nav-btn-primary"
                    style={{
                      padding: '0.45rem 0.9rem',
                      fontSize: '0.76rem',
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {sortedDates.map((dateStr) => {
                    const dayEvents = groupedEvents[dateStr]
                    let formattedHeaderDate = dateStr
                    try {
                      const d = new Date(dateStr)
                      if (!isNaN(d.getTime())) {
                        formattedHeaderDate = d.toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      }
                    } catch (e) {}

                    return (
                      <div key={dateStr} style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        {/* Refined Minimalist Timeline Header */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.2rem 0.1rem 0.1rem',
                          }}
                        >
                          <span
                            style={{
                              fontSize: '0.68rem',
                              fontWeight: 800,
                              color: '#94a3b8',
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                              fontFamily: 'monospace',
                              whiteSpace: 'nowrap',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                            }}
                          >
                            <CalendarIcon size={12} className="text-slate-500" />
                            <span>{formattedHeaderDate}</span>
                          </span>
                          <div style={{ flex: 1, height: '1px', background: 'rgba(255, 255, 255, 0.06)' }} />
                          <span style={{ fontSize: '0.62rem', color: '#64748b', fontWeight: 700, fontFamily: 'monospace' }}>
                            {dayEvents.length} {dayEvents.length === 1 ? 'flight' : 'flights'}
                          </span>
                        </div>

                        {/* Activities Cards */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                          {dayEvents.map((ev) => {
                            const type = ev.extendedProps?.club || 'Race'
                            const location = ev.extendedProps?.location || 'No location configured'
                            const distance = ev.extendedProps?.distance
                            const releaseTime = ev.extendedProps?.releaseTime

                            return (
                              <div
                                key={ev.id}
                                onClick={() => onDateClick(ev.date || '', ev)}
                                style={{
                                  background: '#0c121e',
                                  border: '1px solid rgba(255, 255, 255, 0.07)',
                                  borderRadius: '0.55rem',
                                  padding: '0.6rem 0.8rem',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  gap: '0.75rem',
                                  transition: 'all 0.15s ease',
                                }}
                                className="hover:border-amber-400/40 hover:bg-[#0f1728]"
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0, flex: 1 }}>
                                  <span
                                    style={{
                                      width: '2.1rem',
                                      height: '2.1rem',
                                      borderRadius: '0.5rem',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      flexShrink: 0,
                                      background:
                                        type === 'Training'
                                          ? 'rgba(33, 150, 243, 0.12)'
                                          : type === 'Medication'
                                          ? 'rgba(76, 175, 80, 0.12)'
                                          : type === 'Task'
                                          ? 'rgba(156, 39, 176, 0.12)'
                                          : 'rgba(255, 193, 7, 0.12)',
                                      border:
                                        type === 'Training'
                                          ? '1px solid rgba(33, 150, 243, 0.3)'
                                          : type === 'Medication'
                                          ? '1px solid rgba(76, 175, 80, 0.3)'
                                          : type === 'Task'
                                          ? '1px solid rgba(156, 39, 176, 0.3)'
                                          : '1px solid rgba(255, 193, 7, 0.35)',
                                      color:
                                        type === 'Training'
                                          ? '#38bdf8'
                                          : type === 'Medication'
                                          ? '#4ade80'
                                          : type === 'Task'
                                          ? '#c084fc'
                                          : '#f59e0b',
                                    }}
                                  >
                                    {type === 'Training' ? (
                                      <TrainingIcon size={15} />
                                    ) : type === 'Medication' ? (
                                      <PillIcon size={15} />
                                    ) : type === 'Task' ? (
                                      <NotesIcon size={15} />
                                    ) : (
                                      <TrophyIcon size={15} />
                                    )}
                                  </span>

                                  <div style={{ minWidth: 0, flex: 1 }}>
                                    <div
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.4rem',
                                        marginBottom: '0.15rem',
                                        flexWrap: 'wrap',
                                      }}
                                    >
                                      <span
                                        style={{
                                          fontSize: '0.85rem',
                                          fontWeight: 800,
                                          color: '#f8fafc',
                                          whiteSpace: 'nowrap',
                                          overflow: 'hidden',
                                          textOverflow: 'ellipsis',
                                        }}
                                      >
                                        {ev.title}
                                      </span>
                                      <span
                                        style={{
                                          fontWeight: 800,
                                          fontSize: '0.62rem',
                                          padding: '0.05rem 0.35rem',
                                          borderRadius: '3px',
                                          background: type === 'Training' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                                          border: type === 'Training' ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid rgba(245, 158, 11, 0.3)',
                                          color: type === 'Training' ? '#38bdf8' : '#f59e0b',
                                        }}
                                      >
                                        {type}
                                      </span>
                                      {ev.extendedProps?.isGroupRace && (
                                        <span
                                          style={{
                                            fontWeight: 800,
                                            fontSize: '0.62rem',
                                            padding: '0.05rem 0.35rem',
                                            borderRadius: '3px',
                                            background: 'rgba(192, 132, 252, 0.15)',
                                            border: '1px solid rgba(192, 132, 252, 0.3)',
                                            color: '#c084fc',
                                            fontFamily: 'monospace',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '0.2rem',
                                          }}
                                        >
                                          <GlobeIcon size={10} />
                                          <span>{ev.extendedProps?.joinCode || 'Group'}</span>
                                        </span>
                                      )}
                                    </div>

                                    <div
                                      style={{
                                        fontSize: '0.68rem',
                                        color: '#94a3b8',
                                        display: 'flex',
                                        flexWrap: 'nowrap',
                                        gap: '0.35rem',
                                        alignItems: 'center',
                                        fontFamily: 'monospace',
                                        overflow: 'hidden',
                                      }}
                                    >
                                      <span
                                        style={{
                                          whiteSpace: 'nowrap',
                                          overflow: 'hidden',
                                          textOverflow: 'ellipsis',
                                          maxWidth: '140px',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '0.25rem',
                                        }}
                                      >
                                        <MapPinIcon size={11} className="text-slate-500 shrink-0" />
                                        <span>{location}</span>
                                      </span>
                                      {distance && distance > 0 ? (
                                        <>
                                          <span style={{ color: '#475569' }}>•</span>
                                          <span style={{ color: '#38bdf8', whiteSpace: 'nowrap' }}>{distance} km</span>
                                        </>
                                      ) : null}
                                      {releaseTime ? (
                                        <>
                                          <span style={{ color: '#475569' }}>•</span>
                                          <span style={{ color: '#94a3b8', whiteSpace: 'nowrap' }}>Rel {releaseTime}</span>
                                        </>
                                      ) : null}
                                    </div>
                                  </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
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
                                      padding: '0.25rem 0.55rem',
                                      color: '#cbd5e1',
                                      fontSize: '0.68rem',
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '0.3rem',
                                      transition: 'all 0.15s ease',
                                    }}
                                    title="Edit Event Details"
                                  >
                                    <EditIcon size={12} />
                                    <span>Edit</span>
                                  </button>
                                </div>
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
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.5rem', color: '#64748b' }}>
                    <TrophyIcon size={32} />
                  </div>
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
                                background: type === 'Training' ? 'rgba(33, 150, 243, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                                color: type === 'Training' ? '#38bdf8' : '#f59e0b',
                                border:
                                  type === 'Training'
                                    ? '1px solid rgba(33, 150, 243, 0.3)'
                                    : '1px solid rgba(245, 158, 11, 0.3)',
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
                              <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.15rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                <MapPinIcon size={11} className="text-slate-500" />
                                <span>{ev.extendedProps?.location || 'No location'}</span>
                                <span style={{ color: '#475569' }}>•</span>
                                <span style={{ color: '#38bdf8' }}>{distance} km</span>
                              </div>
                            </div>
                            <span style={{ fontSize: '0.75rem', color: '#94a3b8', paddingLeft: '0.5rem', display: 'flex', alignItems: 'center' }}>
                              {isExpanded ? <ChevronDownIcon size={14} /> : <ChevronRightIcon size={14} />}
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
                                background: 'rgba(245,158,11,0.06)',
                                border: '1px solid rgba(245,158,11,0.15)',
                                borderRadius: '0.45rem',
                                padding: '0.35rem 0.55rem',
                                fontSize: '0.7rem',
                              }}
                            >
                              <span style={{ color: '#f59e0b', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                <TrophyIcon size={12} />
                                <span>Winner:</span>
                              </span>
                              <strong style={{ color: '#fff', fontFamily: 'monospace' }}>{winnerRing}</strong>
                              <span style={{ color: '#f59e0b', marginLeft: 'auto', fontFamily: 'monospace', fontWeight: 800 }}>
                                {maxSpeed.toLocaleString()} m/min <span style={{ color: '#38bdf8', fontWeight: 600 }}>• {(maxSpeed * 0.06).toFixed(1)} km/h</span>
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
                                  <th style={{ padding: '0.4rem 0.25rem', color: '#94a3b8', width: '3.2rem' }}>Rank</th>
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
                                          fontSize: '0.7rem',
                                          fontFamily: 'monospace',
                                          color: idx === 0 ? '#f59e0b' : idx === 1 ? '#cbd5e1' : idx === 2 ? '#d97706' : '#64748b',
                                        }}
                                      >
                                        {idx === 0 ? '1st' : idx === 1 ? '2nd' : idx === 2 ? '3rd' : `#${idx + 1}`}
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
                                                  background: 'rgba(76, 175, 80, 0.12)',
                                                  border: '1px solid rgba(76, 175, 80, 0.25)',
                                                  borderRadius: '3px',
                                                  color: '#4ade80',
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
                                      </td>
                                      <td style={{ padding: '0.5rem 0.25rem', color: '#cbd5e1', fontFamily: 'monospace' }}>
                                        {bird.clockInTime}
                                      </td>
                                      <td
                                        style={{
                                          padding: '0.5rem 0.25rem',
                                          textAlign: 'right',
                                        }}
                                      >
                                        <div style={{ fontWeight: 800, color: '#FFC107', fontFamily: 'monospace', fontSize: '0.76rem' }}>
                                          {bird.speed.toLocaleString()} m/m
                                        </div>
                                        <div style={{ fontSize: '0.65rem', color: '#38bdf8', fontFamily: 'monospace', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                                          <LightningIcon size={10} />
                                          <span>{(bird.speed * 0.06).toFixed(1)} km/h</span>
                                        </div>
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
    </>
  )

  if (isPageMode) {
    return (
      <div className="w-full">
        {modalContent}
      </div>
    )
  }

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      {modalContent}
    </div>
  )
}
