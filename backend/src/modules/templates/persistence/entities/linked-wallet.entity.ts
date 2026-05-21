import 'reflect-metadata';
import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity({ name: 'linked_wallets' })
export class LinkedWalletEntity {
  @PrimaryColumn({ type: 'text' })
  id!: string;

  @Column({ type: 'text', name: 'user_id' })
  userId!: string;

  @Index({ unique: true })
  @Column({ type: 'text' })
  address!: string;

  @Column({ type: 'integer', name: 'chain_id' })
  chainId!: number;

  @Column({ type: 'boolean' })
  active!: boolean;

  @Column({ type: 'timestamptz', name: 'verified_at' })
  verifiedAt!: Date;

  @Column({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;
}
