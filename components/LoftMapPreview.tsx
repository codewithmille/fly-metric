'use client'

import { useEffect, useRef } from 'react'

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
  loftLat,
  loftLng,
  releaseLat,
  releaseLng,
  height = '240px',
  onMapClick,
  clickHint
}: LoftMapPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const validLoftLat = isValidCoord(loftLat, loftLng)       ? loftLat    : null
  const validLoftLng = isValidCoord(loftLat, loftLng)       ? loftLng    : null
  const validRelLat  = isValidCoord(releaseLat, releaseLng) ? releaseLat : null
  const validRelLng  = isValidCoord(releaseLat, releaseLng) ? releaseLng : null

  const interactive = !!onMapClick

  const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    * { box-sizing: border-box; }
    html, body {
      height: 100%; margin: 0; padding: 0;
      background: #0d1117;
      /* Kill iOS/Android tap delay entirely */
      touch-action: manipulation;
      -webkit-tap-highlight-color: transparent;
    }
    #map {
      height: 100%;
      touch-action: ${interactive ? 'none' : 'pan-x pan-y'};
      -webkit-tap-highlight-color: transparent;
    }
    .leaflet-tile-container {
      filter: invert(100%) hue-rotate(180deg) brightness(85%) contrast(90%);
    }
    .leaflet-container {
      background: #0d1117 !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      ${interactive ? 'cursor: crosshair !important;' : ''}
      touch-action: ${interactive ? 'none' : 'pan-x pan-y'} !important;
      -webkit-tap-highlight-color: transparent !important;
    }
    .leaflet-bar a {
      background-color: #161b22 !important;
      border-bottom: 1px solid #30363d !important;
      color: #c9d1d9 !important;
      touch-action: manipulation;
    }
    .leaflet-bar a:hover { background-color: #30363d !important; color: #fff !important; }
    .leaflet-popup-content-wrapper {
      background: #161b22 !important; color: #c9d1d9 !important;
      border: 1px solid #30363d !important; border-radius: 8px !important;
      box-shadow: 0 4px 12px rgba(0,0,0,0.5) !important;
    }
    .leaflet-popup-tip { background: #161b22 !important; border: 1px solid #30363d !important; }
    #hint-banner {
      position: absolute; bottom: 8px; left: 50%; transform: translateX(-50%);
      background: rgba(13,17,23,0.88); color: #FFC107;
      font-size: 11px; font-weight: 700; padding: 5px 12px;
      border-radius: 20px; border: 1px solid rgba(255,193,7,0.4);
      pointer-events: none; white-space: nowrap; z-index: 1000;
      letter-spacing: 0.03em;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  ${interactive ? '<div id="hint-banner">📍 Tap map to pin location</div>' : ''}

  <script>
    window.onerror = function(msg, src, line) {
      console.error('Map iframe error:', msg, 'line', line);
      return false;
    };
  </script>

  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" onload="initMap()"></script>

  <script>
    var map = null;
    var loftMarker = null;
    var releaseMarker = null;
    var pathLine = null;
    var pendingCoords = null;
    var lIcon = null;
    var rIcon = null;
    var _clickFeedback = null;
    // Prevents touchend and click from both firing
    var _lastTouchEnd = 0;

    function isValid(lat, lng) {
      return (
        lat !== null && lat !== undefined &&
        lng !== null && lng !== undefined &&
        !isNaN(lat) && !isNaN(lng) &&
        lat >= -90 && lat <= 90 &&
        lng >= -180 && lng <= 180
      );
    }

    function postPin(lat, lng) {
      // Show instant yellow circle feedback
      if (_clickFeedback) { map.removeLayer(_clickFeedback); }
      _clickFeedback = L.circleMarker([lat, lng], {
        radius: 14, color: '#FFC107', fillColor: '#FFC107',
        fillOpacity: 0.35, weight: 2.5
      }).addTo(map);

      window.parent.postMessage({ type: 'MAP_CLICKED', lat: lat, lng: lng }, '*');
    }

    function initMap() {
      try {
        map = L.map('map', {
          zoomControl: false,
          tap: true,          // Leaflet mobile tap handler
          tapTolerance: 15,   // px tolerance for mobile taps
          touchZoom: ${interactive ? 'false' : 'true'},
          dragging: true,
          scrollWheelZoom: true
        });

        L.control.zoom({ position: 'topright' }).addTo(map);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap'
        }).addTo(map);

        ${interactive ? `
        // ---------- PRIMARY: Leaflet click (desktop + some mobile) ----------
        map.on('click', function(e) {
          var now = Date.now();
          // Skip if a touchend just fired within 400ms (dedup)
          if (now - _lastTouchEnd < 400) return;
          postPin(e.latlng.lat, e.latlng.lng);
        });

        // ---------- FALLBACK: Raw touchend (iOS Safari iframe fix) ----------
        var mapEl = document.getElementById('map');
        mapEl.addEventListener('touchend', function(e) {
          // Only handle single-finger tap (not pan/pinch)
          if (e.changedTouches.length !== 1) return;

          var touch = e.changedTouches[0];
          var rect = mapEl.getBoundingClientRect();
          var containerPoint = L.point(
            touch.clientX - rect.left,
            touch.clientY - rect.top
          );
          var latlng = map.containerPointToLatLng(containerPoint);

          _lastTouchEnd = Date.now();
          e.preventDefault(); // Prevent ghost click
          postPin(latlng.lat, latlng.lng);
        }, { passive: false });
        ` : ''}

        lIcon = L.icon({
          iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
          iconSize: [25,41], iconAnchor: [12,41], popupAnchor: [1,-34], shadowSize: [41,41]
        });
        rIcon = L.icon({
          iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
          iconSize: [25,41], iconAnchor: [12,41], popupAnchor: [1,-34], shadowSize: [41,41]
        });

        setTimeout(function() { if (map) map.invalidateSize(); }, 150);

        if (pendingCoords) {
          updateMap(pendingCoords.loftLat, pendingCoords.loftLng,
                    pendingCoords.releaseLat, pendingCoords.releaseLng);
        } else {
          map.setView([12.8797, 121.7740], 6);
        }

        window.parent.postMessage({ type: 'MAP_READY' }, '*');
      } catch(err) {
        console.error('Map init failed:', err);
      }
    }

    function updateMap(loftLat, loftLng, releaseLat, releaseLng) {
      if (!map) {
        pendingCoords = { loftLat: loftLat, loftLng: loftLng, releaseLat: releaseLat, releaseLng: releaseLng };
        return;
      }
      try {
        map.invalidateSize();
        if (loftMarker)    map.removeLayer(loftMarker);
        if (releaseMarker) map.removeLayer(releaseMarker);
        if (pathLine)      map.removeLayer(pathLine);
        if (_clickFeedback){ map.removeLayer(_clickFeedback); _clickFeedback = null; }
        loftMarker = null; releaseMarker = null; pathLine = null;

        var points = [];

        if (isValid(loftLat, loftLng)) {
          var lp = [loftLat, loftLng];
          points.push(lp);
          loftMarker = L.marker(lp, { icon: lIcon }).addTo(map)
            .bindPopup('<b>🏡 Loft</b><br>' + loftLat.toFixed(5) + ', ' + loftLng.toFixed(5));
        }
        if (isValid(releaseLat, releaseLng)) {
          var rp = [releaseLat, releaseLng];
          points.push(rp);
          releaseMarker = L.marker(rp, { icon: rIcon }).addTo(map)
            .bindPopup('<b>🎯 Release Point</b><br>' + releaseLat.toFixed(5) + ', ' + releaseLng.toFixed(5));
        }

        if (points.length === 2) {
          pathLine = L.polyline(points, {
            color: '#FFC107', weight: 3, opacity: 0.85, dashArray: '6 10', lineJoin: 'round'
          }).addTo(map);
          map.fitBounds(pathLine.getBounds(), { padding: [50, 50] });
        } else if (points.length === 1) {
          map.setView(points[0], 12);
          if (loftMarker) loftMarker.openPopup();
          else if (releaseMarker) releaseMarker.openPopup();
        } else {
          map.setView([12.8797, 121.7740], 6);
        }
      } catch(err) {
        console.error('Map update failed:', err);
      }
    }

    window.addEventListener('message', function(e) {
      if (e.data && e.data.type === 'UPDATE_COORDS') {
        updateMap(e.data.loftLat, e.data.loftLng, e.data.releaseLat, e.data.releaseLng);
      }
    });
  </script>
</body>
</html>`

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
    if (iframe?.contentWindow) {
      iframe.contentWindow.postMessage({
        type: 'UPDATE_COORDS',
        loftLat:    validLoftLat ?? null,
        loftLng:    validLoftLng ?? null,
        releaseLat: validRelLat  ?? null,
        releaseLng: validRelLng  ?? null,
      }, '*')
    }
  }

  useEffect(() => { sendCoords() }, [validLoftLat, validLoftLng, validRelLat, validRelLng])

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
      background: '#0d1117',
      // Ensure touch events reach the iframe on Android
      WebkitOverflowScrolling: 'touch',
    }}>
      <iframe
        ref={iframeRef}
        title="Flight Distance Map Preview"
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          display: 'block',
          // Must be explicit — some browsers default pointer-events to none on iframes
          pointerEvents: 'auto',
        }}
      />
    </div>
  )
}
