import type { FastifyReply } from 'fastify';
import type { Hex } from 'viem';
import { httpError } from '../../modules/orchestration/services.js';
import {
  bigintField,
  objectBody,
  publicWallet,
  stringField,
  wrap,
} from './helpers.js';
import type { AuthedRequest, OrchestrationControllerContext } from './orchestration-controller.context.js';

export class WalletsController {
  constructor(private readonly context: OrchestrationControllerContext) {}

  createChallenge = async (request: AuthedRequest, reply: FastifyReply) => wrap(reply, async () => {
    const user = request.user!;
    const body = objectBody(request.body);
    const challenge = await this.context.wallets.createChallenge(user, stringField(body, 'address'));
    return {
      id: challenge.id,
      address: challenge.address,
      chainId: challenge.chainId,
      message: challenge.message,
      expiresAt: challenge.expiresAt.toISOString(),
    };
  });

  link = async (request: AuthedRequest, reply: FastifyReply) => wrap(reply, async () => {
    const user = request.user!;
    const body = objectBody(request.body);
    const wallet = await this.context.wallets.link(user, stringField(body, 'challengeId'), stringField(body, 'signature') as Hex);
    return { wallet: publicWallet(wallet) };
  });

  me = async (request: AuthedRequest, reply: FastifyReply) => wrap(reply, async () => {
    const user = request.user!;
    const wallet = await this.context.wallets.activeWallet(user);
    if (!wallet) throw httpError(404, 'WALLET_NOT_LINKED');
    return { wallet: publicWallet(wallet) };
  });

  brl1 = async (request: AuthedRequest, reply: FastifyReply) => wrap(reply, async () => {
    const user = request.user!;
    return await this.context.brl1.balanceForUser(user);
  });

  fundingReadiness = async (request: AuthedRequest, reply: FastifyReply) => wrap(reply, async () => {
    const user = request.user!;
    const body = objectBody(request.body);
    return await this.context.brl1.readiness(user, bigintField(body, 'stake'), bigintField(body, 'loserFee'));
  });
}
