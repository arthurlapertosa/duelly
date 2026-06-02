import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Hex } from 'viem';
import {
  contractReceiptLink,
  emptyBetReceiptLinks,
  transactionReceiptLink,
  type BetReceiptLinks,
} from '../../modules/orchestration/explorer.js';
import type { IndexedBet } from '../../modules/orchestration/domain.js';
import { httpError } from '../../modules/orchestration/services.js';
import {
  findTemplate,
  objectBody,
  publicInvite,
  stringField,
  wrap,
} from './helpers.js';
import type { AuthedRequest, OrchestrationControllerContext } from './orchestration-controller.context.js';

export class BetsController {
  constructor(private readonly context: OrchestrationControllerContext) {}

  mine = async (request: AuthedRequest, reply: FastifyReply) => wrap(reply, async () => {
    const user = request.user!;
    const deploymentKey = this.context.chain.deploymentKey();
    const invites = await this.context.repository.findInvitesByUserId(user.id, deploymentKey);
    const bets = await Promise.all(invites.map(async (invite) => {
      const [template, bet] = await Promise.all([
        findTemplate(this.context, invite.templateHash, {}),
        invite.betId
          ? this.context.repository.findIndexedBet(invite.betId, deploymentKey)
          : this.context.repository.findIndexedBetByInviteId(invite.id, deploymentKey),
      ]);
      const publicBet = bet ? await this.publicBet(bet) : null;
      return {
        role: invite.makerUserId === user.id ? 'maker' : 'taker',
        invite: publicInvite(invite, user),
        template: template ?? null,
        requiredFundingRaw: (BigInt(invite.stake) + BigInt(invite.loserFee)).toString(),
        bet: publicBet,
      };
    }));
    return { bets };
  });

  get = async (request: FastifyRequest, reply: FastifyReply) => wrap(reply, async () => {
    const params = objectBody(request.params);
    const bet = await this.context.repository.findIndexedBet(stringField(params, 'betId'), this.context.chain.deploymentKey());
    if (!bet) throw httpError(404, 'BET_NOT_FOUND');
    return { bet: await this.publicBet(bet) };
  });

  getByInvite = async (request: FastifyRequest, reply: FastifyReply) => wrap(reply, async () => {
    const params = objectBody(request.params);
    const bet = await this.context.repository.findIndexedBetByInviteId(stringField(params, 'inviteId'), this.context.chain.deploymentKey());
    if (!bet) throw httpError(404, 'BET_NOT_FOUND');
    return { bet: await this.publicBet(bet) };
  });

  private async publicBet(bet: IndexedBet) {
    return {
      ...bet,
      receipts: await this.receiptsForBet(bet),
    };
  }

  private async receiptsForBet(bet: IndexedBet): Promise<BetReceiptLinks> {
    const baseUrl = this.context.config.chain.explorerBaseUrl;
    if (!baseUrl) return emptyBetReceiptLinks();

    const contract = this.context.config.chain.escrowAddress
      ? contractReceiptLink(baseUrl, this.context.config.chain.escrowAddress)
      : null;
    const settlement = isTerminalBetStatus(bet.status)
      ? transactionReceiptLink(baseUrl, bet.sourceTransactionHash, bet.sourceBlockNumber)
      : null;

    let funding: BetReceiptLinks['funding'] = null;
    if (bet.inviteId) {
      const attempt = await this.context.repository.findLatestRelayerAttemptForInviteAction(
        bet.inviteId,
        'acceptBetWithPermits',
        bet.deploymentKey,
      );
      if (attempt?.status === 'succeeded' && attempt.transactionHash) {
        funding = transactionReceiptLink(
          baseUrl,
          attempt.transactionHash,
          await this.blockNumberForTransaction(attempt.transactionHash, bet),
        );
      }
    }

    if (!funding && !isTerminalBetStatus(bet.status)) {
      funding = transactionReceiptLink(baseUrl, bet.sourceTransactionHash, bet.sourceBlockNumber);
    }

    return { funding, settlement, contract };
  }

  private async blockNumberForTransaction(transactionHash: Hex, bet: IndexedBet): Promise<string | null> {
    if (transactionHash.toLowerCase() === bet.sourceTransactionHash.toLowerCase() && !isTerminalBetStatus(bet.status)) {
      return bet.sourceBlockNumber;
    }
    const event = await this.context.repository.findIndexedEventByTransactionHash(
      transactionHash,
      bet.deploymentKey,
      'BetFunded',
    );
    return event?.blockNumber ?? null;
  }
}

function isTerminalBetStatus(status: IndexedBet['status']): boolean {
  return status === 'Resolved' || status === 'Voided' || status === 'Expired';
}
