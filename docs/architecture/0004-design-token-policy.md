# ADR 0004: Semantic design-token and hard-coding policy

- Status: Accepted
- Date: 2026-08-26

## Context

Visual consistency is lost when components embed brand colors, arbitrary spacing, local shadows,
or uncoordinated animation timings. A ban on every literal value would be impractical because the
token source of truth must define actual values.

## Decision

The token source of truth owns raw palette values and scales. Components consume semantic tokens
such as `surface`, `border-muted`, `text-secondary`, `danger`, `radius-control`, or `motion-fast`.

Component files must not contain unregistered:

- color literals;
- font families, typography scales, or line heights;
- shadows or z-index layers;
- corner radii;
- animation durations or easing curves;
- repeated layout spacing.

Structural values that cannot express a reusable semantic decision may remain local when they are
documented and covered by responsive tests. A lintable token policy will be added before the first
component release.

## Consequences

Themes can change without editing components. Light, dark, high-contrast, compact, and branded
presets share component implementations.
