# Design: daisyUI v5 (`dark`) + shadcn-Style Dark UI System

## Context
FlyMetric uses Next.js 16 + Tailwind CSS v4 (`@import "tailwindcss";` in `app/globals.css`). daisyUI v5 is natively built for Tailwind CSS v4 via `@plugin "daisyui"`. Combining daisyUI's zero-JS semantic component classes with shadcn/ui's signature dark-mode craftsmanship (high-contrast typography, `1px` translucent borders `border-white/10`, subtle radial gradients, and compact badge/card layouts) delivers an immediately recognizable, modern developer/pro-tool aesthetic.

## Decisions
1. **Tailwind v4 Plugin Configuration**:
   - In `app/globals.css`, load `@plugin "daisyui" { themes: dark --default; };` right after `@import "tailwindcss";`.
   - Customize the `dark` theme tokens using `@plugin "daisyui/theme"` so `primary` and `warning` align with FlyMetric's gold (`#FFC107`) while `base-100` (`#090d16`), `base-200` (`#111622`), and `base-300` (`#1a2030`) provide deep, rich shadcn-like zinc/slate dark surfaces.
2. **Component Mapping**:
   - **Navbar**: `navbar bg-base-100/80 backdrop-blur-xl border-b border-white/10 sticky top-0 z-50`
   - **Hero & Stats**: `badge badge-warning badge-outline`, `btn btn-primary`, `btn btn-outline`, `stats stats-vertical sm:stats-horizontal bg-base-200/70 border border-white/10 shadow-xl`
   - **Hero Dashboard Preview**: `mockup-window bg-base-200/90 border border-white/10 shadow-2xl` containing daisyUI `stats`, badge pills, and live clock-in cards.
   - **Features Bento Grid**: `card bg-base-200/60 hover:bg-base-200/90 border border-white/10 hover:border-warning/40 transition-all shadow-lg`
   - **PWA Install Guide**: `steps steps-vertical` + `mockup-phone border-base-300`
   - **Modals & Inputs**: `input input-bordered bg-base-100 border-white/10 focus:border-warning`, `select select-bordered`, `tabs tabs-box`
3. **Backwards Compatibility**:
   - Preserve all existing DOM IDs (`#loft-registry-nav`, `#training-prog-nav`, `#speed-calc-nav`, `#quick-clockin-nav`, `#verify-photo-nav`, `#log-new-activity-nav`, `#signout-btn`, etc.) and CSS classes used across modals and Playwright tests.
