import 'reflect-metadata';
import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'discovery_runs' })
export class DiscoveryRunEntity {
  @PrimaryColumn({ type: 'text' })
  id!: string;

  @Column({ type: 'text' })
  mode!: string;

  @Column({ type: 'text', nullable: true })
  sport?: string | null;

  @Column({ type: 'text' })
  provider!: string;

  @Column({ type: 'text' })
  status!: string;

  @Column({ type: 'text', name: 'gamma_base_url', nullable: true })
  gammaBaseUrl?: string | null;

  @Column({ type: 'timestamptz', name: 'started_at' })
  startedAt!: Date;

  @Column({ type: 'timestamptz', name: 'finished_at', nullable: true })
  finishedAt?: Date | null;

  @Column({ type: 'text', nullable: true })
  error?: string | null;
}
