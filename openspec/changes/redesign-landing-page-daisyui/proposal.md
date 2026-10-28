# Change: Full Landing Page Redesign with daisyUI v5 (`dark` Theme)

## Why
To give **FlyMetric** a flagship, high-conversion landing page that feels as polished and interactive as `daisyui.com`, every section of `components/LandingPage.tsx` should leverage **daisyUI v5 (`data-theme="dark"`)** components paired with **shadcn/ui-inspired dark borders and glassmorphism**.

## What Changes
- **Responsive daisyUI `navbar` + Mobile `dropdown`**: Add a mobile-friendly dropdown menu alongside desktop navigation links (`Features`, `Live Calculator`, `How It Works`, `PWA Guide`, `FAQ`) and quick action buttons.
- **Hero Section + Interactive `mockup-window` Showcase**:
  - High-contrast `btn-primary` (`Continue with Google`) and `btn-outline` (`Try Speed Calculator`).
  - Interactive `mockup-window` with `tabs-box` (`Loft Overview`, `Race Calendar`, `Live Clock-In`), `stat` cards, `badge` indicators, and a floating EXIF verification `alert`/`toast`.
- **Interactive Inline Velocity Calculator Section (`#calculator`)**:
  - Embed an interactive **Live Speed Preview Card** directly on the landing page using daisyUI `range`, `input`, `join`, and `stats` so visiting fanciers can test `m/min`, `km/h`, and `m/s` calculations right on the page without even opening a modal.
- **6-Card Bento Features Section (`#features`)**:
  - Showcase Velocity Calculator, Loft Calendar, Bird Registry & Pedigrees, Photo EXIF Verification, Training Programs & AI Advisor, and Offline-First PWA Sync using daisyUI `card`, `badge`, and semantic icon containers.
- **Race-Day Workflow Timeline & FAQ Accordion (`#faq`)**:
  - Add a daisyUI `collapse collapse-plus` FAQ section answering common pigeon racing questions (offline field clocking, `m/min` formula, next-day arrivals, and PWA installation).
- **PWA Phone Mockup (`mockup-phone` & `steps`) + CTA Banner + `footer`**.

## Impact
- **Affected specs**: `landing-page`, `ui-design-system`
- **Affected code**:
  - `components/LandingPage.tsx`
  - `components/SpeedCalculatorModal.tsx`
