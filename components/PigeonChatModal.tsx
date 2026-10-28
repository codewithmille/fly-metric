'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import type { RaceEvent } from '@/app/api/race-events/route'

interface Message {
  role: 'user' | 'model'
  text: string
  timestamp: Date
  isTyping?: boolean   // true while typewriter is animating
}

export interface LoftBirdInfo {
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

interface PigeonChatModalProps {
  isOpen: boolean
  onClose: () => void
  registeredBirds?: LoftBirdInfo[]
  events?: RaceEvent[]
  loftName?: string
}

const QUICK_QUESTIONS = [
  '🏆 What is my best performing pigeon?',
  '📊 Summarize my loft birds & race stats',
  '🏁 What do I feed pigeons after a race?',
  '💊 What supplements on Wednesday?',
  '⚡ How to build stamina for 300km+?',
  '🦠 Signs of Canker & respiratory disease?',
]

function buildLoftContext(
  birds: LoftBirdInfo[] = [],
  events: RaceEvent[] = [],
  loftName?: string
): string {
  const lines: string[] = []
  lines.push(`Loft Name: ${loftName || 'My Loft'}`)
  lines.push(`Total Registered Birds: ${birds.length}`)
  lines.push(`Total Logged Activities/Events: ${events.length}`)

  // Aggregate per-bird race/training performance across all events
  const perfMap = new Map<
    string,
    {
      ringNo: string
      flights: number
      races: number
      trainings: number
      maxSpeed: number
      totalSpeed: number
      bestEvent: string
      history: string[]
    }
  >()

  for (const ev of events) {
    const type = ev.extendedProps?.club || 'Race'
    if (type !== 'Race' && type !== 'Training') continue
    const dist = ev.extendedProps?.distance || 0
    try {
      const clocked: Array<{ ringNo: string; clockInTime?: string; speed?: number }> = JSON.parse(
        ev.extendedProps?.birds || '[]'
      )
      if (!Array.isArray(clocked)) continue
      for (const rec of clocked) {
        if (!rec.ringNo) continue
        const key = rec.ringNo.trim().toUpperCase()
        const spd = Number(rec.speed) || 0
        const existing = perfMap.get(key) || {
          ringNo: rec.ringNo,
          flights: 0,
          races: 0,
          trainings: 0,
          maxSpeed: 0,
          totalSpeed: 0,
          bestEvent: '',
          history: [],
        }
        existing.flights += 1
        if (type === 'Race') existing.races += 1
        if (type === 'Training') existing.trainings += 1
        if (spd > 0) {
          existing.totalSpeed += spd
          if (spd > existing.maxSpeed) {
            existing.maxSpeed = spd
            existing.bestEvent = `${ev.title} (${ev.date}${dist ? `, ${dist}km` : ''})`
          }
        }
        existing.history.push(
          `${ev.date} [${type}] ${ev.title}: ${spd > 0 ? `${spd.toFixed(2)} m/min` : 'clocked'}`
        )
        perfMap.set(key, existing)
      }
    } catch {
      // ignore malformed JSON
    }
  }

  // Sort performers by maxSpeed descending, then flights descending
  const rankedPerformers = Array.from(perfMap.values()).sort(
    (a, b) => b.maxSpeed - a.maxSpeed || b.flights - a.flights
  )

  if (rankedPerformers.length > 0) {
    lines.push('\n--- TOP PERFORMING PIGEONS (RANKED BY VELOCITY m/min) ---')
    rankedPerformers.slice(0, 25).forEach((p, idx) => {
      const reg = birds.find((b) => b.ringNo.trim().toUpperCase() === p.ringNo.trim().toUpperCase())
      const avgSpeed = p.flights > 0 ? (p.totalSpeed / p.flights).toFixed(2) : '0'
      const details = reg
        ? `Name: ${reg.name || 'Unnamed'} | Color: ${reg.color} | Gender: ${reg.gender || 'N/A'} | Strain: ${reg.strain || 'N/A'} | Sire: ${reg.sire || 'N/A'} | Dam: ${reg.dam || 'N/A'} | Status: ${reg.status || 'Active'}`
        : 'Not in registry'
      lines.push(
        `#${idx + 1} Ring: ${p.ringNo} | Max Speed: ${p.maxSpeed.toFixed(2)} m/min | Avg Speed: ${avgSpeed} m/min | Flights: ${p.flights} (${p.races} Races, ${p.trainings} Tosses) | Best Flight: ${p.bestEvent || 'N/A'} | ${details}`
      )
      if (p.history.length > 0) {
        lines.push(`   Flight Logs: ${p.history.slice(0, 5).join(' ; ')}`)
      }
    })
  } else {
    lines.push('\n--- TOP PERFORMING PIGEONS ---')
    lines.push('No clocked race or training velocities recorded yet.')
  }

  if (birds.length > 0) {
    lines.push('\n--- REGISTERED LOFT BIRDS LEDGER ---')
    birds.slice(0, 50).forEach((b) => {
      lines.push(
        `- Ring: ${b.ringNo} | Name: ${b.name || 'None'} | Color: ${b.color} | Gender: ${b.gender || 'Unknown'} | Strain: ${b.strain || 'N/A'} | Sire: ${b.sire || 'N/A'} | Dam: ${b.dam || 'N/A'} | Status: ${b.status || 'Active'}${b.notes ? ` | Notes: ${b.notes}` : ''}`
      )
    })
  }

  if (events.length > 0) {
    lines.push('\n--- RECENT LOFT EVENTS (RACES, TRAININGS, MEDICATIONS, TASKS) ---')
    const sortedEvents = [...events]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 20)
    sortedEvents.forEach((ev) => {
      const type = ev.extendedProps?.club || 'Race'
      const loc = ev.extendedProps?.location || ''
      const dist = ev.extendedProps?.distance ? `${ev.extendedProps.distance}km` : ''
      const maxSpd = ev.extendedProps?.maxSpeed ? `Max Speed: ${ev.extendedProps.maxSpeed} m/min` : ''
      const win = ev.extendedProps?.winner ? `Details/Winner: ${ev.extendedProps.winner}` : ''
      lines.push(
        `- ${ev.date} [${type}] "${ev.title}" ${loc ? `@ ${loc}` : ''} ${dist} ${maxSpd} ${win}`.trim()
      )
    })
  }

