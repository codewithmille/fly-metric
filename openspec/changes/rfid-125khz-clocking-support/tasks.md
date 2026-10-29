# Implementation Tasks: 125kHz RFID Electronic Clocking Integration

- [x] 1. Schema & Types
  - [x] 1.1 Add `rfidTag` to `LoftBird` in `prisma/schema.prisma`
  - [x] 1.2 Update `app/api/loft-birds/route.ts` to support `rfidTag` in GET, POST, and PUT handlers
  - [x] 1.3 Update `LoftBird` TypeScript interfaces across all components (`lib/apiClient.ts`, `app/page.tsx`, `components/BirdRegistryModal.tsx`, `components/QuickClockInModal.tsx`, `components/ActivityModal.tsx`, `components/ProfileModal.tsx`, `components/VerifyPhotoModal.tsx`)
- [x] 2. RFID Reader Hook / Utility
  - [x] 2.1 Create reusable `useRfidScanner` utility hook or listener for rapid HID keyboard events
- [x] 3. Bird Registry Integration (`components/BirdRegistryModal.tsx`)
  - [x] 3.1 Add RFID Ring Tag input with scan status indicator to Add Bird modal
  - [x] 3.2 Add RFID Ring Tag input to Edit Bird modal
  - [x] 3.3 Add RFID badge to Bird Cards and Bird Table in the registry view
- [x] 4. Quick Clock-In Integration (`components/QuickClockInModal.tsx`)
  - [x] 4.1 Add RFID Scanner banner and status toggle
  - [x] 4.2 Implement auto-matching: select pigeon, update arrival time to current minute, and recalculate speed upon scan
  - [x] 4.3 Add instant auto-submit toggle option for hands-free clocking
  - [x] 4.4 Show clear feedback for unregistered RFID tags with quick link/hint
- [x] 5. Verification & Testing
  - [x] 5.1 Run `npx tsc --noEmit` to verify type safety
  - [x] 5.2 Test manual entry and simulated RFID keyboard scan
