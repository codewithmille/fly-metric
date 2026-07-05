import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'FlyMetric — Pigeon Racing Clocking System',
    short_name: 'FlyMetric',
    description: 'Professional pigeon racing clocking dashboard. Track race events, calculate velocity in yards per minute, and manage your loft calendar with FlyMetric.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0d1117',
    theme_color: '#161b22',
    icons: [
      {
        src: '/icon.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: '/icon.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: '/apple-touch-icon.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable'
      }
    ],
  }
}
