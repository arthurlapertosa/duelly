import { createHash, randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import {
  decodeEventLog,
  getAddress,
  hexToNumber,
  parseAbiItem,
  recoverMessageAddress,
  verifyTypedData,
  type Address,
  type Hex,
} from 'viem';
import type { AppConfig } from '../../config/env.js';
import type { CanonicalSportsTemplate } from '../templates/domain/types.js';
import { ChainService, betAcceptanceTypes, betOfferTypes, brl1Abi, ctfAbi, escrowAbi, type BetAcceptanceMessage, type BetOfferMessage, type PermitData } from './chain.js';
import type { IndexedBet, BetInvite, UserAccount } from './domain.js';
import { OrchestrationRepository } from './repository.js';

const scrypt = promisify(scryptCallback);
const SESSION_BYTES = 32;
const ZERO_ADDRESS: Address = '0x0000000000000000000000000000000000000000';
const DEFAULT_LOG_RANGE = 9n;
const INDEXER_RESCAN_DEPTH = 9n;

export interface AuthenticatedUser {
  user: UserAccount;
  token?: string;
}

export class AuthService {
  constructor(private readonly repository: OrchestrationRepository, private readonly config: AppConfig) {}

  async register(email: string, password: string): Promise<AuthenticatedUser> {
    const normalized = normalizeEmail(email);
    if (password.length < 8) throw httpError(400, 'PASSWORD_TOO_SHORT');
    if (await this.repository.findUserByEmail(normalized)) throw httpError(409, 'EMAIL_ALREADY_REGISTERED');
    const now = new Date();
    const user: UserAccount = {
      id: `user-${randomUUID()}`,
      email: normalized,
      displayIdentifier: normalized,
      passwordHash: await hashPassword(password),
      createdAt: now,
      updatedAt: now,
    };
    await this.repository.saveUser(user);
    return await this.createSession(user);
  }

  async login(email: string, password: string): Promise<AuthenticatedUser> {
    const user = await this.repository.findUserByEmail(normalizeEmail(email));
    if (!user || !(await verifyPassword(password, user.passwordHash))) throw httpError(401, 'INVALID_CREDENTIALS');
    return await this.createSession(user);
  }

  async authenticate(header?: string): Promise<AuthenticatedUser | undefined> {
    if (!header?.startsWith('Bearer ')) return undefined;
    const token = header.slice('Bearer '.length).trim();
    if (this.config.auth.mockAuthEnabled && token.startsWith('mock:')) {
      const email = normalizeEmail(token.slice('mock:'.length) || 'mock@example.test');
      let user = await this.repository.findUserByEmail(email);
      if (!user) {
        const now = new Date();
        user = {
          id: `user-${hashToken(email).slice(0, 12)}`,
          email,
          displayIdentifier: email,
          passwordHash: 'mock',
          createdAt: now,
          updatedAt: now,
        };
        await this.repository.saveUser(user);
      }
      return { user, token };
    }
    const session = await this.repository.findSessionByTokenHash(hashToken(token));
    if (!session || session.revokedAt || session.expiresAt <= new Date()) return undefined;
    const user = await this.repository.findUserById(session.userId);
    return user ? { user, token } : undefined;
  }

  async logout(token?: string): Promise<void> {
    if (!token) return;
    const session = await this.repository.findSessionByTokenHash(hashToken(token));
    if (session) await this.repository.revokeSession(session);
  }

  private async createSession(user: UserAccount): Promise<AuthenticatedUser> {
    const token = randomBytes(SESSION_BYTES).toString('base64url');
    const now = new Date();
    await this.repository.saveSession({
      id: `session-${randomUUID()}`,
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(now.getTime() + this.config.auth.sessionTtlSeconds * 1000),
      createdAt: now,
      revokedAt: null,
    });
    return { user, token };
  }
}

export class WalletService {
  constructor(private readonly repository: OrchestrationRepository, private readonly config: AppConfig, private readonly chain: ChainService) {}

  async createChallenge(user: UserAccount, addressInput: string) {
    const address = this.chain.normalizeAddress(addressInput);
    const nonce = randomBytes(16).toString('hex');
    const now = new Date();
    const message = [
      'Duelly wallet ownership verification',
      `User: ${user.id}`,
      `Wallet: ${address}`,
      `Chain ID: ${this.config.chain.chainId}`,
      `Nonce: ${nonce}`,
      'Sign this message to link your wallet. Duelly will never ask for your private key.',
    ].join('\n');
    const challenge = {
      id: `challenge-${randomUUID()}`,
      userId: user.id,
      address,
      chainId: this.config.chain.chainId,
      nonce,
      message,
      expiresAt: new Date(now.getTime() + this.config.auth.walletChallengeTtlSeconds * 1000),
      createdAt: now,
      usedAt: null,
    };
    await this.repository.saveWalletChallenge(challenge);
    return challenge;
  }

  async link(user: UserAccount, challengeId: string, signature: Hex) {
    const challenge = await this.repository.findWalletChallenge(challengeId);
    if (!challenge || challenge.userId !== user.id) throw httpError(404, 'WALLET_CHALLENGE_NOT_FOUND');
    if (challenge.usedAt) throw httpError(400, 'WALLET_CHALLENGE_REPLAYED');
    if (challenge.expiresAt <= new Date()) throw httpError(400, 'WALLET_CHALLENGE_EXPIRED');
    const recovered = getAddress(await recoverMessageAddress({ message: challenge.message, signature }));
    if (recovered !== challenge.address) throw httpError(400, 'WALLET_SIGNATURE_MISMATCH');
    const existing = await this.repository.findActiveWalletByAddress(challenge.address);
    if (existing && existing.userId !== user.id) throw httpError(409, 'WALLET_ALREADY_LINKED');
    const now = new Date();
    challenge.usedAt = now;
    await this.repository.saveWalletChallenge(challenge);
    if (existing) return existing;
    const wallet = {
      id: `wallet-${randomUUID()}`,
      userId: user.id,
      address: challenge.address,
      chainId: challenge.chainId,
      active: true,
      verifiedAt: now,
      createdAt: now,
    };
    await this.repository.saveWallet(wallet);
    return wallet;
  }

  async activeWallet(user: UserAccount) {
    return await this.repository.findActiveWalletByUserId(user.id);
  }
}

export class Brl1Service {
  constructor(private readonly repository: OrchestrationRepository, private readonly chain: ChainService) {}

  async balanceForUser(user: UserAccount) {
    const wallet = await this.repository.findActiveWalletByUserId(user.id);
    if (!wallet) throw httpError(404, 'WALLET_NOT_LINKED');
    const balance = await this.chain.readBrl1(wallet.address);
    return {
      wallet: wallet.address,
      token: this.chain.config.chain.brl1Address,
      symbol: balance.symbol,
      decimals: balance.decimals,
      balanceRaw: balance.balance.toString(),
      allowanceRaw: balance.allowance.toString(),
      permitNonce: balance.nonce.toString(),
      spender: balance.spender,
      domainSeparator: balance.domainSeparator,
    };
  }

  async readiness(user: UserAccount, stake: bigint, loserFee: bigint) {
    const data = await this.balanceForUser(user);
    const required = stake + loserFee;
    const available = BigInt(data.balanceRaw);
    return {
      ...data,
      stakeRaw: stake.toString(),
      loserFeeRaw: loserFee.toString(),
      requiredAmountRaw: required.toString(),
      availableAmountRaw: available.toString(),
      missingAmountRaw: available >= required ? '0' : (required - available).toString(),
      canAttemptBet: available >= required,
      permit: {
        owner: data.wallet,
        spender: data.spender,
        valueRaw: required.toString(),
        nonce: data.permitNonce,
      },
    };
  }
}

export class FeeService {
  constructor(private readonly chain: ChainService) {}

  async quote(stake: bigint, loserFeeBps: number) {
    if (stake <= 0n) throw httpError(400, 'INVALID_STAKE');
    if (!Number.isInteger(loserFeeBps) || loserFeeBps < 0 || loserFeeBps > 10_000) throw httpError(400, 'INVALID_LOSER_FEE_BPS');
    const percentFee = stake * BigInt(loserFeeBps) / 10_000n;
    const chainMinimum = await this.chain.minLoserFee();
    const configuredMinimum = this.chain.config.chain.gasEstimateWei * BigInt(this.chain.config.chain.gasMultiplier);
    const gasAnchoredMinimum = chainMinimum > configuredMinimum ? chainMinimum : configuredMinimum;
    const selectedLoserFee = percentFee > gasAnchoredMinimum ? percentFee : gasAnchoredMinimum;
    return {
      stakeRaw: stake.toString(),
      loserFeeBps,
      percentFeeRaw: percentFee.toString(),
      gasAnchoredMinimumRaw: gasAnchoredMinimum.toString(),
      selectedLoserFeeRaw: selectedLoserFee.toString(),
      totalRequiredAmountRaw: (stake + selectedLoserFee).toString(),
      explanation: 'The service fee is selected from the percentage fee and the configured minimum required for settlement.',
    };
  }
}

export class InviteService {
  constructor(private readonly repository: OrchestrationRepository, private readonly walletService: WalletService, private readonly chain: ChainService) {}

  async create(user: UserAccount, template: CanonicalSportsTemplate, stake: bigint, loserFee: bigint, makerOutcomeIndex: number, taker?: string) {
    const wallet = await this.walletService.activeWallet(user);
    if (!wallet) throw httpError(404, 'WALLET_NOT_LINKED');
    if (![template.outcomeA.providerOutcomeIndex, template.outcomeB.providerOutcomeIndex].includes(makerOutcomeIndex)) {
      throw httpError(400, 'INVALID_MAKER_OUTCOME');
    }
    const takerAddress = taker ? this.chain.normalizeAddress(taker) : ZERO_ADDRESS;
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 60 * 60);
    const nonce = BigInt(Date.now()) * 1000n + BigInt(Math.floor(Math.random() * 1000));
    const offer: BetOfferMessage = {
      maker: wallet.address,
      taker: takerAddress,
      templateHash: template.templateHash as Hex,
      conditionId: template.conditionId as Hex,
      makerOutcomeIndex,
      stake,
      loserFee,
      nonce,
      deadline,
    };
    const offerHash = this.chain.hashOffer(offer);
    const now = new Date();
    const invite: BetInvite = {
      id: `invite-${randomUUID()}`,
      makerUserId: user.id,
      takerUserId: null,
      templateHash: offer.templateHash,
      conditionId: offer.conditionId,
      makerAddress: wallet.address,
      takerAddress: null,
      makerOutcomeIndex,
      takerOutcomeIndex: null,
      stake: stake.toString(),
      loserFee: loserFee.toString(),
      offerNonce: nonce.toString(),
      acceptanceNonce: null,
      offerHash,
      offerPayload: this.payload('BetOffer', offer),
      acceptancePayload: null,
      status: 'created',
      betId: null,
      expiresAt: new Date(Number(deadline) * 1000),
      createdAt: now,
      updatedAt: now,
    };
    await this.repository.saveInvite(invite);
    return invite;
  }

  async accept(user: UserAccount, inviteId: string, takerOutcomeIndex: number) {
    const invite = await this.repository.findInvite(inviteId);
    if (!invite) throw httpError(404, 'INVITE_NOT_FOUND');
    if (invite.expiresAt <= new Date()) throw httpError(400, 'INVITE_EXPIRED');
    if (invite.status !== 'created') throw httpError(400, 'INVITE_NOT_OPEN');
    const wallet = await this.walletService.activeWallet(user);
    if (!wallet) throw httpError(404, 'WALLET_NOT_LINKED');
    if (wallet.address === invite.makerAddress) throw httpError(400, 'MAKER_CANNOT_ACCEPT_OWN_INVITE');
    const signedOffer = inviteToOffer(invite);
    if (signedOffer.taker !== ZERO_ADDRESS && signedOffer.taker !== wallet.address) throw httpError(403, 'UNAUTHORIZED_TAKER');
    if (takerOutcomeIndex === invite.makerOutcomeIndex) throw httpError(400, 'TAKER_OUTCOME_MUST_DIFFER');
    const deadline = BigInt(Math.floor(invite.expiresAt.getTime() / 1000));
    const nonce = BigInt(Date.now()) * 1000n + BigInt(Math.floor(Math.random() * 1000));
    const acceptance: BetAcceptanceMessage = {
      taker: wallet.address,
      offerHash: invite.offerHash,
      takerOutcomeIndex,
      nonce,
      deadline,
    };
    invite.takerUserId = user.id;
    invite.takerAddress = wallet.address;
    invite.takerOutcomeIndex = takerOutcomeIndex;
    invite.acceptanceNonce = nonce.toString();
    invite.acceptancePayload = this.payload('BetAcceptance', acceptance);
    invite.status = 'accepted';
    invite.updatedAt = new Date();
    await this.repository.saveInvite(invite);
    return invite;
  }

  payload(primaryType: 'BetOffer' | 'BetAcceptance', message: BetOfferMessage | BetAcceptanceMessage) {
    return {
      domain: this.chain.domain(),
      types: primaryType === 'BetOffer' ? betOfferTypes : betAcceptanceTypes,
      primaryType,
      message: stringifyBigints(message),
    };
  }
}

