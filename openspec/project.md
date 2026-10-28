# Project Context: FlyMetric (SpeedCal)

## Purpose
**FlyMetric** is an offline-first Progressive Web App (PWA) and clocking dashboard built for pigeon racing fanciers. It enables fanciers to calculate pigeon velocity in meters per minute (`m/min`), verify arrival clock-in photos (EXIF/timestamp), manage a loft bird & pedigree registry, schedule training tosses and races on a unified calendar, and consult an AI Loft Advisor—both online and offline.

## Tech Stack
- **Framework**: Next.js 16.2+ (App Router, React 19, TypeScript 5)
- **Styling & UI System**:
  - Tailwind CSS v4 (`@tailwindcss/postcss`)
  - **daisyUI v5** (`data-theme="dark"` default theme with FlyMetric Gold `#FFC107` & semantic dark surfaces)
  - **shadcn/ui-inspired patterns**: Crisp `1px` subtle borders (`border-base-content/10`), glassmorphic surfaces (`bg-base-200/80 backdrop-blur`), clean typography (`Geist` & `Geist Mono`), and accessible interactive primitives.
- **Database & Auth**:
  - Supabase Auth (Google OAuth)
  - PostgreSQL with Prisma ORM (`@prisma/client`, `@prisma/adapter-pg`)
- **Offline & PWA**:
  - Service Worker + LocalStorage / IndexedDB offline queue (`lib/apiClient.ts`)
- **Calendar & Maps**:
  - FullCalendar (`@fullcalendar/react`, `daygrid`, `interaction`)
  - Leaflet (`leaflet`) for release-point & loft distance coordinates
- **Testing**:
  - Playwright E2E (`@playwright/test`)

## Project Conventions

### UI & Styling Standards
1. **Default Theme**: Always target `data-theme="dark"` on the root `<html>` element.
2. **Component Classes**:
   - Prefer **daisyUI v5** semantic component classes (`btn`, `badge`, `card`, `stats`, `stat`, `navbar`, `mockup-window`, `mockup-phone`, `tabs`, `tab`, `modal`, `input`, `select`, `table`, `alert`, `avatar`, `divider`) combined with **shadcn-style** border and surface refinements (`border border-white/10`, `bg-base-200/60`, `backdrop-blur-md`, `shadow-xl`).
   - Brand Accent: Retain `#FFC107` (Amber/Gold) for primary racing highlights, badges, and key velocity readouts.
3. **Domain Terminology**:
   - Standard velocity unit is **meters per minute (`m/min`)**, with secondary readouts in `km/h` and `m/s`.
   - Core entities: **Loft Bird** (`ringNo`, `name`, `color`, `gender`, `strain`, `sire`, `dam`), **Race / Activity Event** (`Race`, `Training`, `Medication`, `Task`), and **Clock-In Record**.

### Architecture Patterns
- **Offline-First Sync**: All mutations must support offline queueing via `lib/apiClient.ts` when `navigator.onLine` is `false`.
- **Spec-Driven Changes**: Non-trivial UI, schema, or workflow updates follow the OpenSpec lifecycle (`openspec/changes/<change-id>/` -> `openspec/specs/`).
