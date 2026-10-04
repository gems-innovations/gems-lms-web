import { expect, test } from '@playwright/test';

const email = process.env.E2E_ADMIN_EMAIL;
const password = process.env.E2E_ADMIN_PASSWORD;

test.describe('reportes institucionales', () => {
  test('protege la ruta para visitantes', async ({ page }) => {
    await page.goto('/admin/reports');
    await expect(page).toHaveURL(/\/auth\/signin/);
  });

  test('un administrador consulta y exporta el reporte real', async ({ page }) => {
    test.skip(!email || !password, 'Define E2E_ADMIN_EMAIL y E2E_ADMIN_PASSWORD para la prueba autenticada.');
    await page.goto('/auth/signin');
    await page.getByLabel('Correo electrónico').fill(email!);
    await page.getByLabel('Contraseña').fill(password!);
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();
    await expect(page).toHaveURL(/\/admin\//);
    const closeTour = page.locator('.driver-popover-close-btn');
    if (await closeTour.isVisible({ timeout: 1_500 }).catch(() => false)) await closeTour.click();

    const reportResponse = page.waitForResponse(response =>
      response.url().includes('/api/v1/reports/institutions/') && response.status() === 200);
    await page.goto('/admin/reports');
    await reportResponse;
    await expect(page.getByRole('heading', { name: 'Reportes' })).toBeVisible();
    await expect(page.getByText('Resultados por curso')).toBeVisible();

    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Exportar CSV para Excel' }).click();
    await expect((await download).suggestedFilename()).toBe('reporte-institucion.csv');
  });
});
