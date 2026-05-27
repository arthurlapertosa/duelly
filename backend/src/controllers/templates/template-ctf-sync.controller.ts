import type { FastifyReply, FastifyRequest } from 'fastify';
import { objectBody } from '../orchestration/helpers.js';
import type { TemplateControllerContext } from './template-controller.context.js';

export class TemplateCtfSyncController {
  constructor(private readonly context: TemplateControllerContext) {}

  run = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      if (this.context.config.nodeEnv === 'production') {
        reply.code(403);
        return {
          status: 'error',
          code: 'PRODUCTION_FORK_ENDPOINT_DISABLED',
        };
      }
      const body = objectBody(request.body);
      return await this.context.syncCurrentTemplateCtf({
        conditionId: optionalString(body.conditionId),
        templateId: optionalString(body.templateId),
        limit: optionalPositiveInteger(body.limit),
      });
    } catch (error) {
      reply.code(500);
      return {
        status: 'error',
        code: error instanceof Error ? error.message : 'INTERNAL_ERROR',
      };
    }
  };
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function optionalPositiveInteger(value: unknown): number | undefined {
  if (value === undefined) return undefined;
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}
