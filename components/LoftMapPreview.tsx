'use client'

import { useEffect, useRef } from 'react'

interface LoftMapPreviewProps {
  loftLat?: number | null
  loftLng?: number | null
  releaseLat?: number | null
  releaseLng?: number | null
  height?: string
  onMapClick?: (lat: number, lng: number) => void
  /** Optional hint shown on the map e.g. "Click to set release point" */
  clickHint?: string
}

/** Returns true only for geographically valid coordinates */
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
  loftLat,
  loftLng,
  releaseLat,
  releaseLng,
  height = '240px',
  onMapClick,
  clickHint
}: LoftMapPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // Validate before passing into iframe — this is the key fix
  const validLoftLat   = isValidCoord(loftLat, loftLng)    ? loftLat    : null
  const validLoftLng   = isValidCoord(loftLat, loftLng)    ? loftLng    : null
  const validRelLat    = isValidCoord(releaseLat, releaseLng) ? releaseLat : null
  const validRelLng    = isValidCoord(releaseLat, releaseLng) ? releaseLng : null

  const interactive = !!onMapClick

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map {
      height: 100%;
      margin: 0;
      padding: 0;
      background: #0d1117;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    .leaflet-tile-container {
      filter: invert(100%) hue-rotate(180deg) brightness(85%) contrast(90%);
    }
    .leaflet-container {
      background: #0d1117 !important;
      ${interactive ? 'cursor: crosshair !important;' : ''}
    }
    .leaflet-bar a {
      background-color: #161b22 !important;
      border-bottom: 1px solid #30363d !important;
      color: #c9d1d9 !important;
    }
    .leaflet-bar a:hover {
      background-color: #30363d !important;
      color: #ffffff !important;
    }
    .leaflet-popup-content-wrapper {
      background: #161b22 !important;
      color: #c9d1d9 !important;
      border: 1px solid #30363d !important;
      border-radius: 8px !important;
      box-shadow: 0 4px 12px rgba(0,0,0,0.5) !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    .leaflet-popup-tip {
      background: #161b22 !important;
      border: 1px solid #30363d !important;
    }
    #hint-banner {
      position: absolute;
      bottom: 8px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(13,17,23,0.85);
      color: #FFC107;
      font-size: 11px;
      font-weight: 600;
      padding: 4px 10px;
      border-radius: 20px;
      border: 1px solid rgba(255,193,7,0.35);
      pointer-events: none;
      white-space: nowrap;
      z-index: 1000;
      letter-spacing: 0.02em;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  ${interactive ? `<div id="hint-banner">📍 Tap map to pin release point</div>` : ''}

  <script>
    window.onerror = function(message, source, lineno) {
      console.error("Map iframe error:", message, "line", lineno);
      return false;
    };
  </script>

  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" onload="initMap()"></script>

  <script>
    let map = null;
    let loftMarker = null;
    let releaseMarker = null;
    let polyline = null;
    let pendingCoords = null;
    let lIcon = null;
    let rIcon = null;

    function isValid(lat, lng) {
      return (
        lat !== null && lat !== undefined &&
        lng !== null && lng !== undefined &&
        !isNaN(lat) && !isNaN(lng) &&
        lat >= -90 && lat <= 90 &&
        lng >= -180 && lng <= 180
      );
    }

    function initMap() {
      try {
        map = L.map('map', { zoomControl: false });
        L.control.zoom({ position: 'topright' }).addTo(map);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap'
        }).addTo(map);

        ${interactive ? `
        map.on('click', function(e) {
          // Show a temporary pulsing marker right away for instant feedback
          if (window._clickFeedback) map.removeLayer(window._clickFeedback);
          window._clickFeedback = L.circleMarker([e.latlng.lat, e.latlng.lng], {
            radius: 10,
            color: '#FFC107',
            fillColor: '#FFC107',
            fillOpacity: 0.5,
            weight: 2
          }).addTo(map);

          window.parent.postMessage({
            type: 'MAP_CLICKED',
            lat: e.latlng.lat,
            lng: e.latlng.lng
          }, '*');
        });
        ` : ''}

        lIcon = L.icon({
          iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
          iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
        });

        rIcon = L.icon({
          iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
          iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
        });

        setTimeout(function() { if (map) map.invalidateSize(); }, 150);

        if (pendingCoords) {
          updateMap(pendingCoords.loftLat, pendingCoords.loftLng, pendingCoords.releaseLat, pendingCoords.releaseLng);
        } else {
          map.setView([12.8797, 121.7740], 6);
        }

        window.parent.postMessage({ type: 'MAP_READY' }, '*');
      } catch (err) {
        console.error("Map init failed:", err);
      }
    }

    function updateMap(loftLat, loftLng, releaseLat, releaseLng) {
      if (!map) {
        pendingCoords = { loftLat, loftLng, releaseLat, releaseLng };
        return;
      }

      try {
        map.invalidateSize();

        if (loftMarker)   map.removeLayer(loftMarker);
        if (releaseMarker) map.removeLayer(releaseMarker);
        if (polyline)     map.removeLayer(polyline);
        if (window._clickFeedback) { map.removeLayer(window._clickFeedback); window._clickFeedback = null; }

        loftMarker = null; releaseMarker = null; polyline = null;

        const points = [];

        if (isValid(loftLat, loftLng)) {
          const p = [loftLat, loftLng];
          points.push(p);
          loftMarker = L.marker(p, { icon: lIcon })
            .addTo(map)
            .bindPopup('<b>🏡 Loft Location</b><br>' + loftLat.toFixed(5) + ', ' + loftLng.toFixed(5));
        }

        if (isValid(releaseLat, releaseLng)) {
          const p = [releaseLat, releaseLng];
          points.push(p);
          releaseMarker = L.marker(p, { icon: rIcon })
            .addTo(map)
            .bindPopup('<b>🎯 Release Point</b><br>' + releaseLat.toFixed(5) + ', ' + releaseLng.toFixed(5));
        }

        if (points.length === 2) {
          polyline = L.polyline(points, {
            color: '#FFC107', weight: 3, opacity: 0.8, dashArray: '5, 10', lineJoin: 'round'
          }).addTo(map);
          map.fitBounds(polyline.getBounds(), { padding: [50, 50] });
        } else if (points.length === 1) {
          map.setView(points[0], 12);
          if (loftMarker) loftMarker.openPopup();
          else if (releaseMarker) releaseMarker.openPopup();
        } else {
          map.setView([12.8797, 121.7740], 6);
        }
      } catch (err) {
        console.error("Map update failed:", err);
      }
    }

    window.addEventListener('message', function(event) {
      if (event.data && event.data.type === 'UPDATE_COORDS') {
        var d = event.data;
        updateMap(d.loftLat, d.loftLng, d.releaseLat, d.releaseLng);
      }
    });
  </script>
