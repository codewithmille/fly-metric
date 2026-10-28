---
name: build
description: OpenSpec Stage 3 (/build) — Implement the active OpenSpec change step-by-step from tasks.md using daisyUI v5 dark theme and shadcn-style components, then verify with TypeScript.
---

# `/build` — OpenSpec Implementation Runner

Use this skill when the user invokes `/build` (or asks to build/implement an OpenSpec change).

## Workflow Steps
1. **Load Spec & Tasks**:
   - Read [`openspec/project.md`](../../../openspec/project.md) for stack and **daisyUI `dark` + shadcn-style** conventions.
   - Read `proposal.md`, `design.md`, `tasks.md`, and `specs/<capability>/spec.md` in the target `openspec/changes/<change-id>/` folder.
2. **Execute Tasks Sequentially**:
   - Implement each unchecked task (`- [ ]`) in `tasks.md`.
   - Use **daisyUI v5 (`data-theme="dark"`)** semantic classes (`btn`, `badge`, `card`, `stats`, `table`, `tabs`, `modal`, `input`, `select`, `alert`) paired with **shadcn-style** dark borders (`border-white/10`, `bg-base-200/70 backdrop-blur`).
   - Preserve existing element `id`s and offline-first sync handlers (`lib/apiClient.ts`).
3. **Verify & Update Checklist**:
   - Run `npx tsc --noEmit` to confirm zero TypeScript errors.
   - Mark completed tasks as `- [x]` in `openspec/changes/<change-id>/tasks.md`.
4. **Report Completion**:
   - Summarize what was built and remind the user they can run **`/clarify`** to review what happened in detail.