export class RelayerService {
  constructor(private readonly repository: OrchestrationRepository, private readonly chain: ChainService) {}

  async fund(input: {
    inviteId: string;
    makerSignature: Hex;
    takerSignature: Hex;
    makerPermit: PermitData;
    takerPermit: PermitData;
  }) {
    const invite = await this.repository.findInvite(input.inviteId);
    if (!invite) throw httpError(404, 'INVITE_NOT_FOUND');
    if (invite.status !== 'accepted' || !invite.takerAddress || invite.takerOutcomeIndex === null || !invite.acceptancePayload) {
      throw httpError(400, 'INVITE_NOT_READY_FOR_FUNDING');
    }
    const requestId = `relayer-${randomUUID()}`;
    const offer = inviteToOffer(invite);
    const acceptance = inviteToAcceptance(invite);
    const makerOk = await verifyTypedData({
      address: invite.makerAddress,
      domain: this.chain.domain(),
      types: betOfferTypes,
      primaryType: 'BetOffer',
      message: offer,
      signature: input.makerSignature,
    });
    const takerOk = await verifyTypedData({
      address: invite.takerAddress,
      domain: this.chain.domain(),
      types: betAcceptanceTypes,
      primaryType: 'BetAcceptance',
      message: acceptance,
      signature: input.takerSignature,
    });
    if (!makerOk || !takerOk) {
      await this.repository.saveRelayerAttempt({
        id: `attempt-${randomUUID()}`,
        requestId,
        inviteId: invite.id,
        action: 'acceptBetWithPermits',
        status: 'rejected',
        transactionHash: null,
        betId: null,
        error: 'INVALID_SIGNATURE',
        payload: null,
        createdAt: new Date(),
      });
      throw httpError(400, 'INVALID_SIGNATURE');
    }

    const { escrowAddress } = this.chain.requireAddresses();
    const { walletClient, account } = this.chain.requireWalletClient();
    try {
      const tx = await walletClient.writeContract({
        account,
        address: escrowAddress,
        abi: escrowAbi,
        functionName: 'acceptBetWithPermits',
        args: [offer, acceptance, input.makerSignature, input.takerSignature, input.makerPermit, input.takerPermit],
        chain: null,
      });
      const receipt = await this.chain.wait(tx);
      let betId: string | null = null;
      for (const log of receipt.logs) {
        try {
          const decoded = decodeEventLog({ abi: escrowAbi, data: log.data, topics: log.topics as [Hex, ...Hex[]] });
          if (decoded.eventName === 'BetFunded') {
            betId = ((decoded.args as { betId: bigint }).betId).toString();
          }
        } catch {
          // Ignore non-escrow logs in the funding transaction.
        }
      }
      invite.status = betId ? 'funded' : 'funding_submitted';
      invite.betId = betId;
      invite.updatedAt = new Date();
      await this.repository.saveInvite(invite);
      await this.repository.saveRelayerAttempt({
        id: `attempt-${randomUUID()}`,
        requestId,
        inviteId: invite.id,
        action: 'acceptBetWithPermits',
        status: receipt.status === 'success' ? 'succeeded' : 'failed',
        transactionHash: tx,
        betId,
        error: null,
        payload: { inviteId: invite.id },
        createdAt: new Date(),
      });
      return { requestId, transactionHash: tx, status: receipt.status, betId };
    } catch (error) {
      await this.repository.saveRelayerAttempt({
        id: `attempt-${randomUUID()}`,
        requestId,
        inviteId: invite.id,
        action: 'acceptBetWithPermits',
        status: 'failed',
        transactionHash: null,
        betId: null,
        error: error instanceof Error ? error.message : String(error),
        payload: null,
        createdAt: new Date(),
      });
      throw error;
    }
  }
}

