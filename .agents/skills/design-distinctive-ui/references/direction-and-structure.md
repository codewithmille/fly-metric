# Direction and Structure

Use this reference before choosing an aesthetic or page shape.

## Contents

1. Design read
2. Surface model
3. Contextual dials
4. Visual thesis
5. Structural fingerprints
6. Foundation choice
7. Typography, color, shape, imagery, and motion
8. Variety without novelty theater

## 1. Design read

Compress the brief into:

`Surface · audience · primary job · tone · constraints`

Examples:

- `B2B observability landing · staff engineers · understand the debugging mechanism · exact and technical · existing navy brand`
- `Scheduling workspace · clinic coordinators · resolve conflicts quickly · calm and operational · keyboard-first`
- `Ceramics portfolio · curators and collectors · evaluate the body of work · tactile editorial · supplied photography`

Avoid "clean and modern." It does not resolve a design decision.

## 2. Surface model

Choose the surface before the style.

| Surface | Start with | Avoid by default |
| --- | --- | --- |
| Marketing | promise, mechanism, evidence, action | dashboard chrome, generic feature card rows |
| Product app | task, status, controls, working data | campaign hero, poetic copy, ornamental sections |
| Dashboard | hierarchy, filters, comparison, exceptions | equal card mosaic, decorative charts |
| Editorial | reading rhythm, navigation, authorship, media | SaaS CTA cadence, product tiles |
| Commerce | product, trust, options, fulfillment, action | lifestyle mood without buying information |
| Portfolio | authored work, role, process, contact | agency clichés, fake project metrics |
| Public/regulated | comprehension, trust, error prevention | experimental navigation, motion-led access |
| Component | role, behavior, states, integration | page-level themes and unrelated art direction |

## 3. Contextual dials

Set each from 1–10.

### Variance

- 1–3: conventional grid, familiar patterns, low visual surprise
- 4–6: offset rhythm, selective asymmetry, recognizable patterns with character
- 7–8: art-directed composition, stronger scale shifts, distinctive section grammar
- 9–10: experimental structure; use only when the audience and task tolerate discovery

### Motion

- 1–3: feedback, state change, no automatic choreography
- 4–6: one entrance plus a few purposeful reveals or shared transitions
- 7–8: scroll-linked narrative or rich spatial transitions
- 9–10: motion is part of the product or story; provide a complete static equivalent

### Density

- 1–3: gallery/editorial spacing, few decisions per view
- 4–6: everyday product and marketing density
- 7–8: dense operational workspace with strong grouping
- 9–10: expert cockpit; prioritize scanning, alignment, and shortcuts

Do not expose these as arbitrary numbers without explaining the design consequences.

## 4. Visual thesis

Write a single sentence that combines:

- material: paper, glass, ink, industrial panel, soft canvas, luminous screen;
- rhythm: poster-like, editorial, compact, cinematic, tabular, conversational;
- typography: authoritative sans, humanist serif, utilitarian grotesk, mono accent;
- energy: quiet, urgent, playful, exact, ceremonial, raw.

Good:

> A quiet technical workbench with compact tabular rhythm, cool paper surfaces, and one electric signal color.

Weak:

> A modern premium interface with gradients and animations.

The thesis must make at least one tempting design choice inappropriate.

## 5. Structural fingerprints

Pick a structure because it matches the information journey. Do not default to the same hero, three features, proof, pricing, CTA sequence.

### Narrative families

- **Problem to mechanism**: lead with the user's friction, reveal how the product works, then prove it.
- **Demonstration first**: show a real workflow or artifact before explanation.
- **Evidence first**: lead with a supplied result, case, or body of work.
- **Manifesto**: a sequence of claims with restrained proof and one final action.
- **Long document**: table of contents, chapters, marginal notes, strong reading measure.
- **Conversational**: questions, objections, and direct answers form the page.

### Spatial families

- **Workbench**: primary workspace plus tools, inspector, or contextual rail.
- **Index first**: navigable list or catalog is the dominant interface.
- **Split studio**: two complementary streams, such as work and process.
- **Photographic sequence**: imagery determines section rhythm and crop.
- **Map or diagram**: relationships, geography, or architecture lead.
- **Dense specimen**: type, tokens, components, or data form an inspectable system.
- **Asymmetric grid**: unequal spans express priority, not random variety.
- **Sticky narrative**: one stable visual changes while explanation advances.

### Product families

- **Task canvas**: navigation, working surface, and contextual actions.
- **Monitor**: status and exceptions first, details on demand.
- **Queue**: sortable work items, state, ownership, next action.
- **Planner**: time or sequence is the primary axis.
- **Compare**: controlled side-by-side evidence and clear decision criteria.

Before implementing, sketch the first viewport and section/region order in plain language. If the shape would work unchanged for an unrelated brief, choose again.

## 6. Foundation choice

Reuse an existing design system when present.

Use an official or established system when domain conventions and accessibility value outweigh visual novelty: public-sector, enterprise suites, commerce platforms, dense data products, or embedded platform apps.

Use a custom lightweight system when the surface is brand-led, editorial, experiential, or has a small component vocabulary.

Rules:

- one coherent system per product;
- do not mix component systems casually;
- do not import a large library to obtain one button;
- do not recreate an official system while claiming compatibility;
- do not overwrite existing tokens merely to rename them.

Detect and follow the repository's active dependency policy. When the WERIXO `/Users/rootml` instructions apply, dependencies use pnpm only. Verify both policy and package presence before proposing installation.

## 7. Typography, color, shape, imagery, and motion

### Typography

- Choose roles before font names: display, body, data/mono, optional accent.
- Two families are usually enough; three is a ceiling, not a target.
- Use the existing brand face when supplied.
- Keep body measure roughly 45–75 characters.
- Size display text against actual copy and viewport, not a favorite preset.
- Italic, uppercase, condensed, or monospace display treatments need a brief-specific reason and wrap testing.

### Color

- Start from functional roles: surface, text, muted, border, accent, status, focus.
- Use one dominant accent logic, but keep semantic status colors truthful.
- Test computed foreground/background pairs. Do not infer contrast from token names.
- Gradients are allowed when they express material, lighting, data, or brand. A fashionable gradient without a role is decoration.

### Shape and elevation

- Define a radius grammar: sharp, restrained, soft, or role-based.
- Cards represent containment, selection, comparison, or interaction. They are not the default wrapper for every paragraph.
- Prefer spacing, alignment, and rules before shadows.
- Use elevation as a small system with named layers.

### Imagery

- Use imagery when it explains, proves, locates, or creates essential brand atmosphere.
- Prefer the user's real product, people, place, or work.
- Generated imagery must be brief-specific and reviewed for artifacts, embedded text, brand conflicts, and accessibility.
- Never fabricate screenshots, customers, or evidence.
- Typography-only is valid when type and structure carry the story.

### Motion

Every motion must communicate hierarchy, continuity, feedback, causality, or narrative sequence.

- Use the smallest motion that explains the change.
- Avoid universal fade-up, universal hover-scale, cursor followers, and perpetual ambient loops.
- Animate compositor-friendly properties when possible.
- Pause or control automatic movement.
- Provide a reduced-motion equivalent that preserves information and state.

## 8. Variety without novelty theater

Check recent surfaces in the same product:

- avoid repeating the same first-viewport composition;
- vary structure before palette;
- preserve the product's system while changing page-level rhythm;
- keep recurring controls consistent even when marketing pages differ;
- do not create project memory files solely to prove variety.

Novelty is not the goal. The goal is a structure that feels inevitable for this brief and unlikely to be emitted for every other brief.
