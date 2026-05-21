import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  objectBody,
  publicUser,
  publicWallet,
  stringField,
  wrap,
} from './helpers.js';
import type { AuthedRequest, OrchestrationControllerContext } from './orchestration-controller.context.js';

export class AuthController {
  constructor(private readonly context: OrchestrationControllerContext) {}

  register = async (request: FastifyRequest, reply: FastifyReply) => wrap(reply, async () => {
    const body = objectBody(request.body);
    const result = await this.context.auth.register(stringField(body, 'email'), stringField(body, 'password'));
    return { token: result.token, user: publicUser(result.user) };
  });

  login = async (request: FastifyRequest, reply: FastifyReply) => wrap(reply, async () => {
    const body = objectBody(request.body);
    const result = await this.context.auth.login(stringField(body, 'email'), stringField(body, 'password'));
    return { token: result.token, user: publicUser(result.user) };
  });

  logout = async (request: AuthedRequest, reply: FastifyReply) => wrap(reply, async () => {
    await this.context.requireUser(request);
    await this.context.auth.logout(request.token);
    return { status: 'ok' };
  });

  me = async (request: AuthedRequest, reply: FastifyReply) => wrap(reply, async () => {
    const user = await this.context.requireUser(request);
    const wallet = await this.context.wallets.activeWallet(user);
    return { user: publicUser(user), wallet: wallet ? publicWallet(wallet) : null };
  });
}