export class IndexerService {
  constructor(private readonly repository: OrchestrationRepository, private readonly chain: ChainService) {}

  async reindex(toBlock?: bigint) {
    const { escrowAddress } = this.chain.requireAddresses();
    const client = this.chain.requirePublicClient();
    const cursor = await this.repository.findCursor('escrow');
    const end = toBlock ?? await client.getBlockNumber();
    const deploymentBlock = this.chain.config.chain.deploymentBlock;
    let fromBlock = cursor ? subtractFloor(BigInt(cursor.lastBlockNumber), INDEXER_RESCAN_DEPTH, deploymentBlock) : deploymentBlock;
    if (!cursor && fromBlock === 0n && end > DEFAULT_LOG_RANGE) {
      fromBlock = end - DEFAULT_LOG_RANGE;
    }
    if (fromBlock > end) fromBlock = end;
    const events = [
      parseAbiItem('event TemplateRegistered(bytes32 indexed templateHash,bytes32 indexed conditionId,bytes32 indexed marketIdHash,bytes32 questionIdHash,uint8 outcomeAProviderIndex,uint8 outcomeBProviderIndex,uint64 bettingCloseAt,uint64 resolutionDeadline,uint16 loserFeeBps,bool active)'),
      parseAbiItem('event BetFunded(uint256 indexed betId,bytes32 indexed templateHash,bytes32 indexed conditionId,address playerA,address playerB,uint8 playerAOutcomeIndex,uint8 playerBOutcomeIndex,uint256 stake,uint256 loserFee)'),
      parseAbiItem('event BetSettled(uint256 indexed betId,address indexed winner,address indexed loser,uint8 winningOutcomeIndex,uint256 winnerPayout,uint256 treasuryPayout)'),
      parseAbiItem('event BetVoided(uint256 indexed betId,uint8 indexed status,uint256 playerARefund,uint256 playerBRefund)'),
    ];
    const logs = [];
    for (let start = fromBlock; start <= end; start += DEFAULT_LOG_RANGE + 1n) {
      const stop = start + DEFAULT_LOG_RANGE > end ? end : start + DEFAULT_LOG_RANGE;
      logs.push(...await client.getLogs({ address: escrowAddress, events, fromBlock: start, toBlock: stop }));
    }
    for (const log of logs) {
      const decoded = decodeEventLog({ abi: escrowAbi, data: log.data, topics: log.topics as [Hex, ...Hex[]] });
      await this.repository.saveIndexedEvent({
        id: `event-${log.transactionHash}-${log.logIndex}`,
        eventName: decoded.eventName,
        transactionHash: log.transactionHash,
        logIndex: log.logIndex,
        blockNumber: log.blockNumber.toString(),
        args: stringifyBigints(decoded.args),
        createdAt: new Date(),
      });
      await this.applyEvent(decoded.eventName, decoded.args as Record<string, unknown>, log.transactionHash, log.blockNumber);
    }
    await this.repository.saveCursor({ id: 'escrow', lastBlockNumber: end.toString(), updatedAt: new Date() });
    return { fromBlock: fromBlock.toString(), toBlock: end.toString(), events: logs.length };
  }

