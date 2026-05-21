import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { brlToRaw, formatBRL, potentialPayoutRaw } from '../src/lib/format.ts';
import { missingTranslationKeys, translate } from '../src/lib/i18n.ts';
import { deriveBetStatus } from '../src/lib/mappers.ts';
import type { BetSummaryView } from '../src/lib/types.ts';

test('locales are complete and provide both default languages', () => {
  assert.deepEqual(missingTranslationKeys(), []);
  assert.equal(translate('pt-BR', 'auth.enter'), 'Entrar');
  assert.equal(translate('en-US', 'auth.enter'), 'Sign in');
});

test('BRL1 raw values format per active locale', () => {
  const raw = brlToRaw(52.5);
  assert.equal(raw, '52500000000000000000');
  assert.equal(formatBRL(raw, 'pt-BR'), 'R$ 52,50');
  assert.equal(formatBRL(raw, 'en-US'), 'R$52.50');
  assert.equal(potentialPayoutRaw(brlToRaw(50), brlToRaw(3)), brlToRaw(103));
});

test('invite-only summaries derive non-funded UI statuses', () => {
  const summary = {
    role: 'maker',
    requiredFundingRaw: brlToRaw(53),
    template: null,
    bet: null,
    invite: {
      id: 'invite-1',
      status: 'created',
      templateHash: `0x${'01'.repeat(32)}`,
      conditionId: `0x${'02'.repeat(32)}`,
      makerAddress: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      takerAddress: null,
      makerOutcomeIndex: 0,
      takerOutcomeIndex: null,
      stakeRaw: brlToRaw(50),
      loserFeeRaw: brlToRaw(3),
      expiresAt: '2026-06-27T10:00:00.000Z',
      betId: null,
    },
  } satisfies BetSummaryView;
  assert.equal(deriveBetStatus(summary), 'InviteCreated');
  assert.equal(deriveBetStatus({ ...summary, invite: { ...summary.invite, status: 'funded', betId: '1' } }), 'Funded');
});

test('frontend source does not expose M3.5 primary flow labels or raw web3 jargon', () => {
  const source = [
    readFileSync(resolve('src/App.tsx'), 'utf8'),
    readFileSync(resolve('src/lib/i18n.ts'), 'utf8'),
  ].join('\n');
  for (const forbidden of ['Pix', 'Stripe', 'Depositar', 'Sacar', 'ERC-2612', 'EIP-712', 'Polygon', 'escrow']) {
    assert.equal(source.includes(forbidden), false, forbidden);
  }
});
