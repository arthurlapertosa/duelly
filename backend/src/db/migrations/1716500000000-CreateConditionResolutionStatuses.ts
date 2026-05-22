import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateConditionResolutionStatuses1716500000000 implements MigrationInterface {
  name = 'CreateConditionResolutionStatuses1716500000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS condition_resolution_statuses (
        condition_id text PRIMARY KEY,
        status text NOT NULL,
        payout_denominator text,
        source text,
        checked_at timestamptz NOT NULL,
        expires_at timestamptz,
        error text,
        CONSTRAINT condition_resolution_statuses_status_check
          CHECK (status IN ('unknown', 'unresolved', 'resolved'))
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_condition_resolution_statuses_status
      ON condition_resolution_statuses (status)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_condition_resolution_statuses_expires_at
      ON condition_resolution_statuses (expires_at)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS idx_condition_resolution_statuses_expires_at');
    await queryRunner.query('DROP INDEX IF EXISTS idx_condition_resolution_statuses_status');
    await queryRunner.query('DROP TABLE IF EXISTS condition_resolution_statuses');
  }
}
