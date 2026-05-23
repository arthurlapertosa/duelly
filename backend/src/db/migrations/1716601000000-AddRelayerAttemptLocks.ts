import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRelayerAttemptLocks1716601000000 implements MigrationInterface {
  name = 'AddRelayerAttemptLocks1716601000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('alter table relayer_attempts add column if not exists locked_at timestamptz');
    await queryRunner.query('drop index if exists idx_relayer_attempts_pending');
    await queryRunner.query('create index if not exists idx_relayer_attempts_pending on relayer_attempts (deployment_key, action, status, locked_at, created_at)');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('drop index if exists idx_relayer_attempts_pending');
    await queryRunner.query('create index if not exists idx_relayer_attempts_pending on relayer_attempts (deployment_key, action, status, created_at)');
    await queryRunner.query('alter table relayer_attempts drop column if exists locked_at');
  }
}
