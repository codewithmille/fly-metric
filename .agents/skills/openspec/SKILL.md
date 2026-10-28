---
name: openspec
description: Spec-driven development workflow (OpenSpec) for FlyMetric using /describe, /clarify, and /build with daisyUI dark theme and shadcn-style components.
---

# OpenSpec Workflow Skill (`/describe` → `/clarify` → `/build`)

Use this skill whenever the user invokes `/describe`, `/clarify`, `/build`, or asks to work with OpenSpec specs in `openspec/`.

## Interaction Rule: Plain-Text Questions Only
- **NEVER call the `ask_question` multiple-choice tool** during `/describe` or `/clarify`.
- Always converse with the user in **plain text** in the chat so they can freely describe or clarify what they want without a pre-filled multiple-choice popup.

## 1. Context Loading
Always read:
- [`openspec/project.md`](../../../openspec/project.md) for stack, daisyUI `dark` theme tokens, and domain rules.
- [`openspec/AGENTS.md`](../../../openspec/AGENTS.md) for directory conventions and spec formatting rules.

## 2. Workflow Commands

### `/describe` (Stage 1: Ask What to Describe → Scaffold Proposal)
1. **If the user types `/describe` with no topic**: Immediately ask them in **plain text** what feature, bugfix, or UI change they want to describe (do not explore files or show a multiple-choice picker first).
2. **Once the user describes their topic**:
   - Inspect existing capabilities in `openspec/specs/`.
   - Create `openspec/changes/<change-id>/` with:
     - `proposal.md` (Why, What Changes, Impact)
     - `design.md` (UI components, daisyUI/shadcn classes, state/API design)
     - `tasks.md` (Step-by-step checklist `- [ ]`)
     - `specs/<capability>/spec.md` (`## ADDED Requirements` / `## MODIFIED Requirements`)

### `/clarify` (Stage 2: Clarify Decisions OR Explain What Happened)
- **Before `/build`**: Ask open, plain-text questions in chat to resolve any design/UX ambiguities and update `proposal.md`, `design.md`, and `tasks.md`.
- **During / After `/build` ("What Happened?")**: Audit `openspec/changes/<change-id>/tasks.md` and modified files to explain clearly in plain text what happened, which tasks finished (`[x]`), what files changed, and what remains (`[ ]`).

### `/build [change-id]` (Stage 3: Implement & Verify)
1. Read `proposal.md`, `design.md`, and `tasks.md` under `openspec/changes/<change-id>/`.
2. Implement each task in code using **daisyUI v5 (`data-theme="dark"`)** and **shadcn/ui-inspired dark styling** (`card`, `btn`, `badge`, `stats`, `mockup-window`, `mockup-phone`, `modal`, `input`, `select`, `tabs`, `border-white/10`).
3. Run `npx tsc --noEmit` to validate types.
4. Check off completed items (`- [x]`) in `tasks.md`.

### `/archive [change-id]` (Optional Cleanup)
1. Promote spec deltas into `openspec/specs/<capability>/spec.md`.
2. Move the completed change folder to `openspec/changes/archive/`.
