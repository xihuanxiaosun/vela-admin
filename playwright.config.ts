import { defineConfig, devices } from '@playwright/test'

function resolvePort(name: string, fallback: number): number {
  const port = Number(process.env[name] ?? fallback)
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error(`${name} must be an integer between 1 and 65535.`)
  }
  return port
}

const playgroundPort = resolvePort('VELA_PLAYGROUND_PORT', 4173)
const starterPort = resolvePort('VELA_STARTER_PORT', 4187)
const playgroundUrl = `http://127.0.0.1:${playgroundPort}`
const starterUrl = `http://127.0.0.1:${starterPort}`

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  expect: {
    timeout: 8_000,
    toHaveScreenshot: {
      animations: 'disabled',
      caret: 'hide',
      maxDiffPixelRatio: 0.01,
      scale: 'css',
    },
  },
  use: {
    baseURL: playgroundUrl,
    colorScheme: 'light',
    locale: 'en-GB',
    reducedMotion: 'reduce',
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'desktop-chromium',
      testIgnore: /(mobile|starter)\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 1000 },
      },
    },
    {
      name: 'mobile-chromium',
      use: {
        ...devices['Pixel 7'],
        viewport: { width: 390, height: 844 },
      },
      testIgnore: /starter-mobile\.spec\.ts/,
      testMatch: /mobile\.spec\.ts/,
    },
    {
      name: 'starter-mobile-chromium',
      testMatch: /starter-mobile\.spec\.ts/,
      use: {
        ...devices['Pixel 7'],
        baseURL: starterUrl,
        viewport: { width: 390, height: 844 },
      },
    },
    {
      name: 'starter-chromium',
      testMatch: /starter\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: starterUrl,
        viewport: { width: 1440, height: 1000 },
      },
    },
  ],
  webServer: [
    {
      command: `pnpm --filter @vela-admin/playground dev --host 127.0.0.1 --port ${playgroundPort} --strictPort`,
      url: playgroundUrl,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: `pnpm --filter @vela-admin/starter dev --host 127.0.0.1 --port ${starterPort} --strictPort`,
      url: starterUrl,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
})
