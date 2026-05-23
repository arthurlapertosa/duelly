import type { AppConfig } from '../../../config/env.js';

interface TemplateDiscoveryRunner {
  refreshCurrentDiscoverySnapshot(input: { mode: 'live'; persistSnapshots: boolean }): Promise<unknown>;
}

interface WorkerLogger {
  info(input: unknown, message?: string): void;
  error(input: unknown, message?: string): void;
}

export class TemplateDiscoveryWorker {
  private timer: NodeJS.Timeout | undefined;
  private running = false;

  constructor(
    private readonly config: AppConfig,
    private readonly runner: TemplateDiscoveryRunner,
    private readonly logger?: WorkerLogger,
  ) {}

  start(): boolean {
    if (!this.shouldStart() || this.timer) return false;
    this.timer = setInterval(() => {
      void this.tick().catch((error) => this.logger?.error({ error }, 'template discovery worker tick failed'));
    }, this.config.polymarket.templateDiscoveryRefreshIntervalMs);
    this.timer.unref?.();
    void this.tick().catch((error) => this.logger?.error({ error }, 'template discovery worker initial tick failed'));
    this.logger?.info({
      intervalMs: this.config.polymarket.templateDiscoveryRefreshIntervalMs,
    }, 'template discovery worker started');
    return true;
  }

  stop(): void {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = undefined;
    this.logger?.info({}, 'template discovery worker stopped');
  }

  async tick(): Promise<{ refreshed: boolean }> {
    if (this.running) return { refreshed: false };
    this.running = true;
    try {
      await this.runner.refreshCurrentDiscoverySnapshot({ mode: 'live', persistSnapshots: false });
      return { refreshed: true };
    } finally {
      this.running = false;
    }
  }

  private shouldStart(): boolean {
    return Boolean(
      this.config.database.enabled
      && this.config.polymarket.discoveryMode === 'live'
      && this.config.polymarket.liveDiscoveryEnabled,
    );
  }
}
