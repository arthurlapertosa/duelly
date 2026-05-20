import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { DataSource } from 'typeorm';
import type { Hex } from 'viem';
import type { AppConfig } from '../config/env.js';
import { TemplateControllerContext } from '../controllers/templates/index.js';
import type { CanonicalSportsTemplate } from '../modules/templates/domain/types.js';
import { ChainService } from '../modules/m3/chain.js';
import { M3Repository } from '../modules/m3/repository.js';
import {
  AuthService,
  Brl1Service,
  FeeService,
  IndexerService,
  InviteService,
  RelayerService,
  ResolutionService,
  WalletService,
  httpError,
} from '../modules/m3/services.js';
import type { M3User } from '../modules/m3/domain.js';

interface M3RouteOptions {
  config: AppConfig;
  dataSource?: DataSource;
}

interface AuthedRequest extends FastifyRequest {
  user?: M3User;
  token?: string;
}

export async function registerM3Routes(app: FastifyInstance, options: M3RouteOptions): Promise<void> {
  const repository = new M3Repository(options.dataSource);
  const chain = new ChainService(options.config);
  const auth = new AuthService(repository, options.config);
  const wallets = new WalletService(repository, options.config, chain);
  const brl1 = new Brl1Service(repository, chain);
  const fees = new FeeService(chain);
  const invites = new InviteService(repository, wallets, chain);
  const relayer = new RelayerService(repository, chain);
  const indexer = new IndexerService(repository, chain);
  const resolution = new ResolutionService(repository, chain);
  const templates = new TemplateControllerContext(options);

  async function requireUser(request: AuthedRequest, _reply: FastifyReply): Promise<M3User> {
    const authResult = await auth.authenticate(request.headers.authorization);
    if (!authResult) {
      throw httpError(401, 'UNAUTHENTICATED');
    }
    request.user = authResult.user;
    request.token = authResult.token;
    return authResult.user;
  }

  app.post('/auth/register', async (request, reply) => wrap(reply, async () => {
    const body = objectBody(request.body);
    const result = await auth.register(stringField(body, 'email'), stringField(body, 'password'));
    return { token: result.token, user: publicUser(result.user) };
  }));

  app.post('/auth/login', async (request, reply) => wrap(reply, async () => {
    const body = objectBody(request.body);
    const result = await auth.login(stringField(body, 'email'), stringField(body, 'password'));
    return { token: result.token, user: publicUser(result.user) };
  }));

  app.post('/auth/logout', async (request: AuthedRequest, reply) => wrap(reply, async () => {
    const user = await requireUser(request, reply);
    if (!user) return;
    await auth.logout(request.token);
    return { status: 'ok' };
  }));

  app.get('/auth/me', async (request: AuthedRequest, reply) => wrap(reply, async () => {
    const user = await requireUser(request, reply);
    if (!user) return;
    const wallet = await wallets.activeWallet(user);
    return { user: publicUser(user), wallet: wallet ? publicWallet(wallet) : null };
  }));

  app.post('/wallets/challenges', async (request: AuthedRequest, reply) => wrap(reply, async () => {
    const user = await requireUser(request, reply);
    if (!user) return;
    const body = objectBody(request.body);
    const challenge = await wallets.createChallenge(user, stringField(body, 'address'));
    return {
      id: challenge.id,
      address: challenge.address,
      chainId: challenge.chainId,
      message: challenge.message,
      expiresAt: challenge.expiresAt.toISOString(),
    };
  }));

  app.post('/wallets/link', async (request: AuthedRequest, reply) => wrap(reply, async () => {
    const user = await requireUser(request, reply);
    if (!user) return;
    const body = objectBody(request.body);
    const wallet = await wallets.link(user, stringField(body, 'challengeId'), stringField(body, 'signature') as Hex);
    return { wallet: publicWallet(wallet) };
  }));

  app.get('/wallets/me', async (request: AuthedRequest, reply) => wrap(reply, async () => {
    const user = await requireUser(request, reply);
    if (!user) return;
    const wallet = await wallets.activeWallet(user);
    if (!wallet) throw httpError(404, 'WALLET_NOT_LINKED');
    return { wallet: publicWallet(wallet) };
  }));

  app.get('/wallets/me/brl1', async (request: AuthedRequest, reply) => wrap(reply, async () => {
    const user = await requireUser(request, reply);
    if (!user) return;
    return await brl1.balanceForUser(user);
  }));

  app.post('/wallets/me/funding-readiness', async (request: AuthedRequest, reply) => wrap(reply, async () => {
    const user = await requireUser(request, reply);
    if (!user) return;
    const body = objectBody(request.body);
    return await brl1.readiness(user, bigintField(body, 'stake'), bigintField(body, 'loserFee'));
  }));

  app.get('/templates/:templateId', async (request, reply) => wrap(reply, async () => {
    const params = objectBody(request.params);
    const query = templates.parseTemplateQuery(objectBody(request.query));
    const modeCheck = templates.validateMode(query);
    if (modeCheck) return modeCheck(reply);
    const template = await findTemplate(templates, stringField(params, 'templateId'), query as Record<string, unknown>);
    if (!template) throw httpError(404, 'TEMPLATE_NOT_FOUND');
    return { template };
  }));

  app.post('/templates/:templateId/publish-chain', async (request: AuthedRequest, reply) => wrap(reply, async () => {
    const user = await requireUser(request, reply);
    if (!user) return;
    const params = objectBody(request.params);
    const query = templates.parseTemplateQuery(objectBody(request.query));
    const template = await findTemplate(templates, stringField(params, 'templateId'), query as Record<string, unknown>);
    if (!template) throw httpError(404, 'TEMPLATE_NOT_FOUND');
    const existing = await chain.readTemplate(template.templateHash as Hex);
    if (existing.registered) {
      return {
        status: 'already_registered',
        transactionHash: null,
        templateHash: template.templateHash,
        blockNumber: null,
      };
    }
    const transactionHash = await chain.writeRegisterTemplate(template);
    const receipt = await chain.wait(transactionHash);
    return {
      status: receipt.status,
      transactionHash,
      templateHash: template.templateHash,
      blockNumber: receipt.blockNumber.toString(),
    };
  }));

  app.post('/fees/loser-fee', async (request, reply) => wrap(reply, async () => {
    const body = objectBody(request.body);
    return await fees.quote(bigintField(body, 'stake'), numberField(body, 'loserFeeBps'));
  }));

  app.post('/invites', async (request: AuthedRequest, reply) => wrap(reply, async () => {
    const user = await requireUser(request, reply);
    if (!user) return;
    const body = objectBody(request.body);
    const template = await findTemplate(templates, stringField(body, 'templateId'), {});
    if (!template) throw httpError(404, 'TEMPLATE_NOT_FOUND');
    const invite = await invites.create(
      user,
      template,
      bigintField(body, 'stake'),
      body.loserFee === undefined ? BigInt((await fees.quote(bigintField(body, 'stake'), template.loserFeeBps)).selectedLoserFeeRaw) : bigintField(body, 'loserFee'),
      numberField(body, 'makerOutcomeIndex'),
      optionalString(body, 'takerAddress'),
    );
    return { invite: publicInvite(invite), offerPayload: invite.offerPayload, requiredFundingRaw: (BigInt(invite.stake) + BigInt(invite.loserFee)).toString() };
  }));

  app.get('/invites/:inviteId', async (request, reply) => wrap(reply, async () => {
    const params = objectBody(request.params);
    const invite = await repository.findInvite(stringField(params, 'inviteId'));
    if (!invite) throw httpError(404, 'INVITE_NOT_FOUND');
    return { invite: publicInvite(invite), offerPayload: invite.offerPayload, acceptancePayload: invite.acceptancePayload };
  }));

  app.post('/invites/:inviteId/accept', async (request: AuthedRequest, reply) => wrap(reply, async () => {
    const user = await requireUser(request, reply);
    if (!user) return;
    const params = objectBody(request.params);
    const body = objectBody(request.body);
    const invite = await invites.accept(user, stringField(params, 'inviteId'), numberField(body, 'takerOutcomeIndex'));
    return { invite: publicInvite(invite), acceptancePayload: invite.acceptancePayload, requiredFundingRaw: (BigInt(invite.stake) + BigInt(invite.loserFee)).toString() };
  }));

  app.post('/relayer/fund', async (request, reply) => wrap(reply, async () => {
    const body = objectBody(request.body);
    return await relayer.fund({
      inviteId: stringField(body, 'inviteId'),
      makerSignature: stringField(body, 'makerSignature') as Hex,
      takerSignature: stringField(body, 'takerSignature') as Hex,
      makerPermit: permitField(objectField(body, 'makerPermit')),
      takerPermit: permitField(objectField(body, 'takerPermit')),
    });
  }));

  app.get('/relayer/transactions/:requestId', async (request, reply) => wrap(reply, async () => {
    const params = objectBody(request.params);
    const attempt = await repository.findRelayerAttemptByRequestId(stringField(params, 'requestId'));
    if (!attempt) throw httpError(404, 'RELAYER_ATTEMPT_NOT_FOUND');
    return { attempt };
  }));

  app.post('/internal/indexer/reindex', async (request, reply) => wrap(reply, async () => {
    const body = objectBody(request.body);
    return await indexer.reindex(body.toBlock === undefined ? undefined : bigintField(body, 'toBlock'));
  }));

  app.get('/bets/:betId', async (request, reply) => wrap(reply, async () => {
    const params = objectBody(request.params);
    const bet = await repository.findIndexedBet(stringField(params, 'betId'));
    if (!bet) throw httpError(404, 'BET_NOT_FOUND');
    return { bet };
  }));

  app.get('/invites/:inviteId/bet', async (request, reply) => wrap(reply, async () => {
    const params = objectBody(request.params);
    const bet = await repository.findIndexedBetByInviteId(stringField(params, 'inviteId'));
    if (!bet) throw httpError(404, 'BET_NOT_FOUND');
    return { bet };
  }));

  app.post('/internal/resolution/run', async (request, reply) => wrap(reply, async () => {
    const body = objectBody(request.body);
    return { attempt: await resolution.trigger(stringField(body, 'betId')) };
  }));

  app.post('/internal/resolution/mock-payout', async (request, reply) => wrap(reply, async () => {
    const body = objectBody(request.body);
    const tx = await resolution.setMockPayout(
      stringField(body, 'conditionId') as Hex,
      arrayField(body, 'numerators').map((item) => BigInt(String(item))),
      body.denominator === undefined ? 1n : bigintField(body, 'denominator'),
    );
    return { transactionHash: tx };
  }));

  app.get('/resolution/attempts/:attemptId', async (request, reply) => wrap(reply, async () => {
    const params = objectBody(request.params);
    const attempt = await repository.findResolutionAttempt(stringField(params, 'attemptId'));
    if (!attempt) throw httpError(404, 'RESOLUTION_ATTEMPT_NOT_FOUND');
    return { attempt };
  }));
}

