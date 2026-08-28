---
'@vela-admin/access': minor
'@vela-admin/adapters': minor
'@vela-admin/contracts': minor
'@vela-admin/data': minor
'@vela-admin/forms': minor
'@vela-admin/locale': minor
'@vela-admin/shell': minor
'@vela-admin/testing': minor
'@vela-admin/theme': minor
'@vela-admin/ui': minor
'@vela-admin/upload': minor
---

Prepare the first public Vela Admin Kit release with backend-neutral adapters, semantic themes,
responsive shell and UI primitives, form and data-page engines, uploads, localization, testing
utilities, documentation, examples, and release-quality verification. The initial data engine
includes adaptive column sizing, accessible resize persistence, and formula-safe CSV export; the
runtime settings surface includes versioned theme, accessibility, layout, and workspace-spacing
preferences. Theme-aware state views, refined data/form surfaces, a realistic user-management
workflow, and a 1,280-row wide-table stress example round out the visual and interaction baseline.
Workspace-mode shell pages now derive breadcrumbs and visited tabs, consume the remaining viewport,
and give `VaDataPage` a fixed toolbar/table/pager composition. The form package adds a centered
schema-dialog workflow plus explicit record and payload mapping without embedding backend endpoints
in UI schemas.
The polished data baseline now includes bounded fill widths, configurable row density, semantic
currency/time/status cells, compact page jumping, and structurally stable action pinning whose
separator appears only under real overflow.
Identity and number presentations now add reusable primary/secondary hierarchy, avatar fallback,
locale-aware metrics, semantic icon treatments, and decorative-avatar accessibility without
coupling columns to a backend DTO.
Vuetify fields expose one focus boundary, buttons keep loading content visible in a neutral disabled
state, and boxed/fluid width preferences apply consistently to headers, workspace tabs, document
pages, and viewport-bound workspaces. English and Simplified Chinese framework catalogs ship by
default while business copy remains host-owned.
Media workflows now include attachment lists, ordered image galleries, cover and avatar patterns,
large previews, Cropper.js editing, configurable output encoding, and a replaceable pre-upload
pipeline. Existing remote assets can be seeded without re-uploading and guarded asynchronous
deletion keeps server policy explicit. Versioned form drafts add restore/discard and schema
migration without binding forms to browser storage. Data views can synchronize typed filters,
sorting, and all pagination modes with a host URL adapter, and named views persist through an
injected storage adapter.
Semantic table cells now cover media, boolean, accessible progress, and directional trends in
addition to identity, metrics, currency, time, and status. Production-like finance and moderation
workspaces exercise those contracts in light, dark, desktop, and mobile layouts. The release
candidate also ships bilingual documentation, a public API reference,
dependency monitoring, security scanning, provenance-aware release automation, and a protected
manual first-release gate.
