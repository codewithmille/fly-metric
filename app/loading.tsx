export default function Loading() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#0d1117',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1.5rem',
        zIndex: 9999,
      }}
    >
      {/* Pigeon icon — pulses gently */}
      <div
        style={{
          animation: 'fm-pulse 1.6s ease-in-out infinite',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/icon.png"
          alt="FlyMetric"
          width={96}
          height={96}
          style={{ borderRadius: '22%', objectFit: 'contain' }}
        />
      </div>

      {/* App name */}
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            fontSize: '1.5rem',
            fontWeight: 800,
            color: '#FFC107',
            letterSpacing: '-0.02em',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          }}
        >
          FlyMetric
        </div>
        <div
          style={{
            fontSize: '0.78rem',
            color: '#8b949e',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            marginTop: '0.25rem',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
          }}
        >
          Pigeon Racing · Clocking System
        </div>
      </div>

      {/* Loading dots */}
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: '#FFC107',
              opacity: 0.3,
              animation: `fm-dot 1.2s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes fm-pulse {
          0%, 100% { transform: scale(1);   opacity: 1;    }
          50%       { transform: scale(1.07); opacity: 0.85; }
        }
        @keyframes fm-dot {
          0%, 80%, 100% { opacity: 0.25; transform: scale(0.9); }
          40%            { opacity: 1;    transform: scale(1.2);  }
        }
      `}</style>
    </div>
  )
}
