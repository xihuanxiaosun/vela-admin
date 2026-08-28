# ADR 0003: Responsive behavior is a public contract

- Status: Accepted
- Date: 2026-08-26

## Context

Admin applications are increasingly used on tablets and phones. Deferring responsive behavior
creates incompatible page-specific workarounds and inaccessible touch interactions.

## Decision

Every composite component documents and tests behavior at phone, tablet, desktop, and wide-screen
breakpoints. Components use the shared display service and semantic breakpoint tokens.

Baseline behavior includes:

- navigation drawers become temporary on small screens;
- dialogs may become full-screen when their content cannot remain usable at a safe width;
- forms collapse to one column without changing field order;
- filters move from inline composition to a mobile sheet when necessary;
- tables choose an explicit horizontal-scroll, priority-column, or card presentation strategy;
- touch targets remain at least the configured accessible minimum;
- viewport safe areas and virtual-keyboard overlap are accounted for;
- responsive SSR behavior avoids hydration-dependent content loss.

## Consequences

Responsive behavior cannot be considered a Playground-only concern. It belongs in component props,
documentation, browser tests, and visual snapshots.
