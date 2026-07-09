'use client'

import { useState, useEffect, useRef } from 'react'

interface SpeedCalculatorModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function SpeedCalculatorModal({ isOpen, onClose }: SpeedCalculatorModalProps) {
  const [distance, setDistance] = useState<string>('90')
  const [distanceUnit, setDistanceUnit] = useState<'km' | 'm'>('km')
  const [releaseTime, setReleaseTime] = useState<string>('06:00:00')
  const [arrivalTime, setArrivalTime] = useState<string>('07:30:00')

  const modalRef = useRef<HTMLDivElement>(null)

  // Escape key support
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  if (!isOpen) return null

  // Calculation Logic
  const distNum = parseFloat(distance)
  const distInMeters = isNaN(distNum) ? 0 : distanceUnit === 'km' ? distNum * 1000 : distNum

  let flyingTimeFormatted = 'N/A'
  let speedMmin = 0
  let speedKmh = 0
  let speedMs = 0
  let isValid = false

  if (distInMeters > 0 && releaseTime && arrivalTime) {
    const [rH, rM, rS = 0] = releaseTime.split(':').map(Number)
    const [aH, aM, aS = 0] = arrivalTime.split(':').map(Number)

    if (!isNaN(rH) && !isNaN(rM) && !isNaN(aH) && !isNaN(aM)) {
      const releaseSeconds = rH * 3600 + rM * 60 + rS
      let arrivalSeconds = aH * 3600 + aM * 60 + aS

      if (arrivalSeconds <= releaseSeconds) {
        arrivalSeconds += 24 * 3600 // cross next day
      }

      const totalSeconds = arrivalSeconds - releaseSeconds
      if (totalSeconds > 0) {
        isValid = true
        
        // Format flight duration
        const hours = Math.floor(totalSeconds / 3600)
        const minutes = Math.floor((totalSeconds % 3600) / 60)
        const seconds = totalSeconds % 60
        
        const hLabel = hours > 0 ? `${hours}h ` : ''
        const mLabel = minutes > 0 || hours > 0 ? `${minutes}m ` : ''
        flyingTimeFormatted = `${hLabel}${mLabel}${seconds}s (${(totalSeconds / 60).toFixed(2)} mins)`

        // Speeds
        const flyingMinutes = totalSeconds / 60
        speedMmin = distInMeters / flyingMinutes
        speedMs = distInMeters / totalSeconds
        speedKmh = (distInMeters / 1000) / (totalSeconds / 3600)
      }
    }
  }

  return (
    <div 
      className="modal-backdrop modal-floating" 
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      style={{ zIndex: 9000 }} // overlay below mobile bottom tab bar (10000)
    >
      <div
        className="modal-container"
        ref={modalRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        style={{ maxWidth: '440px' }}
      >
        {/* Header */}
        <div className="modal-header" style={{ background: 'linear-gradient(135deg, var(--brand-gold), #b38600)' }}>
          <div className="modal-header-left" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.25rem' }}>🧮</span>
            <div>
              <h2 className="modal-title" style={{ color: '#000', fontWeight: 800 }}>Quick Speed Calculator</h2>
              <p className="modal-subtitle" style={{ color: 'rgba(0,0,0,0.65)' }}>Calculate flying velocity in real-time</p>
            </div>
          </div>
          <button 
            className="modal-close-btn" 
            style={{ color: '#000', background: 'rgba(0,0,0,0.08)' }} 
            onClick={onClose} 
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="modal-body" style={{ padding: '1.25rem', gap: '1rem', overflowY: 'auto' }}>
          
          {/* Distance Input */}
          <div className="form-group">
            <label htmlFor="calc-distance" className="form-label">📏 Fly Distance</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                id="calc-distance"
                type="number"
                step="any"
                min="0"
                className="form-input"
                value={distance}
                onChange={(e) => setDistance(e.target.value)}
                placeholder="e.g. 90"
                style={{ flex: 1 }}
              />
              <select
                aria-label="Distance Unit"
                className="form-input"
                value={distanceUnit}
                onChange={(e) => setDistanceUnit(e.target.value as 'km' | 'm')}
                style={{ width: '80px', background: 'var(--bg-surface)', color: 'var(--text-primary)', cursor: 'pointer' }}
              >
                <option value="km">km</option>
                <option value="m">meters</option>
              </select>
            </div>
          </div>

          {/* Time Inputs */}
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="calc-release" className="form-label">⏰ Release Time</label>
              <input
                id="calc-release"
                type="time"
                step="1"
                className="form-input"
                value={releaseTime}
                onChange={(e) => setReleaseTime(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="calc-arrival" className="form-label">⏱️ Arrival Time</label>
              <input
                id="calc-arrival"
                type="time"
                step="1"
                className="form-input"
                value={arrivalTime}
                onChange={(e) => setArrivalTime(e.target.value)}
              />
            </div>
          </div>

          {/* Results Summary Card */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid var(--border-default)',
            borderRadius: '0.75rem',
            padding: '1.25rem',
            marginTop: '0.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem'
          }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
              Calculation Results
            </span>

            {isValid ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {/* Speed in m/min (Standard Pigeon Racing unit) */}
                <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.6rem' }}>
                  <span style={{ display: 'block', fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Velocity Speed (Standard)</span>
                  <strong style={{ fontSize: '1.4rem', color: 'var(--brand-gold)', fontWeight: 900 }}>
                    {speedMmin.toFixed(3).toLocaleString()} m/min
                  </strong>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div>
                    <span style={{ display: 'block', fontSize: '0.62rem', color: 'var(--text-secondary)' }}>Speed in km/h</span>
                    <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                      {speedKmh.toFixed(2)} km/h
                    </strong>
                  </div>
                  <div>
                    <span style={{ display: 'block', fontSize: '0.62rem', color: 'var(--text-secondary)' }}>Speed in m/s</span>
                    <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                      {speedMs.toFixed(2)} m/s
                    </strong>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.5rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Flight Duration:</span>
                  <strong style={{ color: 'var(--text-primary)' }}>{flyingTimeFormatted}</strong>
                </div>
              </div>
            ) : (
              <div style={{ 
                padding: '0.5rem 0', 
                textAlign: 'center', 
                fontSize: '0.78rem', 
                color: 'var(--text-secondary)',
                fontStyle: 'italic'
              }}>
                Input valid distance and times to compute speed
              </div>
            )}
          </div>

          {/* Quick info tip */}
          <div style={{
            fontSize: '0.68rem',
            color: 'var(--text-muted)',
            lineHeight: '1.35',
            background: 'rgba(255, 193, 7, 0.04)',
            border: '1px solid rgba(255, 193, 7, 0.1)',
            borderRadius: '0.5rem',
            padding: '0.6rem 0.75rem'
          }}>
            ℹ️ <strong>Formula</strong>: Speed = Distance in meters / Time in minutes. If the arrival time is earlier than release time, the calculator assumes next-day arrival.
          </div>

          <button
            type="button"
            className="nav-btn nav-btn-primary"
            onClick={onClose}
            style={{
              width: '100%',
              padding: '0.6rem',
              height: '2.4rem',
              background: 'var(--brand-gold)',
              color: '#000',
              fontWeight: 800,
              fontSize: '0.8rem',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              marginTop: '0.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            Done
          </button>
        </div>

      </div>
    </div>
  )
}
