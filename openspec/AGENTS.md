# OpenSpec Instructions for AI Coding Agents

These instructions define the **OpenSpec** spec-driven development workflow for **FlyMetric (SpeedCal)** using **`/describe` → `/clarify` → `/build`**.

## Interaction Rule: Plain-Text Questions First (NO Multiple-Choice Picker)
- **NEVER use the `ask_question` multiple-choice tool** when `/describe` or `/clarify` is invoked.
- When the user types `/describe` without a topic, **do NOT explore files or show a multiple-choice popup**. Reply immediately in **plain text** asking what feature, workflow, or UI change they want to describe, and wait for their free-text response.

## Directory Structure
```text
openspec/
├── project.md                  # Global project context, stack, and design conventions
├── AGENTS.md                   # This workflow guide
├── specs/                      # Current truth (implemented specifications)
│   └── <capability>/
│       └── spec.md             # Requirements and scenarios
└── changes/                    # Proposed or active changes
    ├── <change-id>/
    │   ├── proposal.md         # Why and what is changing
    │   ├── design.md           # Technical & UI design decisions
    │   ├── tasks.md            # Implementation checklist (- [ ] / - [x])
    │   └── specs/              # Spec deltas (ADDED / MODIFIED / REMOVED)
    │       └── <capability>/
    │           └── spec.md
    └── archive/                # Completed and merged changes
```

## Workflow Commands (`/describe` → `/clarify` → `/build`)

### 1. `/describe` — Ask What to Describe & Scaffold Change Proposal
When the user types `/describe`:
1. **If no topic was provided**: Ask the user in **plain text** what feature or UI change they want to describe (no `ask_question` multiple-choice card).
2. **Once the user describes their idea**:
   - Read `openspec/project.md` and existing `openspec/specs/` capabilities.
   - Choose a verb-led `change-id` in kebab-case (e.g., `upgrade-bird-registry-ui`).
   - Scaffold under `openspec/changes/<change-id>/`:
     - `proposal.md`: Summary of **Why**, **What Changes**, and **Impact**.
     - `design.md`: Component architecture, Tailwind/daisyUI `dark` theme tokens, data flow.
     - `tasks.md`: Numbered checklist of actionable steps (`- [ ] 1.1 ...`).
     - `specs/<capability>/spec.md`: Delta requirements using `### Requirement: <Name>` and `#### Scenario: <Name>` (`**WHEN** ... **THEN** ...`).

### 2. `/clarify` — Clarify Requirements OR Explain What Happened (Plain Text)
When the user types `/clarify`:
- **Before `/build` (Resolve Ambiguities)**: Ask concise **plain-text** questions in chat (never `ask_question` multiple-choice cards) to resolve UI/UX or technical decisions, then update `proposal.md`, `design.md`, and `tasks.md`.
- **During or After `/build` ("What Happened?")**: Inspect `openspec/changes/<change-id>/tasks.md` and modified code to give a clear plain-text report of **what happened**—which tasks were completed (`[x]`), which files changed and why, how the spec scenarios are met, and what steps remain (`[ ]`).

### 3. `/build` — Build & Verify the Change
When the user types `/build [change-id]`:
1. Read `proposal.md`, `design.md`, and `tasks.md` in the active change folder.
2. Execute tasks sequentially, adhering to Next.js 16 rules and the **daisyUI `dark` + shadcn-style** UI guidelines in `openspec/project.md`.
3. Verify with `npx tsc --noEmit` and update every completed item in `tasks.md` to `- [x]`.

### 4. `/archive` — Archive Completed Change (Optional)
Once implementation is verified:
1. Merge delta specs from `openspec/changes/<change-id>/specs/<capability>/spec.md` into `openspec/specs/<capability>/spec.md`.
2. Move `openspec/changes/<change-id>/` to `openspec/changes/archive/YYYY-MM-DD-<change-id>/`.
