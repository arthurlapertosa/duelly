import 'reflect-metadata';
import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'bet_invites' })
export class BetInviteEntity {
  @PrimaryColumn({ type: 'text' })
  id!: string;

  @Column({ type: 'text', name: 'maker_user_id' })
  makerUserId!: string;

  @Column({ type: 'text', name: 'taker_user_id', nullable: true })
  takerUserId!: string | null;

  @Column({ type: 'text', name: 'recipient_email', nullable: true })
  recipientEmail!: string | null;

  @Column({ type: 'text', name: 'template_hash' })
  templateHash!: string;

  @Column({ type: 'text', name: 'condition_id' })
  conditionId!: string;

  @Column({ type: 'text', name: 'maker_address' })
  makerAddress!: string;

  @Column({ type: 'text', name: 'taker_address', nullable: true })
  takerAddress!: string | null;

  @Column({ type: 'integer', name: 'maker_outcome_index' })
  makerOutcomeIndex!: number;

  @Column({ type: 'integer', name: 'taker_outcome_index', nullable: true })
  takerOutcomeIndex!: number | null;

  @Column({ type: 'text' })
  stake!: string;

  @Column({ type: 'text', name: 'loser_fee' })
  loserFee!: string;

  @Column({ type: 'text', name: 'offer_nonce' })
  offerNonce!: string;

  @Column({ type: 'text', name: 'acceptance_nonce', nullable: true })
  acceptanceNonce!: string | null;

  @Column({ type: 'text', name: 'offer_hash' })
  offerHash!: string;

  @Column({ type: 'jsonb', name: 'offer_payload' })
  offerPayload!: unknown;

  @Column({ type: 'text', name: 'offer_signature', nullable: true })
  offerSignature!: string | null;

  @Column({ type: 'jsonb', name: 'maker_permit', nullable: true })
  makerPermit!: unknown | null;

  @Column({ type: 'timestamptz', name: 'maker_authorized_at', nullable: true })
  makerAuthorizedAt!: Date | null;

  @Column({ type: 'jsonb', name: 'acceptance_payload', nullable: true })
  acceptancePayload!: unknown | null;

  @Column({ type: 'text', name: 'acceptance_signature', nullable: true })
  acceptanceSignature!: string | null;

  @Column({ type: 'jsonb', name: 'taker_permit', nullable: true })
  takerPermit!: unknown | null;

  @Column({ type: 'timestamptz', name: 'taker_authorized_at', nullable: true })
  takerAuthorizedAt!: Date | null;

  @Column({ type: 'text' })
  status!: string;

  @Column({ type: 'text', name: 'bet_id', nullable: true })
  betId!: string | null;

  @Column({ type: 'text', name: 'deployment_key', nullable: true })
  deploymentKey!: string | null;

  @Column({ type: 'timestamptz', name: 'expires_at' })
  expiresAt!: Date;

  @Column({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @Column({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}
