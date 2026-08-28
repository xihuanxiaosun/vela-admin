# Theme and appearance

## Token policy

Vela components consume semantic CSS variables for typography, spacing, radii, elevation, motion,
and color. Brand literals belong in theme creation, never inside a component.

```ts
const vuetify = createVuetify(
  createVelaPreset({
    theme: {
      lightColors: { primary: '#126E5B' },
      darkColors: { primary: '#55B69E' },
    },
  }),
)
```

Prefer theme colors such as `primary`, `success`, `warning`, `error`, and `info` over using the
primary brand for every state.

## Runtime preferences

`VelaAppearanceController` exposes immutable preferences and async setters for:

| Preference      | Values                              |
| --------------- | ----------------------------------- |
| mode            | `system`, `light`, `dark`           |
| skin            | `default`, `bordered`, `semi-dark`  |
| density         | `compact`, `comfortable`, `default` |
| radius          | `compact`, `balanced`, `soft`       |
| motion          | `system`, `full`, `reduced`         |
| font scale      | `small`, `default`, `large`         |
| contrast        | `standard`, `high`                  |
| primary         | six-digit hexadecimal color         |
| surface opacity | `0.72` through `1`                  |

Persistence failures are reported through `error`; UI updates are never coupled to a particular
storage implementation. Reduced motion disables decorative transitions and always respects the
operating-system preference. Text scale changes the root `rem` scale without flattening the type
hierarchy. High contrast strengthens boundaries, secondary copy, and keyboard focus without
replacing semantic status colors.

The skin changes surface hierarchy, not component contracts: `default` uses gentle layered
elevation, `bordered` removes decorative shadows in favor of outlines, and `semi-dark` keeps the
workspace light while giving navigation a dark surface. Theme color, skin, density, radius,
opacity, and motion remain orthogonal settings.

`VaAppearanceSettings` can optionally receive a `ShellPreferencesController`. The centered modal
then separates appearance, layout, and accessibility into focused tabs and adds live, persisted
choices for sidebar/compact/topbar navigation, centered/fluid content, floating/attached headers,
and compact/comfortable/spacious workspace padding. Shell preferences live in
`@vela-admin/shell`, keeping the theme package independent of layout policy.

## Defaults versus wrappers

Use Vuetify defaults for atomic styling: field variants, button elevation, chip density, menu
behavior, tooltip delay, and dialog sizing. Use Vela wrappers only for stable semantics such as
button intent, avatar fallback, status tone, confirmation results, or queued toasts.

## Visual reference boundary

Vela studies public administration templates, including Materio's documented layout variants and
its MIT-licensed free repository, for proportion and hierarchy. Vela does not copy paid source,
private assets, or proprietary components. Its palette, tokens, component code, service APIs, and
responsive contracts are independently implemented.

- [Materio documentation](https://demos.themeselection.com/materio-vuetify-vuejs-admin-template/documentation/)
- [Materio free repository](https://github.com/themeselection/materio-vuetify-vuejs-admin-template-free)
