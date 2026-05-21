import { randomBytes, randomUUID } from 'node:crypto';
import { getAddress, recoverMessageAddress, type Hex } from 'viem';
import type { AppConfig } from '../../../config/env.js';
import type { ChainService } from '../chain.js';
import type { UserAccount } from '../domain.js';
import type { OrchestrationRepository } from '../repository.js';
import { httpError } from './errors.js';

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
