# Change Proposal: Admin Group Activity Race & Club Competition

## Why
Currently in FlyMetric, every race event or training flight is purely local and isolated to an individual fancier's loft. Club organizers, race directors, and loft admins lack the capability to create **shared group activity races** (club derbies, multi-loft tosses, or inter-loft tournaments) where multiple fanciers can join with a code, enroll their registered birds, clock in via RFID/manual clocking, and compete on a synchronized, real-time leaderboard with velocity telemetry (`m/min` and `km/h`).

Adding this capability transforms FlyMetric from a single-loft offline tool into a collaborative club racing platform while preserving its offline-first PWA resilience.

## What Changes
1. **Admin Group Race Creation**:
   - Admins can create a group activity race with:
     - Event Title (e.g. *McArthur Club Derby 2026*, *North Circuit Race 1*)
     - Release Point (Location name & GPS coordinates)
     - Release Date & Release Time
     - Distance in km (standard or individual loft coordinate calculated)
     - Auto-generated 6-character **Join Code** (e.g. `FLY-982`) and one-click share link
     - Race status management: `Basketing Open` → `Released` → `Official / Completed`

2. **Fancier "Join Group Race" Flow**:
   - Fanciers can click **"Join Group Race"** in the Activities & Flights modal or navbar.
   - Enter the 6-character Join Code to preview race details.
   - Select and basket participating birds from their registered Loft Bird Registry (`participatingBirds`).
   - Submit enrollment with loft name and owner details.

3. **Unified Multi-Loft Leaderboard**:
   - Consolidated live leaderboard ranking arrivals across all joined lofts.
   - Automatic velocity telemetry calculation ($v = \text{distance} / \text{flight\_duration}$) displayed in both **m/min** and **km/h**.
   - Badges for Loft Name, Fancier Name, Ring No., Clock-In Time, and verification status (RFID / Camera Photo).

4. **Admin Race Control Cockpit**:
   - Admin view displaying list of enrolled lofts, total bird entry count, and bird basketing status.
   - Ability to lock entries when basketing closes, trigger official release time, and export/print official race result sheets.

## Impact
- **Prisma Schema**: Update `RaceEvent` model to support group race flags (`isGroupRace`, `joinCode`, `organizerId`, `status`, `enrolledLofts`).
- **API Endpoints**:
  - `GET /api/group-races`: List public or active group races.
  - `POST /api/group-races`: Create a new group race event (Admin).
  - `POST /api/group-races/[id]/join`: Enroll loft and basketted birds using join code.
  - `GET /api/group-races/[id]/leaderboard`: Live unified standings.
- **UI Components**:
  - `components/CreateGroupRaceModal.tsx`: Admin modal to configure and launch a group race.
  - `components/JoinGroupRaceModal.tsx`: Fancier modal to enter code and basket birds.
  - `components/GroupRaceCockpitModal.tsx`: Shared live leaderboard and admin race control.
  - Updates to `components/LoftActivitiesModal.tsx` adding group race indicators and join actions.
