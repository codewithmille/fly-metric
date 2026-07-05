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
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin="" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>
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
    const loftLat = ${loftLat || 'null'};
    const loftLng = ${loftLng || 'null'};
    const releaseLat = ${releaseLat || 'null'};
    const releaseLng = ${releaseLng || 'null'};

    const map = L.map('map', { zoomControl: false });
    
    L.control.zoom({ position: 'topright' }).addTo(map);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap'
    }).addTo(map);

    const points = [];
    const markers = [];

    // Add Loft Marker
    if (loftLat !== null && loftLng !== null) {
      const loftPoint = [loftLat, loftLng];
      points.push(loftPoint);
      
      const loftIcon = L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      });

      const loftMarker = L.marker(loftPoint, { icon: loftIcon })
        .addTo(map)
        .bindPopup('<b>🏡 Loft Location</b><br>' + loftLat.toFixed(5) + ', ' + loftLng.toFixed(5));
      markers.push(loftMarker);
    }

    // Add Release Point Marker
    if (releaseLat !== null && releaseLng !== null) {
      const releasePoint = [releaseLat, releaseLng];
      points.push(releasePoint);

      const releaseIcon = L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      });

      const releaseMarker = L.marker(releasePoint, { icon: releaseIcon })
        .addTo(map)
        .bindPopup('<b>🎯 Release Point</b><br>' + releaseLat.toFixed(5) + ', ' + releaseLng.toFixed(5));
      markers.push(releaseMarker);
    }

    // Draw Flight Path Line
    if (points.length === 2) {
      const polyline = L.polyline(points, {
        color: '#FFC107',
        weight: 3,
        opacity: 0.8,
        dashArray: '5, 10',
        lineJoin: 'round'
      }).addTo(map);

      map.fitBounds(polyline.getBounds(), { padding: [50, 50] });
    } else if (points.length === 1) {
      map.setView(points[0], 13);
      markers[0].openPopup();
    } else {
      map.setView([12.8797, 121.7740], 5); // Default view centered on Philippines
    }
  </script>
</body>
</html>
  `

  useEffect(() => {
    if (iframeRef.current) {
      const iframe = iframeRef.current
      const doc = iframe.contentDocument || iframe.contentWindow?.document
      if (doc) {
        doc.open()
        doc.write(htmlContent)
        doc.close()
      }
    }
  }, [loftLat, loftLng, releaseLat, releaseLng, htmlContent])

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
