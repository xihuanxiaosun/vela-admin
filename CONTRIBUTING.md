# Contributing to Vela Admin Kit

Thank you for improving Vela. Changes should preserve the framework's backend-neutral contracts,
semantic design tokens, and escape hatches to native Vuetify APIs.

## Local workflow

1. Use the Node and pnpm versions declared in the root manifest.
2. Run `corepack enable`, then install dependencies with `pnpm install --frozen-lockfile`.
3. Add or update tests and interactive documentation with each public behavior change.
4. Install Chromium once with `pnpm test:e2e:install`, then run `pnpm check` before opening a pull
   request.
5. Add a Changeset for every published package change.

`pnpm dev` starts the reference Starter. Use `pnpm playground:dev` while developing reusable
components and `pnpm docs:dev` while editing documentation.

## Public API changes

Public APIs require a focused example, tests, API documentation, and a migration note when an
existing contract changes. Prefer additive changes and deprecations over silent semantic changes.

## Visual and accessibility review

Interactive components must support keyboard operation, visible focus, reduced motion, light and
dark themes, and representative narrow and wide viewports. Visual snapshots complement, but do not
replace, behavioral assertions.

## Test ownership and coverage

`pnpm check` is the release gate. Pure TypeScript contracts, controllers, adapters, composables,
and layout policies are measured by Vitest's V8 coverage gate: 90% statements, 90% functions, 90%
lines, and 85% branches. Barrel files, declarations, configuration, tests, and Vue SFCs are excluded
from that numeric report.

That exclusion is not a claim that components are untested. Vue rendering, keyboard behavior,
responsive layouts, light/dark/RTL presentation, reduced motion, accessibility, and visual
regressions are owned by the Playwright suite. A change to an SFC must update the relevant browser
assertion or snapshot; unit coverage must not be padded with shallow render-only tests.
