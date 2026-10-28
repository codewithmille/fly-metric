export default function Loading() {
  return (
    <div
      data-theme="dark"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'radial-gradient(circle at 50% 42%, #111c24 0%, #090d16 70%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1.35rem',
        zIndex: 9999,
      }}
    >
      {/* Pigeon logo with glowing ring */}
      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: 'fm-pulse 1.8s ease-in-out infinite',
        }}
      >
        <div
          style={{
            position: 'absolute',
            width: 130,
            height: 130,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(34, 197, 94, 0.25) 0%, transparent 70%)',
            filter: 'blur(12px)',
          }}
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/icon.png"
          alt="FlyMetric"
          width={112}
          height={112}
          style={{
            position: 'relative',
            objectFit: 'contain',
            filter: 'drop-shadow(0 8px 24px rgba(34, 197, 94, 0.3))',
          }}
        />
      </div>

      {/* App name */}
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            fontSize: '1.6rem',
            fontWeight: 800,
            color: '#e6edf3',
            letterSpacing: '-0.02em',
            fontFamily: 'var(--font-geist-sans, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif)',
          }}
        >
          Fly<span style={{ color: '#FFC107' }}>Metric</span>
        </div>
        <div
          style={{
            fontSize: '0.75rem',
            color: '#8b949e',
            marginTop: '0.25rem',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            fontWeight: 600,
          }}
        >
          Pigeon Racing · Clocking System
        </div>
      </div>

      {/* Loading dots */}
      <div style={{ display: 'flex', gap: '7px', alignItems: 'center' }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#22c55e',
              opacity: 0.3,
              animation: `fm-dot 1.2s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes fm-pulse {
          0%, 100% { transform: scale(1) translateY(0);   opacity: 1;    }
          50%       { transform: scale(1.06) translateY(-4px); opacity: 0.92; }
        }
        @keyframes fm-dot {
          0%, 80%, 100% { opacity: 0.25; transform: scale(0.85); }
          40%            { opacity: 1;    transform: scale(1.25); }
        }
      `}</style>
    </div>
  )
}
