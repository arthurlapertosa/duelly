import type { FastifyInstance } from 'fastify';
import {
  AuthController,
  BetsController,
  IndexerController,
  InvitesController,
  OrchestrationAuthMiddleware,
  OrchestrationControllerContext,
  OrchestrationTemplatesController,
  type OrchestrationControllerOptions,
  RelayerController,
  ResolutionController,
  WalletsController,
} from '../controllers/orchestration/index.js';

export async function registerOrchestrationRoutes(app: FastifyInstance, options: OrchestrationControllerOptions): Promise<void> {
  const context = new OrchestrationControllerContext(options);
  const middleware = new OrchestrationAuthMiddleware(context);
  const authenticated = { preHandler: middleware.isAuthenticated };
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
  app.post('/auth/logout', authenticated, auth.logout);
  app.get('/auth/me', authenticated, auth.me);

  app.post('/wallets/challenges', authenticated, wallets.createChallenge);
  app.post('/wallets/link', authenticated, wallets.link);
  app.get('/wallets/me', authenticated, wallets.me);
  app.delete('/wallets/me', authenticated, wallets.unlink);
  app.get('/wallets/me/brl1', authenticated, wallets.brl1);
  app.post('/wallets/me/funding-readiness', authenticated, wallets.fundingReadiness);

  app.get('/templates/:templateId', templates.detail);
  app.post('/templates/:templateId/publish-chain', authenticated, templates.publishChain);
  app.post('/fees/loser-fee', templates.quoteLoserFee);

  app.post('/invites', authenticated, invites.create);
  app.get('/me/invites/pending', authenticated, invites.pending);
  app.get('/invites/:inviteId', invites.get);
  app.delete('/invites/:inviteId', authenticated, invites.cancel);
  app.post('/invites/:inviteId/maker-authorizations', authenticated, invites.authorizeMaker);
  app.post('/invites/:inviteId/accept', authenticated, invites.accept);
  app.post('/invites/:inviteId/taker-authorizations', authenticated, invites.authorizeTaker);

  app.post('/relayer/fund', relayer.fund);
  app.get('/relayer/transactions/:requestId', relayer.transaction);

  app.post('/internal/indexer/reindex', indexer.reindex);
  app.get('/me/bets', authenticated, bets.mine);
  app.get('/bets/:betId', bets.get);
  app.get('/invites/:inviteId/bet', bets.getByInvite);

  app.post('/internal/resolution/run', resolution.run);
  app.post('/internal/resolution/mock-payout', resolution.mockPayout);
  app.get('/resolution/attempts/:attemptId', resolution.attempt);
}
