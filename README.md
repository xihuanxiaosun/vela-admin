# Vela Admin Kit

Vela Admin Kit is a polished, responsive, and backend-agnostic administration framework built
with Vue, TypeScript, and Vuetify. It provides reusable admin patterns without coupling an
application to a specific API shape, permission model, router convention, or design brand.

> Status: first-release candidate. The package graph, documentation, Playground, reference Starter,
> unit coverage, production builds, package audit, browser interactions, visual baselines, RTL,
> responsive layouts, reduced motion, and axe checks are included in the release gate. Package
> versions remain `0.0.x` until the first Changesets versioning run.

## Principles

- **Vuetify first** — use Vuetify primitives, defaults, directives, and accessibility behavior
  instead of rebuilding low-level controls.
- **Semantic wrappers** — wrap only patterns that add stable semantics, state handling,
  accessibility, responsive behavior, or admin-specific composition.
- **Backend agnostic** — pagination, response parsing, transport, authentication, permissions,
  validation, and uploads are adapters.
- **Responsive by contract** — mobile behavior is part of every component API and acceptance
  test, not a later patch.
- **One visual source of truth** — components consume semantic design tokens and never scatter
  brand colors, radii, shadows, typography, or motion constants.
- **Clean packages** — documentation, mocks, fixtures, and demos live in applications and are
  excluded from published packages.

## Packages

| Package                 | Responsibility                                                        |
| ----------------------- | --------------------------------------------------------------------- |
| `@vela-admin/contracts` | Framework-agnostic contracts, states, and adapter types               |
| `@vela-admin/access`    | Authentication state, permission boundaries, and router guards        |
| `@vela-admin/theme`     | Design tokens, Vuetify themes, defaults, density, and motion          |
| `@vela-admin/locale`    | App-scoped translation, document language, Vuetify locale, and RTL    |
| `@vela-admin/ui`        | Semantic controls, feedback, overlays, and state views                |
| `@vela-admin/forms`     | Form orchestration, field registry, builder, and validation adapters  |
| `@vela-admin/data`      | Filters, tables, pagination, request state, and data-page composition |
| `@vela-admin/upload`    | File/image queues, crop, preview, progress, retry, and adapters       |
| `@vela-admin/shell`     | Application shell, navigation, layouts, tabs, search, and settings    |
| `@vela-admin/adapters`  | Ready-to-use transport and backend response adapters                  |
| `@vela-admin/testing`   | Test harnesses, adapter fakes, a11y helpers, and visual fixtures      |

The `apps/playground` application is the interactive component catalog, `apps/docs` is the public
documentation site, and `apps/starter` is a copyable reference application with an authenticated
HTTP repository, a replaceable in-browser API simulator, and role-based route and action examples.
The Starter does not assume a backend; connect the repository to the application's API while keeping
the page and form contracts. The Playground includes a 1,280-row, 19-column stress case; both
applications consume public package APIs rather than private demo-only widgets. None is part of a
published package.

## Architecture

The dependency direction is intentionally strict:

```text
contracts ──> adapters
    │
    ├──> access (Vue + router peers)
    │
    └──> theme + locale ──> ui ─┬──> forms
                                ├──> data
                                ├──> upload
                                └──> shell

testing and applications may consume every package; production packages may not consume them.
```

See [Architecture decisions](docs/architecture/README.md) and the
[component capability matrix](docs/reference/component-capability-matrix.md). The
[Vuetify inventory](docs/reference/vuetify-component-inventory.md) records the native capability
baseline used to avoid unnecessary wrappers. Start from the [public API](docs/reference/public-api.md)
or the [Simplified Chinese guide](docs/zh/guide/getting-started.md).

## Start developing

The repository requires Node 22.12 or newer. The exact pnpm version is pinned in `package.json` and
can be activated through Corepack. No environment file or backend is required for the Starter: its
authenticated HTTP flow uses a replaceable in-browser API simulator by default.

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

`pnpm dev` starts the reference administration application. Use `pnpm playground:dev` for the
component catalog or `pnpm docs:dev` for the documentation site. The focused Starter commands are
`pnpm starter:typecheck`, `pnpm starter:build`, and `pnpm starter:preview`.

Before the first complete local verification, install the Playwright browser once:

```bash
pnpm test:e2e:install
pnpm check
pnpm check:security
```

`pnpm check` runs formatting, linting, strict type checks, coverage, every package and application
build, publish-output auditing, and Playwright desktop/mobile/RTL/visual/accessibility tests. See
[Getting started](docs/guide/getting-started.md) for the repository layout and the production API
handoff.

## License

[MIT](LICENSE)
