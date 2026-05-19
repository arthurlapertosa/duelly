import { EntitySchema } from 'typeorm';

export interface TemplatePublishAuditRecord {
  id: string;
  templateHash: string;
  templateId: string;
  status: string;
  publishedBy: string;
  payload: unknown;
  audit: unknown;
  createdAt: Date;
}

export const TemplatePublishAuditEntity = new EntitySchema<TemplatePublishAuditRecord>({
  name: 'TemplatePublishAudit',
  tableName: 'template_publish_audits',
  columns: {
    id: { type: String, primary: true },
    templateHash: { type: String, name: 'template_hash' },
    templateId: { type: String, name: 'template_id' },
    status: { type: String },
    publishedBy: { type: String, name: 'published_by' },
    payload: { type: 'jsonb' },
    audit: { type: 'jsonb' },
    createdAt: { type: 'timestamptz', name: 'created_at' },
  },
});
