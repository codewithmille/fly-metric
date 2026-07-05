'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { BirdIcon } from '@/components/icons'

export default function LandingPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleGoogleLogin = async () => {
    try {
      setLoading(true)
      setError(null)
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      })
      if (error) throw error
    } catch (err: any) {
      setError(err.message || 'Failed to sign in. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="landing-root">
      {/* Animated Glowing Orbs Background */}
      <div className="landing-orbs">
        <div className="orb orb-gold" />
        <div className="orb orb-blue" />
        <div className="orb orb-purple" />
      </div>

      {/* Header / Navbar */}
      <header className="landing-header">
        <div className="header-container">
          <div className="logo-section">
            <div className="app-logo">
              <BirdIcon size={24} />
            </div>
            <span className="app-title">Fly<span>Metric</span></span>
          </div>
          <nav className="header-nav">
            <a href="#features" className="nav-link">Features</a>
            <a href="#install" className="nav-link">PWA Guide</a>
            <button className="nav-btn-signin" onClick={handleGoogleLogin} disabled={loading}>
              Sign In
            </button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-container">
          <div className="hero-content">
            <span className="badge-promo">⚡ OFFLINE-FIRST PWA APP</span>
            <h1 className="hero-headline">
              Modernize Your <br/>
              <span>Pigeon Racing</span> Loft
            </h1>
            <p className="hero-subtext">
              The professional clocking dashboard for pigeon fanciers. Calculate bird velocity in yards per minute, log training races, track medical schedules, and manage your loft database—all completely offline.
            </p>
            <div className="hero-actions">
              <button className="btn-get-started" onClick={handleGoogleLogin} disabled={loading}>
                {loading ? (
                  <>
                    <span className="btn-spinner" />
                    Redirecting to Google…
                  </>
                ) : (
                  <>
                    <svg width="20" height="20" viewBox="0 0 48 48" style={{ marginRight: '8px' }}>
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                    </svg>
                    Continue with Google
                  </>
                )}
              </button>
              {error && <div className="login-error">{error}</div>}
            </div>
            <div className="hero-features-preview">
              <div className="preview-stat">
                <strong>100%</strong>
                <span>Offline support</span>
              </div>
              <div className="preview-stat">
                <strong>m/min</strong>
                <span>Velocity Calculator</span>
              </div>
              <div className="preview-stat">
                <strong>Secure</strong>
                <span>Google Auth</span>
              </div>
            </div>
          </div>

          {/* Interactive Mock Dashboard SVG illustration */}
          <div className="hero-visual">
            <div className="visual-wrapper">
              <svg viewBox="0 0 540 380" className="dashboard-mockup">
                {/* Main Window */}
                <rect width="540" height="380" rx="16" fill="#161b22" stroke="#30363d" strokeWidth="2" />
                <rect width="540" height="48" rx="16" fill="#0d1117" />
                <circle cx="20" cy="24" r="6" fill="#f85149" />
                <circle cx="36" cy="24" r="6" fill="#f0883e" />
                <circle cx="52" cy="24" r="6" fill="#3fb950" />
                <rect x="80" y="16" width="100" height="16" rx="4" fill="#21262d" />
                
                {/* Mock Stats Row */}
                <rect x="20" y="68" width="115" height="60" rx="8" fill="#0d1117" stroke="#30363d" />
                <text x="32" y="90" fill="#8b949e" fontSize="10">TOTAL BIRDS FLOWN</text>
                <text x="32" y="112" fill="#FFC107" fontSize="18" fontWeight="bold">1,482</text>

                <rect x="147" y="68" width="115" height="60" rx="8" fill="#0d1117" stroke="#30363d" />
                <text x="159" y="90" fill="#8b949e" fontSize="10">MAX SPEED (m/min)</text>
                <text x="159" y="112" fill="#58a6ff" fontSize="18" fontWeight="bold">1,668.5</text>

                <rect x="274" y="68" width="115" height="60" rx="8" fill="#0d1117" stroke="#30363d" />
                <text x="286" y="90" fill="#8b949e" fontSize="10">TRAINING TOSSES</text>
                <text x="286" y="112" fill="#3fb950" fontSize="18" fontWeight="bold">42</text>

                <rect x="401" y="68" width="115" height="60" rx="8" fill="#0d1117" stroke="#30363d" />
                <text x="413" y="90" fill="#8b949e" fontSize="10">RACES COMPLETED</text>
                <text x="413" y="112" fill="#bc8cff" fontSize="18" fontWeight="bold">18</text>

                {/* Mock Calendar and Table Grid */}
                <rect x="20" y="144" width="310" height="216" rx="8" fill="#0d1117" stroke="#30363d" />
                <text x="32" y="168" fill="#e6edf3" fontSize="12" fontWeight="bold">Loft Activity Calendar</text>
                <line x1="20" y1="182" x2="330" y2="182" stroke="#30363d" />
                {/* Visual Calendar grid */}
                <rect x="35" y="196" width="32" height="24" rx="4" fill="#161b22" />
                <rect x="75" y="196" width="32" height="24" rx="4" fill="#161b22" />
                <rect x="115" y="196" width="32" height="24" rx="4" fill="rgba(255, 193, 7, 0.15)" stroke="#FFC107" strokeWidth="1" />
                <rect x="155" y="196" width="32" height="24" rx="4" fill="#161b22" />
                <rect x="195" y="196" width="32" height="24" rx="4" fill="#161b22" />
                <rect x="235" y="196" width="32" height="24" rx="4" fill="rgba(33, 150, 243, 0.15)" stroke="#2196F3" strokeWidth="1" />
                <rect x="275" y="196" width="32" height="24" rx="4" fill="#161b22" />

                <rect x="35" y="228" width="32" height="24" rx="4" fill="#161b22" />
                <rect x="75" y="228" width="32" height="24" rx="4" fill="#161b22" />
                <rect x="115" y="228" width="32" height="24" rx="4" fill="#161b22" />
                <rect x="155" y="228" width="32" height="24" rx="4" fill="rgba(76, 175, 80, 0.15)" stroke="#4CAF50" strokeWidth="1" />
                <rect x="195" y="228" width="32" height="24" rx="4" fill="#161b22" />
                <rect x="235" y="228" width="32" height="24" rx="4" fill="#161b22" />
                <rect x="275" y="228" width="32" height="24" rx="4" fill="#161b22" />

                <rect x="35" y="260" width="32" height="24" rx="4" fill="#161b22" />
                <rect x="75" y="260" width="32" height="24" rx="4" fill="#161b22" />
                <rect x="115" y="260" width="32" height="24" rx="4" fill="#161b22" />
                <rect x="155" y="260" width="32" height="24" rx="4" fill="#161b22" />
                <rect x="195" y="260" width="32" height="24" rx="4" fill="#161b22" />
                <rect x="235" y="260" width="32" height="24" rx="4" fill="#161b22" />
                <rect x="275" y="260" width="32" height="24" rx="4" fill="#161b22" />

                <rect x="35" y="292" width="32" height="24" rx="4" fill="#161b22" />
                <rect x="75" y="292" width="32" height="24" rx="4" fill="#161b22" />
                <rect x="115" y="292" width="32" height="24" rx="4" fill="#161b22" />
                <rect x="155" y="292" width="32" height="24" rx="4" fill="#161b22" />
                <rect x="195" y="292" width="32" height="24" rx="4" fill="rgba(156, 39, 176, 0.15)" stroke="#9C27B0" strokeWidth="1" />
                <rect x="235" y="292" width="32" height="24" rx="4" fill="#161b22" />
                <rect x="275" y="292" width="32" height="24" rx="4" fill="#161b22" />

                {/* Clock-in List */}
                <rect x="342" y="144" width="178" height="216" rx="8" fill="#0d1117" stroke="#30363d" />
                <text x="354" y="168" fill="#e6edf3" fontSize="11" fontWeight="bold">Registry & Velocity</text>
                <line x1="342" y1="182" x2="520" y2="182" stroke="#30363d" />

                <rect x="354" y="196" width="154" height="30" rx="4" fill="#161b22" />
                <text x="364" y="215" fill="#8b949e" fontSize="9">PHA-10292</text>
                <text x="450" y="215" fill="#3fb950" fontSize="9" fontWeight="bold">1,484 m/min</text>

                <rect x="354" y="234" width="154" height="30" rx="4" fill="#161b22" />
                <text x="364" y="253" fill="#8b949e" fontSize="9">PHA-88392</text>
                <text x="450" y="253" fill="#3fb950" fontSize="9" fontWeight="bold">1,461 m/min</text>

                <rect x="354" y="272" width="154" height="30" rx="4" fill="#161b22" />
                <text x="364" y="291" fill="#8b949e" fontSize="9">PHA-11202</text>
                <text x="450" y="291" fill="#3fb950" fontSize="9" fontWeight="bold">1,432 m/min</text>

                <rect x="354" y="310" width="154" height="38" rx="4" fill="rgba(76, 175, 80, 0.05)" stroke="rgba(76, 175, 80, 0.2)" />
                <text x="364" y="325" fill="#3fb950" fontSize="9" fontWeight="bold">✓ Database Synced</text>
                <text x="364" y="338" fill="#8b949e" fontSize="7">Local modifications synchronized</text>
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid Section */}
      <section id="features" className="features-section">
        <div className="section-container">
          <div className="section-header">
            <span className="section-label">CAPABILITIES</span>
            <h2 className="section-title">Built Specially for Pigeon Racers</h2>
            <p className="section-desc">
              All the tools you need to calculate velocities, register rings, and keep schedule logs in a sleek, unified dashboard.
            </p>
          </div>

          <div className="features-grid">
            {/* Feature 1 */}
            <div className="feature-card">
              <div className="feature-icon calc-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" />
                </svg>
              </div>
              <h3 className="feature-card-title">Velocity Calculator</h3>
              <p className="feature-card-text">
                Enter pigeon release and clock-in times alongside flight distance. Instantly calculate flight duration and bird velocity in **meters per minute (m/min)**.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="feature-card">
              <div className="feature-icon cal-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </div>
              <h3 className="feature-card-title">Loft Activity Calendar</h3>
              <p className="feature-card-text">
                Color-coded calendar keeps track of loft routines. Differentiate between training tosses, race logs, vaccination or medication logs, and daily tasks.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="feature-card">
              <div className="feature-icon reg-icon">
                <BirdIcon size={24} />
              </div>
              <h3 className="feature-card-title">Bird Registry</h3>
              <p className="feature-card-text">
                Digitize your registry ledger. Assign ring numbers, specify body/eye colors, define genders (Cock/Hen), and quickly look up specific birds during races.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="feature-card">
              <div className="feature-icon sync-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                </svg>
              </div>
              <h3 className="feature-card-title">PWA Offline Database Sync</h3>
              <p className="feature-card-text">
                Works deep in the fields without internet. Saves all updates locally and automatically synchronizes to the cloud database when you return online.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* PWA Installation Section */}
      <section id="install" className="install-section">
        <div className="section-container">
          <div className="install-grid">
            <div className="install-content">
              <span className="section-label">HOW TO INSTALL</span>
              <h2 className="section-title">Install FlyMetric PWA</h2>
              <p className="section-desc">
                FlyMetric is a Progressive Web App. You can install it on your device and use it like a native mobile or desktop application, with launch shortcuts and full offline capabilities.
              </p>
              
              <div className="steps-list">
                <div className="step-item">
                  <div className="step-number">1</div>
                  <div className="step-details">
                    <h4>Open App in Browser</h4>
                    <p>Access the dashboard via Chrome, Edge, or Safari on your phone or computer.</p>
                  </div>
                </div>
                <div className="step-item">
                  <div className="step-number">2</div>
                  <div className="step-details">
                    <h4>Install or Add</h4>
                    <p>On Android/PC, click the "Install App" button in the address bar. On iPhone, tap share and select "Add to Home Screen".</p>
                  </div>
                </div>
                <div className="step-item">
                  <div className="step-number">3</div>
                  <div className="step-details">
                    <h4>Launch from Screen</h4>
                    <p>Start FlyMetric directly from your app drawer or home screen with native windows.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="install-visual">
              <div className="phone-mockup">
                <div className="phone-screen">
                  <div className="phone-header">
                    <span className="phone-time">10:42 AM</span>
                    <span className="phone-status">🔋</span>
                  </div>
                  <div className="phone-app-grid">
                    <div className="app-icon-wrapper">
                      <div className="phone-logo">
                        <BirdIcon size={32} />
                      </div>
                      <span className="phone-app-name">FlyMetric</span>
                    </div>
                  </div>
                  <div className="phone-prompt">
                    <span className="prompt-arrow">↑</span>
                    <p>Tap "Add to Home Screen" to install offline Pigeon Racing system</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-container">
          <div className="footer-left">
            <div className="logo-section">
              <div className="app-logo">
                <BirdIcon size={20} />
              </div>
              <span className="app-title">Fly<span>Metric</span></span>
            </div>
            <p className="footer-copy">© 2026 FlyMetric Racing. Built for professional pigeon fanciers.</p>
          </div>
          <div className="footer-right">
            <button className="footer-btn-signin" onClick={handleGoogleLogin}>
              Log In to Loft Dashboard
            </button>
          </div>
        </div>
      </footer>

      {/* Embedded CSS Styles */}
      <style>{`
        .landing-root {
          background-color: #0d1117;
          color: #e6edf3;
          font-family: var(--font-geist-sans, 'Geist', sans-serif);
          min-height: 100vh;
          position: relative;
          overflow-x: hidden;
        }

        /* Background Glows */
        .landing-orbs {
          position: absolute;
          inset: 0;
          overflow: hidden;
          pointer-events: none;
          z-index: 0;
        }
        .orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(120px);
          opacity: 0.15;
          animation: floatAnimation 12s ease-in-out infinite;
        }
        .orb-gold {
          background: #FFC107;
          width: 500px;
          height: 500px;
          top: -100px;
          left: -100px;
        }
        .orb-blue {
          background: #2196F3;
          width: 600px;
          height: 600px;
          bottom: 100px;
          right: -100px;
          animation-delay: -3s;
        }
        .orb-purple {
          background: #9C27B0;
          width: 400px;
          height: 400px;
          top: 30%;
          left: 50%;
          transform: translateX(-50%);
          animation-delay: -6s;
        }

        @keyframes floatAnimation {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-40px) scale(1.05); }
        }

        /* Header Navbar */
        .landing-header {
          position: sticky;
          top: 0;
          z-index: 100;
          backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(48, 54, 61, 0.6);
          background: rgba(13, 17, 23, 0.7);
        }
        .header-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 2rem;
          height: 4.5rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .logo-section {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .app-logo {
          width: 2.25rem;
          height: 2.25rem;
          background: linear-gradient(135deg, #FFC107, #FF8F00);
          border-radius: 0.625rem;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #0d1117;
        }
        .app-title {
          font-weight: 800;
          font-size: 1.25rem;
          letter-spacing: -0.02em;
        }
        .app-title span {
          color: #FFC107;
        }
        .header-nav {
          display: flex;
          align-items: center;
          gap: 2rem;
        }
        .nav-link {
          color: #8b949e;
          text-decoration: none;
          font-weight: 500;
          font-size: 0.9rem;
          transition: color 0.2s;
        }
        .nav-link:hover {
          color: #e6edf3;
        }
        .nav-btn-signin {
          background: #FFC107;
          border: none;
          color: #0d1117;
          font-weight: 700;
          padding: 0.5rem 1.25rem;
          border-radius: 0.5rem;
          cursor: pointer;
          font-size: 0.85rem;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .nav-btn-signin:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(255, 193, 7, 0.25);
        }

        /* Hero Section */
        .hero-section {
          position: relative;
          z-index: 10;
          padding: 6rem 2rem;
        }
        .hero-container {
          max-width: 1200px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;
          gap: 4rem;
          align-items: center;
        }
        .badge-promo {
          display: inline-block;
          background: rgba(255, 193, 7, 0.1);
          border: 1px solid rgba(255, 193, 7, 0.2);
          color: #FFC107;
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          padding: 0.35rem 0.75rem;
          border-radius: 100px;
          margin-bottom: 1.5rem;
        }
        .hero-headline {
          font-size: 3.5rem;
          line-height: 1.1;
          font-weight: 800;
          letter-spacing: -0.03em;
          margin: 0 0 1.5rem 0;
        }
        .hero-headline span {
          background: linear-gradient(135deg, #FFC107, #FF8F00);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .hero-subtext {
          color: #8b949e;
          font-size: 1.1rem;
          line-height: 1.6;
          margin: 0 0 2.5rem 0;
        }
        .hero-actions {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 1rem;
          margin-bottom: 3rem;
        }
        .btn-get-started {
          display: flex;
          align-items: center;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: #fff;
          font-weight: 600;
          font-size: 1rem;
          padding: 0.85rem 1.75rem;
          border-radius: 0.75rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-get-started:hover {
          background: rgba(255, 255, 255, 0.13);
          border-color: rgba(255, 255, 255, 0.25);
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.3);
        }
        .btn-spinner {
          width: 18px;
          height: 18px;
          border: 2px solid rgba(255,255,255,0.2);
          border-top-color: #FFC107;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          margin-right: 8px;
        }
        .login-error {
          color: #f87171;
          font-size: 0.82rem;
          margin-top: 0.25rem;
        }
        .hero-features-preview {
          display: flex;
          gap: 2.5rem;
          border-top: 1px solid rgba(48, 54, 61, 0.5);
          padding-top: 2rem;
        }
        .preview-stat strong {
          display: block;
          font-size: 1.5rem;
          color: #FFC107;
          font-weight: 800;
          margin-bottom: 0.25rem;
        }
        .preview-stat span {
          font-size: 0.78rem;
          color: #8b949e;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .hero-visual {
          position: relative;
        }
        .visual-wrapper {
          background: rgba(22, 27, 34, 0.4);
          border: 1px solid rgba(48, 54, 61, 0.7);
          border-radius: 1.25rem;
          padding: 1rem;
          box-shadow: 0 30px 60px rgba(0,0,0,0.4);
          backdrop-filter: blur(8px);
        }
        .dashboard-mockup {
          width: 100%;
          height: auto;
          display: block;
        }

        /* Features Section */
        .features-section {
          padding: 6rem 2rem;
          position: relative;
          z-index: 10;
          background: rgba(9, 13, 22, 0.6);
          border-top: 1px solid rgba(48, 54, 61, 0.4);
        }
        .section-container {
          max-width: 1200px;
          margin: 0 auto;
        }
        .section-header {
          text-align: center;
          max-width: 600px;
          margin: 0 auto 4rem auto;
        }
        .section-label {
          color: #FFC107;
          font-size: 0.75rem;
          font-weight: 800;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          display: block;
          margin-bottom: 0.75rem;
        }
        .section-title {
          font-size: 2.25rem;
          font-weight: 800;
          letter-spacing: -0.02em;
          margin: 0 0 1rem 0;
        }
        .section-desc {
          color: #8b949e;
          line-height: 1.5;
        }
        .features-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 2rem;
        }
        .feature-card {
          background: #161b22;
          border: 1px solid #30363d;
          border-radius: 1rem;
          padding: 2.5rem;
          transition: transform 0.2s, border-color 0.2s;
        }
        .feature-card:hover {
          transform: translateY(-3px);
          border-color: rgba(255, 193, 7, 0.3);
        }
        .feature-icon {
          width: 3rem;
          height: 3rem;
          border-radius: 0.75rem;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1.5rem;
        }
        .calc-icon { background: rgba(33, 150, 243, 0.1); color: #2196F3; }
        .cal-icon { background: rgba(156, 39, 176, 0.1); color: #9C27B0; }
        .reg-icon { background: rgba(255, 193, 7, 0.1); color: #FFC107; }
        .sync-icon { background: rgba(76, 175, 80, 0.1); color: #4CAF50; }

        .feature-card-title {
          font-size: 1.25rem;
          font-weight: 700;
          margin: 0 0 0.75rem 0;
          color: #e6edf3;
        }
        .feature-card-text {
          color: #8b949e;
          line-height: 1.6;
          margin: 0;
          font-size: 0.92rem;
        }

        /* PWA Installation Section */
        .install-section {
          padding: 6rem 2rem;
          position: relative;
          z-index: 10;
        }
        .install-grid {
          max-width: 1200px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 6rem;
          align-items: center;
        }
        .steps-list {
          display: flex;
          flex-direction: column;
          gap: 2rem;
          margin-top: 3rem;
        }
        .step-item {
          display: flex;
          gap: 1.25rem;
        }
        .step-number {
          width: 2.25rem;
          height: 2.25rem;
          background: rgba(255, 193, 7, 0.1);
          border: 1px solid rgba(255, 193, 7, 0.3);
          color: #FFC107;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          flex-shrink: 0;
        }
        .step-details h4 {
          margin: 0 0 0.25rem 0;
          font-size: 1.05rem;
          font-weight: 700;
        }
        .step-details p {
          color: #8b949e;
          margin: 0;
          font-size: 0.9rem;
          line-height: 1.5;
        }

        .phone-mockup {
          background: #1f242d;
          border: 6px solid #30363d;
          border-radius: 2rem;
          padding: 0.75rem;
          max-width: 280px;
          margin: 0 auto;
          box-shadow: 0 30px 60px rgba(0,0,0,0.5);
        }
        .phone-screen {
          background: #0d1117;
          border-radius: 1.5rem;
          height: 480px;
          position: relative;
          padding: 1rem;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .phone-header {
          display: flex;
          justify-content: space-between;
          font-size: 0.65rem;
          color: #8b949e;
          margin-bottom: 2rem;
        }
        .phone-app-grid {
          display: flex;
          justify-content: center;
          align-items: center;
          flex-grow: 1;
        }
        .app-icon-wrapper {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
        }
        .phone-logo {
          width: 4rem;
          height: 4rem;
          background: linear-gradient(135deg, #FFC107, #FF8F00);
          border-radius: 1rem;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #0d1117;
          box-shadow: 0 8px 24px rgba(255, 193, 7, 0.2);
          animation: phonePulse 3s ease-in-out infinite;
        }
        @keyframes phonePulse {
          0%, 100% { transform: scale(1); box-shadow: 0 8px 24px rgba(255, 193, 7, 0.2); }
          50% { transform: scale(1.05); box-shadow: 0 12px 30px rgba(255, 193, 7, 0.4); }
        }
        .phone-app-name {
          font-weight: 700;
          font-size: 0.85rem;
          color: #e6edf3;
        }
        .phone-prompt {
          background: rgba(33, 150, 243, 0.1);
          border: 1px solid rgba(33, 150, 243, 0.3);
          border-radius: 0.75rem;
          padding: 0.75rem;
          text-align: center;
          position: absolute;
          bottom: 1rem;
          left: 1rem;
          right: 1rem;
        }
        .phone-prompt p {
          margin: 0;
          font-size: 0.7rem;
          color: #58a6ff;
          line-height: 1.4;
        }
        .prompt-arrow {
          display: block;
          font-size: 1.2rem;
          color: #58a6ff;
          animation: bounceArrow 1s ease-in-out infinite;
        }
        @keyframes bounceArrow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }

        /* Footer */
        .landing-footer {
          border-top: 1px solid rgba(48, 54, 61, 0.5);
          background: #090d16;
          padding: 4rem 2rem;
          position: relative;
          z-index: 10;
        }
        .footer-container {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .footer-copy {
          color: #8b949e;
          font-size: 0.82rem;
          margin: 0.5rem 0 0 0;
        }
        .footer-btn-signin {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          color: #e6edf3;
          padding: 0.6rem 1.5rem;
          border-radius: 0.5rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }
        .footer-btn-signin:hover {
          background: rgba(255,255,255,0.1);
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Responsive */
        @media (max-width: 968px) {
          .hero-container, .install-grid {
            grid-template-columns: 1fr;
            gap: 4rem;
            text-align: center;
          }
          .hero-headline {
            font-size: 2.75rem;
          }
          .hero-actions {
            align-items: center;
          }
          .hero-features-preview {
            justify-content: center;
          }
          .features-grid {
            grid-template-columns: 1fr;
          }
          .footer-container {
            flex-direction: column;
            gap: 2rem;
            text-align: center;
          }
          .footer-left {
            display: flex;
            flex-direction: column;
            align-items: center;
          }
        }

        @media (max-width: 640px) {
          .header-container {
            padding: 0 1rem;
            height: 4rem;
          }
          .header-nav {
            gap: 1rem;
          }
          .nav-link {
            display: none; /* Hide raw links to prevent wrapping issues on tiny screens */
          }
          .logo-section {
            gap: 0.5rem;
          }
          .app-title {
            font-size: 1.1rem;
          }

          .hero-section {
            padding: 3rem 1rem;
          }
          .hero-container {
            gap: 2.5rem;
          }
          .hero-headline {
            font-size: 2.25rem;
          }
          .hero-subtext {
            font-size: 0.95rem;
            margin-bottom: 2rem;
          }
          .hero-features-preview {
            gap: 1.5rem;
            flex-wrap: wrap;
            justify-content: center;
          }
          .preview-stat strong {
            font-size: 1.25rem;
          }

          .visual-wrapper {
            padding: 0.5rem;
            border-radius: 0.75rem;
          }

          .features-section {
            padding: 4rem 1rem;
          }
          .feature-card {
            padding: 1.75rem;
          }

          .install-section {
            padding: 4rem 1rem;
          }
          .install-grid {
            gap: 3rem;
          }
          .steps-list {
            margin-top: 2rem;
            text-align: left;
          }

          .landing-footer {
            padding: 3rem 1rem;
          }
        }
      `}</style>
    </div>
  )
}
