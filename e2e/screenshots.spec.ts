import { test } from '@playwright/test';

// Capturas para documentación. Solo se ejecutan con SCREENSHOTS=1:
//   PowerShell:  $env:SCREENSHOTS=1; npx playwright test e2e/screenshots.spec.ts --project=mobile-android
test.skip(!process.env['SCREENSHOTS'], 'Capturas desactivadas (SCREENSHOTS no definido)');

const shots: Array<[string, string, RegExp | null]> = [
  ['01-login', '/login', null],
  ['02-dashboard-trabajador', '/app', /Trabajador/],
  ['03-fichaje-simulado', '/app/clock', /Trabajador/],
  ['04-historial', '/app/history', /Trabajador/],
  ['05-mis-eventos', '/app/events', /Trabajador/],
  ['06-solicitud-correccion', '/app/corrections/new', /Trabajador/],
  ['07-panel-admin', '/admin', /Administración/],
  ['08-plantilla', '/admin/employees', /Administración/],
  ['09-gestion-eventos', '/admin/events', /Administración/],
  ['10-incidencias', '/admin/incidents', /Administración/],
];

for (const [name, path, role] of shots) {
  test(name, async ({ page }) => {
    await page.goto('/login');
    if (role) await page.getByRole('button', { name: role }).click();
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: `docs/screenshots/${name}.png`, fullPage: true });
  });
}

test('11-euskera-fichaje', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: 'EU' }).click();
  await page.getByRole('button', { name: /Langilea/ }).click();
  await page.goto('/app/clock');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'docs/screenshots/11-euskera-fichaje.png', fullPage: true });
});
