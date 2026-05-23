import { type DataSource, type EntityTarget } from 'typeorm';
import type { Address } from 'viem';
import type {
  IndexedBet,
  IndexedChainEvent,
  IndexerCursor,
  BetInvite,
  RelayerAttempt,
  ResolutionAttempt,
  AuthSession,
  UserAccount,
  LinkedWallet,
  WalletChallenge,
} from './domain.js';
import {
  IndexedBetEntity,
  IndexedChainEventEntity,
  IndexerCursorEntity,
  BetInviteEntity,
  RelayerAttemptEntity,
  ResolutionAttemptEntity,
  AuthSessionEntity,
  UserAccountEntity,
  WalletChallengeEntity,
  LinkedWalletEntity,
} from '../templates/persistence/entities/index.js';

export class OrchestrationRepository {
  private readonly memory = {
    users: new Map<string, UserAccount>(),
    sessions: new Map<string, AuthSession>(),
    walletChallenges: new Map<string, WalletChallenge>(),
    wallets: new Map<string, LinkedWallet>(),
    invites: new Map<string, BetInvite>(),
    relayerAttempts: new Map<string, RelayerAttempt>(),
    indexedEvents: new Map<string, IndexedChainEvent>(),
    indexedBets: new Map<string, IndexedBet>(),
    cursors: new Map<string, IndexerCursor>(),
    resolutionAttempts: new Map<string, ResolutionAttempt>(),
  };

  constructor(private readonly dataSource?: DataSource) {}

  get enabled(): boolean {
    return Boolean(this.dataSource?.isInitialized);
  }

  async saveUser(user: UserAccount): Promise<UserAccount> {
    if (this.enabled) await this.repo(UserAccountEntity).save(user);
    else this.memory.users.set(user.id, user);
    return user;
  }

  async findUserByEmail(email: string): Promise<UserAccount | undefined> {
    if (this.enabled) return await this.repo(UserAccountEntity).findOneBy({ email: email.toLowerCase() }) ?? undefined;
    return [...this.memory.users.values()].find((user) => user.email === email.toLowerCase());
  }

  async findUserById(id: string): Promise<UserAccount | undefined> {
    if (this.enabled) return await this.repo(UserAccountEntity).findOneBy({ id }) ?? undefined;
    return this.memory.users.get(id);
  }

  async saveSession(session: AuthSession): Promise<AuthSession> {
    if (this.enabled) await this.repo(AuthSessionEntity).save(session);
    else this.memory.sessions.set(session.id, session);
    return session;
  }

  async findSessionByTokenHash(tokenHash: string): Promise<AuthSession | undefined> {
    if (this.enabled) return await this.repo(AuthSessionEntity).findOneBy({ tokenHash }) ?? undefined;
    return [...this.memory.sessions.values()].find((session) => session.tokenHash === tokenHash);
  }

  async revokeSession(session: AuthSession): Promise<void> {
    session.revokedAt = new Date();
    await this.saveSession(session);
  }

  async saveWalletChallenge(challenge: WalletChallenge): Promise<WalletChallenge> {
    if (this.enabled) await this.repo(WalletChallengeEntity).save(challenge);
    else this.memory.walletChallenges.set(challenge.id, challenge);
    return challenge;
  }

  async findWalletChallenge(id: string): Promise<WalletChallenge | undefined> {
    if (this.enabled) return await this.repo(WalletChallengeEntity).findOneBy({ id }) as WalletChallenge | null ?? undefined;
    return this.memory.walletChallenges.get(id);
  }

  async saveWallet(wallet: LinkedWallet): Promise<LinkedWallet> {
    if (this.enabled) await this.repo(LinkedWalletEntity).save(wallet);
    else this.memory.wallets.set(wallet.id, wallet);
    return wallet;
  }

  async findActiveWalletByUserId(userId: string): Promise<LinkedWallet | undefined> {
    if (this.enabled) {
      return await this.repo(LinkedWalletEntity).findOneBy({ userId, active: true }) as LinkedWallet | null ?? undefined;
    }
    return [...this.memory.wallets.values()].find((wallet) => wallet.userId === userId && wallet.active);
  }

  async findActiveWalletByAddress(address: Address): Promise<LinkedWallet | undefined> {
    const normalized = address.toLowerCase();
    if (this.enabled) {
      return await this.repo(LinkedWalletEntity)
        .createQueryBuilder('wallet')
        .where('lower(wallet.address) = :address', { address: normalized })
        .andWhere('wallet.active = :active', { active: true })
        .getOne() as LinkedWallet | null ?? undefined;
    }
    return [...this.memory.wallets.values()].find((wallet) => wallet.address.toLowerCase() === normalized && wallet.active);
  }

