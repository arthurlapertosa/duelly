import { test, expect } from '@playwright/test';

/**
 * Real-chain settlement smoke test.
 *
 * Unlike m4-flow.spec.ts (fixture mode), this drives http mode against a live
 * backend + anvil fork and signs with the QA private-key wallet adapter. It is
 * gated so the default `npm run test:e2e` (fixture) never runs it.
 *
 * To run:
 *   1. Start the stack: scripts/dev/start-stack.sh
 *   2. frontend/.env must set VITE_DUELLY_API_MODE=http, VITE_QA_WALLET=true
 *      and the QA keys (see frontend/.env.example).
 *   3. DUELLY_E2E_MODE=realchain npm run test:e2e
 *
 * Assumes the LOCAL_FORK_QA users exist with their wallets linked:
 *   local-maker@example.test / local-taker@example.test (password-123).
 */
const REALCHAIN = process.env.DUELLY_E2E_MODE === 'realchain';

test.describe('real-chain settlement', () => {
  test.skip(!REALCHAIN, 'set DUELLY_E2E_MODE=realchain with the live stack up');

  test('maker reads on-chain balance and creates a signed invite', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => window.localStorage.clear());
    await page.goto('/');

    await page.getByRole('button', { name: 'Sign in' }).first().click();
    await page.getByLabel('Email').fill('local-maker@example.test');
    await page.getByLabel('Password').fill('password-123');
    await page.getByRole('button', { name: 'Sign in' }).last().click();

    // Balance is read from BRL1 on the anvil fork, not a fixture.
    await expect(page.getByText('Wallet ready')).toBeVisible();
    await expect(page.getByText(/R\$[\d.,]+/).first()).toBeVisible();

    await page.getByRole('button', { name: 'Explore' }).first().click();
    await page.getByText('Will Driver B win the 2026 Austria sprint race?').click();
    await page.getByRole('button', { name: 'Yes' }).click();
    await page.getByRole('button', { name: 'Create invite' }).click();

    await page.getByLabel('Opponent email').fill('local-taker@example.test');
    // Confirm creation triggers a real EIP-712 offer signature + ERC-2612
    // permit signature; the backend rejects invalid signatures.
    await page.getByRole('button', { name: 'Confirm creation' }).click();
    await expect(page.getByText('Invite created')).toBeVisible({ timeout: 15_000 });
  });
});
