import type { FastifyInstance } from 'fastify';
import {
  AuthController,
  BetsController,
  IndexerController,
  InvitesController,
  OrchestrationControllerContext,
  OrchestrationTemplatesController,
  type OrchestrationControllerOptions,
  RelayerController,
  ResolutionController,
  WalletsController,
} from '../controllers/orchestration/index.js';

export async function registerOrchestrationRoutes(app: FastifyInstance, options: OrchestrationControllerOptions): Promise<void> {
  const context = new OrchestrationControllerContext(options);
  const auth = new AuthController(context);
  const wallets = new WalletsController(context);
  const templates = new OrchestrationTemplatesController(context);
  const invites = new InvitesController(context);
  const relayer = new RelayerController(context);
  const indexer = new IndexerController(context);
  const bets = new BetsController(context);
  const resolution = new ResolutionController(context);

  app.post('/auth/register', auth.register);
  app.post('/auth/login', auth.login);
  app.post('/auth/logout', auth.logout);
  app.get('/auth/me', auth.me);

  app.post('/wallets/challenges', wallets.createChallenge);
  app.post('/wallets/link', wallets.link);
  app.get('/wallets/me', wallets.me);
  app.get('/wallets/me/brl1', wallets.brl1);
  app.post('/wallets/me/funding-readiness', wallets.fundingReadiness);

  app.get('/templates/:templateId', templates.detail);
  app.post('/templates/:templateId/publish-chain', templates.publishChain);
  app.post('/fees/loser-fee', templates.quoteLoserFee);

  app.post('/invites', invites.create);
  app.get('/invites/:inviteId', invites.get);
  app.post('/invites/:inviteId/accept', invites.accept);

  app.post('/relayer/fund', relayer.fund);
  app.get('/relayer/transactions/:requestId', relayer.transaction);

  app.post('/internal/indexer/reindex', indexer.reindex);
  app.get('/bets/:betId', bets.get);
  app.get('/invites/:inviteId/bet', bets.getByInvite);

  app.post('/internal/resolution/run', resolution.run);
  app.post('/internal/resolution/mock-payout', resolution.mockPayout);
  app.get('/resolution/attempts/:attemptId', resolution.attempt);
}
