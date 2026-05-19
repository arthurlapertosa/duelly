import { access, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { hashJson } from '../hashing/template-hash.service.js';
import type { NormalizedMarketCandidate, Outcome, Sport } from '../domain/types.js';

const currentDir = dirname(fileURLToPath(import.meta.url));
const fixtureRelativePath = 'fixtures/polymarket/sports/markets.json';

type FixtureMarket = Omit<NormalizedMarketCandidate, 'provider' | 'outcomes' | 'rawProviderPayloadHash' | 'rawProviderPayload'> & {
  outcomes: string[];
};

export async function loadFixtureCandidates(sport?: Sport): Promise<NormalizedMarketCandidate[]> {
  const fixturePath = await resolveFixturePath();
  const raw = await readFile(fixturePath, 'utf8');
  const fixtures = JSON.parse(raw) as FixtureMarket[];
  return fixtures
    .map((fixture) => normalizeFixture(fixture))
    .filter((candidate) => !sport || candidate.sport === sport);
}

async function resolveFixturePath(): Promise<string> {
  const candidates = [
    resolve(process.cwd(), fixtureRelativePath),
    resolve(process.cwd(), 'backend', fixtureRelativePath),
    resolve(currentDir, '../../../../', fixtureRelativePath),
    resolve(currentDir, '../../../../../', fixtureRelativePath),
  ];

  for (const candidate of candidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Try the next location. This supports source, dist, repo-root, and workspace-root execution.
    }
  }

  throw new Error(`Could not find fixture file ${fixtureRelativePath}`);
}

function normalizeFixture(fixture: FixtureMarket): NormalizedMarketCandidate {
  const outcomes: Outcome[] = fixture.outcomes.map((label, index) => ({
    label,
    providerOutcomeIndex: index,
    tokenId: fixture.outcomeTokenIds?.[index],
  }));

  return {
    ...fixture,
    provider: 'polymarket',
    outcomes,
    participants: fixture.participants ?? [],
    resultSource: fixture.resultSource ?? 'unknown',
    rawProviderPayloadHash: hashJson(fixture),
  };
}
