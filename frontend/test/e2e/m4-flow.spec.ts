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
  const inviteLink = await page.locator('text=/http:\\/\\/127\\.0\\.0\\.1:\\d+\\/invite\\//').textContent();
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
  const fundingTx = `0x${'ab'.repeat(32)}`;
  await page.evaluate((transactionHash) => {
    const raw = window.localStorage.getItem('duelly-m4-fixture-state');
    if (!raw) throw new Error('MISSING_FIXTURE_STATE');
    const state = JSON.parse(raw) as {
      bets: Array<{ receipts?: unknown }>;
    };
    const bet = state.bets[0];
    if (!bet) throw new Error('MISSING_FIXTURE_BET');
    bet.receipts = {
      funding: {
        transactionHash,
        blockNumber: '100',
        url: `https://polygonscan.com/tx/${transactionHash}`,
      },
      settlement: null,
      contract: {
        address: '0x0000000000000000000000000000000000001002',
        url: 'https://polygonscan.com/address/0x0000000000000000000000000000000000001002',
      },
    };
    window.localStorage.setItem('duelly-m4-fixture-state', JSON.stringify(state));
  }, fundingTx);
  await page.reload();
  await expect(page.getByText('Public records')).toBeVisible();
  const activationLink = page.getByRole('link', { name: 'Open Activation' });
  await expect(activationLink).toHaveAttribute('href', `https://polygonscan.com/tx/${fundingTx}`);
  await expect(activationLink).toHaveAttribute('target', '_blank');
  await page.getByRole('button', { name: 'Confirm side A winner' }).click();
  await expect(page.getByText('Result confirmed')).toBeVisible();
  // Taker bet on side B, side A won — the loss result card leads with the stake.
  await expect(page.getByText('You lost')).toBeVisible();

  await page.getByRole('button', { name: 'Português' }).click();
  await expect(page.getByText('Resultado confirmado')).toBeVisible();
});

test('fixture account data refreshes without navigation after focus', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('tab', { name: 'Create account' }).click();
  await page.getByLabel('Email').fill('auto-refresh@duelly.test');
  await page.getByLabel('Password').fill('password-123');
  await page.getByRole('button', { name: 'Create account' }).last().click();
  await page.getByRole('button', { name: 'Connect and verify' }).click();
  await expect(page.getByText('Wallet ready')).toBeVisible();
  await expect(page.getByText('R$250.00')).toBeVisible();

  await page.evaluate(() => {
    const raw = window.localStorage.getItem('duelly-m4-fixture-state');
    if (!raw) throw new Error('MISSING_FIXTURE_STATE');
    const state = JSON.parse(raw) as {
      users: Array<{ id: string; email: string; wallet: { address: string } | null; balanceRaw: string }>;
      invites: unknown[];
    };
    const user = state.users.find((item) => item.email === 'auto-refresh@duelly.test');
    if (!user?.wallet) throw new Error('MISSING_FIXTURE_USER');
    user.balanceRaw = '325000000000000000000';
    state.invites.unshift({
      id: 'invite-auto-refresh',
      makerUserId: user.id,
      takerUserId: null,
      recipientEmail: null,
      status: 'created',
      isRecipientRestricted: false,
      recipientEmailHint: null,
      recipientAccess: 'open',
      templateHash: '0x0b28aa25b6eb1b834a251ba9aa935e2af639b1237c979e9ac2343e15dc5a0d7f',
      conditionId: '0x0808080808080808080808080808080808080808080808080808080808080808',
      makerAddress: user.wallet.address,
      takerAddress: null,
      makerOutcomeIndex: 0,
      takerOutcomeIndex: null,
      stakeRaw: '50000000000000000000',
      loserFeeRaw: '3000000000000000000',
      expiresAt: '2026-06-27T10:00:00.000Z',
      betId: null,
      offerPayload: { domain: {}, types: {}, primaryType: 'BetOffer', message: {} },
      makerPermitPayload: { domain: {}, types: {}, primaryType: 'Permit', message: {} },
      acceptancePayload: null,
      takerPermitPayload: null,
    });
    window.localStorage.setItem('duelly-m4-fixture-state', JSON.stringify(state));
    window.dispatchEvent(new Event('focus'));
  });

  await expect(page.getByText('R$325.00')).toBeVisible();
  await expect(page.getByText(/Will Driver B win/)).toBeVisible();
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
