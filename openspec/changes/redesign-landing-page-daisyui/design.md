# Design: Full Landing Page Redesign (`redesign-landing-page-daisyui`)

## Component Architecture (`components/LandingPage.tsx`)
All sections use `data-theme="dark"` and daisyUI v5 semantic classes combined with `border-white/10` and `backdrop-blur` surfaces:

1. **Navigation (`navbar`)**:
   - `navbar-start`: Mobile `dropdown` menu (`btn-ghost lg:hidden`) + Brand logo (`FlyMetric`) + `badge-warning badge-outline`.
   - `navbar-center`: `menu menu-horizontal` with links to `#features`, `#calculator`, `#install`, and `#faq`.
   - `navbar-end`: Quick Calculator modal trigger (`btn-ghost`) + Google OAuth Sign In (`btn-primary`).
2. **Hero Section**:
   - Left column: Promo `badge`, gradient headline, `btn-primary` (`Continue with Google`), `btn-outline` (`Try Speed Calculator`), and `stats` bar (`100% Offline`, `m/min Velocity`, `EXIF Proof`).
   - Right column: Interactive `mockup-window` with clickable `tabs-box` (`Loft Overview`, `Race Calendar`, `Live Clock-In`) + interactive toggle/progress controls inspired by `daisyui.com`.
3. **Inline Live Speed Calculator Section (`#calculator`)**:
   - Interactive daisyUI `card` on the page where users can drag a distance `range range-warning` slider (`10 km` – `800 km`) or type distance & flight times, immediately rendering `stats` for `m/min`, `km/h`, and `m/s`.
4. **Bento Capabilities Grid (`#features`)**:
   - 6 daisyUI `card` components with `badge` tags, semantic icon containers (`bg-primary/15`, `bg-secondary/15`, `bg-success/15`, `bg-info/15`, `bg-accent/15`, `bg-warning/15`), and hover lift.
5. **PWA Installation (`#install`) & FAQ Accordion (`#faq`)**:
   - `steps steps-vertical` + `mockup-phone` showing the mobile app experience.
   - 4 daisyUI `collapse collapse-plus bg-base-200/70 border border-white/10` items for FAQs.
6. **CTA Banner & Footer (`footer`)**:
   - High-contrast conversion card and structured footer links.