</body>
</html>
  `

  // Initialize iframe document exactly once on mount
  useEffect(() => {
    const iframe = iframeRef.current
    if (iframe) {
      const doc = iframe.contentDocument || iframe.contentWindow?.document
      if (doc) {
        doc.open()
        doc.write(htmlContent)
        doc.close()
      }
    }
  }, [])

  const sendCoords = () => {
    const iframe = iframeRef.current
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage({
        type: 'UPDATE_COORDS',
        loftLat:    validLoftLat ?? null,
        loftLng:    validLoftLng ?? null,
        releaseLat: validRelLat  ?? null,
        releaseLng: validRelLng  ?? null,
      }, '*')
    }
  }

  // Send coords whenever valid props change
  useEffect(() => {
    sendCoords()
  }, [validLoftLat, validLoftLng, validRelLat, validRelLng])

  // Listen for MAP_READY and MAP_CLICKED from iframe
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'MAP_READY') {
        sendCoords()
      } else if (e.data?.type === 'MAP_CLICKED') {
        onMapClick?.(e.data.lat, e.data.lng)
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [validLoftLat, validLoftLng, validRelLat, validRelLng, onMapClick])

  return (
    <div style={{
      width: '100%',
      height,
      borderRadius: '0.75rem',
      border: '1px solid var(--border-default)',
      overflow: 'hidden',
      position: 'relative',
      background: '#0d1117'
    }}>
      <iframe
        ref={iframeRef}
        title="Flight Distance Map Preview"
        style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
      />
    </div>
  )
}
