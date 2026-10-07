import { expect, Page, test } from '@playwright/test';

/**
 * Un curso gratis de punta a punta como invitado: leer, responder las prácticas y terminar.
 * Al final debe aparecer el resultado (puntaje y si aprobó), nunca un certificado.
 * Uso: npx playwright test e2e/free-course-result.spec.ts
 */
const COURSE = 'Tu primer presupuesto';

/** Respuesta correcta de cada pregunta del curso de finanzas (texto de la opción). */
const ANSWERS: Record<string, string> = {
  '¿Cuál de estos es un gasto fijo?': 'El arriendo',
  'Si gastas $5.000 diarios en snacks': '$150.000',
  '¿Cuál es el primer paso para organizar tus finanzas?': 'Registrar en qué gastas',
  'El SOAT de tu moto cuesta $480.000': '$40.000',
  '¿Cuál de estos es un gasto hormiga?': 'Una suscripción de streaming que casi no usas',
  'Con la regla 50/30/20 y un ingreso de $2.000.000': '$400.000',
  'Si tu arriendo ya ocupa el 60 %': 'Reducir el porcentaje de gustos',
  '¿Por qué conviene separar el ahorro apenas te pagan?': 'Porque lo que queda a la vista se tiende a gastar',
  'Ganas $1.800.000': '$540.000',
  'Tienes una deuda en tarjeta de crédito': 'Usarlo para pagar la deuda',
  'Tus ingresos cambian cada mes': '$1.200.000',
  'Si tus gastos necesarios son $1.000.000 al mes': '$3.000.000',
  '¿Cuál de estos SÍ es un buen uso del fondo de emergencias?': 'Una cirugía imprevista',
  '¿Dónde conviene guardar el fondo?': 'En un lugar aparte, seguro y fácil de sacar',
  'Necesitas $2.400.000 para tu fondo': '12 meses',
  'Usaste $500.000 del fondo': 'Volver a llenarlo poco a poco',
};

const block = (page: Page) => page.locator('edu-player-content-block');

/** Responde el quiz abierto con las respuestas correctas y lo entrega. */
async function solveQuiz(page: Page) {
  await block(page).getByRole('button', { name: /Comenzar quiz|Reintentar/ }).click();
  if (await block(page).getByRole('button', { name: 'Comenzar quiz' }).isVisible()) {
    await block(page).getByRole('button', { name: 'Comenzar quiz' }).click();
  }
  for (let i = 0; i < 10; i++) {
    const text = await block(page).locator('.quiz-question__text').first().innerText();
    const key = Object.keys(ANSWERS).find(k => text.includes(k));
    expect(key, `pregunta sin respuesta conocida: ${text}`).toBeTruthy();
    await block(page).locator('.quiz-option', { hasText: ANSWERS[key!] }).first().click();
    const submit = block(page).getByRole('button', { name: 'Entregar quiz' });
    if (await submit.isVisible()) { await submit.click(); break; }
    await block(page).getByRole('button', { name: 'Siguiente' }).click();
  }
  await page.getByRole('button', { name: 'Sí, entregar' }).click();
  await expect(block(page).locator('.quiz-result__score')).toHaveText(/100/, { timeout: 10_000 });
}

test('curso gratis completo: muestra el resultado final y no un certificado', async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1366, height: 860 });
  await page.clock.install();
  await page.goto('/');
  await page.locator('article.card', { hasText: COURSE }).locator('.card__actions button').click();
  await expect(page).toHaveURL(/\/learn\/courses\/\d+/, { timeout: 15_000 });
  await expect(block(page)).toBeVisible({ timeout: 15_000 });
  await page.locator('.gsb__close').click(); // la barra de invitado no estorba en este recorrido

  for (let lesson = 0; lesson < 3; lesson++) {
    // Documento: se adelanta el tiempo mínimo de lectura y se pasa a la práctica.
    await page.clock.runFor(5 * 60_000);
    // Tras la lectura la app puede pasar sola a la práctica; si no, se avanza a mano.
    const start = block(page).getByRole('button', { name: /Comenzar quiz|Reintentar/ });
    if (!(await start.isVisible())) await page.locator('edu-player-topbar').getByRole('button', { name: 'Siguiente' }).click();
    await solveQuiz(page);
    if (lesson < 2) await page.locator('edu-player-topbar').getByRole('button', { name: 'Siguiente' }).click();
  }

  const result = page.locator('edu-course-result .cres');
  await expect(result).toBeVisible({ timeout: 10_000 });
  await expect(result).toContainText('¡Aprobaste!');
  await expect(result.locator('.cres__number')).toHaveText('100');
  await expect(result).toContainText('Promedio en las otras prácticas');
  await expect(page.locator('edu-course-certificate')).toHaveCount(0);

  await result.getByRole('button', { name: 'Seguir' }).click();
  await expect(page.locator('.course-complete-banner__btn')).toHaveText(/Ver mi resultado/);
});
