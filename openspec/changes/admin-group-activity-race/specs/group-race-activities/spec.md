# Specification: Group Race Activities & Club Competition

## ADDED Requirements

### Requirement: Admin Creation of Group Activity Race
The system SHALL enable an administrator or race organizer to configure and publish a multi-loft group activity race event.

#### Scenario: Admin creates a new group race with join code
- **GIVEN** an authenticated user with admin or race organizer role
- **WHEN** the user opens "Create Group Race" and provides Title, Release Location, Release Coordinates, Distance, Date, and Release Time
- **THEN** the system generates a unique 6-character alphanumeric `joinCode` (e.g. `FLY-849`)
- **AND** sets `isGroupRace = true` and `raceStatus = 'basketing'`
- **AND** displays the join code with one-click copy and shareable link.

---

### Requirement: Fancier Joining a Group Race via Code
The system SHALL allow any registered fancier to join an open group race by entering its valid Join Code and enrolling birds from their registered loft birds.

#### Scenario: Fancier enters join code and enrolls birds
- **GIVEN** an active group race with `raceStatus = 'basketing'`
- **WHEN** a fancier enters the valid 6-character `joinCode` in "Join Group Race"
- **THEN** the system displays the race release details and distance
- **AND** loads the fancier's active loft birds for entry selection
- **AND** upon clicking "Confirm Enrollment", registers the loft and selected bird ring numbers under `loftEntries`.

#### Scenario: Fancier attempts to join a closed or non-existent race
- **GIVEN** an invalid join code or a group race whose status is `released` or `completed`
- **WHEN** a fancier submits the join code
- **THEN** the system returns an informative error explaining that the code is invalid or basketing has closed.

---

### Requirement: Unified Multi-Loft Leaderboard & Telemetry
The system SHALL compile and display real-time arrival velocity rankings across all lofts participating in a group race.

#### Scenario: Participant clocks in bird and appears on group leaderboard
- **GIVEN** a bird enrolled in an active group race
- **WHEN** the participant clocks the bird via RFID scanner, manual clock-in, or photo verification
- **THEN** the system calculates velocity: $\text{velocity (m/min)} = \frac{\text{distance in meters}}{\text{flight time in minutes}}$
- **AND** converts velocity to secondary readout $\text{km/h} = \text{velocity} \times 0.06$
- **AND** publishes the entry to the shared group race leaderboard ranked by highest velocity.

---

### Requirement: Admin Race Control & Status Transition
The system SHALL give the group race organizer controls to manage race lifecycles.

#### Scenario: Admin closes basketing and marks race as released
- **GIVEN** an admin managing an active group race in basketing phase
- **WHEN** the admin clicks "Close Basketing & Release" at the designated release time
- **THEN** no further bird entries are accepted
- **AND** the race status updates to `released` with official release time locked.
