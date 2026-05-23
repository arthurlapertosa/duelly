import type { FastifyReply, FastifyRequest } from 'fastify';
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
      return {
        role: invite.makerUserId === user.id ? 'maker' : 'taker',
        invite: publicInvite(invite, user),
        template: template ?? null,
        requiredFundingRaw: (BigInt(invite.stake) + BigInt(invite.loserFee)).toString(),
        bet: bet ?? null,
      };
    }));
    return { bets };
  });

  get = async (request: FastifyRequest, reply: FastifyReply) => wrap(reply, async () => {
    const params = objectBody(request.params);
    const bet = await this.context.repository.findIndexedBet(stringField(params, 'betId'), this.context.chain.deploymentKey());
    if (!bet) throw httpError(404, 'BET_NOT_FOUND');
    return { bet };
  });

  getByInvite = async (request: FastifyRequest, reply: FastifyReply) => wrap(reply, async () => {
    const params = objectBody(request.params);
    const bet = await this.context.repository.findIndexedBetByInviteId(stringField(params, 'inviteId'), this.context.chain.deploymentKey());
    if (!bet) throw httpError(404, 'BET_NOT_FOUND');
    return { bet };
  });
}
