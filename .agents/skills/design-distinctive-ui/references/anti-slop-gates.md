# Anti-Slop Gates

Use this after implementation and before handoff. These are evidence prompts, not a style generator. A single risk signal may be intentional; unexplained clusters require revision.

## Contents

1. Hard failures
2. Structural sameness
3. Visual and material tells
4. Typography and copy
5. Components and interaction
6. Imagery and proof
7. Responsive and implementation tells
8. Originality test

## 1. Hard failures

Fix before shipping:

- fabricated metric, testimonial, customer, award, specification, or capability;
- inaccessible primary task, keyboard trap, invisible/obscured focus, or unreadable contrast;
- broken layout, clipped content, accidental horizontal scroll, or unusable mobile control;
- missing error recovery for a real failure path;
- placeholder content presented as real;
- design change that silently breaks routes, analytics, forms, SEO, or established behavior;
- static mock that was requested as functional UI;
- design-system drift caused by one-off values outside tokens;
- unverified dependency import or package-manager policy violation.

## 2. Structural sameness

Inspect the whole page or workflow:

- Does it follow `hero → three equal features → logo wall → testimonial → three-tier pricing → CTA banner → four-column footer` without a user-journey reason?
- Does every section use the same centered heading, paragraph, and grid?
- Do two or more sections repeat the same image/text split?
- Does every region become a rounded card?
- Is the app a mosaic of KPI cards instead of a working surface?
- Is the navigation the same generic wordmark/links/button bar used regardless of genre?
- Is the footer a sitemap template containing categories the product does not need?
- Does the new page repeat the last page's structural fingerprint with only new colors?
- Are decorative section numbers or eyebrows substituting for hierarchy?
- Is a split header carrying a large title on one side and filler copy on the other without purpose?

Revision order:

1. Reorder around the user's questions or tasks.
2. Change the dominant spatial relationship.
3. Remove unnecessary containers.
4. Change visual styling only after the structure is specific.

## 3. Visual and material tells

Treat these as risks when repeated or unmotivated:

- purple/blue glow or gradient used as generic "AI/product" shorthand;
- gradient-filled display text;
- ambient blobs, orbs, grain, crosshairs, scanlines, or glass with no semantic role;
- thick accent stripe on generic cards;
- nested cards or multiple containment layers;
- large radii on cards, controls, images, and panels without a radius grammar;
- identical shadow on every container;
- glow as elevation on dark surfaces;
- accent color covering large areas without hierarchy;
- pure decoration that could disappear without changing meaning, brand, or atmosphere;
- fake browser, phone, terminal, IDE, or window chrome;
- progress bars used as decorative comparison;
- version/status/locale/weather metadata used as atmosphere rather than real information;
- random dots, pills, badges, and micro-labels multiplying across the page.

Ask: "What user or brand information does this device carry?" If the answer is none, remove it.

## 4. Typography and copy

Check:

- default system or fashionable font used without evaluating brand, language, and reading role;
- more than three font families or multiple unrelated display voices;
- body lines outside a readable measure;
- display text sized from a preset rather than actual copy;
- italic, uppercase, condensed, or ultra-tight display text clipping or colliding when wrapped;
- every heading centered or every section introduced identically;
- tiny uppercase tracking labels above most headings;
- vague headings that could describe any product;
- CTA labels that hide the outcome;
- duplicate CTA intentions under different wording;
- filler verbs such as "elevate," "unlock," "seamless," "revolutionary," or "next-gen";
- cute but unclear microcopy, forced metaphors, or design commentary leaking into the UI;
- inconsistent register between marketing, technical, editorial, and operational copy;
- clickable text wrapping awkwardly;
- long hero copy forcing the primary action below the first viewport;
- fake precision or unsupported numerical claims.

Do not ban punctuation, a font, or a type style universally. Judge the combination, frequency, and rationale.

## 5. Components and interaction

Check:

- three equal icon/heading/body cards as the default feature presentation;
- icon tiles added where type or imagery would communicate better;
- mixed icon families, stroke weights, or emoji used as generic feature icons;
- hover is the only path to important content or actions;
- every element scales and shadows on hover;
- `transition: all`;
- motion on layout properties causing reflow;
- focus ring fades in or disappears under sticky content;
- auto-rotating content cannot pause;
- confirmation modal used for an easily reversible action;
- celebratory toast repeats an already visible success;
- loading spinner flashes for a fast action;
- skeleton does not resemble final layout;
- async component lacks relevant loading, empty, error, success, and retry behavior;
- disabled state uses opacity alone;
- input border width changes by state;
- input, button, and label geometry shift when errors appear;
- icon-only controls lack accessible names;
- drag-only, hover-only, or gesture-only operation has no equivalent.

States are behavioral, not decorative. Implement only states the component can enter, but implement all of those states.

## 6. Imagery and proof

Check:

- generic stock image provides no product, place, or audience information;
- generated image contains embedded gibberish, fake UI, brand conflict, or impossible detail;
- fake screenshot is built from decorative rectangles rather than a real product surface;
- invented logo wall or invented customers imply false social proof;
- testimonial lacks a verifiable source but is presented as real;
- meaningless abstract illustration fills a structural hole;
- imagery has no alt decision: informative description or explicit decorative empty alt;
- overlays, tags, and captions compete with the image without adding meaning;
- LCP media is lazy-loaded or lacks reserved dimensions;
- multiple images repeat the same crop, lighting, and composition.

When evidence is unavailable, use a labeled placeholder or redesign the section.

## 7. Responsive and implementation tells

Verify in a renderer:

- no horizontal scroll from 320 px upward;
- long headings can wrap without overflowing;
- image grids use shrinkable tracks such as `minmax(0, 1fr)`;
- multi-column regions collapse intentionally;
- sticky elements account for other sticky chrome;
- nav and primary actions remain legible and reachable;
- touch targets meet the chosen accessibility target;
- text survives 200% zoom and spacing overrides;
- both supported themes preserve hierarchy and contrast;
- `100vw` does not create scrollbar overflow;
- full-height surfaces use stable dynamic viewport units when needed;
- images reserve size to prevent layout shift;
- animation listeners and observers clean up;
- no arbitrary z-index escalation;
- no raw colors, fonts, radii, or durations bypass the token system after it is established;
- client-only animation logic is isolated appropriately in server-rendered frameworks.

Static grep cannot prove any of these. Inspect the computed result.

## 8. Originality test

Answer these without design jargon:

1. What is the one memorable idea?
2. Which detail could only belong to this product, audience, or brand?
3. What did the content force the layout to do?
4. What common pattern was deliberately rejected, and why?
5. If color, shadows, and animation were removed, would the hierarchy remain distinctive?
6. Could the copy and logo be swapped for an unrelated startup without changing the page?

If question 6 is "yes," revise structure, content, or product expression before adding polish.
