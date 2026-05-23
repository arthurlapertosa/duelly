import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTemplateCtfSyncStatuses1716800000000 implements MigrationInterface {
  name = 'CreateTemplateCtfSyncStatuses1716800000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS template_ctf_sync_statuses (
        condition_id text PRIMARY KEY,
        template_hash text NOT NULL,
        template_id text NOT NULL,
        status text NOT NULL,
        source_denominator text,
        fork_denominator text,
        prepare_transaction_hash text,
        mirror_transaction_hash text,
        block_number text,
        error text,
        checked_at timestamptz NOT NULL,
        updated_at timestamptz NOT NULL,
        CONSTRAINT template_ctf_sync_statuses_status_check
          CHECK (status IN (
            'disabled',
            'missing-source-rpc',
            'missing-oracle',
            'non-local-fork-rpc',
            'invalid-chain-id',
            'invalid-template',
            'source-unresolved',
            'prepared',
            'already-resolved',
            'mirrored',
            'failed'
          ))
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_template_ctf_sync_statuses_status
      ON template_ctf_sync_statuses (status)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_template_ctf_sync_statuses_updated_at
      ON template_ctf_sync_statuses (updated_at)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_template_ctf_sync_statuses_template_id
      ON template_ctf_sync_statuses (template_id)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS idx_template_ctf_sync_statuses_template_id');
    await queryRunner.query('DROP INDEX IF EXISTS idx_template_ctf_sync_statuses_updated_at');
    await queryRunner.query('DROP INDEX IF EXISTS idx_template_ctf_sync_statuses_status');
    await queryRunner.query('DROP TABLE IF EXISTS template_ctf_sync_statuses');
  }
}
