<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- DESIGN_DISTINCTIVE_UI:START -->
# Non-Negotiable UI/UX Standard: Distinctive UI (Zero AI Slop)

Follow `.agents/skills/design-distinctive-ui/SKILL.md` at all times:
1. **Never generate generic AI aesthetics**:
   - Zero emoji feature icons (use clean vector SVG icons from `@/components/icons` exclusively).
   - No clunky wrapping buttons or unstyled action grids (use concise labels like `+ Register` with compact pill counts `[11]`).
   - Main navigation tabs (`Home/Cockpit`, `Birds`, `Activities`, `Profile`) MUST render as true full-page views (`isPageMode={true}`), NEVER as floating modal dialogs with close `✕` buttons.
2. **Commit to Cockpit/Avionics Design Thesis**:
   - Palette: Deep zinc `#080c14` / `#0d121d`, hairline borders `rgba(255,255,255,0.08)`, gold/amber `#f59e0b` accents, emerald `#10b981` telemetry.
   - Monospace typography for ring numbers, timestamps, coordinates, and speeds.
   - Restraint, high contrast, clean hierarchy, and intentional spacing.
<!-- DESIGN_DISTINCTIVE_UI:END -->

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
