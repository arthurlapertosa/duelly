import type { DataSource, EntityTarget } from 'typeorm';
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

  async saveInvite(invite: BetInvite): Promise<BetInvite> {
    if (this.enabled) await this.repo(BetInviteEntity).save(invite);
    else this.memory.invites.set(invite.id, invite);
    return invite;
  }

  async findInvite(id: string): Promise<BetInvite | undefined> {
    if (this.enabled) return await this.repo(BetInviteEntity).findOneBy({ id }) as BetInvite | null ?? undefined;
    return this.memory.invites.get(id);
  }

  async findInviteByBetId(betId: string): Promise<BetInvite | undefined> {
    if (this.enabled) return await this.repo(BetInviteEntity).findOneBy({ betId }) as BetInvite | null ?? undefined;
    return [...this.memory.invites.values()].find((invite) => invite.betId === betId);
  }

  async findInvitesByUserId(userId: string): Promise<BetInvite[]> {
    if (this.enabled) {
      return await this.repo(BetInviteEntity)
        .createQueryBuilder('invite')
        .where('invite.makerUserId = :userId', { userId })
        .orWhere('invite.takerUserId = :userId', { userId })
        .orderBy('invite.updatedAt', 'DESC')
        .getMany() as BetInvite[];
    }
    return [...this.memory.invites.values()]
      .filter((invite) => invite.makerUserId === userId || invite.takerUserId === userId)
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

  async findRelayerAttemptByRequestId(requestId: string): Promise<RelayerAttempt | undefined> {
    if (this.enabled) return await this.repo(RelayerAttemptEntity).findOneBy({ requestId }) as RelayerAttempt | null ?? undefined;
    return [...this.memory.relayerAttempts.values()].find((attempt) => attempt.requestId === requestId);
  }

  async saveIndexedEvent(event: IndexedChainEvent): Promise<IndexedChainEvent> {
    if (this.enabled) await this.repo(IndexedChainEventEntity).upsert(event as never, ['transactionHash', 'logIndex']);
    else this.memory.indexedEvents.set(`${event.transactionHash}:${event.logIndex}`, event);
    return event;
  }

  async saveIndexedBet(bet: IndexedBet): Promise<IndexedBet> {
    if (this.enabled) await this.repo(IndexedBetEntity).save(bet);
    else this.memory.indexedBets.set(bet.betId, bet);
    return bet;
  }

  async findIndexedBet(betId: string): Promise<IndexedBet | undefined> {
    if (this.enabled) return await this.repo(IndexedBetEntity).findOneBy({ betId }) as IndexedBet | null ?? undefined;
    return this.memory.indexedBets.get(betId);
  }

  async findIndexedBetByInviteId(inviteId: string): Promise<IndexedBet | undefined> {
    if (this.enabled) return await this.repo(IndexedBetEntity).findOneBy({ inviteId }) as IndexedBet | null ?? undefined;
    return [...this.memory.indexedBets.values()].find((bet) => bet.inviteId === inviteId);
  }

  async saveCursor(cursor: IndexerCursor): Promise<IndexerCursor> {
    if (this.enabled) await this.repo(IndexerCursorEntity).save(cursor);
    else this.memory.cursors.set(cursor.id, cursor);
    return cursor;
  }

  async findCursor(id: string): Promise<IndexerCursor | undefined> {
    if (this.enabled) return await this.repo(IndexerCursorEntity).findOneBy({ id }) as IndexerCursor | null ?? undefined;
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

  private repo<Entity extends object>(target: EntityTarget<Entity>) {
    if (!this.dataSource?.isInitialized) throw new Error('Orchestration repository database is not initialized');
    return this.dataSource.getRepository(target);
  }
}
