import 'reflect-metadata';
import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'indexer_cursors' })
export class IndexerCursorEntity {
  @PrimaryColumn({ type: 'text' })
  id!: string;

  @Column({ type: 'text', name: 'deployment_key' })
  deploymentKey!: string;

  @Column({ type: 'text', name: 'last_block_number' })
  lastBlockNumber!: string;

  @Column({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}
