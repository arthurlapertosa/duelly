import type { FastifyReply, FastifyRequest } from 'fastify';
import { httpError } from '../../modules/orchestration/services.js';
import {
  objectBody,
  stringField,
  wrap,
} from './helpers.js';
import type { OrchestrationControllerContext } from './orchestration-controller.context.js';

export class BetsController {
  constructor(private readonly context: OrchestrationControllerContext) {}

  get = async (request: FastifyRequest, reply: FastifyReply) => wrap(reply, async () => {
    const params = objectBody(request.params);
    const bet = await this.context.repository.findIndexedBet(stringField(params, 'betId'));
    if (!bet) throw httpError(404, 'BET_NOT_FOUND');
    return { bet };
  });

  getByInvite = async (request: FastifyRequest, reply: FastifyReply) => wrap(reply, async () => {
    const params = objectBody(request.params);
    const bet = await this.context.repository.findIndexedBetByInviteId(stringField(params, 'inviteId'));
    if (!bet) throw httpError(404, 'BET_NOT_FOUND');
    return { bet };
  });
}
