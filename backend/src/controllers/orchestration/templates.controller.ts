import type { FastifyReply, FastifyRequest } from 'fastify';
import type { OrchestrationControllerContext } from './orchestration-controller.context.js';
import { bigintField, findTemplate, numberField, objectBody, stringField, wrap } from './helpers.js';
import { httpError } from '../../modules/orchestration/services.js';

export class OrchestrationTemplatesController {
  constructor(private readonly context: OrchestrationControllerContext) {}

  detail = async (request: FastifyRequest, reply: FastifyReply) => wrap(reply, async () => {
    const params = objectBody(request.params);
    const query = this.context.templates.parseTemplateQuery(objectBody(request.query));
    const modeCheck = this.context.templates.validateMode(query);
    if (modeCheck) return modeCheck(reply);
    const template = await findTemplate(this.context, stringField(params, 'templateId'), query as Record<string, unknown>);
    if (!template) throw httpError(404, 'TEMPLATE_NOT_FOUND');
    return { template };
  });

  quoteLoserFee = async (request: FastifyRequest, reply: FastifyReply) => wrap(reply, async () => {
    const body = objectBody(request.body);
    return await this.context.fees.quote(bigintField(body, 'stake'), numberField(body, 'loserFeeBps'));
  });
}