  async applyEvent(eventName: string, args: Record<string, unknown>, transactionHash: Hex, blockNumber: bigint) {
    if (eventName === 'BetFunded') {
      const betId = (args.betId as bigint).toString();
      const invite = await this.repository.findInviteByBetId(betId);
      const bet: IndexedBet = {
        betId,
        inviteId: invite?.id ?? null,
        templateHash: args.templateHash as Hex,
        conditionId: args.conditionId as Hex,
        playerA: getAddress(args.playerA as string),
        playerB: getAddress(args.playerB as string),
        playerAOutcomeIndex: Number(args.playerAOutcomeIndex),
        playerBOutcomeIndex: Number(args.playerBOutcomeIndex),
        stake: (args.stake as bigint).toString(),
        loserFee: (args.loserFee as bigint).toString(),
        status: 'Funded',
        winner: null,
        winnerPayout: null,
        treasuryPayout: null,
        sourceTransactionHash: transactionHash,
        sourceBlockNumber: blockNumber.toString(),
        updatedAt: new Date(),
      };
      await this.repository.saveIndexedBet(bet);
    } else if (eventName === 'BetSettled') {
      const betId = (args.betId as bigint).toString();
      const bet = await this.repository.findIndexedBet(betId);
      if (bet) {
        bet.status = 'Resolved';
        bet.winner = getAddress(args.winner as string);
        bet.winnerPayout = (args.winnerPayout as bigint).toString();
        bet.treasuryPayout = (args.treasuryPayout as bigint).toString();
        bet.sourceTransactionHash = transactionHash;
        bet.sourceBlockNumber = blockNumber.toString();
        bet.updatedAt = new Date();
        await this.repository.saveIndexedBet(bet);
      }
    } else if (eventName === 'BetVoided') {
      const betId = (args.betId as bigint).toString();
      const bet = await this.repository.findIndexedBet(betId);
      if (bet) {
        const status = typeof args.status === 'number' ? args.status : hexToNumber(args.status as Hex);
        bet.status = status === 4 ? 'Expired' : 'Voided';
        bet.sourceTransactionHash = transactionHash;
        bet.sourceBlockNumber = blockNumber.toString();
        bet.updatedAt = new Date();
        await this.repository.saveIndexedBet(bet);
      }
    }
  }
}

