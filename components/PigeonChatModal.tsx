'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface Message {
  role: 'user' | 'model'
  text: string
  timestamp: Date
  isTyping?: boolean   // true while typewriter is animating
}

interface PigeonChatModalProps {
  isOpen: boolean
  onClose: () => void
}

const QUICK_QUESTIONS = [
  '🏁 What do I feed pigeons after a race?',
  '💊 What supplements on Wednesday?',
  '🌾 Best grain mix for racing?',
  '🛁 When should I give bath?',
  '⚡ How to build stamina?',
  '🦠 Signs of Canker disease?',
]

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
          : 'linear-gradient(135deg, #10b981, #047857)',
        boxShadow: msg.role === 'model' ? '0 0 8px rgba(16,185,129,0.3)' : 'none',
      }}>
        {msg.role === 'user' ? '👤' : '🕊️'}
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

export default function PigeonChatModal({ isOpen, onClose }: PigeonChatModalProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputText, setInputText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [hasStarted, setHasStarted] = useState(false)
  const [viewportHeight, setViewportHeight] = useState<number | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)
  const inputAreaRef = useRef<HTMLDivElement>(null)

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

  // Dynamically cap modal height to visual viewport (shrinks when keyboard opens)
  const modalHeight = viewportHeight ? `${viewportHeight}px` : '92dvh'

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
          messages: newMessages.map(m => ({ role: m.role, text: m.text }))
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
              background: 'linear-gradient(135deg, #10b981, #047857)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.3rem',
              boxShadow: '0 0 16px rgba(16,185,129,0.4)',
              flexShrink: 0,
            }}>🕊️</div>
            <div>
              <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#fff', lineHeight: 1.1 }}>
                FlyMetric AI
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.1rem' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', animation: 'pulse 2s infinite' }} />
                <span style={{ fontSize: '0.68rem', color: '#10b981', fontWeight: 600 }}>
                  {isLoading ? 'Typing…' : 'Pigeon Racing Expert • Online'}
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
                <div style={{ fontSize: '3.5rem', marginBottom: '0.5rem', filter: 'drop-shadow(0 0 12px rgba(16,185,129,0.5))' }}>🕊️</div>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 0.35rem' }}>
                  FlyMetric AI Assistant
                </h2>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5, maxWidth: '280px', margin: '0 auto' }}>
                  Your expert companion for pigeon racing, loft management, feeding, health, and training.
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
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.07)',
                        borderRadius: '0.5rem',
                        padding: '0.5rem 0.6rem',
                        textAlign: 'left',
                        cursor: 'pointer',
                        color: 'var(--text-secondary)',
                        fontSize: '0.72rem',
                        lineHeight: 1.3,
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLButtonElement).style.background = 'rgba(16,185,129,0.06)'
                        ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(16,185,129,0.2)'
                        ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)'
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.02)'
                        ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.07)'
                        ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'
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
                background: 'linear-gradient(135deg, #10b981, #047857)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.85rem',
                boxShadow: '0 0 8px rgba(16,185,129,0.3)',
                flexShrink: 0,
              }}>🕊️</div>
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
              placeholder="Ask about pigeon racing, feeding, health…"
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
            Powered by Gemini AI • Pigeon racing expert
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
