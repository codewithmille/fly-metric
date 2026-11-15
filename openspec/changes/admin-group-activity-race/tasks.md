# Implementation Tasks: Admin Group Activity Race & Club Competition

## Phase 1: Database Schema & API Routes
- [ ] 1.1 Update `prisma/schema.prisma` with Group Activity Race fields (`isGroupRace`, `joinCode`, `raceStatus`, `loftEntries`, `groupArrivals`).
- [ ] 1.2 Generate Prisma client and update local migrations/database seed.
- [ ] 1.3 Create `app/api/group-races/route.ts` supporting `GET` (list available/user group races) and `POST` (create group race as Admin).
- [ ] 1.4 Create `app/api/group-races/[id]/join/route.ts` to validate Join Code and enroll loft with basketted birds.
- [ ] 1.5 Create `app/api/group-races/[id]/clock/route.ts` to receive multi-loft bird clock-in records and update live group arrivals.

## Phase 2: UI Modals & Components
- [ ] 2.1 Build `components/CreateGroupRaceModal.tsx` for Admins (event name, release point, distance, release time, cut-off time, join code generation).
- [ ] 2.2 Build `components/JoinGroupRaceModal.tsx` for Fanciers (enter 6-digit Join Code, review race details, multi-select participating birds from loft registry, confirm entry).
- [ ] 2.3 Build `components/GroupRaceCockpitModal.tsx` (unified live leaderboard with `m/min` & `km/h`, enrolled lofts drawer, admin race status controls: Basketing / Released / Closed).
- [ ] 2.4 Add one-click share & clipboard copy for race join code and invite URL.

## Phase 3: Integration into Loft Activities & Clock-In
- [ ] 3.1 Update `components/LoftActivitiesModal.tsx` to display `🌐 Group Race` indicator tags on group activities.
- [ ] 3.2 Add a clean `[ 🌐 Join Race ]` pill button in `LoftActivitiesModal.tsx` sub-toolbar.
- [ ] 3.3 Connect `QuickClockInModal.tsx` and RFID clocking so clocking a bird enrolled in a Group Race automatically registers arrival on both the local event and the group leaderboard.

## Phase 4: Verification & Polish
- [ ] 4.1 Verify end-to-end flow: Admin creates group race → Fancier joins with code and baskets 3 birds → Clock-in updates group leaderboard.
- [ ] 4.2 Run TypeScript verification (`npx tsc --noEmit`) to confirm zero compilation errors.
- [ ] 4.3 Test offline resilience: Clock-in while disconnected and sync arrivals once reconnected.
