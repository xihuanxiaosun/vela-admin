# Visual benchmark policy

Vela studies public administration templates to understand why a layout feels calm, dense, and
finished. Materio's public MIT edition is one reference for vertical-navigation rhythm and layered
surfaces. It is a benchmark, not a source dependency: Vela does not copy paid code, proprietary
assets, exact theme values, or page implementations.

The reusable observations are expressed as semantic tokens:

- a 44 px navigation rhythm with deliberate spacing between destinations;
- a quiet application background and distinct content surfaces;
- low-emphasis section headings so destinations remain the visual priority;
- a restrained active gradient and shadow rather than decoration on every item;
- a scroll-edge fade that only appears once navigation content moves beneath the brand;
- compact typography whose hierarchy comes from weight and contrast, not oversized text.

Vela's default violet is independently designed and keeps white text above the WCAG AA contrast
threshold. Applications can replace it through `createVelaTheme()` or the appearance controller
without changing component CSS.

Feedback follows the same ownership rule. One `VaFeedbackHost` is mounted inside the application's
Vuetify context; direct APIs update its scoped controllers. Mounting a detached Vue application for
every toast or loading call would lose theme, locale, RTL, focus, SSR, and concurrency context.
