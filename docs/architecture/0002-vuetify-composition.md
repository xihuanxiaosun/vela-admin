# ADR 0002: Vuetify composition and wrapper criteria

- Status: Accepted
- Date: 2026-08-26

## Context

Vuetify already provides accessible primitives, theming, defaults, responsive utilities,
directives, and transitions. Mechanical pass-through wrappers increase maintenance cost without
improving product behavior. Raw primitives alone, however, do not establish consistent admin
semantics or asynchronous states.

## Decision

Customize primitives through the Vuetify theme, global defaults, scoped defaults, and Sass
settings first. Introduce a public Vela component only when it adds at least one of the following:

1. a semantic intent that is more stable than a visual prop;
2. shared asynchronous or interaction state;
3. accessibility behavior beyond the primitive's default;
4. responsive admin behavior;
5. composition of multiple primitives into a recurring pattern;
6. an adapter boundary that removes backend or library assumptions.

Wrappers forward relevant attributes and events and expose documented slots. Escape hatches are
part of the public API, not accidental implementation details.

## Consequences

- `VaButton`, `VaAvatar`, and `VaTag` are justified by semantic states and consistent behavior.
- Simple layout primitives normally remain `VRow`, `VCol`, and `VContainer` with configured
  defaults.
- Composite APIs must not mirror every underlying Vuetify prop by hand.
