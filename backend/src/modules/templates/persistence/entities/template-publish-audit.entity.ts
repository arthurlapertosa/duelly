import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'template_publish_audits' })
export class TemplatePublishAuditEntity {
  @PrimaryColumn({ type: 'text' })
  id!: string;

  @Column({ type: 'text', name: 'template_hash' })
  templateHash!: string;

  @Column({ type: 'text', name: 'template_id' })
  templateId!: string;

  @Column({ type: 'text' })
  status!: string;

  @Column({ type: 'text', name: 'published_by' })
  publishedBy!: string;

  @Column({ type: 'jsonb' })
  payload!: unknown;

  @Column({ type: 'jsonb' })
  audit!: unknown;

  @Column({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;
}
