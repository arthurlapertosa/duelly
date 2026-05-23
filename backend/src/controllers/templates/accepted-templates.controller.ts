import type { FastifyReply, FastifyRequest } from 'fastify';
import type { TemplateControllerContext, TemplateQuery } from './template-controller.context.js';

export class AcceptedTemplatesController {
  constructor(private readonly context: TemplateControllerContext) {}

  list = async (
    request: FastifyRequest<{ Querystring: TemplateQuery }>,
    reply: FastifyReply,
  ) => {
    const query = this.context.parseTemplateListQuery(request.query);
    const modeCheck = this.context.validateMode(query);
    if (modeCheck) return modeCheck(reply);

    const result = await this.context.listAcceptedTemplates(query);
    return {
      mode: result.mode,
      count: result.count,
      pageCount: result.pageCount,
      nextCursor: result.nextCursor,
      refreshedAt: result.refreshedAt?.toISOString() ?? null,
      stale: result.stale,
      templates: result.templates,
    };
  };
}
