import {
  encodePacked,
  getAddress,
  isAddress,
  keccak256,
  type Address,
  type Hex,
} from 'viem';
import type {
  CtfOracleSource,
  CtfOracleValidationStatus,
} from './types.js';

export interface CtfOracleCandidate {
  address?: string;
  source: CtfOracleSource;
}

export interface ResolveTemplateCtfOracleInput {
  conditionId?: string;
  questionId?: string;
  outcomeSlotCount: number;
  negRisk?: boolean;
  includeNegRiskOracleFallback?: boolean;
  resolvedBy?: string;
  negRiskOracleAddress?: Address;
  oracleAddresses?: Address[];
  oracleAddress?: Address;
}

export interface ResolvedTemplateCtfOracle {
  ctfOracleAddress?: Address;
  ctfOracleSource?: CtfOracleSource;
  ctfOracleValidationStatus: CtfOracleValidationStatus;
}

export function ctfConditionIdFor(
  oracleAddress: Address,
  questionId: Hex,
  outcomeSlotCount: number,
): Hex {
  return keccak256(encodePacked(
    ['address', 'bytes32', 'uint256'],
    [oracleAddress, questionId, BigInt(outcomeSlotCount)],
  ));
}

export function resolveTemplateCtfOracle(
  input: ResolveTemplateCtfOracleInput,
): ResolvedTemplateCtfOracle {
  if (!isBytes32(input.conditionId) || !isBytes32(input.questionId)) {
    return { ctfOracleValidationStatus: 'missing-input' };
  }

  const conditionId = input.conditionId.toLowerCase();
  const questionId = input.questionId.toLowerCase() as Hex;

  for (const candidate of ctfOracleCandidates(input)) {
    const expectedConditionId = ctfConditionIdFor(
      candidate.address,
      questionId,
      input.outcomeSlotCount,
    ).toLowerCase();
    if (expectedConditionId === conditionId) {
      return {
        ctfOracleAddress: candidate.address,
        ctfOracleSource: candidate.source,
        ctfOracleValidationStatus: 'validated',
      };
    }
  }

  return { ctfOracleValidationStatus: 'unvalidated' };
}

export function ctfOracleCandidates(input: ResolveTemplateCtfOracleInput): Array<{
  address: Address;
  source: CtfOracleSource;
}> {
  const rawCandidates: CtfOracleCandidate[] = [];
  if (input.negRisk && input.negRiskOracleAddress) {
    rawCandidates.push({
      address: input.negRiskOracleAddress,
      source: 'configured-neg-risk',
    });
  }
  if (isConfiguredOracleCandidate(input, input.resolvedBy)) {
    rawCandidates.push({
      address: input.resolvedBy,
      source: 'gamma-resolved-by',
    });
  }
  for (const address of input.oracleAddresses ?? []) {
    rawCandidates.push({
      address,
      source: 'configured-allowlist',
    });
  }
  rawCandidates.push({
    address: input.oracleAddress,
    source: 'configured-default',
  });
  if (!input.negRisk && input.includeNegRiskOracleFallback && input.negRiskOracleAddress) {
    rawCandidates.push({
      address: input.negRiskOracleAddress,
      source: 'configured-neg-risk',
    });
  }

  const seen = new Set<string>();
  const candidates: Array<{ address: Address; source: CtfOracleSource }> = [];
  for (const candidate of rawCandidates) {
    if (!candidate.address || !isAddress(candidate.address)) continue;
    const address = getAddress(candidate.address);
    const key = address.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    candidates.push({ address, source: candidate.source });
  }
  return candidates;
}

export function isBytes32(value: unknown): value is Hex {
  return typeof value === 'string' && /^0x[0-9a-fA-F]{64}$/.test(value);
}

export function configuredCtfOracleAddressKeys(input: ResolveTemplateCtfOracleInput): Set<string> {
  const keys = new Set<string>();
  for (const address of [
    input.negRiskOracleAddress,
    ...(input.oracleAddresses ?? []),
    input.oracleAddress,
  ]) {
    if (!address || !isAddress(address)) continue;
    keys.add(getAddress(address).toLowerCase());
  }
  return keys;
}

export function isConfiguredOracleCandidate(
  input: ResolveTemplateCtfOracleInput,
  address: string | undefined,
): boolean {
  if (!address || !isAddress(address)) return false;
  return configuredCtfOracleAddressKeys(input).has(getAddress(address).toLowerCase());
}
