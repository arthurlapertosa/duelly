import { timingSafeEqual } from 'node:crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { AppConfig } from '../config/env.js';

export function internalAuthPreHandler(config: AppConfig) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const expected = config.internal.apiToken;
    if (!expected) return;

    const authorization = request.headers.authorization;
    if (!authorization?.startsWith('Bearer ')) {
      return reply.code(401).send({
        status: 'error',
        code: 'INTERNAL_API_TOKEN_REQUIRED',
      });
    }

    const actual = authorization.slice('Bearer '.length).trim();
    if (!safeTokenEqual(actual, expected)) {
      return reply.code(403).send({
        status: 'error',
        code: 'INTERNAL_API_TOKEN_INVALID',
      });
    }
  };
}

function safeTokenEqual(actual: string, expected: string): boolean {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}