export class ResolutionService {
  constructor(private readonly repository: OrchestrationRepository, private readonly chain: ChainService) {}

  async trigger(betId: string) {
    const { escrowAddress } = this.chain.requireAddresses();
    const { walletClient, account } = this.chain.requireWalletClient();
    const attemptId = `resolution-${randomUUID()}`;
    try {
      const tx = await walletClient.writeContract({
        account,
        address: escrowAddress,
        abi: escrowAbi,
        functionName: 'resolveFromPolymarket',
        args: [BigInt(betId)],
        chain: null,
      });
      const receipt = await this.chain.wait(tx);
      const attempt = {
        id: attemptId,
        betId,
        status: receipt.status === 'success' ? 'resolved' as const : 'failed' as const,
        transactionHash: tx,
        blockNumber: receipt.blockNumber.toString(),
        error: receipt.status === 'success' ? null : 'TRANSACTION_REVERTED',
        createdAt: new Date(),
      };
      await this.repository.saveResolutionAttempt(attempt);
      return attempt;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const attempt = {
        id: attemptId,
        betId,
        status: message.includes('ConditionUnresolved') ? 'pending' as const : 'failed' as const,
        transactionHash: null,
        blockNumber: null,
        error: message,
        createdAt: new Date(),
      };
      await this.repository.saveResolutionAttempt(attempt);
      return attempt;
    }
  }

