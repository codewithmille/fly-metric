# Change: Adopt daisyUI v5 (`dark` Theme) & shadcn/ui Dark Aesthetic

## Why
FlyMetric relied on large blocks of custom inline styles and bespoke CSS rules in `LandingPage.tsx`, `app/page.tsx`, and modal components. Adopting **daisyUI v5** (`data-theme="dark"`) alongside **shadcn/ui-inspired dark surface patterns** (crisp `1px` borders, subtle glassmorphism, structured `stats`, `card`, `badge`, `btn`, `tabs`, `mockup-window`, and `mockup-phone` components) makes the UI cleaner, faster to maintain, and visually cohesive across the Landing Page, Dashboard, and Calculator.

## What Changes
- **Install & Configure daisyUI v5**: Add `daisyui` to Tailwind CSS v4 (`@plugin "daisyui"` in `app/globals.css`) with `dark` as the default theme (`data-theme="dark"` on `<html>` in `app/layout.tsx`).
- **Dark Theme & shadcn-Style Tokens**: Map daisyUI `dark` theme variables and custom utility classes so cards, inputs, modals, badges, and buttons share a unified dark-mode palette with FlyMetric's signature gold (`#FFC107` / `warning` / `primary`) accent.
- **Refactor Landing Page (`components/LandingPage.tsx`)**:
  - Replace bespoke inline/embedded CSS layout blocks with daisyUI + Tailwind classes (`navbar`, `badge`, `btn`, `card`, `stats`, `stat`, `mockup-window`, `mockup-phone`, `steps`, `step`, `divider`, `footer`) and shadcn-style dark card borders (`border-white/10 bg-base-200/60 backdrop-blur-xl`).
- **Upgrade Speed Calculator Modal & Dashboard (`components/SpeedCalculatorModal.tsx`, `app/page.tsx`)**:
  - Enhance navigation, stats bar, segmented tabs, activity list, and calculator inputs/results with daisyUI `dark` + shadcn-style component polish while preserving all existing test IDs and offline-first logic.

## Impact
- **Affected specs**: `ui-design-system`
- **Affected code**:
  - `package.json`
  - `app/layout.tsx`
  - `app/globals.css`
  - `components/LandingPage.tsx`
  - `components/SpeedCalculatorModal.tsx`
  - `app/page.tsx`
