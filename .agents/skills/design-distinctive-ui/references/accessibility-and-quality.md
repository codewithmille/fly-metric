# Accessibility and Quality

Target WCAG 2.2 AA unless the project requires a stricter standard. Automated checks are evidence, never a conformance certificate.

## Contents

1. Accessibility floor
2. Interaction states
3. Responsive matrix
4. Performance as design
5. Visual verification
6. Release evidence

## 1. Accessibility floor

### Perceivable

- Give informative images useful alternatives and decorative images `alt=""`.
- Provide captions/transcripts for media as required.
- Preserve semantic relationships with headings, lists, tables, labels, landmarks, and native controls.
- Do not communicate meaning by color, location, shape, or sound alone.
- Meet WCAG contrast: 4.5:1 normal text, 3:1 large text and UI graphics where applicable.
- Reflow at 320 CSS px without two-dimensional scrolling except for genuinely two-dimensional content.
- Support text resize to 200% and WCAG text-spacing overrides without clipping.

### Operable

- Make all functionality keyboard accessible with a logical focus order and no trap.
- Keep focus visible and not obscured by sticky or overlay content.
- Give automatic movement that lasts more than five seconds a pause/stop/hide control unless essential.
- Provide single-pointer alternatives for path or multipoint gestures.
- Provide non-drag alternatives for drag operations unless dragging is essential.
- Keep targets at least 24 by 24 CSS px or satisfy WCAG 2.2 spacing exceptions; prefer 44 by 44 for primary touch controls.
- Do not rely on hover. Match hover information and actions with focus and touch paths.

### Understandable

- Set the page language.
- Use visible labels and appropriate autocomplete.
- Keep navigation and control naming consistent.
- Identify errors in text, point to the field, preserve input, and suggest recovery.
- Avoid unexpected context changes on focus or input.
- Do not require users to re-enter information already supplied in the same process unless necessary.
- Do not block password managers or force cognitive puzzles for authentication.

### Robust

- Prefer native semantics.
- Give custom controls correct accessible names, roles, values, and state.
- Announce status changes without stealing focus.
- Test with at least one real screen reader when the surface or risk justifies it.

Official baseline: <https://www.w3.org/TR/WCAG22/>

## 2. Interaction states

Implement states based on behavior.

| Element | Minimum applicable states |
| --- | --- |
| Link | default, hover, focus-visible, visited when useful, active |
| Button | default, hover, focus-visible, active, disabled; loading/success/error when action is async |
| Input | empty, populated, hover, focus, disabled, read-only when applicable, invalid, valid when useful |
| Select/combobox | closed, open, focus, highlighted option, selected, disabled, invalid, empty |
| Async region | initial, loading, loaded, empty, error, retry, stale/offline when relevant |
| Destructive action | ready, pending, error, success, undo or confirmation according to reversibility |
| Dialog | closed, opening, open, closing; focus entry, containment, return, Escape |

Rules:

- Do not change border width or control height between states.
- Reserve helper/error space when layout shift would disrupt the task.
- Disabled needs semantics, visual treatment, and cursor/interaction behavior.
- Focus appears immediately.
- Loading after a short operation should not flash; delay the indicator or maintain a minimum visible duration.
- Do not announce silent visual state changes twice.

## 3. Responsive matrix

For public web surfaces, inspect:

| Width | Purpose |
| --- | --- |
| 320 | WCAG reflow and narrow-device floor |
| 375 | common narrow phone |
| 414 | large phone |
| 768 | tablet and breakpoint boundary |
| 1024 | compact laptop/tablet landscape |
| 1280 × 800 | common laptop fold |
| 1440+ | wide layout and maximum measure |

At every relevant width verify:

- no accidental horizontal scroll;
- primary action and essential hero/workspace content remain reachable;
- nav collapses intentionally;
- clickable labels do not become broken multi-line controls;
- headings wrap, images shrink, grids use `minmax(0, 1fr)`, and flex children have `min-width: 0`;
- fixed/sticky regions do not obscure content or focus;
- landscape and portrait remain usable when orientation is not essential;
- hover-only behavior has a touch path.

Also test long localized text, a 47-character name, zero items, one item, many items, failed media, and slow network.

## 4. Performance as design

Use current field targets at the 75th percentile:

- LCP ≤ 2.5 s
- INP ≤ 200 ms
- CLS ≤ 0.1

Source: <https://web.dev/articles/vitals>

Design implications:

- prioritize and size the LCP asset;
- reserve image, video, ad, and embed dimensions;
- self-host or optimize fonts with fallbacks that minimize shift;
- keep interaction work off the critical path;
- avoid scroll handlers tied to framework state;
- lazy-load below-fold media and heavy interactive islands;
- do not use a motion or 3D library when CSS or a still asset serves the same purpose;
- use `will-change` sparingly;
- test, do not claim thresholds from code inspection alone.

## 5. Visual verification

Use a real renderer when available.

### First pass: five-second read

- Is purpose and next action apparent?
- Does the visual hierarchy match the task?
- Does the interface feel specific to the brief?

### Second pass: detail

- alignment, spacing rhythm, type wrapping, crop, contrast, radius, shadow, icon consistency;
- all interaction states and focus;
- loading, empty, error, success, undo/retry;
- animation timing and reduced motion;
- content accuracy and placeholder labeling.

### Third pass: stress

- responsive width sweep;
- 200% zoom and text spacing;
- keyboard-only;
- reduced motion;
- light/dark themes when supported;
- slow network and failed assets;
- console errors, broken links, and missing resources.

## 6. Release evidence

Report:

- commands run and whether they passed;
- viewports and themes inspected;
- accessibility automation and manual checks performed;
- known limitations of static analysis;
- unverified screen readers, devices, browsers, or field metrics;
- remaining placeholders and their required source.

Never report "WCAG compliant" or "Core Web Vitals passed" without the corresponding evidence.
