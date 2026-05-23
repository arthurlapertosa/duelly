import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

/** Opens the Home log-out confirmation dialog and confirms it. */
async function confirmLogout(page: Page) {
  await page.getByRole('button', { name: 'Log out' }).first().click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Log out' }).click();
}

test('fixture flow supports two users, one funded bet, resolution, and both locales', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Duelly' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign in' }).last()).toBeVisible();
  await page.getByRole('tab', { name: 'Create account' }).click();
  await page.getByLabel('Email').fill('maker@duelly.test');
  await page.getByLabel('Password').fill('password-123');
  await page.getByRole('button', { name: 'Create account' }).last().click();
  await page.getByRole('button', { name: 'Connect and verify' }).click();
  await expect(page.getByText('Wallet ready')).toBeVisible();

  await page.getByRole('button', { name: 'Explore' }).first().click();
  await page.getByText('Will Driver B win').click();
  await page.getByRole('radio', { name: 'Yes' }).click();
  await page.getByRole('button', { name: 'Create invite' }).click();
  await page.getByLabel('Opponent email').fill('taker@duelly.test');
  await page.getByRole('button', { name: 'Confirm creation' }).click();
  await expect(page.getByText('Invite created')).toBeVisible();
  const inviteLink = await page.locator('text=/http:\\/\\/127\\.0\\.0\\.1:5173\\/invite\\//').textContent();
  const inviteUrl = inviteLink?.trim();
  expect(inviteUrl).toBeTruthy();

  await page.goto('/home');
  await confirmLogout(page);
  await page.getByRole('tab', { name: 'Create account' }).click();
  await page.getByLabel('Email').fill('taker@duelly.test');
  await page.getByLabel('Password').fill('password-123');
  await page.getByRole('button', { name: 'Create account' }).last().click();
  await expect(page.getByRole('heading', { name: 'Invites for you' })).toBeVisible();
  await page.getByRole('button', { name: /Review invite/ }).click();
  await expect(page.getByRole('heading', { name: 'Bet invite' })).toBeVisible();
  await page.getByRole('button', { name: 'Connect and verify' }).click();
  await expect(page.getByRole('button', { name: 'Accept bet' })).toBeEnabled();

  await page.getByRole('button', { name: 'Accept bet' }).click();
  await expect(page.getByText('Activating bet')).toBeVisible();
  await expect(page.getByText('Waiting for result')).toBeVisible({ timeout: 10_000 });
  await page.getByRole('button', { name: 'Confirm side A winner' }).click();
  await expect(page.getByText('Result confirmed')).toBeVisible();
  // Taker bet on side B, side A won — the loss result card leads with the stake.
  await expect(page.getByText('You lost')).toBeVisible();

  await page.getByRole('button', { name: 'Português' }).click();
  await expect(page.getByText('Resultado confirmado')).toBeVisible();
});

test('fixture flow shows wallet-already-linked error in both locales', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('tab', { name: 'Create account' }).click();
  await page.getByLabel('Email').fill('maker@duelly.test');
  await page.getByLabel('Password').fill('password-123');
  await page.getByRole('button', { name: 'Create account' }).last().click();
  await page.getByRole('button', { name: 'Connect and verify' }).click();
  await expect(page.getByText('Wallet ready')).toBeVisible();

  await confirmLogout(page);
  await page.getByRole('tab', { name: 'Create account' }).click();
  await page.getByLabel('Email').fill('maker-two@duelly.test');
  await page.getByLabel('Password').fill('password-123');
  await page.getByRole('button', { name: 'Create account' }).last().click();
  await page.getByRole('button', { name: 'Connect and verify' }).click();
  await expect(page.getByText('This wallet is already connected to another Duelly account.')).toBeVisible();

  await page.getByRole('button', { name: 'Português' }).click();
  await expect(page.getByText('Esta carteira já está conectada a outra conta Duelly.')).toBeVisible();
});
