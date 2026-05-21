import { test, expect } from '@playwright/test';

test('fixture flow supports two users, one funded bet, resolution, and both locales', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Duelly' })).toBeVisible();
  await page.getByRole('button', { name: 'Criar conta' }).last().click();
  await page.getByRole('button', { name: 'Conectar e verificar' }).click();
  await expect(page.getByText('Carteira pronta')).toBeVisible();

  await page.getByRole('button', { name: 'Explorar' }).first().click();
  await page.getByText('Will Driver B win').click();
  await page.getByRole('button', { name: 'Yes' }).click();
  await page.getByRole('button', { name: 'Criar convite' }).click();
  await page.getByRole('button', { name: 'Confirmar criação' }).click();
  await expect(page.getByText('Convite criado')).toBeVisible();
  const inviteLink = await page.locator('text=/http:\\/\\/127\\.0\\.0\\.1:5173\\/invite\\//').textContent();
  const inviteUrl = inviteLink?.trim();
  expect(inviteUrl).toBeTruthy();

  await page.goto('/home');
  await page.getByRole('button', { name: 'Sair' }).click({ force: true });
  await page.getByRole('button', { name: 'Criar conta' }).first().click();
  await page.getByLabel('Email').fill('taker@duelly.test');
  await page.getByRole('button', { name: 'Criar conta' }).last().click();
  await page.getByRole('button', { name: 'Conectar e verificar' }).click();
  await expect(page.getByText('Carteira pronta')).toBeVisible();

  await page.goto(inviteUrl!);
  await page.getByRole('button', { name: 'Aceitar aposta' }).click();
  await expect(page.getByText('Aposta aceita')).toBeVisible();
  await page.getByRole('button', { name: 'Ver aposta' }).click();
  await expect(page.getByText('Aguardando resultado')).toBeVisible();
  await page.getByRole('button', { name: 'Confirmar lado A vencedor' }).click();
  await expect(page.getByText('Resultado confirmado')).toBeVisible();

  await page.getByRole('button', { name: 'English' }).click();
  await expect(page.getByText('Result confirmed')).toBeVisible();
});
