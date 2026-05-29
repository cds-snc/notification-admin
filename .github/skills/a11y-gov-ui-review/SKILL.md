---
name: a11y-gov-ui-review
description: 'Reviews Flask/Jinja and React UI changes for accessibility against WCAG 2.1 AA with full keyboard support. Use this skill whenever the user asks "is this accessible", "check a11y", "keyboard navigation", "screen reader", "WCAG", "add labels", "focus order", or is changing forms, modals, tables, navigation, or other interactive markup — even if accessibility isn\'t explicitly mentioned.'
argument-hint: 'Describe the UI change and whether to review templates, React components, or both.'
---

# Accessibility and GOV UI Review

## When to Use
- Any change to forms, navigation, modal/dialog, tables, or interactive controls
- Jinja template updates that alter markup structure
- React component updates that alter interaction patterns

## When NOT to Use
- Pure backend or API client changes with no rendered output
- Build/config tweaks that don't touch templates or components

## Standard
- All UI must meet **WCAG 2.1 AA**.
- All interactive functionality must be fully **keyboard accessible** — no mouse-only flows. Every control must be reachable via Tab, operable via Enter/Space (and arrow keys where appropriate), and have a visible focus indicator.

## Focus Areas
- Semantic structure: headings, lists, landmarks, table semantics
- Form accessibility: labels, hints, error summaries, field-level error links
- Keyboard behavior: tab order, focus visibility, escape/close behavior, focus trap in modals
- Screen reader clarity: descriptive text, status updates, aria usage only when necessary
- Language/i18n readiness for English and French UI text

## Procedure
1. Identify affected files under app/templates/, app/assets/javascripts/, and app/assets/stylesheets/.
2. Check for semantic HTML first; avoid ARIA when native elements already solve the need.
3. Verify controls have clear accessible names and state changes are announced where needed.
4. Ensure error handling is perceivable and actionable (summary + inline context).
5. Confirm color/contrast and focus styles are preserved by CSS changes.
6. Add or update tests where practical:
- Backend/template tests under tests/app/
- JS tests under tests/javascripts/
- Cypress coverage for user-critical paths under tests_cypress/

## Validation Commands
- make test
- npm test

## Guardrails
- Do not remove visible focus outlines without an equivalent accessible style.
- Do not rely on placeholder text as the only label.
- Keep accessibility fixes incremental and low-risk when editing legacy UI.
