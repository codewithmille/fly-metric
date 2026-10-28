---
name: describe
description: OpenSpec Stage 1 (/describe) — Describe and scaffold a new feature or UI change proposal in openspec/changes/<change-id>/ with proposal.md, design.md, tasks.md, and spec deltas.
---

# `/describe` — OpenSpec Proposal & Spec Generator

Use this skill when the user invokes `/describe`.

## Important Rule: Ask in Plain Text First (NO Multiple-Choice Picker)
- **NEVER call the `ask_question` tool** (do not show a multiple-choice options card) when `/describe` is triggered.
- **If the user only types `/describe` without specifying what they want to build or change:**
  1. Do **NOT** run commands, explore files, or guess options.
  2. Immediately reply with a short, friendly **plain-text question** in chat asking what feature, workflow, or UI change they want to describe (e.g., *"Anong feature o UI change ang gusto mong i-describe para sa OpenSpec proposal?"* / *"What feature or UI change would you like to describe?"*).
  3. Wait for the user's free-text reply before scaffolding the files.

## Workflow Steps (Once the User's Topic is Known)
When the user provides their topic (either directly as `/describe <topic>` or in their reply):
1. **Load Project Context**:
   - Read [`openspec/project.md`](../../../openspec/project.md) and [`openspec/AGENTS.md`](../../../openspec/AGENTS.md).
   - Check existing capabilities under `openspec/specs/`.
2. **Choose `<change-id>`**:
   - Pick a concise kebab-case ID (e.g., `upgrade-bird-registry-ui`, `add-race-weather-log`).
3. **Create OpenSpec Change Files** in `openspec/changes/<change-id>/`:
   - `proposal.md`: Explain **Why**, **What Changes**, and **Impact** (affected specs and files).
   - `design.md`: Detail technical decisions, **daisyUI v5 (`data-theme="dark"`)** components (`card`, `btn`, `badge`, `table`, `modal`, `tabs`, `stats`), and **shadcn-style** dark surface patterns (`border-white/10`, `bg-base-200/70 backdrop-blur`).
   - `tasks.md`: Numbered implementation checklist (`- [ ] 1.1 ...`).
   - `specs/<capability>/spec.md`: Formal spec delta (`## ADDED Requirements` / `## MODIFIED Requirements`) with `### Requirement:` and `#### Scenario:` (`**WHEN** ... **THEN** ...`).
4. **Next Step Prompt**:
   - Present a concise summary of the generated change files and tell the user they can run **`/clarify`** to refine details or **`/build`** to start implementation.
