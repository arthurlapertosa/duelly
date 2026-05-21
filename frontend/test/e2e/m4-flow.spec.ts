import { test, expect } from '@playwright/test';

test('fixture flow supports two users, one funded bet, resolution, and both locales', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Duelly' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign in' }).last()).toBeVisible();
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.getByLabel('Email').fill('maker@duelly.test');
  await page.getByLabel('Password').fill('password-123');
  await page.getByRole('button', { name: 'Create account' }).last().click();
  await page.getByRole('button', { name: 'Connect and verify' }).click();
  await expect(page.getByText('Wallet ready')).toBeVisible();

  await page.getByRole('button', { name: 'Explore' }).first().click();
  await page.getByText('Will Driver B win').click();
  await page.getByRole('button', { name: 'Yes' }).click();
  await page.getByRole('button', { name: 'Create invite' }).click();
  await page.getByRole('button', { name: 'Confirm creation' }).click();
  await expect(page.getByText('Invite created')).toBeVisible();
  const inviteLink = await page.locator('text=/http:\\/\\/127\\.0\\.0\\.1:5173\\/invite\\//').textContent();
  const inviteUrl = inviteLink?.trim();
  expect(inviteUrl).toBeTruthy();

  await page.goto('/home');
  await page.getByRole('button', { name: 'Log out' }).click({ force: true });
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.getByLabel('Email').fill('taker@duelly.test');
  await page.getByLabel('Password').fill('password-123');
  await page.getByRole('button', { name: 'Create account' }).last().click();
  await page.getByRole('button', { name: 'Connect and verify' }).click();
  await expect(page.getByText('Wallet ready')).toBeVisible();

  await page.goto(inviteUrl!);
  await page.getByRole('button', { name: 'Accept bet' }).click();
  await expect(page.getByText('Bet accepted')).toBeVisible();
  await page.getByRole('button', { name: 'View bet' }).click();
  await expect(page.getByText('Waiting for result')).toBeVisible();
  await page.getByRole('button', { name: 'Confirm side A winner' }).click();
  await expect(page.getByText('Result confirmed')).toBeVisible();

  await page.getByRole('button', { name: 'Português' }).click();
  await expect(page.getByText('Resultado confirmado')).toBeVisible();
});

test('fixture flow shows wallet-already-linked error in both locales', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.getByLabel('Email').fill('maker@duelly.test');
  await page.getByLabel('Password').fill('password-123');
  await page.getByRole('button', { name: 'Create account' }).last().click();
  await page.getByRole('button', { name: 'Connect and verify' }).click();
  await expect(page.getByText('Wallet ready')).toBeVisible();

  await page.getByRole('button', { name: 'Log out' }).click({ force: true });
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.getByLabel('Email').fill('maker-two@duelly.test');
  await page.getByLabel('Password').fill('password-123');
  await page.getByRole('button', { name: 'Create account' }).last().click();
  await page.getByRole('button', { name: 'Connect and verify' }).click();
  await expect(page.getByText('This wallet is already connected to another Duelly account.')).toBeVisible();

  await page.getByRole('button', { name: 'Português' }).click();
  await expect(page.getByText('Esta carteira já está conectada a outra conta Duelly.')).toBeVisible();
});
