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

function buildHtml(interactive: boolean): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    html,body{
      height:100%;width:100%;
      background:#0d1117;
      touch-action:manipulation;
      -webkit-tap-highlight-color:transparent;
      overflow:hidden;
    }
    #map{
      height:100%;width:100%;
      touch-action:${interactive ? 'none' : 'pan-x pan-y'};
      -webkit-tap-highlight-color:transparent;
    }
    .leaflet-tile-container{
      filter:invert(100%) hue-rotate(180deg) brightness(85%) contrast(90%);
    }
    .leaflet-container{
      background:#0d1117!important;
      touch-action:${interactive ? 'none' : 'pan-x pan-y'}!important;
      -webkit-tap-highlight-color:transparent!important;
      ${interactive ? 'cursor:crosshair!important;' : ''}
    }
    .leaflet-bar a{
      background:#161b22!important;border-bottom:1px solid #30363d!important;
      color:#c9d1d9!important;touch-action:manipulation;
    }
    .leaflet-bar a:hover{background:#30363d!important;color:#fff!important}
    .leaflet-popup-content-wrapper{
      background:#161b22!important;color:#c9d1d9!important;
      border:1px solid #30363d!important;border-radius:8px!important;
      box-shadow:0 4px 12px rgba(0,0,0,.5)!important;
      font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
    }
    .leaflet-popup-tip{background:#161b22!important;border:1px solid #30363d!important}
    #hint{
      position:fixed;bottom:10px;left:50%;transform:translateX(-50%);
      background:rgba(13,17,23,.9);color:#FFC107;
      font:700 12px/-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
      font-size:12px;font-weight:700;
      padding:6px 14px;border-radius:20px;
      border:1px solid rgba(255,193,7,.4);
      pointer-events:none;white-space:nowrap;z-index:1000;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  ${interactive ? '<div id="hint">📍 Tap map to pin location</div>' : ''}
  <script>
    window.onerror=function(m,s,l){console.error('Map:',m,'@'+l);return false};

    var map=null,lM=null,rM=null,pL=null,pend=null,lI=null,rI=null,fb=null,lastTouch=0;

    function valid(a,b){
      return a!=null&&b!=null&&!isNaN(a)&&!isNaN(b)&&a>=-90&&a<=90&&b>=-180&&b<=180;
    }

    function pin(lat,lng){
      if(fb){map.removeLayer(fb);}
      fb=L.circleMarker([lat,lng],{radius:14,color:'#FFC107',fillColor:'#FFC107',fillOpacity:.3,weight:2.5}).addTo(map);
      window.parent.postMessage({type:'MAP_CLICKED',lat:lat,lng:lng},'*');
    }

    function initMap(){
      try{
        map=L.map('map',{zoomControl:false,tap:true,tapTolerance:20,touchZoom:${interactive ? 'false' : 'true'},dragging:true});
        L.control.zoom({position:'topright'}).addTo(map);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap'}).addTo(map);

        ${interactive ? `
        map.on('click',function(e){
          if(Date.now()-lastTouch<500)return;
          pin(e.latlng.lat,e.latlng.lng);
        });
        var el=document.getElementById('map');
        el.addEventListener('touchend',function(e){
          if(e.changedTouches.length!==1)return;
          var t=e.changedTouches[0];
          var r=el.getBoundingClientRect();
          var cp=L.point(t.clientX-r.left,t.clientY-r.top);
          var ll=map.containerPointToLatLng(cp);
          lastTouch=Date.now();
          e.preventDefault();
          pin(ll.lat,ll.lng);
        },{passive:false});
        ` : ''}

        lI=L.icon({iconUrl:'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png',shadowUrl:'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',iconSize:[25,41],iconAnchor:[12,41],popupAnchor:[1,-34],shadowSize:[41,41]});
        rI=L.icon({iconUrl:'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',shadowUrl:'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',iconSize:[25,41],iconAnchor:[12,41],popupAnchor:[1,-34],shadowSize:[41,41]});

        setTimeout(function(){if(map)map.invalidateSize();},200);

        if(pend){upd(pend.a,pend.b,pend.c,pend.d);}
        else{map.setView([12.8797,121.774],6);}

        window.parent.postMessage({type:'MAP_READY'},'*');
      }catch(e){console.error('initMap:',e);}
    }

    function upd(la,lo,ra,ro){
      if(!map){pend={a:la,b:lo,c:ra,d:ro};return;}
      try{
        map.invalidateSize();
        if(lM)map.removeLayer(lM);
        if(rM)map.removeLayer(rM);
        if(pL)map.removeLayer(pL);
        if(fb){map.removeLayer(fb);fb=null;}
        lM=rM=pL=null;
        var pts=[];
        if(valid(la,lo)){var p=[la,lo];pts.push(p);lM=L.marker(p,{icon:lI}).addTo(map).bindPopup('<b>🏡 Loft</b><br>'+la.toFixed(5)+', '+lo.toFixed(5));}
        if(valid(ra,ro)){var q=[ra,ro];pts.push(q);rM=L.marker(q,{icon:rI}).addTo(map).bindPopup('<b>🎯 Release</b><br>'+ra.toFixed(5)+', '+ro.toFixed(5));}
        if(pts.length===2){pL=L.polyline(pts,{color:'#FFC107',weight:3,opacity:.85,dashArray:'6 10'}).addTo(map);map.fitBounds(pL.getBounds(),{padding:[50,50]});}
        else if(pts.length===1){map.setView(pts[0],12);if(lM)lM.openPopup();else if(rM)rM.openPopup();}
        else{map.setView([12.8797,121.774],6);}
      }catch(e){console.error('upd:',e);}
    }

    window.addEventListener('message',function(e){
      if(!e.data)return;
      if(e.data.type==='UPDATE_COORDS')upd(e.data.la,e.data.lo,e.data.ra,e.data.ro);
      if(e.data.type==='INVALIDATE')setTimeout(function(){if(map)map.invalidateSize();},100);
    });
  </script>
</body>
</html>`
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
  const blobUrlRef = useRef<string | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [mapReady, setMapReady] = useState(false)

  const interactive = !!onMapClick

  const validLoftLat = isValidCoord(loftLat, loftLng)       ? loftLat    : null
  const validLoftLng = isValidCoord(loftLat, loftLng)       ? loftLng    : null
  const validRelLat  = isValidCoord(releaseLat, releaseLng) ? releaseLat : null
  const validRelLng  = isValidCoord(releaseLat, releaseLng) ? releaseLng : null

  // Load iframe via Blob URL — much more mobile-compatible than doc.write()
  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return

    const html = buildHtml(interactive)
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    blobUrlRef.current = url
    iframe.src = url

    return () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
    }
  }, [])

  const sendCoords = () => {
    iframeRef.current?.contentWindow?.postMessage({
      type: 'UPDATE_COORDS',
      la: validLoftLat ?? null,
      lo: validLoftLng ?? null,
      ra: validRelLat  ?? null,
      ro: validRelLng  ?? null,
    }, '*')
  }

  // Re-send coords whenever they change
  useEffect(() => {
    if (mapReady) sendCoords()
  }, [validLoftLat, validLoftLng, validRelLat, validRelLng, mapReady])

  // Invalidate map size when fullscreen changes
  useEffect(() => {
    if (mapReady) {
      setTimeout(() => {
        iframeRef.current?.contentWindow?.postMessage({ type: 'INVALIDATE' }, '*')
      }, 50)
    }
  }, [isFullscreen, mapReady])

  // Receive messages from iframe
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'MAP_READY') {
        setMapReady(true)
        sendCoords()
      } else if (e.data?.type === 'MAP_CLICKED') {
        onMapClick?.(e.data.lat, e.data.lng)
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [validLoftLat, validLoftLng, validRelLat, validRelLng, onMapClick])

  // Lock body scroll when fullscreen
  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isFullscreen])

  const containerStyle: React.CSSProperties = isFullscreen ? {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    width: '100%',
    height: '100%',
    zIndex: 9999,
    borderRadius: 0,
    background: '#0d1117',
    border: 'none',
  } : {
    width: '100%',
    height,
    borderRadius: '0.75rem',
    border: '1px solid var(--border-default)',
    overflow: 'hidden',
    position: 'relative',
    background: '#0d1117',
  }

  return (
    <div style={containerStyle}>
      {/* Iframe map */}
      <iframe
        ref={iframeRef}
        title="Flight Distance Map"
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          display: 'block',
          pointerEvents: 'auto',
        }}
      />

      {/* Fullscreen toggle button */}
      <button
        type="button"
        onClick={() => setIsFullscreen(f => !f)}
        style={{
          position: 'absolute',
          top: '0.5rem',
          left: '0.5rem',
          zIndex: 10000,
          background: 'rgba(13,17,23,0.88)',
          border: '1px solid rgba(255,193,7,0.4)',
          borderRadius: '6px',
          color: '#FFC107',
          width: '32px',
          height: '32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          fontSize: '15px',
          touchAction: 'manipulation',
          WebkitTapHighlightColor: 'transparent',
        }}
        aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen map'}
        title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen map'}
      >
        {isFullscreen ? '✕' : '⛶'}
      </button>

      {/* Fullscreen close hint bar at the bottom */}
      {isFullscreen && (
        <div style={{
          position: 'absolute',
          bottom: '1rem',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: '0.5rem',
          zIndex: 10000,
          pointerEvents: 'none',
        }}>
          <div style={{
            background: 'rgba(13,17,23,0.9)',
            color: '#FFC107',
            fontSize: '12px',
            fontWeight: 700,
            padding: '6px 14px',
            borderRadius: '20px',
            border: '1px solid rgba(255,193,7,0.4)',
            whiteSpace: 'nowrap',
          }}>
            {interactive ? '📍 Tap anywhere to pin · ' : ''}✕ Top-left to close
          </div>
        </div>
      )}
    </div>
  )
}
