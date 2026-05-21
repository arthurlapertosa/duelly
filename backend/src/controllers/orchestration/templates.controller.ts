import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Hex } from 'viem';
import type { AuthedRequest, OrchestrationControllerContext } from './orchestration-controller.context.js';
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

  publishChain = async (request: AuthedRequest, reply: FastifyReply) => wrap(reply, async () => {
    await this.context.requireUser(request);
    const params = objectBody(request.params);
    const query = this.context.templates.parseTemplateQuery(objectBody(request.query));
    const template = await findTemplate(this.context, stringField(params, 'templateId'), query as Record<string, unknown>);
    if (!template) throw httpError(404, 'TEMPLATE_NOT_FOUND');
    const existing = await this.context.chain.readTemplate(template.templateHash as Hex);
    if (existing.registered) {
      return {
        status: 'already_registered',
        transactionHash: null,
        templateHash: template.templateHash,
        blockNumber: null,
      };
    }
    const transactionHash = await this.context.chain.writeRegisterTemplate(template);
    const receipt = await this.context.chain.wait(transactionHash);
    return {
      status: receipt.status,
      transactionHash,
      templateHash: template.templateHash,
      blockNumber: receipt.blockNumber.toString(),
    };
  });

  quoteLoserFee = async (request: FastifyRequest, reply: FastifyReply) => wrap(reply, async () => {
    const body = objectBody(request.body);
    return await this.context.fees.quote(bigintField(body, 'stake'), numberField(body, 'loserFeeBps'));
  });
}
