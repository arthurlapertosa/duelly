import { expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { privateKeyToAccount } from 'viem/accounts';
import type { Hex } from 'viem';

const runLocalFork = process.env.RUN_LOCAL_FORK_E2E === '1';
const makerPrivateKey = normalizePrivateKey(process.env.QA_MAKER_PRIVATE_KEY);
const takerPrivateKey = normalizePrivateKey(process.env.QA_TAKER_PRIVATE_KEY);
const apiBaseUrl = process.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:3000';
const evidenceDir = resolve(process.cwd(), 'evidence/M4-E2E');

test.skip(!runLocalFork, 'Set RUN_LOCAL_FORK_E2E=1 with local fork and backend running to execute this exploratory flow.');
test.skip(!makerPrivateKey || !takerPrivateKey, 'QA maker and taker private keys are required for the local-fork exploratory flow.');

test('local fork HTTP flow funds and resolves one maker-wins bet', async ({ browser }) => {
  test.setTimeout(120_000);

  const maker = privateKeyToAccount(makerPrivateKey!);
  const taker = privateKeyToAccount(takerPrivateKey!);

  const makerContext = await walletContext(browser, makerPrivateKey!);
  const makerPage = await makerContext.newPage();
  await registerVerifyAndPublish(makerPage, 'local-maker@example.test', maker.address);

  await makerPage.goto('/templates/fixture-f1-sprint-winner');
  await expect(makerPage.getByRole('heading', { name: /Will Driver B win/ })).toBeVisible();
  await makerPage.getByRole('button', { name: 'Yes', exact: true }).click();
  await makerPage.getByRole('button', { name: 'Create invite' }).click();
  await makerPage.getByRole('button', { name: 'Confirm creation' }).click();
  await expect(makerPage.getByText('Invite created')).toBeVisible();
  const inviteUrl = (await makerPage.locator('text=/http:\\/\\/127\\.0\\.0\\.1:5173\\/invite\\//').textContent())?.trim();
  expect(inviteUrl).toBeTruthy();

  const takerContext = await walletContext(browser, takerPrivateKey!);
  const takerPage = await takerContext.newPage();
  await registerVerifyAndPublish(takerPage, 'local-taker@example.test', taker.address);
  await takerPage.goto(inviteUrl!);
  await takerPage.getByRole('button', { name: 'Accept bet' }).click();
  await expect(takerPage.getByText('Bet accepted')).toBeVisible({ timeout: 60_000 });
  await takerPage.getByRole('button', { name: 'View bet' }).click();
  await expect(takerPage.getByText('Waiting for result')).toBeVisible();

  const betId = takerPage.url().split('/').pop();
  expect(betId).toBeTruthy();
  await fetchJson('/internal/indexer/reindex', { method: 'POST', body: JSON.stringify({}) });
  const betBefore = await waitForBet(betId!);
  await fetchJson('/internal/resolution/mock-payout', {
    method: 'POST',
    body: JSON.stringify({ conditionId: betBefore.bet.conditionId, denominator: '1', numerators: ['1', '0'] }),
  });
  await fetchJson('/internal/resolution/run', { method: 'POST', body: JSON.stringify({ betId }) });
  await fetchJson('/internal/indexer/reindex', { method: 'POST', body: JSON.stringify({}) });
  const finalBet = await waitForBet(betId!, 'Resolved');
  await writeJsonEvidence('final-bet.json', finalBet);

  await takerPage.reload();
  await expect(takerPage.getByText('Result confirmed')).toBeVisible();
  await saveScreenshot(takerPage, 'taker-resolved-en-US.png');
  await takerPage.getByRole('button', { name: 'Português' }).click();
  await expect(takerPage.getByText('Resultado confirmado')).toBeVisible({ timeout: 60_000 });
  await saveScreenshot(takerPage, 'taker-resolved-pt-BR.png');

  await makerPage.goto(`/bets/${betId}`);
  await expect(makerPage.getByText('Result confirmed')).toBeVisible({ timeout: 60_000 });
  await saveScreenshot(makerPage, 'maker-resolved-en-US.png');
  await makerPage.getByRole('button', { name: 'Português' }).click();
  await expect(makerPage.getByText('Resultado confirmado')).toBeVisible();
  await saveScreenshot(makerPage, 'maker-resolved-pt-BR.png');

  await makerContext.close();
  await takerContext.close();
});

async function registerVerifyAndPublish(page: Page, email: string, expectedAddress: string) {
  await page.goto('/');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('password-123');
  await page.getByRole('button', { name: 'Sign in' }).last().click();
  const ready = page.getByText('Wallet ready');
  const alreadyReady = await ready.waitFor({ state: 'visible', timeout: 3_000 }).then(() => true).catch(() => false);
  if (!alreadyReady) {
    await page.getByRole('button', { name: 'Connect and verify' }).click();
  }
  await expect(ready).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(`${expectedAddress.slice(0, 6)}...${expectedAddress.slice(-4)}`)).toBeVisible();
  const token = await page.evaluate(() => JSON.parse(window.localStorage.getItem('duelly-m4-session') ?? '{}')?.state?.token as string | undefined);
  expect(token).toBeTruthy();
  await fetchJson('/templates/fixture-f1-sprint-winner/publish-chain?mode=fixture', {
    method: 'POST',
    headers: { authorization: `Bearer ${token}` },
    body: JSON.stringify({}),
  });
}

