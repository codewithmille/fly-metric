# Implementation Tasks: Admin Group Activity Race & Club Competition

## Phase 1: Database Schema & API Routes
- [x] 1.1 Encapsulate Group Activity Race metadata via `lib/groupRaces.ts` storing group payload in existing `participatingBirds` and `birds` columns (100% backward-compatible with Supabase PostgreSQL, zero DDL migration errors).
- [x] 1.2 Generate Prisma client (`npx prisma generate`) matching live database schema.
- [x] 1.3 Create `app/api/group-races/route.ts` supporting `GET` (list available/user group races) and `POST` (create group race as Admin).
- [x] 1.4 Create `app/api/group-races/[id]/join/route.ts` to validate Join Code and enroll loft with basketted birds.
- [x] 1.5 Create `app/api/group-races/[id]/clock/route.ts` to receive multi-loft bird clock-in records and update live group arrivals.

## Phase 2: UI Modals & Components
- [x] 2.1 Build `components/CreateGroupRaceModal.tsx` for Admins (event name, release point, distance, release time, cut-off time, join code generation).
- [x] 2.2 Build `components/JoinGroupRaceModal.tsx` for Fanciers (enter 6-digit Join Code, review race details, multi-select participating birds from loft registry, confirm entry).
- [x] 2.3 Build `components/GroupRaceCockpitModal.tsx` (unified live leaderboard with `m/min` & `km/h`, enrolled lofts drawer, admin race status controls: Basketing / Released / Closed).
- [x] 2.4 Add one-click share & clipboard copy for race join code and invite URL.

## Phase 3: Integration into Loft Activities & Clock-In
- [x] 3.1 Update `components/LoftActivitiesModal.tsx` to display `🌐 Group Race` indicator tags on group activities.
- [x] 3.2 Add a clean `[ 🌐 Join Race ]` pill button in `LoftActivitiesModal.tsx` sub-toolbar.
- [x] 3.3 Connect `QuickClockInModal.tsx` and RFID clocking so clocking a bird enrolled in a Group Race automatically registers arrival on both the local event and the group leaderboard.

## Phase 4: Verification & Polish
- [x] 4.1 Verify end-to-end flow: Admin creates group race → Fancier joins with code and baskets birds → Clock-in updates group leaderboard.
- [x] 4.2 Run TypeScript verification (`npx tsc --noEmit`) to confirm zero compilation errors.
- [x] 4.3 Test offline resilience: Clock-in while disconnected and sync arrivals once reconnected.
