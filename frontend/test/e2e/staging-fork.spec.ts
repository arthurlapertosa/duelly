import { expect, test, type Page } from '@playwright/test';
import { privateKeyToAccount } from 'viem/accounts';
import type { Hex } from 'viem';

const STAGING_FORK = process.env.DUELLY_E2E_MODE === 'staging-fork';
const apiBaseUrl = process.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:3000';
const makerPrivateKey = normalizePrivateKey(process.env.QA_MAKER_PRIVATE_KEY);
const takerPrivateKey = normalizePrivateKey(process.env.QA_TAKER_PRIVATE_KEY);
const makerEmail = process.env.DUELLY_E2E_MAKER_EMAIL ?? 'local-maker@example.test';
const takerEmail = process.env.DUELLY_E2E_TAKER_EMAIL ?? 'local-taker@example.test';
const password = process.env.DUELLY_E2E_PASSWORD ?? 'password-123';

test.describe('staging fork real-data flow', () => {
  test.skip(!STAGING_FORK, 'set DUELLY_E2E_MODE=staging-fork with the staging fork stack up');
  test.skip(!makerPrivateKey || !takerPrivateKey, 'QA_MAKER_PRIVATE_KEY and QA_TAKER_PRIVATE_KEY are required');

  test('funds a live-template bet with fake fork BRL1 and leaves unresolved market pending', async ({ browser }) => {
    test.setTimeout(180_000);

    const maker = privateKeyToAccount(makerPrivateKey!);
    const taker = privateKeyToAccount(takerPrivateKey!);

    await Promise.all([
      ensureUser(makerEmail, password),
      ensureUser(takerEmail, password),
    ]);

    const makerContext = await browser.newContext();
    const makerPage = await makerContext.newPage();
    await loginAndVerify(makerPage, makerEmail, password, maker.address);
    await assertBrl1Balance(makerEmail, password, maker.address);

    await makerPage.goto('/templates');
    await expect(makerPage.getByRole('heading', { name: /Choose your next duel/i })).toBeVisible({ timeout: 30_000 });
    await expect(makerPage.getByText('No templates are available')).toHaveCount(0);
    await makerPage.locator('button:has(h3)').first().click();
    await makerPage.getByRole('radio').first().click();
    await expect(makerPage.getByRole('button', { name: 'Create invite' })).toBeEnabled({ timeout: 30_000 });
    await makerPage.getByRole('button', { name: 'Create invite' }).click();
    await makerPage.getByLabel('Opponent email').fill(takerEmail);
    await makerPage.getByRole('button', { name: 'Confirm creation' }).click();
    await expect(makerPage.getByText('Invite created')).toBeVisible({ timeout: 60_000 });
    const inviteUrl = (await makerPage.locator('text=/http:\\/\\/127\\.0\\.0\\.1:5173\\/invite\\//').textContent())?.trim();
    expect(inviteUrl).toBeTruthy();

    const takerContext = await browser.newContext();
    const takerPage = await takerContext.newPage();
    await loginAndVerify(takerPage, takerEmail, password, taker.address);
    await assertBrl1Balance(takerEmail, password, taker.address);
    await takerPage.goto(inviteUrl!);
    await expect(takerPage.getByRole('button', { name: 'Accept bet' })).toBeEnabled({ timeout: 30_000 });
    await takerPage.getByRole('button', { name: 'Accept bet' }).click();
    await expect(takerPage.getByText('Bet accepted')).toBeVisible({ timeout: 90_000 });
    await takerPage.getByRole('button', { name: 'View bet' }).click();
    await expect(takerPage.getByText('Waiting for result')).toBeVisible({ timeout: 60_000 });

    const betId = takerPage.url().split('/').pop();
    expect(betId).toBeTruthy();
    await fetchJson('/internal/indexer/reindex', { method: 'POST', body: JSON.stringify({}) });
    await waitForBet(betId!, 'Funded');

    await takerPage.waitForTimeout(Number(process.env.RESOLUTION_WORKER_INTERVAL_MS ?? 60_000) + 2_000);
    await fetchJson('/internal/indexer/reindex', { method: 'POST', body: JSON.stringify({}) });
    await waitForBet(betId!, 'Funded');
    await takerPage.reload();
    await expect(takerPage.getByText('Waiting for result')).toBeVisible({ timeout: 30_000 });
    await takerPage.screenshot({ path: test.info().outputPath('staging-fork-funded-pending.png'), fullPage: true });

    await makerContext.close();
    await takerContext.close();
  });
});

async function ensureUser(email: string, userPassword: string): Promise<void> {
  const response = await fetch(`${apiBaseUrl}/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: userPassword }),
  });
  if (response.ok) return;
  const body = await response.json().catch(() => ({}));
  if (body.code === 'EMAIL_ALREADY_REGISTERED') return;
  throw new Error(`Could not ensure user ${email}: ${body.code ?? response.statusText}`);
}

async function loginApi(email: string, userPassword: string): Promise<{ token: string }> {
  return await fetchJson('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password: userPassword }),
  });
}

async function assertBrl1Balance(email: string, userPassword: string, expectedAddress: string): Promise<void> {
  const { token } = await loginApi(email, userPassword);
  const balance = await fetchJson<{ wallet: string; token: string; symbol: string; decimals: number; balanceRaw: string }>('/wallets/me/brl1', {
    headers: { authorization: `Bearer ${token}` },
  });
  expect(balance.wallet.toLowerCase()).toBe(expectedAddress.toLowerCase());
  expect(balance.token).toMatch(/^0x[a-fA-F0-9]{40}$/);
  expect(balance.symbol).toBe('BRL1');
  expect(balance.decimals).toBe(18);
  expect(BigInt(balance.balanceRaw)).toBeGreaterThan(0n);
}

async function loginAndVerify(page: Page, email: string, userPassword: string, expectedAddress: string): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => window.localStorage.clear());
  await page.goto('/');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(userPassword);
  await page.getByRole('button', { name: 'Sign in' }).click();
  const ready = page.getByText('Wallet ready');
  const connect = page.getByRole('button', { name: 'Connect and verify' });
  await waitForWalletPromptOrReady(page, ready, connect);
  if (!await ready.isVisible()) await connect.click();
  await expect(ready).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(`${expectedAddress.slice(0, 6)}...${expectedAddress.slice(-4)}`)).toBeVisible();
}

async function waitForWalletPromptOrReady(page: Page, ready: ReturnType<Page['getByText']>, connect: ReturnType<Page['getByRole']>): Promise<void> {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (await ready.isVisible()) return;
    if (await connect.isVisible()) return;
    await page.waitForTimeout(250);
  }
  await expect(ready.or(connect)).toBeVisible();
}

async function fetchJson<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('content-type', 'application/json');
  const response = await fetch(`${apiBaseUrl}${path}`, { ...init, headers });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.status === 'error') throw new Error(String(body.code ?? response.statusText));
  return body as T;
}

async function waitForBet(betId: string, status: string): Promise<{ bet: { status?: string } }> {
  for (let attempt = 0; attempt < 15; attempt += 1) {
    const bet = await fetchJson<{ bet: { status?: string } }>(`/bets/${betId}`).catch(() => null);
    if (bet?.bet.status === status) return bet;
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
  throw new Error(`BET_NOT_${status}`);
}

function normalizePrivateKey(value: string | undefined): Hex | undefined {
  if (!value) return undefined;
  return (value.startsWith('0x') ? value : `0x${value}`) as Hex;
}
