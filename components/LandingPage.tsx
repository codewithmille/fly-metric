'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { BirdIcon, CalculatorIcon, TrainingIcon, TrophyIcon, LightningIcon, CameraIcon } from '@/components/icons'
import SpeedCalculatorModal from '@/components/SpeedCalculatorModal'

export default function LandingPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isCalcOpen, setIsCalcOpen] = useState(false)
  const [previewTab, setPreviewTab] = useState<'overview' | 'calendar' | 'leaderboard' | 'settings'>('overview')

  // Interactive Mockup Toggles (inspired by daisyUI hero showcase)
  const [offlineSyncToggle, setOfflineSyncToggle] = useState(true)
  const [exifVerifyToggle, setExifVerifyToggle] = useState(true)
  const [aiAdvisorToggle, setAiAdvisorToggle] = useState(true)

  // Inline Live Velocity Calculator State (#calculator section)
  const [inlineDistance, setInlineDistance] = useState<number>(150)
  const [inlineUnit, setInlineUnit] = useState<'km' | 'm'>('km')
  const [inlineRelease, setInlineRelease] = useState<string>('06:00:00')
  const [inlineArrival, setInlineArrival] = useState<string>('08:05:00')

  const handleGoogleLogin = async () => {
    try {
      setLoading(true)
      setError(null)
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      })
      if (error) throw error
    } catch (err: any) {
      setError(err.message || 'Failed to sign in. Please try again.')
      setLoading(false)
    }
  }

  // Compute inline calculator results
  const distMeters = inlineUnit === 'km' ? inlineDistance * 1000 : inlineDistance
  let inlineMmin = 0
  let inlineKmh = 0
  let inlineMs = 0
  let inlineDuration = 'N/A'
  let inlineValid = false

  if (distMeters > 0 && inlineRelease && inlineArrival) {
    const [rH, rM, rS = 0] = inlineRelease.split(':').map(Number)
    const [aH, aM, aS = 0] = inlineArrival.split(':').map(Number)
    if (!isNaN(rH) && !isNaN(rM) && !isNaN(aH) && !isNaN(aM)) {
      const rSec = rH * 3600 + rM * 60 + rS
      let aSec = aH * 3600 + aM * 60 + aS
      if (aSec <= rSec) aSec += 24 * 3600
      const totalSec = aSec - rSec
      if (totalSec > 0) {
        inlineValid = true
        const hrs = Math.floor(totalSec / 3600)
        const mins = Math.floor((totalSec % 3600) / 60)
        const secs = totalSec % 60
        inlineDuration = `${hrs > 0 ? `${hrs}h ` : ''}${mins}m ${secs}s`
        inlineMmin = distMeters / (totalSec / 60)
        inlineKmh = (distMeters / 1000) / (totalSec / 3600)
        inlineMs = distMeters / totalSec
      }
    }
  }

  return (
    <div
      data-theme="dark"
      className="min-h-screen bg-[#080c14] text-slate-100 relative overflow-x-hidden selection:bg-amber-400/30 selection:text-amber-400"
    >
      {/* Precision Avionics Grid Backdrop */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
            maskImage: 'radial-gradient(ellipse 90% 60% at 50% 0%, #000 70%, transparent 100%)',
            WebkitMaskImage: 'radial-gradient(ellipse 90% 60% at 50% 0%, #000 70%, transparent 100%)',
          }}
        />
        <div className="absolute -top-40 -left-40 h-[460px] w-[460px] rounded-full bg-amber-500/10 blur-[140px]" />
        <div className="absolute top-1/4 right-[-100px] h-[500px] w-[500px] rounded-full bg-sky-500/10 blur-[150px]" />
      </div>

      {/* 1. Tactical Flight Command Header */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0c121e]/90 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Mobile Dropdown Menu */}
            <div className="dropdown lg:hidden">
              <div tabIndex={0} role="button" aria-label="Open menu" className="cockpit-nav-btn !p-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h7" />
                </svg>
              </div>
              <ul
                tabIndex={0}
                className="menu menu-sm dropdown-content mt-3 z-50 p-2 shadow-2xl bg-[#0e1420] border border-white/10 rounded-lg w-56 gap-1"
              >
                <li><a href="#features" className="text-slate-300 hover:text-white">Capabilities</a></li>
                <li><a href="#calculator" className="text-slate-300 hover:text-amber-400">Live Velocity Engine</a></li>
                <li><a href="#install" className="text-slate-300 hover:text-white">PWA Direct Install</a></li>
                <li><a href="#faq" className="text-slate-300 hover:text-white">Racing Standard FAQ</a></li>
              </ul>
            </div>

            <a href="#" className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-black/50 border border-amber-400/40 shadow-sm">
                <img src="/icon.png" alt="FlyMetric" className="h-7 w-7 object-contain" />
              </div>
              <span className="text-lg font-black tracking-tight text-white uppercase">
                Fly<span className="text-amber-400">Metric</span>
              </span>
            </a>
            <span className="hidden sm:inline-flex font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-white/5 border border-white/10 text-slate-400">
              AVIONICS v2.4
            </span>
          </div>

          <div className="hidden lg:flex items-center gap-6 text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
            <a href="#features" className="hover:text-white transition-colors">Capabilities</a>
            <a href="#calculator" className="text-amber-400 hover:text-amber-300 transition-colors">Live Engine</a>
            <a href="#install" className="hover:text-white transition-colors">PWA Guide</a>
            <a href="#faq" className="hover:text-white transition-colors">Standards</a>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setIsCalcOpen(true)}
              className="cockpit-nav-btn !py-1.5 !px-3 !text-xs hidden sm:inline-flex"
            >
              <CalculatorIcon size={14} />
              Quick Calc
            </button>
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="cockpit-nav-btn-primary !py-1.5 !px-3.5 !text-xs"
            >
              Sign In
            </button>
          </div>
        </div>
      </header>

      {/* 2. Hero Section + Interactive Cockpit Sandbox Window */}
      <section className="relative z-10 mx-auto max-w-7xl px-4 pt-12 pb-16 sm:px-8 lg:pt-16 lg:pb-20">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12">
          {/* Left Column: Copy & CTAs */}
          <div className="lg:col-span-6 flex flex-col items-center text-center lg:items-start lg:text-left">
            <div className="inline-flex items-center gap-2 py-1 px-3 mb-5 rounded bg-white/5 border border-amber-400/30 text-[10px] font-mono font-bold tracking-widest uppercase text-amber-400">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
              FLIGHT TELEMETRY &amp; CLOCKING INSTRUMENT
            </div>

            <h1 className="text-3xl font-black tracking-tight sm:text-5xl lg:text-5xl leading-[1.1] mb-5 text-white">
              Aeronautical Precision For Your Racing Loft.
            </h1>

            <p className="text-sm sm:text-base text-slate-400 leading-relaxed mb-6 max-w-xl font-normal">
              High-accuracy velocity computation in <strong className="text-amber-400 font-mono font-bold">meters per minute (m/min)</strong>. Automatic multi-day rollover timing, 125kHz RFID trap telemetry, EXIF timestamp verification, and deep pedigree records—engineered 100% offline-ready.
            </p>

            {/* Primary & Secondary CTAs */}
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto mb-6">
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading}
                className="cockpit-nav-btn-primary !py-2.5 !px-5 !text-sm w-full sm:w-auto !justify-center"
              >
                {loading ? (
                  <>
                    <span className="loading loading-spinner loading-xs" />
                    Connecting to Loft Console…
                  </>
                ) : (
                  <>
                    <span className="flex h-5 w-5 items-center justify-center rounded bg-white shadow-sm shrink-0">
                      <svg width="13" height="13" viewBox="0 0 48 48">
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                      </svg>
                    </span>
                    Launch Flight Deck (Google)
                  </>
                )}
              </button>

              <a
                href="#calculator"
                className="cockpit-nav-btn !py-2.5 !px-4 !text-sm w-full sm:w-auto !justify-center"
              >
                <CalculatorIcon size={16} />
                Live Velocity Engine
              </a>
            </div>

            {error && (
              <div role="alert" className="alert alert-error alert-soft mb-5 py-2 text-xs font-mono">
                <span>{error}</span>
              </div>
            )}

            {/* Tactical Instrument Specs Bar */}
            <div className="grid grid-cols-3 gap-2 w-full max-w-xl">
              <div className="p-2.5 rounded-lg bg-[#0e1420] border border-white/10 text-left">
                <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">PROTOCOL</div>
                <div className="font-mono text-base font-extrabold text-amber-400">100% PWA</div>
                <div className="text-[10px] text-slate-500 font-mono">Local Sync Buffer</div>
              </div>
              <div className="p-2.5 rounded-lg bg-[#0e1420] border border-white/10 text-left">
                <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">VELOCITY METRIC</div>
                <div className="font-mono text-base font-extrabold text-sky-400">m/min</div>
                <div className="text-[10px] text-slate-500 font-mono">+ km/h conversion</div>
              </div>
              <div className="p-2.5 rounded-lg bg-[#0e1420] border border-white/10 text-left">
                <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">AUDIT PROOF</div>
                <div className="font-mono text-base font-extrabold text-emerald-400">EXIF 2.3</div>
                <div className="text-[10px] text-slate-500 font-mono">Photo Metadata</div>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive daisyUI Mockup Window Showcase */}
          <div className="lg:col-span-6 relative">
            <div className="mockup-window border border-white/10 bg-base-200/85 shadow-2xl backdrop-blur-xl">
              {/* Top Interactive Tabs Bar inside Mockup */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-b border-white/10 bg-base-300/60 px-4 py-2.5">
                <div role="tablist" className="tabs tabs-box tabs-xs bg-base-100/80 p-1 border border-white/5">
                  <button
                    type="button"
                    role="tab"
                    onClick={() => setPreviewTab('overview')}
                    className={`tab font-semibold ${previewTab === 'overview' ? 'tab-active !bg-primary !text-primary-content' : ''}`}
                  >
                    Overview
                  </button>
                  <button
                    type="button"
                    role="tab"
                    onClick={() => setPreviewTab('calendar')}
                    className={`tab font-semibold ${previewTab === 'calendar' ? 'tab-active !bg-primary !text-primary-content' : ''}`}
                  >
                    Calendar
                  </button>
                  <button
                    type="button"
                    role="tab"
                    onClick={() => setPreviewTab('leaderboard')}
                    className={`tab font-semibold ${previewTab === 'leaderboard' ? 'tab-active !bg-primary !text-primary-content' : ''}`}
                  >
                    Clock-In
                  </button>
                  <button
                    type="button"
                    role="tab"
                    onClick={() => setPreviewTab('settings')}
                    className={`tab font-semibold ${previewTab === 'settings' ? 'tab-active !bg-primary !text-primary-content' : ''}`}
                  >
                    Loft Controls
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <span className="badge badge-success badge-xs gap-1 py-2 px-2 font-bold">
                    <span className="h-1.5 w-1.5 rounded-full bg-success animate-ping" />
                    SYNCED
                  </span>
                </div>
              </div>

              {/* Mockup Content Body */}
              <div className="p-4 sm:p-5 space-y-4 bg-base-100/60">
                {/* 4 Mini Stat Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="rounded-xl border border-white/10 bg-base-200/80 p-3">
                    <div className="flex items-center justify-between text-xs text-base-content/60 mb-1">
                      <span>BIRDS FLOWN</span>
                      <span className="text-primary"><BirdIcon size={14} /></span>
                    </div>
                    <div className="text-lg font-extrabold text-primary font-mono">1,482</div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-base-200/80 p-3">
                    <div className="flex items-center justify-between text-xs text-base-content/60 mb-1">
                      <span>MAX SPEED</span>
                      <span className="text-info"><LightningIcon size={14} /></span>
                    </div>
                    <div className="text-lg font-extrabold text-info font-mono">1,668.5</div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-base-200/80 p-3">
                    <div className="flex items-center justify-between text-xs text-base-content/60 mb-1">
                      <span>TOSSES</span>
                      <span className="text-success"><TrainingIcon size={14} /></span>
                    </div>
                    <div className="text-lg font-extrabold text-success font-mono">42</div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-base-200/80 p-3">
                    <div className="flex items-center justify-between text-xs text-base-content/60 mb-1">
                      <span>RACES</span>
                      <span className="text-secondary"><TrophyIcon size={14} /></span>
                    </div>
                    <div className="text-lg font-extrabold text-secondary font-mono">18</div>
                  </div>
                </div>

                {/* Tab 1: Overview (Calendar + Live Registry Split) */}
                {previewTab === 'overview' && (
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    {/* Mini Calendar Schedule */}
                    <div className="sm:col-span-7 rounded-xl border border-white/10 bg-base-200/70 p-3.5">
                      <div className="flex items-center justify-between mb-2.5">
                        <span className="text-xs font-bold text-base-content">Loft Activity Schedule</span>
                        <div className="flex gap-1">
                          <span className="badge badge-warning badge-xs">Race</span>
                          <span className="badge badge-info badge-xs">Toss</span>
                          <span className="badge badge-success badge-xs">Med</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-base-content/40 mb-1">
                        <span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span>
                      </div>
                      <div className="grid grid-cols-7 gap-1.5 text-[10px]">
                        {[
                          { d: 1 }, { d: 2 },
                          { d: 3, tag: '50k', cls: 'border-info/50 bg-info/15 text-info' },
                          { d: 4 }, { d: 5 },
                          { d: 6, tag: 'Race', cls: 'border-primary/60 bg-primary/15 text-primary' },
                          { d: 7 },
                          { d: 8 },
                          { d: 9, tag: 'Med', cls: 'border-success/50 bg-success/15 text-success' },
                          { d: 10 },
                          { d: 11, tag: '90k', cls: 'border-info/50 bg-info/15 text-info' },
                          { d: 12 }, { d: 13 },
                          { d: 14, tag: '220k', cls: 'border-primary/60 bg-primary/15 text-primary' },
                          { d: 15 }, { d: 16 },
                          { d: 17, tag: 'Task', cls: 'border-secondary/50 bg-secondary/15 text-secondary' },
                          { d: 18 },
                          { d: 19, tag: '120k', cls: 'border-info/50 bg-info/15 text-info' },
                          { d: 20 },
                          { d: 21, tag: '350k', cls: 'border-primary/60 bg-primary/15 text-primary' },
                        ].map((cell) => (
                          <div
                            key={cell.d}
                            className={`flex flex-col items-center justify-center rounded-md border p-1 min-h-[34px] ${
                              cell.cls || 'border-white/5 bg-base-300/40 text-base-content/50'
                            }`}
                          >
                            <span className="font-bold leading-none">{cell.d}</span>
                            {cell.tag && <span className="text-[8px] font-extrabold mt-0.5 leading-none">{cell.tag}</span>}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Live Velocity List */}
                    <div className="sm:col-span-5 rounded-xl border border-white/10 bg-base-200/70 p-3.5 flex flex-col justify-between gap-2">
                      <div>
                        <div className="flex items-center justify-between mb-2.5">
                          <span className="text-xs font-bold text-base-content">Registry &amp; Velocity</span>
                          <span className="text-[10px] text-primary font-mono">m/min</span>
                        </div>
                        <div className="space-y-2">
                          {[
                            { ring: 'PHA-2026-10292', desc: 'Blue Bar • Cock', speed: '1,484.2', badge: 'badge-warning' },
                            { ring: 'PHA-2026-88392', desc: 'Checkered • Hen', speed: '1,461.8', badge: 'badge-success' },
                            { ring: 'PHA-2026-11202', desc: 'Grizzle • Hen', speed: '1,432.0', badge: 'badge-info' },
                          ].map((b) => (
                            <div
                              key={b.ring}
                              className="flex items-center justify-between rounded-lg border border-white/5 bg-base-100/80 px-2.5 py-2"
                            >
                              <div>
                                <div className="text-[11px] font-bold text-base-content">{b.ring}</div>
                                <div className="text-[9px] text-base-content/50">{b.desc}</div>
                              </div>
                              <span className={`badge ${b.badge} badge-sm font-mono font-bold`}>
                                {b.speed}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-lg border border-success/30 bg-success/10 px-2.5 py-2 text-[10px] text-success flex items-center justify-between">
                        <span className="font-bold">✓ Offline Queue Synced</span>
                        <span className="opacity-75">3 records</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab 2: Calendar Detailed View */}
                {previewTab === 'calendar' && (
                  <div className="rounded-xl border border-white/10 bg-base-200/70 p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-primary">Upcoming Loft Events</span>
                      <span className="badge badge-outline badge-xs">Season Schedule</span>
                    </div>
                    {[
                      { title: 'North Derby 320km Final', date: 'Sat • 06:00 AM Release • 28 Birds Basketed', type: 'Race', badge: 'badge-warning' },
                      { title: 'Mid-Week Road Toss (90km)', date: 'Wed • 06:30 AM Release • Conditioning', type: 'Training', badge: 'badge-info' },
                      { title: 'Respiratory & Electrolyte Boost', date: 'Mon • Loft Medical Routine', type: 'Medication', badge: 'badge-success' },
                    ].map((item) => (
                      <div key={item.title} className="flex items-center justify-between rounded-lg border border-white/10 bg-base-100/80 p-3">
                        <div>
                          <div className="text-xs font-bold text-base-content">{item.title}</div>
                          <div className="text-[11px] text-base-content/60">{item.date}</div>
                        </div>
                        <span className={`badge ${item.badge} badge-sm font-bold`}>{item.type}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Tab 3: Live Clock-In Leaderboard */}
                {previewTab === 'leaderboard' && (
                  <div className="rounded-xl border border-white/10 bg-base-200/70 p-3.5">
                    <div className="overflow-x-auto">
                      <table className="table table-xs">
                        <thead>
                          <tr className="text-base-content/60 border-b border-white/10">
                            <th>Rank</th>
                            <th>Ring No.</th>
                            <th>Flight Time</th>
                            <th className="text-right">Velocity</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b border-white/5">
                            <td><span className="badge badge-warning badge-xs font-bold">#1</span></td>
                            <td className="font-bold">PHA-2026-10292</td>
                            <td className="text-base-content/70">03h 35m 40s</td>
                            <td className="text-right font-mono font-bold text-primary">1,484.25 m/min</td>
                          </tr>
                          <tr className="border-b border-white/5">
                            <td><span className="badge badge-ghost badge-xs font-bold">#2</span></td>
                            <td className="font-bold">PHA-2026-88392</td>
                            <td className="text-base-content/70">03h 38m 55s</td>
                            <td className="text-right font-mono font-bold text-success">1,461.80 m/min</td>
                          </tr>
                          <tr>
                            <td><span className="badge badge-ghost badge-xs font-bold">#3</span></td>
                            <td className="font-bold">PHA-2026-11202</td>
                            <td className="text-base-content/70">03h 43m 28s</td>
                            <td className="text-right font-mono font-bold text-info">1,432.04 m/min</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Tab 4: Interactive daisyUI Controls (like daisyUI.com Hero Card) */}
                {previewTab === 'settings' && (
                  <div className="rounded-xl border border-white/10 bg-base-200/70 p-4 space-y-3">
                    <div className="text-xs font-bold uppercase tracking-wider text-primary mb-1">
                      Interactive Loft Controls (daisyUI Dark)
                    </div>
                    <label className="flex items-center justify-between cursor-pointer rounded-lg border border-white/5 bg-base-100/80 px-3 py-2.5">
                      <div>
                        <div className="text-xs font-bold">Offline-First Queue Sync</div>
                        <div className="text-[10px] text-base-content/60">Save clock-ins without internet signal</div>
                      </div>
                      <input
                        type="checkbox"
                        className="toggle toggle-warning toggle-sm"
                        checked={offlineSyncToggle}
                        onChange={(e) => setOfflineSyncToggle(e.target.checked)}
                      />
                    </label>
                    <label className="flex items-center justify-between cursor-pointer rounded-lg border border-white/5 bg-base-100/80 px-3 py-2.5">
                      <div>
                        <div className="text-xs font-bold">EXIF Photo Timestamp Verification</div>
                        <div className="text-[10px] text-base-content/60">Validate arrival photo metadata automatically</div>
                      </div>
                      <input
                        type="checkbox"
                        className="toggle toggle-success toggle-sm"
                        checked={exifVerifyToggle}
                        onChange={(e) => setExifVerifyToggle(e.target.checked)}
                      />
                    </label>
                    <label className="flex items-center justify-between cursor-pointer rounded-lg border border-white/5 bg-base-100/80 px-3 py-2.5">
                      <div>
                        <div className="text-xs font-bold">AI Pigeon Conditioning Advisor</div>
                        <div className="text-[10px] text-base-content/60">Smart toss &amp; recovery recommendations</div>
                      </div>
                      <input
                        type="checkbox"
                        className="toggle toggle-info toggle-sm"
                        checked={aiAdvisorToggle}
                        onChange={(e) => setAiAdvisorToggle(e.target.checked)}
                      />
                    </label>
                  </div>
                )}
              </div>
            </div>

            {/* Floating shadcn/daisyUI Verification Toast */}
            <div className="mt-4 sm:mt-0 sm:absolute sm:-bottom-5 sm:left-6 flex items-center gap-3 rounded-2xl border border-primary/40 bg-base-200/95 px-4 py-3 shadow-2xl backdrop-blur-xl">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <CameraIcon size={18} />
              </div>
              <div>
                <div className="text-xs font-bold text-base-content">Clock-In Photo Verified</div>
                <div className="text-[11px] text-base-content/70">
                  PHA-2026-10292 • <span className="font-bold text-primary">1,484.25 m/min</span>
                </div>
              </div>
              <span className="badge badge-success badge-sm font-extrabold">EXIF OK</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Interactive Inline Live Velocity Calculator Section (#calculator) */}
      <section id="calculator" className="relative z-10 py-16 px-4 sm:px-8 border-t border-white/10 bg-[#0a0f19]">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-5 space-y-4">
              <div className="inline-flex items-center gap-2 py-0.5 px-2.5 rounded bg-white/5 border border-amber-400/30 text-[10px] font-mono font-bold tracking-widest uppercase text-amber-400">
                // VELOCITY COMPUTATION BENCH
              </div>
              <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
                Live Flight Velocity Sandbox
              </h2>
              <p className="text-slate-400 leading-relaxed text-sm sm:text-base">
                Test the exact mathematical engine used by racing federations. Adjust flight distance or pick standard toss benchmarks to inspect instant output in <strong className="text-amber-400 font-mono">meters per minute (m/min)</strong> alongside <strong className="text-sky-400 font-mono">km/h</strong> and <strong className="text-emerald-400 font-mono">m/s</strong>.
              </p>

              {/* Quick Distance Presets */}
              <div className="space-y-2 pt-2">
                <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-bold">
                  Standard Race Benchmarks:
                </span>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: '50km Toss', dist: 50, rel: '06:30:00', arr: '07:10:00' },
                    { label: '150km Club', dist: 150, rel: '06:00:00', arr: '08:05:00' },
                    { label: '320km Derby', dist: 320, rel: '05:45:00', arr: '09:30:00' },
                    { label: '500km National', dist: 500, rel: '05:30:00', arr: '11:45:00' },
                  ].map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => {
                        setInlineUnit('km')
                        setInlineDistance(p.dist)
                        setInlineRelease(p.rel)
                        setInlineArrival(p.arr)
                      }}
                      className={`cockpit-nav-btn !py-1 !px-2.5 !text-xs ${
                        inlineDistance === p.dist && inlineUnit === 'km'
                          ? '!border-amber-400 !text-amber-400 !bg-amber-400/10'
                          : ''
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Interactive Avionics Instrument Calculator Card */}
            <div className="lg:col-span-7">
              <div className="rounded-xl bg-[#0c121e] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)] p-6 sm:p-7 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-400/15 text-amber-400 border border-amber-400/30">
                      <CalculatorIcon size={18} />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-white uppercase tracking-wider">Velocity Calculator Bench</h3>
                      <p className="text-[11px] font-mono text-slate-400">Formula: D_meters ÷ T_minutes</p>
                    </div>
                  </div>
                  <span className="font-mono text-[9px] font-bold px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                    BENCH ACTIVE
                  </span>
                </div>

                {/* Distance Slider + Direct Input */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-300 font-mono text-[11px]">FLIGHT DISTANCE ({inlineUnit.toUpperCase()})</span>
                    <span className="text-amber-400 font-mono text-sm">
                      {inlineDistance.toLocaleString()} {inlineUnit} ({distMeters.toLocaleString()} m)
                    </span>
                  </div>
                  <input
                    type="range"
                    min={inlineUnit === 'km' ? 10 : 1000}
                    max={inlineUnit === 'km' ? 800 : 800000}
                    step={inlineUnit === 'km' ? 5 : 500}
                    value={inlineDistance}
                    onChange={(e) => setInlineDistance(Number(e.target.value))}
                    className="range range-warning range-xs w-full cursor-pointer accent-amber-400"
                  />
                  <div className="flex gap-2 pt-1">
                    <input
                      type="number"
                      min={1}
                      value={inlineDistance}
                      onChange={(e) => setInlineDistance(Math.max(0, Number(e.target.value)))}
                      className="input input-bordered input-sm w-full bg-[#080c14] border-white/10 font-mono text-white text-xs"
                    />
                    <select
                      aria-label="Inline distance unit"
                      value={inlineUnit}
                      onChange={(e) => {
                        const nextUnit = e.target.value as 'km' | 'm'
                        if (nextUnit === 'm' && inlineUnit === 'km') setInlineDistance(inlineDistance * 1000)
                        if (nextUnit === 'km' && inlineUnit === 'm') setInlineDistance(Math.round(inlineDistance / 1000))
                        setInlineUnit(nextUnit)
                      }}
                      className="select select-bordered select-sm bg-[#080c14] border-white/10 font-mono font-bold text-xs"
                    >
                      <option value="km">KM</option>
                      <option value="m">METERS</option>
                    </select>
                  </div>
                </div>

                {/* Release & Arrival Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-mono font-bold text-slate-400 uppercase mb-1">
                      Release Timestamp
                    </label>
                    <input
                      type="time"
                      step="1"
                      value={inlineRelease}
                      onChange={(e) => setInlineRelease(e.target.value)}
                      className="input input-bordered input-sm w-full bg-[#080c14] border-white/10 font-mono text-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono font-bold text-slate-400 uppercase mb-1">
                      Clock-In Arrival
                    </label>
                    <input
                      type="time"
                      step="1"
                      value={inlineArrival}
                      onChange={(e) => setInlineArrival(e.target.value)}
                      className="input input-bordered input-sm w-full bg-[#080c14] border-white/10 font-mono text-white text-xs"
                    />
                  </div>
                </div>

                {/* Live Output Instrument Readouts */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-[#080c14] p-3 rounded-lg border border-white/10">
                  <div className="p-2 border-b sm:border-b-0 sm:border-r border-white/5">
                    <div className="text-[10px] font-mono uppercase font-bold text-slate-400">VELOCITY STANDARD</div>
                    <div className="text-2xl text-amber-400 font-mono font-black tabular-nums">
                      {inlineValid ? `${inlineMmin.toFixed(2)}` : '—'}
                    </div>
                    <div className="text-[10px] font-mono text-amber-400/80">meters / min</div>
                  </div>
                  <div className="p-2 border-b sm:border-b-0 sm:border-r border-white/5">
                    <div className="text-[10px] font-mono uppercase font-bold text-slate-400">GROUND SPEED</div>
                    <div className="text-xl text-sky-400 font-mono font-extrabold tabular-nums">
                      {inlineValid ? `${inlineKmh.toFixed(1)} km/h` : '—'}
                    </div>
                    <div className="text-[10px] font-mono text-emerald-400">
                      {inlineValid ? `${inlineMs.toFixed(2)} m/s` : '—'}
                    </div>
                  </div>
                  <div className="p-2">
                    <div className="text-[10px] font-mono uppercase font-bold text-slate-400">AIR DURATION</div>
                    <div className="text-xl text-white font-mono font-bold tabular-nums">
                      {inlineDuration}
                    </div>
                    <div className="text-[10px] font-mono text-slate-400">Next-Day Verified</div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <span className="text-[11px] font-mono text-slate-400">
                    Results are computed according to official FCF &amp; FCI velocity formulas.
                  </span>
                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    className="cockpit-nav-btn-primary !py-1.5 !px-3 !text-xs font-mono"
                  >
                    Open Loft Deck →
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Specialized Capabilities & Avionics Architecture (#features) */}
      <section id="features" className="relative z-10 border-t border-b border-white/10 bg-[#080c14] py-16 px-4 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-2xl text-center mb-12">
            <div className="inline-flex items-center gap-2 py-0.5 px-2.5 rounded bg-white/5 border border-amber-400/30 text-[10px] font-mono font-bold tracking-widest uppercase text-amber-400 mb-3">
              AVIONICS CAPABILITIES
            </div>
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-white mb-3">
              Engineered For Modern Avian Competition
            </h2>
            <p className="text-sm text-slate-400">
              Purpose-built tools for race telemetry, electronic trap antennas, forensic photo auditing, and bloodline pedigree science.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Module 1: Wide Top Banner - Trap Antenna Station */}
            <div className="md:col-span-12 rounded-xl bg-[#0c121e] border border-white/10 p-5 sm:p-6 shadow-[0_4px_24px_rgba(0,0,0,0.3)] flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
              <div className="space-y-2 max-w-2xl">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-xs bg-emerald-400 shadow-[0_0_8px_#10b981]" />
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400">
                    MODULE 01 // HARDWARE TELEMETRY
                  </span>
                </div>
                <h3 className="text-lg font-black text-white">
                  125kHz Electronic Trap Antenna &amp; Live Station HUD
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  Connect high-frequency RFID trap antennas directly to FlyMetric. Incoming racers crossing the entry loop trigger instant milliseconds-accurate clock-ins with audio chimes and duplicate ring filtration.
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0 p-3 rounded-lg bg-black/40 border border-white/10 font-mono text-xs">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                  <span className="text-emerald-400 font-bold">ANTENNA ARMED</span>
                </div>
                <span className="text-slate-600">|</span>
                <span className="text-slate-400">FREQ: 125 kHz</span>
                <span className="text-slate-600">|</span>
                <span className="text-amber-400 font-bold">BUFF: OK</span>
              </div>
            </div>

            {/* Module 2: Velocity Mathematical Engine */}
            <div className="md:col-span-6 rounded-xl bg-[#0c121e] border border-white/10 p-5 sm:p-6 shadow-[0_4px_24px_rgba(0,0,0,0.3)] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400">
                  MODULE 02 // NUMERICAL ENGINE
                </span>
                <span className="font-mono text-[9px] text-slate-400 bg-white/5 px-2 py-0.5 rounded border border-white/5">
                  FCI FORMULA
                </span>
              </div>
              <h3 className="text-base font-bold text-white">High-Velocity Multi-Day Calculation</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Precision velocity computing across meters per minute, km/h, and meters per second. Automatically handles multi-day cross-country derby flights with sunset to sunrise clock deductions.
              </p>
              <div className="p-3 rounded-lg bg-black/30 border border-white/5 font-mono text-[11px] text-slate-300 space-y-1">
                <div className="text-amber-400 font-bold">V = D_meters / (T_arrival - T_release)_minutes</div>
                <div className="text-slate-500 text-[10px]">Sample: 182,000m ÷ 125.4min = 1,451.36 m/min</div>
              </div>
            </div>

            {/* Module 3: EXIF Forensic Photo Proofing */}
            <div className="md:col-span-6 rounded-xl bg-[#0c121e] border border-white/10 p-5 sm:p-6 shadow-[0_4px_24px_rgba(0,0,0,0.3)] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-sky-400">
                  MODULE 03 // AUDIT COMPLIANCE
                </span>
                <span className="font-mono text-[9px] text-slate-400 bg-white/5 px-2 py-0.5 rounded border border-white/5">
                  EXIF 2.3
                </span>
              </div>
              <h3 className="text-base font-bold text-white">Forensic Camera Timestamp &amp; GPS Audit</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Clock-in photos are checked against hardware camera EXIF timestamps and embedded GPS coordinates, preventing photo tampering and ensuring fair club results.
              </p>
              <div className="p-3 rounded-lg bg-black/30 border border-white/5 font-mono text-[11px] text-slate-300 flex items-center justify-between">
                <span className="text-sky-400">PHA-2026-0912 // EXIF METADATA</span>
                <span className="text-emerald-400 font-bold">TIMESTAMP VERIFIED ✓</span>
              </div>
            </div>

            {/* Module 4: Pedigree Lineage & Sire/Dam Matrix */}
            <div className="md:col-span-12 rounded-xl bg-[#0c121e] border border-white/10 p-5 sm:p-6 shadow-[0_4px_24px_rgba(0,0,0,0.3)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1 max-w-xl">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-purple-400">
                  MODULE 04 // BIOLOGICAL ARCHIVES
                </span>
                <h3 className="text-base font-bold text-white">Pedigree Lineage &amp; Bloodline Analytics</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Digitize your breeding registry. Correlate velocity trophies against Sire, Dam, and Strain genetics to identify top-performing racing lines.
                </p>
              </div>
              <div className="flex items-center gap-2 font-mono text-xs">
                <span className="px-2.5 py-1 rounded bg-white/5 border border-white/10 text-slate-300">Sire Lineage</span>
                <span className="text-amber-400">✕</span>
                <span className="px-2.5 py-1 rounded bg-white/5 border border-white/10 text-slate-300">Dam Lineage</span>
                <span className="text-emerald-400 font-bold ml-1">→ Champion Speed</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. PWA Installation Guide with Sleek Step Cards & Proportioned Phone Frame (#install) */}
      <section id="install" className="relative z-10 py-20 px-4 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 items-center gap-12">
            {/* Left Column: Clean Step Cards */}
            <div className="lg:col-span-7">
              <span className="badge badge-warning badge-outline font-bold tracking-widest uppercase mb-3">
                How to Install
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4">
                Install FlyMetric as a Native App
              </h2>
              <p className="text-base-content/70 mb-8 max-w-xl leading-relaxed">
                FlyMetric is an offline-capable Progressive Web App (PWA). Install it directly onto your phone or desktop in seconds—no app store downloads required.
              </p>

              <div className="space-y-4 max-w-xl">
                {[
                  {
                    step: '01',
                    title: 'Open FlyMetric in Your Browser',
                    desc: 'Visit FlyMetric on Chrome, Edge, or Safari from your smartphone, tablet, or desktop computer.',
                    badge: 'Android • iOS • PC',
                  },
                  {
                    step: '02',
                    title: 'Tap “Install” or “Add to Home Screen”',
                    desc: 'On Android or Desktop, click the Install icon in the address bar. On iPhone/iPad, tap Share → Add to Home Screen.',
                    badge: '1-Click Setup',
                  },
                  {
                    step: '03',
                    title: 'Clock Birds Anywhere—Online or Offline',
                    desc: 'Launch FlyMetric straight from your home screen with full-screen native speed and automatic background sync.',
                    badge: '100% Offline Ready',
                  },
                ].map((item) => (
                  <div
                    key={item.step}
                    className="card bg-base-200/70 border border-white/10 hover:border-primary/40 transition-all shadow-lg"
                  >
                    <div className="card-body p-4 sm:p-5 flex-row items-start gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-content font-extrabold text-sm shadow-md shadow-primary/25">
                        {item.step}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                          <h4 className="font-bold text-base text-base-content">{item.title}</h4>
                          <span className="badge badge-ghost badge-xs border-white/10 font-mono">
                            {item.badge}
                          </span>
                        </div>
                        <p className="text-sm text-base-content/70 leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column: Properly Proportioned Smartphone Frame */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="relative w-[300px] sm:w-[320px] rounded-[2.75rem] border-[6px] border-base-300 bg-[#070a10] p-2.5 shadow-[0_25px_70px_rgba(0,0,0,0.75)] ring-1 ring-white/10">
                {/* Side Hardware Buttons */}
                <div className="absolute -left-[8px] top-24 h-8 w-[3px] rounded-l bg-base-300" />
                <div className="absolute -left-[8px] top-36 h-12 w-[3px] rounded-l bg-base-300" />
                <div className="absolute -right-[8px] top-32 h-14 w-[3px] rounded-r bg-base-300" />

                {/* Inner Screen */}
                <div className="relative flex h-[540px] w-full flex-col justify-between overflow-hidden rounded-[2.2rem] border border-white/10 bg-gradient-to-b from-base-200/90 via-base-100 to-base-100 p-5">
                  {/* Top Status Bar + Dynamic Island Notch (No Overlap) */}
                  <div className="relative flex items-center justify-between text-[11px] font-bold text-base-content/70 pt-1">
                    <span className="w-14 text-left font-mono">06:45</span>
                    <div className="h-5 w-24 rounded-full bg-black border border-white/10 flex items-center justify-end pr-2.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-500/80" />
                    </div>
                    <div className="w-14 flex items-center justify-end gap-1.5 text-[10px] font-mono text-success">
                      <span>5G</span>
                      <span className="inline-block w-4 h-2 border border-emerald-500 rounded-xs relative before:content-[''] before:absolute before:inset-0.5 before:bg-emerald-500 after:content-[''] after:absolute after:-right-1 after:top-0.5 after:bottom-0.5 after:w-0.5 after:bg-emerald-500" />
                    </div>
                  </div>

                  {/* Center App Icon & Mini PWA Status */}
                  <div className="flex flex-col items-center text-center my-auto px-2">
                    <div className="relative mb-3.5">
                      <div className="absolute -inset-2 rounded-3xl bg-emerald-500/20 blur-xl" />
                      <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-base-200/95 shadow-xl shadow-emerald-500/20 border border-emerald-500/35">
                        <img src="/icon.png" alt="FlyMetric" className="h-16 w-16 object-contain" />
                      </div>
                    </div>

                    <div className="text-lg font-extrabold tracking-tight">
                      Fly<span className="text-primary">Metric</span>
                    </div>
                    <div className="text-xs text-base-content/60 mt-0.5">
                      Offline Pigeon Racing PWA
                    </div>

                    <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                      <span className="badge badge-warning badge-xs font-semibold">m/min</span>
                      <span className="badge badge-info badge-xs font-semibold">Pedigree</span>
                      <span className="badge badge-success badge-xs font-semibold">Offline Sync</span>
                    </div>

                    {/* Mini Live Race Card inside Phone */}
                    <div className="mt-5 w-full rounded-xl border border-white/10 bg-base-200/90 p-3 text-left shadow-md">
                      <div className="flex items-center justify-between text-[10px] text-base-content/60 mb-1">
                        <span className="font-bold uppercase text-primary">Last Clock-In</span>
                        <span className="badge badge-success badge-xs">Verified</span>
                      </div>
                      <div className="flex items-baseline justify-between">
                        <span className="text-xs font-bold">PHA-2026-10292</span>
                        <span className="text-xs font-mono font-extrabold text-primary">1,484.2 m/min</span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Install Sheet Prompt */}
                  <div className="space-y-3">
                    <div className="rounded-xl border border-info/30 bg-info/10 p-3 text-center">
                      <div className="text-sm text-info font-bold animate-bounce leading-none mb-1">↑</div>
                      <p className="text-[11px] text-info leading-snug">
                        Tap <strong>&ldquo;Add to Home Screen&rdquo;</strong> for instant offline loft access
                      </p>
                    </div>
                    {/* iOS Home Indicator Bar */}
                    <div className="mx-auto h-1 w-28 rounded-full bg-white/25" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Pigeon Racing FAQ Section with daisyUI Collapse Accordion (#faq) */}
      <section id="faq" className="relative z-10 py-16 px-4 sm:px-8 border-t border-white/10 bg-base-200/30">
        <div className="mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <span className="badge badge-warning badge-outline font-bold tracking-widest uppercase mb-3">
              FAQ
            </span>
            <h2 className="text-3xl font-extrabold tracking-tight mb-3">
              Frequently Asked Questions
            </h2>
            <p className="text-sm sm:text-base text-base-content/70">
              Everything you need to know about clocking velocities, offline mode, and loft management.
            </p>
          </div>

          <div className="space-y-3">
            <div className="collapse collapse-plus bg-base-200/80 border border-white/10 rounded-xl">
              <input type="radio" name="faq-accordion" defaultChecked />
              <div className="collapse-title font-bold text-base">
                How does FlyMetric calculate pigeon velocity in m/min?
              </div>
              <div className="collapse-content text-sm text-base-content/75 leading-relaxed">
                FlyMetric converts your race or toss distance into meters and divides it by the exact total flight time in minutes (<strong>Velocity = Distance in meters ÷ Flight Minutes</strong>). It also displays secondary readouts in <code>km/h</code> and <code>m/s</code>, and automatically handles next-day arrivals if a bird clocks in the following morning.
              </div>
            </div>

            <div className="collapse collapse-plus bg-base-200/80 border border-white/10 rounded-xl">
              <input type="radio" name="faq-accordion" />
              <div className="collapse-title font-bold text-base">
                Can I log training tosses and clock-ins without internet signal?
              </div>
              <div className="collapse-content text-sm text-base-content/75 leading-relaxed">
                Yes! FlyMetric is built as an <strong>offline-first Progressive Web App (PWA)</strong>. When you are at a remote release point or loft without mobile data, all new events, bird registrations, and clock-in records are queued locally on your device and automatically synced to your cloud database the moment you reconnect.
              </div>
            </div>

            <div className="collapse collapse-plus bg-base-200/80 border border-white/10 rounded-xl">
              <input type="radio" name="faq-accordion" />
              <div className="collapse-title font-bold text-base">
                How does Photo Clock-In Verification work?
              </div>
              <div className="collapse-content text-sm text-base-content/75 leading-relaxed">
                When clocking a bird, you can upload or capture an arrival photo. FlyMetric inspects the image&apos;s embedded camera and timestamp metadata so you and your club can verify authentic arrival times alongside the computed velocity.
              </div>
            </div>

            <div className="collapse collapse-plus bg-base-200/80 border border-white/10 rounded-xl">
              <input type="radio" name="faq-accordion" />
              <div className="collapse-title font-bold text-base">
                Can I track Sire, Dam, and Strain pedigrees in the Bird Registry?
              </div>
              <div className="collapse-content text-sm text-base-content/75 leading-relaxed">
                Absolutely. Each bird in your Loft Registry stores its ring/band number, name, feather color, gender (Cock/Hen), hatch date, strain/bloodline, and <strong>Sire &amp; Dam</strong> parent rings so you can evaluate which bloodlines perform best across races.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Bottom Call-to-Action Card */}
      <section className="relative z-10 py-16 px-4 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="card border border-primary/30 bg-gradient-to-r from-primary/15 via-base-200/90 to-secondary/15 shadow-2xl">
            <div className="card-body p-8 sm:p-10 flex flex-col lg:flex-row items-center justify-between gap-6 text-center lg:text-left">
              <div>
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-2">
                  Ready to Clock Your Next Race?
                </h2>
                <p className="text-base-content/70 max-w-xl">
                  Join pigeon fanciers tracking velocities, pedigrees, and training tosses with FlyMetric.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="btn btn-primary font-extrabold gap-2.5 shadow-lg shadow-primary/25"
                >
                  Launch Your Loft Dashboard
                </button>
                <button
                  type="button"
                  onClick={() => setIsCalcOpen(true)}
                  className="btn btn-outline border-white/15 bg-base-100/60 hover:border-primary/40 hover:text-primary"
                >
                  <CalculatorIcon size={17} />
                  Open Popup Calculator
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Footer */}
      <footer className="relative z-10 border-t border-white/10 bg-base-200/60 py-10 px-4 sm:px-8">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex flex-col items-center sm:items-start gap-2">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-base-200 border border-emerald-500/35">
                <img src="/icon.png" alt="FlyMetric" className="h-6 w-6 object-contain" />
              </div>
              <span className="font-extrabold text-lg">
                Fly<span className="text-primary">Metric</span>
              </span>
            </div>
            <p className="text-xs text-base-content/60">
              © 2026 FlyMetric Racing. Built for professional pigeon fanciers.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <a href="#calculator" className="btn btn-ghost btn-sm border border-white/10">
              Live Calculator
            </a>
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="btn btn-soft btn-warning btn-sm font-bold"
            >
              Log In to Loft Dashboard
            </button>
          </div>
        </div>
      </footer>

      {/* Standalone Speed Calculator Modal (accessible without login) */}
      <SpeedCalculatorModal isOpen={isCalcOpen} onClose={() => setIsCalcOpen(false)} />
    </div>
  )
}
