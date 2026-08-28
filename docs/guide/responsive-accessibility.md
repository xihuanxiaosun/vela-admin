# Responsive and accessible behavior

Responsiveness and accessibility are public contracts, not finishing passes.

## Breakpoint behavior

- Shell navigation becomes temporary on narrow screens.
- Form grids collapse without changing semantic field order.
- Modal content remains centered and scroll-safe; products may opt into full-screen phone mode.
- Filter controls stack or move secondary fields behind an explicit disclosure.
- Tables retain an internal horizontal scroll surface; action pinning depends on measured overflow.
- Pagination hides redundant range copy and keeps page-size and navigation controls reachable.

## Keyboard and screen readers

- icon-only controls require an accessible label;
- destructive intent is conveyed in text, not color alone;
- modal focus is trapped and restored by Vuetify;
- programmatically focused dialog containers do not show a misleading action focus ring;
- status tags remain non-interactive unless the component is actually a control;
- toast priority and dismissal are exposed through live-region semantics;
- empty, error, offline, forbidden, and not-found states have distinct recovery contracts.

## Motion and contrast

All decorative motion consumes shared duration and easing tokens. `prefers-reduced-motion` and the
runtime reduced-motion preference disable it. Custom primary colors recalculate an appropriate
on-primary foreground; semantic success, warning, and danger colors remain independent. Runtime
text scaling preserves the `rem` hierarchy, while high contrast strengthens borders, secondary
copy, and focus rings without changing business-state semantics.

Automated accessibility checks are a baseline. Keyboard traversal, zoom, high contrast, and a real
screen-reader smoke test remain release checks.