async function findTemplate(context: TemplateControllerContext, id: string, query: Record<string, unknown>): Promise<CanonicalSportsTemplate | undefined> {
  const result = await context.discoverAndFilter(query);
  return result.accepted.find((template) => template.templateId === id || template.templateHash.toLowerCase() === id.toLowerCase());
}

async function wrap(reply: FastifyReply, handler: () => Promise<unknown>) {
  try {
    const result = await handler();
    if (result === undefined) return;
    return result;
  } catch (error) {
    const statusCode = typeof (error as { statusCode?: unknown }).statusCode === 'number'
      ? (error as { statusCode: number }).statusCode
      : 500;
    reply.code(statusCode);
    return {
      status: 'error',
      code: (error as { code?: string }).code ?? (error instanceof Error ? error.message : 'INTERNAL_ERROR'),
    };
  }
}

function publicUser(user: M3User) {
  return {
    id: user.id,
    displayIdentifier: user.displayIdentifier,
    externalWalletLinked: false,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

function publicWallet(wallet: { address: string; chainId: number; active: boolean; verifiedAt: Date }) {
  return {
    address: wallet.address,
    chainId: wallet.chainId,
    verificationStatus: wallet.active ? 'verified' : 'inactive',
    verifiedAt: wallet.verifiedAt.toISOString(),
  };
}

function publicInvite(invite: { id: string; status: string; templateHash: string; conditionId: string; makerAddress: string; takerAddress: string | null; makerOutcomeIndex: number; takerOutcomeIndex: number | null; stake: string; loserFee: string; expiresAt: Date; betId: string | null }) {
  return {
    id: invite.id,
    status: invite.status,
    templateHash: invite.templateHash,
    conditionId: invite.conditionId,
    makerAddress: invite.makerAddress,
    takerAddress: invite.takerAddress,
    makerOutcomeIndex: invite.makerOutcomeIndex,
    takerOutcomeIndex: invite.takerOutcomeIndex,
    stakeRaw: invite.stake,
    loserFeeRaw: invite.loserFee,
    expiresAt: invite.expiresAt.toISOString(),
    betId: invite.betId,
  };
}

function objectBody(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

function objectField(value: Record<string, unknown>, field: string): Record<string, unknown> {
  const item = value[field];
  if (!item || typeof item !== 'object') throw httpError(400, `MISSING_${field.toUpperCase()}`);
  return item as Record<string, unknown>;
}

function arrayField(value: Record<string, unknown>, field: string): unknown[] {
  const item = value[field];
  if (!Array.isArray(item)) throw httpError(400, `MISSING_${field.toUpperCase()}`);
  return item;
}

function stringField(value: Record<string, unknown>, field: string): string {
  const item = value[field];
  if (typeof item !== 'string' || item.length === 0) throw httpError(400, `MISSING_${field.toUpperCase()}`);
  return item;
}

function optionalString(value: Record<string, unknown>, field: string): string | undefined {
  const item = value[field];
  return typeof item === 'string' && item.length > 0 ? item : undefined;
}

function numberField(value: Record<string, unknown>, field: string): number {
  const item = value[field];
  const parsed = typeof item === 'number' ? item : Number.parseInt(String(item), 10);
  if (!Number.isFinite(parsed)) throw httpError(400, `INVALID_${field.toUpperCase()}`);
  return parsed;
}

function bigintField(value: Record<string, unknown>, field: string): bigint {
  const item = value[field];
  try {
    const parsed = BigInt(String(item));
    if (parsed < 0n) throw new Error();
    return parsed;
  } catch {
    throw httpError(400, `INVALID_${field.toUpperCase()}`);
  }
}

function permitField(value: Record<string, unknown>) {
  return {
    value: bigintField(value, 'value'),
    nonce: bigintField(value, 'nonce'),
    deadline: bigintField(value, 'deadline'),
    v: numberField(value, 'v'),
    r: stringField(value, 'r') as Hex,
    s: stringField(value, 's') as Hex,
  };
}
