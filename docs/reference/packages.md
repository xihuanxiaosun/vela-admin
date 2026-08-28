# Packages

| Package                 | Public responsibility                                                                             |
| ----------------------- | ------------------------------------------------------------------------------------------------- |
| `@vela-admin/contracts` | Framework-neutral async, error, query, transport, pagination, upload, and storage contracts       |
| `@vela-admin/access`    | Authentication state, permission evaluation, access boundaries, and Vue Router guards             |
| `@vela-admin/adapters`  | Fetch transport, path reading, query serialization, pagination and response adapters, web storage |
| `@vela-admin/theme`     | Semantic tokens, Vuetify themes and defaults, icons, runtime appearance                           |
| `@vela-admin/locale`    | App-scoped messages, translation adapter, document language, Vuetify locale and RTL               |
| `@vela-admin/ui`        | Buttons, icon actions, avatars, tags, modal, confirmation, toast, state views                     |
| `@vela-admin/forms`     | Typed form controller, rules, schema, responsive builder                                          |
| `@vela-admin/data`      | Filter schema, resizable adaptive table, safe CSV, row actions, pager, data-page state            |
| `@vela-admin/upload`    | File validators, previews, upload queue, upload presentation                                      |
| `@vela-admin/shell`     | App shell, navigation, persisted layouts, command palette, page header, workspace tabs, settings  |
| `@vela-admin/testing`   | Deferred promises, adapter fakes, and reusable deterministic test helpers                         |

Published packages expose an `exports` map, ESM output, source maps, declarations, and side-effect
metadata for styles. Playground fixtures and documentation never enter package tarballs.

## Public API policy

- import only from a package root unless a documented subpath is published;
- types use `import type` and are included in generated declarations;
- additions are minor releases; breaking changes require a major release and migration guide;
- unstable experiments stay in the Playground or under an explicitly experimental export;
- package dependency direction is enforced in review and build configuration.
