import type { FastifyReply, FastifyRequest } from 'fastify';
import { httpError } from '../../modules/orchestration/services.js';
import {
  objectBody,
  stringField,
  wrap,
} from './helpers.js';
import type { OrchestrationControllerContext } from './orchestration-controller.context.js';

export class RelayerController {
  constructor(private readonly context: OrchestrationControllerContext) {}

  fund = async (request: FastifyRequest, reply: FastifyReply) => wrap(reply, async () => {
    const body = objectBody(request.body);
    return await this.context.relayer.fund({ inviteId: stringField(body, 'inviteId') });
  });

  transaction = async (request: FastifyRequest, reply: FastifyReply) => wrap(reply, async () => {
    const params = objectBody(request.params);
    const attempt = await this.context.repository.findRelayerAttemptByRequestId(stringField(params, 'requestId'));
    if (!attempt) throw httpError(404, 'RELAYER_ATTEMPT_NOT_FOUND');
    return { attempt };
  });
}
