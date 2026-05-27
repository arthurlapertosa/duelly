import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Hex } from 'viem';
import { httpError } from '../../modules/orchestration/services.js';
import {
  arrayField,
  bigintField,
  objectBody,
  stringField,
  wrap,
} from './helpers.js';
import type { OrchestrationControllerContext } from './orchestration-controller.context.js';

export class ResolutionController {
  constructor(private readonly context: OrchestrationControllerContext) {}

  run = async (request: FastifyRequest, reply: FastifyReply) => wrap(reply, async () => {
    const body = objectBody(request.body);
    return { attempt: await this.context.resolution.trigger(stringField(body, 'betId')) };
  });

  mirror = async (request: FastifyRequest, reply: FastifyReply) => wrap(reply, async () => {
    if (this.context.config.nodeEnv === 'production') {
      throw httpError(403, 'PRODUCTION_FORK_ENDPOINT_DISABLED');
    }
    const body = objectBody(request.body);
    const betId = stringField(body, 'betId');
    const bet = await this.context.repository.findIndexedBet(betId, this.context.chain.deploymentKey());
    if (!bet) throw httpError(404, 'BET_NOT_FOUND');
    return { mirror: await this.context.resolutionMirror.syncBet(bet) };
  });

  mockPayout = async (request: FastifyRequest, reply: FastifyReply) => wrap(reply, async () => {
    if (this.context.config.nodeEnv === 'production') {
      throw httpError(403, 'PRODUCTION_FORK_ENDPOINT_DISABLED');
    }
    const body = objectBody(request.body);
    const tx = await this.context.resolution.setMockPayout(
      stringField(body, 'conditionId') as Hex,
      arrayField(body, 'numerators').map((item) => BigInt(String(item))),
      body.denominator === undefined ? 1n : bigintField(body, 'denominator'),
    );
    return { transactionHash: tx };
  });

  attempt = async (request: FastifyRequest, reply: FastifyReply) => wrap(reply, async () => {
    const params = objectBody(request.params);
    const attempt = await this.context.repository.findResolutionAttempt(stringField(params, 'attemptId'));
    if (!attempt) throw httpError(404, 'RESOLUTION_ATTEMPT_NOT_FOUND');
    return { attempt };
  });
}
