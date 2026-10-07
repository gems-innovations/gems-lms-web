import { expect, Page, test } from '@playwright/test';

/**
 * Funcionamiento del estudio como invitado, en escritorio y en celular:
 * quiz → resultado → reintentar; salir a mitad del quiz y reintentar; crear la cuenta conservando el avance.
 * Uso: npx playwright test e2e/guest-learning.spec.ts
 */
const COURSE = 'Tu primer presupuesto';

/** Entra como invitado al curso corto desde la landing y espera el reproductor. */
async function startAsGuest(page: Page) {
  // Reloj controlable: el tiempo corre normal, pero podemos adelantar la lectura mínima del documento.
  await page.clock.install();
  await page.goto('/');
  const card = page.locator('article.card', { hasText: COURSE });
  await card.locator('.card__actions button').click();
  await expect(page).toHaveURL(/\/learn\/courses\/\d+/, { timeout: 15_000 });
  await expect(page.locator('edu-player-content-block')).toBeVisible({ timeout: 15_000 });
  // La app exige un tiempo de lectura antes de habilitar el quiz; lo adelantamos.
  await page.clock.runFor(120_000);
}

const block = (page: Page) => page.locator('edu-player-content-block');

/** Abre el quiz de la primera lección desde el temario. */
async function openFirstQuiz(page: Page) {
  const ready = block(page).getByRole('button', { name: /Comenzar quiz|Reintentar/ });
  if (!(await ready.isVisible())) {
    await page.locator('edu-player-sidebar').getByRole('button', { name: 'Quiz', exact: true }).first().click();
  }
  await expect(block(page).getByRole('button', { name: /Comenzar quiz|Reintentar/ })).toBeVisible();
}

async function beginQuiz(page: Page) {
  await block(page).getByRole('button', { name: 'Comenzar quiz' }).click();
  await expect(block(page).locator('.quiz-option').first()).toBeVisible();
}

/** Responde todas las preguntas con la primera opción y entrega. */
async function answerAndSubmit(page: Page) {
  for (let i = 0; i < 10; i++) {
    await block(page).locator('.quiz-option').first().click();
    const submit = block(page).getByRole('button', { name: 'Entregar quiz' });
    if (await submit.isVisible()) { await submit.click(); break; }
    await block(page).getByRole('button', { name: 'Siguiente' }).click();
  }
  await page.getByRole('button', { name: 'Sí, entregar' }).click();
  await expect(block(page).locator('.quiz-result__score')).toBeVisible({ timeout: 10_000 });
}

for (const device of [
  { name: 'escritorio', viewport: { width: 1366, height: 800 } },
  { name: 'celular', viewport: { width: 390, height: 844 } },
]) {
  test.describe(`Estudio como invitado · ${device.name}`, () => {
    test.use({ viewport: device.viewport });
    // Responden quizzes completos (5 o 6 preguntas, dos intentos): necesitan más que los 30 s por defecto.
    test.setTimeout(60_000);

    test('quiz: entregar, ver resultado y reintentar', async ({ page }) => {
      await startAsGuest(page);
      await openFirstQuiz(page);
      await beginQuiz(page);
      await answerAndSubmit(page);
      await expect(block(page).locator('.quiz-result__feedback li').first()).toBeVisible();

      await block(page).getByRole('button', { name: 'Reintentar' }).click();
      await beginQuiz(page);
      // El intento nuevo debe quedarse abierto (no entregarse solo).
      await page.waitForTimeout(1500);
      await expect(block(page).locator('.quiz-option').first()).toBeVisible();
      await answerAndSubmit(page);
    });

    test('salir a mitad del quiz no rompe los reintentos', async ({ page }) => {
      await startAsGuest(page);
      await openFirstQuiz(page);
      await beginQuiz(page);
      await block(page).locator('.quiz-option').first().click();

      // Intentar irse a otro contenido: avisa y entrega lo que lleva.
      await page.locator('edu-player-sidebar').getByRole('button', { name: 'Doc', exact: true }).first().click();
      await expect(page.locator('.quiz-nav-warning')).toBeVisible();
      await page.getByRole('button', { name: 'Enviar y salir' }).click();

      await openFirstQuiz(page);
      const retry = block(page).getByRole('button', { name: 'Reintentar' });
      if (await retry.isVisible()) await retry.click();
      await beginQuiz(page);
      await page.waitForTimeout(1500);
      await expect(block(page).locator('.quiz-option').first(), 'el reintento no debe entregarse solo').toBeVisible();
      await answerAndSubmit(page);
    });

    test('crear la cuenta desde invitado conserva el avance', async ({ page }) => {
      await startAsGuest(page);
      await openFirstQuiz(page);
      await beginQuiz(page);
      await answerAndSubmit(page);
      const score = await block(page).locator('.quiz-result__score').textContent();

      await page.locator('.gsb__btn').click();
      const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
      await page.locator('.gsm input[name="fn"]').fill('Prueba');
      await page.locator('.gsm input[name="ln"]').fill('Automática');
      await page.locator('.gsm input[name="em"]').fill(`e2e-${stamp}@ejemplo.test`);
      await page.locator('#gsm-pw').fill(`Gems${stamp}!a`);
      await expect(page.locator('.gsm__rules li.ok')).toHaveCount(5);
      await page.locator('.gsm__submit').click();

      await expect(page.locator('.gsb--ok')).toBeVisible({ timeout: 15_000 });
      await expect(page.locator('.gsb:not(.gsb--ok)')).toHaveCount(0);

      // Con cuenta ya puede entrar a lo que antes estaba bloqueado.
      await page.goto('/learn/catalog');
      await expect(page).toHaveURL(/\/learn\/catalog/);
      await expect(page.locator('.gsm')).toHaveCount(0);

      // Y el intento del quiz sigue ahí.
      await page.goBack();
      await openFirstQuiz(page);
      await expect(block(page).locator('.quiz-result__score')).toHaveText(score ?? '');
    });
  });
}
