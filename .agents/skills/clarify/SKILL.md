---
name: clarify
description: OpenSpec Stage 2 (/clarify) — Clarify requirements, resolve design questions in plain text, or explain what happened in the active OpenSpec change (completed tasks, file diffs, and remaining steps).
---

# `/clarify` — OpenSpec Clarification & Status Inspector

Use this skill when the user invokes `/clarify`.

## Important Rule: Plain-Text Conversation (NO Multiple-Choice Picker)
- **Do NOT use the `ask_question` multiple-choice tool.** Always ask clarifying questions or explain what happened directly in **plain text** in the chat so the user can answer freely.

## Mode A: Clarifying a Proposal Before `/build`
When a change in `openspec/changes/<change-id>/` has open design choices or ambiguity:
1. Read `proposal.md`, `design.md`, `tasks.md`, and `specs/<capability>/spec.md` in the active change folder.
2. Ask 1–3 concise, plain-text questions in chat about any open UI/UX or technical decisions (e.g., layout preference, daisyUI component style, offline behavior).
3. Once the user replies, update `design.md`, `tasks.md`, and `specs/<capability>/spec.md` with their decisions so `/build` has zero ambiguity.

## Mode B: Explaining What Happened (Audit & Progress Report)
When the user runs `/clarify` to understand what happened during or after `/describe` or `/build`:
1. Inspect `openspec/changes/<change-id>/tasks.md` and recent file changes.
2. Provide a clear plain-text breakdown:
   - **What Happened**: Summary of completed tasks (`[x]`) and exact files created or modified (with clickable links).
   - **UI & Spec Alignment**: How the changes implement the **daisyUI `dark` + shadcn-style** design and spec scenarios.
   - **What's Next / Remaining**: Any unchecked tasks (`[ ]`) or whether the change is ready for `/build` or archiving.
