## ADDED Requirements

### Requirement: Interactive Inline Velocity Calculator on Landing Page
The landing page (`components/LandingPage.tsx`) SHALL include an inline interactive velocity calculator section (`#calculator`) built with daisyUI `card`, `range`, `input`, and `stats` components that computes `m/min`, `km/h`, and `m/s` in real time without requiring authentication.

#### Scenario: Visitor adjusts distance or flight time on the landing page
- **WHEN** an unauthenticated visitor changes the distance slider/input or release/arrival time in `#calculator`
- **THEN** the calculated speed in `m/min`, `km/h`, and `m/s` updates immediately inside the daisyUI `stats` display

### Requirement: Responsive Navigation, Interactive Hero Mockup, and FAQ Accordion
The landing page SHALL provide a responsive daisyUI `navbar` (including a mobile `dropdown` menu), an interactive `mockup-window` with switchable tabs in the hero section, a 6-card Bento features grid, a `mockup-phone` PWA install guide, and a daisyUI `collapse collapse-plus` FAQ accordion (`#faq`).

#### Scenario: Visitor navigates landing page sections and expands FAQ items
- **WHEN** a visitor clicks navigation links or opens an FAQ item in `#faq`
- **THEN** the page scrolls smoothly to the target section and expands the selected `collapse` item in daisyUI `dark` theme
