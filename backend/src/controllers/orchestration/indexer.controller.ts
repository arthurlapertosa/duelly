import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  bigintField,
  objectBody,
  wrap,
} from './helpers.js';
import type { OrchestrationControllerContext } from './orchestration-controller.context.js';

export class IndexerController {
  constructor(private readonly context: OrchestrationControllerContext) {}

  reindex = async (request: FastifyRequest, reply: FastifyReply) => wrap(reply, async () => {
    const body = objectBody(request.body);
    return await this.context.indexer.reindex(body.toBlock === undefined ? undefined : bigintField(body, 'toBlock'));
  });
}
