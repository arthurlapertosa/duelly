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

  mockPayout = async (request: FastifyRequest, reply: FastifyReply) => wrap(reply, async () => {
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
