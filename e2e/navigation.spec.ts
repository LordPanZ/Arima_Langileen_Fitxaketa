import { expect, test, type Page } from '@playwright/test';

async function loginAs(page: Page, roleLabel: RegExp) {
  await page.goto('/login');
  await page.getByRole('button', { name: roleLabel }).click();
}

test.describe('navegación básica (modo demo)', () => {
  test('la raíz sin sesión lleva al login y muestra el aviso de demo', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: 'ARIMA FICHA' })).toBeVisible();
    await expect(page.getByTestId('demo-banner')).toContainText('validez legal');
  });

  test('trabajador: dashboard → fichar → historial → eventos → corrección', async ({ page }) => {
    await loginAs(page, /Trabajador/);
    await expect(page).toHaveURL(/\/app$/);
    await expect(page.getByTestId('session-user')).toContainText('(DEMO)');

    const nav = page.getByRole('navigation', { name: 'Navegación principal' });
    await nav.getByRole('link', { name: /Fichar/ }).click();
    await expect(page).toHaveURL(/\/app\/clock$/);
    await expect(page.getByTestId('simulation-notice')).toBeVisible();

    await page.getByRole('button', { name: /^Entrada/ }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Simular' }).click();
    await expect(page.getByTestId('clock-status')).toHaveText('Trabajando');
    await expect(page.getByRole('status')).toContainText('No se ha registrado nada');

    await nav.getByRole('link', { name: /Historial/ }).click();
    await expect(page.getByTestId('history-session').first()).toBeVisible();

    await nav.getByRole('link', { name: /Eventos/ }).click();
    await expect(page.getByRole('heading', { name: 'Mis eventos' })).toBeVisible();

    await page.goto('/app/corrections/new');
    await expect(page.getByRole('heading', { name: 'Solicitar corrección' })).toBeVisible();
    await expect(page.getByText('NO se envía')).toBeVisible();
  });

  test('trabajador no puede entrar en gestión', async ({ page }) => {
    await loginAs(page, /Trabajador/);
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/forbidden$/);
  });

  test('administración: panel, plantilla, eventos e incidencias', async ({ page }) => {
    await loginAs(page, /Administración/);
    await page.getByRole('link', { name: /panel de gestión/ }).click();
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByTestId('stat-employees')).toContainText('6');

    const nav = page.getByRole('navigation', { name: 'Navegación principal' });
    await nav.getByRole('link', { name: /Plantilla/ }).click();
    await expect(page.getByTestId('employee-row')).toHaveCount(6);
    await nav.getByRole('link', { name: /Eventos/ }).click();
    await expect(page.getByTestId('event-row').first()).toBeVisible();
    await nav.getByRole('link', { name: /Incidencias/ }).click();
    await expect(page.getByTestId('incident-row').first()).toBeVisible();
  });

  test('auditoría entra al panel de solo lectura', async ({ page }) => {
    await loginAs(page, /Auditoría/);
    await expect(page).toHaveURL(/\/admin$/);
    await page.goto('/app/clock');
    await expect(page).toHaveURL(/\/forbidden$/);
  });

  test('cambio de idioma a euskera y persistencia', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: 'EU' }).click();
    await expect(page.getByRole('heading', { name: 'Erakustaldi modua' })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'eu');
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Erakustaldi modua' })).toBeVisible();
    await page.getByRole('button', { name: /Langilea/ }).click();
    await expect(page.getByRole('navigation', { name: 'Nabigazio nagusia' })).toBeVisible();
  });

  test('cerrar sesión vuelve al login', async ({ page }) => {
    await loginAs(page, /Trabajador/);
    await page.getByRole('button', { name: 'Salir' }).click();
    await expect(page).toHaveURL(/\/login$/);
    await page.goto('/app');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('ruta inexistente', async ({ page }) => {
    await page.goto('/no-existe');
    await expect(page.getByRole('heading', { name: 'Página no encontrada' })).toBeVisible();
  });
});