  async findWalletByAddress(address: Address): Promise<LinkedWallet | undefined> {
    const normalized = address.toLowerCase();
    if (this.enabled) {
      return await this.repo(LinkedWalletEntity)
        .createQueryBuilder('wallet')
        .where('lower(wallet.address) = :address', { address: normalized })
        .getOne() as LinkedWallet | null ?? undefined;
    }
    return [...this.memory.wallets.values()].find((wallet) => wallet.address.toLowerCase() === normalized);
  }

  async saveInvite(invite: BetInvite): Promise<BetInvite> {
    if (this.enabled) await this.repo(BetInviteEntity).save(invite);
    else this.memory.invites.set(invite.id, invite);
    return invite;
  }

  async findInvite(id: string): Promise<BetInvite | undefined> {
    if (this.enabled) return await this.repo(BetInviteEntity).findOneBy({ id }) as BetInvite | null ?? undefined;
    return this.memory.invites.get(id);
  }

  async findInviteByBetId(betId: string, deploymentKey?: string): Promise<BetInvite | undefined> {
    if (this.enabled) {
      const query = this.repo(BetInviteEntity)
        .createQueryBuilder('invite')
        .where('invite.betId = :betId', { betId });
      if (deploymentKey) query.andWhere('invite.deploymentKey = :deploymentKey', { deploymentKey });
      return await query.orderBy('invite.updatedAt', 'DESC').getOne() as BetInvite | null ?? undefined;
    }
    return [...this.memory.invites.values()]
      .filter((invite) => invite.betId === betId)
      .filter((invite) => !deploymentKey || invite.deploymentKey === deploymentKey)
      .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime())[0];
  }

  async findInvitesByUserId(userId: string, deploymentKey?: string): Promise<BetInvite[]> {
    if (this.enabled) {
      const query = this.repo(BetInviteEntity)
        .createQueryBuilder('invite')
        .where('(invite.makerUserId = :userId or invite.takerUserId = :userId)', { userId })
        .andWhere('invite.status not in (:...hiddenStatuses)', { hiddenStatuses: ['draft', 'cancelled'] })
        .orderBy('invite.updatedAt', 'DESC');
      if (deploymentKey) {
        query.andWhere(
          '(invite.deploymentKey = :deploymentKey or (invite.deploymentKey is null and invite.status in (:...preFundingStatuses)))',
          { deploymentKey, preFundingStatuses: ['created', 'accepted'] },
        );
      }
      return await query.getMany() as BetInvite[];
    }
    return [...this.memory.invites.values()]
      .filter((invite) => invite.makerUserId === userId || invite.takerUserId === userId)
      .filter((invite) => invite.status !== 'draft' && invite.status !== 'cancelled')
      .filter((invite) => !deploymentKey || invite.deploymentKey === deploymentKey || (invite.deploymentKey === null && ['created', 'accepted'].includes(invite.status)))
      .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime());
  }

  async findPendingInvitesByRecipientEmail(email: string, excludeUserId: string): Promise<BetInvite[]> {
    const normalized = email.toLowerCase();
    if (this.enabled) {
      return await this.repo(BetInviteEntity)
        .createQueryBuilder('invite')
        .where('lower(invite.recipientEmail) = :email', { email: normalized })
        .andWhere('invite.makerUserId != :excludeUserId', { excludeUserId })
        .andWhere('invite.takerUserId is null')
        .andWhere('invite.status = :status', { status: 'created' })
        .andWhere('invite.expiresAt > :now', { now: new Date() })
        .orderBy('invite.updatedAt', 'DESC')
        .getMany() as BetInvite[];
    }
    return [...this.memory.invites.values()]
      .filter((invite) => invite.recipientEmail?.toLowerCase() === normalized)
      .filter((invite) => invite.makerUserId !== excludeUserId)
      .filter((invite) => invite.takerUserId === null)
      .filter((invite) => invite.status === 'created')
      .filter((invite) => invite.expiresAt > new Date())
      .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime());
  }

  async saveRelayerAttempt(attempt: RelayerAttempt): Promise<RelayerAttempt> {
    if (this.enabled) await this.repo(RelayerAttemptEntity).save(attempt);
    else this.memory.relayerAttempts.set(attempt.id, attempt);
    return attempt;
  }

  async findRelayerAttemptByRequestId(requestId: string, deploymentKey?: string): Promise<RelayerAttempt | undefined> {
    if (this.enabled) {
      const query = this.repo(RelayerAttemptEntity)
        .createQueryBuilder('attempt')
        .where('attempt.requestId = :requestId', { requestId });
      if (deploymentKey) query.andWhere('attempt.deploymentKey = :deploymentKey', { deploymentKey });
      return await query.orderBy('attempt.createdAt', 'DESC').getOne() as RelayerAttempt | null ?? undefined;
    }
    return [...this.memory.relayerAttempts.values()]
      .filter((attempt) => attempt.requestId === requestId)
      .filter((attempt) => !deploymentKey || attempt.deploymentKey === deploymentKey)
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())[0];
  }

  async findLatestRelayerAttemptForInviteAction(inviteId: string, action: RelayerAttempt['action'], deploymentKey: string): Promise<RelayerAttempt | undefined> {
    if (this.enabled) {
      return await this.repo(RelayerAttemptEntity)
        .createQueryBuilder('attempt')
        .where('attempt.deploymentKey = :deploymentKey', { deploymentKey })
        .andWhere('attempt.inviteId = :inviteId', { inviteId })
        .andWhere('attempt.action = :action', { action })
        .orderBy('attempt.createdAt', 'DESC')
        .getOne() as RelayerAttempt | null ?? undefined;
    }
    return [...this.memory.relayerAttempts.values()]
      .filter((attempt) => attempt.deploymentKey === deploymentKey)
      .filter((attempt) => attempt.inviteId === inviteId)
      .filter((attempt) => attempt.action === action)
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())[0];
  }

  async findRelayerAttemptByTransactionHash(transactionHash: string, deploymentKey: string): Promise<RelayerAttempt | undefined> {
    if (this.enabled) {
      return await this.repo(RelayerAttemptEntity).findOneBy({ transactionHash, deploymentKey }) as RelayerAttempt | null ?? undefined;
    }
    return [...this.memory.relayerAttempts.values()]
      .find((attempt) => attempt.deploymentKey === deploymentKey && attempt.transactionHash?.toLowerCase() === transactionHash.toLowerCase());
  }

  async findRelayerAttemptsByStatus(action: RelayerAttempt['action'], status: RelayerAttempt['status'], deploymentKey: string, limit: number): Promise<RelayerAttempt[]> {
    if (this.enabled) {
      return await this.repo(RelayerAttemptEntity)
        .createQueryBuilder('attempt')
        .where('attempt.deploymentKey = :deploymentKey', { deploymentKey })
        .andWhere('attempt.action = :action', { action })
        .andWhere('attempt.status = :status', { status })
        .orderBy('attempt.createdAt', 'ASC')
        .limit(limit)
        .getMany() as RelayerAttempt[];
    }
    return [...this.memory.relayerAttempts.values()]
      .filter((attempt) => attempt.deploymentKey === deploymentKey && attempt.action === action && attempt.status === status)
      .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime())
      .slice(0, limit);
  }

  async claimRelayerAttemptsForProcessing(
    action: RelayerAttempt['action'],
    deploymentKey: string,
    limit: number,
    staleBefore: Date,
  ): Promise<RelayerAttempt[]> {
    const now = new Date();
    if (this.enabled) {
      return await this.dataSource!.transaction(async (manager) => {
        const result = await manager.query(
          `
            with claimed as (
              select id
              from relayer_attempts
              where deployment_key = $1
                and action = $2
                and (
                  status = 'submitted'
                  or (status = 'processing' and locked_at is not null and locked_at < $3)
                )
              order by created_at asc
              for update skip locked
              limit $4
            )
            update relayer_attempts
            set status = 'processing', locked_at = $5
            where id in (select id from claimed)
            returning
              id,
              request_id as "requestId",
              deployment_key as "deploymentKey",
              invite_id as "inviteId",
              action,
              status,
              transaction_hash as "transactionHash",
              bet_id as "betId",
              error,
              payload,
              created_at as "createdAt",
              locked_at as "lockedAt"
          `,
          [deploymentKey, action, staleBefore, limit, now],
        ) as unknown;
        const rows = normalizeQueryRows(result) as Array<Omit<RelayerAttempt, 'createdAt' | 'lockedAt'> & {
          createdAt: Date | string;
          lockedAt: Date | string | null;
        }>;
        return rows
          .map((row) => ({
            ...row,
            createdAt: row.createdAt instanceof Date ? row.createdAt : new Date(row.createdAt),
            lockedAt: row.lockedAt === null || row.lockedAt instanceof Date ? row.lockedAt : new Date(row.lockedAt),
          }))
          .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime());
      });
    }

    const attempts = [...this.memory.relayerAttempts.values()]
      .filter((attempt) => attempt.deploymentKey === deploymentKey && attempt.action === action)
      .filter((attempt) => attempt.status === 'submitted' || (attempt.status === 'processing' && Boolean(attempt.lockedAt) && attempt.lockedAt! < staleBefore))
      .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime())
      .slice(0, limit);
    for (const attempt of attempts) {
      attempt.status = 'processing';
      attempt.lockedAt = now;
      this.memory.relayerAttempts.set(attempt.id, attempt);
    }
    return attempts;
  }

  async saveIndexedEvent(event: IndexedChainEvent): Promise<IndexedChainEvent> {
    if (this.enabled) await this.repo(IndexedChainEventEntity).upsert(event as never, ['deploymentKey', 'transactionHash', 'logIndex']);
    else this.memory.indexedEvents.set(`${event.deploymentKey}:${event.transactionHash}:${event.logIndex}`, event);
    return event;
  }

  async saveIndexedBet(bet: IndexedBet): Promise<IndexedBet> {
    if (this.enabled) await this.repo(IndexedBetEntity).save(bet);
    else this.memory.indexedBets.set(`${bet.deploymentKey}:${bet.betId}`, bet);
    return bet;
  }

  async findIndexedBet(betId: string, deploymentKey: string): Promise<IndexedBet | undefined> {
    if (this.enabled) return await this.repo(IndexedBetEntity).findOneBy({ betId, deploymentKey }) as IndexedBet | null ?? undefined;
    return this.memory.indexedBets.get(`${deploymentKey}:${betId}`);
  }

  async findIndexedBetByInviteId(inviteId: string, deploymentKey: string): Promise<IndexedBet | undefined> {
    if (this.enabled) return await this.repo(IndexedBetEntity).findOneBy({ inviteId, deploymentKey }) as IndexedBet | null ?? undefined;
    return [...this.memory.indexedBets.values()].find((bet) => bet.inviteId === inviteId && bet.deploymentKey === deploymentKey);
  }

  async findIndexedBetsByStatus(status: IndexedBet['status'], limit: number, deploymentKey: string): Promise<IndexedBet[]> {
    if (this.enabled) {
      return await this.repo(IndexedBetEntity)
        .createQueryBuilder('bet')
        .where('bet.deploymentKey = :deploymentKey', { deploymentKey })
        .andWhere('bet.status = :status', { status })
        .orderBy('bet.updatedAt', 'ASC')
        .limit(limit)
        .getMany() as IndexedBet[];
    }
    return [...this.memory.indexedBets.values()]
      .filter((bet) => bet.deploymentKey === deploymentKey && bet.status === status)
      .sort((left, right) => left.updatedAt.getTime() - right.updatedAt.getTime())
      .slice(0, limit);
  }

  async saveCursor(cursor: IndexerCursor): Promise<IndexerCursor> {
    if (this.enabled) await this.repo(IndexerCursorEntity).save(cursor);
    else this.memory.cursors.set(cursor.id, cursor);
    return cursor;
  }

  async findCursor(id: string, deploymentKey?: string): Promise<IndexerCursor | undefined> {
    if (this.enabled) {
      const where = deploymentKey ? { id, deploymentKey } : { id };
      return await this.repo(IndexerCursorEntity).findOneBy(where) as IndexerCursor | null ?? undefined;
    }
    return this.memory.cursors.get(id);
  }

  async saveResolutionAttempt(attempt: ResolutionAttempt): Promise<ResolutionAttempt> {
    if (this.enabled) await this.repo(ResolutionAttemptEntity).save(attempt);
    else this.memory.resolutionAttempts.set(attempt.id, attempt);
    return attempt;
  }

  async findResolutionAttempt(id: string): Promise<ResolutionAttempt | undefined> {
    if (this.enabled) return await this.repo(ResolutionAttemptEntity).findOneBy({ id }) as ResolutionAttempt | null ?? undefined;
    return this.memory.resolutionAttempts.get(id);
  }

  async findLatestResolutionAttemptForBet(betId: string, deploymentKey: string): Promise<ResolutionAttempt | undefined> {
    if (this.enabled) {
      return await this.repo(ResolutionAttemptEntity)
        .createQueryBuilder('attempt')
        .where('attempt.deploymentKey = :deploymentKey', { deploymentKey })
        .andWhere('attempt.betId = :betId', { betId })
        .orderBy('attempt.createdAt', 'DESC')
        .getOne() as ResolutionAttempt | null ?? undefined;
    }
    return [...this.memory.resolutionAttempts.values()]
      .filter((attempt) => attempt.deploymentKey === deploymentKey && attempt.betId === betId)
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())[0];
  }

  private repo<Entity extends object>(target: EntityTarget<Entity>) {
    if (!this.dataSource?.isInitialized) throw new Error('Orchestration repository database is not initialized');
    return this.dataSource.getRepository(target);
  }
}

function normalizeQueryRows(result: unknown): unknown[] {
  if (!Array.isArray(result)) return [];
  if (Array.isArray(result[0])) return result[0] as unknown[];
  return result;
}
