import 'reflect-metadata';

import {
  AuthSessionEntity,
} from './auth-session.entity.js';
import {
  BetInviteEntity,
} from './bet-invite.entity.js';
import {
  ConditionResolutionStatusEntity,
} from './condition-resolution-status.entity.js';
import {
  IndexedBetEntity,
} from './indexed-bet.entity.js';
import {
  IndexedChainEventEntity,
} from './indexed-chain-event.entity.js';
import {
  IndexerCursorEntity,
} from './indexer-cursor.entity.js';
import {
  LinkedWalletEntity,
} from './linked-wallet.entity.js';
import {
  RelayerAttemptEntity,
} from './relayer-attempt.entity.js';
import {
  ResolutionAttemptEntity,
} from './resolution-attempt.entity.js';
import {
  UserAccountEntity,
} from './user-account.entity.js';
import {
  WalletChallengeEntity,
} from './wallet-challenge.entity.js';

export {
  AuthSessionEntity,
} from './auth-session.entity.js';
export {
  BetInviteEntity,
} from './bet-invite.entity.js';
export {
  CandidateSnapshotEntity,
} from './candidate-snapshot.entity.js';
export {
  ConditionResolutionStatusEntity,
} from './condition-resolution-status.entity.js';
export type {
  PersistedConditionResolutionStatus,
} from './condition-resolution-status.entity.js';
export {
  DiscoveryRunEntity,
} from './discovery-run.entity.js';
export {
  IndexedBetEntity,
} from './indexed-bet.entity.js';
export {
  IndexedChainEventEntity,
} from './indexed-chain-event.entity.js';
export {
  IndexerCursorEntity,
} from './indexer-cursor.entity.js';
export {
  LinkedWalletEntity,
} from './linked-wallet.entity.js';
export {
  RejectedCandidateEntity,
} from './rejected-candidate.entity.js';
export {
  RelayerAttemptEntity,
} from './relayer-attempt.entity.js';
export {
  ResolutionAttemptEntity,
} from './resolution-attempt.entity.js';
export {
  SportsTemplateEntity,
} from './sports-template.entity.js';
export {
  TemplatePublishAuditEntity,
} from './template-publish-audit.entity.js';
export {
  UserAccountEntity,
} from './user-account.entity.js';
export {
  WalletChallengeEntity,
} from './wallet-challenge.entity.js';

export const orchestrationEntities = [
  UserAccountEntity,
  AuthSessionEntity,
  WalletChallengeEntity,
  LinkedWalletEntity,
  BetInviteEntity,
  RelayerAttemptEntity,
  IndexedChainEventEntity,
  IndexedBetEntity,
  IndexerCursorEntity,
  ResolutionAttemptEntity,
  ConditionResolutionStatusEntity,
];