  async setMockPayout(conditionId: Hex, numerators: bigint[], denominator = 1n) {
    const { polymarketCtfAddress } = this.chain.requireAddresses();
    const { walletClient, account } = this.chain.requireWalletClient();
    return await walletClient.writeContract({
      account,
      address: polymarketCtfAddress,
      abi: ctfAbi,
      functionName: 'setPayout',
      args: [conditionId, denominator, numerators],
      chain: null,
    });
  }
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const key = await scrypt(password, salt, 64) as Buffer;
  return `scrypt:${salt}:${key.toString('hex')}`;
}

export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  const [method, salt, expectedHex] = encoded.split(':');
  if (method !== 'scrypt' || !salt || !expectedHex) return false;
  const actual = await scrypt(password, salt, 64) as Buffer;
  const expected = Buffer.from(expectedHex, 'hex');
  return expected.length === actual.length && timingSafeEqual(actual, expected);
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function normalizeEmail(email: string): string {
  const normalized = email.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalized)) throw httpError(400, 'INVALID_EMAIL');
  return normalized;
}

export function inviteToOffer(invite: BetInvite): BetOfferMessage {
  const message = typedPayloadMessage(invite.offerPayload, 'BetOffer');
  return {
    maker: addressValue(message, 'maker', invite.makerAddress),
    taker: addressValue(message, 'taker', ZERO_ADDRESS),
    templateHash: hexValue(message, 'templateHash', invite.templateHash),
    conditionId: hexValue(message, 'conditionId', invite.conditionId),
    makerOutcomeIndex: numberValue(message, 'makerOutcomeIndex', invite.makerOutcomeIndex),
    stake: bigintValue(message, 'stake', invite.stake),
    loserFee: bigintValue(message, 'loserFee', invite.loserFee),
    nonce: bigintValue(message, 'nonce', invite.offerNonce),
    deadline: bigintValue(message, 'deadline', Math.floor(invite.expiresAt.getTime() / 1000)),
  };
}

