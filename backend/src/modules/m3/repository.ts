import type { DataSource, EntityTarget } from 'typeorm';
import type {
  M3IndexedBet,
  M3IndexedEvent,
  M3IndexerCursor,
  M3Invite,
  M3RelayerAttempt,
  M3ResolutionAttempt,
  M3Session,
  M3User,
  M3Wallet,
  M3WalletChallenge,
} from './domain.js';
import {
  M3IndexedBetEntity,
  M3IndexedEventEntity,
  M3IndexerCursorEntity,
  M3InviteEntity,
  M3RelayerAttemptEntity,
  M3ResolutionAttemptEntity,
  M3SessionEntity,
  M3UserEntity,
  M3WalletChallengeEntity,
  M3WalletEntity,
} from './persistence/entities.js';

export class M3Repository {
  private readonly memory = {
    users: new Map<string, M3User>(),
    sessions: new Map<string, M3Session>(),
    walletChallenges: new Map<string, M3WalletChallenge>(),
    wallets: new Map<string, M3Wallet>(),
    invites: new Map<string, M3Invite>(),
    relayerAttempts: new Map<string, M3RelayerAttempt>(),
    indexedEvents: new Map<string, M3IndexedEvent>(),
    indexedBets: new Map<string, M3IndexedBet>(),
    cursors: new Map<string, M3IndexerCursor>(),
    resolutionAttempts: new Map<string, M3ResolutionAttempt>(),
  };

  constructor(private readonly dataSource?: DataSource) {}

  get enabled(): boolean {
    return Boolean(this.dataSource?.isInitialized);
  }

  async saveUser(user: M3User): Promise<M3User> {
    if (this.enabled) await this.repo(M3UserEntity).save(user);
    else this.memory.users.set(user.id, user);
    return user;
  }

  async findUserByEmail(email: string): Promise<M3User | undefined> {
    if (this.enabled) return await this.repo(M3UserEntity).findOneBy({ email: email.toLowerCase() }) ?? undefined;
    return [...this.memory.users.values()].find((user) => user.email === email.toLowerCase());
  }

  async findUserById(id: string): Promise<M3User | undefined> {
    if (this.enabled) return await this.repo(M3UserEntity).findOneBy({ id }) ?? undefined;
    return this.memory.users.get(id);
  }

  async saveSession(session: M3Session): Promise<M3Session> {
    if (this.enabled) await this.repo(M3SessionEntity).save(session);
    else this.memory.sessions.set(session.id, session);
    return session;
  }

  async findSessionByTokenHash(tokenHash: string): Promise<M3Session | undefined> {
    if (this.enabled) return await this.repo(M3SessionEntity).findOneBy({ tokenHash }) ?? undefined;
    return [...this.memory.sessions.values()].find((session) => session.tokenHash === tokenHash);
  }

  async revokeSession(session: M3Session): Promise<void> {
    session.revokedAt = new Date();
    await this.saveSession(session);
  }

  async saveWalletChallenge(challenge: M3WalletChallenge): Promise<M3WalletChallenge> {
    if (this.enabled) await this.repo(M3WalletChallengeEntity).save(challenge);
    else this.memory.walletChallenges.set(challenge.id, challenge);
    return challenge;
  }

  async findWalletChallenge(id: string): Promise<M3WalletChallenge | undefined> {
    if (this.enabled) return await this.repo(M3WalletChallengeEntity).findOneBy({ id }) as M3WalletChallenge | null ?? undefined;
    return this.memory.walletChallenges.get(id);
  }

  async saveWallet(wallet: M3Wallet): Promise<M3Wallet> {
    if (this.enabled) await this.repo(M3WalletEntity).save(wallet);
    else this.memory.wallets.set(wallet.id, wallet);
    return wallet;
  }

  async findActiveWalletByUserId(userId: string): Promise<M3Wallet | undefined> {
    if (this.enabled) {
      return await this.repo(M3WalletEntity).findOneBy({ userId, active: true }) as M3Wallet | null ?? undefined;
    }
    return [...this.memory.wallets.values()].find((wallet) => wallet.userId === userId && wallet.active);
  }

