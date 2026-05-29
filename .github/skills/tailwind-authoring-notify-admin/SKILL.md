---
name: tailwind-authoring-notify-admin
description: 'Authors Tailwind/CSS changes in notification-admin — utilities-first markup, `@apply` for reused semantic classes, theme tokens, and safelist updates. Use this skill whenever the user asks to "style this", "add a class", "update CSS", "use @apply", "tailwind not picking up my class", "add to safelist", or is editing files under app/assets/stylesheets/ or tailwind.config.js, even if Tailwind isn\'t explicitly mentioned.'
argument-hint: 'Describe the component/page styling change and whether classes are static or runtime-generated.'
---

# Tailwind Authoring for Notification Admin

## When to Use
- Add or modify styles for components or views
- Introduce new utility usage in templates or React components
- Add runtime-generated classes requiring safelist updates

## When NOT to Use
- Markup-only edits that reuse existing classes — just edit the template
- Pure JS behavior changes with no styling impact

## Core Files
- Tailwind config and tokens: tailwind.config.js
- Tailwind entry and import graph: app/assets/stylesheets/tailwind/style.css
- Component styles: app/assets/stylesheets/tailwind/components/
- View styles: app/assets/stylesheets/tailwind/views/

## Utility Classes vs `@apply`
- Default: write Tailwind utilities (`mb-4`, `flex`, `text-smaller`) directly in Jinja templates and React components. This keeps styles colocated with markup and easy to grep.
- Reach for `@apply` in a CSS partial when one of these is true:
  - The same utility cluster is repeated across many templates/components and deserves a named class (e.g. `.button-secondary`, `.hint`).
  - You need pseudo-state, child selectors, or responsive overrides that are awkward to express inline.
  - You're styling markup you don't control (third-party output, generated HTML, `prose`-like content).
- Prefer extending an existing semantic class over inventing a new one; check `app/assets/stylesheets/tailwind/components/` first.
- Don't wrap a single utility in `@apply` just to rename it.

## Procedure
1. Determine if the change is component-level or view-level.
2. Decide utilities-in-markup vs `@apply` using the rules above.
3. If editing CSS, add or update a partial in the correct directory:
- components/ for reusable UI patterns
- views/ for page-specific styling
4. Import new partials from app/assets/stylesheets/tailwind/style.css.
5. Reuse existing spacing, color, font, and breakpoint tokens from tailwind.config.js.
6. If class names are runtime-generated and cannot be statically detected, update the safelist in tailwind.config.js.
7. Build and verify output before finalizing.

## Validation Commands
- npm run watch
- npm run build

## Guardrails
- Avoid hardcoded one-off values when an existing token is available.
- Keep selector specificity low and compatible with existing utility-first approach.
- Do not edit generated output files as source of truth.