export function inviteToAcceptance(invite: BetInvite): BetAcceptanceMessage {
  if (!invite.takerAddress || invite.takerOutcomeIndex === null || !invite.acceptanceNonce) throw httpError(400, 'INVITE_NOT_ACCEPTED');
  const message = typedPayloadMessage(invite.acceptancePayload, 'BetAcceptance');
  return {
    taker: addressValue(message, 'taker', invite.takerAddress),
    offerHash: hexValue(message, 'offerHash', invite.offerHash),
    takerOutcomeIndex: numberValue(message, 'takerOutcomeIndex', invite.takerOutcomeIndex),
    nonce: bigintValue(message, 'nonce', invite.acceptanceNonce),
    deadline: bigintValue(message, 'deadline', Math.floor(invite.expiresAt.getTime() / 1000)),
  };
}

export function stringifyBigints<T>(value: T): T {
  return JSON.parse(JSON.stringify(value, (_, item) => typeof item === 'bigint' ? item.toString() : item));
}

export function httpError(statusCode: number, code: string) {
  const error = new Error(code) as Error & { statusCode: number; code: string };
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function typedPayloadMessage(value: unknown, primaryType: string): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const payload = value as Record<string, unknown>;
  if (payload.primaryType !== primaryType || !payload.message || typeof payload.message !== 'object') return undefined;
  return payload.message as Record<string, unknown>;
}

function addressValue(message: Record<string, unknown> | undefined, field: string, fallback: Address): Address {
  return getAddress(String(message?.[field] ?? fallback));
}

function hexValue(message: Record<string, unknown> | undefined, field: string, fallback: Hex): Hex {
  return String(message?.[field] ?? fallback) as Hex;
}

function numberValue(message: Record<string, unknown> | undefined, field: string, fallback: number): number {
  return Number(message?.[field] ?? fallback);
}

function bigintValue(message: Record<string, unknown> | undefined, field: string, fallback: string | number): bigint {
  return BigInt(String(message?.[field] ?? fallback));
}

function subtractFloor(value: bigint, amount: bigint, floor: bigint): bigint {
  return value > floor + amount ? value - amount : floor;
}
