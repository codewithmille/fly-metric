<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- OPENSPEC:START -->
# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:
- Uses `/describe`, `/clarify`, or `/build` (or mentions planning, proposals, specs, or changes)
- Introduces new capabilities, breaking changes, architecture shifts, or big UI/performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- **`/describe`**: How to describe and scaffold change proposals (`proposal.md`, `design.md`, `tasks.md`, `specs/`)
- **`/clarify`**: How to clarify design decisions before coding OR explain what happened (completed tasks, modified files, remaining work)
- **`/build`**: How to implement tasks using **daisyUI `dark` theme** + **shadcn-style components** (`@/openspec/project.md`)

Keep this managed block so `openspec` tools can refresh the instructions.
<!-- OPENSPEC:END -->
