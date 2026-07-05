'use client'

import { useEffect, useRef } from 'react'

interface LoftMapPreviewProps {
  loftLat?: number | null
  loftLng?: number | null
  releaseLat?: number | null
  releaseLng?: number | null
  height?: string
}

export default function LoftMapPreview({
  loftLat,
  loftLng,
  releaseLat,
  releaseLng,
  height = '240px'
}: LoftMapPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)

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
    }
    /* Dark mode OSM Tiles override using CSS filters */
    .leaflet-tile-container {
      filter: invert(100%) hue-rotate(180deg) brightness(85%) contrast(90%);
    }
    .leaflet-container {
      background: #0d1117 !important;
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
  </style>
</head>
<body>
  <div id="map"></div>
  
  <script>
    // Redirect iframe errors to parent console for debugging
    window.onerror = function(message, source, lineno, colno, error) {
      console.error("Leaflet Iframe Error:", message, "at line", lineno);
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

    function initMap() {
      try {
        map = L.map('map', { zoomControl: false });
        
        L.control.zoom({ position: 'topright' }).addTo(map);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap'
        }).addTo(map);

        lIcon = L.icon({
          iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41]
        });

        rIcon = L.icon({
          iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41]
        });

        // Trigger map layout computation to prevent blank dimensions rendering
        setTimeout(() => {
          if (map) {
            map.invalidateSize();
          }
        }, 150);

        if (pendingCoords) {
          updateMap(pendingCoords.loftLat, pendingCoords.loftLng, pendingCoords.releaseLat, pendingCoords.releaseLng);
        } else {
          map.setView([12.8797, 121.7740], 5); // Default center on Philippines
        }

        window.parent.postMessage({ type: 'MAP_READY' }, '*');
      } catch (err) {
        console.error("Map initialization failed inside iframe:", err);
      }
    }

    function updateMap(loftLat, loftLng, releaseLat, releaseLng) {
      if (!map) {
        pendingCoords = { loftLat, loftLng, releaseLat, releaseLng };
        return;
      }

      try {
        map.invalidateSize();

        if (loftMarker) map.removeLayer(loftMarker);
        if (releaseMarker) map.removeLayer(releaseMarker);
        if (polyline) map.removeLayer(polyline);

        loftMarker = null;
        releaseMarker = null;
        polyline = null;

        const points = [];

        // Add Loft
        if (loftLat !== null && loftLng !== null && !isNaN(loftLat) && !isNaN(loftLng)) {
          const loftPoint = [loftLat, loftLng];
          points.push(loftPoint);
          loftMarker = L.marker(loftPoint, { icon: lIcon })
            .addTo(map)
            .bindPopup('<b>🏡 Loft Location</b><br>' + loftLat.toFixed(5) + ', ' + loftLng.toFixed(5));
        }

        // Add Release Point
        if (releaseLat !== null && releaseLng !== null && !isNaN(releaseLat) && !isNaN(releaseLng)) {
          const releasePoint = [releaseLat, releaseLng];
          points.push(releasePoint);
          releaseMarker = L.marker(releasePoint, { icon: rIcon })
            .addTo(map)
            .bindPopup('<b>🎯 Release Point</b><br>' + releaseLat.toFixed(5) + ', ' + releaseLng.toFixed(5));
        }

        // Draw Flight Path
        if (points.length === 2) {
          polyline = L.polyline(points, {
            color: '#FFC107',
            weight: 3,
            opacity: 0.8,
            dashArray: '5, 10',
            lineJoin: 'round'
          }).addTo(map);

          map.fitBounds(polyline.getBounds(), { padding: [50, 50] });
        } else if (points.length === 1) {
          map.setView(points[0], 13);
          if (loftMarker) loftMarker.openPopup();
          else if (releaseMarker) releaseMarker.openPopup();
        } else {
          map.setView([12.8797, 121.7740], 5);
        }
      } catch (err) {
        console.error("Map update failed inside iframe:", err);
      }
    }

    // Listen for parent messages
    window.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'UPDATE_COORDS') {
        const { loftLat, loftLng, releaseLat, releaseLng } = event.data;
        updateMap(loftLat, loftLng, releaseLat, releaseLng);
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
        loftLat: loftLat !== undefined ? loftLat : null,
        loftLng: loftLng !== undefined ? loftLng : null,
        releaseLat: releaseLat !== undefined ? releaseLat : null,
        releaseLng: releaseLng !== undefined ? releaseLng : null
      }, '*')
    }
  }

  // Send coords on updates
  useEffect(() => {
    sendCoords()
  }, [loftLat, loftLng, releaseLat, releaseLng])

  // Listen for iframe signal that it is ready to receive
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data && e.data.type === 'MAP_READY') {
        sendCoords()
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [loftLat, loftLng, releaseLat, releaseLng])

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
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          display: 'block'
        }}
      />
    </div>
  )
}
