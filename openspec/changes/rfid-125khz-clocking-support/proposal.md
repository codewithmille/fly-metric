# Change Proposal: 125kHz RFID Electronic Clocking Integration

## Why
Pigeon fanciers use 125kHz electronic snap leg rings (EM4100 / TK4100 chip) and USB RFID proximity readers to automatically clock pigeon arrival times without manually typing ring numbers or timestamps. The USB reader acts as a Human Interface Device (HID) keyboard that types the 10-digit tag ID and sends an `Enter` key in ~50ms. 

FlyMetric needs native support for:
1. Pairing electronic RFID ring tags to pigeon profiles in the Bird Registry.
2. Listening for incoming RFID scans in the Quick Clock-In modal and instantly matching the bird, setting the current arrival time, and calculating live velocity.

## What Changes
1. **Data Model & Types**:
   - Add `rfidTag?: string | null` to `LoftBird` in Prisma schema, API route, client cache, and modal interfaces.
2. **Bird Registry (`components/BirdRegistryModal.tsx`)**:
   - Add RFID Ring Tag field to Add and Edit pigeon forms.
   - Include a "Scan Mode" listener that auto-captures the 10-digit RFID code from the USB reader.
   - Display an RFID indicator badge on registered birds in the loft list.
3. **Quick Clock-In (`components/QuickClockInModal.tsx`)**:
   - Add a live 125kHz RFID Scanner listener (`keydown` buffer detection for HID readers).
   - When a bird's ring is tapped on the reader, automatically lookup the pigeon, select it, sync current time, and preview velocity.
   - Provide an optional "Instant Auto-Save on RFID Scan" toggle.

## Impact
- Fanciers can plug their USB RFID reader into their PC/laptop or via USB-OTG on Android and immediately enjoy an electronic clocking system (ETS) at zero driver configuration cost.
