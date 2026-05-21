import 'reflect-metadata';
import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'sports_templates' })
export class SportsTemplateEntity {
  @PrimaryColumn({ type: 'text', name: 'template_hash' })
  templateHash!: string;

  @Column({ type: 'text', name: 'template_id' })
  templateId!: string;

  @Column({ type: 'text', name: 'provider_market_id' })
  providerMarketId!: string;

  @Column({ type: 'text' })
  sport!: string;

  @Column({ type: 'text' })
  competition!: string;

  @Column({ type: 'text', name: 'event_type' })
  eventType!: string;

  @Column({ type: 'text', name: 'binary_market_type' })
  binaryMarketType!: string;

  @Column({ type: 'text', name: 'condition_id' })
  conditionId!: string;

  @Column({ type: 'text', name: 'question_id_hash' })
  questionIdHash!: string;

  @Column({ type: 'jsonb' })
  template!: unknown;

  @Column({ type: 'boolean' })
  active!: boolean;

  @Column({ type: 'timestamptz', name: 'accepted_at' })
  acceptedAt!: Date;
}
