'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { BirdIcon, CalculatorIcon, TrainingIcon, TrophyIcon, LightningIcon } from '@/components/icons'
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
      className="min-h-screen bg-base-100 text-base-content relative overflow-x-hidden selection:bg-primary/30 selection:text-primary"
    >
      {/* Ambient Dark Glows + Subtle Grid Backdrop */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
            maskImage: 'radial-gradient(ellipse 80% 55% at 50% 0%, #000 60%, transparent 100%)',
            WebkitMaskImage: 'radial-gradient(ellipse 80% 55% at 50% 0%, #000 60%, transparent 100%)',
          }}
        />
        <div className="absolute -top-32 -left-32 h-[480px] w-[480px] rounded-full bg-primary/15 blur-[130px]" />
        <div className="absolute top-1/3 right-[-120px] h-[520px] w-[520px] rounded-full bg-secondary/15 blur-[140px]" />
        <div className="absolute bottom-0 left-1/3 h-[400px] w-[400px] rounded-full bg-accent/10 blur-[130px]" />
      </div>

      {/* 1. Sticky daisyUI Navbar + Mobile Dropdown */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-base-100/80 backdrop-blur-xl">
        <div className="navbar mx-auto max-w-7xl px-4 sm:px-8 h-16">
          <div className="navbar-start gap-2">
            {/* Mobile Dropdown Menu */}
            <div className="dropdown lg:hidden">
              <div tabIndex={0} role="button" aria-label="Open menu" className="btn btn-ghost btn-sm btn-square">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h7" />
                </svg>
              </div>
              <ul
                tabIndex={0}
                className="menu menu-sm dropdown-content mt-3 z-50 p-2 shadow-2xl bg-base-200 border border-white/10 rounded-box w-56 gap-1"
              >
                <li><a href="#features">✨ Features</a></li>
                <li><a href="#calculator">🧮 Live Speed Calculator</a></li>
                <li><a href="#install">📲 PWA Install Guide</a></li>
                <li><a href="#faq">❓ Racing FAQ</a></li>
              </ul>
            </div>

            <a href="#" className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-base-200/90 border border-emerald-500/35 shadow-md shadow-emerald-500/15">
                <img src="/icon.png" alt="FlyMetric" className="h-7 w-7 object-contain" />
              </div>
              <span className="text-xl font-extrabold tracking-tight">
                Fly<span className="text-primary">Metric</span>
              </span>
            </a>
            <span className="badge badge-warning badge-outline badge-xs hidden sm:inline-flex font-bold ml-1">
              PWA v2.0
            </span>
          </div>

          <div className="navbar-center hidden lg:flex">
            <ul className="menu menu-horizontal gap-1 px-1 text-sm font-medium text-base-content/75">
              <li><a href="#features" className="rounded-lg hover:text-base-content">Features</a></li>
              <li><a href="#calculator" className="rounded-lg hover:text-primary">Live Calculator</a></li>
              <li><a href="#install" className="rounded-lg hover:text-base-content">PWA Install</a></li>
              <li><a href="#faq" className="rounded-lg hover:text-base-content">FAQ</a></li>
            </ul>
          </div>

          <div className="navbar-end gap-2">
            <button
              type="button"
              onClick={() => setIsCalcOpen(true)}
              className="btn btn-ghost btn-sm hidden sm:inline-flex border border-white/10 bg-base-200/60 hover:border-primary/40 hover:text-primary"
            >
              <CalculatorIcon size={15} />
              Quick Calc
            </button>
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="btn btn-primary btn-sm font-extrabold shadow-md shadow-primary/20"
            >
              Sign In
            </button>
          </div>
        </div>
      </header>

      {/* 2. Hero Section + Interactive daisyUI Mockup Window */}
      <section className="relative z-10 mx-auto max-w-7xl px-4 pt-12 pb-20 sm:px-8 lg:pt-16 lg:pb-24">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12">
          {/* Left Column: Copy & CTAs */}
          <div className="lg:col-span-6 flex flex-col items-center text-center lg:items-start lg:text-left">
            <div className="badge badge-warning badge-outline gap-2 py-3.5 px-4 mb-6 bg-primary/10 border-primary/30 text-xs font-bold tracking-wider uppercase">
              <span className="inline-block h-2 w-2 rounded-full bg-primary animate-pulse" />
              ⚡ Offline-First Pigeon Racing PWA
            </div>

            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl leading-[1.08] mb-6">
              Modernize Your{' '}
              <span className="bg-gradient-to-r from-amber-300 via-primary to-amber-500 bg-clip-text text-transparent">
                Pigeon Racing
              </span>{' '}
              Loft
            </h1>

            <p className="text-base sm:text-lg text-base-content/70 leading-relaxed mb-8 max-w-xl">
              The professional clocking &amp; loft management dashboard for pigeon fanciers. Compute exact velocity in{' '}
              <span className="font-semibold text-base-content">meters per minute (m/min)</span>, verify clock-in photos, track bloodlines &amp; medical schedules, and log training tosses—100% offline-ready.
            </p>

            {/* Primary & Secondary CTAs */}
            <div className="flex flex-col sm:flex-row items-center gap-3.5 w-full sm:w-auto mb-8">
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading}
                className="btn btn-primary btn-lg w-full sm:w-auto font-extrabold shadow-xl shadow-primary/25 border border-amber-300/40 gap-3"
              >
                {loading ? (
                  <>
                    <span className="loading loading-spinner loading-sm" />
                    Redirecting to Google…
                  </>
                ) : (
                  <>
                    <span className="flex h-7 w-7 items-center justify-center rounded-md bg-white shadow-sm">
                      <svg width="16" height="16" viewBox="0 0 48 48">
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                      </svg>
                    </span>
                    Continue with Google
                  </>
                )}
              </button>

              <a
                href="#calculator"
                className="btn btn-outline btn-lg w-full sm:w-auto border-white/15 bg-base-200/60 hover:bg-base-200 hover:border-primary/50 hover:text-primary font-semibold gap-2"
              >
                <CalculatorIcon size={18} />
                Try Live Calculator
              </a>
            </div>

            {error && (
              <div role="alert" className="alert alert-error alert-soft mb-6 py-2.5 text-sm">
                <span>{error}</span>
              </div>
            )}

            {/* daisyUI Stats Strip */}
            <div className="stats stats-vertical sm:stats-horizontal w-full border border-white/10 bg-base-200/60 backdrop-blur-md shadow-lg">
              <div className="stat py-3 px-4">
                <div className="stat-title text-xs uppercase tracking-wider text-base-content/60">Offline Support</div>
                <div className="stat-value text-xl text-primary font-extrabold">100%</div>
                <div className="stat-desc text-xs">Local Queue &amp; Sync</div>
              </div>
              <div className="stat py-3 px-4">
                <div className="stat-title text-xs uppercase tracking-wider text-base-content/60">Velocity Unit</div>
                <div className="stat-value text-xl text-info font-extrabold">m/min</div>
                <div className="stat-desc text-xs">+ km/h &amp; m/s</div>
              </div>
              <div className="stat py-3 px-4">
                <div className="stat-title text-xs uppercase tracking-wider text-base-content/60">Clock-In Proof</div>
                <div className="stat-value text-xl text-success font-extrabold">EXIF</div>
                <div className="stat-desc text-xs">Photo Verification</div>
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
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-lg">
                📸
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
      <section id="calculator" className="relative z-10 py-16 px-4 sm:px-8 border-t border-white/10 bg-base-200/30">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-5 space-y-4">
              <span className="badge badge-warning badge-outline font-bold tracking-widest uppercase">
                Live Interactive Tool
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                Test the Pigeon Velocity Calculator
              </h2>
              <p className="text-base-content/70 leading-relaxed text-sm sm:text-base">
                Try calculating a race or training toss right now. Adjust the release distance slider or pick a preset toss distance below to see instant speed calculations in <strong className="text-primary">meters per minute (m/min)</strong>, <strong className="text-info">km/h</strong>, and <strong className="text-success">m/s</strong>.
              </p>

              {/* Quick Distance Presets */}
              <div className="space-y-2 pt-1">
                <span className="text-xs font-bold uppercase tracking-wider text-base-content/50">
                  Quick Race Presets:
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
                      className={`btn btn-xs sm:btn-sm ${
                        inlineDistance === p.dist && inlineUnit === 'km'
                          ? 'btn-primary font-bold'
                          : 'btn-ghost border border-white/10 bg-base-200/60'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Interactive daisyUI Calculator Card */}
            <div className="lg:col-span-7">
              <div className="card bg-base-200/80 border border-white/10 shadow-2xl backdrop-blur-xl">
                <div className="card-body p-6 sm:p-8 space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary border border-primary/30">
                        <CalculatorIcon size={20} />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-base">Real-Time Velocity Sandbox</h3>
                        <p className="text-xs text-base-content/60">Formula: Distance (meters) ÷ Flight Time (minutes)</p>
                      </div>
                    </div>
                    <span className="badge badge-success badge-soft badge-sm font-mono font-bold">
                      LIVE COMPUTATION
                    </span>
                  </div>

                  {/* Distance Slider + Join Input */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-base-content/80">📏 Flight Distance ({inlineUnit})</span>
                      <span className="text-primary font-mono text-sm">
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
                      className="range range-warning range-xs w-full"
                    />
                    <div className="join w-full pt-1">
                      <input
                        type="number"
                        min={1}
                        value={inlineDistance}
                        onChange={(e) => setInlineDistance(Math.max(0, Number(e.target.value)))}
                        className="input input-bordered input-sm join-item w-full bg-base-100 border-white/10 font-mono"
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
                        className="select select-bordered select-sm join-item bg-base-300 border-white/10 font-bold"
                      >
                        <option value="km">km</option>
                        <option value="m">meters</option>
                      </select>
                    </div>
                  </div>

                  {/* Release & Arrival Inputs */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="label py-1">
                        <span className="label-text text-xs font-bold text-base-content/80">⏰ Release Time</span>
                      </label>
                      <input
                        type="time"
                        step="1"
                        value={inlineRelease}
                        onChange={(e) => setInlineRelease(e.target.value)}
                        className="input input-bordered input-sm w-full bg-base-100 border-white/10 font-mono"
                      />
                    </div>
                    <div>
                      <label className="label py-1">
                        <span className="label-text text-xs font-bold text-base-content/80">⏱️ Arrival Time</span>
                      </label>
                      <input
                        type="time"
                        step="1"
                        value={inlineArrival}
                        onChange={(e) => setInlineArrival(e.target.value)}
                        className="input input-bordered input-sm w-full bg-base-100 border-white/10 font-mono"
                      />
                    </div>
                  </div>

                  {/* Live Output daisyUI Stats */}
                  <div className="stats stats-vertical sm:stats-horizontal w-full bg-base-100 border border-white/10 shadow-inner">
                    <div className="stat py-3 px-4">
                      <div className="stat-title text-[11px] uppercase font-bold text-base-content/60">Velocity (Standard)</div>
                      <div className="stat-value text-2xl text-primary font-mono font-black">
                        {inlineValid ? `${inlineMmin.toFixed(2)}` : '—'}
                      </div>
                      <div className="stat-desc text-xs font-semibold text-primary/80">meters / minute (m/min)</div>
                    </div>
                    <div className="stat py-3 px-4">
                      <div className="stat-title text-[11px] uppercase font-bold text-base-content/60">Speed (km/h &amp; m/s)</div>
                      <div className="stat-value text-xl text-info font-mono font-extrabold">
                        {inlineValid ? `${inlineKmh.toFixed(1)} km/h` : '—'}
                      </div>
                      <div className="stat-desc text-xs font-mono text-success">
                        {inlineValid ? `${inlineMs.toFixed(2)} m/s` : '—'}
                      </div>
                    </div>
                    <div className="stat py-3 px-4">
                      <div className="stat-title text-[11px] uppercase font-bold text-base-content/60">Flight Duration</div>
                      <div className="stat-value text-xl text-base-content font-mono font-bold">
                        {inlineDuration}
                      </div>
                      <div className="stat-desc text-xs">Auto next-day support</div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <span className="text-xs text-base-content/60">
                      Want to save this result to your pigeon&apos;s ring record?
                    </span>
                    <button
                      type="button"
                      onClick={handleGoogleLogin}
                      className="btn btn-primary btn-sm font-bold"
                    >
                      Save to Loft Registry →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Capabilities / 6-Card Bento Features Grid (#features) */}
      <section id="features" className="relative z-10 border-t border-b border-white/10 bg-base-200/40 py-20 px-4 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-2xl text-center mb-14">
            <span className="badge badge-warning badge-outline font-bold tracking-widest uppercase mb-3">
              Capabilities
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4">
              Built Specifically for Pigeon Racers
            </h2>
            <p className="text-base-content/70">
              Every tool you need to compute race speeds, verify clock-in timestamps, manage bloodlines, and condition your birds in a modern dark UI.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Card 1 */}
            <div className="card bg-base-200/70 border border-white/10 hover:border-primary/40 transition-all duration-200 shadow-xl hover:-translate-y-1">
              <div className="card-body p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 text-primary border border-primary/25">
                    <CalculatorIcon size={24} />
                  </div>
                  <span className="badge badge-ghost badge-sm border-white/10 font-mono">m/min • km/h • m/s</span>
                </div>
                <h3 className="card-title text-lg font-bold">Precision Velocity Calculator</h3>
                <p className="text-sm text-base-content/70 leading-relaxed">
                  Input release time, clock-in arrival, and flight distance in km or meters. Instantly computes flight duration (including multi-day arrivals) and velocity in <strong className="text-base-content">meters per minute (m/min)</strong>.
                </p>
              </div>
            </div>

            {/* Card 2 */}
            <div className="card bg-base-200/70 border border-white/10 hover:border-primary/40 transition-all duration-200 shadow-xl hover:-translate-y-1">
              <div className="card-body p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary/15 text-secondary border border-secondary/25">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                  </div>
                  <span className="badge badge-ghost badge-sm border-white/10">List &amp; Calendar</span>
                </div>
                <h3 className="card-title text-lg font-bold">Loft Activity &amp; Race Calendar</h3>
                <p className="text-sm text-base-content/70 leading-relaxed">
                  Color-coded schedule tracks every loft routine. Toggle between chronological list view and monthly calendar for official races, training tosses, vaccinations, and daily loft tasks.
                </p>
              </div>
            </div>

            {/* Card 3 */}
            <div className="card bg-base-200/70 border border-white/10 hover:border-primary/40 transition-all duration-200 shadow-xl hover:-translate-y-1">
              <div className="card-body p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success/15 text-success border border-success/25">
                    <BirdIcon size={24} />
                  </div>
                  <span className="badge badge-ghost badge-sm border-white/10">Pedigree &amp; Rings</span>
                </div>
                <h3 className="card-title text-lg font-bold">Bird Registry &amp; Bloodlines</h3>
                <p className="text-sm text-base-content/70 leading-relaxed">
                  Digitize your loft ledger. Record band/ring numbers, feather colors, gender (Cock/Hen), strain, and <strong className="text-base-content">Sire &amp; Dam pedigree lineage</strong> for instant race-day lookup.
                </p>
              </div>
            </div>

            {/* Card 4 */}
            <div className="card bg-base-200/70 border border-white/10 hover:border-primary/40 transition-all duration-200 shadow-xl hover:-translate-y-1">
              <div className="card-body p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-info/15 text-info border border-info/25">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                      <circle cx="12" cy="13" r="4" />
                    </svg>
                  </div>
                  <span className="badge badge-ghost badge-sm border-white/10">Timestamp Proof</span>
                </div>
                <h3 className="card-title text-lg font-bold">Photo Clock-In Verification</h3>
                <p className="text-sm text-base-content/70 leading-relaxed">
                  Inspect and verify arrival clock-in photos with embedded timestamp and camera EXIF metadata for transparent, accurate club race verification.
                </p>
              </div>
            </div>

            {/* Card 5 */}
            <div className="card bg-base-200/70 border border-white/10 hover:border-primary/40 transition-all duration-200 shadow-xl hover:-translate-y-1">
              <div className="card-body p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/15 text-accent border border-accent/25">
                    <TrainingIcon size={24} />
                  </div>
                  <span className="badge badge-ghost badge-sm border-white/10">Smart Conditioning</span>
                </div>
                <h3 className="card-title text-lg font-bold">Training Programs &amp; AI Advisor</h3>
                <p className="text-sm text-base-content/70 leading-relaxed">
                  Follow structured road-training toss progressions and consult the built-in <strong className="text-base-content">AI Pigeon Advisor</strong> for conditioning, nutrition, and recovery schedules.
                </p>
              </div>
            </div>

            {/* Card 6 */}
            <div className="card bg-base-200/70 border border-white/10 hover:border-primary/40 transition-all duration-200 shadow-xl hover:-translate-y-1">
              <div className="card-body p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-warning/15 text-warning border border-warning/25">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                    </svg>
                  </div>
                  <span className="badge badge-ghost badge-sm border-white/10">Zero Signal Ready</span>
                </div>
                <h3 className="card-title text-lg font-bold">Offline-First PWA Cloud Sync</h3>
                <p className="text-sm text-base-content/70 leading-relaxed">
                  Clock birds at remote release points without mobile data. Entries are stored locally on your device and automatically synchronize to the cloud once reconnected.
                </p>
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
                    <div className="w-14 flex items-center justify-end gap-1 text-[10px] font-mono text-success">
                      <span>5G</span>
                      <span>🔋</span>
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
