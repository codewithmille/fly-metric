---
name: design-distinctive-ui
description: Design, build, audit, redesign, study, and polish distinctive production-grade web interfaces without generic AI aesthetics. Use for landing pages, websites, product UI, dashboards, portfolios, frontend components, HTML/CSS/JS, React, Next.js, Vue, Svelte, design-system work, visual redesigns, UI critiques, accessibility reviews, responsive hardening, or requests to remove AI slop.
---

# Design Distinctive UI

Create interfaces with a brief-specific point of view, sound interaction design, and production verification. Treat anti-slop as a reasoning discipline, not as a fixed visual style.

## Select the mode

- **Build** (default): create a new page, surface, or application.
- **Component**: create or refine one component and all states applicable to its behavior.
- **Audit**: inspect and report; do not edit unless the user also requests fixes.
- **Redesign**: change visual structure while preserving agreed product boundaries.
- **Study**: extract transferable design DNA from a screenshot or public URL; never pixel-clone.
- **Polish**: improve an existing artifact with a few decisive, verified changes.

Read [references/audit-redesign-study.md](references/audit-redesign-study.md) for Audit, Redesign, Study, or Polish. Use the workflow below for Build and Component.

## Non-negotiables

1. **Inspect before inventing.** Read the repository instructions recognized by the active host, including `AGENTS.md`, `CLAUDE.md`, or an equivalent file when present. Inspect existing design tokens, fonts, routes, components, dependencies, content, and real verification commands before editing.
2. **Respect the project.** Preserve routes, component ownership, analytics hooks, field names, SEO, brand assets, and working behavior unless the user requested changes to them. Never delete or replace broad areas implicitly.
3. **Follow the active package policy.** Detect the repository's real package manager and obey its instructions. When the WERIXO `/Users/rootml` policy applies, use pnpm only: never npm, npx, or yarn, and use `pnpm dlx` for ephemeral binaries.
4. **Do not fabricate proof.** Never invent metrics, testimonials, customers, awards, specifications, or product capabilities. Use supplied facts, clearly marked placeholders, or a structure that does not require proof.
5. **Accessibility is a floor.** Target WCAG 2.2 AA, semantic HTML, keyboard operation, visible unobscured focus, adequate target size, reduced motion, reflow, and contrast. Read [references/accessibility-and-quality.md](references/accessibility-and-quality.md).
6. **Use applicable states.** Every interactive element needs the states its behavior can actually enter. Never invent error/loading/success states for a static link; never omit them from an asynchronous control that needs them.
7. **Lock the system, not the imagination.** Once visual tokens are chosen, consume semantic tokens consistently. Do not force a new token file when the project already has a sound system.
8. **Verify the rendered result.** Static code review cannot judge rhythm, overlap, clipping, or responsive behavior. Render and inspect when tools allow.
9. **Never turn anti-slop rules into a new template.** A centered hero, serif, gradient, cards, or illustration may be correct when the brief earns it. Flag combinations without rationale, not isolated ingredients.
10. **Stay host-neutral.** Use capabilities by purpose, not vendor-specific tool names. Resolve relative resources from the directory containing this `SKILL.md`. Read [references/platform-compatibility.md](references/platform-compatibility.md) when installing, distributing, or troubleshooting this skill.

## Build and Component workflow

### 0. Preflight

Inspect:

- local instructions and real build/test/lint/typecheck commands;
- framework, package manager, styling approach, component library, and motion stack;
- existing tokens, typography, spacing, radii, shadows, icons, imagery, breakpoints, and themes;
- routes, page hierarchy, content source, brand assets, analytics-sensitive names, and accessibility patterns;
- the current surface at desktop and mobile when it already renders.

State only material findings. Do not create cache, log, token, or design-system files unless they improve the requested project.

### 1. Form the design read

Infer and state:

`Surface · audience · primary job · tone · constraints`

Ask at most one question only when two plausible answers would materially change the result. Otherwise proceed with explicit assumptions.

Set three contextual dials from 1–10:

- **Variance**: symmetric/conventional → art-directed/unexpected
- **Motion**: static/feedback-only → cinematic/scroll-led
- **Density**: spacious/editorial → operational/cockpit

These are decision aids, not user-facing configuration. Public-sector, regulated, accessibility-critical, and dense product surfaces usually lower variance and motion. Brand, editorial, and experiential work may raise them.

Read [references/direction-and-structure.md](references/direction-and-structure.md) before choosing the visual direction.

