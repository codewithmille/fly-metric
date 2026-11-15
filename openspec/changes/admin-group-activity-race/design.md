# Technical Design: Admin Group Activity Race & Club Competition

## Architecture Overview
The Group Activity Race feature allows an authorized admin/race director to organize multi-loft races and derbies. Fanciers can discover or join via code, register entries from their local loft registry, and clock in birds so results stream into a unified multi-loft leaderboard.

```
┌─────────────────────────────────────────────────────────────┐
│                       Admin Flow                            │
│  [ Create Group Race ] ──► [ Generate Join Code & Config ]  │
│                                    │                        │
│                                    ▼                        │
│                           [ Group Race Event ]              │
│                                    ▲                        │
│                                    │                        │
│  [ Join with Code ] ──► [ Basket Birds from Registry ]       │
│                       Fancier / Member Flow                 │
└─────────────────────────────────────────────────────────────┘
                               │
                               ▼
        ┌──────────────────────────────────────────────┐
        │       Unified Multi-Loft Leaderboard         │
        │  • Live Clock-in (RFID / Manual / Camera)   │
        │  • Velocity (m/min & km/h)                   │
        │  • Rank by Speed, Cut-off Validation         │
        └──────────────────────────────────────────────┘
```

## Data Model & Schema Strategy

We extend the Prisma schema with lightweight, flexible group race properties on `RaceEvent` or related models:

```prisma
// Extension in prisma/schema.prisma
model RaceEvent {
  // Existing fields ...
  id                 String   @id @default(uuid())
  userId             String   @map("user_id")
  userEmail          String   @map("user_email")
  title              String
  date               String
  location           String?
  club               String?
  distance           Float    @default(0)
  releaseTime        String?  @map("release_time")
  
  // New Group Activity Race fields:
  isGroupRace        Boolean  @default(false) @map("is_group_race")
  joinCode           String?  @unique @map("join_code") // e.g. "FLY-782"
  raceStatus         String   @default("basketing") @map("race_status") // "basketing", "released", "cut_off", "completed"
  loftEntries        String?  @map("loft_entries") // JSON array of joined lofts: [{ loftId, loftName, fancierName, birdRings: [] }]
  groupArrivals      String?  @map("group_arrivals") // JSON array of multi-loft clockings
}
```

## UI & Styling Standards (daisyUI v5 Dark + shadcn/ui Surfaces)

All new modals and views follow the obsidian dark cockpit aesthetics:

1. **Containers & Cards**:
   - `background: 'linear-gradient(135deg, rgba(20, 27, 45, 0.75) 0%, rgba(13, 18, 30, 0.9) 100%)'`
   - `border: '1px solid rgba(255, 255, 255, 0.08)'`
   - `box-shadow: '0 8px 32px rgba(0, 0, 0, 0.5)'`
   - `border-radius: '0.75rem'`

2. **Group Race Banner & Join Code Badge**:
   - Highlight badge: `bg-amber-500/15 border border-amber-500/30 text-amber-400 font-mono font-black text-sm px-3 py-1.5 rounded-lg`
   - One-click copy button for Join Code and direct URL invite (`https://flymetric.app/join/{code}`).

3. **Leaderboard Component**:
   - High-contrast table with gold `#FFC107` for 1st place, silver `#cbd5e1` for 2nd place, bronze `#f59e0b` for 3rd place.
   - Dual speed display: Primary velocity in `m/min` with secondary `⚡ km/h` calculated in real-time ($v \times 0.06$).
   - Loft identity column displaying Loft Name, Fancier Name, and Loft Coordinates/Distance if variable distances are active.

4. **Integration into `LoftActivitiesModal.tsx`**:
   - Add a sleek **"Group Races"** action button in the activities sub-toolbar:
     `[ 🌐 Join Group Race ]` alongside `[ + Log Activity ]`.
   - Cards marked with `🌐 Group Race` badge and active join code.

## Offline-First Handling
- If a fancier loses internet connectivity during the race, their bird arrivals are saved to `localStorage` and queued in `lib/apiClient.ts`.
- As soon as the device reconnects (`window.addEventListener('online')`), pending clock-in submissions are synced to the group race leaderboard.
