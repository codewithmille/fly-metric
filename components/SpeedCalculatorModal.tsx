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
      data-theme="dark"
      className="modal-backdrop modal-floating"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      style={{ zIndex: 9000 }}
    >
      <div
        className="modal-container border border-white/10 bg-base-200 shadow-2xl"
        ref={modalRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        style={{ maxWidth: '450px' }}
      >
        {/* Header */}
        <div
          className="modal-header"
          style={{ background: 'linear-gradient(135deg, var(--brand-gold), #b38600)' }}
        >
          <div className="modal-header-left" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ fontSize: '1.3rem' }}>🧮</span>
            <div>
              <h2 className="modal-title" style={{ color: '#000', fontWeight: 800 }}>
                Quick Speed Calculator
              </h2>
              <p className="modal-subtitle" style={{ color: 'rgba(0,0,0,0.68)' }}>
                Calculate pigeon velocity in real-time
              </p>
            </div>
          </div>
          <button
            className="btn btn-circle btn-xs border-none bg-black/15 text-black hover:bg-black/25"
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
            <label htmlFor="calc-distance" className="form-label flex items-center justify-between">
              <span>📏 Fly Distance</span>
              <span className="badge badge-ghost badge-xs">km or meters</span>
            </label>
            <div className="join w-full">
              <input
                id="calc-distance"
                type="number"
                step="any"
                min="0"
                className="input input-bordered join-item w-full bg-base-100 border-white/10 focus:border-primary"
                value={distance}
                onChange={(e) => setDistance(e.target.value)}
                placeholder="e.g. 90"
              />
              <select
                aria-label="Distance Unit"
                className="select select-bordered join-item bg-base-300 border-white/10 font-semibold w-28"
                value={distanceUnit}
                onChange={(e) => setDistanceUnit(e.target.value as 'km' | 'm')}
              >
                <option value="km">km</option>
                <option value="m">meters</option>
              </select>
            </div>
          </div>

          {/* Time Inputs */}
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="calc-release" className="form-label">
                ⏰ Release Time
              </label>
              <input
                id="calc-release"
                type="time"
                step="1"
                className="input input-bordered w-full bg-base-100 border-white/10 focus:border-primary"
                value={releaseTime}
                onChange={(e) => setReleaseTime(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="calc-arrival" className="form-label">
                ⏱️ Arrival Time
              </label>
              <input
                id="calc-arrival"
                type="time"
                step="1"
                className="input input-bordered w-full bg-base-100 border-white/10 focus:border-primary"
                value={arrivalTime}
                onChange={(e) => setArrivalTime(e.target.value)}
              />
            </div>
          </div>

          {/* Results Summary Card using daisyUI + shadcn dark styling */}
          <div className="card bg-base-100/90 border border-white/10 shadow-inner">
            <div className="card-body p-4 gap-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-base-content/50">
                  Calculation Results
                </span>
                {isValid && (
                  <span className="badge badge-warning badge-outline badge-xs font-mono">
                    LIVE M/MIN
                  </span>
                )}
              </div>

              {isValid ? (
                <div className="space-y-3">
                  {/* Speed in m/min (Standard Pigeon Racing unit) */}
                  <div className="border-b border-white/10 pb-3">
                    <span className="block text-xs text-base-content/60">
                      Velocity Speed (Standard)
                    </span>
                    <strong className="text-2xl font-black text-primary font-mono tracking-tight">
                      {speedMmin.toFixed(3).toLocaleString()} m/min
                    </strong>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg bg-base-200/70 border border-white/5 p-2.5">
                      <span className="block text-[11px] text-base-content/60">Speed in km/h</span>
                      <strong className="text-sm font-bold text-info font-mono">
                        {speedKmh.toFixed(2)} km/h
                      </strong>
                    </div>
                    <div className="rounded-lg bg-base-200/70 border border-white/5 p-2.5">
                      <span className="block text-[11px] text-base-content/60">Speed in m/s</span>
                      <strong className="text-sm font-bold text-success font-mono">
                        {speedMs.toFixed(2)} m/s
                      </strong>
                    </div>
                  </div>

                  <div className="border-t border-white/10 pt-2.5 flex items-center justify-between text-xs">
                    <span className="text-base-content/60">Flight Duration:</span>
                    <strong className="font-mono text-base-content">{flyingTimeFormatted}</strong>
                  </div>
                </div>
              ) : (
                <div className="py-3 text-center text-xs text-base-content/60 italic">
                  Input valid distance and times to compute speed
                </div>
              )}
            </div>
          </div>

          {/* Quick info tip */}
          <div className="alert alert-warning alert-soft border border-primary/20 py-2.5 px-3 text-xs leading-relaxed">
            <span>
              ℹ️ <strong>Formula</strong>: Speed = Distance (meters) ÷ Time (minutes). Next-day arrival is automatically calculated when arrival is earlier than release.
            </span>
          </div>

          <button
            type="button"
            className="btn btn-primary w-full font-extrabold"
            onClick={onClose}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
