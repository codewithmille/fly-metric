# Capability Specification: 125kHz RFID Electronic Clocking

## ADDED Requirements

### Requirement: Electronic RFID Ring Pairing
Fanciers MUST be able to pair 125kHz RFID snap rings (EM4100 / TK4100 chips) with pigeons in their loft registry either by scanning the ring on a connected USB RFID reader or by entering the 10-digit tag code.

#### Scenario: Scanning an RFID ring when registering a bird
- **GIVEN** a fancier has a USB 125kHz RFID reader connected and the "Add Pigeon" modal open
- **WHEN** the fancier taps the blue snap ring against the reader
- **THEN** the reader transmits the tag serial code followed by Enter
- **AND** the app populates the `RFID Tag` field with the tag number and confirms readiness to save.

### Requirement: Automated RFID Arrival Clock-In
Fanciers MUST be able to automatically clock in returning pigeons during race or toss events by scanning the pigeon's leg tag on the RFID reader.

#### Scenario: Swiping a registered pigeon's ring in Quick Clock-In
- **GIVEN** a race event is active and the Quick Clock-In modal is open
- **WHEN** the returning bird's RFID ring is read by the USB scanner
- **THEN** the app matches the RFID tag against the loft's registered birds
- **AND** selects the matching bird automatically
- **AND** updates the clock-in timestamp to the current time
- **AND** recalculates flying duration, velocity (m/min), and projected rank.

#### Scenario: Swiping an unregistered RFID ring
- **GIVEN** an RFID ring that is not yet paired to any loft bird is scanned
- **WHEN** the scan is received in Quick Clock-In
- **THEN** the app displays an alert indicating the tag number is unrecognized and instructs the fancier to pair it in the Bird Registry.
