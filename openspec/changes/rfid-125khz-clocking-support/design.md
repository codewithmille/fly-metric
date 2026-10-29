# Technical & UI Design: 125kHz RFID Electronic Clocking Integration

## 1. Hardware & Protocol Overview
- **Device**: 125kHz EM4100 / TK4100 USB Proximity Sensor (USB HID Keyboard emulation).
- **Behavior**: On contact/proximity, transmits a 10-digit decimal ID (e.g., `000222647787` or `222647787`) at high typing speed (< 50ms total), followed by a standard `Enter` key (`keyCode: 13`).
- **Web Detection Logic**:
  - Maintain a keypress buffer with a timestamp window (< 80ms between keystrokes).
  - When `Enter` is detected and the buffer contains 8-14 numeric digits, recognize it as an RFID scan event.
  - Dispatch a custom callback `onRfidScan(tagId)` to handle bird pairing or clock-in.

## 2. UI / Component Enhancements

### A. Bird Registry (`BirdRegistryModal.tsx`)
- In `Add Bird` & `Edit Bird` modals:
  - Input: `RFID Tag (e.g. 10-digit ring code)`
  - Quick action button: `Tap or Click to Scan` with pulsing indicator.
  - When focused or when reader is tapped, the buffer fills and completes without manual submission.
- In Loft Bird Cards:
  - Add badge: `chip` icon + `RFID: ••••4787` (or "No RFID" subtle pill).

### B. Quick Clock-In (`QuickClockInModal.tsx`)
- Visual Scanner Header Banner:
  - `📡 125kHz RFID Reader Ready` (Amber / Emerald indicator)
  - Helper tooltip: *"Tap pigeon ring on reader or type tag code"*
- Auto-Match Handler:
  - When scan fires:
    - Match against `registeredBirds.find(b => b.rfidTag === scannedTag || b.ringNo.toLowerCase() === scannedTag.toLowerCase())`.
    - If found:
      - Set `selectedBirdId = bird.id`
      - Set `clockInTime = current local time`
      - Flash confirmation: `⚡ Scanned: ${bird.name || bird.ringNo}`
      - If "Auto-Submit on RFID Scan" is toggled ON, immediately trigger `handleSaveClockIn()`.
    - If not found:
      - Display amber alert: `⚠️ Unregistered RFID Tag "${scannedTag}". Pair this ring in Bird Registry first.`

## 3. Data Flow & Prisma
- Update `prisma/schema.prisma`:
  - `rfidTag String? @map("rfid_tag")` in `LoftBird`.
- Update `app/api/loft-birds/route.ts`:
  - Accept and return `rfidTag` in GET, POST, PUT.
- Update `lib/apiClient.ts`:
  - Preserve `rfidTag` across local cache and offline sync queue.
