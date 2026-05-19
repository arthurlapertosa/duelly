import { EntitySchema } from 'typeorm';

export interface SportsTemplateRecord {
  templateHash: string;
  templateId: string;
  providerMarketId: string;
  sport: string;
  competition: string;
  eventType: string;
  binaryMarketType: string;
  conditionId: string;
  questionIdHash: string;
  template: unknown;
  active: boolean;
  acceptedAt: Date;
}

export const SportsTemplateEntity = new EntitySchema<SportsTemplateRecord>({
  name: 'SportsTemplate',
  tableName: 'sports_templates',
  columns: {
    templateHash: { type: String, primary: true, name: 'template_hash' },
    templateId: { type: String, name: 'template_id' },
    providerMarketId: { type: String, name: 'provider_market_id' },
    sport: { type: String },
    competition: { type: String },
    eventType: { type: String, name: 'event_type' },
    binaryMarketType: { type: String, name: 'binary_market_type' },
    conditionId: { type: String, name: 'condition_id' },
    questionIdHash: { type: String, name: 'question_id_hash' },
    template: { type: 'jsonb' },
    active: { type: Boolean },
    acceptedAt: { type: 'timestamptz', name: 'accepted_at' },
  },
});
