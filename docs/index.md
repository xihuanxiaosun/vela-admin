---
layout: home

hero:
  name: Vela Admin Kit
  text: Administration foundations that feel finished.
  tagline: Typed, responsive, backend-agnostic patterns for Vue 3 and Vuetify. Bring your API and brand; keep the architecture.
  image:
    src: /logo.svg
    alt: Vela Admin Kit
  actions:
    - theme: brand
      text: Get started
      link: /guide/getting-started
    - theme: alt
      text: Explore data pages
      link: /guide/data-pages

features:
  - icon: ◈
    title: Vuetify first
    details: Native atoms, defaults, directives, accessibility, and interaction behavior remain available.
  - icon: ↔
    title: Replaceable boundaries
    details: Transport, auth, permission, storage, pagination, response parsing, validation, and upload are injected adapters.
  - icon: ▦
    title: Adaptive data pages
    details: Schema filters, request lifecycle, semantic widths, internal scrolling, and stable action-column pinning work together.
  - icon: ◐
    title: Runtime appearance
    details: System, light, dark, brand color, density, radius, opacity, and motion preferences can be persisted per user.
  - icon: ✓
    title: Accessible by contract
    details: Keyboard focus, semantic names, reduced motion, contrast, touch targets, and responsive behavior are release criteria.
  - icon: ◫
    title: Clean distribution
    details: Framework packages exclude demos and fixtures. Applications install only the capabilities they need.
---

## What Vela is

Vela is a set of deliberately bounded packages for building administration products. It is not a
business template and it does not impose a router, store, API envelope, authentication provider, or
permission vocabulary.

The framework wraps Vuetify only when a repeated administration pattern adds stable behavior. A
generic card remains `VCard`; a cancellable, paginated data surface becomes a Vela pattern.
