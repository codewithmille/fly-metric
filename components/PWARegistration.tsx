'use client'

import { useEffect } from 'react'

export default function PWARegistration() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // Clean up service workers in development to prevent HMR caching reload loops
      if (process.env.NODE_ENV !== 'production') {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          let reloaded = false
          for (const registration of registrations) {
            registration.unregister().then((success) => {
              if (success && !reloaded) {
                console.log('Cleaned up active Service Worker in development mode.')
                reloaded = true
                window.location.reload()
              }
            })
          }
        })
        return
      }

      // Register service worker in production
      const registerSW = () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            console.log('PWA Service Worker registered with scope:', registration.scope)
          })
          .catch((error) => {
            console.error('PWA Service Worker registration failed:', error)
          })
      }

      // Check document readiness to ensure it doesn't block critical page load
      if (document.readyState === 'complete') {
        registerSW()
      } else {
        window.addEventListener('load', registerSW)
        return () => window.removeEventListener('load', registerSW)
      }
    }
  }, [])

  return null
}
