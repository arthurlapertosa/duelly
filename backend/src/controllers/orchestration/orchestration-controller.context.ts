import type { FastifyRequest } from 'fastify';
import type { DataSource } from 'typeorm';
import type { AppConfig } from '../../config/env.js';
import { ChainService } from '../../modules/orchestration/chain.js';
import type { UserAccount } from '../../modules/orchestration/domain.js';
import { OrchestrationRepository } from '../../modules/orchestration/repository.js';
import {
  AuthService,
  Brl1Service,
  FeeService,
  IndexerService,
  InviteService,
  RelayerService,
  ResolutionMirrorService,
  ResolutionService,
  WalletService,
} from '../../modules/orchestration/services.js';
import { TemplateControllerContext } from '../templates/index.js';

export interface OrchestrationControllerOptions {
  config: AppConfig;
  dataSource?: DataSource;
  logger?: {
    info(input: unknown, message?: string): void;
  };
}

export interface AuthedRequest extends FastifyRequest {
  user?: UserAccount;
  token?: string;
}

export class OrchestrationControllerContext {
  readonly repository: OrchestrationRepository;
  readonly chain: ChainService;
  readonly auth: AuthService;
  readonly wallets: WalletService;
  readonly brl1: Brl1Service;
  readonly fees: FeeService;
  readonly invites: InviteService;
  readonly relayer: RelayerService;
  readonly indexer: IndexerService;
  readonly resolution: ResolutionService;
  readonly resolutionMirror: ResolutionMirrorService;
  readonly templates: TemplateControllerContext;

  constructor(options: OrchestrationControllerOptions) {
    this.repository = new OrchestrationRepository(options.dataSource);
    this.chain = new ChainService(options.config);
    this.auth = new AuthService(this.repository, options.config);
    this.wallets = new WalletService(this.repository, options.config, this.chain);
    this.brl1 = new Brl1Service(this.repository, this.chain);
    this.fees = new FeeService(this.chain);
    this.templates = new TemplateControllerContext(options);
    this.invites = new InviteService(this.repository, this.wallets, this.chain, options.config, this.brl1);
    this.relayer = new RelayerService(
      this.repository,
      this.chain,
      (templateHash) => this.templates.findAcceptedTemplate(templateHash),
    );
    this.indexer = new IndexerService(this.repository, this.chain);
    this.resolution = new ResolutionService(this.repository, this.chain);
    this.resolutionMirror = new ResolutionMirrorService(
      options.config,
      this.chain,
      (templateHash) => this.templates.findAcceptedTemplate(templateHash),
    );
  }
}