  return lines.join('\n')
}

function formatText(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^#{1,3}\s+(.+)$/gm, '<strong style="font-size:0.9rem;color:var(--text-primary)">$1</strong>')
    .replace(/^[-•]\s+(.+)$/gm, '<li style="margin:0.15rem 0;padding-left:0.2rem">$1</li>')
    .replace(/(<li.*<\/li>(\n|$))+/g, (match) => `<ul style="padding-left:1rem;margin:0.3rem 0">${match}</ul>`)
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>')
}

// Typewriter hook: animates displayText char-by-char
function useTypewriter(fullText: string, active: boolean, onDone: () => void) {
  const [displayText, setDisplayText] = useState('')
  const indexRef = useRef(0)
  const rafRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!active) {
      setDisplayText(fullText)
      return
    }
    setDisplayText('')
    indexRef.current = 0

    const tick = () => {
      indexRef.current += 1
      setDisplayText(fullText.slice(0, indexRef.current))
      if (indexRef.current < fullText.length) {
        rafRef.current = setTimeout(tick, 12) // ~12ms per char ≈ smooth
      } else {
        onDone()
      }
    }
    rafRef.current = setTimeout(tick, 12)
    return () => { if (rafRef.current) clearTimeout(rafRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullText, active])

  return displayText
}

