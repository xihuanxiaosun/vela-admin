# ADR 0001: Package boundaries and dependency direction

- Status: Accepted
- Date: 2026-08-26

## Context

The framework must support both full installations and narrow package consumption. Demo code,
mock APIs, documentation assets, and visual fixtures must not leak into application bundles.
Circular dependencies would make package upgrades, testing, and tree-shaking unreliable.

## Decision

Use a pnpm monorepo with small packages aligned to stable responsibilities. Contracts and tokens
remain framework-agnostic. Higher-level packages may consume lower-level packages only according
to the graph documented in the repository README. Applications and testing packages are terminal
consumers and are never production dependencies.

Every published package declares Vue and Vuetify as peer dependencies when it uses them. Internal
package dependencies use the workspace protocol during development and normal semver ranges when
published by Changesets.

## Consequences

- Consumers can install only the capabilities they need.
- Breaking changes are visible at package boundaries.
- Cross-package abstractions require deliberate contracts.
- The repository has more manifests, but package ownership remains clear.
