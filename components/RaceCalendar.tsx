'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { BirdIcon, TrophyIcon, LightningIcon, RulerIcon, TimerIcon, NotesIcon, PillIcon } from '@/components/icons'
import type { PluginDef } from '@fullcalendar/core'
import type { RaceEvent } from '@/app/api/race-events/route'

// FullCalendar must be imported dynamically (client-only, no SSR)
const FullCalendar = dynamic(() => import('@fullcalendar/react'), { ssr: false })

interface PopoverState {
  visible: boolean
  x: number
  y: number
  event: RaceEvent | null
}

interface RaceCalendarProps {
  events: RaceEvent[]
  loading: boolean
  onDateClick: (dateStr: string, eventToEdit?: RaceEvent | null) => void
}

export default function RaceCalendar({ events, loading, onDateClick }: RaceCalendarProps) {
  const [popover, setPopover] = useState<PopoverState>({ visible: false, x: 0, y: 0, event: null })
  const [pluginsReady, setPluginsReady] = useState(false)
  const [plugins, setPlugins] = useState<PluginDef[]>([])
  const calendarRef = useRef<HTMLDivElement>(null)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load FullCalendar plugins on client only
  useEffect(() => {
    Promise.all([
      import('@fullcalendar/daygrid'),
      import('@fullcalendar/interaction'),
    ]).then(([dg, ip]) => {
      setPlugins([dg.default as unknown as PluginDef, ip.default as unknown as PluginDef])
      setPluginsReady(true)
    })
  }, [])

  const showPopover = useCallback((e: MouseEvent, event: RaceEvent) => {
    if (window.matchMedia('(pointer: coarse)').matches) return
    if (hideTimer.current) clearTimeout(hideTimer.current)
    const rect = (e.target as HTMLElement).closest('.fc-event')?.getBoundingClientRect()
    setPopover({
      visible: true,
      x: rect ? rect.left + window.scrollX : e.clientX,
      y: rect ? rect.top + window.scrollY - 10 : e.clientY,
      event,
    })
  }, [])

  const hidePopover = useCallback(() => {
    hideTimer.current = setTimeout(() => {
      setPopover((p) => ({ ...p, visible: false }))
    }, 150)
  }, [])

  const keepPopover = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current)
  }, [])

  return (
    <div className="race-calendar-wrapper" ref={calendarRef}>
      {loading && (
        <div className="calendar-loading">
          <div className="loading-spinner" />
          <span>Loading race events…</span>
        </div>
      )}

      {!loading && pluginsReady && (
        <FullCalendar
          plugins={plugins}
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,dayGridWeek',
          }}
          events={events}
          height="auto"
          eventMouseEnter={(info) => {
            const raw = events.find((e) => e.id === info.event.id)
            if (raw) showPopover(info.jsEvent as MouseEvent, raw)
          }}
          eventMouseLeave={hidePopover}
          dateClick={(info) => onDateClick(info.dateStr, null)}
          eventClick={(info) => {
            const raw = events.find((e) => e.id === info.event.id)
            onDateClick(info.event.startStr || '', raw || null)
          }}
          dayMaxEvents={3}
          eventContent={(arg) => (
            <div className="fc-event-custom">
              <span className="fc-event-dot" style={{ background: arg.event.backgroundColor }} />
              <span className="fc-event-title-custom">{arg.event.title}</span>
            </div>
          )}
        />
      )}

      {/* Hover Popover */}
      {popover.visible && popover.event && (
        <div
          className="race-popover"
          style={{ top: popover.y, left: popover.x }}
          onMouseEnter={keepPopover}
          onMouseLeave={hidePopover}
        >
          <div className="popover-header">
            <span className="popover-icon">
              {popover.event.extendedProps.club === 'Training' ? '🚴' :
               popover.event.extendedProps.club === 'Medication' ? '💊' :
               popover.event.extendedProps.club === 'Task' ? '📝' : '🏆'}
            </span>
            <span className="popover-title">{popover.event.title}</span>
          </div>
          
          <div className="popover-body">
            {/* Race Details */}
            {(!popover.event.extendedProps.club || popover.event.extendedProps.club === 'Race') && (
              <>
                <div className="popover-row">
                  <span className="popover-label">Location</span>
                  <span className="popover-value">{popover.event.extendedProps.location}</span>
                </div>
                {popover.event.extendedProps.totalBirds > 0 && (
                  <div className="popover-row">
                    <span className="popover-label">Total Birds</span>
                    <span className="popover-value highlight">{popover.event.extendedProps.totalBirds}</span>
                  </div>
                )}
                {popover.event.extendedProps.maxSpeed > 0 && (
                  <div className="popover-row">
                    <span className="popover-label">Max Speed</span>
                    <span className="popover-value highlight">
                      {popover.event.extendedProps.maxSpeed.toLocaleString()} ypm
                    </span>
                  </div>
                )}
                <div className="popover-row">
                  <span className="popover-label">Distance</span>
                  <span className="popover-value">{popover.event.extendedProps.distance} km</span>
                </div>
                {popover.event.extendedProps.winner && popover.event.extendedProps.winner !== 'TBD' && (
                  <div className="popover-row">
                    <span className="popover-label">Winner</span>
                    <span className="popover-value">{popover.event.extendedProps.winner}</span>
                  </div>
                )}
              </>
            )}

            {/* Training Details */}
            {popover.event.extendedProps.club === 'Training' && (
              <>
                {popover.event.extendedProps.maxSpeed > 0 && (
                  <div className="popover-row">
                    <span className="popover-label">Speed</span>
                    <span className="popover-value highlight">
                      {popover.event.extendedProps.maxSpeed.toLocaleString()} ypm
                    </span>
                  </div>
                )}
                <div className="popover-row">
                  <span className="popover-label">Distance</span>
                  <span className="popover-value">{popover.event.extendedProps.distance} km</span>
                </div>
                {popover.event.extendedProps.totalBirds > 0 && (
                  <div className="popover-row">
                    <span className="popover-label">Birds Tossed</span>
                    <span className="popover-value">{popover.event.extendedProps.totalBirds}</span>
                  </div>
                )}
                <div className="popover-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.2rem', marginTop: '0.25rem' }}>
                  <span className="popover-label">Notes</span>
                  <span className="popover-value" style={{ textAlign: 'left', wordBreak: 'break-word', color: 'var(--text-secondary)' }}>
                    {popover.event.extendedProps.location}
                  </span>
                </div>
              </>
            )}

            {/* Medication Details */}
            {popover.event.extendedProps.club === 'Medication' && (
              <div className="popover-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.2rem' }}>
                <span className="popover-label">Log Details</span>
                <span className="popover-value" style={{ textAlign: 'left', wordBreak: 'break-word', color: 'var(--text-primary)' }}>
                  {popover.event.extendedProps.location}
                </span>
              </div>
            )}

            {/* Task Details */}
            {popover.event.extendedProps.club === 'Task' && (
              <div className="popover-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.2rem' }}>
                <span className="popover-label">Task Description</span>
                <span className="popover-value" style={{ textAlign: 'left', wordBreak: 'break-word', color: 'var(--text-primary)' }}>
                  {popover.event.extendedProps.location}
                </span>
              </div>
            )}

            {/* Clocked Birds List */}
            {popover.event.extendedProps.birds && (() => {
              try {
                const list = JSON.parse(popover.event.extendedProps.birds)
                if (Array.isArray(list) && list.length > 0) {
                  return (
                    <div style={{ marginTop: '0.6rem', borderTop: '1px solid var(--border-default)', paddingTop: '0.4rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.25rem', color: 'var(--text-secondary)' }}>
                        <BirdIcon size={12} />
                        <span className="popover-label" style={{ fontSize: '0.72rem' }}>Clocked Birds ({list.length})</span>
                      </div>
                      <div style={{ maxHeight: '80px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        {list.map((b: any, idx: number) => (
                          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                            <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{b.ringNo}</span>
                            <span>{b.clockInTime} · <strong style={{ color: 'var(--brand-gold)' }}>{b.speed.toLocaleString()} ypm</strong></span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                }
              } catch (e) {}
              return null
            })()}
          </div>
          
          <div className="popover-footer">Click date to log new activity</div>
          <div className="popover-arrow" />
        </div>
      )}
    </div>
  )
}