// Single message bubble with optional typewriter
function MessageBubble({
  msg,
  isLastModel,
  onTypingDone,
}: {
  msg: Message
  isLastModel: boolean
  onTypingDone: () => void
}) {
  const shouldType = msg.role === 'model' && isLastModel && msg.isTyping === true
  const displayText = useTypewriter(msg.text, shouldType, onTypingDone)
  const text = shouldType ? displayText : msg.text

  return (
    <div style={{
      display: 'flex',
      flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
      gap: '0.5rem',
      alignItems: 'flex-end',
    }}>
      {/* Avatar */}
      <div style={{
        width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '0.85rem',
        background: msg.role === 'user'
          ? 'linear-gradient(135deg, #3b82f6, #1d4ed8)'
          : 'rgba(16, 185, 129, 0.14)',
        border: msg.role === 'model' ? '1px solid rgba(16,185,129,0.35)' : 'none',
        boxShadow: msg.role === 'model' ? '0 0 8px rgba(16,185,129,0.25)' : 'none',
      }}>
        {msg.role === 'user' ? '👤' : <img src="/icon.png" alt="AI" style={{ width: '20px', height: '20px', objectFit: 'contain' }} />}
      </div>

      {/* Bubble */}
      <div style={{
        maxWidth: '78%',
        background: msg.role === 'user'
          ? 'linear-gradient(135deg, #1d4ed8, #1e40af)'
          : 'rgba(255,255,255,0.04)',
        border: msg.role === 'user'
          ? 'none'
          : '1px solid rgba(255,255,255,0.07)',
        borderRadius: msg.role === 'user'
          ? '1rem 1rem 0.2rem 1rem'
          : '1rem 1rem 1rem 0.2rem',
        padding: '0.6rem 0.8rem',
      }}>
        <div
          style={{ fontSize: '0.8rem', color: 'var(--text-primary)', lineHeight: 1.5 }}
          dangerouslySetInnerHTML={{ __html: formatText(text) }}
        />
        {/* Blinking cursor while typing */}
        {shouldType && text.length < msg.text.length && (
          <span style={{
            display: 'inline-block', width: '2px', height: '0.85em',
            background: '#10b981', marginLeft: '2px', verticalAlign: 'text-bottom',
            animation: 'cursorBlink 0.7s step-end infinite',
          }} />
        )}
        <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', marginTop: '0.25rem', textAlign: msg.role === 'user' ? 'right' : 'left' }}>
          {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  )
}

export default function PigeonChatModal({
  isOpen,
  onClose,
  registeredBirds = [],
  events = [],
  loftName,
}: PigeonChatModalProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputText, setInputText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [hasStarted, setHasStarted] = useState(false)
  const [viewportHeight, setViewportHeight] = useState<number | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)
  const inputAreaRef = useRef<HTMLDivElement>(null)

  // Memoize the compiled loft database summary
  const loftContext = useMemo(
    () => buildLoftContext(registeredBirds, events, loftName),
    [registeredBirds, events, loftName]
  )

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // ── Visual Viewport (keyboard detection on mobile) ─────────────
  useEffect(() => {
    if (!isOpen) return

    const vv = window.visualViewport
    if (!vv) return

    const update = () => {
      setViewportHeight(vv.height)
      // Scroll input into view whenever keyboard resizes viewport
      setTimeout(() => {
        inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }, 50)
    }

    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    update()

    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
    }
  }, [isOpen])

  // Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  // Auto-focus input on open
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  if (!isOpen) return null

  const markTypingDone = (idx: number) => {
    setMessages(prev => prev.map((m, i) =>
      i === idx ? { ...m, isTyping: false } : m
    ))
  }

  const sendMessage = async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || isLoading) return

    setHasStarted(true)
    setInputText('')

    const userMsg: Message = { role: 'user', text: trimmed, timestamp: new Date() }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setIsLoading(true)

    try {
      const res = await fetch('/api/pigeon-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, text: m.text })),
          loftContext,
        })
      })

      const data = await res.json()

      // Rate limit — show as friendly AI message with typewriter
      if (res.status === 429 || data.error === 'rate_limited') {
        const retryAfter = data.retryAfter ?? 60
        setMessages(prev => [...prev, {
          role: 'model',
          text: `⏳ **FlyMetric AI is temporarily busy.**\n\nThe AI quota has been reached for this minute. Please wait **${retryAfter} seconds** and send your question again — I'll be ready!\n\n_Tip: This is a free-tier limit. It resets automatically._`,
          timestamp: new Date(),
          isTyping: true,
        }])
        return
      }

      setMessages(prev => [...prev, {
        role: 'model',
        text: data.text || 'Sorry, I could not respond. Please try again.',
        timestamp: new Date(),
        isTyping: true,   // trigger typewriter
      }])
    } catch {
      setMessages(prev => [...prev, {
        role: 'model',
        text: '⚠️ Connection error. Please check your internet and try again.',
        timestamp: new Date(),
        isTyping: true,
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(inputText)
    }
  }

  // Scroll input into view on focus (keyboard on mobile)
  const handleInputFocus = () => {
    setTimeout(() => {
      inputAreaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }, 300)
  }

  const clearChat = () => {
    setMessages([])
    setHasStarted(false)
    setInputText('')
  }

  const lastModelIdx = messages.map((m, i) => m.role === 'model' ? i : -1).filter(i => i >= 0).pop() ?? -1

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      style={{ zIndex: 9000, alignItems: 'flex-end', padding: 0, paddingBottom: '4.4rem' }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label="FlyMetric AI Pigeon Assistant"
        style={{
          width: '100%',
          maxWidth: '520px',
          margin: '0 auto',
          height: viewportHeight ? `${viewportHeight - 70}px` : 'calc(92dvh - 4.4rem)',
          maxHeight: viewportHeight ? `${viewportHeight - 70}px` : 'calc(92dvh - 4.4rem)',
          display: 'flex',
          flexDirection: 'column',
          background: '#0d1117',
          borderRadius: 0,
          border: '1px solid rgba(255,255,255,0.07)',
          borderBottom: 'none',
          animation: 'slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.5)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #1a6b3a 0%, #0d3d20 50%, #061f10 100%)',
          padding: '1rem 1.25rem 0.9rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', top: '-30px', left: '50%', transform: 'translateX(-50%)',
            width: '200px', height: '80px',
            background: 'radial-gradient(ellipse, rgba(16,185,129,0.25) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', zIndex: 1 }}>
            <div style={{
              width: '42px', height: '42px', borderRadius: '50%',
              background: 'rgba(13, 17, 23, 0.75)',
              border: '1.5px solid rgba(16, 185, 129, 0.45)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 16px rgba(16,185,129,0.35)',
              flexShrink: 0,
            }}>
              <img src="/icon.png" alt="FlyMetric AI" style={{ width: '30px', height: '30px', objectFit: 'contain' }} />
            </div>
            <div>
              <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#fff', lineHeight: 1.1 }}>
                FlyMetric AI
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.1rem' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', animation: 'pulse 2s infinite' }} />
                <span style={{ fontSize: '0.68rem', color: '#10b981', fontWeight: 600 }}>
                  {isLoading ? 'Analyzing loft data…' : `Connected to Loft (${registeredBirds.length} birds)`}
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.4rem', zIndex: 1 }}>
            {messages.length > 0 && (
              <button
                onClick={clearChat}
                title="Clear chat"
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'var(--text-secondary)',
                  borderRadius: '0.4rem',
                  padding: '0.35rem 0.5rem',
                  cursor: 'pointer',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                }}
              >
                🗑️ Clear
              </button>
            )}
          </div>
        </div>

        {/* Messages area */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(16,185,129,0.3) transparent',
        }}>
          {/* Welcome screen */}
          {!hasStarted && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', paddingTop: '1.5rem' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.6rem' }}>
                  <img
                    src="/icon.png"
                    alt="FlyMetric AI"
                    style={{
                      width: '78px',
                      height: '78px',
                      objectFit: 'contain',
                      filter: 'drop-shadow(0 0 16px rgba(16,185,129,0.45))',
                    }}
                  />
                </div>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 0.35rem' }}>
                  FlyMetric AI Assistant
                </h2>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5, maxWidth: '300px', margin: '0 auto' }}>
                  Connected to your live loft database. Ask about your fastest pigeons, bloodlines, race speeds, feeding, or health.
                </p>
              </div>

              <div style={{ width: '100%' }}>
                <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '0.5rem', textAlign: 'center' }}>
                  Quick Questions
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
                  {QUICK_QUESTIONS.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => sendMessage(q.replace(/^[^\s]+\s/, ''))}
                      style={{
                        background: i < 2 ? 'rgba(16,185,129,0.06)' : 'rgba(255,255,255,0.02)',
                        border: i < 2 ? '1px solid rgba(16,185,129,0.22)' : '1px solid rgba(255,255,255,0.07)',
                        borderRadius: '0.5rem',
                        padding: '0.5rem 0.6rem',
                        textAlign: 'left',
                        cursor: 'pointer',
                        color: i < 2 ? '#e6edf3' : 'var(--text-secondary)',
                        fontSize: '0.72rem',
                        lineHeight: 1.3,
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLButtonElement).style.background = 'rgba(16,185,129,0.12)'
                        ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(16,185,129,0.35)'
                        ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)'
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLButtonElement).style.background = i < 2 ? 'rgba(16,185,129,0.06)' : 'rgba(255,255,255,0.02)'
                        ;(e.currentTarget as HTMLButtonElement).style.borderColor = i < 2 ? 'rgba(16,185,129,0.22)' : 'rgba(255,255,255,0.07)'
                        ;(e.currentTarget as HTMLButtonElement).style.color = i < 2 ? '#e6edf3' : 'var(--text-secondary)'
                      }}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Chat messages with typewriter */}
          {messages.map((msg, idx) => (
            <MessageBubble
              key={idx}
              msg={msg}
              isLastModel={idx === lastModelIdx}
              onTypingDone={() => markTypingDone(idx)}
            />
          ))}

          {/* Typing indicator (while waiting for API) */}
          {isLoading && (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
              <div style={{
                width: '28px', height: '28px', borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.14)',
                border: '1px solid rgba(16, 185, 129, 0.35)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 8px rgba(16,185,129,0.25)',
                flexShrink: 0,
              }}>
                <img src="/icon.png" alt="AI" style={{ width: '20px', height: '20px', objectFit: 'contain' }} />
              </div>
              <div style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '1rem 1rem 1rem 0.2rem',
                padding: '0.65rem 0.9rem',
                display: 'flex', gap: '4px', alignItems: 'center',
              }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    width: '6px', height: '6px', borderRadius: '50%',
                    background: '#10b981',
                    animation: `typingBounce 1.2s ease-in-out ${i * 0.2}s infinite`,
                  }} />
                ))}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input area — stays above keyboard */}
        <div
          ref={inputAreaRef}
          style={{
            padding: '0.75rem 1rem 0.85rem',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            background: '#0d1117',
            flexShrink: 0,
          }}
        >
          <div style={{
            display: 'flex',
            gap: '0.5rem',
            alignItems: 'flex-end',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '0.875rem',
            padding: '0.5rem 0.5rem 0.5rem 0.88rem',
            transition: 'border-color 0.15s ease',
          }}>
            <textarea
              ref={inputRef}
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={handleInputFocus}
              placeholder="Ask about your pigeons, best racer, feeding, health…"
              disabled={isLoading}
              rows={1}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--text-primary)',
                fontSize: '16px', // 16px prevents iOS auto-zoom
                lineHeight: 1.5,
                resize: 'none',
                maxHeight: '100px',
                overflowY: 'auto',
                fontFamily: 'inherit',
                padding: '0.1rem 0',
              }}
            />
            <button
              onClick={() => sendMessage(inputText)}
              disabled={isLoading || !inputText.trim()}
              style={{
                width: '36px', height: '36px', borderRadius: '0.625rem',
                background: inputText.trim() && !isLoading
                  ? 'linear-gradient(135deg, #10b981, #047857)'
                  : 'rgba(255,255,255,0.06)',
                border: 'none',
                cursor: inputText.trim() && !isLoading ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
                transition: 'all 0.15s ease',
                boxShadow: inputText.trim() && !isLoading ? '0 0 12px rgba(16,185,129,0.3)' : 'none',
              }}
              aria-label="Send message"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={inputText.trim() && !isLoading ? '#fff' : 'rgba(255,255,255,0.3)'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
          <p style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.2)', textAlign: 'center', marginTop: '0.4rem' }}>
            Powered by Gemini AI • Synced with your Loft Registry &amp; Race History
          </p>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @keyframes typingBounce {
          0%, 60%, 100% { transform: translateY(0); }
          30%            { transform: translateY(-6px); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
        @keyframes cursorBlink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }
      `}</style>
    </div>
  )
}
