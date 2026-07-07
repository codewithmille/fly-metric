'use client'

import { useState, useEffect, useRef } from 'react'
import type { RaceEvent } from '@/app/api/race-events/route'
import { BirdIcon, TrophyIcon, CalendarIcon, TrainingIcon } from '@/components/icons'

interface BirdRecord {
  ringNo: string
  clockInTime: string
  speed: number
}

interface ResultsHistoryModalProps {
  isOpen: boolean
  events: RaceEvent[]
  onClose: () => void
}

export default function ResultsHistoryModal({
  isOpen,
  events,
  onClose,
}: ResultsHistoryModalProps) {
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null)
  
  // Media Lightbox states
  const [selectedMedia, setSelectedMedia] = useState<{ type: 'photo' | 'video'; url: string } | null>(null)
  const [localPhotos, setLocalPhotos] = useState<Record<string, Record<string, string>>>({})
  const [localVideos, setLocalVideos] = useState<Record<string, Record<string, string>>>({})

  const modalRef = useRef<HTMLDivElement>(null)

  // Filter and sort events that have clocked birds
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
            
            // Photo check
            const photoKey = `verify_photo_${ev.id}_${ring}`
            const storedPhoto = localStorage.getItem(photoKey)
            if (storedPhoto) {
              photos[ev.id][ring] = storedPhoto
            }

            // Video check
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
      
      // Auto-expand the latest event
      if (completedEvents.length > 0) {
        setExpandedEventId(completedEvents[0].id)
      }
      
      modalRef.current?.focus()
    } else {
      setLocalPhotos({})
      setLocalVideos({})
    }
  }, [isOpen, events])

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const toggleExpandEvent = (eventId: string) => {
    setExpandedEventId(prev => prev === eventId ? null : eventId)
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
        style={{ maxWidth: '540px' }}
      >
        {/* Header */}
        <div className="modal-header" style={{ background: 'linear-gradient(135deg, #FFC107, #FF8F00)', padding: '0.9rem 1.2rem' }}>
          <div className="modal-header-left">
            <span style={{ color: '#000', display: 'flex', alignItems: 'center' }}>
              <TrophyIcon size={22} />
            </span>
            <div>
              <h2 className="modal-title" style={{ color: '#000', fontSize: '1.05rem', fontWeight: 800 }}>
                Race & Training History
              </h2>
              <p className="modal-subtitle" style={{ color: 'rgba(0,0,0,0.65)' }}>
                View completed loft results & verification logs
              </p>
            </div>
          </div>
          <button className="modal-close-btn history-close-btn" style={{ color: '#000', background: 'rgba(0,0,0,0.08)' }} onClick={onClose} aria-label="Close modal">✕</button>
        </div>

        {/* Body */}
        <div className="modal-body modal-scroll-body" style={{ padding: '1.2rem', overflowY: 'auto' }}>
          {completedEvents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-secondary)' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📭</div>
              <div style={{ fontSize: '0.88rem', fontWeight: 700 }}>No Clocked Results Found</div>
              <p style={{ fontSize: '0.75rem', marginTop: '0.25rem', maxWidth: '300px', marginLeft: 'auto', marginRight: 'auto' }}>
                Completed events will appear here once you clock-in birds via the camera or quick clock-in panel.
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
                  // Sort birds by speed descending (rank them!)
                  birds.sort((a, b) => b.speed - a.speed)
                } catch (err) {
                  birds = []
                }

                return (
                  <div
                    key={ev.id}
                    style={{
                      border: '1px solid var(--border-default)',
                      borderRadius: '0.75rem',
                      background: 'var(--bg-card)',
                      overflow: 'hidden',
                      transition: 'border-color 0.15s ease'
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
                        background: isExpanded ? 'rgba(255,255,255,0.01)' : 'transparent',
                        userSelect: 'none'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <CalendarIcon size={12} /> {ev.date}
                        </span>
                        <span style={{
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          padding: '0.15rem 0.4rem',
                          borderRadius: '4px',
                          background: type === 'Training' ? 'rgba(33, 150, 243, 0.12)' : 'rgba(255, 193, 7, 0.12)',
                          color: type === 'Training' ? '#2196F3' : 'var(--brand-gold)'
                        }}>
                          {type}
                        </span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <h3 style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                            {ev.title}
                          </h3>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
                            📍 {ev.extendedProps?.location || 'No location'} · 📏 {distance} km
                          </div>
                        </div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', paddingLeft: '0.5rem' }}>
                          {isExpanded ? '▼' : '▶'}
                        </span>
                      </div>

                      {/* Top Performance Box */}
                      {birds.length > 0 && (
                        <div style={{
                          marginTop: '0.25rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          background: 'rgba(255,193,7,0.04)',
                          border: '1px solid rgba(255,193,7,0.08)',
                          borderRadius: '0.4rem',
                          padding: '0.35rem 0.5rem',
                          fontSize: '0.7rem'
                        }}>
                          <span style={{ color: 'var(--brand-gold)' }}>🏆 Winner:</span>
                          <strong style={{ color: 'var(--text-primary)' }}>{winnerRing}</strong>
                          <span style={{ color: 'var(--text-muted)', marginLeft: 'auto' }}>
                            ⚡ {maxSpeed.toLocaleString()} m/min
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Collapsible Card Body (Birds List Table) */}
                    {isExpanded && (
                      <div style={{
                        padding: '0 1rem 1rem 1rem',
                        borderTop: '1px solid var(--border-muted)',
                        background: 'rgba(0,0,0,0.08)'
                      }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '0.5rem', fontSize: '0.72rem' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-default)', textAlign: 'left' }}>
                              <th style={{ padding: '0.4rem 0.25rem', color: 'var(--text-secondary)', width: '2rem' }}>Rank</th>
                              <th style={{ padding: '0.4rem 0.25rem', color: 'var(--text-secondary)' }}>Bird Ring No.</th>
                              <th style={{ padding: '0.4rem 0.25rem', color: 'var(--text-secondary)' }}>Arrival</th>
                              <th style={{ padding: '0.4rem 0.25rem', color: 'var(--text-secondary)', textAlign: 'right' }}>Velocity</th>
                            </tr>
                          </thead>
                          <tbody>
                            {birds.map((bird, idx) => {
                              const ring = bird.ringNo.toUpperCase()
                              const photo = localPhotos[ev.id]?.[ring]
                              const video = localVideos[ev.id]?.[ring]

                              return (
                                <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                                  <td style={{ padding: '0.5rem 0.25rem', fontWeight: 700, color: idx === 0 ? 'var(--brand-gold)' : 'var(--text-secondary)' }}>
                                    #{idx + 1}
                                  </td>
                                  <td style={{ padding: '0.5rem 0.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                      <span>{bird.ringNo}</span>
                                      
                                      {/* Media attachments */}
                                      <div style={{ display: 'flex', gap: '0.3rem' }}>
                                        {photo && (
                                          <button
                                            type="button"
                                            onClick={() => setSelectedMedia({ type: 'photo', url: photo })}
                                            style={{
                                              background: 'rgba(33, 150, 243, 0.08)',
                                              border: '1px solid rgba(33, 150, 243, 0.2)',
                                              borderRadius: '3px',
                                              color: '#2196F3',
                                              padding: '0.05rem 0.25rem',
                                              fontSize: '0.58rem',
                                              cursor: 'pointer',
                                              fontWeight: 700
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
                                              background: 'rgba(76, 175, 80, 0.08)',
                                              border: '1px solid rgba(76, 175, 80, 0.2)',
                                              borderRadius: '3px',
                                              color: '#4CAF50',
                                              padding: '0.05rem 0.25rem',
                                              fontSize: '0.58rem',
                                              cursor: 'pointer',
                                              fontWeight: 700
                                            }}
                                          >
                                            📹 Video
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                  <td style={{ padding: '0.5rem 0.25rem', color: 'var(--text-secondary)' }}>
                                    {bird.clockInTime}
                                  </td>
                                  <td style={{ padding: '0.5rem 0.25rem', fontWeight: 700, color: 'var(--brand-gold)', textAlign: 'right' }}>
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
      </div>

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
    </div>
  )
}
