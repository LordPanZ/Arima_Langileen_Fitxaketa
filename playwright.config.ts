import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'mobile-android', use: { ...devices['Pixel 7'] } },
    // Viewport de iPhone con motor Chromium (WebKit no siempre está instalado).
    {
      name: 'mobile-iphone-viewport',
      use: { ...devices['iPhone 14'], browserName: 'chromium', defaultBrowserType: 'chromium' },
    },
  ],
  webServer: {
    // La app se construye en modo "demo": sin Firebase, con datos ficticios.
    command: `npm run build:demo && npx vite preview --mode demo --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env['CI'],
    timeout: 180_000,
  },
});
