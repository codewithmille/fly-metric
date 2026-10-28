# Capability: UI Design System (`ui-design-system`)

## Overview
Defines the dark-mode component architecture and visual standards for FlyMetric using **Tailwind CSS v4**, **daisyUI v5 (`data-theme="dark"`)**, and **shadcn/ui-inspired surface primitives**.

## Requirements

### Requirement: Dark Theme Configuration via daisyUI v5
The application SHALL configure daisyUI v5 in Tailwind CSS v4 with the `dark` theme enabled by default on the root `<html data-theme="dark">` element.

#### Scenario: Root HTML renders in dark mode
- **WHEN** any user visits the landing page or authenticated dashboard
- **THEN** the `<html>` element includes `data-theme="dark"` and `class="dark"`
- **AND** daisyUI semantic tokens (`base-100`, `base-200`, `base-300`, `primary`, `warning`, `success`, `info`, `error`) resolve to dark-mode surfaces with FlyMetric gold (`#FFC107`) accents

### Requirement: Landing Page Built with daisyUI & shadcn-Style Dark Primitives
The unauthenticated landing page (`components/LandingPage.tsx`) SHALL use daisyUI v5 components (`navbar`, `btn`, `badge`, `stats`, `stat`, `mockup-window`, `mockup-phone`, `card`, `steps`, `step`, `footer`) styled with shadcn-inspired `1px` translucent borders (`border-white/10`) and glassmorphic surfaces.

#### Scenario: Visitor interacts with Hero & Quick Speed Calculator
- **WHEN** an unauthenticated visitor loads `/`
- **THEN** the hero displays a primary `Continue with Google` (`btn btn-primary`) CTA, a secondary `Try Speed Calculator` (`btn btn-outline`) CTA, a `stats` bar, and an interactive `mockup-window` loft preview
- **AND** clicking `Try Speed Calculator` opens the `SpeedCalculatorModal` without requiring authentication

### Requirement: Dashboard & Calculator Dark UI Consistency
The authenticated dashboard (`app/page.tsx`) and speed calculator modal (`components/SpeedCalculatorModal.tsx`) SHALL integrate daisyUI dark-mode badges, buttons, stats cards, segmented tabs, and bordered inputs while retaining all functional element IDs and offline-first sync indicators.

#### Scenario: Authenticated user views dashboard and switches view modes
- **WHEN** an authenticated fancier views the main dashboard
- **THEN** the navbar, online/offline status badge, 4-card stats bar, and `List` / `Calendar` tabs render with daisyUI `dark` + shadcn-style surfaces
