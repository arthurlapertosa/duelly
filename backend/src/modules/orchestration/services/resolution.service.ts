import { randomUUID } from 'node:crypto';
import type { Hex } from 'viem';
import { ctfAbi } from '../chain.js';
import type { ChainService } from '../chain.js';
import type { OrchestrationRepository } from '../repository.js';

export class ResolutionService {
  constructor(private readonly repository: OrchestrationRepository, private readonly chain: ChainService) {}

  async trigger(betId: string) {
    const attemptId = `resolution-${randomUUID()}`;
    const deploymentKey = this.chain.deploymentKey();
    try {
      const tx = await this.chain.writeResolveFromPolymarket(betId);
      const receipt = await this.chain.wait(tx);
      const attempt = {
        id: attemptId,
        deploymentKey,
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
        deploymentKey,
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

  async expire(betId: string) {
    const attemptId = `resolution-${randomUUID()}`;
    const deploymentKey = this.chain.deploymentKey();
    try {
      const tx = await this.chain.writeExpireUnresolvedBet(betId);
      const receipt = await this.chain.wait(tx);
      const attempt = {
        id: attemptId,
        deploymentKey,
        betId,
        status: receipt.status === 'success' ? 'expired' as const : 'failed' as const,
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
        deploymentKey,
        betId,
        status: 'failed' as const,
        transactionHash: null,
        blockNumber: null,
        error: message,
        createdAt: new Date(),
      };
      await this.repository.saveResolutionAttempt(attempt);
      return attempt;
    }
  }

  async recordPending(betId: string, error = 'ConditionUnresolved') {
    const attempt = {
      id: `resolution-${randomUUID()}`,
      deploymentKey: this.chain.deploymentKey(),
      betId,
      status: 'pending' as const,
      transactionHash: null,
      blockNumber: null,
      error,
      createdAt: new Date(),
    };
    await this.repository.saveResolutionAttempt(attempt);
    return attempt;
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
