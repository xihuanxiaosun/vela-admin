# Releasing Vela Admin Kit

Releases are intentionally manual until the repository identity and npm scope are owned by the
maintainer. The workflow cannot publish from an arbitrary fork by accident.

## One-time repository setup

1. Create the public GitHub repository and add its exact URL to every published package manifest.
   npm provenance validates this URL case-sensitively.
2. Confirm that the `@vela-admin` npm scope is owned by the publishing organization.
3. Enable private vulnerability reporting in **Settings → Code security and analysis**.
4. Protect `main`, require the CI and CodeQL checks, and require review for release changes.
5. Create a protected GitHub environment named `npm`.
6. Configure npm trusted publishing where available. If an automation token is required, store a
   granular publish-only token as `NPM_TOKEN` in the protected environment.

## Normal release flow

1. Every public package change adds a Changeset.
2. Run `pnpm release:status`, `pnpm check`, and `pnpm check:security` locally.
3. Merge reviewed changes into `main`.
4. Run **Release packages** manually. Changesets creates or updates the version pull request.
5. Review generated versions and changelogs, then merge that pull request.
6. Run **Release packages** again. The workflow repeats all gates and publishes with npm
   provenance.
7. Verify package provenance, tarball contents, release notes, documentation, and the clean Starter
   in a new project.

Before the repository's first commit, `release:status` verifies that every publishable package is
covered by a valid changeset. Once `HEAD` exists, it automatically delegates to the official
Changesets branch-diff status check.

## Visual baselines

Playwright keeps platform-specific screenshot baselines. When Chromium, fonts, or intentional
visual output changes, run **Update visual baselines** from GitHub Actions, download the
`visual-baselines-linux` artifact, review every changed image, and commit the approved Linux
baselines. Generate local platform baselines with `pnpm test:e2e:update`; never update snapshots only
to silence an unexplained failure.

The first release remains blocked until the repository URL and npm scope ownership are real. Do not
replace those values with placeholders merely to make a preflight check pass.
