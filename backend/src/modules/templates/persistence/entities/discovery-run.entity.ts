import { EntitySchema } from 'typeorm';

export interface DiscoveryRunRecord {
  id: string;
  mode: string;
  sport?: string | null;
  provider: string;
  status: string;
  gammaBaseUrl?: string | null;
  startedAt: Date;
  finishedAt?: Date | null;
  error?: string | null;
}

export const DiscoveryRunEntity = new EntitySchema<DiscoveryRunRecord>({
  name: 'DiscoveryRun',
  tableName: 'discovery_runs',
  columns: {
    id: { type: String, primary: true },
    mode: { type: String },
    sport: { type: String, nullable: true },
    provider: { type: String },
    status: { type: String },
    gammaBaseUrl: { type: String, name: 'gamma_base_url', nullable: true },
    startedAt: { type: 'timestamptz', name: 'started_at' },
    finishedAt: { type: 'timestamptz', name: 'finished_at', nullable: true },
    error: { type: String, nullable: true },
  },
});
