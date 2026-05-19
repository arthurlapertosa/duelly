import type { AppConfig } from '../../../config/env.js';
import type { DiscoveryMode } from '../domain/types.js';
import type { Sport, NormalizedMarketCandidate } from '../domain/types.js';
import { loadFixtureCandidates } from './fixture-loader.js';
import { GammaClient } from './gamma-client.js';

export class DiscoveryAdapter {
  constructor(private readonly config: AppConfig) {}

  async discover(options: { mode?: DiscoveryMode; sport?: Sport }): Promise<NormalizedMarketCandidate[]> {
    const mode = options.mode ?? this.config.polymarket.discoveryMode;
    if (mode === 'fixture') return loadFixtureCandidates(options.sport);
    return new GammaClient(this.config).discoverMarkets(options.sport);
  }
}
