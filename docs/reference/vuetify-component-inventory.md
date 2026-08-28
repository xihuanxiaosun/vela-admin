# Vuetify component inventory

This inventory is derived from the exports installed with Vuetify 4.1.11. The snapshot contains
103 component groups. It prevents Vela from rebuilding a capability that Vuetify already provides
and makes wrapper decisions reviewable when Vuetify changes.

## Disposition legend

- **Defaults** — use the Vuetify component directly with global or scoped defaults.
- **Semantic** — expose a Vela component because stable intent, state, accessibility, or responsive
  behavior is added.
- **Composite** — keep the primitive native and build a larger admin pattern from it.
- **Deferred** — supported through Vuetify but not part of the first Vela release.

## Application, layout, and providers

| Vuetify groups                                                          | Disposition | Vela use                                                 |
| ----------------------------------------------------------------------- | ----------- | -------------------------------------------------------- |
| `VApp`, `VMain`, `VLayout`, `VGrid`, `VFooter`, `VAppBar`, `VSystemBar` | Composite   | `VaAppShell` and layout modes                            |
| `VSheet`, `VDivider`, `VResponsive`                                     | Defaults    | Shared surfaces and responsive media containers          |
| `VDefaultsProvider`, `VThemeProvider`, `VLocaleProvider`                | Defaults    | Scoped presets, themes, density, and locale              |
| `VNoSsr`, `VLazy`                                                       | Defaults    | SSR boundaries and deferred heavy content                |
| `transitions`                                                           | Defaults    | Motion recipes use Vuetify transitions and shared tokens |

## Navigation and application flow

| Vuetify groups                                    | Disposition | Vela use                                            |
| ------------------------------------------------- | ----------- | --------------------------------------------------- |
| `VNavigationDrawer`, `VBottomNavigation`          | Composite   | Responsive shell navigation strategies              |
| `VBreadcrumbs`, `VTabs`, `VWindow`, `VSlideGroup` | Composite   | Route-aware breadcrumbs and work tabs               |
| `VList`, `VMenu`, `VToolbar`                      | Composite   | Navigation trees, action menus, and page toolbars   |
| `VStepper`, `VStepperVertical`                    | Defaults    | Schema-form wizard integration may be added later   |
| `VTreeview`                                       | Composite   | Navigation and hierarchical selectors when required |
| `VPagination`                                     | Composite   | `VaPager` with backend pagination adapters          |
| `VHotkey`                                         | Defaults    | Command palette and documented keyboard shortcuts   |

## Actions, identity, and indicators

| Vuetify groups            | Disposition | Vela use                                                    |
| ------------------------- | ----------- | ----------------------------------------------------------- |
| `VBtn`                    | Semantic    | `VaButton` intents, appearances and async states            |
| `VIconBtn`                | Semantic    | `VaIconButton` accessible labels, tooltips, and busy state  |
| `VBtnGroup`, `VBtnToggle` | Defaults    | Scoped defaults; wrap only when form semantics are required |
| `VFab`, `VSpeedDial`      | Deferred    | Available to applications but not a core admin pattern      |
| `VAvatar`, `VBadge`       | Semantic    | `VaAvatar`, `VaAvatarGroup`, and `VaBadge`                  |
| `VChip`, `VChipGroup`     | Semantic    | Interactive `VaChip` and non-interactive semantic `VaTag`   |
| `VItemGroup`              | Defaults    | Selection foundation for composite controls                 |
| `VRating`                 | Defaults    | Native business-specific display/input                      |

## Forms and inputs

| Vuetify groups                                        | Disposition | Vela use                                                     |
| ----------------------------------------------------- | ----------- | ------------------------------------------------------------ |
| `VForm`, `VValidation`                                | Composite   | `VaForm`, validation adapter, dirty state, server errors     |
| `VInput`, `VField`, `VLabel`, `VCounter`, `VMessages` | Defaults    | Internal foundation for consistent Vela fields               |
| `VTextField`, `VTextarea`, `VNumberInput`             | Semantic    | Field wrappers with unified metadata and async errors        |
| `VSelect`, `VAutocomplete`, `VCombobox`               | Semantic    | Option adapters and loading/empty/error behavior             |
| `VCheckbox`, `VRadio`, `VRadioGroup`, `VSwitch`       | Semantic    | Form-field integration and accessible descriptions           |
| `VSelectionControl`, `VSelectionControlGroup`         | Defaults    | Underlying selection behavior                                |
| `VSlider`, `VRangeSlider`                             | Defaults    | Native fields registered with `VaFormBuilder`                |
| `VColorInput`, `VColorPicker`                         | Defaults    | Theme tooling and optional form fields                       |
| `VDateInput`, `VDatePicker`, `VTimePicker`            | Semantic    | Locale, timezone, serialization, and responsive presentation |
| `VOtpInput`                                           | Defaults    | Available to authentication implementations                  |
| `VFileInput`, `VFileUpload`                           | Composite   | `VaFileUpload` adapter, queue, validation, and progress      |
| `VConfirmEdit`                                        | Defaults    | Inline edit building block; not a global form transaction    |

## Overlays, feedback, and asynchronous state

| Vuetify groups                         | Disposition | Vela use                                                          |
| -------------------------------------- | ----------- | ----------------------------------------------------------------- |
| `VDialog`, `VOverlay`                  | Semantic    | `VaModal`, focus policy, async close guard, mobile full screen    |
| `VBottomSheet`                         | Composite   | Mobile filter, action, and settings presentation                  |
| `VTooltip`, `VHover`                   | Defaults    | Accessible descriptions and intentional hover enhancement         |
| `VSnackbar`, `VSnackbarQueue`          | Semantic    | `feedback.toast` queue, tone, duration and announcements          |
| `VAlert`, `VBanner`                    | Semantic    | Inline and page-level feedback recipes                            |
| `VEmptyState`                          | Semantic    | `VaStateView` for empty, filtered-empty, error, 403, 404, offline |
| `VProgressCircular`, `VProgressLinear` | Defaults    | Buttons, uploads, tables, and blocking overlays                   |
| `VSkeletonLoader`                      | Semantic    | Shape presets aligned to final layouts                            |
| `VInfiniteScroll`, `VPullToRefresh`    | Composite   | Cursor lists and opt-in mobile refresh                            |

## Data, content, and visualization

| Vuetify groups                    | Disposition | Vela use                                                |
| --------------------------------- | ----------- | ------------------------------------------------------- |
| `VTable`, `VDataTable`            | Semantic    | `VaDataTable` and `VaDataPage` with server adapters     |
| `VDataIterator`, `VVirtualScroll` | Composite   | Card presentation and measured large-data use cases     |
| `VCalendar`, `VTimeline`          | Defaults    | Business-specific screens; no generic wrapper initially |
| `VSparkline`                      | Composite   | Optional stat-card visualization recipe                 |
| `VCode`, `VKbd`                   | Defaults    | Documentation, command palette, and diagnostic UI       |
| `VIcon`, `VImg`                   | Defaults    | Icon registry, avatars, uploads, and media content      |
| `VCarousel`, `VParallax`          | Deferred    | Available natively; not an admin-core requirement       |

## Upgrade procedure

For each Vuetify minor upgrade:

1. diff `vuetify/lib/components/index.d.ts` against this inventory;
2. review changed public props for every Semantic or Composite entry;
3. rerun package contract, visual, responsive, and accessibility tests;
4. record wrapper changes in an ADR and Changeset when public behavior changes.
