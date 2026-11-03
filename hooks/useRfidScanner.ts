'use client'

import { useEffect, useRef } from 'react'

interface UseRfidScannerOptions {
  onScan: (tagId: string) => void
  enabled?: boolean
  maxInterKeyMs?: number
  minTagLength?: number
  playAudioBeep?: boolean
  keepScreenAwake?: boolean
}

let wakeLockSentinel: any = null

/**
 * Screen Wake Lock API to prevent phone/tablet screen from sleeping or locking
 * during loft trap monitoring sessions.
 */
export async function requestScreenWakeLock(): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
      wakeLockSentinel = await (navigator as any).wakeLock.request('screen')
      wakeLockSentinel.addEventListener('release', () => {
        wakeLockSentinel = null
      })
      return true
    }
  } catch (e) {
    // Wake Lock may fail if tab is not active or battery saver is strictly enforced
    console.warn('Wake Lock request:', e)
  }
  return false
}

export function releaseScreenWakeLock() {
  try {
    if (wakeLockSentinel) {
      wakeLockSentinel.release()
      wakeLockSentinel = null
    }
  } catch {}
}

/**
 * Play an electronic clocking beep using Web Audio API
 */
export function playClockInBeep(frequency = 1400, duration = 0.14) {
  playElectronicChime(true)
}

/**
 * Play a crisp dual-tone Unikon/Benzing electronic clocking chime
 */
export function playElectronicChime(success = true) {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioContextClass) return
    const audioCtx = new AudioContextClass()
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {})
    }

    if (success) {
      // High pitch double-chime (1400Hz -> 1900Hz)
      const now = audioCtx.currentTime
      const osc1 = audioCtx.createOscillator()
      const gain1 = audioCtx.createGain()
      osc1.type = 'sine'
      osc1.frequency.setValueAtTime(1400, now)
      gain1.gain.setValueAtTime(0.3, now)
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.12)
      osc1.connect(gain1)
      gain1.connect(audioCtx.destination)
      osc1.start(now)
      osc1.stop(now + 0.12)

      const osc2 = audioCtx.createOscillator()
      const gain2 = audioCtx.createGain()
      osc2.type = 'sine'
      osc2.frequency.setValueAtTime(1900, now + 0.1)
      gain2.gain.setValueAtTime(0.35, now + 0.1)
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.28)
      osc2.connect(gain2)
      gain2.connect(audioCtx.destination)
      osc2.start(now + 0.1)
      osc2.stop(now + 0.28)
    } else {
      // Warning double tone (550Hz -> 420Hz)
      const now = audioCtx.currentTime
      const osc = audioCtx.createOscillator()
      const gain = audioCtx.createGain()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(550, now)
      osc.frequency.setValueAtTime(420, now + 0.12)
      gain.gain.setValueAtTime(0.25, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28)
      osc.connect(gain)
      gain.connect(audioCtx.destination)
      osc.start(now)
      osc.stop(now + 0.28)
    }
  } catch {
    // Audio context may require user interaction first
  }
}

/**
 * Text-to-speech announcement for loft arrivals
 */
export function speakPigeonArrival(text: string) {
  try {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel() // clear any preceding speech
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 1.05
      utterance.pitch = 1.05
      utterance.volume = 1
      window.speechSynthesis.speak(utterance)
    }
  } catch {
    // Speech synthesis unsupported or blocked
  }
}

/**
 * Custom hook to detect 125kHz / 13.56MHz USB RFID proximity scanners (HID keyboard emulation).
 * USB RFID readers stream characters rapidly (<60ms apart) followed by an Enter key.
 */
export function useRfidScanner({
  onScan,
  enabled = true,
  maxInterKeyMs = 90,
  minTagLength = 5,
  playAudioBeep = true,
  keepScreenAwake = true,
}: UseRfidScannerOptions) {
  const bufferRef = useRef<string>('')
  const lastKeyTimeRef = useRef<number>(0)
  const onScanRef = useRef(onScan)

  useEffect(() => {
    onScanRef.current = onScan
  }, [onScan])

  // Maintain Screen Wake Lock so mobile phone doesn't sleep or lock during loft arrival monitoring
  useEffect(() => {
    if (!enabled || !keepScreenAwake) {
      releaseScreenWakeLock()
      return
    }

    requestScreenWakeLock()

    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && enabled && keepScreenAwake) {
        requestScreenWakeLock()
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      releaseScreenWakeLock()
    }
  }, [enabled, keepScreenAwake])

  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore modifier combinations (Ctrl, Alt, Meta)
      if (e.ctrlKey || e.altKey || e.metaKey) return

      const now = Date.now()
      const timeDiff = now - lastKeyTimeRef.current

      if (e.key === 'Enter') {
        const tag = bufferRef.current.trim()
        if (tag.length >= minTagLength) {
          // Prevent submitting any active focused form or button
          e.preventDefault()
          e.stopPropagation()
          if (playAudioBeep) {
            playElectronicChime(true)
          }
          onScanRef.current(tag)
        }
        bufferRef.current = ''
        return
      }

      // Check if this is a single character (numbers 0-9, letters A-F for hex tags)
      if (e.key.length === 1) {
        if (timeDiff > maxInterKeyMs) {
          // Too slow to be part of the preceding barcode/RFID burst, start new buffer
          bufferRef.current = e.key
        } else {
          bufferRef.current += e.key
        }
        lastKeyTimeRef.current = now
      }
    }

    window.addEventListener('keydown', handleKeyDown, true)
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true)
    }
  }, [enabled, maxInterKeyMs, minTagLength, playAudioBeep])
}
