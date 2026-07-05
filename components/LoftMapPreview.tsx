'use client'

import { useState, useEffect, useRef } from 'react'

interface LoftMapPreviewProps {
  loftLat?: number | null
  loftLng?: number | null
  releaseLat?: number | null
  releaseLng?: number | null
  height?: string
  onMapClick?: (lat: number, lng: number) => void
  clickHint?: string
}

function isValidCoord(lat: number | null | undefined, lng: number | null | undefined): boolean {
  return (
    lat !== null && lat !== undefined &&
    lng !== null && lng !== undefined &&
    !isNaN(lat) && !isNaN(lng) &&
    lat >= -90 && lat <= 90 &&
    lng >= -180 && lng <= 180
  )
}

export default function LoftMapPreview({
  loftLat, loftLng,
  releaseLat, releaseLng,
  height = '240px',
  onMapClick,
  clickHint,
}: LoftMapPreviewProps) {
  const containerRef  = useRef<HTMLDivElement>(null)
  const mapRef        = useRef<any>(null)
  const loftMarkerRef = useRef<any>(null)
  const relMarkerRef  = useRef<any>(null)
  const polylineRef   = useRef<any>(null)
  const fbRef         = useRef<any>(null)
  const lIconRef      = useRef<any>(null)
  const rIconRef      = useRef<any>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [ready, setReady] = useState(false)

  const interactive = !!onMapClick

  const validLL = isValidCoord(loftLat,    loftLng)    ? loftLat    : null
  const validLG = isValidCoord(loftLat,    loftLng)    ? loftLng    : null
  const validRL = isValidCoord(releaseLat, releaseLng) ? releaseLat : null
  const validRG = isValidCoord(releaseLat, releaseLng) ? releaseLng : null

  // ── Initialise Leaflet once on mount ────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    let cancelled = false

    import('leaflet').then(({ default: L }) => {
      if (cancelled || !containerRef.current || mapRef.current) return

      // Inject Leaflet CSS dynamically (avoids SSR issues)
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link')
        link.id   = 'leaflet-css'
        link.rel  = 'stylesheet'
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
        document.head.appendChild(link)
      }

      // Inject dark-tile filter style
      if (!document.getElementById('leaflet-dark-css')) {
        const style = document.createElement('style')
        style.id = 'leaflet-dark-css'
        style.textContent = `
          .leaflet-tile-container { filter: invert(100%) hue-rotate(180deg) brightness(85%) contrast(90%); }
          .leaflet-container { background: #0d1117 !important; }
          .leaflet-bar a { background-color: #161b22 !important; border-bottom: 1px solid #30363d !important; color: #c9d1d9 !important; }
          .leaflet-bar a:hover { background-color: #30363d !important; color: #fff !important; }
          .leaflet-popup-content-wrapper { background: #161b22 !important; color: #c9d1d9 !important; border: 1px solid #30363d !important; border-radius: 8px !important; box-shadow: 0 4px 12px rgba(0,0,0,.5) !important; }
          .leaflet-popup-tip { background: #161b22 !important; }
        `
        document.head.appendChild(style)
      }

      // Fix Leaflet's broken default icon paths under Webpack/Turbopack
      // @ts-ignore
      delete L.Icon.Default.prototype._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      const map = L.map(containerRef.current!, {
        zoomControl:     false,
        touchZoom:       !interactive,
        scrollWheelZoom: true,
      } as any)

      L.control.zoom({ position: 'topright' }).addTo(map)

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom:     19,
        attribution: '© <a href="https://openstreetmap.org">OSM</a>',
      }).addTo(map)

      // Custom gold loft icon
      lIconRef.current = L.icon({
        iconUrl:      'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png',
        shadowUrl:    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize:     [25, 41], iconAnchor:  [12, 41],
        popupAnchor:  [1, -34], shadowSize:  [41, 41],
      })

      // Custom blue release icon
      rIconRef.current = L.icon({
        iconUrl:      'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
        shadowUrl:    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize:     [25, 41], iconAnchor:  [12, 41],
        popupAnchor:  [1, -34], shadowSize:  [41, 41],
      })

      if (interactive) {
        map.on('click', (e: any) => {
          const { lat, lng } = e.latlng
          // Instant gold circle feedback
          if (fbRef.current) map.removeLayer(fbRef.current)
          fbRef.current = L.circleMarker([lat, lng], {
            radius: 14, color: '#FFC107', fillColor: '#FFC107',
            fillOpacity: 0.35, weight: 2.5,
          }).addTo(map)
          onMapClick?.(lat, lng)
        })
      }

      map.setView([12.8797, 121.774], 6)
      mapRef.current = map
      setReady(true)
    }).catch(err => console.error('Leaflet load failed:', err))

    return () => {
      cancelled = true
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [])

  // ── Update markers when coordinates change ──────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return

    const L_any = map as any

    if (loftMarkerRef.current) map.removeLayer(loftMarkerRef.current)
    if (relMarkerRef.current)  map.removeLayer(relMarkerRef.current)
    if (polylineRef.current)   map.removeLayer(polylineRef.current)
    if (fbRef.current)        { map.removeLayer(fbRef.current); fbRef.current = null }

    loftMarkerRef.current = null
    relMarkerRef.current  = null
    polylineRef.current   = null

    const pts: [number, number][] = []

    if (validLL !== null && validLL !== undefined && validLG !== null && validLG !== undefined) {
      const la = validLL as number, lo = validLG as number
      const p: [number, number] = [la, lo]
      pts.push(p)
      import('leaflet').then(({ default: L }) => {
        loftMarkerRef.current = L.marker(p, { icon: lIconRef.current })
          .addTo(map)
          .bindPopup(`<b>🏡 Loft</b><br>${la.toFixed(5)}, ${lo.toFixed(5)}`)
      })
    }

    if (validRL !== null && validRL !== undefined && validRG !== null && validRG !== undefined) {
      const ra = validRL as number, ro = validRG as number
      const p: [number, number] = [ra, ro]
      pts.push(p)
      import('leaflet').then(({ default: L }) => {
        relMarkerRef.current = L.marker(p, { icon: rIconRef.current })
          .addTo(map)
          .bindPopup(`<b>🎯 Release</b><br>${ra.toFixed(5)}, ${ro.toFixed(5)}`)
      })
    }

    import('leaflet').then(({ default: L }) => {
      if (pts.length === 2) {
        polylineRef.current = L.polyline(pts, {
          color: '#FFC107', weight: 3, opacity: 0.85,
          dashArray: '6 10', lineJoin: 'round',
        }).addTo(map)
        map.fitBounds((polylineRef.current as any).getBounds(), { padding: [50, 50] })
      } else if (pts.length === 1) {
        map.setView(pts[0], 12)
        if (loftMarkerRef.current) loftMarkerRef.current.openPopup()
        else if (relMarkerRef.current) relMarkerRef.current.openPopup()
      } else {
        map.setView([12.8797, 121.774], 6)
      }
    })
  }, [validLL, validLG, validRL, validRG, ready])

  // ── Invalidate size when fullscreen changes ─────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => mapRef.current?.invalidateSize(), 120)
    return () => clearTimeout(timer)
  }, [isFullscreen])

  // ── Lock body scroll in fullscreen ──────────────────────────────────────
  useEffect(() => {
    document.body.style.overflow = isFullscreen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isFullscreen])

  const containerStyle: React.CSSProperties = isFullscreen
    ? { position: 'fixed', inset: 0, zIndex: 9999, borderRadius: 0, background: '#0d1117' }
    : { width: '100%', height, borderRadius: '0.75rem',
        border: '1px solid var(--border-default)',
        overflow: 'hidden', position: 'relative', background: '#0d1117' }

  return (
    <div style={containerStyle}>
      {/* Actual map container — Leaflet mounts here */}
      <div
        ref={containerRef}
        style={{ width: '100%', height: '100%', touchAction: interactive ? 'none' : 'pan-x pan-y' }}
      />

      {/* Fullscreen toggle */}
      <button
        type="button"
        onClick={() => setIsFullscreen(f => !f)}
        style={{
          position: 'absolute', top: '0.5rem', left: '0.5rem', zIndex: 1000,
          background: 'rgba(13,17,23,0.88)',
          border: '1px solid rgba(255,193,7,0.45)',
          borderRadius: '6px', color: '#FFC107',
          width: '32px', height: '32px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', fontSize: '15px',
          touchAction: 'manipulation',
          WebkitTapHighlightColor: 'transparent',
        }}
        aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen map'}
      >
        {isFullscreen ? '✕' : '⛶'}
      </button>

      {/* Hint banner */}
      {interactive && (
        <div style={{
          position: 'absolute', bottom: '0.6rem', left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(13,17,23,0.88)', color: '#FFC107',
          fontSize: '11px', fontWeight: 700,
          padding: '5px 12px', borderRadius: '20px',
          border: '1px solid rgba(255,193,7,0.4)',
          pointerEvents: 'none', whiteSpace: 'nowrap', zIndex: 1000,
        }}>
          📍 {isFullscreen ? 'Tap anywhere to pin · ✕ top-left to close' : 'Tap to pin · ⛶ to fullscreen'}
        </div>
      )}
    </div>
  )
}