async function walletContext(browser: Browser, privateKey: Hex): Promise<BrowserContext> {
  const account = privateKeyToAccount(privateKey);
  const context = await browser.newContext();
  await context.exposeBinding('duellyWalletRequest', async (_source, args: { method: string; params?: unknown[] }) => {
    if (args.method === 'eth_requestAccounts') return [account.address];
    if (args.method === 'personal_sign') return await account.signMessage({ message: String(args.params?.[0] ?? '') });
    if (args.method === 'eth_signTypedData_v4') {
      const payload = JSON.parse(String(args.params?.[1] ?? '{}')) as { message: Record<string, unknown> };
      for (const field of ['stake', 'loserFee', 'nonce', 'deadline', 'value']) {
        if (payload.message[field] !== undefined) payload.message[field] = BigInt(String(payload.message[field]));
      }
      return await account.signTypedData(payload as never);
    }
    throw new Error(`Unsupported wallet method: ${args.method}`);
  });
  await context.addInitScript((address) => {
    window.ethereum = {
      request: async (args) => {
        if (args.method === 'eth_accounts') return [address];
        return await window.duellyWalletRequest(args);
      },
    };
  }, account.address);
  return context;
}

async function fetchJson<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('content-type', 'application/json');
  const response = await fetch(`${apiBaseUrl}${path}`, { ...init, headers });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.status === 'error') throw new Error(String(body.code ?? response.statusText));
  return body as T;
}

async function waitForBet(betId: string, status?: string): Promise<{ bet: { conditionId: string; status?: string } }> {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    if (status) await fetchJson('/internal/indexer/reindex', { method: 'POST', body: JSON.stringify({}) }).catch(() => null);
    const bet = await fetchJson<{ bet: { conditionId: string; status?: string } }>(`/bets/${betId}`).catch(() => null);
    if (bet && (!status || bet.bet.status === status)) return bet;
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
  throw new Error(status ? `BET_NOT_${status}` : 'BET_NOT_INDEXED');
}

async function saveScreenshot(page: Page, filename: string): Promise<void> {
  await mkdir(evidenceDir, { recursive: true });
  await page.screenshot({ path: resolve(evidenceDir, filename), fullPage: true });
}

async function writeJsonEvidence(filename: string, data: unknown): Promise<void> {
  await mkdir(evidenceDir, { recursive: true });
  await writeFile(resolve(evidenceDir, filename), `${JSON.stringify(data, null, 2)}\n`);
}

function normalizePrivateKey(value: string | undefined): Hex | undefined {
  if (!value) return undefined;
  return (value.startsWith('0x') ? value : `0x${value}`) as Hex;
}

declare global {
  interface Window {
    ethereum?: {
      request<T = unknown>(args: { method: string; params?: unknown[] }): Promise<T>;
    };
    duellyWalletRequest(args: { method: string; params?: unknown[] }): Promise<unknown>;
  }
}
