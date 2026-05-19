import { access, readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { hashJson } from '../hashing/template-hash.service.js';
import type { NormalizedMarketCandidate, Outcome, Sport } from '../domain/types.js';

const currentDir = dirname(fileURLToPath(import.meta.url));
const fixturePathFromWorkspaceRoot = 'backend/fixtures/polymarket/sports/markets.json';

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
  const workspaceRoot = await findWorkspaceRoot([process.cwd(), currentDir]);
  if (!workspaceRoot) {
    throw new Error(`Could not find workspace root containing ${fixturePathFromWorkspaceRoot}`);
  }
  return join(workspaceRoot, fixturePathFromWorkspaceRoot);
}

async function findWorkspaceRoot(startDirectories: string[]): Promise<string | undefined> {
  const visited = new Set<string>();

  for (const startDirectory of startDirectories) {
    let directory = resolve(startDirectory);

    while (!visited.has(directory)) {
      visited.add(directory);
      const fixturePath = join(directory, fixturePathFromWorkspaceRoot);
      if (await pathExists(fixturePath)) return directory;

      const parentDirectory = dirname(directory);
      if (parentDirectory === directory) break;
      directory = parentDirectory;
    }
  }

  return undefined;
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
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