  async findActiveWalletByAddress(address: string): Promise<M3Wallet | undefined> {
    const normalized = address.toLowerCase();
    if (this.enabled) {
      return await this.repo(M3WalletEntity)
        .createQueryBuilder('wallet')
        .where('lower(wallet.address) = :address', { address: normalized })
        .andWhere('wallet.active = :active', { active: true })
        .getOne() as M3Wallet | null ?? undefined;
    }
    return [...this.memory.wallets.values()].find((wallet) => wallet.address.toLowerCase() === normalized && wallet.active);
  }

  async saveInvite(invite: M3Invite): Promise<M3Invite> {
    if (this.enabled) await this.repo(M3InviteEntity).save(invite);
    else this.memory.invites.set(invite.id, invite);
    return invite;
  }

  async findInvite(id: string): Promise<M3Invite | undefined> {
    if (this.enabled) return await this.repo(M3InviteEntity).findOneBy({ id }) as M3Invite | null ?? undefined;
    return this.memory.invites.get(id);
  }

  async findInviteByBetId(betId: string): Promise<M3Invite | undefined> {
    if (this.enabled) return await this.repo(M3InviteEntity).findOneBy({ betId }) as M3Invite | null ?? undefined;
    return [...this.memory.invites.values()].find((invite) => invite.betId === betId);
  }

  async saveRelayerAttempt(attempt: M3RelayerAttempt): Promise<M3RelayerAttempt> {
    if (this.enabled) await this.repo(M3RelayerAttemptEntity).save(attempt);
    else this.memory.relayerAttempts.set(attempt.id, attempt);
    return attempt;
  }

  async findRelayerAttemptByRequestId(requestId: string): Promise<M3RelayerAttempt | undefined> {
    if (this.enabled) return await this.repo(M3RelayerAttemptEntity).findOneBy({ requestId }) as M3RelayerAttempt | null ?? undefined;
    return [...this.memory.relayerAttempts.values()].find((attempt) => attempt.requestId === requestId);
  }

  async saveIndexedEvent(event: M3IndexedEvent): Promise<M3IndexedEvent> {
    if (this.enabled) await this.repo(M3IndexedEventEntity).upsert(event as never, ['transactionHash', 'logIndex']);
    else this.memory.indexedEvents.set(`${event.transactionHash}:${event.logIndex}`, event);
    return event;
  }

  async saveIndexedBet(bet: M3IndexedBet): Promise<M3IndexedBet> {
    if (this.enabled) await this.repo(M3IndexedBetEntity).save(bet);
    else this.memory.indexedBets.set(bet.betId, bet);
    return bet;
  }

  async findIndexedBet(betId: string): Promise<M3IndexedBet | undefined> {
    if (this.enabled) return await this.repo(M3IndexedBetEntity).findOneBy({ betId }) as M3IndexedBet | null ?? undefined;
    return this.memory.indexedBets.get(betId);
  }

  async findIndexedBetByInviteId(inviteId: string): Promise<M3IndexedBet | undefined> {
    if (this.enabled) return await this.repo(M3IndexedBetEntity).findOneBy({ inviteId }) as M3IndexedBet | null ?? undefined;
    return [...this.memory.indexedBets.values()].find((bet) => bet.inviteId === inviteId);
  }

  async saveCursor(cursor: M3IndexerCursor): Promise<M3IndexerCursor> {
    if (this.enabled) await this.repo(M3IndexerCursorEntity).save(cursor);
    else this.memory.cursors.set(cursor.id, cursor);
    return cursor;
  }

  async findCursor(id: string): Promise<M3IndexerCursor | undefined> {
    if (this.enabled) return await this.repo(M3IndexerCursorEntity).findOneBy({ id }) as M3IndexerCursor | null ?? undefined;
    return this.memory.cursors.get(id);
  }

  async saveResolutionAttempt(attempt: M3ResolutionAttempt): Promise<M3ResolutionAttempt> {
    if (this.enabled) await this.repo(M3ResolutionAttemptEntity).save(attempt);
    else this.memory.resolutionAttempts.set(attempt.id, attempt);
    return attempt;
  }

  async findResolutionAttempt(id: string): Promise<M3ResolutionAttempt | undefined> {
    if (this.enabled) return await this.repo(M3ResolutionAttemptEntity).findOneBy({ id }) as M3ResolutionAttempt | null ?? undefined;
    return this.memory.resolutionAttempts.get(id);
  }

  private repo<Entity extends object>(target: EntityTarget<Entity>) {
    if (!this.dataSource?.isInitialized) throw new Error('M3 repository database is not initialized');
    return this.dataSource.getRepository(target);
  }
}
