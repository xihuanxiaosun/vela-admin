# Vela Admin Kit contributor instructions

## Scope

This directory is an independent framework repository. Do not read or modify sibling
applications or Ybirds business code while working here.

## Engineering rules

- Keep the dependency graph one-way: contracts and tokens must never import Vue or Vuetify.
- Prefer semantic configuration and typed adapters over endpoint, role, route, or payload
  assumptions.
- Keep visual values in the theme/token source of truth. Component-local hard-coded colors,
  shadows, radii, typography, motion durations, and z-index values are not allowed.
- A wrapper must add stable value: semantics, accessibility, state orchestration, responsive
  behavior, or a reusable admin pattern. Do not create pass-through wrappers.
- Preserve escape hatches through typed props, attributes, slots, and adapters.
- Public APIs require tests, documentation, and a changeset once the first release exists.
- Report only checks that were actually executed. Build and static checks do not replace
  browser, accessibility, or responsive verification.

## Delivery gates

Before a change is considered complete:

1. Typecheck, lint, format check, unit tests, and package builds pass.
2. Public behavior has a Playground example and documentation.
3. Interactive behavior has a browser-level test.
4. Visual changes have light, dark, desktop, and mobile review coverage.
5. Accessibility-sensitive controls pass keyboard, focus, reduced-motion, and axe checks.
