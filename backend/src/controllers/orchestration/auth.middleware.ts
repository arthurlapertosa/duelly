import type { FastifyReply } from 'fastify';
import type { AuthedRequest, OrchestrationControllerContext } from './orchestration-controller.context.js';

export class OrchestrationAuthMiddleware {
  constructor(private readonly context: OrchestrationControllerContext) {}

  isAuthenticated = async (request: AuthedRequest, reply: FastifyReply) => {
    const authResult = await this.context.auth.authenticate(request.headers.authorization);
    if (!authResult) {
      return reply.code(401).send({ status: 'error', code: 'UNAUTHENTICATED' });
    }
    request.user = authResult.user;
    request.token = authResult.token;
  };
}
