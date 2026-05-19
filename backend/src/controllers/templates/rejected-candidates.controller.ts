import type { FastifyReply, FastifyRequest } from 'fastify';
import type { TemplateControllerContext, TemplateQuery } from './template-controller.context.js';

export class RejectedCandidatesController {
  constructor(private readonly context: TemplateControllerContext) {}

  list = async (
    request: FastifyRequest<{ Querystring: TemplateQuery }>,
    reply: FastifyReply,
  ) => {
    const query = this.context.parseTemplateQuery(request.query);
    const modeCheck = this.context.validateMode(query);
    if (modeCheck) return modeCheck(reply);

    const result = await this.context.discoverAndFilter(query);
    return { mode: this.context.resolveMode(query), count: result.rejected.length, rejected: result.rejected };
  };
}
