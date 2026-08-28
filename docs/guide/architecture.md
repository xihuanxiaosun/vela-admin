# Architecture

## Dependency direction

```text
contracts ──> adapters
    │
    ├──> access (Vue + router peers)
    │
    └──> theme + locale ──> ui ──┬──> forms
                                  ├──> data
                                  ├──> upload
                                  └──> shell
```

`contracts` has no Vue or Vuetify dependency. Application packages may consume every framework
package; production packages never consume the Playground or test fixtures.

## Three extension layers

1. **Defaults and tokens** change visual behavior globally without hiding Vuetify.
2. **Semantic controls** add intent, names, state, or repeatable accessibility behavior.
3. **Composite patterns** coordinate multiple primitives and own a real lifecycle, such as a data
   page, upload queue, schema form, command palette, or application shell.

Do not create a wrapper merely to rename a Vuetify prop. New public components must document their
added behavior, responsive contract, async states, keyboard behavior, and escape hatches.

## Integration boundaries

Vela never imports a product API client. Applications inject:

- a `TransportAdapter` for HTTP or another protocol;
- response and pagination adapters for backend envelopes;
- auth and permission adapters for identity and policy;
- storage adapters for user preferences;
- upload and validation adapters for domain-specific behavior.

See the [architecture decision records](/architecture/) for the rationale behind each boundary.
