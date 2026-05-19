import type { FastifyReply, FastifyRequest } from 'fastify';
import type { PublishBody, TemplateControllerContext, TemplateQuery } from './template-controller.context.js';

export class PublishTemplateController {
  constructor(private readonly context: TemplateControllerContext) {}

  publish = async (
    request: FastifyRequest<{ Querystring: TemplateQuery; Body: PublishBody }>,
    reply: FastifyReply,
  ) => {
    const query = this.context.parseTemplateQuery(request.query);
    if (this.context.resolveMode(query) !== 'fixture') {
      reply.code(400);
      return { status: 'error', code: 'PUBLISH_LIVE_DISABLED' };
    }
    if (this.context.config.nodeEnv === 'production') {
      reply.code(403);
      return { status: 'error', code: 'PUBLISH_STUB_DISABLED' };
    }
    if (!this.context.repository.enabled) {
      reply.code(503);
      return { status: 'error', code: 'PUBLISH_AUDIT_DB_REQUIRED' };
    }

    const body = request.body ?? {};
    if (!body.templateId) {
      reply.code(400);
      return { status: 'error', code: 'MISSING_TEMPLATE_ID' };
    }

    const result = await this.context.discoverAndFilter(query);
    const template = result.accepted.find((item) => item.templateId === body.templateId || item.templateHash === body.templateId);
    if (!template) {
      const rejected = result.rejected.find((item) => item.candidate.id === body.templateId);
      reply.code(400);
      return {
        status: 'error',
        code: 'TEMPLATE_NOT_PUBLISHABLE',
        reasons: rejected?.reasons ?? ['TEMPLATE_NOT_ACCEPTED'],
      };
    }

    const payload = this.context.publisher.buildPublishablePayload(template, 'local-fixture-qa');
    await this.context.repository.savePublishAudit(template, payload);
    return payload;
  };
}
