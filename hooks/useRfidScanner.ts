'use client'

import { useEffect, useRef } from 'react'

interface UseRfidScannerOptions {
  onScan: (tagId: string) => void
  enabled?: boolean
  maxInterKeyMs?: number
  minTagLength?: number
  playAudioBeep?: boolean
}

/**
 * Play an electronic clocking beep using Web Audio API
 */
export function playClockInBeep(frequency = 1400, duration = 0.14) {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioContextClass) return
    const audioCtx = new AudioContextClass()
    const osc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(frequency, audioCtx.currentTime)

    gain.gain.setValueAtTime(0.2, audioCtx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration)

    osc.connect(gain)
    gain.connect(audioCtx.destination)

    osc.start()
    osc.stop(audioCtx.currentTime + duration)
  } catch {
    // Audio context may require user interaction first
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
}: UseRfidScannerOptions) {
  const bufferRef = useRef<string>('')
  const lastKeyTimeRef = useRef<number>(0)
  const onScanRef = useRef(onScan)

  useEffect(() => {
    onScanRef.current = onScan
  }, [onScan])

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
          // Valid RFID sequence captured
          if (playAudioBeep) {
            playClockInBeep()
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
