import 'reflect-metadata';
import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'indexed_chain_events' })
export class IndexedChainEventEntity {
  @PrimaryColumn({ type: 'text' })
  id!: string;

  @Column({ type: 'text', name: 'event_name' })
  eventName!: string;

  @Column({ type: 'text', name: 'transaction_hash' })
  transactionHash!: string;

  @Column({ type: 'integer', name: 'log_index' })
  logIndex!: number;

  @Column({ type: 'text', name: 'block_number' })
  blockNumber!: string;

  @Column({ type: 'jsonb' })
  args!: unknown;

  @Column({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;
}