### 2. Commit to one visual thesis

Write one sentence describing the interface's material, rhythm, typography, and energy. Then choose:

- one structural fingerprint appropriate to the user journey;
- one dominant visual idea per section or workspace region;
- one type system, one palette logic, one radius logic, one icon family, and one motion language;
- one memorable element grounded in the product or brand.

Do not choose a mood by stacking trendy effects. Distinction comes from content hierarchy, proportion, rhythm, and specificity before decoration.

### 3. Shape content around the task

- Order marketing content by user uncertainty: problem, mechanism, evidence, action.
- Start product UI with the working surface, not a marketing hero.
- Give every section or region one job.
- Use utility copy for operational UI and brand copy for marketing UI.
- Remove repetition, vague adjectives, decorative metadata, and proof-shaped filler.
- Select imagery only when it carries narrative or product information. Typography-only can be complete; an unmotivated stock image cannot.

### 4. Establish the design contract

Prefer existing semantic tokens. If none exist, define the smallest useful contract:

- surface, text, muted text, border, accent, accent text, focus, danger, success;
- display/body/mono roles only when needed;
- spacing, type scale, radius, elevation, motion duration/easing, and z-index layers;
- responsive content widths and layout breakpoints.

Use raw values only inside token definitions. Components consume tokens.

For a standalone interactive component, demonstrate all applicable states together in a preview or story when practical.

### 5. Implement with project-native patterns

- Match the established framework and component conventions.
- Reuse installed packages; verify before importing.
- Add a dependency only when it is justified and approved by project policy.
- Prefer semantic HTML and native controls.
- Keep animation on `transform` and `opacity` when possible; provide cleanup and reduced-motion behavior.
- Use real content and assets supplied by the user. Clearly label temporary placeholders.
- Keep changes scoped. Do not reformat or rewrite unrelated code.

### 6. Run the quality loop

Read [references/anti-slop-gates.md](references/anti-slop-gates.md) and [references/accessibility-and-quality.md](references/accessibility-and-quality.md).

1. Run discovered repository checks.
2. Locate the directory containing this loaded `SKILL.md`, then run the bundled static heuristic from that directory:

   `python3 scripts/ui_quality_lint.py --html <file> --css <file> --format text`

   Treat its findings as prompts for inspection, not proof of design quality or WCAG conformance.
3. Render and inspect at the reference widths appropriate to the product. Include 320, 375, 414, 768, and 1280 px for public web pages unless scope says otherwise.
4. Test keyboard flow, focus, hover/touch parity, long content, empty/error/loading states, zoom/reflow, reduced motion, and both themes when both are supported.
5. Re-read all visible copy and verify every claim.
6. Fix failures and rerun the relevant checks.

### 7. Self-critique before handoff

Score 1–5:

- **Purpose**: does the design express why this product or page exists?
- **Hierarchy**: is the primary task obvious within seconds?
- **Specificity**: could this plausibly belong to another brand unchanged?
- **Coherence**: do type, color, spacing, shape, icons, and motion agree?
- **Restraint**: has every visible element earned its place?
- **Robustness**: does it survive real states, content, devices, and input methods?

Any score below 3 requires another pass. Do not add the scores to production code unless the user requests an audit trail.

## Output expectations

Lead with the result. Report:

- the design read and key visual thesis;
- important files changed;
- verification commands and outcomes;
- anything not verified;
- remaining placeholders, assumptions, or risks.

For audits, rank findings by user impact and cite file/line or visible region. Separate evidence from taste.

## References

- [references/direction-and-structure.md](references/direction-and-structure.md): direction, dials, structural families, design-system choice, imagery.
- [references/anti-slop-gates.md](references/anti-slop-gates.md): contextual anti-pattern and originality review.
- [references/accessibility-and-quality.md](references/accessibility-and-quality.md): WCAG 2.2, responsive, state, performance, and visual QA.
- [references/audit-redesign-study.md](references/audit-redesign-study.md): read-only audit, safe redesign, reference study, and polish workflows.
- [references/platform-compatibility.md](references/platform-compatibility.md): shared Agent Skills format, discovery paths, invocation, and portability checks for Claude Code, OpenCode, Codex, and Kimi Code.

## Provenance

This is an original synthesis informed by Hallmark (MIT), `design-taste-frontend`, `frontend-skill`, `frontend-design`, `impeccable-design-polish`, and `design-auditor`. Preserve the useful disciplines without copying their house style or treating any single catalog as the answer.
