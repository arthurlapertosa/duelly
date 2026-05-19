import type { FastifyReply, FastifyRequest } from 'fastify';
import type { TemplateControllerContext, TemplateQuery } from './template-controller.context.js';

export class CandidateTemplatesController {
  constructor(private readonly context: TemplateControllerContext) {}

  list = async (
    request: FastifyRequest<{ Querystring: TemplateQuery }>,
    reply: FastifyReply,
  ) => {
    const query = this.context.parseTemplateQuery(request.query);
    const modeCheck = this.context.validateMode(query);
    if (modeCheck) return modeCheck(reply);

    const mode = this.context.resolveMode(query);
    const candidates = await this.context.adapter.discover(query);
    const discoveryRunId = await this.context.repository.recordDiscoveryRun({
      mode,
      sport: query.sport ?? null,
      provider: 'polymarket',
      status: 'completed',
      gammaBaseUrl: mode === 'live' ? this.context.config.polymarket.gammaBaseUrl : null,
    });
    await this.context.repository.saveCandidates(candidates, discoveryRunId);
    return { mode, count: candidates.length, candidates };
  };
}
