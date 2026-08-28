# Security policy

Please report vulnerabilities through the repository's **Security → Report a vulnerability** flow
rather than opening a public issue. Repository maintainers must enable GitHub private vulnerability
reporting before the first public release. Include affected versions, reproduction steps, impact,
and any suggested mitigation. Do not include real credentials, tokens, or personal data.

Supported versions will be listed once the first stable release is published. Security fixes may be
released outside the normal feature cadence.

## Supply-chain policy

- Release artifacts are built by the repository release workflow on a GitHub-hosted runner.
- npm packages are published with provenance and public access.
- The release job runs the complete quality gate and `pnpm audit` before publishing.
- Dependencies and GitHub Actions are monitored by Dependabot; CodeQL reviews JavaScript and
  TypeScript changes.
- Maintainers must use a protected `npm` environment and a scoped automation token or npm trusted
  publishing. Long-lived personal access tokens are not accepted.
