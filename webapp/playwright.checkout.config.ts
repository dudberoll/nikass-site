import { defineConfig } from '@playwright/test'
const port = 55731
export default defineConfig({
  testDir: './e2e', testMatch: 'checkout.spec.ts', workers: 1,
  outputDir: './e2e/.artifacts/checkout',
  use: { baseURL: `http://127.0.0.1:${port}`, headless: true },
  webServer: { command: `bun run dev --host 127.0.0.1 --port ${port} --strictPort`, url: `http://127.0.0.1:${port}`, reuseExistingServer: false, env: { VITE_PRIVACY_URL: 'https://example.test/privacy', VITE_TERMS_URL: 'https://example.test/terms' } },
})
